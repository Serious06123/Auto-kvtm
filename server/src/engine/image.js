const Jimp = require('jimp')
const { cv, cvTranslateError } = require('opencv-wasm')
const { logErrMsg } = require('../services/log')
const path = require('path')

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
            result = { x: 294, y: 787, w: 566, h: 69 }
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

async function findCoordinates(data, itemFilePath, findPosition = null) {
    try {
        const [imageSource, isRotated] = await readAndResizeImage(data, findPosition)
        const imageTemplate = await Jimp.read(itemFilePath)
        let src = cv.matFromImageData(imageSource.bitmap)
        let templ = cv.matFromImageData(imageTemplate.bitmap)
        let processedImage = new cv.Mat()
        let mask = new cv.Mat()
        let contours = new cv.MatVector()
        let hierarchy = new cv.Mat()

        cv.matchTemplate(src, templ, processedImage, cv.TM_CCOEFF_NORMED, mask)
        cv.threshold(processedImage, processedImage, exactRate, 1, cv.THRESH_BINARY)
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

async function detectBugInROIs(data1, data2, rois, bugType) {
    try {
        const imageSource1 = await Jimp.read(data1)
        let isRotated1 = false
        if (imageSource1.bitmap.width >= imageSource1.bitmap.height) {
            imageSource1.resize(defaultSize[0], defaultSize[1])
        } else {
            imageSource1.resize(defaultSize[1], defaultSize[0])
            isRotated1 = true
        }
        let src1 = cv.matFromImageData(imageSource1.bitmap)

        let src2 = null
        if (data2) {
            const imageSource2 = await Jimp.read(data2)
            if (imageSource2.bitmap.width >= imageSource2.bitmap.height) {
                imageSource2.resize(defaultSize[0], defaultSize[1])
            } else {
                imageSource2.resize(defaultSize[1], defaultSize[0])
            }
            src2 = cv.matFromImageData(imageSource2.bitmap)
        }

        let result = []

        for (let i = 0; i < rois.length; i++) {
            const roi = rois[i]
            const rect = new cv.Rect(roi.x, roi.y, roi.w, roi.h)
            let crop1 = src1.roi(rect)

            let hsv = new cv.Mat()
            let low, high
            if (bugType === 'buom' || bugType === 'buom-hong') {
                low = cv.matFromArray(1, 3, cv.CV_8U, [150, 80, 80])
                high = cv.matFromArray(1, 3, cv.CV_8U, [175, 255, 255])
            } else if (bugType === 'ong' || bugType === 'ong-vang') {
                low = cv.matFromArray(1, 3, cv.CV_8U, [125, 60, 60])
                high = cv.matFromArray(1, 3, cv.CV_8U, [148, 255, 255])
            } else if (bugType === 'chuonchuon' || bugType === 'chuon-chuon') {
                low = cv.matFromArray(1, 3, cv.CV_8U, [10, 100, 100])
                high = cv.matFromArray(1, 3, cv.CV_8U, [25, 255, 255])
            } else {
                crop1.delete()
                hsv.delete()
                continue
            }

            let mask = new cv.Mat()

            if (src2) {
                let crop2 = src2.roi(rect)
                let gray1 = new cv.Mat()
                let gray2 = new cv.Mat()
                cv.cvtColor(crop1, gray1, cv.COLOR_RGBA2GRAY)
                cv.cvtColor(crop2, gray2, cv.COLOR_RGBA2GRAY)

                let diff = new cv.Mat()
                cv.absdiff(gray1, gray2, diff)
                cv.threshold(diff, diff, 15, 255, cv.THRESH_BINARY)

                // Lưu ảnh diff chuyển động để debug
                try {
                    let jimpDiff = new Jimp(diff.cols, diff.rows)
                    for (let y = 0; y < diff.rows; y++) {
                        for (let x = 0; x < diff.cols; x++) {
                            let val = diff.ucharPtr(y, x)[0]
                            jimpDiff.setPixelColor(Jimp.rgbaToInt(val, val, val, 255), x, y)
                        }
                    }
                    await jimpDiff.writeAsync(path.join(__dirname, '../../../data', `diff_${i + 1}.png`))
                } catch (e) {
                    // Bỏ qua lỗi lưu ảnh nếu có
                }

                let movingColor = new cv.Mat()
                crop2.copyTo(movingColor, diff)

                cv.cvtColor(movingColor, hsv, cv.COLOR_RGBA2RGB)
                cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV)

                cv.inRange(hsv, low, high, mask)

                crop2.delete()
                gray1.delete()
                gray2.delete()
                diff.delete()
                movingColor.delete()
            } else {
                cv.cvtColor(crop1, hsv, cv.COLOR_RGBA2RGB)
                cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV)
                cv.inRange(hsv, low, high, mask)
            }

            let pixelCount = cv.countNonZero(mask)
            
            // Tìm và phân tích các khối chuyển động (Contours)
            let contours = new cv.MatVector()
            let hierarchy = new cv.Mat()
            cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
            
            let foundBugContour = false
            for (let c = 0; c < contours.size(); c++) {
                let contour = contours.get(c)
                let rect = cv.boundingRect(contour)
                console.log(`[Bắt bọ Debug] Chậu ${i + 1} - Khối chuyển động: rộng=${rect.width}, cao=${rect.height}`)
                
                // Bộ lọc kích thước: Bọ thường có kích thước rộng & cao từ 8px đến 40px
                if (rect.width >= 8 && rect.width <= 40 && rect.height >= 8 && rect.height <= 40) {
                    foundBugContour = true
                    console.log(`[Bắt bọ] Chậu ${i + 1} KHỚP khối bọ! (rộng=${rect.width}, cao=${rect.height})`)
                }
            }

            // Lưu ảnh crop gốc để debug
            try {
                const cropPath = path.join(__dirname, '../../../data', `crop_${i + 1}.png`)
                await imageSource1.clone().crop(roi.x, roi.y, roi.w, roi.h).writeAsync(cropPath)
            } catch (e) {
                // Bỏ qua lỗi lưu ảnh nếu có
            }

            // Lưu ảnh mask khớp màu để debug
            try {
                let jimpMask = new Jimp(mask.cols, mask.rows)
                for (let y = 0; y < mask.rows; y++) {
                    for (let x = 0; x < mask.cols; x++) {
                        let val = mask.ucharPtr(y, x)[0]
                        jimpMask.setPixelColor(Jimp.rgbaToInt(val, val, val, 255), x, y)
                    }
                }
                await jimpMask.writeAsync(path.join(__dirname, '../../../data', `mask_${i + 1}.png`))
            } catch (e) {
                // Bỏ qua lỗi lưu ảnh nếu có
            }

            if (foundBugContour) {
                result.push({
                    index: i + 1,
                    roi: roi,
                    pixelCount: pixelCount,
                })
            }

            contours.delete()
            hierarchy.delete()
            crop1.delete()
            hsv.delete()
            mask.delete()
            low.delete()
            high.delete()
        }

        src1.delete()
        if (src2) src2.delete()
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
