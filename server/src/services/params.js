const fs = require('fs')
const { resolve, dirname } = require('path')
const { groups, params } = require('./paramsSchema')

const getUserFile = () =>
    process.env.PARAMS_USER_FILE
        ? resolve(process.env.PARAMS_USER_FILE)
        : resolve(__dirname, '../../../data/params_user.json')

const schemaMap = Object.fromEntries(params.map((p) => [p.key, p]))

let cache = null
let cacheMtime = -1
let cachePath = null

function readUser() {
    const userFile = getUserFile()
    if (cachePath !== userFile) {
        cache = null
        cacheMtime = -1
        cachePath = userFile
    }
    try {
        if (!fs.existsSync(userFile)) {
            cache = {}
            cacheMtime = -1
            return cache
        }
        const mtime = fs.statSync(userFile).mtimeMs
        if (cache && mtime === cacheMtime) return cache
        cache = JSON.parse(fs.readFileSync(userFile, 'utf8')) || {}
        cacheMtime = mtime
    } catch (e) {
        cache = cache || {}
    }
    return cache
}

// Lấy giá trị tham số (user override > default)
function P(key) {
    const def = schemaMap[key]
    const user = readUser()
    if (user[key] !== undefined && user[key] !== null) {
        if (def && def.type === 'boolean') {
            const v = user[key]
            if (v === true || v === 'true' || v === 1 || v === '1') return true
            if (v === false || v === 'false' || v === 0 || v === '0') return false
            return def.default
        }
        if (!isNaN(Number(user[key]))) return Number(user[key])
    }
    return def ? def.default : undefined
}

function clamp(p, v) {
    if (v === undefined || v === null) return p.default
    if (p.type === 'boolean') {
        if (v === true || v === 'true' || v === 1 || v === '1') return true
        if (v === false || v === 'false' || v === 0 || v === '0') return false
        return p.default
    }
    let n = Number(v)
    if (isNaN(n)) return p.default
    if (p.min !== undefined) n = Math.max(p.min, n)
    if (p.max !== undefined) n = Math.min(p.max, n)
    return n
}

function getAll() {
    const user = readUser()
    return {
        groups,
        params: params.map((p) => {
            let val = p.default
            if (user[p.key] !== undefined && user[p.key] !== null) {
                if (p.type === 'boolean') {
                    const v = user[p.key]
                    if (v === true || v === 'true' || v === 1 || v === '1') val = true
                    else if (v === false || v === 'false' || v === 0 || v === '0') val = false
                } else if (!isNaN(Number(user[p.key]))) {
                    val = Number(user[p.key])
                }
            }
            return { ...p, value: val }
        }),
    }
}

// values: { key: value }. Chỉ lưu những giá trị khác mặc định.
function saveAll(values = {}) {
    const safeValues = values && typeof values === 'object' ? values : {}
    const out = {}
    for (const [k, v] of Object.entries(safeValues)) {
        const p = schemaMap[k]
        if (!p) continue
        const n = clamp(p, v)
        if (n !== p.default) out[k] = n
    }
    const userFile = getUserFile()
    const dir = dirname(userFile)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(userFile, JSON.stringify(out, null, 4), 'utf8')
    cache = null
    return getAll()
}

function resetAll() {
    const userFile = getUserFile()
    try {
        if (fs.existsSync(userFile)) fs.unlinkSync(userFile)
    } catch (e) {}
    cache = null
    return getAll()
}

module.exports = { P, getAll, saveAll, resetAll }
