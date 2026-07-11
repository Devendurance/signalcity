// ============================================================
// Signal City — Portfolio Clinic Contracts
// ============================================================

export interface HoldingEntry {
  /** Asset symbol. */
  assetId: string;

  /** Human-readable name. */
  name: string;

  /** Allocation as percentage of portfolio (0..100). */
  allocationPct: number;

  /** User's stated reason for holding. */
  thesis?: string;

  /** Category / sector. */
  sector?: string;

  /** Narrative tags (e.g. "ai", "infrastructure", "l1"). */
  narrativeTags?: string[];
}

export type HoldingHealth = "healthy" | "under_observation" | "critical_attention";

export interface HoldingDiagnosis {
  assetId: string;
  name: string;
  allocationPct: number;
  health: HoldingHealth;

  /** Why this classification. */
  diagnosis: string;

  /** The user's original thesis, if provided. */
  thesis?: string;

  /** Whether current evidence conflicts with the thesis. */
  thesisConflicts: boolean;

  /** Volatility contribution to the portfolio. */
  volatilityContribution: number; // 0..1

  /** Liquidity assessment. */
  liquidityAssessment: string;

  /** Recent signal deterioration. */
  recentDeterioration: boolean;
}

export interface PortfolioReport {
  id: string;
  runId: string;

  /** Overall condition label. */
  overallCondition: string;

  /** Primary diagnosis. */
  primaryDiagnosis: string;

  /** Individual holding assessments. */
  holdings: HoldingDiagnosis[];

  // ---- Risk Metrics ----

  /** Asset concentration (0..1). 1 = all in one asset. */
  assetConcentration: number;

  /** Sector concentration (0..1). */
  sectorConcentration: number;

  /** Duplicated narrative exposure count. */
  narrativeOverlap: string[];

  /** Average pairwise correlation among holdings. */
  averageCorrelation?: number;

  /** Overall volatility score (0..1). */
  volatilityScore: number;

  /** Liquidity imbalance flag. */
  liquidityImbalance: boolean;

  // ---- Insights ----

  /** Portfolio blind spots. */
  blindSpots: string[];

  /** Suggested areas to review (not trade advice). */
  suggestedReview: string[];

  /** Skills used. */
  skillsUsed: string[];

  /** When generated. */
  generatedAt: string;

  /** Data timestamp. */
  dataAsOf: string;

  version: string;

  /** Private by default. */
  isPrivate: true;
}
