const { getLogData, clearLogData } = require('../services/data')
const {
    getActivityHistory,
    getLogSettings,
    saveLogSettings,
    clearDeviceHistory,
    deleteSessionById,
} = require('../services/activityLog')

function getLogs(req, res, next) {
    let device = req.query.device
    let logs = getLogData()
    let result = logs.find((log) => log.device === device)
    res.json(result)
}

function clearLogs(req, res, next) {
    clearLogData()
    res.end()
}

function getActivityHistoryHandler(req, res) {
    const { deviceId = '', search = '', limit } = req.query || {}
    res.json(getActivityHistory({ deviceId, search, limit }))
}

function getLogSettingsHandler(req, res) {
    res.json(getLogSettings())
}

function saveLogSettingsHandler(req, res) {
    try {
        const result = saveLogSettings(req.body)
        return res.json({ success: true, ...result })
    } catch (err) {
        return res.status(err.statusCode || 400).json({ error: err.message })
    }
}

function clearActivityHistoryHandler(req, res) {
    const sessionId = req.query?.sessionId || req.body?.sessionId
    if (sessionId) {
        const result = deleteSessionById(sessionId)
        return res.json({ success: true, ...result })
    }
    const deviceId = req.query?.deviceId || req.body?.deviceId || ''
    const result = clearDeviceHistory(deviceId)
    return res.json({ success: true, ...result })
}

module.exports = {
    getLogs,
    clearLogs,
    getActivityHistoryHandler,
    getLogSettingsHandler,
    saveLogSettingsHandler,
    clearActivityHistoryHandler,
}
