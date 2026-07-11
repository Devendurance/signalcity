# Signal City — Implementation Status

> This document tracks the actual implementation state of Signal City.
> Update it after every major development phase.
>
> Do not mark a feature complete because files or components exist.
> Mark it complete only after the full browser flow has been tested.

## Status Legend

- [x] Complete and verified
- [~] Implemented but not fully verified
- [ ] Not implemented
- [!] Blocked or broken

---

# 1. Repository Structure

- [x] Single repository confirmed
- [x] Frontend stored at project root
- [x] Backend stored under `/backend`
- [x] Canonical contracts stored under `/shared/contracts`
- [x] Signal City product specification available
- [x] Low-poly `.glb` asset package available
- [x] Fonts, textures, icons, and simulation references available
- [x] Three.js skills installed
- [ ] Third-party licences reviewed
- [ ] `THIRD_PARTY_NOTICES.md` created or verified

---

# 2. Three.js Foundation

- [x] Three.js scene created
- [x] Renderer configured
- [x] Camera controls implemented
- [x] Camera pan supported
- [x] Camera zoom supported
- [x] Camera rotation supported
- [x] Lighting added
- [x] Shadows added
- [x] GLB asset loading implemented
- [x] Raycasting implemented
- [x] Object selection implemented
- [x] Scene metadata attached to selectable objects
- [~] Responsive rendering verified
- [ ] Mobile rendering verified
- [ ] Asset loading failures handled visibly
- [ ] Production performance profiled
- [ ] Browser console confirmed clean

---

# 3. Physical City

## Weather Grid

- [x] Initial Weather Grid foundation created
- [x] BTC zone created
- [x] AI zone created
- [x] DeFi zone created
- [ ] Memecoin zone created
- [ ] RWA zone created
- [ ] Sector-zone hierarchy corrected
- [ ] Weather Grid established as the main market district
- [ ] Zone landmarks refined
- [ ] Building placement balanced
- [ ] Roads arranged around each zone
- [ ] Explanation panels connected to zone selection
- [ ] Weather effects connected to structured state
- [ ] Traffic behaviour connected to structured state

## Claims Bureau

- [ ] Physical district created
- [ ] Landmark building created
- [ ] Connected to city roads
- [ ] Building selection opens Claims Bureau interface
- [ ] Claim submission form implemented
- [ ] Claim Receipt interface implemented
- [ ] Public report page implemented
- [ ] Real backend route connected

## Entry Gate

- [ ] Physical district created
- [ ] Entry Gate placed at a believable city boundary
- [ ] Connected to city roads
- [ ] Gate lights and barriers implemented
- [ ] Open state implemented
- [ ] Caution state implemented
- [ ] Restricted state implemented
- [ ] Closed state implemented
- [ ] Inspection Required state implemented
- [ ] Entry Check interface implemented
- [ ] Real backend route connected

## Portfolio Clinic

- [ ] Physical district created
- [ ] Clinic landmark created
- [ ] Connected to city roads
- [ ] Building selection opens Portfolio Clinic
- [ ] Manual portfolio entry implemented
- [ ] CSV upload implemented
- [ ] Temporary guest portfolio implemented
- [ ] Portfolio Health Report implemented
- [ ] Private report handling implemented
- [ ] Real backend route connected

---

# 4. Roads and Traffic

## Road Layout

- [~] Road GLB models render
- [!] Current road layout is visually unbalanced
- [!] Some roads are disconnected
- [ ] Local roads surround every Weather Grid zone
- [ ] Claims Bureau connected to road network
- [ ] Entry Gate connected to road network
- [ ] Portfolio Clinic connected to road network
- [ ] Central arterial road created
- [ ] Realistic connector roads created
- [ ] City entry and exit roads created
- [ ] Buildings have believable road frontage
- [ ] Road rotations verified

## Road Graph

- [~] Initial graph or node logic exists
- [!] Traffic currently operates in only one area
- [ ] One global directed road graph implemented
- [ ] Every visible road registers navigation data
- [ ] Separate lanes exist for both travel directions
- [ ] Straight-road lane paths implemented
- [ ] Curved-road lane paths implemented
- [ ] T-junction movements implemented
- [ ] Cross-junction movements implemented
- [ ] District connector routes implemented
- [ ] Connected-components validation implemented
- [ ] Road graph reports one connected component

## Vehicle Behaviour

- [~] Cars render
- [~] Cars move
- [!] Cars do not yet move correctly throughout the city
- [ ] Cars remain centred in their lanes
- [ ] Cars rotate using route tangents
- [ ] Cars turn smoothly
- [ ] Cars travel between districts
- [ ] Cars avoid grass and buildings
- [ ] Cars maintain following distance
- [ ] Cars avoid overlapping
- [ ] Intersection conflicts handled
- [ ] Local journeys implemented
- [ ] Cross-district journeys implemented
- [ ] Entry and exit journeys implemented
- [ ] Vehicle pooling verified
- [ ] Emergency-vehicle support implemented

## Traffic Debugging

- [ ] Graph-node overlay
- [ ] Directed-lane overlay
- [ ] Selected-car route overlay
- [ ] Vehicle destination overlay
- [ ] Disconnected-component overlay
- [ ] Lane-occupancy overlay
- [ ] Intersection-reservation overlay
- [ ] Debug controls documented

---

# 5. Backend

> The backend is reported as completed, but every capability must be inspected
> and verified before being marked complete.

- [~] Backend implementation exists under `/backend`
- [ ] Backend route inventory completed
- [ ] Service inventory completed
- [ ] Database schema verified
- [ ] Environment variables documented
- [ ] Authentication behaviour verified
- [ ] Rate limiting verified
- [ ] Caching verified
- [ ] Error-response format verified
- [ ] CoinMarketCap MCP integration verified
- [ ] CoinMarketCap REST integration verified
- [ ] Skill-workflow implementation verified
- [ ] Backend tests pass
- [ ] Backend production start command verified

## Backend Capabilities

- [ ] City state endpoint verified
- [ ] Weather Grid endpoint verified
- [ ] Claims Bureau endpoint verified
- [ ] Entry Gate endpoint verified
- [ ] Portfolio Clinic endpoint verified
- [ ] City Journal endpoint verified
- [ ] Skill Receipt endpoint verified
- [ ] Public report endpoint verified
- [ ] System-status endpoint verified

---

# 6. Shared Contracts

- [x] `/shared/contracts` exists
- [ ] Contract inventory completed
- [ ] City-state contract verified
- [ ] Weather contract verified
- [ ] Claim request and response contracts verified
- [ ] Entry Check contracts verified
- [ ] Portfolio contracts verified
- [ ] Skill Receipt contract verified
- [ ] Report contract verified
- [ ] Error contract verified
- [ ] Frontend and backend use the same contracts
- [ ] Duplicate frontend-only API types removed
- [ ] Duplicate backend-only API types removed
- [ ] Contract tests pass

---

# 7. Frontend and Backend Integration

- [ ] Typed frontend API client created
- [ ] Frontend API calls centralised
- [ ] Weather Grid connected to backend
- [ ] Claims Bureau connected to backend
- [ ] Entry Gate connected to backend
- [ ] Portfolio Clinic connected to backend
- [ ] City Journal connected to backend
- [ ] Skill Receipts connected to backend
- [ ] Public reports connected to backend
- [ ] System status connected to backend

## Loading and Failure States

- [ ] Loading states implemented
- [ ] Empty states implemented
- [ ] Network failure states implemented
- [ ] Backend unavailable state implemented
- [ ] Insufficient evidence state implemented
- [ ] Partial-data state implemented
- [ ] Retry behaviour implemented

---

# 8. Mock Data Removal

- [ ] All frontend mock-state locations identified
- [ ] Mock Weather Grid data removed from production
- [ ] Mock Claims Bureau data removed from production
- [ ] Mock Entry Gate data removed from production
- [ ] Mock Portfolio Clinic data removed from production
- [ ] Mock Skill Receipts removed from production
- [ ] Mock reports removed from production
- [ ] Test fixtures retained only for tests or explicit local development
- [ ] Production never silently falls back to fake data

---

# 9. Live CoinMarketCap Data

## Weather Grid

- [ ] Global market data live
- [ ] BTC data live
- [ ] AI-sector data live
- [ ] DeFi-sector data live
- [ ] Memecoin-sector data live
- [ ] RWA-sector data live
- [ ] Trend strength calculated
- [ ] Market breadth calculated
- [ ] Volatility calculated
- [ ] Liquidity calculated
- [ ] Macro pressure calculated
- [ ] Narrative heat calculated
- [ ] Confidence calculated
- [ ] Weather rules verified
- [ ] Traffic rules verified
- [ ] Explanation generated from calculated state

## Claims Bureau

- [ ] Claim decomposition live
- [ ] Relevant Skills routed correctly
- [ ] Evidence collected from CoinMarketCap
- [ ] Unsupported causal claims handled correctly
- [ ] Predictions classified as unverifiable where appropriate
- [ ] Claim Receipt generated from real evidence

## Entry Gate

- [ ] Token market context live
- [ ] Technical indicators live
- [ ] Volume context live
- [ ] Open-interest context live where available
- [ ] Funding context live where available
- [ ] Thesis assessment uses deterministic rules
- [ ] AI only explains the calculated result

## Portfolio Clinic

- [ ] Holdings enriched with real CoinMarketCap data
- [ ] Sector exposure calculated
- [ ] Concentration calculated
- [ ] Historical correlation calculated
- [ ] Volatility contribution calculated
- [ ] Liquidity risk calculated
- [ ] Narrative overlap calculated
- [ ] Portfolio diagnosis uses deterministic rules

---

# 10. Skill Receipts and Provenance

- [ ] Every analysis has a run ID
- [ ] Skills used are recorded
- [ ] CoinMarketCap sources are recorded
- [ ] Request timestamp recorded
- [ ] Asset or sector recorded
- [ ] Important raw fields recorded safely
- [ ] Normalised signals recorded
- [ ] Rule-engine result recorded
- [ ] AI explanation recorded
- [ ] Confidence recorded
- [ ] Conditions that could change the result recorded
- [ ] Skill Receipt visible from frontend result
- [ ] Skill Receipt downloadable as JSON

---

# 11. Reports and Sharing

- [ ] Permanent public report URLs
- [ ] Public Weather Grid reports
- [ ] Public Claim Receipts
- [ ] Private Entry Gate reports by default
- [ ] Private Portfolio Clinic reports by default
- [ ] Square visual-card export
- [ ] Landscape visual-card export
- [ ] Portrait visual-card export
- [ ] Structured JSON export
- [ ] Social previews configured

---

# 12. Guest and Account Experience

- [ ] Guest can open the city
- [ ] Guest can inspect current city state
- [ ] Guest can run a limited claim check
- [ ] Guest can run a limited Entry Check
- [ ] Guest can build a temporary portfolio
- [ ] Guest limits are explained clearly
- [ ] Optional account creation works
- [ ] Saved reports work
- [ ] Saved portfolios work
- [ ] Saved watchlists work
- [ ] User-private data remains private

---

# 13. Production Readiness

- [ ] API keys remain server-side
- [ ] Environment variables documented
- [ ] Production database configured
- [ ] Rate limits configured
- [ ] Caching configured
- [ ] System-status indicator works
- [ ] CoinMarketCap attribution visible
- [ ] Desktop QA complete
- [ ] Mobile QA complete
- [ ] Accessibility review complete
- [ ] Three.js performance review complete
- [ ] TypeScript passes
- [ ] Lint passes
- [ ] Frontend tests pass
- [ ] Backend tests pass
- [ ] Integration tests pass
- [ ] Production build passes
- [ ] Browser console contains no unexplained errors
- [ ] Deployment completed
- [ ] Public URL verified from an external device

---

# 14. Current Blockers

Add active blockers here.

| Blocker | Affected Area | Owner | Next Action | Status |
|---|---|---|---|---|
| Roads are not fully connected | Roads and traffic | Hermes | Redesign road network and build global graph | Open |
| Cars move mainly in one district | Traffic | Hermes | Replace district-scoped route with global routing | Open |
| Missing functional districts | Frontend city | Hermes | Add Claims Bureau, Entry Gate, and Portfolio Clinic | Open |
| Frontend still uses mock state | Integration | Hermes | Verify contracts and connect backend incrementally | Open |

---

# 15. Decisions

Record important implementation decisions here so they are not repeatedly reversed.

| Date | Decision | Reason |
|---|---|---|
| 2026-07-11 | Use one repository | Frontend, `/backend`, and `/shared/contracts` already coexist |
| 2026-07-11 | Use existing low-poly `.glb` assets | A complete 3D asset package is already available |
| 2026-07-11 | Weather Grid contains sector zones | BTC, AI, and DeFi are not the four functional districts |
| 2026-07-11 | Use one global road graph | Cars must travel between all districts |
| 2026-07-11 | Rules decide; AI explains | Prevent inconsistent or invented market states |
| 2026-07-11 | No production fallback to fake data | The product must remain trustworthy |

---

# 16. Verification Log

Update this after every completed phase.

## Example Entry

### 2026-07-11 — Three.js Foundation Audit

**Completed**

- Inspected scene, renderer, camera, assets, and raycasting.
- Confirmed the city loads.
- Identified disconnected road sections.
- Confirmed traffic is scoped to one area.

**Checks Run**

```bash
npm run typecheck
npm run build