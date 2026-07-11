import { ASSET_REGISTRY, type AssetId } from "@/lib/city/assets/registry";

export function resolveAssetId(assetId: string): AssetId {
  if (assetId in ASSET_REGISTRY) return assetId as AssetId;
  throw new Error(`Unknown Signal City renderer asset: ${assetId}`);
}
