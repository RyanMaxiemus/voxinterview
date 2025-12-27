import fetch from "node-fetch";

export async function speakQuestion(text) {
  const response = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.7
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error("Failed to generate voice prompt");
  }

  return Buffer.from(await response.arrayBuffer());
}
