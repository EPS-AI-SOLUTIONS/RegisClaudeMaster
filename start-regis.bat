@echo off
title Regis Matrix Lab
cd /d C:\Users\BIURODOM\Desktop\RegisClaudeMaster

echo ========================================
echo    REGIS MATRIX LAB
echo ========================================
echo.

:: Kill any process on port 3000 to ensure we get that port
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a on port 3000...
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting Vercel dev server...
echo.

:: Open browser after 4 seconds (gives vercel time to start)
start "" /B cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

:: Run vercel dev (keeps window open for logs)
vercel dev --listen 3000
