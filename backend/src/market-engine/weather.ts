// ============================================================
// Signal City — Deterministic Weather Engine
// Rules decide the weather. AI explains it.
// Weighted scoring → base weather → overrides → final classification.
// ============================================================

import type { NormalizedMarketSignals } from "@shared/contracts/signals";
import type { WeatherKind, WeatherSeverity, WeatherState } from "@shared/contracts/district";

// ---- Constants ----

const RULE_VERSION = "1.0.0";

// ---- Weight Configuration ----

export interface WeatherWeights {
  trendStrength: number;
  breadth: number;
  volatilityLeverage: number;
  volumeLiquidity: number;
  macroPressure: number;
  narrativeSentiment: number;
}

const DEFAULT_WEIGHTS: WeatherWeights = {
  trendStrength: 0.25,
  breadth: 0.20,
  volatilityLeverage: 0.20,
  volumeLiquidity: 0.15,
  macroPressure: 0.10,
  narrativeSentiment: 0.10,
};

// ---- Threshold Configuration ----

interface WeatherThresholds {
  /** Score ≥ this → consider clear / positive. */
  clearMin: number;
  /** Score ≤ this → consider storm / negative. */
  stormMax: number;
  /** When vol + leverage ≥ this AND trend positive → heatwave risk. */
  heatwaveVolatility: number;
  /** When momentum acceleration ≥ this AND trend positive → heatwave risk. */
  heatwaveMomentum: number;
  /** When trend strength is rapidly changing → wind advisory. */
  windTrendChange: number;
  /** When breadth is very low → cold snap risk. */
  coldSnapBreadth: number;
  /** When liquidity health is very low → storm or rain. */
  liquidityCrisis: number;
  /** When confidence is below this → fog. */
  fogConfidence: number;
  /** When more than this many signals missing → fog. */
  fogMissingCount: number;
}

const DEFAULT_THRESHOLDS: WeatherThresholds = {
  clearMin: 0.15,
  stormMax: -0.20,
  heatwaveVolatility: 0.60,
  heatwaveMomentum: 0.50,
  windTrendChange: 0.40,
  coldSnapBreadth: -0.70,
  liquidityCrisis: 0.25,
  fogConfidence: 0.40,
  fogMissingCount: 4,
};

// ---- Score Components ----

interface ScoreComponents {
  trendContribution: number;
  breadthContribution: number;
  volatilityLeverageContribution: number;
  volumeLiquidityContribution: number;
  macroContribution: number;
  narrativeSentimentContribution: number;
}

// ---- Weather Engine Input ----

export interface WeatherEngineInput {
  signals: NormalizedMarketSignals;
  weights?: Partial<WeatherWeights>;
  thresholds?: Partial<WeatherThresholds>;
}

// ---- Engine Output ----

export interface WeatherEngineOutput {
  weather: WeatherState;
  /** Full component breakdown for transparency. */
  diagnostics: WeatherDiagnostics;
}

export interface WeatherDiagnostics {
  baseScore: number;
  components: ScoreComponents;
  weights: WeatherWeights;
  thresholds: WeatherThresholds;
  baseWeather: WeatherKind;
  triggeredOverrides: string[];
  severityFactors: string[];
}

// ---- Core Calculation ----

function calculateBaseScore(
  signals: NormalizedMarketSignals,
  weights: WeatherWeights,
): { score: number; components: ScoreComponents } {
  // Normalize: trend and breadth are bipolar (-1..1), others vary.
  // Higher trend/breadth = positive contribution
  // Higher volatility/leverage = negative contribution
  // Higher liquidity = positive
  // Higher macro pressure (positive = risk-on) = positive
  // Higher sentiment = positive
  // Higher narrative heat = mixed — can be positive momentum or warning

  const trendContribution = signals.trend * weights.trendStrength;
  const breadthContribution = signals.breadth * weights.breadth;

  // Volatility + leverage both reduce the score (risk)
  const volLeverage = (signals.volatility + signals.leverageRisk) / 2;
  const volatilityLeverageContribution = -volLeverage * weights.volatilityLeverage;

  // Liquidity health adds to score
  const volumeLiquidityContribution = signals.liquidityHealth * weights.volumeLiquidity;

  // Macro: positive = risk-on (adds), negative = risk-off (subtracts)
  const macroContribution = signals.macroPressure * weights.macroPressure;

  // Narrative + sentiment: treated as a combined signal
  const narrativeAvg = (signals.sentiment + signals.narrativeHeat) / 2;
  const narrativeSentimentContribution = narrativeAvg * weights.narrativeSentiment;

  const score =
    trendContribution +
    breadthContribution +
    volatilityLeverageContribution +
    volumeLiquidityContribution +
    macroContribution +
    narrativeSentimentContribution;

  return {
    score: clamp(score, -1, 1),
    components: {
      trendContribution,
      breadthContribution,
      volatilityLeverageContribution,
      volumeLiquidityContribution,
      macroContribution,
      narrativeSentimentContribution,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---- Base Weather Classification ----

function classifyBaseWeather(score: number, thresholds: WeatherThresholds): WeatherKind {
  if (score >= thresholds.clearMin) {
    if (score >= 0.40) return "clear";
    return "partly_cloudy";
  }

  if (score > thresholds.stormMax) {
    // Between storm and clear — mixed
    if (score >= 0) return "partly_cloudy";
    return "rain";
  }

  // score ≤ stormMax
  return "storm";
}

// ---- Override Checks ----

function checkOverrides(
  signals: NormalizedMarketSignals,
  baseWeather: WeatherKind,
  thresholds: WeatherThresholds,
): string[] {
  const overrides: string[] = [];

  // Heatwave: strong positive trend + elevated vol/leverage or momentum
  if (
    baseWeather === "clear" || baseWeather === "partly_cloudy"
  ) {
    const volElevated = signals.volatility >= thresholds.heatwaveVolatility;
    const leverageElevated = signals.leverageRisk >= thresholds.heatwaveVolatility;
    const momentumExtended = signals.momentumAcceleration >= thresholds.heatwaveMomentum;

    if ((volElevated || leverageElevated) && momentumExtended) {
      overrides.push("heatwave");
    }
  }

  // Wind advisory: rapid trend changes or high sector rotation.
  // Skip if already in storm — storm takes priority.
  if (
    baseWeather !== "storm" &&
    Math.abs(signals.momentumAcceleration) >= thresholds.windTrendChange
  ) {
    overrides.push("wind_advisory");
  }

  // Cold snap: severely negative breadth + deteriorating trend
  if (
    signals.breadth <= thresholds.coldSnapBreadth &&
    signals.trend < -0.3
  ) {
    overrides.push("cold_snap");
  }

  // Fog: low confidence or too many missing signals
  if (
    signals.confidence < thresholds.fogConfidence ||
    signals.missingSignals.length >= thresholds.fogMissingCount
  ) {
    overrides.push("fog");
  }

  // Storm: severe liquidity crisis
  if (signals.liquidityHealth <= thresholds.liquidityCrisis) {
    if (!overrides.includes("storm") && baseWeather !== "storm") {
      overrides.push("storm");
    }
  }

  return overrides;
}

// ---- Final Weather Determination ----

function resolveFinalWeather(
  baseWeather: WeatherKind,
  overrides: string[],
): WeatherKind {
  // Fog takes precedence — if we can't see, we can't see
  if (overrides.includes("fog")) return "fog";

  // Cold snap is a specific storm pattern — it overrides generic storm
  if (overrides.includes("cold_snap")) return "cold_snap";

  // Base storm always takes priority (wind advisory doesn't override it)
  if (baseWeather === "storm") return "storm";

  // Storm overrides
  if (overrides.includes("storm")) return "storm";

  // Heatwave overrides clear/partly_cloudy
  if (overrides.includes("heatwave") && (baseWeather === "clear" || baseWeather === "partly_cloudy")) {
    return "heatwave";
  }

  // Wind advisory can layer on any non-fog, non-storm state
  if (overrides.includes("wind_advisory")) {
    return "wind_advisory";
  }

  // Cold snap
  if (overrides.includes("cold_snap")) {
    return "cold_snap";
  }

  return baseWeather;
}

// ---- Severity Calculation ----

function calculateSeverity(
  weather: WeatherKind,
  baseScore: number,
  signals: NormalizedMarketSignals,
): WeatherSeverity {
  const absScore = Math.abs(baseScore);

  switch (weather) {
    case "clear":
      return "low";
    case "partly_cloudy":
      return absScore < 0.3 ? "low" : "medium";
    case "fog":
      return signals.confidence < 0.25 ? "high" : "medium";
    case "rain":
      return absScore > 0.5 ? "high" : "medium";
    case "storm":
      return absScore > 0.6 || signals.volatility > 0.8 ? "critical" : "high";
    case "heatwave":
      return signals.volatility > 0.75 ? "critical" : "high";
    case "wind_advisory":
      return absScore > 0.5 ? "high" : "medium";
    case "cold_snap":
      return absScore > 0.6 ? "critical" : "high";
  }
}

// ---- Warnings ----

function generateWarnings(
  weather: WeatherKind,
  signals: NormalizedMarketSignals,
  overrides: string[],
): string[] {
  const warnings: string[] = [];

  if (overrides.includes("heatwave")) {
    warnings.push("Momentum and attention are extremely elevated — the district may be overextended.");
  }

  if (overrides.includes("wind_advisory")) {
    warnings.push("Capital is rotating rapidly — sector leadership is unstable.");
  }

  if (signals.volatility >= 0.7) {
    warnings.push("Volatility is abnormally high.");
  }

  if (signals.leverageRisk >= 0.7) {
    warnings.push("Leverage and liquidation risk are elevated.");
  }

  if (signals.liquidityHealth <= 0.3) {
    warnings.push("Liquidity conditions have deteriorated.");
  }

  if (signals.breadth <= -0.5) {
    warnings.push("Market participation is narrowing — the move may be weakening.");
  }

  if (signals.missingSignals.length >= 3) {
    warnings.push(`${signals.missingSignals.length} signals are unavailable — confidence may be reduced.`);
  }

  return warnings;
}

// ---- Main Entry Point ----

export function classifyWeather(input: WeatherEngineInput): WeatherEngineOutput {
  const signals = input.signals;
  const weights = { ...DEFAULT_WEIGHTS, ...input.weights };
  const thresholds = { ...DEFAULT_THRESHOLDS, ...input.thresholds };

  // Step 1: Calculate weighted score
  const { score, components } = calculateBaseScore(signals, weights);

  // Step 2: Determine base weather from score
  const baseWeather = classifyBaseWeather(score, thresholds);

  // Step 3: Check for overrides
  const triggeredOverrides = checkOverrides(signals, baseWeather, thresholds);

  // Step 4: Resolve final weather
  const finalWeather = resolveFinalWeather(baseWeather, triggeredOverrides);

  // Step 5: Calculate severity
  const severity = calculateSeverity(finalWeather, score, signals);

  // Step 6: Generate warnings
  const warnings = generateWarnings(finalWeather, signals, triggeredOverrides);

  return {
    weather: {
      kind: finalWeather,
      severity,
      baseScore: Math.round(score * 100) / 100,
      componentContributions: {
        trend: Math.round(components.trendContribution * 100) / 100,
        breadth: Math.round(components.breadthContribution * 100) / 100,
        volatilityLeverage: Math.round(components.volatilityLeverageContribution * 100) / 100,
        volumeLiquidity: Math.round(components.volumeLiquidityContribution * 100) / 100,
        macro: Math.round(components.macroContribution * 100) / 100,
        narrativeSentiment: Math.round(components.narrativeSentimentContribution * 100) / 100,
      },
      triggeredThresholds: triggeredOverrides.map((o) => `override:${o}`),
      overrides: triggeredOverrides,
      confidence: signals.confidence,
      warnings,
      ruleVersion: RULE_VERSION,
    },
    diagnostics: {
      baseScore: Math.round(score * 100) / 100,
      components,
      weights,
      thresholds,
      baseWeather,
      triggeredOverrides,
      severityFactors: [],
    },
  };
}

// ---- Re-export for convenience ----

export { DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, RULE_VERSION };
