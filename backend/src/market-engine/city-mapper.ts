// ============================================================
// Signal City — City State Mapper
// Maps weather + signals → CityState for the 3D renderer.
// Traffic, building lights, emergency activity, billboards, etc.
// ============================================================

import type { NormalizedMarketSignals } from "@shared/contracts/signals";
import type {
  CityState,
  NarrativeBillboard,
  WeatherKind,
  WeatherState,
} from "@shared/contracts/district";

/**
 * Maps market signals + weather to city visual parameters.
 * Every output value is in a documented range (0..1) where applicable.
 */
export function mapToCityState(
  weather: WeatherState,
  signals: NormalizedMarketSignals,
  narrativeLabels?: string[],
): CityState {
  // Traffic density: driven by volume/activity + narrative heat
  const trafficDensity = clamp(
    (signals.liquidityHealth * 0.6 + signals.narrativeHeat * 0.4),
    0, 1,
  );

  // Traffic speed: trend + momentum. Positive trend = faster.
  // Negative or volatile = slower.
  const trafficSpeed = clamp(
    (0.5 + (signals.trend * 0.3) - (signals.volatility * 0.2)),
    0, 1,
  );

  // Congestion: high when vol is high AND liquidity is tight
  const congestion = clamp(
    (signals.volatility * 0.7 + (1 - signals.liquidityHealth) * 0.3),
    0, 1,
  );

  // Building activity: breadth of participation
  const buildingActivity = clamp(
    (0.5 + (signals.breadth * 0.5)),
    0, 1,
  );

  // Emergency level: driven by vol + leverage + severity
  const emergencySeverityFactor = weatherSeverityToFactor(weather.severity);
  const emergencyLevel = clamp(
    (signals.volatility * 0.4 + signals.leverageRisk * 0.4 + emergencySeverityFactor * 0.2),
    0, 1,
  );

  // Visibility: inverse of fog/uncertainty. Low confidence = low visibility.
  const visibility = clamp(signals.confidence, 0.1, 1);

  // Construction: emerging narratives or growing sectors
  const constructionActivity = clamp(
    (signals.narrativeHeat * 0.5 + Math.max(0, signals.momentumAcceleration) * 0.5),
    0, 1,
  );

  // Road restrictions: severe weather or extreme risk
  const roadRestrictionLevel = clamp(
    (emergencyLevel * 0.6 + (signals.liquidityHealth < 0.3 ? 0.4 : 0)),
    0, 1,
  );

  // Narrative billboards
  const billboards = buildBillboards(weather.kind, signals, narrativeLabels);

  return {
    trafficDensity: round(trafficDensity),
    trafficSpeed: round(trafficSpeed),
    congestion: round(congestion),
    buildingActivity: round(buildingActivity),
    emergencyLevel: round(emergencyLevel),
    visibility: round(visibility),
    constructionActivity: round(constructionActivity),
    roadRestrictionLevel: round(roadRestrictionLevel),
    narrativeBillboards: billboards,
  };
}

// ---- Helpers ----

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function weatherSeverityToFactor(severity: string): number {
  switch (severity) {
    case "low": return 0.1;
    case "medium": return 0.35;
    case "high": return 0.65;
    case "critical": return 0.9;
    default: return 0.1;
  }
}

function buildBillboards(
  weather: WeatherKind,
  signals: NormalizedMarketSignals,
  narrativeLabels?: string[],
): NarrativeBillboard[] {
  const billboards: NarrativeBillboard[] = [];

  // Weather-driven billboard
  billboards.push({
    id: "weather-status",
    text: weatherToHeadline(weather),
    strength: 0.9,
    classification: weather,
  });

  // Narrative-driven billboards (from external labels)
  if (narrativeLabels) {
    for (const label of narrativeLabels.slice(0, 3)) {
      billboards.push({
        id: `narrative-${label.replace(/\s+/g, "-").toLowerCase()}`,
        text: label,
        strength: signals.narrativeHeat,
      });
    }
  }

  // Sentiment billboard
  if (Math.abs(signals.sentiment) > 0.3) {
    const sentimentText =
      signals.sentiment > 0.5
        ? "Sentiment: Strongly Positive"
        : signals.sentiment > 0
          ? "Sentiment: Cautiously Optimistic"
          : signals.sentiment > -0.5
            ? "Sentiment: Cautious"
            : "Sentiment: Bearish";

    billboards.push({
      id: "sentiment",
      text: sentimentText,
      strength: Math.abs(signals.sentiment),
    });
  }

  // Volume/activity billboard
  if (signals.liquidityHealth > 0.7) {
    billboards.push({
      id: "volume",
      text: "High Market Activity",
      strength: signals.liquidityHealth,
    });
  }

  return billboards;
}

function weatherToHeadline(weather: WeatherKind): string {
  switch (weather) {
    case "clear": return "Clear Skies — Market Healthy";
    case "partly_cloudy": return "Partly Cloudy — Mixed Signals";
    case "fog": return "Fog Advisory — Low Visibility";
    case "rain": return "Rain — Deteriorating Conditions";
    case "storm": return "Storm Warning — High Risk";
    case "heatwave": return "Heatwave — Market Overheating";
    case "wind_advisory": return "Wind Advisory — Rapid Rotation";
    case "cold_snap": return "Cold Snap — Activity Fading";
  }
}
