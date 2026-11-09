[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$InstallDir,
    [Parameter(Mandatory=$true)][string]$DataDir,
    [Parameter(Mandatory=$true)][string]$PublicHost,
    [Parameter(Mandatory=$true)][ValidateRange(1,65535)][int]$Port
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-FullPath([string]$Path) {
    return [IO.Path]::GetFullPath($Path.Trim().Trim('"'))
}
function Test-PathInside([string]$Parent, [string]$Child) {
    $p = (Get-FullPath $Parent).TrimEnd('\') + '\'
    $c = (Get-FullPath $Child).TrimEnd('\') + '\'
    return $c.StartsWith($p, [StringComparison]::OrdinalIgnoreCase)
}

function Assert-NoReparsePath([string]$Path) {
    $cursor = Get-FullPath $Path
    while ($cursor -and !(Test-Path -LiteralPath $cursor)) {
        $parent = Split-Path -Parent $cursor
        if (!$parent -or $parent -eq $cursor) { break }
        $cursor = $parent
    }
    while ($cursor -and (Test-Path -LiteralPath $cursor)) {
        $item = Get-Item -LiteralPath $cursor -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Reparse points/junctions are not supported in installer paths: $cursor"
        }
        $parent = Split-Path -Parent $cursor
        if (!$parent -or $parent -eq $cursor) { break }
        $cursor = $parent
    }
}

function Get-EnvValue([string[]]$Lines, [string]$Key) {
    $prefix = $Key + '='
    for ($i = $Lines.Length - 1; $i -ge 0; $i--) {
        if ($Lines[$i].StartsWith($prefix, [StringComparison]::Ordinal)) {
            return $Lines[$i].Substring($prefix.Length).Trim().Trim('"').Trim("'")
        }
    }
    return $null
}
function Set-EnvValue([System.Collections.Generic.List[string]]$Lines, [string]$Key, [string]$Value) {
    $prefix = $Key + '='
    $found = $false
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i].StartsWith($prefix, [StringComparison]::Ordinal)) {
            if (!$found) { $Lines[$i] = $prefix + $Value; $found = $true }
            else { $Lines[$i] = '# duplicate ignored: ' + $Lines[$i] }
        }
    }
    if (!$found) { $Lines.Add($prefix + $Value) }
}
function Resolve-DataPath([string]$Value, [string]$Fallback) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return (Get-FullPath $Fallback) }
    if ([IO.Path]::IsPathRooted($Value)) { return (Get-FullPath $Value) }
    return (Get-FullPath (Join-Path $DataDir $Value))
}
function New-RandomSecret([int]$Bytes = 48) {
    $buffer = New-Object byte[] $Bytes
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buffer); return [Convert]::ToBase64String($buffer) }
    finally { $rng.Dispose() }
}

$InstallDir = Get-FullPath $InstallDir
$DataDir = Get-FullPath $DataDir
if ((Test-PathInside $InstallDir $DataDir) -or (Test-PathInside $DataDir $InstallDir)) {
    throw 'The application directory and persistent data directory must be separate, non-overlapping folders.'
}
if ($DataDir.StartsWith('\\')) { throw 'SQLite data must be stored on a local Windows drive, not a network share.' }
if (!(Test-Path -LiteralPath (Split-Path -Qualifier $DataDir))) { throw 'The selected data drive does not exist.' }

# Reject reparse-point roots to prevent junctions from bypassing data/app separation.
Assert-NoReparsePath $InstallDir
Assert-NoReparsePath $DataDir

if ($PublicHost -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]{0,252}[A-Za-z0-9]$' -and $PublicHost -notmatch '^[A-Za-z0-9]$') {
    throw 'PublicHost must be a DNS hostname or IPv4 address containing only letters, numbers, dots, and hyphens.'
}
if ($PublicHost.Contains('..') -or $PublicHost.StartsWith('.') -or $PublicHost.EndsWith('.')) { throw 'PublicHost is not a valid hostname.' }

$runtimeRoot = $InstallDir
$node = Join-Path $runtimeRoot 'node.exe'
$serviceExe = Join-Path $InstallDir 'service\TASEETYService.exe'
$working = Join-Path $InstallDir 'app\standalone'
$server = Join-Path $working 'server.js'
$migrator = Join-Path $working 'scripts\migrate-central.cjs'
$backupScript = Join-Path $working 'scripts\backup-before-upgrade.cjs'
$relocateScript = Join-Path $working 'scripts\relocate-central.cjs'
foreach ($required in @($node, $serviceExe, $server, $migrator, $backupScript, $relocateScript)) {
    if (!(Test-Path -LiteralPath $required -PathType Leaf)) { throw "Required installation file is missing: $required" }
}

$configDir = Join-Path $DataDir 'config'
$centralDir = Join-Path $DataDir 'central-data'
$defaultDbDir = Join-Path $DataDir 'databases'
$defaultUploads = Join-Path $DataDir 'uploads'
$defaultBackups = Join-Path $DataDir 'backups'
$logDir = Join-Path $DataDir 'logs'
foreach ($dir in @($configDir, $centralDir, $logDir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
$config = Join-Path $configDir '.env'
if (Test-Path -LiteralPath $config) {
    $lines = [System.Collections.Generic.List[string]]::new()
    foreach ($line in [IO.File]::ReadAllLines($config)) { $lines.Add($line) }
} else {
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add('BETTER_AUTH_SECRET=' + (New-RandomSecret))
    $lines.Add('INTERNAL_REGISTRATION_SECRET=' + (New-RandomSecret))
    $lines.Add('DAILY_REPORT_CRON_SECRET=' + (New-RandomSecret))
}
foreach ($secretName in @('BETTER_AUTH_SECRET', 'INTERNAL_REGISTRATION_SECRET')) {
    $secret = Get-EnvValue $lines.ToArray() $secretName
    if ([string]::IsNullOrWhiteSpace($secret) -or $secret.Length -lt 32 -or $secret -match '(?i)replace-with|change-me|your-secret|placeholder') {
        throw "Configuration is missing a valid $secretName (minimum 32 characters). Refusing to replace existing secrets automatically."
    }
}
$dailySecret = Get-EnvValue $lines.ToArray() 'DAILY_REPORT_CRON_SECRET'
if ([string]::IsNullOrWhiteSpace($dailySecret) -or $dailySecret.Length -lt 32 -or $dailySecret -match '(?i)replace-with|change-me|your-secret|placeholder') {
    Set-EnvValue $lines 'DAILY_REPORT_CRON_SECRET' (New-RandomSecret)
}

# Preserve existing configured locations. Relative paths are anchored to the selected data root.
$legacyCentral = Join-Path $DataDir 'central.db'
$centralConfigured = Get-EnvValue $lines.ToArray() 'CENTRAL_DATABASE_PATH'
$centralUsesCanonical = $true
if ([string]::IsNullOrWhiteSpace($centralConfigured)) {
    $centralPath = Join-Path $centralDir 'central.db'
} else {
    $resolvedCentral = Resolve-DataPath $centralConfigured (Join-Path $centralDir 'central.db')
    if ([string]::Equals($resolvedCentral, $legacyCentral, [StringComparison]::OrdinalIgnoreCase)) {
        $centralPath = Join-Path $centralDir 'central.db'
    } elseif ([string]::Equals((Split-Path -Parent $resolvedCentral), $DataDir, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'A custom central database directly inside the selected data root is not supported. Move it to a dedicated folder or use the legacy central.db filename.'
    } else { $centralPath = $resolvedCentral; $centralUsesCanonical = $false }
}
$dbDir = Resolve-DataPath (Get-EnvValue $lines.ToArray() 'SCHOOL_DATABASE_DIR') $defaultDbDir
$uploadsExisting = Get-EnvValue $lines.ToArray() 'SCHOOL_UPLOADS_DIR'
if ([string]::IsNullOrWhiteSpace($uploadsExisting)) {
    $legacyUploads = Join-Path $DataDir 'public\uploads'
    $uploadsDir = if (Test-Path -LiteralPath $legacyUploads) { $legacyUploads } else { $defaultUploads }
} else { $uploadsDir = Resolve-DataPath $uploadsExisting $defaultUploads }
$backupDir = Resolve-DataPath (Get-EnvValue $lines.ToArray() 'BACKUP_DIRECTORY') $defaultBackups
$protectedDirs = @($configDir, (Split-Path -Parent $centralPath), $dbDir, $uploadsDir, $backupDir, $logDir)
foreach ($protectedDir in $protectedDirs) {
    $normalized = Get-FullPath $protectedDir
    if ([string]::Equals($normalized, $DataDir, [StringComparison]::OrdinalIgnoreCase)) {
        throw "A persistent data component cannot use the data root itself: $normalized"
    }
    if (Test-PathInside $InstallDir $normalized) {
        throw "Persistent data cannot be stored inside the application installation directory: $normalized"
    }
}
for ($i = 0; $i -lt $protectedDirs.Count; $i++) {
    for ($j = $i + 1; $j -lt $protectedDirs.Count; $j++) {
        if ((Test-PathInside $protectedDirs[$i] $protectedDirs[$j]) -or (Test-PathInside $protectedDirs[$j] $protectedDirs[$i])) {
            throw "Persistent storage paths overlap: '$($protectedDirs[$i])' and '$($protectedDirs[$j])'. Choose separate folders."
        }
    }
}
foreach ($dir in @((Split-Path -Parent $centralPath), $dbDir, $uploadsDir, $backupDir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
foreach ($protectedDir in $protectedDirs) { Assert-NoReparsePath $protectedDir }

$baseUrl = "http://${PublicHost}:$Port"
Set-EnvValue $lines 'BETTER_AUTH_URL' $baseUrl
Set-EnvValue $lines 'CENTRAL_DATABASE_PATH' $centralPath
Set-EnvValue $lines 'SCHOOL_DATABASE_DIR' $dbDir
Set-EnvValue $lines 'SCHOOL_UPLOADS_DIR' $uploadsDir
Set-EnvValue $lines 'BACKUP_DIRECTORY' $backupDir
Set-EnvValue $lines 'HOSTNAME' '0.0.0.0'
Set-EnvValue $lines 'PORT' ([string]$Port)
Set-EnvValue $lines 'NODE_ENV' 'production'
[IO.File]::WriteAllLines($config, $lines.ToArray(), [Text.UTF8Encoding]::new($false))
# Restrict persistent data to LocalSystem (service identity) and local Administrators.
foreach ($dir in (@($configDir, (Split-Path -Parent $centralPath), $dbDir, $uploadsDir, $backupDir, $logDir) | Select-Object -Unique)) {
    $aclOutput = & icacls.exe $dir /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' /T /C 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "Could not set secure permissions on: $dir. Details: $($aclOutput -join ' ')"
    }
}
foreach ($protectedFile in @($config, (Join-Path (Split-Path -Parent $centralPath) 'central.db'))) {
    if (!(Test-Path -LiteralPath $protectedFile -PathType Leaf)) { continue }
    $fileAclOutput = & icacls.exe $protectedFile /inheritance:r /grant:r '*S-1-5-18:F' '*S-1-5-32-544:F' /C 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Could not set secure permissions on: $protectedFile. Details: $($fileAclOutput -join ' ')"
    }
}

# Load the exact persisted configuration into this process for maintenance scripts.
foreach ($line in $lines) {
    if ($line -match '^\s*#' -or $line -notmatch '^([^=]+)=(.*)$') { continue }
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
}

# Register/update the Windows service before running migrations; it remains stopped until checks pass.
$registryPath = 'HKLM:\SOFTWARE\TASEETY'
$oldPort = $null
if (Test-Path -LiteralPath $registryPath) { $oldPort = (Get-ItemProperty -Path $registryPath -Name Port -ErrorAction SilentlyContinue).Port }
New-Item -Path $registryPath -Force | Out-Null
Set-ItemProperty -Path $registryPath -Name DataDir -Value $DataDir
Set-ItemProperty -Path $registryPath -Name InstallDir -Value $InstallDir
Set-ItemProperty -Path $registryPath -Name Port -Value ([string]$Port)
Set-ItemProperty -Path $registryPath -Name PublicHost -Value $PublicHost
$quotedExe = '"' + $serviceExe + '"'
$existingService = Get-Service -Name 'TASEETYService' -ErrorAction SilentlyContinue
if ($existingService) {
    if ($existingService.Status -ne 'Stopped') {
        Stop-Service -Name 'TASEETYService' -Force
        (Get-Service -Name 'TASEETYService').WaitForStatus('Stopped', [TimeSpan]::FromSeconds(45))
    }
    $serviceKey = 'HKLM:\SYSTEM\CurrentControlSet\Services\TASEETYService'
    Set-ItemProperty -Path $serviceKey -Name ImagePath -Value $quotedExe
    Set-ItemProperty -Path $serviceKey -Name Start -Value 2 -Type DWord
} else {
    New-Service -Name 'TASEETYService' -BinaryPathName $quotedExe -DisplayName 'TASEETY School Management' -StartupType Automatic -ErrorAction Stop | Out-Null
}
& sc.exe description TASEETYService 'TASEETY school management application server' | Out-Null
& sc.exe failure TASEETYService reset= 86400 actions= restart/5000/restart/15000/restart/30000 | Out-Null
& sc.exe failureflag TASEETYService 1 | Out-Null

# A pre-migration backup is mandatory whenever a central database already exists.
$centralExists = Test-Path -LiteralPath $centralPath
$legacyExists = Test-Path -LiteralPath $legacyCentral
$centralSidecars = @((Test-Path -LiteralPath ($centralPath + '-wal')), (Test-Path -LiteralPath ($centralPath + '-shm')), (Test-Path -LiteralPath ($legacyCentral + '-wal')), (Test-Path -LiteralPath ($legacyCentral + '-shm'))) -contains $true
if (!$centralExists -and !$legacyExists -and $centralSidecars) {
    throw 'Central database sidecar files exist without the main database. Refusing to initialize a replacement database.'
}
if (!$centralExists -and $legacyExists -and !$centralUsesCanonical) {
    throw 'A legacy central.db exists but the configured custom central database is missing. Refusing to guess which database should be used.'
}
if ($centralExists -or ($centralUsesCanonical -and $legacyExists)) {
    Push-Location $working
    try {
        & $node $backupScript
        if ($LASTEXITCODE -ne 0) { throw 'Verified pre-migration backup failed. No database migration will run.' }
    } finally { Pop-Location }
    if ($centralUsesCanonical) {
        & $node $relocateScript
        if ($LASTEXITCODE -ne 0) { throw 'Central database relocation/verification failed. No migration will run.' }
    }
} elseif (Test-Path -LiteralPath $dbDir) {
    $tenantFiles = @(Get-ChildItem -LiteralPath $dbDir -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^school_\d+\.db(?:-(?:wal|shm|journal))?$' })
    if ($tenantFiles.Count -gt 0) { throw 'Tenant database files exist but the registered central database is missing. Refusing to create an unrelated central database.' }
}

Push-Location $working
try {
    & $node $migrator
    if ($LASTEXITCODE -ne 0) { throw 'Central database migration failed. Service startup is blocked.' }
} finally { Pop-Location }

# Do not mistake another application's HTTP response for a healthy TASEETY startup.
$existingListener = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
if ($existingListener.Count -gt 0) {
    throw "TCP port $Port is already in use. Choose a free port; no service startup was attempted."
}

# Firewall access is limited to trusted Windows network profiles. Remove only the prior TASEETY rule when its port changed.
if ($oldPort -and [string]$oldPort -ne [string]$Port) {
    Get-NetFirewallRule -DisplayName ('TASEETY School Server TCP ' + [string]$oldPort) -ErrorAction SilentlyContinue | Remove-NetFirewallRule
}
$ruleName = 'TASEETY School Server TCP ' + $Port
Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Domain,Private | Out-Null

Start-Service -Name 'TASEETYService'
(Get-Service -Name 'TASEETYService').WaitForStatus('Running', [TimeSpan]::FromSeconds(45))
$healthUrl = "http://127.0.0.1:$Port/"
$healthy = $false
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -MaximumRedirection 5 -Uri $healthUrl -TimeoutSec 5
        if ([int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 400) { $healthy = $true; break }
    } catch { Start-Sleep -Seconds 2 }
}
if (!$healthy) {
    Stop-Service -Name 'TASEETYService' -Force -ErrorAction SilentlyContinue
    Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    throw "TASEETY failed its local HTTP health check at $healthUrl. Data has been preserved; inspect $logDir\service.log and the installer log."
}
Write-Host "TASEETY is running. Open http://${PublicHost}:$Port"
Write-Warning 'HTTP is intended only for a trusted private LAN. Do not expose this port directly to the public internet; use HTTPS with a trusted certificate for internet access.'
