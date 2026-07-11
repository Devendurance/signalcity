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

// ---- Sector Zone Positions ----
// Weather Grid: 5 sector zones in a diamond layout
// North: AI (0, 6)
// South: BTC (-7, -4), DeFi (7, -4)
// East: RWA (7, 4)
// West: Memecoins (-7, 4)

// Four product districts surround the grid:
// North-center: Portfolio Clinic (0, 12)
// West-center: Claims Bureau (-12, 0)
// East gate: Entry Gate (12, 0)

export const CITY_ROAD_SEGMENTS: readonly RoadSegment[] = [
  // === Weather Grid Sector Zones ===
  { id: "btc-loop", roadClass: "local", districtId: "btc", coordinates: loop(-7, -4, 3) },
  { id: "ai-loop", roadClass: "local", districtId: "ai", coordinates: loop(0, 6, 3) },
  { id: "defi-loop", roadClass: "local", districtId: "defi", coordinates: loop(7, -4, 3) },
  { id: "memecoin-loop", roadClass: "local", districtId: "memecoin", coordinates: loop(-7, 4, 3) },
  { id: "rwa-loop", roadClass: "local", districtId: "rwa", coordinates: loop(7, 4, 3) },

  // === Connector roads to central arterial ===
  { id: "btc-connector", roadClass: "connector", districtId: "btc", coordinates: line([-4, -4], [-4, -1]) },
  { id: "ai-connector", roadClass: "connector", districtId: "ai", coordinates: line([0, 3], [0, 1]) },
  { id: "defi-connector", roadClass: "connector", districtId: "defi", coordinates: line([4, -4], [4, -1]) },
  { id: "memecoin-connector", roadClass: "connector", districtId: "memecoin", coordinates: line([-4, 4], [-4, 1]) },
  { id: "rwa-connector", roadClass: "connector", districtId: "rwa", coordinates: line([4, 4], [4, 1]) },

  // === Central arterial (runs through whole city) ===
  { id: "central-arterial", roadClass: "arterial", coordinates: line([-16, 0], [16, 0]) },

  // === North-South spine ===
  { id: "north-spine", roadClass: "arterial", coordinates: line([0, -8], [0, 14]) },

  // === Product District Roads ===
  // Claims Bureau — courthouse loop (west)
  { id: "claims-loop", roadClass: "local", districtId: "claims", coordinates: loop(-12, 0, 2) },
  // Entry Gate — at east city boundary
  { id: "entry-gate-loop", roadClass: "local", districtId: "entry-gate", coordinates: loop(12, 0, 2) },
  // Portfolio Clinic — medical campus (north)
  { id: "portfolio-loop", roadClass: "local", districtId: "portfolio", coordinates: loop(0, 12, 2) },

  // === Claim Bureau connector ===
  { id: "claims-connector", roadClass: "connector", districtId: "claims", coordinates: line([-10, 0], [-8, 0]) },

  // === Entry Gate connector ===
  { id: "entry-gate-connector", roadClass: "connector", districtId: "entry-gate", coordinates: line([10, 0], [8, 0]) },

  // === Portfolio Clinic connector ===
  { id: "portfolio-connector", roadClass: "connector", districtId: "portfolio", coordinates: line([0, 10], [0, 8]) },

  // === City boundary roads ===
  { id: "north-boundary", roadClass: "boundary", coordinates: line([0, 14], [0, 16]) },
] as const;

export const CITY_ROAD_PORTALS: readonly RoadPortal[] = [
  // City gates
  { id: "west-gate", coordinate: [-16, 0], direction: "west", kind: "entry-exit" },
  { id: "east-gate", coordinate: [16, 0], direction: "east", kind: "entry-exit" },
  { id: "south-gate", coordinate: [0, -10], direction: "south", kind: "entry-exit" },
  { id: "north-gate", coordinate: [0, 16], direction: "north", kind: "entry-exit" },

  // Entry Gate checkpoint portal (east side)
  { id: "checkpoint-in", coordinate: [14, 0], direction: "east", kind: "entry" },
  { id: "checkpoint-out", coordinate: [10, 0], direction: "west", kind: "exit" },
] as const;

export const CITY_ROADS = compileRoadTopology(CITY_ROAD_SEGMENTS, CITY_ROAD_PORTALS);
export const CITY_LAYOUT_VERSION = "complete-city-v1";
