// ============================================================
// Signal City — Provenance & Skill Receipt Contracts
// ============================================================

/**
 * A single workflow execution record.
 * Maps to the AGENTS.md SkillRun interface.
 */
export interface SkillRun {
  id: string;
  workflow: string;
  requestType: string;
  assetId?: string;
  sectorId?: string;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  provider: string;
  providerTimestamp?: string;
  status: "queued" | "running" | "completed" | "partial" | "failed";
  rawOutputRef?: string;
  normalizedSignals?: Record<string, unknown>;
  warnings: string[];
  error?: StructuredError;
  version: string;
}

export interface StructuredError {
  code: string;
  message: string;
  category: "provider" | "normalization" | "engine" | "network" | "validation" | "internal";
  retryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * The public Skill Receipt — part of the product, not debug metadata.
 */
export interface SkillReceipt {
  /** Unique receipt identifier. */
  id: string;

  /** Connects to SkillRun, DistrictState, ClaimReceipt, etc. */
  runId: string;

  /** Skills or workflows invoked. */
  workflows: string[];

  /** When the request was made (ISO 8601). */
  requestedAt: string;

  /** When the provider data was captured (ISO 8601). */
  providerTimestamp?: string;

  /** Important source values extracted from provider responses. */
  sourceValues: Record<string, unknown>;

  /** The normalized signals that fed the engine. */
  normalizedSignals: Record<string, unknown>;

  /** Transformations applied and their versions. */
  transformations: TransformationRecord[];

  /** The final classification or outcome. */
  outcome: Record<string, unknown>;

  /** Confidence and missing evidence. */
  confidence: number;
  missingEvidence: string[];

  /** Explanation model version if used. */
  explanationModelVersion?: string;

  /** Conditions that could change the result. */
  changeConditions: string[];
}

export interface TransformationRecord {
  step: string;
  version: string;
  description: string;
}

/**
 * City Journal — persisted state changes.
 */
export interface JournalEvent {
  id: string;
  districtId: string;
  previousState: {
    weather: string;
    severity: string;
    confidence: number;
  };
  currentState: {
    weather: string;
    severity: string;
    confidence: number;
  };
  /** Which signals changed. */
  changedSignals: string[];
  /** Threshold or override that was crossed. */
  triggerReason: string;
  timestamp: string;
  confidenceChange: number;
  runId: string;
  receiptId: string;
}
