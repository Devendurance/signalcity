// ============================================================
// Signal City — Claims Bureau Contracts
// ============================================================

/**
 * How a subclaim is classified against evidence.
 */
export type SubClaimClassification =
  | "supported"
  | "partially_supported"
  | "weakly_supported"
  | "unsupported"
  | "not_verifiable"
  | "opinion_as_fact"
  | "prediction_not_verifiable"
  | "observation_supported_cause_unsupported";

/**
 * Overall claim classification (aggregated from subclaims).
 */
export type ClaimClassification =
  | "supported"
  | "partially_supported"
  | "weakly_supported"
  | "unsupported_by_current_evidence"
  | "not_currently_verifiable"
  | "opinion_presented_as_fact"
  | "prediction_not_currently_verifiable"
  | "observation_supported_but_claimed_cause_unsupported";

export interface ClaimRequest {
  /** The original claim text as submitted by the user. */
  claim: string;

  /** Optional source URL where the claim was found. */
  sourceUrl?: string;

  /** Relevant asset symbol (e.g. "BTC", "SOL"). */
  assetId?: string;

  /** Relevant sector (e.g. "ai", "defi", "memecoin"). */
  sectorId?: string;

  /** Intended time horizon from the claim. */
  horizon?: string;

  /** Optional additional context. */
  context?: string;
}

export interface SubClaim {
  id: string;
  /** The extracted measurable statement. */
  text: string;
  /** What metric this maps to. */
  metric: string;
  /** The relevant asset or sector. */
  subjectId: string;
  /** Time horizon if specified. */
  horizon?: string;
  /** Whether causal language is present. */
  hasCausalLanguage: boolean;
  classification: SubClaimClassification;
  /** Evidence summary for this subclaim. */
  evidence: string;
  /** What's unknown or missing. */
  unknowns: string;
}

export interface ClaimReceipt {
  id: string;
  runId: string;

  /** The original claim as submitted. */
  originalClaim: string;
  sourceUrl?: string;

  /** Decomposed subclaims. */
  subClaims: SubClaim[];

  /** Overall classification. */
  classification: ClaimClassification;

  /** Plain-language finding. */
  finding: string;

  /** What supports the claim. */
  supportingEvidence: string[];

  /** What weakens the claim. */
  weakeningEvidence: string[];

  /** What remains unknown. */
  unknowns: string[];

  /** What would strengthen the finding. */
  strengtheningConditions: string[];

  /** Skills / workflows used. */
  skillsUsed: string[];

  /** When generated (ISO 8601). */
  generatedAt: string;

  /** Data timestamp. */
  dataAsOf: string;

  /** Receipt version. */
  version: string;
}
