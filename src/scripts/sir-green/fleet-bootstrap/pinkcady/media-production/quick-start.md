# Quick Start — Tonight's Production

## 1. Install software (30 min)
Download all installers from the links in README.md. Install in this order:
1. FFmpeg (add to PATH)
2. OBS Studio
3. Audacity
4. DaVinci Resolve 18

## 2. Create folder structure
```powershell
New-Item -ItemType Directory -Force -Path "PINKCADY/media/raw/$(Get-Date -Format yyyy-MM-dd)-podcast"
New-Item -ItemType Directory -Force -Path "PINKCADY/media/raw/$(Get-Date -Format yyyy-MM-dd)-youtube"
New-Item -ItemType Directory -Force -Path "PINKCADY/media/edited/podcast"
New-Item -ItemType Directory -Force -Path "PINKCADY/media/edited/youtube"
New-Item -ItemType Directory -Force -Path "PINKCADY/media/edited/tiktok"
New-Item -ItemType Directory -Force -Path "PINKCADY/media/exports"
```

## 3. Connect TikTok
- Open browser on PINKCADY
- Login to TikTok account
- Note username in card comment

## 4. Film podcast (60-90 min)
- Set up OBS scenes per obs-scenes.md
- Record to `media/raw/YYYY-MM-DD-podcast/`
- Backup immediately

## 5. Film YouTube video (20-30 min)
- Set up camera, lights, mic
- Record to `media/raw/YYYY-MM-DD-youtube/`
- Backup immediately

## 6. Edit podcast (30 min)
- Import audio into Audacity
- Apply chain per audacity-podcast-chain.md
- Export MP3

## 7. Edit YouTube (60 min)
- Import clips into Resolve
- Cut, color, audio mix per davinci-resolve-presets.md
- Export MP4

## 8. Edit TikTok (20 min)
- Crop best clip to 9:16
- Add captions
- Export MP4

## 9. Upload
- YouTube: studio.youtube.com
- TikTok: tiktok.com or app
- Embed on website

## 10. Archive
- Copy all `media/` to backup drive
- Post URLs back to Trello cards
