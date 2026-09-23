$ErrorActionPreference = 'SilentlyContinue'
$mcDir = 'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control'

Write-Host "=== Starting Mission Control ===" -ForegroundColor Cyan

# Kill existing
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Set env
$env:NODE_ENV = 'development'
$env:PORT = '3100'
$env:HOSTNAME = '0.0.0.0'
$env:AUTH_USER = 'Captain'
$env:AUTH_PASS = 'voidcaptain2026'
$env:MISSION_CONTROL_DATA_DIR = "$mcDir\.data"

# Start
Set-Location $mcDir
Write-Host "Starting dev server on port 3100..." -ForegroundColor Green
node node_modules\next\dist\bin\next dev --hostname 0.0.0.0 --port 3100
