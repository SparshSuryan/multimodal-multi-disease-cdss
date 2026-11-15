import React, { useState } from "react";

const API = "http://localhost:8000";

const fields = [
  ["RIDAGEYR", "Age", 40],
  ["RIAGENDR", "Gender code", 0],
  ["RIDRETH1", "Race/ethnicity code", 0],
  ["MCQ160G", "Emphysema history", 0],
  ["MCQ160K", "Chronic bronchitis history", 0],
  ["RDQ031", "Respiratory symptom 1", 0],
  ["RDQ050", "Respiratory symptom 2", 0],
  ["RDQ070", "Respiratory symptom 3", 0],
  ["OCQ510", "Occupation exposure 1", 0],
  ["OCQ530", "Occupation exposure 2", 0],
  ["OCQ550", "Occupation exposure 3", 0],
  ["OCQ570", "Occupation exposure 4", 0],
  ["age_started_smoking", "Age started smoking", 0],
  ["smoking_status", "Smoking status code", 0],
];

export default function COPDModule() {
  const [form, setForm] = useState(
    Object.fromEntries(fields.map(([key, , initial]) => [key, initial]))
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value === "" ? null : Number(value),
    }));
  };

  const predict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API}/api/copd/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(data.detail || data));
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to connect to COPD API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={styles.container}>
      <h2>COPD Risk Screening</h2>
      <p>Enter the clinical and demographic inputs.</p>

      <form onSubmit={predict}>
        <div style={styles.grid}>
          {fields.map(([key, label]) => (
            <label key={key} style={styles.label}>
              {label}
              <input
                style={styles.input}
                type="number"
                step="any"
                value={form[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
              />
              <small>{key}</small>
            </label>
          ))}
        </div>

        <button style={styles.button} disabled={loading}>
          {loading ? "Analyzing..." : "Predict COPD Risk"}
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}

      {result && (
        <div style={styles.result}>
          <h3>Prediction Results</h3>
          <p><b>Risk score:</b> {result.risk}</p>
          <p><b>Prediction:</b> {result.prediction}</p>
          <p><b>Threshold:</b> {result.threshold}</p>
          <p><b>Reliability:</b> {result.reliability}</p>
          <p><b>Missing inputs:</b> {result.missing_inputs?.join(", ") || "None"}</p>
          <p><b>Explanation:</b></p>
          <pre>{JSON.stringify(result.explanation, null, 2)}</pre>
          <p>{result.disclaimer}</p>
        </div>
      )}
    </section>
  );
}

const styles = {
  container: {
    maxWidth: "850px",
    margin: "30px auto",
    padding: "25px",
    background: "#171717",
    color: "#fff",
    borderRadius: "12px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  label: { display: "flex", flexDirection: "column", gap: "6px" },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #555",
    background: "#252525",
    color: "#fff",
  },
  button: {
    marginTop: "22px",
    padding: "12px 20px",
    width: "100%",
    background: "#c49b55",
    color: "#111",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  result: {
    marginTop: "25px",
    padding: "18px",
    background: "#252525",
    borderRadius: "8px",
    overflowWrap: "anywhere",
  },
  error: { color: "#ff7777" },
};
