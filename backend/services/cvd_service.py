import os
import joblib
import numpy as np
import pandas as pd
import shap


class CKDInferenceService:
    """Loads calibrated CKD model, sub-modality models, and SHAP explainer once at app startup."""

    FRIENDLY = {
        "age": "Age (years)", "bp": "Blood pressure (diastolic, mmHg)", "sg": "Urine specific gravity",
        "al": "Urine albumin (0-5)", "su": "Urine sugar (0-5)", "rbc": "Red blood cells in urine",
        "pc": "Pus cells in urine", "pcc": "Pus cell clumps", "ba": "Bacteria in urine",
        "bgr": "Blood glucose random (mg/dL)", "bu": "Blood urea (mg/dL)", "sc": "Serum creatinine (mg/dL)",
        "sod": "Sodium (mEq/L)", "pot": "Potassium (mEq/L)", "hemo": "Hemoglobin (g/dL)",
        "pcv": "Packed cell volume (%)", "wc": "White blood cell count", "rc": "Red blood cell count",
        "htn": "Hypertension history", "dm": "Diabetes mellitus history", "cad": "Coronary artery disease",
        "appet": "Poor appetite", "pe": "Pedal edema", "ane": "Anemia",
    }

    MISSING_TO_TEST = {
        "sc": "Serum creatinine & estimated GFR (eGFR)",
        "bu": "Blood urea nitrogen (BUN) panel",
        "al": "Urine dipstick & albumin-to-creatinine ratio (uACR)",
        "sg": "Urinalysis (specific gravity & microscopy)",
        "hemo": "Complete blood count (hemoglobin & PCV)",
        "pcv": "Complete blood count (hemoglobin & PCV)",
        "bgr": "Fasting / random blood glucose & HbA1c",
        "sod": "Serum electrolytes (sodium & potassium)",
        "pot": "Serum electrolytes (sodium & potassium)",
        "bp": "Resting blood pressure measurement",
    }

    def __init__(self, model_dir: str):
        bundle = joblib.load(os.path.join(model_dir, "ckd_models.joblib"))
        self.cal_ckd = bundle["model"]
        self.lab_model = bundle["lab_model"]
        self.hist_model = bundle["hist_model"]
        self.best_name = bundle["best"]
        self.features = bundle["features"]
        self.lab_cols = bundle["lab_cols"]
        self.hist_cols = bundle["hist_cols"]

        best_pipe = bundle["raw_models"][self.best_name]
        self.prep = best_pipe.named_steps["prep"]
        self.clf = best_pipe.named_steps["clf"]
        self.feat_names = [
            n.replace("imp__", "").replace("missingindicator_", "missing: ")
            for n in self.prep.get_feature_names_out(self.features)
        ]
        self.labels = [self.FRIENDLY.get(n, n) for n in self.feat_names]

        if self.best_name in ("XGBoost", "RandomForest"):
            self.explainer = shap.TreeExplainer(self.clf)
        else:
            self.explainer = shap.LinearExplainer(self.clf, bundle["Xtr_background"])

    def _explain(self, row_df: pd.DataFrame, top_k: int = 4) -> list[dict]:
        xt = self.prep.transform(row_df[self.features])
        raw_s = self.explainer.shap_values(xt)
        if isinstance(raw_s, list):
            s = raw_s[1][0]
        elif raw_s.ndim == 3:
            s = raw_s[0, :, 1]
        else:
            s = raw_s[0]

        out = []
        for j in np.argsort(-np.abs(s))[:top_k]:
            n = self.feat_names[j]
            col = n.replace("missing: ", "") if n.startswith("missing: ") else n
            v = row_df[col].iloc[0] if col in self.features else np.nan
            out.append({
                "feature": self.labels[j],
                "value": None if pd.isna(v) else float(v),
                "shap": round(float(s[j]), 3),
                "direction": "raises risk" if s[j] > 0 else "lowers risk",
            })
        return out

    def predict(self, clinical_data: dict, conflict_margin: float = 0.10) -> dict:
        row = pd.DataFrame([{f: clinical_data.get(f, np.nan) for f in self.features}], columns=self.features).astype(float)
        pf = float(np.clip(self.cal_ckd.predict_proba(row)[:, 1][0], 1e-4, 1.0 - 1e-4))
        p_lab = float(np.clip(self.lab_model.predict_proba(row[self.lab_cols])[:, 1][0], 1e-4, 1.0 - 1e-4))
        p_hist = float(np.clip(self.hist_model.predict_proba(row[self.hist_cols])[:, 1][0], 1e-4, 1.0 - 1e-4))

        miss = [c for c in self.features if pd.isna(row[c].iloc[0])]
        has_labs = any(not pd.isna(row[c].iloc[0]) for c in self.lab_cols)
        has_hist = any(not pd.isna(row[c].iloc[0]) for c in self.hist_cols)

        conflict = bool(
            has_labs
            and has_hist
            and (
                (p_lab >= 0.5 + conflict_margin and p_hist <= 0.5 - conflict_margin)
                or (p_hist >= 0.5 + conflict_margin and p_lab <= 0.5 - conflict_margin)
            )
        )

        d = abs(p_lab - p_hist) if (has_labs and has_hist) else 0.25
        m = len(miss) / len(self.features)
        u = 1.0 - abs(2.0 * pf - 1.0)
        rel_score = float(np.clip(1.0 - (0.4 * d + 0.3 * m + 0.3 * u), 0.0, 1.0))
        rel_level = "High" if rel_score >= 0.7 else ("Moderate" if rel_score >= 0.5 else "Low")

        reasons = []
        if conflict:
            reasons.append("Laboratory markers and clinical history/symptoms point in opposite directions")
        if m > 0.3:
            reasons.append(f"{len(miss)} of {len(self.features)} renal/clinical inputs are missing")
        if u > 0.6:
            reasons.append("Predicted probability is close to 0.5")
        if not reasons:
            reasons.append("Laboratory markers and clinical history agree with high input completeness")

        suggestions = []
        if conflict:
            suggestions.append({
                "test": "Repeat renal function panel (eGFR, serum creatinine) and clinical review",
                "reason": "Laboratory markers and clinical history/symptoms disagree",
            })
        if pf >= 0.5:
            suggestions.append({
                "test": "Urine albumin-to-creatinine ratio (uACR) and renal ultrasound",
                "reason": f"Elevated CKD risk estimate ({pf:.2f})",
            })
        for col in miss:
            t = self.MISSING_TO_TEST.get(col)
            if t:
                suggestions.append({"test": t, "reason": f"{col} not available"})

        uniq_sugg, seen = [], set()
        for item in suggestions:
            if item["test"] not in seen:
                uniq_sugg.append(item)
                seen.add(item["test"])

        return {
            "disease": "ckd",
            "risk": round(pf, 3),
            "reliability": rel_level,
            "reliability_score": round(rel_score, 3),
            "reliability_reasons": reasons,
            "missing_inputs": miss,
            "conflicts": (
                [{"type": "lab_vs_history_disagreement",
                  "detail": f"Lab sub-model risk ({p_lab:.2f}) disagrees with clinical history risk ({p_hist:.2f})"}]
                if conflict
                else []
            ),
            "suggested_investigations": uniq_sugg[:5],
            "explanation": {
                "clinical_top_factors": self._explain(row),
                "risk_components": {"lab_panel": round(p_lab, 3), "history_symptoms": round(p_hist, 3)},
            },
            "similar_cases": [],
            "disclaimer": "Decision support only. Not a diagnosis. Suggestions are rule-based and need clinician review.",
        }