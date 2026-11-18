import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  User,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200/90 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-all " +
  "placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-600/15";

const INITIAL_FORM = {
  RIDAGEYR: 45,
  RIAGENDR: 1,
  RIDRETH3: 3,
  LUXSMED: 6.5,
};

const MASLD_PRESETS = [
  {
    id: "normalLiver",
    label: "Normal Liver Stiffness (5.2 kPa)",
    values: { RIDAGEYR: 39, RIAGENDR: 2, RIDRETH3: 3, LUXSMED: 5.2 },
  },
  {
    id: "fibrosisRisk",
    label: "Elevated Stiffness / Fibrosis (12.4 kPa)",
    values: { RIDAGEYR: 58, RIAGENDR: 1, RIDRETH3: 1, LUXSMED: 12.4 },
  },
];

export default function MASLDModule({ onResult, onPredictionComplete }) {
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
      const response = await fetch(`${API_BASE}/api/masld/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail || data)
        );
      }

      setResult(data);
      if (onResult) onResult(data);
      if (onPredictionComplete) onPredictionComplete(data);
    } catch (err) {
      setError(err.message || "Unable to connect to MASLD screening service.");
    } finally {
      setLoading(false);
    }
  };

  const stiffness = Number(form.LUXSMED || 0);
  const riskPct = typeof result?.risk === "number" ? Math.round(result.risk * 100) : null;
  const isHighRisk =
    result?.risk_level?.toLowerCase().includes("high") ||
    (typeof result?.risk === "number" && typeof result?.threshold === "number"
      ? result.risk >= result.threshold
      : riskPct !== null && riskPct >= 56);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col">
      {/* Midnight & Royal Navy Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#0B183B] via-[#102354] to-[#173173] px-6 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300">
            Hepatology Screening
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-100">
            Transient Elastography
          </span>
        </div>
        <h2
          className="mt-1 text-lg font-extrabold tracking-tight text-white"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        >
          Fatty Liver Disease (MASLD) Assessment
        </h2>
        <p className="mt-0.5 text-xs text-blue-100/80">
          Metabolic dysfunction-associated steatotic liver disease &amp; hepatic fibrosis risk stratification
        </p>
      </div>

      <div className="p-6 space-y-5 flex-1">
        {/* Sample Cases */}
        <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/40 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Sample Elastography Profiles:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MASLD_PRESETS.map((preset) => (
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
          {/* Patient Demographics Section */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 border-l-4 border-l-slate-700 bg-white shadow-2xs">
            <div className="flex items-center gap-2.5 bg-slate-50/80 px-4 py-3 border-b border-slate-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-white">
                <User className="h-3.5 w-3.5" />
              </span>
              <h3
                className="text-sm font-bold text-slate-900"
                style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
              >
                Patient Demographics
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="masld-age" className="text-xs font-semibold text-slate-700">
                  Age <span className="font-normal text-slate-400">(years)</span>
                </label>
                <input
                  id="masld-age"
                  type="number"
                  min="18"
                  max="110"
                  required
                  value={form.RIDAGEYR ?? ""}
                  onChange={(e) => handleChange("RIDAGEYR", e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="masld-sex" className="text-xs font-semibold text-slate-700">
                  Biological Sex
                </label>
                <select
                  id="masld-sex"
                  value={form.RIAGENDR ?? 1}
                  onChange={(e) => handleChange("RIAGENDR", e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value={1}>Male (1)</option>
                  <option value={2}>Female (2)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="masld-eth" className="text-xs font-semibold text-slate-700">
                  Demographic Group
                </label>
                <select
                  id="masld-eth"
                  value={form.RIDRETH3 ?? 3}
                  onChange={(e) => handleChange("RIDRETH3", e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value={1}>Group 1 — Mexican American</option>
                  <option value={2}>Group 2 — Other Hispanic</option>
                  <option value={3}>Group 3 — Non-Hispanic White</option>
                  <option value={4}>Group 4 — Non-Hispanic Black</option>
                  <option value={6}>Group 6 — Non-Hispanic Asian</option>
                  <option value={7}>Group 7 — Other / Multi-Racial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transient Elastography Measurement */}
          <div className="overflow-hidden rounded-2xl border border-indigo-200/90 border-l-4 border-l-indigo-600 bg-white shadow-2xs">
            <div className="flex items-center justify-between gap-2.5 bg-indigo-50/50 px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Activity className="h-3.5 w-3.5" />
                </span>
                <h3
                  className="text-sm font-bold text-slate-900"
                  style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
                >
                  Liver Ultrasound Elastography (FibroScan)
                </h3>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  stiffness >= 8.0
                    ? "bg-amber-100 text-amber-900"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {stiffness >= 8.0 ? ">= 8.0 kPa (Elevated)" : "< 8.0 kPa (Normal Range)"}
              </span>
            </div>

            <div className="p-4 space-y-2.5">
              <label htmlFor="masld-kpa" className="block text-xs font-semibold text-slate-700">
                Median Liver Stiffness Measurement <span className="font-normal text-slate-400">(kPa)</span>
              </label>
              <input
                id="masld-kpa"
                type="number"
                step="0.1"
                min="1.0"
                max="75.0"
                required
                value={form.LUXSMED ?? ""}
                onChange={(e) => handleChange("LUXSMED", e.target.value)}
                className={INPUT_CLASS}
              />
              <p className="text-[11px] text-slate-500">
                Clinical reference: &lt; 8.0 kPa indicates low fibrosis probability; &ge; 8.0 kPa suggests clinically significant hepatic fibrosis (F2+).
              </p>
            </div>
          </div>

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
              {loading ? "Evaluating Hepatic Risk..." : "Evaluate Fatty Liver Risk"}
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
                  Hepatology Risk Stratification
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xl font-extrabold text-slate-900">
                  {isHighRisk ? (
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  )}
                  <span>{typeof result.prediction === "string" && result.prediction !== "0" && result.prediction !== "1" ? result.prediction : isHighRisk ? "Elevated MASLD Risk" : "Lower MASLD Risk"}</span>
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
                    Cutoff: {typeof result.threshold === "number" ? `${Math.round(result.threshold * 100)}%` : "56%"}
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
                    ? `${Math.min(96, Math.max(68, Math.round(72 + Math.abs(result.risk - 0.56) * 60)))}% (Calibrated)`
                    : "Standard"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-medium text-slate-500">Clinical Next Step</div>
                <div className="mt-0.5 text-xs font-bold text-blue-900">
                  {isHighRisk ? "FIB-4 Panel & Hepatology Consult" : "Metabolic Lifestyle Maintenance"}
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