import express from "express";
import { ROLE_PROFILES } from "../services/roleProfiles.js";
import { analyzeTranscript } from "../services/geminiAnalyze.js";
import { transcribeAudio } from "../services/elevenlabsTranscribe.js";
import { speakQuestion } from "../utils/speakQuestion.js";

const router = express.Router();

/**
 * POST /interview/ask
 * Returns a question based on role
 */
router.post("/ask", async (req, res) => {
  const { role = "frontend" } = req.body;

  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;

  const question =
    profile.questions?.[
      Math.floor(Math.random() * profile.questions.length)
    ];

  res.json({
    role,
    question: question.text,
    id: question.id
  });
});

/**
 * POST /interview/answer
 * Audio → transcript → Gemini analysis
 */
router.post("/answer", async (req, res) => {
  try {
    const transcript = await transcribeAudio(req.file.path);
    const analysis = await analyzeTranscript(transcript, req.body.role);

    res.json({
      transcript,
      analysis,
    });
  } catch (err) {
    console.error("Interview answer error:", err);
    res.status(500).json({ error: "Failed to analyze response" });
  }
});

/** POST /interview/question
 * Returns a random question for the specified role
 */
router.post("/question", async (req, res) => {
  const { role = "frontend" } = req.body;
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;

  // Simple rotating question bank (can be randomized later)
  const question =
    profile.questions[Math.floor(Math.random() * profile.questions.length)];

  res.json({
    question,
  });
});

/**
 * POST /interview/speak
 * Converts question text to speech using ElevenLabs
 */
router.post("/speak", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const audioBuffer = await speakQuestion(text);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
  } catch (err) {
    console.error("Speak question error:", err);
    res.status(500).json({ error: "Failed to generate speech" });
  }
});

export default router;
