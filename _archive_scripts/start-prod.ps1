$env:NODE_ENV='production'
$env:PORT='3100'
$env:HOSTNAME='0.0.0.0'
$env:AUTH_USER='Captain'
$env:AUTH_PASS='voidcaptain2026'
$env:MISSION_CONTROL_DATA_DIR='C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control\.nextbuild\standalone\.data'
$env:NEXT_SHARP_PATH='C:\Users\kidsm\AppData\Roaming\npm-cache\_npx\14f2a9efa2825907\node_modules\sharp'

Set-Location 'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control'

Write-Host "Starting Mission Control Production Server..." -ForegroundColor Green
node .nextbuild\standalone\server.js
