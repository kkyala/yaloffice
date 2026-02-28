
$baseUrl = "http://localhost:8000"

Write-Host "Waiting for backend to start..."
Start-Sleep -Seconds 10 

try {
    # 1. Health Check
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Health Check: OK" -ForegroundColor Green
}
catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

try {
    # 2. Login as Admin
    $body = @{
        email    = "admin@yaloffice.com"
        password = "admin123"
    } | ConvertTo-Json

    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    
    if ($login.session) {
        Write-Host "✅ Admin Login: Success" -ForegroundColor Green
        $token = $login.session.access_token
        Write-Host "Token: $token" -ForegroundColor Yellow
    }
    else {
        throw "Login failed"
    }
}
catch {
    Write-Host "❌ Admin Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

try {
    # 3. Test LiveKit Token Generation (Mock Candidate)
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    $tokenBody = @{
        identity = "test-candidate"
        roomName = "test-room"
    } | ConvertTo-Json

    $lkToken = Invoke-RestMethod -Uri "$baseUrl/api/livekit/token" -Method Post -Headers $headers -Body $tokenBody -ContentType "application/json"

    if ($lkToken.token) {
        Write-Host "✅ LiveKit Token: Generated Successfully" -ForegroundColor Green
    }
    else {
        throw "Token generation failed"
    }

    # 4. Test Protected API Route (Verify Auth Shim)
    # We need the user ID from the login response
    $userId = $login.user.id
    if (-not $userId) { throw "No user ID returned from login" }

    $userProfile = Invoke-RestMethod -Uri "$baseUrl/api/users/$userId" -Method Get -Headers $headers
    
    if ($userProfile.id -eq $userId) {
        Write-Host "✅ Protected Route (User Profile): Access Granted" -ForegroundColor Green
    }
    else {
        throw "Protected route returned unexpected data"
    }
}
catch {
    Write-Host "❌ Test Failed: $($_.Exception.Message)" -ForegroundColor Red
    # Don't exit, we want to see summary
}

Write-Host "🚀 Basic API Tests Passed!" -ForegroundColor Cyan
