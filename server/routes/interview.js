import crypto from 'crypto';
import express from 'express';
import { body, query, validationResult } from 'express-validator';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { transcribeAudio } from '../services/elevenlabsTranscribe.js';
import { analyzeTranscript } from '../services/geminiAnalyze.js';
import { ROLE_PROFILES } from '../services/roleProfiles.js';

const router = express.Router();

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
 * Generates a consistent filename based on question content and ID
 * @param {string} questionText - The question text content
 * @param {string} questionId - Unique question identifier
 * @returns {string} Generated filename for audio file
 */
const generateAudioFilename = (questionText, questionId) => {
  const hash = crypto.createHash('md5').update(questionText).digest('hex');
  return `question-${questionId || hash}.mp3`;
};

/**
 * Checks if an audio file exists in the uploads directory
 * @param {string} filename - Name of the audio file
 * @returns {boolean} True if file exists
 */
const audioFileExists = filename => {
  const filepath = path.join('uploads', filename);
  return fs.existsSync(filepath);
};

const getBaseUrl = (req) => {
    // Force HTTPS in production to prevent mixed content errors
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
    const host = req.get('host');
    // Append path prefix if running under /vox-api (cPanel production setup)
    const prefix = req.originalUrl.startsWith('/vox-api') ? '/vox-api' : '';
    return `${protocol}://${host}${prefix}`;
}

/**
 * Generates TTS audio for a question using ElevenLabs API
 * Returns cached file if it already exists
 * @param {string} questionText - Text to convert to speech
 * @param {string} questionId - Unique identifier for caching
 * @returns {Promise<string|null>} URL to audio file or null if failed
 */
const generateQuestionAudio = async (req, questionText, questionId) => {
  const filename = generateAudioFilename(questionText, questionId);
  const filepath = path.join('uploads', filename);
  const baseUrl = getBaseUrl(req);


  // Return existing cached file
  if (audioFileExists(filename)) {
    return `${baseUrl}/uploads/${filename}`;
  }

  // Check if ElevenLabs is properly configured
  if (
    !process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVENLABS_API_KEY === 'your_new_elevenlabs_api_key_here'
  ) {
    return null;
  }

  try {
    // Call ElevenLabs TTS API
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

    // Save audio file to disk
    fs.writeFileSync(filepath, Buffer.from(audioBuffer));

    return `${baseUrl}/uploads/${filename}`;
  } catch (err) {
    return null;
  }
};

/**
 * Input validation middleware for role parameters
 */
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
 * Returns a specific question based on role and question index
 * Includes generated or cached audio URL if available
 */
router.post('/ask', validateRole, async (req, res) => {
  try {
    // Validate input parameters
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
    const audioUrl = await generateQuestionAudio(req, questionText, questionObj.id);

    res.json({
      question: questionText,
      audioUrl,
      role,
      questionIndex,
      questionId: questionObj.id || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

/**
 * POST /interview/answer
 * Processes audio response and returns AI analysis
 * Note: This endpoint expects multer middleware to be added
 */
router.post('/answer', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Transcribe audio to text
    const transcript = await transcribeAudio(req.file.path);
    const role = req.body.role || 'frontend';

    // Validate role parameter
    if (!['frontend', 'backend', 'security'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Analyze transcript with AI
    const analysis = await analyzeTranscript(transcript, role);

    res.json({
      transcript: transcript.substring(0, 5000), // Limit for security
      analysis
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze response' });
  }
});

/**
 * GET /interview/question
 * Returns a random question for the specified role
 * Used for quick question sampling
 */
router.get('/question', validateRole, (req, res) => {
  try {
    // Validate input parameters
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const role = req.query.role || 'frontend';
    const profile = ROLE_PROFILES[role] || ROLE_PROFILES.frontend;

    // Select random question from the role's question set
    const question =
      profile.questions[Math.floor(Math.random() * profile.questions.length)];

    res.json({
      role,
      question: question.text || question,
      questionId: question.id || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get question' });
  }
});

export default router;