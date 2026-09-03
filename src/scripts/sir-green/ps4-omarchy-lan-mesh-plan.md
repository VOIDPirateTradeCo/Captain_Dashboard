# PS4 → Omarchy Linux LAN Mesh Crew Node Plan
_Created: 2026-09-03_
_Status: Research-backed feasibility plan, not yet executed_

## Captain’s Constraint
- No PSN connection at any point.
- Internet access, if needed, is only through the Omarchy Linux web browser.
- Primary value to the fleet is **GPU/HDD/RAM contribution to the local LAN mesh**, not gaming.

## Research Sources
- `meerzulee/omarchy-ps4` — last updated Aug 23, 2026. Active Omarchy 4.0 port for PS4.
- `feeRnt/ps4-linux-12xx` — kernels updated Mar 2026 for Aeolia/Belize/Baikal. Includes Docker/KVM/netfilter support.
- `Hakkuraifu/PS4Linux-Documentation` — distro/kernel matrix for Aeolia/Belize/Baikal.
- Community: GoldHEN is current homebrew enabler as of 2025/2026.

## Phase 0 — Hardware Inventory
On each PS4, record:
1. Exact model number
2. Southbridge: Aeolia / Belize / Baikal
3. Firmware version
4. HDD size
5. RAM revision
6. GPU revision

Why this matters:
- `meerzulee/omarchy-ps4` explicitly lists **PS4 Slim, Baikal B1** as the verified target.
- `feeRnt/ps4-linux-12xx` has separate Aeolia/Belize/Baikal kernels. Belize kernels include AMDGPU Gladius register fixes and WiFi/BT patches. Baikal kernels are separate and may lack HDD support in older stable builds.
- Firmware determines which public jailbreak method is currently viable.

## Phase 1 — Offline Homebrew Environment
Stay completely offline from PSN.
1. Match firmware to current public GoldHEN release.
2. Build/obtain a trusted host exploit payload for that firmware version.
3. Install/enable:
   - GoldHEN or equivalent homebrew enabler
   - BinLoader
   - FTP server
4. Verify by running unsigned homebrew from USB/external storage only.
5. Do not update firmware unless it breaks out of a jailbreakable window.

Evidence check: homebrew app launches successfully; no PSN traffic observed.

## Phase 2 — Prepare Omarchy-PS4 Boot Media
On SQUIDSTATION:
1. Clone `github.com/meerzulee/omarchy-ps4`.
2. Read `docs/COMPATIBILITY.md` and confirm whether the exact Southbridge is supported.
3. If Baikal B1 Slim is confirmed:
   - Use project’s release/FOSS build scripts to prepare USB rootfs.
   - Flash USB 3.0 drive as whole-device ext4 labelled `OMARCHY-PS4`.
4. If not Baikal B1 Slim:
   - Use `feeRnt/ps4-linux-12xx` matching kernel + initramfs.
   - Prepare Arch-based rootfs with PS4 drivers (`mesa-ps4`, `libdrm-ps4`, `xf86-video-amdgpu-ps4`).
   - Install Hyprland + Quickshell + Omarchy configuration layer on top.
5. Verify USB image boots on a test machine or VM before moving to PS4.

Evidence check: USB drive mounts cleanly, filesystem intact, checksum matches published build.

## Phase 3 — Boot Linux / Omarchy on PS4
1. Boot PS4 into homebrew environment.
2. Install/launch Omarchy-PS4 FPKG or Linux payload.
3. Plug prepared USB drive.
4. Confirm patched kernel + Linux loader handoff.
5. Land in Omarchy desktop: Hyprland + Quickshell, 1080p@60.
6. If dedicated Omarchy image is unsupported, fallback to Arch-based PS4 Linux with manual Omarchy layer.

Evidence check: SSH works from SQUIDSTATION; browser opens a webpage; `docker --version` runs.

## Phase 4 — LAN Mesh Crew Node Setup
Goal: make the PS4 an always-on experimental node in the fleet mesh.

### Network
- Prefer Ethernet. If WiFi is required, note current PS4 Linux WiFi status: Marvell 88w8897 has functional patches in Belize kernels; MediaTek MT7668/BT is work-in-progress in newer community kernels.
- Assign static LAN IP or Tailscale on the PS4 Linux side.
- Disable PSN connectivity in PS4 OS; never log into PlayStation Network.
- Internet access is allowed only via Omarchy browser inside Linux.

### Node Roles
Choose role per unit based on hardware test results.

#### PS4 #1 — Experimental Agent + Light Inference Node
- Run Hermes Desktop or browser-based agent panel.
- Install Docker if kernel supports cgroups/netfilter.
- Run small free models locally as fallback:
  - TinyLlama 1.1B Chat Q4
  - Phi-2 / Phi-3-mini Q4 if VRAM allows
  - Gemma-2B-it Q4
- Use `ollama` or `llama.cpp` inside Docker.
- Contribute CPU inference for small crew tasks when main hive is busy.

#### PS4 #2 — Storage/Backup + Browser/Cron Node
- Expose PS4 internal HDD via SMB/NFS to SQUIDSTATION.
- Use as backup/staging target for Mission Control evidence, logs, media assets.
- Run browser-based cron jobs:
  - Trello web auth inside Chromium for crew visibility
  - Light web scraping/tool use inside Omarchy browser
- Optional: run small model inference as secondary worker.

### Realistic Expectations
- **GPU**: PS4 GPU is AMD GCN-era. VRAM is limited and shared. Do not expect modern CUDA-style LLM compute. Value is in:
  - CPU parallelism for small model inference
  - Display/browser rendering
  - Light containerized services
- **HDD**: internal PS4 HDD can be repurposed as network storage once Linux is running.
- **Mesh**: node should SSH back to SQUIDSTATION and/or register with `https://192.168.0.39:3100/api/agents/register`.
- **Performance**: expect ~2013-2014 PC feel. Fine for testing and light workloads.

## Phase 5 — Make It Usable
- USB keyboard/mouse; hub recommended.
- Keyboard layout, network, time, user setup.
- Install:
  - Chromium or Firefox for web/Omarchy browser use
  - SSH server with key auth from SQUIDSTATION
  - Docker, if verified supported
  - `ollama` / `llama.cpp` for tiny-model inference
  - `smbclient` / NFS exports for storage contribution
- Configure Hyprland keybinds, themes, display/audio workarounds.
- Enable Tailscale or static LAN route back to master.

## Phase 6 — Multi-PS4 Farm
- Repeat on second PS4.
- Assign one role per PS4 to avoid overlap.
- Keep both offline from PSN.
- Use SQUIDSTATION as control plane.

## Implementation Prompts for Crew

### Sir Cobalt / Research Lead
```
Research the exact model/Southbridge/firmware of both PS4 units.
Then build or obtain the matching Linux boot chain:
- If Baikal B1 Slim: use meerzulee/omarchy-ps4 release artifacts.
- Else: use feeRnt/ps4-linux-12xx kernel + Arch-based rootfs with PS4 drivers.
Stay offline from PSN. Internet access only via Omarchy browser later.
```

### Miss Pink / Media + Torus Node
```
Once Phase 1-3 are complete on one PS4, use its browser and HDD for Torus Coffee media work:
- Edit video/audio metadata in browser tools if needed
- Stage exported podcast/YouTube assets to PS4 HDD via SMB
- Keep PSN off forever
```

### Sir Azure / STEALTHATTACK Node
```
From STEALTHATTATION, prepare build scripts and USB imaging for Omarchy-PS4 or Arch-PS4 media on SQUIDSTATION. Verify SSH from STEALTHATTACK to PS4 Linux once online.
