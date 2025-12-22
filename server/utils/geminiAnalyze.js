import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
  getCircuitStatus,
} from "./geminiCircuitBreaker.js";
import { fallbackFeedback } from "./fallbackFeedback.js";

const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout")), ms)
    ),
  ]);
}

export async function analyzeTranscript(transcript) {
  // 🔒 Circuit breaker check
  if (isCircuitOpen()) {
    return {
      fallback: true,
      reason: "circuit_open",
      feedback: fallbackFeedback(transcript),
      circuit: getCircuitStatus(),
    };
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const prompt = `
You are an interview coach evaluating a spoken interview response.

Return STRICT JSON only with:
- clarity
- confidence
- relevance
- suggestion

Rules:
- Valid JSON
- No markdown
- No extra text
- Short sentences

Answer:
"${transcript}"
`;

      const result = await withTimeout(
        model.generateContent(prompt),
        TIMEOUT_MS
      );

      const rawText = result.response.text();

      const feedback = JSON.parse(rawText);

      recordSuccess();

      return {
        fallback: false,
        feedback,
      };

    } catch (err) {
      lastError = err;
      recordFailure();

      console.warn(
        `Gemini attempt ${attempt} failed: ${err.message}`
      );

      if (attempt <= MAX_RETRIES) {
        await new Promise(res => setTimeout(res, 400 * attempt));
      }
    }
  }

  // 🔁 Final fallback after retries
  return {
    fallback: true,
    reason: "retries_exhausted",
    feedback: fallbackFeedback(transcript),
    circuit: getCircuitStatus(),
  };
}
