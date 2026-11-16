
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
    <>
      {/* MODEL ANALYTICS DASHBOARD */}
      <section style={styles.dashboard}>
        <br></br>

        {/* SUMMARY METRICS */}
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>COPD Features</span>
            <strong style={styles.summaryValue}>14</strong>
          </div>

          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>MASLD Features</span>
            <strong style={styles.summaryValue}>4</strong>
          </div>

          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>COPD Threshold</span>
            <strong style={styles.summaryValue}>0.61</strong>
          </div>

          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>MASLD Threshold</span>
            <strong style={styles.summaryValue}>0.56</strong>
          </div>
        </div>

        {/* FEATURE COMPARISON */}
        <div style={styles.chartBlock}>
          <h3 style={styles.chartTitle}>Input Feature Comparison</h3>

          <div style={styles.barRow}>
            <span>COPD</span>
            <div style={styles.track}>
              <div
                style={{
                  ...styles.bar,
                  width: "100%",
                  background: "#c49b55",
                }}
              />
            </div>
            <b>14</b>
          </div>

          <div style={styles.barRow}>
            <span>MASLD</span>
            <div style={styles.track}>
              <div
                style={{
                  ...styles.bar,
                  width: "28.57%",
                  background: "#8c9bb5",
                }}
              />
            </div>
            <b>4</b>
          </div>
        </div>

        {/* THRESHOLD COMPARISON */}
        <div style={styles.chartBlock}>
          <h3 style={styles.chartTitle}>Classification Threshold</h3>

          <div style={styles.barRow}>
            <span>COPD</span>
            <div style={styles.track}>
              <div
                style={{
                  ...styles.bar,
                  width: "61%",
                  background: "#c49b55",
                }}
              />
            </div>
            <b>0.61</b>
          </div>

          <div style={styles.barRow}>
            <span>MASLD</span>
            <div style={styles.track}>
              <div
                style={{
                  ...styles.bar,
                  width: "56%",
                  background: "#8c9bb5",
                }}
              />
            </div>
            <b>0.56</b>
          </div>
        </div>

        {/* MODEL DETAILS */}
        <div style={styles.detailsGrid}>
          <div style={styles.detailBox}>
            <h3 style={styles.chartTitle}>Model Algorithms</h3>

            <div style={styles.detailLine}>
              <span>COPD</span>
              <strong>Logistic Regression</strong>
            </div>

            <div style={styles.detailLine}>
              <span>MASLD</span>
              <strong>XGBoost</strong>
            </div>
          </div>

          <div style={styles.detailBox}>
            <h3 style={styles.chartTitle}>Probability Calibration</h3>

            <div style={styles.detailLine}>
              <span>COPD</span>
              <strong>Sigmoid</strong>
            </div>

            <div style={styles.detailLine}>
              <span>MASLD</span>
              <strong>Five-fold Sigmoid</strong>
            </div>
          </div>
        </div>
      </section>

      {/* MASLD SCREENING FORM */}
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

            <p>
              <b>Missing inputs:</b>{" "}
              {result.missing_inputs?.join(", ") || "None"}
            </p>

            <p><b>Explanation:</b></p>
            <pre>{JSON.stringify(result.explanation, null, 2)}</pre>

            <p>{result.disclaimer}</p>
          </div>
        )}
      </section>
    </>
  );
}

const styles = {
  dashboard: {
    maxWidth: "850px",
    margin: "10px auto 8px",
    padding: "12px 25px",
    color: "#fff",
  },

  dashboardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "14px",
  },

  dashboardTitle: {
    fontSize: "21px",
    margin: 0,
  },

  tag: {
    color: "#c49b55",
    border: "1px solid #c49b55",
    borderRadius: "20px",
    padding: "6px 12px",
    fontSize: "10px",
    letterSpacing: "1px",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "10px",
    marginBottom: "14px",
  },

  summaryItem: {
    background: "#171717",
    border: "1px solid #333",
    borderRadius: "9px",
    padding: "13px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  summaryLabel: {
    color: "#fff",
    fontSize: "11px",
  },

  summaryValue: {
    color: "#c49b55",
    fontSize: "23px",
  },

  chartBlock: {
    background: "#171717",
    border: "1px solid #333",
    borderRadius: "9px",
    padding: "14px",
    marginBottom: "10px",
  },

  chartTitle: {
    color: "#c49b55",
    fontSize: "14px",
    margin: "0 0 13px",
  },

  barRow: {
    display: "grid",
    gridTemplateColumns: "55px 1fr 42px",
    alignItems: "center",
    gap: "10px",
    margin: "11px 0",
    fontSize: "12px",
  },

  track: {
    height: "11px",
    background: "#303030",
    borderRadius: "10px",
    overflow: "hidden",
  },

  bar: {
    height: "100%",
    borderRadius: "10px",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "0",
  },

  detailBox: {
    background: "#171717",
    border: "1px solid #333",
    borderRadius: "9px",
    padding: "14px",
  },

  detailLine: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    marginBottom: "12px",
    fontSize: "12px",
  },

  container: {
    maxWidth: "850px",
    margin: "0 auto 30px",
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

  label: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

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

  error: {
    color: "#ff7777",
  },
};
