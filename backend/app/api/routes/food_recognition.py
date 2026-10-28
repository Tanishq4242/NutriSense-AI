from io import BytesIO

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.core.security import CurrentUser

router = APIRouter(prefix="/api/food-recognition", tags=["food recognition"])
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/predict")
async def predict_food(user: CurrentUser, image: UploadFile = File(...)) -> dict:
    del user
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a JPEG, PNG, or WebP image.")
    contents = await image.read(settings.max_image_bytes + 1)
    if len(contents) > settings.max_image_bytes:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Image exceeds the configured upload limit.")
    try:
        with Image.open(BytesIO(contents)) as opened:
            opened.verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "The uploaded file is not a valid image.") from None
    if not settings.food_model_path:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Food recognition is unavailable until a model path and evaluated model weights are configured.")
    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The configured model adapter is not implemented. Use food search to log this meal.")

