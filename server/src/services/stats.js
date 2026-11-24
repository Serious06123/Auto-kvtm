const { resolve } = require('path')
const { readJsonSafe, writeJsonAtomic } = require('./data')

const getStatsFile = () =>
    process.env.STATS_FILE
        ? resolve(process.env.STATS_FILE)
        : resolve(__dirname, '../../../data/stats.json')

const MAX_DAYS = 30
const MAX_OCR_HISTORY = 100

const getTodayKey = (date = new Date()) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const emptyDay = () => ({
    loopsCompleted: 0,
    bugsCaught: {
        'ong-vang': 0,
        'buom-hong': 0,
        'chuon-chuon': 0,
    },
    restarts: 0,
    recoveries: 0,
    ocrHistory: [],
})

function loadStatsDoc() {
    const doc = readJsonSafe(getStatsFile(), { days: {} })
    if (!doc || typeof doc !== 'object' || typeof doc.days !== 'object') {
        return { days: {} }
    }
    return doc
}

function saveStatsDoc(doc) {
    const keys = Object.keys(doc.days).sort()
    if (keys.length > MAX_DAYS) {
        const dropCount = keys.length - MAX_DAYS
        for (let i = 0; i < dropCount; i++) {
            delete doc.days[keys[i]]
        }
    }
    writeJsonAtomic(getStatsFile(), doc, true)
}

function ensureToday(doc) {
    const key = getTodayKey()
    if (!doc.days[key] || typeof doc.days[key] !== 'object') {
        doc.days[key] = emptyDay()
    }
    if (!doc.days[key].bugsCaught || typeof doc.days[key].bugsCaught !== 'object') {
        doc.days[key].bugsCaught = emptyDay().bugsCaught
    }
    if (!Array.isArray(doc.days[key].ocrHistory)) {
        doc.days[key].ocrHistory = []
    }
    return doc.days[key]
}

function getStats() {
    const doc = loadStatsDoc()
    const todayKey = getTodayKey()
    return {
        todayKey,
        today: doc.days[todayKey] || emptyDay(),
        days: doc.days,
    }
}

function resetStats() {
    const empty = { days: {} }
    writeJsonAtomic(getStatsFile(), empty, true)
    return getStats()
}

function recordLoop(deviceId = '') {
    try {
        const doc = loadStatsDoc()
        const day = ensureToday(doc)
        day.loopsCompleted = (day.loopsCompleted || 0) + 1
        saveStatsDoc(doc)
    } catch (_) {}
}

function recordBugCaught(bugKey, count = 1) {
    try {
        const doc = loadStatsDoc()
        const day = ensureToday(doc)
        const key = String(bugKey || 'other')
        day.bugsCaught[key] = (day.bugsCaught[key] || 0) + (Number(count) || 1)
        saveStatsDoc(doc)
    } catch (_) {}
}

function recordRestart(kind = 'game') {
    try {
        const doc = loadStatsDoc()
        const day = ensureToday(doc)
        if (kind === 'watchdog') {
            day.recoveries = (day.recoveries || 0) + 1
        } else {
            day.restarts = (day.restarts || 0) + 1
        }
        saveStatsDoc(doc)
    } catch (_) {}
}

function recordOcr(deviceId, type, parsedNumbers) {
    try {
        const doc = loadStatsDoc()
        const day = ensureToday(doc)
        day.ocrHistory.push({
            time: new Date().toISOString(),
            deviceId: String(deviceId || 'unknown'),
            kho: String(type || '1'),
            value: String(parsedNumbers || ''),
        })
        if (day.ocrHistory.length > MAX_OCR_HISTORY) {
            day.ocrHistory = day.ocrHistory.slice(-MAX_OCR_HISTORY)
        }
        saveStatsDoc(doc)
    } catch (_) {}
}

module.exports = {
    getTodayKey,
    getStats,
    resetStats,
    recordLoop,
    recordBugCaught,
    recordRestart,
    recordOcr,
}
