
from PIL import Image, ImageOps

IMAGE_SIZE = 224

def preprocess_tb_image(image_path):
    with Image.open(image_path) as img:
        img = img.convert("RGB")
        img.thumbnail(
            (IMAGE_SIZE, IMAGE_SIZE),
            Image.Resampling.LANCZOS
        )
        img = ImageOps.pad(
            img,
            (IMAGE_SIZE, IMAGE_SIZE),
            color=(0, 0, 0)
        )
        return img.copy()
