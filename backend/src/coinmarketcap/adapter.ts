// ============================================================
// Signal City — CoinMarketCap Provider Adapter
// Provider-specific REST handling and deterministic signal derivation.
// No credentials or provider response shapes leak beyond this boundary.
// ============================================================

import type { NormalizationInput } from "../normalization/engine";

export interface CMCProviderConfig {
  /** Server-side CMC Pro API key. */
  apiKey?: string;
  /** Allows tests to substitute the API host. */
  restBaseUrl?: string;
  timeoutMs?: number;
}

export interface ICMCAdapter {
  fetchMarketOverview(scope: "global" | string): Promise<NormalizationInput>;
  fetchAssetData(assetId: string): Promise<NormalizationInput>;
  healthCheck(): Promise<boolean>;
  request?(path: string): Promise<Record<string, unknown>>;
}

type CmcRecord = Record<string, unknown>;

const DEFAULT_BASE_URL = "https://pro-api.coinmarketcap.com";
const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Explicit, versioned constituent baskets for concepts that do not have a
 * single CMC canonical weather feed. These are inputs to a derived district,
 * not a claim that CMC itself publishes a sector weather classification.
 */
const SECTOR_BASKETS: Record<string, readonly string[]> = {
  "ai-sector": ["FET", "RENDER", "TAO", "NEAR", "ICP"],
  "defi-sector": ["AAVE", "UNI", "ONDO", "ENA", "MKR"],
  "memecoin-sector": ["DOGE", "SHIB", "PEPE", "BONK", "FLOKI"],
  "rwa-sector": ["ONDO", "LINK", "XLM", "ALGO", "PENDLE"],
};

const GLOBAL_BASKET = ["BTC", "ETH", "SOL", "BNB", "XRP"] as const;

/** A server-side CMC Pro REST adapter suitable for Next/Vercel route handlers. */
export class CMCRestAdapter implements ICMCAdapter {
  private readonly apiKey: string;
  private readonly restBaseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: CMCProviderConfig = {}) {
    if (!config.apiKey) {
      throw new Error("CMC_API_KEY is required for live CoinMarketCap mode.");
    }
    this.apiKey = config.apiKey;
    this.restBaseUrl = config.restBaseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async fetchMarketOverview(scope: "global" | string): Promise<NormalizationInput> {
    if (scope === "global") {
      const [globalResponse, quotesResponse] = await Promise.all([
        this.request("/v1/global-metrics/quotes/latest"),
        this.request(`/v2/cryptocurrency/quotes/latest?symbol=${GLOBAL_BASKET.join(",")}`),
      ]);
      const global = asRecord(globalResponse.data);
      const quoteRows = quoteRowsFromResponse(quotesResponse);
      const derived = deriveSignals(quoteRows, global);
      const providerTimestamp = timestampFrom(globalResponse, global, quoteRows);
      return normalizationInput("global", "global", {
        providerTimestamp,
        raw: { provider: globalResponse, quotes: quotesResponse, data: derived },
      });
    }

    const symbols = SECTOR_BASKETS[scope];
    if (!symbols) {
      throw new Error(`Unsupported live sector scope: ${scope}`);
    }
    const response = await this.request(`/v2/cryptocurrency/quotes/latest?symbol=${symbols.join(",")}`);
    const rows = quoteRowsFromResponse(response);
    const derived = deriveSignals(rows);
    return normalizationInput(scope, "sector", {
      providerTimestamp: timestampFrom(response, undefined, rows),
      raw: { provider: response, sectorDefinitionVersion: "1.0.0", constituents: symbols, data: derived },
    });
  }

  async fetchAssetData(assetId: string): Promise<NormalizationInput> {
    const symbol = assetId.trim().toUpperCase();
    if (!symbol) throw new Error("Asset symbol is required.");

    const response = await this.request(`/v2/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbol)}`);
    const rows = quoteRowsFromResponse(response);
    if (rows.length === 0) {
      throw new Error(`CoinMarketCap returned no quote for ${symbol}.`);
    }
    const derived = deriveSignals(rows);
    return normalizationInput(symbol, "asset", {
      providerTimestamp: timestampFrom(response, undefined, rows),
      raw: { provider: response, data: derived },
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.request("/v1/key/info");
      return true;
    } catch {
      return false;
    }
  }

  async request(path: string): Promise<CmcRecord> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.restBaseUrl}${path}`, {
        headers: {
          Accept: "application/json",
          "X-CMC_PRO_API_KEY": this.apiKey,
        },
        cache: "no-store",
        signal: controller.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !body || typeof body !== "object") {
        throw new Error(`CoinMarketCap request failed (${response.status}).`);
      }
      const payload = body as CmcRecord;
      const status = asRecord(payload.status);
      const errorCode = numeric(status.error_code);
      if (errorCode && errorCode !== 0) {
        throw new Error(`CoinMarketCap error ${errorCode}: ${String(status.error_message ?? "unknown provider error")}`);
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizationInput(
  subjectId: string,
  scope: "global" | "sector" | "asset",
  input: { providerTimestamp: string; raw: CmcRecord },
): NormalizationInput {
  return {
    raw: input.raw,
    subjectId,
    scope,
    source: "coinmarketcap",
    providerTimestamp: input.providerTimestamp,
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

/**
 * All values here are deterministic transformations of live CMC quote fields.
 * The raw response remains in provenance; callers can reproduce the result.
 */
function deriveSignals(rows: CmcRecord[], global?: CmcRecord): CmcRecord {
  const quotes = rows.map(usdQuote).filter((quote): quote is CmcRecord => quote !== null);
  if (quotes.length === 0) throw new Error("CoinMarketCap quote response contained no USD data.");

  const changes24h = quotes.map((q) => numeric(q.percent_change_24h)).filter(isNumber);
  const changes1h = quotes.map((q) => numeric(q.percent_change_1h)).filter(isNumber);
  const liquidityRatios = quotes.map((q) => {
    const volume = numeric(q.volume_24h);
    const cap = numeric(q.market_cap);
    return volume !== undefined && cap !== undefined && cap > 0 ? volume / cap : undefined;
  }).filter(isNumber);

  const avg24h = average(changes24h);
  const avg1h = average(changes1h);
  const advances = changes24h.filter((value) => value > 0).length;
  const breadth = changes24h.length ? (advances / changes24h.length) * 2 - 1 : 0;
  const volatility = clamp01(average(changes24h.map((value) => Math.abs(value))) / 20);
  const liquidity = clamp01(average(liquidityRatios) / 0.12);
  const globalConcentration = global ? numeric(global.btc_dominance) : undefined;

  return {
    // Normalized values, with their derivation captured under `derivedFrom`.
    marketTrend: clampBipolar(avg24h / 10),
    breadth: clampBipolar(breadth),
    volatility,
    // Proxy: volatility is not a leverage feed. Provenance makes this explicit.
    leverageRisk: clamp01(volatility * 0.75),
    liquidityHealth: liquidity,
    // BTC dominance is used only as a market-concentration proxy.
    macroPressure: globalConcentration === undefined ? 0 : clampBipolar((globalConcentration - 50) / 25),
    sentiment: clampBipolar((clampBipolar(avg24h / 10) + breadth) / 2),
    narrativeHeat: clamp01(average(liquidityRatios) / 0.08),
    momentumAcceleration: clampBipolar(avg1h / 3),
    trendingNarratives: [],
    derivedFrom: {
      quoteCount: quotes.length,
      averagePercentChange24h: avg24h,
      averagePercentChange1h: avg1h,
      averageVolumeToMarketCap: average(liquidityRatios),
      globalBtcDominance: globalConcentration,
      methodologyVersion: "1.0.0",
    },
  };
}

function quoteRowsFromResponse(response: CmcRecord): CmcRecord[] {
  const data = asRecord(response.data);
  const rows: CmcRecord[] = [];
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) {
      for (const row of value) if (row && typeof row === "object") rows.push(row as CmcRecord);
    } else if (value && typeof value === "object") {
      rows.push(value as CmcRecord);
    }
  }
  return rows;
}

function usdQuote(row: CmcRecord): CmcRecord | null {
  const quote = asRecord(row.quote);
  const usd = asRecord(quote.USD);
  return Object.keys(usd).length ? usd : null;
}

function timestampFrom(response: CmcRecord, global?: CmcRecord, rows: CmcRecord[] = []): string {
  const status = asRecord(response.status);
  const candidates = [
    status.timestamp,
    global?.last_updated,
    ...rows.map((row) => usdQuote(row)?.last_updated),
  ];
  for (const value of candidates) {
    if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  }
  return new Date().toISOString();
}

function asRecord(value: unknown): CmcRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as CmcRecord : {};
}
function numeric(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : undefined;
}
function isNumber(value: number | undefined): value is number { return value !== undefined; }
function average(values: number[]): number { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function clampBipolar(value: number): number { return Math.max(-1, Math.min(1, value)); }

// ---- Fixture adapter — development/test only ----

export class FixtureAdapter implements ICMCAdapter {
  private fixtures = new Map<string, CmcRecord>();
  private timestamp: string;

  constructor(fixtures?: Record<string, CmcRecord>) {
    this.fixtures = new Map(Object.entries(fixtures ?? {}));
    this.timestamp = new Date().toISOString();
  }

  setFixture(key: string, data: CmcRecord): void { this.fixtures.set(key, data); }
  setTimestamp(timestamp: string): void { this.timestamp = timestamp; }

  async fetchMarketOverview(scope: "global" | string): Promise<NormalizationInput> {
    const raw = this.fixtures.get(`market-overview:${scope}`) ?? fixtureData(scope);
    return normalizationInput(scope, scope === "global" ? "global" : "sector", { providerTimestamp: this.timestamp, raw });
  }

  async fetchAssetData(assetId: string): Promise<NormalizationInput> {
    const raw = this.fixtures.get(`asset:${assetId}`) ?? fixtureData(assetId);
    return normalizationInput(assetId, "asset", { providerTimestamp: this.timestamp, raw });
  }

  async healthCheck(): Promise<boolean> { return true; }
}

function fixtureData(scope: string): CmcRecord {
  return {
    timestamp: new Date().toISOString(),
    data: {
      marketTrend: 0.2, breadth: 0.15, volatility: 0.45, leverageRisk: 0.3,
      liquidityHealth: 0.68, macroPressure: 0.1, sentiment: 0.25,
      narrativeHeat: 0.4, momentumAcceleration: 0.05,
      trendingNarratives: ["Fixture data — not live"], scope,
    },
  };
}
