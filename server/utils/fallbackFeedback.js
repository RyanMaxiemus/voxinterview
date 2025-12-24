/**
 * Returned when Gemini is unavailable or circuit breaker is open.
 * This keeps UX intact during failures or demos.
 */

export function fallbackFeedback(confidenceAnalysis) {
  return {
    clarity: "Automated analysis unavailable.",
    relevance: "Automated analysis unavailable.",
    suggestion: "Try opening with a clear summary of your role or impact before adding details.",
    confidence: confidenceAnalysis.score,
  };
}
