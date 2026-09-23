@echo off
:: Launch proxy directly via pythonw.exe (no hermes.exe parent)
set PROXY_PORT=8645

:: Kill existing
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :!PROXY_PORT! ^| findstr LISTEN') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Start via pythonw.exe directly (absolute path)
start "" /MIN "C:\Users\kidsm\AppData\Local\hermes\hermes-agent\venv\Scripts\pythonw.exe" "C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control\proxy_standalone.py"

echo Proxy started on :!PROXY_PORT!
exit /b 0
