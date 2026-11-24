const { Router } = require('express')
const router = Router()

const { getSettings, getGameOptions, getListGameOptions } = require('./api/settings')
const { getMetadata, createAuto, readAuto, updateAuto } = require('./api/createAuto')
const { getRunningDevice, viewCurrentScreenDevice, tapDevicePoint } = require('./api/device')
const { startAuto, stopAuto, stopAllAuto, pauseAuto, resumeAuto, stopGracefulAuto } = require('./api/auto')
const {
    getLogs,
    clearLogs,
    getActivityHistoryHandler,
    getLogSettingsHandler,
    saveLogSettingsHandler,
    clearActivityHistoryHandler,
} = require('./api/logs')
const { handleUpload } = require('./api/upload')
const { getAiStatus, installAi } = require('./api/ai')
const { getImages, viewImage, updateImage, deleteImage, cropSaveImage, testMatchImage } = require('./api/images')
const { getCustomCategories, addCustomCategory } = require('./api/custom_categories')
const { updateApp } = require('./api/updateApp')
const { getChangelog } = require('./api/changelog')
const { getParams, updateParams, resetParams } = require('./api/params')
const { getHealth } = require('./api/health')
const { getProfilesHandler, saveProfileHandler, deleteProfileHandler } = require('./api/profiles')
const { getNotifyHandler, saveNotifyHandler, testNotifyHandler } = require('./api/notify')
const {
    getSchedulerHandler,
    saveScheduleHandler,
    deleteScheduleHandler,
    savePlaylistHandler,
    deletePlaylistHandler,
    runPlaylistHandler,
} = require('./api/scheduler')
const { getStatsHandler, resetStatsHandler } = require('./api/stats')
const { exportBackup, restoreBackup } = require('./api/backup')
const { getFaqHandler, getFeedbackStatusHandler, submitFeedbackHandler } = require('./api/feedback')

// health api
router.get('/health', getHealth)

// profiles api
router.get('/profiles', getProfilesHandler)
router.post('/profiles', saveProfileHandler)
router.delete('/profiles/:id', deleteProfileHandler)

// notify api
router.get('/notify', getNotifyHandler)
router.put('/notify', saveNotifyHandler)
router.post('/notify/test', testNotifyHandler)

// scheduler & playlist api
router.get('/scheduler', getSchedulerHandler)
router.post('/scheduler/schedules', saveScheduleHandler)
router.delete('/scheduler/schedules/:id', deleteScheduleHandler)
router.post('/scheduler/playlists', savePlaylistHandler)
router.delete('/scheduler/playlists/:id', deletePlaylistHandler)
router.post('/scheduler/playlists/:id/run', runPlaylistHandler)

// stats & backup api
router.get('/stats', getStatsHandler)
router.delete('/stats', resetStatsHandler)
router.get('/backup', exportBackup)
router.post('/restore', restoreBackup)

// params api (tham số tuỳ chỉnh)
router.get('/params', getParams)
router.put('/params', updateParams)
router.delete('/params', resetParams)

// default
router.get('/', function (req, res) {
    res.send('app is running ...')
})

// settings api
router.get('/settings', getSettings)
router.get('/gameOptions', getGameOptions)
router.get('/listGameOptions', getListGameOptions)

// device api
router.get('/runningDevice', getRunningDevice)
router.get('/viewDevice', viewCurrentScreenDevice)
router.post('/device/tap', tapDevicePoint)

// support, faq & feedback api
router.get('/faq', getFaqHandler)
router.get('/feedback/status', getFeedbackStatusHandler)
router.post('/feedback', submitFeedbackHandler)

// auto api
router.post('/start', startAuto)
router.post('/stop', stopAuto)
router.post('/stopAll', stopAllAuto)
router.post('/pause', pauseAuto)
router.post('/resume', resumeAuto)
router.post('/stopGraceful', stopGracefulAuto)
router.get('/autoMetadata', getMetadata)
router.post('/createAuto', createAuto)
router.get('/readAuto', readAuto)
router.post('/updateAuto', updateAuto)

// logs api
router.get('/logs', getLogs)
router.delete('/logs', clearLogs)
router.get('/logs/history', getActivityHistoryHandler)
router.get('/logs/settings', getLogSettingsHandler)
router.put('/logs/settings', saveLogSettingsHandler)
router.delete('/logs/history', clearActivityHistoryHandler)

// upload api
router.post('/upload', handleUpload)

// ai api
router.get('/ai-status', getAiStatus)
router.post('/install-ai', installAi)

// images api
router.get('/images', getImages)
router.get('/viewImage', viewImage)
router.put('/images', updateImage)
router.delete('/images', deleteImage)
router.post('/images/cropSave', cropSaveImage)
router.post('/images/testMatch', testMatchImage)

// custom categories api
router.get('/customCategories', getCustomCategories)
router.post('/customCategories', addCustomCategory)

// update app api
router.post('/updateApp', updateApp)

// changelog api
router.get('/changelog', getChangelog)

module.exports = router
