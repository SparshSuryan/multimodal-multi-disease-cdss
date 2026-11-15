import React, { useState } from "react";

const API = "http://localhost:8000";

export default function MASLDModule() {
  const [form, setForm] = useState({
    RIDAGEYR: 45,
    RIAGENDR: 1,
    RIDRETH3: 3,
    LUXSMED: 6.5,
  });

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
      const response = await fetch(`${API}/api/masld/predict`, {
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
      setError(err.message || "Unable to connect to MASLD API.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    ["RIDAGEYR", "Age"],
    ["RIAGENDR", "Gender code"],
    ["RIDRETH3", "Race/ethnicity code"],
    ["LUXSMED", "Median liver stiffness (kPa)"],
  ];

  return (
    <section style={styles.container}>
      <h2>NAFLD / MASLD Risk Screening</h2>
      <p>Enter the demographic and elastography inputs.</p>

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
                required
              />
              <small>{key}</small>
            </label>
          ))}
        </div>

        <button style={styles.button} disabled={loading}>
          {loading ? "Analyzing..." : "Predict MASLD Risk"}
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
