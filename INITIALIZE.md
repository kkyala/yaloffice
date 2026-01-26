# YalHire - AI Recruitment Platform Initialization Guide

## 🚀 Project Overview
YalHire is an AI-powered recruitment platform featuring:
- **Candidate Dashboard**: Job search, application tracking, and profile management.
- **AI Video Interviews**: Real-time conversational interviews using LiveKit and AI Avatars.
- **Employer Dashboard**: Candidate review, job management, and analytics.

## 🛠️ Prerequisites
- **Node.js** (v18+)
- **Python** (3.9+)
- **LiveKit Server** (Local or Cloud)
- **Supabase** (account & project)
- **Gemini API Key**

## 📦 Service Architecture
The platform consists of three main services:
1.  **Frontend**: React (Vite) application running on port `3001` (default).
2.  **Backend**: Express.js server running on port `8000`.
3.  **AI Agent**: Python process using `livekit-agents` to conduct interviews.

## 🔧 Setup & Installation

### 1. Backend Setup
```bash
cd backend
npm install
# Configure .env (see below)
npm run dev
```

### 2. Frontend Setup
```bash
# Root directory contains frontend
npm install
# Configure .env (see below)
npm run dev
```

### 3. AI Agent Setup
```bash
cd agent
python -m venv venv
# Activate venv: venv\Scripts\activate (Windows) or source venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
# Configure .env
python main.py dev
```

### 4. LiveKit Server (Local Dev)
It is recommended to use the LiveKit CLI to run a local server:
```bash
lk server --dev
```
Or use the provided `livekit-server.exe` if available in the `livekit/` folder.

## 🔑 Environment Variables
Create `.env` files for each service.

### Backend (`backend/.env`)
```env
PORT=8000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
GEMINI_API_KEY=your_gemini_key
FRONTEND_URL=http://localhost:3001
```

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_AUTO_ALLOCATE_LIVEKIT_INTERVIEW=true
```

### AI Agent (`agent/.env`)
```env
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
GEMINI_API_KEY=your_gemini_key
DEEPGRAM_API_KEY=your_deepgram_key (Optional)
```

## 🏃‍♂️ Running the Platform
For convenience, use the `start_services.bat` script on Windows to launch all services simultaneously.

## 🐛 Troubleshooting
- **Agent Panic / FFI Error**: Ensure `livekit` python package is up to date (`>=0.18.0`). Reinstall if necessary.
- **Connection Issues**: Verify LiveKit server is running and ports (7880, 8000) are not blocked.
