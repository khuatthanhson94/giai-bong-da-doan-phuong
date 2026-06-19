@echo off

:: Temporarily bypass PowerShell execution policy for this script
powershell -Command "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force"

:: ---- Server ---------------------------------------------------
echo Installing server dependencies...
cd server
npm install
if %errorlevel% neq 0 (
  echo Server npm install failed. Exiting.
  exit /b %errorlevel%
)

echo Running server seed data...
npm run seed
if %errorlevel% neq 0 (
  echo Seed failed. Continuing anyway.
)

:: Set npm to use cmd shell for server
set npm_config_script_shell=cmd
:: Start server in its own cmd window
start "Server" cmd /c "cd server && npm run dev"

:: ---- Client ---------------------------------------------------
cd ..\client
echo Installing client dependencies...
npm install
if %errorlevel% neq 0 (
  echo Client npm install failed. Exiting.
  exit /b %errorlevel%
)

:: Start client in its own PowerShell window with bypass
set npm_config_script_shell=cmd
start "Client" cmd /c "cd client && npm run dev"
