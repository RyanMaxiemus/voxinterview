// The number of consecutive failures before the circuit breaker opens
const FAILURE_THRESHOLD = 3;
// The duration in milliseconds to wait before retrying after the circuit opens
const COOLDOWN_MS = 60_000;

// Tracks the number of consecutive failures
let failureCount = 0;
// Stores the timestamp until which the circuit remains open
let circuitOpenUntil = null;

/**
 * Checks if the Gemini service is available based on the circuit breaker's state.
 * @returns {boolean} True if the service is available, false otherwise.
 */
export function isGeminiAvailable() {
  // If the circuit is not open, the service is available
  if (!circuitOpenUntil) return true;

  // If the cooldown period has passed, reset the circuit and mark the service as available
  if (Date.now() > circuitOpenUntil) {
    // Reset after cooldown
    failureCount = 0;
    circuitOpenUntil = null;
    return true;
  }

  // If the circuit is open and the cooldown has not passed, the service is unavailable
  return false;
}

/**
 * Resets the failure count and closes the circuit upon a successful API call.
 */
export function recordSuccess() {
  failureCount = 0;
  circuitOpenUntil = null;
}

/**
 * Increments the failure count and opens the circuit if the threshold is reached.
 */
export function recordFailure() {
  failureCount++;

  // If the number of failures reaches the threshold, open the circuit
  if (failureCount >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + COOLDOWN_MS;
    console.warn("🚨 Gemini circuit breaker OPEN");
  }
}

/**
 * Returns the current status of the circuit breaker.
 * @returns {object} An object containing the circuit's state.
 */
export function getCircuitStatus() {
  return {
    open: Boolean(circuitOpenUntil),
    failures: failureCount,
    retryAfter: circuitOpenUntil,
  };
}