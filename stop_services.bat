@echo off
echo ===================================================
echo   YalOffice Service Stopper (Kill All)
echo ===================================================

echo [1/4] Killing LiveKit Server...
taskkill /F /IM livekit-server.exe /T 2>nul

echo [2/4] Killing Python Agents...
taskkill /F /IM python.exe /T 2>nul

echo [3/4] Killing Node.js Processes (Backend/Frontend)...
taskkill /F /IM node.exe /T 2>nul

echo [4/4] Killing Cloudflare Tunnel...
taskkill /F /IM cloudflared.exe /T 2>nul

echo.
echo ✅ All services stopped. Window closing in 2 seconds...
timeout /t 2 /nobreak >nul
exit
