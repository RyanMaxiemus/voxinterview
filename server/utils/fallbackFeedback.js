/**
 * Returned when Gemini is unavailable or circuit breaker is open.
 * This keeps UX intact during failures or demos.
 */

export function fallbackFeedback(transcript, confidenceScore) {
  return {
    mode: "fallback",
    clarity: "Your answer was understandable, but could benefit from clearer structure.",
    confidence: `Delivery showed moderate confidence (score: ${confidenceScore}/10).`,
    relevance: "The response stayed mostly on topic.",
    suggestion: "Try using a brief opening summary followed by a concrete example.",
    situation: 3,
    task: 3,
    action: 3,
    result: 3
  };
}


// export function fallbackFeedback(confidenceAnalysis) {
//   return {
//     clarity: "Automated analysis unavailable.",
//     relevance: "Automated analysis unavailable.",
//     suggestion: "Try opening with a clear summary of your role or impact before adding details.",
//     confidence: confidenceAnalysis.rationale,
//     confidenceScore: confidenceAnalysis.score,
//     fallback: true,
//   };
// }
