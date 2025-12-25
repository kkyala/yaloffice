@echo off
echo ===================================================
echo   YalOffice Service Launcher (Clean Start)
echo ===================================================

echo [1/5] Cleaning up old processes...
taskkill /F /IM livekit-server.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
echo Cleaned up.

echo [2/5] Starting LiveKit Server...
start "LiveKit Server" cmd /k "cd /d d:\Projects\SourceCode\YalOffice\yaloffice\livekit && livekit-server.exe --config livekit-config.yaml"

echo [3/5] Starting Backend Server (Port 8000)...
start "YalOffice Backend" cmd /k "cd /d d:\Projects\SourceCode\YalOffice\yaloffice\backend && npm start"

echo [4/5] Starting Python Agent...
start "LiveKit Python Agent" cmd /k "cd /d d:\Projects\SourceCode\YalOffice\yaloffice\agent && python main.py dev"

echo [5/5] Starting Frontend (Port 3001)...
start "YalOffice Frontend" cmd /k "cd /d d:\Projects\SourceCode\YalOffice\yaloffice && npm run dev"

echo.
echo ✅ All services have been launched cleanly.
echo.
pause
