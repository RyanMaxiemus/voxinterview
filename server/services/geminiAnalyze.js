import { GoogleGenerativeAI } from "@google/generative-ai";
import { ROLE_PROFILES } from "./roleProfiles.js";
import { scoreConfidence } from "./scoring/scoreConfidence.js";
import { fallbackFeedback } from "../utils/fallbackFeedback.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const FAILURE_THRESHOLD = 3;

let consecutiveFailures = 0;
let circuitOpenUntil = null;

/**
 * Timeout helper
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout")), ms)
    ),
  ]);
}

export function isGeminiAvailable() {
  if (!circuitOpenUntil) return true;

  if (Date.now() > circuitOpenUntil) {
    circuitOpenUntil = null;
    consecutiveFailures = 0;
    return true;
  }

  return false;
}

/**
 * Main interview analysis + progression handler
 */
export async function analyzeTranscript(
  transcript,
  role = "frontend",
  questionIndex = 0
) {
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;
  const questions = profile.questions || [];

  const currentQuestion = questions[questionIndex] || "";
  const nextQuestion =
    questionIndex + 1 < questions.length
      ? questions[questionIndex + 1]
      : null;

  if (!isGeminiAvailable()) {
    return {
      ...fallbackFeedback(transcript, profile),
      nextQuestion,
      nextQuestionIndex: questionIndex + 1,
      completed: !nextQuestion,
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
        TIMEOUT_MS
      );

      const parsed = JSON.parse(result.response.text());

      // Safety clamp
      ["situation", "task", "action", "result"].forEach((k) => {
        if (typeof parsed[k] !== "number" || parsed[k] < 1 || parsed[k] > 4) {
          parsed[k] = 2;
        }
      });

      parsed.confidenceScore = scoreConfidence(transcript);
      parsed.nextQuestion = nextQuestion;
      parsed.nextQuestionIndex = questionIndex + 1;
      parsed.completed = !nextQuestion;

      consecutiveFailures = 0;
      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(`Gemini attempt failed: ${err.message}`);

      if (attempt <= MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
  }

  // Circuit breaker
  consecutiveFailures++;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + 60_000;
    console.warn("🚨 Gemini circuit breaker OPEN (60s)");
  }

  return {
    ...fallbackFeedback(transcript, profile),
    nextQuestion,
    nextQuestionIndex: questionIndex + 1,
    completed: !nextQuestion,
  };
}
