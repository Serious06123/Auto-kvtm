const { ADBHelper, isValidDeviceId } = require('./engine/adb')
const statusBus = require('./services/statusBus')

function getLiveScreen(ws, req) {
    const deviceId = req.params.id
    if (!isValidDeviceId(deviceId)) {
        ws.close(1008, 'Invalid device ID')
        return
    }
    let chunk = Buffer.from([])

    const streamProcess = ADBHelper.screenRecord(deviceId, (data) => {
        if (isBeginChunk(data)) {
            if (chunk.length > 0) {
                if (ws.readyState == 2 || ws.readyState == 3) {
                    return
                }
                ws.send(chunk, { binary: true }, (error) => {
                    if (error) console.error(error)
                })
            }
            chunk = Buffer.from(data)
        } else {
            chunk = Buffer.concat([chunk, data])
        }
    })

    ws.on('close', () => {
        streamProcess?.stdin?.end()
        streamProcess?.kill()
    })
}

function getStatusStream(ws, req) {
    const safeSend = (payload) => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify(payload), (err) => {
                if (err) console.error(err)
            })
        }
    }

    safeSend({ type: 'snapshot', statuses: statusBus.getAllStatuses() })

    const onStatus = (data) => safeSend({ type: 'status', data })
    const onLog = (data) => safeSend({ type: 'log', data })
    const onRemoved = (data) => safeSend({ type: 'removed', data })

    statusBus.on('status', onStatus)
    statusBus.on('log', onLog)
    statusBus.on('removed', onRemoved)

    const cleanup = () => {
        statusBus.removeListener('status', onStatus)
        statusBus.removeListener('log', onLog)
        statusBus.removeListener('removed', onRemoved)
    }

    ws.on('close', cleanup)
    ws.on('error', cleanup)
}

function isBeginChunk(buffer) {
    if (buffer[0] == 0 && buffer[1] == 0 && buffer[2] == 0 && buffer[3] == 1) return true
    if (buffer[0] == 0 && buffer[1] == 0 && buffer[2] == 1) return true
    return false
}

module.exports = {
    getLiveScreen,
    getStatusStream,
}
