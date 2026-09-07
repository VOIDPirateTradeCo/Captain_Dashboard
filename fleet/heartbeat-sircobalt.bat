@echo off
REM Crew Agent Heartbeat Daemon for SQUIDSTATION (Sir Cobalt)
REM Runs every 5 minutes via Windows Task Scheduler

set MC_URL=https://127.0.0.1:3100
set AGENT_ID=sir-cobalt
set AGENT_NAME=Sir%20Cobalt

:loop
curl -sk -X POST "%MC_URL%/api/adapters" -H "Content-Type: application/json" -H "X-Agent-Name: SIR-COBALT" -d "{\"framework\":\"claude-sdk\",\"action\":\"heartbeat\",\"payload\":{\"agentId\":\"%AGENT_ID%\",\"status\":\"online\"}}" > nul 2>&1
timeout /t 300 /nobreak > nul
goto loop
