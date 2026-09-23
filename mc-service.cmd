@echo off
cd /d "C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control"
set NODE_ENV=production
set PORT=3100
set HOSTNAME=0.0.0.0
set AUTH_USER=Captain
set AUTH_PASS=voidcaptain2026
set MISSION_CONTROL_DATA_DIR=C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control\.data
start /B "" node .next\standalone\server.js
