$testData = @{
    resumeText     = "John Doe - Software Engineer. 5 years experience with React, Node.js, PostgreSQL, AWS. Strong problem-solving skills."
    jobDescription = "Senior Full-Stack Developer needed. React, Node.js, cloud experience required. 3+ years minimum."
} | ConvertTo-Json

Write-Host "Testing Resume Screening..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/ai/resume/screen" `
        -Method Post `
        -ContentType "application/json" `
        -Body $testData `
        -UseBasicParsing `
        -TimeoutSec 60
    
    Write-Host "Success!" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "Failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails
    }
}
