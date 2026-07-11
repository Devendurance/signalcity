import { describe,expect,it } from "vitest";
import { CITY_ROADS } from "@/lib/city/layout/cityLayout";
import { roadAsset,roadRotation } from "@/lib/city/roads/topology";
import { RoadGraph } from "@/lib/city/traffic/RoadGraph";

describe("compiled city roads",()=>{
  it("maps every supported mask to the correct road family",()=>{
    expect(roadAsset(5)).toBe("road-straight");expect(roadAsset(10)).toBe("road-straight");
    for(const mask of [3,6,9,12])expect(roadAsset(mask)).toBe("road-curve");
    for(const mask of [7,11,13,14])expect(roadAsset(mask)).toBe("road-three-way");
    for(const mask of [1,2,4,8])expect(roadAsset(mask)).toBe("road-end");
    expect(roadAsset(15)).toBe("road-four-way");
    expect(new Set([3,6,9,12].map(roadRotation)).size).toBe(4);
  });
  it("gives every district a loop and one connected global component",()=>{
    for(const id of ["btc","ai","defi"])expect(CITY_ROADS.segments.some(segment=>segment.id===`${id}-loop`&&segment.coordinates.length>=20)).toBe(true);
    const graph=new RoadGraph(CITY_ROADS);expect(graph.connectedComponents()).toHaveLength(1);
    expect(graph.entryNodeIds.length).toBe(3);expect(graph.exitNodeIds.length).toBe(3);
  });
});

describe("global directed RoadGraph",()=>{
  const graph=new RoadGraph(CITY_ROADS);
  it("has distinct opposing lanes and no U-turn movements",()=>{
    expect([...graph.connections].some(connection=>graph.connections.some(reverse=>reverse.fromSegmentId===connection.toSegmentId&&reverse.toSegmentId===connection.fromSegmentId))).toBe(true);
    for(const movement of graph.movements.values()){const turn=movement.id.split(":").at(-1)!;const [incoming,outgoing]=turn.split("->");expect(incoming).not.toBe(outgoing);}
  });
  it("routes between every district and every portal",()=>{
    const districts=[...graph.districtNodeIds.keys()];expect(districts.sort()).toEqual(["ai","btc","defi"]);
    for(const from of districts)for(const to of districts){const origin=graph.districtNodeIds.get(from)![0],destination=graph.districtNodeIds.get(to)!.at(-1)!;expect(graph.shortestPath(origin,destination,42,from===to?"local":"cross-district")).not.toBeNull();}
    for(const entry of graph.entryNodeIds)for(const district of districts)expect(graph.shortestPath(entry,graph.districtNodeIds.get(district)![0],7,"entry-exit")).not.toBeNull();
    for(const exit of graph.exitNodeIds)for(const district of districts)expect(graph.shortestPath(graph.districtNodeIds.get(district)![0],exit,9,"entry-exit")).not.toBeNull();
  });
  it("returns deterministic contiguous routes with lane-contained samples",()=>{
    const origin=graph.districtNodeIds.get("btc")![0],destination=graph.districtNodeIds.get("ai")![0];
    const first=graph.shortestPath(origin,destination,123,"cross-district")!,second=graph.shortestPath(origin,destination,123,"cross-district")!;
    expect(first.edgeIds).toEqual(second.edgeIds);expect(first.edgeIds.length).toBeGreaterThan(1);
    first.edgeIds.forEach((id,index)=>{const edge=graph.getEdge(id);if(index)expect(graph.getEdge(first.edgeIds[index-1]).to).toBe(edge.from);for(const point of edge.samples)expect(Number.isFinite(point.x+point.y+point.z)).toBe(true);});
  });
});
