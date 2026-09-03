# Audacity Podcast Audio Chain — Torus Coffee

## Project setup
- Sample rate: 48000 Hz
- Channels: Stereo
- Project rate: 48000 Hz

## Import
- File → Import → Audio (import all raw tracks)
- Align tracks by sync point or clap marker

## Noise reduction
1. Select 2-3 seconds of silence at start/end
2. Effect → Noise Reduction and Repair → Noise Reduction
3. Get Noise Profile
4. Select full track
5. Effect → Noise Reduction and Repair → Noise Reduction
   - Noise reduction: 12-18 dB
   - Sensitivity: 6.00
   - Frequency smoothing: 3 Hz
   - Click OK

## Compressor
- Effect → Volume and Compression → Compressor
- Noise floor: -45 dB
- Ratio: 3:1
- Threshold: -18 dB
- Attack time: 0.20 sec
- Release time: 1.00 sec

## Limiter
- Effect → Volume and Compression → Limiter
- Limit to: -1.0 dB
- Hold: 10 ms

## Normalize
- Effect → Volume and Compression → Normalize
- Peak: -1.0 dB

## Export
- File → Export → Export as MP3
  - Bitrate: 192 kbps
  - Quality: Standard
  - Save to: `media/edited/podcast/YYYY-MM-DD-podcast.mp3`

## Or export WAV then convert with FFmpeg
- File → Export → Export as WAV
  - Save to: `media/edited/podcast/YYYY-MM-DD-podcast.wav`
- Then run: `ffmpeg -i podcast.wav -b:a 192k podcast.mp3`

## Backup
- Save .aup3 project file
- Export final MP3 + WAV to exports folder
