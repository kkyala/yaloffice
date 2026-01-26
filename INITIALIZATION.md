# Yal Hire - Product Initialization Guide

## 1. Overview
Yal Hire is an AI-powered recruitment platform featuring real-time interactive video interviews.
**Core Stack:**
- **Frontend:** React (Vite) + TypeScript
- **Backend:** Node.js (Express) + Supabase (PostgreSQL)
- **AI Agent:** Python (LiveKit Agents) + Gemini/OpenAI/Deepgram
- **Infrastructure:** LiveKit Server (Real-time Video/Audio)

## 2. Prerequisites
Ensure the following are installed on your system:
- **Node.js**: v18 or higher
- **Python**: v3.10 or higher
- **LiveKit Server**: Local binary or Cloud account
- **Supabase Account**: For Database & Auth

## 3. Environment Setup

### A. Root Directory
Create/Verify `.env` in the root (used by Frontend):
```ini
VITE_API_URL=http://localhost:8000
VITE_LIVEKIT_URL=wss://your-livekit-url
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AUTO_ALLOCATE_LIVEKIT_INTERVIEW=true
```

### B. Backend Directory (`/backend`)
Create/Verify `.env` in `backend/`:
```ini
PORT=8000
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key  # Must be Service Role for Admin tasks
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LiveKit (For token generation)
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email
SMTP_PASS=your-app-password
```

### C. AI Agent Directory (`/agent`)
Create/Verify `.env` in `agent/`:
```ini
# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# AI Models
DEEPGRAM_API_KEY=your-deepgram-key
GOOGLE_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key (Optional fallback)

# Backend Sync
VITE_API_URL=http://localhost:8000
```

## 4. Installation Steps

### Step 1: Install Frontend Dependencies
```bash
npm install
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 3: Install Python Agent Dependencies
**Critical:** Ensure you have the latest LiveKit libraries to prevent Windows FFI Panics.
```bash
cd agent
pip install -r requirements.txt
```
*Note: On Windows, use versions <1.0.0 to prevent FFI panics:*
```bash
pip install "livekit<1.0.0" "livekit-api<1.0.0" "livekit-agents<1.0.0"
```

### Step 4: Database Initialization
1.  Log in to your Supabase Dashboard.
2.  Navigate to the **SQL Editor**.
3.  Execute the schema scripts found in `backend/update_audit_logs_schema.sql` (and any other migration files in `backend/`).
4.  Ensure tables `candidates`, `jobs`, `interviews`, `users` exist.

## 5. Running the Application

### Option 1: Automatic Start (Windows)
We have provided a unified script to launch all services (LiveKit, Backend, Agent, Frontend, Tunnel).
```powershell
.\start_services.bat
```

### Option 2: Manual Start
Run each in a separate terminal:

**1. LiveKit Server:**
```bash
cd livekit && livekit-server --config livekit-config.yaml
```

**2. Backend API:**
```bash
cd backend && npm start
```

**3. Python AI Agent:**
```bash
cd agent && python main.py dev
```

**4. Frontend App:**
```bash
npm run dev
```

## 6. Verification
- **Frontend**: Open `http://localhost:3000` (or `3001`).
- **Log In**: Use a candidate or employer account.
- **Start Interview**: Navigate to "My Applications" -> "Start Interview".
- **Check Audio**: Ensure the green "Audio Ready" indicator appears and the Agent responds to your voice.

## 7. Troubleshooting
- **Agent Audio Missing**: Check if `python main.py` is running and connected (`Agent Session Started` in logs).
- **"Panic" Error in Agent**: Run `pip install --upgrade -r agent/requirements.txt` to fix `webrtc-sys` issues.
- **WebSocket Error**: Ensure `LIVEKIT_URL` matches your local server (default `ws://localhost:7880`).
