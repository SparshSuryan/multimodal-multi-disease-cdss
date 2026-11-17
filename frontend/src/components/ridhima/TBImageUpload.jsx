import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileImage, Loader2, ShieldAlert, Upload } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-all " +
  "placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-600/15";

export default function TBImageUpload({ onResult, onPredictionComplete }) {
  const [image, setImage] = useState(null);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    const numericAge = Number(age);

    if (!image || age === "" || !sex) {
      setError("Please upload a chest X-ray and enter both patient age and sex.");
      return;
    }

    if (!Number.isFinite(numericAge) || numericAge < 0 || numericAge > 120) {
      setError("Age must be between 0 and 120 years.");
      return;
    }

    if (!["image/png", "image/jpeg"].includes(image.type)) {
      setError("Please upload a PNG or JPEG chest X-ray image.");
      return;
    }

    if (image.size > 10 * 1024 * 1024) {
      setError("Image file must be 10 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);
    formData.append("age", String(numericAge));
    formData.append("sex", sex);

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/tb/predict`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Tuberculosis screening request failed."
        );
      }

      setResult(data);
      if (onResult) onResult(data);
      if (onPredictionComplete) onPredictionComplete(data);
    } catch (err) {
      setError(err.message || "Unable to complete tuberculosis screening.");
    } finally {
      setLoading(false);
    }
  }

  const flag = result?.explanation?.screening_flag;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col">
      {/* Card Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#0B183B] via-[#102354] to-[#173173] px-6 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300">
            Pulmonary Radiology
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-100">
            Chest X-Ray
          </span>
        </div>
        <h2
          className="mt-1 text-lg font-extrabold tracking-tight text-white"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        >
          Tuberculosis Screening
        </h2>
        <p className="mt-0.5 text-xs text-blue-100/80">
          Chest radiograph evaluation combined with baseline patient demographics
        </p>
      </div>

      <div className="p-6 space-y-5 flex-1">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image Upload Zone */}
          <div className="space-y-2">
            <label htmlFor="tb-image" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Chest Radiograph (PNG / JPG)
            </label>

            <label
              htmlFor="tb-image"
              className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-center transition hover:border-blue-500 hover:bg-blue-50/40"
            >
              {preview ? (
                <div className="space-y-3 w-full">
                  <img
                    src={preview}
                    alt="Selected chest X-ray"
                    className="mx-auto max-h-52 w-auto rounded-lg border border-slate-200 bg-slate-950 object-contain shadow-xs"
                  />
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">
                    <FileImage className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[220px]">{image?.name}</span>
                    <span className="text-blue-600">• Change</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to upload chest X-ray
                  </p>
                  <p className="text-xs text-slate-500">
                    Frontal PA/AP radiograph • PNG or JPEG up to 10 MB
                  </p>
                </div>
              )}

              <input
                id="tb-image"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => {
                  setImage(event.target.files?.[0] || null);
                  setResult(null);
                  setError("");
                }}
                className="sr-only"
              />
            </label>
          </div>

          {/* Patient Metadata Panel */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Patient Demographics (Required)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tb-age" className="text-xs font-semibold text-slate-700">
                  Age <span className="font-normal text-slate-400">(years)</span>
                </label>
                <input
                  id="tb-age"
                  type="number"
                  min="0"
                  max="120"
                  step="1"
                  placeholder="e.g. 42"
                  value={age}
                  onChange={(event) => {
                    setAge(event.target.value);
                    setResult(null);
                  }}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="tb-sex" className="text-xs font-semibold text-slate-700">
                  Biological Sex
                </label>
                <select
                  id="tb-sex"
                  value={sex}
                  onChange={(event) => {
                    setSex(event.target.value);
                    setResult(null);
                  }}
                  className={INPUT_CLASS}
                >
                  <option value="">Select sex</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0B183B] via-blue-800 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-950/20 transition hover:from-[#060B19] hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? "Evaluating Chest Radiograph..." : "Evaluate Tuberculosis Risk"}
          </button>
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
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Screening Outcome
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  {flag === true ? (
                    <>
                      <ShieldAlert className="h-5 w-5 text-rose-600" />
                      <span>Positive Screening Flag</span>
                    </>
                  ) : flag === false ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>No Active TB Flag Detected</span>
                    </>
                  ) : (
                    <span>{result.prediction || "Assessment Complete"}</span>
                  )}
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  flag === true
                    ? "bg-rose-100 text-rose-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {flag === true ? "Follow-Up Advised" : "Low Screening Risk"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-medium text-slate-500">Risk Score</div>
                <div className="mt-0.5 text-base font-extrabold text-slate-900 tabular-nums">
                  {typeof result.risk === "number" ? `${(result.risk * 100).toFixed(1)}%` : "N/A"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-medium text-slate-500">Decision Cutoff</div>
                <div className="mt-0.5 text-base font-extrabold text-slate-900 tabular-nums">
                  {typeof result.explanation?.screening_threshold === "number"
                    ? `${(result.explanation.screening_threshold * 100).toFixed(1)}%`
                    : result.explanation?.screening_threshold ?? "Standard"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-medium text-slate-500">Confidence Status</div>
                <div className="mt-0.5 text-sm font-bold text-blue-900 capitalize">
                  {result.reliability ?? "Standard"}
                </div>
              </div>
            </div>

            <p className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
              {result.disclaimer ||
                "Clinical screening aid only. Positive findings require microbiological confirmation (sputum AFB / GeneXpert) and radiologist review."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
