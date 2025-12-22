import { GoogleGenerativeAI } from "@google/generative-ai";
import { withTimeout } from "./withTimeout.js";

const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

export async function analyzeTranscript(transcript) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const prompt = `
You are an interview coach evaluating a spoken interview response.

Return STRICT JSON only with the following fields:
- clarity
- confidence
- relevance
- suggestion

Rules:
- Valid JSON parsable by JSON.parse
- No markdown
- No explanations
- No extra text
- Short, helpful sentences

Answer:
"${transcript}"
`;

      const geminiRequest = model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const result = await withTimeout(
        geminiRequest,
        TIMEOUT_MS,
        "Gemini request timed out"
      );

      const rawText = result.response.text();

      let feedback;
      try {
        feedback = JSON.parse(rawText);
      } catch {
        throw new Error(`Invalid JSON from Gemini: ${rawText}`);
      }

      return feedback;

    } catch (err) {
      lastError = err;

      console.warn(
        `Gemini attempt ${attempt} failed: ${err.message}`
      );

      if (attempt <= MAX_RETRIES) {
        await new Promise(res => setTimeout(res, 400 * attempt));
      }
    }
  }

  throw lastError;
}
