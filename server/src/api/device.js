const { getDeviceData, readFileData } = require('../services/data')
const { ADBHelper, isValidDeviceId, sanitizeDeviceId } = require('../engine/adb')
const { resolve } = require('path')
const fs = require('fs')

async function getRunningDevice(req, res, next) {
    const dataRaw = getDeviceData()
    const deviceList = await ADBHelper.getDevices()
    const data = await Promise.all(
        dataRaw.map(async (raw) => {
            const matched = deviceList.find((x) => x.id === raw.device)
            const name = matched ? matched.name : `${raw.device} (Offline)`
            return {
                ...raw,
                deviceName: name,
            }
        })
    )
    res.json(data)
}

async function viewCurrentScreenDevice(req, res, next) {
    const deviceId = req.query.device
    if (!deviceId || !isValidDeviceId(deviceId)) {
        return res.status(400).json({ error: 'Invalid or missing device parameter' })
    }
    const screenDir = resolve(__dirname, '../../screen')
    if (!fs.existsSync(screenDir)) {
        fs.mkdirSync(screenDir, { recursive: true })
    }
    const safeDeviceName = sanitizeDeviceId(deviceId)
    const filePath = resolve(screenDir, `${safeDeviceName}.png`)
    await ADBHelper.screenCap(deviceId, filePath)
    const data = readFileData(filePath)

    res.contentType('image/png')
    return res.end(Buffer.from(data, 'binary'))
}

async function tapDevicePoint(req, res) {
    const { deviceId, x, y } = req.body || {}
    if (!deviceId || !isValidDeviceId(deviceId)) {
        return res.status(400).json({ error: 'Invalid or missing deviceId' })
    }
    const xNum = Number(x)
    const yNum = Number(y)
    if (!Number.isFinite(xNum) || !Number.isFinite(yNum) || xNum < 0 || xNum > 100 || yNum < 0 || yNum > 100) {
        return res.status(400).json({ error: 'Coordinates x and y must be finite numbers in [0, 100]' })
    }
    const result = await ADBHelper.tapPercent(deviceId, xNum, yNum)
    return res.json({ success: true, ...result })
}

module.exports = {
    getRunningDevice,
    viewCurrentScreenDevice,
    tapDevicePoint,
}
