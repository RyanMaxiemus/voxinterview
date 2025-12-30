import { useEffect, useRef, useState } from 'react';
import { ROLE_PROFILES } from '../roleProfiles';
import ConfidenceBar from './confidenceBar';

export default function Recorder() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  const [role, setRole] = useState('frontend');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [error, setError] = useState('');

  // Reset interview when role changes
  useEffect(() => {
    setQuestionIndex(0);
    setQuestion('');
    setTranscript('');
    setFeedback(null);
    setConfidence(null);
  }, [role]);

  // -----------------------------
  // Ask interview question (TTS)
  // -----------------------------
  const askQuestion = async () => {
    setError('');
    setIsAsking(true);

    try {
      const res = await fetch('http://localhost:5000/interview/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          questionIndex
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setQuestion(data.question);

      if (data.audioUrl) {
        console.log('Playing audio from:', data.audioUrl);
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          console.log('Audio playback ended');
          setIsAsking(false);
        };

        audio.onerror = e => {
          console.error('Audio playback error:', e);
          setIsAsking(false);
        };

        audio.onloadstart = () => {
          console.log('Audio loading started');
        };

        audio.oncanplay = () => {
          console.log('Audio can start playing');
        };

        // Add user interaction requirement for autoplay
        audio.onloadeddata = () => {
          console.log('Audio data loaded, attempting to play...');
        };

        try {
          // Try to play audio
          const playPromise = audio.play();

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Audio playback started successfully');
              })
              .catch(error => {
                console.warn('Autoplay prevented by browser:', error);
                // Show a message to user that they need to click to hear audio
                setError('Click anywhere to enable audio playback');
                setIsAsking(false);

                // Add click listener to enable audio
                const enableAudio = () => {
                  audio
                    .play()
                    .then(() => {
                      console.log('Audio started after user interaction');
                      setError('');
                      setIsAsking(true);
                      document.removeEventListener('click', enableAudio);
                    })
                    .catch(err => {
                      console.error(
                        'Audio play failed even after user interaction:',
                        err
                      );
                      setIsAsking(false);
                    });
                };
                document.addEventListener('click', enableAudio, { once: true });
              });
          }
        } catch (playError) {
          console.error('Audio play failed:', playError);
          setIsAsking(false);
        }
      } else {
        console.log('No audio URL provided, using text-only');
        setIsAsking(false);
      }
    } catch (err) {
      console.error('Ask question error:', err);
      setError('Failed to load interview question.');
      setIsAsking(false);
    }
  };

  // -----------------------------
  // Start recording answer
  // -----------------------------
  const startRecording = async () => {
    setError('');
    setTranscript('');
    setFeedback(null);
    setConfidence(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = e => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      setError('Microphone access denied.');
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
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const formData = new FormData();

      formData.append('audio', audioBlob);
      formData.append('role', role);
      formData.append('question', question);
      formData.append('questionIndex', questionIndex);

      try {
        const res = await fetch('http://localhost:5000/analyze', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();

        setTranscript(data.transcript);
        setFeedback(data.feedback);
        setConfidence(data.confidence);
        setFallbackMode(data.meta?.fallbackMode === true);
      } catch {
        setError('Analysis failed.');
      } finally {
        setLoading(false);
      }
    };
  };

  const goToNextQuestion = async () => {
    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    setQuestion('');
    setTranscript('');
    setFeedback(null);
    setConfidence(null);
    setError('');

    // Ask the next question immediately with the new index
    setIsAsking(true);

    try {
      const res = await fetch('http://localhost:5000/interview/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          questionIndex: nextIndex
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setQuestion(data.question);

      if (data.audioUrl) {
        console.log('Playing audio from:', data.audioUrl);
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          console.log('Audio playback ended');
          setIsAsking(false);
        };

        audio.onerror = e => {
          console.error('Audio playback error:', e);
          setIsAsking(false);
        };

        try {
          await audio.play();
          console.log('Audio playback started');
        } catch (playError) {
          console.error('Audio play failed:', playError);
          setIsAsking(false);
        }
      } else {
        console.log('No audio URL provided, using text-only');
        setIsAsking(false);
      }
    } catch (err) {
      console.error('Next question error:', err);
      setError('Failed to load next question.');
      setIsAsking(false);
    }
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
        <>
          <button onClick={askQuestion}>🎧 Get Question</button>
          {/* <button
            onClick={async () => {
              try {
                console.log('Testing audio playback...');
                const testAudio = new Audio(
                  'http://localhost:5000/uploads/question-fe-1.mp3'
                );

                // Add event listeners for debugging
                testAudio.onloadstart = () => console.log('Audio load started');
                testAudio.oncanplay = () => console.log('Audio can play');
                testAudio.onplay = () => console.log('Audio started playing');
                testAudio.onended = () => console.log('Audio finished playing');
                testAudio.onerror = e => console.error('Audio error:', e);

                await testAudio.play();
                console.log('Test audio played successfully');
                alert('Audio test successful!');
              } catch (err) {
                console.error('Test audio failed:', err);
                alert(
                  `Audio test failed: ${err.message}\nCheck browser console for details.`
                );
              }
            }}
            style={{ marginLeft: '10px', fontSize: '12px' }}
          >
            🔊 Test Audio
          </button> */}
        </>
      )}

      {isAsking && <p>🔊 Asking question...</p>}

      {question && (
        <>
          <p style={{ fontStyle: 'italic' }}>{question}</p>

          {!isRecording && !loading && (
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

          {questionIndex < ROLE_PROFILES[role].questions.length - 1 && (
            <button onClick={goToNextQuestion}>Next Question →</button>
          )}

          {questionIndex === ROLE_PROFILES[role].questions.length - 1 && (
            <p>🎉 Interview complete. Nice work!</p>
          )}
        </>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
