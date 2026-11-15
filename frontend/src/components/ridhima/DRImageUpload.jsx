import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-[#00696F]">
          Diabetic Retinopathy Screening (Retinal Fundus)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          DenseNet-121 Optimized + Optional Clinical Metadata Fusion & Grad-CAM Attention
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Retinal Fundus Image (JPG / PNG)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#00696F] file:text-white hover:file:bg-[#006065]"
          />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Fundus preview"
              className="h-48 w-48 object-contain rounded-lg border border-slate-200 bg-black"
            />
          )}
        </div>

        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Optional Clinical Metadata (Activates Fusion)
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Age (Years)</label>
              <input
                type="number"
                min="1"
                max="120"
                placeholder="e.g. 58"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white"
              >
                <option value="">Not specified</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Diabetes Type</label>
              <select
                value={diabetesType}
                onChange={(e) => setDiabetesType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white"
              >
                <option value="">Not specified</option>
                <option value="Type 1">Type 1 Diabetes</option>
                <option value="Type 2">Type 2 Diabetes</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full mt-2 py-2 px-4 rounded-lg font-semibold text-white bg-[#00696F] hover:bg-[#006065] disabled:opacity-50 transition"
          >
            {loading ? "Analyzing Retinal Scan..." : "Predict DR Grade"}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="text-center bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-600 mb-2">Grad-CAM Lesion Map</div>
            <img
              src={result.explanation.gradcam_overlay}
              alt="DR Grad-CAM overlay"
              className="mx-auto w-48 h-48 rounded-lg border border-slate-200 bg-black object-contain"
            />
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Predicted Grade</div>
                <div className="text-xl font-bold text-slate-900">{result.prediction}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-[#006065]">
                {result.risk_level} Risk ({(result.probability * 100).toFixed(1)}%)
              </span>
            </div>

            <div className="space-y-1.5">
              {Object.entries(result.explanation.class_probabilities).map(([grade, prob]) => (
                <div key={grade} className="text-xs">
                  <div className="flex justify-between text-slate-700 mb-0.5">
                    <span>{grade}</span>
                    <span>{(prob * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-[#00696F] h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, prob * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="text-slate-800">Recommendation:</strong> {result.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}