const { Router } = require('express')
const router = Router()

const { getSettings, getGameOptions, getListGameOptions } = require('./api/settings')
const { getMetadata, createAuto, readAuto, updateAuto } = require('./api/createAuto')
const { getRunningDevice, viewCurrentScreenDevice } = require('./api/device')
const { startAuto, stopAuto, stopAllAuto } = require('./api/auto')
const { getLogs, clearLogs } = require('./api/logs')
const { handleUpload } = require('./api/upload')

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

// auto api
router.post('/start', startAuto)
router.post('/stop', stopAuto)
router.post('/stopAll', stopAllAuto)
router.get('/autoMetadata', getMetadata)
router.post('/createAuto', createAuto)
router.get('/readAuto', readAuto)
router.post('/updateAuto', updateAuto)

// logs api
router.get('/logs', getLogs)
router.delete('/logs', clearLogs)

// upload api
router.post('/upload', handleUpload)

module.exports = router
