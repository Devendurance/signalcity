"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CityRuntime } from "@/lib/city/core/CityRuntime";
import type { SelectionMetadata } from "@/lib/city/interaction/SelectionController";
import { recommendedQualityTier } from "@/lib/city/performance/quality";
import { FOUNDATION_WORLD } from "@/lib/city/domain/world";
import { ClaimsBureauPanel } from "@/components/districts/ClaimsBureauPanel";
import { EntryGatePanel } from "@/components/districts/EntryGatePanel";
import { PortfolioClinicPanel } from "@/components/districts/PortfolioClinicPanel";
import { fetchCityState } from "@/lib/api/client";
import type { CityWorldState, DistrictState } from "@/shared/contracts";
import type { TrafficDebugLayer } from "@/lib/city/debug/TrafficDebugController";

type PanelView = "weather" | "claims" | "entry-gate" | "portfolio";

export function CityViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<CityRuntime | null>(null);
  const creatingRef = useRef(false);
  const [selection, setSelection] = useState<SelectionMetadata | null>(null);
  const [status, setStatus] = useState("Loading verified city assets…");
  const [panelView, setPanelView] = useState<PanelView | null>(null);
  const [liveWorld, setLiveWorld] = useState<CityWorldState | null>(null);
  const [dataStatus, setDataStatus] = useState<string>("");

  // Fetch live backend data
  useEffect(() => {
    let cancelled = false;
    async function loadLiveData() {
      const result = await fetchCityState();
      if (cancelled) return;
      if (result.success) {
        setLiveWorld(result.data);
        setDataStatus(`Live · ${new Date(result.data.updatedAt).toLocaleTimeString()}`);
      } else {
        setDataStatus("Using foundation data");
      }
    }
    loadLiveData();
    const interval = setInterval(loadLiveData, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Three.js runtime — guarded against duplicate creation (Strict Mode safe)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (creatingRef.current) return; // Already creating

    let cancelled = false;
    creatingRef.current = true;

    const observer = new ResizeObserver(() => {
      runtimeRef.current?.resize();
    });
    observer.observe(canvas);

    CityRuntime.create({
      canvas,
      qualityTier: recommendedQualityTier(),
      onSelection: (sel) => {
        setSelection(sel);
        if (!sel) { setPanelView(null); return; }
        if (sel.kind === "district") {
          // Use latest liveWorld via a ref snapshot or the state value
          // (this callback is stable; it closes over the effect's scope)
          setPanelView((prev) => {
            // Determine panel from selection
            switch (sel.id) {
              case "claims": return "claims";
              case "entry-gate": return "entry-gate";
              case "portfolio": return "portfolio";
              default: return "weather";
            }
          });
        }
      },
    }).then((created) => {
      if (cancelled) {
        created.dispose();
        return;
      }
      runtimeRef.current = created;
      setStatus("Signal City online");
    }).catch((error: unknown) => {
      console.error("[CityViewport] CityRuntime creation failed:", error);
      setStatus("The 3D city could not start in this browser.");
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      creatingRef.current = false;

      // Dispose the runtime asynchronously — do NOT clear the ref until dispose completes.
      // Strict Mode unmounts then remounts; if dispose is still running when remount happens,
      // the `creatingRef` guard prevents a duplicate create.
      const runtime = runtimeRef.current;
      if (runtime) {
        runtimeRef.current = null;
        runtime.dispose().catch((err) => {
          console.warn("[CityViewport] Runtime disposal warning:", err);
        });
      }
    };
  }, []); // Run once per mount — liveWorld is fetched separately

  const activeWorld = liveWorld ?? FOUNDATION_WORLD;
  const selectedDistrict = activeWorld.districts.find((d: DistrictState) => d.id === selection?.id);

  const selectDistrict = useCallback((id: string) => {
    const district = activeWorld.districts.find((d: DistrictState) => d.id === id);
    if (!district) return;
    setSelection({ id: district.id, label: district.label, kind: "district", detail: district.explanation.summary });
  }, [activeWorld]);

  return (
    <section className="city-shell" aria-label="Signal City 3D market map">
      <canvas ref={canvasRef} className="city-canvas" aria-label="Interactive 3D city" />

      {/* Header */}
      <header className="city-header">
        <div>
          <p className="city-brand">Signal City</p>
          <p className="city-tagline">The crypto market, made visible.</p>
        </div>
        <p className="city-status">
          <span aria-hidden="true" />
          {status}
          {dataStatus && <span className="data-status"> · {dataStatus}</span>}
        </p>
      </header>

      {/* Weather Panel */}
      {panelView === "weather" && (
        <aside className="city-panel" aria-live="polite">
          <p className="panel-label">District Weather</p>
          <h1>{selectedDistrict?.label ?? "Explore Signal City"}</h1>
          <p>{selectedDistrict?.explanation.summary ?? "Click a district building, road, or car. Right-drag to rotate, Ctrl + right-drag to pan, and scroll to zoom."}</p>
          <dl>
            <div><dt>Weather</dt><dd>{selectedDistrict?.weather.kind.replaceAll("_", " ") ?? "—"}</dd></div>
            <div><dt>Severity</dt><dd>{selectedDistrict?.weather.severity ?? "—"}</dd></div>
            <div><dt>Confidence</dt><dd>{selectedDistrict ? `${Math.round(selectedDistrict.weather.confidence * 100)}%` : "—"}</dd></div>
            {selectedDistrict?.city && (
              <>
                <div><dt>Traffic</dt><dd>{Math.round(selectedDistrict.city.trafficDensity * 100)}% density</dd></div>
                <div><dt>Activity</dt><dd>{Math.round(selectedDistrict.city.buildingActivity * 100)}%</dd></div>
              </>
            )}
            <div><dt>Status</dt><dd>{selectedDistrict?.status.replaceAll("_", " ") ?? activeWorld.systemStatus}</dd></div>
          </dl>
          {selectedDistrict?.weather.warnings.length ? (
            <div className="weather-warnings">
              {selectedDistrict.weather.warnings.map((w: string, i: number) => (
                <p key={i} className="warning-text">⚠ {w}</p>
              ))}
            </div>
          ) : null}
          {selectedDistrict?.explanation.causes.length ? (
            <div className="explanation-causes">
              <p className="panel-label">Causes</p>
              <ul>{selectedDistrict.explanation.causes.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
            </div>
          ) : null}
          {selectedDistrict?.explanation.watch.length ? (
            <div className="explanation-watch">
              <p className="panel-label">Watch</p>
              <ul>{selectedDistrict.explanation.watch.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
            </div>
          ) : null}
        </aside>
      )}

      {/* Claims Bureau Panel */}
      {panelView === "claims" && (
        <aside className="city-panel city-panel--wide" aria-live="polite">
          <ClaimsBureauPanel />
        </aside>
      )}

      {/* Entry Gate Panel */}
      {panelView === "entry-gate" && (
        <aside className="city-panel city-panel--wide" aria-live="polite">
          <EntryGatePanel />
        </aside>
      )}

      {/* Portfolio Clinic Panel */}
      {panelView === "portfolio" && (
        <aside className="city-panel city-panel--wide" aria-live="polite">
          <PortfolioClinicPanel />
        </aside>
      )}

      {/* District Navigation */}
      <nav className="district-list" aria-label="Available districts">
        {activeWorld.districts.map((district: DistrictState) => (
          <button
            key={district.id}
            type="button"
            aria-pressed={selectedDistrict?.id === district.id}
            onClick={() => selectDistrict(district.id)}
          >
            {district.id === "claims" ? "⚖ Claims" :
             district.id === "entry-gate" ? "🛂 Gate" :
             district.id === "portfolio" ? "🏥 Clinic" :
             district.subjectId.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* Traffic Debug (dev only) */}
      {process.env.NODE_ENV !== "production" && (
        <div className="traffic-debug-panel" aria-label="Traffic debug layers">
          <span>Debug</span>
          {([
            ["G", "master"],
            ["N", "nodes"],
            ["E", "edges"],
            ["I", "intersections"],
            ["R", "route"],
            ["O", "occupancy"],
            ["C", "components"],
            ["V", "reservations"],
          ] as Array<[string, TrafficDebugLayer]>).map(([key, layer]) => (
            <button key={layer} type="button" title={layer} onClick={() => runtimeRef.current?.toggleTrafficDebug(layer)}>
              {key}
            </button>
          ))}
        </div>
      )}

      {/* CoinMarketCap Attribution */}
      <footer className="city-attribution">
        Powered by CoinMarketCap Agent Hub
      </footer>
    </section>
  );
}
