# YalOffice - Complete Test Suite
# Run this AFTER restarting your backend server (Ctrl+C then npm run dev)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "YalOffice - Complete Test Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Services
Write-Host "Step 1: Verifying Services..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  → Checking Ollama DeepSeek (port 11435)..." -ForegroundColor White
try {
    $deepseek = Invoke-RestMethod -Uri "http://localhost:11435/api/version" -UseBasicParsing -TimeoutSec 5
    Write-Host "    ✅ DeepSeek: Ollama $($deepseek.version)" -ForegroundColor Green
}
catch {
    Write-Host "    ❌ DeepSeek not accessible" -ForegroundColor Red
    Write-Host "       Make sure Docker container 'ollama-deepseek' is running" -ForegroundColor Red
}

Write-Host "  → Checking Ollama Gemma (port 11436)..." -ForegroundColor White
try {
    $gemma = Invoke-RestMethod -Uri "http://localhost:11436/api/version" -UseBasicParsing -TimeoutSec 5
    Write-Host "    ✅ Gemma: Ollama $($gemma.version)" -ForegroundColor Green
}
catch {
    Write-Host "    ❌ Gemma not accessible" -ForegroundColor Red
    Write-Host "       Make sure Docker container 'ollama-gemma' is running" -ForegroundColor Red
}

Write-Host "  → Checking Backend API (port 8000)..." -ForegroundColor White
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    ✅ Backend: $($health.status)" -ForegroundColor Green
}
catch {
    Write-Host "    ❌ Backend not accessible" -ForegroundColor Red
    Write-Host "       Make sure backend dev server is running (npm run dev)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 2: Test Resume Screening (DeepSeek)
Write-Host "Step 2: Testing Resume Screening (DeepSeek)..." -ForegroundColor Yellow
Write-Host ""

$resumeData = @{
    resumeText     = @"
John Doe
Software Engineer

EXPERIENCE:
Senior Full-Stack Developer at TechCorp (2020-Present)
- Built scalable applications using React and Node.js
- Led team of 5 developers
- Implemented CI/CD pipelines

Software Engineer at StartupXYZ (2018-2020)
- Developed RESTful APIs
- Worked with PostgreSQL and MongoDB

SKILLS:
JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, AWS, Docker

EDUCATION:
BS Computer Science, Stanford University (2018)
"@
    jobDescription = @"
We are looking for a Senior Full-Stack Developer with:
- 3+ years experience with React and Node.js
- Experience leading development teams
- Knowledge of cloud technologies (AWS preferred)
- Strong problem-solving skills
"@
} | ConvertTo-Json

try {
    Write-Host "  → Sending resume to DeepSeek for screening..." -ForegroundColor White
    $screenResult = Invoke-RestMethod -Uri "http://localhost:8000/api/ai/resume/screen" `
        -Method Post `
        -ContentType "application/json" `
        -Body $resumeData `
        -UseBasicParsing `
        -TimeoutSec 90
    
    Write-Host "  ✅ Resume Screening Successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "    Match Score: " -NoNewline -ForegroundColor Cyan
    Write-Host "$($screenResult.matchScore)%" -ForegroundColor White
    
    Write-Host "    Summary: " -ForegroundColor Cyan
    Write-Host "    $($screenResult.summary)" -ForegroundColor Gray
    
    if ($screenResult.skills) {
        Write-Host ""
        Write-Host "    Skills Matched:" -ForegroundColor Cyan
        $screenResult.skills | Select-Object -First 5 | ForEach-Object {
            Write-Host "      • $_" -ForegroundColor Gray
        }
    }
    
    if ($screenResult.experience) {
        Write-Host ""
        Write-Host "    Experience Assessment:" -ForegroundColor Cyan
        Write-Host "    $($screenResult.experience)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "  ⏱️  Response Time: ~2-5 seconds (varies by GPU)" -ForegroundColor Gray
    
}
catch {
    Write-Host "  ❌ Resume Screening Failed" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "    Details: $($_.ErrorDetails)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  Troubleshooting:" -ForegroundColor Yellow
    Write-Host "    1. Make sure you restarted backend server (Ctrl+C, then npm run dev)" -ForegroundColor Gray
    Write-Host "    2. Check backend .env has: RESUME_AI_URL=http://localhost:11435" -ForegroundColor Gray
    Write-Host "    3. Verify DeepSeek model is loaded: docker exec ollama-deepseek ollama list" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 3: Test Interview Question Generation (Gemma)
Write-Host "Step 3: Testing Interview Question Generation (Gemma)..." -ForegroundColor Yellow
Write-Host ""

# Since there's no direct generate-text endpoint, we'll test via screening
$screeningStart = @{
    resumeText = "Software Developer with 3 years React experience"
    jobTitle   = "Senior React Developer"
} | ConvertTo-Json

try {
    Write-Host "  → Starting AI screening conversation..." -ForegroundColor White
    $screeningResult = Invoke-RestMethod -Uri "http://localhost:8000/api/ai/screening/start" `
        -Method Post `
        -ContentType "application/json" `
        -Body $screeningStart `
        -UseBasicParsing `
        -TimeoutSec 60
    
    Write-Host "  ✅ Interview Conversation Started!" -ForegroundColor Green
    Write-Host ""
    Write-Host "    AI Greeting:" -ForegroundColor Cyan
    Write-Host "    $($screeningResult.aiResponse)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  ⏱️  Response Time: ~1-3 seconds (varies by GPU)" -ForegroundColor Gray
    
}
catch {
    Write-Host "  ❌ Interview Generation Failed" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "    Details: $($_.ErrorDetails)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 4: Test Summary
Write-Host "Test Summary:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  System Status:" -ForegroundColor White
Write-Host "    • Ollama Services: Check results above" -ForegroundColor Gray
Write-Host "    • Backend API: Check results above" -ForegroundColor Gray
Write-Host ""
Write-Host "  AI Functionality:" -ForegroundColor White
Write-Host "    • DeepSeek (Resume Screening): Check results above" -ForegroundColor Gray
Write-Host "    • Gemma (Interview Questions): Check results above" -ForegroundColor Gray
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 5: Next Steps
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Frontend Testing:" -ForegroundColor White
Write-Host "     • Open http://localhost:3001" -ForegroundColor Cyan
Write-Host "     • Upload a resume (Word document recommended)" -ForegroundColor Gray
Write-Host "     • Try AI screening interview" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Monitor Performance:" -ForegroundColor White
Write-Host "     • Check GPU usage: nvidia-smi (if NVIDIA GPU)" -ForegroundColor Gray
Write-Host "     • Check Ollama logs: docker logs ollama-deepseek" -ForegroundColor Gray
Write-Host "     • Expected GPU usage: ~20GB VRAM for both models" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Backend Logs:" -ForegroundColor White
Write-Host "     • Watch backend terminal for [OllamaService] logs" -ForegroundColor Gray
Write-Host "     • Look for successful Ollama connections" -ForegroundColor Gray
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Test suite completed!" -ForegroundColor Green
Write-Host ""
Write-Host "If all tests passed:" -ForegroundColor Yellow
Write-Host "  → Your Ollama AI integration is working!" -ForegroundColor Green
Write-Host "  → Resume parsing uses DeepSeek-R1 7B" -ForegroundColor Green
Write-Host "  → Interviews use Gemma 2 9B" -ForegroundColor Green
Write-Host ""
Write-Host "If tests failed:" -ForegroundColor Yellow
Write-Host "  → Restart backend: Ctrl+C in backend terminal, then 'npm run dev'" -ForegroundColor Red
Write-Host "  → Check .env files have correct Ollama URLs" -ForegroundColor Red
Write-Host "  → Verify Docker containers are running: docker ps" -ForegroundColor Red
Write-Host ""
