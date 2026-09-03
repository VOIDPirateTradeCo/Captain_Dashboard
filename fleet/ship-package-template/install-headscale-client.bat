@echo off
setlocal

echo === Installing Tailscale + Headscale client ===
echo Ship: %COMPUTERNAME%
echo.

echo Downloading Tailscale installer...
powershell -Command "Invoke-WebRequest -Uri 'https://pkgs.tailscale.com/stable/tailscale-setup-latest.exe' -OutFile '%TEMP%\tailscale-setup.exe'"
if not exist "%TEMP%\tailscale-setup.exe" (
    echo ERROR: Failed to download Tailscale installer
    pause
    exit /b 1
)

echo Installing Tailscale silently...
"%TEMP%\tailscale-setup.exe" /S
if errorlevel 1 (
    echo ERROR: Tailscale installation failed
    pause
    exit /b 1
)

echo.
echo Tailscale installed successfully!
echo.
echo Next steps:
echo 1. Run 'tailscale up --authkey YOUR_PREAUTH_KEY_HERE' to join the VOID mesh
echo 2. Run verify-mesh.bat to test connectivity
echo.
pause
