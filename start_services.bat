@echo off
echo ===================================================
echo   YalOffice Service Launcher (Clean Start)
echo ===================================================

echo [1/6] Cleaning up old processes...
taskkill /F /IM livekit-server.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM cloudflared.exe /T 2>nul
echo Cleaned up.

echo [2/6] Starting LiveKit Server...
start "LiveKit Server" cmd /k "cd /d %~dp0livekit && livekit-server.exe --config livekit-config.yaml"

echo [3/6] Starting Backend Server (Port 8000)...
start "YalOffice Backend" cmd /k "cd /d %~dp0backend && npm start"

echo [4/6] Starting Python Agent...
start "LiveKit Python Agent" cmd /k "cd /d %~dp0agent && python main.py dev"

echo [5/6] Starting Frontend (Port 3001)...
start "YalOffice Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo [6/6] Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "cd /d %~dp0cloudflared && cloudflared.exe --config config.yml tunnel run"

echo.
echo ✅ All services (including Cloudflare Tunnel) have been launched cleanly.
echo.
pause
