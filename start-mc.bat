@echo off
cd /d "C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control\.next\standalone"
set MC_CERT_PATH=C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control\certs\mc.crt
set MC_KEY_PATH=C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control\certs\mc.key
set PORT=3100
set HOSTNAME=0.0.0.0
echo Starting Mission Control with HTTPS...
node server.js
