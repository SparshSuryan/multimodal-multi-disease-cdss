
from pathlib import Path
from functools import lru_cache
import json

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb

from scipy.special import expit
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/api/masld",
    tags=["NAFLD/MASLD"]
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_DIR = PROJECT_ROOT / "models" / "masld"
FOLD_DIR = MODEL_DIR / "masld_calibrated_folds"
METADATA_PATH = FOLD_DIR / "calibration_metadata.json"


class MASLDInput(BaseModel):
    RIDAGEYR: float = Field(ge=18, le=120)
    RIAGENDR: int
    RIDRETH3: int
    LUXSMED: float = Field(gt=0)


@lru_cache(maxsize=1)
def load_masld_artifacts():

    if not METADATA_PATH.exists():
        raise FileNotFoundError(
            f"MASLD metadata not found: {METADATA_PATH}"
        )

    with open(METADATA_PATH, "r") as file:
        metadata = json.load(file)

    if metadata["method"] != "sigmoid":
        raise ValueError("Expected sigmoid calibration.")

    if len(metadata["folds"]) != 5:
        raise ValueError("Expected exactly five calibrated folds.")

    folds = []

    for fold_info in metadata["folds"]:

        fold_number = fold_info["fold"]
        fold_path = FOLD_DIR / f"fold_{fold_number}"

        preprocessor = joblib.load(
            fold_path / "preprocessor.pkl"
        )

        booster = xgb.Booster()
        booster.load_model(
            str(fold_path / "xgboost.json")
        )

        folds.append({
            "preprocessor": preprocessor,
            "booster": booster,
            "a": float(fold_info["a"]),
            "b": float(fold_info["b"])
        })

    return metadata, folds


def predict_calibrated_probability(input_df, folds):

    calibrated_probabilities = []

    for fold in folds:

        transformed = fold["preprocessor"].transform(input_df)

        dmatrix = xgb.DMatrix(transformed)

        raw_probability = float(
            fold["booster"].predict(dmatrix)[0]
        )

        # Original sklearn sigmoid calibration:
        # expit(-(a * probability + b))
        calibrated_probability = float(
            expit(
                -(
                    fold["a"] * raw_probability
                    + fold["b"]
                )
            )
        )

        calibrated_probabilities.append(
            calibrated_probability
        )

    return float(np.mean(calibrated_probabilities))


@router.get("/health")
def masld_health():

    try:
        metadata, folds = load_masld_artifacts()

        return {
            "disease": "NAFLD/MASLD",
            "model_loaded": True,
            "selected_model": metadata["selected_model"],
            "calibration": metadata["method"],
            "folds_loaded": len(folds)
        }

    except Exception as exc:
        return {
            "disease": "NAFLD/MASLD",
            "model_loaded": False,
            "error": str(exc)
        }


@router.post("/predict")
def predict_masld(data: MASLDInput):

    try:
        metadata, folds = load_masld_artifacts()

        values = (
            data.model_dump()
            if hasattr(data, "model_dump")
            else data.dict()
        )

        features = metadata["features"]

        input_df = pd.DataFrame(
            [[values[feature] for feature in features]],
            columns=features
        )

        probability = predict_calibrated_probability(
            input_df,
            folds
        )

        threshold = float(metadata["threshold"])

        prediction = int(probability >= threshold)

        return {
            "disease": "nafld_masld",
            "risk": round(probability, 6),
            "prediction": prediction,
            "threshold": round(threshold, 6),

            "reliability": "Not assessed",
            "reliability_score": None,
            "reliability_reasons": [
                "An independent reliability estimator has not been validated."
            ],

            "missing_inputs": [],
            "conflicts": [],
            "suggested_investigations": [],

            "explanation": {
                "model": metadata["selected_model"],
                "target": "MASLD",
                "target_definition": (
                    "Operational label: CAP >= 302 dB/m plus at least "
                    "one cardiometabolic risk indicator, subject to "
                    "approximate alcohol eligibility."
                ),
                "score_type": "five_fold_sigmoid_calibrated_probability",
                "classification_threshold": threshold,
                "screening_result": (
                    "Positive model output"
                    if prediction == 1
                    else "Negative model output"
                )
            },

            "similar_cases": [],

            "disclaimer": (
                "Research screening support only. This model uses an "
                "operational MASLD label and is not a clinical diagnosis. "
                "The output must not replace clinical assessment."
            )
        }

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc)
        ) from exc

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"MASLD prediction failed: {str(exc)}"
        ) from exc
