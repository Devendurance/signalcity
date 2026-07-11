// ============================================================
// Signal City — Entry Gate Routes
// POST /api/v1/entry-checks — evaluate a trade thesis
// ============================================================

import { Router } from "express";
import type { AppContext } from "../../server";
import { evaluateEntry } from "../../entry-gate/evaluator";
import { normalizeSignals } from "../../normalization/engine";
import type { NormalizationInput } from "../../normalization/engine";

const entryStore = new Map<string, unknown>();

/** Default fixture fallback when live data is unavailable. */
const FALLBACK_RAW = {
  timestamp: new Date().toISOString(),
  data: {
    marketTrend: 0.2, breadth: 0.15, volatility: 0.4, leverageRisk: 0.3,
    liquidityHealth: 0.65, macroPressure: 0.1, sentiment: 0.25,
    narrativeHeat: 0.4, momentumAcceleration: 0.05,
  },
};

export function entryGateRouter(ctx: AppContext): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const { assetId, intendedAction, reason, horizon, riskTolerance, positionSizePct } = req.body;

      if (!assetId || !reason) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_REQUEST", message: "assetId and reason are required." },
        });
        return;
      }

      // Fetch live asset data (fall back to fixture on error)
      let rawInput: NormalizationInput;
      try {
        rawInput = await ctx.adapter.fetchAssetData(assetId.toUpperCase());
      } catch {
        rawInput = {
          raw: FALLBACK_RAW,
          subjectId: assetId,
          scope: "asset",
          source: "coinmarketcap",
          providerTimestamp: new Date().toISOString(),
        };
      }

      const signals = normalizeSignals(rawInput);

      const result = evaluateEntry({
        request: {
          assetId,
          intendedAction: intendedAction ?? "Buy spot",
          reason,
          horizon: horizon ?? "medium",
          riskTolerance: riskTolerance ?? "medium",
          positionSizePct,
        },
        signals,
      });

      entryStore.set(result.id, result);

      res.status(201).json({
        success: true,
        data: result,
        meta: { resultId: result.id, generatedAt: result.generatedAt },
      });
    } catch (error) {
      console.error("[entry-gate] Error:", error);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL", message: "Entry check failed." },
      });
    }
  });

  router.get("/:id", async (req, res) => {
    const result = entryStore.get(req.params.id);
    if (!result) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: `Entry check "${req.params.id}" not found.` },
      });
      return;
    }
    res.json({ success: true, data: result });
  });

  return router;
}
