@echo off
rem ------------------------------------------------------------
rem Auto‑deploy script
rem ------------------------------------------------------------

rem 1️⃣ Set PowerShell execution policy for this process
powershell -Command "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force"

rem 2️⃣ Start backend server and LocalTunnel (opens two new windows)
call start_all.bat

rem 3️⃣ Wait for the tunnel to become reachable (max ~1 minute)
set "MAX_RETRIES=12"
set "COUNT=0"
:wait_loop
    timeout /t 5 >nul
    powershell -Command "try { Invoke-WebRequest -Uri 'https://giai-bong-da-doan-phuong-backend.onrender.com/api/v1/health' -UseBasicParsing -Method Head -TimeoutSec 5; exit 0 } catch { exit 1 }"
    if %errorlevel%==0 goto deploy
    set /a COUNT+=1
    if %COUNT% LSS %MAX_RETRIES% goto wait_loop

    echo [ERROR] Tunnel did not become reachable after %MAX_RETRIES% attempts.
    exit /b 1

:deploy
    echo [INFO] Tunnel is up – proceeding with Vercel deployment.
    rem 4️⃣ Deploy to Vercel (assumes Vercel CLI is installed and logged in)
    vercel --prod --confirm
    if %errorlevel% NEQ 0 (
        echo [ERROR] Vercel deployment failed.
        exit /b %errorlevel%
    ) else (
        echo [SUCCESS] Deployment completed successfully.
    )
