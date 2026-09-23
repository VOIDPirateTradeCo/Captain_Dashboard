@echo off
cd /d "%~dp0.."
set MISSION_CONTROL_DATA_DIR=%~dp0..\.data
set PORT=3100
set HOSTNAME=0.0.0.0
set AUTH_SECRET=sk-temp-secret-key
set HERMES_GATEWAY_URL=https://inference-api.nousresearch.com/v1
set OPENAI_API_KEY=06892bbd5316b67ccccde5c0dfc3dda6903df81cecab47d9a98431ebabd87a32
node .next/standalone/server.js
