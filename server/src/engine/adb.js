const Bluebird = require('bluebird')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { runExecFileAsync, runSpawnArgs } = require('../helper/shell')
const { logErrMsg } = require('../services/log')

const getAdbPath = () => {
    const platform = process.platform;
    if (platform === 'win32') {
        return path.join(__dirname, '../../../bin/platform-tools/adb.exe')
    } else if (platform === 'darwin') {
        return path.join(__dirname, '../../../bin/platform-tools/adb-mac') // Rename your mac binary to this
    } else {
        return path.join(__dirname, '../../../bin/platform-tools/adb-linux') // Rename your linux binary to this
    }
}

const isValidDeviceId = (deviceId) => {
    return (
        typeof deviceId === 'string' &&
        deviceId.length > 0 &&
        deviceId.length <= 128 &&
        /^[a-zA-Z0-9._:-]+$/.test(deviceId) &&
        !deviceId.startsWith('-')
    )
}

const sanitizeDeviceId = (deviceId) => {
    return String(deviceId || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_')
}

const assertValidDeviceId = (deviceId) => {
    if (!isValidDeviceId(deviceId)) {
        throw new Error(`Invalid deviceId: ${String(deviceId)}`)
    }
}

const parseWmSize = (output) => {
    if (!output || typeof output !== 'string') return null
    const overrideMatch = output.match(/Override size:\s*(\d+)\s*x\s*(\d+)/i)
    const physicalMatch = output.match(/Physical size:\s*(\d+)\s*x\s*(\d+)/i)
    const matched = overrideMatch || physicalMatch
    if (!matched) return null
    const width = Number(matched[1])
    const height = Number(matched[2])
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null
    }
    return { width, height }
}

// Auto detect available ADB port to avoid conflict
const detectAdbPort = () => {
    if (process.env.ANDROID_ADB_SERVER_PORT) {
        console.log(`[ADB] Using pre-configured ADB port: ${process.env.ANDROID_ADB_SERVER_PORT}`)
        return
    }
    const adbBin = getAdbPath()
    const portsToTry = [5037, 5038, 5039, 5040, 5041, 5042, 5043, 5044, 5045]
    for (const port of portsToTry) {
        try {
            // Run a quick check using start-server on the specific port with a timeout
            execFileSync(adbBin, ['-P', String(port), 'start-server'], { stdio: 'ignore', timeout: 4000 })
            process.env.ANDROID_ADB_SERVER_PORT = port.toString()
            console.log(`[ADB] Successfully connected/started ADB daemon on port ${port}`)
            return
        } catch (err) {
            console.log(`[ADB] Port ${port} failed to start-server or in use, trying next...`)
        }
    }
    // Fallback if everything fails
    process.env.ANDROID_ADB_SERVER_PORT = '5037'
    console.log(`[ADB] All probed ports failed, falling back to default port 5037`)
}

detectAdbPort()

const adbBin = getAdbPath()

const getDeviceNameById = async (deviceId) => {
    if (!isValidDeviceId(deviceId) || !deviceId.includes('emulator')) return deviceId
    try {
        switch (process.platform) {
            case 'darwin': {
                const output = await runExecFileAsync(adbBin, ['-s', deviceId, 'emu', 'avd', 'name'])
                return output.match(/([^\r\n]+)/g)[0].replaceAll('_', ' ')
            }
            default:
                return deviceId
        }
    }
    catch (err) {
        logErrMsg(`Error getting device - ${deviceId}: ${err.message}`)
        return deviceId
    }
}

class ADBHelper {
    static getDevices = async () => {
        const ignoreText = ['device', 'offline']
        const output = await runExecFileAsync(adbBin, ['devices'])
        const deviceIds = output
            .substring(output.indexOf('\n') + 1)
            .match(/[\S]+/g)
            ?.filter((text) => !ignoreText.includes(text)) ?? []

        return await Bluebird.map(deviceIds, async (id) => ({
            id: id,
            name: await getDeviceNameById(id),
        }))
    }

    static screenCap = async (deviceId, outputPath) => {
        assertValidDeviceId(deviceId)
        const stdout = await runExecFileAsync(
            adbBin,
            ['-s', deviceId, 'exec-out', 'screencap', '-p'],
            { encoding: 'buffer', maxBuffer: 25 * 1024 * 1024 }
        )
        fs.writeFileSync(outputPath, stdout)
    }

    static screenRecord = (deviceId, outputHandler = null) => {
        assertValidDeviceId(deviceId)
        const streamProcess = runSpawnArgs(adbBin, ['-s', deviceId, 'exec-out', 'screenrecord', '--output-format=h264', '-'])
        streamProcess.stdout.on('data', (data) => {
            outputHandler && outputHandler(data)
        })

        return streamProcess
    }
    static isPackageInstalled = async (deviceId, packageName) => {
        try {
            assertValidDeviceId(deviceId)
            const output = await runExecFileAsync(adbBin, ['-s', deviceId, 'shell', 'pm', 'list', 'packages', String(packageName)])
            return output.includes(`package:${packageName}`)
        } catch (err) {
            return false
        }
    }

    static getScreenSize = async (deviceId) => {
        assertValidDeviceId(deviceId)
        const output = await runExecFileAsync(adbBin, ['-s', deviceId, 'shell', 'wm', 'size'])
        return parseWmSize(output)
    }

    static tapPercent = async (deviceId, xPercent, yPercent) => {
        assertValidDeviceId(deviceId)
        const xNum = Number(xPercent)
        const yNum = Number(yPercent)
        if (!Number.isFinite(xNum) || !Number.isFinite(yNum) || xNum < 0 || xNum > 100 || yNum < 0 || yNum > 100) {
            const err = new Error('Coordinates xPercent and yPercent must be finite numbers in [0, 100]')
            err.statusCode = 400
            throw err
        }
        const size = await ADBHelper.getScreenSize(deviceId)
        if (!size) {
            throw new Error(`Không đọc được kích thước màn hình thiết bị ${deviceId} từ ADB`)
        }
        const pxX = Math.max(0, Math.min(size.width - 1, Math.round((size.width * xNum) / 100)))
        const pxY = Math.max(0, Math.min(size.height - 1, Math.round((size.height * yNum) / 100)))
        await runExecFileAsync(adbBin, ['-s', deviceId, 'shell', 'input', 'tap', String(pxX), String(pxY)])
        return {
            deviceId,
            xPercent: xNum,
            yPercent: yNum,
            pxX,
            pxY,
            width: size.width,
            height: size.height,
        }
    }
}

module.exports = {
    ADBHelper,
    isValidDeviceId,
    sanitizeDeviceId,
    parseWmSize,
}
