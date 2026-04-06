from flask import Flask, request, jsonify
import easyocr
import cv2
import traceback
import threading
import os
import base64
import numpy as np
import cv2
import traceback
import threading
import os

# TRÓI CỔ AI: Giới hạn lượng CPU nó được phép sử dụng
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'
import torch
torch.set_num_threads(1)
cv2.setNumThreads(1)

app = Flask(__name__)

print("Đang nạp mô hình PyTorch EasyOCR... Vui lòng đợi khoảng 5-10 giây!")
# gpu=False for max compatibility if CUDA isn't set up.
reader = easyocr.Reader(['en'], gpu=False)
print("Thành công! Máy chủ AI đã sẵn sàng hoạt động ở cổng 5000.")

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"success": True})

@app.route('/exit', methods=['GET'])
def exit_server():
    print("[Hệ thống] Nhận được lệnh tắt AI từ Auto Node.js. Tắt máy chủ!")
    # Chạy ngầm tắt sau 1 giây
    threading.Timer(1.0, lambda: os._exit(0)).start()
    return jsonify({"success": True})

@app.route('/ocr', methods=['POST'])
def run_ocr():
    try:
        data = request.get_json()
        img = None
        
        # Hỗ trợ nhận ảnh qua RAM (Base64) - Tốc độ bàn thờ, 0% CPU rác
        if data and 'image_base64' in data:
            img_data = base64.b64decode(data['image_base64'])
            np_arr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        elif data and 'image_path' in data:
            # Hỗ trợ ngược cho bản cũ nếu cần
            img = cv2.imread(data['image_path'])
            
        if img is None:
            return jsonify({"error": "Không có dữ liệu ảnh hợp lệ"}), 400
            
        # Thuật toán cắt gọt (Crop) chuyển thể từ JS thuần sang Numpy OpenCV C++
        h, w = img.shape[:2]
        img_resized = cv2.resize(img, (1000, 1000))
        
        if w >= h: 
            # Màn hình ngang (isRotated = false)
            # Thông số readkho: { x: 17, y: 405, w: 225, h: 25 }
            # Numpy crop: [y:y+h, x:x+w]
            cropped = img_resized[405:430, 17:242]
        else: 
            # Màn hình dọc (isRotated = true)
            # Khung bị hoán đổi (Swapped crop): { x: 405, y: 17, w: 25, h: 225 }
            cropped = img_resized[17:242, 405:430]
            
        gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
        
        # Đọc chữ bằng AI
        results = reader.readtext(gray, allowlist='0123456789/', width_ths=0.1)
        results.sort(key=lambda x: x[0][0][0])
        
        text_parts = [text for (bbox, text, prob) in results]
        final_str = " ".join(text_parts)
        
        return jsonify({
            "success": True,
            "text": final_str
        })
    except Exception as e:
        print("Lỗi OCR Server:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run on localhost, port 5000. 
    app.run(host='127.0.0.1', port=5000, debug=False)
