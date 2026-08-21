@echo off
REM FIREWALL BACKUP — Captures state before hardening
echo 📦 Backing up current firewall configuration...
netsh advfirewall export "C:\Users\kidsm\Documents\Fleet_Security\firewall_backup_squidstation.wfw"
echo ✅ Backup saved to: C:\Users\kidsm\Documents\Fleet_Security\firewall_backup_squidstation.wfw
echo.
echo 📋 Current open ports (pre-hardening):
netstat -an | findstr -i "2375 2376 6379 8080 3000 9090 9093"
