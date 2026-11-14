import os
from pathlib import Path

from .tb_early_fusion_inference import TBEarlyFusionPredictor


class TBInferenceService:
    """
    TB multimodal screening service.

    Inputs:
        Chest X-ray image path
        Patient age
        Patient sex

    Model:
        Frozen Early-Fusion DenseNet-121

    Intended for research CDSS integration only.
    """

    def __init__(self, config_path=None, device="cpu"):

        if config_path is None:
            project_root = Path(__file__).resolve().parents[2]

            config_path = os.getenv(
                "TB_CONFIG_PATH",
                str(
                    project_root
                    / "models"
                    / "tb"
                    / "tb_early_fusion_deployment_config.json"
                )
            )

        self.predictor = TBEarlyFusionPredictor(
            config_path=config_path,
            device=device
        )

    def predict(self, image_path, age, sex):

        result = self.predictor.predict(
            image_path=image_path,
            age=age,
            sex=sex
        )

        score = float(
            result["tb_score_uncalibrated"]
        )

        screening_flag = bool(
            result["screening_flag"]
        )

        return {
            "disease": "tb",

            # Contract compatibility:
            # Uncalibrated model score, NOT clinical risk.
            "risk": round(score, 6),

            # Reliability has not been validated.
            "reliability": "Not assessed",
            "reliability_score": None,
            "reliability_reasons": [
                "No validated TB reliability estimator is available."
            ],

            "missing_inputs": [],

            # No independent modality conflict detector
            # was developed for this early-fusion model.
            "conflicts": [],

            # Not generating clinical test recommendations.
            "suggested_investigations": [],

            "explanation": {
                "model": "Early-Fusion DenseNet-121",
                "modalities": [
                    "chest_xray",
                    "age",
                    "sex"
                ],
                "screening_flag": screening_flag,
                "screening_result": result[
                    "screening_result"
                ],
                "screening_threshold": float(
                    result["screening_threshold"]
                ),
                "score_type": "uncalibrated_softmax",
                "gradcam_available": False
            },

            "similar_cases": [],

            "disclaimer": (
                "Research screening support only. "
                "Not a clinical diagnosis. "
                "The model score is uncalibrated "
                "and must not be interpreted as "
                "a clinical disease probability."
            )
        }
