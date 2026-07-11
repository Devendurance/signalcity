import * as THREE from "three";
import type { RoadDirection, TileCoordinate } from "@/lib/city/roads/topology";

export type RoadRole = "local" | "connector" | "arterial" | "boundary";
export type LaneNodeKind = "seam" | "intersection" | "entry" | "exit";
export type JourneyKind = "local" | "cross-district" | "entry-exit";

export interface RoadSegmentInput {
  id: string;
  coordinate: TileCoordinate;
  connections: readonly RoadDirection[];
  districtId?: string;
  districtIds?: readonly string[];
  segmentIds?: readonly string[];
  role?: RoadRole;
  portalId?: string;
  isEntry?: boolean;
  isExit?: boolean;
}

export interface RoadLayoutInput {
  tiles: readonly RoadSegmentInput[];
  segments?: readonly { id: string; roadClass: RoadRole; districtId?: string }[];
  portals?: readonly { id: string; kind: "entry" | "exit" | "entry-exit" }[];
}

export interface LaneNode {
  id: string;
  position: THREE.Vector3;
  kind: LaneNodeKind;
  segmentId: string;
  districtId?: string;
}

export interface LaneEdge {
  id: string;
  from: string;
  to: string;
  segmentId: string;
  laneId: string;
  length: number;
  speedLimit: number;
  curve: THREE.Curve<THREE.Vector3>;
  samples: readonly THREE.Vector3[];
  districtIds: readonly string[];
  intersectionMovementId?: string;
}

export interface RoadConnection {
  id: string;
  fromSegmentId: string;
  toSegmentId: string;
  edgeId: string;
}

export interface IntersectionMovement {
  id: string;
  intersectionId: string;
  incomingEdgeId: string;
  outgoingEdgeId: string;
  curve: THREE.Curve<THREE.Vector3>;
  conflictGroupIds: readonly string[];
}

export interface VehicleRoute {
  originNodeId: string;
  destinationNodeId: string;
  edgeIds: readonly string[];
  totalLength: number;
  journeyKind: JourneyKind;
}

export interface RoadGraphValidation {
  components: readonly (readonly string[])[];
  districtReachability: ReadonlyMap<string, ReadonlyMap<string, boolean>>;
  warnings: readonly string[];
}

const DIRECTIONS: readonly RoadDirection[] = ["north", "east", "south", "west"];
const VECTORS: Record<RoadDirection, THREE.Vector3> = {
  north: new THREE.Vector3(0, 0, -1), east: new THREE.Vector3(1, 0, 0),
  south: new THREE.Vector3(0, 0, 1), west: new THREE.Vector3(-1, 0, 0),
};
const OPPOSITE: Record<RoadDirection, RoadDirection> = { north: "south", east: "west", south: "north", west: "east" };
const LANE_OFFSET = 0.18;
const PORT_DISTANCE = 0.46;
const LANE_Y = 0.045;
const SAMPLE_COUNT = 32;

const coordinateKey = ([x, z]: TileCoordinate) => `${x}:${z}`;
const vectorRight = (direction: RoadDirection) => {
  const vector = VECTORS[direction];
  return new THREE.Vector3(-vector.z, 0, vector.x);
};
const portId = (segmentId: string, direction: RoadDirection, flow: "in" | "out") => `${segmentId}:${direction}:${flow}`;

function portPosition(segment: RoadSegmentInput, direction: RoadDirection, flow: "in" | "out"): THREE.Vector3 {
  const center = new THREE.Vector3(segment.coordinate[0], LANE_Y, segment.coordinate[1]);
  const outward = VECTORS[direction];
  const side = vectorRight(direction).multiplyScalar(flow === "out" ? LANE_OFFSET : -LANE_OFFSET);
  return center.addScaledVector(outward, PORT_DISTANCE).add(side);
}

function movementCurve(segment: RoadSegmentInput, incoming: RoadDirection, outgoing: RoadDirection): THREE.CubicBezierCurve3 {
  const start = portPosition(segment, incoming, "in");
  const end = portPosition(segment, outgoing, "out");
  const handle = incoming === OPPOSITE[outgoing] ? 0.31 : 0.27;
  const startTangent = VECTORS[incoming].clone().negate();
  const endTangent = VECTORS[outgoing];
  return new THREE.CubicBezierCurve3(
    start,
    start.clone().addScaledVector(startTangent, handle),
    end.clone().addScaledVector(endTangent, -handle),
    end,
  );
}

function sampled(curve: THREE.Curve<THREE.Vector3>): readonly THREE.Vector3[] {
  return Object.freeze(curve.getSpacedPoints(SAMPLE_COUNT).map((point) => point.clone()));
}

function lineCurve(start: THREE.Vector3, end: THREE.Vector3): THREE.LineCurve3 {
  return new THREE.LineCurve3(start.clone(), end.clone());
}

function stableHash(value: string, seed: number): number {
  let hash = seed | 0;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return hash >>> 0;
}

function movementConflicts(segmentId: string, incoming: RoadDirection, outgoing: RoadDirection): readonly string[] {
  const order = DIRECTIONS;
  const from = order.indexOf(incoming);
  const to = order.indexOf(outgoing);
  const delta = (to - from + 4) % 4;
  if (delta === 1) return Object.freeze([`${segmentId}:quadrant:${to}`]);
  if (delta === 2) return Object.freeze([`${segmentId}:center`, `${segmentId}:axis:${from % 2}`]);
  return Object.freeze([`${segmentId}:center`, `${segmentId}:quadrant:${from}`, `${segmentId}:quadrant:${to}`]);
}

export class RoadGraph {
  readonly nodes: ReadonlyMap<string, LaneNode>;
  readonly edges: ReadonlyMap<string, LaneEdge>;
  readonly movements: ReadonlyMap<string, IntersectionMovement>;
  readonly connections: readonly RoadConnection[];
  readonly outgoing: ReadonlyMap<string, readonly string[]>;
  readonly districtNodeIds: ReadonlyMap<string, readonly string[]>;
  readonly entryNodeIds: readonly string[];
  readonly exitNodeIds: readonly string[];

  constructor(layout: RoadLayoutInput) {
    const nodes = new Map<string, LaneNode>();
    const edges = new Map<string, LaneEdge>();
    const movements = new Map<string, IntersectionMovement>();
    const connections: RoadConnection[] = [];
    const segmentMetadata = new Map(layout.segments?.map((segment) => [segment.id, segment]) ?? []);
    const portalMetadata = new Map(layout.portals?.map((portal) => [portal.id, portal]) ?? []);
    const normalizedTiles = layout.tiles.map((tile): RoadSegmentInput => {
      const metadata = tile.segmentIds?.map((id) => segmentMetadata.get(id)).find(Boolean);
      const portal = tile.portalId ? portalMetadata.get(tile.portalId) : undefined;
      return {
        ...tile,
        districtId: tile.districtId ?? tile.districtIds?.[0] ?? metadata?.districtId,
        role: tile.role ?? metadata?.roadClass,
        isEntry: tile.isEntry ?? (portal?.kind === "entry" || portal?.kind === "entry-exit"),
        isExit: tile.isExit ?? (portal?.kind === "exit" || portal?.kind === "entry-exit"),
      };
    });
    const coordinateLookup = new Map(normalizedTiles.map((segment) => [coordinateKey(segment.coordinate), segment]));

    const addNode = (node: LaneNode) => { if (nodes.has(node.id)) throw new Error(`Duplicate lane node: ${node.id}`); nodes.set(node.id, node); };
    const addEdge = (edge: LaneEdge) => { if (edges.has(edge.id)) throw new Error(`Duplicate lane edge: ${edge.id}`); edges.set(edge.id, edge); };

    for (const segment of normalizedTiles) {
      for (const direction of segment.connections) {
        addNode({ id: portId(segment.id, direction, "in"), position: portPosition(segment, direction, "in"), kind: segment.connections.length > 2 ? "intersection" : "seam", segmentId: segment.id, districtId: segment.districtId });
        addNode({ id: portId(segment.id, direction, "out"), position: portPosition(segment, direction, "out"), kind: segment.connections.length > 2 ? "intersection" : "seam", segmentId: segment.id, districtId: segment.districtId });
      }

      for (const incoming of segment.connections) for (const outgoingDirection of segment.connections) {
        if (incoming === outgoingDirection) continue;
        const curve = movementCurve(segment, incoming, outgoingDirection);
        const movementId = `${segment.id}:${incoming}->${outgoingDirection}`;
        const edgeId = `${movementId}:lane`;
        addEdge({ id: edgeId, from: portId(segment.id, incoming, "in"), to: portId(segment.id, outgoingDirection, "out"), segmentId: segment.id, laneId: edgeId, length: curve.getLength(), speedLimit: segment.role === "arterial" ? 1.25 : 1, curve, samples: sampled(curve), districtIds: segment.districtId ? Object.freeze([segment.districtId]) : Object.freeze([]), intersectionMovementId: segment.connections.length > 2 ? movementId : undefined });
        if (segment.connections.length > 2) movements.set(movementId, { id: movementId, intersectionId: segment.id, incomingEdgeId: edgeId, outgoingEdgeId: edgeId, curve, conflictGroupIds: movementConflicts(segment.id, incoming, outgoingDirection) });
      }

      if (segment.connections.length === 1 && (segment.role === "boundary" || segment.isEntry || segment.isExit)) {
        const connectionDirection = segment.connections[0];
        const travelDirection = connectionDirection;
        const outsideDirection = OPPOSITE[connectionDirection];
        const outsideCenter = new THREE.Vector3(segment.coordinate[0], LANE_Y, segment.coordinate[1]).addScaledVector(VECTORS[outsideDirection], 0.66);
        if (segment.isEntry !== false) {
          const id = `${segment.id}:entry`;
          const position = outsideCenter.clone().add(vectorRight(travelDirection).multiplyScalar(LANE_OFFSET));
          addNode({ id, position, kind: "entry", segmentId: segment.id, districtId: segment.districtId });
          const curve = new THREE.CubicBezierCurve3(position, position.clone().addScaledVector(VECTORS[travelDirection], .3), portPosition(segment, connectionDirection, "out").clone().addScaledVector(VECTORS[travelDirection], -.3), portPosition(segment, connectionDirection, "out"));
          addEdge({ id: `${id}:lane`, from: id, to: portId(segment.id, connectionDirection, "out"), segmentId: segment.id, laneId: `${id}:lane`, length: curve.getLength(), speedLimit: 1.1, curve, samples: sampled(curve), districtIds: Object.freeze([]) });
        }
        if (segment.isExit !== false) {
          const id = `${segment.id}:exit`;
          const exitTravel = outsideDirection;
          const position = outsideCenter.clone().add(vectorRight(exitTravel).multiplyScalar(LANE_OFFSET));
          addNode({ id, position, kind: "exit", segmentId: segment.id, districtId: segment.districtId });
          const start = portPosition(segment, connectionDirection, "in");
          const curve = new THREE.CubicBezierCurve3(start, start.clone().addScaledVector(VECTORS[connectionDirection], -.3), position.clone().addScaledVector(VECTORS[exitTravel], -.3), position);
          addEdge({ id: `${id}:lane`, from: portId(segment.id, connectionDirection, "in"), to: id, segmentId: segment.id, laneId: `${id}:lane`, length: curve.getLength(), speedLimit: 1.1, curve, samples: sampled(curve), districtIds: Object.freeze([]) });
        }
      }
    }

    for (const segment of normalizedTiles) for (const direction of segment.connections) {
      const offset = VECTORS[direction];
      const neighbor = coordinateLookup.get(`${segment.coordinate[0] + offset.x}:${segment.coordinate[1] + offset.z}`);
      if (!neighbor || !neighbor.connections.includes(OPPOSITE[direction])) continue;
      const from = portId(segment.id, direction, "out");
      const to = portId(neighbor.id, OPPOSITE[direction], "in");
      const curve = lineCurve(nodes.get(from)!.position, nodes.get(to)!.position);
      const edgeId = `${segment.id}->${neighbor.id}:${direction}`;
      const districtIds = Object.freeze([...new Set([segment.districtId, neighbor.districtId].filter((id): id is string => Boolean(id)))]);
      addEdge({ id: edgeId, from, to, segmentId: segment.id, laneId: edgeId, length: Math.max(curve.getLength(), .001), speedLimit: segment.role === "arterial" ? 1.25 : 1, curve, samples: sampled(curve), districtIds });
      connections.push({ id: edgeId, fromSegmentId: segment.id, toSegmentId: neighbor.id, edgeId });
    }

    const outgoing = new Map<string, string[]>();
    for (const id of nodes.keys()) outgoing.set(id, []);
    for (const edge of edges.values()) outgoing.get(edge.from)?.push(edge.id);
    for (const ids of outgoing.values()) ids.sort();
    const districtNodes = new Map<string, Set<string>>();
    for (const edge of edges.values()) for (const districtId of edge.districtIds) {
      const index = districtNodes.get(districtId) ?? new Set<string>();
      index.add(edge.from); index.add(edge.to); districtNodes.set(districtId, index);
    }

    this.nodes = nodes; this.edges = edges; this.movements = movements;
    this.connections = Object.freeze(connections);
    this.outgoing = new Map([...outgoing].map(([id, value]) => [id, Object.freeze(value)]));
    this.districtNodeIds = new Map([...districtNodes].map(([id, value]) => [id, Object.freeze([...value].sort())]));
    this.entryNodeIds = Object.freeze([...nodes.values()].filter((node) => node.kind === "entry").map((node) => node.id).sort());
    this.exitNodeIds = Object.freeze([...nodes.values()].filter((node) => node.kind === "exit").map((node) => node.id).sort());
  }

  getNode(id: string): LaneNode { const node = this.nodes.get(id); if (!node) throw new Error(`Unknown lane node: ${id}`); return node; }
  getEdge(id: string): LaneEdge { const edge = this.edges.get(id); if (!edge) throw new Error(`Unknown lane edge: ${id}`); return edge; }

  shortestPath(originNodeId: string, destinationNodeId: string, seed = 0, journeyKind: JourneyKind = "local"): VehicleRoute | null {
    if (!this.nodes.has(originNodeId) || !this.nodes.has(destinationNodeId)) return null;
    const distances = new Map<string, number>([[originNodeId, 0]]);
    const previous = new Map<string, string>();
    const unsettled = new Set<string>([originNodeId]);
    while (unsettled.size) {
      const current = [...unsettled].sort((a, b) => (distances.get(a)! - distances.get(b)!) || (stableHash(a, seed) - stableHash(b, seed)) || a.localeCompare(b))[0];
      unsettled.delete(current);
      if (current === destinationNodeId) break;
      for (const edgeId of this.outgoing.get(current) ?? []) {
        const edge = this.getEdge(edgeId);
        const candidate = distances.get(current)! + edge.length / edge.speedLimit;
        const known = distances.get(edge.to) ?? Number.POSITIVE_INFINITY;
        if (candidate < known - 1e-9 || (Math.abs(candidate - known) <= 1e-9 && stableHash(edge.id, seed) < stableHash(previous.get(edge.to) ?? "", seed))) {
          distances.set(edge.to, candidate); previous.set(edge.to, edge.id); unsettled.add(edge.to);
        }
      }
    }
    if (!distances.has(destinationNodeId)) return null;
    const edgeIds: string[] = [];
    let cursor = destinationNodeId;
    while (cursor !== originNodeId) { const edgeId = previous.get(cursor); if (!edgeId) return null; edgeIds.push(edgeId); cursor = this.getEdge(edgeId).from; }
    edgeIds.reverse();
    return { originNodeId, destinationNodeId, edgeIds: Object.freeze(edgeIds), totalLength: edgeIds.reduce((sum, id) => sum + this.getEdge(id).length, 0), journeyKind };
  }

  connectedComponents(): readonly (readonly string[])[] {
    const neighbors = new Map<string, Set<string>>([...this.nodes.keys()].map((id) => [id, new Set<string>()]));
    for (const edge of this.edges.values()) { neighbors.get(edge.from)?.add(edge.to); neighbors.get(edge.to)?.add(edge.from); }
    const unseen = new Set(this.nodes.keys()); const components: string[][] = [];
    while (unseen.size) { const start = [...unseen].sort()[0]; const queue = [start]; const component: string[] = []; unseen.delete(start); while (queue.length) { const id = queue.shift()!; component.push(id); for (const neighbor of neighbors.get(id) ?? []) if (unseen.delete(neighbor)) queue.push(neighbor); } components.push(component.sort()); }
    return Object.freeze(components.sort((a, b) => b.length - a.length).map((component) => Object.freeze(component)));
  }

  validateConnectivity(): RoadGraphValidation {
    const components = this.connectedComponents(); const warnings: string[] = [];
    if (components.length > 1) warnings.push(`Road graph contains ${components.length} disconnected components.`);
    const districtReachability = new Map<string, ReadonlyMap<string, boolean>>();
    for (const [fromDistrict, fromNodes] of this.districtNodeIds) {
      const targets = new Map<string, boolean>();
      for (const [toDistrict, toNodes] of this.districtNodeIds) {
        const reachable = fromDistrict === toDistrict || fromNodes.some((from) => toNodes.some((to) => this.shortestPath(from, to) !== null));
        targets.set(toDistrict, reachable); if (!reachable) warnings.push(`No directed route from district ${fromDistrict} to ${toDistrict}.`);
      }
      districtReachability.set(fromDistrict, targets);
    }
    return { components, districtReachability, warnings: Object.freeze(warnings) };
  }
}

export function sampleLaneEdge(edge: LaneEdge, distance: number, position: THREE.Vector3, tangent: THREE.Vector3): void {
  const u = THREE.MathUtils.clamp(edge.length <= 0 ? 0 : distance / edge.length, 0, 1);
  edge.curve.getPointAt(u, position);
  edge.curve.getTangentAt(u, tangent).normalize();
}
