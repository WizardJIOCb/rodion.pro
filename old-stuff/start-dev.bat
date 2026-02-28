@echo off
echo ========================================
echo Rodion.Pro Development Server Starter
echo ========================================
echo.

REM Change to the project directory
cd /d "%~dp0"

REM Check if required files exist
if not exist "package.json" goto err_root

REM Check if node and npm are available
where node >nul 2>&1
if errorlevel 1 goto err_node

where npm >nul 2>&1
where npx >nul 2>&1
if errorlevel 1 goto err_npm

REM Install dependencies if node_modules doesn't exist
if exist "node_modules\" goto deps_ok
echo Installing dependencies...
call npm install
if errorlevel 1 goto err_install
:deps_ok

REM Install dotenv-cli if not available
npm list -g dotenv-cli >nul 2>&1
if errorlevel 1 (
  echo Installing dotenv-cli globally...
  npm install -g dotenv-cli
)

REM Ensure .env file exists
if exist ".env" goto env_ok
if exist ".env.example" (
  copy /Y ".env.example" ".env" >nul
) else (
  >".env" echo # Development environment
)
:env_ok

REM Check if port 4321 is in use and stop any existing process
netstat -ano | findstr /r /c:":4321 .*LISTENING" >nul
if not errorlevel 1 (
  echo Stopping existing process on port 4321...
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":4321 .*LISTENING"') do (
    taskkill /f /pid %%a 2>nul
  )
)

echo Starting dev server on http://localhost:4321/
echo Environment variables will be loaded from .env file
echo.

REM Start the Astro dev server with dotenv
npx dotenv-cli -- npm run dev

goto end

:err_root
echo ERROR: package.json not found. Run from project root.
pause
exit /b 1

:err_node
echo ERROR: node not found in PATH.
pause
exit /b 1

:err_npm
echo ERROR: npm or npx not found in PATH.
pause
exit /b 1

:err_install
echo ERROR: npm install failed.
pause
exit /b 1

:end
pause