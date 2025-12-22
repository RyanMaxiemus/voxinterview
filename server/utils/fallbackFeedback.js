export function fallbackFeedback(transcript) {
  const wordCount = transcript.split(/\s+/).length;

  return {
    clarity:
      wordCount < 30
        ? "Your answer is very brief. Consider expanding with a concrete example."
        : "Your answer is understandable, but could benefit from tighter structure.",

    confidence:
      "Your tone sounds steady, but varying your pace and emphasis can improve confidence.",

    relevance:
      "The answer appears generally relevant, though tying it more directly to the role would help.",

    suggestion:
      "Try using a clear opening sentence followed by one specific example to strengthen your response.",
  };
}
