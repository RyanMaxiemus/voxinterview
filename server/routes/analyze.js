import express from "express";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

router.post("/", upload.single("audio"), async (req, res) => {
  let audioPath;

  try {
    audioPath = req.file.path;

    // 1. Speech To Text (ElevenLabs)
    const formData = new FormData();
    formData.append("file", fs.createReadStream(audioPath));
    formData.append("model_id", "scribe_v1");

    const elevenRes = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: formData,
      }
    );

    const elevenData = await elevenRes.json();
    const transcript = elevenData.text || "";

    if (!transcript) {
      throw new Error("Empty transcript");
    }

    // 2. Gemini feedback prompt
    const prompt = `
You are an interview coach evaluating a spoken interview response.

Return STRICT JSON only with the following fields:
- clarity
- confidence
- relevance
- suggestion

Rules:
- No markdown
- No explanations
- No extra text
- Short, helpful sentences

Answer:
"${transcript}"
`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    let feedback;
    try {
      feedback = JSON.parse(rawText);
    } catch {
      throw new Error("Gemini returned invalid JSON");
    }

    // 3. Cleanup
    fs.unlinkSync(audioPath);

    res.json({
      transcript,
      feedback,
    });
  } catch (error) {
    console.error(error);

    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    res.status(500).json({
      error: "Analysis failed",
    });
  }
});

export default router;
