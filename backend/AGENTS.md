# Signal City Backend — Project Instructions

## Product Context

Signal City is a public crypto market-intelligence product powered by CoinMarketCap data, MCP tools, and reproducible Agent Hub Skill workflows.

The city is the interface. The intelligence engine is the product.

Market conditions become weather, activity becomes traffic, participation becomes building light, narratives become billboards, and abnormal risk becomes visible through emergency activity, fog, road closures, barriers, and other city state.

Signal City has four connected analytical districts:

1. **Weather Grid** — global, sector, and asset market conditions.
2. **Claims Bureau** — evidence-based investigation of crypto claims.
3. **Entry Gate** — evaluates whether a user’s stated trade thesis matches current evidence.
4. **Portfolio Clinic** — evaluates holdings as a connected risk system.

All four districts share one backend intelligence engine and one provenance model.

## Primary Architectural Rule

The market engine must never directly manipulate Three.js, React Three Fiber, DOM, canvas, vehicle, building, weather-effect, or other renderer objects.

The backend produces structured state.

The renderer consumes structured state.

```text
CoinMarketCap data / Agent Hub workflows
              ↓
       Signal normalisation
              ↓
     Deterministic engines
              ↓
         DistrictState
              ↓
     Three.js city renderer
```

The backend decides what a market condition means.

The renderer decides how that meaning looks.

## Required Backend Layers

### 1. CoinMarketCap Connection Layer

Support one or both of:

- server-side CoinMarketCap MCP client;
- direct CoinMarketCap REST API adapters.

Keep credentials server-side.

Do not assume every marketplace Skill has a public `execute-by-slug` endpoint. A Skill is a research workflow. Use documented MCP tools and REST APIs to execute or reproduce that workflow.

All provider calls must pass through adapters. Do not scatter CoinMarketCap request logic across route handlers or business services.

### 2. Skill Router

Translate a product request into one or more research workflows.

Examples:

```text
Generate global weather
→ Daily Market Overview
→ Crypto Macro Overview
→ BTC cross-asset context
→ Sector analysis
```

```text
Investigate “PEPE liquidity is collapsing”
→ Claim decomposition
→ Token profile
→ Memecoin/on-chain analysis
→ DEX liquidity evidence
→ Security or risk evidence where available
```

The router should return an explicit execution plan before or alongside execution.

### 3. Skill Execution Records

Persist every meaningful workflow run.

Minimum conceptual shape:

```ts
interface SkillRun {
  id: string;
  workflow: string;
  requestType: string;
  assetId?: string;
  sectorId?: string;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  provider: "coinmarketcap" | string;
  providerTimestamp?: string;
  status: "queued" | "running" | "completed" | "partial" | "failed";
  rawOutputRef?: string;
  normalizedSignals?: Record<string, unknown>;
  warnings: string[];
  error?: StructuredError;
  version: string;
}
```

A run ID must connect provider calls, normalization, decision output, explanation, report, and logs.

### 4. Normalisation Layer

Convert provider-specific responses into stable internal signals.

Do not let downstream code depend directly on unstable external response shapes.

A normalized market signal should preserve:

- canonical asset or sector identity;
- value and unit;
- direction or rate of change;
- requested horizon;
- provider timestamp;
- ingestion timestamp;
- freshness state;
- source;
- missingness;
- confidence/data quality;
- normalization version.

Example conceptual state:

```ts
interface NormalizedMarketSignals {
  trend: number;             // expected range -1..1
  breadth: number;           // -1..1
  volatility: number;        // 0..1
  leverageRisk: number;      // 0..1
  liquidityHealth: number;   // 0..1
  macroPressure: number;     // -1..1
  sentiment: number;         // -1..1
  narrativeHeat: number;     // 0..1
  momentumAcceleration: number; // -1..1
  confidence: number;        // 0..1
  freshness: "fresh" | "aging" | "stale" | "unknown";
  missingSignals: string[];
}
```

The exact schema may evolve. Version it.

### 5. Deterministic Intelligence Engines

Implement business outcomes in code, not free-form model judgment.

Required engines include:

- weather classification;
- weather overrides and warnings;
- traffic and city-activity mapping;
- claim classification;
- Entry Gate state classification;
- portfolio concentration and risk diagnostics;
- confidence calculation;
- insufficient-evidence handling;
- state-change detection for the City Journal.

Rules must be readable, tested, versioned, and included in provenance.

An LLM may extract candidate subclaims or explain a result. It must not be the sole authority deciding weather, gate status, claim classification, or portfolio health.

### 6. Explanation Engine

Generate clear language from already-computed state.

Pass the model:

- calculated outcome;
- normalized evidence;
- uncertainty;
- important changes;
- watch conditions;
- disallowed claims;
- required response schema.

Validate model output. Prefer structured output followed by rendering into prose.

The explanation must not introduce numbers, causes, certainty, or recommendations absent from the evidence package.

### 7. Provenance and Skill Receipts

Every public analytical result should expose a receipt containing:

- run ID;
- workflows or Skills used;
- request timestamp;
- provider/data timestamp;
- important source fields;
- normalized signals;
- transformations and rule versions;
- final classification;
- confidence and missing evidence;
- explanation version/model metadata where appropriate;
- conditions that could change the result.

The receipt is part of the product, not debug metadata.

### 8. DistrictState API

The primary frontend boundary is a renderer-friendly state contract.

Example:

```ts
interface DistrictState {
  id: string;
  label: string;
  scope: "global" | "sector" | "asset" | "portfolio";
  subjectId: string;
  generatedAt: string;
  dataAsOf: string;
  nextRefreshAt?: string;
  status: "ready" | "partial" | "insufficient_data" | "stale" | "error";

  weather: {
    kind:
      | "clear"
      | "partly_cloudy"
      | "fog"
      | "rain"
      | "storm"
      | "heatwave"
      | "wind_advisory"
      | "cold_snap";
    severity: "low" | "medium" | "high" | "critical";
    confidence: number;
    warnings: string[];
  };

  city: {
    trafficDensity: number;
    trafficSpeed: number;
    congestion: number;
    buildingActivity: number;
    emergencyLevel: number;
    visibility: number;
    constructionActivity: number;
    roadRestrictionLevel: number;
    narrativeBillboards: Array<{
      id: string;
      text: string;
      strength: number;
      classification?: string;
    }>;
  };

  explanation: {
    summary: string;
    causes: string[];
    changed: string;
    watch: string[];
  };

  receiptId: string;
  version: string;
}
```

All normalized numerical display controls should use documented ranges, preferably `0..1` or `-1..1`.

Never send Three.js object references, asset instances, animation handles, shader state, or scene mutations from the backend.

## Weather Engine Rules

Weather is deterministic.

Begin with weighted factors similar to:

- trend strength: 25%;
- breadth: 20%;
- volatility and liquidation/leverage risk: 20%;
- volume and liquidity: 15%;
- macro pressure: 10%;
- narrative or sentiment intensity: 10%.

Treat those weights as configuration with a version, not magic numbers buried in route handlers.

Support overrides. A positively trending district may still receive a heatwave warning when momentum, attention, extension, and volatility are excessive.

Every weather decision should return:

- base score;
- component contributions;
- triggered thresholds;
- overrides;
- final state;
- confidence;
- rule version.

## Claims Bureau Rules

Do not force every claim into true or false.

Supported classifications:

- supported;
- partially supported;
- weakly supported;
- unsupported by current evidence;
- not currently verifiable;
- opinion presented as fact;
- prediction, not currently verifiable;
- observation supported but claimed cause unsupported.

Pipeline:

1. preserve the original claim;
2. extract measurable subclaims;
3. identify asset, metric, horizon, and causal language;
4. route each subclaim to evidence workflows;
5. compare evidence to the exact wording;
6. classify each subclaim;
7. calculate overall classification;
8. state what remains unknown;
9. state what evidence would strengthen or weaken the claim;
10. issue a public receipt.

Never infer motive from holder activity or price movement without evidence.

## Entry Gate Rules

The Entry Gate evaluates reasoning quality, not whether the user should buy or sell.

Supported states:

- open;
- caution;
- restricted;
- closed;
- inspection_required.

Compare the user’s thesis with current trend, volume, volatility, liquidity, market context, leverage, concentration of participation, and stated time horizon.

Identify:

- evidence that supports the thesis;
- evidence that challenges it;
- emotional or incomplete reasoning;
- unanswered questions;
- thesis invalidation conditions;
- conditions worth waiting for.

Do not issue trade instructions or guaranteed outcome language.

## Portfolio Clinic Rules

The clinic evaluates holdings as a system.

Calculate at minimum:

- asset concentration;
- sector concentration;
- duplicated narrative exposure;
- historical or horizon-appropriate correlation;
- volatility contribution;
- liquidity imbalance;
- thesis health;
- recent deterioration;
- missing diversification;
- holdings whose current evidence conflicts with the user’s stated reason.

Manual entry and CSV upload are launch requirements. Wallet import is not required for the first release.

Portfolio and Entry Gate reports are private by default.

## City Journal

Persist meaningful state changes, not only snapshots.

A journal event should describe:

- previous state;
- current state;
- changed signals;
- threshold or override crossed;
- timestamp;
- confidence change;
- run and receipt IDs.

Avoid writing duplicate events when repeated refreshes produce materially identical state.

## Freshness, Caching, and Scheduled Refreshes

The public city must show:

- latest successful state;
- data timestamp;
- last refresh attempt;
- last successful refresh;
- current system status.

Cache frequently requested public states. Separate provider cache lifetime from product-state lifetime.

Use stale-while-revalidate only when the UI clearly identifies aging or stale data.

Never silently label stale data as current.

Scheduled jobs must be idempotent and safe to retry.

## Public Product Constraints

- Guest users must be able to use the product without a wallet.
- Accounts are required only for persistence, watchlists, alerts, saved portfolios, or higher limits.
- Credentials never reach the browser.
- Public analyses receive stable URLs.
- Exports should be reproducible from stored report state.
- Transparent failure state: `insufficient current evidence`.
- Apply request limits, payload limits, rate limiting, and abuse controls.
- Do not build trade execution, copy trading, NFTs, token gating, virtual land, or unrelated metaverse mechanics.

## API and Domain Design

Prefer explicit versioned APIs and schemas.

Suggested resource families:

```text
/api/v1/city
/api/v1/districts
/api/v1/assets
/api/v1/sectors
/api/v1/claims
/api/v1/entry-checks
/api/v1/portfolios
/api/v1/reports
/api/v1/receipts
/api/v1/journal
/api/v1/system-status
```

Routes should orchestrate. Domain services should decide. Provider adapters should fetch. Repositories should persist.

Do not bury business rules in controllers, React server components, cron handlers, or database triggers.

## Data and Persistence

Choose storage based on the existing repository and deployment target. Prefer a relational database for core records because runs, reports, receipts, subjects, journal events, users, and portfolios have strong relationships and audit requirements.

Use JSON/JSONB for provider payloads and evolving evidence packages, but keep important queryable fields normalized.

Persist schema and rules versions with generated outputs so older reports remain explainable after logic changes.

## Observability

Use structured logs containing:

- request ID;
- run ID;
- route/workflow;
- provider;
- duration;
- cache result;
- status;
- retry count;
- error category.

Never log credentials, authorization headers, full private portfolios, or unnecessary user text.

Expose health information for:

- API;
- database;
- CoinMarketCap connection;
- scheduled refreshes;
- queue/worker if used;
- explanation model;
- city-state freshness.

## Testing Priorities

Highest priority:

1. deterministic weather and override rules;
2. normalization of provider fixtures;
3. claim classification boundaries;
4. Entry Gate state boundaries;
5. portfolio concentration/correlation calculations;
6. missing and stale data behavior;
7. idempotent scheduled refreshes;
8. receipt completeness;
9. API contract validation.

Use recorded or synthetic fixtures for provider responses. Tests must not require live paid API calls.

## Implementation Approach

When entering the repository:

1. inspect the current frontend contracts, package manager, runtime, deployment target, and existing data models;
2. map what already exists before introducing new architecture;
3. define the first version of `DistrictState` and receipt schemas;
4. build one complete vertical slice, preferably global or one-sector Weather Grid;
5. use a provider adapter with fixtures before live credentials;
6. implement deterministic normalization and weather rules;
7. persist the run and receipt;
8. expose the API;
9. connect the frontend renderer only to the structured state;
10. verify error, partial, stale, and insufficient-evidence paths;
11. expand the shared engine into the other districts.

Default to the repository’s existing language and conventions. For a greenfield backend attached to a TypeScript/Next.js frontend, TypeScript is a reasonable default, but choose the stack that best fits the actual repository and deployment environment.

## Definition of Done

A Signal City backend feature is not done because a route returned JSON once.

It is done when the result is sourced, normalized, deterministically classified, persisted, versioned, explained, receipted, observable, tested, and consumable by the renderer through a stable state contract.
