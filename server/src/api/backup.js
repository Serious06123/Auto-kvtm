const fs = require('fs')
const path = require('path')
const { readJsonSafe, writeJsonAtomic } = require('../services/data')
const { invalidateTemplateCache } = require('../engine/image')

const ALLOWED_DATA_FILES = [
    'params_user.json',
    'auto_user.json',
    'custom_const.json',
    'custom_categories.json',
    'profiles.json',
    'scheduler.json',
]

const getDataDir = () =>
    process.env.BACKUP_DATA_DIR
        ? path.resolve(process.env.BACKUP_DATA_DIR)
        : path.resolve(__dirname, '../../../data')

const getAutoDir = () =>
    process.env.BACKUP_AUTO_DIR
        ? path.resolve(process.env.BACKUP_AUTO_DIR)
        : path.resolve(__dirname, '../games/sky-garden/auto')

const getItemDir = () =>
    process.env.BACKUP_ITEM_DIR
        ? path.resolve(process.env.BACKUP_ITEM_DIR)
        : path.resolve(__dirname, '../games/sky-garden/item')

const isValidAutoKey = (key) => typeof key === 'string' && /^[a-zA-Z0-9_-]+$/.test(key)
const isSafeImageBase = (name) => typeof name === 'string' && /^[a-zA-Z0-9._-]+$/.test(name) && name !== '.' && name !== '..'

function exportBackup(req, res) {
    try {
        const dataDir = getDataDir()
        const autoDir = getAutoDir()
        const itemDir = getItemDir()

        const files = {}
        for (const name of ALLOWED_DATA_FILES) {
            const p = path.resolve(dataDir, name)
            if (fs.existsSync(p)) {
                files[name] = readJsonSafe(p, null)
            }
        }

        const autoScripts = {}
        const autoUser = files['auto_user.json']
        const userList = autoUser && Array.isArray(autoUser['sky-garden']) ? autoUser['sky-garden'] : []
        for (const item of userList) {
            if (item && isValidAutoKey(item.key)) {
                const scriptPath = path.resolve(autoDir, `${item.key}.js`)
                if (scriptPath.startsWith(autoDir + path.sep) && fs.existsSync(scriptPath)) {
                    autoScripts[item.key] = fs.readFileSync(scriptPath, 'utf8')
                }
            }
        }

        const customImages = {}
        const customConst = files['custom_const.json']
        if (customConst && typeof customConst === 'object') {
            for (const groupObj of Object.values(customConst)) {
                if (!groupObj || typeof groupObj !== 'object') continue
                for (const val of Object.values(groupObj)) {
                    if (isSafeImageBase(val)) {
                        const imgPath = path.resolve(itemDir, `${val}.png`)
                        if (imgPath.startsWith(itemDir + path.sep) && fs.existsSync(imgPath)) {
                            customImages[val] = fs.readFileSync(imgPath).toString('base64')
                        }
                    }
                }
            }
        }

        res.json({
            version: 1,
            exportedAt: new Date().toISOString(),
            files,
            autoScripts,
            customImages,
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

function restoreBackup(req, res) {
    try {
        const payload = req.body
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            return res.status(400).json({ error: 'Invalid backup bundle' })
        }

        const dataDir = getDataDir()
        const autoDir = getAutoDir()
        const itemDir = getItemDir()

        const restored = { files: [], autoScripts: [], customImages: [] }
        const skipped = { files: [], autoScripts: [], customImages: [] }

        if (payload.files && typeof payload.files === 'object') {
            for (const [name, content] of Object.entries(payload.files)) {
                if (!ALLOWED_DATA_FILES.includes(name) || content === null || typeof content !== 'object') {
                    skipped.files.push(name)
                    continue
                }
                const targetPath = path.resolve(dataDir, name)
                if (!targetPath.startsWith(dataDir + path.sep)) {
                    skipped.files.push(name)
                    continue
                }
                writeJsonAtomic(targetPath, content, true)
                restored.files.push(name)
            }
        }

        if (payload.autoScripts && typeof payload.autoScripts === 'object') {
            if (!fs.existsSync(autoDir)) fs.mkdirSync(autoDir, { recursive: true })
            for (const [key, code] of Object.entries(payload.autoScripts)) {
                if (!isValidAutoKey(key) || typeof code !== 'string') {
                    skipped.autoScripts.push(key)
                    continue
                }
                const targetPath = path.resolve(autoDir, `${key}.js`)
                if (!targetPath.startsWith(autoDir + path.sep)) {
                    skipped.autoScripts.push(key)
                    continue
                }
                fs.writeFileSync(targetPath, code, 'utf8')
                restored.autoScripts.push(key)
            }
        }

        if (payload.customImages && typeof payload.customImages === 'object') {
            if (!fs.existsSync(itemDir)) fs.mkdirSync(itemDir, { recursive: true })
            for (const [baseName, base64] of Object.entries(payload.customImages)) {
                if (!isSafeImageBase(baseName) || typeof base64 !== 'string') {
                    skipped.customImages.push(baseName)
                    continue
                }
                const buf = Buffer.from(base64, 'base64')
                if (buf.length === 0) {
                    skipped.customImages.push(baseName)
                    continue
                }
                const targetPath = path.resolve(itemDir, `${baseName}.png`)
                if (!targetPath.startsWith(itemDir + path.sep)) {
                    skipped.customImages.push(baseName)
                    continue
                }
                fs.writeFileSync(targetPath, buf)
                invalidateTemplateCache(targetPath)
                restored.customImages.push(baseName)
            }
        }

        try {
            delete require.cache[require.resolve('../games/sky-garden/const')]
        } catch (_) {}

        res.json({ success: true, restored, skipped })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = {
    exportBackup,
    restoreBackup,
}
