@echo off
setlocal
set PORT=3100
set NODE_ENV=production
set MC_DIR=C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control
cd /d %MC_DIR%

:: Sync DB from main data dir to standalone (handles rebuilds that wipe standalone\.data)
copy /y .data\mission-control.db .next\standalone\.data\mission-control.db >nul 2>&1
copy /y .data\mission-control.db-shm .next\standalone\.data\mission-control.db-shm >nul 2>&1
copy /y .data\mission-control.db-wal .next\standalone\.data\mission-control.db-wal >nul 2>&1

node .next\standalone\server.js
