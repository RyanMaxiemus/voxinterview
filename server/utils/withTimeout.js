export function withTimeout(promise, ms, errorMessage = "Operation timed out") {
  // Create a new promise that will reject after the specified number of milliseconds
    return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}
