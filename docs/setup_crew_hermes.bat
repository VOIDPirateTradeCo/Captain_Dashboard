@echo off
REM Setup script for crew Hermes profiles on remote Windows machines
REM Usage: setup_crew_hermes.bat <agent-id> <agent-name> <ship> <skills>
REM Example: setup_crew_hermes.bat sir-azure "Sir Azure" STEALTHATTACK "flux-best-practices,comfyui,code-review"

setlocal enabledelayedexpansion

if "%~4"=="" (
    echo Usage: %0 ^<agent-id^> ^<agent-name^> ^<ship^> ^<skills^>
    echo Example: %0 sir-azure "Sir Azure" STEALTHATTACK "flux-best-practices,comfyui,code-review"
    exit /b 1
)

set AGENT_ID=%~1
set AGENT_NAME=%~2
set SHIP=%~3
set SKILLS=%~4

echo === Setting up Hermes profile for %AGENT_NAME% (%AGENT_ID%) on %SHIP% ===

REM Create profile directory
set PROFILE_DIR=%LOCALAPPDATA%\hermes\profiles\%AGENT_ID%
if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%"

REM Create profile.yaml — workdir is ship-relative (no hardcoded captain persona / absolute path)
(
echo # %AGENT_NAME% — Hermes Profile
echo name: %AGENT_ID%
echo description: %AGENT_NAME% — %SHIP% crew member
echo.
echo # Crew context
echo crew:
echo   role: %AGENT_NAME%
echo   ship: %SHIP%
echo.
echo # Skills loaded by default
echo skills:
for %%s in (%SKILLS:,= %) do (
    echo   - %%s
)
echo.
echo # Working directory — ship-relative so it works on any machine
echo workdir: %~dp0..
echo.
echo # Memory
echo memory:
echo   user: USER.md
echo   memory: MEMORY.md
echo.
echo # Rules
echo rules:
echo   - Always verify before claiming
echo   - Rate-limit Trello: 20-75s waits
echo   - OPSEC: never expose secrets in logs
echo   - No Captain's Watch label changes
) > "%PROFILE_DIR%\profile.yaml"

echo ✓ Created profile: %PROFILE_DIR%\profile.yaml

REM Verify Hermes config
if exist "%LOCALAPPDATA%\hermes\config.yaml" (
    echo ✓ Hermes config found at %LOCALAPPDATA%\hermes\config.yaml
) else (
    echo ⚠ Hermes config not found. Install Hermes desktop app first.
    exit /b 1
)

REM Register with Mission Control — uses /api/adapters (standardized endpoint) + MC API key
echo.
echo === Registering with Mission Control ===

set MC_KEY=
for /f "tokens=2 delims==" %%k in ('findstr "^API_KEY=" "%~dp0..\..\.env" 2^>nul') do set MC_KEY=%%k

if "%MC_KEY%"=="" (
    echo ⚠ Could not find Mission Control API key. Register manually:
    echo   curl -X POST http://YOUR_MC_URL:3100/api/adapters ^
    echo     -H "Content-Type: application/json" ^
    echo     -H "x-api-key: YOUR_API_KEY" ^
    echo     -H "X-Agent-Name: %AGENT_ID%" ^
    echo     -d "{\"framework\":\"generic\",\"action\":\"register\",\"payload\":{\"agentId\":\"%AGENT_ID%\",\"name\":\"%AGENT_NAME%\",\"metadata\":{\"host\":\"%COMPUTERNAME%\",\"ship\":\"%SHIP%\",\"capabilities\":[\"code\",\"review\"]}}}"
) else (
    curl -sS -X POST "http://%COMPUTERNAME%:3100/api/adapters" ^
      -H "Content-Type: application/json" ^
      -H "x-api-key: %MC_KEY%" ^
      -H "X-Agent-Name: %AGENT_ID%" ^
      -d "{\"framework\":\"generic\",\"action\":\"register\",\"payload\":{\"agentId\":\"%AGENT_ID%\",\"name\":\"%AGENT_NAME%\",\"metadata\":{\"host\":\"%COMPUTERNAME%\",\"ship\":\"%SHIP%\",\"capabilities\":[\"code\",\"review\"]}}}"
    echo ✓ Registered with MC
)

echo.
echo === Setup complete for %AGENT_NAME% ===
echo Next steps:
echo 1. Restart Hermes desktop app
echo 2. Select the '%AGENT_ID%' profile
echo 3. Verify online in Mission Control UI

pause
