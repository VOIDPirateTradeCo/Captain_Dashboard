@echo off
:: Launch the proxy service as a background process using pythonw.exe
:: This runs without a console window and is independent of Hermes desktop

set PYTHONW=C:\Users\kidsm\AppData\Local\hermes\hermes-agent\venv\Scripts\pythonw.exe
set SERVICE=C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control\proxy_service.py

:: Kill existing proxy service
taskkill /IM pythonw /F /FI "WINDOWTITLE eq proxy-service*" >nul 2>&1

:: Start the service
start "proxy-service" /MIN "%PYTHONW%" "%SERVICE%"

echo Proxy service started
exit /b 0
