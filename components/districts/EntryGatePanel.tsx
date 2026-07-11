"use client";

import { useState } from "react";
import { submitEntryCheck } from "@/lib/api/client";
import type { EntryCheckResult } from "@/shared/contracts/entry-gate";

const GATE_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "#22c55e" },
  caution: { label: "Caution", color: "#eab308" },
  restricted: { label: "Restricted", color: "#f97316" },
  closed: { label: "Closed", color: "#ef4444" },
  inspection_required: { label: "Inspection Required", color: "#6b7280" },
};

export function EntryGatePanel() {
  const [assetId, setAssetId] = useState("");
  const [reason, setReason] = useState("");
  const [horizon, setHorizon] = useState("medium");
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EntryCheckResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId.trim() || !reason.trim()) return;

    setLoading(true);
    setError(null);

    const res = await submitEntryCheck({
      assetId: assetId.trim().toUpperCase(),
      intendedAction: "Buy spot",
      reason: reason.trim(),
      horizon,
      riskTolerance,
    });

    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error.message);
    }
    setLoading(false);
  }

  function reset() {
    setAssetId("");
    setReason("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="district-panel" role="dialog" aria-label="Entry Gate">
      <h2>Entry Gate</h2>
      <p className="panel-subtitle">Run your reason through the FOMO Checkpoint.</p>
      <p className="panel-description">
        We evaluate the quality of your reasoning against current market evidence.
        This is not a buy/sell recommendation — it&apos;s a reasoning assessment.
      </p>

      {!result ? (
        <form onSubmit={handleSubmit} className="district-form">
          <label>
            Asset
            <input
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="e.g. DOGE, SOL, SUI"
              required
            />
          </label>
          <label>
            Your Reason for Entering
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='e.g. "I want to buy DOGE because everyone is talking about it and I think it will keep pumping"'
              rows={3}
              required
            />
          </label>
          <label>
            Time Horizon
            <select value={horizon} onChange={(e) => setHorizon(e.target.value)}>
              <option value="short">Short-term (days)</option>
              <option value="medium">Medium-term (weeks)</option>
              <option value="long">Long-term (months+)</option>
            </select>
          </label>
          <label>
            Risk Tolerance
            <select value={riskTolerance} onChange={(e) => setRiskTolerance(e.target.value as "low" | "medium" | "high")}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <button type="submit" disabled={loading || !assetId.trim() || !reason.trim()}>
            {loading ? "Evaluating Thesis..." : "Run Entry Check"}
          </button>
          {error && <p className="error-message">{error}</p>}
        </form>
      ) : (
        <div className="receipt-card">
          <div className="gate-indicator" style={{ borderColor: GATE_LABELS[result.gateStatus]?.color ?? "#6b7280" }}>
            <span
              className="gate-light"
              style={{ backgroundColor: GATE_LABELS[result.gateStatus]?.color ?? "#6b7280" }}
            />
            <span className="gate-label">
              {GATE_LABELS[result.gateStatus]?.label ?? result.gateStatus}
            </span>
          </div>

          <p className="receipt-finding">{result.summary}</p>

          {result.supportingEvidence.length > 0 && (
            <section>
              <h4>What Supports Your Thesis</h4>
              <ul>{result.supportingEvidence.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </section>
          )}

          {result.challengingEvidence.length > 0 && (
            <section>
              <h4>What Challenges Your Thesis</h4>
              <ul>{result.challengingEvidence.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </section>
          )}

          {result.emotionalPatterns.length > 0 && (
            <section className="warning-section">
              <h4>Emotional Reasoning Detected</h4>
              <ul>{result.emotionalPatterns.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </section>
          )}

          {result.waitingConditions.length > 0 && (
            <section>
              <h4>Conditions Worth Waiting For</h4>
              <ul>{result.waitingConditions.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </section>
          )}

          {result.invalidationConditions.length > 0 && (
            <section>
              <h4>Thesis Invalidation Conditions</h4>
              <ul>{result.invalidationConditions.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </section>
          )}

          {result.unansweredQuestions.length > 0 && (
            <section className="warning-section">
              <h4>Questions You Haven&apos;t Answered</h4>
              <ul>{result.unansweredQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </section>
          )}

          <footer>
            <p>Generated: {new Date(result.generatedAt).toLocaleString()}</p>
            <p className="receipt-id">Result ID: {result.id}</p>
          </footer>

          <button onClick={reset} className="secondary">Test Another Thesis</button>
        </div>
      )}
    </div>
  );
}
