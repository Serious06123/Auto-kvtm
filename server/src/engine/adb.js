const Bluebird = require('bluebird')
const path = require('path')
const { execSync } = require('child_process')
const { runExecAsync, runSpawn } = require('../helper/shell')
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
            execSync(`"${adbBin}" -P ${port} start-server`, { stdio: 'ignore', timeout: 4000 })
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

const adbPath = `"${getAdbPath()}"`

const getDeviceNameById = async (deviceId) => {
    if (!deviceId.includes("emulator")) return deviceId
    try {
        switch (process.platform) {
            case 'darwin':
                const output = await runExecAsync(`${adbPath} -s ${deviceId} emu avd name`)
                return output.match(/([^\r\n]+)/g)[0].replaceAll('_', ' ')
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
        const output = await runExecAsync(`${adbPath} devices`)
        const deviceIds = output
            .substring(output.indexOf('\n') + 1)
            .match(/[\S]+/g)
            ?.filter((text) => !ignoreText.includes(text)) ?? []

        return await Bluebird.map(deviceIds, async (id) => ({
            id: id,
            name: await getDeviceNameById(id),
        }))
    }

    static screenCap = async (deviceId, path) => await runExecAsync(`${adbPath} -s ${deviceId} exec-out screencap -p > ${path}`)

    static screenRecord = (deviceId, outputHandler = null) => {
        const streamProcess = runSpawn(`${adbPath} -s ${deviceId} exec-out screenrecord --output-format=h264 -`)
        streamProcess.stdout.on('data', (data) => {
            outputHandler && outputHandler(data)
        })

        return streamProcess
    }
    static isPackageInstalled = async (deviceId, packageName) => {
        try {
            const output = await runExecAsync(`${adbPath} -s ${deviceId} shell pm list packages ${packageName}`)
            return output.includes(`package:${packageName}`)
        } catch (err) {
            return false
        }
    }
}

module.exports = {
    ADBHelper,
}
