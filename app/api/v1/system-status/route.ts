// GET /api/v1/system-status

import { getAdapter, apiSuccess, apiError } from "../adapter";

export async function GET(): Promise<Response> {
  try {
    const adapter = getAdapter();
    const cmcHealthy = await adapter.healthCheck();

    return apiSuccess({
      status: cmcHealthy ? "operational" : "degraded",
      timestamp: new Date().toISOString(),
      components: {
        api: { status: "operational" },
        coinmarketcap: {
          status: cmcHealthy ? "operational" : "degraded",
          message: cmcHealthy
            ? "CMC connection healthy"
            : "CMC connection unavailable — using fixture data",
        },
        cityState: { status: "operational", freshness: "fresh" },
      },
      version: "1.0.0",
    });
  } catch (error) {
    console.error("[api/system-status] Failed:", error);
    return apiError("STATUS_FAILED", "Failed to retrieve system status.");
  }
}
