@echo off
rem ====================================================
rem WARGAMING UI - Build Script
rem ====================================================

set "VENV_DIR=venv"

rem --- Check top-level shared venv first, then local venv
if exist "..\.venv\Scripts\activate.bat" (
  echo Using shared top-level virtual environment...
  call ..\.venv\Scripts\activate.bat
) else (
  if not exist "%VENV_DIR%" (
    echo Creating virtual environment with Python 3.10...
    py -3.10 -m venv %VENV_DIR%
  )
  call %VENV_DIR%\Scripts\activate.bat
  pip install -r requirements.txt
)

rem --- Build frontend React app first
call npm install
call npm run build

rem --- Stop any running instance of the exe (ignore errors)
taskkill /IM wargaming-ui.exe /F 2>nul || echo No running instance found
rem --- Build the single‑file executable with PyInstaller
pyinstaller --onefile --name wargaming-ui --console ^
    --hidden-import "cryptography" ^
    --hidden-import "reportlab" ^
    --add-data "public\config.json;public" ^
    --add-data "dist;dist" ^
    server.py

rem --- Move the generated exe to final name (already named)
rem No rename needed because we used --name

if errorlevel 1 (
  echo [ERROR] PyInstaller build failed.
  exit /b 1
)

echo.
echo ====================================================
echo Build complete! Executable is located at:
echo %cd%\dist\wargaming-ui.exe
echo ====================================================

rem --- Keep console open for review
pause
