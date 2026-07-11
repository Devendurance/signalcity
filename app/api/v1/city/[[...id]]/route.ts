// GET /api/v1/city — full city state
// GET /api/v1/city/[id] — single district

import { getAdapter, apiSuccess, apiError } from "../../adapter";
import { DistrictStateBuilder, DEFAULT_DISTRICTS } from "@engine/market-engine/district-builder";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id?: string }> },
): Promise<Response> {
  try {
    const adapter = getAdapter();
    const builder = new DistrictStateBuilder(adapter);
    const { id } = await params;

    if (id) {
      // Single district
      const config = DEFAULT_DISTRICTS.find((d) => d.id === id);
      if (!config) {
        return apiError(
          "DISTRICT_NOT_FOUND",
          `District "${id}" not found. Available: ${DEFAULT_DISTRICTS.map((d) => d.id).join(", ")}`,
          404,
        );
      }
      const { district } = await builder.buildDistrict(config);
      return apiSuccess(district);
    }

    // Full city
    const { world } = await builder.buildCity();
    return apiSuccess(world);

  } catch (error) {
    console.error("[api/city] Failed:", error);
    return apiError("CITY_BUILD_FAILED", "Failed to generate city state.");
  }
}
