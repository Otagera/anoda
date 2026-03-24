import numpy as np
from PIL import Image, ImageOps
import logging
import insightface
from insightface.app import FaceAnalysis

logger = logging.getLogger(__name__)

# Initialize InsightFace model
app = FaceAnalysis(name="buffalo_l")
app.prepare(ctx_id=-1, det_size=(640, 640)) # ctx_id=-1 for CPU, 0 for GPU. Using -1 for maximum compatibility.

def load_and_resize(image_path: str, max_dim: int = 1800) -> np.ndarray:
    """
    Loads an image, corrects EXIF orientation, and resizes it so the longest dimension
    does not exceed max_dim. Returns a BGR numpy array compatible with InsightFace.
    """
    try:
        pil_image = Image.open(image_path)
        pil_image = ImageOps.exif_transpose(pil_image)
        
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
            
        original_size = pil_image.size  # (width, height) — capture before resize
        pil_image.thumbnail((max_dim, max_dim), Image.LANCZOS)
        resized_size = pil_image.size

        img_bgr = np.array(pil_image)[:, :, ::-1]
        return img_bgr, original_size, resized_size  # return both sizes
    except Exception as e:
        logger.error(f"Error loading and resizing image {image_path}: {str(e)}")
        raise

def extract_faces(image_path: str) -> list[dict]:
    image, original_size, resized_size = load_and_resize(image_path)
    
    # Compute scale factors
    scale_x = original_size[0] / resized_size[0]
    scale_y = original_size[1] / resized_size[1]
    
    faces = app.get(image)
    faces_data = []
    
    for face in faces:
        if face.det_score > 0.6:
            faces_data.append({
                "embedding": face.embedding.tolist(),
                "bounding_box": {
                    "left":   int(face.bbox[0] * scale_x),
                    "top":    int(face.bbox[1] * scale_y),
                    "right":  int(face.bbox[2] * scale_x),
                    "bottom": int(face.bbox[3] * scale_y),
                },
                "det_score": float(face.det_score)
            })
    
    return faces_data

