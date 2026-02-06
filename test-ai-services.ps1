# YalOffice AI Services Test Script
# Tests the new Ollama-based AI architecture

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "YalOffice AI Services Test Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Ollama Services
Write-Host "Test 1: Checking Ollama Services..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  → DeepSeek (Resume Parsing):" -ForegroundColor White
try {
    $deepseek = Invoke-RestMethod -Uri "http://localhost:11435/api/tags" -UseBasicParsing
    if ($deepseek.models -and $deepseek.models.name -contains "deepseek-r1:7b") {
        Write-Host "    ✅ DeepSeek-R1 7B is available" -ForegroundColor Green
    }
    else {
        Write-Host "    ❌ DeepSeek model not found" -ForegroundColor Red
    }
}
catch {
    Write-Host "    ❌ Failed to connect to DeepSeek service" -ForegroundColor Red
}

Write-Host ""
Write-Host "  → Gemma (Interviews):" -ForegroundColor White
try {
    $gemma = Invoke-RestMethod -Uri "http://localhost:11436/api/tags" -UseBasicParsing
    if ($gemma.models -and ($gemma.models.name -contains "gemma2:9b-instruct-q8_0" -or $gemma.models.name -match "gemma2")) {
        Write-Host "    ✅ Gemma 2 9B is available" -ForegroundColor Green
    }
    else {
        Write-Host "    ❌ Gemma model not found" -ForegroundColor Red
    }
}
catch {
    Write-Host "    ❌ Failed to connect to Gemma service" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 2: Check Backend Health
Write-Host "Test 2: Checking Backend Service..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -UseBasicParsing
    Write-Host "  ✅ Backend is healthy" -ForegroundColor Green
    Write-Host "    Status: $($health.status)" -ForegroundColor Gray
    Write-Host "    Timestamp: $($health.timestamp)" -ForegroundColor Gray
}
catch {
    Write-Host "  ❌ Backend is not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 3: Test Resume Screening (using ollamaService)
Write-Host "Test 3: Testing Resume Screening (DeepSeek)..." -ForegroundColor Yellow
Write-Host ""

$resumeText = @"
JOHN DOE - Software Engineer
5 years of experience with React, Node.js, PostgreSQL, and AWS.
Led development of microservices architecture. Strong problem-solving skills.
"@

$jobDescription = @"
Looking for a Senior Full-Stack Developer with expertise in React, Node.js, and cloud technologies.
Must have 3+ years of experience and strong leadership skills.
"@

$screeningRequest = @{
    resumeText     = $resumeText
    jobDescription = $jobDescription
} | ConvertTo-Json

try {
    Write-Host "  → Sending request to /api/ai/resume/screen..." -ForegroundColor White
    $screenResult = Invoke-RestMethod -Uri "http://localhost:8000/api/ai/resume/screen" `
        -Method Post `
        -ContentType "application/json" `
        -Body $screeningRequest `
        -UseBasicParsing
    
    Write-Host "  ✅ Resume screening completed!" -ForegroundColor Green
    Write-Host "    Match Score: $($screenResult.matchScore)%" -ForegroundColor Cyan
    Write-Host "    Summary: $($screenResult.summary)" -ForegroundColor Gray
    
    if ($screenResult.skills -and $screenResult.skills.Count -gt 0) {
        Write-Host "    Skills Matched:" -ForegroundColor Gray
        foreach ($skill in $screenResult.skills | Select-Object -First 3) {
            Write-Host "      - $skill" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "  ❌ Resume screening failed" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "    Details: $($_.ErrorDetails)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 4: Test Text Generation (Simple Gemma test)
Write-Host "Test 4: Testing Interview Question Generation (Gemma)..." -ForegroundColor Yellow
Write-Host ""

$textGenRequest = @{
    prompt      = "Generate one technical interview question for a Senior React Developer position. Keep it brief."
    useDeepSeek = $false
} | ConvertTo-Json

try {
    Write-Host "  → Sending request to /api/ai/generate-text..." -ForegroundColor White
    $textResult = Invoke-RestMethod -Uri "http://localhost:8000/api/ai/generate-text" `
        -Method Post `
        -ContentType "application/json" `
        -Body $textGenRequest `
        -UseBasicParsing `
        -TimeoutSec 30
    
    Write-Host "  ✅ Text generation completed!" -ForegroundColor Green
    Write-Host "    Generated Question:" -ForegroundColor Cyan
    Write-Host "    $($textResult.text)" -ForegroundColor Gray
}
catch {
    Write-Host "  ❌ Text generation failed" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "Test Summary:" -ForegroundColor Cyan
Write-Host "  - Ollama Services: Check logs above" -ForegroundColor White
Write-Host "  - Backend Health: Check logs above" -ForegroundColor White
Write-Host "  - DeepSeek (Resume Screening): Check logs above" -ForegroundColor White
Write-Host "  - Gemma (Text Generation): Check logs above" -ForegroundColor White
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Test suite completed!" -ForegroundColor Green
Write-Host ""
