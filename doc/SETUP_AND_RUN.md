# Yāl Office AI Interview Platform - Setup & Run Guide

## 🎯 System Overview

This platform runs **100% locally** with NO Docker. All services run as native Windows processes.

### Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL ENVIRONMENT                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │   Backend    │    │   LiveKit    │  │
│  │ React + Vite │───▶│  Express +   │◀──▶│  Self-hosted │  │
│  │ Port: 3000   │    │  TypeScript  │    │  ws://7880   │  │
│  └──────────────┘    │  Port: 8000  │    │  http://7881 │  │
│                      └──────────────┘    └──────────────┘  │
│                            │                                │
│                            │                                │
│                      ┌─────▼─────┐       ┌──────────────┐  │
│                      │  Gemini   │       │   Redis      │  │
│                      │ Realtime  │       │  (Optional)  │  │
│                      │  Remote   │       │ Port: 6379   │  │
│                      └───────────┘       └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

### Required Software

1. **Node.js** v18+ and npm
   - Download from: https://nodejs.org/

2. **Git Bash** or **PowerShell** (Windows)

3. **Gemini API Key**
   - Get from: https://aistudio.google.com/app/apikey

### Optional

- **Redis for Windows** (for production room management)
  - Download from: https://github.com/microsoftarchive/redis/releases
  - OR use WSL: `wsl -install` then `sudo apt install redis-server`

---

## 🚀 Quick Start (5 Steps)

### Step 1: Install Dependencies

```bash
# Root frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### Step 2: Configure Environment Variables

**Backend** - Edit `backend/.env`:

```env
PORT=8000
FRONTEND_URL=http://localhost:3000

# LiveKit (Local)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_REST_URL=http://localhost:7881
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Gemini
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-2.0-flash-live-001
GEMINI_VOICE=Puck
```

**Frontend** - Edit `.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_LIVEKIT_URL=ws://localhost:7880
```

### Step 3: Start LiveKit Server

Open **PowerShell** or **Git Bash**:

```powershell
# PowerShell
.\scripts\start-livekit.ps1
```

```bash
# OR Git Bash
cd livekit
./livekit-server.exe --config livekit-config.yaml
```

**Expected Output:**
```
INFO    starting LiveKit server     {"version": "1.5.3"}
INFO    RTC server listening        {"address": "0.0.0.0:7880"}
INFO    REST API server listening   {"address": "0.0.0.0:7881"}
```

### Step 4: Start Backend Server

Open a **new terminal**:

```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅ Backend server running on port 8000
✅ WebSocket server ready at ws://localhost:8000/ws/gemini-proxy
✅ Room Lifecycle Manager started

📋 Make sure these services are running:
   - LiveKit server: ws://localhost:7880
   - LiveKit REST API: http://localhost:7881
```

### Step 5: Start Frontend

Open a **new terminal**:

```bash
npm run dev
```

**Expected Output:**
```
VITE v5.3.4  ready in 500 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

---

## ✅ Verify Installation

### Health Checks

1. **Backend Health**
   ```bash
   curl http://localhost:8000/health
   ```
   Response: `{"status":"ok","timestamp":"..."}`

2. **LiveKit REST API**
   ```bash
   curl http://localhost:7881/
   ```

3. **Frontend**
   - Open: http://localhost:3000

### Test Interview Flow

1. Navigate to the AI Interview screen
2. Click "Start Interview"
3. Grant microphone permissions
4. Hold "Hold to Speak" button and speak
5. AI interviewer should respond

---

## 🔧 Troubleshooting

### Issue: LiveKit server won't start

**Solution 1:** Port already in use
```bash
# Check what's using port 7880
netstat -ano | findstr :7880
# Kill the process
taskkill /PID <PID> /F
```

**Solution 2:** Download LiveKit manually
```powershell
# In livekit/ directory
Invoke-WebRequest -Uri "https://github.com/livekit/livekit/releases/download/v1.5.3/livekit_1.5.3_windows_amd64.zip" -OutFile "livekit.zip"
Expand-Archive -Path "livekit.zip" -DestinationPath "."
```

### Issue: "GEMINI_API_KEY not configured"

Edit `backend/.env` and add your key:
```env
GEMINI_API_KEY=AIzaSy...
```

Restart backend server.

### Issue: Microphone not working

1. Check browser permissions (Chrome: chrome://settings/content/microphone)
2. Verify AudioWorklet file exists: `public/audio-processor.js`
3. Check browser console for errors

### Issue: No audio from AI

1. Check Gemini API key is valid
2. Check backend logs for WebSocket errors
3. Verify internet connection (Gemini is remote)

---

## 📁 Project Structure

```
yaloffice/
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   └── LiveKitInterviewScreen.tsx  # Main interview UI
│   │   ├── services/
│   │   │   ├── livekitService.ts           # LiveKit client
│   │   │   └── interviewService.ts         # Gemini proxy client
│   │   └── components/
│   ├── public/
│   │   └── audio-processor.js              # AudioWorklet for mic
│   └── package.json
│
├── backend/               # Express + TypeScript
│   ├── src/
│   │   ├── index.ts                        # Main server
│   │   ├── routes/
│   │   │   ├── livekit.ts                  # Token generation
│   │   │   ├── rooms.ts                    # Room management
│   │   │   └── interview.ts                # Interview API
│   │   └── services/
│   │       ├── geminiProxy.ts              # Gemini WebSocket proxy
│   │       ├── roomRegistry.ts             # Room metadata
│   │       └── roomLifecycleManager.ts     # Auto cleanup
│   ├── .env                                # Backend config
│   └── package.json
│
├── livekit/               # Self-hosted LiveKit
│   ├── livekit-server.exe                  # Windows binary
│   └── livekit-config.yaml                 # Config
│
├── scripts/
│   └── start-livekit.ps1                   # PowerShell launcher
│
└── .env                                    # Frontend config
```

---

## 🎬 API Endpoints

### Backend (Port 8000)

#### Health
- `GET /health` - Server health check

#### LiveKit
- `POST /api/livekit/token` - Generate access token

#### Rooms
- `POST /api/rooms/create` - Create new room
- `GET /api/rooms/list` - List all rooms
- `GET /api/rooms/:roomName` - Get room details
- `POST /api/rooms/:roomName/heartbeat` - Update room activity
- `DELETE /api/rooms/:roomName` - Close room

#### Interview
- `POST /api/interview/start` - Start interview session
- `POST /api/interview/stop` - Stop and analyze
- `POST /api/interview/respond` - Process candidate response
- `GET /api/interview/status/:sessionId` - Get status

#### WebSocket
- `ws://localhost:8000/ws/gemini-proxy?sessionId=<id>` - Gemini Live proxy

### LiveKit Server (Port 7881)

- `POST /twirp/livekit.RoomService/CreateRoom` - Create room
- `POST /twirp/livekit.RoomService/DeleteRoom` - Delete room
- `POST /twirp/livekit.RoomService/ListRooms` - List rooms

---

## 🔐 Configuration Reference

### LiveKit Config (`livekit/livekit-config.yaml`)

```yaml
keys:
  devkey: secret          # API Key: Secret pair

rtc:
  port: 7880             # WebRTC port (ws://)
  tcp_port: 7881         # REST API port (http://)
  use_external_ip: false
  bind_addresses:
    - 0.0.0.0

rest:
  port: 7881
  address: 0.0.0.0

logging:
  level: info
```

### Gemini Interview Rules

The AI interviewer follows these rules:

- ✅ **Speak slowly and clearly** (2-3 sentences max)
- ✅ **Ask ONE question at a time**
- ✅ **Never give answers** - encourage candidates
- ✅ **Use plain language**
- ✅ **Provide encouraging guidance**
- ❌ **No scoring during interview**
- ❌ **No metadata in responses**

---

## 🏗️ Development

### Build for Production

```bash
# Frontend
npm run build

# Backend
cd backend
npm run build
```

### Run Production Build

```bash
# Backend
cd backend
npm start

# Frontend (serve dist/ with a static server)
npx serve dist
```

---

## 🔄 Room Lifecycle Management

The backend includes automatic room cleanup:

- **Runs every:** 60 seconds
- **Closes rooms idle for:** TTL duration (default 3600s)
- **Removes:** Registry entries + LiveKit rooms
- **Prevents:** Ghost rooms from consuming resources

Monitor via logs:
```
[RoomLifecycleManager] Found 2 idle rooms
[RoomLifecycleManager] Closing room: interview-abc123
[RoomRegistry] Deleted room: interview-abc123
```

---

## 📞 Support

For issues, check:
1. Browser console (F12) for frontend errors
2. Backend terminal for server errors
3. LiveKit logs for WebRTC issues
4. Network tab for API failures

---

## 🎉 Success Checklist

- [ ] LiveKit server running on ws://localhost:7880
- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:3000
- [ ] Health check responds at /health
- [ ] Interview screen loads without errors
- [ ] Microphone permission granted
- [ ] AI responds to spoken input
- [ ] Audio plays from speakers

If all checked ✅ - **You're ready to interview!**
