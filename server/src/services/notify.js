const { resolve } = require('path')
const axios = require('axios')
const { readJsonSafe, writeJsonAtomic } = require('./data')
const { logErrMsg } = require('./log')

const getNotifyFile = () =>
    process.env.NOTIFY_FILE
        ? resolve(process.env.NOTIFY_FILE)
        : resolve(__dirname, '../../../data/notify_user.json')

const DEFAULT_CONFIG = {
    enabled: false,
    telegram: {
        enabled: false,
        botToken: '',
        chatId: '',
    },
    discord: {
        enabled: false,
        webhookUrl: '',
    },
    events: {
        deviceOffline: true,
        watchdogFailed: true,
        watchdogRecovered: false,
        sellStalled: true,
        runFinished: false,
        ocrError: true,
    },
    cooldownSeconds: 60,
}

const lastSentMap = new Map()

function mergeConfig(raw) {
    const src = raw && typeof raw === 'object' ? raw : {}
    const cooldown = Number(src.cooldownSeconds)
    return {
        enabled: Boolean(src.enabled),
        telegram: {
            enabled: Boolean(src.telegram?.enabled),
            botToken: String(src.telegram?.botToken || '').trim(),
            chatId: String(src.telegram?.chatId || '').trim(),
        },
        discord: {
            enabled: Boolean(src.discord?.enabled),
            webhookUrl: String(src.discord?.webhookUrl || '').trim(),
        },
        events: {
            ...DEFAULT_CONFIG.events,
            ...(src.events && typeof src.events === 'object' ? src.events : {}),
        },
        cooldownSeconds: !isNaN(cooldown) && cooldown >= 0 ? Math.min(3600, Math.round(cooldown)) : DEFAULT_CONFIG.cooldownSeconds,
    }
}

function getNotifyConfig() {
    const raw = readJsonSafe(getNotifyFile(), {})
    return mergeConfig(raw)
}

function saveNotifyConfig(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid notify config payload')
    }
    const next = mergeConfig(payload)
    writeJsonAtomic(getNotifyFile(), next, true)
    return next
}

function buildMultipart(fields, fileFieldName, filename, mimeType, fileBuffer) {
    const boundary = `----AutoKvtmBoundary${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
    const parts = []
    for (const [k, v] of Object.entries(fields || {})) {
        parts.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${String(v ?? '')}\r\n`,
                'utf8'
            )
        )
    }
    if (fileBuffer && Buffer.isBuffer(fileBuffer) && fileBuffer.length > 0) {
        parts.push(
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${fileFieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
                'utf8'
            )
        )
        parts.push(fileBuffer)
        parts.push(Buffer.from('\r\n', 'utf8'))
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'))
    return {
        body: Buffer.concat(parts),
        contentType: `multipart/form-data; boundary=${boundary}`,
    }
}

async function sendTelegram({ botToken, chatId }, text, imageBuffer) {
    const telegramApiBase = (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/+$/, '')
    if (imageBuffer && Buffer.isBuffer(imageBuffer) && imageBuffer.length > 0) {
        const { body, contentType } = buildMultipart(
            { chat_id: chatId, caption: text.slice(0, 1024) },
            'photo',
            'screen.png',
            'image/png',
            imageBuffer
        )
        await axios.post(`${telegramApiBase}/bot${encodeURIComponent(botToken)}/sendPhoto`, body, {
            headers: { 'Content-Type': contentType, 'Content-Length': body.length },
            timeout: 8000,
        })
        return
    }
    await axios.post(
        `${telegramApiBase}/bot${encodeURIComponent(botToken)}/sendMessage`,
        { chat_id: chatId, text: text.slice(0, 4096) },
        { timeout: 8000 }
    )
}

async function sendDiscord({ webhookUrl }, text, imageBuffer) {
    if (imageBuffer && Buffer.isBuffer(imageBuffer) && imageBuffer.length > 0) {
        const { body, contentType } = buildMultipart(
            { payload_json: JSON.stringify({ content: text.slice(0, 2000) }) },
            'files[0]',
            'screen.png',
            'image/png',
            imageBuffer
        )
        await axios.post(webhookUrl, body, {
            headers: { 'Content-Type': contentType, 'Content-Length': body.length },
            timeout: 8000,
        })
        return
    }
    await axios.post(webhookUrl, { content: text.slice(0, 2000) }, { timeout: 8000 })
}

async function sendAlert(eventKey, { deviceId = '', title = '', message = '', imageBuffer = null, force = false } = {}) {
    const cfg = getNotifyConfig()
    if (!force) {
        if (!cfg.enabled) {
            return { sent: false, skipped: 'disabled', results: [] }
        }
        if (eventKey && cfg.events[eventKey] === false) {
            return { sent: false, skipped: 'event_disabled', results: [] }
        }
        const rateKey = `${eventKey || 'default'}:${deviceId || 'global'}`
        const prevTime = lastSentMap.get(rateKey)
        if (cfg.cooldownSeconds > 0 && prevTime && Date.now() - prevTime < cfg.cooldownSeconds * 1000) {
            return { sent: false, skipped: 'cooldown', results: [] }
        }
    }

    const telegramReady = cfg.telegram.enabled && cfg.telegram.botToken && cfg.telegram.chatId
    const discordReady = cfg.discord.enabled && cfg.discord.webhookUrl
    if (!telegramReady && !discordReady) {
        return { sent: false, skipped: 'no_channel', results: [] }
    }

    if (!force) {
        lastSentMap.set(`${eventKey || 'default'}:${deviceId || 'global'}`, Date.now())
    }

    const header = `[Auto-kvtm]${deviceId ? ` [${deviceId}]` : ''}${title ? ` ${title}` : ''}`
    const text = message ? `${header}\n${message}` : header

    const tasks = []
    if (telegramReady) {
        tasks.push(
            sendTelegram(cfg.telegram, text, imageBuffer)
                .then(() => ({ channel: 'telegram', ok: true }))
                .catch((err) => {
                    logErrMsg(`Telegram notify error: ${err.message}`)
                    return { channel: 'telegram', ok: false, error: err.message }
                })
        )
    }
    if (discordReady) {
        tasks.push(
            sendDiscord(cfg.discord, text, imageBuffer)
                .then(() => ({ channel: 'discord', ok: true }))
                .catch((err) => {
                    logErrMsg(`Discord notify error: ${err.message}`)
                    return { channel: 'discord', ok: false, error: err.message }
                })
        )
    }

    const results = await Promise.all(tasks)
    return {
        sent: results.some((r) => r.ok),
        skipped: null,
        results,
    }
}

function resetNotifyCooldowns() {
    lastSentMap.clear()
}

module.exports = {
    DEFAULT_CONFIG,
    getNotifyConfig,
    saveNotifyConfig,
    buildMultipart,
    sendTelegram,
    sendDiscord,
    sendAlert,
    resetNotifyCooldowns,
}
