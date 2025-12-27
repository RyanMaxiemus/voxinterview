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
 * Simple timeout wrapper
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
 * Main analysis function
 * @param {string} transcript - User's spoken answer
 * @param {string} role - e.g. "frontend", "backend", "security"
 * @param {string} question - The interview question being answered
 */
export async function analyzeTranscript(
  transcript,
  role = "frontend",
  question = ""
) {
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;

  if (!isGeminiAvailable()) {
    return fallbackFeedback(transcript, profile);
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const prompt = `
You are an expert technical interviewer evaluating a candidate for a ${profile.title} role.

Interview question:
"${question || "No question provided"}"

Candidate response:
"${transcript}"

Evaluate the response using the STAR framework and role expectations.

Return STRICT JSON ONLY with the following shape:

{
  "clarity": string,
  "confidence": string,
  "relevance": string,
  "suggestion": string,
  "situation": number (1-4),
  "task": number (1-4),
  "action": number (1-4),
  "result": number (1-4)
}

Rules:
- Be concise
- No markdown
- No explanations
- No extra fields
- Ratings must be integers 1–4
`;

      const result = await withTimeout(
        model.generateContent(prompt),
        TIMEOUT_MS
      );

      const raw = result.response.text();
      const parsed = JSON.parse(raw);

      // Safety clamp
      ["situation", "task", "action", "result"].forEach((key) => {
        if (
          typeof parsed[key] !== "number" ||
          parsed[key] < 1 ||
          parsed[key] > 4
        ) {
          parsed[key] = 2;
        }
      });

      // Add derived confidence score
      parsed.confidenceScore = scoreConfidence(transcript);

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

  return fallbackFeedback(transcript, ROLE_PROFILES[role]);
}
