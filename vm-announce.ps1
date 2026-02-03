param(
  [Parameter(Mandatory=$true)][string]$Device,
  [Parameter(Mandatory=$true)][string]$Text,
  [string]$Language = $env:VM_DEFAULT_LANGUAGE,
  [string]$Voice = $env:VM_DEFAULT_VOICE,
  [string]$Url = 'http://127.0.0.1:18793/announce'
)

if (-not $Language -or $Language.Trim().Length -eq 0) { $Language = 'pt-BR' }
if (-not $Voice -or $Voice.Trim().Length -eq 0) { $Voice = 'Camila' }

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$keyPath = Join-Path $base 'secrets\proxy-key.txt'
$key = (Get-Content -Raw $keyPath).Trim()

$headers = @{ 'X-Proxy-Key' = $key }
$payload = @{ device = $Device; text = $Text; language = $Language; voice = $Voice }
$body = $payload | ConvertTo-Json

try {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $r = Invoke-WebRequest -Method Post -Uri $Url -Headers $headers -Body $bytes -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 20
  Write-Output $r.StatusCode
} catch {
  Write-Error $_
  exit 1
}
