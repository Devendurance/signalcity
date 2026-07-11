// POST /api/v1/claims

import { getAdapter, apiSuccess, apiError } from "../adapter";
import { investigateClaim } from "@engine/claims/bureau";
import { normalizeSignals } from "@engine/normalization/engine";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { claim, sourceUrl, assetId } = body;

    if (!claim || typeof claim !== "string" || claim.trim().length === 0) {
      return apiError("INVALID_CLAIM", "A non-empty claim string is required.", 400);
    }

    // Build evidence from current market signals
    const adapter = getAdapter();
    let rawInput;
    try {
      if (assetId) {
        rawInput = await adapter.fetchAssetData(assetId.toUpperCase());
      } else {
        rawInput = await adapter.fetchMarketOverview("global");
      }
    } catch {
      // Fallback: use empty signals
      rawInput = {
        raw: { timestamp: new Date().toISOString(), data: {} },
        subjectId: assetId ?? "unknown",
        scope: assetId ? "asset" as const : "global" as const,
        source: "coinmarketcap",
        providerTimestamp: new Date().toISOString(),
      };
    }

    const signals = normalizeSignals(rawInput);

    const { receipt } = investigateClaim(
      { claim: claim.trim(), sourceUrl, assetId },
      { signals },
    );

    return apiSuccess(receipt, { receiptId: receipt.id });
  } catch (error) {
    console.error("[api/claims] Failed:", error);
    return apiError("CLAIMS_FAILED", "Claims processing failed.");
  }
}
