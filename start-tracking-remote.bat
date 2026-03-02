@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Rodion.Pro - Start Activity Tracking (Remote)
echo ========================================
echo.

REM --- Prerequisites ---
where node >nul 2>&1 || (echo ERROR: node not found in PATH. & pause & exit /b 1)
where npm  >nul 2>&1 || (echo ERROR: npm not found in PATH. & pause & exit /b 1)

REM --- Install deps if needed ---
if not exist "activity-agent\node_modules\" (
  echo Installing activity-agent dependencies...
  pushd activity-agent
  call npm install
  if errorlevel 1 (echo ERROR: npm install failed. & popd & pause & exit /b 1)
  popd
)

REM --- Kill any existing agent ---
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"commandline like '%%activity-agent%%' and commandline like '%%tsx%%'\" -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1


echo Starting activity tracking to production server...
echo Agent will send data to: https://rodion.pro
echo.

REM Launch agent for remote server
start /MIN "rodion-tracking-remote" cmd /c "cd /d "%~dp0activity-agent" & npm start"

echo ========================================
echo   Remote tracking started!
echo   Look for the green tray icon.
echo   Right-click tray icon to stop.
echo ========================================
pause