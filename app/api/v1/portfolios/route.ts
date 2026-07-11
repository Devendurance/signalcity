// POST /api/v1/portfolios

import { getAdapter, apiSuccess, apiError } from "../adapter";
import { diagnosePortfolio } from "@engine/portfolio/clinic";
import { normalizeSignals } from "@engine/normalization/engine";
import type { HoldingEntry } from "@shared/contracts/portfolio";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { holdings } = body as { holdings: HoldingEntry[] };

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return apiError("INVALID_PORTFOLIO", "A non-empty holdings array is required.", 400);
    }

    const adapter = getAdapter();

    // Fetch per-asset signals
    const assetSignals = new Map();
    for (const h of holdings) {
      try {
        const rawInput = await adapter.fetchAssetData(h.assetId.toUpperCase());
        assetSignals.set(h.assetId, normalizeSignals(rawInput));
      } catch {
        assetSignals.set(h.assetId, normalizeSignals({
          raw: { timestamp: new Date().toISOString(), data: {} },
          subjectId: h.assetId,
          scope: "asset" as const,
          source: "coinmarketcap",
          providerTimestamp: new Date().toISOString(),
        }));
      }
    }

    // Global context
    let globalSignals;
    try {
      const globalInput = await adapter.fetchMarketOverview("global");
      globalSignals = normalizeSignals(globalInput);
    } catch {
      globalSignals = normalizeSignals({
        raw: { timestamp: new Date().toISOString(), data: {} },
        subjectId: "global",
        scope: "global" as const,
        source: "coinmarketcap",
        providerTimestamp: new Date().toISOString(),
      });
    }

    const report = diagnosePortfolio({ holdings, assetSignals, globalSignals });
    return apiSuccess(report);
  } catch (error) {
    console.error("[api/portfolios] Failed:", error);
    return apiError("PORTFOLIO_FAILED", "Portfolio analysis failed.");
  }
}
