param(
  [Parameter(Mandatory=$true)][string]$Device,
  [string]$Url = 'http://127.0.0.1:18793/trigger'
)

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$keyPath = Join-Path $base 'secrets\proxy-key.txt'
$key = (Get-Content -Raw $keyPath).Trim()

$headers = @{ 'X-Proxy-Key' = $key }
$body = @{ device = $Device } | ConvertTo-Json

try {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $r = Invoke-WebRequest -Method Post -Uri $Url -Headers $headers -Body $bytes -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 20
  Write-Output $r.StatusCode
} catch {
  Write-Error $_
  exit 1
}
