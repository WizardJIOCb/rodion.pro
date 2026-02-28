@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Rodion.Pro - Start Dev Environment
echo ========================================
echo.

REM --- Prerequisites ---
if not exist "package.json" (
  echo ERROR: package.json not found. Run from project root.
  pause & exit /b 1
)
where node >nul 2>&1 || (echo ERROR: node not found in PATH. & pause & exit /b 1)
where npm  >nul 2>&1 || (echo ERROR: npm not found in PATH. & pause & exit /b 1)

REM --- 1. PostgreSQL via Docker ---
where docker >nul 2>&1
if errorlevel 1 (
  echo [1/5] WARNING: docker not found, skipping PostgreSQL.
) else (
  echo [1/5] Starting PostgreSQL via Docker...
  docker-compose up -d
  if errorlevel 1 (
    echo       WARNING: docker-compose up failed. Is Docker Desktop running?
  ) else (
    echo       Waiting for PostgreSQL to be ready...
    timeout /t 3 /nobreak >nul
  )
)

REM --- 2. Ensure .env ---
echo [2/5] Checking .env file...
if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo       Created .env from .env.example - please review it!
  ) else (
    echo       WARNING: No .env file found.
  )
) else (
  echo       .env exists.
)

REM --- 3. Install dependencies ---
echo [3/5] Checking dependencies...
if not exist "node_modules\" (
  echo       Installing root dependencies...
  call npm install
  if errorlevel 1 (echo ERROR: npm install failed. & pause & exit /b 1)
) else (
  echo       Root node_modules OK.
)
if not exist "activity-agent\node_modules\" (
  echo       Installing activity-agent dependencies...
  pushd activity-agent
  call npm install
  if errorlevel 1 (echo ERROR: activity-agent npm install failed. & popd & pause & exit /b 1)
  popd
) else (
  echo       Activity-agent node_modules OK.
)

REM --- 4. Start Astro dev server ---
echo [4/5] Starting Astro dev server...
REM Kill existing process on port 4321 if any
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr /r /c:":4321 .*LISTENING"') do (
  taskkill /F /PID %%P /T >nul 2>&1
)
start "rodion-dev-astro" cmd /c "title rodion-dev-astro & cd /d "%~dp0" & npm run dev"
echo       Astro starting on http://localhost:4321/

REM --- 5. Start Activity Agent ---
echo [5/5] Starting Activity Agent...
REM Kill existing activity-agent node processes if any
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"commandline like '%%activity-agent%%' and commandline like '%%tsx%%'\" -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
start "rodion-dev-agent" cmd /c "title rodion-dev-agent & cd /d "%~dp0activity-agent" & set "ACTIVITY_SERVER_URL=http://localhost:4321"& npm run dev"
echo       Activity Agent starting (polling every 10s).

echo.
echo ========================================
echo   All services started!
echo.
echo   Astro:    http://localhost:4321/
echo   Postgres: localhost:5432
echo   Agent:    activity-agent (polling)
echo.
echo   Use stop-dev.bat to stop everything.
echo ========================================
