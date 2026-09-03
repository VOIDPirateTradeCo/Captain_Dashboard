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

REM Create profile.yaml
(
echo # %AGENT_NAME% — Hermes Profile
echo name: %AGENT_ID%
echo description: %AGENT_NAME% — %SHIP% crew member
echo.
echo # Crew context
echo crew:
echo   role: %AGENT_NAME%
echo   ship: %SHIP%
echo   captain: Captain Brewbeard Ledgerbane
echo.
echo # Skills loaded by default
echo skills:
for %%s in (%SKILLS:,= %) do (
    echo   - %%s
)
echo.
echo # Working directory
echo workdir: C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/mission-control
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

REM Register with Mission Control
echo.
echo === Registering with Mission Control ===

set MC_KEY=
for /f "tokens=2 delims==" %%k in ('findstr "^API_KEY=" "%USERPROFILE%\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control\.env" 2^>nul') do set MC_KEY=%%k

if "%MC_KEY%"=="" (
    echo ⚠ Could not find Mission Control API key. Register manually:
    echo   curl -X POST http://localhost:3100/api/agents/register ^
    echo     -H "Content-Type: application/json" ^
    echo     -H "x-api-key: YOUR_KEY" ^
    echo     -d "{\"name\":\"%AGENT_ID%\",\"role\":\"agent\",\"capabilities\":[\"code\",\"review\"],\"framework\":\"hermes\"}"
) else (
    curl -s -X POST http://localhost:3100/api/agents/register ^
      -H "Content-Type: application/json" ^
      -H "x-api-key: %MC_KEY%" ^
      -d "{\"name\":\"%AGENT_ID%\",\"role\":\"agent\",\"capabilities\":[\"code\",\"review\"],\"framework\":\"hermes\"}"
    echo ✓ Registered with MC
)

echo.
echo === Setup complete for %AGENT_NAME% ===
echo Next steps:
echo 1. Restart Hermes desktop app
echo 2. Select the '%AGENT_ID%' profile
echo 3. Verify online in Mission Control UI

pause
