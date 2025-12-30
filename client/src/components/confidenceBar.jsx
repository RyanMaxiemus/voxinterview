export default function ConfidenceBar({ score }) {
  // Normalize score to 0–10 scale
  let normalizedScore = 0;

  if (typeof score === 'number') {
    if (score <= 4) {
      // STAR-style (1–4) - convert to 0-10 scale
      normalizedScore = Math.round((score / 4) * 10);
    } else if (score <= 10) {
      // Already on 1-10 scale
      normalizedScore = Math.max(0, Math.min(10, score));
    } else {
      // Percentage-based (0-100) - convert to 0-10 scale
      normalizedScore = Math.round(score / 10);
    }
  }

  const getLabel = () => {
    if (normalizedScore >= 7) return 'High Confidence';
    if (normalizedScore >= 4) return 'Moderate Confidence';
    return 'Low Confidence';
  };

  const getColor = () => {
    if (normalizedScore >= 7) return '#4caf50'; // green
    if (normalizedScore >= 4) return '#ffc107'; // yellow
    return '#f44336'; // red
  };

  // Convert to percentage for the progress bar width
  const progressPercentage = (normalizedScore / 10) * 100;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* <strong>Confidence</strong> */}
        <span>{getLabel()}</span>
      </div>

      <div
        style={{
          height: 10,
          background: '#eee',
          borderRadius: 6,
          overflow: 'hidden',
          marginTop: 6
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercentage}%`,
            background: getColor(),
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      <small style={{ opacity: 0.7 }}>Score: {normalizedScore}/10</small>
    </div>
  );
}
