/**
 * Returned when Gemini is unavailable or circuit breaker is open.
 * This keeps UX intact during failures or demos.
 */

export function fallbackFeedback() {
  return {
    clarity: "Your response was understandable, but could benefit from clearer structure.",
    confidence: "Your tone was steady, but stronger delivery would improve impact.",
    relevance: "You addressed the question, though more direct examples could help.",
    suggestion: "Try structuring your answer using a clear beginning, middle, and end.",
    scores: {
      clarity: 6,
      confidence: 6,
      relevance: 6,
      technicalDepth: 6,
    },
  };
}
