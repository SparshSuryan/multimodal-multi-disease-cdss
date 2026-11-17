import React, { useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  Droplets,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";
import { CKD_GROUPS, CKD_KEYS, CVD_GROUPS, CVD_KEYS, PATIENT_FIELDS } from "./fieldDefs";

// Demonstration patient presets. Empty strings represent unmeasured values.
const PRESETS = [
  {
    id: "highRiskCvd",
    label: "High-Risk Cardiac Case",
    patient: { age: 62, sex: 1 },
    cvd: { cp: 4, trestbps: 165, chol: 286, fbs: 1, restecg: 2, thalach: 108, exang: 1, oldpeak: 2.8, slope: 2, ca: 2, thal: 7 },
    ckd: { bp: 95, sg: 1.02, al: 0, su: 0, bgr: 135, bu: 24, sc: 1.0, sod: 139, pot: 4.3, hemo: 14.5, pcv: 44, wc: 7800, rc: 5.0, htn: 1, dm: 0, cad: 1, appet: 0, pe: 0, ane: 0 },
    reportText: "Sinus rhythm with anterior ST-T depression suggestive of myocardial ischemia.",
  },
  {
    id: "highRiskCkd",
    label: "Advanced Renal & Anemia",
    patient: { age: 58, sex: 0 },
    cvd: { cp: 3, trestbps: 142, chol: 210, fbs: 1, restecg: 0, thalach: 138, exang: 0, oldpeak: 0.4, slope: 1, ca: 0, thal: 3 },
    ckd: { bp: 90, sg: 1.01, al: 4, su: 2, bgr: 215, bu: 88, sc: 4.8, sod: 131, pot: 5.4, hemo: 8.4, pcv: 25, wc: 9400, rc: 3.1, htn: 1, dm: 1, cad: 0, appet: 1, pe: 1, ane: 1 },
    reportText: "Normal sinus rhythm, no acute ischemic ST-T changes.",
  },
  {
    id: "incompleteLabs",
    label: "Primary Clinic Partial Intake",
    patient: { age: 54, sex: 1 },
    cvd: { cp: 2, trestbps: 138, chol: "", fbs: "", restecg: 0, thalach: "", exang: "", oldpeak: "", slope: "", ca: "", thal: "" },
    ckd: { bp: 85, sg: "", al: "", su: "", bgr: 118, bu: "", sc: 1.4, sod: "", pot: "", hemo: 11.2, pcv: "", wc: "", rc: "", htn: 1, dm: 0, cad: 0, appet: 0, pe: 1, ane: 0 },
    reportText: "",
  },
];

const blank = (keys) => Object.fromEntries(keys.map((k) => [k, ""]));
const withDefaults = (keys, values) => ({ ...blank(keys), ...values });

const isFilled = (v) => v !== "" && v !== null && v !== undefined;
const toNumberOrNull = (v) => (isFilled(v) ? Number(v) : null);
const cleanNumbers = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toNumberOrNull(v)]));

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-all " +
  "placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-600/15";

const SECTION_THEMES = {
  patient: {
    border: "border-slate-200/90 border-l-4 border-l-slate-700",
    headerBg: "bg-slate-50/80 hover:bg-slate-100/70",
    iconWrap: "bg-slate-800 text-white",
    badge: "bg-slate-200/80 text-slate-800",
  },
  cardiac: {
    border: "border-blue-200/80 border-l-4 border-l-blue-600",
    headerBg: "bg-blue-50/50 hover:bg-blue-50/90",
    iconWrap: "bg-blue-600 text-white",
    badge: "bg-blue-100 text-blue-800",
  },
  renal: {
    border: "border-indigo-200/80 border-l-4 border-l-indigo-600",
    headerBg: "bg-indigo-50/50 hover:bg-indigo-50/90",
    iconWrap: "bg-indigo-600 text-white",
    badge: "bg-indigo-100 text-indigo-800",
  },
  notes: {
    border: "border-sky-200/80 border-l-4 border-l-sky-600",
    headerBg: "bg-sky-50/50 hover:bg-sky-50/90",
    iconWrap: "bg-sky-600 text-white",
    badge: "bg-sky-100 text-sky-800",
  },
};

function Field({ def, value, onChange }) {
  const id = `field-${def.key}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-slate-700">
        {def.label}
        {def.unit && <span className="font-normal text-slate-400"> ({def.unit})</span>}
      </label>
      {def.options ? (
        <select
          id={id}
          value={isFilled(value) ? String(value) : ""}
          onChange={(e) => onChange(def.key, e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">Not measured</option>
          {def.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={def.min}
          max={def.max}
          step={def.step ?? "any"}
          value={isFilled(value) ? value : ""}
          onChange={(e) => onChange(def.key, e.target.value)}
          placeholder="Enter value"
          className={INPUT_CLASS}
        />
      )}
    </div>
  );
}

function FieldGrid({ fields, values, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map((def) => (
        <Field key={def.key} def={def} value={values[def.key]} onChange={onChange} />
      ))}
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, themeKey = "patient", filled, total, children, defaultOpen = true }) {
  const theme = SECTION_THEMES[themeKey] || SECTION_THEMES.patient;
  return (
    <details
      open={defaultOpen}
      className={`group overflow-hidden rounded-2xl border bg-white shadow-xs transition-shadow hover:shadow-sm ${theme.border}`}
    >
      <summary className={`flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 transition-colors ${theme.headerBg}`}>
        <div className="flex items-center gap-3">
          {Icon && (
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-2xs ${theme.iconWrap}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <div>
            <h3
              className="text-sm font-bold text-slate-900"
              style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
            >
              {title}
            </h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {total > 0 && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${
                filled === total && total > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : filled > 0
                  ? theme.badge
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {filled} / {total}
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
        </div>
      </summary>
      <div className="space-y-5 border-t border-slate-100 bg-white px-5 py-4">{children}</div>
    </details>
  );
}

function SubGroup({ title, children }) {
  return (
    <div className="space-y-3 rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      {children}
    </div>
  );
}

export default function ClinicalInputForm({ onSubmit, loading = false }) {
  // Default to clean empty fields for direct clinician keyboard entry
  const [activePresetId, setActivePresetId] = useState(null);
  const [patient, setPatient] = useState(() => blank(["age", "sex"]));
  const [cvd, setCvd] = useState(() => blank(CVD_KEYS));
  const [ckd, setCkd] = useState(() => blank(CKD_KEYS));
  const [reportText, setReportText] = useState("");

  const applyPreset = (preset) => {
    setActivePresetId(preset.id);
    setPatient(withDefaults(["age", "sex"], preset.patient));
    setCvd(withDefaults(CVD_KEYS, preset.cvd));
    setCkd(withDefaults(CKD_KEYS, preset.ckd));
    setReportText(preset.reportText);
  };

  const clearAll = () => {
    setActivePresetId(null);
    setPatient(blank(["age", "sex"]));
    setCvd(blank(CVD_KEYS));
    setCkd(blank(CKD_KEYS));
    setReportText("");
  };

  const setField = (setter) => (key, val) => {
    setActivePresetId(null);
    setter((prev) => ({ ...prev, [key]: val }));
  };

  const counts = useMemo(
    () => ({
      patient: PATIENT_FIELDS.filter((f) => isFilled(patient[f.key])).length,
      cvd: CVD_KEYS.filter((k) => isFilled(cvd[k])).length,
      ckd: CKD_KEYS.filter((k) => isFilled(ckd[k])).length,
    }),
    [patient, cvd, ckd]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const age = toNumberOrNull(patient.age);
    onSubmit({
      cvd_inputs: { ...cleanNumbers(cvd), age, sex: toNumberOrNull(patient.sex) },
      ckd_inputs: { ...cleanNumbers(ckd), age },
      report_text: reportText.trim() || null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm"
    >
      {/* Form Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
            Patient Intake &amp; Vitals
          </span>
          <h2
            className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            Clinical Assessment Form
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter available clinical vitals and laboratory values directly, or select a sample case below for demonstration.
          </p>
        </div>
      </div>

      {/* Demonstration Presets Bar */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/40 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            <span>Sample Clinical Cases:</span>
          </div>
          {activePresetId && (
            <span className="text-[11px] font-medium text-blue-700">
              Sample loaded! Edit any value freely.
            </span>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 border ${
                  isSelected
                    ? "bg-gradient-to-r from-[#0B183B] to-blue-700 border-blue-700 text-white shadow-sm ring-2 ring-blue-500/20"
                    : "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-900"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Patient Demographics */}
      <Section
        title="Patient Demographics"
        subtitle="Baseline age and biological sex"
        icon={User}
        themeKey="patient"
        filled={counts.patient}
        total={PATIENT_FIELDS.length}
      >
        <FieldGrid fields={PATIENT_FIELDS} values={patient} onChange={setField(setPatient)} />
      </Section>

      {/* 2. Cardiovascular Panel */}
      <Section
        title="Cardiovascular Vitals & ECG Markers"
        subtitle="Chest pain presentation, blood pressure, lipids, and exercise ECG findings"
        icon={Activity}
        themeKey="cardiac"
        filled={counts.cvd}
        total={CVD_KEYS.length}
      >
        {CVD_GROUPS.map((group) => (
          <SubGroup key={group.title} title={group.title}>
            <FieldGrid fields={group.fields} values={cvd} onChange={setField(setCvd)} />
          </SubGroup>
        ))}
      </Section>

      {/* 3. Renal & Metabolic Panel */}
      <Section
        title="Renal & Metabolic Laboratory Panel"
        subtitle="Serum electrolytes, kidney function markers, urinalysis, and medical history"
        icon={Droplets}
        themeKey="renal"
        filled={counts.ckd}
        total={CKD_KEYS.length}
      >
        {CKD_GROUPS.map((group) => (
          <SubGroup key={group.title} title={group.title}>
            <FieldGrid fields={group.fields} values={ckd} onChange={setField(setCkd)} />
          </SubGroup>
        ))}
      </Section>

      {/* 4. Clinical & ECG Notes */}
      <Section
        title="Clinical Notes & ECG Interpretation"
        subtitle="Optional physician notes, discharge summary, or cardiologist ECG impression"
        icon={FileText}
        themeKey="notes"
        filled={reportText.trim() ? 1 : 0}
        total={1}
      >
        <label htmlFor="report-text" className="sr-only">
          Clinical or ECG interpretation notes
        </label>
        <textarea
          id="report-text"
          rows={3}
          value={reportText}
          onChange={(e) => {
            setActivePresetId(null);
            setReportText(e.target.value);
          }}
          placeholder="Enter cardiologist ECG findings, presenting symptoms, or clinical summary..."
          className={INPUT_CLASS}
        />
      </Section>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
        <p className="max-w-sm text-[11px] leading-relaxed text-slate-500">
          Clinical decision support aid only. Final diagnosis and treatment remain with the attending physician.
        </p>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={clearAll}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-300 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset Form
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0B183B] via-blue-800 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-950/20 transition hover:from-[#060B19] hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? "Evaluating Risk..." : "Evaluate Cardio-Renal Risk"}
          </button>
        </div>
      </div>
    </form>
  );
}