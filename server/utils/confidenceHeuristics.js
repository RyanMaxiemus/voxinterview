/**
 * Heuristic confidence scoring based on transcript text.
 * Returns a score from 0–10 and supporting signals.
 */

const FILLER_WORDS = [
  "um", "uh", "like", "you know", "so", "basically",
  "actually", "literally", "kind of", "sort of"
];

export function analyzeConfidence(transcript) {
  const text = transcript.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      score: 0,
      notes: "No speech detected."
    };
  }

  let fillerCount = 0;
  for (const filler of FILLER_WORDS) {
    const matches = text.match(new RegExp(`\\b${filler}\\b`, "g"));
    if (matches) fillerCount += matches.length;
  }

  const fillerRatio = fillerCount / wordCount;

  // Length heuristic
  let lengthScore = 0;
  if (wordCount >= 50 && wordCount <= 180) lengthScore = 4;
  else if (wordCount >= 30) lengthScore = 2;

  // Filler penalty
  let fillerPenalty = 0;
  if (fillerRatio > 0.05) fillerPenalty = 3;
  else if (fillerRatio > 0.02) fillerPenalty = 1;

  // Sentence confidence (presence of decisive language)
  const decisiveWords = ["built", "led", "designed", "implemented", "improved", "owned"];
  const decisiveHits = decisiveWords.filter(w => text.includes(w)).length;
  const decisiveScore = Math.min(decisiveHits, 3);

  let score = lengthScore + decisiveScore - fillerPenalty;
  score = Math.max(0, Math.min(10, score));

  return {
    score,
    wordCount,
    fillerCount,
    fillerRatio: Number(fillerRatio.toFixed(3)),
    notes:
      fillerPenalty > 1
        ? "Frequent filler words reduce perceived confidence."
        : "Speech pacing and word choice indicate steady confidence."
  };
}
