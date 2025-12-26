const FILLER_WORDS = [
  "um", "uh", "like", "you know", "so", "basically",
  "actually", "literally", "kind of", "sort of"
];

export function analyzeConfidence(transcript) {
  const text = transcript.toLowerCase();
  const words = text.split(/\s+/);
  const wordCount = words.length;

  let fillerCount = 0;
  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, "g");
    fillerCount += (text.match(regex) || []).length;
  });

  const fillerRatio = fillerCount / Math.max(wordCount, 1);

  let score = 10;

  if (wordCount < 30) score -= 2;           // too short
  if (wordCount > 180) score -= 1;           // rambling
  if (fillerRatio > 0.05) score -= 2;
  if (fillerRatio > 0.1) score -= 3;

  score = Math.max(1, Math.min(10, score));

  return {
    score,
    notes: {
      wordCount,
      fillerCount,
      fillerRatio: Number(fillerRatio.toFixed(2))
    }
  };
}

export function scoreConfidence(text = "") {
  const lowered = text.toLowerCase();

  let score = 5;

  const positive = [
    "confident",
    "clear",
    "concise",
    "strong",
    "well explained",
  ];

  const negative = [
    "hesitant",
    "unclear",
    "rambling",
    "unsure",
    "vague",
  ];

  positive.forEach(word => {
    if (lowered.includes(word)) score += 1;
  });

  negative.forEach(word => {
    if (lowered.includes(word)) score -= 1;
  });

  return clamp(score, 1, 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
