@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo Rodion.Pro Development Server Stopper
echo ========================================
echo.

set PORT=4321
if exist ".dev\port.txt" set /p PORT=<".dev\port.txt"

echo Stopping dev on port %PORT%...
echo.

rem Kill PID that is LISTENING on the port
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do taskkill /F /PID %%P /T >nul 2>&1

del ".dev\port.txt" >nul 2>&1
rmdir ".dev" 2>nul

echo Done.
exit /b 0