const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60_000;

let failureCount = 0;
let circuitOpenUntil = null;

export function isGeminiAvailable() {
  if (!circuitOpenUntil) return true;

  if (Date.now() > circuitOpenUntil) {
    // Reset after cooldown
    failureCount = 0;
    circuitOpenUntil = null;
    return true;
  }

  return false;
}

export function recordSuccess() {
  failureCount = 0;
  circuitOpenUntil = null;
}

export function recordFailure() {
  failureCount++;

  if (failureCount >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + COOLDOWN_MS;
    console.warn("🚨 Gemini circuit breaker OPEN");
  }
}

export function getCircuitStatus() {
  return {
    open: Boolean(circuitOpenUntil),
    failures: failureCount,
    retryAfter: circuitOpenUntil,
  };
}
