// ============================================================
// Signal City — Entry Gate Engine
// Evaluates the quality of a user's trade thesis against market evidence.
// Judges reasoning, not outcomes. Never issues trade instructions.
// ============================================================

import { v4 as uuid } from "uuid";
import type { GateStatus, EntryCheckRequest, EntryCheckResult } from "@shared/contracts/entry-gate";
import type { NormalizedMarketSignals } from "@shared/contracts/signals";

// ---- Gate Evaluation ----

export interface GateInput {
  request: EntryCheckRequest;
  signals: NormalizedMarketSignals;
}

export function evaluateEntry(input: GateInput): EntryCheckResult {
  const { request, signals } = input;
  const runId = uuid();
  const now = new Date().toISOString();

  const reason = request.reason.toLowerCase();

  // Step 1: Identify reasoning patterns
  const patterns = analyzeReasoningPatterns(reason);

  // Step 2: Compare thesis against evidence
  const evidenceCheck = compareThesisToEvidence(request, signals, patterns);

  // Step 3: Determine gate status
  const gateStatus = determineGate(evidenceCheck, patterns, signals);

  // Step 4: Build result
  return {
    id: uuid(),
    runId,
    assetId: request.assetId,
    thesis: request.reason,
    gateStatus,
    supportingEvidence: evidenceCheck.supporting,
    challengingEvidence: evidenceCheck.challenging,
    emotionalPatterns: patterns.emotional,
    waitingConditions: generateWaitingConditions(gateStatus, signals, patterns),
    invalidationConditions: generateInvalidationConditions(request, signals),
    unansweredQuestions: generateQuestions(request, patterns, signals),
    summary: generateGateSummary(gateStatus, request, evidenceCheck, patterns),
    skillsUsed: [
      "Altcoin Token Profile",
      "Altcoin Breakout Scanner — Spot",
      "Daily Market Overview",
      "BTC Cross-Asset Correlation",
    ],
    generatedAt: now,
    dataAsOf: signals.providerTimestamp,
    version: "1.0.0",
    isPrivate: true,
  };
}

// ---- Reasoning Pattern Analysis ----

interface ReasoningPatterns {
  emotional: string[];
  incomplete: string[];
  indicators: {
    momentumDependent: boolean;
    socialPressure: boolean;
    fomoLanguage: boolean;
    recencyBias: boolean;
    noExitPlan: boolean;
    vagueHorizon: boolean;
  };
}

function analyzeReasoningPatterns(reason: string): ReasoningPatterns {
  const patterns: ReasoningPatterns = {
    emotional: [],
    incomplete: [],
    indicators: {
      momentumDependent: false,
      socialPressure: false,
      fomoLanguage: false,
      recencyBias: false,
      noExitPlan: true,
      vagueHorizon: false,
    },
  };

  // FOMO / social pressure
  const fomoPhrases = [
    "everyone is talking",
    "everyone is buying",
    "don't want to miss",
    "fomo",
    "moon",
    "to the moon",
    "pumping",
    "going parabolic",
    "can't miss this",
    "last chance",
  ];
  for (const phrase of fomoPhrases) {
    if (reason.includes(phrase)) {
      patterns.emotional.push("The stated reason relies on fear of missing out (FOMO) rather than analytical evidence.");
      patterns.indicators.fomoLanguage = true;
      patterns.indicators.socialPressure = true;
      break;
    }
  }

  // Social pressure
  const socialPhrases = [
    "twitter",
    "telegram",
    "reddit",
    "influencer",
    "youtuber",
    "they said",
    "he said",
    "she said",
    "everyone",
    "community",
    "hype",
  ];
  for (const phrase of socialPhrases) {
    if (reason.includes(phrase)) {
      patterns.emotional.push("The thesis references social sentiment or community opinion rather than market structure.");
      patterns.indicators.socialPressure = true;
      break;
    }
  }

  // Momentum dependence
  const momentumPhrases = [
    "keep going",
    "keep pumping",
    "keep rising",
    "momentum",
    "trend is",
    "broke out",
    "breakout",
    "just broke",
    "still going",
  ];
  for (const phrase of momentumPhrases) {
    if (reason.includes(phrase)) {
      patterns.indicators.momentumDependent = true;
    }
  }
  if (patterns.indicators.momentumDependent) {
    patterns.emotional.push("The thesis depends primarily on recent price momentum rather than structural factors.");
  }

  // Recency bias
  const recencyPhrases = ["today", "this week", "just", "recently", "last few"];
  for (const phrase of recencyPhrases) {
    if (reason.includes(phrase)) {
      patterns.indicators.recencyBias = true;
      patterns.emotional.push("The thesis may overweight recent price action (recency bias).");
      break;
    }
  }

  // Missing exit plan
  const exitPhrases = ["sell", "exit", "stop loss", "take profit", "target", "when to get out"];
  const hasExitPlan = exitPhrases.some((p) => reason.includes(p));
  if (!hasExitPlan) {
    patterns.incomplete.push("No exit plan or invalidation condition is stated.");
  } else {
    patterns.indicators.noExitPlan = false;
  }

  // Vague reasoning
  if (reason.length < 30) {
    patterns.incomplete.push("The thesis is very brief — important considerations may be missing.");
  }

  return patterns;
}

// ---- Evidence Comparison ----

interface EvidenceCheck {
  supporting: string[];
  challenging: string[];
  score: number; // -1..1
}

function compareThesisToEvidence(
  request: EntryCheckRequest,
  signals: NormalizedMarketSignals,
  patterns: ReasoningPatterns,
): EvidenceCheck {
  const supporting: string[] = [];
  const challenging: string[] = [];
  let score = 0;

  // Trend alignment
  if (signals.trend > 0.2) {
    supporting.push(`Current trend is positive (${formatSignal(signals.trend)}) — consistent with a bullish thesis.`);
    score += 0.15;
  } else if (signals.trend < -0.2) {
    challenging.push(`Current trend is negative (${formatSignal(signals.trend)}) — this conflicts with a bullish entry.`);
    score -= 0.25;
  }

  // Volatility
  if (signals.volatility > 0.6) {
    challenging.push(`Volatility is elevated (${formatSignal(signals.volatility)}) — entry timing risk is high.`);
    score -= 0.15;
  } else if (signals.volatility < 0.35) {
    supporting.push(`Volatility is moderate (${formatSignal(signals.volatility)}) — entry conditions are more predictable.`);
    score += 0.05;
  }

  // Liquidity
  if (signals.liquidityHealth > 0.6) {
    supporting.push(`Liquidity is healthy (${formatSignal(signals.liquidityHealth)}) — position entry and exit should be manageable.`);
    score += 0.10;
  } else if (signals.liquidityHealth < 0.3) {
    challenging.push(`Liquidity is thin (${formatSignal(signals.liquidityHealth)}) — entering or exiting a position may be difficult.`);
    score -= 0.20;
  }

  // Leverage risk
  if (signals.leverageRisk > 0.6) {
    challenging.push(`Leverage and liquidation risk are elevated — sharp reversals are more likely.`);
    score -= 0.15;
  }

  // Macro context
  if (signals.macroPressure > 0.2) {
    supporting.push("External macro conditions are supportive of risk assets.");
    score += 0.05;
  } else if (signals.macroPressure < -0.2) {
    challenging.push("External macro conditions are creating headwinds for risk assets.");
    score -= 0.10;
  }

  // Breadth
  if (signals.breadth > 0.2) {
    supporting.push("Market breadth is positive — the move is shared across assets.");
    score += 0.05;
  } else if (signals.breadth < -0.3) {
    challenging.push("Market breadth is narrow — the move may lack broad support.");
    score -= 0.10;
  }

  // Momentum acceleration (rate of change)
  if (signals.momentumAcceleration > 0.4) {
    challenging.push("Momentum is accelerating rapidly — chasing at this pace increases reversal risk.");
    score -= 0.10;
  } else if (signals.momentumAcceleration < -0.4) {
    challenging.push("Momentum is decelerating sharply — the thesis may already be weakening.");
    score -= 0.15;
  }

  // Emotional patterns weigh negatively
  if (patterns.emotional.length >= 2) {
    score -= 0.15;
  }

  // Risk tolerance adjustment
  if (request.riskTolerance === "low" && signals.volatility > 0.5) {
    challenging.push("The stated risk tolerance (low) conflicts with current volatility levels.");
    score -= 0.10;
  }

  return {
    supporting,
    challenging,
    score: Math.max(-1, Math.min(1, score)),
  };
}

// ---- Gate Determination ----

function determineGate(
  evidence: EvidenceCheck,
  patterns: ReasoningPatterns,
  signals: NormalizedMarketSignals,
): GateStatus {
  // Insufficient data
  if (signals.confidence < 0.3) return "inspection_required";

  // Heavy emotional reasoning with conflicting evidence
  if (evidence.score < -0.3 && patterns.emotional.length >= 2) return "closed";

  // Strong negative evidence
  if (evidence.score < -0.25) return "closed";

  // Weak evidence + emotional patterns
  if (evidence.score < 0 && patterns.emotional.length >= 2) return "restricted";

  // Mixed evidence
  if (evidence.score < 0.1) return "caution";

  // Strong evidence but emotional patterns exist
  if (patterns.emotional.length >= 2) return "caution";

  // Strong evidence, minimal emotional patterns
  if (evidence.score >= 0.2) return "open";

  return "caution";
}

// ---- Helpers ----

function generateWaitingConditions(
  gate: GateStatus,
  signals: NormalizedMarketSignals,
  patterns: ReasoningPatterns,
): string[] {
  const conditions: string[] = [];

  if (gate === "restricted" || gate === "closed") {
    if (signals.volatility > 0.5) {
      conditions.push("Wait for volatility to stabilize before evaluating entry.");
    }
    if (signals.liquidityHealth < 0.5) {
      conditions.push("Wait for liquidity conditions to improve.");
    }
    if (patterns.indicators.momentumDependent) {
      conditions.push("Wait for a consolidation period to confirm the move has structural support.");
    }
  }

  if (signals.momentumAcceleration > 0.3) {
    conditions.push("Consider waiting for momentum to settle — entering during acceleration increases timing risk.");
  }

  if (conditions.length === 0) {
    conditions.push("Current conditions do not suggest a specific waiting period is necessary, but continue monitoring standard indicators.");
  }

  return conditions;
}

function generateInvalidationConditions(
  request: EntryCheckRequest,
  signals: NormalizedMarketSignals,
): string[] {
  const conditions: string[] = [
    `If ${request.assetId} trend reverses and breaks below its recent support zone.`,
    "If market-wide volatility spikes above critical levels.",
    `If the broader market structure (breadth, liquidity) deteriorates significantly.`,
  ];

  if (signals.liquidityHealth > 0.5) {
    conditions.push(`If ${request.assetId} liquidity drops below healthy levels.`);
  }

  return conditions;
}

function generateQuestions(
  request: EntryCheckRequest,
  patterns: ReasoningPatterns,
  _signals: NormalizedMarketSignals,
): string[] {
  const questions: string[] = [];

  if (patterns.indicators.noExitPlan) {
    questions.push("Under what conditions would you exit this position?");
  }

  if (patterns.indicators.fomoLanguage) {
    questions.push("Are you reacting to evidence or to the fear of missing further gains?");
  }

  if (patterns.indicators.recencyBias) {
    questions.push("How much of the move has already occurred? Are you entering late?");
  }

  if (patterns.indicators.socialPressure) {
    questions.push("Would you still enter this position if you hadn't seen others discussing it?");
  }

  if (request.horizon && ["short", "quick", "fast", "day"].some((w) => request.horizon?.toLowerCase().includes(w))) {
    questions.push("Short time horizons amplify timing risk — is your conviction in the timeframe based on evidence?");
  }

  questions.push("What specific evidence would cause you to reconsider this thesis?");

  return questions;
}

function generateGateSummary(
  gate: GateStatus,
  request: EntryCheckRequest,
  evidence: EvidenceCheck,
  patterns: ReasoningPatterns,
): string {
  const emotionalCount = patterns.emotional.length;

  switch (gate) {
    case "open":
      return `Your thesis for ${request.assetId} is reasonably aligned with current market evidence. ${evidence.supporting.length} factors support your reasoning. Proceed with standard risk management.`;

    case "caution":
      return `Your thesis for ${request.assetId} has some supporting evidence, but ${evidence.challenging.length} factor${evidence.challenging.length !== 1 ? "s" : ""} challenge it${emotionalCount > 0 ? ` and ${emotionalCount} emotional pattern${emotionalCount !== 1 ? "s" : ""} were detected` : ""}. Consider addressing the identified risks before acting.`;

    case "restricted":
      return `Your thesis for ${request.assetId} is weak or incomplete. ${evidence.challenging.length} factors challenge it and ${emotionalCount} emotional pattern${emotionalCount !== 1 ? "s" : ""} were identified. The current evidence does not provide a strong foundation for this entry.`;

    case "closed":
      return `Your stated reason for entering ${request.assetId} conflicts with current market evidence. The thesis relies heavily on ${emotionalCount > 0 ? "emotional factors" : "assumptions not supported by data"}. Re-evaluate before considering this entry.`;

    case "inspection_required":
      return `There is insufficient current data to evaluate your thesis for ${request.assetId}. More market data is needed before a meaningful assessment can be made.`;
  }
}

function formatSignal(value: number): string {
  const pct = Math.round(Math.abs(value) * 100);
  const dir = value >= 0 ? "+" : "-";
  return `${dir}${pct}%`;
}
