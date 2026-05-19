#requires -Version 5
<#
.SYNOPSIS
Build a release-mode Android APK for PolicyPulse mobile.

.DESCRIPTION
Runs the full pipeline: expo prebuild -> gradle clean -> assembleRelease,
then copies the signed APK into dist/ with a version + timestamp filename.

Run from the project root:

    npm run apk:release
    # or
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-release-apk.ps1

The release APK is signed with the local debug keystore (per android/app/build.gradle).
Fine for internal testing; not Play-Store-ready until a real keystore is wired in.

.PARAMETER SkipPrebuild
Skip `expo prebuild`. Use when you have already prebuilt and only JS/TSX changed.

.PARAMETER SkipClean
Skip `gradlew clean` for a faster incremental build.
#>
[CmdletBinding()]
param(
    [switch]$SkipPrebuild,
    [switch]$SkipClean
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ""
Write-Host "==> PolicyPulse Android release build" -ForegroundColor Cyan
Write-Host "    Project root: $projectRoot"

if (-not (Test-Path "node_modules")) {
    Write-Host "==> Installing npm dependencies"
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}

if (-not $SkipPrebuild) {
    Write-Host "==> expo prebuild --platform android"
    npx expo prebuild --platform android
    if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed" }
} else {
    Write-Host "==> Skipping expo prebuild"
}

$gradleArgs = @()
if (-not $SkipClean) { $gradleArgs += 'clean' }
$gradleArgs += 'assembleRelease'

Set-Location (Join-Path $projectRoot "android")
Write-Host "==> gradlew $($gradleArgs -join ' ')"
& .\gradlew.bat @gradleArgs
$gradleExit = $LASTEXITCODE
Set-Location $projectRoot
if ($gradleExit -ne 0) { throw "gradle build failed (exit $gradleExit)" }

$apkSrc = Join-Path $projectRoot "android/app/build/outputs/apk/release/app-release.apk"
if (-not (Test-Path $apkSrc)) {
    throw "Build completed but APK not found at $apkSrc"
}

$pkg = Get-Content -Raw (Join-Path $projectRoot "package.json") | ConvertFrom-Json
$version = $pkg.version
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$distDir = Join-Path $projectRoot "dist"
if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }

$apkDst = Join-Path $distDir "policypulse-v$version-$stamp.apk"
Copy-Item $apkSrc $apkDst -Force

$sizeMB = [math]::Round((Get-Item $apkDst).Length / 1MB, 1)

Write-Host ""
Write-Host "==> Done." -ForegroundColor Green
Write-Host "    APK: $apkDst" -ForegroundColor Green
Write-Host ("    Size: {0} MB" -f $sizeMB)
Write-Host "    Install on a connected device:  adb install -r `"$apkDst`""
Write-Host ""
