@echo off
REM Register VOID Pirate Dashboard Windows Task Scheduler tasks
REM Handles paths with spaces safely

set "PROJECT_DIR=C:\Users\kidsm\Documents\My docs\VOID Pirate Trading Co\PROJECT_capta1n_orchestrat0r"
set "PYTHON=C:\Python314\python.exe"
set "DASHBOARD_DIR=%PROJECT_DIR%\dashboard"
set "START_SCRIPT=%PROJECT_DIR%\start_all_services.bat"

echo ========================================
echo   VOID Pirate Fleet - Task Scheduler
echo   Registering auto-start tasks
echo ========================================

REM Register full fleet startup task
echo [1/2] Creating VOID_Pirate_Fleet_Startup...
schtasks /Create /TN "VOID_Pirate_Fleet_Startup" /TR "\"%START_SCRIPT%\"" /SC ONLOGON /F /RU "%USERNAME%"
if errorlevel 1 (
    echo [WARN] Fleet startup task needs admin rights. Try elevated cmd.
) else (
    echo [OK] Fleet startup task registered for auto-start
)

REM Register dashboard-only task (lighter, no Docker restart)
echo [2/2] Creating Captain_Dashboard_AutoStart...
schtasks /Create /TN "Captain_Dashboard_AutoStart" /TR "\"%PYTHON%\" -u \"%DASHBOARD_DIR%\dashboard_server.py\"" /SC ONLOGON /F /RU "%USERNAME%" /D "%DASHBOARD_DIR%"
if errorlevel 1 (
    echo [WARN] Dashboard task needs admin rights. Try elevated cmd.
) else (
    echo [OK] Dashboard auto-start task registered
)

echo.
echo === Registered VOID tasks ===
schtasks /Query /FO TABLE 2>nul | findstr /I "VOID Pirate Captain"

echo.
echo Tasks will run automatically on Windows log on.
echo To remove: schtasks /Delete /TN "VOID_Pirate_Fleet_Startup" /F
echo To remove: schtasks /Delete /TN "Captain_Dashboard_AutoStart" /F

endlocal
