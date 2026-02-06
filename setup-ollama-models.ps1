# YalOffice - Ollama Model Setup Script (PowerShell)
# This script pulls the required Ollama models for YalOffice

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "YalOffice - Ollama Model Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Pull DeepSeek-R1 Distill 7B
Write-Host "📥 Pulling DeepSeek-R1 Distill 7B (for resume parsing & screening)..." -ForegroundColor Yellow
docker exec ollama-deepseek ollama pull deepseek-r1:7b

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ DeepSeek-R1 7B pulled successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to pull DeepSeek-R1 7B" -ForegroundColor Red
    Write-Host "   Make sure the ollama-deepseek container is running:" -ForegroundColor Yellow
    Write-Host "   docker-compose up -d ollama-deepseek" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Pull Gemma 2 9B Instruct
Write-Host "📥 Pulling Gemma 2 9B Instruct (for interviews & conversations)..." -ForegroundColor Yellow
docker exec ollama-gemma ollama pull gemma2:9b-instruct-q8_0

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Gemma 2 9B Instruct pulled successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to pull Gemma 2 9B Instruct" -ForegroundColor Red
    Write-Host "   Make sure the ollama-gemma container is running:" -ForegroundColor Yellow
    Write-Host "   docker-compose up -d ollama-gemma" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ All models pulled successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installed Models:" -ForegroundColor White
Write-Host "  - DeepSeek-R1 7B (Resume parsing, screening)" -ForegroundColor White
Write-Host "  - Gemma 2 9B Instruct (Interviews, conversations)" -ForegroundColor White
Write-Host ""
Write-Host "You can now start using YalOffice with local AI models." -ForegroundColor Green
Write-Host ""
Write-Host "To verify:" -ForegroundColor Yellow
Write-Host "  curl http://localhost:11435/api/tags  # DeepSeek" -ForegroundColor Gray
Write-Host "  curl http://localhost:11436/api/tags  # Gemma" -ForegroundColor Gray
Write-Host ""
