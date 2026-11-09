param(
  [int]$DurationMinutes = 60,
  [int]$IntervalSeconds = 10,
  [string]$OutputPath = "performance-results/node-resource-monitor.csv"
)

$ErrorActionPreference = 'Stop'
$folder = Split-Path -Parent $OutputPath
if ($folder) { New-Item -ItemType Directory -Force -Path $folder | Out-Null }
"timestamp,process_id,cpu_seconds,working_set_mb,private_memory_mb,threads,handles" | Set-Content -Path $OutputPath -Encoding UTF8
$end = (Get-Date).AddMinutes($DurationMinutes)
Write-Host "Monitoring node.exe processes for $DurationMinutes minutes. Output: $OutputPath"

while ((Get-Date) -lt $end) {
  $timestamp = (Get-Date).ToString('o')
  $processes = Get-Process -Name node -ErrorAction SilentlyContinue
  foreach ($process in $processes) {
    $cpu = if ($null -ne $process.CPU) { [math]::Round($process.CPU, 2) } else { 0 }
    $working = [math]::Round($process.WorkingSet64 / 1MB, 2)
    $private = [math]::Round($process.PrivateMemorySize64 / 1MB, 2)
    $line = '"{0}",{1},{2},{3},{4},{5},{6}' -f $timestamp,$process.Id,$cpu,$working,$private,$process.Threads.Count,$process.HandleCount
    Add-Content -Path $OutputPath -Value $line -Encoding UTF8
  }
  Start-Sleep -Seconds $IntervalSeconds
}
Write-Host "Monitoring complete: $OutputPath"
