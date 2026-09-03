@echo off
setlocal

echo === Setting up Mission Control on this ship ===
echo.

set "MASTER=192.168.0.39"
set "SHIP_PORT=3000"
set "WORKDIR=%~dp0mission-control"

echo --- Stopping existing Node processes ---
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

echo --- Checking Mission Control source ---
if not exist "%WORKDIR%" (
    echo ERROR: Mission Control source not found at %WORKDIR%
    echo Please ensure mission-control folder exists in this package
    pause
    exit /b 1
)

echo --- Rebuilding native modules ---
cd /d "%WORKDIR%"
cmd.exe /c "npm rebuild better-sqlite3"
echo.

echo --- Starting Mission Control ---
echo Starting on 0.0.0.0:%SHIP_PORT%
start /B cmd.exe /c "npx next dev --hostname 0.0.0.0 --port %SHIP_PORT%"
timeout /t 10 /nobreak >nul
echo.

echo --- Checking if port is listening ---
netstat -ano | findstr :%SHIP_PORT% | findstr LISTENING && echo Mission Control is running || echo ERROR: Mission Control failed to start
echo.

echo --- Testing health ---
powershell -Command "try { $h = Invoke-RestMethod -Uri 'http://127.0.0.1:%SHIP_PORT%/health' -UseBasicParsing; Write-Host 'Health:' $h } catch { Write-Host 'Health check failed' }"
echo.

echo --- Registering with master ---
powershell -Command "$body = '{\"framework\":\"generic\",\"action\":\"register\",\"payload\":{\"agentId\":\"%COMPUTERNAME%\",\"name\":\"%COMPUTERNAME%\",\"metadata\":{\"host\":\"%COMPUTERNAME%\",\"capabilities\":[\"ops\"]}}}'; try { $r = Invoke-RestMethod -Uri 'http://%MASTER%:3100/api/adapters' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing; Write-Host 'Registered:' $r.id } catch { Write-Host 'Registration failed:' $_.Exception.Message }"
echo.

echo --- Sending heartbeat ---
powershell -Command "$body = '{\"framework\":\"generic\",\"action\":\"heartbeat\",\"payload\":{\"agentId\":\"%COMPUTERNAME%\",\"status\":\"online\"}}'; try { $r = Invoke-RestMethod -Uri 'http://%MASTER%:3100/api/adapters' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing; Write-Host 'Heartbeat:' $r.status } catch { Write-Host 'Heartbeat failed:' $_.Exception.Message }"
echo.

echo === Mission Control setup complete ===
pause
