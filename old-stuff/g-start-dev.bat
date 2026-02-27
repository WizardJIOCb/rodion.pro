@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo Rodion.Pro Development Server Starter
echo ========================================
echo.

if not exist "package.json" goto err_root
where node >nul 2>&1 || goto err_node
where npm  >nul 2>&1 || goto err_npm

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install || goto err_install
)

if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
    ) else (
        >".env" echo # Development environment
    )
)

rem === Создаём метку порта ===
if not exist ".dev" mkdir ".dev"
> ".dev\port.txt" echo 4321

rem === Автоостановка предыдущего сервера (тихо) ===
netstat -ano | findstr /r /c:":4321 .*LISTENING" >nul
if not errorlevel 1 (
    echo Previous dev server detected. Stopping it silently...
    call "%~dp0stop-dev-fixed.bat" silent
)

echo.
echo Starting dev server in NEW window...
echo URL: http://localhost:4321/
echo.

rem Запускаем с уникальным заголовком окна
start "Rodion.Pro Dev 4321" /D "%CD%" cmd /c "cd /d ""%CD%"" & npm run dev"

echo Dev server launched!
pause
exit /b 0

:err_root
echo ERROR: package.json not found. Run from project root.
pause & exit /b 1
:err_node
echo ERROR: node not found in PATH.
pause & exit /b 1
:err_npm
echo ERROR: npm not found in PATH.
pause & exit /b 1
:err_install
echo ERROR: npm install failed.
pause & exit /b 1