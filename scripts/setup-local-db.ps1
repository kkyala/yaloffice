
$ErrorActionPreference = "Stop"

Write-Host "Setting up Local PostgreSQL Database..." -ForegroundColor Cyan

# Check for psql
try {
    $psql = Get-Command psql -ErrorAction Stop
    $binaryPath = Split-Path $psql.Source
    Write-Host "Found psql at $($psql.Source)" -ForegroundColor Green
}
catch {
    Write-Host "psql not found in PATH. Checking likely locations..." -ForegroundColor Yellow
    $likelyPaths = @(
        "C:\Program Files\PostgreSQL\17\bin",
        "C:\Program Files\PostgreSQL\16\bin",
        "C:\Program Files\PostgreSQL\15\bin"
    )
    
    $binaryPath = $null
    foreach ($path in $likelyPaths) {
        if (Test-Path "$path\psql.exe") {
            $binaryPath = $path
            break
        }
    }
    
    if ($binaryPath) {
        Write-Host "Found PostgreSQL items at $binaryPath" -ForegroundColor Green
        $env:Path += ";$binaryPath"
    }
    else {
        Write-Error "PostgreSQL not found. Please install it and add 'bin' to your PATH."
        exit 1
    }
}

# Set PG Password if needed (Assuming default 'postgres' user with 'password' or trust)
$env:PGPASSWORD = "password" 
$env:PGUSER = "postgres"

# Fix Collation Mismatch (Common on Windows updates)
Write-Host "Attempting to fix collation version mismatch..." -ForegroundColor Cyan
try {
    & "$binaryPath\psql.exe" -U postgres -d postgres -c "ALTER DATABASE template1 REFRESH COLLATION VERSION;" > $null 2>&1
    & "$binaryPath\psql.exe" -U postgres -d postgres -c "ALTER DATABASE postgres REFRESH COLLATION VERSION;" > $null 2>&1
    Write-Host "Collation version refresh attempted." -ForegroundColor Green
}
catch {
    Write-Warning "Could not refresh collation version. Use manual fix if needed."
}

# Create Database if not exists
Write-Host "Creating database 'yaloffice'..."
try {
    # Check if DB exists
    $exists = & "$binaryPath\psql.exe" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'yaloffice'"
    if ($exists -match "1") {
        Write-Host "Database 'yaloffice' already exists." -ForegroundColor Yellow
    }
    else {
        & "$binaryPath\createdb.exe" -U postgres yaloffice
        Write-Host "Database 'yaloffice' created." -ForegroundColor Green
    }
}
catch {
    Write-Host "Error checking/creating database: $_" -ForegroundColor Red
}

# Run Scripts
$backendDir = "$PSScriptRoot\..\backend"
$scripts = @(
    "$backendDir\migrations\00_init_local_auth.sql",
    "$backendDir\database_setup.sql",
    "$backendDir\migrations\20260214_admin_config.sql",
    "$backendDir\migrations\99_local_seed.sql"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "Running $script..." -ForegroundColor Cyan
        try {
            & "$binaryPath\psql.exe" -U postgres -d yaloffice -f $script
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Success: $script" -ForegroundColor Green
            }
            else {
                Write-Error "Failed to run $script (Exit Code: $LASTEXITCODE)"
            }
        }
        catch {
            Write-Error "Exception running script: $_"
        }
    }
    else {
        Write-Warning "Script not found: $script"
    }
}

Write-Host "Local Database Setup Complete!" -ForegroundColor Green
Write-Host "Connection String: postgresql://postgres:password@localhost:5432/yaloffice" -ForegroundColor Gray
