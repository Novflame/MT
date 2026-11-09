$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$serviceName = 'TASEETYService'
$registryPath = 'HKLM:\SOFTWARE\TASEETY'

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $serviceName -Force
        (Get-Service -Name $serviceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(60))
    }
    & sc.exe delete $serviceName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Windows could not remove the TASEETY service.' }
    $deadline = (Get-Date).AddSeconds(45)
    do {
        Start-Sleep -Milliseconds 500
        $remaining = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        if (!$remaining) { break }
    } while ((Get-Date) -lt $deadline)
    if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
        throw 'TASEETY service is marked for deletion or still running. Reboot and retry uninstall; persistent school data has not been removed.'
    }
}

if (Test-Path -LiteralPath $registryPath) {
    $port = (Get-ItemProperty -Path $registryPath -Name Port -ErrorAction SilentlyContinue).Port
    if ($port) {
        $ruleName = 'TASEETY School Server TCP ' + [string]$port
        Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    }
    Remove-ItemProperty -Path $registryPath -Name InstallDir -ErrorAction SilentlyContinue
}

# Deliberately preserve DataDir, Port, PublicHost, config/.env, databases, uploads and backups.
Write-Host 'TASEETY service removed. Persistent school data has been preserved.'
