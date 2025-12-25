@echo off
echo ===================================================
echo   YalOffice Service Stopper (Kill All)
echo ===================================================

echo [1/3] Killing LiveKit Server...
taskkill /F /IM livekit-server.exe /T

echo [2/3] Killing Python Agents...
taskkill /F /IM python.exe /T

echo [3/3] Killing Node.js Processes (Backend/Frontend)...
taskkill /F /IM node.exe /T

echo.
echo ✅ All services stopped.
pause
