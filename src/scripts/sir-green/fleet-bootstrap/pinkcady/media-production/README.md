# Torus Coffee Media Production — Free Software Stack

## Software to install on PINKCADY (all free)

### Core recording
- OBS Studio — https://obsproject.com/download
- Audacity — https://www.audacityteam.org/download/
- DaVinci Resolve 18 — https://www.blackmagicdesign.com/products/davinciresolve/

### Utilities
- FFmpeg — https://ffmpeg.org/download.html (Windows builds at https://www.gyan.dev/ffmpeg/builds/)
- CapCut — https://www.capcut.com/desktop
- Canva (free account) — https://www.canva.com/

### Optional but recommended
- HandBrake — https://handbrake.fr/downloads.php
- VLC — https://www.videolan.org/vlc/

## Directory structure
```
PINKCADY/media/
├── raw/
│   ├── YYYY-MM-DD-podcast/
│   └── YYYY-MM-DD-youtube/
├── edited/
│   ├── podcast/
│   ├── youtube/
│   └── tiktok/
├── exports/
│   ├── YYYY-MM-DD-podcast.mp3
│   ├── YYYY-MM-DD-youtube.mp4
│   └── YYYY-MM-DD-tiktok.mp4
└── archives/
    └── YYYY-MM-DD/
        ├── raw/
        ├── edited/
        └── exports/
```

## Naming convention
- Raw camera files: `camA_YYYYMMDD_HHMMSS.mp4`, `camB_YYYYMMDD_HHMMSS.mp4`
- Audio files: `audio_YYYYMMDD_HHMMSS.wav`
- Exports: `torus_YYYY-MM-DD_podcast.mp3`, `torus_YYYY-MM-DD_youtube.mp4`, `torus_YYYY-MM-DD_tiktok.mp4`

## Workflow overview
1) Film raw footage with OBS or cameras
2) Extract audio with FFmpeg if needed
3) Clean audio in Audacity
4) Edit video in DaVinci Resolve
5) Export YouTube MP4 with Resolve/FFmpeg preset
6) Crop/export TikTok MP4 with Resolve/FFmpeg preset
7) Export podcast MP3 with FFmpeg preset
8) Upload YouTube, TikTok, podcast platforms
9) Embed on website, backup all assets
