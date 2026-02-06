# YalOffice – AI Architecture & Model Mapping

**Last Updated:** February 1, 2026  
**Status:** ✅ Migration Complete - Google Gemini Removed

---

## 🎯 Architecture Overview

YalOffice uses a **hybrid AI architecture** combining:
- **Local LLMs** (via Ollama): DeepSeek & Gemma
- **Cloud STT** (Deepgram): Speech-to-Text
- **Backend Logic**: Routing and business decisions

### ❌ Services NOT Used
- Google Gemini (all variants)
- OpenAI GPT-4 / GPT-3.5
- Google STT / TTS
- Whisper (replaced by Deepgram)

---

## 📊 AI Model Mapping by Function

### 1️⃣ Resume Parsing & Structuring

**Purpose:**
- Extract structured data from resumes (PDF, DOC, text)
- Convert unstructured resumes into structured candidate profiles

**AI Model:** `DeepSeek-R1 Distill 7B`

**Why This Model:**
- Strong reasoning and extraction accuracy
- Very reliable structured JSON output
- Low hallucination rate
- Best suited for logic-heavy tasks (not conversation)

**Used For:**
- Personal information extraction
- Skills identification
- Experience and education parsing
- Projects and certifications

**Service:** Backend → `ollamaService.generateWithDeepSeek()`  
**Runtime:** Ollama (ollama-deepseek container)

**Location:** `backend/src/services/aiService.ts` → `parseResumeDocument()`

---

### 2️⃣ Resume Screening & Job Description Matching

**Purpose:**
- Match candidate resumes against job descriptions
- Score relevance and suitability

**AI Model:** `DeepSeek-R1 Distill 7B`

**Output:**
- Match score (0–100)
- Skill match analysis
- Experience relevance
- Strengths and gaps summary

**Reason:**
- Deterministic reasoning
- Consistent scoring
- Excellent for comparison and ranking

**Location:** `backend/src/services/aiService.ts` → `screenResume()`

---

### 3️⃣ AI Interview Questioning (Text & Voice)

**Purpose:**
- Conduct structured HR and technical interviews
- Ask dynamic follow-up questions
- Maintain natural interview flow

**AI Model:** `Gemma 2 – 9B Instruct`

**Why This Model:**
- Very fast response time (critical for live interviews)
- GPU-efficient
- Natural conversational tone
- Better latency than LLaMA 3 for real-time interaction

**Used For:**
- Interview question generation
- Follow-up questioning
- Conversational interaction with candidates

**Service:** 
- Backend: `ollamaService.generateWithGemma()`
- Agent: Custom `OllamaLLM` class in `agent/main.py`

**Runtime:** Ollama (ollama-gemma container)

**Locations:**
- `backend/src/services/ollamaService.ts` → `generateWithGemma()`, `chatWithGemma()`
- `backend/src/services/aiService.ts` → `startScreening()`, `chatScreening()`
- `agent/main.py` → Live voice interviews via LiveKit

---

### 4️⃣ Interview Answer Evaluation & Scoring

**Purpose:**
- Evaluate candidate responses during interviews
- Provide qualitative feedback and scoring

**AI Model:** `Gemma 2 – 9B Instruct`

**Output:**
- Response quality score
- Clarity and relevance feedback
- Strengths and improvement areas

**Note:** Final hiring decisions use rule-based backend logic (not AI-decided)

**Location:** `backend/src/services/aiService.ts` → `scoreResponse()`

---

### 5️⃣ Interview Summary & Final Report

**Purpose:**
- Generate concise interview summaries for recruiters

**AI Model:** `Gemma 2 – 9B Instruct`

**Output:**
- Interview summary
- Key strengths
- Weaknesses
- Recommendation (hire / no-hire)

**Locations:**
- `backend/src/services/aiService.ts` → `generateInterviewSummary()`
- `backend/src/services/aiService.ts` → `generateScreeningReport()`
- `backend/src/services/ollamaService.ts` → `analyzeInterview()`

---

### 6️⃣ Speech-to-Text (Live Voice Interviews)

**Purpose:**
- Convert live interview audio into text in real-time

**Service:** `Deepgram Speech-to-Text API`

**Why Deepgram:**
- Very low latency (ideal for live interviews)
- High accuracy
- Strong support for English accents
- Stable real-time streaming support
- No GPU load on your system

**Used With:**
- LiveKit (audio streaming)
- Python Agent (`agent/main.py`)
- Backend for transcript storage

**Configuration:**
- Language: `en-US` (English)
- API Key: `DEEPGRAM_API_KEY` environment variable

**Location:** `agent/main.py` → `deepgram.STT(language="en-US")`

---

### 7️⃣ Text-to-Speech (Voice Output)

**Purpose:**
- Generate natural voice responses for AI interviewer

**Service:** `Cartesia TTS`

**Voice:** Professional female English voice (ID: `79a125e8-cd45-4c13-8a67-188112f4dd22`)

**Fallback:** Browser TTS if Cartesia unavailable

**Location:** `agent/main.py` → `cartesia.TTS()`

---

### 8️⃣ Orchestration & Decision Logic

**Purpose:**
- Decide which AI service to call
- Maintain screening and interview state
- Enforce business rules

**AI Used:** ❌ **No AI model** (by design)

**Handled By:** Backend application logic

**Why:**
- Predictability
- Auditability
- Avoids AI-driven routing errors

**Locations:**
- `backend/src/routes/interview.ts`
- `backend/src/routes/ai.ts`
- `backend/src/services/interviewStore.ts`

---

## 🏗️ Service Architecture

### Backend Services

```
backend/
├── src/
│   ├── services/
│   │   ├── aiService.ts          # Main AI service (uses Ollama)
│   │   ├── ollamaService.ts      # Ollama client wrapper
│   │   ├── interviewStore.ts     # Interview state management
│   │   └── supabaseService.ts    # Database operations
│   └── routes/
│       ├── ai.ts                 # AI endpoints (resume, screening)
│       └── interview.ts          # Interview endpoints
```

### Agent Service (LiveKit Voice Interviews)

```
agent/
├── main.py                        # Python LiveKit agent
├── requirements.txt               # Dependencies (Deepgram, Cartesia, aiohttp)
└── Dockerfile                     # Docker container config
```

### Docker Services

```yaml
ollama-deepseek:
  model: deepseek-r1:7b
  purpose: Resume parsing, screening
  
ollama-gemma:
  model: gemma2:9b-instruct-q8_0
  purpose: Interviews, conversations
  
agent:
  dependencies: deepgram, cartesia, livekit
  purpose: Live voice interviews
  
backend:
  dependencies: ollama-deepseek, ollama-gemma
  purpose: REST API, business logic
```

---

## 🔑 Environment Variables Required

### Backend (.env)
```bash
# Ollama Services
RESUME_AI_URL=http://ollama-deepseek:11434
INTERVIEW_AI_URL=http://ollama-gemma:11434

# Deepgram STT
DEEPGRAM_API_KEY=<your-deepgram-api-key>

# LiveKit
LIVEKIT_URL=<your-livekit-url>
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>

# Database
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

### Agent (.env)
```bash
# Ollama Services
INTERVIEW_AI_URL=http://ollama-gemma:11434

# Deepgram STT
DEEPGRAM_API_KEY=<your-deepgram-api-key>

# LiveKit
LIVEKIT_URL=<your-livekit-url>
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>

# Backend API
VITE_API_URL=http://backend:3000
```

---

## 🚀 Setup & Deployment

### 1. Pull Ollama Models

```bash
# On the host or in Docker containers
docker exec ollama-deepseek ollama pull deepseek-r1:7b
docker exec ollama-gemma ollama pull gemma2:9b-instruct-q8_0
```

### 2. Start Services

```bash
docker-compose up -d
```

### 3. Verify Health

```bash
# Check Ollama services
curl http://localhost:11435/api/tags  # DeepSeek
curl http://localhost:11436/api/tags  # Gemma

# Check backend
curl http://localhost:8000/health
```

---

## 📈 Model Performance Characteristics

| Model | Purpose | Temp | Latency | GPU Usage | Strengths |
|-------|---------|------|---------|-----------|-----------|
| **DeepSeek-R1 7B** | Resume parsing, screening | 0.1 | ~2-5s | Medium | Structured output, accuracy |
| **Gemma 2 9B** | Interviews, conversations | 0.7 | ~1-3s | Medium-High | Speed, natural language |
| **Deepgram** | Speech-to-text | N/A | ~100ms | None (cloud) | Low latency, accuracy |
| **Cartesia** | Text-to-speech | N/A | ~200ms | None (cloud) | Natural voice, quality |

---

## 🎨 Language & Tone

- **Interview Language:** English (en-US)
- **Interview Tone:** Professional but conversational
- **TTS Voice:** Professional female voice (Cartesia)
- **STT Optimization:** English accents, real-time streaming

---

## 📝 Migration Notes (From Google Gemini)

### What Changed:
1. ✅ Removed all Google Gemini API dependencies
2. ✅ Replaced with Ollama (DeepSeek + Gemma)
3. ✅ Switched from Google STT to Deepgram
4. ✅ Switched from Google TTS to Cartesia
5. ✅ Changed interview language from Thai to English
6. ✅ Updated all prompts to English
7. ✅ Removed `livekit-plugins-google` and `livekit-plugins-openai`

### Breaking Changes:
- Video analysis (`analyzeVideo`) no longer supported (Ollama models don't support video)
- PDF/Image resume parsing requires OCR preprocessing (text extraction first)

### Backward Compatibility:
- All REST API endpoints remain the same
- Database schema unchanged
- Frontend integration points unchanged

---

## 🔍 Testing Checklist

- [ ] Resume parsing (Word documents)
- [ ] Resume screening against job descriptions
- [ ] Text-based screening conversations
- [ ] Live voice interviews via LiveKit
- [ ] Interview transcription (Deepgram)
- [ ] Interview analysis and scoring
- [ ] Screening report generation
- [ ] Health check endpoints

---

## 🎯 Final Takeaway

**DeepSeek evaluates, Gemma interviews, Deepgram listens, and the backend decides.**

This architecture provides:
- ✅ Hybrid: Local LLMs + Cloud STT
- ✅ Low latency for live interviews
- ✅ Clear separation of responsibilities
- ✅ Predictable cost
- ✅ Production-ready architecture
- ✅ No Google/OpenAI dependencies
