const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.resolve(__dirname, '../tools/sky-garden/item')
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true })
        }
        cb(null, uploadPath)
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

const upload = multer({ storage: storage })

const updateConstFile = (keyType, keyName, keyValue) => {
    const constFilePath = path.resolve(__dirname, '../tools/sky-garden/const.js')
    let content = fs.readFileSync(constFilePath, 'utf8')

    const regex = new RegExp(`const\\s+${keyType}\\s*=\\s*{([\\s\\S]*?)}`, 'm')
    const match = content.match(regex)

    if (match) {
        // Find the last closing brace of the object to insert before it
        const blockStartIndex = match.index
        const fullBlock = match[0]
        const closingBraceIndex = fullBlock.lastIndexOf('}')

        if (closingBraceIndex !== -1) {
            // Quote keyName if it contains dashes or other special characters
            const safeKeyName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(keyName) ? keyName : `'${keyName}'`
            let newEntry = `    ${safeKeyName}: '${keyValue}',\n`
            const newBlock = fullBlock.slice(0, closingBraceIndex) + newEntry + fullBlock.slice(closingBraceIndex)
            content = content.replace(fullBlock, newBlock)
            fs.writeFileSync(constFilePath, content, 'utf8')
            return true
        }
    }
    return false
}

const handleUpload = (req, res) => {
    const uploadMiddleware = upload.single('file')

    uploadMiddleware(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message })
        } else if (err) {
            return res.status(500).json({ error: err.message })
        }

        const { keyType, keyName, value } = req.body
        const file = req.file

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' })
        }

        // Rename file if necessary
        const finalFileName = `${value}${path.extname(file.originalname)}`
        const finalPath = path.resolve(file.destination, finalFileName)

        if (file.filename !== finalFileName) {
            fs.renameSync(file.path, finalPath)
        }

        try {
            const updated = updateConstFile(keyType, keyName, value)
            if (!updated) {
                return res.status(500).json({ error: 'Failed to update const.js (KeyType not found?)' })
            }
        } catch (error) {
            return res.status(500).json({ error: 'Error processing const.js: ' + error.message })
        }

        return res.json({
            message: 'File uploaded and const.js updated',
            data: { keyType, keyName, value, filename: finalFileName }
        })
    })
}

module.exports = {
    handleUpload
}
