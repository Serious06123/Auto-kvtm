const { remote } = require('webdriverio')
const { resolve } = require('path')
const { findCoordinates } = require('./image')
const { sanitizeDeviceId } = require('./adb')
const { logErrMsg } = require('../services/log')
const { P } = require('../services/params')

const Base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/
const SupportRecordVideo = false

const getRandomInt = (min, max) => {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// speedMultiplier nhân vào thời gian DI CHUYỂN ngón tay (duration của action/swipe).
// 1x = tốc độ gốc, 2x = chậm gấp đôi. KHÔNG nhân vào sleep.
const resolveSpeedMultiplier = (multiplierOverride = null) => {
    if (multiplierOverride !== null && multiplierOverride !== undefined && multiplierOverride !== '') {
        const n = Number(multiplierOverride)
        if (!isNaN(n) && n >= 1) {
            return Math.min(3, n)
        }
    }
    return Number(P('global.speedMultiplier')) || 1.0
}

const getSafeDuration = (duration, multiplierOverride = null) => {
    const raw = Number(duration)
    const valid = isNaN(raw) ? 0 : raw
    const minStep = Number(P('image.minStepDuration')) || 20
    const multiplier = resolveSpeedMultiplier(multiplierOverride)
    return Math.max(minStep, Math.round(valid * multiplier))
}

const getDurationDelta = (duration, multiplierOverride = null) => {
    const raw = Number(duration)
    const valid = isNaN(raw) ? 0 : raw
    const minStep = Number(P('image.minStepDuration')) || 20
    const actual = getSafeDuration(valid, multiplierOverride)
    const orig = Math.max(minStep, Math.round(valid))
    return Math.max(0, actual - orig)
}

const randOffset = () => {
    const o = Math.round(Number(P('image.tapRandomOffset')) || 0)
    if (o <= 0) return 0
    return getRandomInt(-o, o)
}

class Driver {
    constructor(driver, deviceId) {
        this.driver = driver
        this.deviceId = deviceId
        this.width = 0
        this.height = 0
        this.accumulatedDelay = 0
        this.speedMultiplierOverride = null
        this.waitIfPaused = null
        this.setStep = null
    }

    startRecordingScreen = async () => {
        if (!SupportRecordVideo) return
        await this.driver.startRecordingScreen({ timeLimit: 30 * 60 })
    }

    stopRecordingScreen = async (key) => {
        if (!SupportRecordVideo) return
        const safeId = sanitizeDeviceId(this.deviceId)
        const path = resolve(__dirname, `../../screen/${safeId}_${key}.mp4`)
        try {
            await this.driver.saveRecordingScreen(path)
        } catch (err) {
            logErrMsg(`Error saving recording to ${this.deviceId}_${key}: ${err.toString()}`)
        }
    }

    setCurrentWindowSize = async () => {
        const { width, height } = await this.driver.getWindowSize()
        this.width = width
        this.height = height
    }

    getX = (x) => Math.round((this.width * (Number(x) || 0)) / 100.0) + randOffset()
    getY = (y) => Math.round((this.height * (Number(y) || 0)) / 100.0) + randOffset()

    tap = async (x, y) => {
        let pointX = this.getX(x)
        let pointY = this.getY(y)
        if (this.width > 0) {
            pointX = Math.max(0, Math.min(this.width - 1, pointX))
        }
        if (this.height > 0) {
            pointY = Math.max(0, Math.min(this.height - 1, pointY))
        }
        await this.driver.executeScript('mobile:clickGesture', [{ x: pointX, y: pointY }])
        const postTapDelay = Number(P('image.postTapDelay'))
        if (!isNaN(postTapDelay) && postTapDelay > 0) {
            const multiplier = resolveSpeedMultiplier(this.speedMultiplierOverride)
            const baseMs = Math.round(postTapDelay * 1000)
            const actualMs = Math.round(baseMs * (multiplier > 1 ? multiplier : 1.0))
            const delta = Math.max(0, actualMs - baseMs)
            if (P('global.dynamicSleepCompensation')) {
                this.accumulatedDelay = (this.accumulatedDelay || 0) + delta
            } else {
                this.accumulatedDelay = 0
            }
            await this.driver.pause(actualMs)
        }
    }

    press = async (key) => {
        await this.driver.executeScript('mobile:pressKey', [{ keycode: key }])
    }

    finish = async () => {
        await this.driver.deleteSession()
    }

    openApp = async (id) => {
        await this.driver.executeScript('mobile:activateApp', [{ appId: id }])
    }

    closeApp = async (id) => {
        await this.driver.executeScript('mobile:terminateApp', [{ appId: id, options: { timeout: 5000 } }])
    }

    sleep = async (s, options = {}) => {
        if (typeof this.waitIfPaused === 'function') {
            await this.waitIfPaused()
        }
        const { compensate = true } = options
        const raw = Number(s)
        const targetMs = Math.max(0, Math.round((isNaN(raw) ? 0 : raw) * 1000))
        if (!P('global.dynamicSleepCompensation')) {
            this.accumulatedDelay = 0
            await this.driver.pause(targetMs)
            return
        }
        if (!compensate) {
            await this.driver.pause(targetMs)
            return
        }
        const currentDelay = Math.max(0, Number(this.accumulatedDelay) || 0)
        const deduct = Math.min(targetMs, currentDelay)
        const actualMs = targetMs - deduct
        this.accumulatedDelay = Math.max(0, currentDelay - deduct)
        await this.driver.pause(actualMs)
    }

    screenshot = async () => {
        const base64 = await this.driver.takeScreenshot()
        if (Base64Regex.test(base64)) {
            return Buffer.from(base64, 'base64')
        }
        return Buffer.from(String(base64), 'base64')
    }

    swipe = async (pointA, pointB, direction) => {
        const left = Math.min(pointA.x, pointB.x)
        const top = Math.min(pointA.y, pointB.y)
        const width = Math.max(Math.abs(pointA.x - pointB.x), 1)
        const height = Math.max(Math.abs(pointA.y - pointB.y), 1)

        const multiplier = resolveSpeedMultiplier(this.speedMultiplierOverride)
        const configuredSpeed = Number(P('scroll.swipeSpeed')) || 0
        const baseSpeed = configuredSpeed > 0 ? configuredSpeed : 5000
        const speed = multiplier > 1
            ? Math.max(500, Math.round(baseSpeed / multiplier))
            : configuredSpeed

        const percent = Number(P('scroll.swipePercent')) || 1.0
        const pixelW = this.width > 0 ? Math.round((this.width * width) / 100.0) : Math.round(width * 10)
        const pixelH = this.height > 0 ? Math.round((this.height * height) / 100.0) : Math.round(height * 10)
        const distance = Math.max(1, ((direction === 'left' || direction === 'right') ? pixelW : pixelH) * percent)

        if (multiplier > 1) {
            const actualSpeed = Math.max(500, Math.round(baseSpeed / multiplier))
            const tOrig = Math.round((distance / baseSpeed) * 1000)
            const tActual = Math.round((distance / actualSpeed) * 1000)
            const delta = Math.max(0, tActual - tOrig)
            if (P('global.dynamicSleepCompensation')) {
                this.accumulatedDelay = (this.accumulatedDelay || 0) + delta
            } else {
                this.accumulatedDelay = 0
            }
        } else if (!P('global.dynamicSleepCompensation')) {
            this.accumulatedDelay = 0
        }

        const rawLeft = this.width > 0 ? Math.round((this.width * (Number(left) || 0)) / 100.0) : Math.round(left * 10)
        const rawTop = this.height > 0 ? Math.round((this.height * (Number(top) || 0)) / 100.0) : Math.round(top * 10)
        const leftPx = this.width > 0 ? Math.max(0, Math.min(this.width - 1, rawLeft)) : Math.max(0, rawLeft)
        const topPx = this.height > 0 ? Math.max(0, Math.min(this.height - 1, rawTop)) : Math.max(0, rawTop)
        const widthPx = this.width > 0 ? Math.min(this.width - leftPx, Math.max(1, pixelW)) : Math.max(1, pixelW)
        const heightPx = this.height > 0 ? Math.min(this.height - topPx, Math.max(1, pixelH)) : Math.max(1, pixelH)

        await this.driver.executeScript('mobile:swipeGesture', [
            {
                left: leftPx,
                top: topPx,
                width: widthPx,
                height: heightPx,
                direction,
                percent,
                ...(speed > 0 ? { speed } : {}),
            }
        ])
    }

    action = async (points) => {
        if (!Array.isArray(points) || points.length === 0) return
        const validPoints = points.filter((p) => p && typeof p === 'object')
        if (validPoints.length === 0) return

        let actionChain = this.driver.action('pointer', { parameters: { pointerType: 'touch' } })
        let deltaSum = 0

        const startPoint = validPoints[0]
        deltaSum += getDurationDelta(startPoint.duration, this.speedMultiplierOverride)
        actionChain = actionChain
            .move({ duration: getSafeDuration(startPoint.duration, this.speedMultiplierOverride), x: this.getX(startPoint.x), y: this.getY(startPoint.y) })
            .down()
            .pause(P('image.touchHoldTime'))

        if (validPoints.length === 1) {
            actionChain = actionChain.up()
        } else {
            for (let i = 1; i < validPoints.length - 1; i++) {
                const { duration, x, y } = validPoints[i]
                deltaSum += getDurationDelta(duration, this.speedMultiplierOverride)
                actionChain = actionChain.move({ duration: getSafeDuration(duration, this.speedMultiplierOverride), x: this.getX(x), y: this.getY(y) })
            }

            const lastPoint = validPoints[validPoints.length - 1]
            deltaSum += getDurationDelta(lastPoint.duration, this.speedMultiplierOverride)
            actionChain = actionChain
                .move({ duration: getSafeDuration(lastPoint.duration, this.speedMultiplierOverride), x: this.getX(lastPoint.x), y: this.getY(lastPoint.y) })
                .pause(P('image.touchHoldTime'))
                .up()
        }

        if (P('global.dynamicSleepCompensation')) {
            this.accumulatedDelay = (this.accumulatedDelay || 0) + deltaSum
        } else {
            this.accumulatedDelay = 0
        }

        await actionChain.perform()
    }

    haveItemOnScreen = async (itemFilePath, findPosition = null, rate = null) => {
        if (!itemFilePath) return false
        let count = 0
        while (count++ < P('image.findRetry')) {
            const data = await this.screenshot()
            const points = await findCoordinates(data, itemFilePath, findPosition, rate)
            if (points.length > 0) return true
            await this.sleep(P('image.retryDelay'), { compensate: false })
        }
        return false
    }

    getCoordinateItemOnScreen = async (itemFilePath, findPosition = null, rate = null) => {
        if (!itemFilePath) return null
        let count = 0
        while (count++ < P('image.findRetry')) {
            const data = await this.screenshot()
            const points = await findCoordinates(data, itemFilePath, findPosition, rate)
            if (points.length > 0) {
                return { x: points[points.length - 1].x, y: points[points.length - 1].y }
            }
            await this.sleep(P('image.retryDelay'), { compensate: false })
        }
        return null
    }

    tapItemOnScreen = async (itemFilePath, findPosition = null, rate = null) => {
        if (!itemFilePath) return false
        let count = 0
        while (count++ < P('image.findRetry')) {
            const data = await this.screenshot()
            const points = await findCoordinates(data, itemFilePath, findPosition, rate)
            if (points.length > 0) {
                await this.tap(points[points.length - 1].x, points[points.length - 1].y)
                return true
            }
            await this.sleep(P('image.retryDelay'), { compensate: false })
        }
        return false
    }

}

const connectAppium = async (capabilities) => {
    const wdOpts = {
        hostname: (process.env.APPIUM_HOST || '127.0.0.1').trim(),
        port: parseInt(String(process.env.APPIUM_PORT || '').trim(), 10) || 4723,
        path: '/wd/hub',
        logLevel: 'error',
        capabilities,
        transformRequest: (requestOptions) => {
            if (requestOptions.headers) {
                if (typeof requestOptions.headers.delete === 'function') {
                    requestOptions.headers.delete('Connection');
                    requestOptions.headers.delete('Content-Length');
                } else {
                    delete requestOptions.headers['Connection'];
                    delete requestOptions.headers['Content-Length'];
                    delete requestOptions.headers['connection'];
                    delete requestOptions.headers['content-length'];
                }
            }
            return requestOptions;
        }
    }
    const driver = await remote(wdOpts)
    const deviceId = capabilities['appium:options']?.udid || capabilities['appium:udid'] || capabilities.udid
    return new Driver(driver, deviceId)
}

const KeyCode = { HOME: 3, BACK: 4 }

const SwipeDirection = { UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right' }

module.exports = {
    KeyCode,
    SwipeDirection,
    connectAppium,
    Driver
}
