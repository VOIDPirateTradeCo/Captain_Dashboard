@echo off
setlocal

echo === VOID Fleet Ship Setup ===
echo Ship: %COMPUTERNAME%
echo Master: 192.168.0.39:3100
echo Setup folder: %~dp0
echo.

echo --- Checking existing installations ---
where netbird >nul 2>&1 && echo NetBird: FOUND || echo NetBird: MISSING
where tailscale >nul 2>&1 && echo Tailscale: FOUND || echo Tailscale: MISSING
where headscale >nul 2>&1 && echo Headscale: FOUND || echo Headscale: MISSING
where netmaker >nul 2>&1 && echo Netmaker: FOUND || echo Netmaker: MISSING
where node >nul 2>&1 && echo Node.js: FOUND || echo Node.js: MISSING
where docker >nul 2>&1 && echo Docker: FOUND || echo Docker: MISSING
echo.

echo --- Checking Mission Control ports ---
netstat -ano | findstr :3000
netstat -ano | findstr :3100
echo.

echo --- Checking firewall rules ---
netsh advfirewall firewall show rule name="ALLOW-MC-%COMPUTERNAME%-3000" 2>nul || echo No MC firewall rule found
echo.

echo --- Checking mesh connectivity ---
ping -n 2 192.168.0.39 | findstr "Reply"
echo.

echo === Setup complete ===
echo Next steps:
echo 1. Install Tailscale from https://tailscale.com/download
echo 2. Run install-headscale-client.bat or join NetBird
echo 3. Run register-agent.bat with MC API key
echo 4. Run verify-mesh.bat
pause
