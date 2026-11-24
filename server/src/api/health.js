const http = require('http')
const { ADBHelper } = require('../engine/adb')
const { getDeviceData } = require('../services/data')
const { getTemplateCacheStats } = require('../engine/image')

const httpPing = (url, timeoutMs = 1200) =>
    new Promise((resolve) => {
        const startedAt = Date.now()
        try {
            const req = http.get(url, (res) => {
                res.resume()
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    statusCode: res.statusCode,
                    latencyMs: Date.now() - startedAt,
                })
            })
            req.on('error', () => resolve({ ok: false }))
            req.setTimeout(timeoutMs, () => {
                req.destroy()
                resolve({ ok: false })
            })
        } catch (err) {
            resolve({ ok: false })
        }
    })

const checkAdb = async () => {
    const port = parseInt(process.env.ANDROID_ADB_SERVER_PORT || '5037', 10)
    try {
        const devices = await ADBHelper.getDevices()
        return {
            ok: true,
            port,
            count: devices.length,
        }
    } catch (err) {
        return {
            ok: false,
            port,
            count: 0,
            error: err.message,
        }
    }
}

async function getHealth(req, res) {
    const appiumHost = (process.env.APPIUM_HOST || '127.0.0.1').trim()
    const appiumPort = parseInt(String(process.env.APPIUM_PORT || '').trim(), 10) || 4723
    const ocrPort = 5000

    const [adb, appiumRes, ocrRes] = await Promise.all([
        checkAdb(),
        httpPing(`http://${appiumHost}:${appiumPort}/wd/hub/status`),
        httpPing(`http://127.0.0.1:${ocrPort}/ping`),
    ])

    res.json({
        adb,
        appium: { ...appiumRes, host: appiumHost, port: appiumPort },
        ocr: { ...ocrRes, port: ocrPort },
        runningDevices: getDeviceData().length,
        memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        cache: getTemplateCacheStats(),
    })
}

module.exports = {
    getHealth,
}
