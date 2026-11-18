import React, { useEffect, useRef, useState } from "react";
import { LogOut, ShieldCheck, Stethoscope } from "lucide-react";

// Auth & Patient Longitudinal Records
import LoginPage from "./components/records/LoginPage";
import PatientLookupBar from "./components/records/PatientLookupBar";
import AdminDashboard from "./components/records/AdminDashboard";

// Member 1 (Ridhima): Medical Imaging (TB & Diabetic Retinopathy)
import TBImageUpload from "./components/ridhima/TBImageUpload";
import DRImageUpload from "./components/ridhima/DRImageUpload";

// Member 2 (Sparsh): Cardiovascular & Chronic Kidney Disease + SHAP
import ClinicalInputForm from "./components/sparsh/ClinicalInputForm";
import DiseaseResultCard from "./components/sparsh/DiseaseResultCard";
import ShapExplanationPanel from "./components/sparsh/ShapExplanationPanel";

// Member 3 (Purnendu): Respiratory & Metabolic (COPD & MASLD)
import COPDModule from "./components/purnendu/COPDModule";
import MASLDModule from "./components/purnendu/MASLDModule";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const BASE_TABS = [
  {
    id: "cardio-renal",
    tag: "01 • CARDIO-RENAL CARE",
    label: "Cardiology & Nephrology",
    subtitle: "Heart Disease & Chronic Kidney Risk Assessment",
  },
  {
    id: "imaging",
    tag: "02 • DIAGNOSTIC SCANS",
    label: "Radiology & Ophthalmology",
    subtitle: "Chest X-Ray Tuberculosis & Retinal Screening",
  },
  {
    id: "metabolic-resp",
    tag: "03 • RESPIRATORY & HEPATIC",
    label: "Pulmonology & Hepatology",
    subtitle: "Chronic Lung (COPD) & Fatty Liver Screening",
  },
];

const DISEASE_PILLS = [
  "Cardiovascular Disease",
  "Chronic Kidney Disease",
  "Tuberculosis",
  "Diabetic Retinopathy",
  "COPD",
  "Fatty Liver Disease",
];

const DISPLAY_NAMES = {
  CVD: "Cardiovascular Disease",
  CKD: "Chronic Kidney Disease",
  Tuberculosis: "Tuberculosis",
  "Diabetic Retinopathy": "Diabetic Retinopathy",
  COPD: "Chronic Obstructive Pulmonary Disease",
  MASLD: "Fatty Liver Disease",
};

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("cdss_token") || "");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("cdss_user") || "null");
    } catch {
      return null;
    }
  });

  const [activePatient, setActivePatient] = useState(null);
  const [activeTab, setActiveTab] = useState("cardio-renal");
  const [cardioRenalResult, setCardioRenalResult] = useState(null);
  const [cardioRenalLoading, setCardioRenalLoading] = useState(false);
  const [cardioRenalError, setCardioRenalError] = useState("");
  const [sessionFindings, setSessionFindings] = useState({});
  const cardioRenalResultsRef = useRef(null);

  useEffect(() => {
    if (cardioRenalResult && window.innerWidth < 1024) {
      cardioRenalResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [cardioRenalResult]);

  const handleLogout = () => {
    sessionStorage.removeItem("cdss_token");
    sessionStorage.removeItem("cdss_user");
    setToken("");
    setCurrentUser(null);
    setActivePatient(null);
    setSessionFindings({});
    setCardioRenalResult(null);
  };

  const persistConsultation = async (diseaseKey, payload, inputs = null) => {
    if (!activePatient?.patient_uid || !token) return;
    try {
      const riskVal =
        typeof payload.probability === "number"
          ? payload.probability
          : typeof payload.risk === "number"
          ? payload.risk
          : null;
      const res = await fetch(
        `${API_BASE}/api/v1/patients/${encodeURIComponent(activePatient.patient_uid)}/consultations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            module_name: DISPLAY_NAMES[diseaseKey] || diseaseKey,
            prediction:
              payload.prediction === 1 || payload.prediction === "1"
                ? "Elevated Risk"
                : payload.prediction === 0 || payload.prediction === "0"
                ? "Lower Risk"
                : payload.prediction !== undefined && payload.prediction !== null
                ? String(payload.prediction)
                : riskVal !== null
                ? `Risk ${Math.round(riskVal * 100)}%`
                : "Completed",
            risk_score: riskVal,
            risk_level: payload.risk_level || null,
            reliability: typeof payload.reliability === "number" ? payload.reliability : null,
            inputs,
            result: payload,
          }),
        }
      );
      if (res.ok) {
        const updatedPatient = await res.json();
        setActivePatient(updatedPatient);
      }
    } catch {
      // Non-blocking persistence
    }
  };

  const recordFinding = (diseaseKey, payload, inputs = null) => {
    if (!payload) return;
    setSessionFindings((prev) => ({
      ...prev,
      [diseaseKey]: payload,
    }));
    persistConsultation(diseaseKey, payload, inputs);
  };

  const handleCardioRenalSubmit = async (formPayload) => {
    setCardioRenalLoading(true);
    setCardioRenalError("");
    try {
      const response = await fetch(`${API_BASE}/api/v1/cardio-renal/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formPayload),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error (${response.status})`);
      }
      const data = await response.json();
      setCardioRenalResult(data);
      if (data.cvd) recordFinding("CVD", data.cvd, formPayload.cvd_inputs);
      if (data.ckd) recordFinding("CKD", data.ckd, formPayload.ckd_inputs);
    } catch (err) {
      setCardioRenalError(err.message || "Failed to connect to backend API on port 8000.");
    } finally {
      setCardioRenalLoading(false);
    }
  };

  if (!token || !currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user, accessToken) => {
          setCurrentUser(user);
          setToken(accessToken);
        }}
      />
    );
  }

  const tabs =
    currentUser.role === "admin"
      ? [
          ...BASE_TABS,
          {
            id: "admin",
            tag: "04 • GOVERNANCE",
            label: "Administration",
            subtitle: "Staff Accounts, Audit Logs & System Metrics",
          },
        ]
      : BASE_TABS;

  const assessedCount = Object.keys(sessionFindings).length;

  return (
    <div
      className="min-h-screen bg-slate-100/90 text-slate-900 flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* Top Clinical Header — Deep Midnight & Royal Navy Gradient */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#060B19] via-[#0B183B] to-[#132A63] text-white shadow-xl border-b border-blue-400/15">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-1/4 h-64 w-96 rounded-full bg-blue-500/15 blur-3xl"
        />

        {/* Brand + Right-Aligned Clinician & Progress Bar */}
        <div className="relative max-w-7xl mx-auto px-6 pt-5 pb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 border border-blue-400/25 px-3 py-0.5 text-[11px] font-semibold tracking-wider uppercase text-sky-300">
              Clinical Diagnostic Workspace
            </div>

            <h1
              className="text-xl sm:text-2xl xl:text-[26px] font-extrabold tracking-tight text-white leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
            >
              Multimodal Multi-Disease{" "}
              <span className="bg-gradient-to-r from-sky-300 via-blue-200 to-indigo-200 bg-clip-text text-transparent">
                Clinical Decision Support System
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {DISEASE_PILLS.map((disease) => (
                <span
                  key={disease}
                  className="px-2.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[11px] font-medium text-slate-300"
                >
                  {disease}
                </span>
              ))}
            </div>
          </div>

          {/* Right Cluster — Aligned flush with the right edge of the 3rd specialty card */}
          <div className="flex items-stretch gap-3 shrink-0 self-start lg:self-end">
            {/* Session Progress Card */}
            <div className="w-44 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-blue-300/20 px-3.5 py-2.5 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-300 font-medium">Session Modules</span>
                <span className="font-bold text-sm text-sky-300 tabular-nums">
                  {assessedCount} <span className="text-slate-400 font-normal">/ 6</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-900/70 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-300"
                  style={{ width: `${(assessedCount / 6) * 100}%` }}
                />
              </div>
            </div>

            {/* Signed-in Clinician / Admin Card */}
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.08] border border-white/15 px-3.5 py-2.5 text-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/25 text-sky-300">
                {currentUser.role === "admin" ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <Stethoscope className="h-4 w-4" />
                )}
              </div>
              <div className="leading-tight">
                <div className="font-bold text-white whitespace-nowrap">{currentUser.full_name}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                  {currentUser.role}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="ml-1 rounded-lg bg-white/10 p-1.5 text-slate-300 hover:bg-rose-500/25 hover:text-white transition"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Full-Width Navigation Tabs */}
        <div className="relative bg-[#050A17]/55 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className={`grid grid-cols-1 ${tabs.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"} gap-3`}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative w-full rounded-xl px-4 py-3 text-left transition-all duration-200 border ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 border-sky-300/50 text-white shadow-lg shadow-blue-950/50"
                        : "bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.09] hover:border-blue-300/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold tracking-widest uppercase ${
                          isActive ? "text-sky-100" : "text-sky-400/80"
                        }`}
                      >
                        {tab.tag}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-1 text-sm font-bold tracking-tight text-white"
                      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
                    >
                      {tab.label}
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] leading-snug ${
                        isActive ? "text-blue-100" : "text-slate-400 group-hover:text-slate-300"
                      }`}
                    >
                      {tab.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Clinical Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        {/* Persistent Patient Search & Longitudinal Follow-Up Bar */}
        {activeTab !== "admin" && (
          <PatientLookupBar
            token={token}
            activePatient={activePatient}
            onSelectPatient={(p) => {
              setActivePatient(p);
              setSessionFindings({});
              setCardioRenalResult(null);
            }}
          />
        )}

        {/* Session Cross-Disease Risk Strip */}
        {activeTab !== "admin" && assessedCount > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Current Consultation Summary {activePatient ? `• ${activePatient.full_name} (${activePatient.patient_uid})` : ""}
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(sessionFindings).map(([name, item]) => (
                <div
                  key={name}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2.5"
                >
                  <span className="font-bold text-blue-900">{DISPLAY_NAMES[name] || name}:</span>
                  <span className="font-semibold text-slate-800">
                    {item.prediction ||
                      (typeof item.risk === "number" ? `Risk ${Math.round(item.risk * 100)}%` : "Completed")}
                  </span>
                  {item.risk_level && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900">
                      {item.risk_level}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 1: Cardiology & Nephrology */}
        {activeTab === "cardio-renal" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <ClinicalInputForm onSubmit={handleCardioRenalSubmit} loading={cardioRenalLoading} />
            </div>
            <div ref={cardioRenalResultsRef} className="lg:col-span-5 space-y-6 scroll-mt-4">
              {cardioRenalError && (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">The assessment could not be completed</p>
                  <p className="mt-0.5">{cardioRenalError}</p>
                </div>
              )}

              {cardioRenalLoading ? (
                <div className="space-y-4" aria-busy="true" aria-label="Running assessment">
                  {[0, 1].map((i) => (
                    <div key={i} className="animate-pulse space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="h-4 w-1/2 rounded bg-slate-200" />
                      <div className="h-9 w-24 rounded bg-slate-200" />
                      <div className="h-3 w-full rounded bg-slate-100" />
                      <div className="h-3 w-5/6 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : cardioRenalResult ? (
                <>
                  {cardioRenalResult.cvd && (
                    <>
                      <DiseaseResultCard result={cardioRenalResult.cvd} />
                      <ShapExplanationPanel
                        title="Cardiovascular Disease: Key Clinical Drivers"
                        explanation={cardioRenalResult.cvd.explanation}
                      />
                    </>
                  )}
                  {cardioRenalResult.ckd && (
                    <>
                      <DiseaseResultCard result={cardioRenalResult.ckd} />
                      <ShapExplanationPanel
                        title="Chronic Kidney Disease: Key Clinical Drivers"
                        explanation={cardioRenalResult.ckd.explanation}
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                  <div className="bg-gradient-to-r from-[#0B183B] to-[#132A63] px-5 py-4 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300">
                      Diagnostic Output Preview
                    </span>
                    <h3
                      className="mt-0.5 text-base font-bold"
                      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
                    >
                      Clinical Risk Assessment
                    </h3>
                  </div>
                  <div className="space-y-4 p-5 text-sm text-slate-600">
                    <p className="leading-relaxed">
                      Complete the patient intake form on the left and select{" "}
                      <span className="font-semibold text-slate-900">Evaluate Cardio-Renal Risk</span>{" "}
                      to generate a comprehensive report:
                    </p>
                    <ul className="space-y-2.5 text-xs text-slate-600">
                      <li className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                        <span>Calibrated Cardiovascular &amp; Chronic Kidney Disease risk scores</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                        <span>Automated alerts when laboratory values, vitals, or clinical notes conflict</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-600" />
                        <span>Ranked clinical biomarkers and history factors driving each risk estimate</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-700" />
                        <span>Recommended confirmatory diagnostic tests and specialist follow-up</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Radiology & Ophthalmology */}
        {activeTab === "imaging" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TBImageUpload
              onResult={(res) => recordFinding("Tuberculosis", res)}
            />
            <DRImageUpload
              onPredictionComplete={(res) => recordFinding("Diabetic Retinopathy", res)}
            />
          </div>
        )}

        {/* Tab 3: Pulmonology & Hepatology */}
        {activeTab === "metabolic-resp" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <COPDModule
              onResult={(res) => recordFinding("COPD", res)}
            />
            <MASLDModule
              onResult={(res) => recordFinding("MASLD", res)}
            />
          </div>
        )}

        {/* Tab 4: Administrator Dashboard */}
        {activeTab === "admin" && currentUser.role === "admin" && (
          <AdminDashboard token={token} />
        )}
      </main>

      {/* Modern Structured Clinical Footer */}
      <footer className="mt-12 bg-gradient-to-b from-[#081026] to-[#050A17] text-slate-300 border-t border-blue-400/15">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-6 border-b border-white/10">
            <div className="md:col-span-5 space-y-2">
              <div
                className="text-sm font-bold text-white tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
              >
                Multimodal Multi-Disease Clinical Decision Support System
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                An integrated clinical screening platform supporting multi-specialty risk stratification across cardiology, nephrology, radiology, ophthalmology, pulmonology, and hepatology.
              </p>
            </div>

            <div className="md:col-span-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                Clinical Specialties
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                <button type="button" onClick={() => setActiveTab("cardio-renal")} className="text-left hover:text-white transition">
                  Cardiology
                </button>
                <button type="button" onClick={() => setActiveTab("cardio-renal")} className="text-left hover:text-white transition">
                  Nephrology
                </button>
                <button type="button" onClick={() => setActiveTab("imaging")} className="text-left hover:text-white transition">
                  Radiology
                </button>
                <button type="button" onClick={() => setActiveTab("imaging")} className="text-left hover:text-white transition">
                  Ophthalmology
                </button>
                <button type="button" onClick={() => setActiveTab("metabolic-resp")} className="text-left hover:text-white transition">
                  Pulmonology
                </button>
                <button type="button" onClick={() => setActiveTab("metabolic-resp")} className="text-left hover:text-white transition">
                  Hepatology
                </button>
              </div>
            </div>

            <div className="md:col-span-3 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                Clinical Notice
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Intended solely as a clinical decision support aid for qualified healthcare professionals. Not a standalone diagnostic device.
              </p>
            </div>
          </div>

          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>JIIT Noida • B.Tech VII Semester Major Project (2026–27)</span>
            <span className="text-slate-500">All 6 Diagnostic Modules + Longitudinal Patient Records Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}