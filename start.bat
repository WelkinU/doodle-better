@echo off
REM ============================================================
REM  Doodle Better — One-step build & run
REM  Builds the React frontend and starts the FastAPI server.
REM ============================================================

echo.
echo  === Doodle Better Build and Run ===
echo.

REM Ensure data directory exists
if not exist "data" mkdir data

REM Build frontend
echo [1/2] Building frontend...
cd frontend
call npm install
call npm run build
cd ..

REM Start server
echo [2/2] Starting server...
.venv\Scripts\python.exe run.py

pause
