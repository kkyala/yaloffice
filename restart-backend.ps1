# Restart Backend with New Ollama Configuration

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Restarting Backend Server" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Find and stop existing backend processes by Port 8000
Write-Host "Stopping existing backend server on port 8000..." -ForegroundColor Yellow

# Get PID listening on port 8000
$tcpConnection = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($tcpConnection) {
    echo "Found process ID $($tcpConnection.OwningProcess) listening on port 8000"
    Stop-Process -Id $tcpConnection.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "  Killed process $($tcpConnection.OwningProcess)" -ForegroundColor Green
}
else {
    Write-Host "  No process found listening on port 8000" -ForegroundColor Gray
}

# Also cleanup any stray node processes with 'backend' in command line as backup
$backendProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*backend*" -or 
    $_.CommandLine -like "*backend*"
}
if ($backendProcesses) {
    $backendProcesses | ForEach-Object {
        # Avoid killing self if running via node (unlikely here but safety first)
        if ($_.Id -ne $PID) {
            Write-Host "  Killing stray backend node process $($_.Id)..." -ForegroundColor Gray
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
    }
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
