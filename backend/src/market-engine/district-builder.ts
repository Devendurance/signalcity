// ============================================================
// Signal City — DistrictState Builder (Orchestrator)
// Wires: adapter → normalization → weather → city → explanation → receipt → DistrictState
// This is the single entry point for producing renderer-ready state.
// ============================================================

import type { DistrictState, CityWorldState, DistrictScope } from "@shared/contracts/district";
import type { NormalizedMarketSignals } from "@shared/contracts/signals";
import type { SkillReceipt } from "@shared/contracts/receipt";
import type { ICMCAdapter } from "../coinmarketcap/adapter";
import { normalizeSignals } from "../normalization/engine";
import { classifyWeather } from "../market-engine/weather";
import { mapToCityState } from "../market-engine/city-mapper";
import { generateExplanation } from "../explanation/engine";

// ---- District Configuration ----

export interface DistrictConfig {
  id: string;
  label: string;
  scope: DistrictScope;
  subjectId: string;
  position: readonly [number, number, number];
  assetId: string;
}

// ---- Pre-configured districts ----

export const DEFAULT_DISTRICTS: DistrictConfig[] = [
  { id: "global", label: "Global Market", scope: "global", subjectId: "global", position: [0, 0, 0] as const, assetId: "skyscraper" },
  { id: "btc", label: "BTC District", scope: "asset", subjectId: "BTC", position: [-2.25, 0, -1.7] as const, assetId: "skyscraper" },
  { id: "ai", label: "AI District", scope: "sector", subjectId: "ai-sector", position: [0, 0, -1.7] as const, assetId: "office" },
  { id: "defi", label: "DeFi District", scope: "sector", subjectId: "defi-sector", position: [2.25, 0, -1.7] as const, assetId: "data-center" },
  { id: "memecoin", label: "Memecoin District", scope: "sector", subjectId: "memecoin-sector", position: [-2.25, 0, 1.7] as const, assetId: "office" },
  { id: "rwa", label: "RWA District", scope: "sector", subjectId: "rwa-sector", position: [2.25, 0, 1.7] as const, assetId: "data-center" },
];

// ---- Builder ----

export class DistrictStateBuilder {
  constructor(private readonly adapter: ICMCAdapter) {}

  /**
   * Build DistrictState for a single district.
   */
  async buildDistrict(
    config: DistrictConfig,
    previousState?: DistrictState,
  ): Promise<{ district: DistrictState; receipt: SkillReceipt }> {
    const runId = crypto.randomUUID();

    // Step 1: Fetch from provider
    const rawInput =
      config.scope === "asset"
        ? await this.adapter.fetchAssetData(config.subjectId)
        : await this.adapter.fetchMarketOverview(
            config.scope === "global" ? "global" : config.subjectId,
          );

    // Step 2: Normalize
    const signals: NormalizedMarketSignals = normalizeSignals(rawInput);

    // Step 3: Classify weather
    const weatherOutput = classifyWeather({ signals });

    // Step 4: Map to city state
    const cityState = mapToCityState(
      weatherOutput.weather,
      signals,
      extractNarratives(rawInput.raw),
    );

    // Step 5: Generate explanation
    const explanation = generateExplanation({
      weather: weatherOutput.weather,
      signals,
      previousWeather: previousState?.weather,
      districtLabel: config.label,
    });

    // Step 6: Build receipt
    const receipt: SkillReceipt = {
      id: crypto.randomUUID(),
      runId,
      workflows: config.scope === "global"
        ? ["Daily Market Overview", "Crypto Macro Overview", "BTC Cross-Asset Correlation"]
        : config.scope === "sector"
          ? ["Altcoin Sector Analysis", "Daily Market Overview"]
          : ["Altcoin Token Profile", "Daily Market Overview"],
      requestedAt: new Date().toISOString(),
      providerTimestamp: signals.providerTimestamp,
      sourceValues: rawInput.raw as Record<string, unknown>,
      normalizedSignals: signals as unknown as Record<string, unknown>,
      transformations: [
        { step: "normalization", version: signals.normalizationVersion, description: "Provider → NormalizedMarketSignals" },
        { step: "weather-classification", version: weatherOutput.weather.ruleVersion, description: "Signals → WeatherState via weighted scoring" },
      ],
      outcome: {
        weather: weatherOutput.weather.kind,
        severity: weatherOutput.weather.severity,
        baseScore: weatherOutput.weather.baseScore,
        confidence: weatherOutput.weather.confidence,
      },
      confidence: weatherOutput.weather.confidence,
      missingEvidence: signals.missingSignals,
      changeConditions: explanation.watch,
    };

    // Step 7: Build DistrictState
    const now = new Date().toISOString();
    const district: DistrictState = {
      id: config.id,
      label: config.label,
      scope: config.scope,
      subjectId: config.subjectId,
      generatedAt: now,
      dataAsOf: signals.providerTimestamp,
      nextRefreshAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
      status: signals.confidence < 0.3
        ? "insufficient_data"
        : signals.freshness === "stale"
          ? "stale"
          : signals.missingSignals.length > 3
            ? "partial"
            : "ready",
      position: config.position,
      assetId: config.assetId,
      weather: weatherOutput.weather,
      city: cityState,
      explanation,
      receiptId: receipt.id,
      version: "1.0.0",
    };

    return { district, receipt };
  }

  /**
   * Build the full CityWorldState (all districts).
   */
  async buildCity(
    districts?: DistrictConfig[],
  ): Promise<{ world: CityWorldState; receipts: SkillReceipt[] }> {
    const configs = districts ?? DEFAULT_DISTRICTS;
    const results = await Promise.all(
      configs.map((c) => this.buildDistrict(c)),
    );

    const now = new Date().toISOString();
    const allReady = results.every(
      (r) => r.district.status === "ready" || r.district.status === "partial",
    );

    const world: CityWorldState = {
      id: crypto.randomUUID(),
      updatedAt: now,
      dataAsOf: results[0]?.district.dataAsOf ?? now,
      nextRefreshAt: results[0]?.district.nextRefreshAt,
      systemStatus: allReady ? "ready" : "partial",
      districts: results.map((r) => r.district),
      version: "1.0.0",
    };

    return {
      world,
      receipts: results.map((r) => r.receipt),
    };
  }
}

// ---- Helpers ----

function extractNarratives(raw: Record<string, unknown>): string[] | undefined {
  const data = raw.data as Record<string, unknown> | undefined;
  const narratives = data?.trendingNarratives;
  if (Array.isArray(narratives) && narratives.every((n): n is string => typeof n === "string")) {
    return narratives;
  }
  return undefined;
}
