@echo off
REM Add Node.js to PATH if not already there
where npm >nul 2>&1
if %errorlevel% neq 0 (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)
echo ===================================================
echo   YalOffice Service Launcher - Gemini 2.0 Flash
echo ===================================================
echo.
echo Architecture: Cloud-first with Google Gemini
echo - Web Interviews: Local LiveKit + Gemini
echo - Phone Screens: Cloud LiveKit + SIP + Gemini
echo ===================================================

echo [1/7] Cleaning up old processes...
taskkill /F /IM livekit-server.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM cloudflared.exe /T 2>nul
echo Cleaned up.

echo.
echo [2/7] Starting AI Models & Redis (Docker: DeepSeek, Gemma, Redis)...
docker-compose up -d ollama-deepseek ollama-gemma redis
timeout /t 5 /nobreak >nul

echo.
echo [3/7] Starting LiveKit Server Locally (Port 7880)...
start "LiveKit Server" cmd /k "cd /d %~dp0livekit && livekit-server.exe --config livekit-config.yaml --bind 127.0.0.1"
timeout /t 3 /nobreak >nul

echo [4/7] Starting Backend Server (Port 8000)...
start "YalOffice Backend" cmd /k "cd /d %~dp0backend && npm run build && npm start"
timeout /t 5 /nobreak >nul

echo [5/7] Starting Frontend (Port 3001)...
start "YalOffice Frontend" cmd /k "cd /d %~dp0 && npm run build && npm run preview -- --port 3001 --host"
timeout /t 3 /nobreak >nul

echo [6/7] Starting Python Agents with Gemini 2.0 Flash...
echo   - Local Agent (Web Interviews)...
start "Agent (Local - Web)" cmd /k "cd /d %~dp0agent && python main.py dev"

echo   - Cloud Agent (Phone Screens via SIP)...
start "Agent (Cloud - Phone)" cmd /k "cd /d %~dp0agent && call run_cloud_agent.bat"

echo [7/7] Starting Cloudflare Tunnel for demo.yalhire.ai...
start "Cloudflare Tunnel" cmd /k "cd /d %~dp0cloudflared && cloudflared.exe --config config_local.yml tunnel run"

echo.
echo ===================================================
echo   All services launched successfully!
echo ===================================================
echo.
echo Running Services:
echo   [Cloud]  Google Gemini 2.0 Flash (LLM)
echo   [Cloud]  Deepgram STT/TTS
echo   [Local]  LiveKit Server (ws://127.0.0.1:7880)
echo   [Cloud]  LiveKit Cloud (wss://yal-wqwibw1y.livekit.cloud)
echo   [Local]  Backend API (http://localhost:8000)
echo   [Local]  Frontend (http://127.0.0.1:3001)
echo   [Local]  Agent - Web Interviews
echo   [Cloud]  Agent - Phone Screening
echo   [Tunnel] Cloudflare Tunnel (demo.yalhire.ai)
echo.
echo Architecture:
echo   - Web Interviews: Browser -> Local LiveKit -> Gemini
echo   - Phone Screens: Phone -> SIP -> Cloud LiveKit -> Gemini
echo   - Public Access: demo.yalhire.ai -> Cloudflare -> Local Services
echo.
echo NEXT STEPS:
echo   1. Local: http://127.0.0.1:3001
echo   2. Public: https://demo.yalhire.ai
echo   3. For phone screening, ensure LiveKit SIP trunk has SRTP enabled
echo.
pause
