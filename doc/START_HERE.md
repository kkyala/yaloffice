# 🚀 Quick Start - Yāl Office AI Interview Platform

## ⚡ Start in 3 Commands

### Terminal 1: LiveKit Server
```powershell
.\livekit\livekit-server.exe --config livekit\livekit-config.yaml
```

### Terminal 2: Backend
```bash
cd backend
npm run dev
```

### Terminal 3: Frontend
```bash
npm run dev
```

## ✅ Verify

Open http://localhost:3000 in your browser.

---

## 📝 First Time Setup

### 1. Install Dependencies
```bash
npm install
cd backend && npm install && cd ..
```

### 2. Configure Gemini API Key

Edit `backend/.env`:
```env
GEMINI_API_KEY=YOUR_KEY_HERE
```

Get your key from: https://aistudio.google.com/app/apikey

### 3. Start Services (see commands above)

---

## 🔧 Common Issues

**Port 7880 in use?**
```bash
netstat -ano | findstr :7880
taskkill /PID <PID> /F
```

**Missing LiveKit binary?**
```powershell
.\scripts\start-livekit.ps1
```

**Need detailed setup?** See [SETUP_AND_RUN.md](./SETUP_AND_RUN.md)

---

## 📍 Service URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Backend WS:** ws://localhost:8000/ws/gemini-proxy
- **LiveKit:** ws://localhost:7880
- **LiveKit REST:** http://localhost:7881

---

## 🎯 System Requirements

- **Node.js** 18+
- **Windows** 10/11
- **Internet** (for Gemini API)
- **Microphone** (for interviews)

---

## 📚 Full Documentation

- [SETUP_AND_RUN.md](./SETUP_AND_RUN.md) - Complete setup guide
- [README.md](./README.md) - Project overview

---

**Ready to conduct AI interviews? Navigate to the interview screen and click "Start Interview"!** 🎤
