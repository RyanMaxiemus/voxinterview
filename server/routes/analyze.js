import express from 'express';
import { body, validationResult } from 'express-validator';
import fs from 'fs';
import multer from 'multer';

import { transcribeAudio } from '../services/elevenlabsTranscribe.js';
import { analyzeTranscript } from '../services/geminiAnalyze.js';
import { analyzeConfidence } from '../services/scoring/scoreConfidence.js';
import { fallbackFeedback } from '../utils/fallbackFeedback.js';

const router = express.Router();

// Secure multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `audio-${uniqueSuffix}.wav`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Only allow audio files
    const allowedMimes = [
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/ogg',
      'audio/webm',
      'audio/m4a',
      'audio/x-m4a'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
  }
});

// Input validation middleware
const validateAnalyzeRequest = [
  body('role')
    .optional()
    .isIn(['frontend', 'backend', 'security'])
    .withMessage('Invalid role. Must be frontend, backend, or security'),
  body('question')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Question too long')
    .trim()
    .escape()
];

// Cleanup function for uploaded files
const cleanupFile = filePath => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Failed to cleanup file:', err);
    }
  }
};

router.post('/', upload.single('audio'), validateAnalyzeRequest, async (req, res) => {
  let audioPath;

  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    audioPath = req.file.path;

    // Verify file exists and has content
    const stats = fs.statSync(audioPath);
    if (stats.size === 0) {
      throw new Error('Uploaded file is empty');
    }

    // 1. Speech To Text
    const transcript = await transcribeAudio(audioPath);

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No speech detected in audio');
    }

    // 2. Confidence heuristics (always available)
    const confidenceAnalysis = analyzeConfidence(transcript);

    let feedback;
    let fallbackMode = false;

    const role = req.body?.role || 'frontend';
    const questionIndex = parseInt(req.body?.questionIndex) || 0;

    // 3. Gemini analysis (may fail)
    try {
      feedback = await analyzeTranscript(transcript, role, questionIndex);
    } catch (err) {
      console.warn('Gemini analysis failed, using fallback:', err.message);
      fallbackMode = true;
      feedback = fallbackFeedback(transcript, confidenceAnalysis.score);
    }

    // 4. Calculate STAR score
    const starScore =
      (feedback.situation + feedback.task + feedback.action + feedback.result) / 4;
    feedback.starScore = Math.round(starScore * 100) / 100; // Round to 2 decimal places

    res.json({
      transcript: transcript.substring(0, 5000), // Limit transcript length
      feedback,
      confidence: confidenceAnalysis,
      meta: {
        fallbackMode,
        audioSize: stats.size,
        processingTime: Date.now() - req.startTime
      }
    });
  } catch (err) {
    console.error('Analysis error:', err);

    // Return appropriate error message
    if (err.message.includes('API key')) {
      res.status(503).json({ error: 'Service temporarily unavailable' });
    } else if (err.message.includes('file type') || err.message.includes('Invalid')) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Analysis failed' });
    }
  } finally {
    // Always cleanup uploaded file
    cleanupFile(audioPath);
  }
});

// Add request timing middleware
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

export default router;
