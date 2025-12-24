import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

if (!ELEVENLABS_API_KEY) {
  throw new Error(
    "ELEVENLABS_API_KEY is not set. Please configure it in your .env file."
  );
}

export async function transcribeAudio(filePath) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append(
        "file",
        fs.createReadStream(filePath),
        {
          filename: "audio.wav",
          contentType: "audio/wav",
        }
      );
      formData.append("model_id", "scribe_v1");

      const response = await fetch(ELEVENLABS_URL, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          ...formData.getHeaders(),
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ElevenLabs HTTP ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      const transcript =
        data.text ||
        data.transcript ||
        data?.segments?.map(s => s.text).join(" ") ||
        "";

      if (!transcript) {
        throw new Error("Empty transcript from ElevenLabs");
      }

      return transcript;

    } catch (err) {
      clearTimeout(timeout);
      lastError = err;

      console.warn(
        `ElevenLabs attempt ${attempt} failed: ${err.message}`
      );

      // Retry only if not the last attempt
      if (attempt <= MAX_RETRIES) {
        await new Promise(res => setTimeout(res, 500 * attempt));
      }
    }
  }

  throw lastError;
}
