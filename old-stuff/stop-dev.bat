@echo off
echo ========================================
echo Rodion.Pro Development Server Stopper  
echo ========================================
echo.

REM Change to the project directory
cd /d "%~dp0"

echo Stopping development server processes...
echo.

REM Kill any processes running on port 4321
netstat -ano | findstr /r /c:":4321 .*LISTENING" >nul
if errorlevel 1 (
  echo No process found running on port 4321
) else (
  echo Found process on port 4321, stopping...
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":4321 .*LISTENING"') do (
    taskkill /f /pid %%a 2>nul
    if not errorlevel 1 (
      echo Successfully stopped process %%a
    ) else (
      echo Could not stop process %%a
    )
  )
)

echo.
echo Stopping any remaining node and cmd processes...
tasklist /fi "imagename eq node.exe" 2>nul | find /i "node.exe" >nul
if not errorlevel 1 (
  taskkill /f /im node.exe 2>nul
  echo All node processes stopped
)

tasklist /fi "imagename eq cmd.exe" 2>nul | find /i "start-dev" >nul
if not errorlevel 1 (
  taskkill /f /im cmd.exe 2>nul
  echo All start-dev processes stopped
)

echo.
echo Development server stopped.
echo.
pause