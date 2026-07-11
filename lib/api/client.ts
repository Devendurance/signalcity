// ============================================================
// Signal City — Typed Frontend API Client
// Single source of truth for all backend communication.
// No raw fetch() scattered through components.
// ============================================================

import type {
  CityWorldState,
  DistrictState,
  ApiError,
} from "@/shared/contracts";
import type { ClaimRequest, ClaimReceipt } from "@/shared/contracts/claims";
import type { EntryCheckRequest, EntryCheckResult } from "@/shared/contracts/entry-gate";
import type { HoldingEntry, PortfolioReport } from "@/shared/contracts/portfolio";
import type { SkillReceipt } from "@/shared/contracts/receipt";

// ---- Configuration ----

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ---- Response Types ----

interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ---- Fetch Helper ----

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    const json = await response.json();
    return json as ApiResult<T>;
  } catch (error) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Network request failed",
      },
    };
  }
}

// ---- City State ----

export async function fetchCityState(): Promise<ApiResult<CityWorldState>> {
  return apiFetch<CityWorldState>("/api/v1/city");
}

export async function fetchDistrict(id: string): Promise<ApiResult<DistrictState>> {
  return apiFetch<DistrictState>(`/api/v1/city/${id}`);
}

// ---- System Status ----

export interface SystemStatusData {
  status: string;
  timestamp: string;
  components: {
    api: { status: string };
    coinmarketcap: { status: string; message: string };
    scheduler: {
      status: string;
      running: boolean;
      refreshCount: number;
      errorCount: number;
      lastAttempt: string | null;
      lastSuccess: string | null;
    };
    cache: { status: string; entries: number };
    cityState: { status: string; freshness: string };
  };
  version: string;
}

export async function fetchSystemStatus(): Promise<ApiResult<SystemStatusData>> {
  return apiFetch<SystemStatusData>("/api/v1/system-status");
}

// ---- Claims Bureau ----

export async function submitClaim(request: ClaimRequest): Promise<ApiResult<ClaimReceipt>> {
  return apiFetch<ClaimReceipt>("/api/v1/claims", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchClaimReceipt(id: string): Promise<ApiResult<ClaimReceipt>> {
  return apiFetch<ClaimReceipt>(`/api/v1/claims/${id}`);
}

// ---- Entry Gate ----

export async function submitEntryCheck(request: EntryCheckRequest): Promise<ApiResult<EntryCheckResult>> {
  return apiFetch<EntryCheckResult>("/api/v1/entry-checks", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchEntryCheck(id: string): Promise<ApiResult<EntryCheckResult>> {
  return apiFetch<EntryCheckResult>(`/api/v1/entry-checks/${id}`);
}

// ---- Portfolio Clinic ----

export async function submitPortfolio(holdings: HoldingEntry[]): Promise<ApiResult<PortfolioReport>> {
  return apiFetch<PortfolioReport>("/api/v1/portfolios", {
    method: "POST",
    body: JSON.stringify({ holdings }),
  });
}

export async function fetchPortfolioReport(id: string): Promise<ApiResult<PortfolioReport>> {
  return apiFetch<PortfolioReport>(`/api/v1/portfolios/${id}`);
}

// ---- Re-exports for convenience ----

export type { ApiResult, ApiResponse, ApiErrorResponse };
