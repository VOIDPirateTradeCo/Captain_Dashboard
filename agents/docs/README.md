=== CHECKPOINT ===
Write the following 4 files to disk using `write_file`, then copy them to both shared drives.
DO NOT use the terminal for file writes — use `write_file` so hashes are verified.
PATIENT: this is the last card in the run; write every file fully and confirm each write landed.

File 1 — path: C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\agents\docs\README.md
content:
# Agent SDK — Build Instructions

## What This Is
Agent SDK for the VOID Pirate Captain's Mission Control.
Lets any PC register as an agent and report status to the master MC on SQUIDSTATION.

## Quick Start (10 min)

### 1. Open PowerShell as Administrator
Right-click → Run as Administrator

### 2. Go to your agent-node folder
- **PINKCADY**: `cd D:\Work\Torus Coffee Company LLC\agent-node`
- **STEALTHATTACK**: `cd S:\Sir_Azure\Sir_Azure_Stuff\Captain_Dashboard\agent-node`

### 3. Install Python 3.11+ if missing
Download from https://www.python.org/downloads/

### 4. Install the SDK
```
cd sdk
pip install -e .
```

### 5. Test registration
```
cd ..
python -c "from agents.sdk import Agent; a = Agent('YOUR_ID','Your Name','http://192.168.0.39:3100','d5136b530f878123aba1d321c6972888b5181f7f13d0afa58d55c732f0bf989f'); print('Register:', a.register(['YOUR_CAPABILITIES']))"
```

### Expected output
`Register: True`

### 6. Test heartbeat
```
python -c "from agents.sdk import Agent; a = Agent('YOUR_ID','Your Name','http://192.168.0.39:3100','d5136b530f878123aba1d321c6972888b5181f7f13d0afa58d55c732f0bf989f'); print('Heartbeat:', a.heartbeat('online'))"
```

### Expected output
`Heartbeat: True`

## Agent IDs
| Machine | Agent ID | Name | Capabilities |
|---------|----------|------|-------------|
| PINKCADY | miss-pink | Miss Pink | ops,torus,dashboard,comms |
| STEALTHATTACK | sir-azure | Sir Azure | code,review,art,gpu |
| SQUIDSTATION | sir-green | Sir Green | captain,build,security,admin |

## End-to-End Evidence Checklist
After install, paste these outputs to your Trello card:

1. `python --version`
2. `pip list | findstr agent`
3. Registration test output
4. Heartbeat test output
5. `python -c "from agents.sdk import Agent; a = Agent(...); print('Deps:', a.report())"` (dependency scan)

## Master MC URL
http://192.168.0.39:3100

## Questions?
Post them in your Trello card comments — Sir Green reads them.
