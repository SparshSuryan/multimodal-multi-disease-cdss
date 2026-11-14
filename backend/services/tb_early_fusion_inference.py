
import json
import sys
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from torchvision.models import densenet121


class TBEarlyFusionPredictor:
    """
    Research-only TB screening predictor.

    Inputs:
        Chest X-ray image, age, sex

    Output:
        Uncalibrated softmax score and screening flag.

    This model is not clinically validated and must not
    be used as an autonomous diagnostic system.
    """

    def __init__(
        self,
        config_path,
        device=None
    ):
        self.config_path = Path(config_path).resolve()

        if not self.config_path.is_file():
            raise FileNotFoundError(
                f"Missing configuration: {self.config_path}"
            )

        with open(self.config_path, "r") as f:
            self.config = json.load(f)

        self.device = torch.device(
            device or (
                "cuda" if torch.cuda.is_available()
                else "cpu"
            )
        )

        checkpoint_path = Path(
            self.config["checkpoint"]
        )

        if not checkpoint_path.is_file():
            raise FileNotFoundError(
                f"Missing checkpoint: {checkpoint_path}"
            )

        self.threshold = float(
            self.config["screening_threshold"]
        )

        self.age_mean = float(
            self.config["age_mean"]
        )

        self.age_std = float(
            self.config["age_std"]
        )

        if self.age_std <= 0:
            raise ValueError(
                "Invalid age normalization statistics."
            )

        self.sex_encoding = self.config[
            "sex_encoding"
        ]

        # Preprocessing module created during TB preparation.
        outputs_dir = self.config_path.parent.parent

        if str(outputs_dir) not in sys.path:
            sys.path.insert(0, str(outputs_dir))

        from tb_preprocessing import preprocess_tb_image

        self.preprocess_tb_image = preprocess_tb_image

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

        # Reconstruct the exact 5-channel architecture.
        model = densenet121(weights=None)

        model.classifier = nn.Linear(
            model.classifier.in_features,
            2
        )

        original_conv = model.features.conv0

        model.features.conv0 = nn.Conv2d(
            in_channels=5,
            out_channels=original_conv.out_channels,
            kernel_size=original_conv.kernel_size,
            stride=original_conv.stride,
            padding=original_conv.padding,
            bias=False
        )

        state_dict = torch.load(
            checkpoint_path,
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

    def predict(
        self,
        image_path,
        age,
        sex
    ):
        image_path = Path(image_path)

        if not image_path.is_file():
            raise FileNotFoundError(
                f"Image not found: {image_path}"
            )

        try:
            age = float(age)
        except (TypeError, ValueError):
            raise ValueError(
                "Age must be numeric."
            )

        import math

        if not math.isfinite(age) or not (0 <= age <= 120):
            raise ValueError(
                "Age must be between 0 and 120."
            )

        if sex not in self.sex_encoding:
            raise ValueError(
                "Sex must be 'Male' or 'Female'."
            )

        image = self.preprocess_tb_image(
            str(image_path)
        )

        image_tensor = self.transform(
            image
        )

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

        metadata_channels = (
            metadata[:, None, None]
            .expand(
                2,
                image_tensor.shape[1],
                image_tensor.shape[2]
            )
        )

        fused_tensor = torch.cat(
            [image_tensor, metadata_channels],
            dim=0
        ).unsqueeze(0)

        fused_tensor = fused_tensor.to(
            self.device
        )

        with torch.inference_mode():
            logits = self.model(
                fused_tensor
            )

            tb_score = torch.softmax(
                logits.float(),
                dim=1
            )[0, 1].item()

        screening_flag = (
            tb_score >= self.threshold
        )

        return {
            "model": "TB Early-Fusion DenseNet-121",
            "tb_score_uncalibrated": float(tb_score),
            "screening_threshold": self.threshold,
            "screening_flag": bool(screening_flag),
            "screening_result": (
                "TB screening flag"
                if screening_flag
                else "No TB screening flag"
            ),
            "disclaimer": (
                "Research prototype only. "
                "Not a clinical diagnosis."
            )
        }
