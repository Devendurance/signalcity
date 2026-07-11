// ============================================================
// Signal City — Claims Bureau Engine
// Decomposes claims into subclaims, classifies against evidence,
// and produces public ClaimReceipts.
// ============================================================

import type {
  ClaimRequest,
  ClaimReceipt,
  SubClaim,
  SubClaimClassification,
  ClaimClassification,
} from "@shared/contracts/claims";
import type { NormalizedMarketSignals } from "@shared/contracts/signals";
import { routeRequest, type ExecutionPlan } from "../skills/router";

// ---- Claim Decomposition ----

/**
 * Extract measurable subclaims from a natural-language claim.
 * Uses keyword/heuristic extraction — explainable and deterministic.
 */
export function decomposeClaim(claim: string, assetId?: string): SubClaim[] {
  const subclaims: SubClaim[] = [];

  // Pattern 1: Price movement claims
  const pricePatterns = [
    { regex: /(rising|falling|pumping|dumping|surging|crashing|up\s*\d+%|down\s*\d+%)/gi, metric: "price_movement" },
    { regex: /(break\s*(out|through)|new\s*(high|low|ATH|ATL))/gi, metric: "technical_breakout" },
    { regex: /(will\s*(reach|hit|go\s*to)\s*\$?\d+)/gi, metric: "price_prediction" },
  ];

  for (const { regex, metric } of pricePatterns) {
    const match = claim.match(regex);
    if (match) {
      subclaims.push({
        id: crypto.randomUUID(),
        text: extractContext(claim, match[0], 80),
        metric,
        subjectId: assetId ?? "unknown",
        hasCausalLanguage: false,
        classification: "not_verifiable",
        evidence: "Not yet evaluated.",
        unknowns: "Awaiting evidence.",
      });
    }
  }

  // Pattern 2: Volume/activity claims
  const volumePatterns = [
    { regex: /(volume|trading|activity)\s*(is\s*)?(surging|spiking|rising|falling|drying\s*up|declining)/gi, metric: "volume_change" },
    { regex: /(liquidity|depth)\s*(is\s*)?(low|high|falling|rising|thin|deep)/gi, metric: "liquidity_assessment" },
  ];

  for (const { regex, metric } of volumePatterns) {
    const match = claim.match(regex);
    if (match) {
      subclaims.push({
        id: crypto.randomUUID(),
        text: extractContext(claim, match[0], 80),
        metric,
        subjectId: assetId ?? "unknown",
        hasCausalLanguage: false,
        classification: "not_verifiable",
        evidence: "Not yet evaluated.",
        unknowns: "Awaiting evidence.",
      });
    }
  }

  // Pattern 3: Holder/whale claims
  const holderPatterns = [
    { regex: /(whales?|large\s*holders?|institutions?)\s*(are\s*)?(buying|selling|accumulating|distributing)/gi, metric: "holder_behavior" },
    { regex: /(concentration|accumulation|distribution)/gi, metric: "holder_concentration" },
  ];

  for (const { regex, metric } of holderPatterns) {
    const match = claim.match(regex);
    if (match) {
      subclaims.push({
        id: crypto.randomUUID(),
        text: extractContext(claim, match[0], 80),
        metric,
        subjectId: assetId ?? "unknown",
        hasCausalLanguage: match[0].toLowerCase().includes("because"),
        classification: "not_verifiable",
        evidence: "Not yet evaluated.",
        unknowns: "Awaiting evidence.",
      });
    }
  }

  // Pattern 4: Causal claims
  const causalPattern = /(because|due\s*to|since|caused\s*by|driven\s*by|as\s*a\s*result\s*of)/gi;
  const causalMatch = claim.match(causalPattern);
  if (causalMatch && subclaims.length > 0) {
    // Mark existing subclaims that are part of a causal chain
    for (const sc of subclaims) {
      if (claim.toLowerCase().includes(sc.text.toLowerCase().replace(/\.\.\./g, ""))) {
        sc.hasCausalLanguage = true;
      }
    }
  }

  // Pattern 5: Comparison/valuation claims
  const compPatterns = [
    { regex: /(undervalued|overvalued|cheap|expensive|fair\s*value)/gi, metric: "valuation_assessment" },
    { regex: /(compared\s*to|relative\s*to|vs\.?\s*\w+)/gi, metric: "relative_comparison" },
  ];

  for (const { regex, metric } of compPatterns) {
    const match = claim.match(regex);
    if (match) {
      subclaims.push({
        id: crypto.randomUUID(),
        text: extractContext(claim, match[0], 80),
        metric,
        subjectId: assetId ?? "unknown",
        hasCausalLanguage: false,
        classification: "not_verifiable",
        evidence: "Not yet evaluated.",
        unknowns: "Awaiting evidence.",
      });
    }
  }

  // If no patterns matched, create a single generic subclaim
  if (subclaims.length === 0) {
    subclaims.push({
      id: crypto.randomUUID(),
      text: claim.length > 120 ? claim.slice(0, 117) + "..." : claim,
      metric: "general_claim",
      subjectId: assetId ?? "unknown",
      hasCausalLanguage: /because|due to|caused by/i.test(claim),
      classification: "not_verifiable",
      evidence: "Not yet evaluated.",
      unknowns: "Awaiting evidence.",
    });
  }

  return subclaims;
}

// ---- Subclaim Classification ----

export interface SubClaimEvidence {
  signals: NormalizedMarketSignals;
  /** Additional provider evidence relevant to this subclaim. */
  contextualEvidence?: Record<string, unknown>;
}

/**
 * Classify a single subclaim against available evidence.
 * Deterministic — no LLM involved in the classification decision.
 */
export function classifySubClaim(
  subClaim: SubClaim,
  evidence: SubClaimEvidence,
): SubClaimClassification {
  const { signals, contextualEvidence } = evidence;
  const text = subClaim.text.toLowerCase();

  // --- Price movement claims ---
  if (subClaim.metric === "price_movement") {
    if (subClaim.hasCausalLanguage) {
      // "BTC is falling because ETFs are selling"
      // We can confirm the observation (trend), but the cause is complex
      if (signals.trend < -0.2 && text.includes("falling")) {
        return "observation_supported_cause_unsupported";
      }
      if (signals.trend > 0.2 && text.includes("rising")) {
        return "observation_supported_cause_unsupported";
      }
    }

    // Simple direction claim
    if (text.includes("rising") || text.includes("pumping") || text.includes("surging")) {
      if (signals.trend > 0.3) return "supported";
      if (signals.trend > 0.1) return "partially_supported";
      if (signals.trend < -0.2) return "unsupported";
      return "weakly_supported";
    }
    if (text.includes("falling") || text.includes("dumping") || text.includes("crashing")) {
      if (signals.trend < -0.3) return "supported";
      if (signals.trend < -0.1) return "partially_supported";
      if (signals.trend > 0.2) return "unsupported";
      return "weakly_supported";
    }
  }

  // --- Price prediction claims ---
  if (subClaim.metric === "price_prediction") {
    return "prediction_not_verifiable";
  }

  // --- Volume/activity claims ---
  if (subClaim.metric === "volume_change") {
    if (text.includes("surging") || text.includes("spiking") || text.includes("rising")) {
      if (signals.liquidityHealth > 0.6) return "supported";
      if (signals.liquidityHealth > 0.4) return "partially_supported";
      if (signals.liquidityHealth < 0.3) return "unsupported";
      return "weakly_supported";
    }
    if (text.includes("falling") || text.includes("drying") || text.includes("declining")) {
      if (signals.liquidityHealth < 0.3) return "supported";
      if (signals.liquidityHealth < 0.5) return "partially_supported";
      if (signals.liquidityHealth > 0.7) return "unsupported";
      return "weakly_supported";
    }
  }

  // --- Holder/whale claims ---
  if (subClaim.metric === "holder_behavior" || subClaim.metric === "holder_concentration") {
    if (subClaim.hasCausalLanguage) {
      // "Whales are buying because they know something"
      return "opinion_as_fact";
    }

    // Check if we have holder concentration data
    if (contextualEvidence?.holderConcentration !== undefined) {
      const concentration = contextualEvidence.holderConcentration as number;
      if (text.includes("accumulating") || text.includes("buying")) {
        if (concentration > 0.6) return "supported";
        if (concentration > 0.4) return "partially_supported";
        return "weakly_supported";
      }
    }

    // Without specific holder data, this is partially verifiable at best
    return "weakly_supported";
  }

  // --- Valuation claims ---
  if (subClaim.metric === "valuation_assessment") {
    return "opinion_as_fact";
  }

  // --- Comparison claims ---
  if (subClaim.metric === "relative_comparison") {
    if (signals.confidence > 0.5) return "partially_supported";
    return "weakly_supported";
  }

  // --- Liquidity claims ---
  if (subClaim.metric === "liquidity_assessment") {
    if (text.includes("low") || text.includes("thin") || text.includes("falling")) {
      if (signals.liquidityHealth < 0.3) return "supported";
      if (signals.liquidityHealth < 0.5) return "partially_supported";
      if (signals.liquidityHealth > 0.6) return "unsupported";
    }
    if (text.includes("high") || text.includes("deep") || text.includes("rising")) {
      if (signals.liquidityHealth > 0.6) return "supported";
      if (signals.liquidityHealth > 0.4) return "partially_supported";
    }
  }

  // Generic: if we have decent confidence in the data
  if (signals.confidence > 0.5) return "partially_supported";
  if (signals.confidence > 0.3) return "weakly_supported";

  return "not_verifiable";
}

// ---- Overall Classification Aggregation ----

/**
 * Aggregate subclaim classifications into an overall claim classification.
 */
export function aggregateClassification(
  subClaims: SubClaim[],
): ClaimClassification {
  if (subClaims.length === 0) return "not_currently_verifiable";

  const counts = {
    supported: 0,
    partially_supported: 0,
    weakly_supported: 0,
    unsupported: 0,
    not_verifiable: 0,
    opinion_as_fact: 0,
    prediction_not_verifiable: 0,
    observation_supported_cause_unsupported: 0,
  };

  for (const sc of subClaims) {
    switch (sc.classification) {
      case "supported": counts.supported++; break;
      case "partially_supported": counts.partially_supported++; break;
      case "weakly_supported": counts.weakly_supported++; break;
      case "unsupported": counts.unsupported++; break;
      case "not_verifiable": counts.not_verifiable++; break;
      case "opinion_as_fact": counts.opinion_as_fact++; break;
      case "prediction_not_verifiable": counts.prediction_not_verifiable++; break;
      case "observation_supported_cause_unsupported": counts.observation_supported_cause_unsupported++; break;
    }
  }

  // If the claim is entirely predictions or opinions
  if (counts.prediction_not_verifiable + counts.opinion_as_fact === subClaims.length) {
    if (counts.prediction_not_verifiable > 0) return "prediction_not_currently_verifiable";
    return "opinion_presented_as_fact";
  }

  // If any subclaim shows observation supported but cause unsupported
  if (counts.observation_supported_cause_unsupported > 0) {
    return "observation_supported_but_claimed_cause_unsupported";
  }

  // Majority rules with weighting
  const totalClassified = subClaims.length - counts.not_verifiable;
  if (totalClassified === 0) return "not_currently_verifiable";

  const supportRatio = (counts.supported + counts.partially_supported * 0.7 + counts.weakly_supported * 0.3) / totalClassified;

  if (supportRatio >= 0.8) return "supported";
  if (supportRatio >= 0.6) return "partially_supported";
  if (supportRatio >= 0.3) return "weakly_supported";

  return "unsupported_by_current_evidence";
}

// ---- Full Investigation Pipeline ----

export interface InvestigationResult {
  receipt: ClaimReceipt;
  executionPlan: ExecutionPlan;
}

/**
 * Run the full Claims Bureau pipeline:
 * decompose → route → classify → aggregate → receipt.
 */
export function investigateClaim(
  request: ClaimRequest,
  evidence: SubClaimEvidence,
): InvestigationResult {
  const runId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Step 1: Decompose
  const subClaims = decomposeClaim(request.claim, request.assetId);

  // Step 2: Route to skills
  const executionPlan = routeRequest("claim-investigation", request.assetId ?? "unknown");

  // Step 3: Classify each subclaim
  const classified = subClaims.map((sc) => ({
    ...sc,
    classification: classifySubClaim(sc, evidence),
  }));

  // Step 4: Aggregate
  const classification = aggregateClassification(classified);

  // Step 5: Generate finding text
  const { supporting, weakening, unknowns, strengthening } = analyzeEvidence(classified);

  // Step 6: Build receipt
  const receipt: ClaimReceipt = {
    id: crypto.randomUUID(),
    runId,
    originalClaim: request.claim,
    sourceUrl: request.sourceUrl,
    subClaims: classified,
    classification,
    finding: generateFinding(classification, classified),
    supportingEvidence: supporting,
    weakeningEvidence: weakening,
    unknowns,
    strengtheningConditions: strengthening,
    skillsUsed: executionPlan.steps.map((s) => s.skill),
    generatedAt: now,
    dataAsOf: evidence.signals.providerTimestamp,
    version: "1.0.0",
  };

  return { receipt, executionPlan };
}

// ---- Evidence Analysis ----

function analyzeEvidence(subClaims: SubClaim[]): {
  supporting: string[];
  weakening: string[];
  unknowns: string[];
  strengthening: string[];
} {
  const supporting: string[] = [];
  const weakening: string[] = [];
  const unknowns: string[] = [];
  const strengthening: string[] = [];

  for (const sc of subClaims) {
    switch (sc.classification) {
      case "supported":
        supporting.push(`${sc.metric}: ${sc.text}`);
        break;
      case "partially_supported":
        supporting.push(`${sc.metric}: Partially confirmed — ${sc.text}`);
        unknowns.push(`Full verification of "${sc.text}" requires more specific data.`);
        break;
      case "weakly_supported":
        weakening.push(`${sc.metric}: Evidence is weak for "${sc.text}".`);
        strengthening.push(`Stronger evidence on ${sc.metric} would clarify this claim.`);
        break;
      case "unsupported":
        weakening.push(`${sc.metric}: Current evidence does not support "${sc.text}".`);
        break;
      case "opinion_as_fact":
        weakening.push(`${sc.metric}: "${sc.text}" is an opinion presented as fact.`);
        break;
      case "prediction_not_verifiable":
        unknowns.push(`${sc.metric}: "${sc.text}" is a prediction — not currently verifiable with available data.`);
        break;
      case "observation_supported_cause_unsupported":
        supporting.push(`Observation confirmed, but the claimed cause is unverified.`);
        unknowns.push(`What caused ${sc.metric}? The data shows the effect but not the cause.`);
        strengthening.push(`Evidence linking cause to effect would strengthen this claim.`);
        break;
      case "not_verifiable":
        unknowns.push(`${sc.metric}: "${sc.text}" cannot be verified with current evidence.`);
        break;
    }
  }

  return { supporting, weakening, unknowns, strengthening };
}

// ---- Finding Generation ----

function generateFinding(
  classification: ClaimClassification,
  subClaims: SubClaim[],
): string {
  const classified = subClaims.filter(
    (sc) => sc.classification !== "not_verifiable",
  );

  switch (classification) {
    case "supported":
      return `The claim is supported by current evidence. ${classified.length} measurable component${classified.length !== 1 ? "s" : ""} were evaluated and the evidence aligns with the claim.`;

    case "partially_supported":
      return `The claim is partially supported. Some components align with current evidence, but gaps or uncertainties remain.`;

    case "weakly_supported":
      return `The claim is weakly supported. Limited evidence aligns with the claim, and important components could not be confirmed.`;

    case "unsupported_by_current_evidence":
      return `The claim is not supported by current evidence. The available data does not confirm the key assertions.`;

    case "not_currently_verifiable":
      return `This claim cannot be verified with currently available data. The metrics needed to evaluate it are not accessible or do not exist.`;

    case "opinion_presented_as_fact":
      return `This claim expresses an opinion as though it were a verifiable fact. The underlying assertions are subjective and cannot be evaluated against market data.`;

    case "prediction_not_currently_verifiable":
      return `This claim makes a prediction about future market conditions. Predictions cannot be verified with current data. The reasoning quality can be assessed separately.`;

    case "observation_supported_but_claimed_cause_unsupported":
      return `The observed market condition described in the claim is supported, but the stated cause cannot be confirmed with available evidence. The effect is visible; the cause attribution is speculative.`;
  }
}

// ---- Utility ----

function extractContext(text: string, match: string, charWindow: number): string {
  const idx = text.indexOf(match);
  if (idx === -1) return match;

  const start = Math.max(0, idx - Math.floor(charWindow / 2));
  const end = Math.min(text.length, idx + match.length + Math.floor(charWindow / 2));
  let excerpt = text.slice(start, end).trim();

  if (start > 0) excerpt = "..." + excerpt;
  if (end < text.length) excerpt = excerpt + "...";

  return excerpt;
}
