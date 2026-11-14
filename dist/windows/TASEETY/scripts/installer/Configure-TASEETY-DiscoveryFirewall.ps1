param(
    [string]$NodePath = (Join-Path $env:ProgramFiles "TASEETY\node.exe"),
    [switch]$Remove
)

$ErrorActionPreference = "Stop"
$ruleName = "TASEETY LAN Discovery (UDP 47777)"

if ($Remove) {
    Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue |
        Remove-NetFirewallRule
    Write-Host "Removed firewall rule: $ruleName"
    exit 0
}

if (-not (Test-Path -LiteralPath $NodePath -PathType Leaf)) {
    throw "TASEETY Node runtime was not found: $NodePath"
}

Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule

New-NetFirewallRule `
    -DisplayName $ruleName `
    -Description "Allows TASEETY desktop clients to discover the school server on the local network." `
    -Direction Inbound `
    -Action Allow `
    -Protocol UDP `
    -LocalPort 47777 `
    -Program (Resolve-Path -LiteralPath $NodePath).Path `
    -Profile Domain,Private | Out-Null

Write-Host "Configured TASEETY LAN discovery firewall rule for: $NodePath"
