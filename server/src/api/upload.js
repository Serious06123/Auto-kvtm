const multer = require('multer')
const path = require('path')
const fs = require('fs')
const Jimp = require('jimp')

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.resolve(__dirname, '../games/sky-garden/item')
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true })
        }
        cb(null, uploadPath)
    },
    filename: function (req, file, cb) {
        // Save temporarily under original name, will transcode later
        cb(null, 'temp_' + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({ storage: storage })

const updateConstFile = (keyType, keyName, keyValue) => {
    const constFilePath = path.resolve(__dirname, '../games/sky-garden/const.js')
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
            let newEntry = `    ${safeKeyName}: '${keyValue}',`

            // Check if key already exists in the block
            const keyRegex = new RegExp(`^\\s*${safeKeyName}\\s*:\\s*['"].*['"],?`, 'm')

            if (keyRegex.test(fullBlock)) {
                // Replace existing key
                const newBlock = fullBlock.replace(keyRegex, newEntry)
                content = content.replace(fullBlock, newBlock)
            } else {
                // Append new key
                newEntry = `    ${safeKeyName}: '${keyValue}',\n`
                const newBlock = fullBlock.slice(0, closingBraceIndex) + newEntry + fullBlock.slice(closingBraceIndex)
                content = content.replace(fullBlock, newBlock)
            }

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

        const finalFileName = `${value}.png`
        const finalPath = path.resolve(file.destination, finalFileName)

        // Read and transcode to PNG format
        Jimp.read(file.path)
            .then(image => {
                return image.writeAsync(finalPath).then(() => {
                    // Delete temporary uploaded file
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path)
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
                        message: 'File uploaded and converted to PNG successfully',
                        data: { keyType, keyName, value, filename: finalFileName }
                    })
                })
            })
            .catch(transcodeError => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path)
                }
                return res.status(500).json({ error: 'Failed to convert image to PNG format: ' + transcodeError.message })
            })
    })
}

module.exports = {
    handleUpload
}
