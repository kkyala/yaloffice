# YalOffice - Quick Start Guide (New AI Architecture)

## 🚀 Quick Setup (5 Steps)

### 1. Prerequisites
- Docker Desktop installed and running
- At least 20GB free disk space
- GPU with 20GB+ VRAM (recommended) or CPU mode (slower)
- Node.js 18+ and Python 3.10+

### 2. Environment Configuration

Create/update `.env` files:

**`backend/.env`:**
```bash
# Ollama Services
RESUME_AI_URL=http://ollama-deepseek:11434
INTERVIEW_AI_URL=http://ollama-gemma:11434

# Deepgram STT
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**`agent/.env`:**
```bash
# Ollama
INTERVIEW_AI_URL=http://ollama-gemma:11434

# Deepgram
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Backend
VITE_API_URL=http://backend:3000
```

### 3. Start Docker Services

```bash
# Start Ollama containers first
docker-compose up -d ollama-deepseek ollama-gemma

# Wait 10 seconds for containers to initialize
# Then pull the AI models

# Windows:
powershell -ExecutionPolicy Bypass -File setup-ollama-models.ps1

# Linux/Mac:
chmod +x setup-ollama-models.sh
./setup-ollama-models.sh
```

### 4. Start All Services

```bash
# Start all remaining services
docker-compose up -d

# Or for local development:
npm run dev         # Frontend (port 3001)
cd backend && npm run dev  # Backend (port 8000)
# Agent runs via Docker automatically
```

### 5. Verify Everything Works

```bash
# Check Ollama models
curl http://localhost:11435/api/tags  # Should list deepseek-r1:7b
curl http://localhost:11436/api/tags  # Should list gemma2:9b-instruct-q8_0

# Check backend
curl http://localhost:8000/health

# Check LiveKit
curl http://localhost:7880
```

---

## 🧪 Test the System

### Test 1: Resume Parsing
```bash
# Upload a Word resume through the frontend
# Or call API directly:
curl -X POST http://localhost:8000/api/ai/resume/parse \
  -H "Content-Type: application/json" \
  -d '{
    "fileBase64": "<base64-word-doc>",
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }'
```

### Test 2: Resume Screening
```bash
curl -X POST http://localhost:8000/api/ai/resume/screen \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "Software Engineer with 5 years of React experience...",
    "jobDescription": "Looking for a Senior React Developer..."
  }'
```

### Test 3: Live Voice Interview
1. Open YalOffice frontend
2. Navigate to"Interview" section
3. Click "Start AI Interview"
4. Speak in English - Deepgram will transcribe
5. Gemma 2 will respond via Cartesia TTS

---

## 📊 Model Usage

| When You... | Which Model | Why |
|------------|-------------|-----|
| Upload a resume | DeepSeek-R1 7B | Extracts info accurately |
| Screen candidates | DeepSeek-R1 7B | Consistent scoring |
| Start text interview | Gemma 2 9B | Fast, natural conversation |
| Start voice interview | Gemma 2 9B + Deepgram + Cartesia | Real-time audio pipeline |
| Generate report | Gemma 2 9B | Natural language summary |

---

## 🔧 Troubleshooting

### "Ollama model not found"
```bash
# Pull models manually
docker exec ollama-deepseek ollama pull deepseek-r1:7b
docker exec ollama-gemma ollama pull gemma2:9b-instruct-q8_0
```

### "Deepgram authentication failed"
- Check your `DEEPGRAM_API_KEY` in `.env`
- Verify quota at https://deepgram.com/

### "Out of GPU memory"
```bash
# Use CPU mode (slower)
# Edit docker-compose.yml and remove GPU reservations
# Or use smaller quantized models
```

### "Agent not responding in voice interview"
```bash
# Check agent logs
docker logs agent

# Verify LiveKit connection
curl ws://localhost:7880
```

---

## 📈 Performance Tips

1. **GPU Allocation:**
   - DeepSeek: Allocate 8GB VRAM
   - Gemma: Allocate 12GB VRAM
   - Leave 4GB for system

2. **Model Quantization:**
   - Using `gemma2:9b-instruct-q8_0` (8-bit quantization)
   - For lower memory: Try `gemma2:9b-instruct-q4_0`

3. **Concurrent Requests:**
   - Set `OLLAMA_MAX_LOADED_MODELS=1` to prevent memory overflow
   - Use `OLLAMA_KEEP_ALIVE=24h` to avoid reload delays

---

## 🎯 What's Different from Before?

| Aspect | Before (Gemini) | Now (Ollama) |
|--------|----------------|--------------|
| **AI Provider** | Google Gemini API | Local Ollama |
| **Cost** | Pay per request | $0 (after setup) |
| **Latency** | ~500ms-2s | ~1-5s (depends on GPU) |
| **Language** | Thai | English |
| **STT** | Google STT (Thai) | Deepgram (English) |
| **TTS** | Google TTS (Thai) | Cartesia (English) |
| **Privacy** | Cloud | Local LLMs |
| **Internet** | Required | Optional (except STT/TTS) |

---

## 🎓 Key Points to Remember

✅ **DeepSeek** = Resume parsing & screening (structured tasks)  
✅ **Gemma** = Interviews & conversations (natural language)  
✅ **Deepgram** = Speech-to-text (low latency)  
✅ **Cartesia** = Text-to-speech (natural voice)  
✅ **Backend** = Routes requests to the right AI

---

## 📚 Documentation

- **Full Architecture:** `AI_ARCHITECTURE.md`
- **Migration Details:** `MIGRATION_SUMMARY.md`
- **API Routes:** `backend/src/routes/ai.ts` and `backend/src/routes/interview.ts`

---

## 🆘 Need Help?

1. Check Docker logs: `docker-compose logs -f`
2. Check Ollama status: `curl localhost:11435/api/tags`
3. Verify `.env` configuration
4. Review `MIGRATION_SUMMARY.md` for breaking changes

---

**Ready to go!** 🎉

Start recruiting with AI-powered interviews in English using your local models!
