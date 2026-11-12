import React, { useState } from "react";

const PRESETS = {
  highRiskCvd: {
    label: "Preset: High-Risk CVD + Conflict",
    cvd: { age: 62, sex: 1, cp: 4, trestbps: 165, chol: 286, fbs: 1, restecg: 2, thalach: 108, exang: 1, oldpeak: 2.8, slope: 2, ca: 2, thal: 7 },
    ckd: { age: 62, bp: 95, sg: 1.020, al: 0, su: 0, bgr: 135, bu: 24, sc: 1.0, sod: 139, pot: 4.3, hemo: 14.5, pcv: 44, wc: 7800, rc: 5.0, htn: 1, dm: 0, cad: 1, appet: 0, pe: 0, ane: 0 },
    reportText: "Sinus rhythm with anterior ST-T depression suggestive of myocardial ischemia.",
  },
  highRiskCkd: {
    label: "Preset: Advanced CKD + Anemia",
    cvd: { age: 58, sex: 0, cp: 3, trestbps: 142, chol: 210, fbs: 1, restecg: 0, thalach: 138, exang: 0, oldpeak: 0.4, slope: 1, ca: 0, thal: 3 },
    ckd: { age: 58, bp: 90, sg: 1.010, al: 4, su: 2, bgr: 215, bu: 88, sc: 4.8, sod: 131, pot: 5.4, hemo: 8.4, pcv: 25, wc: 9400, rc: 3.1, htn: 1, dm: 1, cad: 0, appet: 1, pe: 1, ane: 1 },
    reportText: "Normal sinus rhythm, no acute ischemic ST-T changes.",
  },
  incompleteLabs: {
    label: "Preset: Incomplete Rural Clinic Intake",
    cvd: { age: 54, sex: 1, cp: 2, trestbps: 138, chol: "", fbs: "", restecg: 0, thalach: "", exang: "", oldpeak: "", slope: "", ca: "", thal: "" },
    ckd: { age: 54, bp: 85, sg: "", al: "", su: "", bgr: 118, bu: "", sc: 1.4, sod: "", pot: "", hemo: 11.2, pcv: "", wc: "", rc: "", htn: 1, dm: 0, cad: 0, appet: 0, pe: 1, ane: 0 },
    reportText: "",
  },
};

export default function ClinicalInputForm({ onSubmit, loading = false }) {
  const [cvd, setCvd] = useState(PRESETS.highRiskCvd.cvd);
  const [ckd, setCkd] = useState(PRESETS.highRiskCvd.ckd);
  const [reportText, setReportText] = useState(PRESETS.highRiskCvd.reportText);

  const applyPreset = (key) => {
    setCvd({ ...PRESETS[key].cvd });
    setCkd({ ...PRESETS[key].ckd });
    setReportText(PRESETS[key].reportText);
  };

  const toCleanNumbers = (obj) =>
    Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, v === "" || v === null ? null : Number(v)])
    );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      cvd_inputs: toCleanNumbers(cvd),
      ckd_inputs: toCleanNumbers(ckd),
      report_text: reportText.trim() || null,
    });
  };

  const updateField = (setter) => (key, val) =>
    setter((prev) => ({ ...prev, [key]: val }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Clinical Labs, History & Report Input</h2>
          <p className="text-xs text-slate-500">Leave unmeasured fields blank — missingness is tracked automatically.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([k, p]) => (
            <button
              key={k}
              type="button"
              onClick={() => applyPreset(k)}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cardiovascular Clinical Inputs */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Cardiovascular Panel (UCI Heart Schema)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            ["age", "Age (yrs)"], ["sex", "Sex (1=M, 0=F)"], ["cp", "Chest Pain (1-4)"],
            ["trestbps", "Resting BP (mmHg)"], ["chol", "Cholesterol (mg/dL)"], ["fbs", "Fasting BS >120 (0/1)"],
            ["restecg", "Resting ECG (0-2)"], ["thalach", "Max Heart Rate"], ["exang", "Exercise Angina (0/1)"],
            ["oldpeak", "ST Depression"], ["slope", "ST Slope (1-3)"], ["ca", "Major Vessels (0-3)"], ["thal", "Thal (3,6,7)"],
          ].map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">{label}</span>
              <input
                type="number"
                step="any"
                value={cvd[key] ?? ""}
                onChange={(e) => updateField(setCvd)(key, e.target.value)}
                placeholder="Missing"
                className="border border-slate-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Renal / CKD Clinical Inputs */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Renal & Metabolic Panel (CKD Schema)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            ["sc", "Serum Creatinine"], ["bu", "Blood Urea"], ["hemo", "Hemoglobin (g/dL)"],
            ["pcv", "Packed Cell Vol (%)"], ["sg", "Specific Gravity"], ["al", "Urine Albumin (0-5)"],
            ["su", "Urine Sugar (0-5)"], ["bgr", "Blood Glucose"], ["sod", "Sodium (mEq/L)"],
            ["pot", "Potassium (mEq/L)"], ["bp", "Diastolic BP"], ["htn", "Hypertension (0/1)"],
            ["dm", "Diabetes (0/1)"], ["cad", "CAD History (0/1)"], ["pe", "Pedal Edema (0/1)"], ["ane", "Anemia (0/1)"],
          ].map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">{label}</span>
              <input
                type="number"
                step="any"
                value={ckd[key] ?? ""}
                onChange={(e) => updateField(setCkd)(key, e.target.value)}
                placeholder="Missing"
                className="border border-slate-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Unstructured Clinical Report Text */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-1">
          Clinical / ECG Interpretation Notes (Bio_ClinicalBERT Input)
        </label>
        <textarea
          rows={3}
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          placeholder="Paste clinical summary or cardiologist ECG report text..."
          className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-amber-700 font-medium">
          Research Prototype — Decision Support Only. Final decision remains with the clinician.
        </span>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg shadow-sm"
        >
          {loading ? "Running Assessment..." : "Run Multi-Disease Assessment"}
        </button>
      </div>
    </form>
  );
}