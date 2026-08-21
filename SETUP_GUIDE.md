# VOID Pirate Trading Co - Hive Mind Setup Guide

## Gitea Central Server
- **URL:** `http://localhost:3000`
- **SSH:** `ssh://git@localhost:3000/VOIDPirate/<repo>.git`

## Accounts
- **Captain/Brewbeard:** `captain` / `V0idP1rate!`
- **Seraphine/Northstar:** `northstar` / `T0rusC0ff33!`

## Repositories
- `VOIDPirate/Obsidian_Vault` - Personal knowledge base
- `VOIDPirate/Captain_Dashboard` - Hive mind dashboard
- `VOIDPirate/PROJECT_tr3asure_mAp` - Trading software
- `VOIDPirate/PROJECT_crownless_fortune` - RPG game
- `VOIDPirate/PROJECT_VOID_Pirate_Website` - Website
- `VOIDPirate/automations` - Shared automations
- `VOIDPirate/ops` - Business operations docs

## Setup on Each PC

### SQUIDSTATION (Captain/Sir Green)
```bash
cd C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co

# Init git for each folder
git init
git config user.name "captain"
git config user.email "voidpiratetrading@gmail.com"
git remote add origin http://localhost:3000/VOIDPirate/<repo>.git
git add .
git commit -m "Initial import"
git push -u origin master
```

### PINKCADY (Miss Pink/Seraphine)
```bash
# 1. Generate SSH key if needed
ssh-keygen -t ed25519 -C "toruscoffeecompany@gmail.com"

# 2. Add SSH key to Gitea:
# - Go to http://localhost:3000/user/settings/keys
# - Copy contents of ~/.ssh/id_ed25519.pub
# - Add as "pinkcady-miss-pink"

# 3. Clone repos
cd Z:\Work
git clone http://localhost:3000/VOIDPirate/automations.git
git clone http://localhost:3000/VOIDPirate/ops.git
```

### STEALTHATTACK (Sir Azure)
```bash
# 1. Generate SSH key if needed
ssh-keygen -t ed25519 -C "sir.azure@stealthattack"

# 2. Add SSH key to Gitea:
# - Go to http://localhost:3000/user/settings/keys
# - Copy contents of ~/.ssh/id_ed25519.pub
# - Add as "stealthattack-sir-azure"

# 3. Clone repos
cd Y:\
git clone http://localhost:3000/VOIDPirate/Obsidian_Vault.git
git clone http://localhost:3000/VOIDPirate/automations.git
```

## Sync Workflow
1. **ALWAYS pull before starting work:**
   ```bash
   git pull origin master
   ```

2. **Work on your files**

3. **Push when done:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin master
   ```

## IMPORTANT RULES
- **NEVER** force push unless you know what you're doing
- **NEVER** delete branches without backup
- **ALWAYS** pull before pushing
- **NEVER** commit secrets or passwords
- Each PC has its own local workspace - don't overwrite others' work

## Crew Assignments
- **Sir Green:** SQUIDSTATION, VOID Pirate ops
- **Miss Pink:** PINKCADY, Torus Coffee ops
- **Sir Azure:** STEALTHATTACK, AI art for both
- **Sir Violet:** SQUIDSTATION, cloud LLM for both
- **Sir Cobalt:** SQUIDSTATION, cloud LLM for both
