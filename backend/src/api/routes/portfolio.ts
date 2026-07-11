// ============================================================
// Signal City — Portfolio Clinic Routes
// POST /api/v1/portfolios — analyze a portfolio
// ============================================================

import { Router } from "express";
import type { AppContext } from "../../server";
import { diagnosePortfolio } from "../../portfolio/clinic";
import { normalizeSignals } from "../../normalization/engine";
import type { HoldingEntry } from "@shared/contracts/portfolio";

const portfolioStore = new Map<string, unknown>();

const FALLBACK_RAW = {
  timestamp: new Date().toISOString(),
  data: {
    marketTrend: 0.2, breadth: 0.15, volatility: 0.4, leverageRisk: 0.3,
    liquidityHealth: 0.65, macroPressure: 0.1, sentiment: 0.25,
    narrativeHeat: 0.4, momentumAcceleration: 0.05,
  },
};

export function portfolioRouter(ctx: AppContext): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const { holdings } = req.body;

      if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PORTFOLIO",
            message: "A non-empty holdings array is required.",
          },
        });
        return;
      }

      // Fetch per-asset signals (live with fallback)
      const assetSignals = new Map();
      for (const h of holdings as HoldingEntry[]) {
        try {
          const rawInput = await ctx.adapter.fetchAssetData(h.assetId.toUpperCase());
          assetSignals.set(h.assetId, normalizeSignals(rawInput));
        } catch {
          assetSignals.set(
            h.assetId,
            normalizeSignals({
              raw: FALLBACK_RAW,
              subjectId: h.assetId,
              scope: "asset",
              source: "coinmarketcap",
              providerTimestamp: new Date().toISOString(),
            }),
          );
        }
      }

      // Fetch global context
      let globalSignals;
      try {
        const globalInput = await ctx.adapter.fetchMarketOverview("global");
        globalSignals = normalizeSignals(globalInput);
      } catch {
        globalSignals = normalizeSignals({
          raw: FALLBACK_RAW,
          subjectId: "global",
          scope: "global",
          source: "coinmarketcap",
          providerTimestamp: new Date().toISOString(),
        });
      }

      const report = diagnosePortfolio({
        holdings: holdings as HoldingEntry[],
        assetSignals,
        globalSignals,
      });

      portfolioStore.set(report.id, report);

      res.status(201).json({
        success: true,
        data: report,
        meta: { reportId: report.id, generatedAt: report.generatedAt },
      });
    } catch (error) {
      console.error("[portfolio] Error:", error);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL", message: "Portfolio analysis failed." },
      });
    }
  });

  router.get("/:id", async (req, res) => {
    const report = portfolioStore.get(req.params.id);
    if (!report) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: `Portfolio report "${req.params.id}" not found.` },
      });
      return;
    }
    res.json({ success: true, data: report });
  });

  return router;
}
