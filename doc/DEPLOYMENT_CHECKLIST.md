# Deployment Checklist - Yāl Office AI Interview Platform

## ✅ Pre-Deployment Checklist

### Environment Setup

- [ ] Node.js 18+ installed
- [ ] npm installed and working
- [ ] Git Bash or PowerShell available
- [ ] Port 3000 available (frontend)
- [ ] Port 8000 available (backend)
- [ ] Port 7880 available (LiveKit RTC)
- [ ] Port 7881 available (LiveKit REST)

### Configuration Files

- [ ] `backend/.env` exists
- [ ] `GEMINI_API_KEY` set in `backend/.env`
- [ ] `.env` exists in root (frontend)
- [ ] `livekit/livekit-config.yaml` configured correctly
- [ ] All credentials match across config files

### Dependencies

- [ ] Frontend dependencies installed (`npm install` in root)
- [ ] Backend dependencies installed (`npm install` in `backend/`)
- [ ] LiveKit binary downloaded (`livekit/livekit-server.exe`)
- [ ] AudioWorklet file exists (`public/audio-processor.js`)

---

## 🚀 Launch Checklist

### Step 1: Start LiveKit

- [ ] Open Terminal 1
- [ ] Navigate to project root
- [ ] Run: `.\livekit\livekit-server.exe --config livekit\livekit-config.yaml`
- [ ] Verify log shows: "RTC server listening {"address": "0.0.0.0:7880"}"
- [ ] Verify log shows: "REST API server listening {"address": "0.0.0.0:7881"}"

### Step 2: Start Backend

- [ ] Open Terminal 2
- [ ] Navigate to `backend/` directory
- [ ] Run: `npm run dev`
- [ ] Verify log shows: "✅ Backend server running on port 8000"
- [ ] Verify log shows: "✅ Room Lifecycle Manager started"
- [ ] Test health: `curl http://localhost:8000/health`
- [ ] Response should be: `{"status":"ok","timestamp":"..."}`

### Step 3: Start Frontend

- [ ] Open Terminal 3
- [ ] Navigate to project root
- [ ] Run: `npm run dev`
- [ ] Verify log shows: "Local: http://localhost:3000"
- [ ] Open browser to http://localhost:3000
- [ ] Page loads without errors

---

## 🧪 Functional Testing

### Basic Connectivity

- [ ] Backend health check responds
  ```bash
  curl http://localhost:8000/health
  ```

- [ ] LiveKit server accessible
  ```bash
  curl http://localhost:7881/
  ```

- [ ] Frontend loads in browser
  - Open: http://localhost:3000
  - No console errors

### Room Management

- [ ] Create a test room
  ```bash
  curl -X POST http://localhost:8000/api/rooms/create \
    -H "Content-Type: application/json" \
    -d '{"candidateName":"Test User","ttlSeconds":3600}'
  ```
  Expected: Returns `roomName`, `token`, `url`

- [ ] List rooms
  ```bash
  curl http://localhost:8000/api/rooms/list
  ```
  Expected: Returns array with test room

- [ ] Delete test room
  ```bash
  curl -X DELETE http://localhost:8000/api/rooms/<roomName>
  ```

### Interview Flow (UI Testing)

- [ ] Navigate to AI Interview screen
- [ ] Click "Start Interview" button
- [ ] Browser asks for microphone permission
- [ ] Grant microphone permission
- [ ] Interview screen loads
- [ ] See "Hold to Speak" button
- [ ] Button shows "Initializing..." then "Hold to Speak"

### Audio Testing

- [ ] Hold "Hold to Speak" button
- [ ] Speak into microphone
- [ ] Button shows "Speaking..."
- [ ] Release button
- [ ] Wait for AI response
- [ ] Hear audio from speakers
- [ ] See transcript update with user speech
- [ ] See transcript update with AI response

### Transcript Testing

- [ ] Transcript panel visible on right side
- [ ] User speech appears in transcript
- [ ] AI speech appears in transcript
- [ ] Transcript auto-scrolls to bottom
- [ ] Can hide/show transcript panel

### Interview Completion

- [ ] Click "End Interview" button
- [ ] See "Analyzing Your Interview..." spinner
- [ ] Navigates to report screen
- [ ] Analysis displays (score, summary, strengths, improvements)

---

## 🔍 Monitoring Checklist

### Backend Logs

- [ ] No WebSocket errors
- [ ] Gemini connection successful
- [ ] Audio chunks being sent/received
- [ ] Transcript updates logging correctly
- [ ] Room cleanup runs every 60 seconds

### Frontend Console

- [ ] No React errors
- [ ] AudioWorklet loads successfully
- [ ] WebSocket connects to Gemini proxy
- [ ] Audio chunks being processed
- [ ] No CORS errors

### LiveKit Logs

- [ ] Participants connecting successfully
- [ ] No authentication errors
- [ ] Audio/video tracks published
- [ ] No bandwidth issues

---

## 🐛 Troubleshooting Verification

### If Backend Won't Start

- [ ] Port 8000 free: `netstat -ano | findstr :8000`
- [ ] Dependencies installed: `node_modules/` exists
- [ ] .env file exists and valid
- [ ] Node version 18+: `node --version`

### If LiveKit Won't Start

- [ ] Port 7880 free: `netstat -ano | findstr :7880`
- [ ] Port 7881 free: `netstat -ano | findstr :7881`
- [ ] Binary exists: `livekit/livekit-server.exe`
- [ ] Config valid: `livekit/livekit-config.yaml`

### If Microphone Not Working

- [ ] Browser permissions granted
- [ ] AudioWorklet file exists: `public/audio-processor.js`
- [ ] Check browser console for errors
- [ ] Try in Chrome (best support)

### If No AI Response

- [ ] Gemini API key valid
- [ ] Internet connection active
- [ ] Check backend logs for Gemini errors
- [ ] WebSocket connected (check console)

### If No Audio Playback

- [ ] Speakers/headphones connected
- [ ] System volume not muted
- [ ] Browser not muted (check tab icon)
- [ ] AudioContext resumed (check console)

---

## 📊 Performance Checklist

### Resource Usage

- [ ] CPU usage < 50% per service
- [ ] Memory usage stable (no leaks)
- [ ] Network latency < 200ms to Gemini
- [ ] Audio buffer not overflowing

### Quality Checks

- [ ] Audio quality clear (no crackling)
- [ ] Transcript accuracy > 90%
- [ ] AI responses relevant
- [ ] No significant delays (< 3s)

### Scalability

- [ ] Can create multiple rooms
- [ ] Room cleanup working (check after 60s)
- [ ] Registry updates correctly
- [ ] No ghost rooms after cleanup

---

## 🔒 Security Checklist

### API Keys

- [ ] Gemini API key not committed to git
- [ ] LiveKit credentials not exposed
- [ ] .env files in .gitignore
- [ ] No hardcoded secrets in code

### CORS

- [ ] CORS restricted to localhost:3000
- [ ] Production: Update FRONTEND_URL
- [ ] No wildcard CORS in production

### Tokens

- [ ] JWT tokens expire (TTL set)
- [ ] Tokens use proper signing
- [ ] Room access restricted by token

---

## 📝 Production Readiness

### Before Production Deployment

- [ ] Replace in-memory registry with Redis
- [ ] Add proper error handling
- [ ] Set up logging service
- [ ] Configure HTTPS for backend
- [ ] Use WSS for LiveKit (not WS)
- [ ] Set up monitoring/alerting
- [ ] Configure proper CORS domains
- [ ] Add rate limiting
- [ ] Set up backup strategy
- [ ] Document recovery procedures

### Environment Variables (Production)

- [ ] Change LiveKit credentials
- [ ] Use production Gemini API key
- [ ] Set proper FRONTEND_URL
- [ ] Configure Redis connection
- [ ] Set NODE_ENV=production

---

## ✅ Sign-Off

Once all items checked:

**Tested By:** ___________________
**Date:** ___________________
**Version:** ___________________
**Status:** [ ] Passed  [ ] Failed

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## 🎯 Quick Reference

**Start All Services:**
```powershell
.\scripts\start-all-services.ps1
```

**Health Check:**
```bash
curl http://localhost:8000/health
```

**View Logs:**
- Backend: Terminal 2
- Frontend: Terminal 3 + Browser Console (F12)
- LiveKit: Terminal 1

**Stop All:**
- Close all terminal windows
- OR: Ctrl+C in each terminal

**Restart:**
1. Stop all services
2. Wait 5 seconds
3. Start in order: LiveKit → Backend → Frontend
