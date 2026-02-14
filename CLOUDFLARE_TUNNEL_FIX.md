# ✅ Cloudflare Tunnel Fix for demo.yalhire.ai

**Issue:** Frontend at `https://demo.yalhire.ai` couldn't reach backend
**Error:** Cloudflare Tunnel error 1033 - "Cloudflare is currently unable to resolve it"
**Fix:** Start Cloudflare Tunnel to route public domain to local services

---

## 🔧 What I Fixed

1. **✅ Updated [start_services.bat](start_services.bat)**
   - Added Cloudflare Tunnel startup (step 6/6)
   - Now automatically starts cloudflared on service launch

2. **✅ Tunnel Configuration** (already correct)
   - Routes `demo.yalhire.ai/api/*` → Backend (localhost:8000)
   - Routes `demo.yalhire.ai/*` → Frontend (localhost:3001)
   - Routes `livekit.yalhire.ai` → LiveKit (localhost:7880)

---

## 🚀 How to Fix Now

### Option 1: Restart All Services (Recommended)

```bash
# Stop everything
taskkill /F /IM livekit-server.exe /T
taskkill /F /IM python.exe /T
taskkill /F /IM node.exe /T
taskkill /F /IM cloudflared.exe /T

# Start everything (includes Cloudflare Tunnel)
cd d:\Projects\SourceCode\YalOffice\yaloffice
call start_services.bat
```

### Option 2: Start Cloudflare Tunnel Only

If other services are running, just start the tunnel:

```bash
cd d:\Projects\SourceCode\YalOffice\yaloffice\cloudflared
start "Cloudflare Tunnel" cmd /k "cloudflared.exe --config config_local.yml tunnel run"
```

---

## ✅ Verify Tunnel is Running

**Check Tunnel Status:**
1. Look for window titled **"Cloudflare Tunnel"**
2. Should see: `Connection registered` with connector ID
3. No errors like "failed to connect"

**Check in Browser:**
1. Go to: https://demo.yalhire.ai
2. Should load without Cloudflare error
3. Console should show API calls succeeding (no 530 errors)

**Check Phone Screening:**
1. Click "Start Call" on phone screening page
2. Should see: `POST https://demo.yalhire.ai/api/interview/start-phone-screen 200`
3. Phone should ring (after SRTP is enabled)

---

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Public Access Flow                        │
└─────────────────────────────────────────────────────────────┘

Internet (demo.yalhire.ai)
    │
    ↓
Cloudflare CDN + DNS
    │
    ↓
Cloudflare Tunnel (cloudflared.exe)
    │
    ├──→ /api/* ──→ Backend (localhost:8000)
    │                  │
    │                  ├──→ LiveKit Token Generation
    │                  ├──→ SIP Call Initiation
    │                  └──→ Interview Data
    │
    └──→ /* ──────→ Frontend (localhost:3001)
                       │
                       └──→ React App

Parallel Local Flow (for development):
    localhost:3001 ──→ Frontend
    localhost:8000 ──→ Backend
    localhost:7880 ──→ LiveKit Server
```

---

## 🎯 All Services That Should Be Running

| Service | Port | Window Title | Status Check |
|---------|------|--------------|--------------|
| LiveKit Server | 7880 | LiveKit Server | http://localhost:7880 |
| Backend API | 8000 | YalOffice Backend | http://localhost:8000/api/health |
| Frontend | 3001 | YalOffice Frontend | http://localhost:3001 |
| Local Agent | - | Agent (Local - Web) | See "registered worker" |
| Cloud Agent | - | Agent (Cloud - Phone) | See "registered worker" |
| **Cloudflare Tunnel** | - | **Cloudflare Tunnel** | **See "Connection registered"** |

---

## 🔍 Troubleshooting

### Error: "tunnel credentials file not found"

**Fix:**
```bash
cd C:\Users\Yaluser\.cloudflared
dir
```
Should see: `362fcdc8-74f2-4d26-84ad-7e6f3cebc483.json`

If missing, regenerate:
```bash
cloudflared tunnel login
cloudflared tunnel create yalhire
```

### Error: "failed to connect to cloudflare"

**Fix:**
- Check internet connection
- Check if port 7844 is blocked by firewall
- Restart cloudflared

### Frontend still shows Cloudflare error

**Fix:**
1. Hard refresh browser: `Ctrl + Shift + R`
2. Clear browser cache
3. Wait 10-30 seconds for tunnel to fully establish
4. Check cloudflared window for "Connection registered" message

### Phone screening still fails

This is the **SRTP issue** - separate from tunnel.

**Fix:** See [SRTP_FIX_NOW.md](SRTP_FIX_NOW.md)
- Enable SRTP in LiveKit SIP trunk
- OR make Twilio accept non-SRTP

---

## 📝 Configuration Files

### Tunnel Config: [cloudflared/config_local.yml](cloudflared/config_local.yml)
```yaml
tunnel: 362fcdc8-74f2-4d26-84ad-7e6f3cebc483
credentials-file: C:\Users\Yaluser\.cloudflared\362fcdc8-74f2-4d26-84ad-7e6f3cebc483.json

ingress:
  # LiveKit subdomain
  - hostname: livekit.yalhire.ai
    service: http://127.0.0.1:7880
  # Route API requests to the backend
  - hostname: demo.yalhire.ai
    path: ^/api/.*
    service: http://127.0.0.1:8000
  # Route everything else to the frontend
  - hostname: demo.yalhire.ai
    service: http://127.0.0.1:3001
  - service: http_status:404
```

---

## ✅ Expected Result

After starting services with Cloudflare Tunnel:

**Local Access (Dev):**
- http://localhost:3001 → Frontend ✅
- http://localhost:8000 → Backend ✅

**Public Access (Production):**
- https://demo.yalhire.ai → Frontend ✅
- https://demo.yalhire.ai/api/* → Backend ✅
- https://livekit.yalhire.ai → LiveKit ✅

**Phone Screening:**
- Click "Start Call" → No 530 error ✅
- Backend initiates SIP call ✅
- Phone rings (after SRTP fix) ⚠️

---

## 🎯 Summary

**Problem:** Frontend couldn't reach backend because Cloudflare Tunnel wasn't running

**Solution:**
1. ✅ Updated `start_services.bat` to start cloudflared
2. ✅ Run `start_services.bat` to launch everything including tunnel
3. ✅ Verify tunnel shows "Connection registered"
4. ✅ Test at https://demo.yalhire.ai

**Next:** Enable SRTP for phone calls (see SRTP_FIX_NOW.md)
