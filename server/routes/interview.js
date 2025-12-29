import express from 'express';
import { body, query, validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';
import { transcribeAudio } from '../services/elevenlabsTranscribe.js';
import { analyzeTranscript } from '../services/geminiAnalyze.js';
import { ROLE_PROFILES } from '../services/roleProfiles.js';

const router = express.Router();

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

// Cleanup function for TTS files
const cleanupTTSFile = filePath => {
  if (filePath && fs.existsSync(filePath)) {
    // Cleanup after 5 minutes
    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to cleanup TTS file:', err);
      }
    }, 5 * 60 * 1000);
  }
};

/**
 * POST /interview/ask
 * Returns a question based on role
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

    const { role = 'frontend' } = req.body;
    const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;

    // Pick a random question
    const question =
      profile.questions[Math.floor(Math.random() * profile.questions.length)];

    // Optional: generate TTS audio
    let audioUrl = null;

    try {
      if (
        !process.env.ELEVENLABS_API_KEY ||
        process.env.ELEVENLABS_API_KEY === 'your_new_elevenlabs_api_key_here'
      ) {
        throw new Error('ElevenLabs API key not configured');
      }

      const ttsResponse = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL',
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: question.text || question,
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
      const filename = `question-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}.mp3`;
      const filepath = path.join('uploads', filename);

      // Ensure uploads directory exists
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
      }

      fs.writeFileSync(filepath, Buffer.from(audioBuffer));
      audioUrl = `/uploads/${filename}`;

      // Schedule cleanup
      cleanupTTSFile(filepath);
    } catch (err) {
      console.warn('TTS failed, falling back to text-only:', err.message);
    }

    res.json({
      question: question.text || question,
      audioUrl,
      role,
      questionId: question.id || null
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
