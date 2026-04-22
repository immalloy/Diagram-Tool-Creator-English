@echo off
REM Relationship Diagram Tool - Local Development Server
REM Serves the site for testing using Python's built-in HTTP server

echo ========================================
echo   Relationship Diagram Tool - Dev Server
echo ========================================
echo.

REM Guard: Fail fast if Python is not available
python --version 2>nul
if errorlevel 1 (
    echo [ERROR] Python not found.
    echo.
    echo Please install Python from https://python.org
    echo Python 3 includes the http.server module needed.
    echo.
    pause
    exit /b 1
)

REM Start server on port 8000 in background
start /b python -m http.server 8000 --directory . >nul 2>&1

REM Brief pause for server startup
timeout /t 1 /nobreak >nul

echo [INFO] Server running at http://localhost:8000
echo [INFO] Serving files from: %CD%
echo.

REM Open default browser
start http://localhost:8000

echo [READY] Browser opened to http://localhost:8000
echo [READY] Press Ctrl+C to stop the server when done.
echo.

REM Keep window open until user presses key
pause