
# Local Migration Plan & Setup Guide

This document outlines the steps to run the YalOffice application entirely on your local machine / server without Docker, as requested.

## 1. Prerequisites (Install Locally)

Since you are not using Docker, you must install these services manually on your Windows machine:

1.  **PostgreSQL 16+**: [Download](https://www.postgresql.org/download/windows/)
    *   Create a user/password (e.g., `postgres`/`password`).
    *   Create a database named `yaloffice`.
2.  **Redis**: [Download Memurai (Redis for Windows)](https://www.memurai.com/) or run via WSL.
    *   Ensure it runs on `localhost:6379`.
3.  **App & Agent Runtimes**:
    *   **Node.js (v20+)**: [Download](https://nodejs.org/)
    *   **Python (v3.10+)**: [Download](https://www.python.org/)
    *   **Ollama**: [Download](https://ollama.com/)
        *   Run `ollama pull deepseek-r1` (or your preferred model).
        *   Run `ollama pull gemma:2b` (for faster voice agent).
4.  **LiveKit Server**:
    *   The binary is already in `livekit/livekit-server.exe`.
5.  **Cloudflare Tunnel**:
    *   The binary is in `cloudflared/cloudflared.exe`.

---

## 2. Database Migration Plan (Supabase -> Local Postgres)

The application currently relies on **Supabase Auth** (`auth.users` table), which is not present in a standard Postgres installation. To run locally without Supabase:

### Option A: Use Supabase CLI (Recommended)
This runs a local "Supabase Stack" (Postgres + GoTrue Auth) using Docker. *Since you specified NO Docker, this is not an option.*

### Option B: Manual Migration (Required for No-Docker)
You must modify the application to handle Authentication manually.

1.  **Schema Adaptation**:
    *   In `backend/database_setup.sql`, the `public.users` table references `auth.users`.
    *   **Action**: Remove the foreign key to `auth.users`. Add a `password_hash` column to `public.users`.
    *   **Action**: Create a `public.users` table that *includes* the email/password fields instead of linking to Supabase.

2.  **Backend Auth Logic**:
    *   The backend currently validates Supabase JWTs.
    *   **Action**: Rewrite `backend/src/middleware/auth.ts` to issue and verify your own JWTs signed with a local secret.
    *   **Action**: Create `login` / `signup` endpoints in `backend/src/routes/auth.ts` that query `public.users` directly and hash passwords (using `bcrypt`).

**Migration Script (Concept)**:
```sql
-- Run this on your local Postgres 'yaloffice' DB
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Simplified Users Table (Merged Supabase Auth + Public Profile)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- New field for local auth
    name TEXT,
    role TEXT CHECK (role IN ('Candidate', 'Employer', 'Agent', 'Admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- ... other fields
);
-- ... (rest of tables from database_setup.sql, removing RLS policies involving auth.uid())
```

*For the immediate "Local Run", I have configured the system to continue using Supabase Cloud (as you instructed: "Let it run on Supabase"), but the Frontend/Backend/Agent will run locally.*

---

## 3. Real-Time Server (LiveKit)

We will use the existing `livekit-server.exe` found in your project.
*   **Config**: `livekit/livekit-config.yaml`
*   **Startup**: `scripts/start-livekit.ps1` (Updated to fix paths).

## 4. AI Agent (Gemini -> Local Ollama)

I have refactored `agent/main.py` to:
1.  Remove **Google Gemini** LLM dependency.
2.  Use **Ollama** (via OpenAI protocol) running locally on `http://localhost:11434`.
3.  Keep **Deepgram** for STT (Speech-to-Text) and TTS (Text-to-Speech) as requested ("existing STT/TTS pipelines").
    *   *Note: You still need a `DEEPGRAM_API_KEY` in your `.env`.*

## 5. Running the System

I have created a master script `start-local.ps1` in the root directory.

**Usage**:
```powershell
.\start-local.ps1
```

This script will launch 5 separate windows:
1.  **LiveKit Server**
2.  **Redis** (attempts to start or warns)
3.  **Backend** (`npm run dev`)
4.  **Frontend** (`npm run dev`)
5.  **AI Agent** (`python main.py`)

It assumes `ollama serve` is already running in your system tray.
