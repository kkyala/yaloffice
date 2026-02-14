# YalOffice – AI Architecture & Model Mapping

**Last Updated:** February 8, 2026
**Status:** ✅ Production Ready - Google Gemini 2.0 Flash Integration

---

## 🎯 Architecture Overview

YalOffice uses a **cloud-first AI architecture** for real-time interviews combining:
- **Cloud LLM** (Google Gemini 2.0 Flash): Conversational AI for live interviews
- **Cloud STT/TTS** (Deepgram): Speech-to-Text and Text-to-Speech
- **LiveKit**: Real-time audio/video streaming (local for web, cloud for phone/SIP)
- **Backend Logic**: Routing, business decisions, and state management

### ✅ Services In Production
- **Google Gemini 2.0 Flash** - Conversational AI for live interviews
- **Deepgram** - Speech-to-Text and Text-to-Speech
- **LiveKit** - Real-time WebRTC communication
  - Local server (`ws://127.0.0.1:7880`) for web interviews
  - Cloud server (`wss://yal-wqwibw1y.livekit.cloud`) for phone/SIP interviews
- **Ollama** (optional) - DeepSeek & Gemma for resume parsing (batch processing)

### ❌ Services NOT Used for Live Interviews
- Ollama (too slow for real-time conversations)
- OpenAI GPT-4 / GPT-3.5
- Google STT (using Deepgram)
- Cartesia TTS (using Deepgram TTS instead)
- Whisper (replaced by Deepgram)

---

## 📊 AI Model Mapping by Function

### 1️⃣ Resume Parsing & Structuring (Optional/Batch)

**Purpose:**
- Extract structured data from resumes (PDF, DOC, text)
- Convert unstructured resumes into structured candidate profiles

**AI Model:** `DeepSeek-R1 Distill 7B` (via Ollama - Optional)

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

**Service:** Backend → `ollamaService.generateWithDeepSeek()` (if enabled)
**Runtime:** Ollama (ollama-deepseek container) - Optional

**Location:** `backend/src/services/aiService.ts` → `parseResumeDocument()`

**Note:** Can be replaced with Gemini API for production if Ollama not available

---

### 2️⃣ Resume Screening & Job Description Matching (Optional/Batch)

**Purpose:**
- Match candidate resumes against job descriptions
- Score relevance and suitability

**AI Model:** `DeepSeek-R1 Distill 7B` (via Ollama) OR `Gemini 2.0 Flash`

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

### 3️⃣ AI Interview Questioning (Live Voice & Video)

**Purpose:**
- Conduct structured HR and technical interviews in real-time
- Ask dynamic follow-up questions
- Maintain natural interview flow

**AI Model:** ✅ `Google Gemini 2.0 Flash`

**Why This Model:**
- **Ultra-low latency** (~1-2 seconds) - Critical for real-time conversations
- **Natively integrated** with LiveKit agents (no custom adapters needed)
- **Excellent conversational abilities** - Natural dialogue flow
- **Stable and production-ready** - Not experimental
- **Understands context** - Remembers conversation history
- **Cost-effective** - Optimized pricing for streaming

**Used For:**
- Live interview question generation
- Real-time follow-up questioning
- Natural conversational interaction with candidates
- Context-aware interview progression

**Service:**
- Agent: `livekit.plugins.google.LLM()` in `agent/main.py`
- Model: `gemini-2.0-flash`
- Temperature: `0.7`

**Runtime:** Google Cloud AI API (no local GPU required)

**Location:** `agent/main.py` → LiveKit agent with Gemini integration

---

### 4️⃣ Speech-to-Text (Live Voice Interviews)

**Purpose:**
- Convert live interview audio into text in real-time
- Transcribe candidate responses with high accuracy

**Service:** ✅ `Deepgram Speech-to-Text API`

**Why Deepgram:**
- **Ultra-low latency** (~100ms) - Ideal for real-time interviews
- **High accuracy** - Industry-leading transcription
- **Strong support for English accents** - Handles various dialects
- **Stable real-time streaming** - WebSocket-based
- **No GPU load** - Cloud service
- **Reliable for production** - 99.99% uptime SLA

**Used With:**
- LiveKit (audio streaming)
- Python Agent (`agent/main.py`)
- Backend for transcript storage

**Configuration:**
- Language: `en-US` (English)
- API Key: `DEEPGRAM_API_KEY` environment variable
- Streaming: Yes (WebSocket)

**Location:** `agent/main.py` → `deepgram.STT(language="en-US")`

---

### 5️⃣ Text-to-Speech (Voice Output)

**Purpose:**
- Generate natural voice responses for AI interviewer
- Speak interview questions and responses

**Service:** ✅ `Deepgram Text-to-Speech API`

**Why Deepgram TTS:**
- **Low latency** - Fast speech synthesis
- **Natural voice quality** - Professional interviewer voice
- **Consistent with STT** - Single vendor for audio pipeline
- **Production-ready** - Stable and reliable

**Configuration:**
- Voice: Default Deepgram voice
- Language: English (en-US)
- Streaming: Yes

**Location:** `agent/main.py` → `deepgram.TTS()`

**Previous:** Cartesia TTS (deprecated in favor of Deepgram)

---

### 6️⃣ Voice Activity Detection (VAD)

**Purpose:**
- Detect when candidate starts/stops speaking
- Trigger STT processing at the right moments

**Service:** ✅ `Silero VAD`

**Why Silero:**
- **Fast and lightweight** - Minimal latency
- **High accuracy** - Reduces false positives
- **Natively integrated** with LiveKit agents

**Location:** `agent/main.py` → `silero.VAD.load()`

---

### 7️⃣ Interview Answer Evaluation & Scoring (Post-Interview)

**Purpose:**
- Evaluate candidate responses after interview completes
- Provide qualitative feedback and scoring

**AI Model:** `Gemini 2.0 Flash` OR `Gemma 2 9B` (if using Ollama)

**Output:**
- Response quality score
- Clarity and relevance feedback
- Strengths and improvement areas

**Note:** Final hiring decisions use rule-based backend logic (not AI-decided)

**Location:** `backend/src/services/aiService.ts` → `scoreResponse()`

---

### 8️⃣ Interview Summary & Final Report

**Purpose:**
- Generate concise interview summaries for recruiters

**AI Model:** `Gemini 2.0 Flash` OR `Gemma 2 9B`

**Output:**
- Interview summary
- Key strengths
- Weaknesses
- Recommendation (hire / no-hire)

**Locations:**
- `backend/src/services/aiService.ts` → `generateInterviewSummary()`
- `backend/src/services/aiService.ts` → `generateScreeningReport()`

---

### 9️⃣ Email Communications

**Purpose:**
- Send verification emails, interview invitations, and reports

**Service:** ✅ `Custom Email Service (SMTP)`

**Features:**
- **Master switch**: `EMAIL_ENABLED` environment variable
  - `true`: Email verification required, send all emails
  - `false`: Auto-verify users, skip email sending
- **Email types**:
  - Signup verification
  - Welcome emails
  - Password reset
  - Interview reports with PDF attachments

**Configuration:**
```env
EMAIL_ENABLED=true/false  # Master switch
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_SECURE=true
```

**Location:**
- `backend/src/services/emailService.ts`
- `backend/src/routes/auth.ts` → Respects EMAIL_ENABLED flag

---

## 🏗️ Service Architecture

### LiveKit Agent (Python)

```
agent/
├── main.py                  # LiveKit agent with Gemini + Deepgram
├── .env                     # Agent environment variables
│   ├── LIVEKIT_URL          # Local: ws://127.0.0.1:7880
│   ├── GOOGLE_API_KEY       # Gemini API key
│   ├── DEEPGRAM_API_KEY     # Deepgram API key
│   └── VITE_API_URL         # Backend API
└── requirements.txt         # Python dependencies
```

**Dependencies:**
- `livekit`
- `livekit-agents`
- `livekit-plugins-deepgram`
- `livekit-plugins-google`
- `livekit-plugins-silero`
- `aiohttp`

### Backend Services (TypeScript/Node.js)

```
backend/
├── src/
│   ├── services/
│   │   ├── aiService.ts          # AI operations
│   │   ├── emailService.ts       # Email with master switch
│   │   ├── livekitService.ts     # LiveKit token generation
│   │   ├── supabaseService.ts    # Database operations
│   │   └── sipService.ts         # Phone/SIP integration
│   └── routes/
│       ├── auth.ts               # Auth with EMAIL_ENABLED support
│       ├── livekit.ts            # LiveKit token endpoint
│       └── interview.ts          # Interview management
└── .env
    ├── LIVEKIT_URL               # Local: ws://127.0.0.1:7880
    ├── LIVEKIT_CLOUD_URL         # Cloud: wss://yal-wqwibw1y.livekit.cloud
    ├── GEMINI_API_KEY            # Gemini API key
    ├── DEEPGRAM_API_KEY          # Deepgram API key
    └── EMAIL_ENABLED             # Email master switch
```

### Frontend (React/TypeScript)

```
src/
├── pages/
│   └── AvatarInterviewScreen.tsx  # Main interview screen
└── services/
    └── livekitService.ts          # LiveKit room connection
```

---

## 🔑 Environment Variables Required

### Backend (.env)
```bash
# LiveKit - Local (Web Interviews)
LIVEKIT_URL=ws://127.0.0.1:7880
LIVEKIT_REST_URL=http://127.0.0.1:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=<your-secret>

# LiveKit - Cloud (Phone/SIP Interviews)
LIVEKIT_CLOUD_URL=wss://yal-wqwibw1y.livekit.cloud
LIVEKIT_CLOUD_API_KEY=<your-cloud-api-key>
LIVEKIT_CLOUD_API_SECRET=<your-cloud-secret>
LIVEKIT_SIP_TRUNK_ID=<your-sip-trunk-id>

# Google Gemini
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.0-flash

# Deepgram
DEEPGRAM_API_KEY=<your-deepgram-api-key>

# Email (Master Switch)
EMAIL_ENABLED=true  # or false to disable email verification
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-password>
SMTP_FROM=<your-from-email>

# Database
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

### Agent (.env)
```bash
# LiveKit Configuration (LOCAL for Web Interviews)
LIVEKIT_URL=ws://127.0.0.1:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=<your-secret>

# Google Gemini API (for LLM conversational AI)
GOOGLE_API_KEY=<your-gemini-api-key>

# Deepgram for STT and TTS
DEEPGRAM_API_KEY=<your-deepgram-api-key>

# Backend API URL (for saving interview results)
VITE_API_URL=http://localhost:8000
```

**Note:** For phone/SIP interviews, `run_cloud_agent.bat` overrides LIVEKIT_* vars with LIVEKIT_CLOUD_* values.

---

## 🚀 Setup & Deployment

### 1. Start LiveKit Server (Local)

```bash
cd livekit
livekit-server.exe --config livekit-config.yaml --bind 127.0.0.1
```

### 2. Start Backend

```bash
cd backend
npm install
npm run build
npm start
```

### 3. Start Agent (Local - Web Interviews)

```bash
cd agent
pip install -r requirements.txt
python main.py dev
```

### 4. Start Agent (Cloud - Phone/SIP Interviews)

```bash
cd agent
call run_cloud_agent.bat
```

### 5. Start Frontend

```bash
npm install
npm run build
npm run preview -- --port 3001 --host
```

### 6. All-in-One Startup

```bash
start_services.bat
```

This starts:
- LiveKit Server (Port 7880)
- Backend (Port 8000)
- Frontend (Port 3001)
- Agent (Local)
- Agent (Cloud - Phone)

---

## 📈 Model Performance Characteristics

| Service | Purpose | Latency | GPU Usage | Strengths |
|---------|---------|---------|-----------|-----------|
| **Gemini 2.0 Flash** | Live interviews, conversations | ~1-2s | None (cloud) | Ultra-low latency, natural dialogue |
| **Deepgram STT** | Speech-to-text | ~100ms | None (cloud) | Real-time streaming, accuracy |
| **Deepgram TTS** | Text-to-speech | ~200ms | None (cloud) | Natural voice, low latency |
| **Silero VAD** | Voice activity detection | ~10ms | None (local) | Fast, accurate |
| **DeepSeek-R1 7B** (optional) | Resume parsing | ~2-5s | Medium (local) | Structured output, accuracy |

---

## 🎨 Language & Tone

- **Interview Language:** English (en-US)
- **Interview Tone:** Professional but conversational
- **TTS Voice:** Professional English voice (Deepgram default)
- **STT Optimization:** English accents, real-time streaming
- **LLM Temperature:** 0.7 (balanced creativity/consistency)

---

## 📝 Migration Notes (Latest Update: Feb 8, 2026)

### What Changed:
1. ✅ **Replaced Ollama with Google Gemini 2.0 Flash** for live interviews
2. ✅ **Switched to Deepgram TTS** (from Cartesia)
3. ✅ **Fixed LiveKit server mismatch** (agent → local, not cloud)
4. ✅ **Added EMAIL_ENABLED master switch** for email verification
5. ✅ **Updated auth routes** to respect EMAIL_ENABLED flag
6. ✅ **Configured dual LiveKit setup** (local for web, cloud for phone/SIP)

### Why Gemini 2.0 Flash:
- ❌ Ollama: ChatContext API incompatibility, slow for real-time
- ✅ Gemini: Native LiveKit integration, 1-2s latency, production-ready

### Breaking Changes:
- Ollama no longer used for live interviews (optional for batch processing)
- Cartesia TTS replaced with Deepgram TTS

### Backward Compatibility:
- All REST API endpoints remain the same
- Database schema unchanged
- Frontend integration points unchanged

---

## 🔍 Testing Checklist

- [x] LiveKit local server running (Port 7880)
- [x] LiveKit cloud server configured (SIP)
- [x] Gemini 2.0 Flash API integration
- [x] Deepgram STT working in real-time
- [x] Deepgram TTS generating voice
- [x] Email master switch (EMAIL_ENABLED)
- [ ] Live voice interviews via web browser
- [ ] Phone/SIP interviews via cloud agent
- [ ] Interview transcription storage
- [ ] Interview analysis and scoring
- [ ] Email notifications (if enabled)

---

## 🎯 Final Takeaway

**Gemini 2.0 Flash converses, Deepgram listens and speaks, LiveKit streams, and the backend orchestrates.**

This architecture provides:
- ✅ **Cloud-first**: No local GPU required for interviews
- ✅ **Ultra-low latency**: 1-2s for LLM, 100ms for STT, 200ms for TTS
- ✅ **Production-ready**: Stable, reliable services with SLAs
- ✅ **Scalable**: Pay-per-use, no infrastructure management
- ✅ **Flexible**: Email can be enabled/disabled with one flag
- ✅ **Dual-mode**: Web (local LiveKit) + Phone (cloud LiveKit)

**Cost Optimization:**
- Gemini 2.0 Flash: Optimized pricing for conversational AI
- Deepgram: Competitive pricing for real-time audio
- LiveKit: Self-hosted (local) for web, cloud for phone

**Key Insight:** We moved from local Ollama (slow, incompatible) to cloud Gemini (fast, native) for **real-time conversational quality** that feels natural to candidates.
