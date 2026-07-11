"use client";
import { useEffect, useRef, useState } from "react";
import { CityRuntime } from "@/lib/city/core/CityRuntime";
import type { SelectionMetadata } from "@/lib/city/interaction/SelectionController";
import { recommendedQualityTier } from "@/lib/city/performance/quality";
import { FOUNDATION_WORLD } from "@/lib/city/domain/world";
import type { TrafficDebugLayer } from "@/lib/city/debug/TrafficDebugController";

export function CityViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null); const runtimeRef = useRef<CityRuntime | null>(null); const [selection, setSelection] = useState<SelectionMetadata | null>(null); const [status, setStatus] = useState("Loading verified city assets…");
  useEffect(() => { const canvas = canvasRef.current; if (!canvas) return; let cancelled = false; let runtime: CityRuntime | null = null; const observer = new ResizeObserver(() => runtime?.resize()); observer.observe(canvas);
    CityRuntime.create({ canvas, qualityTier: recommendedQualityTier(), onSelection: setSelection }).then((created) => { if (cancelled) return created.dispose(); runtime = created; runtimeRef.current = created; setStatus("Foundation online"); }).catch((error: unknown) => { console.error(error); setStatus("The 3D city could not start in this browser."); });
    return () => { cancelled = true; observer.disconnect(); runtimeRef.current = null; void runtime?.dispose(); };
  }, []);
  const selectedDistrict = FOUNDATION_WORLD.districts.find((district) => district.id === selection?.id);
  const selectDistrict = (id: string) => {
    const district = FOUNDATION_WORLD.districts.find((candidate) => candidate.id === id);
    if (!district) return;
    setSelection({ id: district.id, label: district.label, kind: "district", detail: district.explanation.summary });
  };
  return <section className="city-shell" aria-label="Signal City 3D market map">
    <canvas ref={canvasRef} className="city-canvas" aria-label="Interactive 3D city" />
    <header className="city-header"><div><p className="city-brand">Signal City</p><p className="city-tagline">The crypto market, made visible.</p></div><p className="city-status"><span aria-hidden="true" />{status}</p></header>
    <aside className="city-panel" aria-live="polite"><p className="panel-label">Selected city signal</p><h1>{selection?.label ?? "Explore Signal City"}</h1><p>{selectedDistrict?.explanation.summary ?? selection?.detail ?? "Click a district building, road, or car. Right-drag to rotate, Ctrl + right-drag to pan, and scroll to zoom."}</p><dl><div><dt>Weather</dt><dd>{selectedDistrict?.weather.kind.replaceAll("_", " ") ?? "Structured mock"}</dd></div><div><dt>Confidence</dt><dd>{selectedDistrict ? `${Math.round(selectedDistrict.weather.confidence * 100)}%` : "Canonical state"}</dd></div><div><dt>Status</dt><dd>{selectedDistrict?.status.replaceAll("_", " ") ?? FOUNDATION_WORLD.systemStatus}</dd></div></dl></aside>
    <nav className="district-list" aria-label="Available districts">{FOUNDATION_WORLD.districts.map((district) => <button key={district.id} type="button" aria-pressed={selectedDistrict?.id === district.id} onClick={() => selectDistrict(district.id)}>{district.subjectId.toUpperCase()}</button>)}</nav>
    {process.env.NODE_ENV !== "production" && <div className="traffic-debug-panel" aria-label="Traffic debug layers"><span>Traffic debug</span>{([["G","master"],["N","nodes"],["E","edges"],["I","intersections"],["R","route"],["O","occupancy"],["C","components"],["V","reservations"]] as Array<[string,TrafficDebugLayer]>).map(([key,layer])=><button key={layer} type="button" title={layer} onClick={()=>runtimeRef.current?.toggleTrafficDebug(layer)}>{key}</button>)}</div>}
  </section>;
}
