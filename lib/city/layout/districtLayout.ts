import type { AssetId } from "@/lib/city/assets/registry";

export type DistrictBuildingLayout = { assetId: AssetId; position: readonly [number, number, number]; rotationY: number };
export const DISTRICT_SATELLITE_LAYOUT: readonly DistrictBuildingLayout[] = [
  { assetId: "office", position: [-2, 0, -2], rotationY: Math.PI },
  { assetId: "data-center", position: [0, 0, -2], rotationY: Math.PI },
  { assetId: "skyscraper", position: [2, 0, -2], rotationY: Math.PI },
  { assetId: "office", position: [-2, 0, 2], rotationY: 0 },
  { assetId: "data-center", position: [0, 0, 2], rotationY: 0 },
  { assetId: "skyscraper", position: [2, 0, 2], rotationY: 0 },
] as const;
