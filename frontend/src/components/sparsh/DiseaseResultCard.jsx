import React from "react";

const BADGE_STYLES = {
  High: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Moderate: "bg-amber-100 text-amber-800 border-amber-300",
  Low: "bg-rose-100 text-rose-800 border-rose-300",
};

const DISEASE_TITLES = {
  cvd: "Cardiovascular Disease (CVD)",
  ckd: "Chronic Kidney Disease (CKD)",
};

export default function DiseaseResultCard({ result }) {
  if (!result) return null;

  const pct = Math.round((result.risk || 0) * 100);
  const badgeClass = BADGE_STYLES[result.reliability] || BADGE_STYLES.Moderate;
  const barColor = pct >= 70 ? "bg-rose-600" : pct >= 40 ? "bg-amber-500" : "bg-emerald-600";

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-4">
      {/* Header & Reliability Badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            {result.disease?.toUpperCase()}
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            {DISEASE_TITLES[result.disease] || result.disease}
          </h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}>
          {result.reliability} Reliability ({Math.round((result.reliability_score || 0) * 100)}%)
        </span>
      </div>

      {/* Risk Meter */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600 font-medium">Estimated Disease Risk</span>
          <span className="font-bold text-slate-900">{pct}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Cross-Modal Conflict Alert */}
      {result.conflicts?.length > 0 && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
          <p className="font-bold">Cross-Modal Conflict Detected — Clinical Review Advised</p>
          {result.conflicts.map((c, idx) => (
            <p key={idx}>• {c.detail}</p>
          ))}
        </div>
      )}

      {/* Reliability Reasons */}
      <div className="text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">Reliability Assessment:</p>
        {result.reliability_reasons?.map((r, i) => (
          <p key={i}>• {r}</p>
        ))}
      </div>

      {/* Suggested Investigations */}
      {result.suggested_investigations?.length > 0 && (
        <div className="text-xs space-y-1.5 border-t pt-3">
          <p className="font-semibold text-slate-800">Suggested Follow-Up Investigations:</p>
          <ul className="space-y-1">
            {result.suggested_investigations.map((inv, i) => (
              <li key={i} className="bg-blue-50/70 border border-blue-100 rounded px-2.5 py-1.5">
                <span className="font-semibold text-blue-900">{inv.test}</span>
                <span className="text-slate-600"> — {inv.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing Inputs Chips */}
      {result.missing_inputs?.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-slate-700 mb-1.5">
            Missing Inputs ({result.missing_inputs.length}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.missing_inputs.map((m) => (
              <span key={m} className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 rounded">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400 border-t pt-2">{result.disclaimer}</p>
    </div>
  );
}