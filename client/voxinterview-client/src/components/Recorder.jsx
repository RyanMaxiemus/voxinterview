import { useRef, useState } from "react";

export default function Recorder() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [fallbackMode, setFallbackMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");


  const startRecording = async () => {
    setError("");
    setTranscript("");
    setFeedback(null);

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

      try {
        const res = await fetch("http://localhost:5000/analyze", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        setTranscript(data.transcript);
        setFeedback(data.feedback);
        setFallbackMode(data.meta?.fallbackMode === true);
      } catch (err) {
        setError("Analysis failed. Try again.", err);
      } finally {
        setLoading(false);
      }
    };
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2>🎙 Practice Interview</h2>

      {!isRecording && !loading && (
        <button onClick={startRecording}>Start Recording</button>
      )}

      {isRecording && (
        <button onClick={stopRecording}>Stop Recording</button>
      )}

      {loading && <p>Analyzing your answer…</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {transcript && (
        <>
          <h3>Transcript</h3>
          <p>{transcript}</p>
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
            <li><strong>Clarity:</strong> {feedback.clarity}</li>
            <li><strong>Confidence:</strong> {feedback.confidence}</li>
            <li><strong>Relevance:</strong> {feedback.relevance}</li>
            <li><strong>Suggestion:</strong> {feedback.suggestion}</li>
          </ul>
        </>
      )}
    </div>
  );
}
