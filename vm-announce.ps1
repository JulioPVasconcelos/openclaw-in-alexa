param(
  [Parameter(Mandatory=$true)][string]$Device,
  [Parameter(Mandatory=$true)][string]$Text,
  [string]$Language = 'pt-BR',
  [string]$Voice = 'Camila',
  [string]$Url = 'http://127.0.0.1:18793/announce'
)

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$keyPath = Join-Path $base 'secrets\proxy-key.txt'
$key = (Get-Content -Raw $keyPath).Trim()

$headers = @{ 'X-Proxy-Key' = $key }
$payload = @{ device = $Device; text = $Text; language = $Language }
if ($Voice -and $Voice.Trim().Length -gt 0) { $payload.voice = $Voice }
$body = $payload | ConvertTo-Json

try {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $r = Invoke-WebRequest -Method Post -Uri $Url -Headers $headers -Body $bytes -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 20
  Write-Output $r.StatusCode
} catch {
  Write-Error $_
  exit 1
}
