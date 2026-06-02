const fs = require('fs')
const path = require('path')

const getFilePath = () => path.resolve(__dirname, '../../../data/custom_categories.json')

function getCustomCategories(req, res) {
    try {
        const filePath = getFilePath()
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
            return res.json(Array.isArray(data) ? data : [])
        }
        res.json([])
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

function addCustomCategory(req, res) {
    const { category } = req.body
    if (!category) {
        return res.status(400).json({ error: 'Category is required' })
    }

    const cleanCategory = category.toLowerCase().replace(/[^a-z0-9_-]/g, '').trim()
    if (!cleanCategory) {
        return res.status(400).json({ error: 'Invalid category name' })
    }

    try {
        const filePath = getFilePath()
        let categories = []
        if (fs.existsSync(filePath)) {
            categories = JSON.parse(fs.readFileSync(filePath, 'utf8'))
            if (!Array.isArray(categories)) categories = []
        }

        if (categories.includes(cleanCategory)) {
            return res.status(400).json({ error: 'Category already exists' })
        }

        categories.push(cleanCategory)
        fs.writeFileSync(filePath, JSON.stringify(categories, null, 4), 'utf8')
        res.json({ success: true, categories })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = {
    getCustomCategories,
    addCustomCategory
}
