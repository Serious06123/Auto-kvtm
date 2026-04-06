import sys
import cv2
import easyocr

def main():
    if len(sys.argv) < 2:
        print("Usage: python ocr_easyocr.py <image_path>")
        sys.exit(1)
        
    image_path = sys.argv[1]
    
    img = cv2.imread(image_path)
    if img is None:
        sys.exit(1)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # gpu=False assumes running on standard CPUs where torch might not be configured for GPU. 
    # Can change to True if the machine has CUDA configured.
    reader = easyocr.Reader(['en'], gpu=False)
    
    # width_ths defaults to 0.5, lower it to prevent merging distant text blocks
    results = reader.readtext(gray, allowlist='0123456789/', width_ths=0.1)
    
    results.sort(key=lambda x: x[0][0][0])
    
    # Print the raw string parts space separated
    text_parts = [text for (bbox, text, prob) in results]
    print(" ".join(text_parts))

if __name__ == "__main__":
    main()
