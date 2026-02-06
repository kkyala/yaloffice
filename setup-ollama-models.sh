#!/bin/bash

# YalOffice - Ollama Model Setup Script
# This script pulls the required Ollama models for YalOffice

echo "====================================="
echo "YalOffice - Ollama Model Setup"
echo "====================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Pull DeepSeek-R1 Distill 7B
echo "📥 Pulling DeepSeek-R1 Distill 7B (for resume parsing & screening)..."
docker exec ollama-deepseek ollama pull deepseek-r1:7b

if [ $? -eq 0 ]; then
    echo "✅ DeepSeek-R1 7B pulled successfully"
else
    echo "❌ Failed to pull DeepSeek-R1 7B"
    echo "   Make sure the ollama-deepseek container is running:"
    echo "   docker-compose up -d ollama-deepseek"
    exit 1
fi

echo ""

# Pull Gemma 2 9B Instruct
echo "📥 Pulling Gemma 2 9B Instruct (for interviews & conversations)..."
docker exec ollama-gemma ollama pull gemma2:9b-instruct-q8_0

if [ $? -eq 0 ]; then
    echo "✅ Gemma 2 9B Instruct pulled successfully"
else
    echo "❌ Failed to pull Gemma 2 9B Instruct"
    echo "   Make sure the ollama-gemma container is running:"
    echo "   docker-compose up -d ollama-gemma"
    exit 1
fi

echo ""
echo "====================================="
echo "✅ All models pulled successfully!"
echo "====================================="
echo ""
echo "Installed Models:"
echo "  - DeepSeek-R1 7B (Resume parsing, screening)"
echo "  - Gemma 2 9B Instruct (Interviews, conversations)"
echo ""
echo "You can now start using YalOffice with local AI models."
echo ""
echo "To verify:"
echo "  curl http://localhost:11435/api/tags  # DeepSeek"
echo "  curl http://localhost:11436/api/tags  # Gemma"
echo ""
