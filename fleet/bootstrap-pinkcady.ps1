param(
  [string]$MasterHost = '192.168.0.39',
  [int]$MasterPort = 3100,
  [string]$ShipName = 'pinkcady',
  [string]$ShipPort = '3000',
  [string]$WorkDir = 'D:\Work\Torus Coffee Company LLC\mission-control',
  [string]$McApiKey = '',
  [string]$HeadscaleUrl = 'http://192.168.0.39:8080',
  [string]$HeadscalePreauthKey = '',
)

$ErrorActionPreference = 'Stop'

Write-Host '=== PINKCADY Fleet Bootstrap ===' -ForegroundColor Cyan

# 0. Verify working directory
if (-not (Test-Path $WorkDir)) {
  Write-Host "FATAL: workdir missing: $WorkDir" -ForegroundColor Red
  exit 1
}
Set-Location $WorkDir
Write-Host 'WORKDIR' (Get-Location)

# 1. Show package.json / src layout
Write-Host '--- ROOT FILES ---'
Get-ChildItem -Depth 0 | Select-Object Mode,Name | Format-Table -AutoSize
Write-Host '--- SRC FILES ---'
if (Test-Path 'src') { Get-ChildItem -Path 'src' -Depth 1 | Select-Object Mode,Name | Format-Table -AutoSize } else { Write-Host 'src/ MISSING' -ForegroundColor Red }

# 2. Stop existing node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 3. Rebuild native module
Write-Host '--- REBUILD better-sqlite3 ---'
cmd.exe /c 'npm rebuild better-sqlite3'

# 4. Start MC dev server
Write-Host '--- START MISSION CONTROL ---'
$env:HOST = '0.0.0.0'
$env:PORT = $ShipPort
$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npx next dev --hostname 0.0.0.0 --port', $ShipPort -WindowStyle Hidden -PassThru
Write-Host 'PID' $proc.Id

# 5. Wait for listener
$ready = $false
for ($i=1; $i -le 20; $i++) {
  Start-Sleep -Seconds 2
  $listening = netstat -ano | Select-String ":${ShipPort}.*LISTENING"
  if ($listening) {
    Write-Host 'LISTENER_UP' $listening.ToString().Trim()
    $ready = $true
    break
  }
}
if (-not $ready) {
  Write-Host 'FATAL: port never opened' -ForegroundColor Red
  exit 1
}

# 6. Local health check
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:${ShipPort}/health" -UseBasicParsing
  Write-Host 'HEALTH' ($health | ConvertTo-Json -Compress)
} catch {
  Write-Host 'HEALTH_FAIL' $_.Exception.Message
}

# 7. Register / heartbeat against master using adapter API
if ($McApiKey) {
  $headers = @{ 'Content-Type' = 'application/json'; 'x-api-key' = $McApiKey; 'X-Agent-Name' = $ShipName }
  try {
    $reg = Invoke-RestMethod -Uri "http://${MasterHost}:${MasterPort}/api/adapters" -Method POST -Headers $headers -Body (@{framework='generic';action='register';payload=@{agentId=$ShipName;name=$ShipName;metadata=@{host=$ShipName;capabilities=@('ops')}}} | ConvertTo-Json) -UseBasicParsing
    Write-Host 'REGISTER' ($reg | ConvertTo-Json -Compress)
  } catch {
    Write-Host 'REGISTER_FAIL' $_.Exception.Message
  }

  try {
    $hb = Invoke-RestMethod -Uri "http://${MasterHost}:${MasterPort}/api/adapters" -Method POST -Headers $headers -Body (@{framework='generic';action='heartbeat';payload=@{agentId=$ShipName;status='online'}} | ConvertTo-Json) -UseBasicParsing
    Write-Host 'HEARTBEAT' ($hb | ConvertTo-Json -Compress)
  } catch {
    Write-Host 'HEARTBEAT_FAIL' $_.Exception.Message
  }
} else {
  Write-Host 'SKIP_REGISTER: set -McApiKey to enable adapter registration'
}

# 8. Headscale client check
Write-Host '--- HEADSCALE CLIENT ---'
try {
  $hsResp = Invoke-RestMethod -Uri "$HeadscaleUrl/api/v1/preauthkey?namespace=VOID" -Method GET -UseBasicParsing
  Write-Host 'HEADSCALE_PREAUTH' ($hsResp | ConvertTo-Json -Compress)
} catch {
  Write-Host 'HEADSCALE_FAIL' $_.Exception.Message
}

Write-Host '=== BOOTSTRAP COMPLETE ===' -ForegroundColor Green
