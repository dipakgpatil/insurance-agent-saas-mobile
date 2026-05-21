#requires -Version 5
<#
.SYNOPSIS
Build release-mode Android artifacts for PolicyOffice mobile.

.DESCRIPTION
Runs the full pipeline: expo prebuild -> gradle clean -> assembleRelease + bundleRelease,
then copies the APK and AAB into dist/ with version + timestamp filenames.

Run from the project root:

    npm run apk:release
    # or
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-release-apk.ps1

The release APK/AAB is signed with the local debug keystore unless release signing is
wired in through the generated Android project. Debug signing is fine for local install
testing, but Play Store closed testing should use an upload key or EAS-managed signing.

.PARAMETER SkipPrebuild
Skip `expo prebuild`. Use when you have already prebuilt and only JS/TSX changed.

.PARAMETER SkipClean
Skip `gradlew clean` for a faster incremental build.

.PARAMETER CleanPrebuild
Run `expo prebuild --clean` before building. Use this when app identifiers,
schemes, icons, or native configuration changed.
#>
[CmdletBinding()]
param(
    [switch]$SkipPrebuild,
    [switch]$SkipClean,
    [switch]$CleanPrebuild
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ""
Write-Host "==> PolicyOffice Android release build" -ForegroundColor Cyan
Write-Host "    Project root: $projectRoot"

if (-not (Test-Path "node_modules")) {
    Write-Host "==> Installing npm dependencies"
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}

if (-not $SkipPrebuild) {
    $prebuildArgs = @('expo', 'prebuild', '--platform', 'android')
    if ($CleanPrebuild) { $prebuildArgs += '--clean' }
    Write-Host "==> npx $($prebuildArgs -join ' ')"
    npx @prebuildArgs
    if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed" }
} else {
    Write-Host "==> Skipping expo prebuild"
}

$gradleArgs = @()
if (-not $SkipClean) { $gradleArgs += 'clean' }
$gradleArgs += 'assembleRelease'
$gradleArgs += 'bundleRelease'
$gradleArgs += '--no-daemon'
$gradleArgs += '--console=plain'
$gradleArgs += '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a'

Set-Location (Join-Path $projectRoot "android")
Write-Host "==> gradlew $($gradleArgs -join ' ')"
& .\gradlew.bat @gradleArgs
$gradleExit = $LASTEXITCODE
Set-Location $projectRoot
if ($gradleExit -ne 0) { throw "gradle build failed (exit $gradleExit)" }

$pkg = Get-Content -Raw (Join-Path $projectRoot "package.json") | ConvertFrom-Json
$version = $pkg.version
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$distDir = Join-Path $projectRoot "dist"
if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }

$apkSrc = Join-Path $projectRoot "android/app/build/outputs/apk/release/app-release.apk"
$aabSrc = Join-Path $projectRoot "android/app/build/outputs/bundle/release/app-release.aab"
if (-not (Test-Path $apkSrc)) {
    throw "Build completed but APK not found at $apkSrc"
}
if (-not (Test-Path $aabSrc)) {
    throw "Build completed but AAB not found at $aabSrc"
}

$apkDst = Join-Path $distDir "policyoffice-v$version-$stamp.apk"
$aabDst = Join-Path $distDir "policyoffice-v$version-$stamp.aab"
Copy-Item $apkSrc $apkDst -Force
Copy-Item $aabSrc $aabDst -Force

$sizeMB = [math]::Round((Get-Item $apkDst).Length / 1MB, 1)
$aabSizeMB = [math]::Round((Get-Item $aabDst).Length / 1MB, 1)

Write-Host ""
Write-Host "==> Done." -ForegroundColor Green
Write-Host "    APK: $apkDst" -ForegroundColor Green
Write-Host "    AAB: $aabDst" -ForegroundColor Green
Write-Host ("    APK size: {0} MB" -f $sizeMB)
Write-Host ("    AAB size: {0} MB" -f $aabSizeMB)
Write-Host "    Install on a connected device:  adb install -r `"$apkDst`""
Write-Host "    Upload to Play Console closed testing: $aabDst"
Write-Host ""
