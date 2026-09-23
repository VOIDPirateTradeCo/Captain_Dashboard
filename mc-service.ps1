$mcDir = "C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control"
Set-Location $mcDir
$env:NODE_ENV="production"
$env:PORT="3100"
$env:HOSTNAME="0.0.0.0"
$env:AUTH_USER="Captain"
$env:AUTH_PASS="voidcaptain2026"
& node .next\standalone\server.js 2>&1
