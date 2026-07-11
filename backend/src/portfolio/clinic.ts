// ============================================================
// Signal City — Portfolio Clinic Engine
// Evaluates holdings as a connected risk system.
// Concentration, correlation, narrative overlap, volatility, liquidity.
// Produces PortfolioReports — private by default.
// ============================================================

import { v4 as uuid } from "uuid";
import type {
  HoldingEntry,
  HoldingHealth,
  HoldingDiagnosis,
  PortfolioReport,
} from "@shared/contracts/portfolio";
import type { NormalizedMarketSignals } from "@shared/contracts/signals";

// ---- Input Types ----

export interface ClinicInput {
  holdings: HoldingEntry[];
  /** Per-asset market signals. */
  assetSignals: Map<string, NormalizedMarketSignals>;
  /** Optional global/sector context. */
  globalSignals?: NormalizedMarketSignals;
}

// ---- Main Pipeline ----

export function diagnosePortfolio(input: ClinicInput): PortfolioReport {
  const { holdings, assetSignals, globalSignals } = input;
  const runId = uuid();
  const now = new Date().toISOString();

  if (holdings.length === 0) {
    return emptyReport(runId, now);
  }

  // ---- Concentration Analysis ----

  const assetConcentration = calculateAssetConcentration(holdings);
  const sectorConcentration = calculateSectorConcentration(holdings);
  const narrativeOverlap = findNarrativeOverlap(holdings);

  // ---- Per-Holding Diagnosis ----

  const holdingDiagnoses = holdings.map((h) =>
    diagnoseHolding(h, assetSignals.get(h.assetId), globalSignals),
  );

  // ---- Portfolio-Level Metrics ----

  const volatilityScore = calculatePortfolioVolatility(holdingDiagnoses);
  const liquidityImbalance = hasLiquidityImbalance(holdingDiagnoses);
  const averageCorrelation = estimateCorrelation(holdings);

  // ---- Insights ----

  const { blindSpots, suggestedReview } = generateInsights(
    holdings,
    holdingDiagnoses,
    assetConcentration,
    sectorConcentration,
    narrativeOverlap,
    liquidityImbalance,
  );

  // ---- Overall Condition ----

  const overallCondition = classifyOverallCondition(
    assetConcentration,
    sectorConcentration,
    narrativeOverlap,
    volatilityScore,
    liquidityImbalance,
  );

  return {
    id: uuid(),
    runId,
    overallCondition,
    primaryDiagnosis: buildPrimaryDiagnosis(
      overallCondition,
      assetConcentration,
      sectorConcentration,
      narrativeOverlap,
      holdingDiagnoses,
    ),
    holdings: holdingDiagnoses,
    assetConcentration: round(assetConcentration),
    sectorConcentration: round(sectorConcentration),
    narrativeOverlap,
    averageCorrelation: round(averageCorrelation),
    volatilityScore: round(volatilityScore),
    liquidityImbalance,
    blindSpots,
    suggestedReview,
    skillsUsed: [
      "Altcoin Token Profile",
      "Altcoin Sector Analysis",
      "Crypto Macro Overview",
      "Daily Market Overview",
    ],
    generatedAt: now,
    dataAsOf: now,
    version: "1.0.0",
    isPrivate: true,
  };
}

// ---- Concentration Analysis ----

function calculateAssetConcentration(holdings: HoldingEntry[]): number {
  if (holdings.length === 0) return 0;
  if (holdings.length === 1) return 1;

  // Herfindahl-Hirschman Index (HHI) style
  const totalAllocation = holdings.reduce((sum, h) => sum + h.allocationPct, 0);
  if (totalAllocation === 0) return 0;

  const squaredShares = holdings.map(
    (h) => (h.allocationPct / totalAllocation) ** 2,
  );
  const hhi = squaredShares.reduce((sum, s) => sum + s, 0);

  // Normalize: HHI ranges from 1/N (equal allocation) to 1 (single asset)
  const normalized = (hhi - 1 / holdings.length) / (1 - 1 / holdings.length);
  return clamp(normalized, 0, 1);
}

function calculateSectorConcentration(holdings: HoldingEntry[]): number {
  const sectors = new Map<string, number>();

  for (const h of holdings) {
    const sector = h.sector ?? "unknown";
    sectors.set(sector, (sectors.get(sector) ?? 0) + h.allocationPct);
  }

  const totalAllocation = holdings.reduce((sum, h) => sum + h.allocationPct, 0);
  if (totalAllocation === 0 || sectors.size === 0) return 0;

  const maxSectorPct = Math.max(...sectors.values()) / totalAllocation;
  // Normalize: 1 = all in one sector, 1/N = perfectly balanced
  const balanced = 1 / sectors.size;
  return clamp((maxSectorPct - balanced) / (1 - balanced), 0, 1);
}

function findNarrativeOverlap(holdings: HoldingEntry[]): string[] {
  const narrativeCounts = new Map<string, number>();

  for (const h of holdings) {
    for (const tag of h.narrativeTags ?? []) {
      narrativeCounts.set(tag, (narrativeCounts.get(tag) ?? 0) + 1);
    }
  }

  // Narratives shared by 2+ holdings are overlaps
  return [...narrativeCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([tag, count]) => `${tag} (${count} holdings)`)
    .sort((a, b) => {
      const countA = parseInt(a.match(/\d+/)![0]);
      const countB = parseInt(b.match(/\d+/)![0]);
      return countB - countA;
    });
}

// ---- Per-Holding Diagnosis ----

function diagnoseHolding(
  holding: HoldingEntry,
  signals?: NormalizedMarketSignals,
  globalSignals?: NormalizedMarketSignals,
): HoldingDiagnosis {
  const s = signals;
  const g = globalSignals;

  let health: HoldingHealth = "healthy";
  const issues: string[] = [];
  const strengths: string[] = [];

  // Check trend
  if (s && s.trend < -0.3) {
    issues.push("Negative trend — holding is under pressure.");
    health = "under_observation";
  } else if (s && s.trend > 0.2) {
    strengths.push("Positive trend.");
  }

  // Check volatility
  if (s && s.volatility > 0.7) {
    issues.push("High volatility — large price swings are likely.");
    if (health !== "under_observation") health = "under_observation";
  }

  // Check liquidity
  if (s && s.liquidityHealth < 0.3) {
    issues.push("Thin liquidity — exiting may be difficult.");
    health = "critical_attention";
  }

  // Check leverage risk
  if (s && s.leverageRisk > 0.7) {
    issues.push("Elevated leverage and liquidation risk.");
    if (health !== "critical_attention") health = "under_observation";
  }

  // Check thesis conflicts
  const thesisConflicts = checkThesisConflicts(holding, signals);

  // Recent deterioration
  const recentDeterioration = s ? s.momentumAcceleration < -0.2 : false;

  if (thesisConflicts) {
    issues.push("Current evidence conflicts with the stated thesis.");
    health = "critical_attention";
  }

  if (recentDeterioration && health === "healthy") {
    health = "under_observation";
  }

  // Diagnosis text
  let diagnosis: string;
  if (issues.length === 0 && strengths.length > 0) {
    diagnosis = `${holding.assetId}: ${strengths.join(" ")}`;
  } else if (issues.length > 0) {
    diagnosis = `${holding.assetId}: ${issues.join(" ")}`;
  } else {
    diagnosis = `${holding.assetId}: No significant health concerns detected.`;
  }

  return {
    assetId: holding.assetId,
    name: holding.name,
    allocationPct: holding.allocationPct,
    health,
    diagnosis,
    thesis: holding.thesis,
    thesisConflicts,
    volatilityContribution: s ? round(s.volatility) : 0.5,
    liquidityAssessment: s
      ? s.liquidityHealth > 0.6
        ? "Adequate"
        : s.liquidityHealth > 0.3
          ? "Moderate"
          : "Thin"
      : "Unknown",
    recentDeterioration,
  };
}

function checkThesisConflicts(
  holding: HoldingEntry,
  signals?: NormalizedMarketSignals,
): boolean {
  if (!holding.thesis || !signals) return false;

  const thesis = holding.thesis.toLowerCase();

  // If thesis mentions growth/performance but trend is negative
  if (
    (thesis.includes("growth") || thesis.includes("perform") || thesis.includes("bull")) &&
    signals.trend < -0.2
  ) {
    return true;
  }

  // If thesis mentions stability/safety but volatility is high
  if (
    (thesis.includes("stable") || thesis.includes("safe") || thesis.includes("hedge")) &&
    signals.volatility > 0.6
  ) {
    return true;
  }

  // If thesis mentions utility/adoption but liquidity is thin
  if (
    (thesis.includes("utility") || thesis.includes("adoption") || thesis.includes("ecosystem")) &&
    signals.liquidityHealth < 0.3
  ) {
    return true;
  }

  return false;
}

// ---- Portfolio-Level Metrics ----

function calculatePortfolioVolatility(diagnoses: HoldingDiagnosis[]): number {
  if (diagnoses.length === 0) return 0;

  // Weighted average of per-holding volatility
  const totalAlloc = diagnoses.reduce((sum, d) => sum + d.allocationPct, 0);
  if (totalAlloc === 0) return 0;

  return (
    diagnoses.reduce(
      (sum, d) => sum + d.volatilityContribution * d.allocationPct,
      0,
    ) / totalAlloc
  );
}

function hasLiquidityImbalance(diagnoses: HoldingDiagnosis[]): boolean {
  // True if any holding has critical liquidity issues with > 10% allocation
  return diagnoses.some(
    (d) =>
      d.liquidityAssessment === "Thin" && d.allocationPct > 10,
  );
}

function estimateCorrelation(holdings: HoldingEntry[]): number {
  if (holdings.length <= 1) return 0;

  // Sector-based correlation estimate (simplified — replaces historical calculation)
  const sectors = new Map<string, number>();
  for (const h of holdings) {
    const s = h.sector ?? "unknown";
    sectors.set(s, (sectors.get(s) ?? 0) + 1);
  }

  // More concentration = higher estimated correlation
  const maxFrac = Math.max(...sectors.values()) / holdings.length;
  // Map to 0..1: single sector = ~0.85, diverse = ~0.3
  return 0.3 + maxFrac * 0.55;
}

// ---- Insights ----

function generateInsights(
  holdings: HoldingEntry[],
  diagnoses: HoldingDiagnosis[],
  assetConcentration: number,
  sectorConcentration: number,
  narrativeOverlap: string[],
  liquidityImbalance: boolean,
): { blindSpots: string[]; suggestedReview: string[] } {
  const blindSpots: string[] = [];
  const suggestedReview: string[] = [];

  // Concentration blind spots
  if (assetConcentration > 0.7) {
    const topHolding = [...holdings].sort((a, b) => b.allocationPct - a.allocationPct)[0];
    if (topHolding) {
      blindSpots.push(
        `${topHolding.assetId} represents ${topHolding.allocationPct}% of the portfolio — a drawdown in this asset would dominate portfolio performance.`,
      );
    }
  }

  if (sectorConcentration > 0.6) {
    blindSpots.push(
      "The portfolio is concentrated in a single sector — sector-wide shocks would affect most holdings simultaneously.",
    );
  }

  // Narrative overlap
  if (narrativeOverlap.length > 0) {
    blindSpots.push(
      `${narrativeOverlap.length} narrative${narrativeOverlap.length !== 1 ? "s" : ""} ${narrativeOverlap.length !== 1 ? "are" : "is"} shared across multiple holdings: ${narrativeOverlap.join("; ")}. These positions may behave as one oversized trade during a narrative shift.`,
    );
  }

  // Liquidity imbalance
  if (liquidityImbalance) {
    blindSpots.push(
      "One or more significant positions have thin liquidity — exiting during stress may be difficult.",
    );
  }

  // Suggested review items
  for (const d of diagnoses) {
    if (d.thesisConflicts) {
      suggestedReview.push(
        `Review your thesis for ${d.assetId}: current evidence conflicts with the stated reason for holding.`,
      );
    }
  }

  for (const d of diagnoses) {
    if (!d.thesis) {
      suggestedReview.push(
        `${d.assetId} has no recorded thesis — documenting why you hold each asset helps identify when the thesis weakens.`,
      );
    }
  }

  for (const d of diagnoses) {
    if (d.recentDeterioration) {
      suggestedReview.push(
        `${d.assetId} has shown recent deterioration — review whether your thesis remains intact.`,
      );
    }
  }

  if (assetConcentration > 0.5) {
    suggestedReview.push(
      "Consider whether high asset concentration aligns with your risk tolerance. Set conditions that would trigger rebalancing.",
    );
  }

  if (suggestedReview.length === 0) {
    suggestedReview.push(
      "No urgent review items identified. Continue monitoring standard indicators and thesis conditions.",
    );
  }

  return { blindSpots, suggestedReview };
}

// ---- Overall Condition ----

function classifyOverallCondition(
  assetConcentration: number,
  sectorConcentration: number,
  narrativeOverlap: string[],
  volatilityScore: number,
  liquidityImbalance: boolean,
): string {
  const riskFactors = [
    assetConcentration > 0.7,
    sectorConcentration > 0.6,
    narrativeOverlap.length >= 2,
    volatilityScore > 0.6,
    liquidityImbalance,
  ].filter(Boolean).length;

  if (riskFactors >= 4) return "High Risk — multiple concentrations and structural issues detected.";
  if (riskFactors >= 2) return "Moderate Risk — several concentration or structural concerns.";
  if (riskFactors === 1) return "Stable — one area of concern identified.";
  return "Healthy — no significant concentration or structural risks detected.";
}

function buildPrimaryDiagnosis(
  overallCondition: string,
  assetConcentration: number,
  sectorConcentration: number,
  narrativeOverlap: string[],
  diagnoses: HoldingDiagnosis[],
): string {
  const parts: string[] = [];

  if (assetConcentration > 0.6) {
    parts.push(`${Math.round(assetConcentration * 100)}% asset concentration.`);
  }

  if (sectorConcentration > 0.5) {
    parts.push(`Heavy sector concentration detected.`);
  }

  if (narrativeOverlap.length >= 2) {
    parts.push(`${narrativeOverlap.length} overlapping narratives across holdings.`);
  }

  const criticalCount = diagnoses.filter((d) => d.health === "critical_attention").length;
  if (criticalCount > 0) {
    parts.push(`${criticalCount} holding${criticalCount !== 1 ? "s" : ""} require critical attention.`);
  }

  if (parts.length === 0) {
    return "No significant structural issues detected. The portfolio appears reasonably balanced.";
  }

  return parts.join(" ");
}

// ---- Utilities ----

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyReport(runId: string, now: string): PortfolioReport {
  return {
    id: uuid(),
    runId,
    overallCondition: "No holdings to analyze.",
    primaryDiagnosis: "Portfolio is empty.",
    holdings: [],
    assetConcentration: 0,
    sectorConcentration: 0,
    narrativeOverlap: [],
    volatilityScore: 0,
    liquidityImbalance: false,
    blindSpots: [],
    suggestedReview: ["Add holdings to receive a portfolio diagnosis."],
    skillsUsed: [],
    generatedAt: now,
    dataAsOf: now,
    version: "1.0.0",
    isPrivate: true,
  };
}
