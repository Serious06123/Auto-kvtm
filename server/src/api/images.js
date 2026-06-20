const fs = require('fs')
const path = require('path')
const multer = require('multer')
const Jimp = require('jimp')

const getConstFilePath = () => path.resolve(__dirname, '../games/sky-garden/const.js')
const getItemFolderPath = () => path.resolve(__dirname, '../games/sky-garden/item')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, getItemFolderPath())
    },
    filename: function (req, file, cb) {
        cb(null, 'temp_edit_' + Date.now() + path.extname(file.originalname))
    }
})
const upload = multer({ storage: storage })

const keyTypes = [
    'ItemKeys',
    'TreeKeys',
    'BugKeys',
    'ProductKeys',
    'ProductTreeKeys',
    'ProductMineralKeys',
    'OtherKeys',
    'EventKeys',
    'AchievementKeys',
]

function getImages(req, res) {
    try {
        const resolvedPath = require.resolve('../games/sky-garden/const')
        delete require.cache[resolvedPath]
        const constants = require('../games/sky-garden/const')
        const list = []
        const itemFolder = getItemFolderPath()

        for (const type of keyTypes) {
            const obj = constants[type]
            if (obj) {
                for (const [keyName, value] of Object.entries(obj)) {
                    const filename = `${value}.png`
                    const hasImage = fs.existsSync(path.resolve(itemFolder, filename))
                    list.push({ keyType: type, keyName, value, hasImage })
                }
            }
        }
        res.json(list)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

function viewImage(req, res) {
    const { name } = req.query
    if (!name) return res.status(400).send('Name parameter is required')

    const imagePath = path.resolve(getItemFolderPath(), `${name}.png`)
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath)
    } else {
        res.status(404).send('Image file not found')
    }
}

function deleteImage(req, res) {
    const { keyType, keyName, value } = req.body
    if (!keyType || !keyName) {
        return res.status(400).json({ error: 'keyType and keyName are required' })
    }

    try {
        const customConstPath = path.resolve(__dirname, '../../../data/custom_const.json')
        let deletedFromCustom = false
        if (fs.existsSync(customConstPath)) {
            const customData = JSON.parse(fs.readFileSync(customConstPath, 'utf8'))
            if (customData[keyType] && customData[keyType][keyName] !== undefined) {
                delete customData[keyType][keyName]
                fs.writeFileSync(customConstPath, JSON.stringify(customData, null, 4), 'utf8')
                deletedFromCustom = true
            }
        }

        // If it wasn't in custom, it might be in const.js
        if (!deletedFromCustom) {
            const constFilePath = getConstFilePath()
            let content = fs.readFileSync(constFilePath, 'utf8')
            const safeKeyName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(keyName) ? keyName : `'${keyName}'`
            const regex = new RegExp(`const\\s+${keyType}\\s*=\\s*{([\\s\\S]*?)}`, 'm')
            const match = content.match(regex)
            if (match) {
                const fullBlock = match[0]
                const escapedKey = safeKeyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const keyRegex = new RegExp(`^\\s*${escapedKey}\\s*:\\s*['"].*?['"],?\\r?\\n?`, 'm')
                if (keyRegex.test(fullBlock)) {
                    const newBlock = fullBlock.replace(keyRegex, '')
                    content = content.replace(fullBlock, newBlock)
                    fs.writeFileSync(constFilePath, content, 'utf8')
                }
            }
        }

        delete require.cache[require.resolve('../games/sky-garden/const')]

        if (value) {
            const imagePath = path.resolve(getItemFolderPath(), `${value}.png`)
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath)
            }
        }

        return res.json({ message: 'Deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

function updateImage(req, res) {
    const uploadMiddleware = upload.single('file')

    uploadMiddleware(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message })
        } else if (err) {
            return res.status(500).json({ error: err.message })
        }

        const { keyType, oldKeyName, newKeyName, oldValue, newValue } = req.body
        if (!keyType || !oldKeyName || !newKeyName || !oldValue || !newValue) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
            return res.status(400).json({ error: 'Missing required parameters' })
        }

        try {
            const customConstPath = path.resolve(__dirname, '../../../data/custom_const.json')
            let updatedInCustom = false

            if (fs.existsSync(customConstPath)) {
                const customData = JSON.parse(fs.readFileSync(customConstPath, 'utf8'))
                if (customData[keyType] && customData[keyType][oldKeyName] !== undefined) {
                    if (oldKeyName !== newKeyName) {
                        delete customData[keyType][oldKeyName]
                    }
                    customData[keyType][newKeyName] = newValue
                    fs.writeFileSync(customConstPath, JSON.stringify(customData, null, 4), 'utf8')
                    updatedInCustom = true
                }
            }

            if (!updatedInCustom) {
                // If it is not in custom, it might be in const.js. We modify const.js.
                const constFilePath = getConstFilePath()
                let content = fs.readFileSync(constFilePath, 'utf8')
                const safeOldKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(oldKeyName) ? oldKeyName : `'${oldKeyName}'`
                const safeNewKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(newKeyName) ? newKeyName : `'${newKeyName}'`
                const regex = new RegExp(`const\\s+${keyType}\\s*=\\s*{([\\s\\S]*?)}`, 'm')
                const match = content.match(regex)

                if (match) {
                    const fullBlock = match[0]
                    const escapedOldKey = safeOldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    const keyRegex = new RegExp(`^\\s*${escapedOldKey}\\s*:\\s*['"].*?['"],?`, 'm')

                    if (keyRegex.test(fullBlock)) {
                        const newEntry = `    ${safeNewKey}: '${newValue}',`
                        const newBlock = fullBlock.replace(keyRegex, newEntry)
                        content = content.replace(fullBlock, newBlock)
                        fs.writeFileSync(constFilePath, content, 'utf8')
                    }
                }
            }

            delete require.cache[require.resolve('../games/sky-garden/const')]

            const itemFolder = getItemFolderPath()
            const oldImagePath = path.resolve(itemFolder, `${oldValue}.png`)
            const newImagePath = path.resolve(itemFolder, `${newValue}.png`)

            if (req.file) {
                Jimp.read(req.file.path)
                    .then(image => {
                        return image.writeAsync(newImagePath).then(() => {
                            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
                            if (oldValue !== newValue && fs.existsSync(oldImagePath)) {
                                fs.unlinkSync(oldImagePath)
                            }
                            return res.json({ message: 'Updated and uploaded successfully' })
                        })
                    })
                    .catch(transcodeError => {
                        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
                        return res.status(500).json({ error: 'Failed to convert image to PNG format: ' + transcodeError.message })
                    })
            } else {
                if (oldValue !== newValue && fs.existsSync(oldImagePath)) {
                    fs.renameSync(oldImagePath, newImagePath)
                }
                return res.json({ message: 'Updated successfully' })
            }
        } catch (err) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
            res.status(500).json({ error: err.message })
        }
    })
}

module.exports = {
    getImages,
    viewImage,
    deleteImage,
    updateImage,
}
