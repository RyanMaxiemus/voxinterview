import { GoogleGenerativeAI } from '@google/generative-ai';
import { fallbackFeedback } from '../utils/fallbackFeedback.js';
import {
  isGeminiAvailable,
  recordFailure,
  recordSuccess
} from '../utils/geminiCircuitBreaker.js';
import { withTimeout } from '../utils/withTimeout.js';
import { ROLE_PROFILES } from './roleProfiles.js';
import { scoreConfidence } from './scoring/scoreConfidence.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Debug API key on module load
console.log('🔍 Gemini API Key Debug:');
console.log('  - Key exists:', !!process.env.GEMINI_API_KEY);
console.log('  - Key length:', process.env.GEMINI_API_KEY?.length || 0);
console.log(
  '  - Key starts with AIza:',
  process.env.GEMINI_API_KEY?.startsWith('AIza') || false
);
console.log(
  '  - Key preview:',
  process.env.GEMINI_API_KEY?.substring(0, 10) + '...' || 'undefined'
);

const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

/**
 * Main interview analysis + progression handler
 */
export async function analyzeTranscript(
  transcript,
  role = 'frontend',
  questionIndex = 0
) {
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;
  const questions = profile.questions || [];

  const currentQuestion = questions[questionIndex] || '';
  const nextQuestion =
    questionIndex + 1 < questions.length ? questions[questionIndex + 1] : null;

  if (!isGeminiAvailable()) {
    return {
      ...fallbackFeedback(transcript, profile),
      nextQuestion,
      nextQuestionIndex: questionIndex + 1,
      completed: !nextQuestion
    };
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const prompt = `
You are an expert technical interviewer evaluating a ${profile.title} candidate.

Interview question:
"${currentQuestion}"

Candidate response:
"${transcript}"

Evaluate the response using the STAR framework.

Return STRICT JSON ONLY:

{
  "clarity": string,
  "confidence": string,
  "relevance": string,
  "suggestion": string,
  "situation": number,
  "task": number,
  "action": number,
  "result": number
}

Rules:
- No markdown
- No explanations
- Ratings must be integers from 1 to 4
`;

      const result = await withTimeout(
        model.generateContent(prompt),
        TIMEOUT_MS,
        'Gemini timeout'
      );

      const parsed = JSON.parse(result.response.text());

      // Safety clamp
      ['situation', 'task', 'action', 'result'].forEach(k => {
        if (typeof parsed[k] !== 'number' || parsed[k] < 1 || parsed[k] > 4) {
          parsed[k] = 2;
        }
      });

      parsed.confidenceScore = scoreConfidence(transcript);
      parsed.nextQuestion = nextQuestion;
      parsed.nextQuestionIndex = questionIndex + 1;
      parsed.completed = !nextQuestion;

      recordSuccess();
      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(`Gemini attempt failed: ${err.message}`);

      if (attempt <= MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 400 * attempt));
      }
    }
  }

  // Record failure for circuit breaker
  recordFailure();

  return {
    ...fallbackFeedback(transcript, profile),
    nextQuestion,
    nextQuestionIndex: questionIndex + 1,
    completed: !nextQuestion
  };
}
