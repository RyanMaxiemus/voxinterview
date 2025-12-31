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

/**
 * Creates a new Gemini AI model instance with current environment variables.
 * Uses lazy initialization to avoid caching stale API keys.
 * @returns {GenerativeModel} Configured Gemini model instance
 */
function getGeminiModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

// Configuration constants
const TIMEOUT_MS = 15000; // Request timeout in milliseconds
const MAX_RETRIES = 1; // Number of retry attempts on failure

/**
 * Analyzes interview transcript using Gemini AI and provides structured feedback.
 * Handles question progression and implements circuit breaker pattern for reliability.
 *
 * @param {string} transcript - The candidate's spoken response
 * @param {string} role - Interview role (frontend, backend, security)
 * @param {number} questionIndex - Current question index (0-based)
 * @returns {Promise<Object>} Analysis results with feedback and next question info
 */
export async function analyzeTranscript(
  transcript,
  role = 'frontend',
  questionIndex = 0
) {
  // Get role profile and extract questions
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;
  const questions = profile.questions || [];

  // Extract current and next question information
  const currentQuestionObj = questions[questionIndex];
  const currentQuestion =
    currentQuestionObj?.text || currentQuestionObj || 'Interview question';
  const nextQuestionObj =
    questionIndex + 1 < questions.length ? questions[questionIndex + 1] : null;
  const nextQuestion = nextQuestionObj?.text || nextQuestionObj || null;

  // Check if Gemini service is available via circuit breaker
  if (!isGeminiAvailable()) {
    return {
      ...fallbackFeedback(transcript, profile),
      nextQuestion,
      nextQuestionIndex: questionIndex + 1,
      completed: !nextQuestion
    };
  }

  let attemptCount = 0;

  // Retry loop with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    attemptCount++;
    try {
      // Construct detailed prompt for Gemini analysis
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

      // Generate AI response with timeout protection
      const model = getGeminiModel();
      const result = await withTimeout(
        model.generateContent(prompt),
        TIMEOUT_MS,
        'Gemini timeout'
      );

      // Parse and validate response
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      // Validate and fix text fields if they're numbers (fallback protection)
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

      // Ensure STAR scores are valid integers between 1-4
      ['situation', 'task', 'action', 'result'].forEach(k => {
        if (typeof parsed[k] !== 'number' || parsed[k] < 1 || parsed[k] > 4) {
          parsed[k] = 2;
        }
      });

      // Add additional metadata
      parsed.confidenceScore = scoreConfidence(transcript);
      parsed.nextQuestion = nextQuestion;
      parsed.nextQuestionIndex = questionIndex + 1;
      parsed.completed = !nextQuestion;

      // Record successful API call
      recordSuccess();

      return parsed;
    } catch (err) {
      // Handle retry logic
      if (attempt <= MAX_RETRIES) {
        // Wait before retrying with exponential backoff
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }

  // All attempts failed - record failure and return fallback
  recordFailure();

  return {
    ...fallbackFeedback(transcript, profile),
    nextQuestion,
    nextQuestionIndex: questionIndex + 1,
    completed: !nextQuestion
  };
}
