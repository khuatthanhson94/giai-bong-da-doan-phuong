@echo off

echo Installing dependencies for backend and frontend...
call npm run install:all
if %errorlevel% neq 0 (
  echo Installation failed. Exiting.
  exit /b %errorlevel%
)

echo Seeding database...
call npm run seed
if %errorlevel% neq 0 (
  echo Database seed failed. Continuing anyway.
)

echo Starting development environment...
call npm run dev

