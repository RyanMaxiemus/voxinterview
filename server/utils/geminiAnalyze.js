import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_RETRIES = 2;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 60_000;

let failureCount = 0;
let circuitOpenedAt = null;

if (!GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY is not set. Please configure it in your .env file."
  );
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

function isCircuitOpen() {
  if (!circuitOpenedAt) return false;
  if (Date.now() - circuitOpenedAt > CIRCUIT_RESET_MS) {
    failureCount = 0;
    circuitOpenedAt = null;
    return false;
  }
  return true;
}

export async function analyzeTranscriptWithGemini(transcript) {
  if (isCircuitOpen()) {
    throw new Error("Gemini circuit breaker open");
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
- Valid JSON only
- No markdown
- No extra text

Answer:
"${transcript}"
`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text();

      const parsed = JSON.parse(raw);

      failureCount = 0;
      return parsed;

    } catch (err) {
      lastError = err;
      failureCount++;

      console.warn(`Gemini attempt ${attempt} failed: ${err.message}`);

      if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitOpenedAt = Date.now();
        console.error("🚨 Gemini circuit breaker OPEN");
        break;
      }

      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }

  throw lastError;
}
