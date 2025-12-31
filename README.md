# VoxInterview Server

Backend service for the VoxInterview application, providing AI-driven mock interviews with voice interaction. This server handles audio processing, Text-to-Speech (TTS) generation, and AI-based answer analysis.

## Features

- **Voice Interaction**: Uses ElevenLabs API for high-quality Text-to-Speech question generation.
- **Audio Processing**: Handles audio uploads via Multer with secure file validation and whitelist checking.
- **AI Analysis**: Transcribes user audio and analyzes responses using Gemini AI.
- **Role-based Interviews**: Supports specific interview tracks (Frontend, Backend, Security).
- **Caching**: Caches generated audio files to reduce API costs and latency.

## Prerequisites 

- Node.js (v16+ recommended)
- npm or yarn
- ElevenLabs API Key
- Google Gemini API Key

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure the `uploads/` directory exists or let the application create it on startup.

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
NODE_ENV=development
ELEVENLABS_API_KEY=your_elevenlabs_key
# Required for the Gemini analysis service
GEMINI_API_KEY=your_gemini_key
```

## API Endpoints

### 1. Ask a Question
Retrieves a specific question and its generated audio.

- **URL**: `/interview/ask`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "role": "frontend",
    "questionIndex": 0
  }
  ```

### 2. Submit Answer
Uploads an audio response for transcription and analysis.

- **URL**: `/interview/answer`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `audio`: The recorded audio file (wav, mp3, m4a, etc.)
  - `role`: The interview role (e.g., "frontend")

### 3. Get Random Question
Fetches a random question text for a specific role (text only, no audio generation).

- **URL**: `/interview/question`
- **Method**: `GET`
- **Query Params**: `?role=frontend`

## License
MIT