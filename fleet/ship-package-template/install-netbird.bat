@echo off
setlocal

echo === Installing NetBird ===
echo.

echo Downloading NetBird...
powershell -Command "Invoke-WebRequest -Uri 'https://pkgs.netbird.io/installers/windows/stable/netbird-installer.exe' -OutFile '%TEMP%\netbird-installer.exe'"
if not exist "%TEMP%\netbird-installer.exe" (
    echo ERROR: Failed to download NetBird installer
    echo Please download manually from https://netbird.io/download
    pause
    exit /b 1
)

echo Installing NetBird...
"%TEMP%\netbird-installer.exe" /S
if errorlevel 1 (
    echo ERROR: NetBird installation failed
    pause
    exit /b 1
)

echo.
echo NetBird installed successfully!
echo.
echo Next steps:
echo 1. Run 'netbird status' to verify installation
echo 2. Run 'netbird up' to connect to VOID mesh
echo 3. Run verify-mesh.bat to test connectivity
echo.
pause
