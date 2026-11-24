const fs = require('fs')
const { resolve, dirname } = require('path')

const filePath = {
    log: resolve(__dirname, '../../../data/log.json'),
    device: resolve(__dirname, '../../../data/device.json'),
    game: resolve(__dirname, '../../../data/game.json'),
    auto: resolve(__dirname, '../../../data/auto.json'),
    autoUser: resolve(__dirname, '../../../data/auto_user.json'),
}

function readJsonSafe(targetPath, fallback) {
    try {
        if (!fs.existsSync(targetPath)) return fallback
        const raw = fs.readFileSync(targetPath, 'utf8')
        if (!raw || !raw.trim()) return fallback
        return JSON.parse(raw)
    } catch (e) {
        return fallback
    }
}

function writeJsonAtomic(targetPath, data, pretty = false) {
    const dir = dirname(targetPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const content = pretty ? JSON.stringify(data, null, 4) : JSON.stringify(data)
    const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`
    fs.writeFileSync(tmpPath, content, 'utf8')
    try {
        fs.renameSync(tmpPath, targetPath)
    } catch (err) {
        try {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
        } catch (_) {}
        fs.writeFileSync(targetPath, content, 'utf8')
    }
}

function getLogData() {
    return readJsonSafe(filePath.log, [])
}

function clearLogData() {
    writeJsonAtomic(filePath.log, [])
}

function getDeviceData() {
    return readJsonSafe(filePath.device, [])
}

function getGamesData() {
    return readJsonSafe(filePath.game, { listGameOption: [] })
}

function getAutoData() {
    const defaults = readJsonSafe(filePath.auto, {})
    const userOnly = readJsonSafe(filePath.autoUser, {})
    const merged = { ...defaults }
    for (const [game, list] of Object.entries(userOnly)) {
        if (!merged[game]) {
            merged[game] = []
        }
        const defaultKeys = new Set((merged[game] || []).map(x => x.key))
        for (const item of list) {
            if (!defaultKeys.has(item.key)) {
                merged[game].push(item)
            } else {
                const idx = merged[game].findIndex(x => x.key === item.key)
                if (idx !== -1) {
                    merged[game][idx] = item
                }
            }
        }
    }
    return merged
}

function readFileData(path) {
    return fs.readFileSync(path, 'binary')
}

function writeLogData(object) {
    writeJsonAtomic(filePath.log, object)
}

function writeDeviceData(object) {
    writeJsonAtomic(filePath.device, object)
}

function writeAutoData(object) {
    const defaults = readJsonSafe(filePath.auto, {})
    const userOnly = {}
    for (const [game, list] of Object.entries(object || {})) {
        const defaultList = defaults[game] || []
        const defaultMap = new Map(defaultList.map(x => [x.key, x]))
        userOnly[game] = (list || []).filter(item => {
            if (!defaultMap.has(item.key)) return true
            return JSON.stringify(item) !== JSON.stringify(defaultMap.get(item.key))
        })
    }
    writeJsonAtomic(filePath.autoUser, userOnly, true)
}

module.exports = {
    readJsonSafe,
    writeJsonAtomic,
    getLogData,
    clearLogData,
    getDeviceData,
    getGamesData,
    getAutoData,
    readFileData,
    writeLogData,
    writeDeviceData,
    writeAutoData,
}
