@echo off
echo ===================================================
echo   YalOffice Service Launcher (127.0.0.1 Optimized)
echo ===================================================

echo [1/7] Cleaning up old processes...
taskkill /F /IM livekit-server.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM cloudflared.exe /T 2>nul
echo Cleaned up.

echo [2/7] Starting Docker Infrastructure...
echo   - Starting Redis (Port 6379)...
docker start yal-redis || docker run --name yal-redis -d -p 6379:6379 redis:alpine
echo   - Starting Ollama DeepSeek (Port 11435)...
docker-compose up -d ollama-deepseek
echo   - Starting Ollama Gemma (Port 11436)...
docker-compose up -d ollama-gemma

echo   Waiting for Docker services to initialize...
timeout /t 5 /nobreak >nul

echo [3/7] Verifying Ollama models are loaded...
echo   Checking DeepSeek model...
docker exec ollama-deepseek ollama list
echo   Checking Gemma model...
docker exec ollama-gemma ollama list

echo.
echo [4/7] Starting LiveKit Server Locally (Port 7880)...
start "LiveKit Server" cmd /k "cd /d %~dp0livekit && livekit-server.exe --config livekit-config.yaml --bind 127.0.0.1"
timeout /t 3 /nobreak >nul

echo [5/7] Starting Backend Server (Port 8000)...
start "YalOffice Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 5 /nobreak >nul

echo [6/7] Starting Frontend Development Server (Port 3001)...
start "YalOffice Frontend" cmd /k "cd /d %~dp0 && npm run build && npm run preview -- --port 3001 --host"
timeout /t 3 /nobreak >nul

echo [7/7] Starting Python Agent (ws://127.0.0.1:7880)...
start "LiveKit Python Agent" cmd /k "cd /d %~dp0agent && set LIVEKIT_URL=ws://127.0.0.1:7880 && python main.py dev"

echo.
echo [8/8] Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "cd /d %~dp0cloudflared && cloudflared.exe --config config_local.yml tunnel run"

echo.
echo ===================================================
echo   All services have been launched!
echo ===================================================
echo.
echo Services running:
echo   [Docker] Ollama DeepSeek (Port: 11435)
echo   [Docker] Ollama Gemma (Port: 11436)
echo   [Local]  LiveKit Server (Port: 7880) - ws://127.0.0.1:7880
echo   [Local]  Backend (Port: 8000)
echo   [Local]  Frontend (http://127.0.0.1:3001)
echo   [Local]  Python Agent
echo.
echo NEXT STEP: Open your browser to http://127.0.0.1:3001
echo.
pause
