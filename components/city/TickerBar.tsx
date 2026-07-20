"use client";

import { useEffect, useState } from "react";

interface TokenRow {
  symbol: string;
  name: string;
  price: number;
  percentChange24h: number | null;
  percentChange1h: number | null;
  marketCap: number | null;
}

interface TokenData {
  top10: TokenRow[];
  trending: TokenRow[];
  updatedAt: string;
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatChange(pct: number | null): { text: string; color: string } {
  if (pct === null) return { text: "—", color: "var(--muted)" };
  const sign = pct >= 0 ? "+" : "";
  return {
    text: `${sign}${pct.toFixed(2)}%`,
    color: pct >= 0 ? "#72df9b" : "#f87171",
  };
}

function formatMarketCap(mcap: number | null): string {
  if (mcap === null) return "—";
  if (mcap >= 1e12) return `$${(mcap / 1e12).toFixed(2)}T`;
  if (mcap >= 1e9) return `$${(mcap / 1e9).toFixed(2)}B`;
  if (mcap >= 1e6) return `$${(mcap / 1e6).toFixed(2)}M`;
  return `$${(mcap / 1e3).toFixed(0)}K`;
}

export function TickerBar() {
  const [data, setData] = useState<TokenData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/v1/tokens");
        const json = await res.json();
        if (!cancelled && json.success) setData(json.data);
      } catch {
        // Fail silently — ticker is non-critical
      }
    }
    load();
    const interval = setInterval(load, 60 * 60 * 1000); // 1 hour
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!data) return null;

  return (
    <>
      {/* Left: Trending */}
      <div className="ticker-bar ticker-left">
        <p className="ticker-title">Trending</p>
        <ol className="ticker-list">
          {data.trending.slice(0, 10).map((t) => {
            const ch = formatChange(t.percentChange24h);
            return (
              <li key={t.symbol} className="ticker-row">
                <span className="ticker-symbol">{t.symbol}</span>
                <span className="ticker-price">{formatPrice(t.price)}</span>
                <span className="ticker-change" style={{ color: ch.color }}>{ch.text}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Right: Top Tokens */}
      <div className="ticker-bar ticker-right">
        <p className="ticker-title">Top Market Cap</p>
        <ol className="ticker-list">
          {data.top10.slice(0, 10).map((t) => {
            const ch = formatChange(t.percentChange24h);
            return (
              <li key={t.symbol} className="ticker-row">
                <span className="ticker-symbol">{t.symbol}</span>
                <span className="ticker-price">{formatPrice(t.price)}</span>
                <span className="ticker-change" style={{ color: ch.color }}>{ch.text}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
