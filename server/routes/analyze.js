import express from "express";
import multer from "multer";
import fs from "fs";

import { transcribeAudio } from "../services/elevenlabsTranscribe.js";
import { analyzeTranscript } from "../services/geminiAnalyze.js";
import { analyzeConfidence } from "../services/scoring/scoreConfidence.js";
import { fallbackFeedback } from "../utils/fallbackFeedback.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("audio"), async (req, res) => {
  let audioPath;

  try {
    audioPath = req.file.path;

    // 1. Speech To Text
    const transcript = await transcribeAudio(audioPath);

    // 2. Confidence heuristics (always available)
    const confidenceAnalysis = analyzeConfidence(transcript);

    let feedback;
    let fallbackMode = false;

    const role = req.body?.role || "frontend";

    // 3. Gemini analysis (may fail)
    try {
      feedback = await analyzeTranscript(transcript, role);
    } catch (err) {
      console.warn("Using fallback feedback:", err.message);
      fallbackMode = true;
      feedback = fallbackFeedback(transcript, confidenceAnalysis.score);
    }

    // 4. Calculate STAR score
    const starScore = 
      (feedback.situation + feedback.task + feedback.action + feedback.result) / 4;
    feedback.starScore = starScore;

    res.json({
      transcript,
      feedback,
      confidence: confidenceAnalysis,
      meta: {
        fallbackMode
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  } finally {
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  }
});

export default router;
