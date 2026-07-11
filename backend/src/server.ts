// ============================================================
// Signal City — Express Server
// ============================================================

import express from "express";
import cors from "cors";
import { cityRouter } from "./api/routes/city";
import { statusRouter } from "./api/routes/status";
import { claimsRouter } from "./api/routes/claims";
import { entryGateRouter } from "./api/routes/entry-gate";
import { portfolioRouter } from "./api/routes/portfolio";
import { FixtureAdapter } from "./coinmarketcap/adapter";
import type { ICMCAdapter } from "./coinmarketcap/adapter";
import { LiveMCPAdapter } from "./coinmarketcap/live-adapter";
import { StateCache } from "./cache/state-cache";
import { CityRefresher } from "./scheduler/refresher";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const USE_LIVE_CMC = process.env.CMC_LIVE === "true";

export interface AppContext {
  adapter: ICMCAdapter;
  cache: StateCache;
  refresher: CityRefresher;
}

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  // Request ID middleware
  app.use((_req, res, next) => {
    res.setHeader("X-Request-Id", crypto.randomUUID());
    next();
  });

  // Shared dependencies
  const adapter = USE_LIVE_CMC
    ? new LiveMCPAdapter()
    : new FixtureAdapter();
  const cache = new StateCache();
  const refresher = new CityRefresher(adapter, cache);

  const ctx: AppContext = { adapter, cache, refresher };

  // Mount routes
  app.use("/api/v1/city", cityRouter(ctx));
  app.use("/api/v1/system-status", statusRouter(ctx));
  app.use("/api/v1/claims", claimsRouter(ctx));
  app.use("/api/v1/entry-checks", entryGateRouter(ctx));
  app.use("/api/v1/portfolios", portfolioRouter(ctx));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      cacheStats: cache.getStats(),
    });
  });

  return { app, refresher };
}

// Only start the server when this is the entry point (not when imported by tests)
if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  const { app, refresher } = createApp();

  // Start the scheduler
  refresher.start();

  const server = app.listen(PORT, () => {
    console.log(`[Signal City] Backend listening on http://localhost:${PORT}`);
    console.log(`[Signal City] API: http://localhost:${PORT}/api/v1/city`);
    console.log(`[Signal City] Scheduler started (every 15 min)`);
    console.log(`[Signal City] Using FixtureAdapter (dev mode)`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("[Signal City] Shutting down...");
    refresher.stop();
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
