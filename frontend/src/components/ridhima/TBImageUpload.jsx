
import React, { useEffect, useState } from "react";

export default function TBImageUpload() {
  const [image, setImage] = useState(null);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(image);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    const numericAge = Number(age);

    if (!image || age === "" || !sex) {
      setError("Please fill in all three inputs.");
      return;
    }

    if (
      !Number.isFinite(numericAge) ||
      numericAge < 0 ||
      numericAge > 120
    ) {
      setError("Age must be between 0 and 120.");
      return;
    }

    if (!["image/png", "image/jpeg"].includes(image.type)) {
      setError("Please upload a PNG or JPEG image.");
      return;
    }

    if (image.size > 10 * 1024 * 1024) {
      setError("Image must be 10 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);
    formData.append("age", String(numericAge));
    formData.append("sex", sex);

    setLoading(true);

    try {
      const response = await fetch("/api/tb/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "TB screening request failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to run TB screening.");
    } finally {
      setLoading(false);
    }
  }

  const flag = result?.explanation?.screening_flag;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "30px auto",
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 12,
      }}
    >
      <h2>Tuberculosis Screening</h2>

      <p>
        Multimodal TB screening using a chest X-ray,
        patient age, and sex.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="tb-image">
            <strong>Chest X-ray image</strong>
          </label>

          <input
            id="tb-image"
            type="file"
            accept="image/png,image/jpeg"
            required
            onChange={(event) => {
              setImage(event.target.files?.[0] || null);
              setResult(null);
            }}
            style={{ display: "block", marginTop: 8 }}
          />
        </div>

        {preview && (
          <img
            src={preview}
            alt="Selected chest X-ray"
            style={{
              width: "100%",
              maxHeight: 280,
              objectFit: "contain",
              marginBottom: 16,
            }}
          />
        )}

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="tb-age">
            <strong>Patient age</strong>
          </label>

          <input
            id="tb-age"
            type="number"
            min="0"
            max="120"
            step="any"
            value={age}
            required
            onChange={(event) => {
              setAge(event.target.value);
              setResult(null);
            }}
            style={{
              display: "block",
              width: "100%",
              padding: 8,
              marginTop: 8,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="tb-sex">
            <strong>Patient sex</strong>
          </label>

          <select
            id="tb-sex"
            value={sex}
            required
            onChange={(event) => {
              setSex(event.target.value);
              setResult(null);
            }}
            style={{
              display: "block",
              width: "100%",
              padding: 8,
              marginTop: 8,
              boxSizing: "border-box",
            }}
          >
            <option value="">Select</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Analyzing..." : "Run TB Screening"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h3>TB Screening Result</h3>

          <p>
            <strong>Screening outcome: </strong>
            {flag === true
              ? "TB screening flag"
              : flag === false
              ? "No TB screening flag"
              : "Unavailable"}
          </p>

          <p>
            <strong>Uncalibrated model score: </strong>
            {typeof result.risk === "number"
              ? result.risk.toFixed(6)
              : "Unavailable"}
          </p>

          <p>
            <strong>Screening threshold: </strong>
            {result.explanation?.screening_threshold ??
              "Unavailable"}
          </p>

          <p>
            <strong>Reliability: </strong>
            {result.reliability ?? "Not assessed"}
          </p>

          <p style={{ fontSize: 13, color: "#555" }}>
            {result.disclaimer}
          </p>

          <p style={{ fontSize: 13, color: "#555" }}>
            Research-only screening support. A screening
            flag does not confirm TB, and a negative
            screening flag does not rule it out.
          </p>
        </div>
      )}
    </div>
  );
}
