import type { CityWorldState } from "@/shared/contracts";

const GENERATED_AT = "2026-07-10T12:00:00.000Z";

export const FOUNDATION_WORLD: CityWorldState = {
  id: "signal-city-foundation",
  updatedAt: GENERATED_AT,
  dataAsOf: GENERATED_AT,
  systemStatus: "ready",
  version: "1.0.0",
  districts: [
    createDistrict("btc", "BTC District", "asset", "BTC", "skyscraper", [-7, 0, -4], "clear", "low", 0.9, "The BTC district is operating under clear fixture conditions.", 0.72, 0.56),
    createDistrict("ai", "AI District", "sector", "ai", "office", [0, 0, 6], "heatwave", "medium", 0.82, "The AI district is marked for elevated fixture activity.", 0.84, 0.62),
    createDistrict("defi", "DeFi District", "sector", "defi", "data-center", [7, 0, -4], "partly_cloudy", "medium", 0.76, "The DeFi district has mixed fixture conditions.", 0.58, 0.48),
  ],
};

function createDistrict(
  id: string,
  label: string,
  scope: "asset" | "sector",
  subjectId: string,
  assetId: string,
  position: readonly [number, number, number],
  weatherKind: "clear" | "heatwave" | "partly_cloudy",
  severity: "low" | "medium",
  confidence: number,
  summary: string,
  trafficDensity: number,
  trafficSpeed: number,
): CityWorldState["districts"][number] {
  return {
    id,
    label,
    scope,
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
