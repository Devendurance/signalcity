export type AssetId = "skyscraper" | "office" | "data-center" | "road-straight" | "road-curve" | "road-end" | "road-three-way" | "road-four-way" | "passenger-car";
export type AssetDefinition = { id: AssetId; url: string; scale: number; rotationY?: number; source: "dgreenheck/simcity-threejs-clone"; license: "MIT" };
const UNIT_SCALE = 1 / 30;
export const ASSET_REGISTRY: Record<AssetId, AssetDefinition> = {
  skyscraper: { id: "skyscraper", url: "/models/building-skyscraper.glb", scale: UNIT_SCALE, source: "dgreenheck/simcity-threejs-clone", license: "MIT" },
  office: { id: "office", url: "/models/building-office-big.glb", scale: UNIT_SCALE, source: "dgreenheck/simcity-threejs-clone", license: "MIT" },
  "data-center": { id: "data-center", url: "/models/data-center.glb", scale: UNIT_SCALE, source: "dgreenheck/simcity-threejs-clone", license: "MIT" },
  "road-straight": { id: "road-straight", url: "/models/tile-road-straight.glb", scale: UNIT_SCALE, source: "dgreenheck/simcity-threejs-clone", license: "MIT" },
  "road-curve": { id: "road-curve", url: "/models/tile-road-curve.glb", scale: UNIT_SCALE, source: "dgreenheck/simcity-threejs-clone", license: "MIT" },
  "road-end": { id: "road-end", url: "/models/tile-road-end.glb", scale: UNIT_SCALE, source: "dgreenheck/simcity-threejs-clone", license: "MIT" },
  "road-three-way": { id: "road-three-way", url: "/models/tile-road-intersection-t.glb", scale: UNIT_SCALE, source: "dgreenheck/simcity-threejs-clone", license: "MIT" },
  "road-four-way": { id: "road-four-way", url: "/models/tile-road-intersection.glb", scale: UNIT_SCALE, source: "dgreenheck/simcity-threejs-clone", license: "MIT" },
  "passenger-car": { id: "passenger-car", url: "/models/car-passenger.glb", scale: UNIT_SCALE, rotationY: Math.PI / 2, source: "dgreenheck/simcity-threejs-clone", license: "MIT" },
};
