@echo off
:: Standalone Hermes Proxy Launcher
:: Runs hermes.exe proxy start --port 8644 as an independent process
:: This script is designed to be called from Startup folder or registry Run key

setlocal enabledelayedexpansion

:: Set Hermes paths
set HERMES_HOME=C:\Users\kidsm\AppData\Local\hermes\hermes-agent
set HERMES_EXE=!HERMES_HOME!\venv\Scripts\hermes.exe
set PROXY_PORT=8644

:: Kill existing proxy on the port (if any)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :!PROXY_PORT! ^| findstr LISTEN') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Start the proxy
start "" /min "!HERMES_EXE!" proxy start --port !PROXY_PORT%

echo Hermes proxy started on port !PROXY_PORT!
exit /b 0
