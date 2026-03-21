@echo off
title Activity Desktop
cd /d "%~dp0activity-desktop"

REM ===== DEBUG MODE =====
REM To enable Developer Tools, uncomment the next line:
REM set ACTIVITY_DEVTOOLS=1

call npx electron-forge start 2>nul
pause
