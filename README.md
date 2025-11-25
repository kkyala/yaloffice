# Yāl Office - AI Interview Platform

🎙️ AI-powered recruitment platform with **real-time video interviews** using **LiveKit** (self-hosted) and **Gemini Live API**.

## ⚡ Quick Start (100% Local - NO Docker)

### One-Command Start (Windows PowerShell)

```powershell
.\scripts\start-all-services.ps1
```

This launches all services in separate windows. Then open http://localhost:3000

### Manual Start (3 Terminals)

**Terminal 1: LiveKit Server**
```bash
.\livekit\livekit-server.exe --config livekit\livekit-config.yaml
```

**Terminal 2: Backend**
```bash
cd backend
npm run dev
```

**Terminal 3: Frontend**
```bash
npm run dev
```

## 📚 Documentation

- **[START_HERE.md](START_HERE.md)** - Quick start in 3 commands
- **[SETUP_AND_RUN.md](SETUP_AND_RUN.md)** - Complete setup guide with troubleshooting
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical implementation details

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              100% LOCAL SETUP (NO DOCKER)               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (React)  →  Backend (Express)  →  Gemini API  │
│  Port: 3000           Port: 8000             (Remote)   │
│       ↓                    ↓                             │
│  LiveKit Client    →  LiveKit Server (Self-hosted)      │
│                       ws://localhost:7880                │
│                       http://localhost:7881 (REST)       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## ✨ Features

- ✅ **Self-hosted LiveKit** - No cloud dependency for WebRTC
- ✅ **Gemini Live API** - Real-time AI interviewer with speech
- ✅ **Room Management** - Auto-create, track, and cleanup rooms
- ✅ **Lifecycle Manager** - Automated room cleanup daemon
- ✅ **Live Transcription** - Both candidate and AI speech transcribed
- ✅ **Push-to-Talk** - Controlled microphone input
- ✅ **Audio Pipeline** - 16kHz PCM16 processing with AudioWorklet
- ✅ **No Docker** - Native Windows binaries and Node.js

## 🔐 Configuration

Edit `backend/.env`:

```env
# Backend
PORT=8000
FRONTEND_URL=http://localhost:3000

# LiveKit (Self-hosted)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_REST_URL=http://localhost:7881
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Gemini (Get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=YOUR_KEY_HERE
GEMINI_MODEL=gemini-2.0-flash-live-001
GEMINI_VOICE=Puck
```

## 📍 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | React UI |
| Backend API | http://localhost:8000 | REST API |
| Backend WS | ws://localhost:8000/ws/gemini-proxy | Gemini proxy |
| LiveKit RTC | ws://localhost:7880 | WebRTC server |
| LiveKit REST | http://localhost:7881 | Room management |

## 🛠️ API Endpoints

### LiveKit
- `POST /api/livekit/token` - Generate JWT access token

### Room Management
- `POST /api/rooms/create` - Create room + token
- `GET /api/rooms/list` - List all active rooms
- `GET /api/rooms/:roomName` - Get room details
- `DELETE /api/rooms/:roomName` - Close room

### Interview
- `POST /api/interview/start` - Start interview session
- `POST /api/interview/stop` - Stop and analyze interview
- `POST /api/interview/respond` - Process candidate response
- `GET /api/interview/status/:sessionId` - Get session status

### WebSocket
- `WS /ws/gemini-proxy?sessionId=<id>` - Bidirectional audio streaming

## 🎯 System Requirements

- **Node.js** 18+ and npm
- **Windows** 10/11
- **Internet** connection (for Gemini API)
- **Microphone** (for interview audio input)

## 🔧 Development

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Build frontend
npm run build

# Build backend
cd backend && npm run build

# Run production
cd backend && npm start
```

## 📂 Project Structure

```
yaloffice/
├── backend/                    # Express + TypeScript server
│   ├── src/
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   └── index.ts           # Main server
│   └── .env                   # Backend config
├── src/                       # React frontend
│   ├── pages/                 # Screen components
│   ├── services/              # API clients
│   └── components/            # UI components
├── public/
│   └── audio-processor.js     # AudioWorklet processor
├── livekit/                   # Self-hosted LiveKit
│   ├── livekit-server.exe     # Windows binary
│   └── livekit-config.yaml    # Configuration
├── scripts/
│   ├── start-livekit.ps1      # Download & start LiveKit
│   └── start-all-services.ps1 # Start everything
└── docs/
    ├── START_HERE.md          # Quick start
    ├── SETUP_AND_RUN.md       # Full setup guide
    └── IMPLEMENTATION_SUMMARY.md  # Technical details
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:8000/health

# Create a room
curl -X POST http://localhost:8000/api/rooms/create \
  -H "Content-Type: application/json" \
  -d '{"candidateName":"Test User"}'

# List rooms
curl http://localhost:8000/api/rooms/list
```

## 🐛 Troubleshooting

**Port 7880 already in use?**
```bash
netstat -ano | findstr :7880
taskkill /PID <PID> /F
```

**Missing LiveKit binary?**
```powershell
.\scripts\start-livekit.ps1
```

**Gemini API key not set?**
Edit `backend/.env` and add `GEMINI_API_KEY=...`

See [SETUP_AND_RUN.md](SETUP_AND_RUN.md) for detailed troubleshooting.

## 📝 License

MIT

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

## 📧 Support

- GitHub Issues: [Report bugs or request features](https://github.com/your-repo/issues)
- Documentation: See [SETUP_AND_RUN.md](SETUP_AND_RUN.md)
