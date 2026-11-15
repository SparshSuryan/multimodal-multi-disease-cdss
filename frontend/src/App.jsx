import React, { useState } from "react";

// Member 1 (Ridhima): Medical Imaging (TB & Diabetic Retinopathy)
import TBImageUpload from "./components/ridhima/TBImageUpload";
import DRImageUpload from "./components/ridhima/DRImageUpload";

// Member 2 (Sparsh): Cardiovascular & Chronic Kidney Disease + SHAP
import ClinicalInputForm from "./components/sparsh/ClinicalInputForm";
import DiseaseResultCard from "./components/sparsh/DiseaseResultCard";
import ShapExplainationPanel from "./components/sparsh/ShapExplainationPanel";

// Member 3 (Purnendu): Respiratory & Metabolic (COPD & MASLD)
import COPDModule from "./components/purnendu/COPDModule";
import MASLDModule from "./components/purnendu/MASLDModule";

const TABS = [
  {
    id: "cardio-renal",
    label: "Cardiovascular & Renal (CVD / CKD)",
    subtitle: "Clinical Tabular + NLP Fusion & SHAP Explainability",
  },
  {
    id: "imaging",
    label: "Medical Imaging (TB / DR)",
    subtitle: "Chest X-Ray & Retinal Fundus Deep Learning + Grad-CAM",
  },
  {
    id: "metabolic-resp",
    label: "Respiratory & Metabolic (COPD / MASLD)",
    subtitle: "NHANES Calibrated Screening & Case-Based Reasoning",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("cardio-renal");
  const [cardioRenalResult, setCardioRenalResult] = useState(null);
  const [sessionFindings, setSessionFindings] = useState({});

  const recordFinding = (diseaseKey, payload) => {
    if (!payload) return;
    setSessionFindings((prev) => ({
      ...prev,
      [diseaseKey]: payload,
    }));
  };

  const handleCardioRenalOutput = (data) => {
    setCardioRenalResult(data);
    const key = data?.disease || "CVD/CKD";
    recordFinding(key, data);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Top Clinical Header */}
      <header className="bg-[#00696F] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[#32E0EB]" />
              <h1 className="text-xl font-bold tracking-tight">
                Multimodal Multi-Disease Clinical Decision Support System
              </h1>
            </div>
            <p className="text-xs text-cyan-100 mt-1">
              Unified AI Diagnostic Suite • CVD • CKD • Tuberculosis • Diabetic Retinopathy • COPD • MASLD
            </p>
          </div>

          {/* Active Session Summary Pill */}
          <div className="bg-[#006065] border border-cyan-400/30 rounded-xl px-4 py-2 text-xs">
            <span className="text-cyan-200 font-medium">Assessed Modules in Session: </span>
            <span className="font-bold text-[#32E0EB]">
              {Object.keys(sessionFindings).length} / 6
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#006065] border-t border-cyan-500/20">
          <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-2 py-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-left transition ${
                    isActive
                      ? "bg-[#32E0EB] text-slate-950 font-bold shadow-sm"
                      : "text-cyan-100 hover:bg-white/10"
                  }`}
                >
                  <div className="text-sm">{tab.label}</div>
                  <div
                    className={`text-[11px] ${
                      isActive ? "text-slate-800 font-medium" : "text-cyan-200/80"
                    }`}
                  >
                    {tab.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Clinical Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        {/* Session Cross-Disease Risk Strip */}
        {Object.keys(sessionFindings).length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Cross-Disease Session Summary
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(sessionFindings).map(([name, item]) => (
                <div
                  key={name}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2.5"
                >
                  <span className="font-bold text-[#00696F]">{item.disease || name}:</span>
                  <span className="font-semibold text-slate-800">
                    {item.prediction || "Completed"}
                  </span>
                  {item.risk_level && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-[#006065]">
                      {item.risk_level}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 1: Cardiovascular & Renal (Member 2 - Sparsh) */}
        {activeTab === "cardio-renal" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <ClinicalInputForm onResult={handleCardioRenalOutput} onPredictionComplete={handleCardioRenalOutput} />
            </div>
            <div className="lg:col-span-5 space-y-6">
              {cardioRenalResult ? (
                <>
                  <DiseaseResultCard result={cardioRenalResult} />
                  <ShapExplainationPanel result={cardioRenalResult} />
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
                  Submit patient vitals, lab biomarkers, or clinical notes on the left to compute calibrated CVD and CKD probabilities with SHAP feature attributions.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Medical Imaging - TB & DR (Member 1 - Ridhima) */}
        {activeTab === "imaging" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TBImageUpload
              onResult={(res) => recordFinding("Tuberculosis", res)}
              onPredictionComplete={(res) => recordFinding("Tuberculosis", res)}
            />
            <DRImageUpload
              onPredictionComplete={(res) => recordFinding("Diabetic Retinopathy", res)}
            />
          </div>
        )}

        {/* Tab 3: Respiratory & Metabolic - COPD & MASLD (Member 3 - Purnendu) */}
        {activeTab === "metabolic-resp" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <COPDModule
              onResult={(res) => recordFinding("COPD", res)}
              onPredictionComplete={(res) => recordFinding("COPD", res)}
            />
            <MASLDModule
              onResult={(res) => recordFinding("MASLD", res)}
              onPredictionComplete={(res) => recordFinding("MASLD", res)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-500">
        JIIT Noida • B.Tech VII Semester Major Project (2026–27) • Multimodal AI Clinical Decision Support System
      </footer>
    </div>
  );
}