import { useRef, useState } from "react";
import ConfidenceBar from "./confidenceBar";

export default function Recorder() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  const [fallbackMode, setFallbackMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState("frontend");
  const [question, setQuestion] = useState("");
  const [questionAudio, setQuestionAudio] = useState(null);

  const loadQuestion = async () => {
    const res = await fetch("http://localhost:5000/interview/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });

    const data = await res.json();
    setQuestion(data.question);

    if (data.audioUrl) {
      const audio = new Audio(`http://localhost:5000${data.audioUrl}`);
      audio.play();
      setQuestionAudio(audio);
    }
  };

  const askQuestion = async () => {
    setError("");
    setQuestion("");
    setIsAsking(true);

    try {
      const res = await fetch("http://localhost:5000/interview/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();

      setQuestion(data.question);

      // Play TTS audio
      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsAsking(false);
      };

      audio.play();
    } catch (err) {
      setError("Failed to load interview question: ", err);
      setIsAsking(false);
    }
  };

  const startRecording = async () => {
    setError("");
    setTranscript("");
    setFeedback(null);
    setConfidence(null);

    await loadQuestion();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access denied.", err);
    }
  };


  const stopRecording = async () => {
    setIsRecording(false);
    setLoading(true);

    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/wav",
      });

      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("role", role);

      try {
        const res = await fetch("http://localhost:5000/analyze", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        setTranscript(data.transcript);
        setFeedback(data.feedback);
        setConfidence(data.confidence);
        setFallbackMode(data.meta?.fallbackMode === true);
      } catch (err) {
        setError("Analysis failed. Try again.", err);
      } finally {
        setLoading(false);
      }
    };
  };

  return (
    <>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
          <option value="security">Security</option>
        </select>
        <h2>🎙 Practice Interview</h2>
        {!isRecording && !loading && !isAsking && (
          <button onClick={askQuestion}>
            🎤 Get Interview Question
          </button>
        )}

        {isAsking && <p>🔊 Asking question...</p>}

        {question && (
          <div style={{ marginBottom: 16 }}>
            <strong>Interview Question:</strong>
            <p>{question}</p>
          </div>
        )}

        {!isAsking && !loading && question && (
          <button onClick={startRecording}>
            🎙️ Answer Question
          </button>
        )}

        {isRecording && (
          <button onClick={stopRecording}>Stop Recording</button>
        )}

        {loading && <p>Analyzing your answer…</p>}

        {error && <p style={{ color: "red" }}>{error}</p>}

        {question && (
          <div style={{ marginBottom: 12 }}>
            <h3>Interview Question</h3>
            <p>{question}</p>
          </div>
        )}


        {transcript && (
          <>
            <h3>Transcript</h3>
            <p>{transcript}</p>
          </>
        )}

        {confidence && (
          <>
            <h3><strong>Confidence Score</strong></h3>
            <div style={{
              background: "#eee",
              borderRadius: 8,
              overflow: "hidden",
              height: 18,
              marginBottom: 8
            }}>
              <div
                style={{
                  width: `${confidence.score * 10}%`,
                  height: "100%",
                  background:
                      confidence.score > 7
                      ? "#4caf50"
                      : confidence.score > 5
                      ? "#ff9800"
                      : "#f44336",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <strong>{confidence.score}/10</strong>
            {confidence.notes?.length > 0 && (
              <ul>
                {confidence.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            )}
          </>
        )}

        {feedback && (
          <>
            {fallbackMode && (
            <p style={{ color: "#b45309" }}>
              ⚠️ Advanced AI feedback temporarily unavailable. Confidence analysis is based on speech heuristics.
            </p>
            )}
            <h3>Feedback</h3>
            <ul>
              <li><strong>STAR Score:</strong> {feedback.starScore?.toFixed(2)}/4</li>
              <li><strong>Clarity:</strong> {feedback.clarity}</li>
              <li><strong>Confidence:</strong> {feedback.confidence}</li>
              <li><strong>Relevance:</strong> {feedback.relevance}</li>
              <li><strong>Suggestion:</strong> {feedback.suggestion}</li>
            </ul>
          </>
        )}
      </div>
    </>
  );
}
