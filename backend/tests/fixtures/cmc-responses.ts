// ============================================================
// Signal City — Test Fixtures
// Synthetic/recorded CMC responses for every test scenario.
// No live API calls required.
// ============================================================

/**
 * Clear Skies — strong positive trend, broad participation, controlled vol, healthy liquidity.
 */
export const CLEAR_SKIES_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    totalMarketCap: 2_800_000_000_000,
    totalVolume24h: 120_000_000_000,
    btcDominance: 51.0,
    ethDominance: 17.5,
    fearGreedIndex: 72,
    altcoinSeasonIndex: 55,
    marketTrend: 0.65,
    breadth: 0.55,
    volatility: 0.25,
    leverageRisk: 0.20,
    liquidityHealth: 0.80,
    macroPressure: 0.30,
    sentiment: 0.55,
    narrativeHeat: 0.40,
    momentumAcceleration: 0.10,
    trendingNarratives: ["AI Tokens", "RWA Growth", "ETF Inflows"],
  },
};

/**
 * Storm — strong negative pressure, high vol, liquidation risk.
 */
export const STORM_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    totalMarketCap: 1_600_000_000_000,
    totalVolume24h: 200_000_000_000,
    btcDominance: 58.0,
    ethDominance: 14.0,
    fearGreedIndex: 18,
    altcoinSeasonIndex: 12,
    marketTrend: -0.55,
    breadth: -0.60,
    volatility: 0.85,
    leverageRisk: 0.82,
    liquidityHealth: 0.20,
    macroPressure: -0.45,
    sentiment: -0.70,
    narrativeHeat: 0.85,
    momentumAcceleration: -0.50,
    trendingNarratives: ["Risk-Off", "Liquidations", "Flight to BTC"],
  },
};

/**
 * Heatwave — positive trend but dangerously elevated vol + momentum.
 */
export const HEATWAVE_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    totalMarketCap: 2_500_000_000_000,
    totalVolume24h: 180_000_000_000,
    btcDominance: 48.0,
    ethDominance: 18.0,
    fearGreedIndex: 85,
    altcoinSeasonIndex: 78,
    marketTrend: 0.55,
    breadth: 0.35,
    volatility: 0.72,
    leverageRisk: 0.68,
    liquidityHealth: 0.60,
    macroPressure: 0.15,
    sentiment: 0.80,
    narrativeHeat: 0.88,
    momentumAcceleration: 0.60,
    trendingNarratives: ["Meme Supercycle", "AI Summer", "Alt Season"],
  },
};

/**
 * Fog — very low confidence, many missing signals.
 */
export const FOG_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    totalMarketCap: null,
    totalVolume24h: null,
    btcDominance: null,
    marketTrend: undefined,
    breadth: undefined,
    volatility: undefined,
    leverageRisk: undefined,
    liquidityHealth: undefined,
    macroPressure: undefined,
    sentiment: undefined,
    narrativeHeat: undefined,
    momentumAcceleration: undefined,
  },
};

/**
 * Partly Cloudy — mildly positive but some indicators disagree.
 */
export const PARTLY_CLOUDY_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    totalMarketCap: 2_300_000_000_000,
    totalVolume24h: 85_000_000_000,
    btcDominance: 53.0,
    ethDominance: 16.0,
    fearGreedIndex: 48,
    altcoinSeasonIndex: 35,
    marketTrend: 0.22,
    breadth: 0.15,
    volatility: 0.45,
    leverageRisk: 0.38,
    liquidityHealth: 0.65,
    macroPressure: 0.05,
    sentiment: 0.15,
    narrativeHeat: 0.50,
    momentumAcceleration: -0.05,
    trendingNarratives: ["RWA", "Layer 2", "Stablecoin Growth"],
  },
};

/**
 * Rain — weak momentum, shrinking participation, deteriorating demand.
 */
export const RAIN_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    totalMarketCap: 2_000_000_000_000,
    totalVolume24h: 55_000_000_000,
    btcDominance: 55.0,
    ethDominance: 15.0,
    fearGreedIndex: 35,
    altcoinSeasonIndex: 20,
    marketTrend: -0.15,
    breadth: -0.35,
    volatility: 0.50,
    leverageRisk: 0.45,
    liquidityHealth: 0.48,
    macroPressure: -0.10,
    sentiment: -0.25,
    narrativeHeat: 0.30,
    momentumAcceleration: -0.20,
    trendingNarratives: ["Cautious", "BTC Dominance Rising"],
  },
};

/**
 * Wind Advisory — rapid trend change / rotation.
 */
export const WIND_ADVISORY_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    totalMarketCap: 2_200_000_000_000,
    totalVolume24h: 110_000_000_000,
    btcDominance: 49.0,
    ethDominance: 16.5,
    fearGreedIndex: 55,
    altcoinSeasonIndex: 60,
    marketTrend: 0.10,
    breadth: 0.00,
    volatility: 0.55,
    leverageRisk: 0.40,
    liquidityHealth: 0.58,
    macroPressure: 0.00,
    sentiment: 0.20,
    narrativeHeat: 0.60,
    momentumAcceleration: 0.45,
    trendingNarratives: ["Sector Rotation", "DeFi Resurgence", "L1 Battle"],
  },
};

/**
 * Cold Snap — rapidly fading demand, participation, and activity.
 */
export const COLD_SNAP_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    totalMarketCap: 1_400_000_000_000,
    totalVolume24h: 30_000_000_000,
    btcDominance: 62.0,
    ethDominance: 12.0,
    fearGreedIndex: 15,
    altcoinSeasonIndex: 8,
    marketTrend: -0.70,
    breadth: -0.75,
    volatility: 0.55,
    leverageRisk: 0.40,
    liquidityHealth: 0.35,
    macroPressure: -0.30,
    sentiment: -0.65,
    narrativeHeat: 0.15,
    momentumAcceleration: -0.35,
    trendingNarratives: ["Bear Market", "Capital Preservation"],
  },
};

/**
 * Boundary — right at the storm threshold (score = -0.20).
 */
export const STORM_BOUNDARY_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    totalMarketCap: 2_000_000_000_000,
    totalVolume24h: 80_000_000_000,
    btcDominance: 54.0,
    ethDominance: 15.0,
    marketTrend: -0.15,
    breadth: -0.20,
    volatility: 0.50,
    leverageRisk: 0.45,
    liquidityHealth: 0.50,
    macroPressure: -0.10,
    sentiment: -0.20,
    narrativeHeat: 0.40,
    momentumAcceleration: -0.10,
  },
};

/**
 * Partial — only some signals present, useful for testing missing-signal behavior.
 */
export const PARTIAL_SIGNALS_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    marketTrend: 0.30,
    breadth: 0.25,
    volatility: 0.40,
    // intentionally missing: leverageRisk, liquidityHealth, macroPressure, sentiment, narrativeHeat, momentumAcceleration
  },
};

/**
 * Extreme bull — tests upper boundary of scoring.
 */
export const EXTREME_BULL_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    totalMarketCap: 3_500_000_000_000,
    totalVolume24h: 200_000_000_000,
    btcDominance: 45.0,
    ethDominance: 20.0,
    fearGreedIndex: 92,
    altcoinSeasonIndex: 90,
    marketTrend: 0.95,
    breadth: 0.90,
    volatility: 0.35,
    leverageRisk: 0.30,
    liquidityHealth: 0.92,
    macroPressure: 0.60,
    sentiment: 0.90,
    narrativeHeat: 0.70,
    momentumAcceleration: 0.20,
    trendingNarratives: ["Supercycle", "Institutional FOMO", "Everything Rally"],
  },
};

/**
 * Stale data — timestamp from 2 hours ago.
 */
export const STALE_FIXTURE: Record<string, unknown> = {
  timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  data: {
    marketTrend: 0.30,
    breadth: 0.20,
    volatility: 0.35,
    leverageRisk: 0.30,
    liquidityHealth: 0.70,
    macroPressure: 0.10,
    sentiment: 0.40,
    narrativeHeat: 0.50,
    momentumAcceleration: 0.05,
  },
};

/**
 * Asset-specific fixture — BTC.
 */
export const BTC_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    symbol: "BTC",
    price: 67250.00,
    priceChange24h: 1.8,
    volume24h: 28_000_000_000,
    marketCap: 1_320_000_000_000,
    marketTrend: 0.35,
    breadth: 0.30,
    volatility: 0.38,
    leverageRisk: 0.32,
    liquidityHealth: 0.85,
    macroPressure: 0.20,
    sentiment: 0.45,
    narrativeHeat: 0.35,
    momentumAcceleration: 0.08,
  },
};

/**
 * Asset-specific fixture — meme coin with high risk.
 */
export const MEMECOIN_FIXTURE: Record<string, unknown> = {
  timestamp: "2026-07-10T12:00:00Z",
  data: {
    symbol: "PEPE",
    price: 0.000012,
    priceChange24h: -15.5,
    volume24h: 850_000_000,
    marketCap: 5_000_000_000,
    marketTrend: -0.45,
    breadth: -0.50,
    volatility: 0.88,
    leverageRisk: 0.78,
    liquidityHealth: 0.25,
    macroPressure: 0.0,
    sentiment: -0.55,
    narrativeHeat: 0.72,
    momentumAcceleration: -0.40,
  },
};

/**
 * All fixtures keyed by scenario name.
 */
export const ALL_FIXTURES: Record<string, Record<string, unknown>> = {
  clear_skies: CLEAR_SKIES_FIXTURE,
  storm: STORM_FIXTURE,
  heatwave: HEATWAVE_FIXTURE,
  fog: FOG_FIXTURE,
  partly_cloudy: PARTLY_CLOUDY_FIXTURE,
  rain: RAIN_FIXTURE,
  wind_advisory: WIND_ADVISORY_FIXTURE,
  cold_snap: COLD_SNAP_FIXTURE,
  storm_boundary: STORM_BOUNDARY_FIXTURE,
  partial_signals: PARTIAL_SIGNALS_FIXTURE,
  extreme_bull: EXTREME_BULL_FIXTURE,
  stale: STALE_FIXTURE,
  btc: BTC_FIXTURE,
  memecoin: MEMECOIN_FIXTURE,
};
