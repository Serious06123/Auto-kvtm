@echo off
setlocal ENABLEDELAYEDEXPANSION

call cls
REM set enviroment
for /f %%l in (.env) do (
    set %%l
)

REM Tu dong cau hinh Android SDK tu thu muc bin co san
set "CURRENT_DIR=%~dp0"
for %%i in ("%CURRENT_DIR%..") do set "PROJECT_ROOT=%%~fi"
set "ANDROID_HOME=%PROJECT_ROOT%\bin"
set "PATH=%ANDROID_HOME%\platform-tools;%PATH%"

REM Kiem tra Java he thong
java -version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Da tim thay Java tren he thong.
    goto SDK_CONFIG
)

set "JDK_DIR=%PROJECT_ROOT%\jdk_portable"
if exist "%JDK_DIR%\bin\java.exe" (
    echo [OK] Da co JDK Portable.
    set "JAVA_HOME=%JDK_DIR%"
    set "PATH=%JAVA_HOME%\bin;%PATH%"
    goto SDK_CONFIG
)

echo ======================================================
echo  Dang thiet lap JDK Portable cho Appium...
echo  (Chi tai 1 lan duy nhat de chay gia lap)
echo ======================================================
set "JDK_URL=https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.10_7.zip"

echo [1/2] Dang tai JDK 17 (khoang 120MB)...
mkdir "%JDK_DIR%" 2>nul
powershell -Command "Invoke-WebRequest -Uri '%JDK_URL%' -OutFile '%JDK_DIR%\jdk.zip'"
if %errorlevel% neq 0 (
    echo [LOI] Khong tai duoc JDK. Kiem tra ket noi mang!
    pause
    exit /b 1
)

echo [2/2] Dang giai nen JDK...
powershell -Command "Expand-Archive -Path '%JDK_DIR%\jdk.zip' -DestinationPath '%JDK_DIR%\temp' -Force"
del "%JDK_DIR%\jdk.zip"

REM Di chuyen cac file tu thu muc con ra ngoai jdk_portable
for /d %%d in ("%JDK_DIR%\temp\*") do (
    xcopy /e /y "%%d\*" "%JDK_DIR%\" >nul
)
rmdir /s /q "%JDK_DIR%\temp"

set "JAVA_HOME=%JDK_DIR%"
set "PATH=%JAVA_HOME%\bin;%PATH%"

:SDK_CONFIG



if not !IS_BUILDED!==TRUE (
    call cd ..
    call npm ci
    call npm run release
    call cls
    call cd exec/
    for /f "" %%l in (.env) do (
        if "%%l"=="IS_BUILDED=FALSE" (
            echo IS_BUILDED=TRUE >> .temp
        ) else (
            echo %%l >> .temp
        )
    )
    call type .temp > .env
    call del .temp
    echo "build succeeded"
) else (
    echo "built before"
)

call cd ..
call npm run stop
call npm run clear
call npm run start
call npm run monitor
pause