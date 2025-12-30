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

// Lazy initialization - create client when needed to avoid caching old env vars
function getGeminiModel() {
  console.log(
    '🔍 Creating Gemini client with key:',
    process.env.GEMINI_API_KEY?.substring(0, 15) + '...'
  );
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

const TIMEOUT_MS = 15000; // Increased from 8s to 15s
const MAX_RETRIES = 1; // Reduced from 2 to 1 since Gemini is working

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

  const currentQuestionObj = questions[questionIndex];
  const currentQuestion =
    currentQuestionObj?.text || currentQuestionObj || 'Interview question';
  const nextQuestionObj =
    questionIndex + 1 < questions.length ? questions[questionIndex + 1] : null;
  const nextQuestion = nextQuestionObj?.text || nextQuestionObj || null;

  if (!isGeminiAvailable()) {
    console.log('🔄 Using fallback - Gemini circuit breaker is open');
    return {
      ...fallbackFeedback(transcript, profile),
      nextQuestion,
      nextQuestionIndex: questionIndex + 1,
      completed: !nextQuestion
    };
  }

  let lastError;
  let attemptCount = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    attemptCount++;
    try {
      const prompt = `
You are an expert technical interviewer evaluating a ${profile.title} candidate.

Interview question:
"${currentQuestion}"

Candidate response:
"${transcript}"

Evaluate the response using the STAR framework.

Return STRICT JSON ONLY with these exact fields:

{
  "clarity": "A descriptive text evaluation of how clearly the candidate communicated their response",
  "confidence": "A descriptive text evaluation of the candidate's confidence level and delivery",
  "relevance": "A descriptive text evaluation of how well the response addressed the question",
  "suggestion": "A specific suggestion for improvement",
  "situation": 1-4 integer rating,
  "task": 1-4 integer rating,
  "action": 1-4 integer rating,
  "result": 1-4 integer rating
}

CRITICAL REQUIREMENTS:
- clarity, confidence, relevance, and suggestion MUST be descriptive text strings, NOT numbers
- situation, task, action, result MUST be integers from 1 to 4
- No markdown formatting
- No explanations outside the JSON
- Focus on the actual question and response content, not placeholder text
`;

      // Get fresh model instance with current environment variables
      const model = getGeminiModel();

      const result = await withTimeout(
        model.generateContent(prompt),
        TIMEOUT_MS,
        'Gemini timeout'
      );

      const responseText = result.response.text();
      console.log('🔍 Raw Gemini response:', responseText);

      const parsed = JSON.parse(responseText);
      console.log('🔍 Parsed Gemini response:', parsed);

      // Validate and fix text fields if they're numbers
      if (typeof parsed.clarity === 'number') {
        parsed.clarity = `Response clarity rated ${parsed.clarity}/4`;
      }
      if (typeof parsed.confidence === 'number') {
        parsed.confidence = `Confidence level rated ${parsed.confidence}/4`;
      }
      if (typeof parsed.relevance === 'number') {
        parsed.relevance = `Relevance to question rated ${parsed.relevance}/4`;
      }
      if (typeof parsed.suggestion !== 'string') {
        parsed.suggestion =
          'Focus on providing more specific examples and clearer structure.';
      }

      // Safety clamp for STAR scores
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

      // Log success if we had previous failures
      if (attemptCount > 1) {
        console.log(`✅ Gemini succeeded on attempt ${attemptCount}`);
      }

      return parsed;
    } catch (err) {
      lastError = err;

      // Only log warnings for actual failures, not intermediate retries
      if (attempt <= MAX_RETRIES) {
        console.log(`⚠️ Gemini attempt ${attempt} failed (${err.message}), retrying...`);
        await new Promise(r => setTimeout(r, 400 * attempt));
      } else {
        console.error(`❌ Gemini failed after ${attemptCount} attempts: ${err.message}`);
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
