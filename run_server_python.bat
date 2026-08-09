@echo off
:: Check if we already have admin rights
openfiles >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting administrative privileges...
  powershell -Command "Start-Process -FilePath \"%~dpnx0\" -Verb runAs"
  exit /b
)

title Wargaming Console Flask UI Server
echo ===================================================
echo  Starting Wargaming UI Server via Python Flask...
echo ===================================================
cd /d "%~dp0"

:: Get the absolute path of the root directory
for /f "delims=" %%i in ("%~dp0..") do set "ROOT_DIR=%%~fi"

:: Check for top-level shared virtual environment
if exist "%ROOT_DIR%\.venv\Scripts\activate.bat" (
    set "VENV_TO_ACTIVATE=%ROOT_DIR%\.venv\Scripts\activate.bat"
    echo Activating shared top-level Python virtual environment...
    goto :activate_venv
) else (
    echo [ERROR] Shared virtual environment not found in root folder!
    echo Please run the 'setup_env.bat' script at the root directory first.
    pause
    exit /b 1
)

:activate_venv
call "%VENV_TO_ACTIVATE%"

:: Check if required packages are installed
python -c "import flask, requests, cryptography, reportlab" 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Required Python packages are missing!
    echo Please run 'setup_env.bat' at the root directory to install dependencies.
    pause
    exit /b 1
)

python server.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Server stopped with error code %ERRORLEVEL%
)
pause
