# LiveKit WebSocket Connection Issue - DIAGNOSIS & SOLUTION

## Problem
```
WebSocket connection to 'wss://demo.yalhire.ai/livekit/rtc?access_token=...' failed
ConnectionError: could not establish signal connection: room connection has timed out (signal)
```

## Root Cause Analysis

The LiveKit WebSocket connection is failing because:

1. ✅ **Frontend correctly constructs WSS URL**: `wss://demo.yalhire.ai/livekit`
2. ✅ **Cloudflare tunnel routes /livekit to backend** (port 8000)
3. ✅ **Backend has proxy middleware** with `ws: true`
4. ❌ **WebSocket upgrade might not be working** through the proxy chain

## Current Architecture

```
Browser (wss://demo.yalhire.ai/livekit/rtc)
    ↓
Cloudflare Edge (HTTPS → WebSocket upgrade)
    ↓
Cloudflared Tunnel
    ↓
Backend:8000 (/livekit → proxy)
    ↓
http-proxy-middleware (ws: true)
    ↓
LiveKit:7880 (/rtc)
```

## Verification Steps

### 1. Test LiveKit Server Directly (Localhost)
```powershell
# Test if LiveKit server is running
Test-NetConnection -ComputerName localhost -Port 7880

# Test HTTP endpoint
Invoke-WebRequest -Uri "http://localhost:7880/" -UseBasicParsing
# Should return: OK
```

### 2. Test Backend Proxy (HTTP)
```powershell
# Test proxy HTTP endpoint
Invoke-WebRequest -Uri "http://localhost:8000/livekit/" -UseBasicParsing
# Should return: OK (proxied from LiveKit)
```

### 3. Test Through Cloudflare Tunnel
```powershell
# Test if tunnel routes to backend
Invoke-WebRequest -Uri "https://demo.yalhire.ai/livekit/" -UseBasicParsing  
# Should return: OK
```

### 4. Test WebSocket Upgrade (Critical!)
This is where the failure likely occurs. WebSocket connections require:
- Proper `Upgrade: websocket` header handling
- Connection upgrade from HTTP to WS protocol
- Bidirectional streaming support

## Solution Options

### Option A: Direct LiveKit Access (Recommended for Testing)
Route LiveKit directly without backend proxy:

**Update `cloudflared/config_local.yml`:**
```yaml
ingress:
  - hostname: demo.yalhire.ai
    path: /api/*
    service: http://127.0.0.1:8000
  # Direct LiveKit access (no proxy)  
  - hostname: demo.yalhire.ai
    path: /livekit/*
    service: http://127.0.0.1:7880
  - hostname: demo.yalhire.ai
    service: http://127.0.0.1:3001
  - service: http_status:404
```

**Problem**: This won't strip the `/livekit` prefix, so LiveKit will receive `/livekit/rtc` instead of `/rtc`.

**Fix**: Update LiveKit client configuration or use a different approach...

### Option B: Use Cloudflare's Path Rewriting (If Available)
Check if Cloudflare tunnel supports path rewriting in ingress rules.

### Option C: Run LiveKit on Different Port/Path
Configure LiveKit to listen on `/livekit` path instead of root.

### Option D: Use Subdomain for LiveKit
Create a separate subdomain like `livekit.yalhire.ai` pointing directly to LiveKit server.

**Update Cloudflare DNS:**
- Add CNAME: `livekit.yalhire.ai` → tunnel

**Update tunnel config:**
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

**Update frontend config** (`.env`):
```env
VITE_LIVEKIT_URL=wss://livekit.yalhire.ai
```

## Recommended Solution: Subdomain Approach (Option D)

This is the cleanest solution because:
1. ✅ No path rewriting needed
2. ✅ Direct WebSocket connection to LiveKit
3. ✅ Isolates LiveKit traffic from API/Frontend
4. ✅ Easier debugging and monitoring

## Implementation Steps

### Step 1: Update Cloudflare DNS
1. Go to Cloudflare dashboard
2. Add CNAME record: `l k` → `demo.yalhire.ai` (or point to same tunnel)

### Step 2: Update Tunnel Config
See Option D above.

### Step 3: Restart Cloudflare Tunnel
```powershell
taskkill /F /IM cloudflared.exe
# Then restart via start_services.bat
```

### Step 4: Update Frontend Environment
```env
VITE_LIVEKIT_URL=wss://livekit.yalhire.ai
```

### Step 5: Rebuild Frontend
```powershell
npm run build
# Restart services
.\stop_services.bat
.\start_services.bat
```

### Step 6: Test Connection  
```javascript
// In browser console at https://demo.yalhire.ai
const ws = new WebSocket('wss://livekit.yalhire.ai/');
ws.onopen = () => console.log('WebSocket Connected!');
ws.onerror = (e) => console.error('WebSocket Error:', e);
```

## Current Status

- ✅ Application loads on demo.yalhire.ai
- ✅ Backend API accessible  
- ✅ Frontend production build working
- ❌ LiveKit WebSocket failing (needs subdomain solution)

## Next Actions

**IMMEDIATE (to test):**
1. Restart backend (it was stopped for updates)
2. Test WebSocket connection manually
3. Check backend logs for proxy errors

**SHORT TERM (to fix properly):**
1. Implement subdomain solution (livekit.yalhire.ai)
2. OR investigate why WebSocket upgrade through backend proxy fails
3. Add comprehensive WebSocket logging

## Debugging Commands

```powershell
# Check if backend is running
Get-Process -Name node -ErrorAction SilentlyContinue

# View backend logs (if running in terminal)
# Look for proxy errors or WebSocket upgrade failures

# Test WebSocket manually (PowerShell)
$ws = New-Object System.Net.WebSockets.ClientWebSocket
$uri = [System.Uri]::new("wss://demo.yalhire.ai/livekit/")  
$token = New-Object System.Threading.CancellationToken
$ws.ConnectAsync($uri, $token).Wait()
$ws.State # Should be "Open"
```
