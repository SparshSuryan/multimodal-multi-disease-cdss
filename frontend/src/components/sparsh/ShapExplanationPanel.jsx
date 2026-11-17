import React from "react";
import { COMPONENT_LABELS, labelFor } from "./fieldDefs";

// The backend sometimes returns indicator features named "missing: sc".
function featureName(raw) {
  if (typeof raw === "string" && raw.startsWith("missing: ")) {
    return `Missing: ${labelFor(raw.replace("missing: ", ""))}`;
  }
  return raw;
}

function formatShap(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "n/a";
  return `${n > 0 ? "+" : ""}${n.toFixed(3)}`;
}

export default function ShapExplanationPanel({ title = "Why this estimate (SHAP)", explanation }) {
  const factors = explanation?.clinical_top_factors || [];
  const components = Object.entries(explanation?.risk_components || {});

  if (!factors.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        No SHAP explanation is available for this assessment.
      </div>
    );
  }

  const maxAbs = Math.max(...factors.map((f) => Math.abs(Number(f.shap) || 0)), 0.01);

  return (
    <section aria-label={title} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Top factors from the clinical inputs. Red bars raise the estimated risk and green bars lower it. SHAP does not
          cover ECG or report text.
        </p>
      </div>

      <div>
        <ul className="space-y-2">
          {factors.map((item, idx) => {
            const shap = Number(item.shap) || 0;
            const isPositive = shap > 0;
            const width = Math.max(1.5, (Math.abs(shap) / maxAbs) * 50);
            const hasValue = item.value !== null && item.value !== undefined;
            return (
              <li
                key={idx}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_3.75rem] items-center gap-3 text-xs"
              >
                <div className="min-w-0" title={featureName(item.feature)}>
                  <p className="truncate font-medium text-slate-800">{featureName(item.feature)}</p>
                  <p className="text-[11px] text-slate-400">{hasValue ? `Value: ${item.value}` : "Not measured"}</p>
                </div>
                <div className="relative h-5" aria-hidden="true">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-slate-300" />
                  <div
                    className={`absolute inset-y-1 rounded-sm ${isPositive ? "bg-rose-500" : "bg-emerald-500"}`}
                    style={{ left: isPositive ? "50%" : `${50 - width}%`, width: `${width}%` }}
                  />
                </div>
                <p className={`text-right font-semibold tabular-nums ${isPositive ? "text-rose-600" : "text-emerald-600"}`}>
                  {formatShap(shap)}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_3.75rem] gap-3 text-[10px] text-slate-400">
          <span />
          <div className="flex justify-between">
            <span>Lowers risk</span>
            <span>Raises risk</span>
          </div>
          <span />
        </div>
      </div>

      {components.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-semibold text-slate-700">Risk estimate by input source</p>
          <ul className="space-y-1.5">
            {components.map(([key, val]) => {
              const pct = Math.round((Number(val) || 0) * 100);
              return (
                <li key={key} className="text-xs">
                  <div className="mb-0.5 flex justify-between text-slate-700">
                    <span>{COMPONENT_LABELS[key] || key}</span>
                    <span className="font-semibold tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#00696F]" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
