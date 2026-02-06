$testData = @{
    resumeText     = @"
John Doe
Software Engineer
Email: john.doe@email.com

EXPERIENCE:
Senior Full-Stack Developer at TechCorp (2020-Present)
- Built scalable React and Node.js applications
- Led team of 5 developers
- Implemented CI/CD pipelines

Software Engineer at StartupXYZ (2018-2020)
- Developed RESTful APIs
- Worked with PostgreSQL and MongoDB

SKILLS:
JavaScript, TypeScript, React, Node.js, PostgreSQL, AWS, Docker

EDUCATION:
BS Computer Science, Stanford University (2018)
"@
    jobDescription = @"
Senior Full-Stack Developer needed.
Requirements: React, Node.js, cloud experience, 3+ years experience.
"@
} | ConvertTo-Json

Write-Host "🎯 Testing YalOffice Ollama AI Integration" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📡 Connecting to backend..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:8005/api/ai/resume/screen" `
        -Method Post `
        -ContentType "application/json" `
        -Body $testData `
        -UseBasicParsing `
        -TimeoutSec 120
    
    Write-Host "✅ SUCCESS! DeepSeek-R1 analyzed the resume!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📊 RESULTS:" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "  Match Score: " -NoNewline -ForegroundColor White
    Write-Host "$($result.data.matchScore)%" -ForegroundColor Cyan -BackgroundColor DarkGreen
    
    Write-Host ""
    Write-Host "  Summary:" -ForegroundColor White
    Write-Host "  $($result.data.summary)" -ForegroundColor Gray
    
    if ($result.data.skills) {
        Write-Host ""
        Write-Host "  Matched Skills:" -ForegroundColor White
        foreach ($skill in $result.data.skills) {
            Write-Host "    ✓ $skill" -ForegroundColor Green
        }
    }
    
    if ($result.data.experience) {
        Write-Host ""
        Write-Host "  Experience Highlights:" -ForegroundColor White
        foreach ($exp in $result.data.experience) {
            Write-Host "    • $exp" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "✅ OLLAMA INTEGRATION WORKING!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your application is now using:" -ForegroundColor White
    Write-Host "  • DeepSeek-R1 7B for resume analysis" -ForegroundColor Cyan
    Write-Host "  • Gemma 2 9B for interviews" -ForegroundColor Cyan
    Write-Host "  • No Google Gemini API costs!" -ForegroundColor Green
    Write-Host ""
    
}
catch {
    Write-Host "❌ FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails)" -ForegroundColor Red
    }
}
