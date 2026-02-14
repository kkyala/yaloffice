# 🔴 URGENT: Fix SRTP to Enable Phone Calls

**Status:** Phone calls are failing with error 488 - SRTP required
**Solution Time:** 2-5 minutes

---

## ⚡ Quick Fix (Choose ONE Option)

### Option 1: Enable SRTP in LiveKit (RECOMMENDED - Most Secure)

**Step 1:** Go to LiveKit Cloud Dashboard
```
https://cloud.livekit.io/projects/p_2clu6uktyt7/telephony
```

**Step 2:** Navigate to SIP Trunks
- Click "Telephony" in left sidebar
- Click "SIP Trunks"
- Find trunk: `ST_QzjtLtrc35PP`

**Step 3:** Enable SRTP
- Click "Edit" or "Configure" on the trunk
- Look for "Media Security" or "Encryption" setting
- Set to: **"SRTP Required"** or **"Mandatory"**
- Save changes

**Step 4:** Test
```bash
cd d:\Projects\SourceCode\YalOffice\yaloffice
call start_services.bat
```

---

### Option 2: Use Different SIP Provider (Alternative)

If LiveKit doesn't allow SRTP configuration, you can:

1. **Create a new SIP trunk** with SRTP enabled
2. **Use a different provider** that supports SRTP by default (e.g., Twilio Elastic SIP)

---

### Option 3: Configure Twilio to Accept Non-SRTP (LESS SECURE)

**⚠️ Warning:** This reduces security but works as a temporary fix

**Step 1:** Go to Twilio Console
```
https://console.twilio.com/us1/develop/phone-numbers/elastic-sip-trunking/trunks
```

**Step 2:** Find your trunk
- Click on trunk: `yalhire`

**Step 3:** Edit Security Settings
- Go to "Security" tab
- Find "Secure Media" setting
- Change from "Required" to **"Optional"**
- Save changes

**Step 4:** Test
```bash
cd d:\Projects\SourceCode\YalOffice\yaloffice\agent
call run_cloud_agent.bat
```

---

## 🔍 Verify Fix Worked

### After enabling SRTP, check:

**1. LiveKit Telephony Dashboard:**
```
https://cloud.livekit.io/projects/p_2clu6uktyt7/telephony/calls
```
- Status should be: **"Connected"** (not "Failed")
- Duration should be: **> 0 seconds**
- Error should be: **empty** (no SRTP error)

**2. Phone Test:**
- Initiate phone screen from YalOffice UI
- Phone should ring within 3-5 seconds
- Candidate hears AI greeting
- Conversation flows naturally

**3. Agent Logs:**
```
INFO: livekit.agents - Participant joined: phone-16122062595
INFO: FORCING GREETING AUDIO
INFO: Asking first question: ...
```

---

## 📊 Current Configuration

```yaml
LiveKit Cloud SIP:
  URL: wss://yal-wqwibw1y.livekit.cloud
  Trunk ID: ST_QzjtLtrc35PP
  Phone Number: +14124447787
  Region: US Central

Twilio SIP:
  Domain: yalhire.pstn.twilio.com
  Port: 5061
  Transport: TLS ✅
  Media: SRTP ❌ (NEEDS TO BE ENABLED)

Current Error:
  SIP Status: 488
  Message: "32208 SIP trunk or domain is required to use secure media (SRTP)."
```

---

## ✅ What I Just Fixed

1. **✅ Gemini LLM Configuration**
   - Updated to use `gemini-2.0-flash-exp` explicitly
   - Removed fallback to older 1.5-flash model
   - Added GEMINI_MODEL environment variable

2. **✅ Agent Configuration**
   - [agent/.env](agent/.env) - Added `GEMINI_MODEL=gemini-2.0-flash-exp`
   - [agent/main.py](agent/main.py) - Simplified model initialization

3. **✅ Documentation**
   - Created SRTP fix guide
   - Updated phone screening docs

---

## 🚀 After SRTP Fix - Rebuild Services

Once SRTP is enabled, restart everything:

```bash
# Stop all services
taskkill /F /IM livekit-server.exe /T
taskkill /F /IM python.exe /T
taskkill /F /IM node.exe /T

# Start everything
cd d:\Projects\SourceCode\YalOffice\yaloffice
call start_services.bat
```

---

## 🎯 Expected Result

After SRTP fix:
```
Call from +14124447787 to +16122062595
Status: ✅ Connected
Duration: 5-10 minutes
Transcript: Saved to database
```

Candidate experience:
1. Phone rings
2. Hears: "Hello [Name], I am Yal, your AI interviewer. Shall we begin?"
3. AI asks interview questions (Gemini 2.0 Flash)
4. Natural conversation with Deepgram STT/TTS
5. Interview completes, transcript saved

---

## 🆘 If Still Not Working

Check these:

1. **LiveKit API Keys Valid?**
   ```bash
   echo %LIVEKIT_CLOUD_API_KEY%
   echo %LIVEKIT_CLOUD_API_SECRET%
   ```

2. **SIP Trunk Active?**
   - Check LiveKit dashboard for trunk status

3. **Twilio Account Active?**
   - Check Twilio console for account status

4. **Phone Number Valid?**
   - Must be E.164 format: `+16122062595`
   - Must include country code

5. **Agent Running?**
   - Check cloud agent logs
   - Should see "registered worker" message

---

**BOTTOM LINE:** Enable SRTP in LiveKit trunk `ST_QzjtLtrc35PP` or make Twilio accept non-SRTP. That's the ONLY blocker remaining! 🎯
