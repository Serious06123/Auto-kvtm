const ort = require('onnxruntime-node');
const path = require('path');
const cv = require('opencv-wasm');
const Jimp = require('jimp');
const fs = require('fs');

let session = null;
let classMap = {};

// Load the compiled ONNX model into memory ONE time when the server starts
async function initOCR() {
    try {
        const modelPath = path.join(__dirname, 'digits.onnx');
        if (!fs.existsSync(modelPath)) {
            console.warn(`[OCR Engine] ONNX model not found at ${modelPath}. Please run python_ocr/train.py first.`);
            return;
        }

        // Execution providers (CPU) - Very lightweight
        session = await ort.InferenceSession.create(modelPath, { executionProviders: ['cpu'] });
        console.log('[OCR Engine] Loaded ONNX Model successfully! Inference time will be very low.');

        // Try to load class mapping if it exists (0 -> "0", 10 -> "slash")
        const mappingPath = path.join(__dirname, '..', '..', '..', 'python_ocr', 'class_mapping.txt');
        if (fs.existsSync(mappingPath)) {
            const lines = fs.readFileSync(mappingPath, 'utf8').split('\n');
            lines.forEach(l => {
                const [idx, cls] = l.split(':');
                if (idx && cls) {
                    classMap[idx] = cls.trim();
                }
            });
        }
    } catch (e) {
        console.error(`[OCR Engine] Error loading model: ${e.message}`);
    }
}

/**
 * Predict a single character from an OpenCV Mat
 */
async function predictDigit(roiMat) {
    if (!session) return "?";

    try {
        // Resize to match what neural network expects (28x28)
        let resized = new cv.Mat();
        let dsize = new cv.Size(28, 28);
        cv.resize(roiMat, resized, dsize, 0, 0, cv.INTER_AREA);

        // Convert the BGR mat into a Float32Array [1, 3, 28, 28] buffer for ONNX
        // OpenCV data is interleaved (BGRBGRBGR), PyTorch/ONNX expects planar (BB..B, GG..G, RR..R)

        const floatData = new Float32Array(3 * 28 * 28);
        const data = resized.data; // Uint8Array

        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];

        // This is generic PyTorch transform logic to normalize data.
        for (let i = 0; i < 28 * 28; i++) {
            let r = data[i * 4];      // Red (assuming RGBA or RGB depending on jimp->cv conversion)
            let g = data[i * 4 + 1];  // Green
            let b = data[i * 4 + 2];  // Blue

            // Normalize R (Channel 0)
            floatData[i] = ((r / 255.0) - mean[0]) / std[0];
            // Normalize G (Channel 1)
            floatData[i + 28 * 28] = ((g / 255.0) - mean[1]) / std[1];
            // Normalize B (Channel 2)
            floatData[i + 2 * 28 * 28] = ((b / 255.0) - mean[2]) / std[2];
        }

        resized.delete();

        // Create ONNX Tensor
        const tensor = new ort.Tensor('float32', floatData, [1, 3, 28, 28]);

        // Run inference
        const outputMap = await session.run({ input: tensor });
        const outputTensor = outputMap.output; // The name of the output tensor

        // Find the argmax
        const results = outputTensor.data;
        let maxIndex = 0;
        let maxValue = results[0];

        for (let i = 1; i < results.length; i++) {
            if (results[i] > maxValue) {
                maxValue = results[i];
                maxIndex = i;
            }
        }

        // Map the index to the class name (e.g. 10 -> "/")
        let predictedClass = classMap[maxIndex] || maxIndex.toString();
        if (predictedClass === 'slash') return '/';
        return predictedClass;

    } catch (e) {
        console.error(e);
        return "?";
    }
}

/**
 * High-performance lightweight OCR specifically designed for reading digits and slashes
 * @param {Jimp} image - Jimp Image object representing the region to read
 */
async function performCustomOCR(image, threshold = 100) {
    if (!session) {
        throw new Error("OCR Model not loaded. Did you train it?");
    }

    const { width, height, data } = image.bitmap;

    // Create OpenCV Mat from Jimp image
    let src = cv.matFromImageData({ width, height, data });
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // Binarize the image to find the characters
    let thresh = new cv.Mat();
    cv.threshold(gray, thresh, threshold, 255, cv.THRESH_BINARY_INV);
    // Alternatively you can use cv.Canny(gray, thresh, 50, 150, 3, false);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let boxes = [];
    for (let i = 0; i < contours.size(); ++i) {
        const cnt = contours.get(i);
        const rect = cv.boundingRect(cnt);
        boxes.push(rect);
        cnt.delete();
    }

    // Sort contours left to right
    boxes.sort((a, b) => a.x - b.x);

    let finalString = "";

    // Process each bounding box (each character)
    for (let box of boxes) {
        const area = box.width * box.height;
        // Filter out extreme noise
        if (area > 5 && box.height > 5) {
            // Cut area from SRC
            let rect = new cv.Rect(
                Math.max(0, box.x - 2),
                Math.max(0, box.y - 2),
                Math.min(src.cols - box.x, box.width + 4),
                Math.min(src.rows - box.y, box.height + 4)
            );

            let roi = src.roi(rect);
            const digitStr = await predictDigit(roi);
            finalString += digitStr;
            roi.delete();
        }
    }

    // Cleanup OpenCV Matrices
    src.delete();
    gray.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();

    return finalString;
}

module.exports = {
    initOCR,
    performCustomOCR
};
