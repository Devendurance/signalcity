// ============================================================
// Signal City — City API Routes
// GET /api/v1/city — full city state (cached)
// GET /api/v1/city/:districtId — single district (cached)
// ============================================================

import { Router } from "express";
import type { AppContext } from "../../server";
import { DistrictStateBuilder, DEFAULT_DISTRICTS } from "../../market-engine/district-builder";

export function cityRouter(ctx: AppContext): Router {
  const router = Router();
  const builder = new DistrictStateBuilder(ctx.adapter);

  // GET /api/v1/city — full city state
  router.get("/", async (_req, res) => {
    try {
      const cached = ctx.cache.getCityState();

      // Always return the cached state, but with freshness headers
      if (cached.state) {
        res.setHeader("X-Cache-Freshness", cached.freshness);
        res.setHeader("X-Cache-Cached-At", cached.cachedAt ?? "");
        res.json({
          success: true,
          data: cached.state,
          meta: {
            freshness: cached.freshness,
            cachedAt: cached.cachedAt,
            generatedAt: cached.state.updatedAt,
          },
        });

        // If stale or aging, trigger a background refresh
        if (cached.freshness === "stale" || cached.freshness === "aging") {
          ctx.refresher.refresh().catch((err) => {
            console.error("[city] Background refresh failed:", err);
          });
        }
        return;
      }

      // No cache — build fresh and cache it
      const { world, receipts } = await builder.buildCity(DEFAULT_DISTRICTS);

      ctx.cache.setCityState(world);
      for (const district of world.districts) {
        ctx.cache.setDistrict(district.id, district);
      }
      for (const receipt of receipts) {
        ctx.cache.setReceipt(receipt.id, receipt);
      }

      res.setHeader("X-Cache-Freshness", "fresh");
      res.setHeader("X-Cache-Cached-At", new Date().toISOString());
      res.json({
        success: true,
        data: world,
        meta: {
          freshness: "fresh",
          cachedAt: new Date().toISOString(),
          generatedAt: world.updatedAt,
        },
      });
    } catch (error) {
      console.error("[city] Failed to build city state:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "CITY_BUILD_FAILED",
          message: "Failed to generate city state. Check logs for details.",
        },
      });
    }
  });

  // GET /api/v1/city/:districtId — single district
  router.get("/:districtId", async (req, res) => {
    try {
      const { districtId } = req.params;

      // Check cache first
      const cached = ctx.cache.getDistrict(districtId);
      if (cached.state && cached.freshness !== "stale") {
        res.setHeader("X-Cache-Freshness", cached.freshness);
        res.json({
          success: true,
          data: cached.state,
          meta: {
            freshness: cached.freshness,
            receiptId: cached.state.receiptId,
            generatedAt: cached.state.generatedAt,
          },
        });
        return;
      }

      // Build fresh
      const config = DEFAULT_DISTRICTS.find((d) => d.id === districtId);
      if (!config) {
        res.status(404).json({
          success: false,
          error: {
            code: "DISTRICT_NOT_FOUND",
            message: `District "${districtId}" not found. Available: ${DEFAULT_DISTRICTS.map((d) => d.id).join(", ")}`,
          },
        });
        return;
      }

      const { district, receipt } = await builder.buildDistrict(config);
      ctx.cache.setDistrict(districtId, district);
      ctx.cache.setReceipt(receipt.id, receipt);

      res.setHeader("X-Cache-Freshness", "fresh");
      res.json({
        success: true,
        data: district,
        meta: {
          freshness: "fresh",
          receiptId: receipt.id,
          generatedAt: district.generatedAt,
        },
      });
    } catch (error) {
      console.error(`[city] Failed to build district ${req.params.districtId}:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: "DISTRICT_BUILD_FAILED",
          message: `Failed to generate district state for "${req.params.districtId}".`,
        },
      });
    }
  });

  return router;
}
