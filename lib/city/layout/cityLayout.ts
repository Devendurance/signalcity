import { compileRoadTopology, type RoadPortal, type RoadSegment, type TileCoordinate } from "@/lib/city/roads/topology";

const line = (from: TileCoordinate, to: TileCoordinate): TileCoordinate[] => {
  const result: TileCoordinate[] = [];
  const dx = Math.sign(to[0] - from[0]);
  const dz = Math.sign(to[1] - from[1]);
  for (let x = from[0], z = from[1]; ; x += dx, z += dz) {
    result.push([x, z]);
    if (x === to[0] && z === to[1]) break;
  }
  return result;
};

const loop = (cx: number, cz: number, half = 3): TileCoordinate[] => [
  ...line([cx - half, cz - half], [cx + half, cz - half]),
  ...line([cx + half, cz - half + 1], [cx + half, cz + half]),
  ...line([cx + half - 1, cz + half], [cx - half, cz + half]),
  ...line([cx - half, cz + half - 1], [cx - half, cz - half + 1]),
];

export const CITY_ROAD_SEGMENTS: readonly RoadSegment[] = [
  { id: "btc-loop", roadClass: "local", districtId: "btc", coordinates: loop(-7, -4) },
  { id: "ai-loop", roadClass: "local", districtId: "ai", coordinates: loop(0, 6) },
  { id: "defi-loop", roadClass: "local", districtId: "defi", coordinates: loop(7, -4) },
  { id: "btc-connector", roadClass: "connector", districtId: "btc", coordinates: line([-4, -4], [-4, 0]) },
  { id: "ai-connector", roadClass: "connector", districtId: "ai", coordinates: line([0, 3], [0, 0]) },
  { id: "defi-connector", roadClass: "connector", districtId: "defi", coordinates: line([4, -4], [4, 0]) },
  { id: "central-arterial", roadClass: "arterial", coordinates: line([-12, 0], [12, 0]) },
  { id: "south-boundary", roadClass: "boundary", coordinates: line([0, 0], [0, -10]) },
] as const;

export const CITY_ROAD_PORTALS: readonly RoadPortal[] = [
  { id: "west-gate", coordinate: [-12, 0], direction: "west", kind: "entry-exit" },
  { id: "east-gate", coordinate: [12, 0], direction: "east", kind: "entry-exit" },
  { id: "south-gate", coordinate: [0, -10], direction: "south", kind: "entry-exit" },
] as const;

export const CITY_ROADS = compileRoadTopology(CITY_ROAD_SEGMENTS, CITY_ROAD_PORTALS);
export const CITY_LAYOUT_VERSION = "global-road-graph-v1";
