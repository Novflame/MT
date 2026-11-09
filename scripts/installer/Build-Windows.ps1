[CmdletBinding()]
param([switch]$SkipChecks)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root

if ($env:OS -ne 'Windows_NT') {
throw 'Build the Windows installer on Windows x64. A Linux-built better-sqlite3 binary cannot be shipped to Windows.'
}

$nodeCommand = Get-Command node.exe -ErrorAction Stop
$node = $nodeCommand.Source
$nodeVersion = (& $node --version).Trim()

if ($nodeVersion -notmatch '^v22.') {
throw "Node.js 22.x x64 is required. Found $nodeVersion at $node."
}

$nodeArch = (& $node -p 'process.arch').Trim()

if ($nodeArch -ne 'x64') {
throw "64-bit Node.js is required. Found architecture: $nodeArch."
}

$required = @(
'package.json',
'package-lock.json',
'scripts\package-windows.cjs',
'scripts\migrate-central.cjs',
'scripts\installer\TASEETYService.cs',
'scripts\installer\Configure-TASEETY.ps1',
'scripts\installer\Uninstall-TASEETY.ps1',
'scripts\installer\backup-before-upgrade.cjs',
'scripts\installer\relocate-central.cjs',
'installer\TASEETY.iss'
)

foreach ($relative in $required) {
if (!(Test-Path -LiteralPath (Join-Path $root $relative) -PathType Leaf)) {
throw "Required build file is missing: $relative"
}
}

# Detect Inno Setup from both user-level and system-level installations.

# Use registry DisplayVersion instead of unreliable executable ProductVersion metadata.

$innoRegistryKeys = @(
'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Inno Setup 7_is1',
'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Inno Setup 6_is1',
'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Inno Setup 7_is1',
'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Inno Setup 6_is1'
)

$detectedInno = @(
foreach ($registryKey in $innoRegistryKeys) {
$entry = Get-ItemProperty -LiteralPath $registryKey -ErrorAction SilentlyContinue


    if (!$entry) {
        continue
    }

    $version = [version]'0.0'

    if (![version]::TryParse([string]$entry.DisplayVersion, [ref]$version)) {
        continue
    }

    if ($version -lt [version]'6.7') {
        continue
    }

    $installLocation = [string]$entry.InstallLocation

    if ([string]::IsNullOrWhiteSpace($installLocation)) {
        continue
    }

    $compiler = Join-Path $installLocation 'ISCC.exe'

    if (Test-Path -LiteralPath $compiler -PathType Leaf) {
        [PSCustomObject]@{
            Path    = $compiler
            Version = $version
        }
    }
}


)

if ($detectedInno.Count -eq 0) {
throw 'Inno Setup 6.7+ or 7 (ISCC.exe) is required. No valid installation was detected.'
}

$selectedInno = $detectedInno |
Sort-Object Version -Descending |
Select-Object -First 1

$iscc = $selectedInno.Path

Write-Host "Using Inno Setup $($selectedInno.Version)" -ForegroundColor Green
Write-Host "Compiler: $iscc"

if (!(Get-Command python.exe -ErrorAction SilentlyContinue)) {
throw 'Python 3 is required because the project test suite includes Python migration tests.'
}

$cscCandidates = @(
(Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
(Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
) | Where-Object {
Test-Path -LiteralPath $_ -PathType Leaf
}

if (!$cscCandidates) {
throw '.NET Framework C# compiler csc.exe was not found. Install the .NET Framework 4.8 Developer Pack or Visual Studio Build Tools.'
}

$csc = $cscCandidates | Select-Object -First 1

Write-Host "Using C# compiler: $csc" -ForegroundColor Green

if (!$SkipChecks) {
& npm.cmd run typecheck


if ($LASTEXITCODE -ne 0) {
    throw 'TypeScript typecheck failed.'
}

& npm.cmd test

if ($LASTEXITCODE -ne 0) {
    throw 'Project tests failed.'
}


}

& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
throw 'Next.js production build failed.'
}

& $node scripts\package-windows.cjs

if ($LASTEXITCODE -ne 0) {
throw 'Windows standalone payload packaging failed.'
}

$payload = Join-Path $root 'dist\windows\TASEETY'
$serviceDir = Join-Path $payload 'service'

New-Item -ItemType Directory -Path $serviceDir -Force | Out-Null

$serviceExe = Join-Path $serviceDir 'TASEETYService.exe'

& $csc /nologo /target:winexe /platform:x64 /optimize+ "/out:$serviceExe" /reference:System.ServiceProcess.dll (Join-Path $PSScriptRoot 'TASEETYService.cs')

if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $serviceExe)) {
throw 'Could not compile the TASEETY Windows Service host.'
}

$maintenanceDir = Join-Path $payload 'app\standalone\scripts'

New-Item -ItemType Directory -Path $maintenanceDir -Force | Out-Null

Copy-Item (Join-Path $PSScriptRoot 'backup-before-upgrade.cjs') $maintenanceDir -Force
Copy-Item (Join-Path $PSScriptRoot 'relocate-central.cjs') $maintenanceDir -Force

$installerScripts = Join-Path $payload 'scripts\installer'

New-Item -ItemType Directory -Path $installerScripts -Force | Out-Null

Copy-Item (Join-Path $PSScriptRoot 'Configure-TASEETY.ps1') $installerScripts -Force
Copy-Item (Join-Path $PSScriptRoot 'Uninstall-TASEETY.ps1') $installerScripts -Force

foreach ($requiredPayload in @(
(Join-Path $payload 'node.exe'),
(Join-Path $payload 'app\standalone\server.js'),
(Join-Path $payload 'app\standalone\scripts\migrate-central.cjs'),
(Join-Path $payload 'app\standalone\scripts\backup-before-upgrade.cjs'),
(Join-Path $payload 'app\standalone\scripts\relocate-central.cjs'),
$serviceExe
)) {
if (!(Test-Path -LiteralPath $requiredPayload -PathType Leaf)) {
throw "Payload validation failed; missing: $requiredPayload"
}
}

$installerOut = Join-Path $root 'dist\windows\installer'

New-Item -ItemType Directory -Path $installerOut -Force | Out-Null

$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version

& $iscc "/DAppVersion=$version" "/DSourceDir=$payload" "/DOutputDir=$installerOut" (Join-Path $root 'installer\TASEETY.iss')

if ($LASTEXITCODE -ne 0) {
throw 'Inno Setup compilation failed.'
}

$installer = Get-ChildItem -LiteralPath $installerOut -Filter 'TASEETY-Setup-*-x64.exe' -File |
Sort-Object LastWriteTime -Descending |
Select-Object -First 1

if (!$installer) {
throw 'Installer EXE was not produced.'
}

$hash = Get-FileHash -LiteralPath $installer.FullName -Algorithm SHA256

"$($hash.Hash)  $($installer.Name)" |
Set-Content -LiteralPath ($installer.FullName + '.sha256.txt') -Encoding ASCII

Write-Host "`nTASEETY Windows installer created: $($installer.FullName)"
Write-Host "SHA-256: $($hash.Hash)"
