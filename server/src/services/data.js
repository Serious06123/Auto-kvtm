const fs = require('fs')
const { resolve } = require('path')

const filePath = {
    log: resolve(__dirname, '../../../data/log.json'),
    device: resolve(__dirname, '../../../data/device.json'),
    game: resolve(__dirname, '../../../data/game.json'),
    auto: resolve(__dirname, '../../../data/auto.json'),
    autoUser: resolve(__dirname, '../../../data/auto_user.json'),
}

function getLogData() {
    return JSON.parse(fs.readFileSync(filePath.log, 'utf8'))
}

function clearLogData() {
    fs.writeFileSync(filePath.log, '[]')
}

function getDeviceData() {
    return JSON.parse(fs.readFileSync(filePath.device, 'utf8'))
}

function getGamesData() {
    return JSON.parse(fs.readFileSync(filePath.game, 'utf8'))
}

function getAutoData() {
    const defaults = JSON.parse(fs.readFileSync(filePath.auto, 'utf8'))
    let userOnly = {}
    if (fs.existsSync(filePath.autoUser)) {
        try {
            userOnly = JSON.parse(fs.readFileSync(filePath.autoUser, 'utf8'))
        } catch (e) {
            userOnly = {}
        }
    }
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
    fs.writeFileSync(filePath.log, JSON.stringify(object))
}

function writeDeviceData(object) {
    fs.writeFileSync(filePath.device, JSON.stringify(object))
}

function writeAutoData(object) {
    let defaults = {}
    if (fs.existsSync(filePath.auto)) {
        defaults = JSON.parse(fs.readFileSync(filePath.auto, 'utf8'))
    }
    const userOnly = {}
    for (const [game, list] of Object.entries(object)) {
        const defaultList = defaults[game] || []
        const defaultKeys = new Set(defaultList.map(x => x.key))
        userOnly[game] = list.filter(item => !defaultKeys.has(item.key))
    }
    fs.writeFileSync(filePath.autoUser, JSON.stringify(userOnly, null, 4))
}

module.exports = {
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
