import type { AssetId } from "@/lib/city/assets/registry";

export type TileCoordinate = readonly [x: number, z: number];
export type RoadDirection = "north" | "east" | "south" | "west";
export type RoadClass = "local" | "connector" | "arterial" | "boundary";
export type RoadSegment = {
  id: string;
  roadClass: RoadClass;
  coordinates: readonly TileCoordinate[];
  districtId?: string;
};
export type RoadPortal = {
  id: string;
  coordinate: TileCoordinate;
  direction: RoadDirection;
  kind: "entry" | "exit" | "entry-exit";
};
export type RoadTile = {
  id: string;
  coordinate: TileCoordinate;
  connections: readonly RoadDirection[];
  segmentIds: readonly string[];
  districtIds: readonly string[];
  portalId?: string;
};
export type RoadLayoutBounds = Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>;

export const ROAD_OFFSETS: Readonly<Record<RoadDirection, TileCoordinate>> = {
  north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0],
};
const BITS: Record<RoadDirection, number> = { north: 1, east: 2, south: 4, west: 8 };
const DIRECTIONS = Object.entries(ROAD_OFFSETS) as Array<[RoadDirection, TileCoordinate]>;
const keyOf = ([x, z]: TileCoordinate): string => `${x}:${z}`;

export const roadMask = (connections: readonly RoadDirection[]): number =>
  connections.reduce((mask, direction) => mask | BITS[direction], 0);

export const roadAsset = (mask: number): AssetId => {
  if (mask === 15) return "road-four-way";
  if ([7, 11, 13, 14].includes(mask)) return "road-three-way";
  if ([3, 6, 9, 12].includes(mask)) return "road-curve";
  if ([1, 2, 4, 8].includes(mask)) return "road-end";
  return "road-straight";
};

// Rotations match the source GLBs' authored orientation.
export const roadRotation = (mask: number): number => ({
  1: Math.PI, 2: Math.PI / 2, 3: Math.PI / 2, 4: 0,
  5: 0, 6: 0, 7: Math.PI / 2, 8: Math.PI * 1.5,
  9: Math.PI, 10: Math.PI / 2, 11: Math.PI,
  12: Math.PI * 1.5, 13: Math.PI * 1.5, 14: 0, 15: 0,
} as Record<number, number>)[mask] ?? 0;

export class RoadTopology {
  private readonly lookup: ReadonlyMap<string, RoadTile>;
  readonly bounds: RoadLayoutBounds;

  constructor(
    readonly tiles: readonly RoadTile[],
    readonly segments: readonly RoadSegment[] = [],
    readonly portals: readonly RoadPortal[] = [],
  ) {
    this.lookup = new Map(tiles.map((tile) => [keyOf(tile.coordinate), tile]));
    const xs = tiles.map((tile) => tile.coordinate[0]);
    const zs = tiles.map((tile) => tile.coordinate[1]);
    this.bounds = {
      minX: Math.min(...xs), maxX: Math.max(...xs),
      minZ: Math.min(...zs), maxZ: Math.max(...zs),
    };
  }

  get(coordinate: TileCoordinate): RoadTile | undefined { return this.lookup.get(keyOf(coordinate)); }
  neighbor(tile: RoadTile, direction: RoadDirection): RoadTile | undefined {
    const [dx, dz] = ROAD_OFFSETS[direction];
    return this.get([tile.coordinate[0] + dx, tile.coordinate[1] + dz]);
  }
}

export function compileRoadTopology(
  segments: readonly RoadSegment[],
  portals: readonly RoadPortal[],
): RoadTopology {
  const memberships = new Map<string, { coordinate: TileCoordinate; segmentIds: Set<string>; districtIds: Set<string> }>();
  for (const segment of segments) {
    for (const coordinate of segment.coordinates) {
      const key = keyOf(coordinate);
      const membership = memberships.get(key) ?? { coordinate, segmentIds: new Set<string>(), districtIds: new Set<string>() };
      membership.segmentIds.add(segment.id);
      if (segment.districtId) membership.districtIds.add(segment.districtId);
      memberships.set(key, membership);
    }
  }
  const portalByCoordinate = new Map(portals.map((portal) => [keyOf(portal.coordinate), portal]));
  const tiles = [...memberships.values()].map((membership): RoadTile => {
    const [x, z] = membership.coordinate;
    return {
      id: `road-${x}-${z}`,
      coordinate: membership.coordinate,
      connections: DIRECTIONS.filter(([, [dx, dz]]) => memberships.has(`${x + dx}:${z + dz}`)).map(([direction]) => direction),
      segmentIds: [...membership.segmentIds].sort(),
      districtIds: [...membership.districtIds].sort(),
      portalId: portalByCoordinate.get(keyOf(membership.coordinate))?.id,
    };
  }).sort((a, b) => a.coordinate[1] - b.coordinate[1] || a.coordinate[0] - b.coordinate[0]);
  return new RoadTopology(tiles, segments, portals);
}
