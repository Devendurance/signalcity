// ============================================================
// Signal City — Skill Router
// Translates product requests into research workflows.
// Returns execution plans. Does not execute on its own.
// ============================================================

export type WorkflowType =
  | "global-weather"
  | "sector-weather"
  | "asset-weather"
  | "claim-investigation"
  | "entry-check"
  | "portfolio-diagnosis";

export interface WorkflowStep {
  /** Human-readable workflow name (maps to CMC Skill names). */
  skill: string;
  /** What this step produces. */
  purpose: string;
  /** Parameters for this step. */
  params: Record<string, string>;
}

export interface ExecutionPlan {
  id: string;
  type: WorkflowType;
  subjectId: string;
  requestedAt: string;
  steps: WorkflowStep[];
  /** Total number of provider calls needed. */
  estimatedCalls: number;
}

// ---- Routing Table ----

const ROUTING_TABLE: Record<WorkflowType, WorkflowStep[]> = {
  "global-weather": [
    { skill: "Daily Market Overview", purpose: "Global market health, volume, dominance", params: {} },
    { skill: "Crypto Macro Overview", purpose: "Macro context, risk appetite, external pressure", params: {} },
    { skill: "BTC Cross-Asset Correlation", purpose: "BTC vs equities, gold, DXY", params: {} },
  ],

  "sector-weather": [
    { skill: "Altcoin Sector Analysis", purpose: "Sector performance, breadth, narrative", params: { sector: "{sectorId}" } },
    { skill: "Daily Market Overview", purpose: "Broader market context", params: {} },
  ],

  "asset-weather": [
    { skill: "Altcoin Token Profile", purpose: "Token identity, market data, supply", params: { asset: "{assetId}" } },
    { skill: "Daily Market Overview", purpose: "Broad market context", params: {} },
  ],

  "claim-investigation": [
    { skill: "Altcoin Token Profile", purpose: "Token fundamentals and market data", params: { asset: "{assetId}" } },
    { skill: "Altcoin Deep Research", purpose: "Deep research on the asset", params: { asset: "{assetId}" } },
    { skill: "On-Chain Memecoin Analysis", purpose: "On-chain holder and activity data (if applicable)", params: { asset: "{assetId}" } },
    { skill: "Daily Market Overview", purpose: "Market context for the claim period", params: {} },
  ],

  "entry-check": [
    { skill: "Altcoin Token Profile", purpose: "Asset fundamentals", params: { asset: "{assetId}" } },
    { skill: "Altcoin Breakout Scanner — Spot", purpose: "Technical breakout validation", params: { asset: "{assetId}" } },
    { skill: "Daily Market Overview", purpose: "Market environment for the thesis", params: {} },
    { skill: "BTC Cross-Asset Correlation", purpose: "Broader risk context", params: {} },
  ],

  "portfolio-diagnosis": [
    { skill: "Altcoin Token Profile", purpose: "Per-asset fundamentals", params: { asset: "{assetId}" } },
    { skill: "Altcoin Sector Analysis", purpose: "Sector concentration and health", params: { sector: "{sectorId}" } },
    { skill: "Crypto Macro Overview", purpose: "Macro backdrop for the portfolio", params: {} },
    { skill: "Daily Market Overview", purpose: "Current market conditions", params: {} },
  ],
};

// ---- Router ----

export function routeRequest(
  type: WorkflowType,
  subjectId: string,
): ExecutionPlan {
  const steps = ROUTING_TABLE[type] ?? [];

  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    subjectId,
    requestedAt: new Date().toISOString(),
    steps: interpolateParams(steps, { assetId: subjectId, sectorId: subjectId }),
    estimatedCalls: steps.length,
  };
}

function interpolateParams(
  steps: WorkflowStep[],
  context: Record<string, string>,
): WorkflowStep[] {
  return steps.map((step) => ({
    ...step,
    params: Object.fromEntries(
      Object.entries(step.params).map(([k, v]) => [
        k,
        v.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? `{${key}}`),
      ]),
    ),
  }));
}
