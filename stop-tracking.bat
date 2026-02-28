@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Rodion.Pro - Stop Activity Tracking
echo ========================================
echo.

echo Stopping activity tracking...
powershell -NoProfile -Command ^
  "$procs = Get-CimInstance Win32_Process -Filter \"commandline like '%%activity-agent%%'\" -ErrorAction SilentlyContinue; ^
   if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Write-Host '  Agent processes stopped.' } ^
   else { Write-Host '  No activity-agent processes found.' }"

echo.
echo ========================================
echo   Tracking stopped.
echo ========================================
