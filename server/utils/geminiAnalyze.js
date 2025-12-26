import { GoogleGenerativeAI } from "@google/generative-ai";
import { ROLE_PROFILES } from "./roleProfiles.js";
import { scoreConfidence } from "./scoreConfidence.js";
import { fallbackFeedback } from "./fallbackFeedback.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const FAILURE_THRESHOLD = 3;

let consecutiveFailures = 0;
let circuitOpenUntil = null;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout")), ms)
    )
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

export async function analyzeTranscript(transcript, role = "frontend") {
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;

  if (!isGeminiAvailable()) {
    return fallbackFeedback(transcript, profile);
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const prompt = `
You are an expert interviewer evaluating a ${profile.title} candidate.

Focus areas:
${profile.focus.map(f => `- ${f}`).join("\n")}

Evaluate the spoken response below.

Return STRICT JSON with the following fields:
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
- No markdown
- No explanations
- No extra keys
- Values must be concise and role-specific

Candidate response:
"${transcript}"
`;

      const result = await withTimeout(
        model.generateContent(prompt),
        TIMEOUT_MS
      );

      const raw = result.response.text();
      const parsed = JSON.parse(raw);

      // Optional: sanity clamp
      ["situation", "task", "action", "result"].forEach(k => {
        if (typeof parsed[k] !== "number" || parsed[k] < 1 || parsed[k] > 4) {
          parsed[k] = 2;
        }
      });

      parsed.confidenceScore = scoreConfidence(transcript);

      consecutiveFailures = 0;
      return parsed;

    } catch (err) {
      lastError = err;
      console.warn(`Gemini attempt failed: ${err.message}`);

      if (attempt <= MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 400 * attempt));
      }
    }
  }

  // Circuit breaker opens
  consecutiveFailures++;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + 60_000;
    console.warn("🚨 Gemini circuit breaker OPEN (60s)");
  }

  return fallbackFeedback(transcript, ROLE_PROFILES[role]);
}
