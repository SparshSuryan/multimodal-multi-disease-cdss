
from pathlib import Path
from functools import lru_cache

import joblib
import pandas as pd

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/api/copd",
    tags=["COPD"]
)

# backend/services/copd_service.py
# parents[2] resolves to the repository root.
PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_DIR = PROJECT_ROOT / "models" / "copd"

MODEL_PATH = MODEL_DIR / "copd_optimized_calibrated_pipeline.pkl"
METADATA_PATH = MODEL_DIR / "copd_optimized_metadata.pkl"


# --------------------------------------------------
# Input schema
# --------------------------------------------------

class COPDInput(BaseModel):
    # Required demographic features
    RIDAGEYR: float = Field(ge=40, le=120)
    RIAGENDR: int
    RIDRETH1: int

    # Optional questionnaire-derived features
    MCQ160G: int | None = None
    MCQ160K: int | None = None

    RDQ031: int | None = None
    RDQ050: int | None = None
    RDQ070: int | None = None

    OCQ510: int | None = None
    OCQ530: int | None = None
    OCQ550: int | None = None
    OCQ570: int | None = None

    # Derived smoking features
    age_started_smoking: float | None = None
    smoking_status: int | None = None


# --------------------------------------------------
# Lazy model loading
# --------------------------------------------------

@lru_cache(maxsize=1)
def load_copd_artifacts():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"COPD model not found: {MODEL_PATH}"
        )

    if not METADATA_PATH.exists():
        raise FileNotFoundError(
            f"COPD metadata not found: {METADATA_PATH}"
        )

    loaded_model = joblib.load(MODEL_PATH)
    loaded_metadata = joblib.load(METADATA_PATH)

    required_metadata = [
        "features",
        "selected_model",
        "training_selected_threshold"
    ]

    for key in required_metadata:
        if key not in loaded_metadata:
            raise ValueError(
                f"Missing COPD metadata field: {key}"
            )

    return loaded_model, loaded_metadata


# --------------------------------------------------
# Health endpoint
# --------------------------------------------------

@router.get("/health")
def copd_health():

    try:
        _, metadata = load_copd_artifacts()

        return {
            "disease": "COPD",
            "model_loaded": True,
            "selected_model": metadata["selected_model"]
        }

    except Exception as exc:
        return {
            "disease": "COPD",
            "model_loaded": False,
            "error": str(exc)
        }


# --------------------------------------------------
# Prediction endpoint
# --------------------------------------------------

@router.post("/predict")
def predict_copd(data: COPDInput):

    try:
        model, metadata = load_copd_artifacts()

        values = (
            data.model_dump()
            if hasattr(data, "model_dump")
            else data.dict()
        )

        # Always follow the exact training feature order.
        features = metadata["features"]

        missing_features = [
            feature for feature in features
            if feature not in values
        ]

        if missing_features:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Required model features are missing.",
                    "features": missing_features
                }
            )

        input_df = pd.DataFrame(
            [[values[feature] for feature in features]],
            columns=features
        )

        # Calibrated probability from the exported pipeline.
        probability = float(
            model.predict_proba(input_df)[0, 1]
        )

        threshold = float(
            metadata["training_selected_threshold"]
        )

        prediction = int(probability >= threshold)

        return {
            "disease": "copd",
            "risk": round(probability, 6),
            "prediction": prediction,
            "threshold": round(threshold, 4),

            "reliability": "Not assessed",
            "reliability_score": None,
            "reliability_reasons": [
                "An independent reliability estimator has not been validated."
            ],

            "missing_inputs": [
                feature
                for feature in features
                if values[feature] is None
            ],

            "conflicts": [],
            "suggested_investigations": [],

            "explanation": {
                "model": metadata["selected_model"],
                "target": metadata["target"],
                "target_definition": metadata["target_definition"],
                "score_type": "sigmoid_calibrated_model_probability",
                "classification_threshold": threshold,
                "screening_result": (
                    "Positive model output"
                    if prediction == 1
                    else "Negative model output"
                )
            },

            "similar_cases": [],

            "disclaimer": (
                "Research screening support only. "
                "The model predicts baseline pre-bronchodilator "
                "airflow obstruction (FEV1/FVC < 0.70), not a "
                "confirmed clinical COPD diagnosis. "
                "The output must not replace spirometry or "
                "professional medical assessment."
            )
        }

    except HTTPException:
        raise

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc)
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"COPD prediction failed: {str(exc)}"
        ) from exc
