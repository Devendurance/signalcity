// ============================================================
// Signal City — City Mapper Tests
// ============================================================

import { describe, it, expect } from "vitest";
import { normalizeSignals } from "../../src/normalization/engine";
import { classifyWeather } from "../../src/market-engine/weather";
import { mapToCityState } from "../../src/market-engine/city-mapper";
import {
  CLEAR_SKIES_FIXTURE,
  STORM_FIXTURE,
  HEATWAVE_FIXTURE,
  FOG_FIXTURE,
} from "../fixtures/cmc-responses";

const NOW = new Date().toISOString();

function weatherAndCity(fixture: Record<string, unknown>) {
  const signals = normalizeSignals({
    raw: fixture,
    subjectId: "global",
    scope: "global",
    source: "coinmarketcap",
    providerTimestamp: NOW,
  });
  const weatherOutput = classifyWeather({ signals });
  const city = mapToCityState(
    weatherOutput.weather,
    signals,
    (fixture.data as Record<string, unknown>)?.trendingNarratives as string[] | undefined,
  );
  return { signals, weather: weatherOutput.weather, city };
}

describe("mapToCityState", () => {
  describe("clear skies → vibrant city", () => {
    it("has moderate traffic density", () => {
      const { city } = weatherAndCity(CLEAR_SKIES_FIXTURE);
      expect(city.trafficDensity).toBeGreaterThan(0.4);
      expect(city.trafficDensity).toBeLessThanOrEqual(1);
    });

    it("has fast traffic", () => {
      const { city } = weatherAndCity(CLEAR_SKIES_FIXTURE);
      expect(city.trafficSpeed).toBeGreaterThan(0.5);
    });

    it("has high building activity", () => {
      const { city } = weatherAndCity(CLEAR_SKIES_FIXTURE);
      expect(city.buildingActivity).toBeGreaterThan(0.6);
    });

    it("has low emergency level", () => {
      const { city } = weatherAndCity(CLEAR_SKIES_FIXTURE);
      expect(city.emergencyLevel).toBeLessThan(0.3);
    });

    it("has high visibility", () => {
      const { city } = weatherAndCity(CLEAR_SKIES_FIXTURE);
      expect(city.visibility).toBeGreaterThan(0.9);
    });
  });

  describe("storm → chaotic city", () => {
    it("has high congestion", () => {
      const { city } = weatherAndCity(STORM_FIXTURE);
      expect(city.congestion).toBeGreaterThan(0.6);
    });

    it("has slow traffic", () => {
      const { city } = weatherAndCity(STORM_FIXTURE);
      expect(city.trafficSpeed).toBeLessThan(0.4);
    });

    it("has high emergency level", () => {
      const { city } = weatherAndCity(STORM_FIXTURE);
      expect(city.emergencyLevel).toBeGreaterThan(0.5);
    });

    it("has restricted roads", () => {
      const { city } = weatherAndCity(STORM_FIXTURE);
      expect(city.roadRestrictionLevel).toBeGreaterThan(0.3);
    });
  });

  describe("fog → obscured city", () => {
    it("has very low visibility", () => {
      const { city } = weatherAndCity(FOG_FIXTURE);
      expect(city.visibility).toBeLessThan(0.2);
    });

    it("has minimal building activity", () => {
      const { city } = weatherAndCity(FOG_FIXTURE);
      expect(city.buildingActivity).toBe(0.5); // defaults to neutral with 0 signals
    });
  });

  describe("heatwave → intense city", () => {
    it("has high construction activity (narrative heat)", () => {
      const { city } = weatherAndCity(HEATWAVE_FIXTURE);
      expect(city.constructionActivity).toBeGreaterThan(0.4);
    });

    it("has heatwave billboard", () => {
      const { city } = weatherAndCity(HEATWAVE_FIXTURE);
      const weatherBoard = city.narrativeBillboards.find((b) => b.id === "weather-status");
      expect(weatherBoard).toBeDefined();
      expect(weatherBoard!.classification).toBe("heatwave");
    });
  });

  describe("all values in range", () => {
    it("trafficDensity is in [0, 1]", () => {
      const { city } = weatherAndCity(CLEAR_SKIES_FIXTURE);
      expect(city.trafficDensity).toBeGreaterThanOrEqual(0);
      expect(city.trafficDensity).toBeLessThanOrEqual(1);
    });

    it("trafficSpeed is in [0, 1]", () => {
      const { city } = weatherAndCity(CLEAR_SKIES_FIXTURE);
      expect(city.trafficSpeed).toBeGreaterThanOrEqual(0);
      expect(city.trafficSpeed).toBeLessThanOrEqual(1);
    });

    it("congestion is in [0, 1]", () => {
      const { city } = weatherAndCity(STORM_FIXTURE);
      expect(city.congestion).toBeGreaterThanOrEqual(0);
      expect(city.congestion).toBeLessThanOrEqual(1);
    });

    it("buildingActivity is in [0, 1]", () => {
      const { city } = weatherAndCity(CLEAR_SKIES_FIXTURE);
      expect(city.buildingActivity).toBeGreaterThanOrEqual(0);
      expect(city.buildingActivity).toBeLessThanOrEqual(1);
    });

    it("emergencyLevel is in [0, 1]", () => {
      const { city } = weatherAndCity(STORM_FIXTURE);
      expect(city.emergencyLevel).toBeGreaterThanOrEqual(0);
      expect(city.emergencyLevel).toBeLessThanOrEqual(1);
    });

    it("visibility is in [0.1, 1]", () => {
      const { city } = weatherAndCity(FOG_FIXTURE);
      expect(city.visibility).toBeGreaterThanOrEqual(0.1);
      expect(city.visibility).toBeLessThanOrEqual(1);
    });
  });

  describe("narrative billboards", () => {
    it("always includes a weather-status billboard", () => {
      const { city } = weatherAndCity(CLEAR_SKIES_FIXTURE);
      expect(city.narrativeBillboards.length).toBeGreaterThanOrEqual(1);
      expect(city.narrativeBillboards[0].id).toBe("weather-status");
    });

    it("includes narrative billboards when provided", () => {
      const { city } = weatherAndCity(CLEAR_SKIES_FIXTURE);
      // Clear skies fixture has ["AI Tokens", "RWA Growth", "ETF Inflows"]
      const narrativeBoards = city.narrativeBillboards.filter((b) => b.id.startsWith("narrative-"));
      expect(narrativeBoards.length).toBeGreaterThan(0);
    });

    it("includes sentiment billboard when strong", () => {
      const { city } = weatherAndCity(HEATWAVE_FIXTURE);
      const sentimentBoard = city.narrativeBillboards.find((b) => b.id === "sentiment");
      expect(sentimentBoard).toBeDefined();
      expect(sentimentBoard!.text).toContain("Positive");
    });
  });
});
