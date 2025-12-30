import crypto from 'crypto';
import express from 'express';
import { body, query, validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';
import { transcribeAudio } from '../services/elevenlabsTranscribe.js';
import { analyzeTranscript } from '../services/geminiAnalyze.js';
import { ROLE_PROFILES } from '../services/roleProfiles.js';

const router = express.Router();

// Cache for generated audio files
const audioCache = new Map();

// Generate a consistent filename based on question content
const generateAudioFilename = (questionText, questionId) => {
  const hash = crypto.createHash('md5').update(questionText).digest('hex');
  return `question-${questionId || hash}.mp3`;
};

// Check if audio file exists
const audioFileExists = filename => {
  const filepath = path.join('uploads', filename);
  return fs.existsSync(filepath);
};

// Generate TTS audio for a question (only if not cached)
const generateQuestionAudio = async (questionText, questionId) => {
  const filename = generateAudioFilename(questionText, questionId);
  const filepath = path.join('uploads', filename);

  // Return existing file if it exists
  if (audioFileExists(filename)) {
    console.log(`📁 Using cached audio: ${filename}`);
    return `http://localhost:5000/uploads/${filename}`;
  }

  // Check if ElevenLabs is configured
  if (
    !process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVENLABS_API_KEY === 'your_new_elevenlabs_api_key_here'
  ) {
    console.log('⚠️ ElevenLabs API key not configured, skipping TTS');
    return null;
  }

  try {
    console.log(`🎤 Generating new audio for: ${questionText.substring(0, 50)}...`);

    const ttsResponse = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: questionText,
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.7
          }
        })
      }
    );

    if (!ttsResponse.ok) {
      throw new Error(`TTS API error: ${ttsResponse.status}`);
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    // Ensure uploads directory exists
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads', { recursive: true });
    }

    fs.writeFileSync(filepath, Buffer.from(audioBuffer));
    console.log(`✅ Audio cached: ${filename}`);

    return `http://localhost:5000/uploads/${filename}`;
  } catch (err) {
    console.error('TTS generation failed:', err.message);
    return null;
  }
};

// Validation middleware
const validateRole = [
  body('role')
    .optional()
    .isIn(['frontend', 'backend', 'security'])
    .withMessage('Invalid role'),
  query('role')
    .optional()
    .isIn(['frontend', 'backend', 'security'])
    .withMessage('Invalid role')
];

/**
 * POST /interview/ask
 * Returns a question based on role and question index
 */
router.post('/ask', validateRole, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { role = 'frontend', questionIndex = 0 } = req.body;
    const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;

    // Get the specific question by index
    const questionObj = profile.questions[questionIndex];
    if (!questionObj) {
      return res.status(400).json({ error: 'Question index out of range' });
    }

    const questionText = questionObj.text || questionObj;

    // Generate or retrieve cached audio
    const audioUrl = await generateQuestionAudio(questionText, questionObj.id);

    res.json({
      question: questionText,
      audioUrl,
      role,
      questionIndex,
      questionId: questionObj.id || null
    });
  } catch (err) {
    console.error('Ask question error:', err);
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

/**
 * POST /interview/answer
 * Audio → transcript → Gemini analysis
 */
router.post('/answer', async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const transcript = await transcribeAudio(req.file.path);
    const role = req.body.role || 'frontend';

    // Validate role
    if (!['frontend', 'backend', 'security'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const analysis = await analyzeTranscript(transcript, role);

    res.json({
      transcript: transcript.substring(0, 5000), // Limit length
      analysis
    });
  } catch (err) {
    console.error('Interview answer error:', err);
    res.status(500).json({ error: 'Failed to analyze response' });
  }
});

/**
 * GET /interview/question
 * Returns a random question for the specified role
 */
router.get('/question', validateRole, (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const role = req.query.role || 'frontend';
    const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;

    // Pick a random question
    const question =
      profile.questions[Math.floor(Math.random() * profile.questions.length)];

    res.json({
      role,
      question: question.text || question,
      questionId: question.id || null
    });
  } catch (err) {
    console.error('Get question error:', err);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

export default router;
