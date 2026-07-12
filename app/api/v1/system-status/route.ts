// GET /api/v1/system-status

import { getAdapter, getCityDataMode, apiSuccess, apiError } from "../adapter";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const mode = getCityDataMode();
    const adapter = getAdapter();
    const cmcHealthy = await adapter.healthCheck();

    return apiSuccess({
      status: cmcHealthy ? "operational" : "degraded",
      timestamp: new Date().toISOString(),
      components: {
        api: { status: "operational" },
        coinmarketcap: {
          status: cmcHealthy ? "operational" : "degraded",
          sourceMode: mode,
          message: cmcHealthy
            ? `CoinMarketCap ${mode} provider healthy`
            : "CoinMarketCap provider unavailable; no synthetic production fallback is served.",
        },
        cityState: { status: cmcHealthy ? "operational" : "degraded", cache: "Next Data Cache", refreshIntervalSeconds: 300 },
      },
      version: "1.1.0",
    });
  } catch (error) {
    console.error("[api/system-status] Failed:", error);
    return apiError("STATUS_FAILED", "Failed to retrieve system status.", 503);
  }
}
