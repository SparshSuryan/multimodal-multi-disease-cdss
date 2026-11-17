import React from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import { labelFor } from "./fieldDefs";

const DISEASE_TITLES = {
  cvd: "Cardiovascular disease (CVD)",
  ckd: "Chronic kidney disease (CKD)",
};

const RELIABILITY = {
  High: { icon: ShieldCheck, classes: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  Moderate: { icon: Info, classes: "border-amber-300 bg-amber-50 text-amber-800" },
  Low: { icon: ShieldAlert, classes: "border-rose-300 bg-rose-50 text-rose-800" },
};

// Same cut-offs as the original card: 40% and 70%.
function riskBand(pct) {
  if (pct >= 70) return { label: "Higher estimated risk", bar: "bg-rose-600", text: "text-rose-700" };
  if (pct >= 40) return { label: "Intermediate estimated risk", bar: "bg-amber-500", text: "text-amber-700" };
  return { label: "Lower estimated risk", bar: "bg-emerald-600", text: "text-emerald-700" };
}

export default function DiseaseResultCard({ result }) {
  if (!result) return null;

  const pct = Math.round((result.risk || 0) * 100);
  const band = riskBand(pct);
  const reliability = RELIABILITY[result.reliability] || RELIABILITY.Moderate;
  const ReliabilityIcon = reliability.icon;
  const reliabilityPct = Math.round((result.reliability_score || 0) * 100);
  const isFallback = result.model_used === "fallback";
  const isTrained = result.model_used === "trained";
  const title = DISEASE_TITLES[result.disease] || result.disease;

  return (
    <section aria-label={`${title} result`} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {isFallback && (
        <div role="alert" className="flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">Fallback estimate, not the trained model</p>
            <p className="mt-0.5">
              The trained model could not be used, so this number comes from a simple rule-based estimate. Do not use
              it for evaluation or reporting.
            </p>
            {result.fallback_reason && <p className="mt-1 break-words text-[11px] text-amber-800/80">{result.fallback_reason}</p>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{result.disease}</p>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {isTrained && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Trained model
            </p>
          )}
        </div>
        {isFallback ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            Reliability not assessed
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${reliability.classes}`}>
            <ReliabilityIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {result.reliability} reliability ({reliabilityPct}%)
          </span>
        )}
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={`text-4xl font-bold leading-none ${band.text}`}>{pct}%</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">{band.label}</p>
          </div>
          <p className="max-w-[10rem] text-right text-[11px] text-slate-400">
            {isFallback ? "Rule-based estimate" : "Calibrated model probability"}
          </p>
        </div>
        <div
          className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`${title} risk`}
        >
          <div className={`h-full ${band.bar} transition-all`} style={{ width: `${pct}%` }} />
          <span className="absolute inset-y-0 left-[40%] w-px bg-white/90" />
          <span className="absolute inset-y-0 left-[70%] w-px bg-white/90" />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>0%</span>
          <span>40%</span>
          <span>70%</span>
          <span>100%</span>
        </div>
      </div>

      {result.conflicts?.length > 0 && (
        <div role="alert" className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-bold">Inputs disagree. Clinical review advised.</p>
            {result.conflicts.map((c, idx) => (
              <p key={idx}>{c.detail}</p>
            ))}
          </div>
        </div>
      )}

      {result.reliability_reasons?.length > 0 && (
        <div className="text-xs text-slate-600">
          <p className="mb-1 font-semibold text-slate-800">{isFallback ? "About this estimate" : "Why this reliability level"}</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {result.reliability_reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {result.suggested_investigations?.length > 0 && (
        <div className="border-t border-slate-100 pt-3 text-xs">
          <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-800">
            <ClipboardList className="h-4 w-4 text-[#00696F]" aria-hidden="true" />
            Suggested follow-up investigations
          </p>
          <ul className="space-y-1.5">
            {result.suggested_investigations.map((inv, i) => (
              <li key={i} className="rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2">
                <span className="font-semibold text-[#00494d]">{inv.test}</span>
                <span className="text-slate-600">. {inv.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.missing_inputs?.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <p className="mb-1.5 text-xs font-semibold text-slate-700">
            Not provided ({result.missing_inputs.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.missing_inputs.map((m) => (
              <span key={m} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                {labelFor(m)}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.disclaimer && <p className="border-t border-slate-100 pt-2 text-[11px] text-slate-400">{result.disclaimer}</p>}
    </section>
  );
}
