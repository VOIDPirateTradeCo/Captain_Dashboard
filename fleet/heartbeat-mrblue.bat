@echo off
REM Crew Agent Heartbeat Daemon for SQUIDSTATION (Mr Blue)
set MC_URL=https://127.0.0.1:3100
:loop
curl -sk -X POST "%MC_URL%/api/adapters" -H "Content-Type: application/json" -H "X-Agent-Name: MR-BLUE" -d "{\"framework\":\"codex\",\"action\":\"heartbeat\",\"payload\":{\"agentId\":\"mr-blue\",\"status\":\"online\"}}" > nul 2>&1
timeout /t 300 /nobreak > nul
goto loop
