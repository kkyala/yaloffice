# 🔴 Twilio Trunk Configuration Fix

**Issue:** SIP calls failing with "transaction failed to complete (0 intermediate responses)"
**Root Cause:** Twilio trunk not responding to LiveKit SIP INVITE requests
**Status:** Requires Twilio configuration fix

---

## 🔴 Current Error

From LiveKit Telephony Dashboard:
```
Error: "transaction failed to complete (0 intermediate responses)"
Status: FAILED
Duration: 0 min (or 32 sec before timeout)
```

**What's happening:**
1. ✅ Backend initiates call via LiveKit API
2. ✅ LiveKit sends SIP INVITE to Twilio (`yalhire.pstn.twilio.com`)
3. ❌ **Twilio doesn't respond** (0 responses)
4. ❌ Call times out and fails
5. ❌ Agent never receives participant

---

## ✅ Fix: Configure Twilio Trunk Correctly

### Step 1: Verify Trunk Exists and is Active

1. **Go to Twilio Console:**
   ```
   https://console.twilio.com/us1/develop/phone-numbers/elastic-sip-trunking/trunks
   ```

2. **Find your trunk:** `yalhire`

3. **Check Status:**
   - Should show: **"Enabled"** or **"Active"**
   - If disabled, click "Enable"

---

### Step 2: Configure Origination (Inbound to Twilio)

**This is CRITICAL for outbound calls from LiveKit to Twilio!**

1. **Click on trunk:** `yalhire`

2. **Go to "Origination" tab**

3. **Add LiveKit as Origination SIP URI:**
   ```
   sip:2clu6uktyt7.sip.livekit.cloud:5060
   ```

   **OR (if using your specific LiveKit region):**
   ```
   sip:161.115.179.185:9000
   ```

4. **Priority:** 1

5. **Weight:** 1

6. **Enabled:** ✅ Yes

7. **Save**

---

### Step 3: Configure Termination (Outbound from Twilio)

1. **Go to "Termination" tab**

2. **Add Termination SIP URI:**
   ```
   yalhire.pstn.twilio.com
   ```

3. **Enable "Termination":** ✅ Yes

4. **SIP Authentication:**
   - Username: `yalhire` (from your LiveKit config)
   - Password: `Yal@2026#12345` (from your LiveKit config)
   - Or use **IP Access Control List** instead (see next step)

5. **Save**

---

### Step 4: IP Access Control List (Recommended)

Instead of username/password, whitelist LiveKit's IP addresses:

1. **Go to "Settings" → "IP Access Control Lists"**

2. **Create new ACL:**
   - Name: `LiveKit Cloud`

3. **Add IP addresses:**
   ```
   161.115.179.185/32
   161.115.180.208/32
   ```
   (These are LiveKit Cloud SIP gateway IPs - add all IPs shown in your call logs)

4. **Associate ACL with trunk:**
   - Go back to trunk "Termination" tab
   - Under "IP Access Control List", select: `LiveKit Cloud`

5. **Save**

---

### Step 5: Enable Secure Media (SRTP)

We already fixed this in LiveKit, now ensure Twilio matches:

1. **Go to trunk "General" tab**

2. **Find "Secure Trunking"**

3. **Enable:**
   - ✅ Secure Media (SRTP)
   - ✅ TLS for SIP signaling

4. **Media Encryption:** `Optional` or `Required` (match LiveKit config)

5. **Save**

---

### Step 6: Verify Phone Number Assignment

1. **Go to "Numbers" tab** on your trunk

2. **Verify phone number is assigned:**
   - Should see: `+14124447787`
   - Status: **Active**

3. **If not assigned:**
   - Click "Add Phone Number"
   - Select `+14124447787`
   - Save

---

### Step 7: Test Configuration

After configuration changes:

1. **Wait 2-3 minutes** for Twilio to propagate changes

2. **Restart cloud agent:**
   ```bash
   taskkill /F /IM python.exe /T
   cd d:\Projects\SourceCode\YalOffice\yaloffice\agent
   call run_cloud_agent.bat
   ```

3. **Initiate test call** from demo.yalhire.ai

4. **Check LiveKit Telephony Dashboard:**
   - Status should be: **"Connected"** (not "Failed")
   - Duration should be: **> 0 seconds**
   - Error should be: **empty**

---

## 🔍 Verify Configuration

### Check LiveKit Trunk Config

Your current LiveKit SIP trunk `ST_QzjtLtrc35PP` shows:

```yaml
Address: yalhire.pstn.twilio.com
Transport: TLS ✅
Numbers: +14124447787
Username: yalhire
Password: Yal@2026#12345
Media Encryption: SRTP (should be enabled)
```

### Check Twilio Trunk Config (Should Match)

Go to: https://console.twilio.com/us1/develop/phone-numbers/elastic-sip-trunking/trunks

Your `yalhire` trunk should have:

```yaml
Status: Enabled ✅
Origination:
  - URI: sip:2clu6uktyt7.sip.livekit.cloud:5060
  - OR: sip:161.115.179.185:9000
Termination:
  - Enabled: Yes
  - Authentication: Username/Password OR IP ACL
  - IP ACL: 161.115.179.185/32, 161.115.180.208/32
Secure Trunking:
  - TLS: Enabled ✅
  - SRTP: Optional or Required ✅
Numbers:
  - +14124447787 (assigned)
```

---

## 📊 Expected vs Actual

### Current (Broken):

```
LiveKit → SIP INVITE → Twilio
          ↓
          ❌ No response (0 intermediate responses)
          ↓
          ❌ Timeout after 30 seconds
          ↓
          ❌ Call failed
```

### After Fix:

```
LiveKit → SIP INVITE → Twilio
          ↓
          ✅ 100 Trying
          ↓
          ✅ 180 Ringing
          ↓
          ✅ 200 OK (call answered)
          ↓
          ✅ RTP audio stream established
          ↓
          ✅ Candidate hears agent greeting
```

---

## 🎯 Troubleshooting

### If still failing after configuration:

1. **Check Twilio Call Logs:**
   ```
   https://console.twilio.com/us1/monitor/logs/calls
   ```
   - Look for calls to +1 412 908 0513
   - Check error messages

2. **Check Twilio Trunk Logs:**
   ```
   https://console.twilio.com/us1/monitor/logs/sip-trunking
   ```
   - Look for SIP INVITE messages
   - Check rejection reasons

3. **Verify LiveKit Trunk Health:**
   ```
   https://cloud.livekit.io/projects/p_2clu6uktyt7/telephony/trunks
   ```
   - Click on ST_QzjtLtrc35PP
   - Check "Health" status
   - Should show: "Healthy" or "Active"

4. **Test with Twilio's Test Tool:**
   - Go to trunk settings
   - Use "Test Connection" button
   - Should successfully connect to yalhire.pstn.twilio.com

---

## 🆘 Common Issues

### Issue: "No matching outbound trunk"
**Fix:** Assign phone number +14124447787 to trunk

### Issue: "Authentication failed"
**Fix:**
- Verify username: `yalhire`
- Verify password: `Yal@2026#12345`
- OR switch to IP ACL authentication

### Issue: "IP address not allowed"
**Fix:** Add LiveKit IP to Twilio IP ACL:
- 161.115.179.185/32
- 161.115.180.208/32

### Issue: "Secure media required"
**Fix:** Enable SRTP in both:
- LiveKit trunk (already done)
- Twilio trunk (Secure Trunking → SRTP)

---

## ✅ Summary

The agent code is correct. The issue is **Twilio trunk not responding to LiveKit's SIP INVITE**.

**Fix checklist:**
- [ ] Verify trunk is enabled in Twilio
- [ ] Configure Origination URI (LiveKit → Twilio)
- [ ] Configure Termination URI (Twilio → PSTN)
- [ ] Set up authentication (Username/Password OR IP ACL)
- [ ] Enable Secure Trunking (TLS + SRTP)
- [ ] Assign phone number to trunk
- [ ] Test call after 2-3 minutes

**Once Twilio trunk is configured correctly, calls will connect and the agent will work perfectly!** 📞✨
