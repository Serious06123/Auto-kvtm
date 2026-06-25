const fs = require('fs')
const { resolve } = require('path')

const filePath = resolve(__dirname, '../../../data/changelog.json')

function getChangelog(req, res, next) {
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
            return res.json(data)
        } catch (e) {
            return res.json([])
        }
    }
    res.json([])
}

module.exports = {
    getChangelog,
}
