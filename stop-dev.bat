@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Rodion.Pro - Stop Dev Environment
echo ========================================
echo.

REM --- 1. Stop Astro dev server (port 4321) ---
echo [1/3] Stopping Astro dev server...
set FOUND=0
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr /r /c:":4321 .*LISTENING"') do (
  echo       Killing PID %%P on port 4321
  taskkill /F /PID %%P /T >nul 2>&1
  set FOUND=1
)
if "%FOUND%"=="0" echo       No process found on port 4321.

REM --- 2. Stop Activity Agent ---
echo [2/3] Stopping Activity Agent...
powershell -NoProfile -Command ^
  "$procs = Get-CimInstance Win32_Process -Filter \"commandline like '%%activity-agent%%'\" -ErrorAction SilentlyContinue; ^
   if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Write-Host '       Agent processes stopped.' } ^
   else { Write-Host '       No activity-agent processes found.' }"

REM --- 3. Stop PostgreSQL Docker ---
echo [3/3] Stopping PostgreSQL Docker container...
where docker >nul 2>&1
if errorlevel 1 (
  echo       Docker not found, skipping.
) else (
  docker-compose down 2>nul
  if errorlevel 1 (
    echo       No containers to stop or docker-compose failed.
  ) else (
    echo       PostgreSQL container stopped.
  )
)

echo.
echo ========================================
echo   All services stopped.
echo ========================================
