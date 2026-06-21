@echo off
rem ==== Start Backend Server ==== 
start "" cmd /c "cd /d C:\Users\DELL\giai-bong-da-doan-phuong\server && npm run dev"

rem ==== Start LocalTunnel ==== 
start "" cmd /c "node C:\Users\DELL\giai-bong-da-doan-phuong\scratch\run_tunnel.js"
