# VOID Pirate Trading Co - Quick Reference Guide
Generated: 2026-08-12T14:52:47.553734

## Obsidian Vault Structure

| Folder | Purpose | Key Contents |
|--------|---------|--------------|
| 00_Vault_Index | Vault navigation, audits, governance docs | 175 items |
| 01_VOID_BIZ_GDRIVE_SYNC | Google Drive sync configs and scripts | 199 items |
| 02_Automation | Automation scripts, launchers, card scripts | 49 items |
| 03_Projects | All project code and planning docs | 516 items |
| 04_Business_Operations | Business ops, scripts, state files | 18 items |
| 05_AI_Operating_System | AI brains, prompts, system configs | 29 items |
| 06_Crew_Roster | Crew rosters and personnel docs | 6 items |
| 07_Resources | Lore, templates, research, tools | 562 items |
| 08_Daily_Life | Daily logs, dashboards, session handoffs | 41 items |
| 09_Processed | Processed messages by crew member | 50 items |
| 10_Archive | Archive, old backups, historical logs | 41 items |
| 11_Artifacts | Generated artifacts, renders | 10 items |
| 12_Logs | System and process logs | 13 items |
| 13_Law_Admin | Legal documents, OPSEC, compliance | 8 items |
| 14_Offline_Queue | Offline message queue | 1 items |
| 15_Operations | Operations docs and runbooks | 7 items |
| 16_Cosmos_Library | Astrology, lore, universe docs | 269 items |
| 17_Cybersec_Library | Security tools, pentest guides, OPSEC | 69 items |
| _Hub | Crew hub, scripts, templates | 86 items |
| Excalidraw | Whiteboard drawings | 175 items |
| MISS_PINK_INBOX | Messages for Miss Pink | 0 items |
| SIR_AZURE_INBOX | Messages for Sir Azure | 0 items |
| SIR_GREEN_INBOX | Messages for Sir Green | 0 items |
| Shared_With_Pink | Shared data with Miss Pink | 0 items |
| logs | Additional log files | 2 items |

## Live Dashboard

- **Location**: `Captain_Dashboard/dashboard/`
- **Port**: 8080
- **Health**: `http://127.0.0.1:8080/health`
- **Key files**:
  - `dashboard_server.py` - Main server
  - `services/health_check.py` - Health monitoring
  - `automation/fleet_comms_sync.py` - Crew sync

## Website Code

- **Location**: `PROJECT_VOID_Pirate_Website/`
- **Dashboard**: `hive-mind-dashboard/app.py`
- **API**: `void_crew_api/app.py`

## Content Map

- Full crew/file mapping: `Obsidian_Vault/00_Vault_Index/CONTENT_MAP_20260812.md`

## Crew Directory

| Crew Member | Role | Primary Location |
|-------------|------|------------------|
| Captain Brewbeard Ledgerbane | Captain | Captain_Dashboard, 00_Vault_Index |
| Sir Green | VOID Ops | 05_AI_Operating_System, 04_Business_Operations |
| Miss Pink | Torus Ops | 05_AI_Operating_System, Shared_With_Pink |
| Sir Azure | AI Art | 05_AI_Operating_System, 11_Artifacts |
| Sir Violet | Quill/Scribe | 05_AI_Operating_System, 07_Resources |
| Sir Cobalt | Tech/Dev | 05_AI_Operating_System, 03_Projects |

## Quick Commands

```bash
# Check dashboard health
curl http://127.0.0.1:8080/health

# View content map
cat Obsidian_Vault/00_Vault_Index/CONTENT_MAP_20260812.md

# Git status
git status
```