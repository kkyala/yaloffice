# Start All Services for Yāl Office AI Interview Platform
# PowerShell script to launch all services in separate windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Yāl Office AI Interview Platform      " -ForegroundColor Cyan
Write-Host " Starting All Services...              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot

# Check if livekit-server.exe exists
$livekitExe = Join-Path $rootDir "livekit\livekit-server.exe"
if (-not (Test-Path $livekitExe)) {
    Write-Host "❌ LiveKit server not found at: $livekitExe" -ForegroundColor Red
    Write-Host "   Run start-livekit.ps1 first to download it." -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exist
if (-not (Test-Path (Join-Path $rootDir "node_modules"))) {
    Write-Host "⚠️  Frontend dependencies not installed" -ForegroundColor Yellow
    Write-Host "   Installing frontend dependencies..." -ForegroundColor Cyan
    Set-Location $rootDir
    npm install
}

if (-not (Test-Path (Join-Path $rootDir "backend\node_modules"))) {
    Write-Host "⚠️  Backend dependencies not installed" -ForegroundColor Yellow
    Write-Host "   Installing backend dependencies..." -ForegroundColor Cyan
    Set-Location (Join-Path $rootDir "backend")
    npm install
    Set-Location $rootDir
}

# Check if GEMINI_API_KEY is set
$envFile = Join-Path $rootDir "backend\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -notmatch "GEMINI_API_KEY=AIza") {
        Write-Host "⚠️  GEMINI_API_KEY not configured in backend\.env" -ForegroundColor Yellow
        Write-Host "   Please set your Gemini API key before starting." -ForegroundColor Yellow
        Write-Host "   Get it from: https://aistudio.google.com/app/apikey" -ForegroundColor Cyan
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y") {
            exit 1
        }
    }
}

Write-Host ""
Write-Host "✅ Pre-flight checks passed" -ForegroundColor Green
Write-Host ""
Write-Host "Starting services in separate windows..." -ForegroundColor Cyan
Write-Host ""

# 1. Start LiveKit Server
Write-Host "1. Starting LiveKit Server..." -ForegroundColor Green
$livekitConfig = Join-Path $rootDir "livekit\livekit-config.yaml"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; Write-Host '=== LiveKit Server ===' -ForegroundColor Green; .\livekit\livekit-server.exe --config livekit\livekit-config.yaml"

Start-Sleep -Seconds 2

# 2. Start Backend
Write-Host "2. Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; Write-Host '=== Backend Server ===' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 3

# 3. Start Frontend
Write-Host "3. Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; Write-Host '=== Frontend ===' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " All Services Started!                 " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "  Frontend:        http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API:     http://localhost:8000" -ForegroundColor White
Write-Host "  Backend WS:      ws://localhost:8000/ws/gemini-proxy" -ForegroundColor White
Write-Host "  LiveKit RTC:     ws://localhost:7880" -ForegroundColor White
Write-Host "  LiveKit REST:    http://localhost:7881" -ForegroundColor White
Write-Host ""
Write-Host "Health Check:" -ForegroundColor Yellow
Write-Host "  curl http://localhost:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close this window (services will keep running)..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
