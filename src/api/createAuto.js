const fs = require('fs')
const path = require('path')
const { getAutoData, writeAutoData } = require('../service/data')

const corePath = path.resolve(__dirname, '../tools/sky-garden/core.js')
const constPath = path.resolve(__dirname, '../tools/sky-garden/const.js')

function parseCoreExports() {
    try {
        const txt = fs.readFileSync(corePath, 'utf8')
        const m = txt.match(/module\.exports\s*=\s*{([\s\S]*?)}/)
        if (!m) return []
        const body = m[1]
        return body
            .split(',')
            .map((l) => l.trim())
            .map((l) => {
                const parts = l.split(':')
                return parts[0].replace(/\r|\n|\s/g, '')
            })
            .filter((x) => x)
    } catch (e) {
        return []
    }
}

const getMetadata = async (req, res, next) => {
    const functions = parseCoreExports()
    let consts = {}
    try {
        consts = require('../tools/sky-garden/const')
    } catch (e) {
        consts = {}
    }
    res.json({ functions, consts })
}

const readAuto = async (req, res, next) => {
    try {
        const { key } = req.query
        if (!key) return res.status(400).json({ error: 'key required' })
        const dataPath = path.resolve(__dirname, '../../data/auto.json')
        let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
        const list = (data['sky-garden'] || [])
        const meta = list.find((x) => x.key === key)
        if (!meta) return res.status(404).json({ error: 'auto not found' })

        const filePath = path.resolve(__dirname, '../tools/sky-garden/auto', `${key}.js`)
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file not found' })
        const txt = fs.readFileSync(filePath, 'utf8')

        // extract production block (robustly capture inner lines of produceItems)
        const prodMatch = txt.match(/const produceItems\s*=\s*async[\s\S]*?\{([\s\S]*?)\}\s*(?=const sellItems|const sellItems\s*=|$)/m)
        let production = []
        if (prodMatch && prodMatch[1]) {
            production = prodMatch[1]
                .split('\n')
                .map((l) => l.replace(/^\s+|\s+$/g, ''))
                .filter((l) => l && !l.startsWith('if (!isLast)') && !l.startsWith('await driver.sleep'))
        }

        // extract sell block (capture only lines inside the sellItems function)
        const sellMatch = txt.match(/const sellItems\s*=\s*async[^\{]*\{([\s\S]*?)\}\s*(?=\/\/|module\.exports|$)/m)
        let sell = []
        if (sellMatch && sellMatch[1]) {
            sell = sellMatch[1]
                .split('\n')
                .map((l) => l.replace(/^\s+|\s+$/g, ''))
                .filter((l) => l && !l.startsWith('//'))
        }

        // extract loop count
        const loopMatch = txt.match(/for \(let i = 0; i < (\d+); i\+\+\)/)
        const loopCount = loopMatch ? parseInt(loopMatch[1], 10) : 5

        // extract sleep seconds used between loops (await driver.sleep(N))
        const sleepMatch = txt.match(/await driver\.sleep\((\d+)\)/)
        const sleepSeconds = sleepMatch ? parseInt(sleepMatch[1], 10) : 8

        res.json({ key, name: meta.name, category: meta.category, order: meta.order, recommend: meta.recommend, loopCount, sleepSeconds, logic: { production, sell } })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: e.message })
    }
}

const createAuto = async (req, res, next) => {
    try {
        const payload = req.body
        const { name, key, category = 'vp', logic = {}, loopCount = 5, sleepSeconds = 8, sellItems = false, removeItems = false } = payload

        if (!name || !key) return res.status(400).json({ error: 'name and key required' })

        // build file content
        const lines = []
        lines.push("const core = require('../core')")
        lines.push("const { SellItemOptions, ProductKeys, TreeKeys , ProductTreeKeys, ProductMineralKeys ,OtherKeys } = require('../const')")
        lines.push('')
        lines.push('const produceItems = async (driver, isLast, mutex) => {')
        if (logic.production && Array.isArray(logic.production)) {
            for (const l of logic.production) {
                lines.push('  ' + l)
            }
        } else if (Array.isArray(logic)) {
            for (const l of logic) lines.push('  ' + l)
        }
        lines.push('  if (!isLast) {')
        lines.push('    await driver.sleep(' + parseInt(sleepSeconds || 8) + ')')
        lines.push('  }')
        lines.push('}')
        lines.push('')
        lines.push('const sellItems = async (driver, mutex, mutex2, removeItems = false) => {')
        lines.push('  // Sell Goods')
        if (logic.sell && Array.isArray(logic.sell)) {
            for (const l of logic.sell) lines.push('  ' + l)
        } else {
            lines.push("  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.traHoaHong, value: 20 }], mutex, mutex2 , removeItems)")
        }
        lines.push('}')
        lines.push('')
        lines.push('// auto generated')
        lines.push('module.exports = async (driver, gameOptions) => {')
        lines.push('  const { sellItems: sell } = gameOptions;')
        lines.push('  const { removeItems: removeItems } = gameOptions;')
        lines.push('  const { quantity } = gameOptions;')
        lines.push('  let mutex = { value: 0 };')
        lines.push('  let mutex2 = { value: 0 };')
        lines.push(`  for (let i = 0; i < ${parseInt(loopCount || 5)}; i++) {`)
        lines.push("    if (mutex.value != 1) {")
        lines.push('      await produceItems(driver, i == ' + (parseInt(loopCount || 5) - 1) + ', mutex);')
        lines.push('    } ')
        lines.push('  }')
        lines.push('')
        lines.push('  if (sell) {')
        lines.push('    await sellItems(driver, mutex, mutex2, removeItems)')
        lines.push('  }')
        lines.push('}')

        const content = lines.join('\n')

        // write file
        const targetDir = path.resolve(__dirname, '../tools/sky-garden/auto')
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
        const filePath = path.resolve(targetDir, `${key}.js`)
        fs.writeFileSync(filePath, content)

        // update data/auto.json
        const dataPath = path.resolve(__dirname, '../../data/auto.json')
        let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
        if (!data['sky-garden']) data['sky-garden'] = []
        data['sky-garden'].push({ key, name, disabled: false, order: 0, recommend: false, category })
        writeAutoData(data)

        res.json({ success: true, file: `/src/tools/sky-garden/auto/${key}.js` })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: e.message })
    }
}

const updateAuto = async (req, res, next) => {
    try {
        const payload = req.body
        const { name, key, category = 'vp', order = 0, recommend = false, logic = {}, loopCount = 5, sleepSeconds = 8, sellItems = false, removeItems = false } = payload

        if (!name || !key) return res.status(400).json({ error: 'name and key required' })

        // if sell logic not provided in payload, try to preserve existing sell logic
        if ((!logic.sell || !logic.sell.length)) {
            try {
                const existingPath = path.resolve(__dirname, '../tools/sky-garden/auto', `${key}.js`)
                if (fs.existsSync(existingPath)) {
                    const existingTxt = fs.readFileSync(existingPath, 'utf8')
                    const sellMatch = existingTxt.match(/const sellItems\s*=\s*async[^\{]*\{\n([\s\S]*?)\n\}/m)
                    if (sellMatch && sellMatch[1]) {
                        logic.sell = sellMatch[1].split('\n').map((l) => l.replace(/^\s+|\s+$/g, '')).filter((l) => l && !l.startsWith('//'))
                    }
                }
            } catch (e) {
                // ignore and continue
            }
        }

        // build file content (same as create)
        const lines = []
        lines.push("const core = require('../core')")
        lines.push("const { SellItemOptions, ProductKeys, TreeKeys , ProductTreeKeys, ProductMineralKeys ,OtherKeys } = require('../const')")
        lines.push('')
        lines.push('const produceItems = async (driver, isLast, mutex) => {')
        if (logic.production && Array.isArray(logic.production)) {
            for (const l of logic.production) {
                lines.push('  ' + l)
            }
        } else if (Array.isArray(logic)) {
            for (const l of logic) lines.push('  ' + l)
        }
        lines.push('  if (!isLast) {')
        lines.push('    await driver.sleep(' + parseInt(sleepSeconds || 0) + ')')
        lines.push('  }')
        lines.push('}')
        lines.push('')
        lines.push('const sellItems = async (driver, mutex, mutex2, removeItems = false) => {')
        lines.push('  // Sell Goods')
        if (logic.sell && Array.isArray(logic.sell) && logic.sell.length) {
            for (const l of logic.sell) lines.push('  ' + l)
        } else {
            lines.push("  await core.sellItems(driver, SellItemOptions.goods, [{ key: ProductKeys.traHoaHong, value: 20 }], mutex, mutex2 , removeItems)")
        }
        lines.push('}')
        lines.push('')
        lines.push('// auto generated')
        lines.push('module.exports = async (driver, gameOptions) => {')
        lines.push('  const { sellItems: sell } = gameOptions;')
        lines.push('  const { removeItems: removeItems } = gameOptions;')
        lines.push('  const { quantity } = gameOptions;')
        lines.push('  let mutex = { value: 0 };')
        lines.push('  let mutex2 = { value: 0 };')
        lines.push(`  for (let i = 0; i < ${parseInt(loopCount || 5)}; i++) {`)
        lines.push("    if (mutex.value != 1) {")
        lines.push('      await produceItems(driver, i == ' + (parseInt(loopCount || 5) - 1) + ', mutex);')
        lines.push('    } ')
        lines.push('  }')
        lines.push('')
        lines.push('  if (sell) {')
        lines.push('    await sellItems(driver, mutex, mutex2, removeItems)')
        lines.push('  }')
        lines.push('}')

        const content = lines.join('\n')

        // write file (overwrite)
        const targetDir = path.resolve(__dirname, '../tools/sky-garden/auto')
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
        const filePath = path.resolve(targetDir, `${key}.js`)
        fs.writeFileSync(filePath, content)

        // update data/auto.json (find by key and update fields)
        const dataPath = path.resolve(__dirname, '../../data/auto.json')
        let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
        if (!data['sky-garden']) data['sky-garden'] = []
        const idx = data['sky-garden'].findIndex((x) => x.key === key)
        if (idx === -1) {
            data['sky-garden'].push({ key, name, disabled: false, order, recommend, category })
        } else {
            data['sky-garden'][idx] = { ...data['sky-garden'][idx], name, category, order, recommend }
        }
        writeAutoData(data)

        res.json({ success: true, file: `/src/tools/sky-garden/auto/${key}.js` })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: e.message })
    }
}

module.exports = {
    getMetadata,
    createAuto,
    readAuto,
    updateAuto,
}
