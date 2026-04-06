@echo off
setlocal
echo ======================================================
echo    Chương trình cài đặt AI OCR cho Auto-KVTM 2.0
echo ======================================================

:: 1. Kiểm tra Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Python tren may ban! 
    echo Hay tai va cai dat Python 3.10 tro len tai: https://www.python.org/
    pause
    exit /b
)

:: 2. Tạo môi trường ảo .venv
echo [1/3] Dang khoi tao moi truong ao .venv...
python -m venv .venv
if %errorlevel% neq 0 (
    echo [LOI] Khong the tao .venv. Kiem tra quyen ghi thu muc!
    pause
    exit /b
)

:: 3. Nâng cấp pip (có thể cần cho các gói nặng)
echo [2/3] Dang cap nhat pip...
.\.venv\Scripts\python.exe -m pip install --upgrade pip

:: 4. Cài đặt các thư viện AI từ requirements.txt
echo [3/3] Dang tai va cai dat AI (EasyOCR, Torch, OpenCV)... 
echo Qua trinh nay co the mat tu 5 - 15 phut tuy vao toc do mang.
.\.venv\Scripts\pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo [LOI] Co loi xay ra trong qua trinh tai AI. 
    pause
    exit /b
)

echo.
echo ======================================================
echo    CAI DAT THANH CONG! May ban da san sang chay 
echo    Auto NANG KHO voi cong nghe AI.
echo ======================================================
pause
