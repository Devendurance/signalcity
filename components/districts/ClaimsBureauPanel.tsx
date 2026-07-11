"use client";

import { useState } from "react";
import { submitClaim } from "@/lib/api/client";
import type { ClaimReceipt } from "@/shared/contracts/claims";

export function ClaimsBureauPanel() {
  const [claim, setClaim] = useState("");
  const [assetId, setAssetId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ClaimReceipt | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claim.trim()) return;

    setLoading(true);
    setError(null);

    const result = await submitClaim({
      claim: claim.trim(),
      assetId: assetId.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
    });

    if (result.success) {
      setReceipt(result.data);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }

  function reset() {
    setClaim("");
    setAssetId("");
    setSourceUrl("");
    setReceipt(null);
    setError(null);
  }

  return (
    <div className="district-panel" role="dialog" aria-label="Claims Bureau">
      <h2>Claims Bureau</h2>
      <p className="panel-description">
        Submit a crypto claim for evidence-based investigation.
        We&apos;ll decompose it, check it against CoinMarketCap data, and issue a public receipt.
      </p>

      {!receipt ? (
        <form onSubmit={handleSubmit} className="district-form">
          <label>
            Claim
            <textarea
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder='e.g. "Whales are accumulating LINK" or "Bitcoin is falling because ETF demand has disappeared"'
              rows={3}
              required
            />
          </label>
          <label>
            Asset (optional)
            <input
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="e.g. BTC, SOL, LINK"
            />
          </label>
          <label>
            Source URL (optional)
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="Where you found this claim"
            />
          </label>

          <button type="submit" disabled={loading || !claim.trim()}>
            {loading ? "Investigating..." : "Investigate Claim"}
          </button>
          {error && <p className="error-message">{error}</p>}
        </form>
      ) : (
        <div className="receipt-card">
          <h3>Claim Receipt</h3>
          <div className="receipt-classification">
            <span className={`classification-badge ${receipt.classification.replace(/_/g, "-")}`}>
              {receipt.classification.replace(/_/g, " ")}
            </span>
          </div>
          <p className="receipt-finding">{receipt.finding}</p>

          {receipt.supportingEvidence.length > 0 && (
            <section>
              <h4>What Supports It</h4>
              <ul>
                {receipt.supportingEvidence.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </section>
          )}

          {receipt.weakeningEvidence.length > 0 && (
            <section>
              <h4>What Weakens It</h4>
              <ul>
                {receipt.weakeningEvidence.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </section>
          )}

          {receipt.unknowns.length > 0 && (
            <section>
              <h4>What Remains Unknown</h4>
              <ul>
                {receipt.unknowns.map((u, i) => <li key={i}>{u}</li>)}
              </ul>
            </section>
          )}

          {receipt.strengtheningConditions.length > 0 && (
            <section>
              <h4>What Would Strengthen This Claim</h4>
              <ul>
                {receipt.strengtheningConditions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </section>
          )}

          <footer>
            <p>Skills used: {receipt.skillsUsed.join(", ")}</p>
            <p>Generated: {new Date(receipt.generatedAt).toLocaleString()}</p>
            <p className="receipt-id">Receipt ID: {receipt.id}</p>
          </footer>

          <button onClick={reset} className="secondary">Investigate Another Claim</button>
        </div>
      )}
    </div>
  );
}
