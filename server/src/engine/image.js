const Jimp = require('jimp')
const { cv, cvTranslateError } = require('opencv-wasm')
const { logErrMsg } = require('../services/log')
const path = require('path')
const fs = require('fs')

const exactRate = 0.9
const defaultSize = [1000, 1000]

getCropInfo = (findPosition, isRotated) => {
    let result = null
    switch (findPosition) {
        case '1':
            result = { x: 0, y: 0, w: 500, h: 500 }
            break
        case '2':
            result = { x: 500, y: 0, w: 500, h: 500 }
            break
        case '3':
            result = { x: 0, y: 500, w: 500, h: 500 }
            break
        case '4':
            result = { x: 500, y: 500, w: 500, h: 500 }
            break
        case '12':
            result = { x: 0, y: 0, w: 1000, h: 500 }
            break
        case '34':
            result = { x: 0, y: 500, w: 1000, h: 500 }
            break
        case '13':
            result = { x: 0, y: 0, w: 500, h: 1000 }
            break
        case '24':
            result = { x: 500, y: 0, w: 500, h: 1000 }
            break
        case 'caytrong':
            result = { x: 176, y: 780, w: 234, h: 156 }
            break
        case 'thuhoach':
            result = { x: 281, y: 750, w: 100, h: 103 }
            break
        case 'bando':
            result = { x: 15, y: 343, w: 400, h: 400 }
            break
        case 'moruong':
            result = { x: 293, y: 510, w: 200, h: 200 }
            break
        case 'fullkho':
            result = { x: 172, y: 301, w: 582, h: 304 }
            break
        case 'kc':
            result = { x: 850, y: 590, w: 150, h: 310 }
            break
        case 'cam':
            result = { x: 540, y: 850, w: 460, h: 150 }
            break
        case 'quayhang':
            result = { x: 200, y: 341, w: 600, h: 400 }
            break
        case 'batbo':
            result = { x: 275, y: 517, w: 550, h: 454 }
            break
        case 'readkho':
            result = { x: 17, y: 405, w: 225, h: 25 }
            break
        default:
            return null
    }

    if (isRotated) {
        return {
            x: result.y,
            y: result.x,
            w: result.h,
            h: result.w,
        }
    }
    return result
}

readAndResizeImage = async (data, findPosition) => {
    const imageSource = await Jimp.read(data)
    let isRotated = false
    if (imageSource.bitmap.width >= imageSource.bitmap.height) {
        imageSource.resize(defaultSize[0], defaultSize[1])
    } else {
        imageSource.resize(defaultSize[1], defaultSize[0])
        isRotated = true
    }

    var cropInfo = getCropInfo(findPosition, isRotated)
    cropInfo && imageSource.crop(cropInfo.x, cropInfo.y, cropInfo.w, cropInfo.h)

    return [imageSource, isRotated]
}

getPercentByPoint = (point, isRotated, findPosition) => {
    var cropInfo = getCropInfo(findPosition, isRotated)

    if (cropInfo == null) {
        return {
            x: (point.x / defaultSize[isRotated ? 1 : 0]) * 100.0,
            y: (point.y / defaultSize[isRotated ? 0 : 1]) * 100.0,
        }
    }

    return {
        x: ((point.x + cropInfo.x) / defaultSize[isRotated ? 1 : 0]) * 100.0,
        y: ((point.y + cropInfo.y) / defaultSize[isRotated ? 0 : 1]) * 100.0,
    }
}

async function findCoordinates(data, itemFilePath, findPosition = null, rate = null) {
    try {
        const [imageSource, isRotated] = await readAndResizeImage(data, findPosition)
        const imageTemplate = await Jimp.read(itemFilePath)
        let src = cv.matFromImageData(imageSource.bitmap)
        let templ = cv.matFromImageData(imageTemplate.bitmap)
        let processedImage = new cv.Mat()
        let mask = new cv.Mat()
        let contours = new cv.MatVector()
        let hierarchy = new cv.Mat()

        const thresholdVal = rate !== null ? rate : exactRate

        cv.matchTemplate(src, templ, processedImage, cv.TM_CCOEFF_NORMED, mask)
        cv.threshold(processedImage, processedImage, thresholdVal, 1, cv.THRESH_BINARY)
        processedImage.convertTo(processedImage, cv.CV_8UC1)
        cv.findContours(processedImage, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        let result = []
        for (let i = 0; i < contours.size(); ++i) {
            let point = contours.get(i).data32S
            const pointA = new cv.Point(point[0], point[1])
            const pointB = new cv.Point(point[0] + templ.cols, point[1] + templ.rows)
            result.push({
                x: Math.floor((pointA.x + pointB.x) / 2),
                y: Math.floor((pointA.y + pointB.y) / 2),
            })
        }

        // release memory
        src.delete()
        templ.delete()
        processedImage.delete()
        mask.delete()
        contours.delete()
        hierarchy.delete()

        return result.map((point) => getPercentByPoint(point, isRotated, findPosition))
    } catch (err) {
        logErrMsg(cvTranslateError(cv, err))
        return []
    }
}

async function detectBugInROIs(data1, data2, rois, bugType, floorIndex = 0) {
    try {
        let screenshots = []
        let actualRois = rois
        let actualBugType = bugType
        let actualFloorIndex = floorIndex

        if (Array.isArray(data1)) {
            screenshots = data1
            actualRois = data2
            actualBugType = rois
            actualFloorIndex = bugType || 0
        } else {
            screenshots = [data1]
        }

        // Đọc và chuyển đổi toàn bộ danh sách ảnh chụp màn hình sang Mat của OpenCV
        let jimpImages = await Promise.all(screenshots.map((s) => Jimp.read(s)))
        let mats = jimpImages.map((img) => {
            if (img.bitmap.width >= img.bitmap.height) {
                img.resize(defaultSize[0], defaultSize[1])
            } else {
                img.resize(defaultSize[1], defaultSize[0])
            }
            return cv.matFromImageData(img.bitmap)
        })

        let bugTypes = []
        if (Array.isArray(actualBugType)) {
            bugTypes = actualBugType
        } else {
            bugTypes = [actualBugType]
        }

        // Đọc tất cả template ảnh cho mỗi loại bọ được chọn
        let templates = []
        for (let type of bugTypes) {
            let normalizedBug = type
            if (type === 'ong') normalizedBug = 'ong-vang'
            if (type === 'buom') normalizedBug = 'buom-hong'
            if (type === 'chuonchuon') normalizedBug = 'chuon-chuon'

            const templatePath = path.resolve(__dirname, `../games/sky-garden/item/${normalizedBug}-head.png`)
            if (fs.existsSync(templatePath)) {
                const imageTemplate = await Jimp.read(templatePath)
                let templNormal = cv.matFromImageData(imageTemplate.bitmap)

                // Tạo thêm bản lật ngang để khớp bọ bay hướng ngược lại
                let imageTemplateFlipped = imageTemplate.clone().flip(true, false)
                let templFlipped = cv.matFromImageData(imageTemplateFlipped.bitmap)

                templates.push({
                    name: normalizedBug,
                    normal: templNormal,
                    flipped: templFlipped,
                })
            }
        }

        if (templates.length === 0) {
            console.error('Không tìm thấy template ảnh cho các loại bọ:', bugTypes)
            mats.forEach((mat) => mat.delete())
            return []
        }

        let result = []

        let roiResults = []

        for (let i = 0; i < actualRois.length; i++) {
            const roi = actualRois[i]
            const rect = new cv.Rect(roi.x, roi.y, roi.w, roi.h)

            let bestMaxVal = 0
            let matchCount = 0
            let bestJimpImage = jimpImages[0]
            let matchedBugName = ''

            // Quét qua các ảnh chụp màn hình
            for (let s = 0; s < mats.length; s++) {
                let crop = mats[s].roi(rect)
                let foundBug = false
                let maxValForScreen = 0

                for (let tpl of templates) {
                    let matchResult = new cv.Mat()
                    // 1. So khớp mẫu xuôi
                    cv.matchTemplate(crop, tpl.normal, matchResult, cv.TM_CCOEFF_NORMED)
                    let minMax = cv.minMaxLoc(matchResult)
                    let val = minMax.maxVal

                    if (val >= 0.6) {
                        foundBug = true
                    } else {
                        // 2. So khớp mẫu ngược (lật ngang)
                        cv.matchTemplate(crop, tpl.flipped, matchResult, cv.TM_CCOEFF_NORMED)
                        let minMaxFlipped = cv.minMaxLoc(matchResult)
                        val = minMaxFlipped.maxVal
                        if (val >= 0.6) {
                            foundBug = true
                        }
                    }

                    if (val > maxValForScreen) {
                        maxValForScreen = val
                    }
                    if (val > bestMaxVal) {
                        bestMaxVal = val
                        bestJimpImage = jimpImages[s]
                        matchedBugName = tpl.name
                    }
                    matchResult.delete()
                }

                if (foundBug) {
                    matchCount++
                }
                crop.delete()
            }

            roiResults.push({
                roi,
                index: (i % 6) + 1,
                matchCount,
                bestMaxVal,
                matchedBugName,
            })
        }

        // Bước 2: Đánh giá chậu có bọ dựa trên biểu quyết đa số hoặc điều kiện chậu lân cận
        for (let i = 0; i < roiResults.length; i++) {
            const current = roiResults[i]
            const potIndex = i % 6 // Index chậu từ 0 đến 5 trên cùng một tầng

            let bestFoundBug = false
            const threshold = mats.length >= 3 ? 3 : 1

            if (current.matchCount >= threshold) {
                bestFoundBug = true
            } else if (mats.length >= 3 && current.matchCount === 2) {
                // Kiểm tra 2 chậu kế bên trên cùng một tầng
                let leftNeighborOk = true
                let rightNeighborOk = true

                if (potIndex > 0) {
                    const left = roiResults[i - 1]
                    if (left.matchCount >= 2) {
                        leftNeighborOk = false
                    }
                }
                if (potIndex < 5) {
                    const right = roiResults[i + 1]
                    if (right.matchCount >= 2) {
                        rightNeighborOk = false
                    }
                }

                if (leftNeighborOk && rightNeighborOk) {
                    bestFoundBug = true
                }
            }

            console.log(
                `[Bắt bọ Debug] Tầng ${current.roi.floorIndex + 1} - Chậu ${current.index} (${current.matchedBugName || 'none'}): Số lần khớp = ${current.matchCount}/${mats.length}, Độ khớp lớn nhất = ${current.bestMaxVal.toFixed(3)}${bestFoundBug && current.matchCount === 2 ? ' (Chấp nhận vì 2 chậu bên cạnh < 2)' : ''}`
            )

            if (bestFoundBug) {
                console.log(
                    `[Bắt bọ] Tầng ${current.roi.floorIndex + 1} - Chậu ${current.index} XÁC NHẬN KHỚP! Khớp ${current.matchCount}/${mats.length} ảnh. Độ khớp lớn nhất: ${current.bestMaxVal.toFixed(3)}`
                )
                result.push({
                    index: current.index,
                    roi: current.roi,
                    pixelCount: 1,
                    bugKey: current.matchedBugName,
                })
            }
        }

        mats.forEach((mat) => mat.delete())
        templates.forEach((tpl) => {
            tpl.normal.delete()
            tpl.flipped.delete()
        })
        return result
    } catch (err) {
        logErrMsg(cvTranslateError(cv, err))
        return []
    }
}

module.exports = {
    findCoordinates,
    readAndResizeImage,
    detectBugInROIs,
}
