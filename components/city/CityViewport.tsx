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
import { isCityDebugEnabled } from "@/lib/city/debug/debugGate";

type PanelView = "weather" | "claims" | "entry-gate" | "portfolio";
type SheetState = "collapsed" | "half" | "full";

export function CityViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<CityRuntime | null>(null);
  const creatingRef = useRef(false);
  const [selection, setSelection] = useState<SelectionMetadata | null>(null);
  const [status, setStatus] = useState("Loading verified city assets…");
  const [panelView, setPanelView] = useState<PanelView | null>(null);
  const [liveWorld, setLiveWorld] = useState<CityWorldState | null>(null);
  const [dataStatus, setDataStatus] = useState<string>("");
  const [sheetState, setSheetState] = useState<SheetState>("collapsed");
  const [webglFailed, setWebglFailed] = useState(false);

  // Fetch live backend data
  useEffect(() => {
    let cancelled = false;
    async function loadLiveData() {
      const result = await fetchCityState();
      if (cancelled) return;
      if (result.success) {
        setLiveWorld(result.data);
        setDataStatus(`Live · ${new Date(result.data.updatedAt).toLocaleTimeString()}`);
      }
    }
    loadLiveData();
    const interval = setInterval(loadLiveData, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Three.js runtime
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (creatingRef.current) return;

    let cancelled = false;
    creatingRef.current = true;

    const observer = new ResizeObserver(() => runtimeRef.current?.resize());
    observer.observe(canvas);

    CityRuntime.create({
      canvas,
      container: canvas.parentElement!,
      qualityTier: recommendedQualityTier(),
      cameraCallbacks: {
        onTap: (_x, _y) => {
          // Tap-to-deselect handled by SelectionController
        },
        onDoubleTap: (_x, _y) => {
          // Focus on selected district
          if (selection?.id) {
            runtimeRef.current?.focusDistrict(selection.id);
          }
        },
      },
      onSelection: (sel) => {
        setSelection(sel);
        if (!sel) {
          setPanelView(null);
          setSheetState("collapsed");
          return;
        }
        if (sel.kind === "district") {
          setSheetState("half");
          switch (sel.id) {
            case "claims": setPanelView("claims"); break;
            case "entry-gate": setPanelView("entry-gate"); break;
            case "portfolio": setPanelView("portfolio"); break;
            default: setPanelView("weather"); break;
          }
        }
      },
    }).then((created) => {
      if (cancelled) { created.dispose(); return; }
      runtimeRef.current = created;
      setStatus("Signal City online");
    }).catch((error: unknown) => {
      console.error("[CityViewport] CityRuntime creation failed:", error);
      setWebglFailed(true);
      setStatus("The 3D city could not start in this browser.");
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      creatingRef.current = false;
      const runtime = runtimeRef.current;
      if (runtime) {
        runtimeRef.current = null;
        runtime.dispose().catch((err) => console.warn("[CityViewport] Dispose warning:", err));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeWorld = liveWorld ?? FOUNDATION_WORLD;
  const selectedDistrict = activeWorld.districts.find((d: DistrictState) => d.id === selection?.id);

  const selectDistrict = useCallback((id: string) => {
    const district = activeWorld.districts.find((d: DistrictState) => d.id === id);
    if (!district) return;
    setSelection({ id: district.id, label: district.label, kind: "district", detail: district.explanation.summary });
    setSheetState("half");
    runtimeRef.current?.focusDistrict(id);
    switch (id) {
      case "claims": setPanelView("claims"); break;
      case "entry-gate": setPanelView("entry-gate"); break;
      case "portfolio": setPanelView("portfolio"); break;
      default: setPanelView("weather"); break;
    }
  }, [activeWorld]);

  const sheetClass = `city-panel${panelView !== "weather" ? " city-panel--wide" : ""} ${sheetState}`;

  // ---- WebGL Fallback ----
  if (webglFailed) {
    return (
      <section className="city-shell">
        <header className="city-header">
          <div><p className="city-brand">Signal City</p><p className="city-tagline">The crypto market, made visible.</p></div>
          <p className="city-status"><span aria-hidden="true" style={{ background: "#eab308", boxShadow: "0 0 10px #eab308" }} />3D unavailable</p>
        </header>
        <div className="city-fallback">
          <h2>3D City Unavailable</h2>
          <p>Your browser does not support WebGL, or the 3D renderer could not start. All analytical features remain available.</p>
          <dl className="fallback-grid">
            {activeWorld.districts.filter((d: DistrictState) => d.scope === "sector").map((d: DistrictState) => (
              <div key={d.id} className="fallback-card">
                <dt>{d.label}</dt>
                <dd>{d.weather.kind.replace(/_/g, " ")} · {d.weather.severity}</dd>
              </div>
            ))}
          </dl>
          <nav className="district-list" style={{ position: "static", marginTop: 16 }}>
            {activeWorld.districts.map((d: DistrictState) => (
              <button key={d.id} type="button" onClick={() => selectDistrict(d.id)}>
                {d.id === "claims" ? "⚖ Claims" : d.id === "entry-gate" ? "🛂 Gate" : d.id === "portfolio" ? "🏥 Clinic" : d.subjectId.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>
      </section>
    );
  }

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

      {/* District Panel / Bottom Sheet */}
      <aside className={sheetClass} aria-live="polite">
        {sheetState !== "full" && <div className="sheet-handle" onClick={() => setSheetState(sheetState === "collapsed" ? "half" : "collapsed")} />}
        {sheetState !== "collapsed" && (
          <button className="sheet-close" onClick={() => { setSelection(null); setPanelView(null); setSheetState("collapsed"); }} aria-label="Close">×</button>
        )}

        {/* Collapsed: minimal */}
        {sheetState === "collapsed" && (
          <div>
            <p className="panel-label">{selectedDistrict?.label ?? "Explore"}</p>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
              {selectedDistrict?.weather.kind.replace(/_/g, " ") ?? "Tap a district"}
            </p>
          </div>
        )}

        {/* Half/Full: Weather */}
        {sheetState !== "collapsed" && panelView === "weather" && (
          <>
            <p className="panel-label">District Weather</p>
            <h1>{selectedDistrict?.label ?? "Explore Signal City"}</h1>
            <p>{selectedDistrict?.explanation.summary ?? "Click a district building, road, or car."}</p>
            <dl>
              <div><dt>Weather</dt><dd>{selectedDistrict?.weather.kind.replaceAll("_", " ") ?? "—"}</dd></div>
              <div><dt>Severity</dt><dd>{selectedDistrict?.weather.severity ?? "—"}</dd></div>
              <div><dt>Confidence</dt><dd>{selectedDistrict ? `${Math.round(selectedDistrict.weather.confidence * 100)}%` : "—"}</dd></div>
              {selectedDistrict?.city && (
                <>
                  <div><dt>Traffic</dt><dd>{Math.round(selectedDistrict.city.trafficDensity * 100)}%</dd></div>
                  <div><dt>Activity</dt><dd>{Math.round(selectedDistrict.city.buildingActivity * 100)}%</dd></div>
                </>
              )}
              <div><dt>Status</dt><dd>{selectedDistrict?.status.replaceAll("_", " ") ?? activeWorld.systemStatus}</dd></div>
            </dl>
            {selectedDistrict?.weather.warnings.length ? (
              <div className="weather-warnings">
                {selectedDistrict.weather.warnings.map((w: string, i: number) => <p key={i} className="warning-text">⚠ {w}</p>)}
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
          </>
        )}

        {/* Half/Full: Product panels */}
        {sheetState !== "collapsed" && panelView === "claims" && <ClaimsBureauPanel />}
        {sheetState !== "collapsed" && panelView === "entry-gate" && <EntryGatePanel />}
        {sheetState !== "collapsed" && panelView === "portfolio" && <PortfolioClinicPanel />}
      </aside>

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
             district.id === "global" ? "GLOBAL" :
             district.id === "memecoin" ? "MEME" :
             district.id === "rwa" ? "RWA" :
             district.subjectId.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* Traffic Debug */}
      {isCityDebugEnabled() && (
        <div className="traffic-debug-panel" aria-label="Traffic debug layers">
          <span>Debug</span>
          {([
            ["G", "master"], ["N", "nodes"], ["E", "edges"], ["I", "intersections"],
            ["R", "route"], ["O", "occupancy"], ["C", "components"], ["V", "reservations"],
          ] as Array<[string, TrafficDebugLayer]>).map(([key, layer]) => (
            <button key={layer} type="button" title={layer} onClick={() => runtimeRef.current?.toggleTrafficDebug(layer)}>{key}</button>
          ))}
        </div>
      )}

      <footer className="city-attribution">Powered by CoinMarketCap Agent Hub</footer>
    </section>
  );
}
