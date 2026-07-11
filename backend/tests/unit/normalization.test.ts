// ============================================================
// Signal City — Normalization Engine Tests
// ============================================================

import { describe, it, expect } from "vitest";
import { normalizeSignals } from "../../src/normalization/engine";
import {
  CLEAR_SKIES_FIXTURE,
  STORM_FIXTURE,
  FOG_FIXTURE,
  PARTIAL_SIGNALS_FIXTURE,
  STALE_FIXTURE,
  BTC_FIXTURE,
} from "../fixtures/cmc-responses";

// ---- Helpers ----

function makeInput(raw: Record<string, unknown>, overrides?: Partial<{
  subjectId: string;
  scope: "global" | "sector" | "asset";
  source: string;
  providerTimestamp: string;
}>) {
  return {
    raw,
    subjectId: overrides?.subjectId ?? "global",
    scope: overrides?.scope ?? "global",
    source: overrides?.source ?? "coinmarketcap",
    providerTimestamp: overrides?.providerTimestamp ?? "2026-07-10T12:00:00Z",
  };
}

// ---- Tests ----

describe("normalizeSignals", () => {
  describe("happy path — full data", () => {
    it("correctly normalizes clear-skies fixture", () => {
      const now = new Date().toISOString();
      const result = normalizeSignals(makeInput(CLEAR_SKIES_FIXTURE, {
        providerTimestamp: now,
      }));

      expect(result.trend).toBeCloseTo(0.65, 2);
      expect(result.breadth).toBeCloseTo(0.55, 2);
      expect(result.volatility).toBeCloseTo(0.25, 2);
      expect(result.leverageRisk).toBeCloseTo(0.20, 2);
      expect(result.liquidityHealth).toBeCloseTo(0.80, 2);
      expect(result.macroPressure).toBeCloseTo(0.30, 2);
      expect(result.sentiment).toBeCloseTo(0.55, 2);
      expect(result.narrativeHeat).toBeCloseTo(0.40, 2);
      expect(result.momentumAcceleration).toBeCloseTo(0.10, 2);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.freshness).toBe("fresh");
      expect(result.missingSignals).toHaveLength(0);
    });

    it("correctly normalizes storm fixture", () => {
      const result = normalizeSignals(makeInput(STORM_FIXTURE));

      expect(result.trend).toBeCloseTo(-0.55, 2);
      expect(result.volatility).toBeCloseTo(0.85, 2);
      expect(result.leverageRisk).toBeCloseTo(0.82, 2);
      expect(result.liquidityHealth).toBeCloseTo(0.20, 2);
      expect(result.sentiment).toBeCloseTo(-0.70, 2);
    });

    it("normalizes asset-specific data (BTC)", () => {
      const result = normalizeSignals(makeInput(BTC_FIXTURE, {
        subjectId: "BTC",
        scope: "asset",
      }));

      expect(result.subjectId).toBe("BTC");
      expect(result.scope).toBe("asset");
      expect(result.trend).toBeCloseTo(0.35, 2);
      expect(result.liquidityHealth).toBeCloseTo(0.85, 2);
    });
  });

  describe("missing data", () => {
    it("detects completely missing signals (fog fixture)", () => {
      const now = new Date().toISOString();
      const result = normalizeSignals(makeInput(FOG_FIXTURE, {
        providerTimestamp: now,
      }));

      expect(result.confidence).toBeCloseTo(0, 1); // all 9 signals missing
      expect(result.freshness).toBe("fresh"); // timestamp still valid
      expect(result.missingSignals.length).toBeGreaterThanOrEqual(8);

      // All signal values should be 0
      expect(result.trend).toBe(0);
      expect(result.breadth).toBe(0);
      expect(result.volatility).toBe(0);
      expect(result.leverageRisk).toBe(0);
    });

    it("detects partially missing signals", () => {
      const result = normalizeSignals(makeInput(PARTIAL_SIGNALS_FIXTURE));

      // Only 3 signals present: trend, breadth, volatility
      expect(result.trend).toBeCloseTo(0.30, 2);
      expect(result.breadth).toBeCloseTo(0.25, 2);
      expect(result.volatility).toBeCloseTo(0.40, 2);

      // 6 signals missing
      expect(result.missingSignals.length).toBe(6);
    });
  });

  describe("clamping", () => {
    it("clamps bipolar values to [-1, 1]", () => {
      const result = normalizeSignals(makeInput({
        timestamp: "2026-07-10T12:00:00Z",
        data: {
          marketTrend: 1.8,    // should clamp to 1
          breadth: -2.5,       // should clamp to -1
          volatility: 0.5,
          leverageRisk: 0.5,
          liquidityHealth: 0.5,
          macroPressure: 1.5,  // should clamp to 1
          sentiment: -1.5,     // should clamp to -1
          narrativeHeat: 0.5,
          momentumAcceleration: 0.0,
        },
      }));

      expect(result.trend).toBe(1.0);
      expect(result.breadth).toBe(-1.0);
      expect(result.macroPressure).toBe(1.0);
      expect(result.sentiment).toBe(-1.0);
    });

    it("clamps unipolar values to [0, 1]", () => {
      const result = normalizeSignals(makeInput({
        timestamp: "2026-07-10T12:00:00Z",
        data: {
          marketTrend: 0.5,
          breadth: 0.5,
          volatility: 1.5,        // should clamp to 1
          leverageRisk: -0.5,      // should clamp to 0
          liquidityHealth: 2.0,    // should clamp to 1
          macroPressure: 0.0,
          sentiment: 0.0,
          narrativeHeat: -0.3,     // should clamp to 0
          momentumAcceleration: 0.0,
        },
      }));

      expect(result.volatility).toBe(1.0);
      expect(result.leverageRisk).toBe(0.0);
      expect(result.liquidityHealth).toBe(1.0);
      expect(result.narrativeHeat).toBe(0.0);
    });
  });

  describe("freshness", () => {
    it("marks recent data as fresh", () => {
      const result = normalizeSignals(makeInput(CLEAR_SKIES_FIXTURE, {
        providerTimestamp: new Date(Date.now() - 60000).toISOString(), // 1 min ago
      }));

      expect(result.freshness).toBe("fresh");
    });

    it("marks data older than 5 minutes as aging", () => {
      const result = normalizeSignals(makeInput(CLEAR_SKIES_FIXTURE, {
        providerTimestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min
      }));

      expect(result.freshness).toBe("aging");
    });

    it("marks data older than 30 minutes as stale", () => {
      const result = normalizeSignals(makeInput(STALE_FIXTURE));

      expect(result.freshness).toBe("stale");
    });

    it("marks invalid timestamps as unknown", () => {
      const result = normalizeSignals(makeInput(CLEAR_SKIES_FIXTURE, {
        providerTimestamp: "not-a-date",
      }));

      expect(result.freshness).toBe("unknown");
    });
  });

  describe("confidence calculation", () => {
    it("gives high confidence when all signals present", () => {
      const result = normalizeSignals(makeInput(CLEAR_SKIES_FIXTURE));

      expect(result.confidence).toBeGreaterThan(0.90);
      expect(result.confidence).toBeLessThanOrEqual(0.95); // capped at 0.95
    });

    it("gives low confidence when many signals are missing", () => {
      const result = normalizeSignals(makeInput(PARTIAL_SIGNALS_FIXTURE));

      // 3 of 9 signals present → confidence ≈ 0.32
      expect(result.confidence).toBeGreaterThan(0.25);
      expect(result.confidence).toBeLessThan(0.40);
    });
  });

  describe("provenance", () => {
    it("preserves source, timestamps, and version", () => {
      const result = normalizeSignals(makeInput(CLEAR_SKIES_FIXTURE));

      expect(result.source).toBe("coinmarketcap");
      expect(result.providerTimestamp).toBe("2026-07-10T12:00:00Z");
      expect(result.ingestionTimestamp).toBeDefined();
      expect(result.normalizationVersion).toBe("1.0.0");
      expect(result.subjectId).toBe("global");
      expect(result.scope).toBe("global");
    });
  });

  describe("field mapping", () => {
    it("uses custom field map when provided", () => {
      const input = makeInput({
        timestamp: "2026-07-10T12:00:00Z",
        custom: {
          priceChange: 0.42,
          vol: 0.33,
        },
      });
      input.fieldMap = {
        trend: "custom.priceChange",
        volatility: "custom.vol",
      };

      const result = normalizeSignals(input);

      expect(result.trend).toBeCloseTo(0.42, 2);
      expect(result.volatility).toBeCloseTo(0.33, 2);
    });
  });

  describe("NaN and edge cases", () => {
    it("handles non-numeric values gracefully", () => {
      const result = normalizeSignals(makeInput({
        timestamp: "2026-07-10T12:00:00Z",
        data: {
          marketTrend: "not-a-number",
          breadth: null,
          volatility: undefined,
          leverageRisk: NaN,
          liquidityHealth: 0.5,
          macroPressure: 0.0,
          sentiment: 0.0,
          narrativeHeat: 0.0,
          momentumAcceleration: 0.0,
        },
      }));

      // trend (non-numeric), breadth (null), volatility (undefined), leverageRisk (NaN) → all missing
      // That's 4 missing signals, 5 present
      expect(result.missingSignals).toContain("trend");
      expect(result.missingSignals).toContain("breadth");
      expect(result.missingSignals).toContain("volatility");
      expect(result.missingSignals).toContain("leverageRisk");
    });
  });
});
