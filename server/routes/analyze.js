import express from 'express';
import { body, validationResult } from 'express-validator';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

import { transcribeAudio } from '../services/elevenlabsTranscribe.js';
import { analyzeTranscript } from '../services/geminiAnalyze.js';
import { analyzeConfidence } from '../services/scoring/scoreConfidence.js';
import { fallbackFeedback } from '../utils/fallbackFeedback.js';

const router = express.Router();

/**
 * Middleware to add request timing for performance monitoring
 */
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

/**
 * Secure multer configuration for audio file uploads
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname) || '.wav';
    cb(null, `audio-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 1 // Single file upload only
  },
  fileFilter: (req, file, cb) => {
    // Whitelist of allowed audio MIME types
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

/**
 * Input validation middleware for analyze requests
 */
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

/**
 * Safely removes uploaded files from filesystem
 * @param {string} filePath - Path to file to be deleted
 */
const cleanupFile = filePath => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      // File cleanup failure is logged but doesn't break the flow
    }
  }
};

/**
 * POST /analyze
 * Main endpoint for processing audio interviews:
 * 1. Accepts audio file upload
 * 2. Transcribes speech to text
 * 3. Analyzes response with AI
 * 4. Returns structured feedback
 */
router.post('/', upload.single('audio'), validateAnalyzeRequest, async (req, res) => {
  let audioPath;

  try {
    // Validate request inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Ensure audio file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    audioPath = req.file.path;

    // Verify file has content
    const stats = fs.statSync(audioPath);
    if (stats.size === 0) {
      throw new Error('Uploaded file is empty');
    }

    // Step 1: Convert speech to text
    const transcript = await transcribeAudio(audioPath);

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No speech detected in audio');
    }

    // Step 2: Analyze confidence using heuristics (always available)
    const confidenceAnalysis = analyzeConfidence(transcript);

    let feedback;
    let fallbackMode = false;

    const role = req.body?.role || 'frontend';
    const questionIndex = parseInt(req.body?.questionIndex) || 0;

    // Step 3: AI analysis with Gemini (may fail gracefully)
    try {
      feedback = await analyzeTranscript(transcript, role, questionIndex);
    } catch (err) {
      fallbackMode = true;
      feedback = fallbackFeedback(transcript, confidenceAnalysis.score);
    }

    // Step 4: Calculate overall STAR score
    const starScore =
      (feedback.situation + feedback.task + feedback.action + feedback.result) / 4;
    feedback.starScore = Math.round(starScore * 100) / 100;

    // Return comprehensive analysis results
    res.json({
      transcript: transcript.substring(0, 5000), // Limit for security
      feedback,
      confidence: confidenceAnalysis,
      meta: {
        fallbackMode,
        audioSize: stats.size,
        processingTime: Date.now() - req.startTime
      }
    });
  } catch (err) {
    // Handle different error types appropriately
    if (err.message.includes('API key')) {
      res.status(503).json({ error: 'Service temporarily unavailable' });
    } else if (err.message.includes('file type') || err.message.includes('Invalid')) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Analysis failed' });
    }
  } finally {
    // Always cleanup uploaded file for security
    cleanupFile(audioPath);
  }
});

export default router;
