# Hướng dẫn train AI đọc số cho KVTM

Để tool chạy cực nhẹ bằng `onnxruntime-node`, chúng ta chỉ dùng Python 1 lần duy nhất để "dạy" (train) AI ráp mặt chữ số. Làm theo các bước sau:

## 1. Chuẩn bị ảnh
Bạn cần có một vài ảnh chụp màn hình chứa các con số bạn muốn đọc (ví dụ: `26/114`).
Copy các ảnh này vào thư mục `python_ocr/dataset/raw`. (Tạo thư mục nếu chưa có).

## 2. Cắt số tự động (Extract)
Mở Terminal, cd vào thư mục `Auto-kvtm` và chạy:
```bash
cd python_ocr
python extract.py --dir dataset/raw --out dataset/extracted
```
Script sẽ tự động tìm các viền số và cắt từng số ra thành từng ảnh nhỏ (kích thước 28x28) lưu vào thư mục `dataset/extracted`.

## 3. Phân loại (Gán nhãn - Labeling)
Đây là bước thủ công duy nhất:
1. Vào thư mục `dataset/train` (Tạo mới nếu chưa có).
2. Tạo 11 thư mục con bên trong tên là: `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, và `slash` (cho dấu `/`).
3. Mở thư mục `dataset/extracted`, nhìn từng tấm ảnh chữ số bị cắt ra, kéo thả ảnh đó vào thư mục tương ứng trong `dataset/train`.
Ví dụ: Ảnh số "2" thì ném vào thư mục `2`. Ảnh dấu "/" thì ném vào thư mục `slash`.

*(Nên gom mỗi số ít nhất 10-20 tấm ảnh ở các góc/màu khác nhau để AI học chuẩn xác)*

## 4. Train AI và Xuất File ONNX
Sau khi chia ảnh xong, chạy script:
```bash
python train.py
```
Quá trình train sẽ mất khoảng 10-30 giây.
Thành quả là bạn sẽ thấy dòng chữ: `Exported ONNX model to: ../server/src/utils/digits.onnx`

## 5. Tận hưởng
Đã xong! Bạn có thể tắt hoàn toàn Python đi.
Bây giờ, Server Node.js của Tool khi khởi động sẽ tự động nạp `digits.onnx` vào RAM và bạn có thể gọi hàm `performCustomOCR()` ở bất cứ đâu trong source game KVTM để đọc số cực nhanh, cực nhẹ cho 10-20 giả lập mà không bị lag!
