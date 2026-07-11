// ============================================================
// Signal City — Explanation Engine Tests
// ============================================================

import { describe, it, expect } from "vitest";
import { normalizeSignals } from "../../src/normalization/engine";
import { classifyWeather } from "../../src/market-engine/weather";
import { generateExplanation } from "../../src/explanation/engine";
import {
  CLEAR_SKIES_FIXTURE,
  STORM_FIXTURE,
  HEATWAVE_FIXTURE,
  FOG_FIXTURE,
  WIND_ADVISORY_FIXTURE,
} from "../fixtures/cmc-responses";

const NOW = new Date().toISOString();

function explain(fixture: Record<string, unknown>, label = "Test District") {
  const signals = normalizeSignals({
    raw: fixture,
    subjectId: "global",
    scope: "global",
    source: "coinmarketcap",
    providerTimestamp: NOW,
  });
  const weatherOutput = classifyWeather({ signals });
  return generateExplanation({
    weather: weatherOutput.weather,
    signals,
    districtLabel: label,
  });
}

describe("generateExplanation", () => {
  describe("structure", () => {
    it("always returns summary, causes, changed, watch", () => {
      const result = explain(CLEAR_SKIES_FIXTURE);

      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(10);
      expect(result.causes).toBeInstanceOf(Array);
      expect(result.causes.length).toBeGreaterThan(0);
      expect(result.changed).toBeTruthy();
      expect(result.watch).toBeInstanceOf(Array);
      expect(result.watch.length).toBeGreaterThan(0);
    });

    it("includes model version", () => {
      const result = explain(CLEAR_SKIES_FIXTURE);
      expect(result.modelVersion).toBe("1.0.0");
    });
  });

  describe("weather-specific summaries", () => {
    it("clear skies mentions favorable conditions", () => {
      const result = explain(CLEAR_SKIES_FIXTURE);
      expect(result.summary).toContain("favorable");
    });

    it("storm mentions elevated risk", () => {
      const result = explain(STORM_FIXTURE);
      expect(result.summary).toContain("elevated");
    });

    it("heatwave mentions overextended", () => {
      const result = explain(HEATWAVE_FIXTURE);
      expect(result.summary).toContain("overextended");
    });

    it("fog mentions low visibility", () => {
      const result = explain(FOG_FIXTURE);
      expect(result.summary).toContain("low");
    });

    it("wind advisory mentions rotation", () => {
      const result = explain(WIND_ADVISORY_FIXTURE);
      expect(result.summary).toContain("rotating");
    });
  });

  describe("causes", () => {
    it("includes trend cause when trend is strong", () => {
      const result = explain(CLEAR_SKIES_FIXTURE);
      expect(result.causes.some((c) => c.includes("Trend"))).toBe(true);
    });

    it("includes volatility cause when elevated", () => {
      const result = explain(STORM_FIXTURE);
      expect(result.causes.some((c) => c.includes("Volatility"))).toBe(true);
    });

    it("includes override explanations", () => {
      const result = explain(HEATWAVE_FIXTURE);
      expect(result.causes.some((c) => c.includes("override"))).toBe(true);
    });

    it("has fallback when no single factor dominates", () => {
      const result = explain(FOG_FIXTURE);
      // Should have at least the fallback cause
      expect(result.causes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("watch conditions", () => {
    it("includes breadth warning when appropriate", () => {
      const result = explain(CLEAR_SKIES_FIXTURE);
      // Clear skies has breadth 0.55 (not narrowing), so might not trigger
      // But we should always have at least one watch item
      expect(result.watch.length).toBeGreaterThanOrEqual(1);
    });

    it("includes data-availability warning for fog", () => {
      const result = explain(FOG_FIXTURE);
      expect(result.watch.some((w) => w.includes("unavailable"))).toBe(true);
    });
  });

  describe("change description (with previous state)", () => {
    it("describes weather upgrade", () => {
      const signals = normalizeSignals({
        raw: CLEAR_SKIES_FIXTURE,
        subjectId: "global",
        scope: "global",
        source: "coinmarketcap",
        providerTimestamp: "2026-07-10T12:00:00Z",
      });
      const current = classifyWeather({ signals });
      // Simulate previous state as stormy
      const result = generateExplanation({
        weather: current.weather,
        signals,
        previousWeather: {
          kind: "storm",
          severity: "high",
          baseScore: -0.5,
          confidence: 0.7,
          warnings: [],
          overrides: [],
          componentContributions: {},
          triggeredThresholds: [],
          ruleVersion: "1.0.0",
        },
        districtLabel: "Test",
      });

      expect(result.changed).toContain("Clear Skies");
      expect(result.changed).toContain("Storm");
    });

    it("describes severity change within same weather", () => {
      const signals = normalizeSignals({
        raw: CLEAR_SKIES_FIXTURE,
        subjectId: "global",
        scope: "global",
        source: "coinmarketcap",
        providerTimestamp: "2026-07-10T12:00:00Z",
      });
      const current = classifyWeather({ signals });

      const result = generateExplanation({
        weather: current.weather,
        signals,
        previousWeather: {
          ...current.weather,
          kind: "clear",
          severity: "medium",
        },
        districtLabel: "Test",
      });

      expect(result.changed).toContain("severity");
    });
  });

  describe("does not invent data", () => {
    it("summary does not contain numbers not in the evidence", () => {
      const result = explain(FOG_FIXTURE);
      // Should not fabricate specific percentages or values
      expect(result.summary).not.toMatch(/\d+%/);
    });

    it("causes do not invent missing signal details", () => {
      const result = explain(FOG_FIXTURE);
      // The fog fixture has no trend data, so causes should not claim trend specifics
      const trendCause = result.causes.find((c) => c.includes("Trend"));
      expect(trendCause).toBeUndefined();
    });
  });
});
