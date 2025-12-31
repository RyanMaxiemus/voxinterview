import { useEffect, useRef, useState } from 'react';
import { ROLE_PROFILES } from '../roleProfiles';
import ConfidenceBar from './confidenceBar';

/**
 * Recorder Component
 * Handles the interview lifecycle: fetching questions, recording audio,
 * and displaying AI-generated feedback.
 */
export default function Recorder() {
  // --- Refs for persistent non-render data ---
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  // --- Interview Progress State ---
  const [role, setRole] = useState('frontend');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState('');

  // --- UI/UX Flow State ---
  const [isAsking, setIsAsking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Analysis Results State ---
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  /**
   * Effect: Reset the interview board whenever the user switches roles.
   */
  useEffect(() => {
    setQuestionIndex(0);
    setQuestion('');
    setTranscript('');
    setFeedback(null);
    setConfidence(null);
    setError('');

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [role]);

  /**
   * Fetches the specific question (text + audio).
   */
  const fetchQuestion = async index => {
    setError('');
    setIsAsking(true);
    try {
      const res = await fetch('https://RyanMaxie.tech/vox-api/interview/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, questionIndex: index })
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setQuestion(data.question);

      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setIsAsking(false);
        audio.onerror = () => {
          setError('Audio playback failed.');
          setIsAsking(false);
        };

        try {
          await audio.play();
        } catch (err) {
          console.error(err);
          setError('Click to enable audio playback');
          const enableAudio = () => {
            audio
              .play()
              .then(() => {
                setError('');
                setIsAsking(true);
              })
              .catch(playErr => console.error(playErr));
            document.removeEventListener('click', enableAudio);
          };
          document.addEventListener('click', enableAudio);
          setIsAsking(false);
        }
      } else {
        setIsAsking(false);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load interview question.');
      setIsAsking(false);
    }
  };

  /**
   * Initializes the microphone and starts data collection.
   */
  const startRecording = async () => {
    setError('');
    setTranscript('');
    setFeedback(null);
    setConfidence(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = e => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError('Microphone access denied.');
    }
  };

  /**
   * Stops the mic and ships the audio blob to the backend.
   */
  const stopRecording = async () => {
    setIsRecording(false);
    setLoading(true);
    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('role', role);
      formData.append('question', question);
      formData.append('questionIndex', questionIndex);

      try {
        const res = await fetch('https://RyanMaxie.tech/vox-api/analyze', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        setTranscript(data.transcript);
        setFeedback(data.feedback);
        setConfidence(data.confidence);
        setFallbackMode(data.meta?.fallbackMode === true);
      } catch (err) {
        console.error(err);
        setError('Analysis failed.');
      } finally {
        setLoading(false);
      }
    };
  };

  const goToNextQuestion = () => {
    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    setQuestion('');
    setTranscript('');
    setFeedback(null);
    setConfidence(null);
    fetchQuestion(nextIndex);
  };

  return (
    <div className='recorder-container'>
      <h2>🎙 Mock Interview</h2>

      <select
        value={role}
        onChange={e => setRole(e.target.value)}
      >
        <option value='frontend'>Frontend</option>
        <option value='backend'>Backend</option>
        <option value='security'>Security</option>
      </select>

      <p>
        Question {questionIndex + 1} of {ROLE_PROFILES[role].questions.length}
      </p>

      {!isAsking && !question && (
        <button onClick={() => fetchQuestion(questionIndex)}>🎧 Get Question</button>
      )}

      {isAsking && <p>🔊 Asking question...</p>}

      {question && (
        <>
          <p style={{ fontStyle: 'italic' }}>{question}</p>
          {!isRecording && !loading && !feedback && (
            <button onClick={startRecording}>🎙 Start Answer</button>
          )}
        </>
      )}

      {isRecording && <button onClick={stopRecording}>⏹ Stop Recording</button>}
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
            <p style={{ color: '#b45309' }}>
              ⚠️ AI fallback mode active — limited analysis.
            </p>
          )}
          <h3>Feedback</h3>
          <ul>
            <li>
              <strong>STAR:</strong> {feedback.starScore}/4
            </li>
            <li>
              <strong>Clarity:</strong> {feedback.clarity}
            </li>
            <li>
              <strong>Confidence:</strong> {feedback.confidence}
            </li>
            <li>
              <strong>Relevance:</strong> {feedback.relevance}
            </li>
            <li>
              <strong>Suggestion:</strong> {feedback.suggestion}
            </li>
          </ul>

          {questionIndex < ROLE_PROFILES[role].questions.length - 1 ? (
            <button onClick={goToNextQuestion}>Next Question →</button>
          ) : (
            <p>🎉 Interview complete. Nice work!</p>
          )}
        </>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
