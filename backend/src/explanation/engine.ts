// ============================================================
// Signal City — Explanation Engine
// Generates clear language from already-computed state.
// The model explains the result. It does not decide it.
// ============================================================

import type { WeatherKind, WeatherState, ExplanationState } from "@shared/contracts/district";
import type { NormalizedMarketSignals } from "@shared/contracts/signals";

const EXPLANATION_VERSION = "1.0.0";

export interface ExplanationInput {
  weather: WeatherState;
  signals: NormalizedMarketSignals;
  previousWeather?: WeatherState;
  districtLabel: string;
}

export function generateExplanation(input: ExplanationInput): ExplanationState {
  const { weather, signals, previousWeather, districtLabel } = input;

  const summary = generateSummary(weather.kind, districtLabel, signals);
  const causes = generateCauses(weather.kind, weather, signals);
  const changed = previousWeather
    ? describeChange(previousWeather, weather, districtLabel)
    : "Initial assessment generated.";
  const watch = generateWatchConditions(weather.kind, signals);

  return {
    summary,
    causes,
    changed,
    watch,
    modelVersion: EXPLANATION_VERSION,
  };
}

// ---- Summary Generation ----

function generateSummary(
  weather: WeatherKind,
  label: string,
  signals: NormalizedMarketSignals,
): string {
  const sentimentWord = signals.sentiment > 0.3
    ? "positive"
    : signals.sentiment < -0.3
      ? "negative"
      : "mixed";
  const volWord = signals.volatility > 0.6 ? "elevated" : "moderate";
  const liqWord = signals.liquidityHealth > 0.6 ? "healthy" : "tightening";

  switch (weather) {
    case "clear":
      return `${label}: ${sentimentWord} trend with ${volWord} volatility and ${liqWord} liquidity. Conditions are favorable.`;
    case "partly_cloudy":
      return `${label}: overall ${sentimentWord} but some indicators disagree. Proceed with awareness.`;
    case "fog":
      return `${label}: signals are conflicting or insufficient. Visibility is low — exercise caution.`;
    case "rain":
      return `${label}: momentum is weakening and participation is narrowing. Conditions are deteriorating.`;
    case "storm":
      return `${label}: strong negative pressure with abnormal volatility. Risk is elevated.`;
    case "heatwave":
      return `${label}: momentum and attention are extremely high, but the district may be overextended.`;
    case "wind_advisory":
      return `${label}: capital is rotating rapidly and sector leadership is unstable.`;
    case "cold_snap":
      return `${label}: demand, participation, and activity are fading rapidly.`;
  }
}

// ---- Cause Generation ----

function generateCauses(
  weather: WeatherKind,
  ws: WeatherState,
  signals: NormalizedMarketSignals,
): string[] {
  const causes: string[] = [];

  // Trend
  if (signals.trend > 0.3) {
    causes.push(`Trend is positive (${formatSignal(signals.trend, true)}).`);
  } else if (signals.trend < -0.3) {
    causes.push(`Trend is negative (${formatSignal(signals.trend, true)}).`);
  }

  // Breadth
  if (signals.breadth > 0.2) {
    causes.push(`Broad participation across assets (${formatSignal(signals.breadth, true)}).`);
  } else if (signals.breadth < -0.2) {
    causes.push(`Narrowing participation (${formatSignal(signals.breadth, true)}).`);
  }

  // Volatility
  if (signals.volatility > 0.6) {
    causes.push(`Volatility is elevated (${formatSignal(signals.volatility, false)}).`);
  }

  // Leverage
  if (signals.leverageRisk > 0.6) {
    causes.push(`Leverage and liquidation risk are elevated (${formatSignal(signals.leverageRisk, false)}).`);
  }

  // Liquidity
  if (signals.liquidityHealth < 0.4) {
    causes.push(`Liquidity has deteriorated (${formatSignal(signals.liquidityHealth, false)}).`);
  }

  // Macro
  if (signals.macroPressure > 0.3) {
    causes.push("External macro conditions are supportive.");
  } else if (signals.macroPressure < -0.3) {
    causes.push("External macro conditions are creating headwinds.");
  }

  // Narrative
  if (signals.narrativeHeat > 0.6) {
    causes.push("Narrative intensity is elevated.");
  }

  // Override explanations
  for (const override of ws.overrides) {
    causes.push(overrideExplanation(override));
  }

  if (causes.length === 0) {
    causes.push("No single factor dominates — conditions are driven by a mix of signals.");
  }

  return causes;
}

// ---- Change Description ----

function describeChange(
  previous: WeatherState,
  current: WeatherState,
  label: string,
): string {
  if (previous.kind === current.kind) {
    const sevChange = severityRank(current.severity) - severityRank(previous.severity);
    if (sevChange > 0) return `${label} remains ${weatherLabel(current.kind)} but severity increased.`;
    if (sevChange < 0) return `${label} remains ${weatherLabel(current.kind)} with easing severity.`;
    return `${label} remains ${weatherLabel(current.kind)}. No material change.`;
  }

  return `${label} moved from ${weatherLabel(previous.kind)} to ${weatherLabel(current.kind)}.`;
}

// ---- Watch Conditions ----

function generateWatchConditions(
  weather: WeatherKind,
  signals: NormalizedMarketSignals,
): string[] {
  const watch: string[] = [];

  if (signals.breadth < 0.2 && signals.trend > 0) {
    watch.push("If breadth continues narrowing while trend remains positive, the move may be weakening.");
  }

  if (signals.volatility > 0.5) {
    watch.push("Monitor volatility — further increases could trigger storm conditions.");
  }

  if (signals.leverageRisk > 0.5) {
    watch.push("Watch leverage levels — elevated leverage increases liquidation risk.");
  }

  if (signals.momentumAcceleration > 0.4) {
    watch.push("Momentum is accelerating — be alert for overextension.");
  }

  if (signals.momentumAcceleration < -0.3) {
    watch.push("Momentum is decelerating — conditions could deteriorate further.");
  }

  if (signals.liquidityHealth < 0.5) {
    watch.push("Liquidity is tightening — reduced depth may amplify moves.");
  }

  if (signals.missingSignals.length > 0) {
    watch.push(`${signals.missingSignals.length} data signals are unavailable — confidence may improve when they return.`);
  }

  if (watch.length === 0) {
    watch.push("No immediate watch conditions — continue monitoring standard indicators.");
  }

  return watch;
}

// ---- Helpers ----

function formatSignal(value: number, bipolar: boolean): string {
  const pct = Math.round(Math.abs(value) * 100);
  const dir = bipolar
    ? value >= 0 ? "+" : "-"
    : "";
  return `${dir}${pct}%`;
}

function severityRank(severity: string): number {
  switch (severity) {
    case "low": return 0;
    case "medium": return 1;
    case "high": return 2;
    case "critical": return 3;
    default: return 0;
  }
}

function weatherLabel(kind: WeatherKind): string {
  switch (kind) {
    case "clear": return "Clear Skies";
    case "partly_cloudy": return "Partly Cloudy";
    case "fog": return "Fog";
    case "rain": return "Rain";
    case "storm": return "Storm";
    case "heatwave": return "Heatwave";
    case "wind_advisory": return "Wind Advisory";
    case "cold_snap": return "Cold Snap";
  }
}

function overrideExplanation(override: string): string {
  switch (override) {
    case "heatwave":
      return "Heatwave override triggered: momentum and volatility are excessive despite positive trend.";
    case "wind_advisory":
      return "Wind advisory: capital rotation is rapid and sector leadership is unstable.";
    case "cold_snap":
      return "Cold snap: participation and demand are rapidly contracting.";
    case "fog":
      return "Low confidence or insufficient data is reducing visibility.";
    case "storm":
      return "Severe risk conditions are overriding the base assessment.";
    default:
      return `Override triggered: ${override}.`;
  }
}
