const path = require('path')
const { readJsonSafe, writeJsonAtomic } = require('./data')

const getActivityLogFile = () =>
    process.env.ACTIVITY_LOG_FILE
        ? path.resolve(process.env.ACTIVITY_LOG_FILE)
        : path.resolve(__dirname, '../../../data/activity_logs.json')

const VALID_MODES = ['on_stop', 'hours', 'days', 'never']
const MAX_ENTRIES_PER_SESSION = 500
const DEFAULT_SETTINGS = {
    retentionMode: 'days',
    retentionValue: 7,
    maxSessionsPerDevice: 50,
}

let cleanupTimer = null

function normalizeSettings(raw) {
    const src = raw && typeof raw === 'object' ? raw : {}
    const mode = VALID_MODES.includes(src.retentionMode) ? src.retentionMode : DEFAULT_SETTINGS.retentionMode
    let val = Number(src.retentionValue)
    if (mode === 'hours') {
        val = !Number.isFinite(val) ? 24 : Math.max(1, Math.min(720, Math.round(val)))
    } else if (mode === 'days') {
        val = !Number.isFinite(val) ? 7 : Math.max(1, Math.min(365, Math.round(val)))
    } else {
        val = !Number.isFinite(val) || val < 1 ? DEFAULT_SETTINGS.retentionValue : Math.round(val)
    }

    const maxPerDeviceRaw = Number(src.maxSessionsPerDevice)
    const maxSessionsPerDevice =
        Number.isFinite(maxPerDeviceRaw) && maxPerDeviceRaw >= 1
            ? Math.min(200, Math.round(maxPerDeviceRaw))
            : DEFAULT_SETTINGS.maxSessionsPerDevice

    return {
        retentionMode: mode,
        retentionValue: val,
        maxSessionsPerDevice,
    }
}

function loadStore() {
    const raw = readJsonSafe(getActivityLogFile(), {})
    const data = raw && typeof raw === 'object' ? raw : {}
    return {
        settings: normalizeSettings(data.settings),
        sessions: Array.isArray(data.sessions) ? data.sessions : [],
    }
}

function saveStore(store) {
    writeJsonAtomic(getActivityLogFile(), store, true)
}

function detectLogLevel(line, explicitLevel) {
    if (explicitLevel === 'error' || explicitLevel === 'warn' || explicitLevel === 'info') {
        return explicitLevel
    }
    const text = String(line || '')
    if (/lỗi|error|thất bại|failed/i.test(text)) return 'error'
    if (/watchdog|tạm dừng|dừng mềm|kẹt|bán hàng/i.test(text)) return 'warn'
    return 'info'
}

function pruneSessionsInMemory(store, nowMs = Date.now()) {
    const { retentionMode, retentionValue, maxSessionsPerDevice } = store.settings
    const beforeCount = store.sessions.length

    let filtered = store.sessions.filter((session) => {
        if (!session) return false
        if (session.status === 'running') return true
        if (retentionMode === 'on_stop') return false
        if (retentionMode === 'never') return true

        const refTime = Number(session.endedAt || session.updatedAt || session.startedAt || 0)
        if (retentionMode === 'hours') {
            return nowMs - refTime <= retentionValue * 3600 * 1000
        }
        if (retentionMode === 'days') {
            return nowMs - refTime <= retentionValue * 86400 * 1000
        }
        return true
    })

    // Enforce maxSessionsPerDevice per device (keep running & newest first)
    const countMap = new Map()
    filtered.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
    filtered = filtered.filter((session) => {
        if (session.status === 'running') return true
        const key = session.deviceId || 'unknown'
        const current = countMap.get(key) || 0
        if (current >= maxSessionsPerDevice) return false
        countMap.set(key, current + 1)
        return true
    })

    store.sessions = filtered
    return Math.max(0, beforeCount - filtered.length)
}

function getLogSettings() {
    return loadStore().settings
}

function saveLogSettings(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        const err = new Error('Dữ liệu cài đặt log không hợp lệ.')
        err.statusCode = 400
        throw err
    }
    if (!VALID_MODES.includes(payload.retentionMode)) {
        const err = new Error('Chế độ tự xóa log phải là: on_stop, hours, days hoặc never.')
        err.statusCode = 400
        throw err
    }
    if (payload.retentionMode === 'hours') {
        const n = Number(payload.retentionValue)
        if (!Number.isFinite(n) || n < 1 || n > 720) {
            const err = new Error('Số giờ tự xóa log phải từ 1 đến 720.')
            err.statusCode = 400
            throw err
        }
    }
    if (payload.retentionMode === 'days') {
        const n = Number(payload.retentionValue)
        if (!Number.isFinite(n) || n < 1 || n > 365) {
            const err = new Error('Số ngày tự xóa log phải từ 1 đến 365.')
            err.statusCode = 400
            throw err
        }
    }

    const store = loadStore()
    store.settings = normalizeSettings({
        ...store.settings,
        ...payload,
    })
    const prunedCount = pruneSessionsInMemory(store, Date.now())
    saveStore(store)
    return {
        settings: store.settings,
        prunedCount,
    }
}

function startSession({ deviceId, game = '', autoName = '' } = {}) {
    if (!deviceId) return null
    const store = loadStore()
    const now = Date.now()
    const session = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        deviceId: String(deviceId),
        game: String(game || ''),
        autoName: String(autoName || ''),
        status: 'running',
        startedAt: now,
        endedAt: null,
        updatedAt: now,
        loopsCompleted: 0,
        entries: [],
    }
    store.sessions.unshift(session)
    pruneSessionsInMemory(store, now)
    saveStore(store)
    return session
}

function findTargetSession(sessions, deviceId, sessionId) {
    if (sessionId) {
        const exact = sessions.find((s) => s.id === sessionId)
        if (exact) return exact
    }
    return sessions.find((s) => s.deviceId === deviceId && s.status === 'running') || null
}

function appendSessionLog(deviceId, text, { sessionId, level } = {}) {
    if (!deviceId || !text) return false
    const lines = String(text)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    if (lines.length === 0) return false

    const store = loadStore()
    const target = findTargetSession(store.sessions, deviceId, sessionId)
    if (!target) return false

    if (!Array.isArray(target.entries)) target.entries = []
    const now = Date.now()
    for (const line of lines) {
        target.entries.push({
            ts: now,
            level: detectLogLevel(line, level),
            message: line,
        })
    }
    if (target.entries.length > MAX_ENTRIES_PER_SESSION) {
        target.entries = target.entries.slice(-MAX_ENTRIES_PER_SESSION)
    }
    target.updatedAt = now
    saveStore(store)
    return true
}

function finishSession(deviceId, { sessionId, status = 'finished', loopsCompleted } = {}) {
    if (!deviceId && !sessionId) return null
    const store = loadStore()
    const target = findTargetSession(store.sessions, deviceId, sessionId)
    if (!target) return null

    const now = Date.now()
    const validStatuses = ['finished', 'stopped', 'error']
    target.status = validStatuses.includes(status) ? status : 'finished'
    target.endedAt = now
    target.updatedAt = now
    if (loopsCompleted !== undefined && Number.isFinite(Number(loopsCompleted))) {
        target.loopsCompleted = Math.max(0, Math.round(Number(loopsCompleted)))
    }

    if (store.settings.retentionMode === 'on_stop') {
        store.sessions = store.sessions.filter((s) => s.id !== target.id)
    } else {
        pruneSessionsInMemory(store, now)
    }
    saveStore(store)
    return target
}

function pruneExpiredLogs(nowMs = Date.now()) {
    const store = loadStore()
    const prunedCount = pruneSessionsInMemory(store, nowMs)
    if (prunedCount > 0) {
        saveStore(store)
    }
    return prunedCount
}

function markStaleRunningSessionsStopped() {
    const store = loadStore()
    const now = Date.now()
    let changed = false
    for (const s of store.sessions) {
        if (s && s.status === 'running') {
            s.status = 'stopped'
            s.endedAt = s.updatedAt || s.startedAt || now
            s.updatedAt = now
            changed = true
        }
    }
    const prunedCount = pruneSessionsInMemory(store, now)
    if (changed || prunedCount > 0) {
        saveStore(store)
    }
    return prunedCount
}

function getActivityHistory({ deviceId = '', search = '', limit = 100 } = {}) {
    const store = loadStore()
    const now = Date.now()
    const prunedCount = pruneSessionsInMemory(store, now)
    if (prunedCount > 0) {
        saveStore(store)
    }

    const devicesSet = new Set()
    for (const s of store.sessions) {
        if (s?.deviceId) devicesSet.add(s.deviceId)
    }
    const devices = Array.from(devicesSet).sort()

    let list = [...store.sessions]
    if (deviceId && deviceId !== 'ALL') {
        list = list.filter((s) => s.deviceId === deviceId)
    }

    const q = String(search || '').trim().toLowerCase()
    if (q) {
        list = list.filter((s) => {
            if ((s.deviceId || '').toLowerCase().includes(q)) return true
            if ((s.autoName || '').toLowerCase().includes(q)) return true
            if ((s.game || '').toLowerCase().includes(q)) return true
            return Array.isArray(s.entries) && s.entries.some((e) => (e.message || '').toLowerCase().includes(q))
        })
    }

    list.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
    const parsedLimit = Number(limit)
    const maxItems = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(500, Math.round(parsedLimit)) : 100

    return {
        settings: store.settings,
        devices,
        sessions: list.slice(0, maxItems),
    }
}

function clearDeviceHistory(deviceId = '') {
    const store = loadStore()
    const before = store.sessions.length
    if (deviceId && deviceId !== 'ALL') {
        store.sessions = store.sessions.filter((s) => s.deviceId !== deviceId)
    } else {
        store.sessions = []
    }
    const cleared = Math.max(0, before - store.sessions.length)
    saveStore(store)
    return {
        cleared,
        remaining: store.sessions.length,
    }
}

function deleteSessionById(sessionId) {
    if (!sessionId) return { deleted: false }
    const store = loadStore()
    const before = store.sessions.length
    store.sessions = store.sessions.filter((s) => s.id !== sessionId)
    const deleted = store.sessions.length < before
    if (deleted) saveStore(store)
    return { deleted }
}

function initActivityLogCleanup() {
    markStaleRunningSessionsStopped()
    if (!cleanupTimer) {
        cleanupTimer = setInterval(() => {
            try {
                pruneExpiredLogs()
            } catch (_) {
                // Ignore background prune errors
            }
        }, 10 * 60 * 1000)
        if (typeof cleanupTimer.unref === 'function') {
            cleanupTimer.unref()
        }
    }
}

module.exports = {
    VALID_MODES,
    MAX_ENTRIES_PER_SESSION,
    getLogSettings,
    saveLogSettings,
    startSession,
    appendSessionLog,
    finishSession,
    pruneExpiredLogs,
    markStaleRunningSessionsStopped,
    getActivityHistory,
    clearDeviceHistory,
    deleteSessionById,
    initActivityLogCleanup,
}
