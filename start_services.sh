#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    # Kill all background jobs
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Trap Ctrl+C (SIGINT) and termination signal (SIGTERM)
trap cleanup SIGINT SIGTERM

echo "==========================================="
echo "   YalOffice Service Launcher (Mac/Linux)"
echo "==========================================="

# Get absolute path
PROJECT_ROOT="$(pwd)"

echo "🚀 [1/5] Starting LiveKit Server..."
# Check if livekit-server is installed
if command -v livekit-server &> /dev/null; then
    (cd "$PROJECT_ROOT/livekit" && livekit-server --config livekit-config.yaml) &
else
    echo "❌ livekit-server not found in PATH."
    echo "   Running setup_env.sh might fix this."
    exit 1
fi

# Wait a bit for LiveKit to start
sleep 2

echo "🚀 [2/5] Starting Backend Server..."
(cd "$PROJECT_ROOT/backend" && npm run dev) &

# Wait a bit
sleep 2

echo "🚀 [3/5] Starting Python Agent..."
# Use the venv python we just created
(cd "$PROJECT_ROOT/agent" && source venv/bin/activate && python main.py dev) &

echo "🚀 [4/5] Starting Frontend..."
(cd "$PROJECT_ROOT" && npm run dev) &

# echo "🚀 [5/5] Starting Cloudflare Tunnel..."
# if command -v cloudflared &> /dev/null; then
#     (cd "$PROJECT_ROOT/cloudflared" && cloudflared --config config.yml tunnel run) &
# else
#      echo "❌ cloudflared not found. Skipping tunnel."
# fi
echo "ℹ️  [5/5] Cloudflare Tunnel disabled by default (use local:3001)"

echo "==========================================="
echo "✅ All services launched in background."
echo "📝 Check logs above for details."
echo "👉 Press Ctrl+C to stop all services."
echo "==========================================="

# Keep script running to maintain background processes
wait
