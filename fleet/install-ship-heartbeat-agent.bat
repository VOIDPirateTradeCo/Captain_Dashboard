@echo off
setlocal
set SERVICE_NAME=MissionControlHeartbeat
set NODE_EXE=node
set AGENT_SCRIPT=%~dp0ship-heartbeat-agent.cjs

echo Installing %SERVICE_NAME% ...

:: Create temp service definition XML
set SERVICE_XML=%TEMP%\mc_heartbeat_service.xml
(
echo ^<?xml version="1.0" encoding="UTF-16"?^>
echo ^<service^>
echo   ^<id^>%SERVICE_NAME%^</id^>
echo   ^<name^>Mission Control Ship Heartbeat Agent^</name^>
echo   ^<description^>Auto-registers and heartbeats this ship with master Mission Control.^</description^>
echo   ^<executable^>%NODE_EXE%^</executable^>
echo   ^<arguments^>"%AGENT_SCRIPT%"^</arguments^>
echo   ^<logpath^>%~dp0logs^</logpath^>
echo   ^<onfailure action="restart" delay="5000" /^>
echo ^</service^>
) > "%SERVICE_XML%"

:: Install with NSSM if available, otherwise create scheduled task fallback
where nssm.exe >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Installing with NSSM...
  nssm.exe install %SERVICE_NAME% "%NODE_EXE%" "%AGENT_SCRIPT%"
  nssm.exe set %SERVICE_NAME% AppDirectory "%~dp0"
  nssm.exe set %SERVICE_NAME% Start SERVICE_AUTO_START
  nssm.exe start %SERVICE_NAME%
) else (
  echo NSSM not found. Creating Scheduled Task fallback...
  schtasks /create /tn "%SERVICE_NAME%" /tr "'%NODE_EXE%' '%AGENT_SCRIPT%'" /sc onlogon /rl highest /f
  schtasks /run /tn "%SERVICE_NAME%"
)

echo.
echo Heartbeat agent installed. Check %~dp0logs for output.
pause
endlocal
