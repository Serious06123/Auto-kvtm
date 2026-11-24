const { Runner } = require('../engine/runner')
const { isValidDeviceId } = require('../engine/adb')
const { logErrMsg } = require('../services/log')
const { getDeviceData, getGamesData, getAutoData, writeDeviceData } = require('../services/data')

const runner = new Runner()

const startDevicesInternal = (payload) => {
    if (!payload || !Array.isArray(payload.selectedDevices) || payload.selectedDevices.length === 0 || !payload.selectedGame || !payload.gameOptions) {
        const err = new Error('Invalid startAuto payload')
        err.status = 400
        throw err
    }
    const invalidDevice = payload.selectedDevices.find((d) => !isValidDeviceId(d))
    if (invalidDevice !== undefined) {
        const err = new Error(`Invalid device ID: ${String(invalidDevice)}`)
        err.status = 400
        throw err
    }

    let data = getDeviceData()
    const games = getGamesData()
    const auto = getAutoData()

    const runningSet = new Set(data.map((x) => x.device))
    const devicesToStart = payload.selectedDevices.filter((device) => !runningSet.has(device) && !runner.isRunning(device))
    if (devicesToStart.length === 0) {
        const err = new Error('Selected devices are already running')
        err.status = 409
        throw err
    }

    const gameName = games.listGameOption.find((x) => x.key === payload.selectedGame)?.name || payload.selectedGame
    const runAutoLabel = Array.isArray(payload.playlist) && payload.playlist.length > 0
        ? `Playlist (${payload.playlist.length} bước)`
        : ((auto[payload.selectedGame] || []).find((x) => x.key === payload.gameOptions.runAuto)?.name || payload.gameOptions.runAuto)

    const newData = devicesToStart.map((device) => ({
        device: device,
        game: gameName,
        runAuto: runAutoLabel,
        gameOptions: payload.gameOptions,
    }))
    data = data.concat(newData)
    writeDeviceData(data)
    const { selectedDevices, ...params } = payload

    for (const device of devicesToStart) {
        const deviceParams = { ...params, deviceId: device }
        runner.push(device, deviceParams)
        runner.run(device).catch((err) => logErrMsg(`Runner unhandled error for ${device}: ${err}`))
    }

    return data
}

const stopAllRunningInternal = async (listDevices = null) => {
    let data = getDeviceData()
    const targetList = Array.isArray(listDevices)
        ? listDevices.filter((d) => isValidDeviceId(d))
        : data.map((x) => x.device).filter((d) => isValidDeviceId(d))
    for (const device of targetList) {
        data = data.filter((x) => x.device !== device)
    }
    writeDeviceData(data)
    await runner.killAll(targetList)
    return data
}

const startAuto = async (req, res, next) => {
    try {
        const data = startDevicesInternal(req.body)
        res.json(data)
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message })
    }
}

const stopAuto = async (req, res, next) => {
    const device = req.body?.device
    if (!isValidDeviceId(device)) {
        return res.status(400).json({ error: 'Invalid device ID' })
    }
    let data = getDeviceData()
    data = data.filter((x) => x.device !== device)
    writeDeviceData(data)
    await runner.kill(device)
    res.json(data)
}

const stopAllAuto = async (req, res, next) => {
    const listDevices = req.body?.listDevices
    if (!Array.isArray(listDevices)) {
        return res.status(400).json({ error: 'listDevices must be an array' })
    }
    const data = await stopAllRunningInternal(listDevices)
    res.json(data)
}

const pauseAuto = async (req, res) => {
    const device = req.body?.device
    if (!isValidDeviceId(device)) {
        return res.status(400).json({ error: 'Invalid device ID' })
    }
    const ok = runner.pause(device)
    if (!ok) return res.status(404).json({ error: 'Device is not running' })
    res.json({ success: true })
}

const resumeAuto = async (req, res) => {
    const device = req.body?.device
    if (!isValidDeviceId(device)) {
        return res.status(400).json({ error: 'Invalid device ID' })
    }
    const ok = runner.resume(device)
    if (!ok) return res.status(404).json({ error: 'Device is not running' })
    res.json({ success: true })
}

const stopGracefulAuto = async (req, res) => {
    const device = req.body?.device
    if (!isValidDeviceId(device)) {
        return res.status(400).json({ error: 'Invalid device ID' })
    }
    const ok = runner.stopGraceful(device)
    if (!ok) return res.status(404).json({ error: 'Device is not running' })
    res.json({ success: true })
}

module.exports = {
    startAuto,
    stopAllAuto,
    stopAuto,
    pauseAuto,
    resumeAuto,
    stopGracefulAuto,
    startDevicesInternal,
    stopAllRunningInternal,
}
