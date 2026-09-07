@echo off
REM Crew Agent Heartbeat Daemon for SQUIDSTATION
REM Runs every 5 minutes via Windows Task Scheduler
REM Keeps sir-green and sir-cobalt showing online in MC dashboard

set MC_URL=https://127.0.0.1:3100
set AGENT_ID=sir-green
set AGENT_NAME=Sir%20Green

:loop
curl -sk -X POST "%MC_URL%/api/adapters" -H "Content-Type: application/json" -H "X-Agent-Name: SIR-GREEN" -d "{\"framework\":\"generic\",\"action\":\"heartbeat\",\"payload\":{\"agentId\":\"%AGENT_ID%\",\"status\":\"online\"}}" > nul 2>&1
timeout /t 300 /nobreak > nul
goto loop
