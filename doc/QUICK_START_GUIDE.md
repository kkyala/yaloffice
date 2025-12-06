# 🚀 YĀL OFFICE - QUICK START GUIDE

## Prerequisites Checklist

- [ ] Node.js installed (v18+)
- [ ] npm installed
- [ ] Chrome or Edge browser (for Web Speech API)
- [ ] Microphone and camera available
- [ ] Gemini API key configured

## 1. Environment Setup

### Backend `.env` file
Create `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_VOICE=Puck
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_REST_URL=http://localhost:7881
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
PORT=8000
```

### Frontend `.env.local` file
Create `.env.local`:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_LIVEKIT_URL=ws://localhost:7880
```

## 2. Installation

### Install Backend Dependencies
```bash
cd backend
npm install
```

### Install Frontend Dependencies
```bash
cd ..
npm install
```

## 3. Start Services

### Terminal 1: Start LiveKit Server
```bash
cd livekit
./livekit-server.exe --config livekit-config.yaml
```

**Expected Output**:
```
INFO    Starting LiveKit server     version=...
INFO    WebRTC server listening     addr=:7880
INFO    REST API server listening   addr=:7881
```

### Terminal 2: Start Backend
```bash
cd backend
npm run dev
```

**Expected Output**:
```
✅ Backend server running on port 8000
✅ WebSocket server ready at ws://localhost:8000/ws/gemini-proxy
✅ Room Lifecycle Manager started
```

### Terminal 3: Start Frontend
```bash
npm run dev
```

**Expected Output**:
```
VITE v5.4.21  ready in 1789 ms
➜  Local:   http://localhost:3000/
```

## 4. Access Application

Open browser: **http://localhost:3000**

## 5. Conduct Interview

1. **Login** (if required)
2. **Select Candidate** from list
3. **Click "Start AI Interview"**
4. **Allow Permissions**:
   - Microphone access
   - Camera access
5. **Start Speaking** - AI will respond!

## 6. Verify Everything Works

### ✅ Visual Checks:
- [ ] Your video appears (left panel)
- [ ] AI avatar appears (right panel)
- [ ] Green "Audio Ready" indicator
- [ ] Microphone icon is active
- [ ] Your speech appears as text below your video
- [ ] AI responds with audio
- [ ] "[AI Response - Audio Only]" appears below AI

### ✅ Console Checks (F12):
```
[ConversationRoom] ✅ WebSocket ready, initializing audio...
[ConversationRoom] 🎤 Speech recognition started
[ConversationRoom] 📝 Speech recognized: "..."
[ConversationRoom] Received audio chunk, playing...
```

## 7. Troubleshooting

### Issue: No Audio
**Solution**: 
- Check microphone permissions
- Verify backend is running
- Check browser console for errors

### Issue: No Transcripts
**Solution**:
- Ensure using Chrome/Edge browser
- Check microphone permissions
- Verify Web Speech API is supported

### Issue: Connection Failed
**Solution**:
- Verify all 3 services are running (LiveKit, Backend, Frontend)
- Check ports 3000, 7880, 7881, 8000 are not in use
- Verify `.env` files are configured

### Issue: Gemini Errors
**Solution**:
- Verify `GEMINI_API_KEY` is valid
- Check backend logs for specific errors
- Ensure internet connection is stable

## 8. Stopping Services

### Stop All Services:
```bash
# In each terminal, press:
Ctrl + C
```

### Clean Restart:
```bash
# Stop all services
# Then restart in order:
# 1. LiveKit
# 2. Backend
# 3. Frontend
```

## 9. Port Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend HTTP | 8000 | http://localhost:8000 |
| Backend WebSocket | 8000 | ws://localhost:8000/ws/gemini-proxy |
| LiveKit WebRTC | 7880 | ws://localhost:7880 |
| LiveKit REST API | 7881 | http://localhost:7881 |

## 10. Common Commands

### View Backend Logs:
```bash
cd backend
npm run dev
# Logs appear in terminal
```

### Rebuild Backend:
```bash
cd backend
npm run build
npm start
```

### Clear Cache:
```bash
# Frontend
rm -rf node_modules dist
npm install

# Backend
cd backend
rm -rf node_modules dist
npm install
```

## 🎉 Success!

If you see:
- ✅ Video streaming
- ✅ Audio conversation
- ✅ Real-time transcripts
- ✅ No errors in console

**You're ready to conduct AI interviews!**

## 📚 Additional Resources

- **Full Documentation**: See `COMPLETE_FIX_SUMMARY.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Fixes Applied**: See `FIXES_APPLIED.md`

## 🆘 Need Help?

1. Check browser console (F12)
2. Check backend terminal logs
3. Verify all services are running
4. Review troubleshooting section above
5. Check `.env` configuration

---

**Happy Interviewing! 🎊**
