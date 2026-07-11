// ============================================================
// Signal City — Live CMC MCP Adapter (Bridge-based)
// Calls cmc-bridge.py which uses the Python MCP SDK.
// Properly parses live CMC global metrics into NormalizedMarketSignals.
// ============================================================

import { spawn } from "child_process";
import path from "path";
import type { NormalizationInput } from "../normalization/engine";
import type { ICMCAdapter } from "./adapter";

const PYTHON = "/home/devendurance/.hermes/hermes-agent/venv/bin/python";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BRIDGE_SCRIPT = resolve(__dirname, "../../scripts/cmc-bridge.py");

const KNOWN_COIN_IDS: Record<string, string> = {
  BTC: "1", ETH: "1027", SOL: "5426", DOGE: "74", LINK: "1975",
  PEPE: "24478", SUI: "20947", RENDER: "5690", TAO: "22974",
};

// ---- Bridge Call ----

async function bridgeCall(method: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const input = JSON.stringify({ method, args });
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [BRIDGE_SCRIPT], { timeout: 30000 });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
    child.on("close", (code) => {
      if (stderr) console.warn("[CMC Bridge] stderr:", stderr.slice(0, 200));
      if (code !== 0) return reject(new Error(`Bridge exit ${code}: ${stderr}`));
      try {
        const result = JSON.parse(stdout);
        if (result.error) return reject(new Error(`Bridge: ${result.error}`));
        resolve(result);
      } catch (e) {
        reject(new Error(`Bridge parse: ${stdout.slice(0, 200)}`));
      }
    });
    child.on("error", reject);
    child.stdin.write(input);
    child.stdin.end();
  });
}

// ---- Live MCP Adapter ----

export class LiveMCPAdapter implements ICMCAdapter {
  async fetchMarketOverview(scope: string): Promise<NormalizationInput> {
    const now = new Date().toISOString();
    const result = await bridgeCall("get_global_metrics_latest", {});
    const globalData = parseBridgeResponse(result);
    const signals = computeGlobalSignals(globalData);

    return {
      raw: signals,
      subjectId: scope === "global" ? "global" : scope,
      scope: scope === "global" ? "global" : "sector",
      source: "coinmarketcap",
      providerTimestamp: now,
      fieldMap: {
        trend: "data.marketTrend", breadth: "data.breadth",
        volatility: "data.volatility", leverageRisk: "data.leverageRisk",
        liquidityHealth: "data.liquidityHealth", macroPressure: "data.macroPressure",
        sentiment: "data.sentiment", narrativeHeat: "data.narrativeHeat",
        momentumAcceleration: "data.momentumAcceleration",
      },
    };
  }

  async fetchAssetData(symbol: string): Promise<NormalizationInput> {
    const now = new Date().toISOString();
    const coinId = KNOWN_COIN_IDS[symbol.toUpperCase()] ?? "1";
    const [quotesResult, taResult] = await Promise.all([
      bridgeCall("get_crypto_quotes_latest", { id: coinId }),
      bridgeCall("get_crypto_technical_analysis", { id: coinId }),
    ]);
    const quotesData = parseBridgeResponse(quotesResult);
    const taData = parseBridgeResponse(taResult);
    const signals = computeAssetSignals(symbol, quotesData, taData);

    return {
      raw: signals,
      subjectId: symbol,
      scope: "asset",
      source: "coinmarketcap",
      providerTimestamp: now,
      fieldMap: {
        trend: "data.marketTrend", breadth: "data.breadth",
        volatility: "data.volatility", leverageRisk: "data.leverageRisk",
        liquidityHealth: "data.liquidityHealth", macroPressure: "data.macroPressure",
        sentiment: "data.sentiment", narrativeHeat: "data.narrativeHeat",
        momentumAcceleration: "data.momentumAcceleration",
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    try { await bridgeCall("get_global_metrics_latest", {}); return true; }
    catch { return false; }
  }
}

// ---- Bridge Response Parsing ----

function parseBridgeResponse(result: unknown): Record<string, unknown> {
  if (result && typeof result === "object") {
    const obj = result as Record<string, unknown>;
    if (Array.isArray(obj.content) && obj.content.length > 0) {
      const first = obj.content[0];
      if (typeof first === "string") {
        try { return JSON.parse(first); }
        catch { return { _raw: first }; }
      }
    }
  }
  return (result as Record<string, unknown>) ?? {};
}

// ---- Signal Computation from Live CMC Data ----

function computeGlobalSignals(data: Record<string, unknown>): Record<string, unknown> {
  const marketCap24h = getStr(data, "market_size.total_crypto_market_cap_usd.percent_change.24h");
  const marketCap7d = getStr(data, "market_size.total_crypto_market_cap_usd.percent_change.7d");
  const fearGreed = getNum(data, "sentiment.fear_greed.current.index") ?? 50;
  const altSeason = getNum(data, "rotation.altcoin_season.current.index") ?? 50;
  const oi24h = getStr(data, "leverage.open_interest.total.percent_change.24h");
  const fundingRate = getStr(data, "leverage.funding_rate.average.current");
  const liqChange = getStr(data, "leverage.liquidations.btc.percent_change24h");
  const volume24h = getStr(data, "liquidity.volume24h.total.percent_change.24h");
  const volume7d = getStr(data, "liquidity.volume24h.total.percent_change.7d");
  const etfBtcCur = getStr(data, "trad_fi_flows.etf_aum.btc.current");
  const etfBtcYes = getStr(data, "trad_fi_flows.etf_aum.btc.history.yesterday");

  const marketCapChangePct = parsePct(marketCap24h);
  const trend = clamp(marketCapChangePct / 8, -1, 1);
  const breadth = clamp(((altSeason - 50) / 30), -1, 1);
  const volatility = clamp(Math.abs(parsePct(volume24h)) / 30, 0, 1);

  const oiChangePct = Math.abs(parsePct(oi24h));
  const fundNum = parsePct(fundingRate);
  const liqChangePct = parsePct(liqChange);
  const leverageRisk = clamp(
    (oiChangePct / 20) * 0.3 + (Math.abs(fundNum) > 2 ? 0.3 : Math.abs(fundNum) > 1 ? 0.15 : 0) +
    (liqChangePct > 30 ? 0.3 : liqChangePct > 10 ? 0.15 : 0) + 0.1, 0, 1,
  );

  const liquidityHealth = clamp(0.5 + parsePct(volume7d) / 60, 0, 1);
  const etfBtcNum = parseBillions(etfBtcCur);
  const etfYesNum = parseBillions(etfBtcYes);
  const etfFlowChange = etfBtcNum > 0 && etfYesNum > 0 ? (etfBtcNum - etfYesNum) / etfYesNum : 0;
  const macroPressure = clamp(etfFlowChange * 5 + (marketCapChangePct > 0 ? 0.1 : marketCapChangePct < -2 ? -0.1 : 0), -1, 1);
  const sentiment = clamp((fearGreed - 50) / 50, -1, 1);
  const narrativeHeat = clamp(Math.abs(altSeason - 50) / 40, 0, 1);
  const marketCap7dPct = parsePct(marketCap7d);
  const momentumAcceleration = clamp((marketCapChangePct - marketCap7dPct) / 8, -1, 1);

  return {
    timestamp: new Date().toISOString(),
    source: "coinmarketcap-mcp-live",
    data: {
      marketTrend: round(trend), breadth: round(breadth), volatility: round(volatility),
      leverageRisk: round(leverageRisk), liquidityHealth: round(liquidityHealth),
      macroPressure: round(macroPressure), sentiment: round(sentiment),
      narrativeHeat: round(narrativeHeat), momentumAcceleration: round(momentumAcceleration),
    },
  };
}

function computeAssetSignals(
  symbol: string,
  quotes: Record<string, unknown>,
  ta: Record<string, unknown>,
): Record<string, unknown> {
  const change24h = getNum(quotes, "percent_change_24h") ?? 0;
  const change7d = getNum(quotes, "percent_change_7d") ?? 0;
  const change30d = getNum(quotes, "percent_change_30d") ?? 0;
  const rsiRaw = getNum(ta, "rsi");
  const rsi: number = typeof rsiRaw === "number" ? rsiRaw : 50;
  const macdHist = getNum(ta, "macd_histogram") ?? 0;
  const volume24hNum = getNum(quotes, "volume_24h") ?? 0;
  const marketCapNum = getNum(quotes, "market_cap") ?? 1;

  const trend = clamp((change24h * 0.35 + change7d * 0.30 + change30d * 0.20) / 6, -1, 1);
  const breadth = clamp(change24h / 10, -1, 1);
  const changeRange = Math.max(Math.abs(change24h), Math.abs(change7d), Math.abs(change30d));
  const volatility = clamp(changeRange / 30, 0, 1);
  const leverageRisk = clamp((rsi > 70 ? 0.4 : rsi > 60 ? 0.2 : 0) + (rsi < 30 ? 0.3 : rsi < 40 ? 0.15 : 0), 0, 1);
  const liquidityHealth = clamp((marketCapNum > 0 ? volume24hNum / marketCapNum : 0.05) * 15, 0, 1);
  const sentiment = clamp((rsi - 50) / 50, -1, 1);
  const narrativeHeat = clamp(Math.abs(change24h) / 15, 0, 1);
  const momentumAcceleration = clamp(macdHist * 3, -1, 1);

  return {
    timestamp: new Date().toISOString(),
    source: "coinmarketcap-mcp-live",
    data: {
      symbol,
      marketTrend: round(trend), breadth: round(breadth), volatility: round(volatility),
      leverageRisk: round(leverageRisk), liquidityHealth: round(liquidityHealth),
      macroPressure: 0, sentiment: round(sentiment), narrativeHeat: round(narrativeHeat),
      momentumAcceleration: round(momentumAcceleration),
    },
  };
}

// ---- Parsing Helpers ----

function getNum(obj: Record<string, unknown>, path: string): number | undefined {
  const v = getVal(obj, path);
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = parseFloat(v); return isNaN(n) ? undefined : n; }
  return undefined;
}

function getStr(obj: Record<string, unknown>, path: string): string {
  const v = getVal(obj, path);
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

function getVal(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function parsePct(value: string | number): number {
  if (typeof value === "number") return value;
  const cleaned = value.replace(/[+%]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseBillions(value: string): number {
  const cleaned = value.replace(/[$,]/g, "").trim();
  const mults: Record<string, number> = { B: 1e9, M: 1e6, K: 1e3, T: 1e12 };
  for (const [suffix, mult] of Object.entries(mults)) {
    if (cleaned.endsWith(suffix)) {
      const num = parseFloat(cleaned.slice(0, -1).trim());
      return isNaN(num) ? 0 : num * mult;
    }
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
