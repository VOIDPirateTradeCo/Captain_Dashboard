@echo off
setlocal

echo === Registering this ship with Captain Dashboard ===
set MASTER_URL=https://192.168.0.39:3100
set AGENT_NAME=%COMPUTERNAME%
set API_KEY=%1

if "%API_KEY%"=="" (
    echo ERROR: Missing API key argument
    echo Usage: register-agent.bat ^<MISSION_CONTROL_API_KEY^>
    pause
    exit /b 1
)

echo Registering %AGENT_NAME% with master...
curl -sS -X POST "%MASTER_URL%/api/adapters" ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: %API_KEY%" ^
  -H "X-Agent-Name: %AGENT_NAME%" ^
  -d "{\"framework\":\"generic\",\"action\":\"register\",\"payload\":{\"agentId\":\"%AGENT_NAME%\",\"name\":\"%AGENT_NAME%\",\"metadata\":{\"host\":\"%AGENT_NAME%\",\"capabilities\":[\"ops\"]}}}"

echo.
echo Sending initial heartbeat...
curl -sS -X POST "%MASTER_URL%/api/adapters" ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: %API_KEY%" ^
  -d "{\"framework\":\"generic\",\"action\":\"heartbeat\",\"payload\":{\"agentId\":\"%AGENT_NAME%\",\"status\":\"online\"}}"

echo.
echo === Registration complete ===
pause
