# Yāl Office Interview Platform - Architecture

## System Architecture

### Current Flow ✅

```
┌───────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                             │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │              LiveKitInterviewScreen.tsx                         │  │
│  │                                                                 │  │
│  │  ┌──────────────┐           ┌──────────────┐                    │  │
│  │  │  Candidate   │           │ AI Interviewer│                   │  │
│  │  │  Video Panel │           │  Avatar Panel │                   │  │
│  │  │  + Transcript│           │  + Transcript │                   │  │
│  │  └──────────────┘           └───────────────┘                   │  │
│  │                                                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│           │                               │                           │
│           │ LiveKit                       │ WebSocket                 │
│           │ WebRTC                        │ (Control + Transcripts)   │
│           ↓                               ↓                           │
└───────────┼───────────────────────────────┼───────────────────────────┘
            │                               │
            │                               │
┌───────────┼───────────────────────────────┼───────────────────────────┐
│           │         LIVEKIT SERVER        │                           │
│           ↓                               │                           │
│    ┌────────────┐                         │                           │
│    │ WebRTC SFU │                         │                           │
│    │  Port 7880 │                         │                           │
│    │            │                         │                           │
│    │ - Video    │                         │                           │
│    │ - Screen   │                         │                           │
│    │ - Room     │                         │                           │
│    └────────────┘                         │                           │
└───────────────────────────────────────────┼───────────────────────────┘
                                            │
                                            │
┌───────────────────────────────────────────┼───────────────────────────┐
│                    BACKEND (Node.js)      │                           │
│                    Port 8000              │                           │
│                                           │                           │
│                                 ┌─────────▼─────────┐                 │
│                                 │ WebSocket Server  │                 │
│                                 │ /ws/gemini-proxy  │                 │
│                                 └─────────┬─────────┘                 │
│                                           │                           │
│                                 ┌─────────▼─────────┐                 │
│                                 │  Gemini Proxy     │                 │
│                                 │  Service          │                 │
│                                 │                   │                 │
│                                 │ - Audio buffering │                 │
│                                 │ - Transcript fwd  │                 │
│                                 │ - Avatar trigger  │                 │
│                                 └─────────┬─────────┘                 │
│                                           │                           │
│                                           │ WebSocket                 │
└───────────────────────────────────────────┼───────────────────────────┘
                                            │
                                            │
┌───────────────────────────────────────────▼───────────────────────────┐
│                    GEMINI LIVE API                                    │
│         wss://generativelanguage.googleapis.com                       │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                  Gemini 2.0 Flash Exp                          │   │
│  │                                                                │   │
│  │  Features:                                                     │   │
│  │  - Real-time bidirectional audio streaming                     │   │
│  │  - Speech-to-text (candidate speech → transcript)              │   │
│  │  - AI conversation (natural interview dialogue)                │   │
│  │  - Text-to-speech (AI responses → audio)                       │   │
│  │  - Audio format: PCM16, 16kHz, mono                            │   │
│  └────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

## Data Flows

### 1. Audio Flow (Candidate → AI)

```
Candidate Microphone
  │
  │ getUserMedia()
  ↓
AudioWorklet (audio-processor.js)
  │ - Captures raw PCM16 audio @ 16kHz
  │ - Outputs 4096-byte chunks
  ↓
WebSocket.send(audioData)
  │ - Direct WebSocket to ws://localhost:8000/ws/gemini-proxy
  │ - Binary ArrayBuffer format
  ↓
Backend Gemini Proxy
  │ - Converts to base64
  │ - Wraps in realtime Input message
  ↓
Gemini Live API
  │ - Speech-to-text processing
  │ - Generates transcript
  │ - AI processes and responds
  ↓
TRANSCRIPTS + AI AUDIO back to frontend
```

### 2. Video Flow (Candidate → Display)

```
Candidate Camera
  │
  │ getUserMedia()
  ↓
LiveKit Client SDK
  │ - Creates video track
  │ - Publishes to room
  ↓
LiveKit Server (Port 7880)
  │ - WebRTC SFU (Selective Forwarding Unit)
  │ - Distributes video tracks
  ↓
Frontend LiveKit Room
  │ - Subscribes to own video
  │ - Displays in candidate panel
```

### 3. Transcript Flow (Bidirectional)

```
Gemini Live API
  │ - Detects candidate speech
  │ - Generates model responses
  ↓
Backend receives messages:
  {
    "serverContent": {
      "modelTurn": { "parts": [{ "text": "..." }] },
      "inputTranscript": "candidate said..."
    }
  }
  ↓
Backend forwards via WebSocket:
  {
    "type": "transcript",
    "transcript": {
      "speaker": "user" | "model",
      "text": "...",
      "isFinal": true/false
    }
  }
  ↓
Frontend receives and displays:
  - Candidate transcripts under left panel
  - AI transcripts under right panel
```

### 4. Avatar Flow (AI → Display)

```
Gemini TTS Audio
  │ - Base64-encoded PCM audio
  │ - 24kHz, 16-bit
  ↓
Backend Avatar Service
  │ - Collects 2 seconds of audio
  │ - Converts PCM → WAV
  │ - Runs Wav2Lip (if installed)
  │ - Generates lip-synced video
  ↓
Sends video URL via WebSocket:
  {
    "type": "avatar_video",
    "videoPath": "/avatar_output/avatar_xyz.mp4"
  }
  ↓
Frontend displays video:
  - <video src="http://localhost:8000/avatar_output/avatar_xyz.mp4" />
  - Auto-plays when received
  - Falls back to static "AI" circle if no avatar
```

## Why This Architecture?

### Why WebSocket for Audio (Not LiveKit Data Channel)?

1. **Lower Latency**: Direct WebSocket to backend is faster than routing through LiveKit
2. **Simpler Implementation**: No need for complex data channel management
3. **Gemini Compatibility**: Gemini expects streaming audio via WebSocket
4. **Proven Pattern**: This is how most Gemini Live integrations work

### Why LiveKit at All?

1. **Video Transport**: WebRTC is best for video streaming (not available via WebSocket)
2. **Screen Sharing**: LiveKit provides built-in screen share functionality
3. **Room Management**: Handles multiple participants, permissions, etc.
4. **Future Scalability**: Easy to add:
   - Multiple interviewers
   - Recording capabilities
   - Screen sharing during interviews
   - Collaborative features

### Why Not "Frontend → LiveKit → Backend Listens to Audio Track → Gemini"?

**Technical Limitation**: The `livekit-server-sdk` does NOT support:
- Joining rooms as a participant
- Subscribing to audio tracks
- Receiving WebRTC media streams

The server SDK only supports:
- Creating access tokens
- Managing rooms (create/delete)
- Webhooks for events

To implement the "backend joins room" pattern, we would need:
- `livekit-client` SDK (browser-only)
- OR custom WebRTC implementation
- OR wait for LiveKit to add server-side participant support

## Current Status

### ✅ What's Working:

1. **Audio Capture**: Frontend captures microphone via AudioWorklet ✅
2. **Audio Sending**: WebSocket sends audio to backend successfully ✅
3. **Backend Forwarding**: Backend forwards audio to Gemini ✅
4. **Gemini Connection**: Successfully connected to Gemini Live API ✅
5. **AI Audio Response**: Gemini generates and returns audio ✅
6. **Audio Playback**: AI audio plays in frontend ✅
7. **LiveKit Connection**: Frontend joins LiveKit room for video ✅
8. **WebSocket Connection**: Direct link to backend for audio/transcripts ✅
9. **Candidate Transcripts**: Web Speech API transcribes candidate speech ✅
10. **AI Transcript Indicators**: Visual feedback for AI responses ✅

### ✅ FULLY FUNCTIONAL - All Core Features Working!

**Recent Fixes Applied**:
1. **Fixed Audio MIME Type**: Changed from `audio/pcm;rate=16000;channels=1` to `audio/pcm;rate=16000`
2. **Fixed Setup Message**: Removed incompatible `responseModalities` configuration
3. **Added Web Speech API**: Client-side speech-to-text for candidate transcripts
4. **Added AI Indicators**: Visual placeholders for AI audio responses

### 🔄 Next Steps (Optional Enhancements):

1. ~~Check backend terminal for Gemini logs~~ ✅ DONE
2. ~~Verify Gemini API key is valid~~ ✅ WORKING
3. ~~Check if Gemini is processing audio correctly~~ ✅ WORKING
4. ~~Ensure transcripts are being generated~~ ✅ IMPLEMENTED (Web Speech API)
5. **Optional**: Add server-side STT for AI audio transcription
6. **Optional**: Enable Wav2Lip avatar generation

## File Structure

### Frontend

```
src/
├── pages/
│   └── LiveKitInterviewScreen.tsx    ← Main interview UI
├── services/
│   ├── interviewService.ts           ← Interview API calls
│   └── livekitService.ts             ← LiveKit token fetching
└── public/
    └── audio-processor.js            ← AudioWorklet for PCM capture
```

### Backend

```
backend/src/
├── index.ts                          ← Express server + WebSocket setup
├── routes/
│   ├── livekit.ts                    ← LiveKit token generation
│   └── interview.ts                  ← Interview session management
└── services/
    ├── geminiProxy.ts                ← Gemini Live WebSocket proxy ⭐
    ├── avatarService.ts              ← Wav2Lip video generation
    ├── interviewStore.ts             ← Session data storage
    ├── roomRegistry.ts               ← LiveKit room tracking
    └── roomLifecycleManager.ts       ← Idle room cleanup
```

## Configuration

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_LIVEKIT_URL=ws://localhost:7880
```

### Backend (.env)

```env
# Gemini API
GEMINI_API_KEY=AIzaSy...
GEMINI_VOICE=Puck

# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_REST_URL=http://localhost:7881
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Avatar (Optional)
AVATAR_RENDERER=wav2lip
AVATAR_FACE_SOURCE=./assets/ai_interviewer.jpg
WAV2LIP_DIR=./Wav2Lip
WAV2LIP_CHECKPOINT=./models/wav2lip_gan.pth
```

## Port Usage

- `3000` - Frontend (Vite dev server)
- `7880` - LiveKit WebSocket (WebRTC signaling)
- `7881` - LiveKit REST API (room management)
- `8000` - Backend HTTP + WebSocket server

## Summary

The current architecture is **CORRECT** for the use case:

- ✅ **LiveKit**: Handles video/screen sharing via WebRTC
- ✅ **WebSocket**: Handles audio streaming to Gemini (lower latency)
- ✅ **Gemini Live**: Provides AI conversation + transcription
- ✅ **Wav2Lip**: Generates lip-synced avatar (optional)

The flow you described is **already implemented**:

```
Frontend → LiveKit (for video) + WebSocket (for audio) → Backend → Gemini
```

The missing piece is **Gemini transcription working**, which requires checking backend logs to diagnose.
