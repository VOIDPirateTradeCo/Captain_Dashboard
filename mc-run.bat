@echo off
cd /d "C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control"
set NODE_ENV=production
set PORT=3100
set HOSTNAME=0.0.0.0
set HERMES_AGENT_NAME=sir-green
set AUTH_USER=Captain
set AUTH_PASS=voidcaptain2026

REM Read API_KEY from .env into env var (standalone Node doesn't load .env)
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if "%%a"=="API_KEY" set "API_KEY=%%b"
)

REM Run directly from build output (.next/standalone). After `pnpm build`, run 
REM scripts/fix-standalone.ps1 to re-patch server.js (chdir fix) and copy 
REM @swc/helpers (missing from Next's traced output).
"C:\Program Files\nodejs\node.exe" ".next\standalone\server.js"
