
import React, { useEffect, useState } from "react";

export default function TBImageUpload() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(image);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setResult(null);

    if (!image || age === "" || !sex) {
      setError("Please provide an X-ray, age, and sex.");
      return;
    }

    const ageNumber = Number(age);

    if (
      !Number.isFinite(ageNumber) ||
      ageNumber < 0 ||
      ageNumber > 120
    ) {
      setError("Age must be between 0 and 120.");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);
    formData.append("age", String(ageNumber));
    formData.append("sex", sex);

    setLoading(true);

    try {
      const response = await fetch("/api/tb/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "TB screening request failed.";

        try {
          const body = await response.json();

          if (typeof body.detail === "string") {
            message = body.detail;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to contact the TB screening service."
      );
    } finally {
      setLoading(false);
    }
  };

  const screeningFlag =
    result?.explanation?.screening_flag;

  const screeningThreshold =
    result?.explanation?.screening_threshold;

  return (
    <section
      style={{
        maxWidth: 650,
        margin: "24px auto",
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 12,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2>TB Multimodal Screening</h2>

      <p>
        Research-only chest X-ray screening using
        Early-Fusion DenseNet-121, age, and sex.
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          <strong>Chest X-ray</strong>
          <input
            type="file"
            accept="image/png,image/jpeg"
            required
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              setImage(file);
              setResult(null);
              setError("");
            }}
            style={{ display: "block", margin: "8px 0 16px" }}
          />
        </label>

        {preview && (
          <img
            src={preview}
            alt="Selected chest X-ray preview"
            style={{
              maxWidth: "100%",
              maxHeight: 300,
              objectFit: "contain",
              marginBottom: 16,
            }}
          />
        )}

        <label>
          <strong>Age</strong>
          <input
            type="number"
            min="0"
            max="120"
            step="any"
            value={age}
            required
            onChange={(event) => setAge(event.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 8,
              margin: "8px 0 16px",
              boxSizing: "border-box",
            }}
          />
        </label>

        <label>
          <strong>Sex</strong>
          <select
            value={sex}
            required
            onChange={(event) => setSex(event.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 8,
              margin: "8px 0 16px",
              boxSizing: "border-box",
            }}
          >
            <option value="">Select sex</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 20px",
            border: "none",
            borderRadius: 8,
            background: "#1d4ed8",
            color: "white",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Analyzing..." : "Run TB Screening"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {result && (
        <div
          aria-live="polite"
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <h3>TB Screening Result</h3>

          <p>
            <strong>Screening outcome:</strong>{" "}
            {screeningFlag === true
              ? "TB screening flag"
              : screeningFlag === false
              ? "No TB screening flag"
              : "Unavailable"}
          </p>

          <p>
            <strong>Uncalibrated model score:</strong>{" "}
            {typeof result.risk === "number"
              ? result.risk.toFixed(6)
              : "Unavailable"}
          </p>

          <p>
            <strong>Screening threshold:</strong>{" "}
            {typeof screeningThreshold === "number"
              ? screeningThreshold.toFixed(8)
              : "Unavailable"}
          </p>

          <p>
            <strong>Reliability:</strong>{" "}
            {result.reliability ?? "Not assessed"}
          </p>

          <p>
            <strong>Model:</strong>{" "}
            {result.explanation?.model ?? "Unavailable"}
          </p>

          <p style={{ fontSize: 13, color: "#555" }}>
            {result.disclaimer ||
              "Research prototype only. Not a clinical diagnosis."}
          </p>

          <p style={{ fontSize: 13, color: "#555" }}>
            A screening flag does not confirm tuberculosis,
            and no flag does not rule it out. The score
            is not a calibrated clinical probability.
          </p>
        </div>
      )}
    </section>
  );
}
