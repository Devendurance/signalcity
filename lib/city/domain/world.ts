import type { CityWorldState, DistrictState } from "@/shared/contracts";

const GENERATED_AT = "2026-07-10T12:00:00.000Z";

// ---- Foundation World (mock — replaced by backend in Phase 6) ----

export const FOUNDATION_WORLD: CityWorldState = {
  id: "signal-city-foundation",
  updatedAt: GENERATED_AT,
  dataAsOf: GENERATED_AT,
  systemStatus: "ready",
  version: "1.0.0",
  districts: [
    // === Weather Grid Sector Zones ===
    createSectorDistrict("btc", "BTC District", "BTC", "skyscraper", [-7, 0, -4], "clear", "low", 0.90, "The BTC district is operating under clear fixture conditions.", 0.72, 0.56),
    createSectorDistrict("ai", "AI District", "ai-sector", "office", [0, 0, 6], "heatwave", "medium", 0.82, "The AI district is marked for elevated fixture activity.", 0.84, 0.62),
    createSectorDistrict("defi", "DeFi District", "defi-sector", "data-center", [7, 0, -4], "partly_cloudy", "medium", 0.76, "The DeFi district has mixed fixture conditions.", 0.58, 0.48),
    createSectorDistrict("memecoin", "Memecoin District", "memecoin-sector", "office", [-7, 0, 4], "storm", "high", 0.70, "The Memecoin district is experiencing high volatility.", 0.88, 0.35),
    createSectorDistrict("rwa", "RWA District", "rwa-sector", "data-center", [7, 0, 4], "partly_cloudy", "low", 0.80, "The RWA district shows stable growth.", 0.55, 0.68),

    // === Product Districts ===
    createProductDistrict("claims", "Claims Bureau", "claims", "office", [-12, 0, 0], "The Claims Bureau investigates crypto claims using CoinMarketCap evidence. Click to submit a claim.", 0.50, 0.50),
    createProductDistrict("entry-gate", "Entry Gate", "entry-gate", "data-center", [12, 0, 0], "The Entry Gate evaluates your trade thesis against current market evidence. Run your reason through the FOMO checkpoint.", 0.60, 0.55),
    createProductDistrict("portfolio", "Portfolio Clinic", "portfolio", "office", [0, 0, 12], "The Portfolio Clinic diagnoses your holdings as a connected system. Enter your portfolio to receive a health report.", 0.50, 0.65),
  ],
};

// ---- Helpers ----

function createSectorDistrict(
  id: string,
  label: string,
  subjectId: string,
  assetId: string,
  position: readonly [number, number, number],
  weatherKind: DistrictState["weather"]["kind"],
  severity: DistrictState["weather"]["severity"],
  confidence: number,
  summary: string,
  trafficDensity: number,
  trafficSpeed: number,
): DistrictState {
  return {
    id,
    label,
    scope: "sector",
    subjectId,
    generatedAt: GENERATED_AT,
    dataAsOf: GENERATED_AT,
    status: "ready",
    position,
    assetId,
    weather: {
      kind: weatherKind,
      severity,
      baseScore: 0,
      componentContributions: {},
      triggeredThresholds: [],
      overrides: [],
      confidence,
      warnings: [],
      ruleVersion: "mock-1.0.0",
    },
    city: {
      trafficDensity,
      trafficSpeed,
      congestion: 0,
      buildingActivity: 0.5,
      emergencyLevel: 0,
      visibility: 1,
      constructionActivity: 0,
      roadRestrictionLevel: 0,
      narrativeBillboards: [],
    },
    explanation: { summary, causes: ["Mock structured state"], changed: "Initial frontend fixture.", watch: [] },
    receiptId: `mock-receipt-${id}`,
    version: "1.0.0",
  };
}

function createProductDistrict(
  id: string,
  label: string,
  subjectId: string,
  assetId: string,
  position: readonly [number, number, number],
  summary: string,
  trafficDensity: number,
  trafficSpeed: number,
): DistrictState {
  return {
    id,
    label,
    scope: "asset",
    subjectId,
    generatedAt: GENERATED_AT,
    dataAsOf: GENERATED_AT,
    status: "ready",
    position,
    assetId,
    weather: {
      kind: "clear",
      severity: "low",
      baseScore: 0,
      componentContributions: {},
      triggeredThresholds: [],
      overrides: [],
      confidence: 0.95,
      warnings: [],
      ruleVersion: "mock-1.0.0",
    },
    city: {
      trafficDensity,
      trafficSpeed,
      congestion: 0,
      buildingActivity: 0.5,
      emergencyLevel: 0,
      visibility: 1,
      constructionActivity: 0,
      roadRestrictionLevel: 0,
      narrativeBillboards: [],
    },
    explanation: { summary, causes: ["Product district fixture"], changed: "Initial state.", watch: [] },
    receiptId: `mock-receipt-${id}`,
    version: "1.0.0",
  };
}
