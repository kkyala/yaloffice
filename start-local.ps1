
# Master Script to Start All Services Locally (No Docker)
# Ensures separate windows for each service

$Root = $PSScriptRoot

Write-Host "🚀 Starting YalOffice Local Environment..." -ForegroundColor Cyan

# 0. Build Steps (Run synchronously)
Write-Host "🚧 Building Backend & Frontend..." -ForegroundColor Cyan

# Build Backend
Write-Host "   - Building Backend..." -ForegroundColor Green
$backendBuild = Start-Process -FilePath "npm.cmd" -ArgumentList "run build" -WorkingDirectory "$Root\backend" -PassThru -Wait -NoNewWindow
if ($backendBuild.ExitCode -ne 0) {
    Write-Error "Backend build failed! Stopping."
    exit 1
}

# Build Frontend
Write-Host "   - Building Frontend..." -ForegroundColor Green
$frontendBuild = Start-Process -FilePath "npm.cmd" -ArgumentList "run build" -WorkingDirectory "$Root" -PassThru -Wait -NoNewWindow
if ($frontendBuild.ExitCode -ne 0) {
    Write-Error "Frontend build failed! Stopping."
    exit 1
}

Write-Host "✅ Builds completed successfully." -ForegroundColor Cyan


# 1. Start Redis (Optional - Check if installed)
if (Get-Command "redis-server" -ErrorAction SilentlyContinue) {
    Write-Host "Starting Redis..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "redis-server"
}
else {
    Write-Host "⚠️ Redis not found in PATH. Ensure Memurai/Redis is running manually." -ForegroundColor Yellow
}

# 2. Start LiveKit Server
Write-Host "Starting LiveKit Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\scripts'; .\start-livekit.ps1"

# 3. Start Backend
Write-Host "Starting Backend (Node.js)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\backend'; `$env:USE_LOCAL_DB='true'; npm.cmd run dev"

# 4. Start Frontend
Write-Host "Starting Frontend (Vite)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root'; npm.cmd run dev"

# 5. Start Cloudflare Tunnel
Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\cloudflared'; .\cloudflared.exe tunnel run"

# 6. Start AI Agent (Python)
# Requires Python venv or global install
Write-Host "Starting AI Agent..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\agent'; py main.py dev"

Write-Host "✅ All services initiated in separate windows." -ForegroundColor Cyan
Write-Host "👉 Ensure OLLAMA is running in the background ('ollama serve')." -ForegroundColor Yellow
