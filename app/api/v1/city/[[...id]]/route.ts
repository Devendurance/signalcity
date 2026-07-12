// GET /api/v1/city — cached canonical city state
// GET /api/v1/city/[id] — one district from that same snapshot

import { apiSuccess, apiError } from "../../adapter";
import { getCachedCityState } from "../city-state";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id?: string[] }> },
): Promise<Response> {
  try {
    const [{ world, mode, cachedAt }, resolved] = await Promise.all([getCachedCityState(), params]);
    const districtId = resolved.id?.[0];

    if (districtId) {
      const district = world.districts.find((candidate) => candidate.id === districtId);
      if (!district) {
        return apiError(
          "DISTRICT_NOT_FOUND",
          `District "${districtId}" not found. Available: ${world.districts.map((d) => d.id).join(", ")}`,
          404,
        );
      }
      return apiSuccess(district, { sourceMode: mode, cachedAt });
    }

    return apiSuccess(world, { sourceMode: mode, cachedAt });
  } catch (error) {
    console.error("[api/city] Failed to generate canonical city state:", error);
    return apiError("CITY_DATA_UNAVAILABLE", "Live city data is currently unavailable. Please retry shortly.", 503);
  }
}
