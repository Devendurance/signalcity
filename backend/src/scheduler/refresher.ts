// ============================================================
// Signal City — Scheduled Refresher
// Idempotent, safe to retry. Runs periodic city-state refreshes.
// Tracks last refresh attempt vs. last successful refresh.
// ============================================================

import type { ICMCAdapter } from "../coinmarketcap/adapter";
import { DistrictStateBuilder, DEFAULT_DISTRICTS } from "../market-engine/district-builder";
import { StateCache } from "../cache/state-cache";

// ---- Configuration ----

export interface SchedulerConfig {
  /** Interval between automatic refreshes (ms). */
  refreshIntervalMs: number;
  /** Maximum number of retries on failure. */
  maxRetries: number;
  /** Delay between retries (ms). */
  retryDelayMs: number;
  /** Whether the scheduler is enabled. */
  enabled: boolean;
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  refreshIntervalMs: 15 * 60 * 1000, // 15 minutes
  maxRetries: 3,
  retryDelayMs: 30 * 1000, // 30 seconds
  enabled: true,
};

// ---- Scheduler ----

export class CityRefresher {
  private config: SchedulerConfig;
  private adapter: ICMCAdapter;
  private cache: StateCache;
  private builder: DistrictStateBuilder;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private refreshCount = 0;
  private errorCount = 0;

  constructor(
    adapter: ICMCAdapter,
    cache: StateCache,
    config: Partial<SchedulerConfig> = {},
  ) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
    this.adapter = adapter;
    this.cache = cache;
    this.builder = new DistrictStateBuilder(adapter);
  }

  // ---- Lifecycle ----

  start(): void {
    if (!this.config.enabled) return;
    if (this.timer) return; // already running

    console.log(`[Scheduler] Starting — refresh every ${this.config.refreshIntervalMs / 1000}s`);

    // Run immediately on start
    this.refresh().catch((err) => {
      console.error("[Scheduler] Initial refresh failed:", err);
    });

    // Then periodically
    this.timer = setInterval(() => {
      this.refresh().catch((err) => {
        console.error("[Scheduler] Scheduled refresh failed:", err);
      });
    }, this.config.refreshIntervalMs);

    this.running = true;
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    console.log("[Scheduler] Stopped");
  }

  // ---- Refresh Logic ----

  /**
   * Refresh the entire city state.
   * Idempotent — safe to call multiple times, even concurrently.
   * Failures are recorded but don't corrupt the cache.
   */
  async refresh(): Promise<{ success: boolean; error?: string }> {
    this.cache.markRefreshAttempt();
    this.refreshCount++;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`[Scheduler] Refresh attempt ${attempt}/${this.config.maxRetries}`);

        const { world, receipts } = await this.builder.buildCity(DEFAULT_DISTRICTS);

        // Store city state
        this.cache.setCityState(world);

        // Store individual districts
        for (const district of world.districts) {
          this.cache.setDistrict(district.id, district);
        }

        // Store receipts
        for (const receipt of receipts) {
          this.cache.setReceipt(receipt.id, receipt);
        }

        // Prune old entries
        const pruned = this.cache.prune();
        if (pruned > 0) {
          console.log(`[Scheduler] Pruned ${pruned} stale cache entries`);
        }

        console.log(`[Scheduler] Refresh complete — ${world.districts.length} districts updated`);
        return { success: true };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Scheduler] Refresh attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.config.maxRetries) {
          await sleep(this.config.retryDelayMs);
        }
      }
    }

    // All retries exhausted
    const errorMsg = `Refresh failed after ${this.config.maxRetries} attempts: ${lastError?.message}`;
    this.cache.markRefreshError(errorMsg);
    this.errorCount++;
    console.error(`[Scheduler] ${errorMsg}`);

    return { success: false, error: errorMsg };
  }

  // ---- Status ----

  isRunning(): boolean {
    return this.running;
  }

  getStatus() {
    return {
      running: this.running,
      refreshCount: this.refreshCount,
      errorCount: this.errorCount,
      lastAttempt: this.cache.getRefreshStatus().lastAttempt,
      lastSuccess: this.cache.getRefreshStatus().lastSuccess,
      lastError: this.cache.getRefreshStatus().error,
      intervalMs: this.config.refreshIntervalMs,
    };
  }
}

// ---- Utility ----

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
