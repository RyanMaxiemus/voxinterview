import express from "express";
import multer from "multer";
import fs from "fs";
import { transcribeAudio } from "../utils/elevenlabsTranscribe.js";
import { analyzeTranscript } from "../utils/geminiAnalyze.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("audio"), async (req, res) => {
  let audioPath;

  try {
    audioPath = req.file.path;
    
    // Debugging
    console.log("Uploaded file:", req.file);

    // Transcribe the audio using ElevenLabs
    const transcript = await transcribeAudio(audioPath);

    // Analyze the transcript using Gemini
    const feedback = await analyzeTranscript(transcript);

    // Cleanup
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
