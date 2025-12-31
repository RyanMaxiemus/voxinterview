import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ROLE_PROFILES } from '../services/roleProfiles.js';

// Load environment variables from .env file
dotenv.config();

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
 * Generates TTS audio for a single question using ElevenLabs API
 * @param {string} questionText - Text to convert to speech
 * @param {string} questionId - Unique identifier for the question
 * @returns {Promise<string|null>} File path if successful, null if failed
 */
const generateQuestionAudio = async (questionText, questionId) => {
  const filename = generateAudioFilename(questionText, questionId);
  const filepath = path.join('uploads', filename);

  // Skip if file already exists (caching)
  if (fs.existsSync(filepath)) {
    return filepath;
  }

  // Check if ElevenLabs API is properly configured
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

    return filepath;
  } catch (err) {
    return null;
  }
};

/**
 * Main function to generate audio files for all questions across all roles
 * Processes each role and question systematically with rate limiting
 */
const generateAllQuestionAudio = async () => {
  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // Process each role profile
  for (const [, profile] of Object.entries(ROLE_PROFILES)) {
    // Process each question in the role
    for (const question of profile.questions) {
      const questionText = question.text || question;
      const result = await generateQuestionAudio(questionText, question.id);

      // Track results for summary
      if (result === null) {
        totalFailed++;
      } else if (fs.existsSync(result)) {
        if (result.includes('Already exists')) {
          totalSkipped++;
        } else {
          totalGenerated++;
        }
      }

      // Rate limiting to avoid API throttling
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Display summary of generation process
  return {
    generated: totalGenerated,
    skipped: totalSkipped,
    failed: totalFailed
  };
};

// Execute the script when run directly
generateAllQuestionAudio()
  .then(results => {
    process.exit(0);
  })
  .catch(err => {
    process.exit(1);
  });
