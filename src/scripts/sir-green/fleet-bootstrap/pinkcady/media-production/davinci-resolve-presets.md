# DaVinci Resolve 18 — Torus Coffee Edit Presets

## YouTube project settings
- Timeline resolution: 1920x1080
- Frame rate: 30 fps
- Pixel aspect: Square
- Color space: Rec.709
- Audio sample rate: 48000 Hz

## Edit workflow
1) Create bin: `YYYY-MM-DD-youtube`
2) Import all raw clips
3) Sync audio to video if recorded separately
4) Rough cut: select best takes, remove bad audio
5) Fine cut: tighten pacing, remove filler words
6) Color correction:
   - Lift shadows for coffee shop warmth
   - Boost midtones slightly
   - Desaturate background distractions
7) Audio mix:
   - Normalize all clips to -6dB peak
   - Light compression on voice
   - Background music: -20dB under voice
8) Titles:
   - Intro bumper: 5 seconds, Torus Coffee logo
   - Lower third: guest name/title
   - End slate: subscribe box with handles
9) Export

## Export settings — YouTube
- Format: MP4
- Codec: H.264
- Resolution: 1920x1080
- Frame rate: 30 fps
- Bitrate: 20 Mbps
- Audio: AAC 48kHz 320kbps stereo
- Save to: `media/edited/youtube/YYYY-MM-DD-youtube.mp4`

## Export settings — TikTok
- Format: MP4
- Codec: H.264
- Resolution: 1080x1920 (vertical)
- Frame rate: 30 fps
- Bitrate: 8 Mbps
- Audio: AAC 48kHz 192kbps stereo
- Save to: `media/edited/tiktok/YYYY-MM-DD-tiktok.mp4`

## TikTok crop in Resolve
1) Right-click timeline → Render in Place (1080p)
2) Create new timeline: 1080x1920
3) Drag rendered clip to center
4) Use Transform to crop/scale to fill 9:16
5) Add captions: Text+ tool, create from subtitle import if available
6) Export with TikTok preset

## If Resolve is too heavy
Use FFmpeg crop:
```bash
ffmpeg -i input.mp4 -vf "crop=1080:1920:(iw-1080)/2:(ih-1920)/2" -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 192k tiktok.mp4
```
