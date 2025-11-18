// src/lib/ocr.js
const Jimp = require('jimp');
const { createWorker } = require('tesseract.js');

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker();         // online: tự tải eng.traineddata
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',     // chỉ đọc số
        tessedit_pageseg_mode: '7',                // 1 dòng text (8: 1 từ, 10: 1 ký tự)
        user_defined_dpi: '280',
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * OCR chữ số trong 1 vùng (ROI).
 * @param {Buffer} buffer        Ảnh gốc (screencap)
 * @param {Function} getCropInfo Hàm crop hiện có của bạn
 * @param {string|null} findPosition  key ROI (vd 'fullkho', 'kc'...)
 * @param {Object} options       { invert, scale }
 * @returns {Promise<string>}    Ví dụ "12345" (chỉ gồm số)
 */
async function ocrDigitsFromBuffer(buffer, getCropInfo, findPosition, options = {}) {
  const { invert = false, scale = 2 } = options;

  const img = await Jimp.read(buffer);

  // cắt ROI nếu có
  const roi = getCropInfo ? getCropInfo(findPosition, /*isRotated*/ false) : null;
  if (roi) img.crop(roi.x, roi.y, roi.w, roi.h);

  // tiền xử lý cho OCR
  if (invert) img.invert();   // dùng khi nền tối chữ sáng (tuỳ UI)
  img.grayscale().contrast(0.3).normalize();
  if (scale && scale !== 1) {
    img.resize(img.bitmap.width * scale, img.bitmap.height * scale, Jimp.RESIZE_BILINEAR);
  }

  const png = await img.getBufferAsync(Jimp.MIME_PNG);
  const worker = await getWorker();
  const { data: { text } } = await worker.recognize(png);

  return (text || '').replace(/\D+/g, '');
}

async function terminateOCR() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}

module.exports = { ocrDigitsFromBuffer, terminateOCR };
