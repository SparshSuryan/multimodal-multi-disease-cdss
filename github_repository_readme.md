# Multimodal AI-Based Multi-Disease Clinical Decision Support System (CDSS)

**Jaypee Institute of Information Technology (JIIT), Noida**  
**Department of Computer Science & Engineering and IT**  
**Course:** Major Project-1 (`15B19CI791`) | B.Tech. CSE (VII Semester, 2026-2027)  
**Supervisor:** Ms. Richa Kushwaha (Assistant Professor, Grade-I)

---

## Overview

Modern clinical diagnosis combines physiological waveforms, medical imaging, laboratory blood panels, and physician notes. However, most existing medical AI tools function as isolated single-modality classifiers that break on incomplete outpatient records, output uncalibrated probabilities, silently average conflicting evidence, and require GPU servers unavailable in primary clinics.

This project implements a unified, **CPU-efficient Multimodal AI-Based Multi-Disease Clinical Decision Support System (CDSS)** screening **six major diseases across four clinical specialties and four data modalities** inside a single FastAPI, SQLite, and React clinical workstation:

- **Cardiovascular Disease (CVD):** 3-way multimodal late fusion of 12-lead ECG waveforms (`ECGNet`), cardiology clinical notes (Dynamic INT8 `Bio_ClinicalBERT`), and blood/clinical panels (missingness-aware calibrated Logistic Regression).
- **Chronic Kidney Disease (CKD):** Missingness-aware calibrated 300-tree Random Forest across 22-24 harmonized renal and hematological biomarkers.
- **Pulmonary Tuberculosis (TB):** 5-channel early-fusion `DenseNet-121` stacking 3 RGB chest X-ray channels with spatially broadcast patient age and biological sex.
- **Diabetic Retinopathy (DR):** 5-grade ICDR severity grading via `DenseNet-121` with label smoothing (`0.1`), clinical metadata fusion, and Grad-CAM lesion heatmaps.
- **Chronic Obstructive Pulmonary Disease (COPD):** Class-balanced Logistic Regression trained on 14 CDC NHANES (2011-2012) respiratory, smoking, and occupational exposure predictors (adults aged $\ge 40$).
- **Metabolic Dysfunction-Associated Steatotic Liver Disease (MASLD):** Tuned XGBoost trained on CDC NHANES (2017-2018) demographics and FibroScan transient elastography liver stiffness (`LUXSMED`, kPa; adults aged $\ge 20$).

---

## Key Engineering Highlights

- **Missing-Data Resilience:** Uses `SimpleImputer(strategy="median", add_indicator=True)` to preserve binary missingness flags and missing-tolerant log-odds late fusion that seamlessly runs 1-way, 2-way, or 3-way inference when tests are pending.
- **Probability Calibration:** Applies 5-fold Platt sigmoid calibration (`CalibratedClassifierCV`) across binary modules and label smoothing (`0.1`) for 5-grade DR to minimize Brier calibration error.
- **Cross-Modal Conflict Detection & Reliability Gate:** Flags pairwise modality disagreement whenever $d = \max |p_j - p_k| > 0.35$ and computes a composite reliability score $R = \text{clip}(1 - (0.4d + 0.3m + 0.3u), 0, 1)$ combining conflict ($d$), missingness ($m$), and boundary uncertainty ($u$).
- **Explainable AI (XAI):** Pairs every risk score with local **SHAP** (`LinearExplainer` / `TreeExplainer`) biomarker attributions and **PyTorch Grad-CAM** spatial lesion overlays (implemented using PyTorch hooks, Pillow, and NumPy without OpenCV).
- **CPU-Only Deployment Efficiency:** PyTorch Dynamic INT8 quantization compresses `Bio_ClinicalBERT` by **59.2%** (413.3 MB to 168.6 MB) with a **$2.75\times$ CPU speedup** and zero AUROC degradation, keeping single-patient screening under **200 ms** on standard clinic CPUs.
- **Longitudinal Clinical Workstation:** Role-based clinician authentication (`Doctor` / `Admin` with SHA-256 hashing), sequential Patient IDs (`PT-2026-XXXX`), automatic SQLite visit history (`cdss_records.db`), Pydantic range/eligibility validation, and mandatory non-diagnostic disclaimers.

---

## Key Experimental Results

All models were evaluated on strictly held-out, patient-disjoint or stratified test splits (official PTB-XL `strat_fold` Fold 10, 4-center UCI Heart LOHO, UCI CKD cross-cohort transfer, Shenzhen CXR test split, 5-grade DR test split, and stratified 80/20 NHANES test splits).

| Disease | Final Deployed Model | AUROC | F1-Score | Brier Score (Lower is Better) | Key Clinical & Robustness Finding |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **CVD** | 3-Way Calibrated Log-Odds Fusion | **0.985** | **0.931** | **0.055** | High-reliability ($R \ge 0.70$) accuracy **96.9%** vs. 85.5% under conflict; 4-hospital LOHO AUROC **0.809**. |
| **CKD** | Missingness-Aware Calibrated RF | **1.000** | **1.000** | **0.010** | Sustains **0.982 AUROC** under 50% masked labs; **0.999-1.000** zero-shot cross-cohort transfer (UCI 857 / 336). |
| **TB** | 5-Ch Early-Fusion `DenseNet-121` | **0.9756** | **0.9057** | **0.0826** | Tuned threshold raises sensitivity from 80.39% to **94.12%** at 168.44 ms median CPU latency. |
| **DR (5-Grade)** | Metadata-Fused `DenseNet-121` (LS 0.1) | **0.8349** | **0.5204**\* | **0.6074**\* | +1.25% Macro F1 & +1.10% Balanced Accuracy over image-only; Grad-CAM localizes retinal lesions. |
| **COPD** | Balanced LR + 5-Fold Platt ($\tau = 0.61$) | **0.8030** | **0.4947** | **0.1163** | Platt sigmoid calibration reduced Brier error by **40.4%** (0.1950 to 0.1163). |
| **MASLD** | Tuned XGBoost + 5-Fold Platt ($\tau = 0.56$) | **0.6873** | **0.5025** | **0.1841** | Liver stiffness (`LUXSMED`) lifts AUROC +0.076; Platt calibration cut Brier error by **28.8%**. |

*\*Multiclass Macro F1 and multiclass Brier Score across all 5 ICDR Diabetic Retinopathy grades.*

---

## Technology Stack

- **Deep Learning & Clinical NLP:** PyTorch 2.x (Dynamic INT8 Quantization), Torchvision (`DenseNet-121`, `ViT-B/16`), HuggingFace Transformers (`Bio_ClinicalBERT`), `wfdb`
- **Tabular ML & Calibration:** Scikit-learn (`SimpleImputer`, `CalibratedClassifierCV`), XGBoost, Joblib, Pandas, NumPy
- **Explainability & Imaging:** SHAP (`LinearExplainer`, `TreeExplainer`), PyTorch Grad-CAM hooks, Pillow (PIL), Matplotlib
- **Backend & Database:** FastAPI, Uvicorn, Pydantic, SQLite3 (`cdss_records.db`)
- **Frontend Dashboard:** React 18, Vite, Tailwind CSS, Lucide Icons

---

## Repository Structure

```text
multimodal-multi-disease-cdss/
├── backend/
│   ├── services/              # Inference, calibration, fusion & XAI helpers
│   ├── cdss_records.db        # SQLite longitudinal patient & consultation registry
│   ├── copd_masld_app.py      # COPD & MASLD screening inference module
│   ├── main.py                # Unified FastAPI REST server & Pydantic schemas
│   └── records_router.py      # Role-based authentication & patient history routes
├── docs/
│   └── results/               # Master ablation CSVs, confusion matrices & Grad-CAM plots
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── purnendu/      # COPDModule.jsx, MASLDModule.jsx
│   │   │   ├── records/       # AdminDashboard.jsx, LoginPage.jsx, PatientLookupBar.jsx
│   │   │   ├── ridhima/       # DRImageUpload.jsx, TBImageUpload.jsx
│   │   │   └── sparsh/        # ClinicalInputForm.jsx, DiseaseResultCard.jsx, ShapExplanationPanel.jsx
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── models/
│   ├── copd/                  # Calibrated COPD pipeline & metadata (.pkl)
│   ├── masld/                 # Calibrated MASLD folds, preprocessor & XGBoost (.json)
│   └── tb/                    # 5-channel early-fusion TB deployment checkpoint
├── notebooks/
│   ├── purnendu_copd_nafld_masld/  # COPD & MASLD baseline, optimization & calibration notebooks
│   ├── ridhima_imaging/            # TB & DR preprocessing, baseline, optimization & fusion notebooks
│   └── sparsh_cvd_ckd/             # PTB-XL, UCI Heart, CKD, NLP, conflict & quantization notebooks
├── requirements.txt
└── README.md
```

---

## Quick Start (Local CPU Deployment)

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Standard multi-core CPU with $\ge 8$ GB RAM (no GPU required for inference)

### 1. Clone the Repository
```bash
git clone https://github.com/SparshSuryan/multimodal-multi-disease-cdss.git
cd multimodal-multi-disease-cdss
```

### 2. Start the FastAPI Backend
```bash
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```
API documentation is available at `http://localhost:8000/docs`.

### 3. Start the React Clinical Workstation
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5174` (or the local Vite URL printed in your terminal) and sign in with the configured `Doctor` or `Admin` credentials.

---

## Team & Contributions

| Team Member | Enrolment No. | Assigned Modules | Core Responsibilities |
| :--- | :---: | :--- | :--- |
| **Ridhima Jain** | `23103377` | Tuberculosis (TB) & Diabetic Retinopathy (DR) | 5-channel early-fusion `DenseNet-121` (Shenzhen CXR), 5-grade DR `DenseNet-121` + metadata fusion & label smoothing, Grad-CAM maps, imaging UI. |
| **Sparsh Suryan** | `23103378` | CVD, CKD & Unified System Core | 3-seed `ECGNet`, Dynamic INT8 `Bio_ClinicalBERT`, missingness-aware CVD/CKD tabular models, Platt calibration, 3-way log-odds fusion, conflict gate, SHAP, FastAPI/SQLite/React workstation. |
| **Purnendu Raghav Srivastava** | `23103379` | COPD & MASLD (Fatty Liver) | CDC NHANES 2011-2012 & 2017-2018 curation, calibrated Logistic Regression (COPD) & tuned XGBoost with `LUXSMED` liver stiffness (MASLD), OOF threshold tuning, pulmonology/hepatology UI. |

---

## Clinical Governance & Disclaimer

> **Decision Support Only — Not a Medical Diagnosis.**  
> This software is developed strictly for academic research and preliminary clinical triage decision support using publicly available, de-identified benchmark datasets (PhysioNet PTB-XL, UCI Heart, UCI CKD, Shenzhen Chest X-Ray, Retinal Fundus, and CDC NHANES). Automated risk scores, conflict alerts, and follow-up test suggestions do not constitute a medical diagnosis. Final diagnostic and treatment decisions rest solely with a licensed physician.