@echo off
chcp 65001 >nul
echo ==========================================
echo Sir Azure — Mission Control Crew Setup
echo ==========================================
echo.

:: Install Hermes profile if not present
if not exist "%APPDATA%\hermes\profiles\sir-azure\profile.yaml" (
    echo [1/4] Installing sir-azure Hermes profile...
    if not exist "%APPDATA%\hermes\profiles\sir-azure" mkdir "%APPDATA%\hermes\profiles\sir-azure"
    copy /Y "%~dp0profile_sir-azure.yaml" "%APPDATA%\hermes\profiles\sir-azure\profile.yaml"
    echo       Profile installed
) else (
    echo [1/4] sir-azure profile already exists
)

:: Verify Python available for connector
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.11+ first.
    pause
    exit /b 1
)

:: Register with Mission Control via Tailscale
echo [2/4] Registering sir-azure with Mission Control...
set MC_URL=https://squidstation.taile6676f.ts.net
python "%~dp0crew_agent_connector.py"
if %errorlevel% neq 0 (
    echo [ERROR] Registration failed
    pause
    exit /b 1
)

:: Verify registration
echo [3/4] Verifying registration...
curl -s -k "%MC_URL%/api/agents" -H "x-api-key: %MC_API_KEY%" >nul 2>&1
if %errorlevel% equ 0 (
    echo       Sir Azure registered with Mission Control
) else (
    echo [WARN] Could not verify - check MC connection
)

:: Open Skills Library
echo [4/4] Opening Skills Library...
start "" "%MC_URL%/panel/skills"

echo.
echo ==========================================
echo Setup complete!
echo Profile: sir-azure
echo Ship: STEALTHATTACK
echo MC: %MC_URL%
echo ==========================================
pause
