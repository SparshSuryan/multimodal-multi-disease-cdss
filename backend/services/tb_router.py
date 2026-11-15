
# backend/tb_router.py

import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from .tb_service import TBInferenceService


router = APIRouter(
    prefix="/api/tb",
    tags=["Tuberculosis"]
)

_tb_service = None

MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_TYPES = {"image/png", "image/jpeg"}


def get_tb_service():
    """
    Lazily load the frozen TB model once per server process.
    """
    global _tb_service

    if _tb_service is None:
        _tb_service = TBInferenceService(
            device="cpu"
        )

    return _tb_service


@router.post("/predict")
async def predict_tb(
    image: UploadFile = File(...),
    age: float = Form(...),
    sex: str = Form(...)
):
    """
    Multimodal TB screening endpoint.

    Form inputs:
      image: chest X-ray (PNG/JPEG)
      age: patient age
      sex: Male or Female

    Returns the team's shared CDSS response contract.
    """

    if not 0 <= age <= 120:
        raise HTTPException(
            status_code=422,
            detail="Age must be between 0 and 120."
        )

    if sex not in ("Male", "Female"):
        raise HTTPException(
            status_code=422,
            detail="Sex must be Male or Female."
        )

    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only PNG and JPEG images are supported."
        )

    suffix = (
        ".png"
        if image.content_type == "image/png"
        else ".jpg"
    )

    temp_path = None

    try:
        image_bytes = await image.read(
            MAX_IMAGE_BYTES + 1
        )

        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Image exceeds the 10 MB limit."
            )

        if not image_bytes:
            raise HTTPException(
                status_code=422,
                detail="Uploaded image is empty."
            )

        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False
        ) as temp_file:
            temp_file.write(image_bytes)
            temp_path = temp_file.name

        service = await run_in_threadpool(
            get_tb_service
        )

        result = await run_in_threadpool(
            service.predict,
            image_path=temp_path,
            age=age,
            sex=sex
        )

        return result

    except HTTPException:
        raise

    except (ValueError, OSError) as exc:
        raise HTTPException(
            status_code=422,
            detail="Invalid image or patient input."
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="TB inference service unavailable."
        ) from exc

    finally:
        await image.close()

        if temp_path is not None:
            try:
                os.remove(temp_path)
            except OSError:
                pass
