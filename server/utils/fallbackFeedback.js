/**
 * Returned when Gemini is unavailable or circuit breaker is open.
 * This keeps UX intact during failures or demos.
 */

export function fallbackFeedback(confidenceAnalysis) {
  feedback = {
    suggestion: "Focus on clear structure and concrete examples.",
    confidence: confidenceAnalysis.rationale,
    confidenceScore: confidenceAnalysis.score,
  };
  return {
    clarity: "Automated analysis unavailable.",
    relevance: "Automated analysis unavailable.",
    suggestion: "Try opening with a clear summary of your role or impact before adding details.",
    confidence: confidenceAnalysis.score,
    confidenceScore: confidenceAnalysis.score,
    meta: {
      fallback: true,
      reason: "AI analysis temporarily unavailable"
    }
  };
}
