
$baseUrl = "http://localhost:8000"

Write-Host "Testing Config API..."

try {
    # 1. Login as Admin
    $body = @{
        email    = "admin@yaloffice.com"
        password = "admin123"
    } | ConvertTo-Json

    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    $token = $login.session.access_token
    Write-Host "Token: $token" -ForegroundColor Yellow
    $headers = @{ "Authorization" = "Bearer $token" }

    Write-Host "✅ Admin Login Success" -ForegroundColor Green

    # 2. Create Config
    $configKey = "test_key_$(Get-Random)"
    $configBody = @{
        key         = $configKey
        value       = "test_value"
        description = "Test Description"
        group       = "test"
        is_secret   = $false
    } | ConvertTo-Json

    $create = Invoke-RestMethod -Uri "$baseUrl/api/config" -Method Post -Body $configBody -Headers $headers -ContentType "application/json"
    
    if ($create.key -eq $configKey) {
        Write-Host "✅ Create Config Success" -ForegroundColor Green
    }
    else {
        throw "Create failed"
    }

    # 3. Read Configs
    $configs = Invoke-RestMethod -Uri "$baseUrl/api/config" -Method Get -Headers $headers
    $found = $configs | Where-Object { $_.key -eq $configKey }

    if ($found) {
        Write-Host "✅ Read Config Success" -ForegroundColor Green
    }
    else {
        throw "Read failed - config not found"
    }

    # 4. Update Config
    $updateBody = @{
        key   = $configKey
        value = "updated_value"
    } | ConvertTo-Json
    
    $update = Invoke-RestMethod -Uri "$baseUrl/api/config" -Method Post -Body $updateBody -Headers $headers -ContentType "application/json"

    if ($update.value -eq "updated_value") {
        Write-Host "✅ Update Config Success" -ForegroundColor Green
    }
    else {
        throw "Update failed"
    }

    # 5. Delete Config
    Invoke-RestMethod -Uri "$baseUrl/api/config/$configKey" -Method Delete -Headers $headers
    
    # Verify deletion
    $configsAfter = Invoke-RestMethod -Uri "$baseUrl/api/config" -Method Get -Headers $headers
    $foundAfter = $configsAfter | Where-Object { $_.key -eq $configKey }
    
    if (-not $foundAfter) {
        Write-Host "✅ Delete Config Success" -ForegroundColor Green
    }
    else {
        throw "Delete failed - config still exists"
    }

}
catch {
    Write-Host "❌ Test Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}
