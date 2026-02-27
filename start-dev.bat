@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo Rodion.Pro Development Server Starter
echo ========================================
echo.

if not exist "package.json" goto err_root

where node >nul 2>&1
if errorlevel 1 goto err_node

where npm >nul 2>&1
if errorlevel 1 goto err_npm

if exist "node_modules\" goto deps_ok
echo Installing dependencies...
call npm install
if errorlevel 1 goto err_install
:deps_ok

if exist ".env" goto env_ok
if exist ".env.example" (
  copy /Y ".env.example" ".env" >nul
) else (
  >".env" echo # Development environment
)
:env_ok

if not exist ".dev" mkdir ".dev"
> ".dev\port.txt" echo 4321

rem If port is already in use, try stopping previous dev first
netstat -ano | findstr /r /c:":4321 .*LISTENING" >nul
if not errorlevel 1 call "%~dp0stop-dev-fixed.bat" >nul 2>&1

echo Starting dev in a new window on http://localhost:4321/
echo.

rem IMPORTANT: /c so window closes when dev stops
start "Rodion.Pro Dev 4321" /D "%CD%" cmd /c "cd /d ""%CD%"" & npm run dev"

exit /b 0

:err_root
echo ERROR: package.json not found. Run from project root.
pause
exit /b 1

:err_node
echo ERROR: node not found in PATH.
pause
exit /b 1

:err_npm
echo ERROR: npm not found in PATH.
pause
exit /b 1

:err_install
echo ERROR: npm install failed.
pause
exit /b 1