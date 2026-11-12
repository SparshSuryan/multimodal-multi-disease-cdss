# Multimodal AI-Based Multi-Disease Clinical Decision Support System

B.Tech. VII Semester Major Project (JIIT Noida, 2026–27)

## Team Division
- **Ridhima Jain (Imaging Lead):** Diabetes (BRSET), TB (NLM/TB Portals), Stroke (ISLES'24/RSNA CT), Grad-CAM
- **Sparsh Suryan (Clinical ML & NLP Lead):** CVD (PTB-XL + UCI Heart), CKD (UCI 336 + UCI 857), Bio_ClinicalBERT NLP, Conflict Detection, Investigation Suggestions, SHAP
- **Purnendu raghav Srivastava (Systems Lead):** COPD & NAFLD (NHANES), Global Reliability/Calibration, Case-Based Reasoning (SQL), FastAPI Backend, React Dashboard Shell, Docker

## Repository Structure
- `notebooks/` — Reproducible Google Colab experimentation pipelines
- `backend/services/` — Standalone FastAPI inference modules (`cvd_service.py`, `ckd_service.py`)
- `frontend/src/components/` — Modular React clinician dashboard components
- `docs/results/` — Consolidated ablation, calibration, and generalization metrics