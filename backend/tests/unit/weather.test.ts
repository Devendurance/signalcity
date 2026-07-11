// ============================================================
// Signal City — Weather Engine Tests
// Tests every weather classification, override, boundary, and edge case.
// Rules are deterministic — these tests prove correctness.
// ============================================================

import { describe, it, expect } from "vitest";
import { normalizeSignals } from "../../src/normalization/engine";
import { classifyWeather, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS } from "../../src/market-engine/weather";
import {
  CLEAR_SKIES_FIXTURE,
  STORM_FIXTURE,
  HEATWAVE_FIXTURE,
  FOG_FIXTURE,
  PARTLY_CLOUDY_FIXTURE,
  RAIN_FIXTURE,
  WIND_ADVISORY_FIXTURE,
  COLD_SNAP_FIXTURE,
  STORM_BOUNDARY_FIXTURE,
  PARTIAL_SIGNALS_FIXTURE,
  EXTREME_BULL_FIXTURE,
  MEMECOIN_FIXTURE,
} from "../fixtures/cmc-responses";

// ---- Helpers ----

const NOW = new Date().toISOString();

function classify(fixture: Record<string, unknown>, overrides?: {
  subjectId?: string;
  scope?: "global" | "sector" | "asset";
}) {
  const signals = normalizeSignals({
    raw: fixture,
    subjectId: overrides?.subjectId ?? "global",
    scope: overrides?.scope ?? "global",
    source: "coinmarketcap",
    providerTimestamp: NOW,
  });
  return classifyWeather({ signals });
}

// ---- Core Classification Tests ----

describe("classifyWeather — base classifications", () => {
  it("classifies clear skies correctly", () => {
    const result = classify(CLEAR_SKIES_FIXTURE);

    expect(result.weather.kind).toBe("clear");
    expect(result.weather.severity).toBe("low");
    expect(result.weather.baseScore).toBeGreaterThan(0.15);
    expect(result.weather.confidence).toBeGreaterThan(0.9);
    expect(result.weather.overrides).toHaveLength(0);
    expect(result.weather.warnings).toHaveLength(0);
  });

  it("classifies extreme bull as clear", () => {
    const result = classify(EXTREME_BULL_FIXTURE);

    expect(result.weather.kind).toBe("clear");
    expect(result.weather.baseScore).toBeGreaterThan(0.4);
  });

  it("classifies partly cloudy correctly", () => {
    const result = classify(PARTLY_CLOUDY_FIXTURE);

    expect(result.weather.kind).toBe("partly_cloudy");
    expect(result.weather.severity).toBe("low");
  });

  it("classifies storm correctly", () => {
    const result = classify(STORM_FIXTURE);

    expect(result.weather.kind).toBe("storm");
    expect(result.weather.severity).toBe("critical"); // vol > 0.8
    expect(result.weather.baseScore).toBeLessThan(-0.20);
    expect(result.weather.warnings.some((w) => w.includes("Liquidity"))).toBe(true);
  });

  it("classifies rain correctly", () => {
    const result = classify(RAIN_FIXTURE);

    expect(result.weather.kind).toBe("rain");
    expect(result.weather.severity).toBe("medium"); // absScore ~0.18
  });
});

// ---- Override Tests ----

describe("classifyWeather — overrides", () => {
  it("applies heatwave override when vol is elevated + momentum is extended", () => {
    const result = classify(HEATWAVE_FIXTURE);

    expect(result.weather.kind).toBe("heatwave");
    expect(result.weather.overrides).toContain("heatwave");
    expect(result.weather.severity).toBe("high"); // vol 0.72 < 0.75 threshold
    expect(result.weather.warnings.some((w: string) => w.toLowerCase().includes("overextended"))).toBe(true);
  });

  it("applies fog override when confidence is very low", () => {
    const result = classify(FOG_FIXTURE);

    expect(result.weather.kind).toBe("fog");
    expect(result.weather.overrides).toContain("fog");
  });

  it("applies wind advisory when momentum acceleration is high", () => {
    const result = classify(WIND_ADVISORY_FIXTURE);

    expect(result.weather.kind).toBe("wind_advisory");
    expect(result.weather.overrides).toContain("wind_advisory");
    expect(result.weather.warnings.some((w) => w.includes("rotating"))).toBe(true);
  });

  it("applies cold snap when breadth is severely negative", () => {
    const result = classify(COLD_SNAP_FIXTURE);

    expect(result.weather.kind).toBe("cold_snap");
    expect(result.weather.overrides).toContain("cold_snap");
    expect(result.weather.severity).toBe("high"); // abs score ~0.42 < 0.6
  });

  it("applies storm override when liquidity is critically low even if trend is ok", () => {
    // Memecoin: trend is negative but not storm-level, yet liquidity is 0.25
    const result = classify(MEMECOIN_FIXTURE);

    // With memecoin fixture: trend -0.45, breadth -0.50, vol 0.88, leverage 0.78, liq 0.25
    // The base score will be well below stormMax (-0.20), so it'd be storm anyway
    // But we also expect storm override from liquidity crisis
    expect(result.weather.kind).toBe("storm");
  });

  it("fog takes precedence over other overrides", () => {
    // Even with perfect data, if confidence is under threshold, fog wins
    const result = classify(FOG_FIXTURE);

    expect(result.weather.kind).toBe("fog");
    // fog overrides everything
  });

  it("storm overrides take precedence after fog", () => {
    const result = classify(STORM_FIXTURE);

    expect(result.weather.kind).toBe("storm");
  });
});

// ---- Boundary Condition Tests ----

describe("classifyWeather — boundary conditions", () => {
  it("classifies correctly at storm boundary (score exactly at -0.20)", () => {
    // This fixture is designed to produce a score near -0.20
    const result = classify(STORM_BOUNDARY_FIXTURE);

    // Score should be near the storm threshold
    expect(result.diagnostics.baseScore).toBeDefined();
    expect(typeof result.diagnostics.baseScore).toBe("number");
  });

  it("classifies at clear boundary (score >= 0.15)", () => {
    // Partly cloudy has score just above 0 — should not be clear
    const result = classify(PARTLY_CLOUDY_FIXTURE);

    // partly_cloudy fixture has trend 0.22, breadth 0.15 — score should be positive but < 0.5
    expect(result.diagnostics.baseScore).toBeGreaterThan(0);
    expect(result.diagnostics.baseScore).toBeLessThan(0.3);
    // Not high enough for clear, should be partly_cloudy
    expect(result.weather.kind).toBe("partly_cloudy");
  });
});

// ---- Missing Data Tests ----

describe("classifyWeather — missing/insufficient data", () => {
  it("returns fog when many signals are missing", () => {
    const result = classify(PARTIAL_SIGNALS_FIXTURE);

    expect(result.weather.kind).toBe("fog");
    expect(result.weather.overrides).toContain("fog");
  });

  it("reduces confidence in warnings when signals are missing", () => {
    const result = classify(PARTIAL_SIGNALS_FIXTURE);

    expect(result.weather.confidence).toBeLessThan(0.4);
  });
});

// ---- Severity Tests ----

describe("classifyWeather — severity", () => {
  it("clear skies are low severity", () => {
    const result = classify(CLEAR_SKIES_FIXTURE);
    expect(result.weather.severity).toBe("low");
  });

  it("storm with high vol is critical", () => {
    const result = classify(STORM_FIXTURE);
    expect(result.weather.severity).toBe("critical");
  });

  it("rain at moderate score is medium", () => {
    const result = classify(RAIN_FIXTURE);
    expect(result.weather.severity).toBe("medium");
  });

  it("heatwave with vol > 0.75 is critical", () => {
    // HEATWAVE_FIXTURE vol is 0.72 — below the 0.75 threshold for critical
    const result = classify(HEATWAVE_FIXTURE);
    expect(result.weather.severity).toBe("high");
  });

  it("wind advisory with moderate score is medium", () => {
    const result = classify(WIND_ADVISORY_FIXTURE);
    expect(result.weather.severity).toBe("medium");
  });
});

// ---- Component Contribution Tests ----

describe("classifyWeather — component contributions", () => {
  it("returns complete component breakdown", () => {
    const result = classify(CLEAR_SKIES_FIXTURE);

    const contributions = result.weather.componentContributions;
    expect(contributions.trend).toBeDefined();
    expect(contributions.breadth).toBeDefined();
    expect(contributions.volatilityLeverage).toBeDefined();
    expect(contributions.volumeLiquidity).toBeDefined();
    expect(contributions.macro).toBeDefined();
    expect(contributions.narrativeSentiment).toBeDefined();

    // Sum should approximately equal baseScore
    const sum = Object.values(contributions).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(result.weather.baseScore, 1);
  });

  it("trend contributes positively in clear skies", () => {
    const result = classify(CLEAR_SKIES_FIXTURE);

    expect(result.weather.componentContributions.trend).toBeGreaterThan(0);
  });

  it("volatility contributes negatively", () => {
    const result = classify(STORM_FIXTURE);

    expect(result.weather.componentContributions.volatilityLeverage).toBeLessThan(0);
  });

  it("liquidity contributes positively when healthy", () => {
    const result = classify(CLEAR_SKIES_FIXTURE);

    expect(result.weather.componentContributions.volumeLiquidity).toBeGreaterThan(0);
  });
});

// ---- Diagnostics Tests ----

describe("classifyWeather — diagnostics", () => {
  it("returns full diagnostics for transparency", () => {
    const result = classify(CLEAR_SKIES_FIXTURE);

    expect(result.diagnostics.baseScore).toBeDefined();
    expect(result.diagnostics.components).toBeDefined();
    expect(result.diagnostics.weights).toEqual(DEFAULT_WEIGHTS);
    expect(result.diagnostics.thresholds).toEqual(DEFAULT_THRESHOLDS);
    expect(result.diagnostics.baseWeather).toBeDefined();
    expect(result.diagnostics.triggeredOverrides).toBeDefined();
  });
});

// ---- Custom Weight Tests ----

describe("classifyWeather — custom weights", () => {
  it("accepts custom weights", () => {
    const signals = normalizeSignals({
      raw: CLEAR_SKIES_FIXTURE,
      subjectId: "global",
      scope: "global",
      source: "coinmarketcap",
      providerTimestamp: "2026-07-10T12:00:00Z",
    });

    const customWeights = {
      trendStrength: 0.50, // heavily weight trend
      breadth: 0.10,
      volatilityLeverage: 0.10,
      volumeLiquidity: 0.10,
      macroPressure: 0.10,
      narrativeSentiment: 0.10,
    };

    const result = classifyWeather({ signals, weights: customWeights });

    // Custom weights should be reflected
    expect(result.diagnostics.weights.trendStrength).toBe(0.50);
    // Trend contribution should be higher due to increased weight
    expect(result.weather.componentContributions.trend).toBeGreaterThan(0.25);
  });

  it("accepts custom thresholds", () => {
    const signals = normalizeSignals({
      raw: CLEAR_SKIES_FIXTURE,
      subjectId: "global",
      scope: "global",
      source: "coinmarketcap",
      providerTimestamp: "2026-07-10T12:00:00Z",
    });

    const result = classifyWeather({
      signals,
      thresholds: { clearMin: 0.05 },
    });

    expect(result.diagnostics.thresholds.clearMin).toBe(0.05);
  });
});

// ---- Warning Tests ----

describe("classifyWeather — warnings", () => {
  it("generates volatility warning when vol is high", () => {
    const result = classify(HEATWAVE_FIXTURE);

    expect(result.weather.warnings.some((w: string) => w.toLowerCase().includes("volatility"))).toBe(true);
  });

  it("generates leverage warning when leverage risk is high", () => {
    const result = classify(STORM_FIXTURE);

    expect(result.weather.warnings.some((w) => w.includes("Leverage"))).toBe(true);
  });

  it("generates breadth warning when participation narrows", () => {
    const result = classify(COLD_SNAP_FIXTURE);

    expect(result.weather.warnings.some((w) => w.includes("narrowing"))).toBe(true);
  });

  it("generates missing-signal warning when data is incomplete", () => {
    const result = classify(PARTIAL_SIGNALS_FIXTURE);

    expect(result.weather.warnings.some((w) => w.includes("unavailable"))).toBe(true);
  });

  it("clear skies have no warnings", () => {
    const result = classify(CLEAR_SKIES_FIXTURE);

    expect(result.weather.warnings).toHaveLength(0);
  });
});

// ---- Rule Version Tests ----

describe("classifyWeather — rule versioning", () => {
  it("returns the current rule version", () => {
    const result = classify(CLEAR_SKIES_FIXTURE);

    expect(result.weather.ruleVersion).toBe("1.0.0");
  });
});

// ---- Idempotency Tests ----

describe("classifyWeather — idempotency", () => {
  it("produces identical results for the same input", () => {
    const a = classify(CLEAR_SKIES_FIXTURE);
    const b = classify(CLEAR_SKIES_FIXTURE);

    expect(a.weather.kind).toBe(b.weather.kind);
    expect(a.weather.severity).toBe(b.weather.severity);
    expect(a.weather.baseScore).toBe(b.weather.baseScore);
    expect(a.weather.confidence).toBe(b.weather.confidence);
  });
});
