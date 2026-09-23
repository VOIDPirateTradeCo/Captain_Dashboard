Set-Location "C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control"
$env:NODE_ENV="production"
$env:PORT="3100"
$env:HOSTNAME="0.0.0.0"
$env:AUTH_USER="Captain"
$env:AUTH_PASS="voidcaptain2026"
Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control\.nextbuild\standalone\server.js" -NoNewWindow -PassThru | Select-Object Id
