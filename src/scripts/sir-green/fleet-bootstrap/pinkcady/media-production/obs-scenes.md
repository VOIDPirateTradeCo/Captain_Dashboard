# OBS Studio Scene Setup — Torus Coffee

## Scene 1: Podcast
Sources:
- Video Capture Device (camera 1) — center, 1080p crop
- Audio Input Capture (mic) — primary
- Audio Input Capture (camera audio) — sync to mic, lower volume
- Text (GDI+) — lower third: "Torus Coffee Podcast"

## Scene 2: YouTube Video
Sources:
- Video Capture Device (main camera) — full frame
- Video Capture Device (B-roll cam) — picture-in-picture top-right
- Audio Input Capture — boom mic or camera audio
- Text (GDI+) — intro bumper overlay, 5 seconds then hide
- Image — Torus Coffee logo watermark bottom-right

## Scene 3: Screen Capture
Sources:
- Display Capture (PINKCADY screen) — for tutorials/demos
- Audio Input Capture
- Window Capture (specific app if needed)

## Recording settings
- Base resolution: 1920x1080
- Output resolution: 1920x1080
- FPS: 30 (60 if slow-mo needed)
- Format: MP4 or MKV
- Encoder: Hardware NVENC/AMF if available, otherwise x264
- Bitrate: 25000 Kbps for high quality
- Audio: 48kHz, 320kbps AAC

## File naming
- Output path: `PINKCADY/media/raw/YYYY-MM-DD-podcast/scene1_timestamp.mp4`
- Use OBS "Filename Formatting" with `${%Y-%m-%d}`

## Hotkeys
- Start/Stop Recording: Ctrl+R
- Scene switch: F1, F2, F3
- Mute/unmute mic: Ctrl+M
