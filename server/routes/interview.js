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

  // Pick a random question
  const question =
    profile.questions[Math.floor(Math.random() * profile.questions.length)];

  // Optional: generate TTS audio
  let audioUrl = null;

  try {
    const ttsResponse = await fetch("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: question,
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.7
        }
      })
    });

    const audioBuffer = await ttsResponse.arrayBuffer();
    const filename = `question-${Date.now()}.mp3`;
    const filepath = `uploads/${filename}`;

    fs.writeFileSync(filepath, Buffer.from(audioBuffer));
    audioUrl = `/uploads/${filename}`;

  } catch (err) {
    console.warn("TTS failed, falling back to text-only");
  }

  res.json({
    question,
    audioUrl
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
router.get("/question", (req, res) => {
  const role = req.query.role || "frontend";
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;

  // Pick a random question
  const question =
    profile.questions[
      Math.floor(Math.random() * profile.questions.length)
    ];

  res.json({
    role,
    question,
  });
});

/**
 * POST /interview/speak
 * Converts question text to speech using ElevenLabs
 */
// router.post("/speak", async (req, res) => {
//   try {
//     const { text } = req.body;

//     if (!text) {
//       return res.status(400).json({ error: "Text is required" });
//     }

//     const audioBuffer = await speakQuestion(text);

//     res.setHeader("Content-Type", "audio/mpeg");
//     res.send(audioBuffer);
//   } catch (err) {
//     console.error("Speak question error:", err);
//     res.status(500).json({ error: "Failed to generate speech" });
//   }
// });

export default router;
