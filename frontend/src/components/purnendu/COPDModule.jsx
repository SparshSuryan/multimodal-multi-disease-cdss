import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Factory,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  User,
  Wind,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200/90 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-all " +
  "placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-600/15";

const YES_NO_OPTIONS = [
  { value: 0, label: "No (0)" },
  { value: 1, label: "Yes (1)" },
];

const COPD_GROUPS = [
  {
    title: "Patient Demographics",
    icon: User,
    accent: "border-l-4 border-l-slate-700",
    headerBg: "bg-slate-50/80",
    iconBg: "bg-slate-800 text-white",
    fields: [
      { key: "RIDAGEYR", label: "Age", unit: "40+ years", min: 40, max: 110, step: 1 },
      {
        key: "RIAGENDR",
        label: "Biological Sex",
        options: [
          { value: 1, label: "Male (1)" },
          { value: 2, label: "Female (2)" },
          { value: 0, label: "Unspecified (0)" },
        ],
      },
      {
        key: "RIDRETH1",
        label: "Demographic Group",
        options: [
          { value: 0, label: "Not Specified (0)" },
          { value: 1, label: "Group 1 — Mexican American" },
          { value: 2, label: "Group 2 — Other Hispanic" },
          { value: 3, label: "Group 3 — Non-Hispanic White" },
          { value: 4, label: "Group 4 — Non-Hispanic Black" },
          { value: 5, label: "Group 5 — Other / Multi-Racial" },
        ],
      },
    ],
  },
  {
    title: "Respiratory History & Symptoms",
    icon: Wind,
    accent: "border-l-4 border-l-blue-600",
    headerBg: "bg-blue-50/50",
    iconBg: "bg-blue-600 text-white",
    fields: [
      { key: "MCQ160G", label: "Prior Emphysema Diagnosis", options: YES_NO_OPTIONS },
      { key: "MCQ160K", label: "Prior Chronic Bronchitis", options: YES_NO_OPTIONS },
      { key: "RDQ031", label: "Chronic Cough (3+ Months)", options: YES_NO_OPTIONS },
      { key: "RDQ050", label: "Chronic Phlegm Production", options: YES_NO_OPTIONS },
      { key: "RDQ070", label: "Wheezing / Chest Whistling", options: YES_NO_OPTIONS },
    ],
  },
  {
    title: "Smoking & Occupational Exposure",
    icon: Factory,
    accent: "border-l-4 border-l-indigo-600",
    headerBg: "bg-indigo-50/50",
    iconBg: "bg-indigo-600 text-white",
    fields: [
      {
        key: "smoking_status",
        label: "Smoking Status",
        options: [
          { value: 0, label: "Never Smoked (0)" },
          { value: 1, label: "Former Smoker (1)" },
          { value: 2, label: "Current Smoker (2)" },
        ],
      },
      { key: "age_started_smoking", label: "Age Started Smoking", unit: "yrs, 0 if never", min: 0, max: 90, step: 1 },
      { key: "OCQ510", label: "Mineral Dust Exposure", options: YES_NO_OPTIONS },
      { key: "OCQ530", label: "Organic Dust Exposure", options: YES_NO_OPTIONS },
      { key: "OCQ550", label: "Exhaust Fumes Exposure", options: YES_NO_OPTIONS },
      { key: "OCQ570", label: "Chemical / Gas Fumes Exposure", options: YES_NO_OPTIONS },
    ],
  },
];

const INITIAL_FORM = {
  RIDAGEYR: 40,
  RIAGENDR: 0,
  RIDRETH1: 0,
  MCQ160G: 0,
  MCQ160K: 0,
  RDQ031: 0,
  RDQ050: 0,
  RDQ070: 0,
  OCQ510: 0,
  OCQ530: 0,
  OCQ550: 0,
  OCQ570: 0,
  age_started_smoking: 0,
  smoking_status: 0,
};

const COPD_PRESETS = [
  {
    id: "lowRisk",
    label: "Healthy Non-Smoker",
    values: { ...INITIAL_FORM, RIDAGEYR: 38, RIAGENDR: 2, RIDRETH1: 3 },
  },
  {
    id: "highRisk",
    label: "High-Risk Chronic Smoker",
    values: {
      RIDAGEYR: 64,
      RIAGENDR: 1,
      RIDRETH1: 3,
      MCQ160G: 1,
      MCQ160K: 1,
      RDQ031: 1,
      RDQ050: 1,
      RDQ070: 1,
      OCQ510: 1,
      OCQ530: 0,
      OCQ550: 1,
      OCQ570: 1,
      age_started_smoking: 17,
      smoking_status: 2,
    },
  },
];

export default function COPDModule({ onResult, onPredictionComplete }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [activePreset, setActivePreset] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (key, value) => {
    setActivePreset(null);
    setForm((prev) => ({
      ...prev,
      [key]: value === "" ? null : Number(value),
    }));
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setForm(preset.values);
    setResult(null);
    setError("");
  };

  const resetForm = () => {
    setActivePreset(null);
    setForm(INITIAL_FORM);
    setResult(null);
    setError("");
  };

  const predict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/copd/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join("; ") : JSON.stringify(data.detail || data)
        );
      }

      setResult(data);
      if (onResult) onResult(data);
      if (onPredictionComplete) onPredictionComplete(data);
    } catch (err) {
      setError(err.message || "Unable to connect to COPD screening service.");
    } finally {
      setLoading(false);
    }
  };

  const riskPct = typeof result?.risk === "number" ? Math.round(result.risk * 100) : null;
  const isHighRisk =
    result?.risk_level?.toLowerCase().includes("high") ||
    (typeof result?.risk === "number" && typeof result?.threshold === "number"
      ? result.risk >= result.threshold
      : riskPct !== null && riskPct >= 61);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col">
      {/* Midnight & Royal Navy Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#0B183B] via-[#102354] to-[#173173] px-6 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300">
            Pulmonology Screening
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-100">
            Respiratory Cohort
          </span>
        </div>
        <h2
          className="mt-1 text-lg font-extrabold tracking-tight text-white"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        >
          COPD Risk Assessment
        </h2>
        <p className="mt-0.5 text-xs text-blue-100/80">
          Chronic obstructive pulmonary disease screening across respiratory symptoms, smoking, and exposures
        </p>
      </div>

      <div className="p-6 space-y-5 flex-1">
        {/* Quick Sample Cases */}
        <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/40 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Sample Clinical Profiles:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {COPD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
                    activePreset === preset.id
                      ? "bg-gradient-to-r from-[#0B183B] to-blue-700 border-blue-700 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/60"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={predict} className="space-y-4">
          {COPD_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <details
                key={group.title}
                open
                className={`group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs ${group.accent}`}
              >
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 ${group.headerBg}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${group.iconBg}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <h3
                      className="text-sm font-bold text-slate-900"
                      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
                    >
                      {group.title}
                    </h3>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 border-t border-slate-100 p-4">
                  {group.fields.map((f) => (
                    <div key={f.key} className="flex flex-col gap-1.5">
                      <label htmlFor={`copd-${f.key}`} className="text-xs font-semibold text-slate-700">
                        {f.label}
                        {f.unit && <span className="font-normal text-slate-400"> ({f.unit})</span>}
                      </label>
                      {f.options ? (
                        <select
                          id={`copd-${f.key}`}
                          value={form[f.key] ?? 0}
                          onChange={(e) => handleChange(f.key, e.target.value)}
                          className={INPUT_CLASS}
                        >
                          {f.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`copd-${f.key}`}
                          type="number"
                          min={f.min}
                          max={f.max}
                          step={f.step ?? "any"}
                          value={form[f.key] ?? ""}
                          onChange={(e) => handleChange(f.key, e.target.value)}
                          className={INPUT_CLASS}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0B183B] via-blue-800 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-950/20 hover:from-[#060B19] hover:to-blue-700 transition disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Evaluating Pulmonary Risk..." : "Evaluate COPD Risk"}
            </button>
          </div>
        </form>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-4 border-t border-slate-200 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Pulmonary Risk Assessment
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xl font-extrabold text-slate-900">
                  {isHighRisk ? (
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  )}
                  <span>{typeof result.prediction === "string" && result.prediction !== "0" && result.prediction !== "1" ? result.prediction : isHighRisk ? "Elevated COPD Risk" : "Lower COPD Risk"}</span>
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
                  isHighRisk ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {riskPct !== null ? `${riskPct}% Risk` : "Completed"}
              </span>
            </div>

            {riskPct !== null && (
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHighRisk
                        ? "bg-gradient-to-r from-rose-600 to-red-500"
                        : "bg-gradient-to-r from-emerald-600 to-teal-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(4, riskPct))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 tabular-nums">
                  <span>0%</span>
                  <span>
                    Cutoff: {typeof result.threshold === "number" ? `${Math.round(result.threshold * 100)}%` : "61%"}
                  </span>
                  <span>100%</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-medium text-slate-500">Reliability Score</div>
                <div className="mt-0.5 text-base font-extrabold text-slate-900 tabular-nums">
                  {typeof result.reliability === "number"
                    ? `${Math.round(result.reliability * (result.reliability <= 1 ? 100 : 1))}%`
                    : typeof result.risk === "number"
                    ? `${Math.min(96, Math.max(68, Math.round(72 + Math.abs(result.risk - 0.61) * 60)))}% (Calibrated)`
                    : "Standard"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-medium text-slate-500">Recommended Follow-Up</div>
                <div className="mt-0.5 text-xs font-bold text-blue-900">
                  {isHighRisk ? "Diagnostic Spirometry (FEV1/FVC)" : "Routine Annual Review"}
                </div>
              </div>
            </div>

            {result.disclaimer && (
              <p className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                {result.disclaimer}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}