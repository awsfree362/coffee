@echo off
echo ========================================
echo Coffee Platform - Starting Application
echo ========================================
echo.

echo [1/4] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    pause
    exit /b 1
)

echo [2/4] Checking dependencies...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo [3/4] Testing database connection...
python -c "from database.db import get_db_connection; conn = get_db_connection(); print('Database connected!'); conn.close()"
if errorlevel 1 (
    echo ERROR: Database connection failed!
    echo Please check your .env file configuration.
    pause
    exit /b 1
)

echo [4/4] Starting Flask application...
echo.
echo Application will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
python app.py
