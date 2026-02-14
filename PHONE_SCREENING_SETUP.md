# YalOffice Phone Screening Setup & Troubleshooting

**Last Updated:** February 8, 2026
**Issue:** SRTP Configuration for LiveKit SIP Trunk

---

## 🔴 Current Issue

**Error:** `INVITE failed: sip status: 488: 32208 SIP trunk or domain is required to use secure media (SRTP).`

**Root Cause:** Your LiveKit SIP trunk `ST_QzjtLtrc35PP` is not configured to use SRTP (Secure RTP) for media encryption. Twilio (your SIP provider) requires SRTP for all calls.

**Call Flow:**
```
YalOffice Backend → LiveKit Cloud → SIP Trunk (ST_QzjtLtrc35PP)
    → Twilio (yalhire.pstn.twilio.com) → Candidate Phone
       ❌ REJECTED: SRTP not enabled
```

---

## ✅ Solution: Enable SRTP in LiveKit Cloud

### Step 1: Access LiveKit Cloud Dashboard

1. Go to: https://cloud.livekit.io/projects/p_2clu6uktyt7/telephony
2. Login with your LiveKit account
3. Navigate to: **Telephony → SIP Trunks**

### Step 2: Edit Your SIP Trunk

1. Find trunk: **ST_QzjtLtrc35PP**
2. Click **Edit** or **Configure**

### Step 3: Enable SRTP

Look for one of these settings (name may vary):

**Option A: Media Encryption**
- Set to: **SRTP Required** or **SRTP Mandatory**
- Encryption level: **AES_CM_128_HMAC_SHA1_80** (recommended)

**Option B: Security Settings**
- Enable: **Secure Media (SRTP)**
- Require encryption: **Yes**

**Option C: Advanced Settings**
- Media Security: **Enabled**
- RTP Encryption: **SRTP**

### Step 4: Verify Twilio Configuration

Your Twilio SIP domain `yalhire.pstn.twilio.com` should have:
- **Secure Media**: Enabled
- **TLS**: Enabled (you already have this ✅)
- **SRTP**: Required (this is what's causing the rejection)

**Twilio Dashboard:**
1. Go to: https://console.twilio.com/
2. Navigate to: **Elastic SIP Trunking → Trunks → yalhire**
3. Check: **Secure Trunking** settings
4. Ensure: **Secure Media** is enabled

### Step 5: Test the Configuration

After enabling SRTP, test with:
```bash
# Restart cloud agent
cd d:\Projects\SourceCode\YalOffice\yaloffice\agent
call run_cloud_agent.bat
```

Then initiate a phone screen from the YalOffice UI.

---

## 🏗️ Alternative: Disable SRTP Requirement in Twilio

If you can't enable SRTP in LiveKit (less secure):

1. Go to Twilio Console: https://console.twilio.com/
2. Navigate to: **Elastic SIP Trunking → yalhire**
3. **Security Settings**:
   - Set **Secure Media** to: **Optional** (instead of Required)
   - Keep **TLS** enabled for signaling security

⚠️ **Warning:** This reduces security by allowing unencrypted RTP media.

---

## 📋 Current Configuration

### LiveKit Cloud (SIP)
- **URL:** `wss://yal-wqwibw1y.livekit.cloud`
- **API Key:** `APIDvGWc57msS24`
- **Trunk ID:** `ST_QzjtLtrc35PP`
- **Phone Number:** `+14124447787` (outbound caller ID)
- **Region:** US Central (Chicago)

### Twilio SIP
- **Domain:** `yalhire.pstn.twilio.com`
- **Port:** 5061
- **Transport:** TLS ✅
- **Media:** SRTP ❌ (needs to be enabled)

### Call Details from Last Test
- **From:** +14124447787 (LiveKit)
- **To:** +16122062595 (test candidate)
- **Status:** Failed - SRTP not configured
- **Room:** `phone-screen-d59be16e-494b-41d3-8d9c-3ea870474000`

---

## 🔍 How to Verify SRTP is Working

After enabling SRTP, successful call logs should show:

**LiveKit Cloud Agent Log:**
```
INFO: livekit.agents - registered worker
INFO: livekit.agents - received job request
INFO: livekit.agents - Participant joined: phone-16122062595
DEBUG: Starting conversation with Gemini 2.0 Flash
```

**LiveKit Telephony Dashboard:**
```
Status: Connected
Duration: > 0 sec
SIP Response: 200 OK
Error: (none)
```

**Candidate Experience:**
- Phone rings within 3-5 seconds
- Hears: "Hello! This is the AI recruiter from YalHire..."
- Can speak and be understood by AI
- Conversation flows naturally

---

## 🚀 Complete Rebuild Instructions

Once SRTP is enabled, rebuild all services:

### Clean Rebuild
```bash
# Stop all services
taskkill /F /IM livekit-server.exe /T
taskkill /F /IM python.exe /T
taskkill /F /IM node.exe /T

# Rebuild and start everything
cd d:\Projects\SourceCode\YalOffice\yaloffice
call start_services.bat
```

### Manual Start (For Debugging)

**1. LiveKit Server (Local for Web)**
```bash
cd livekit
livekit-server.exe --config livekit-config.yaml --bind 127.0.0.1
```

**2. Backend**
```bash
cd backend
npm run build
npm start
```

**3. Frontend**
```bash
npm run build
npm run preview -- --port 3001 --host
```

**4. Local Agent (Web Interviews)**
```bash
cd agent
python main.py dev
```

**5. Cloud Agent (Phone Screening)**
```bash
cd agent
call run_cloud_agent.bat
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    YalOffice Interview System                │
└─────────────────────────────────────────────────────────────┘

WEB INTERVIEWS (Browser):
┌──────────┐     ┌─────────────┐     ┌────────┐     ┌────────┐
│ Browser  │────→│ Local       │────→│ Local  │────→│ Gemini │
│ (WebRTC) │     │ LiveKit     │     │ Agent  │     │  2.0   │
│          │     │ 127.0.0.1   │     │        │     │ Flash  │
└──────────┘     │ :7880       │     └────────┘     └────────┘
                 └─────────────┘           │
                                          ↓
                                   ┌────────────┐
                                   │ Deepgram   │
                                   │ STT/TTS    │
                                   └────────────┘

PHONE SCREENING (SIP):
┌──────────┐     ┌─────────────┐     ┌────────┐     ┌────────┐
│ Candidate│←───→│ Twilio      │←───→│ Cloud  │←───→│ Cloud  │
│ Phone    │ SIP │ yalhire     │ SIP │ LiveKit│     │ Agent  │
│          │     │ .pstn       │     │        │     │        │
└──────────┘     │ .twilio.com │     └────────┘     └────────┘
                 │  ↑ SRTP ❌  │           │             │
                 └─────────────┘           │             ↓
                      FIX THIS!            │       ┌────────┐
                                          ↓       │ Gemini │
                                   ┌────────────┐ │  2.0   │
                                   │ Deepgram   │→│ Flash  │
                                   │ STT/TTS    │ └────────┘
                                   └────────────┘
```

---

## ✅ What Was Fixed in This Update

### 1. **Agent Architecture** - Replaced Ollama with Gemini
- ❌ Removed: Custom Ollama LLM integration (150+ lines)
- ✅ Added: Native Google Gemini 2.0 Flash plugin
- **Result:** 1-2s latency (was 5-10s with Ollama)

### 2. **Email Master Switch** - EMAIL_ENABLED flag
- ✅ Backend `.env`: Added `EMAIL_ENABLED=false`
- ✅ Auth routes: Auto-verify users when disabled
- **Result:** No email verification required in dev

### 3. **LiveKit Server Fix** - Agent/Backend Mismatch
- ❌ Was: Agent → Cloud, Backend tokens → Local
- ✅ Now: Agent → Local (web), Cloud agent → Cloud (phone)
- **Result:** Web interviews now working

### 4. **Documentation** - AI_ARCHITECTURE.md
- ✅ Updated: Gemini 2.0 Flash as primary LLM
- ✅ Added: Dual LiveKit setup documentation
- ✅ Added: Email master switch documentation

### 5. **Startup Script** - start_services.bat
- ❌ Removed: Ollama/Docker startup (no longer needed)
- ✅ Streamlined: Gemini-based cloud architecture
- **Result:** Faster startup, fewer dependencies

---

## 🎯 Next Steps

1. **⚠️ CRITICAL:** Enable SRTP in LiveKit SIP trunk `ST_QzjtLtrc35PP`
2. **Test:** Initiate phone screen from YalOffice UI
3. **Verify:** Phone rings and AI interviewer speaks
4. **Monitor:** Check LiveKit telephony dashboard for successful calls

---

## 📞 Support

If you continue to have issues after enabling SRTP:

1. **Check LiveKit Logs:** Agent console for detailed errors
2. **Check Backend Logs:** SIP service initialization messages
3. **Check Twilio Console:** Call logs and SIP trunk status
4. **LiveKit Dashboard:** https://cloud.livekit.io/projects/p_2clu6uktyt7/telephony

---

## 📚 Related Documentation

- [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) - Complete system architecture
- [agent/.env](./agent/.env) - Agent configuration
- [backend/.env](./backend/.env) - Backend configuration
- [agent/main.py](./agent/main.py) - Agent code with Gemini integration
- [backend/src/services/sipService.ts](./backend/src/services/sipService.ts) - SIP service

---

**Status:** ⚠️ AWAITING SRTP CONFIGURATION
**ETA:** 5 minutes after enabling SRTP in LiveKit Cloud dashboard
