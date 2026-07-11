// ============================================================
// Signal City — CMC Provider Adapter
// Isolates CoinMarketCap MCP and REST connections.
// All provider logic lives here — never scattered across routes.
// ============================================================

import type { NormalizationInput } from "../normalization/engine";

// ---- Types ----

export interface CMCMarketOverviewResponse {
  timestamp: string;
  data: {
    totalMarketCap?: number;
    totalVolume24h?: number;
    btcDominance?: number;
    ethDominance?: number;
    fearGreedIndex?: number;
    altcoinSeasonIndex?: number;
    marketTrend?: number;
    breadth?: number;
    volatility?: number;
    leverageRisk?: number;
    liquidityHealth?: number;
    macroPressure?: number;
    sentiment?: number;
    narrativeHeat?: number;
    momentumAcceleration?: number;
    trendingNarratives?: string[];
    [key: string]: unknown;
  };
}

export interface CMCProviderConfig {
  /** API key for REST endpoints. */
  apiKey?: string;

  /** Base URL for REST API. */
  restBaseUrl?: string;
}

// ---- Adapter Interface ----

export interface ICMCAdapter {
  /** Fetch a full market overview (global or sector). */
  fetchMarketOverview(scope: "global" | string): Promise<NormalizationInput>;

  /** Fetch asset-specific data. */
  fetchAssetData(assetId: string): Promise<NormalizationInput>;

  /** Check if the provider is reachable. */
  healthCheck(): Promise<boolean>;
}

// ---- REST Adapter ----

export class CMCRestAdapter implements ICMCAdapter {
  private readonly apiKey?: string;
  private readonly restBaseUrl: string;

  constructor(config: CMCProviderConfig = {}) {
    this.apiKey = config.apiKey;
    this.restBaseUrl = config.restBaseUrl ?? "https://pro-api.coinmarketcap.com";
  }

  async fetchMarketOverview(scope: string): Promise<NormalizationInput> {
    // In production, this calls the CMC REST API.
    // For now, we provide a structured fixture path that the test/mock layer fills.
    const now = new Date().toISOString();

    return {
      raw: await this.getMarketOverviewRaw(scope),
      subjectId: scope === "global" ? "global" : scope,
      scope: scope === "global" ? "global" : "sector",
      source: "coinmarketcap",
      providerTimestamp: now,
      fieldMap: this.fieldMapForScope(scope),
    };
  }

  async fetchAssetData(assetId: string): Promise<NormalizationInput> {
    const now = new Date().toISOString();

    return {
      raw: await this.getAssetRaw(assetId),
      subjectId: assetId,
      scope: "asset",
      source: "coinmarketcap",
      providerTimestamp: now,
      fieldMap: {
        trend: "data.priceChange24h",
        volatility: "data.volatility",
        liquidityHealth: "data.volume24h",
        leverageRisk: "data.leverageRisk",
        sentiment: "data.sentiment",
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Lightweight check — try to hit the CMC status or a cheap endpoint
      if (!this.apiKey) return false;
      return true;
    } catch {
      return false;
    }
  }

  // ---- Private helpers ----

  private async getMarketOverviewRaw(scope: string): Promise<Record<string, unknown>> {
    // TODO: Replace with actual REST call when credentials are configured.
    // GET /v1/global-metrics/quotes/latest or similar.
    //
    // For now, this stub exists so the adapter compiles and tests can
    // inject recorded fixtures. The production path will use fetch().
    throw new Error(
      `CMC REST adapter: live fetch not configured for scope "${scope}". ` +
      `Set CMC_API_KEY in backend/.env or use the MCP adapter.`,
    );
  }

  private async getAssetRaw(_assetId: string): Promise<Record<string, unknown>> {
    throw new Error(
      `CMC REST adapter: live asset fetch not configured. ` +
      `Set CMC_API_KEY in backend/.env or use the MCP adapter.`,
    );
  }

  private fieldMapForScope(scope: string): Record<string, string> {
    // Global and sector share the same mapping for market overview
    return {
      trend: "data.marketTrend",
      breadth: "data.breadth",
      volatility: "data.volatility",
      leverageRisk: "data.leverageRisk",
      liquidityHealth: "data.liquidityHealth",
      macroPressure: "data.macroPressure",
      sentiment: "data.sentiment",
      narrativeHeat: "data.narrativeHeat",
      momentumAcceleration: "data.momentumAcceleration",
    };
  }
}

// ---- Fixture (Mock) Adapter — for development and testing ----

/**
 * FixtureAdapter returns recorded/pre-computed responses.
 * Use for tests and development without live CMC credentials.
 */
export class FixtureAdapter implements ICMCAdapter {
  private fixtures: Map<string, Record<string, unknown>>;
  private timestamp: string;

  constructor(fixtures?: Record<string, Record<string, unknown>>) {
    this.fixtures = new Map(Object.entries(fixtures ?? {}));
    this.timestamp = new Date().toISOString();
  }

  setFixture(key: string, data: Record<string, unknown>): void {
    this.fixtures.set(key, data);
  }

  setTimestamp(ts: string): void {
    this.timestamp = ts;
  }

  async fetchMarketOverview(scope: string): Promise<NormalizationInput> {
    const key = `market-overview:${scope}`;
    const raw = this.fixtures.get(key) ?? this.defaultMarketOverview(scope);

    return {
      raw,
      subjectId: scope === "global" ? "global" : scope,
      scope: scope === "global" ? "global" : "sector",
      source: "coinmarketcap",
      providerTimestamp: this.timestamp,
      fieldMap: {
        trend: "data.marketTrend",
        breadth: "data.breadth",
        volatility: "data.volatility",
        leverageRisk: "data.leverageRisk",
        liquidityHealth: "data.liquidityHealth",
        macroPressure: "data.macroPressure",
        sentiment: "data.sentiment",
        narrativeHeat: "data.narrativeHeat",
        momentumAcceleration: "data.momentumAcceleration",
      },
    };
  }

  async fetchAssetData(assetId: string): Promise<NormalizationInput> {
    const key = `asset:${assetId}`;
    const raw = this.fixtures.get(key) ?? this.defaultAsset(assetId);

    return {
      raw,
      subjectId: assetId,
      scope: "asset",
      source: "coinmarketcap",
      providerTimestamp: this.timestamp,
      fieldMap: {
        trend: "data.marketTrend",
        breadth: "data.breadth",
        volatility: "data.volatility",
        leverageRisk: "data.leverageRisk",
        liquidityHealth: "data.liquidityHealth",
        macroPressure: "data.macroPressure",
        sentiment: "data.sentiment",
        narrativeHeat: "data.narrativeHeat",
        momentumAcceleration: "data.momentumAcceleration",
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // ---- Default fixture data (healthy market) ----

  private defaultMarketOverview(scope: string): Record<string, unknown> {
    return {
      timestamp: this.timestamp,
      data: {
        totalMarketCap: 2_450_000_000_000,
        totalVolume24h: 98_000_000_000,
        btcDominance: 52.3,
        ethDominance: 16.8,
        fearGreedIndex: 62,
        altcoinSeasonIndex: 45,
        marketTrend: 0.35,
        breadth: 0.28,
        volatility: 0.42,
        leverageRisk: 0.35,
        liquidityHealth: 0.72,
        macroPressure: 0.15,
        sentiment: 0.30,
        narrativeHeat: 0.55,
        momentumAcceleration: 0.10,
        trendingNarratives: ["AI Tokens", "RWA", "Layer 2 Scaling"],
        scope,
      },
    };
  }

  private defaultAsset(assetId: string): Record<string, unknown> {
    return {
      timestamp: this.timestamp,
      data: {
        symbol: assetId,
        price: 0,
        priceChange24h: 2.5,
        volume24h: 1_000_000_000,
        marketCap: 50_000_000_000,
        marketTrend: 0.20,
        breadth: 0.15,
        volatility: 0.45,
        leverageRisk: 0.30,
        liquidityHealth: 0.68,
        macroPressure: 0.10,
        sentiment: 0.25,
        narrativeHeat: 0.40,
        momentumAcceleration: 0.05,
      },
    };
  }
}
