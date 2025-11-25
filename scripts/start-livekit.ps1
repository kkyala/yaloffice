# PowerShell script to download and run LiveKit server

$LIVEKIT_VERSION = "1.5.3"
$LIVEKIT_DIR = "$PSScriptRoot\..\livekit-server"
$LIVEKIT_EXE = "$LIVEKIT_DIR\livekit-server.exe"
$CONFIG_FILE = "$PSScriptRoot\..\livekit.yaml"

# Create directory if not exists
if (-not (Test-Path $LIVEKIT_DIR)) {
    New-Item -ItemType Directory -Path $LIVEKIT_DIR | Out-Null
}

# Download LiveKit if not exists
if (-not (Test-Path $LIVEKIT_EXE)) {
    Write-Host "Downloading LiveKit server v$LIVEKIT_VERSION..."
    $url = "https://github.com/livekit/livekit/releases/download/v$LIVEKIT_VERSION/livekit_${LIVEKIT_VERSION}_windows_amd64.zip"
    $zipFile = "$LIVEKIT_DIR\livekit.zip"

    Invoke-WebRequest -Uri $url -OutFile $zipFile
    Expand-Archive -Path $zipFile -DestinationPath $LIVEKIT_DIR -Force
    Remove-Item $zipFile

    Write-Host "LiveKit server downloaded successfully!"
}

Write-Host ""
Write-Host "Starting LiveKit server..."
Write-Host "URL: ws://localhost:7880"
Write-Host "API Key: devkey"
Write-Host "API Secret: secret"
Write-Host ""

& $LIVEKIT_EXE --config $CONFIG_FILE
