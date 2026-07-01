@echo off
title Lifewood AIGC Suite
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is needed for the FULL experience (including Storyboard Studio's AI).
  echo   Install the LTS version from https://nodejs.org  then double-click this file again.
  echo.
  echo   (No Node? You can still just open  index.html  directly - the dashboard and
  echo    workflow work without it; only Storyboard's AI generation needs this launcher.)
  echo.
  pause
  exit /b
)
echo Stopping any previous Lifewood server on port 8765...
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":8765" ^| findstr "LISTENING"') do taskkill /F /PID %%P >nul 2>&1
echo Starting Lifewood AIGC Suite... a browser tab will open at http://localhost:8765
echo Share the LAN URL shown below with your team for shared data.
node "%~dp0serve.cjs"
pause
