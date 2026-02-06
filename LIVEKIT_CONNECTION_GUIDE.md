# LiveKit Connection Guide - Local vs External Access

## Current Situation

You've successfully moved to local development to avoid the Cloudflare tunnel WebSocket issues. Here's what you need to know:

## ✅ LOCAL ACCESS (Recommended for Development)

### Access URL:
```
http://localhost:3001
```

### LiveKit Configuration:
- **URL**: `ws://localhost:7880`  
- **Connection**: Direct (no proxy, no tunnel)
- **Expected Result**: ✅ Should work perfectly

### How to Test:
1. Open browser to `http://localhost:3001`
2. Login as candidate
3. Start interview
4. LiveKit should connect to `ws://localhost:7880` directly

### Verification in Browser Console:
Look for:
```
Connecting to LiveKit URL: ws://localhost:7880
```
NOT:
```  
Connecting to LiveKit URL: wss://demo.yalhire.ai/livekit
```

## ❌ EXTERNAL ACCESS (Currently Broken)

### Access URL:
```
https://demo.yalhire.ai
```

### LiveKit Configuration:
- **URL**: `wss://demo.yalhire.ai/livekit`
- **Connection**: Browser → Cloudflare → Backend Proxy → LiveKit
- **Current Status**: ❌ WebSocket upgrade failing

### Why It Fails:
The WebSocket connection through multiple proxies (Cloudflare + Backend) is not working:
```
WebSocket connection to 'wss://demo.yalhire.ai/livekit/rtc' failed
```

## Solution for External Access

### Option 1: Subdomain for LiveKit (RECOMMENDED)

Create `livekit.yalhire.ai` that points directly to LiveKit server:

**Benefits:**
- ✅ No proxy chain issues
- ✅ Direct WebSocket connection  
- ✅ Production-ready solution

**Steps:**
1. Add Cloudflare DNS CNAME: `livekit` → `demo.yalhire.ai`
2. Update `cloudflared/config_local.yml`:
   ```yaml
   ingress:
     - hostname: livekit.yalhire.ai
       service: http://127.0.0.1:7880
     - hostname: demo.yalhire.ai
       path: /api/*
       service: http://127.0.0.1:8000
     - hostname: demo.yalhire.ai
       service: http://127.0.0.1:3001
     - service: http_status:404
   ```
3. Update `.env`:
   ```env
   VITE_LIVEKIT_URL=wss://livekit.yalhire.ai
   ```
4. Rebuild: `npm run build`
5. Restart services

### Option 2: Use Localhost Only (Current Strategy)

Just access via `http://localhost:3001` for all development and testing.

**Benefits:**
- ✅ Works immediately
- ✅ No DNS/tunnel configuration needed
- ✅ Faster iteration

**Limitations:**
- ❌ Can't share with external users
- ❌ Can't test on mobile devices
- ❌ Not suitable for demos to clients

## Quick Fix: Ensure You're Using Localhost

Since you mentioned "moved to local", make sure:

### 1. Access the correct URL:
```
http://localhost:3001  ← Use this!
NOT: https://demo.yalhire.ai
```

### 2. Verify in Browser:
- Open `http://localhost:3001`
- Open browser DevTools (F12)
- Go to Console tab
- Login and start interview
- Check for: `Connecting to LiveKit URL: ws://localhost:7880`

### 3. If Still Seeing `wss://demo.yalhire.ai/livekit`:

This means the frontend is detecting it's NOT on localhost. Check:
- Are you accessing via `localhost:3001`? (not `127.0.0.1:3001` or IP address)
- Clear browser cache and reload

## Current `.env` Configuration

```env
# Common
LIVEKIT_URL=ws://localhost:7880           ← Backend uses this
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=7b783c52a32944b2b1d4e76f59cb03ea

# Frontend  
VITE_LIVEKIT_URL=ws://localhost:7880      ← Frontend uses this
```

This is correct for **localhost access only**.

## Testing Checklist

- [ ] Access `http://localhost:3001` (not demo.yalhire.ai)
- [ ] Check console shows `ws://localhost:7880` (not wss://demo.yalhire.ai/livekit)
- [ ] Verify all services running:
  - [ ] LiveKit Server (Port 7880)
  - [ ] Backend (Port 8000)
  - [ ] Frontend (Port 3001)
  - [ ] Python Agent
- [ ] Test LiveKit connection in interview

## Troubleshooting

### If LiveKit still failing on localhost:

**Check LiveKit Server:**
```powershell
Test-NetConnection -ComputerName localhost -Port 7880
```

**Check LiveKit is responding:**
```powershell
Invoke-WebRequest -Uri "http://localhost:7880/" -UseBasicParsing
# Should return: OK
```

**Check Browser DevTools:**
- Network tab → WS filter → Look for ws://localhost:7880/rtc connection
- If connection failed, check error message

## Recommended Next Steps

**For Development:** Continue using `http://localhost:3001` ✅

**For External Access:** Implement subdomain solution (livekit.yalhire.ai) when needed

**For Production:** Consider using LiveKit Cloud or a dedicated LiveKit server with proper domain/SSL
