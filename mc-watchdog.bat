@echo off
setlocal

set MC_DIR=C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control
set MC_PORT=3100
set MC_LOG=%MC_DIR%\mc.log

cd /d %MC_DIR%

:loop
echo [%date% %time%] Starting MC...
start /min "" node .next/standalone/server.js >> %MC_LOG% 2>&1
timeout /t 30 /nobreak >nul

:check
netstat -ano | findstr ":%MC_PORT%" >nul
if %errorlevel% equ 0 (
    echo MC is running on port %MC_PORT%
    timeout /t 60 /nobreak >nul
    goto check
) else (
    echo MC died, restarting...
    goto loop
)
