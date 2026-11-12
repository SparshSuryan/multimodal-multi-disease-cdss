import os
import json
import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import shap
from transformers import AutoTokenizer, AutoModelForSequenceClassification


# --- 1. 1D Residual CNN Definition (Matches Notebook 02 Exactly) ---
class Block(nn.Module):
    def __init__(self, cin, cout, k=7, stride=1):
        super().__init__()
        self.conv1 = nn.Conv1d(cin, cout, k, stride=stride, padding=k // 2, bias=False)
        self.bn1 = nn.BatchNorm1d(cout)
        self.conv2 = nn.Conv1d(cout, cout, k, padding=k // 2, bias=False)
        self.bn2 = nn.BatchNorm1d(cout)
        self.short = (
            nn.Sequential(nn.Conv1d(cin, cout, 1, stride=stride, bias=False), nn.BatchNorm1d(cout))
            if (cin != cout or stride != 1)
            else nn.Identity()
        )
        self.act = nn.ReLU()

    def forward(self, x):
        o = self.act(self.bn1(self.conv1(x)))
        o = self.bn2(self.conv2(o))
        return self.act(o + self.short(x))


class ECGNet(nn.Module):
    def __init__(self, n_classes=5, n_meta=2, width=32, drop=0.3):
        super().__init__()
        self.n_meta = n_meta
        self.stem = nn.Sequential(
            nn.Conv1d(12, width, 15, padding=7, bias=False),
            nn.BatchNorm1d(width),
            nn.ReLU(),
        )
        self.layers = nn.Sequential(
            Block(width, width),
            Block(width, width * 2, stride=2),
            Block(width * 2, width * 4, stride=2),
            Block(width * 4, width * 8, stride=2),
        )
        feat = width * 8 * 2
        if n_meta:
            self.meta = nn.Sequential(nn.Linear(n_meta, 16), nn.ReLU())
            feat += 16
        self.head = nn.Sequential(
            nn.Dropout(drop),
            nn.Linear(feat, 64),
            nn.ReLU(),
            nn.Dropout(drop),
            nn.Linear(64, n_classes),
        )

    def forward(self, x, m=None):
        h = self.layers(self.stem(x))
        h = torch.cat([h.mean(-1), h.amax(-1)], dim=1)
        if self.n_meta:
            h = torch.cat([h, self.meta(m)], dim=1)
        return self.head(h)


def _logit(p: float) -> float:
    p = float(np.clip(p, 1e-4, 1.0 - 1e-4))
    return float(np.log(p / (1.0 - p)))


def _sigmoid(z: float) -> float:
    return float(1.0 / (1.0 + np.exp(-np.clip(z, -30.0, 30.0))))


class CVDInferenceService:
    """Loads calibrated ECG, Clinical Tabular, and Bio_ClinicalBERT models once at app startup."""

    FRIENDLY = {
        "age": "Age", "sex": "Sex (1 = male)", "trestbps": "Resting blood pressure", "chol": "Cholesterol",
        "fbs": "Fasting blood sugar > 120", "thalach": "Max heart rate achieved", "exang": "Exercise-induced angina",
        "oldpeak": "ST depression on exercise", "ca": "Major vessels coloured (0-3)",
        "cp_1.0": "Chest pain: typical angina", "cp_2.0": "Chest pain: atypical angina",
        "cp_3.0": "Chest pain: non-anginal", "cp_4.0": "Chest pain: asymptomatic",
        "restecg_0.0": "Resting ECG: normal", "restecg_1.0": "Resting ECG: ST-T abnormality",
        "restecg_2.0": "Resting ECG: LV hypertrophy",
        "slope_1.0": "ST slope: upsloping", "slope_2.0": "ST slope: flat", "slope_3.0": "ST slope: downsloping",
        "thal_3.0": "Thalassemia: normal", "thal_6.0": "Thalassemia: fixed defect",
        "thal_7.0": "Thalassemia: reversible defect",
    }

    MISSING_TO_TEST = {
        "chol": "Fasting lipid profile (cholesterol)",
        "trestbps": "Resting blood pressure measurement",
        "fbs": "Fasting blood glucose",
        "restecg": "Resting 12-lead ECG",
        "thalach": "Exercise stress test (heart rate response)",
        "exang": "Exercise stress test (exercise-induced angina)",
        "oldpeak": "Exercise stress test (ST depression)",
        "slope": "Exercise stress test (ST slope)",
        "ca": "Coronary imaging (CT angiography or fluoroscopy)",
        "thal": "Nuclear stress imaging (thallium scan)",
    }

    ECG_CLASS_TO_TEST = {
        "MI": "Cardiac troponin and echocardiogram",
        "STTC": "Exercise stress test or echocardiogram",
        "CD": "Ambulatory (Holter) ECG monitoring",
        "HYP": "Echocardiogram and blood pressure review",
    }

    def __init__(self, model_dir: str, device: str | None = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        # 1. Load Tabular Bundle (Notebook 03)
        tab_bundle = joblib.load(os.path.join(model_dir, "uci_heart_models.joblib"))
        self.tab_cal = tab_bundle["model"]
        self.features = tab_bundle["features"]
        self.best_tab_name = tab_bundle["best"]
        best_pipe = tab_bundle["raw_models"][self.best_tab_name]
        self.prep = best_pipe.named_steps["prep"]
        self.clf = best_pipe.named_steps["clf"]

        if self.best_tab_name in ("XGBoost", "RandomForest"):
            self.explainer = shap.TreeExplainer(self.clf)
        else:
            self.explainer = shap.LinearExplainer(self.clf, tab_bundle["Xtr_background"])

        self.raw_names = [
            n.replace("num__imp__", "").replace("num__", "").replace("cat__", "").replace("missingindicator_", "missing: ")
            for n in self.prep.get_feature_names_out()
        ]
        self.labels = [self.FRIENDLY.get(n, n) for n in self.raw_names]

        # 2. Load Calibrated ECGNet Bundle (Notebook 02)
        ecg_ckpt = torch.load(os.path.join(model_dir, "ecg_meta_seed42.pt"), map_location=self.device, weights_only=False)
        self.ecg_classes = [str(c) for c in ecg_ckpt["classes"]]
        self.ecg_mean = np.asarray(ecg_ckpt["signal_mean"], dtype=np.float32)  # (1, 12)
        self.ecg_std = np.asarray(ecg_ckpt["signal_std"], dtype=np.float32)    # (1, 12)
        self.age_median = float(ecg_ckpt["age_median"])
        self.sex_mode = float(ecg_ckpt["sex_mode"])
        self.ecg_cal_params = ecg_ckpt["cal_params"]

        self.ecg_model = ECGNet(n_classes=len(self.ecg_classes), n_meta=int(ecg_ckpt["n_meta"])).to(self.device)
        self.ecg_model.load_state_dict(ecg_ckpt["state_dict"])
        self.ecg_model.eval()

        # 3. Load Calibrated Bio_ClinicalBERT Text Encoder (Notebook 06)
        text_dir = os.path.join(model_dir, "clinical_nlp_encoder")
        with open(os.path.join(text_dir, "nlp_meta.json"), "r") as f:
            nlp_meta = json.load(f)
        self.nlp_max_len = int(nlp_meta["max_len"])
        self.nlp_cal_params = nlp_meta["cal_params"]
        self.tokenizer = AutoTokenizer.from_pretrained(text_dir)
        self.nlp_model = AutoModelForSequenceClassification.from_pretrained(text_dir).to(self.device)
        self.nlp_model.eval()

    @torch.no_grad()
    def _predict_ecg(self, ecg_signal: np.ndarray, age: float | None, sex: float | None) -> dict[str, float]:
        """ecg_signal shape: (1000, 12) at 100 Hz."""
        sig = np.asarray(ecg_signal, dtype=np.float32)
        if sig.shape == (12, 1000):
            sig = sig.T
        assert sig.shape == (1000, 12), f"Expected ECG shape (1000, 12), got {sig.shape}"

        norm_sig = ((sig - self.ecg_mean) / self.ecg_std).T[None, :, :]  # (1, 12, 1000)
        a = self.age_median if (age is None or np.isnan(age)) else float(age)
        sx = self.sex_mode if (sex is None or np.isnan(sex)) else float(sex)
        meta_arr = np.array([[a / 100.0, sx]], dtype=np.float32)

        xt = torch.tensor(norm_sig, device=self.device)
        mt = torch.tensor(meta_arr, device=self.device)
        logits = self.ecg_model(xt, mt).cpu().numpy()[0]

        probs = {}
        for j, c in enumerate(self.ecg_classes):
            cp = self.ecg_cal_params[j]
            z = cp["coef"] * float(logits[j]) + cp["intercept"]
            probs[c] = _sigmoid(z)
        return probs

    @torch.no_grad()
    def _predict_text(self, report_text: str) -> dict[str, float]:
        enc = self.tokenizer(
            [report_text.strip()],
            truncation=True,
            padding="max_length",
            max_length=self.nlp_max_len,
            return_tensors="pt",
        )
        logits = self.nlp_model(
            input_ids=enc["input_ids"].to(self.device),
            attention_mask=enc["attention_mask"].to(self.device),
        ).logits.cpu().numpy()[0]

        probs = {}
        for j, c in enumerate(self.ecg_classes):
            cp = self.nlp_cal_params[j]
            z = cp["coef"] * float(logits[j]) + cp["intercept"]
            probs[c] = _sigmoid(z)
        return probs

    def _tab_shap(self, row_df: pd.DataFrame, top_k: int = 4) -> list[dict]:
        xt = self.prep.transform(row_df[self.features])
        xt = xt.toarray() if hasattr(xt, "toarray") else np.asarray(xt)
        raw_sv = self.explainer.shap_values(xt)
        if isinstance(raw_sv, list):
            sv = raw_sv[1][0]
        elif raw_sv.ndim == 3:
            sv = raw_sv[0, :, 1]
        else:
            sv = raw_sv[0]

        out = []
        for j in np.argsort(-np.abs(sv))[:top_k]:
            n = self.raw_names[j]
            col = n if n in self.features else (n.replace("missing: ", "") if n.startswith("missing: ") else n.split("_")[0])
            v = row_df[col].iloc[0] if col in self.features else np.nan
            out.append({
                "feature": self.labels[j],
                "value": None if pd.isna(v) else float(v),
                "shap": round(float(sv[j]), 3),
                "direction": "raises risk" if sv[j] > 0 else "lowers risk",
            })
        return out

    def predict(
        self,
        clinical_data: dict,
        ecg_signal: np.ndarray | None = None,
        report_text: str | None = None,
        conflict_margin: float = 0.10,
    ) -> dict:
        row_df = pd.DataFrame([{f: clinical_data.get(f, np.nan) for f in self.features}], columns=self.features).astype(float)
        miss = [c for c in self.features if pd.isna(row_df[c].iloc[0])]

        # 1. Clinical Tabular Risk (always active, handles partial/all-NaN gracefully)
        pt = float(np.clip(self.tab_cal.predict_proba(row_df)[:, 1][0], 1e-4, 1.0 - 1e-4))
        active_probs = {"clinical": pt}
        logits_sum = _logit(pt)

        # 2. Optional 12-Lead ECG Signal
        ecg_probs = None
        if ecg_signal is not None:
            ecg_probs = self._predict_ecg(ecg_signal, clinical_data.get("age"), clinical_data.get("sex"))
            pe = float(np.clip(1.0 - ecg_probs["NORM"], 1e-4, 1.0 - 1e-4))
            active_probs["ecg_abnormal"] = pe
            logits_sum += _logit(pe)
        else:
            miss.append("ecg_12lead_signal")

        # 3. Optional Clinical Report Text
        text_probs = None
        if report_text and report_text.strip():
            text_probs = self._predict_text(report_text)
            px = float(np.clip(1.0 - text_probs["NORM"], 1e-4, 1.0 - 1e-4))
            active_probs["report_text_abnormal"] = px
            logits_sum += _logit(px)
        else:
            miss.append("clinical_report_text")

        pf = _sigmoid(logits_sum)

        # 4. Pairwise Cross-Modal Conflict Detection
        conflicts = []
        mod_items = list(active_probs.items())
        for i in range(len(mod_items)):
            for k in range(i + 1, len(mod_items)):
                m1, p1 = mod_items[i]
                m2, p2 = mod_items[k]
                if (p1 >= 0.5 + conflict_margin and p2 <= 0.5 - conflict_margin) or (
                    p2 >= 0.5 + conflict_margin and p1 <= 0.5 - conflict_margin
                ):
                    conflicts.append({
                        "type": "modality_disagreement",
                        "detail": f"{m1} risk ({p1:.2f}) disagrees with {m2} risk ({p2:.2f})",
                    })

        # 5. Reliability Score & Reasons
        max_dis = max((abs(a - b) for _, a in mod_items for _, b in mod_items), default=0.25)
        tab_miss_frac = sum(1 for f in self.features if pd.isna(row_df[f].iloc[0])) / len(self.features)
        unc = 1.0 - abs(2.0 * pf - 1.0)
        rel_score = float(np.clip(1.0 - (0.4 * max_dis + 0.3 * tab_miss_frac + 0.3 * unc), 0.0, 1.0))
        rel_level = "High" if rel_score >= 0.7 else ("Moderate" if rel_score >= 0.5 else "Low")

        reasons = []
        if conflicts:
            reasons.append("Available modalities point in opposite diagnostic directions")
        if tab_miss_frac > 0.3:
            reasons.append(f"{int(round(tab_miss_frac * len(self.features)))} of {len(self.features)} clinical inputs are missing")
        if unc > 0.6:
            reasons.append("Combined risk estimate is close to 0.5")
        if not reasons:
            reasons.append("Active modalities agree and clinical inputs are largely complete")

        # 6. Rule-Based Investigation Suggestions
        suggestions = []
        if conflicts:
            suggestions.append({
                "test": "Clinician review, repeat 12-lead ECG and recent cardiac labs",
                "reason": "Cross-modal disagreement detected",
            })
        if ecg_probs:
            for c, test in self.ECG_CLASS_TO_TEST.items():
                if ecg_probs.get(c, 0.0) >= 0.5:
                    suggestions.append({"test": test, "reason": f"ECG model flags {c} (p={ecg_probs[c]:.2f})"})
        seen_stress = False
        for col in miss:
            t = self.MISSING_TO_TEST.get(col)
            if not t:
                continue
            if t.startswith("Exercise stress test"):
                if seen_stress:
                    continue
                seen_stress = True
                t = "Exercise stress test (heart rate, angina, ST changes)"
            suggestions.append({"test": t, "reason": f"{col} not available"})

        uniq_sugg, seen_names = [], set()
        for s_item in suggestions:
            if s_item["test"] not in seen_names:
                uniq_sugg.append(s_item)
                seen_names.add(s_item["test"])

        explanation = {
            "clinical_top_factors": self._tab_shap(row_df),
            "risk_components": {k: round(v, 3) for k, v in active_probs.items()},
        }
        if ecg_probs:
            explanation["ecg_class_probabilities"] = {k: round(v, 3) for k, v in ecg_probs.items()}
        if text_probs:
            explanation["text_class_probabilities"] = {k: round(v, 3) for k, v in text_probs.items()}

        return {
            "disease": "cvd",
            "risk": round(pf, 3),
            "reliability": rel_level,
            "reliability_score": round(rel_score, 3),
            "reliability_reasons": reasons,
            "missing_inputs": miss,
            "conflicts": conflicts,
            "suggested_investigations": uniq_sugg[:5],
            "explanation": explanation,
            "similar_cases": [],
            "disclaimer": "Decision support only. Not a diagnosis. Suggestions are rule-based and need clinician review.",
        }