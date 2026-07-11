import * as THREE from "three";
import type { DistrictState } from "@/shared/contracts";
import { RoadGraph, sampleLaneEdge, type JourneyKind, type VehicleRoute } from "@/lib/city/traffic/RoadGraph";

export type JourneyMix = Readonly<Record<JourneyKind, number>>;
export const DEFAULT_JOURNEY_MIX: JourneyMix = { local: .5, "cross-district": .35, "entry-exit": .15 };

type Vehicle = {
  id: string; object: THREE.Object3D; active: boolean; route: VehicleRoute | null;
  edgeIndex: number; distance: number; speed: number; seed: number; districtId?: string;
  reservedMovementId?: string;
};

export type TrafficDebugSnapshot = {
  vehicles: readonly { id:string; active:boolean; edgeId?:string; distance:number; destination?:string; route?:readonly string[] }[];
  occupancy: ReadonlyMap<string, readonly string[]>;
  reservations: ReadonlyMap<string, string>;
};

const hash = (seed:number) => { let value=seed|0; return () => { value=Math.imul(value^value>>>15,1|value); value^=value+Math.imul(value^value>>>7,61|value); return ((value^value>>>14)>>>0)/4294967296; }; };
const choose = <T>(items:readonly T[], random:()=>number):T|undefined => items.length ? items[Math.floor(random()*items.length)%items.length] : undefined;

export class TrafficPool {
  private readonly vehicles:Vehicle[];
  private readonly occupancy=new Map<string,Vehicle[]>();
  private readonly reservations=new Map<string,string>();
  private readonly position=new THREE.Vector3(); private readonly tangent=new THREE.Vector3();
  private spawnCounter=0;

  constructor(private readonly graph:RoadGraph, objects:readonly THREE.Object3D[], private readonly mix:JourneyMix=DEFAULT_JOURNEY_MIX, seed=0x51c17) {
    this.vehicles=objects.map((object,index)=>({id:`vehicle-${index}`,object,active:false,route:null,edgeIndex:0,distance:0,speed:0,seed:seed+index*7919}));
  }

  update(step:number,districts:readonly DistrictState[],animate:boolean):void {
    const density=districts.length?districts.reduce((sum,d)=>sum+THREE.MathUtils.clamp(d.city.trafficDensity,0,1),0)/districts.length:0;
    const target=animate?Math.round(this.vehicles.length*density):0;
    for(let index=0;index<this.vehicles.length;index++){const vehicle=this.vehicles[index];if(index<target&&!vehicle.active)this.spawn(vehicle,districts);else if(index>=target&&vehicle.active)this.deactivate(vehicle);}
    this.rebuildOccupancy();
    for(const vehicle of this.vehicles)if(vehicle.active)this.advance(vehicle,step,districts);
  }

  snapshot():TrafficDebugSnapshot {
    return {vehicles:this.vehicles.map(v=>({id:v.id,active:v.active,edgeId:this.currentEdgeId(v),distance:v.distance,destination:v.route?.destinationNodeId,route:v.route?.edgeIds})),occupancy:new Map([...this.occupancy].map(([id,cars])=>[id,cars.map(c=>c.id)])),reservations:new Map(this.reservations)};
  }

  private spawn(vehicle:Vehicle,districts:readonly DistrictState[]):void {
    const random=hash(vehicle.seed+this.spawnCounter++); const roll=random(); const kind:JourneyKind=roll<this.mix.local?"local":roll<this.mix.local+this.mix["cross-district"]?"cross-district":"entry-exit";
    const districtIds=districts.map(d=>d.id).filter(id=>(this.graph.districtNodeIds.get(id)?.length??0)>1);
    let origin:string|undefined,destination:string|undefined,districtId:string|undefined;
    if(kind==="local"){districtId=choose(districtIds,random);const nodes=districtId?this.graph.districtNodeIds.get(districtId)??[]:[];origin=choose(nodes,random);destination=choose(nodes.filter(id=>id!==origin),random);}
    else if(kind==="cross-district"){districtId=choose(districtIds,random);const other=choose(districtIds.filter(id=>id!==districtId),random);origin=choose(districtId?this.graph.districtNodeIds.get(districtId)??[]:[],random);destination=choose(other?this.graph.districtNodeIds.get(other)??[]:[],random);}
    else {districtId=choose(districtIds,random);const districtNodes=districtId?this.graph.districtNodeIds.get(districtId)??[]:[];if(random()<.5){origin=choose(this.graph.entryNodeIds,random);destination=choose(districtNodes,random);}else{origin=choose(districtNodes,random);destination=choose(this.graph.exitNodeIds,random);}}
    const route=origin&&destination?this.graph.shortestPath(origin,destination,vehicle.seed+this.spawnCounter,kind):null;
    if(!route?.edgeIds.length){vehicle.object.visible=false;return;}
    vehicle.active=true;vehicle.object.visible=true;vehicle.route=route;vehicle.edgeIndex=0;vehicle.distance=0;vehicle.speed=0;vehicle.districtId=districtId;
    this.place(vehicle);
  }

  private advance(vehicle:Vehicle,step:number,districts:readonly DistrictState[]):void {
    const edgeId=this.currentEdgeId(vehicle);if(!edgeId)return this.deactivate(vehicle);
    const edge=this.graph.getEdge(edgeId);const district=districts.find(d=>d.id===vehicle.districtId)??districts[0];
    const state=district?.city;const target=THREE.MathUtils.lerp(.28,.95,state?.trafficSpeed??.5)*edge.speedLimit*(1-.55*(state?.congestion??0));
    const leader=this.leader(vehicle,edgeId);const gap=leader?leader.distance-vehicle.distance:Number.POSITIVE_INFINITY;const safe=.28+vehicle.speed*.35;
    let desired=target;if(gap<safe)desired=Math.max(0,target*THREE.MathUtils.clamp(gap/safe,0,1));
    const nextId=vehicle.route?.edgeIds[vehicle.edgeIndex+1];const next=nextId?this.graph.getEdge(nextId):undefined;
    if(next?.intersectionMovementId&&edge.length-vehicle.distance<.22&&!this.reserve(vehicle,next.intersectionMovementId))desired=0;
    vehicle.speed=THREE.MathUtils.damp(vehicle.speed,desired,desired<vehicle.speed?9:3,step);
    vehicle.distance+=vehicle.speed*step;
    while(vehicle.distance>=edge.length&&vehicle.active){vehicle.distance-=edge.length;vehicle.edgeIndex++;if(vehicle.reservedMovementId&&edge.intersectionMovementId===vehicle.reservedMovementId)this.release(vehicle);if(!vehicle.route||vehicle.edgeIndex>=vehicle.route.edgeIds.length){if(hash(vehicle.seed+this.spawnCounter++)()<.5)this.spawn(vehicle,districts);else this.deactivate(vehicle);break;}}
    if(vehicle.active)this.place(vehicle);
  }

  private place(vehicle:Vehicle):void {const edgeId=this.currentEdgeId(vehicle);if(!edgeId)return;const edge=this.graph.getEdge(edgeId);sampleLaneEdge(edge,vehicle.distance,this.position,this.tangent);vehicle.object.position.copy(this.position);const target=Math.atan2(this.tangent.x,this.tangent.z);vehicle.object.rotation.y=this.dampAngle(vehicle.object.rotation.y,target,.22);}
  private dampAngle(from:number,to:number,alpha:number):number {const delta=Math.atan2(Math.sin(to-from),Math.cos(to-from));return from+delta*alpha;}
  private currentEdgeId(vehicle:Vehicle):string|undefined{return vehicle.route?.edgeIds[vehicle.edgeIndex];}
  private rebuildOccupancy():void {this.occupancy.clear();for(const vehicle of this.vehicles){const edge=this.currentEdgeId(vehicle);if(!vehicle.active||!edge)continue;const list=this.occupancy.get(edge)??[];list.push(vehicle);this.occupancy.set(edge,list);}for(const list of this.occupancy.values())list.sort((a,b)=>a.distance-b.distance);}
  private leader(vehicle:Vehicle,edgeId:string):Vehicle|undefined {const list=this.occupancy.get(edgeId)??[];const index=list.indexOf(vehicle);return index>=0?list[index+1]:undefined;}
  private reserve(vehicle:Vehicle,movementId:string):boolean {if(vehicle.reservedMovementId===movementId)return true;const movement=this.graph.movements.get(movementId);if(!movement)return true;for(const group of movement.conflictGroupIds){const owner=this.reservations.get(group);if(owner&&owner!==vehicle.id)return false;}for(const group of movement.conflictGroupIds)this.reservations.set(group,vehicle.id);vehicle.reservedMovementId=movementId;return true;}
  private release(vehicle:Vehicle):void {for(const [group,owner] of this.reservations)if(owner===vehicle.id)this.reservations.delete(group);vehicle.reservedMovementId=undefined;}
  private deactivate(vehicle:Vehicle):void {this.release(vehicle);vehicle.active=false;vehicle.route=null;vehicle.object.visible=false;vehicle.speed=0;vehicle.distance=0;}
}
