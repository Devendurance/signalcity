import * as THREE from "three";
import type { RoadGraph } from "@/lib/city/traffic/RoadGraph";
import type { TrafficDebugSnapshot } from "@/lib/city/traffic/TrafficPool";

export type TrafficDebugLayer = "master"|"nodes"|"edges"|"intersections"|"route"|"occupancy"|"components"|"reservations";
const KEYS:Record<string,TrafficDebugLayer>={g:"master",n:"nodes",e:"edges",i:"intersections",r:"route",o:"occupancy",c:"components",v:"reservations"};

export class TrafficDebugController {
  readonly group=new THREE.Group();
  private readonly layers=new Map<TrafficDebugLayer,THREE.Group>();
  private selectedVehicleId:string|undefined;
  constructor(private readonly graph:RoadGraph){
    this.group.name="traffic-debug";this.group.visible=false;this.group.raycast=()=>{};
    for(const name of ["nodes","edges","intersections","route","occupancy","components","reservations"] as TrafficDebugLayer[]){const layer=new THREE.Group();layer.name=`debug-${name}`;layer.visible=name==="edges";this.layers.set(name,layer);this.group.add(layer);}
    this.buildStatic();window.addEventListener("keydown",this.onKeyDown);
  }
  toggle(layer:TrafficDebugLayer):boolean {if(layer==="master"){this.group.visible=!this.group.visible;return this.group.visible;}const target=this.layers.get(layer);if(!target)return false;target.visible=!target.visible;this.group.visible=true;return target.visible;}
  selectVehicle(id?:string):void{this.selectedVehicleId=id;}
  update(snapshot:TrafficDebugSnapshot):void {
    this.rebuildDynamic("route",this.routePositions(snapshot),0xffd166);
    this.rebuildDynamic("occupancy",this.occupancyPositions(snapshot),0xff8c42);
    this.rebuildDynamic("reservations",this.reservationPositions(snapshot),0xff3b5c);
  }
  dispose():void{window.removeEventListener("keydown",this.onKeyDown);this.group.traverse(object=>{if(object instanceof THREE.Points||object instanceof THREE.LineSegments){object.geometry.dispose();(object.material as THREE.Material).dispose();}});this.group.clear();}
  private readonly onKeyDown=(event:KeyboardEvent)=>{const target=event.target;if(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement)return;const layer=KEYS[event.key.toLowerCase()];if(layer)this.toggle(layer);};
  private buildStatic():void {
    const nodePositions=[...this.graph.nodes.values()].flatMap(node=>[node.position.x,node.position.y+.04,node.position.z]);
    this.layers.get("nodes")?.add(new THREE.Points(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(nodePositions,3)),new THREE.PointsMaterial({color:0x58f28b,size:.07,sizeAttenuation:true})));
    const edgePositions=[...this.graph.edges.values()].flatMap(edge=>edge.samples.slice(1).flatMap((point,index)=>{const previous=edge.samples[index];return[previous.x,previous.y+.025,previous.z,point.x,point.y+.025,point.z];}));
    this.layers.get("edges")?.add(this.lines(edgePositions,0x4cc9f0));
    const intersectionPositions=[...this.graph.nodes.values()].filter(node=>node.kind==="intersection").flatMap(node=>[node.position.x,node.position.y+.07,node.position.z]);
    this.layers.get("intersections")?.add(new THREE.Points(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(intersectionPositions,3)),new THREE.PointsMaterial({color:0xff4d9d,size:.1,sizeAttenuation:true})));
    const components=this.graph.connectedComponents();const palette=[0x64ffda,0xffd166,0xff6b6b,0xc77dff];
    components.forEach((component,index)=>{const positions=component.flatMap(id=>{const p=this.graph.getNode(id).position;return[p.x,p.y+.09,p.z]});this.layers.get("components")?.add(new THREE.Points(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3)),new THREE.PointsMaterial({color:palette[index%palette.length],size:.08})));});
  }
  private routePositions(snapshot:TrafficDebugSnapshot):number[]{const vehicle=snapshot.vehicles.find(v=>v.id===this.selectedVehicleId)??snapshot.vehicles.find(v=>v.active);if(!vehicle?.route)return[];return vehicle.route.flatMap(id=>{const edge=this.graph.getEdge(id);return edge.samples.slice(1).flatMap((point,index)=>{const previous=edge.samples[index];return[previous.x,previous.y+.11,previous.z,point.x,point.y+.11,point.z]})});}
  private occupancyPositions(snapshot:TrafficDebugSnapshot):number[]{return[...snapshot.occupancy.keys()].flatMap(id=>{const edge=this.graph.getEdge(id);return edge.samples.slice(1).flatMap((point,index)=>{const previous=edge.samples[index];return[previous.x,previous.y+.08,previous.z,point.x,point.y+.08,point.z]})});}
  private reservationPositions(snapshot:TrafficDebugSnapshot):number[]{const groups=new Set(snapshot.reservations.keys());return[...this.graph.movements.values()].filter(m=>m.conflictGroupIds.some(group=>groups.has(group))).flatMap(m=>m.curve.getSpacedPoints(16).slice(1).flatMap((point,index,array)=>{const previous=index?array[index-1]:m.curve.getPoint(0);return[previous.x,previous.y+.14,previous.z,point.x,point.y+.14,point.z]}));}
  private rebuildDynamic(name:TrafficDebugLayer,positions:number[],color:number):void{const layer=this.layers.get(name);if(!layer||!layer.visible)return;for(const child of [...layer.children]){layer.remove(child);if(child instanceof THREE.LineSegments){child.geometry.dispose();(child.material as THREE.Material).dispose();}}if(positions.length)layer.add(this.lines(positions,color));}
  private lines(positions:number[],color:number):THREE.LineSegments{return new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3)),new THREE.LineBasicMaterial({color,transparent:true,opacity:.9,depthTest:false}));}
}
