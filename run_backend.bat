@echo off
echo ===================================================
echo Starting SmartAttend FastAPI Backend...
echo ===================================================

cd /d "%~dp0backend"

if exist "..\venv\Scripts\activate.bat" (
    call "..\venv\Scripts\activate.bat"
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
)

pause
