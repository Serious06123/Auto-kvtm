import cv2
import numpy as np
import os
import argparse
import glob

def extract_digits(image_path, output_dir="dataset/raw", min_area=10, max_area=1000):
    """
    Extracts individual digits/characters from an image and saves them.
    We threshold the image isolating the green/red text.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    img = cv2.imread(image_path)
    if img is None:
        print(f"Error loading {image_path}")
        return

    # Convert to HSV to isolate the colors of the numbers.
    # The numbers in the screenshot seem to be brightly colored (Green and Red) with black outlines.
    
    # 1. Easy approach: convert to grayscale and threshold based on the bright colors vs background
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply a binary inverse threshold (assuming numbers are bright, background is lighter/grayish)
    # Alternatively, you can use adaptive thresholding here. Play with the threshold value.
    # In the screenshot, the text has black borders, so let's find the black borders or bright centers.
    
    # A robust way is Canny edge detection
    edges = cv2.Canny(gray, 50, 150)
    
    # Dilate slightly to connect components
    kernel = np.ones((2,2), np.uint8)
    dilated = cv2.dilate(edges, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Sort contours from left to right so that we know the order of digits
    bounding_boxes = [cv2.boundingRect(c) for c in contours]
    if len(bounding_boxes) == 0:
        print("No contours found.")
        return
        
    (contours, bounding_boxes) = zip(*sorted(zip(contours, bounding_boxes), key=lambda b: b[1][0]))

    saved_count = 0
    base_name = os.path.basename(image_path).split('.')[0]
    
    for i, c in enumerate(contours):
        x, y, w, h = cv2.boundingRect(c)
        area = w * h
        
        # Filter out noise (too small) or the whole image (too large)
        if min_area < area < max_area and h > w: # Digits are usually taller than they are wide
            # Pad the bounding box a little
            pad = 2
            x_start = max(0, x - pad)
            y_start = max(0, y - pad)
            x_end = min(img.shape[1], x + w + pad)
            y_end = min(img.shape[0], y + h + pad)
            
            roi = img[y_start:y_end, x_start:x_end]
            
            # Resize ROI to a standard size for our CNN (e.g. 28x28)
            roi_resized = cv2.resize(roi, (28, 28))
            
            out_path = os.path.join(output_dir, f"{base_name}_digit_{i}.png")
            cv2.imwrite(out_path, roi_resized)
            saved_count += 1
            
            # Draw rectangle on original image for visualization
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 1)

    print(f"Extracted {saved_count} potential digits from {image_path}")
    
    # Show the bounding boxes to user
    cv2.imshow("Extracted", img)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract digits from game screenshots")
    parser.add_argument("--image", type=str, help="Path to a specific image")
    parser.add_argument("--dir", type=str, help="Directory containing multiple images (*.png)")
    parser.add_argument("--out", type=str, default="dataset/raw", help="Output directory")
    
    args = parser.parse_args()
    
    if args.image:
        extract_digits(args.image, args.out)
    elif args.dir:
        for p in glob.glob(os.path.join(args.dir, "*.png")):
            extract_digits(p, args.out)
    else:
        print("Please provide --image or --dir")
