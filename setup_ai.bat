@echo off
setlocal enabledelayedexpansion

set HEADLESS=false
if "%1"=="--headless" set HEADLESS=true
if "%1"=="--headless-setup" set HEADLESS=true

echo ======================================================
echo    Tu Dong Cai Dat Moi Truong AI Cho Auto-KVTM 2.0
echo ======================================================
echo.

set PYTHON_DIR=%~dp0python_portable
set PYTHON_URL=https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip
set PIP_URL=https://bootstrap.pypa.io/get-pip.py

if exist "%PYTHON_DIR%\python.exe" (
    echo [OK] Da co Python Portable. Bo qua buoc tai ve.
    goto INSTALL_PACKAGES
)

echo [1/3] Dang tai Python Portable...
mkdir "%PYTHON_DIR%" 2>nul
powershell -Command "Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_DIR%\python_embed.zip'"
if %errorlevel% neq 0 (
    echo [LOI] Khong tai duoc Python. Kiem tra ket noi mang!
    if not "%HEADLESS%"=="true" pause
    exit /b 1
)

echo [2/3] Dang giai nen Python...
powershell -Command "Expand-Archive -Path '%PYTHON_DIR%\python_embed.zip' -DestinationPath '%PYTHON_DIR%' -Force"
del "%PYTHON_DIR%\python_embed.zip"

echo Kich hoat pip...
for %%f in ("%PYTHON_DIR%\python*._pth") do (
    echo import site>> "%%f"
)

powershell -Command "Invoke-WebRequest -Uri '%PIP_URL%' -OutFile '%PYTHON_DIR%\get-pip.py'"
"%PYTHON_DIR%\python.exe" "%PYTHON_DIR%\get-pip.py" --no-warn-script-location
del "%PYTHON_DIR%\get-pip.py"

:INSTALL_PACKAGES
echo [3/3] Dang tai thu vien AI (EasyOCR, Flask, OpenCV)...
echo     Qua trinh nay co the mat tu 5-15 phut.
"%PYTHON_DIR%\python.exe" -m pip install flask easyocr opencv-python numpy --no-warn-script-location
"%PYTHON_DIR%\python.exe" -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu --no-warn-script-location

if %errorlevel% neq 0 (
    echo [LOI] Cai dat thu vien AI that bai!
    if not "%HEADLESS%"=="true" pause
    exit /b 1
) else (
    echo [OK] Cai dat hoan tat. San sang su dung!
    if not "%HEADLESS%"=="true" pause
    exit /b 0
)
