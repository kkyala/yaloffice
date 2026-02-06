@echo off
echo ===================================================
echo   YalOffice Docker Stack Launcher
echo ===================================================

echo [1/3] Ensuring Port 3001 is free (Frontend)...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq YalOffice Frontend" >nul 2>&1
rem Try to find process listening on 3001
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [2/3] Starting Services (Backend, Frontend-Prod, Tunnel, Agent, LiveKit)...
docker-compose up -d livekit backend agent frontend-prod tunnel

echo.
echo [3/3] Displaying Status...
docker-compose ps

echo.
echo ✅ Services requested to start.
echo    Frontend: http://localhost:3001
echo    Tunnel: https://demo.yalhire.ai (via Cloudflare)
echo.
pause
