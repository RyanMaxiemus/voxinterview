import express from "express";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("audio"), async (req, res) => {
  try {
    const audioPath = req.file.path;

    // 1. Send audio to ElevenLabs for transcription
    const formData = new FormData();
    formData.append("file", fs.createReadStream(audioPath));
    formData.append("model_id", "scribe_v1");

    const elevenResponse = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: formData,
      }
    );

    const transcriptionResult = await elevenResponse.json();

    const transcript = transcriptionResult.text || "";

    // 2. Placeholder feedback (LLM comes next)
    const feedback = {
      clarity: "Good structure, but sentences could be tighter.",
      confidence: "Tone sounds confident overall.",
      relevance: "Answer stays mostly on topic.",
      suggestion: "Try leading with your strongest example."
    };

    // 3. Cleanup temp file
    fs.unlinkSync(audioPath);

    res.json({
      transcript,
      feedback
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
