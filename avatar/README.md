# Avatar Service Setup

This service generates lip-synced AI interviewer videos using Wav2Lip or SadTalker.

## Requirements

- NVIDIA GPU with CUDA support
- Docker with NVIDIA Container Toolkit
- ~4GB GPU memory minimum

## Setup

### 1. Download Models

#### For Wav2Lip:
```bash
mkdir -p avatar/models

# Download wav2lip_gan.pth (recommended) or wav2lip.pth
# From: https://github.com/Rudrabha/Wav2Lip#getting-the-weights
# Place in: avatar/models/wav2lip_gan.pth

# Download face detection model s3fd.pth
# Place in: avatar/models/s3fd.pth
```

#### For SadTalker:
Models are auto-downloaded on first run, or manually:
```bash
cd SadTalker
bash scripts/download_models.sh
```

### 2. Add AI Interviewer Face

Place a face image for the AI interviewer:
```bash
# Add a clear, front-facing photo
cp your_ai_face.jpg assets/ai_interviewer.jpg
```

Recommended image specs:
- 256x256 or 512x512 pixels
- Clear, front-facing
- Neutral expression
- Good lighting

### 3. Run with Docker

```bash
# With avatar service (requires GPU)
docker-compose --profile avatar up

# Without avatar (audio only)
docker-compose up
```

## API Endpoints

### Generate Video from Audio File
```bash
POST /api/avatar/generate
{
  "audioPath": "/path/to/audio.wav",
  "faceImage": "/path/to/face.jpg"  # optional
}
```

### Generate Video from Base64 Audio
```bash
POST /api/avatar/generate
{
  "audioBase64": "base64_encoded_audio_data"
}
```

### Generate from PCM Audio
```bash
POST /api/avatar/generate-from-pcm
{
  "pcmBase64": "base64_encoded_pcm_data",
  "sampleRate": 24000,
  "channels": 1
}
```

### Check Status
```bash
GET /api/avatar/status
```

### Get Generated Video
```bash
GET /api/avatar/video/{filename}
```

## Environment Variables

```env
AVATAR_RENDERER=wav2lip          # or 'sadtalker'
AVATAR_FACE_SOURCE=/app/assets/ai_interviewer.jpg
AVATAR_OUTPUT_DIR=/app/avatar_output
WAV2LIP_DIR=/app/Wav2Lip
WAV2LIP_CHECKPOINT=/app/models/wav2lip_gan.pth
SADTALKER_DIR=/app/SadTalker
SADTALKER_CHECKPOINT_DIR=/app/SadTalker/checkpoints
```

## Troubleshooting

### "CUDA out of memory"
- Reduce video resolution
- Use wav2lip.pth instead of wav2lip_gan.pth
- Close other GPU applications

### "Face not detected"
- Ensure face image is clear and front-facing
- Try a different face image
- Check image dimensions (256x256 recommended)

### Slow generation
- Wav2Lip is faster than SadTalker
- Use shorter audio clips
- Ensure GPU is being utilized (check with nvidia-smi)
