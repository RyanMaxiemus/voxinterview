import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function analyzeTranscriptWithGemini(transcript) {
  if (!isGeminiAvailable()) {
    throw new Error("Gemini circuit breaker open");
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const prompt = `
You are an interview coach.

Return STRICT JSON with:
- clarity
- confidence
- relevance
- suggestion
- star (object with situation, task, action, result scores 1–5)

No markdown. No extra text.

Answer:
"${transcript}"
`;

      const result = await withTimeout(
        model.generateContent(prompt),
        TIMEOUT_MS
      );

      const raw = result.response.text();
      const parsed = JSON.parse(raw);

      consecutiveFailures = 0;
      return parsed;

    } catch (err) {
      lastError = err;
      console.warn(`Gemini attempt ${attempt} failed: ${err.message}`);

      if (attempt <= MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 400 * attempt));
      }
    }
  }

  consecutiveFailures++;

  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + 60_000;
    console.warn("🚨 Gemini circuit breaker OPEN for 60s");
  }

  throw lastError;
}


// import { GoogleGenerativeAI } from "@google/generative-ai";
// import dotenv from "dotenv";

// // Load environment variables
// dotenv.config();

// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// const MAX_RETRIES = 2;
// const CIRCUIT_BREAKER_THRESHOLD = 3;
// const CIRCUIT_RESET_MS = 60_000;

// let failureCount = 0;
// let circuitOpenedAt = null;

// if (!GEMINI_API_KEY) {
//   throw new Error(
//     "GEMINI_API_KEY is not set. Please configure it in your .env file."
//   );
// }

// const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({
//   model: "gemini-2.5-flash",
// });

// function isCircuitOpen() {
//   if (!circuitOpenedAt) return false;
//   if (Date.now() - circuitOpenedAt > CIRCUIT_RESET_MS) {
//     failureCount = 0;
//     circuitOpenedAt = null;
//     return false;
//   }
//   return true;
// }

// export async function analyzeTranscriptWithGemini(transcript) {
//   if (isCircuitOpen()) {
//     throw new Error("Gemini circuit breaker open");
//   }

//   let lastError;

//   for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
//     try {
//       const prompt = `
// You are an interview coach evaluating a spoken interview response.

// Return STRICT JSON only with:
// - clarity
// - confidence
// - relevance
// - suggestion

// Rules:
// - Valid JSON only
// - No markdown
// - No extra text

// Answer:
// "${transcript}"
// `;

//       const result = await model.generateContent(prompt);
//       const raw = result.response.text();

//       const parsed = JSON.parse(raw);

//       failureCount = 0;
//       return parsed;

//     } catch (err) {
//       lastError = err;
//       failureCount++;

//       console.warn(`Gemini attempt ${attempt} failed: ${err.message}`);

//       if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
//         circuitOpenedAt = Date.now();
//         console.error("🚨 Gemini circuit breaker OPEN");
//         break;
//       }

//       await new Promise(r => setTimeout(r, 400 * attempt));
//     }
//   }

//   throw lastError;
// }
