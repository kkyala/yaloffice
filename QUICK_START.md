# Quick Start Guide - AI Interview with Avatar

## ✅ All Issues Fixed

1. **AI now listens to candidate** - WebSocket connects to correct backend proxy
2. **Wav2Lip avatar displays** - Lip-synced video shows when AI speaks
3. **Continuous microphone** - No push-to-talk, natural conversation flow
4. **Transcripts beneath participants** - Real-time text under each video

---

## Start the System

### Option 1: Manual Start (Recommended for Testing)

**Terminal 1 - LiveKit Server**
```bash
cd livekit
.\livekit-server.exe --config livekit-config.yaml
```
Wait for: `LiveKit server listening on :7880`

**Terminal 2 - Backend**
```bash
cd backend
npm run dev
```
Wait for: `✅ Backend server running on port 8000`

**Terminal 3 - Frontend**
```bash
npm run dev
```
Wait for: `Local: http://localhost:3000`

### Option 2: One Command (PowerShell)
```powershell
# Start all services
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd livekit; .\livekit-server.exe --config livekit-config.yaml"
Start-Sleep 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Sleep 5
npm run dev
```

---

## Test the Interview

1. **Open Browser**: http://localhost:3000
2. **Navigate to Interview**: Click "Start Interview" or go to AI interview page
3. **Allow Microphone**: Browser will ask for permission
4. **Check Status**:
   - ✅ Green "Audio Ready" indicator in header
   - ✅ Green "LISTENING" badge on your video (when mic on)
   - ✅ AI avatar displays (video or circle)

5. **Speak Naturally**: Just talk - no button to hold!
   - Your transcript appears under your video
   - AI responds with voice
   - AI transcript appears under AI video
   - Avatar lip-syncs when Wav2Lip installed

---

## What You Should See

### Candidate Panel (Left)
```
┌─────────────────────────┐
│   YOUR VIDEO FEED       │
│   (from camera)         │
│                         │
│  🟢 LISTENING           │
└─────────────────────────┘
┌─────────────────────────┐
│ 🟢 Your Transcript      │
│ "I have 5 years..."     │
└─────────────────────────┘
```

### AI Interviewer Panel (Right)
```
┌─────────────────────────┐
│   AVATAR VIDEO          │
│   (lip-synced or        │
│    static AI circle)    │
│  🟣 SPEAKING            │
└─────────────────────────┘
┌─────────────────────────┐
│ 🟣 AI Transcript        │
│ "Tell me about..."      │
└─────────────────────────┘
```

### Control Bar (Bottom)
```
[🎤 Microphone On] [📷] [🔇] [📞 End Interview]
     (toggle)     LiveKit Controls
```

---

## Console Logs (What to Expect)

### Backend Console
```bash
✅ Backend server running on port 8000
✅ WebSocket server ready at ws://localhost:8000/ws/gemini-proxy
✅ Room Lifecycle Manager started

[Proxy] Client connected for session abc123
[Gemini] Connected for session abc123
[Gemini] Setup complete for session abc123
[Gemini] User transcript: "Hello, I'm ready for the interview"
[Gemini] Text received: "Great! Let's begin..."
[Proxy] Generating avatar video with 96000 bytes of audio
[Proxy] Avatar video generated: /avatar_output/avatar_xyz.mp4
```

### Frontend Console
```javascript
[ConversationRoom] Connected to Gemini proxy
[ConversationRoom] AudioWorklet loaded
[ConversationRoom] Continuous audio capture ready
[ConversationRoom] Audio frames: 500
[ConversationRoom] Audio frames: 1000
[ConversationRoom] Received audio chunk
[ConversationRoom] Received avatar video: /avatar_output/avatar_xyz.mp4
```

---

## Troubleshooting

### Issue: "AI doesn't respond to my speech"
**Fix**: Check WebSocket connection
```bash
# Backend console should show:
[Proxy] Client connected for session...
[Gemini] User transcript: "..."

# If not, check:
- Backend running on port 8000? ✓
- Frontend .env.local has VITE_WS_URL=ws://localhost:8000? ✓
- Browser console shows "Connected to Gemini proxy"? ✓
```

### Issue: "Microphone not working"
**Fix**: Check browser permissions
1. Click lock icon in browser address bar
2. Ensure "Microphone" is set to "Allow"
3. Refresh page
4. Check browser console for: `Audio frames: X`

### Issue: "Avatar not displaying"
**Fix**: Avatar is optional - works without Wav2Lip
```bash
# Static fallback shows purple circle with "AI"
# To enable Wav2Lip avatar:
1. Install Python 3.8+
2. Install Wav2Lip dependencies
3. Download model checkpoint
4. Set paths in backend/.env

# Check backend console for:
[AvatarService] Avatar rendering is available ✓
# or
[AvatarService] Python not available - avatar rendering disabled ⚠️
```

### Issue: "No transcript appearing"
**Fix**: Check Gemini API key
```bash
# In backend/.env:
GEMINI_API_KEY=your_actual_key_here

# Backend console should show:
[Gemini] User transcript: "your speech"
[Gemini] Text received: "AI response"
```

### Issue: "WebSocket connection failed"
**Fix**: Check ports and URLs
```bash
# Backend should be on 8000:
✅ Backend server running on port 8000

# Frontend .env.local:
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# NOT ws://localhost:7880 (that's LiveKit)
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                   BROWSER (Frontend)                │
│  ┌─────────────┐              ┌─────────────┐      │
│  │  Candidate  │              │ AI Avatar   │      │
│  │   Video     │              │  (Wav2Lip)  │      │
│  │  + Mic      │              │ + Transcript│      │
│  └──────┬──────┘              └──────▲──────┘      │
│         │                            │             │
│         │ Audio (PCM16)              │ Video URL   │
│         │                            │             │
└─────────┼────────────────────────────┼─────────────┘
          │                            │
          │ WebSocket                  │ HTTP
          │ ws://localhost:8000/ws/... │
          │                            │
┌─────────▼────────────────────────────┴─────────────┐
│              BACKEND (Node.js)                     │
│  ┌─────────────────────┐  ┌──────────────────┐    │
│  │  Gemini Proxy       │  │  Avatar Service  │    │
│  │  - Audio streaming  │  │  - Wav2Lip       │    │
│  │  - Transcription    │  │  - Video gen     │    │
│  └──────────┬──────────┘  └────────▲─────────┘    │
│             │                       │              │
│             │ Gemini Live API       │ Audio chunks │
│             └───────────────────────┘              │
└────────────────────────────────────────────────────┘
                      │
                      │ WebSocket
                      │ wss://generativelanguage.googleapis.com
                      │
┌─────────────────────▼──────────────────────────────┐
│            Google Gemini Live API                  │
│  - Speech-to-text (your speech)                    │
│  - AI conversation (responds)                      │
│  - Text-to-speech (AI voice)                       │
└────────────────────────────────────────────────────┘
```

---

## Key Changes Made

### 1. WebSocket URL Fixed
- **Before**: `ws://localhost:7880` (wrong - LiveKit server)
- **After**: `ws://localhost:8000` (correct - backend proxy)
- **File**: `src/services/interviewService.ts:9`

### 2. Avatar Integration
- Backend collects audio → generates video → sends URL
- Frontend displays video when available
- **Files**: `backend/src/services/geminiProxy.ts`, `src/pages/LiveKitInterviewScreen.tsx`

### 3. Continuous Microphone
- **Before**: Hold button to speak (push-to-talk)
- **After**: Toggle on/off, always listening when on
- **File**: `src/pages/LiveKitInterviewScreen.tsx:444`

---

## Next Steps

1. **Test Full Flow**: Start interview, speak, verify AI responds
2. **Check Logs**: Ensure transcripts show in both backend and frontend console
3. **Optional**: Install Wav2Lip for animated avatar (works without it)
4. **Production**: Configure proper Gemini API quotas and rate limiting

---

## Support

- **Documentation**: See `FIXES_APPLIED.md` for detailed technical info
- **Backend Logs**: Check Terminal 2 for WebSocket and Gemini messages
- **Frontend Logs**: Open browser DevTools → Console
- **Issues**: Verify all three services (LiveKit, Backend, Frontend) are running

**Status Indicators**:
- ✅ Green dot = Good
- ⚠️ Yellow = Warning (optional feature)
- ❌ Red = Error (check logs)
