# PS4 → Omarchy Linux AI Crew Nodes — Trello Card Drafts

## Card 1 — List: Future Ideas / PROJECT: Pirate Captain's Dashboard
**Title:** Phase 1 — PS4 hardware/firmware inventory for Omarchy Linux experiment
**Labels:** sir-green, sir-cobalt, captain's dashboard, future ideas, experimental
**Description:**
On each PS4, go to Settings → System → System Information and record:
- Exact model number
- Southbridge variant: Aeolia / Belize / Baikal
- Full firmware version

This determines which public jailbreak/Omarchy paths are viable.
Do not connect to PSN during inventory. Keep consoles offline.

---

## Card 2 — List: Future Ideas / PROJECT: Pirate Captain's Dashboard
**Title:** Phase 2 — Stable homebrew environment on each PS4
**Labels:** sir-green, sir-cobalt, captain's dashboard, future ideas, experimental
**Description:**
For the exact firmware from Card 1, follow the current public jailbreak guide until you have:
- Stable homebrew enabler (GoldHEN or current equivalent)
- BinLoader enabled
- FTP server enabled
- Confirmed offline operation (no PSN)

Keep notes of exact package versions and guide URLs used.

---

## Card 3 — List: Future Ideas / PROJECT: Pirate Captain's Dashboard
**Title:** Phase 3 — Prepare Omarchy-PS4 USB root image on SQUIDSTATION
**Labels:** sir-green, sir-cobalt, captain's dashboard, future ideas, experimental
**Description:**
On SQUIDSTATION:
- Review github.com/meerzulee/omarchy-ps4 for current Southbridge support
- Confirm whether Baikal B1 Slim or other model is verified
- Download matching FPKG + USB root filesystem image
- Flash USB root image to USB 3.0 drive (32–64 GB+) using imaging tool
- Verify image writes cleanly and filesystem is intact

---

## Card 4 — List: Future Ideas / PROJECT: Pirate Captain's Dashboard
**Title:** Phase 4 — Boot Omarchy on PS4 and validate desktop
**Labels:** sir-green, sir-cobalt, captain's dashboard, future ideas, experimental
**Description:**
On PS4 with homebrew running:
- Install Omarchy-PS4 FPKG via homebrew path
- Plug prepared USB drive
- Launch FPKG and confirm patched kernel + Linux loader handoff
- Boot into Omarchy desktop (Hyprland + Quickshell)
- If image is unsupported, fallback: Arch-based PS4 Linux root + Hyprland/Quickshell overlay

---

## Card 5 — List: Future Ideas / PROJECT: Pirate Captain's Dashboard
**Title:** Phase 5 — Make PS4 usable as experimental crew node
**Labels:** sir-green, sir-cobalt, captain's dashboard, future ideas, experimental
**Description:**
- Connect USB keyboard/mouse; prefer Ethernet if clean on model
- Complete network/time/user setup
- Install Hermes Desktop and point to free/cloud model providers
- Install Docker; accept CPU/RAM limits
- Install browser/Trello web or Electron app
- Configure Hyprland theme/keybinds and any audio/display workarounds
- Enable SSH from SQUIDSTATION for remote config and agent management

---

## Card 6 — List: Future Ideas / PROJECT: Pirate Captain's Dashboard
**Title:** Phase 6 — Multi-PS4 experimental farm and LAN mesh
**Labels:** sir-green, sir-cobalt, captain's dashboard, future ideas, experimental
**Description:**
- Repeat stable boot process on second PS4
- Network both units
- Use SSH scripts/Hermes multi-agent config from SQUIDSTATION
- Assign one experimental crew role/agent per PS4
- Keep offline from PSN; LAN/Tailscale only

---

## Notes for Sir Cobalt
- These cards are intentionally labeled `future ideas` until Phase 1 is complete.
- Do not move to active lists until firmware/models are confirmed.
- Stay public-tooling only; no PSN, no modified online play, no resale intent.
