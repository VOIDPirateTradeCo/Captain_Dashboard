@echo off
REM Crew Agent Runtime Connector setup — Hermes desktop app wrapper
REM Run this on the crew machine to start/register the agent with Mission Control.
REM
REM Usage:
REM   crew_agent_connector.bat
REM   crew_agent_connector.bat sir-azure "Sir Azure" STEALTHATTACK

setlocal enabledelayedexpansion

if "%~3"=="" (
    echo Usage: %0 ^<agent-id^> ^<agent-name^> ^<ship^> [mc-url]
    echo Example: %0 sir-azure "Sir Azure" STEALTHATTACK http://192.168.0.39:3100
    exit /b 1
)

set AGENT_ID=%~1
set AGENT_NAME=%~2
set SHIP=%~3
if not "%~4"=="" set MC_URL=%~4
if not defined MC_URL set MC_URL=http://localhost:3100
set INTERVAL=60

echo === Crew Agent Runtime Connector ===
echo Agent: %AGENT_ID% (%AGENT_NAME%)
echo Ship: %SHIP%
echo MC: %MC_URL%
echo Interval: %INTERVAL%s
echo.

REM Best-effort register once (using /api/adapters — standardized endpoint)
echo Registering with Mission Control...
for /f "tokens=2 delims==" %%k in ('findstr "^API_KEY=" "%USERPROFILE%\.env" 2^>nul') do set MC_KEY=%%k
if not defined MC_KEY (
    echo SKIP: set MC_API_KEY env var or add API_KEY to %USERPROFILE%\.env
) else (
    curl -sS -X POST "%MC_URL%/api/adapters" ^
      -H "Content-Type: application/json" ^
      -H "x-api-key: %MC_KEY%" ^
      -H "X-Agent-Name: %AGENT_ID%" ^
      -d "{\"framework\":\"generic\",\"action\":\"register\",\"payload\":{\"agentId\":\"%AGENT_ID%\",\"name\":\"%AGENT_NAME%\",\"metadata\":{\"host\":\"%COMPUTERNAME%\",\"ship\":\"%SHIP%\",\"capabilities\":[\"code\",\"review\"]}}}"
)
echo.
echo.

REM Heartbeat loop
:loop
for /f "tokens=1-2 delims=." %%a in ("%date% %time%") do set ts=%%a %%b
curl -sS -X POST "%MC_URL%/api/adapters" ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: %MC_KEY%" ^
  -H "X-Agent-Name: %AGENT_ID%" ^
  -d "{\"framework\":\"generic\",\"action\":\"heartbeat\",\"payload\":{\"agentId\":\"%AGENT_ID%\",\"status\":\"online\"}}"
echo [%ts%] heartbeat sent
timeout /t %INTERVAL% >nul
goto loop
