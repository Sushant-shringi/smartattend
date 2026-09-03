@echo off
echo ===================================================
echo Launching SmartAttend Full Stack Environment...
echo ===================================================

start "SmartAttend Backend (Port 8000)" cmd /k "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
start "SmartAttend Frontend (Port 5173)" cmd /k "%~dp0run_frontend.bat"

echo.
echo Both Backend and Frontend services launched in separate windows!
echo Swagger UI Docs: http://localhost:8000/docs
echo Frontend Web App: http://localhost:5173
echo.
pause
