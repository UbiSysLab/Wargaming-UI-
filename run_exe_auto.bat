@echo off
:: ---------------------------------------------------
:: Auto‑elevate this script (requires admin)        
:: ---------------------------------------------------

:: Check if we already have admin rights
openfiles >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting administrative privileges...
  powershell -Command "Start-Process -FilePath \"%~dpnx0\" -Verb runAs"
  exit /b
)

:: ---------------------------------------------------
:: Add firewall rule for UDP port 53 (if not already present)
:: ---------------------------------------------------
netsh advfirewall firewall show rule name="Wargaming DNS" >nul 2>&1
if %errorlevel% neq 0 (
  echo Adding firewall rule to allow inbound UDP 53...
  netsh advfirewall firewall add rule name="Wargaming DNS" dir=in action=allow protocol=UDP localport=53 >nul
) else (
  echo Firewall rule "Wargaming DNS" already exists.
)

:: ---------------------------------------------------
:: Launch the generated executable
:: ---------------------------------------------------
cd /d "%~dp0"
set "EXE_PATH=%~dp0dist\wargaming-ui.exe"
if not exist "%EXE_PATH%" (
  echo [ERROR] Executable not found at %EXE_PATH%
  echo Please run build_exe.bat first to build wargaming-ui.exe!
  pause
  exit /b 1
)

echo Starting Wargaming UI server...
"%EXE_PATH%"

pause
