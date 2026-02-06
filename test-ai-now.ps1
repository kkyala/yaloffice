$testData = @{
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

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Testing YalOffice AI with Ollama" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Testing Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8005/health" -UseBasicParsing
    Write-Host "  ✅ Backend: $($health.status)" -ForegroundColor Green
}
catch {
    Write-Host "  ❌ Backend not accessible" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Testing Resume Screening (DeepSeek via Ollama)..." -ForegroundColor Yellow
Write-Host "  → Sending resume for AI analysis..." -ForegroundColor White
try {
    $screenResult = Invoke-RestMethod -Uri "http://localhost:8005/api/ai/resume/screen" `
        -Method Post `
        -ContentType "application/json" `
        -Body $testData `
        -UseBasicParsing `
        -TimeoutSec 90
    
    Write-Host "  ✅ SUCCESS! Resume analyzed by DeepSeek!" -ForegroundColor Green
    Write-Host ""
    Write-Host "    Match Score: " -NoNewline -ForegroundColor Cyan
    Write-Host "$($screenResult.matchScore)%" -ForegroundColor White
    
    Write-Host ""
    Write-Host "    Summary:" -ForegroundColor Cyan
    Write-Host "    $($screenResult.summary)" -ForegroundColor Gray
    
    if ($screenResult.skills) {
        Write-Host ""
        Write-Host "    Skills Matched:" -ForegroundColor Cyan
        $screenResult.skills | Select-Object -First 5 | ForEach-Object {
            Write-Host "      • $_" -ForegroundColor Gray
        }
    }
    
}
catch {
    Write-Host "  ❌ FAILED!" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "    Details: $($_.ErrorDetails)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "✅ Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend is running on: http://localhost:3006" -ForegroundColor Cyan
Write-Host "Backend is running on: http://localhost:8005" -ForegroundColor Cyan
Write-Host ""
