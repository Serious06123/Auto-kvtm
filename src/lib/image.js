const Jimp = require('jimp')
const { cv, cvTranslateError } = require('opencv-wasm')
const { logErrMsg } = require('../service/log')
const { resolve } = require('path')

const exactRate = 0.9
const defaultSize = [1000, 1000]

getCropInfo = (findPosition, isRotated) => {
  let result = null
  switch (findPosition) {
    case '1':
      result = { x: 0, y: 0, w: 500, h: 500 }; break
    case '2':
      result = { x: 500, y: 0, w: 500, h: 500 }; break
    case '3':
      result = { x: 0, y: 500, w: 500, h: 500 }; break
    case '4':
      result = { x: 500, y: 500, w: 500, h: 500 }; break
    case '12':
      result = { x: 0, y: 0, w: 1000, h: 500 }; break
    case '34':
      result = { x: 0, y: 500, w: 1000, h: 500 }; break
    case '13':
      result = { x: 0, y: 0, w: 500, h: 1000 }; break
    case '24':
      result = { x: 500, y: 0, w: 500, h: 1000 }; break
    case 'caytrong':
      result = { x: 176, y: 780, w: 234, h: 156 }; break
    case 'thuhoach':
      result = { x: 281, y: 750, w: 100, h: 103 }; break
    case 'bando':
      result = { x:30 , y: 365, w: 370, h: 325 }; break
    case 'moruong':
      result = { x: 293, y: 510, w: 200, h: 200 }; break
    case 'fullkho':
      result = { x: 172, y: 301, w: 582, h: 304 }; break
    case 'kc':
      result = { x: 850, y: 590, w: 150, h: 310 }; break
    case 'cam':
      result = { x: 540, y: 850, w: 460, h: 150 }; break
    case 'quayhang':
      result = { x: 200, y: 341, w: 600, h: 400 }; break
    case 'batbo':
      result = { x: 294, y: 787, w: 566, h: 69 }; break
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

module.exports = {
  findCoordinates,
}
