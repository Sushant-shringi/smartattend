@echo off
echo ===================================================
echo Starting SmartAttend Vite Frontend...
echo ===================================================

cd /d "%~dp0frontend"
npm run dev -- --host 0.0.0.0

pause
