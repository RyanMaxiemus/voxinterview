export default function ConfidenceBar({ score }) {
  // Normalize score to 0–100
  let normalizedScore = 0;

  if (typeof score === "number") {
    if (score <= 4) {
      // STAR-style (1–4)
      normalizedScore = Math.round((score / 4) * 100);
    } else {
      // Already percentage-based
      normalizedScore = Math.min(Math.max(score, 0), 100);
    }
  }

  const getLabel = () => {
    if (normalizedScore >= 75) return "High Confidence";
    if (normalizedScore >= 45) return "Moderate Confidence";
    return "Low Confidence";
  };

  const getColor = () => {
    if (normalizedScore >= 75) return "#4caf50"; // green
    if (normalizedScore >= 45) return "#ffc107"; // yellow
    return "#f44336"; // red
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Confidence</strong>
        <span>{getLabel()}</span>
      </div>

      <div
        style={{
          height: 10,
          background: "#eee",
          borderRadius: 6,
          overflow: "hidden",
          marginTop: 6
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${normalizedScore}%`,
            background: getColor(),
            transition: "width 0.4s ease",
          }}
        />
      </div>

      <small style={{ opacity: 0.7 }}>
        Score: {normalizedScore}/100
      </small>
    </div>
  );
}
