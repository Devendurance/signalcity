// ============================================================
// Signal City — Cached Canonical City State
// Next Data Cache persists across Vercel function instances.
// ============================================================

import { revalidateTag, unstable_cache } from "next/cache";
import type { CityWorldState } from "@shared/contracts";
import { DistrictStateBuilder } from "@engine/market-engine/district-builder";
import { getAdapter, getCityDataMode } from "../adapter";

export const CITY_STATE_TAG = "signal-city-state";
export const CITY_STATE_REVALIDATE_SECONDS = 300;

export interface CachedCityState {
  world: CityWorldState;
  mode: ReturnType<typeof getCityDataMode>;
  cachedAt: string;
}

async function buildCityState(): Promise<CachedCityState> {
  const builder = new DistrictStateBuilder(getAdapter());
  const { world } = await builder.buildCity();
  return { world, mode: getCityDataMode(), cachedAt: new Date().toISOString() };
}

const readCachedCityState = unstable_cache(
  buildCityState,
  ["signal-city", "v1"],
  { revalidate: CITY_STATE_REVALIDATE_SECONDS, tags: [CITY_STATE_TAG] },
);

export async function getCachedCityState(): Promise<CachedCityState> {
  return readCachedCityState();
}

/** Mark the snapshot stale. The following read rebuilds it from CMC. */
export function invalidateCityState(): void {
  revalidateTag(CITY_STATE_TAG, "max");
}
