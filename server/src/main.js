require('express-async-errors')
const express = require('express')
const router = require('./router')
const { getLiveScreen, getStatusStream } = require('./websocket')
const { join } = require('path')
const { clearErrMsg, clearInfoMsg, logErrMsg } = require('./services/log')
const { writeDeviceData, writeLogData } = require('./services/data')
const { initScheduler } = require('./api/scheduler')
const { initActivityLogCleanup } = require('./services/activityLog')
const expressWs = require('express-ws')

const app = express()
expressWs(app)
const port = process.env.PORT || 8080
const host = process.env.HOST || '127.0.0.1'

// UI
app.use(express.static(join(__dirname, '../../dist')))
app.use(express.json({ limit: '20mb' }))

// API
app.use('/api', router)

// Web Socket
app.ws('/live/:id', getLiveScreen)
app.ws('/ws/status', getStatusStream)

// Error Handler
app.use((err, req, res, next) => {
    logErrMsg(err.stack || String(err))
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
})

app.listen(port, host, async function () {
    console.log(`Your app running on http://${host}:${port}`)
})

// clear old data
writeDeviceData([])
writeLogData([])

// clear logs when server start
clearErrMsg()
clearInfoMsg()

// start background scheduler
initScheduler()

// mark stale sessions stopped & start activity log cleanup
initActivityLogCleanup()
