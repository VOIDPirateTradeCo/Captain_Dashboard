@echo off
setlocal

echo === Verifying Mesh Connectivity ===
echo.

echo --- Checking NetBird status ---
netbird status
echo.

echo --- Checking mesh IP ---
ipconfig | findstr "100."
echo.

echo --- Testing connectivity to master ---
echo Pinging master Mission Control...
ping -n 3 192.168.0.39 | findstr "Reply"
echo.

echo --- Testing Mission Control login ---
echo Testing LAN login to master...
if defined MC_API_KEY (
  powershell -Command "$headers = @{ 'Content-Type' = 'application/json'; 'x-api-key' = '%MC_API_KEY%' }; try { $r = Invoke-RestMethod -Uri 'http://192.168.0.39:3100/api/adapters' -Method POST -Headers $headers -Body '{\"framework\":\"generic\",\"action\":\"register\",\"payload\":{\"agentId\":\"'%COMPUTERNAME%'\",\"name\":\"'%COMPUTERNAME%'\"}}' -UseBasicParsing; Write-Host 'Adapter register: SUCCESS' -ForegroundColor Green } catch { Write-Host ('Register FAILED: ' + $_.Exception.Message) -ForegroundColor Red }"
) else (
  echo SKIP: set MC_API_KEY to enable adapter registration
)
echo.

echo === Verification complete ===
pause
