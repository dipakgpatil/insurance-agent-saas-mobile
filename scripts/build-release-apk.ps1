#requires -Version 5
<#
.SYNOPSIS
Build release-mode Android artifacts for PolicyOffice mobile.

.DESCRIPTION
Runs the full pipeline: expo prebuild -> gradle clean -> assembleRelease + bundleRelease,
then copies the APK and AAB into dist/ with version + timestamp filenames.
When release signing is configured, artifacts are copied into dist/play-store/.

Run from the project root:

    npm run apk:release
    # or
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-release-apk.ps1

By default, the generated Android project may still use the local debug keystore. That
is fine for local install testing, but Play Store closed testing must use an upload key.
Use -RequireReleaseSigning after creating release-signing/playstore-signing.properties.

.PARAMETER SkipPrebuild
Skip `expo prebuild`. Use when you have already prebuilt and only JS/TSX changed.

.PARAMETER SkipClean
Skip `gradlew clean` for a faster incremental build.

.PARAMETER CleanPrebuild
Run `expo prebuild --clean` before building. Use this when app identifiers,
schemes, icons, or native configuration changed.

.PARAMETER RequireReleaseSigning
Fail unless a Play upload keystore config is present, then patch the generated
Android project to sign the release build with that upload key.

.PARAMETER BundleOnly
Build only the Android App Bundle. This is faster for Play Console uploads.
#>
[CmdletBinding()]
param(
    [switch]$SkipPrebuild,
    [switch]$SkipClean,
    [switch]$CleanPrebuild,
    [switch]$RequireReleaseSigning,
    [switch]$BundleOnly
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Read-SigningProperties {
    param([string]$Path)

    $config = @{}
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            $line = $_.Trim()
            if (-not $line -or $line.StartsWith("#")) { return }
            $parts = $line -split "=", 2
            if ($parts.Count -eq 2) {
                $config[$parts[0].Trim()] = $parts[1].Trim()
            }
        }
    }

    foreach ($key in @(
        "POLICYOFFICE_UPLOAD_STORE_FILE",
        "POLICYOFFICE_UPLOAD_STORE_PASSWORD",
        "POLICYOFFICE_UPLOAD_KEY_ALIAS",
        "POLICYOFFICE_UPLOAD_KEY_PASSWORD"
    )) {
        $envValue = [Environment]::GetEnvironmentVariable($key)
        if ($envValue) { $config[$key] = $envValue }
    }

    return $config
}

function Set-ReleaseSigningEnvironment {
    param([hashtable]$Config)

    $required = @(
        "POLICYOFFICE_UPLOAD_STORE_FILE",
        "POLICYOFFICE_UPLOAD_STORE_PASSWORD",
        "POLICYOFFICE_UPLOAD_KEY_ALIAS",
        "POLICYOFFICE_UPLOAD_KEY_PASSWORD"
    )
    foreach ($key in $required) {
        if (-not $Config.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($Config[$key])) {
            return $false
        }
    }

    $storeFile = $Config["POLICYOFFICE_UPLOAD_STORE_FILE"]
    if (-not [System.IO.Path]::IsPathRooted($storeFile)) {
        $storeFile = Join-Path $projectRoot $storeFile
    }
    if (-not (Test-Path $storeFile)) {
        throw "Release signing keystore not found at $storeFile"
    }

    $env:POLICYOFFICE_UPLOAD_STORE_FILE = (Resolve-Path $storeFile).Path
    $env:POLICYOFFICE_UPLOAD_STORE_PASSWORD = $Config["POLICYOFFICE_UPLOAD_STORE_PASSWORD"]
    $env:POLICYOFFICE_UPLOAD_KEY_ALIAS = $Config["POLICYOFFICE_UPLOAD_KEY_ALIAS"]
    $env:POLICYOFFICE_UPLOAD_KEY_PASSWORD = $Config["POLICYOFFICE_UPLOAD_KEY_PASSWORD"]

    return $true
}

function Enable-ReleaseSigningInGradle {
    $buildGradlePath = Join-Path $projectRoot "android/app/build.gradle"
    if (-not (Test-Path $buildGradlePath)) {
        throw "Android build.gradle not found. Run expo prebuild before signing."
    }

    $buildGradle = Get-Content -Raw $buildGradlePath
    if ($buildGradle -notmatch "POLICYOFFICE_UPLOAD_STORE_FILE") {
        $releaseSigningConfig = @'
        release {
            storeFile file(System.getenv("POLICYOFFICE_UPLOAD_STORE_FILE"))
            storePassword System.getenv("POLICYOFFICE_UPLOAD_STORE_PASSWORD")
            keyAlias System.getenv("POLICYOFFICE_UPLOAD_KEY_ALIAS")
            keyPassword System.getenv("POLICYOFFICE_UPLOAD_KEY_PASSWORD")
        }
'@
        $pattern = "(?s)(signingConfigs\s*\{\s*debug\s*\{.*?keyPassword 'android'\s*\}\s*)\}"
        $replacement = ('$1' + "`r`n" + $releaseSigningConfig + "`r`n    }")
        $buildGradle = [regex]::Replace($buildGradle, $pattern, $replacement, 1)
    }

    $buildTypesIndex = $buildGradle.IndexOf("    buildTypes {")
    if ($buildTypesIndex -lt 0) {
        throw "Could not find buildTypes block in $buildGradlePath"
    }
    $beforeBuildTypes = $buildGradle.Substring(0, $buildTypesIndex)
    $buildTypesAndAfter = $buildGradle.Substring($buildTypesIndex)
    $buildTypesAndAfter = [regex]::Replace(
        $buildTypesAndAfter,
        "(?s)(debug\s*\{\s*)signingConfig signingConfigs\.\w+",
        '$1signingConfig signingConfigs.debug',
        1
    )
    $buildTypesAndAfter = [regex]::Replace(
        $buildTypesAndAfter,
        "(?s)(release\s*\{.*?)(signingConfig signingConfigs\.)\w+",
        '$1${2}release',
        1
    )
    $buildGradle = $beforeBuildTypes + $buildTypesAndAfter

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($buildGradlePath, $buildGradle, $utf8NoBom)
}

function Repair-ExpoModulesCoreForApi35 {
    $permissionsServicePath = Join-Path $projectRoot "node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/permissions/PermissionsService.kt"
    if (-not (Test-Path $permissionsServicePath)) {
        return
    }

    $source = Get-Content -Raw $permissionsServicePath
    $fixed = $source.Replace(
        "return requestedPermissions.contains(permission)",
        "return requestedPermissions?.contains(permission) == true"
    )
    if ($fixed -ne $source) {
        Write-Host "==> Patching expo-modules-core Android 15 permission compile compatibility"
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($permissionsServicePath, $fixed, $utf8NoBom)
    }
}

Write-Host ""
Write-Host "==> PolicyOffice Android release build" -ForegroundColor Cyan
Write-Host "    Project root: $projectRoot"

$signingPropertiesPath = Join-Path $projectRoot "release-signing/playstore-signing.properties"
$signingConfig = Read-SigningProperties -Path $signingPropertiesPath
$hasReleaseSigning = Set-ReleaseSigningEnvironment -Config $signingConfig
if ($RequireReleaseSigning -and -not $hasReleaseSigning) {
    throw "Play Store upload signing is required but not configured. Create release-signing/playstore-signing.properties or set POLICYOFFICE_UPLOAD_* environment variables."
}

if (-not (Test-Path "node_modules")) {
    Write-Host "==> Installing npm dependencies"
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}

Repair-ExpoModulesCoreForApi35

if (-not $SkipPrebuild) {
    $prebuildArgs = @('expo', 'prebuild', '--platform', 'android')
    if ($CleanPrebuild) { $prebuildArgs += '--clean' }
    Write-Host "==> npx $($prebuildArgs -join ' ')"
    npx @prebuildArgs
    if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed" }
} else {
    Write-Host "==> Skipping expo prebuild"
}

if ($hasReleaseSigning) {
    Write-Host "==> Enabling Play Store upload-key signing"
    Enable-ReleaseSigningInGradle
} else {
    Write-Host "==> Release signing config not found; artifacts may be debug-signed and rejected by Play Console" -ForegroundColor Yellow
}

$gradleArgs = @()
if (-not $SkipClean) { $gradleArgs += 'clean' }
if (-not $BundleOnly) {
    $gradleArgs += 'assembleRelease'
}
$gradleArgs += 'bundleRelease'
$gradleArgs += '--no-daemon'
$gradleArgs += '--console=plain'
$gradleArgs += '-Pandroid.buildToolsVersion=35.0.0'
$gradleArgs += '-Pandroid.compileSdkVersion=35'
$gradleArgs += '-Pandroid.targetSdkVersion=35'
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
if ($hasReleaseSigning) {
    $distDir = Join-Path $distDir "play-store"
}
if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }

$apkSrc = Join-Path $projectRoot "android/app/build/outputs/apk/release/app-release.apk"
$aabSrc = Join-Path $projectRoot "android/app/build/outputs/bundle/release/app-release.aab"
if (-not $BundleOnly -and -not (Test-Path $apkSrc)) {
    throw "Build completed but APK not found at $apkSrc"
}
if (-not (Test-Path $aabSrc)) {
    throw "Build completed but AAB not found at $aabSrc"
}

$signedSuffix = if ($hasReleaseSigning) { "-release-signed" } else { "" }
$apkDst = Join-Path $distDir "policyoffice-v$version-$stamp$signedSuffix.apk"
$aabDst = Join-Path $distDir "policyoffice-v$version-$stamp$signedSuffix.aab"
if (-not $BundleOnly) {
    Copy-Item $apkSrc $apkDst -Force
}
Copy-Item $aabSrc $aabDst -Force

$sizeMB = if (-not $BundleOnly) { [math]::Round((Get-Item $apkDst).Length / 1MB, 1) } else { $null }
$aabSizeMB = [math]::Round((Get-Item $aabDst).Length / 1MB, 1)

Write-Host ""
Write-Host "==> Done." -ForegroundColor Green
if (-not $BundleOnly) {
    Write-Host "    APK: $apkDst" -ForegroundColor Green
}
Write-Host "    AAB: $aabDst" -ForegroundColor Green
if (-not $BundleOnly) {
    Write-Host ("    APK size: {0} MB" -f $sizeMB)
}
Write-Host ("    AAB size: {0} MB" -f $aabSizeMB)
if (-not $BundleOnly) {
    Write-Host "    Install on a connected device:  adb install -r `"$apkDst`""
}
if ($hasReleaseSigning) {
    Write-Host "    Upload this to Play Console closed testing: $aabDst" -ForegroundColor Green
} else {
    Write-Host "    Do not upload this to Play Console; it may be debug-signed." -ForegroundColor Yellow
}
Write-Host ""
