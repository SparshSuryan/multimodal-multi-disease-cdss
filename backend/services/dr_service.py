REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DR_WEIGHTS_DIR = REPO_ROOT / "models" / "dr"

class DRInferenceService:
    def __init__(self, weights_dir: str | Path = DEFAULT_DR_WEIGHTS_DIR):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.weights_dir = Path(weights_dir)

import io
import base64
from pathlib import Path
from typing import Optional, Dict, Any

import cv2
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from torchvision.models import densenet121

from backend.services.dr_preprocessing import preprocess_dr_v2_bytes

DR_CLASS_NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative DR"]


class DRMultimodalFusionNet(nn.Module):
    def __init__(self, img_dim: int = 1024, meta_dim: int = 6, num_classes: int = 5):
        super().__init__()
        self.img_branch = nn.Sequential(
            nn.Linear(img_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.35),
        )
        self.meta_branch = nn.Sequential(
            nn.Linear(meta_dim, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.2),
        )
        self.fusion_head = nn.Sequential(
            nn.Linear(256 + 32, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes),
        )

    def forward(self, img_feat: torch.Tensor, meta_feat: torch.Tensor) -> torch.Tensor:
        return self.fusion_head(torch.cat([self.img_branch(img_feat), self.meta_branch(meta_feat)], dim=1))


class DRInferenceService:
    def __init__(self, weights_dir: str = "backend/weights/dr"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.weights_dir = Path(weights_dir)

        self.norm_transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        self.model = self._load_backbone(self.weights_dir / "dr_optimized_densenet121_best.pth")
        self.fusion_model = self._load_fusion(self.weights_dir / "dr_multimodal_fusion_best.pth")

    def _load_backbone(self, ckpt_path: Path) -> Optional[nn.Module]:
        if not ckpt_path.exists():
            return None
        model = densenet121(weights=None)
        model.classifier = nn.Linear(model.classifier.in_features, 5)
        model.load_state_dict(torch.load(ckpt_path, map_location=self.device, weights_only=True))
        return model.to(self.device).eval()

    def _load_fusion(self, ckpt_path: Path) -> Optional[nn.Module]:
        if not ckpt_path.exists():
            return None
        state = torch.load(ckpt_path, map_location=self.device, weights_only=True)
        meta_dim = state["meta_branch.0.weight"].shape[1]
        fusion = DRMultimodalFusionNet(img_dim=1024, meta_dim=meta_dim, num_classes=5)
        fusion.load_state_dict(state)
        return fusion.to(self.device).eval()

    def _encode_metadata(self, age: float, sex: str, diabetes_type: str, expected_dim: int) -> torch.Tensor:
        age_scaled = (float(age) - 55.0) / 15.0
        sex_norm = str(sex).strip().lower()
        sex_f = 1.0 if sex_norm in ("f", "female", "femme") else 0.0
        sex_m = 1.0 - sex_f

        dt_norm = str(diabetes_type).strip().lower()
        dt_t1 = 1.0 if "1" in dt_norm else 0.0
        dt_t2 = 1.0 if "2" in dt_norm else 0.0
        dt_other = 1.0 if (dt_t1 == 0.0 and dt_t2 == 0.0) else 0.0

        vec = [age_scaled, sex_f, sex_m, dt_t1, dt_t2, dt_other]
        if len(vec) < expected_dim:
            vec.extend([0.0] * (expected_dim - len(vec)))
        return torch.tensor([vec[:expected_dim]], dtype=torch.float32, device=self.device)

    def _generate_gradcam_base64(self, preprocessed_pil: Image.Image, target_class: int) -> str:
        activations, gradients = [], []

        def fwd_hook(_, __, out):
            activations.append(out.detach())

        def bwd_hook(_, __, grad_out):
            gradients.append(grad_out[0].detach())

        h1 = self.model.features.denseblock4.register_forward_hook(fwd_hook)
        h2 = self.model.features.denseblock4.register_full_backward_hook(bwd_hook)

        try:
            tensor = self.norm_transform(preprocessed_pil).unsqueeze(0).to(self.device)
            self.model.zero_grad()
            logits = self.model(tensor)
            logits[0, target_class].backward()

            weights = gradients[0].mean(dim=(2, 3), keepdim=True)
            cam = F.relu((weights * activations[0]).sum(dim=1, keepdim=True))
            cam = F.interpolate(cam, size=(224, 224), mode="bilinear", align_corners=False)
            cam_np = cam.squeeze().cpu().numpy()
            cam_np = (cam_np - cam_np.min()) / (cam_np.max() - cam_np.min() + 1e-8)

            heatmap = cv2.applyColorMap(np.uint8(255 * cam_np), cv2.COLORMAP_JET)
            heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
            overlay = np.uint8(0.60 * np.array(preprocessed_pil) + 0.40 * heatmap)

            buf = io.BytesIO()
            Image.fromarray(overlay).save(buf, format="PNG")
            return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"
        finally:
            h1.remove()
            h2.remove()

    def predict(
        self,
        image_bytes: bytes,
        age: Optional[float] = None,
        sex: Optional[str] = None,
        diabetes_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        if self.model is None:
            raise RuntimeError("DR checkpoint not found at backend/weights/dr/dr_optimized_densenet121_best.pth")

        pil_img = preprocess_dr_v2_bytes(image_bytes)
        tensor = self.norm_transform(pil_img).unsqueeze(0).to(self.device)

        use_fusion = (
            self.fusion_model is not None
            and age is not None
            and sex is not None
            and diabetes_type is not None
        )

        with torch.inference_mode():
            if use_fusion:
                feat_map = self.model.features(tensor)
                pooled = F.adaptive_avg_pool2d(F.relu(feat_map), (1, 1)).flatten(1)
                expected_dim = self.fusion_model.meta_branch[0].in_features
                meta_tensor = self._encode_metadata(age, sex, diabetes_type, expected_dim)
                logits = self.fusion_model(pooled, meta_tensor)
                model_used = "DenseNet-121 + Clinical Metadata (Multimodal Fusion)"
            else:
                logits = self.model(tensor)
                model_used = "DenseNet-121 Optimized (Label Smoothing 0.1)"

            probs = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

        pred_idx = int(np.argmax(probs))
        pred_label = DR_CLASS_NAMES[pred_idx]
        risk_prob = round(float(1.0 - probs[0]), 4)

        if pred_idx == 0:
            risk_level = "Low"
            recommendation = "No diabetic retinopathy detected. Routine annual retinal screening advised."
        elif pred_idx in (1, 2):
            risk_level = "Moderate"
            recommendation = f"{pred_label} detected. Schedule ophthalmology evaluation within 3–6 months."
        else:
            risk_level = "High"
            recommendation = f"Urgent referral required: {pred_label} detected. Immediate retinal specialist consultation advised."

        gradcam_uri = self._generate_gradcam_base64(pil_img, pred_idx)

        return {
            "disease": "Diabetic Retinopathy",
            "prediction": pred_label,
            "probability": risk_prob,
            "risk_level": risk_level,
            "confidence": round(float(probs[pred_idx]), 4),
            "model_used": model_used,
            "explanation": {
                "gradcam_overlay": gradcam_uri,
                "class_probabilities": {DR_CLASS_NAMES[i]: round(float(probs[i]), 4) for i in range(5)},
                "multimodal_active": use_fusion,
            },
            "recommendation": recommendation,
            "metadata_used": {
                "age": age,
                "sex": sex,
                "diabetes_type": diabetes_type,
                "preprocessing": "CLAHE(clip=1.5) + ContourCrop + 224x224 Lanczos",
            },
        }