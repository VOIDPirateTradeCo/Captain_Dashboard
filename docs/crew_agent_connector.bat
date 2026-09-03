@echo off
REM Crew Agent Runtime Connector setup — Hermes desktop app wrapper
REM Run this on the crew machine to start/register the agent with Mission Control.
REM
REM Usage:
REM   crew_agent_connector.bat
REM   crew_agent_connector.bat sir-azure "Sir Azure" STEALTHATTACK

setlocal enabledelayedexpansion

if "%~3"=="" (
    echo Usage: %0 ^<agent-id^> ^<agent-name^> ^<ship^>
    echo Example: %0 sir-azure "Sir Azure" STEALTHATTACK
    exit /b 1
)

set AGENT_ID=%~1
set AGENT_NAME=%~2
set SHIP=%~3
set MC_URL=http://localhost:3100
set INTERVAL=60

echo === Crew Agent Runtime Connector ===
echo Agent: %AGENT_ID% (%AGENT_NAME%)
echo Ship: %SHIP%
echo MC: %MC_URL%
echo Interval: %INTERVAL%s
echo.

REM Best-effort register once
echo Registering with Mission Control...
curl -sS -X POST "%MC_URL%/api/agents/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"%AGENT_ID%\",\"role\":\"agent\",\"capabilities\":[\"code\",\"review\"],\"framework\":\"hermes\"}"
echo.
echo.

REM Heartbeat loop
:loop
for /f "tokens=1-2 delims=." %%a in ("%date% %time%") do set ts=%%a %%b
curl -sS -X POST "%MC_URL%/api/agents/%AGENT_ID%/heartbeat" ^
  -H "Content-Type: application/json" ^
  -d "{\"connection_id\":\"%AGENT_ID%:runtime\",\"status\":\"online\",\"last_activity\":\"%AGENT_NAME% heartbeat\",\"ship\":\"%SHIP%\"}"
echo [%ts%] heartbeat sent
timeout /t %INTERVAL% >nul
goto loop
