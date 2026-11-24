const { getNotifyConfig, saveNotifyConfig, sendAlert } = require('../services/notify')

function getNotifyHandler(req, res) {
    res.json(getNotifyConfig())
}

function saveNotifyHandler(req, res) {
    try {
        const updated = saveNotifyConfig(req.body)
        res.json(updated)
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

async function testNotifyHandler(req, res) {
    const result = await sendAlert('test', {
        deviceId: 'system',
        title: 'Kiểm tra thông báo',
        message: 'Auto-kvtm kết nối thông báo thành công!',
        force: true,
    })
    res.json(result)
}

module.exports = {
    getNotifyHandler,
    saveNotifyHandler,
    testNotifyHandler,
}
