# Restart Backend with New Ollama Configuration

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Restarting Backend Server" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Find and stop existing backend processes
Write-Host "Stopping existing backend server..." -ForegroundColor Yellow
$backendProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*backend*" -or 
    $_.CommandLine -like "*backend*"
}

if ($backendProcesses) {
    $backendProcesses | ForEach-Object {
        Write-Host "  Killing process $($_.Id)..." -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  Old backend stopped" -ForegroundColor Green
}
else {
    Write-Host "  No existing backend process found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Starting backend server with new Ollama configuration..." -ForegroundColor Yellow
Write-Host ""

# Start new backend
Set-Location backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory (Get-Location)

Write-Host "✅ Backend server starting in new window..." -ForegroundColor Green
Write-Host ""
Write-Host "Wait 10 seconds for backend to initialize, then test:" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File ..\quick-test.ps1" -ForegroundColor Cyan
Write-Host ""
