const { resolve } = require('path')
const { readJsonSafe, writeJsonAtomic } = require('./data')
const { isValidDeviceId } = require('../engine/adb')
const { logErrMsg } = require('./log')

const getSchedulerFile = () =>
    process.env.SCHEDULER_FILE
        ? resolve(process.env.SCHEDULER_FILE)
        : resolve(__dirname, '../../../data/scheduler.json')

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const ALLOWED_ACTIONS = ['startProfile', 'startPlaylist', 'stopAll']

let schedulerTimer = null

const formatHHmm = (date = new Date()) => {
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
}

const formatDateKey = (date = new Date()) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function getSchedulerData() {
    const raw = readJsonSafe(getSchedulerFile(), { schedules: [], playlists: [] })
    return {
        schedules: Array.isArray(raw?.schedules) ? raw.schedules : [],
        playlists: Array.isArray(raw?.playlists) ? raw.playlists : [],
    }
}

function saveSchedulerData(data) {
    writeJsonAtomic(getSchedulerFile(), {
        schedules: Array.isArray(data.schedules) ? data.schedules : [],
        playlists: Array.isArray(data.playlists) ? data.playlists : [],
    }, true)
}

function saveSchedule(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid schedule payload')
    }
    const name = String(payload.name || '').trim()
    if (!name) throw new Error('Schedule name is required')
    const time = String(payload.time || '').trim()
    if (!TIME_REGEX.test(time)) throw new Error('Invalid time format (HH:mm required)')
    const action = String(payload.action || '').trim()
    if (!ALLOWED_ACTIONS.includes(action)) throw new Error('Invalid schedule action')
    const targetId = payload.targetId ? String(payload.targetId).trim() : ''
    if (action !== 'stopAll' && !targetId) {
        throw new Error('targetId is required for startProfile/startPlaylist')
    }

    const data = getSchedulerData()
    const now = new Date().toISOString()
    const id = payload.id ? String(payload.id).trim() : null
    const existingIdx = id ? data.schedules.findIndex((s) => s.id === id) : -1

    const nextItem = {
        id: existingIdx !== -1 ? data.schedules[existingIdx].id : `sch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        time,
        action,
        targetId,
        replaceRunning: payload.replaceRunning !== undefined ? Boolean(payload.replaceRunning) : true,
        enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : true,
        lastTriggeredDate: existingIdx !== -1 ? (data.schedules[existingIdx].lastTriggeredDate || null) : null,
        updatedAt: now,
    }

    if (existingIdx !== -1) {
        data.schedules[existingIdx] = nextItem
    } else {
        data.schedules.push(nextItem)
    }
    saveSchedulerData(data)
    return { schedule: nextItem, ...data }
}

function deleteSchedule(id) {
    const cleanId = String(id || '').trim()
    if (!cleanId) throw new Error('Schedule id is required')
    const data = getSchedulerData()
    data.schedules = data.schedules.filter((s) => s.id !== cleanId)
    saveSchedulerData(data)
    return data
}

function savePlaylist(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid playlist payload')
    }
    const name = String(payload.name || '').trim()
    if (!name) throw new Error('Playlist name is required')
    const rawSteps = Array.isArray(payload.steps) ? payload.steps : []
    const steps = rawSteps
        .filter((st) => st && typeof st === 'object' && String(st.autoKey || '').trim())
        .map((st) => ({
            autoKey: String(st.autoKey).trim(),
            maxLoops: Math.max(0, Math.round(Number(st.maxLoops) || 0)),
            durationMinutes: Math.max(0, Math.round(Number(st.durationMinutes) || 0)),
        }))
    if (steps.length === 0) {
        throw new Error('Playlist must contain at least one valid step')
    }

    const deviceIds = Array.isArray(payload.deviceIds)
        ? Array.from(new Set(payload.deviceIds.filter((d) => isValidDeviceId(d))))
        : []

    const gameOptions = payload.gameOptions && typeof payload.gameOptions === 'object'
        ? { ...payload.gameOptions }
        : {}

    const data = getSchedulerData()
    const now = new Date().toISOString()
    const id = payload.id ? String(payload.id).trim() : null
    const existingIdx = id ? data.playlists.findIndex((p) => p.id === id) : -1

    const nextItem = {
        id: existingIdx !== -1 ? data.playlists[existingIdx].id : `pl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        selectedGame: String(payload.selectedGame || 'sky-garden'),
        deviceIds,
        gameOptions,
        steps,
        updatedAt: now,
    }

    if (existingIdx !== -1) {
        data.playlists[existingIdx] = nextItem
    } else {
        data.playlists.push(nextItem)
    }
    saveSchedulerData(data)
    return { playlist: nextItem, ...data }
}

function deletePlaylist(id) {
    const cleanId = String(id || '').trim()
    if (!cleanId) throw new Error('Playlist id is required')
    const data = getSchedulerData()
    data.playlists = data.playlists.filter((p) => p.id !== cleanId)
    saveSchedulerData(data)
    return data
}

function evaluateDueSchedules(nowDate = new Date(), data = getSchedulerData()) {
    const hhmm = formatHHmm(nowDate)
    const todayKey = formatDateKey(nowDate)
    return (data.schedules || []).filter(
        (s) => s.enabled && s.time === hhmm && s.lastTriggeredDate !== todayKey
    )
}

function startScheduler(executor) {
    if (schedulerTimer) {
        clearInterval(schedulerTimer)
        schedulerTimer = null
    }
    const tick = async () => {
        try {
            const now = new Date()
            const data = getSchedulerData()
            const due = evaluateDueSchedules(now, data)
            if (due.length === 0) return

            const todayKey = formatDateKey(now)
            for (const sch of due) {
                const target = data.schedules.find((s) => s.id === sch.id)
                if (target) target.lastTriggeredDate = todayKey
            }
            saveSchedulerData(data)

            for (const sch of due) {
                try {
                    await executor(sch)
                } catch (err) {
                    logErrMsg(`Scheduler execute error (${sch.name}): ${err.message || err}`)
                }
            }
        } catch (err) {
            logErrMsg(`Scheduler tick error: ${err.message || err}`)
        }
    }

    schedulerTimer = setInterval(tick, 30000)
    if (typeof schedulerTimer.unref === 'function') {
        schedulerTimer.unref()
    }
    return schedulerTimer
}

function stopScheduler() {
    if (schedulerTimer) {
        clearInterval(schedulerTimer)
        schedulerTimer = null
    }
}

module.exports = {
    getSchedulerData,
    saveSchedule,
    deleteSchedule,
    savePlaylist,
    deletePlaylist,
    evaluateDueSchedules,
    startScheduler,
    stopScheduler,
    formatHHmm,
    formatDateKey,
}
