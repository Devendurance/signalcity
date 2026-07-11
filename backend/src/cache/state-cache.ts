// ============================================================
// Signal City — State Cache
// In-memory cache for DistrictState and CityWorldState.
// Tracks freshness independently from provider data freshness.
// Never silently labels stale data as current.
// ============================================================

import type { DistrictState, CityWorldState, SystemStatus } from "@shared/contracts/district";
import type { SkillReceipt } from "@shared/contracts/receipt";

// ---- Cache Entry ----

export interface CacheEntry<T> {
  data: T;
  cachedAt: string;
  expiresAt: string;
  /** How many times this entry has been served. */
  hitCount: number;
}

export interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
  staleHits: number;
}

// ---- Cache Configuration ----

export interface CacheConfig {
  /** How long a city state is considered fresh (ms). */
  cityStateTtlMs: number;
  /** How long a single district's state is considered fresh (ms). */
  districtTtlMs: number;
  /** Maximum number of district cache entries. */
  maxDistrictEntries: number;
  /** How long receipts are kept (ms). */
  receiptTtlMs: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  cityStateTtlMs: 5 * 60 * 1000,   // 5 minutes
  districtTtlMs: 5 * 60 * 1000,    // 5 minutes
  maxDistrictEntries: 100,
  receiptTtlMs: 30 * 60 * 1000,    // 30 minutes
};

// ---- Cache State ----

export class StateCache {
  private config: CacheConfig;

  // Primary caches
  private cityState: CacheEntry<CityWorldState> | null = null;
  private districts = new Map<string, CacheEntry<DistrictState>>();
  private receipts = new Map<string, CacheEntry<SkillReceipt>>();

  // Tracking
  private lastRefreshAttempt: string | null = null;
  private lastSuccessfulRefresh: string | null = null;
  private refreshError: string | null = null;
  private stats: CacheStats = { entries: 0, hits: 0, misses: 0, staleHits: 0 };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---- City State ----

  getCityState(): {
    state: CityWorldState | null;
    freshness: "fresh" | "aging" | "stale" | "empty";
    cachedAt: string | null;
  } {
    if (!this.cityState) {
      this.stats.misses++;
      return { state: null, freshness: "empty", cachedAt: null };
    }

    const age = Date.now() - new Date(this.cityState.cachedAt).getTime();
    const isExpired = age > this.config.cityStateTtlMs;
    const isStale = age > this.config.cityStateTtlMs * 3; // 3x TTL = stale

    this.cityState.hitCount++;

    if (isStale) {
      this.stats.staleHits++;
      return {
        state: this.cityState.data,
        freshness: "stale",
        cachedAt: this.cityState.cachedAt,
      };
    }

    if (isExpired) {
      this.stats.staleHits++;
      return {
        state: this.cityState.data,
        freshness: "aging",
        cachedAt: this.cityState.cachedAt,
      };
    }

    this.stats.hits++;
    return {
      state: this.cityState.data,
      freshness: "fresh",
      cachedAt: this.cityState.cachedAt,
    };
  }

  setCityState(state: CityWorldState): void {
    const now = new Date().toISOString();
    this.cityState = {
      data: state,
      cachedAt: now,
      expiresAt: new Date(Date.now() + this.config.cityStateTtlMs).toISOString(),
      hitCount: 0,
    };
    this.lastSuccessfulRefresh = now;
    this.refreshError = null;
    this.stats.entries++;
  }

  // ---- District State ----

  getDistrict(id: string): {
    state: DistrictState | null;
    freshness: "fresh" | "aging" | "stale" | "empty";
  } {
    const entry = this.districts.get(id);
    if (!entry) {
      this.stats.misses++;
      return { state: null, freshness: "empty" };
    }

    const age = Date.now() - new Date(entry.cachedAt).getTime();
    if (age > this.config.districtTtlMs * 3) {
      this.stats.staleHits++;
      return { state: entry.data, freshness: "stale" };
    }
    if (age > this.config.districtTtlMs) {
      this.stats.staleHits++;
      return { state: entry.data, freshness: "aging" };
    }

    entry.hitCount++;
    this.stats.hits++;
    return { state: entry.data, freshness: "fresh" };
  }

  setDistrict(id: string, state: DistrictState): void {
    // Evict oldest if at capacity
    if (this.districts.size >= this.config.maxDistrictEntries) {
      const oldest = [...this.districts.entries()]
        .sort(([, a], [, b]) => a.cachedAt.localeCompare(b.cachedAt))
        [0];
      if (oldest) this.districts.delete(oldest[0]);
    }

    const now = new Date().toISOString();
    this.districts.set(id, {
      data: state,
      cachedAt: now,
      expiresAt: new Date(Date.now() + this.config.districtTtlMs).toISOString(),
      hitCount: 0,
    });
  }

  // ---- Receipts ----

  getReceipt(id: string): SkillReceipt | null {
    const entry = this.receipts.get(id);
    if (!entry) return null;

    const age = Date.now() - new Date(entry.cachedAt).getTime();
    if (age > this.config.receiptTtlMs) {
      this.receipts.delete(id);
      return null;
    }

    return entry.data;
  }

  setReceipt(id: string, receipt: SkillReceipt): void {
    this.receipts.set(id, {
      data: receipt,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.config.receiptTtlMs).toISOString(),
      hitCount: 0,
    });
  }

  // ---- Refresh Tracking ----

  markRefreshAttempt(): void {
    this.lastRefreshAttempt = new Date().toISOString();
  }

  markRefreshError(error: string): void {
    this.refreshError = error;
  }

  getRefreshStatus(): {
    lastAttempt: string | null;
    lastSuccess: string | null;
    error: string | null;
  } {
    return {
      lastAttempt: this.lastRefreshAttempt,
      lastSuccess: this.lastSuccessfulRefresh,
      error: this.refreshError,
    };
  }

  // ---- System Status ----

  getSystemStatus(): SystemStatus {
    if (!this.cityState) return "insufficient_data";

    const freshness = this.getCityState().freshness;
    if (freshness === "stale") return "stale";
    if (this.refreshError) return "partial";

    return "ready";
  }

  // ---- Stats ----

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // ---- Lifecycle ----

  clear(): void {
    this.cityState = null;
    this.districts.clear();
    this.receipts.clear();
    this.lastRefreshAttempt = null;
    this.lastSuccessfulRefresh = null;
    this.refreshError = null;
    this.stats = { entries: 0, hits: 0, misses: 0, staleHits: 0 };
  }

  /** Remove all stale entries to free memory. */
  prune(): number {
    let pruned = 0;
    const now = Date.now();

    for (const [id, entry] of this.districts) {
      const age = now - new Date(entry.cachedAt).getTime();
      if (age > this.config.districtTtlMs * 3) {
        this.districts.delete(id);
        pruned++;
      }
    }

    for (const [id, entry] of this.receipts) {
      const age = now - new Date(entry.cachedAt).getTime();
      if (age > this.config.receiptTtlMs) {
        this.receipts.delete(id);
        pruned++;
      }
    }

    return pruned;
  }
}
