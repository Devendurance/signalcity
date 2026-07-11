import * as THREE from "three";
import { describe,expect,it } from "vitest";
import { CITY_ROADS } from "@/lib/city/layout/cityLayout";
import { FOUNDATION_WORLD } from "@/lib/city/domain/world";
import { RoadGraph } from "@/lib/city/traffic/RoadGraph";
import { TrafficPool } from "@/lib/city/traffic/TrafficPool";

describe("pooled traffic",()=>{
  it("reuses objects, activates traffic, and keeps finite lane poses",()=>{
    const objects=Array.from({length:12},()=>new THREE.Object3D());const pool=new TrafficPool(new RoadGraph(CITY_ROADS),objects,undefined,1234);
    for(let tick=0;tick<180;tick++)pool.update(1/30,FOUNDATION_WORLD.districts,true);
    const snapshot=pool.snapshot();expect(snapshot.vehicles.filter(vehicle=>vehicle.active).length).toBeGreaterThan(0);
    expect(objects).toHaveLength(12);for(const object of objects)expect(Number.isFinite(object.position.x+object.position.y+object.position.z+object.rotation.y)).toBe(true);
  });
  it("is deterministic for the same seed",()=>{
    const run=()=>{const objects=Array.from({length:6},()=>new THREE.Object3D());const pool=new TrafficPool(new RoadGraph(CITY_ROADS),objects,undefined,99);for(let tick=0;tick<90;tick++)pool.update(1/30,FOUNDATION_WORLD.districts,true);return objects.map(object=>object.position.toArray().map(value=>Number(value.toFixed(4))));};
    expect(run()).toEqual(run());
  });
});
