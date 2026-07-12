// GET /api/internal/refresh-city
// Invoked by Vercel Cron. Requires CRON_SECRET in production.

import { apiError, apiSuccess, getCityDataMode } from "@/app/api/v1/adapter";
import { getCachedCityState, invalidateCityState } from "@/app/api/v1/city/city-state";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Never leave a production refresh endpoint unauthenticated.
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return apiError("UNAUTHORIZED", "Cron refresh is not authorized.", 401);
  }

  try {
    invalidateCityState();
    const snapshot = await getCachedCityState();
    return apiSuccess({
      refreshedAt: snapshot.cachedAt,
      dataAsOf: snapshot.world.dataAsOf,
      systemStatus: snapshot.world.systemStatus,
      sourceMode: getCityDataMode(),
    });
  } catch (error) {
    console.error("[api/internal/refresh-city] Refresh failed:", error);
    return apiError("CITY_REFRESH_FAILED", "Live city refresh failed.", 503);
  }
}
