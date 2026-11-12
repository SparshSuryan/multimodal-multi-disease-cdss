import React from "react";

export default function ShapExplanationPanel({ title = "Feature Attribution (SHAP)", explanation }) {
  const factors = explanation?.clinical_top_factors || [];
  const components = explanation?.risk_components || {};

  if (!factors.length) {
    return (
      <div className="bg-white p-5 rounded-xl border border-slate-200 text-sm text-slate-500">
        No SHAP explanation available for this assessment.
      </div>
    );
  }

  const maxAbs = Math.max(...factors.map((f) => Math.abs(f.shap)), 0.01);

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(components).map(([mod, val]) => (
            <span key={mod} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
              {mod}: {Math.round(val * 100)}%
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {factors.map((item, idx) => {
          const widthPct = Math.min(100, Math.round((Math.abs(item.shap) / maxAbs) * 100));
          const isPositive = item.shap > 0;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-800">
                  {item.feature}
                  {item.value !== null && item.value !== undefined ? ` = ${item.value}` : " (missing)"}
                </span>
                <span className={`font-semibold ${isPositive ? "text-rose-600" : "text-emerald-600"}`}>
                  {isPositive ? `+${item.shap}` : item.shap} ({item.direction})
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${isPositive ? "bg-rose-500" : "bg-emerald-500"}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}