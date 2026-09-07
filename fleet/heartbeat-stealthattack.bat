@echo off
REM Heartbeat daemon for crew agents
REM Runs every 5 minutes via Windows Task Scheduler

set MC_URL=https://127.0.0.1:3100
set API_KEY=d5136b530f878123aba1d321c6972888b5181f7f13d0afa58d55c732f0bf989f

:loop
curl -sk -X POST "%MC_URL%/api/adapters" -H "Content-Type: application/json" -H "x-api-key: %API_KEY%" -H "X-Agent-Name: STEALTHATTACK" -d "{\"framework\":\"generic\",\"action\":\"heartbeat\",\"payload\":{\"agentId\":\"sir-azure\",\"status\":\"online\"}}" > nul 2>&1
timeout /t 300 /nobreak > nul
goto loop
