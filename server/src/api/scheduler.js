const {
    getSchedulerData,
    saveSchedule,
    deleteSchedule,
    savePlaylist,
    deletePlaylist,
    startScheduler,
} = require('../services/scheduler')
const { getProfiles } = require('../services/profiles')
const { startDevicesInternal, stopAllRunningInternal } = require('./auto')
const { ADBHelper, isValidDeviceId } = require('../engine/adb')
const { logErrMsg } = require('../services/log')

async function executeSchedule(schedule) {
    if (!schedule) return
    if (schedule.action === 'stopAll') {
        await stopAllRunningInternal()
        return
    }

    const connected = await ADBHelper.getDevices()
    const onlineSet = new Set(connected.map((d) => d.id))

    if (schedule.action === 'startProfile') {
        const profile = getProfiles().find((p) => p.id === schedule.targetId)
        if (!profile) return
        const targetDevices = (profile.deviceIds || []).filter((id) => onlineSet.has(id))
        if (targetDevices.length === 0) return

        if (schedule.replaceRunning) {
            await stopAllRunningInternal(targetDevices)
        }
        const opts = {
            ...(profile.gameOptions || {}),
            runAuto: profile.selectedAuto || profile.gameOptions?.runAuto,
        }
        if (profile.speedMultiplierOverride >= 1) {
            opts.speedMultiplierOverride = profile.speedMultiplierOverride
        }
        startDevicesInternal({
            selectedDevices: targetDevices,
            selectedGame: profile.selectedGame || 'sky-garden',
            gameOptions: opts,
        })
        return
    }

    if (schedule.action === 'startPlaylist') {
        const { playlists } = getSchedulerData()
        const playlist = playlists.find((p) => p.id === schedule.targetId)
        if (!playlist) return
        const targetDevices = (playlist.deviceIds || []).filter((id) => onlineSet.has(id))
        if (targetDevices.length === 0) return

        if (schedule.replaceRunning) {
            await stopAllRunningInternal(targetDevices)
        }
        startDevicesInternal({
            selectedDevices: targetDevices,
            selectedGame: playlist.selectedGame || 'sky-garden',
            gameOptions: {
                frequency: 9999,
                quantity: 9999,
                openGame: true,
                openChests: true,
                sellItems: true,
                ...(playlist.gameOptions || {}),
                runAuto: playlist.steps[0]?.autoKey || '',
            },
            playlist: playlist.steps,
        })
    }
}

function initScheduler() {
    startScheduler((sch) =>
        executeSchedule(sch).catch((err) => logErrMsg(`Scheduler action failed (${sch.name}): ${err.message}`))
    )
}

function getSchedulerHandler(req, res) {
    res.json(getSchedulerData())
}

function saveScheduleHandler(req, res) {
    try {
        res.json(saveSchedule(req.body))
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

function deleteScheduleHandler(req, res) {
    try {
        res.json(deleteSchedule(req.params.id))
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

function savePlaylistHandler(req, res) {
    try {
        res.json(savePlaylist(req.body))
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

function deletePlaylistHandler(req, res) {
    try {
        res.json(deletePlaylist(req.params.id))
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

function runPlaylistHandler(req, res) {
    try {
        const { playlists } = getSchedulerData()
        const playlist = playlists.find((p) => p.id === req.params.id)
        if (!playlist) return res.status(404).json({ error: 'Playlist not found' })

        const requestedDevices = Array.isArray(req.body?.deviceIds) && req.body.deviceIds.length > 0
            ? req.body.deviceIds.filter((d) => isValidDeviceId(d))
            : playlist.deviceIds

        if (!requestedDevices || requestedDevices.length === 0) {
            return res.status(400).json({ error: 'No target devices selected for playlist' })
        }

        const data = startDevicesInternal({
            selectedDevices: requestedDevices,
            selectedGame: playlist.selectedGame || 'sky-garden',
            gameOptions: {
                frequency: 9999,
                quantity: 9999,
                openGame: true,
                openChests: true,
                sellItems: true,
                ...(playlist.gameOptions || {}),
                runAuto: playlist.steps[0]?.autoKey || '',
            },
            playlist: playlist.steps,
        })
        res.json({ success: true, data })
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message })
    }
}

module.exports = {
    initScheduler,
    executeSchedule,
    getSchedulerHandler,
    saveScheduleHandler,
    deleteScheduleHandler,
    savePlaylistHandler,
    deletePlaylistHandler,
    runPlaylistHandler,
}
