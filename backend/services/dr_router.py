from pathlib import Path
from pathlib import Path
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.services.dr_service import DRInferenceService

router = APIRouter(prefix="/api/v1/dr", tags=["Diabetic Retinopathy"])
dr_service = DRInferenceService()  # Automatically resolves to <repo_root>/models/dr

# from typing import Optional
# from fastapi import APIRouter, UploadFile, File, Form, HTTPException
# from backend.services.dr_service import DRInferenceService

# router = APIRouter(prefix="/api/v1/dr", tags=["Diabetic Retinopathy"])
# dr_service = DRInferenceService(weights_dir="backend/weights/dr")

@router.post("/predict")
async def predict_diabetic_retinopathy(
    file: UploadFile = File(...),
    age: Optional[float] = Form(None),
    sex: Optional[str] = Form(None),
    diabetes_type: Optional[str] = Form(None),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a retinal fundus image.")
    try:
        image_bytes = await file.read()
        return dr_service.predict(
            image_bytes=image_bytes,
            age=age,
            sex=sex,
            diabetes_type=diabetes_type,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DR inference error: {str(exc)}")