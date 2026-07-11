// ============================================================
// Signal City — Shared Contracts Barrel Export
// ============================================================

export type {
  WeatherKind,
  WeatherSeverity,
  Freshness,
  DistrictStatus,
  DistrictScope,
  SystemStatus,
  NarrativeBillboard,
  CityState,
  WeatherState,
  ExplanationState,
  DistrictState,
  CityWorldState,
  ApiError,
} from "./district";

export type { NormalizedMarketSignals } from "./signals";
export { emptySignals } from "./signals";

export type {
  SubClaimClassification,
  ClaimClassification,
  ClaimRequest,
  SubClaim,
  ClaimReceipt,
} from "./claims";

export type {
  GateStatus,
  EntryCheckRequest,
  EntryCheckResult,
} from "./entry-gate";

export type {
  HoldingEntry,
  HoldingHealth,
  HoldingDiagnosis,
  PortfolioReport,
} from "./portfolio";

export type {
  SkillRun,
  StructuredError,
  SkillReceipt,
  TransformationRecord,
  JournalEvent,
} from "./receipt";
