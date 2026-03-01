@echo off
echo ===================================================
echo   YalOffice Docker Stack Launcher
echo ===================================================

echo    echo [ERROR] Port 3001 is already in use. Please stop the application using that port.exe /FI "WINDOWTITLE eq YalOffice Frontend" >nul 2>&1
rem Try to find process listening on 443
for /f "tokens=5" %%a in ('netstat -ano | findstr :3001 > nul^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [2/3] Starting Services (Backend, Frontend-Prod, Tunnel, Agent, LiveKit)...
docker-compose up -d livekit backend agent frontend-prod tunnel

echo.
echo [3/3] Displaying Status...
docker-compose ps

echo.
echo [SUCCESS] Components are starting. Frontend will be at http://localhost:3001
echo    Tunnel: https://demo2.yalhire.ai (via Cloudflare)
echo.
pause
