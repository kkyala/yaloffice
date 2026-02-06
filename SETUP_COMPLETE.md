# ✅ SETUP COMPLETE - FINAL INSTRUCTIONS

## 🎯 Current Status

### ✅ Completed:
- DeepSeek-R1 7B model installed (4.7 GB)
- Gemma 2 9B Instruct model installed (9.8 GB)
- Backend .env configured with Ollama URLs
- Agent .env configured for Deepgram + Ollama
- All code refactored to use Ollama instead of Gemini
- Docker containers running and healthy

### ⚠️ Action Required:
**Your backend server needs to be restarted to pick up the new Ollama configuration**

---

## 📋 STEP-BY-STEP TESTING GUIDE

### Step 1: Restart Backend Server ⚠️ REQUIRED

**In your backend terminal where `npm run dev` is running:**

1. Press `Ctrl+C` to stop the server
2. Run:
   ```bash
   npm run dev
   ```
3. Wait for the message: `Server running on http://localhost:8000`

**Why?** The backend was started before we updated the `.env` file with Ollama URLs, so it's still trying to use the old configuration.

---

### Step 2: Run Complete Test Suite

**In a NEW PowerShell terminal:**

```powershell
cd d:\Projects\SourceCode\YalOffice\yaloffice
powershell -ExecutionPolicy Bypass -File test-complete.ps1
```

**This will test:**
- ✅ Ollama DeepSeek connectivity (port 11435)
- ✅ Ollama Gemma connectivity (port 11436)
- ✅ Backend API health
- ✅ Resume screening with DeepSeek
- ✅ Interview conversation with Gemma

**Expected Output:**
```
✅ DeepSeek: Ollama 0.15.2
✅ Gemma: Ollama 0.15.2
✅ Backend: healthy
✅ Resume Screening Successful!
  Match Score: 85%
  Summary: Strong candidate with relevant experience...
✅ Interview Conversation Started!
  AI Greeting: Hello! I'm excited to discuss your background...
```

---

### Step 3: Test Frontend

**Open your browser manually:**

1. Go to: **http://localhost:3001**

2. **Test Resume Upload:**
   - Navigate to Candidates or Jobs section
   - Upload a Word document resume (.docx)
   - The system should parse it using DeepSeek
   - Check for extracted info (name, skills, experience)

3. **Test AI Screening Interview:**
   - Start a new AI screening
   - The system should use Gemma for conversation
   - Speak or type responses
   - AI should respond in English

---

## 📊 Performance Monitoring

### Check GPU Usage (if using NVIDIA GPU):

```powershell
nvidia-smi
```

**Expected:**
- DeepSeek: ~8GB VRAM
- Gemma: ~12GB VRAM
- Total: ~20GB VRAM

### Check Ollama Response Times:

Watch your backend terminal for logs like:
```
[OllamaService] DeepSeek URL: http://localhost:11435
[OllamaService] Gemma URL: http://localhost:11436
```

**Expected Response Times:**
- DeepSeek (resume parsing): 2-5 seconds
- Gemma (conversation): 1-3 seconds

### Check Docker Containers:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Should show:**
```
ollama-deepseek    Up X hours
ollama-gemma       Up X hours
```

---

## 🐛 Troubleshooting

### If tests fail with "ENOTFOUND ollama-deepseek":

**Problem:** Backend hasn't reloaded the `.env` file

**Solution:**
1. Stop backend (Ctrl+C)
2. Restart: `npm run dev`
3. Re-run tests

### If tests fail with "Connection timeout":

**Problem:** Ollama models not loaded

**Solution:**
```powershell
docker exec ollama-deepseek ollama list
docker exec ollama-gemma ollama list
```

Should show:
```
deepseek-r1:7b
gemma2:9b-instruct-q8_0
```

### If resume parsing is slow (>10 seconds):

**Problem:** CPU mode instead of GPU

**Solution:** Check Docker Desktop GPU settings or `nvidia-smi`

### If you get "Model not found":

**Problem:** Models not pulled

**Solution:**
```powershell
docker exec ollama-deepseek ollama pull deepseek-r1:7b
docker exec ollama-gemma ollama pull gemma2:9b-instruct-q8_0
```

---

## 📚 Documentation Reference

All documentation is in your project folder:

- **AI_ARCHITECTURE.md** - Complete AI model mapping
- **MIGRATION_SUMMARY.md** - What changed from Gemini
- **QUICK_START.md** - Setup guide
- **test-complete.ps1** - Comprehensive test suite
- **test-ai-services.ps1** - Individual service tests

---

## ✅ Success Criteria

**You'll know everything is working when:**

1. ✅ Test script shows all green checkmarks
2. ✅ Backend logs show `[OllamaService] Initialized`
3. ✅ Resume upload shows AI-parsed data within 5 seconds
4. ✅ AI interviews respond in English within 3 seconds
5. ✅ No "ENOTFOUND" or "timeout" errors

---

## 🎉 What You've Accomplished

**You now have:**
- ✅ Local AI models (no API costs!)
- ✅ DeepSeek for accurate resume parsing
- ✅ Gemma for natural interview conversations
- ✅ Deepgram for speech-to-text
- ✅ English language interviews
- ✅ Complete control over your AI stack

**Total migration:**
- Google Gemini → Ollama (DeepSeek + Gemma)
- Google STT → Deepgram
- Thai language → English
- Cloud AI → Hybrid (local LLM + cloud STT)

---

## 💡 Quick Reference

**Environment Variables (backend/.env):**
```
RESUME_AI_URL=http://localhost:11435
INTERVIEW_AI_URL=http://localhost:11436
DEEPGRAM_API_KEY=b47d143f339576fe5c28c850bd7ba84d97938016
```

**Ollama Ports:**
- DeepSeek: 11435
- Gemma: 11436

**Test Commands:**
```powershell
# Full test
powershell -ExecutionPolicy Bypass -File test-complete.ps1

# Quick resume test
powershell -ExecutionPolicy Bypass -File quick-test.ps1

# Check models
docker exec ollama-deepseek ollama list
docker exec ollama-gemma ollama list
```

---

## 🚀 Ready to Test!

**Next Action:** Restart your backend server, then run `test-complete.ps1`

Good luck! 🎉
