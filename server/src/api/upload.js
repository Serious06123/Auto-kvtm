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
    const customConstPath = path.resolve(__dirname, '../../../data/custom_const.json')
    let customData = {}
    if (fs.existsSync(customConstPath)) {
        try {
            customData = JSON.parse(fs.readFileSync(customConstPath, 'utf8'))
        } catch (e) {
            customData = {}
        }
    }
    if (!customData[keyType]) {
        customData[keyType] = {}
    }
    customData[keyType][keyName] = keyValue
    fs.writeFileSync(customConstPath, JSON.stringify(customData, null, 4), 'utf8')
    return true
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
                        const constPath = path.resolve(__dirname, '../games/sky-garden/const.js')
                        delete require.cache[constPath]
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
