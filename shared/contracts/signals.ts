// ============================================================
// Signal City — Normalized Market Signals
// The stable internal representation that all engines consume.
// Provider-specific responses are normalized into this shape.
// ============================================================

import type { Freshness } from "./district";

/**
 * NormalizedMarketSignals is the internal contract between
 * the CMC adapter and the deterministic intelligence engines.
 *
 * Every value is in a documented range. Missing signals are
 * omitted rather than invented.
 */
export interface NormalizedMarketSignals {
  // ---- Price & Trend ----
  /** Expected range -1..1. Positive = upward trend, negative = downward. */
  trend: number;

  /** Expected range -1..1. How broadly the move is shared across assets. */
  breadth: number;

  /** Expected range 0..1. Normalized volatility measure. */
  volatility: number;

  /** Expected range 0..1. Leverage, open interest, liquidation risk. */
  leverageRisk: number;

  /** Expected range 0..1. Volume health and depth. */
  liquidityHealth: number;

  // ---- Macro & Sentiment ----
  /** Expected range -1..1. External macro pressure (rates, DXY, equities). */
  macroPressure: number;

  /** Expected range -1..1. Fear/Greed, social, sentiment aggregate. */
  sentiment: number;

  /** Expected range 0..1. Intensity of current narratives. */
  narrativeHeat: number;

  /** Expected range -1..1. Rate of change of momentum. */
  momentumAcceleration: number;

  // ---- Meta ----
  /** Overall confidence in these signals (0..1). */
  confidence: number;

  /** How fresh the underlying data is. */
  freshness: Freshness;

  /** Which signals could not be populated from available data. */
  missingSignals: string[];

  // ---- Provenance ----
  /** Canonical asset or sector identifier. */
  subjectId: string;

  /** Scope of this signal set. */
  scope: "global" | "sector" | "asset";

  /** When the provider generated the data (ISO 8601). */
  providerTimestamp: string;

  /** When we ingested it (ISO 8601). */
  ingestionTimestamp: string;

  /** Data source identifier. */
  source: string;

  /** Normalization logic version. */
  normalizationVersion: string;
}

/**
 * Factory for an empty/insufficient signal set.
 * All values default to 0; confidence is set very low.
 */
export function emptySignals(
  subjectId: string,
  scope: "global" | "sector" | "asset",
  source: string,
): NormalizedMarketSignals {
  return {
    trend: 0,
    breadth: 0,
    volatility: 0,
    leverageRisk: 0,
    liquidityHealth: 0,
    macroPressure: 0,
    sentiment: 0,
    narrativeHeat: 0,
    momentumAcceleration: 0,
    confidence: 0.05,
    freshness: "unknown",
    missingSignals: [
      "trend",
      "breadth",
      "volatility",
      "leverageRisk",
      "liquidityHealth",
      "macroPressure",
      "sentiment",
      "narrativeHeat",
      "momentumAcceleration",
    ],
    subjectId,
    scope,
    providerTimestamp: new Date().toISOString(),
    ingestionTimestamp: new Date().toISOString(),
    source,
    normalizationVersion: "1.0.0",
  };
}
