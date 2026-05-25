const { spawn } = require('child_process')
const fs = require('fs')
const { resolve } = require('path')

let installStatus = {
    status: 'idle', // 'idle', 'installing', 'success', 'failed'
    logs: [],
}

function isAiInstalled() {
    const rootDir = resolve(__dirname, '../../../')
    const exePath = resolve(rootDir, 'ai_server', 'ocr_server', 'ocr_server.exe')
    const portablePython = resolve(rootDir, 'python_portable', 'python.exe')
    const venvPython = resolve(rootDir, '.venv', 'Scripts', 'python.exe')
    return fs.existsSync(exePath) || fs.existsSync(portablePython) || fs.existsSync(venvPython)
}

function getAiStatus(req, res) {
    let installed = isAiInstalled()
    if (installStatus.status === 'installing') {
        installed = false
    }
    res.json({
        installed,
        status: installStatus.status,
        logs: installStatus.logs,
    })
}

function installAi(req, res) {
    if (installStatus.status === 'installing') {
        return res.status(400).json({ error: 'AI installation is already in progress.' })
    }

    const installed = isAiInstalled()
    if (installed) {
        return res.status(400).json({ error: 'AI is already installed.' })
    }

    installStatus.status = 'installing'
    installStatus.logs = []

    const rootDir = resolve(__dirname, '../../../')
    const batPath = resolve(rootDir, 'setup_ai.bat')

    // Spawn setup_ai.bat --headless
    const child = spawn(batPath, ['--headless'], {
        cwd: rootDir,
        shell: true,
    })

    child.stdout.on('data', (data) => {
        const text = data.toString('utf8')
        console.log(`[AI Install] ${text.trim()}`)
        installStatus.logs.push(text)
    })

    child.stderr.on('data', (data) => {
        const text = data.toString('utf8')
        console.error(`[AI Install Error] ${text.trim()}`)
        installStatus.logs.push(text)
    })

    child.on('close', (code) => {
        if (code === 0) {
            installStatus.status = 'success'
        } else {
            installStatus.status = 'failed'
        }
        console.log(`[AI Install] Finished with exit code: ${code}`)
    })

    res.json({ message: 'Installation started.' })
}

module.exports = {
    getAiStatus,
    installAi,
}
