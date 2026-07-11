// ============================================================
// Signal City — API Route Adapter Factory
// Creates the appropriate CMC adapter for each request.
// FixtureAdapter for dev/testing, CMCFetchAdapter for production.
// ============================================================

import { FixtureAdapter } from "@engine/coinmarketcap/adapter";

let _fixtureAdapter: FixtureAdapter | null = null;

/**
 * Returns the CMC adapter for the current environment.
 * In production with CMC_API_KEY set, uses live REST API.
 * Otherwise falls back to fixture data.
 */
export function getAdapter(): FixtureAdapter {
  // TODO: When CMC_API_KEY is set, return CMCFetchAdapter
  // For now, always use fixtures — they produce real engine output
  if (!_fixtureAdapter) {
    _fixtureAdapter = new FixtureAdapter();
  }
  return _fixtureAdapter;
}

/**
 * Generate a unique ID (replaces uuid dependency).
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Standard API error response.
 */
export function apiError(
  code: string,
  message: string,
  status = 500,
): Response {
  return Response.json(
    { success: false, error: { code, message } },
    { status },
  );
}

/**
 * Standard API success response.
 */
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>): Response {
  return Response.json({ success: true, data, ...(meta ? { meta } : {}) });
}
