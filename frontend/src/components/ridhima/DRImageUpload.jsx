import React, { useState } from "react";
import { AlertCircle, Eye, FileImage, Loader2, Upload } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-all " +
  "placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-600/15";

export default function DRImageUpload({ onPredictionComplete }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [diabetesType, setDiabetesType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a retinal fundus image.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (age.trim() !== "") formData.append("age", age);
      if (sex.trim() !== "") formData.append("sex", sex);
      if (diabetesType.trim() !== "") formData.append("diabetes_type", diabetesType);

      const response = await fetch(`${API_BASE}/api/v1/dr/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      if (onPredictionComplete) onPredictionComplete(data);
    } catch (err) {
      setError(err.message || "Error running Diabetic Retinopathy analysis.");
    } finally {
      setLoading(false);
    }
  };

  const isHighRisk =
    result?.risk_level?.toLowerCase().includes("high") ||
    result?.prediction === "Severe" ||
    result?.prediction === "Proliferative DR";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col">
      {/* Card Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#0B183B] via-[#102354] to-[#173173] px-6 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300">
            Ophthalmology Screening
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-100">
            Retinal Fundus
          </span>
        </div>
        <h2
          className="mt-1 text-lg font-extrabold tracking-tight text-white"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        >
          Diabetic Retinopathy Grading
        </h2>
        <p className="mt-0.5 text-xs text-blue-100/80">
          Retinal fundus severity grading with localized lesion highlighting and clinical profile context
        </p>
      </div>

      <div className="p-6 space-y-5 flex-1">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fundus Upload Zone */}
          <div className="space-y-2">
            <label htmlFor="dr-image" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Retinal Fundus Photograph (JPG / PNG)
            </label>

            <label
              htmlFor="dr-image"
              className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-center transition hover:border-blue-500 hover:bg-blue-50/40"
            >
              {previewUrl ? (
                <div className="space-y-3 w-full">
                  <img
                    src={previewUrl}
                    alt="Fundus preview"
                    className="mx-auto h-48 w-48 rounded-xl border border-slate-200 bg-slate-950 object-contain shadow-xs"
                  />
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">
                    <FileImage className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[220px]">{file?.name}</span>
                    <span className="text-blue-600">• Change</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to upload retinal fundus scan
                  </p>
                  <p className="text-xs text-slate-500">
                    Macula-centered fundus photograph • JPG or PNG
                  </p>
                </div>
              )}

              <input
                id="dr-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>

          {/* Clinical Context Panel */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Patient Clinical Context (Optional)
              </span>
              <span className="text-[11px] text-slate-500">Refines risk stratification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Age <span className="font-normal text-slate-400">(yrs)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 58"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Sex</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Any / Unknown</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Diabetes History</label>
                <select
                  value={diabetesType}
                  onChange={(e) => setDiabetesType(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Unspecified</option>
                  <option value="Type 1">Type 1 Diabetes</option>
                  <option value="Type 2">Type 2 Diabetes</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0B183B] via-blue-800 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-950/20 transition hover:from-[#060B19] hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? "Evaluating Retinal Scan..." : "Evaluate Retinopathy Grade"}
          </button>
        </form>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <div className="md:col-span-5 text-center bg-slate-50 p-3.5 rounded-xl border border-slate-200/90">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <Eye className="h-3.5 w-3.5 text-blue-600" />
                <span>Retinal Attention Map</span>
              </div>
              <img
                src={result.explanation.gradcam_overlay}
                alt="Retinal lesion attention map"
                className="mx-auto w-44 h-44 rounded-lg border border-slate-200 bg-slate-950 object-contain"
              />
            </div>

            <div className="md:col-span-7 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Retinopathy Severity Grade
                  </div>
                  <div className="text-xl font-extrabold text-slate-900">{result.prediction}</div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isHighRisk
                      ? "bg-rose-100 text-rose-800"
                      : "bg-blue-100 text-blue-900"
                  }`}
                >
                  {result.risk_level} Risk ({(result.probability * 100).toFixed(1)}%)
                </span>
              </div>

              <div className="space-y-2">
                {Object.entries(result.explanation.class_probabilities).map(([grade, prob]) => (
                  <div key={grade} className="text-xs">
                    <div className="flex justify-between font-medium text-slate-700 mb-1">
                      <span>{grade}</span>
                      <span className="tabular-nums font-semibold">{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#0B183B] to-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, prob * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-700 bg-blue-50/70 p-3 rounded-xl border border-blue-100 leading-relaxed">
                <strong className="text-blue-950">Clinical Recommendation:</strong> {result.recommendation}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
