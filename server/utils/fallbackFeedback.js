/**
 * Returned when Gemini is unavailable or circuit breaker is open.
 * This keeps UX intact during failures or demos.
 * 
 * @param {string} transcript - The user's spoken response
 * @param {object} profile - Role profile (used for context, optional)
 * @returns {object} Feedback object with STAR scores and text feedback
 */
export function fallbackFeedback(transcript = "", profile = {}) {
  return {
    clarity: "Your response was understandable, but could benefit from clearer structure.",
    confidence: "Your tone was steady, but stronger delivery would improve impact.",
    relevance: "You addressed the question, though more direct examples could help.",
    suggestion: "Try structuring your answer using a clear beginning, middle, and end.",
    situation: 2,
    task: 2,
    action: 2,
    result: 2,
    scores: {
      clarity: 6,
      confidence: 6,
      relevance: 6,
      technicalDepth: 6,
    },
  };
}
