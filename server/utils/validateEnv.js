/**
 * Environment variable validation utility
 */

export function validateEnvironment() {
  const required = ['ELEVENLABS_API_KEY', 'GEMINI_API_KEY'];

  const missing = [];
  const placeholder = [];

  for (const key of required) {
    const value = process.env[key];

    if (!value) {
      missing.push(key);
    } else if (value.includes('your_') || value.includes('_here')) {
      placeholder.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (placeholder.length > 0) {
    console.warn(
      `⚠️  Warning: Placeholder values detected for: ${placeholder.join(', ')}`
    );
    console.warn('   Please update your .env file with real API keys');
  }

  // Validate API key formats
  if (
    process.env.GEMINI_API_KEY &&
    (process.env.GEMINI_API_KEY.length < 39 || process.env.GEMINI_API_KEY.length > 40)
  ) {
    console.warn('⚠️  Warning: Gemini API key appears to have an invalid length.');
  }


  console.log('✅ Environment validation passed');
}