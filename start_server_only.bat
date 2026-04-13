@echo off
REM ============================================================
REM  Doodle Better — Quick start (skip frontend build)
REM  Use this after you've already built the frontend.
REM ============================================================

if not exist "data" mkdir data
.venv\Scripts\python.exe run.py
