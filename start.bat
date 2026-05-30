@echo off
echo ========================================
echo   COFFEE PLATFORM - STARTING SERVER
echo ========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate

REM Check if virtual environment is activated
if errorlevel 1 (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    pause
    exit /b 1
)

echo Virtual environment activated!
echo.

REM Check if uploads directories exist
if not exist "uploads\profiles" mkdir uploads\profiles
if not exist "uploads\posts" mkdir uploads\posts
if not exist "uploads\messages" mkdir uploads\messages
if not exist "uploads\events" mkdir uploads\events
if not exist "uploads\payments" mkdir uploads\payments
if not exist "uploads\qrcodes" mkdir uploads\qrcodes

echo Upload directories ready!
echo.

REM Start the application
echo Starting Coffee Platform...
echo Server will be available at: http://localhost:5000
echo.
echo Press CTRL+C to stop the server
echo.

python app.py

pause
