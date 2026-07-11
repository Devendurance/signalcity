# Signal City

## The crypto market, made visible

Signal City is a living market-intelligence city powered by CoinMarketCap Agent Hub, where market conditions become weather, trading activity becomes traffic, narratives become billboards, and risk becomes something people can actually see.

The four core ideas are not separate mini-apps. They are four functional districts connected by one shared market-intelligence engine.

---

# 1. Refined Product Concept

## What Signal City Is

Signal City is a public, interactive crypto intelligence platform.

Anyone can open it from their browser and immediately see:

- what kind of market they are currently in;
- which sectors are healthy, overheated, uncertain, or deteriorating;
- why those conditions exist;
- whether a claim circulating online is supported by current data;
- whether their reason for entering a trade survives basic scrutiny;
- and where weaknesses exist inside their current holdings.

No terminal required.

No wallet required.

No copying raw Agent Hub output between tools.

No need to connect Claude Code, Codex, or another local client before the product becomes useful.

CoinMarketCap Agent Hub runs underneath the experience. Signal City turns its structured research into a consumer-facing product.

CoinMarketCap’s current infrastructure supports Skills across MCP, x402, CLI, and direct REST integrations. The production app can invoke relevant workflows from its backend rather than forcing every visitor to configure their own agent client.

## Core Promise

> Understand what the market is doing, why it is happening, and what deserves your attention — without reading twelve dashboards.

That is the real product.

The city is the interface.

The intelligence underneath it is the value.

---

# 2. Central Product Experience

A visitor enters Signal City and lands on a living 3D city map.

They immediately see something like:

## Today in Signal City

- **Global climate:** Partly cloudy with rising volatility
- **BTC District:** Clear skies
- **AI District:** Heatwave warning
- **Memecoin District:** Severe storm watch
- **DeFi District:** Light rain, stabilising
- **RWA District:** Calm with gradual construction

Cars move through the streets.

Traffic changes based on market activity.

Buildings light up when participation broadens.

Billboards display the strongest current narratives.

Emergency vehicles appear when volatility or liquidation pressure spikes.

Every visual element has meaning. Nothing exists only because it “looks crypto.”

---

# 3. 3D Visual Direction

Signal City should use a full low-poly 3D environment built from the existing `.glb` model package.

The visual system should not be designed as a 2D or 2.5D simulation.

The product should use:

- real-time low-poly 3D buildings;
- roads and intersections;
- animated cars and traffic systems;
- weather effects;
- district lighting;
- moving billboards;
- construction elements;
- warning barriers;
- emergency vehicles;
- environmental state changes.

The 3D renderer should be driven entirely by structured market-state data.

The backend determines the market state.

The 3D city decides how that state should look.

A likely implementation stack could use Three.js, React Three Fiber, or another browser-friendly WebGL renderer capable of loading and animating `.glb` assets.

Performance remains essential. The product should use asset compression, lazy loading, instancing, level-of-detail controls, and simplified mobile rendering where necessary.

---

# 4. The City’s Visual Language

This is what separates the concept from a dashboard wearing a costume.

| City Element | What It Represents |
|---|---|
| Weather | Overall market or sector condition |
| Traffic density | Trading volume and market activity |
| Vehicle speed | Momentum and rate of change |
| Traffic jams | Crowded positioning or unstable volatility |
| Building lights | Breadth of participation across assets |
| Skyscraper height | Relative market size or sector dominance |
| Construction cranes | Emerging sectors or growing narratives |
| Empty streets | Weak liquidity or declining interest |
| Emergency vehicles | Abnormal volatility, liquidations, or abrupt market stress |
| Fog | Conflicting or insufficient signals |
| Billboards | Dominant claims and market narratives |
| Road closures | Liquidity problems, security risk, or unusually high market stress |
| Car flow and movement | Ambient life, participation, and market intensity |

Cars are not decorative extras. They are part of the market-visualisation language.

Examples:

- faster traffic can represent accelerating momentum;
- heavy traffic can represent unusually high market activity;
- congestion can signal crowded positioning;
- stopped traffic can indicate weak liquidity or market stress;
- emergency vehicles can represent liquidation spikes or sudden volatility;
- diversions and roadblocks can signal security, liquidity, or operational risk.

---

# 5. The Weather Engine

The weather must be deterministic.

That part is non-negotiable.

An LLM should not simply look at data and decide that the market “feels stormy.” That would create inconsistent results and make the visual layer difficult to trust.

Instead:

> Rules determine the weather. AI explains the weather.

Signal City takes structured Agent Hub outputs and converts them into a normalised market-state model.

A first production model could score:

| Factor | Example Weight |
|---|---:|
| Trend strength | 25% |
| Market breadth | 20% |
| Volatility and liquidation risk | 20% |
| Volume and liquidity | 15% |
| Macro pressure | 10% |
| Narrative or sentiment intensity | 10% |

The final score determines the base weather.

## Example Weather States

### Clear Skies

Positive trend, broad participation, controlled volatility, and healthy liquidity.

### Partly Cloudy

Positive conditions exist, but some indicators disagree.

### Fog

Signals are mixed, confidence is low, or there is not enough reliable data.

### Rain

Weak momentum, shrinking participation, and deteriorating demand.

### Storm

Strong negative pressure combined with abnormal volatility or liquidation risk.

### Heatwave

Momentum and attention are extremely high, but the market is becoming extended or crowded.

### Wind Advisory

Capital is rotating quickly between sectors and leadership is unstable.

### Cold Snap

Demand, participation, and activity are rapidly fading.

There should also be overrides.

A sector could score positively overall while still receiving a heatwave warning when momentum and volatility become excessive.

---

# 6. The “Why” Card

The explanation card is not a secondary feature.

It is one of the product’s most important surfaces.

When someone clicks a district, they should see something like:

## AI District

### Heatwave Warning

Momentum remains strong, but the sector is becoming increasingly crowded.

#### What Caused This Weather

- Sector performance is stronger than the broader altcoin market.
- Trading activity has increased substantially.
- More AI assets are participating in the move.
- Short-term volatility is rising.
- Current prices are increasingly extended from their recent trend.

#### What Changed

The district moved from **Clear Skies** to **Heatwave** after participation and volatility accelerated.

#### What to Watch

A fall in market breadth while prices continue rising may signal that the move is weakening.

#### Agent Hub Skills Used

- Altcoin Sector Analysis
- Daily Market Overview
- Crypto Macro Overview

#### Updated

July 10, 2026 · 1:42 AM WAT

#### Action

**View Skill Receipt**

The Skill Receipt exposes:

- the exact Skills used;
- the data timestamp;
- important output fields;
- the normalised signals;
- and the logic that translated those signals into the displayed weather.

---

# 7. The City Remembers

Signal City should not only show the present.

It should maintain a **City Journal**.

Users can replay how conditions changed:

- **9:00 AM** — AI District was sunny
- **1:00 PM** — Heat advisory issued
- **5:00 PM** — Trading activity increased 34%
- **8:00 PM** — Breadth weakened while volatility remained high

The journal gives users historical context and makes the platform useful beyond a single visit.

It can also generate content automatically:

- “How the market changed today”
- “A week inside Signal City”
- “The exact moment the AI District entered a heatwave”
- “Why Memecoin District went from sunny to stormy”

---

# 8. A Connected Product, Not Four Silos

The same selected asset or sector should follow the user throughout the city.

For example, someone clicks the Solana tower.

They first see Solana’s current weather.

They then encounter a viral claim:

> “SOL is guaranteed to break its previous high this month.”

They send that claim directly to the Claims Bureau.

After reviewing the evidence, they move to the Entry Gate to test their personal reason for buying.

If they already hold SOL, they add the analysis to their Portfolio Clinic.

One asset.

One continuous journey.

Four ways of understanding it.

That is how the product becomes plug-and-play rather than a folder containing four unrelated tools.

---

# 9. Who Signal City Is For

## The Curious Market Participant

They do not want to read raw technical data. They want to know what is happening and why.

## The Active Trader

They need evidence, risk context, and changing conditions before making a decision.

## The Crypto Creator

They can turn any district, weather change, claim receipt, or portfolio report into original content with visible Agent Hub provenance.

All three user types enter the same city and use the district that matches what they are trying to understand.

---

# 10. The Permanent Public Experience

Judges and normal users should be able to visit and use the product without contacting the builder.

The homepage should always contain:

- the latest city state;
- the last successful refresh time;
- a search field for any supported asset or sector;
- access to all four districts;
- at least one recently generated public report;
- a visible “Powered by CoinMarketCap Agent Hub” attribution;
- and a system-status indicator.

Guest users should be able to perform analyses immediately.

Accounts should only be required for:

- saving reports;
- tracking a custom portfolio;
- following specific districts;
- receiving alerts;
- or preserving historical analyses.

The product remains useful without signing up.

---

# 11. Shareable Outputs

Every district should generate three usable artifacts.

## A Public Report

A permanent URL anyone can open.

## A Visual Card

Exported in:

- square;
- landscape;
- portrait.

These formats should support X, Instagram, Telegram, Discord, and community posts.

## A Skill Receipt

A structured record showing:

- the Skill or Skills used;
- when the analysis ran;
- the asset and question;
- significant Agent Hub findings;
- Signal City’s interpretation;
- and the conditions that could change that interpretation.

The proof is built into the product.

---

# 12. The Four Districts

## District One: The Weather Grid

### Role

The Weather Grid is Signal City’s main public square and live market map.

It converts global, sector, and asset-level Agent Hub outputs into a dynamic 3D city climate.

### What Users Can Do

Users can view:

- the global crypto climate;
- individual sector weather;
- weather for a selected coin;
- what changed since the previous update;
- expected risk conditions;
- and signals worth watching next.

### User Input

The default city requires no input.

For custom analysis, users can search:

- BTC;
- SOL;
- AI tokens;
- DeFi;
- memecoins;
- RWA;
- a custom watchlist;
- or another supported asset or category.

### Main Output

A live district view containing:

- weather state;
- confidence level;
- contributing factors;
- change history;
- watch conditions;
- Skill provenance;
- and a shareable city postcard.

### City Behaviour

- A healthy district becomes bright and active.
- A deteriorating district becomes darker and quieter.
- A heatwave creates intense sunlight, shimmering roads, and warning signs.
- A storm produces rain, lightning, emergency movement, and slower traffic.
- Fog physically obscures parts of the district because the underlying signal is uncertain.

Uncertainty becomes visible rather than being hidden behind a confident AI paragraph.

---

## District Two: The Claims Bureau

### Role

The Claims Bureau investigates crypto claims, predictions, and narratives.

This is the evolved HypeReceipt product.

A user submits something they have read or heard:

> “Whales are accumulating LINK.”

> “Bitcoin is falling because ETF demand has disappeared.”

> “This token is undervalued compared with its competitors.”

The Bureau breaks the claim into measurable components, routes the research through relevant Agent Hub Skills, and produces a public evidence receipt.

### User Input

- The claim
- Optional source URL
- Relevant asset or sector
- Intended time horizon
- Optional context

### Claim Classifications

Avoid reducing every claim to “true” or “false.”

Use:

- Supported
- Partially supported
- Weakly supported
- Unsupported by current evidence
- Not currently verifiable
- Opinion presented as fact

### Main Output

## Claim Receipt

### Claim

Whales are accumulating LINK.

### Finding

Partially supported.

### What Supports It

Large-holder concentration increased during the selected period.

### What Weakens It

The change is not yet accompanied by a comparable increase in volume or broad market participation.

### What Remains Unknown

The data does not establish why those addresses increased their holdings.

### What Would Strengthen the Claim

Continued large-holder accumulation combined with sustained spot demand.

### Why It Matters

The claim may describe a real change, but “whales are accumulating” should not automatically be interpreted as an imminent price move.

### Skills Used

Crypto Research · Holder Analysis · Market Overview

### City Behaviour

The Claims Bureau appears as a civic building or courthouse.

A claim enters as a document.

Evidence panels light up.

The final receipt is stamped with its classification.

Cars can arrive, queue, and depart based on the number of live claims being processed.

---

## District Three: The Entry Gate

### Public-Facing Subtitle

**Run your reason through the FOMO Checkpoint.**

### Role

The Entry Gate examines the reasoning behind a potential trade before the user acts.

It is not a buy-signal generator.

It asks:

> Does the user’s stated reason for entering match current market evidence?

A user enters:

> “I want to buy DOGE because everyone is talking about it and I think it will keep pumping.”

The system compares that reasoning with current market structure, volatility, liquidity, trend conditions, and relevant research.

### User Input

- Asset
- Intended action
- Reason for considering it
- Time horizon
- Approximate risk tolerance
- Optional intended position size

The intended position size can be expressed as a percentage of the user’s portfolio.

### Main Output

## Entry Check

### Gate Status

High caution.

### Your Thesis

Social attention and recent price momentum will continue.

### What Currently Supports It

Momentum and trading activity remain elevated.

### What Challenges It

Volatility has expanded sharply and participation is becoming concentrated.

### What Appears Emotional

The stated reason relies mainly on recent price movement and fear of missing further gains.

### Conditions Worth Waiting For

A consolidation period with sustained volume and broader participation.

### Thesis Invalidation

Momentum weakens while volatility remains elevated.

### Questions You Have Not Answered

- What would make you exit?
- How much of the move has already happened?
- Are you reacting to evidence or social pressure?

### Gate States

- **Open** — the stated thesis is reasonably aligned with current evidence.
- **Caution** — supporting evidence exists, but important risks remain.
- **Restricted** — the thesis is weak, incomplete, or heavily dependent on momentum.
- **Closed** — current evidence strongly conflicts with the stated reasoning.
- **Inspection required** — insufficient data or unclear intent.

These are not trading instructions.

They are assessments of the quality of the user’s reasoning.

### City Behaviour

The Entry Gate is a transport checkpoint at the edge of the city.

A green, amber, or red signal controls entry.

Cars queue when volatility is high.

Vehicle flow slows when market conditions worsen.

Road barriers, warning lights, and traffic officers indicate elevated caution.

---

## District Four: The Portfolio Clinic

### Public-Facing Subtitle

**Diagnose your holdings before the market does.**

### Role

The Portfolio Clinic examines a user’s holdings as a connected system rather than analysing every coin in isolation.

The original Bag ER idea remains, but the production version is more responsible and more useful.

### User Input

Users can:

- enter holdings manually;
- upload a CSV;
- build a temporary portfolio without an account;
- save a portfolio after signing in;
- or import from a supported watchlist integration later.

Wallet connection should not be required at launch.

### What the Clinic Examines

- Asset concentration
- Sector concentration
- Correlated exposure
- Volatility imbalance
- Liquidity risk
- Thesis health
- Narrative dependence
- Recent deterioration
- Missing diversification
- Holdings that no longer match the user’s stated reason

### Main Output

## Portfolio Health Report

### Overall Condition

Stable, but highly concentrated.

### Primary Diagnosis

Sixty-eight per cent of the portfolio is exposed to two closely related high-volatility sectors.

### Healthy Holdings

Assets with comparatively stable structure, liquidity, and an intact user thesis.

### Under Observation

Holdings where evidence is mixed or important conditions have recently changed.

### Critical Attention

Assets with weakening liquidity, deteriorating momentum, or no clear remaining thesis.

### Portfolio Blind Spot

Several positions depend on the same market narrative. They may behave like one oversized trade during a downturn.

### Suggested Review

Not “sell this coin.”

Instead:

- Review why each asset is still held.
- Set conditions that would invalidate each thesis.
- Consider how multiple holdings may react to the same market shock.

### City Behaviour

Each holding becomes a building inside the user’s private block.

- Healthy buildings stay lit.
- Under-observation buildings flicker.
- Concentrated exposure places several buildings too close together.
- High-risk buildings receive warning barriers.
- A weak or forgotten thesis appears as an abandoned building.
- Service cars and emergency vehicles can move through the block based on the severity of identified risk.

---

# 13. Shared Engine Behind All Four Districts

All districts use the same core infrastructure.

## The City State Engine

Runs scheduled and on-demand Agent Hub workflows, normalises their outputs, and creates a timestamped market state.

## The Skill Router

Selects the right Skills based on the user’s request.

A claim about whale accumulation requires a different pipeline from a question about sector momentum.

## The Explanation Engine

Turns structured findings into clear language while preserving the underlying numbers and uncertainty.

## The Provenance Layer

Stores:

- Skills invoked;
- request timestamps;
- important source values;
- transformations applied;
- weather or classification rules;
- and generated interpretations.

## The 3D City Renderer

Receives structured state.

It does not independently invent market meaning.

The backend decides what the market state is.

The 3D renderer decides how that state should look.

---

# 14. Production Launch Scope

Signal City should launch as a functioning public product.

That does not mean building every possible feature before launch.

It means every included feature is real, reliable, and usable beyond a recorded walkthrough.

## The Public Product Should Launch With

### A Live City

The city automatically refreshes using current Agent Hub data and clearly shows when it was last updated.

### All Four Functioning Districts

No placeholder buildings marked “coming soon.”

Each district needs a complete input-to-output experience.

### Automatic Skill Invocation

The user should not need to run a Skill elsewhere and paste its output into Signal City.

### Guest Usage

Judges and first-time visitors can run limited analyses immediately.

### Persistent Public Reports

Every completed public analysis receives a shareable URL.

### Private Reports

Portfolio Clinic and Entry Gate reports remain private by default.

### Export System

Users can export reports as images and structured JSON.

A clean PDF report can be added where it genuinely improves usability.

### City Journal

Historical city and district conditions can be viewed and compared.

### Saved Workspace

Optional accounts allow users to save portfolios, claims, watchlists, and generated reports.

### Mobile Usability

The full 3D city can be simplified on mobile, but every analytical function must remain accessible.

### Transparent Failure States

When data is unavailable, the product should display:

> Insufficient current evidence.

It should never silently substitute fake data.

### Rate Limiting and Caching

Public users receive a reasonable free allowance.

Frequently requested city states are cached rather than rerunning identical analysis for every visitor.

### Visible System Status

Users can see whether market data, Skills, scheduled refreshes, and city rendering systems are operating normally.

---

# 15. How Users Access It From Home

Signal City should use a server-managed integration.

The backend invokes Agent Hub Skills or CoinMarketCap data services, stores the resulting state, and serves the finished analysis to the browser.

The visitor never sees or handles the API credential.

## Possible Access Model

### Guest Mode

A small number of daily analyses with no account.

### Free Account

Saved reports, a watchlist, and a larger usage allowance.

### Power Mode

More frequent refreshes, larger portfolios, and custom alerts.

x402 can eventually support on-demand paid analysis without traditional subscription onboarding.

It should remain optional.

Forcing judges or first-time users to fund a wallet would damage the plug-and-play experience.

---

# 16. What Signal City Should Deliberately Leave Out

A working product still needs boundaries.

Do not build:

- trade execution;
- copy trading;
- a public social feed;
- token-gated access;
- a giant explorable metaverse;
- user-owned city land;
- NFTs;
- voice agents walking around;
- or decorative buildings with no analytical function.

The city should feel closer to a live interactive market world than an open-world game.

Think:

> a beautiful low-poly 3D market-intelligence city

not:

> GTA: CoinMarketCap

---

# 17. CoinMarketCap Skills Feasibility

## Can CoinMarketCap’s Skills Power Signal City?

Yes.

Signal City is technically buildable with CoinMarketCap’s current infrastructure.

One architectural correction is important:

> Do not treat every card in the Skills Marketplace as if it were automatically exposed as a normal REST endpoint callable by its marketplace name.

CoinMarketCap describes Skills as reusable workflows layered on top of:

- MCP;
- x402;
- CLI;
- direct API integrations.

For a public custom application, the correct runtime is CoinMarketCap MCP, direct REST APIs, or both.

## Production Structure

```text
CoinMarketCap data and MCP tools
                ↓
Selected Skill workflows
                ↓
Signal City interpretation engine
                ↓
Weather, claims, entry checks, and portfolio reports
                ↓
Interactive low-poly 3D city
```

The Skill defines how the research is performed.

CoinMarketCap MCP and APIs provide the live data and tools.

Signal City provides the deterministic interpretation, product experience, and visual world.

---

# 18. Verified CoinMarketCap Capabilities

CoinMarketCap’s public MCP provides tools for:

- live prices;
- market caps;
- volume;
- price changes;
- global market metrics;
- Fear & Greed;
- altcoin-season context;
- RSI;
- MACD;
- moving averages;
- support and resistance;
- current news;
- trending narratives;
- on-chain holder metrics;
- derivatives;
- open interest;
- funding;
- liquidations;
- upcoming macro events.

Its Market Report workflow combines:

- global market health;
- technical analysis;
- leverage;
- derivatives;
- trending narratives;
- macro catalysts;
- BTC data;
- ETH data.

Its Crypto Research workflow provides:

- token identity;
- market data;
- supply;
- whale concentration;
- holder behaviour;
- technical analysis;
- news;
- green flags;
- risk signals.

CoinMarketCap also provides direct API integration guides covering cryptocurrency data, DEX data, exchange data, and market-wide data.

The underlying capabilities genuinely fit Signal City.

---

# 19. Relevant Marketplace Skills

## Coin Research and Trading Setup

- Perp Contract Analysis
- Altcoin Scanner — Perps
- Altcoin Breakout Scanner — Spot
- Altcoin Sector Analysis
- Altcoin Token Profile
- Altcoin Deep Research
- K-Line Pattern Recognition
- On-Chain Memecoin Analysis

## Market, Bitcoin, and Macro Context

- Daily Market Overview
- Macro News Aggregator
- Crypto Macro Overview
- Daily Market Brief
- BTC Cross-Asset Correlation
- BTC ETF and Institutional Demand
- Macro Financial Conditions

These Skills align naturally with Signal City’s four districts.

---

# 20. District-by-District Technical Feasibility

## 20.1 The Weather Grid

### Verdict

Fully buildable.

### Skills

- Daily Market Overview
- Crypto Macro Overview
- Daily Market Brief
- Altcoin Sector Analysis
- BTC Cross-Asset Correlation
- BTC ETF and Institutional Demand
- Macro Financial Conditions
- Macro News Aggregator

### CoinMarketCap Data Available

- Total market capitalisation
- Market volume
- Fear & Greed
- BTC and ETH dominance
- Altcoin Season Index
- ETF flows
- Market-wide RSI and MACD
- Open interest
- Funding rates
- Liquidations
- Trending narratives
- Macro events

### Signal City’s Added Logic

The Skill output should not directly decide that the weather is stormy.

Signal City should extract structured values:

```json
{
  "marketTrend": -0.42,
  "breadth": -0.18,
  "volatility": 0.81,
  "leverageRisk": 0.74,
  "sentiment": -0.35,
  "narrativeHeat": 0.62,
  "confidence": 0.86
}
```

The rules engine then determines:

```json
{
  "weather": "storm",
  "severity": "high",
  "traffic": "congested",
  "visibility": "reduced",
  "emergencyActivity": true
}
```

The renderer displays that state consistently.

### Feasibility

**9.5/10**

---

## 20.2 The Claims Bureau

### Verdict

Buildable with proper claim boundaries.

### Skills

- Altcoin Token Profile
- Altcoin Deep Research
- On-Chain Memecoin Analysis
- Macro News Aggregator
- Daily Market Overview
- BTC ETF and Institutional Demand
- Crypto Macro Overview

### What It Can Verify

A claim such as:

> “Whale concentration in LINK has increased.”

can be checked against holder concentration and behaviour data.

A claim such as:

> “Bitcoin is falling because ETF demand has disappeared.”

can be broken into:

- Did Bitcoin decline?
- What happened to ETF demand?
- Were macro conditions also changing?
- Does the evidence support the causal claim?

### What It Must Not Pretend to Verify

Claims such as:

> “SOL will reach $1,000.”

> “This project will replace Ethereum.”

> “Whales are buying because they know something.”

should receive classifications such as:

- Prediction, not currently verifiable
- Opinion presented as fact
- Evidence supports the observation but not the claimed cause
- Insufficient current evidence

### Signal City’s Role

For a pasted claim, Signal City should:

1. extract measurable subclaims;
2. identify the asset, time period, and relevant metric;
3. route each subclaim to relevant Skills and tools;
4. compare evidence with the original wording;
5. generate a receipt.

CoinMarketCap supplies the evidence.

Signal City performs the decomposition and classification.

### Feasibility

**8.8/10**

---

## 20.3 The Entry Gate

### Verdict

Fully buildable.

### Skills

- Perp Contract Analysis
- Altcoin Scanner — Perps
- Altcoin Breakout Scanner — Spot
- K-Line Pattern Recognition
- Altcoin Token Profile
- Daily Market Overview
- BTC Cross-Asset Correlation

### What It Can Examine

For a user who says:

> “I want to buy SUI because it broke out today and everyone is posting about it.”

Signal City can test:

- Did it actually break out?
- How large is the move relative to recent volatility?
- Is volume confirming it?
- Is RSI overextended?
- What are funding and open-interest conditions?
- Is the broader market supporting risk?
- Is social attention rising faster than participation?
- What would invalidate the thesis?

### Correct Positioning

The Entry Gate should not say:

> Buy SUI.

It should say:

> Your reason for entering depends heavily on recent momentum. Current volume supports the move, but volatility and funding have risen enough to make chasing materially riskier.

It judges the quality of the thesis, not the user’s financial future.

### Feasibility

**9.3/10**

---

## 20.4 The Portfolio Clinic

### Verdict

Buildable, but requires the most Signal City-specific logic.

### Skills

- Altcoin Token Profile
- Altcoin Deep Research
- Altcoin Sector Analysis
- Crypto Macro Overview
- Daily Market Overview
- On-Chain Memecoin Analysis

### What CoinMarketCap Supplies

- Price performance
- Market capitalisation
- Volume and liquidity
- Category and tags
- Supply data
- Holder concentration
- Technical state
- Current news
- Risk indicators
- DEX liquidity
- Token-security signals where available

### What Signal City Calculates

- Percentage concentration
- Sector concentration
- Historical correlation
- Duplicated narrative exposure
- Volatility contribution
- Liquidity imbalance
- Overall portfolio health
- Holdings whose evidence conflicts with the user’s thesis

Example:

> You hold five coins.
>
> Three appear different on the surface, but all belong to the same high-volatility AI infrastructure narrative.
>
> During recent risk-off periods, they moved with an average correlation of 0.82.
>
> Your five positions behave more like two independent bets.

### Wallet Import

For the first production release, use:

- manual holdings;
- CSV upload;
- saved portfolios.

Wallet import can come later.

Reliable cross-chain balance discovery is not the core CoinMarketCap Skill use case.

### Feasibility

**8.2/10**

---

# 21. The Limitation Around the 200+ Marketplace Skills

The public Skills Marketplace presents the Skills, but it does not currently expose a clearly documented app-facing endpoint such as:

```http
POST /skills/daily-market-overview/execute
```

CoinMarketCap’s official documentation instead presents Skills as workflows built over:

- MCP;
- x402;
- CLI;
- direct API integrations.

Its Chat Completions endpoint may execute built-in tools and return tool traces, but access may be limited.

Signal City should not depend on receiving special enterprise access.

What can be relied on:

- CoinMarketCap MCP is programmatically usable.
- CoinMarketCap REST APIs are programmatically usable.
- Official open-source Skill workflows can be reproduced.
- Signal City can automate the workflow logic.
- The required data largely exists.

What should not be assumed:

- That every Marketplace Skill has a public execution endpoint callable by slug.

---

# 22. Correct Production Architecture

## Layer 1: CoinMarketCap Connection

Use one or both of the following.

### CoinMarketCap MCP

Connect a server-side MCP client to:

```text
https://mcp.coinmarketcap.com/mcp
```

Store the API key securely on the backend.

### CoinMarketCap REST API

Use direct APIs for:

- predictable structured responses;
- scheduled city refreshes;
- portfolio calculations;
- historical time series;
- category-level calculations;
- caching.

All credentials remain server-side.

## Layer 2: Signal City Skill Router

The router decides which workflows are needed.

Example:

```text
Request: Generate global city weather

→ Daily Market Overview
→ Crypto Macro Overview
→ BTC Cross-Asset Correlation
→ Altcoin Sector Analysis
```

Another example:

```text
Claim: “PEPE liquidity is collapsing”

→ On-Chain Memecoin Analysis
→ Altcoin Token Profile
→ DEX Liquidity History
→ Token Security Signals
```

## Layer 3: Structured Skill Records

Every execution should be saved as a real record.

```json
{
  "runId": "run_7f92",
  "skill": "altcoin-sector-analysis",
  "requestedAt": "2026-07-10T01:42:00+01:00",
  "asset": "AI sector",
  "source": "coinmarketcap",
  "rawOutput": {},
  "normalizedSignals": {},
  "status": "completed"
}
```

This becomes the Skill Receipt.

It proves that the city state was not invented by the interface.

## Layer 4: Deterministic Intelligence Engine

This layer calculates:

- weather;
- traffic;
- warnings;
- claim classifications;
- gate states;
- portfolio diagnoses.

No decorative LLM guessing.

## Layer 5: Explanation Engine

The model turns calculated results into clear language.

Example:

> The AI District remains active, but traffic is slowing and volatility is increasing. The heatwave warning remains in place because prices are extended even though participation is still broad.

The model explains the result.

It does not decide the result.

## Layer 6: 3D City Renderer

The renderer receives something like:

```json
{
  "district": "ai",
  "weather": "heatwave",
  "trafficDensity": 0.84,
  "trafficSpeed": 0.57,
  "buildingActivity": 0.79,
  "emergencyLevel": 0.31,
  "visibility": 1,
  "confidence": 0.88
}
```

The renderer then:

- fills the road with cars;
- changes vehicle speed;
- changes district lighting;
- displays warning signs;
- updates weather effects;
- activates emergency vehicles;
- and displays the explanation card.

---

# 23. Final Verdict

## Can Agent Hub Skills Support Signal City?

Yes.

| District | Technical Feasibility | Dependency on Custom Logic |
|---|---:|---:|
| Weather Grid | 9.5/10 | Low–medium |
| Claims Bureau | 8.8/10 | Medium |
| Entry Gate | 9.3/10 | Medium |
| Portfolio Clinic | 8.2/10 | High |

The data and workflow capabilities are sufficient.

The product should not be built around an assumed “execute any Marketplace Skill by slug” API that CoinMarketCap has not publicly documented.

Instead:

> Use CoinMarketCap MCP and REST APIs as the live runtime, use the Skills as the research workflows, and make every output visible through a Skill Receipt.

That gives Signal City a real public experience judges can open from home, use without installing Claude Code or Codex, and revisit after the competition.

More importantly, it remains unmistakably an Agent Hub product rather than a generic market dashboard with CoinMarketCap mentioned in the footer.
