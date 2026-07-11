// ============================================================
// Signal City — System Status Route
// GET /api/v1/system-status — full system health
// ============================================================

import { Router } from "express";
import type { AppContext } from "../../server";

export function statusRouter(ctx: AppContext): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const cmcHealthy = await ctx.adapter.healthCheck();
    const refreshStatus = ctx.refresher.getStatus();
    const cacheStats = ctx.cache.getStats();
    const cityFreshness = ctx.cache.getCityState().freshness;

    res.json({
      success: true,
      data: {
        status: ctx.cache.getSystemStatus(),
        timestamp: new Date().toISOString(),
        components: {
          api: { status: "operational", latency: "ok" },
          database: { status: "operational" },
          coinmarketcap: {
            status: cmcHealthy ? "operational" : "degraded",
            message: cmcHealthy
              ? "CMC connection healthy"
              : "CMC connection unavailable — using fixture data",
          },
          scheduler: {
            status: refreshStatus.running ? "operational" : "stopped",
            running: refreshStatus.running,
            refreshCount: refreshStatus.refreshCount,
            errorCount: refreshStatus.errorCount,
            lastAttempt: refreshStatus.lastAttempt,
            lastSuccess: refreshStatus.lastSuccess,
            lastError: refreshStatus.lastError,
            intervalMs: refreshStatus.intervalMs,
          },
          cache: {
            status: "operational",
            entries: cacheStats.entries,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            staleHits: cacheStats.staleHits,
          },
          cityState: {
            status: "operational",
            freshness: cityFreshness,
            lastSuccessfulRefresh: refreshStatus.lastSuccess,
          },
        },
        version: "1.0.0",
      },
    });
  });

  return router;
}
