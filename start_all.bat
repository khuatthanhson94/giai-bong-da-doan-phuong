@echo off
rem ==== Ensure no leftover server on port 3004 ====
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3004') do (
    echo Killing PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

rem ==== Start Backend Server ====
start "" cmd /c "cd /d C:\Users\DELL\giai-bong-da-doan-phuong\backend && npm run dev"

rem ==== Start LocalTunnel ====
start "" cmd /c "cd /d C:\Users\DELL\giai-bong-da-doan-phuong && node scratch\run_tunnel.cjs"
