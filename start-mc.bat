@echo off
setlocal
set PORT=3100
set NODE_ENV=production
set HOSTNAME=0.0.0.0
set MC_DIR=C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control
cd /d %MC_DIR%

:: Sync DB from main data dir to standalone (handles rebuilds that wipe standalone\.data)
:: Use absolute paths so this works regardless of current directory
if exist "%MC_DIR%\.data\mission-control.db" (
    copy /y "%MC_DIR%\.data\mission-control.db" "%MC_DIR%\.next\standalone\.data\mission-control.db" >nul 2>&1
    copy /y "%MC_DIR%\.data\mission-control.db-shm" "%MC_DIR%\.next\standalone\.data\mission-control.db-shm" >nul 2>&1
    copy /y "%MC_DIR%\.data\mission-control.db-wal" "%MC_DIR%\.next\standalone\.data\mission-control.db-wal" >nul 2>&1
    echo DB synced from .data
) else (
    echo WARNING: No .data\mission-control.db found
)

:: Check for HTTPS certs
set MC_CERT_PATH=%MC_DIR%\certs\mc.crt
set MC_KEY_PATH=%MC_DIR%\certs\mc.key

if exist "%MC_CERT_PATH%" (
    echo Starting Mission Control with HTTPS...
    set HTTPS_CERT=%MC_CERT_PATH%
    set HTTPS_KEY=%MC_KEY_PATH%
) else (
    echo Starting Mission Control (HTTP)...
)

:: Start MC with .env loaded
node --env-file=.env .next\standalone\server.js