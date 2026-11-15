import io
import cv2
import numpy as np
from PIL import Image, ImageOps


def preprocess_dr_v2_bytes(image_bytes: bytes, image_size: int = 224) -> Image.Image:
    """Applies V2 retinal fundus preprocessing: black-border crop, LAB CLAHE (clip=1.5), and Lanczos padding."""
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = np.array(pil_img)

    # 1. Contour-based black border removal
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    _, mask = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        largest = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)
        margin = int(0.03 * max(w, h))
        x1, y1 = max(0, x - margin), max(0, y - margin)
        x2, y2 = min(image.shape[1], x + w + margin), min(image.shape[0], y + h + margin)
        image = image[y1:y2, x1:x2]

    # 2. LAB-space CLAHE contrast enhancement on luminance channel
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
    enhanced_lab = cv2.merge((clahe.apply(l_ch), a_ch, b_ch))
    rgb_enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)

    # 3. Aspect-ratio-preserving pad to 224x224
    return ImageOps.pad(
        Image.fromarray(rgb_enhanced),
        (image_size, image_size),
        method=Image.Resampling.LANCZOS,
        color=(0, 0, 0),
    )