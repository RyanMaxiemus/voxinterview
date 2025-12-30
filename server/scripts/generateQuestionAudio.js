import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ROLE_PROFILES } from '../services/roleProfiles.js';

// Load environment variables
dotenv.config();

// Generate a consistent filename based on question content
const generateAudioFilename = (questionText, questionId) => {
  const hash = crypto.createHash('md5').update(questionText).digest('hex');
  return `question-${questionId || hash}.mp3`;
};

// Generate TTS audio for a question
const generateQuestionAudio = async (questionText, questionId) => {
  const filename = generateAudioFilename(questionText, questionId);
  const filepath = path.join('uploads', filename);

  // Skip if file already exists
  if (fs.existsSync(filepath)) {
    console.log(`📁 Already exists: ${filename}`);
    return filepath;
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
    console.log(`🎤 Generating audio for: ${questionText}`);

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
    console.log(`✅ Generated: ${filename}`);

    return filepath;
  } catch (err) {
    console.error(`❌ Failed to generate audio for "${questionText}":`, err.message);
    return null;
  }
};

// Main function to generate all question audio files
const generateAllQuestionAudio = async () => {
  console.log('🎵 Starting audio generation for all questions...\n');

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const [roleName, profile] of Object.entries(ROLE_PROFILES)) {
    console.log(`\n📋 Processing ${profile.title} questions:`);

    for (const question of profile.questions) {
      const questionText = question.text || question;
      const result = await generateQuestionAudio(questionText, question.id);

      if (result === null) {
        totalFailed++;
      } else if (fs.existsSync(result)) {
        if (result.includes('Already exists')) {
          totalSkipped++;
        } else {
          totalGenerated++;
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n🎯 Audio generation complete!');
  console.log(`✅ Generated: ${totalGenerated} files`);
  console.log(`📁 Skipped (already exists): ${totalSkipped} files`);
  console.log(`❌ Failed: ${totalFailed} files`);
};

// Run the script
generateAllQuestionAudio().catch(console.error);
