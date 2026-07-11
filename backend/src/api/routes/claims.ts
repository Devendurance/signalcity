// ============================================================
// Signal City — Claims Bureau Routes
// POST /api/v1/claims — investigate a claim
// ============================================================

import { Router } from "express";
import type { AppContext } from "../../server";
import { investigateClaim } from "../../claims/bureau";
import { normalizeSignals } from "../../normalization/engine";

const claimStore = new Map<string, unknown>();

const FALLBACK_RAW = {
  timestamp: new Date().toISOString(),
  data: {
    marketTrend: 0.2, breadth: 0.15, volatility: 0.4, leverageRisk: 0.3,
    liquidityHealth: 0.65, macroPressure: 0.1, sentiment: 0.25,
    narrativeHeat: 0.4, momentumAcceleration: 0.05,
  },
};

export function claimsRouter(ctx: AppContext): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const { claim, sourceUrl, assetId, sectorId, horizon, context } = req.body;

      if (!claim || typeof claim !== "string" || claim.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CLAIM",
            message: "A non-empty claim string is required.",
          },
        });
        return;
      }

      // Fetch evidence: try live data, fall back to fixture
      let signals;
      try {
        if (assetId) {
          const rawInput = await ctx.adapter.fetchAssetData(assetId.toUpperCase());
          signals = normalizeSignals(rawInput);
        } else {
          const rawInput = await ctx.adapter.fetchMarketOverview("global");
          signals = normalizeSignals(rawInput);
        }
      } catch {
        signals = normalizeSignals({
          raw: FALLBACK_RAW,
          subjectId: assetId ?? "unknown",
          scope: assetId ? "asset" : "global",
          source: "coinmarketcap",
          providerTimestamp: new Date().toISOString(),
        });
      }

      const { receipt } = investigateClaim(
        {
          claim: claim.trim(),
          sourceUrl,
          assetId,
          sectorId,
          horizon,
          context,
        },
        { signals },
      );

      claimStore.set(receipt.id, receipt);

      res.status(201).json({
        success: true,
        data: receipt,
        meta: {
          receiptId: receipt.id,
          generatedAt: receipt.generatedAt,
        },
      });
    } catch (error) {
      console.error("[claims] Error:", error);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL", message: "Claims processing failed." },
      });
    }
  });

  router.get("/:id", async (req, res) => {
    const receipt = claimStore.get(req.params.id);
    if (!receipt) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: `Claim receipt "${req.params.id}" not found.` },
      });
      return;
    }
    res.json({ success: true, data: receipt });
  });

  return router;
}
