// Shared field definitions for the CVD and CKD module (form + result labels).
// Min/max values are plausibility limits to catch typing mistakes, not clinical cut-offs.

const YES_NO = [
  { value: "0", label: "No" },
  { value: "1", label: "Yes" },
];

export const PATIENT_FIELDS = [
  { key: "age", label: "Age", unit: "years", min: 1, max: 120, step: 1 },
  {
    key: "sex",
    label: "Sex",
    options: [
      { value: "1", label: "Male" },
      { value: "0", label: "Female" },
    ],
  },
];

export const CVD_GROUPS = [
  {
    title: "Presentation and vitals",
    fields: [
      {
        key: "cp",
        label: "Chest pain type",
        options: [
          { value: "1", label: "Typical angina" },
          { value: "2", label: "Atypical angina" },
          { value: "3", label: "Non-anginal pain" },
          { value: "4", label: "Asymptomatic" },
        ],
      },
      { key: "trestbps", label: "Resting blood pressure", unit: "mmHg", min: 70, max: 250, step: 1 },
      { key: "chol", label: "Serum cholesterol", unit: "mg/dL", min: 80, max: 700, step: 1 },
      { key: "fbs", label: "Fasting blood sugar above 120 mg/dL", options: YES_NO },
    ],
  },
  {
    title: "ECG and stress test",
    fields: [
      {
        key: "restecg",
        label: "Resting ECG",
        options: [
          { value: "0", label: "Normal" },
          { value: "1", label: "ST-T wave abnormality" },
          { value: "2", label: "LV hypertrophy" },
        ],
      },
      { key: "thalach", label: "Max heart rate achieved", unit: "bpm", min: 40, max: 230, step: 1 },
      { key: "exang", label: "Exercise-induced angina", options: YES_NO },
      { key: "oldpeak", label: "ST depression (exercise vs rest)", unit: "mm", min: 0, max: 8, step: 0.1 },
      {
        key: "slope",
        label: "Peak exercise ST slope",
        options: [
          { value: "1", label: "Upsloping" },
          { value: "2", label: "Flat" },
          { value: "3", label: "Downsloping" },
        ],
      },
      {
        key: "ca",
        label: "Major vessels coloured by fluoroscopy",
        options: [
          { value: "0", label: "0" },
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
        ],
      },
      {
        key: "thal",
        label: "Thallium stress result",
        options: [
          { value: "3", label: "Normal" },
          { value: "6", label: "Fixed defect" },
          { value: "7", label: "Reversible defect" },
        ],
      },
    ],
  },
];

const GRADE_0_5 = ["0", "1", "2", "3", "4", "5"].map((v) => ({ value: v, label: v }));

export const CKD_GROUPS = [
  {
    title: "Blood tests",
    fields: [
      { key: "sc", label: "Serum creatinine", unit: "mg/dL", min: 0.1, max: 30, step: 0.1 },
      { key: "bu", label: "Blood urea", unit: "mg/dL", min: 1, max: 400, step: 1 },
      { key: "hemo", label: "Hemoglobin", unit: "g/dL", min: 2, max: 20, step: 0.1 },
      { key: "pcv", label: "Packed cell volume", unit: "%", min: 10, max: 60, step: 1 },
      { key: "bgr", label: "Random blood glucose", unit: "mg/dL", min: 40, max: 600, step: 1 },
      { key: "sod", label: "Sodium", unit: "mEq/L", min: 100, max: 170, step: 1 },
      { key: "pot", label: "Potassium", unit: "mEq/L", min: 2, max: 9, step: 0.1 },
      { key: "wc", label: "White blood cell count", unit: "cells/cumm", min: 1000, max: 30000, step: 100 },
      { key: "rc", label: "Red blood cell count", unit: "millions/cmm", min: 1, max: 9, step: 0.1 },
    ],
  },
  {
    title: "Urine tests",
    fields: [
      { key: "sg", label: "Specific gravity", min: 1.0, max: 1.04, step: 0.005 },
      { key: "al", label: "Albumin (dipstick grade)", options: GRADE_0_5 },
      { key: "su", label: "Sugar (dipstick grade)", options: GRADE_0_5 },
    ],
  },
  {
    title: "Vitals and history",
    fields: [
      { key: "bp", label: "Diastolic blood pressure", unit: "mmHg", min: 40, max: 160, step: 1 },
      { key: "htn", label: "Hypertension", options: YES_NO },
      { key: "dm", label: "Diabetes mellitus", options: YES_NO },
      { key: "cad", label: "Coronary artery disease", options: YES_NO },
      {
        key: "appet",
        label: "Appetite",
        options: [
          { value: "0", label: "Good" },
          { value: "1", label: "Poor" },
        ],
      },
      { key: "pe", label: "Pedal edema", options: YES_NO },
      { key: "ane", label: "Anemia", options: YES_NO },
    ],
  },
];

export const CVD_KEYS = CVD_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
export const CKD_KEYS = CKD_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

// Readable names for keys returned by the backend (missing inputs, risk components).
export const FIELD_LABELS = {
  ...Object.fromEntries(
    [...PATIENT_FIELDS, ...CVD_GROUPS.flatMap((g) => g.fields), ...CKD_GROUPS.flatMap((g) => g.fields)].map(
      (f) => [f.key, f.label]
    )
  ),
  rbc: "Red blood cells (urine)",
  pc: "Pus cells (urine)",
  pcc: "Pus cell clumps",
  ba: "Bacteria (urine)",
  ecg_12lead_signal: "12-lead ECG signal",
  clinical_report_text: "Clinical report text",
};

export const COMPONENT_LABELS = {
  clinical: "Clinical inputs",
  tabular_uci: "Clinical inputs",
  ecg_abnormal: "12-lead ECG",
  report_text_abnormal: "Report text (NLP)",
  clinical_nlp: "Report text (NLP)",
  lab_panel: "Lab panel",
  history_symptoms: "History and symptoms",
};

export const labelFor = (key) => FIELD_LABELS[key] || key;
