export default function ConfidenceBar({ score }) {
  const percent = (score / 10) * 100;

  return (
    <div>
      <p>Confidence Score: {score}/10</p>
      <div style={{
        height: 10,
        background: "#eee",
        borderRadius: 5
      }}>
        <div style={{
          height: "100%",
          width: `${percent}%`,
          background: percent > 70 ? "#4caf50" : percent > 40 ? "#ffc107" : "#f44336",
          borderRadius: 5
        }} />
      </div>
    </div>
  );
}
