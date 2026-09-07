@echo off
REM Crew Agent Heartbeat Daemon for SQUIDSTATION (Captain)
REM Runs every 5 minutes via Windows Task Scheduler

set MC_URL=https://127.0.0.1:3100

:loop
curl -sk -X POST "%MC_URL%/api/adapters" -H "Content-Type: application/json" -H "X-Agent-Name: CAPTAIN" -d "{\"framework\":\"generic\",\"action\":\"heartbeat\",\"payload\":{\"agentId\":\"captain\",\"status\":\"online\"}}" > nul 2>&1
timeout /t 300 /nobreak > nul
goto loop
