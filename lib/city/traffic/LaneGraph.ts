import * as THREE from "three";
import type { RoadTopology } from "@/lib/city/roads/topology";
export type LaneNode = { id:string; position:THREE.Vector3; next:readonly string[] };
export class LaneGraph {
  readonly nodes: ReadonlyMap<string,LaneNode>;
  constructor(topology:RoadTopology) { this.nodes = new Map(topology.tiles.map(tile => [tile.id,{ id:tile.id, position:new THREE.Vector3(tile.coordinate[0],.045,tile.coordinate[1]), next:tile.connections.map(direction => topology.neighbor(tile,direction)).filter((value): value is NonNullable<typeof value> => Boolean(value)).map(value => value.id).sort() }])); }
  get(id:string):LaneNode { const node=this.nodes.get(id); if(!node) throw new Error(`Unknown lane node: ${id}`); return node; }
  transition(id:string,seed:number,count:number):LaneNode { const node=this.get(id); return node.next.length ? this.get(node.next[(seed+count)%node.next.length]) : node; }
}
