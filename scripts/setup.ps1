# First-time setup — Giải Bóng đá Đoàn phường (Windows PowerShell)
# Usage: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$DockerDir = Join-Path $RootDir "docker"
$EnvFile = Join-Path $DockerDir ".env"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Giải Bóng đá Đoàn phường — Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Copy environment file
$EnvExample = Join-Path $DockerDir ".env.docker.example"
if (-not (Test-Path $EnvFile)) {
    Copy-Item $EnvExample $EnvFile
    Write-Host "[OK] Đã tạo docker/.env từ .env.docker.example" -ForegroundColor Green
    Write-Host "[!!] Vui lòng chỉnh sửa docker/.env trước khi chạy production" -ForegroundColor Yellow
} else {
    Write-Host "[--] docker/.env đã tồn tại, bỏ qua" -ForegroundColor Gray
}

# 2. Backend .env
$BackendDir = Join-Path $RootDir "backend"
$BackendEnv = Join-Path $BackendDir ".env"
if ((Test-Path $BackendDir) -and (-not (Test-Path $BackendEnv))) {
    $BackendEnvExample = Join-Path $BackendDir ".env.example"
    if (Test-Path $BackendEnvExample) {
        Copy-Item $BackendEnvExample $BackendEnv
        Write-Host "[OK] Đã tạo backend/.env" -ForegroundColor Green
    }
}

# 3. Frontend .env.local
$FrontendDir = Join-Path $RootDir "frontend"
$FrontendEnv = Join-Path $FrontendDir ".env.local"
if ((Test-Path $FrontendDir) -and (-not (Test-Path $FrontendEnv))) {
    @"
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_APP_NAME=Giải Bóng đá Đoàn phường
"@ | Set-Content -Path $FrontendEnv -Encoding UTF8
    Write-Host "[OK] Đã tạo frontend/.env.local" -ForegroundColor Green
}

# 4. Docker Compose up
$ComposeBase = Join-Path $DockerDir "docker-compose.yml"
$ComposeDev = Join-Path $DockerDir "docker-compose.dev.yml"

Write-Host "[..] Khởi động Docker containers..." -ForegroundColor Yellow
docker compose -f $ComposeBase -f $ComposeDev --env-file $EnvFile up -d --build

# 5. Wait for postgres
Write-Host "[..] Chờ PostgreSQL sẵn sàng..." -ForegroundColor Yellow
$maxRetries = 30
$retry = 0
while ($retry -lt $maxRetries) {
    $result = docker compose -f $ComposeBase -f $ComposeDev exec -T postgres pg_isready -U giai_bong_da 2>&1
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 2
    $retry++
}
if ($retry -ge $maxRetries) {
    Write-Host "[!!] PostgreSQL chưa sẵn sàng sau $maxRetries lần thử" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] PostgreSQL đã sẵn sàng" -ForegroundColor Green

# 6. Laravel setup
$Artisan = Join-Path $BackendDir "artisan"
if ((Test-Path $BackendDir) -and (Test-Path $Artisan)) {
    Write-Host "[..] Cài đặt Laravel backend..." -ForegroundColor Yellow
    docker compose -f $ComposeBase -f $ComposeDev exec -T backend composer install --no-interaction
    docker compose -f $ComposeBase -f $ComposeDev exec -T backend php artisan key:generate --force
    docker compose -f $ComposeBase -f $ComposeDev exec -T backend php artisan migrate --force
    docker compose -f $ComposeBase -f $ComposeDev exec -T backend php artisan db:seed --force
    docker compose -f $ComposeBase -f $ComposeDev exec -T backend php artisan storage:link
    docker compose -f $ComposeBase -f $ComposeDev exec -T backend php artisan config:cache
    docker compose -f $ComposeBase -f $ComposeDev exec -T backend php artisan route:cache
    Write-Host "[OK] Backend đã migrate & seed" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Setup hoàn tất!" -ForegroundColor Green
Write-Host " Website:  http://localhost:8080" -ForegroundColor White
Write-Host " API:      http://localhost:8080/api" -ForegroundColor White
Write-Host " Admin:    http://localhost:8080/admin" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
