// ============================================================
// Signal City — API Provider Factory
// Live CMC in production; fixtures only for local development/test.
// ============================================================

import { CMCRestAdapter, FixtureAdapter, type ICMCAdapter } from "@engine/coinmarketcap/adapter";

export type CityDataMode = "live" | "fixture" | "misconfigured";

let fixtureAdapter: FixtureAdapter | null = null;
let liveAdapter: CMCRestAdapter | null = null;

export function getCityDataMode(): CityDataMode {
  if (process.env.CMC_API_KEY) return "live";
  return process.env.NODE_ENV === "production" ? "misconfigured" : "fixture";
}

/**
 * Production never silently substitutes fixture market data. A missing CMC key
 * is an explicit configuration failure. Fixtures are available only locally.
 */
export function getAdapter(): ICMCAdapter {
  const mode = getCityDataMode();
  if (mode === "live") {
    if (!liveAdapter) liveAdapter = new CMCRestAdapter({ apiKey: process.env.CMC_API_KEY });
    return liveAdapter;
  }
  if (mode === "fixture") {
    if (!fixtureAdapter) fixtureAdapter = new FixtureAdapter();
    return fixtureAdapter;
  }
  throw new Error("CMC_API_KEY is not configured in this production deployment.");
}

export function apiError(code: string, message: string, status = 500): Response {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>): Response {
  return Response.json({ success: true, data, ...(meta ? { meta } : {}) });
}
