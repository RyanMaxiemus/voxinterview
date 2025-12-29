import { useRef, useState, useEffect } from "react";
import ConfidenceBar from "./confidenceBar";
import { QUESTIONS } from "../questions";

export default function Recorder() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  const [role, setRole] = useState("frontend");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [error, setError] = useState("");

  // Reset interview when role changes
  useEffect(() => {
    setQuestionIndex(0);
    setQuestion("");
    setTranscript("");
    setFeedback(null);
    setConfidence(null);
  }, [role]);

  // -----------------------------
  // Ask interview question (TTS)
  // -----------------------------
  const askQuestion = async () => {
    setError("");
    setIsAsking(true);

    try {
      const res = await fetch("http://localhost:5000/interview/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      setQuestion(data.question);

      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setIsAsking(false);
        audio.play();
      } else {
        setIsAsking(false);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load interview question.");
      setIsAsking(false);
    }
  };

  // -----------------------------
  // Start recording answer
  // -----------------------------
  const startRecording = async () => {
    setError("");
    setTranscript("");
    setFeedback(null);
    setConfidence(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access denied.");
    }
  };

  // -----------------------------
  // Stop recording + analyze
  // -----------------------------
  const stopRecording = async () => {
    setIsRecording(false);
    setLoading(true);

    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const formData = new FormData();

      formData.append("audio", audioBlob);
      formData.append("role", role);
      formData.append("question", question);

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
      } catch {
        setError("Analysis failed.");
      } finally {
        setLoading(false);
      }
    };
  };

  const goToNextQuestion = () => {
    setQuestionIndex((prev) => prev + 1);
    setQuestion("");
    setTranscript("");
    setFeedback(null);
    setConfidence(null);
  };

  return (
    <div style={{ maxWidth: 650, margin: "0 auto" }}>
      <h2>🎙 Mock Interview</h2>

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="frontend">Frontend</option>
        <option value="backend">Backend</option>
        <option value="security">Security</option>
      </select>

      <p>
        Question {questionIndex + 1} of {QUESTIONS[role].length}
      </p>

      {!isAsking && !question && (
        <button onClick={askQuestion}>🎧 Get Question</button>
      )}

      {isAsking && <p>🔊 Asking question...</p>}

      {question && (
        <>
          <p style={{ fontStyle: "italic" }}>{question}</p>

          {!isRecording && !loading && (
            <button onClick={startRecording}>🎙 Start Answer</button>
          )}
        </>
      )}

      {isRecording && (
        <button onClick={stopRecording}>⏹ Stop Recording</button>
      )}

      {loading && <p>Analyzing response...</p>}

      {transcript && (
        <>
          <h3>Transcript</h3>
          <p>{transcript}</p>
        </>
      )}

      {confidence && (
        <>
          <h3>Confidence</h3>
          <ConfidenceBar score={confidence.score} />
        </>
      )}

      {feedback && (
        <>
          {fallbackMode && (
            <p style={{ color: "#b45309" }}>
              ⚠️ AI fallback mode active — limited analysis.
            </p>
          )}

          <h3>Feedback</h3>
          <ul>
            <li><strong>STAR:</strong> {feedback.starScore}/4</li>
            <li><strong>Clarity:</strong> {feedback.clarity}</li>
            <li><strong>Confidence:</strong> {feedback.confidence}</li>
            <li><strong>Relevance:</strong> {feedback.relevance}</li>
            <li><strong>Suggestion:</strong> {feedback.suggestion}</li>
          </ul>

          {questionIndex < QUESTIONS[role].length - 1 && (
            <button onClick={goToNextQuestion}>
              Next Question →
            </button>
          )}

          {questionIndex === QUESTIONS[role].length - 1 && (
            <p>🎉 Interview complete. Nice work!</p>
          )}
        </>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
