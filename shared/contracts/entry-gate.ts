// ============================================================
// Signal City — Entry Gate Contracts
// ============================================================

export type GateStatus =
  | "open"
  | "caution"
  | "restricted"
  | "closed"
  | "inspection_required";

export interface EntryCheckRequest {
  /** Asset symbol (e.g. "DOGE", "SOL"). */
  assetId: string;

  /** Intended action (e.g. "Buy spot", "Open long"). */
  intendedAction: string;

  /** The user's stated reason. */
  reason: string;

  /** Time horizon. */
  horizon: string;

  /** Approximate risk tolerance. */
  riskTolerance: "low" | "medium" | "high";

  /** Optional position size as % of portfolio. */
  positionSizePct?: number;
}

export interface EntryCheckResult {
  id: string;
  runId: string;

  /** The evaluated asset. */
  assetId: string;

  /** The user's stated thesis. */
  thesis: string;

  /** Gate determination. */
  gateStatus: GateStatus;

  /** Evidence that supports the thesis. */
  supportingEvidence: string[];

  /** Evidence that challenges the thesis. */
  challengingEvidence: string[];

  /** Reasoning patterns that appear emotional rather than analytical. */
  emotionalPatterns: string[];

  /** Conditions worth waiting for before acting. */
  waitingConditions: string[];

  /** Conditions that would invalidate the thesis entirely. */
  invalidationConditions: string[];

  /** Questions the user hasn't addressed. */
  unansweredQuestions: string[];

  /** Plain-language summary. */
  summary: string;

  /** Skills used. */
  skillsUsed: string[];

  /** When generated. */
  generatedAt: string;

  /** Data timestamp. */
  dataAsOf: string;

  version: string;

  /** This is private by default. */
  isPrivate: true;
}
