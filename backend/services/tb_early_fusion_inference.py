
import json
import math
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import transforms
from torchvision.models import densenet121

from .tb_preprocessing import preprocess_tb_image


class TBEarlyFusionPredictor:
    """
    Research-only multimodal TB screening predictor.

    Inputs:
        Chest X-ray image path
        Patient age
        Patient sex ("Male" or "Female")

    Output:
        Uncalibrated TB softmax score
        Screening threshold
        Screening flag

    This model is not clinically validated.
    It must not be used as an autonomous diagnostic system.
    """

    def __init__(self, config_path, device=None):

        # --------------------------------------------------
        # 1. Load deployment configuration
        # --------------------------------------------------

        self.config_path = Path(config_path).resolve()

        if not self.config_path.is_file():
            raise FileNotFoundError(
                f"Missing configuration: {self.config_path}"
            )

        with open(self.config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)

        # --------------------------------------------------
        # 2. Select device
        # --------------------------------------------------

        self.device = torch.device(
            device
            if device is not None
            else (
                "cuda"
                if torch.cuda.is_available()
                else "cpu"
            )
        )

        # --------------------------------------------------
        # 3. Resolve checkpoint path
        # --------------------------------------------------

        checkpoint_path = Path(
            self.config["checkpoint"]
        ).expanduser()

        # Relative paths are resolved from repository root.
        if not checkpoint_path.is_absolute():
            project_root = Path(__file__).resolve().parents[2]
            checkpoint_path = project_root / checkpoint_path

        checkpoint_path = checkpoint_path.resolve()

        if not checkpoint_path.is_file():
            raise FileNotFoundError(
                f"Missing TB checkpoint: {checkpoint_path}\n"
                "Place the trained checkpoint in models/tb/ "
                "and check the deployment JSON path."
            )

        self.checkpoint_path = checkpoint_path

        # --------------------------------------------------
        # 4. Load frozen screening threshold
        # --------------------------------------------------

        self.threshold = float(
            self.config["screening_threshold"]
        )

        if not math.isfinite(self.threshold) or not (
            0.0 <= self.threshold <= 1.0
        ):
            raise ValueError(
                "Invalid screening threshold in configuration."
            )

        # --------------------------------------------------
        # 5. Load training-derived metadata statistics
        # --------------------------------------------------

        self.age_mean = float(
            self.config["age_mean"]
        )

        self.age_std = float(
            self.config["age_std"]
        )

        if (
            not math.isfinite(self.age_mean)
            or not math.isfinite(self.age_std)
            or self.age_std <= 0
        ):
            raise ValueError(
                "Invalid age normalization statistics."
            )

        self.sex_encoding = self.config[
            "sex_encoding"
        ]

        # --------------------------------------------------
        # 6. Image preprocessing
        # --------------------------------------------------

        # preprocess_tb_image comes from:
        # backend/services/tb_preprocessing.py
        #
        # It must remain identical to training preprocessing.

        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(
                mean=self.config[
                    "image_normalization"
                ]["mean"],
                std=self.config[
                    "image_normalization"
                ]["std"]
            )
        ])

        # --------------------------------------------------
        # 7. Reconstruct early-fusion DenseNet-121
        # --------------------------------------------------

        model = densenet121(weights=None)

        model.classifier = nn.Linear(
            model.classifier.in_features,
            2
        )

        original_conv = model.features.conv0

        # Three RGB channels + age + sex = five channels
        model.features.conv0 = nn.Conv2d(
            in_channels=5,
            out_channels=original_conv.out_channels,
            kernel_size=original_conv.kernel_size,
            stride=original_conv.stride,
            padding=original_conv.padding,
            bias=False
        )

        # --------------------------------------------------
        # 8. Load frozen model weights
        # --------------------------------------------------

        state_dict = torch.load(
            self.checkpoint_path,
            map_location="cpu",
            weights_only=True
        )

        model.load_state_dict(
            state_dict,
            strict=True
        )

        self.model = model.to(
            self.device
        ).eval()

    # ------------------------------------------------------
    # 9. Single-patient multimodal inference
    # ------------------------------------------------------

    def predict(self, image_path, age, sex):

        image_path = Path(image_path)

        if not image_path.is_file():
            raise FileNotFoundError(
                f"Chest X-ray not found: {image_path}"
            )

        try:
            age = float(age)
        except (TypeError, ValueError):
            raise ValueError(
                "Age must be numeric."
            ) from None

        if not math.isfinite(age) or not (
            0 <= age <= 120
        ):
            raise ValueError(
                "Age must be between 0 and 120."
            )

        if sex not in self.sex_encoding:
            raise ValueError(
                "Sex must be 'Male' or 'Female'."
            )

        # --------------------------------------------------
        # 10. Preprocess chest X-ray
        # --------------------------------------------------

        image = preprocess_tb_image(
            str(image_path)
        )

        image_tensor = self.transform(
            image
        )

        # --------------------------------------------------
        # 11. Normalize metadata using TRAINING statistics
        # --------------------------------------------------

        age_normalized = (
            age - self.age_mean
        ) / self.age_std

        sex_encoded = float(
            self.sex_encoding[sex]
        )

        metadata = torch.tensor(
            [age_normalized, sex_encoded],
            dtype=torch.float32
        )

        # --------------------------------------------------
        # 12. Construct five-channel early-fusion input
        # --------------------------------------------------

        metadata_channels = (
            metadata[:, None, None]
            .expand(
                2,
                image_tensor.shape[1],
                image_tensor.shape[2]
            )
        )

        fused_tensor = torch.cat(
            [
                image_tensor,
                metadata_channels
            ],
            dim=0
        ).unsqueeze(0)

        fused_tensor = fused_tensor.to(
            self.device
        )

        # --------------------------------------------------
        # 13. Run inference
        # --------------------------------------------------

        with torch.inference_mode():

            logits = self.model(
                fused_tensor
            )

            tb_score = torch.softmax(
                logits.float(),
                dim=1
            )[0, 1].item()

        screening_flag = bool(
            tb_score >= self.threshold
        )

        # --------------------------------------------------
        # 14. Return research screening result
        # --------------------------------------------------

        return {
            "model": "TB Early-Fusion DenseNet-121",

            "tb_score_uncalibrated": float(
                tb_score
            ),

            "screening_threshold": float(
                self.threshold
            ),

            "screening_flag": screening_flag,

            "screening_result": (
                "TB screening flag"
                if screening_flag
                else "No TB screening flag"
            ),

            "disclaimer": (
                "Research prototype only. "
                "Not a clinical diagnosis. "
                "The TB score is uncalibrated "
                "and is not a clinical disease probability."
            )
        }
