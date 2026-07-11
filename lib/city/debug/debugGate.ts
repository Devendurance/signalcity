// ============================================================
// Signal City — Debug Gate
// All debug tools are gated behind BOTH:
//   NODE_ENV === "development" AND NEXT_PUBLIC_ENABLE_CITY_DEBUG === "true"
// Production builds must never render or respond to debug controls.
// ============================================================

/**
 * Returns true only when both conditions are met:
 * - Running in development mode
 * - Debug features are explicitly enabled
 */
export function isCityDebugEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.NEXT_PUBLIC_ENABLE_CITY_DEBUG !== "true") return false;
  return true;
}

/**
 * Log a message only when debug is enabled.
 * Use instead of console.log/warn for verbose runtime output.
 */
export function debugLog(...args: unknown[]): void {
  if (isCityDebugEnabled()) {
    console.log("[SignalCity]", ...args);
  }
}

/**
 * Warn only when debug is enabled.
 */
export function debugWarn(...args: unknown[]): void {
  if (isCityDebugEnabled()) {
    console.warn("[SignalCity]", ...args);
  }
}
