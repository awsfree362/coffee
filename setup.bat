@echo off
echo ========================================
echo Coffee Platform - Complete Setup
echo ========================================
echo.

echo [1/6] Creating virtual environment...
if not exist venv (
    python -m venv venv
    echo Virtual environment created!
) else (
    echo Virtual environment already exists.
)

echo.
echo [2/6] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/6] Installing dependencies...
pip install -r requirements.txt

echo.
echo [4/6] Creating upload directories...
if not exist uploads\profiles mkdir uploads\profiles
if not exist uploads\posts mkdir uploads\posts
if not exist uploads\messages mkdir uploads\messages
if not exist uploads\events mkdir uploads\events
if not exist uploads\payments mkdir uploads\payments
if not exist uploads\qrcodes mkdir uploads\qrcodes
echo Upload directories created!

echo.
echo [5/6] Initializing database...
python init_db.py
if errorlevel 1 (
    echo WARNING: Database initialization failed!
    echo You may need to run this manually.
)

echo.
echo [6/6] Setup complete!
echo.
echo ========================================
echo NEXT STEPS:
echo ========================================
echo 1. Update .env file with your payment gateway keys
echo 2. Run: run.bat
echo 3. Open browser: http://localhost:5000
echo ========================================
echo.
pause
