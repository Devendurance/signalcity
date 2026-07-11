// ============================================================
// Signal City — Normalization Engine
// Converts provider-specific responses into NormalizedMarketSignals.
// Every downstream engine consumes these signals, never raw provider data.
// ============================================================

import type { NormalizedMarketSignals } from "@shared/contracts/signals";
import type { Freshness } from "@shared/contracts/district";

// ---- Constants ----

const NORMALIZATION_VERSION = "1.0.0";

/** Maximum age in ms before signals are considered "aging". */
const AGING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum age in ms before signals are considered "stale". */
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

// ---- Types ----

export type ProviderSource = "coinmarketcap" | string;

export interface NormalizationInput {
  /** Raw provider response (untyped — we validate at the boundary). */
  raw: Record<string, unknown>;

  /** Canonical subject identifier (e.g. "BTC", "global", "ai-sector"). */
  subjectId: string;

  /** What this data covers. */
  scope: "global" | "sector" | "asset";

  /** Which provider supplied the data. */
  source: ProviderSource;

  /** When the provider says the data was captured. */
  providerTimestamp: string;

  /** Optional field-level mapping overrides. Used by adapters. */
  fieldMap?: Record<string, string>;
}

// ---- Clamping helpers ----

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampBipolar(value: number): number {
  return clamp(value, -1, 1);
}

function clampUnipolar(value: number): number {
  return clamp(value, 0, 1);
}

// ---- Freshness Calculation ----

function calculateFreshness(providerTimestamp: string): Freshness {
  const providerMs = new Date(providerTimestamp).getTime();
  if (isNaN(providerMs)) return "unknown";

  const ageMs = Date.now() - providerMs;
  if (ageMs < AGING_THRESHOLD_MS) return "fresh";
  if (ageMs < STALE_THRESHOLD_MS) return "aging";
  return "stale";
}

// ---- CMC-Specific Field Extraction ----

/**
 * Extract a numeric value from a CMC response, traversing a dot-separated path.
 * Returns undefined if the path doesn't resolve or the value isn't numeric.
 */
function extractNumeric(raw: Record<string, unknown>, path: string): number | undefined {
  const parts = path.split(".");
  let current: unknown = raw;

  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current === "number") return current;
  if (typeof current === "string") {
    const parsed = parseFloat(current);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

// ---- Main Normalizer ----

export function normalizeSignals(input: NormalizationInput): NormalizedMarketSignals {
  const { raw, subjectId, scope, source, providerTimestamp } = input;
  const missing: string[] = [];

  // Helper: try to extract, mark missing if not found
  function tryExtract(
    path: string,
    label: string,
    clampFn: (v: number) => number = (v) => v,
  ): number {
    const value = extractNumeric(raw, path);
    if (value === undefined || isNaN(value)) {
      missing.push(label);
      return 0;
    }
    return clampFn(value);
  }

  // Market data paths for CMC responses.
  // These paths work with typical CMC Market Overview, Crypto Research,
  // and Daily Market Brief response shapes. Adapters can override via fieldMap.
  const trend = tryExtract(
    input.fieldMap?.trend ?? "data.marketTrend",
    "trend",
    clampBipolar,
  );

  const breadth = tryExtract(
    input.fieldMap?.breadth ?? "data.breadth",
    "breadth",
    clampBipolar,
  );

  const volatility = tryExtract(
    input.fieldMap?.volatility ?? "data.volatility",
    "volatility",
    clampUnipolar,
  );

  const leverageRisk = tryExtract(
    input.fieldMap?.leverageRisk ?? "data.leverageRisk",
    "leverageRisk",
    clampUnipolar,
  );

  const liquidityHealth = tryExtract(
    input.fieldMap?.liquidityHealth ?? "data.liquidityHealth",
    "liquidityHealth",
    clampUnipolar,
  );

  const macroPressure = tryExtract(
    input.fieldMap?.macroPressure ?? "data.macroPressure",
    "macroPressure",
    clampBipolar,
  );

  const sentiment = tryExtract(
    input.fieldMap?.sentiment ?? "data.sentiment",
    "sentiment",
    clampBipolar,
  );

  const narrativeHeat = tryExtract(
    input.fieldMap?.narrativeHeat ?? "data.narrativeHeat",
    "narrativeHeat",
    clampUnipolar,
  );

  const momentumAcceleration = tryExtract(
    input.fieldMap?.momentumAcceleration ?? "data.momentumAcceleration",
    "momentumAcceleration",
    clampBipolar,
  );

  // Confidence: if more than half the signals are missing, confidence is low.
  const totalSignals = 9; // trend, breadth, vol, leverage, liq, macro, sentiment, narrative, momentum
  const fillRatio = (totalSignals - missing.length) / totalSignals;
  const confidence = clampUnipolar(fillRatio * 0.95); // max 0.95, reserved for explicit confidence fields

  return {
    trend,
    breadth,
    volatility,
    leverageRisk,
    liquidityHealth,
    macroPressure,
    sentiment,
    narrativeHeat,
    momentumAcceleration,
    confidence,
    freshness: calculateFreshness(providerTimestamp),
    missingSignals: missing,
    subjectId,
    scope,
    providerTimestamp,
    ingestionTimestamp: new Date().toISOString(),
    source,
    normalizationVersion: NORMALIZATION_VERSION,
  };
}

// ---- Batch Normalization ----

export interface BatchNormalizationInput {
  global?: NormalizationInput;
  sectors?: NormalizationInput[];
  assets?: NormalizationInput[];
}

export interface BatchNormalizationResult {
  global?: NormalizedMarketSignals;
  sectors: NormalizedMarketSignals[];
  assets: NormalizedMarketSignals[];
}

export function normalizeBatch(input: BatchNormalizationInput): BatchNormalizationResult {
  return {
    global: input.global ? normalizeSignals(input.global) : undefined,
    sectors: (input.sectors ?? []).map(normalizeSignals),
    assets: (input.assets ?? []).map(normalizeSignals),
  };
}
