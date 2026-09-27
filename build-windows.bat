@echo off
setlocal
cd /d "%~dp0"

echo [1/3] Creating build environment...
if not exist ".venv\Scripts\python.exe" py -3 -m venv .venv
if errorlevel 1 goto :error

echo [2/3] Installing build tools...
call .venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 goto :error
call .venv\Scripts\python.exe -m pip install -r requirements-build.txt
if errorlevel 1 goto :error

echo [3/3] Building TarkovFieldGuide.exe...
call .venv\Scripts\pyinstaller.exe --noconfirm --clean --onefile --windowed ^
  --name TarkovFieldGuide ^
  --collect-all webview ^
  --add-data "index.html;." ^
  --add-data "styles.css;." ^
  --add-data "app.js;." ^
  launcher.py
if errorlevel 1 goto :error

echo.
echo Build complete: %CD%\dist\TarkovFieldGuide.exe
exit /b 0

:error
echo.
echo Build failed. See the messages above.
exit /b 1
