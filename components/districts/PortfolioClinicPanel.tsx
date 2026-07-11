"use client";

import { useState, useCallback } from "react";
import { submitPortfolio } from "@/lib/api/client";
import type { HoldingEntry, PortfolioReport, HoldingDiagnosis } from "@/shared/contracts/portfolio";

interface HoldingRow {
  assetId: string;
  name: string;
  allocationPct: number;
  thesis: string;
  sector: string;
  narrativeTags: string;
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: "#22c55e",
  under_observation: "#eab308",
  critical_attention: "#ef4444",
};

export function PortfolioClinicPanel() {
  const [holdings, setHoldings] = useState<HoldingRow[]>([
    { assetId: "", name: "", allocationPct: 0, thesis: "", sector: "", narrativeTags: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PortfolioReport | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  function updateHolding(index: number, field: keyof HoldingRow, value: string | number) {
    setHoldings((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    );
  }

  function addHolding() {
    setHoldings((prev) => [
      ...prev,
      { assetId: "", name: "", allocationPct: 0, thesis: "", sector: "", narrativeTags: "" },
    ]);
  }

  function removeHolding(index: number) {
    setHoldings((prev) => prev.filter((_, i) => i !== index));
  }

  function toHoldingEntries(): HoldingEntry[] {
    return holdings
      .filter((h) => h.assetId.trim())
      .map((h) => ({
        assetId: h.assetId.trim().toUpperCase(),
        name: h.name.trim() || h.assetId.trim().toUpperCase(),
        allocationPct: h.allocationPct || 0,
        thesis: h.thesis.trim() || undefined,
        sector: h.sector.trim() || undefined,
        narrativeTags: h.narrativeTags
          ? h.narrativeTags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
      }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entries = toHoldingEntries();
    if (entries.length === 0) return;

    setLoading(true);
    setError(null);

    const res = await submitPortfolio(entries);
    if (res.success) {
      setReport(res.data);
    } else {
      setError(res.error.message);
    }
    setLoading(false);
  }

  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvError("CSV must have a header row and at least one data row.");
        return;
      }

      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const assetIdx = headers.indexOf("assetid") !== -1 ? headers.indexOf("assetid") : headers.indexOf("symbol");
      const nameIdx = headers.indexOf("name");
      const allocIdx = headers.indexOf("allocation") !== -1 ? headers.indexOf("allocation") : headers.indexOf("allocationpct");
      const thesisIdx = headers.indexOf("thesis");
      const sectorIdx = headers.indexOf("sector");
      const tagsIdx = headers.indexOf("narrativetags") !== -1 ? headers.indexOf("narrativetags") : headers.indexOf("tags");

      if (assetIdx === -1) {
        setCsvError('CSV must have an "assetId" or "symbol" column.');
        return;
      }

      const parsed: HoldingRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        parsed.push({
          assetId: cols[assetIdx] ?? "",
          name: nameIdx !== -1 ? cols[nameIdx] ?? "" : "",
          allocationPct: allocIdx !== -1 ? parseFloat(cols[allocIdx]) || 0 : 0,
          thesis: thesisIdx !== -1 ? cols[thesisIdx] ?? "" : "",
          sector: sectorIdx !== -1 ? cols[sectorIdx] ?? "" : "",
          narrativeTags: tagsIdx !== -1 ? cols[tagsIdx] ?? "" : "",
        });
      }

      setHoldings(parsed);
    };
    reader.readAsText(file);
  }, []);

  function reset() {
    setHoldings([{ assetId: "", name: "", allocationPct: 0, thesis: "", sector: "", narrativeTags: "" }]);
    setReport(null);
    setError(null);
    setCsvError(null);
  }

  return (
    <div className="district-panel" role="dialog" aria-label="Portfolio Clinic">
      <h2>Portfolio Clinic</h2>
      <p className="panel-subtitle">Diagnose your holdings before the market does.</p>

      {!report ? (
        <form onSubmit={handleSubmit} className="district-form">
          <div className="csv-upload">
            <label>
              Upload CSV
              <input type="file" accept=".csv" onChange={handleCsvUpload} />
            </label>
            <p className="csv-hint">Columns: assetId, name, allocationPct, thesis, sector, narrativeTags</p>
            {csvError && <p className="error-message">{csvError}</p>}
          </div>

          <div className="holdings-table">
            <div className="holdings-header">
              <span>Asset</span><span>Name</span><span>Alloc %</span><span>Thesis</span><span>Sector</span><span>Tags</span><span />
            </div>
            {holdings.map((h, i) => (
              <div key={i} className="holdings-row">
                <input value={h.assetId} onChange={(e) => updateHolding(i, "assetId", e.target.value)} placeholder="BTC" />
                <input value={h.name} onChange={(e) => updateHolding(i, "name", e.target.value)} placeholder="Bitcoin" />
                <input type="number" value={h.allocationPct || ""} onChange={(e) => updateHolding(i, "allocationPct", parseFloat(e.target.value) || 0)} placeholder="25" min="0" max="100" />
                <input value={h.thesis} onChange={(e) => updateHolding(i, "thesis", e.target.value)} placeholder="Digital gold" />
                <input value={h.sector} onChange={(e) => updateHolding(i, "sector", e.target.value)} placeholder="store-of-value" />
                <input value={h.narrativeTags} onChange={(e) => updateHolding(i, "narrativeTags", e.target.value)} placeholder="institutional, L1" />
                <button type="button" onClick={() => removeHolding(i)} className="remove-btn" title="Remove">✕</button>
              </div>
            ))}
            <button type="button" onClick={addHolding} className="add-btn">+ Add Holding</button>
          </div>

          <button type="submit" disabled={loading || toHoldingEntries().length === 0}>
            {loading ? "Diagnosing Portfolio..." : "Run Portfolio Diagnosis"}
          </button>
          {error && <p className="error-message">{error}</p>}
        </form>
      ) : (
        <div className="receipt-card portfolio-report">
          <h3>Portfolio Health Report</h3>

          <div className="overall-condition">
            <p><strong>{report.overallCondition}</strong></p>
            <p>{report.primaryDiagnosis}</p>
          </div>

          <section>
            <h4>Holdings</h4>
            <div className="holdings-diagnosis">
              {report.holdings.map((h: HoldingDiagnosis) => (
                <div key={h.assetId} className="holding-card" style={{ borderLeftColor: HEALTH_COLORS[h.health] ?? "#6b7280" }}>
                  <div className="holding-header">
                    <strong>{h.assetId}</strong>
                    <span>{h.allocationPct}%</span>
                    <span className={`health-badge ${h.health.replace(/_/g, "-")}`}>{h.health.replace(/_/g, " ")}</span>
                  </div>
                  <p>{h.diagnosis}</p>
                  {h.thesisConflicts && <p className="warning-text">⚠ Thesis conflicts with current evidence</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="metrics-grid">
            <div><span>Asset Concentration</span><strong>{(report.assetConcentration * 100).toFixed(0)}%</strong></div>
            <div><span>Sector Concentration</span><strong>{(report.sectorConcentration * 100).toFixed(0)}%</strong></div>
            <div><span>Volatility Score</span><strong>{(report.volatilityScore * 100).toFixed(0)}%</strong></div>
            {report.averageCorrelation !== undefined && (
              <div><span>Avg Correlation</span><strong>{(report.averageCorrelation * 100).toFixed(0)}%</strong></div>
            )}
          </section>

          {report.narrativeOverlap.length > 0 && (
            <section className="warning-section">
              <h4>Narrative Overlap</h4>
              <ul>{report.narrativeOverlap.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </section>
          )}

          {report.blindSpots.length > 0 && (
            <section className="warning-section">
              <h4>Portfolio Blind Spots</h4>
              <ul>{report.blindSpots.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </section>
          )}

          {report.suggestedReview.length > 0 && (
            <section>
              <h4>Suggested Review</h4>
              <ul>{report.suggestedReview.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </section>
          )}

          <footer>
            <p>Generated: {new Date(report.generatedAt).toLocaleString()}</p>
            <p className="receipt-id">Report ID: {report.id}</p>
          </footer>

          <button onClick={reset} className="secondary">Analyze Another Portfolio</button>
        </div>
      )}
    </div>
  );
}
