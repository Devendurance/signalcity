// ============================================================
// Signal City — Shared DistrictState Contract
// This is the primary boundary between backend and frontend.
// The backend produces this state. The Three.js renderer consumes it.
// ============================================================

// ---- Weather Classification ----

export type WeatherKind =
  | "clear"
  | "partly_cloudy"
  | "fog"
  | "rain"
  | "storm"
  | "heatwave"
  | "wind_advisory"
  | "cold_snap";

export type WeatherSeverity = "low" | "medium" | "high" | "critical";

export type Freshness = "fresh" | "aging" | "stale" | "unknown";

export type DistrictStatus = "healthy" | "watch" | "stressed";

export type DistrictScope = "global" | "sector" | "asset" | "portfolio";

export type SystemStatus = "ready" | "partial" | "insufficient_data" | "stale" | "error";

// ---- City Visual State ----

export interface NarrativeBillboard {
  id: string;
  text: string;
  strength: number; // 0..1
  classification?: string;
}

export interface CityState {
  trafficDensity: number;    // 0..1
  trafficSpeed: number;      // 0..1
  congestion: number;        // 0..1
  buildingActivity: number;  // 0..1
  emergencyLevel: number;    // 0..1
  visibility: number;        // 0..1
  constructionActivity: number;  // 0..1
  roadRestrictionLevel: number;  // 0..1
  narrativeBillboards: NarrativeBillboard[];
}

// ---- Weather Block ----

export interface WeatherState {
  kind: WeatherKind;
  severity: WeatherSeverity;
  baseScore: number;          // raw weighted score
  componentContributions: Record<string, number>;
  triggeredThresholds: string[];
  overrides: string[];
  confidence: number;         // 0..1
  warnings: string[];
  ruleVersion: string;
}

// ---- Explanation Block ----

export interface ExplanationState {
  summary: string;
  causes: string[];
  changed: string;
  watch: string[];
  modelVersion?: string;
}

// ---- The Core DistrictState ----

/**
 * DistrictState is the primary renderer contract.
 * Every field here is produced by the backend and consumed by the 3D city.
 * The renderer must not independently invent market meaning from these values.
 */
export interface DistrictState {
  /** Unique district identifier (e.g. "global", "btc", "ai", "defi") */
  id: string;

  /** Human-readable display name */
  label: string;

  /** What this district represents */
  scope: DistrictScope;

  /** The subject of analysis (asset symbol, sector name, "global", portfolio id) */
  subjectId: string;

  /** When this state was generated (ISO 8601) */
  generatedAt: string;

  /** When the underlying market data was captured (ISO 8601) */
  dataAsOf: string;

  /** Earliest time a refresh is expected */
  nextRefreshAt?: string;

  /** System-level status */
  status: SystemStatus;

  /** The 3D position for the district's main building [x, y, z] */
  position: readonly [number, number, number];

  /** GLB asset identifier for the renderer */
  assetId: string;

  // Sub-blocks

  weather: WeatherState;

  city: CityState;

  explanation: ExplanationState;

  /** Links to the provenance receipt */
  receiptId: string;

  /** Schema version for forward compatibility */
  version: string;
}

// ---- CityWorldState (API response envelope) ----

export interface CityWorldState {
  id: string;
  updatedAt: string;
  dataAsOf: string;
  nextRefreshAt?: string;
  systemStatus: SystemStatus;
  districts: DistrictState[];
  version: string;
}

// ---- API Error Contract ----

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
