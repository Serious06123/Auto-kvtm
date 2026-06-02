const { exec, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

function updateApp(req, res) {
    const projectRoot = path.resolve(__dirname, '../../../')
    const gitDir = path.resolve(projectRoot, '.git')

    if (fs.existsSync(gitDir)) {
        // --- CASE 1: Git Repository ---
        exec('git pull', { cwd: projectRoot }, (gitError, stdout, stderr) => {
            if (gitError) {
                console.error('Git pull failed:', stderr || gitError.message)
                return res.status(500).json({ error: 'Git pull failed: ' + (stderr || gitError.message) })
            }

            exec('npm run release', { cwd: projectRoot }, (buildError, buildStdout, buildStderr) => {
                if (buildError) {
                    console.error('Webpack build failed:', buildStderr || buildError.message)
                    return res.status(500).json({ error: 'Build failed: ' + (buildStderr || buildError.message) })
                }

                res.json({
                    success: true,
                    message: 'Cập nhật thành công! Vui lòng tải lại trang (nhấn F5) để tải phiên bản mới.'
                })
            })
        })
    } else {
        // --- CASE 2: ZIP Installation (No Git) ---
        try {
            const isWindows = process.platform === 'win32'
            
            if (isWindows) {
                const updateBatPath = path.resolve(projectRoot, 'update.bat')
                
                // Create update.bat script to download, unzip, replace files, compile, and restart
                const batContent = `@echo off
echo Dang dung tool de cho ung dung thoat hoan toan...
timeout /t 3 /nobreak >nul

echo [1/4] Dang tai ban cap nhat moi nhat tu GitHub...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/Serious06123/Auto-kvtm/archive/refs/heads/main.zip' -OutFile 'update.zip'"
if %errorlevel% neq 0 (
    echo [LOI] Khong the tai ban cap nhat. Vui loi kiem tra mang!
    pause
    exit /b 1
)

echo [2/4] Dang giai nen ban cap nhat...
powershell -Command "Expand-Archive -Path 'update.zip' -DestinationPath 'update_temp' -Force"
if %errorlevel% neq 0 (
    echo [LOI] Giai nen that bai!
    pause
    exit /b 1
)

echo [3/4] Dang ghi de cac file he thong...
xcopy /e /y /q "update_temp\\Auto-kvtm-main\\*" "."

echo [!] Xoa file tam...
del /f /q update.zip
rmdir /s /q update_temp

echo [4/4] Dang bien dich ma nguon giao dien (Webpack release)...
call npm run release

echo [!] Khoi dong lai ung dung...
start exec/windows.bat

echo [!] Hoan tat cap nhat!
(goto) 2>nul & del "%~f0"
`
                fs.writeFileSync(updateBatPath, batContent, 'utf8')

                // Spawn the process detached so it survives parent death
                const child = spawn('cmd.exe', ['/c', 'start', 'update.bat'], {
                    cwd: projectRoot,
                    detached: true,
                    stdio: 'ignore'
                })
                child.unref()
            } else {
                // macOS / Linux Update Script
                const updateShPath = path.resolve(projectRoot, 'update.sh')
                const shContent = `#!/bin/bash
echo "Dang dung tool de cho ung dung thoat hoan toan..."
sleep 3

echo "[1/4] Dang tai ban cap nhat moi nhat tu GitHub..."
curl -L -o update.zip 'https://github.com/Serious06123/Auto-kvtm/archive/refs/heads/main.zip' || wget -O update.zip 'https://github.com/Serious06123/Auto-kvtm/archive/refs/heads/main.zip'

if [ ! -f update.zip ]; then
    echo "[LOI] Khong the tai ban cap nhat. Vui loi kiem tra mang!"
    exit 1
fi

echo "[2/4] Dang giai nen ban cap nhat..."
unzip -o update.zip -d update_temp

echo "[3/4] Dang ghi de cac file he thong..."
cp -rf update_temp/Auto-kvtm-main/* .

echo "[!] Xoa file tam..."
rm -f update.zip
rm -rf update_temp

echo "[4/4] Dang bien dich ma nguon giao dien (Webpack)..."
npm run release

echo "[!] Khoi dong lai ung dung..."
if [ "$(uname)" == "Darwin" ]; then
    # macOS: Open new Terminal window
    osascript -e "tell app \\"Terminal\\" to do script \\"cd '$(pwd)' && bash exec/unix.command\\""
else
    # Linux: Try common terminals or run background
    if command -v x-terminal-emulator >/dev/null 2>&1; then
        x-terminal-emulator -e "bash exec/unix.command" &
    elif command -v gnome-terminal >/dev/null 2>&1; then
        gnome-terminal -- bash exec/unix.command &
    else
        bash exec/unix.command &
    fi
fi

echo "[!] Hoan tat cap nhat!"
rm -f "$0"
`
                fs.writeFileSync(updateShPath, shContent, 'utf8')
                fs.chmodSync(updateShPath, '755') // Grant execute permissions

                // Spawn the process detached
                const child = spawn('sh', ['./update.sh'], {
                    cwd: projectRoot,
                    detached: true,
                    stdio: 'ignore'
                })
                child.unref()
            }

            res.json({
                success: true,
                message: 'Phát hiện bản ZIP. Đang tải bản cập nhật và khởi động lại công cụ. Vui lòng đợi trong giây lát...'
            })

            // Exit the process after a brief delay to allow response to send
            setTimeout(() => {
                process.exit(0)
            }, 1000)

        } catch (e) {
            res.status(500).json({ error: 'Failed to initialize ZIP update: ' + e.message })
        }
    }
}

module.exports = {
    updateApp
}
