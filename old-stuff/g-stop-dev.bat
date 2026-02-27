@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "SILENT=0"
if /i "%1"=="silent" set "SILENT=1"

if %SILENT%==0 (
    echo ========================================
    echo Rodion.Pro Development Server Stopper
    echo ========================================
    echo.
)

set "PORT=4321"
if exist ".dev\port.txt" set /p PORT=<".dev\port.txt"

if %SILENT%==0 (
    echo Stopping dev server on port %PORT%...
    echo.
)

rem === 1. Убиваем сервер по порту ===
set "KILLED=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
    if %SILENT%==0 echo   Killing server process (PID %%P)...
    taskkill /F /PID %%P /T >nul 2>&1
    set "KILLED=1"
)
if %SILENT%==0 (
    if %KILLED%==0 echo   No process was listening on port %PORT%.
)

rem === 2. Закрываем окно по заголовку (самое надёжное) ===
if %SILENT%==0 echo.
if %SILENT%==0 echo Closing dev console window...
taskkill /F /FI "WINDOWTITLE eq Rodion.Pro Dev 4321" /T >nul 2>&1
if %SILENT%==0 (
    if not errorlevel 1 (
        echo   Dev console window closed successfully.
    ) else (
        echo   No dev window found (already closed).
    )
)

rem === 3. Очистка ===
del ".dev\port.txt" >nul 2>&1
rmdir ".dev" 2>nul

if %SILENT%==0 (
    echo.
    echo Rodion.Pro dev server stopped successfully.
    pause
)
exit /b 0