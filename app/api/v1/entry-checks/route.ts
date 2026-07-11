// POST /api/v1/entry-checks

import { getAdapter, apiSuccess, apiError } from "../adapter";
import { evaluateEntry } from "@engine/entry-gate/evaluator";
import { normalizeSignals } from "@engine/normalization/engine";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { assetId, intendedAction, reason, horizon, riskTolerance } = body;

    if (!assetId || !reason) {
      return apiError("INVALID_REQUEST", "assetId and reason are required.", 400);
    }

    const adapter = getAdapter();
    let rawInput;
    try {
      rawInput = await adapter.fetchAssetData(assetId.toUpperCase());
    } catch {
      rawInput = {
        raw: { timestamp: new Date().toISOString(), data: {} },
        subjectId: assetId,
        scope: "asset" as const,
        source: "coinmarketcap",
        providerTimestamp: new Date().toISOString(),
      };
    }

    const signals = normalizeSignals(rawInput);

    const result = evaluateEntry({
      request: {
        assetId: assetId.trim().toUpperCase(),
        intendedAction: intendedAction ?? "Buy spot",
        reason: reason.trim(),
        horizon: horizon ?? "medium",
        riskTolerance: riskTolerance ?? "medium",
      },
      signals,
    });

    return apiSuccess(result);
  } catch (error) {
    console.error("[api/entry-checks] Failed:", error);
    return apiError("ENTRY_CHECK_FAILED", "Entry check failed.");
  }
}
