#!/bin/bash

# Exit on error
set -e

echo "==========================================="
echo "       YalOffice Environment Setup"
echo "==========================================="

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed. Please install Homebrew first."
    exit 1
fi

# Install Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    brew install node
else
    echo "✅ Node.js is already installed."
fi

# Install LiveKit Server
if ! command -v livekit-server &> /dev/null; then
    echo "📦 Installing LiveKit Server..."
    brew install livekit
else
    echo "✅ LiveKit Server is already installed."
fi

# Install Cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Installing Cloudflared..."
    brew install cloudflared
else
    echo "✅ Cloudflared is already installed."
fi

# Install Python 3 if missing (should be there on Mac usually, or via brew)
if ! command -v python3 &> /dev/null; then
     echo "📦 Installing Python..."
     brew install python
else
     echo "✅ Python 3 is already installed."
fi


echo "==========================================="
echo "       Installing Dependencies"
echo "==========================================="

echo "🔹 [1/3] Installing Frontend dependencies..."
npm install

echo "🔹 [2/3] Installing Backend dependencies..."
cd backend
npm install
cd ..

echo "🔹 [3/3] Installing Python Agent dependencies..."
cd agent
if [ ! -d "venv" ]; then
    echo "   Creating Python virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "   Installing requirements..."
pip3 install -r requirements.txt
# Install specific dependencies if requirements.txt is missing some or for robustness
pip3 install livekit-agents load_dotenv google-generativeai
cd ..

echo "==========================================="
echo "✅ Setup Complete!"
echo "Run ./start_services.sh to start the application."
echo "==========================================="
