const fs = require('fs')
const os = require('os')
const path = require('path')
const axios = require('axios')
const { readJsonSafe } = require('./data')
const { sendDiscord, sendTelegram } = require('./notify')
const { ADBHelper, isValidDeviceId, sanitizeDeviceId } = require('../engine/adb')
const { logErrMsg } = require('./log')

const getFeedbackConfigFile = () =>
    process.env.FEEDBACK_CONFIG_FILE
        ? path.resolve(process.env.FEEDBACK_CONFIG_FILE)
        : path.resolve(__dirname, '../../../data/feedback_config.json')

const getErrLogPath = () => path.resolve(__dirname, '../../../log/err.txt')
const getPkgJsonPath = () => path.resolve(__dirname, '../../../package.json')

const DEFAULT_RELAY_URL = 'https://auto-kvtm-feedback.kheau777.workers.dev'

const cooldownMap = new Map()

function clampCooldown(val) {
    const num = Number(val)
    if (Number.isNaN(num) || num < 0) return 30
    return Math.min(600, Math.round(num))
}

function getFeedbackConfig() {
    const fileCfg = readJsonSafe(getFeedbackConfigFile(), {})
    const src = fileCfg && typeof fileCfg === 'object' ? fileCfg : {}

    const discordWebhookUrl = String(
        process.env.FEEDBACK_DISCORD_WEBHOOK !== undefined
            ? process.env.FEEDBACK_DISCORD_WEBHOOK
            : src.discordWebhookUrl || ''
    ).trim()
    const telegramBotToken = String(
        process.env.FEEDBACK_TELEGRAM_BOT_TOKEN !== undefined
            ? process.env.FEEDBACK_TELEGRAM_BOT_TOKEN
            : src.telegramBotToken || ''
    ).trim()
    const telegramChatId = String(
        process.env.FEEDBACK_TELEGRAM_CHAT_ID !== undefined
            ? process.env.FEEDBACK_TELEGRAM_CHAT_ID
            : src.telegramChatId || ''
    ).trim()
    const relayUrl = String(
        process.env.FEEDBACK_RELAY_URL !== undefined
            ? process.env.FEEDBACK_RELAY_URL
            : src.relayUrl !== undefined
                ? src.relayUrl
                : DEFAULT_RELAY_URL
    ).trim()

    return {
        discordWebhookUrl,
        telegramBotToken,
        telegramChatId,
        relayUrl,
        cooldownSeconds: clampCooldown(src.cooldownSeconds ?? 30),
    }
}

function getFeedbackStatus() {
    const cfg = getFeedbackConfig()
    const channels = []
    if (cfg.discordWebhookUrl) channels.push('discord')
    if (cfg.telegramBotToken && cfg.telegramChatId) channels.push('telegram')
    if (cfg.relayUrl) channels.push('relay')
    return {
        configured: channels.length > 0,
        channels,
        cooldownSeconds: cfg.cooldownSeconds,
    }
}

function sanitizeSensitiveText(text) {
    if (!text) return ''
    return String(text)
        .replace(/https?:\/\/(?:discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\/[^\s"'`<>]+/gi, '[REDACTED_DISCORD_WEBHOOK]')
        .replace(/https?:\/\/[^\s"'`<>]*\/bot[^\/\s"'`<>]+(?:\/[^\s"'`<>]*)?/gi, '[REDACTED_TELEGRAM_URL]')
        .replace(/\bbot\d+:[a-zA-Z0-9_-]{10,}/g, '[REDACTED_TELEGRAM_TOKEN]')
        .replace(/"(botToken|telegramBotToken|webhookUrl|discordWebhookUrl|relayUrl)"\s*:\s*"[^"]*"/gi, '"$1":"[REDACTED]"')
        .replace(/(botToken|telegramBotToken|webhookUrl|discordWebhookUrl|relayUrl)\s*=\s*[^\s&;]+/gi, '$1=[REDACTED]')
}

function readRecentErrLogs(maxLines = 25, errLogPath = getErrLogPath()) {
    try {
        if (!fs.existsSync(errLogPath)) return ''
        const raw = fs.readFileSync(errLogPath, 'utf8')
        const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '')
        if (lines.length === 0) return ''
        const recent = lines.slice(-Math.max(1, maxLines)).join('\n')
        return sanitizeSensitiveText(recent)
    } catch (err) {
        return ''
    }
}

function makeValidationError(msg) {
    const err = new Error(msg)
    err.statusCode = 400
    err.code = 'VALIDATION_ERROR'
    return err
}

function validateFeedbackPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw makeValidationError('Dữ liệu phản hồi không hợp lệ.')
    }

    const type = String(payload.type || '').trim()
    if (type !== 'bug' && type !== 'suggestion') {
        throw makeValidationError('Loại phản hồi chỉ nhận "bug" hoặc "suggestion".')
    }

    const title = String(payload.title || '').trim()
    if (title.length < 3 || title.length > 150) {
        throw makeValidationError('Tiêu đề phải dài từ 3 đến 150 ký tự.')
    }

    const description = String(payload.description || '').trim()
    if (description.length < 5 || description.length > 2500) {
        throw makeValidationError('Nội dung mô tả phải dài từ 5 đến 2500 ký tự.')
    }

    const category = String(payload.category || '').trim().slice(0, 60)
    const steps = String(payload.steps || '').trim().slice(0, 1000)
    const contact = String(payload.contact || '').trim().slice(0, 100)
    const deviceId = String(payload.deviceId || '').trim()
    if (deviceId && !isValidDeviceId(deviceId)) {
        throw makeValidationError('Mã thiết bị (deviceId) không hợp lệ.')
    }

    return {
        type,
        title,
        description,
        category,
        steps,
        contact,
        deviceId,
        includeLogs: Boolean(payload.includeLogs),
        includeScreenshot: Boolean(payload.includeScreenshot),
    }
}

function formatFeedbackMessage(valid, { version, platform, logs, screenshotError }) {
    const tag = valid.type === 'bug' ? '[BÁO CÁO LỖI]' : '[ĐỀ XUẤT AUTO]'
    const lines = [
        `${tag} ${valid.title}`,
        `Phiên bản: v${version} | Hệ điều hành: ${platform}`,
    ]
    if (valid.category) lines.push(`Danh mục: ${valid.category}`)
    if (valid.deviceId) lines.push(`Thiết bị: ${valid.deviceId}`)
    if (valid.contact) lines.push(`Liên hệ: ${valid.contact}`)
    lines.push('', 'Mô tả:', sanitizeSensitiveText(valid.description))
    if (valid.steps) {
        lines.push('', 'Các bước tái hiện:', sanitizeSensitiveText(valid.steps))
    }
    if (screenshotError) {
        lines.push('', `(Lưu ý ảnh chụp: ${screenshotError})`)
    }
    if (logs) {
        lines.push('', 'Log lỗi gần nhất:', logs.slice(-1000))
    }
    return lines.join('\n')
}

async function captureFeedbackScreenshot(deviceId) {
    const screenDir = path.resolve(__dirname, '../../screen')
    if (!fs.existsSync(screenDir)) {
        fs.mkdirSync(screenDir, { recursive: true })
    }
    const safeName = sanitizeDeviceId(deviceId)
    const tempPath = path.resolve(screenDir, `feedback_${safeName}_${Date.now()}.png`)
    try {
        await ADBHelper.screenCap(deviceId, tempPath)
        return fs.readFileSync(tempPath)
    } finally {
        try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
        } catch (_) {
            // ignore cleanup errors
        }
    }
}

async function submitFeedback(payload, options = {}) {
    const valid = validateFeedbackPayload(payload)
    const cfg = getFeedbackConfig()
    const status = getFeedbackStatus()

    if (!status.configured) {
        return {
            ok: false,
            statusCode: 503,
            code: 'FEEDBACK_NOT_CONFIGURED',
            error: 'Chưa cấu hình kênh Discord/Telegram nhận phản hồi trên server.',
        }
    }

    const lastSent = cooldownMap.get(valid.type)
    if (cfg.cooldownSeconds > 0 && lastSent) {
        const elapsedMs = Date.now() - lastSent
        const limitMs = cfg.cooldownSeconds * 1000
        if (elapsedMs < limitMs) {
            const retryAfterSeconds = Math.max(1, Math.ceil((limitMs - elapsedMs) / 1000))
            return {
                ok: false,
                statusCode: 429,
                code: 'COOLDOWN',
                retryAfterSeconds,
                error: `Bạn vừa gửi gần đây. Vui lòng chờ ${retryAfterSeconds} giây trước khi gửi tiếp.`,
            }
        }
    }

    const pkg = readJsonSafe(getPkgJsonPath(), { version: '0.0.0' })
    const version = pkg?.version || '0.0.0'
    const platform = `${os.platform()} ${os.release()}`
    const logs = valid.includeLogs ? readRecentErrLogs(25, options.errLogPath) : ''

    let screenshotBuffer = null
    let screenshotError = ''
    if (valid.includeScreenshot && valid.deviceId) {
        try {
            screenshotBuffer = options.screenshotBuffer || (await captureFeedbackScreenshot(valid.deviceId))
        } catch (err) {
            screenshotError = `Không chụp được màn hình (${err.message})`
        }
    }

    const formattedText = formatFeedbackMessage(valid, {
        version,
        platform,
        logs,
        screenshotError,
    })

    const tasks = []
    if (cfg.discordWebhookUrl) {
        tasks.push(
            sendDiscord({ webhookUrl: cfg.discordWebhookUrl }, formattedText, screenshotBuffer)
                .then(() => ({ channel: 'discord', ok: true }))
                .catch((err) => {
                    logErrMsg(`Feedback Discord error: ${err.message}`)
                    return { channel: 'discord', ok: false, error: err.message }
                })
        )
    }

    if (cfg.telegramBotToken && cfg.telegramChatId) {
        tasks.push(
            sendTelegram({ botToken: cfg.telegramBotToken, chatId: cfg.telegramChatId }, formattedText, screenshotBuffer)
                .then(() => ({ channel: 'telegram', ok: true }))
                .catch((err) => {
                    logErrMsg(`Feedback Telegram error: ${err.message}`)
                    return { channel: 'telegram', ok: false, error: err.message }
                })
        )
    }

    if (cfg.relayUrl) {
        tasks.push(
            axios
                .post(
                    cfg.relayUrl,
                    {
                        type: valid.type,
                        title: valid.title,
                        category: valid.category,
                        description: valid.description,
                        steps: valid.steps,
                        contact: valid.contact,
                        deviceId: valid.deviceId,
                        version,
                        platform,
                        logs,
                        screenshotBase64: screenshotBuffer ? screenshotBuffer.toString('base64') : null,
                    },
                    { timeout: 8000 }
                )
                .then(() => ({ channel: 'relay', ok: true }))
                .catch((err) => {
                    logErrMsg(`Feedback Relay error: ${err.message}`)
                    return { channel: 'relay', ok: false, error: err.message }
                })
        )
    }

    const results = await Promise.all(tasks)
    const anyOk = results.some((r) => r.ok)
    if (anyOk) {
        cooldownMap.set(valid.type, Date.now())
        return { ok: true, results }
    }

    return {
        ok: false,
        statusCode: 502,
        code: 'DELIVERY_FAILED',
        error: 'Không thể gửi phản hồi tới kênh Discord/Telegram. Vui lòng kiểm tra lại kết nối hoặc cấu hình.',
        results,
    }
}

function resetFeedbackCooldowns() {
    cooldownMap.clear()
}

module.exports = {
    DEFAULT_RELAY_URL,
    getFeedbackConfig,
    getFeedbackStatus,
    sanitizeSensitiveText,
    readRecentErrLogs,
    validateFeedbackPayload,
    submitFeedback,
    resetFeedbackCooldowns,
}
