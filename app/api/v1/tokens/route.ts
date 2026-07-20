// GET /api/v1/tokens — Top & trending tokens from CoinMarketCap
// Cached for 1 hour. No API key exposed to client.

import { getAdapter, apiSuccess, apiError } from "../adapter";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1 hour

interface TokenRow {
  symbol: string;
  name: string;
  price: number;
  percentChange24h: number | null;
  percentChange1h: number | null;
  marketCap: number | null;
}

export async function GET(): Promise<Response> {
  try {
    const adapter = getAdapter();

    // Fetch top 20 by market cap from CMC
    const raw = await (adapter as any).request?.("/v1/cryptocurrency/listings/latest?limit=20&sort=market_cap");
    const data = raw?.data ?? [];

    const allTokens: TokenRow[] = data.map((coin: any) => ({
      symbol: coin.symbol,
      name: coin.name,
      price: coin.quote?.USD?.price ?? 0,
      percentChange24h: coin.quote?.USD?.percent_change_24h ?? null,
      percentChange1h: coin.quote?.USD?.percent_change_1h ?? null,
      marketCap: coin.quote?.USD?.market_cap ?? null,
    }));

    // Top 10 by market cap
    const top10 = allTokens.slice(0, 10);

    // Trending: top 10 by 24h change (absolute)
    const trending = [...allTokens]
      .filter((t) => t.percentChange24h !== null)
      .sort((a, b) => (b.percentChange24h ?? 0) - (a.percentChange24h ?? 0))
      .slice(0, 10);

    return apiSuccess({ top10, trending }, { updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[api/tokens] Failed:", error);
    return apiError("TOKENS_FAILED", "Token data unavailable");
  }
}
