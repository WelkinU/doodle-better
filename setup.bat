@echo off
REM ============================================================
REM  Doodle Better — Environment Setup
REM  Run this once after cloning to install all dependencies.
REM ============================================================

echo.
echo  === Doodle Better Setup ===
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

pause
