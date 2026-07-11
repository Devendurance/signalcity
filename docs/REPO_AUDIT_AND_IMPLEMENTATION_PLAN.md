# Signal City Repository Audit and Implementation Plan

## Audit summary

- The application is an untouched Next.js 16 shell with React 19, TypeScript, Tailwind CSS 4, and `three@0.185.1`.
- The current product source of truth is `docs/SIGNAL_CITY_PRODUCT_SPEC.md`.
- `public/` contains 259 GLB models, 35 JavaScript source files, 27 PNG files, five SVG files, and three font files.
- All 259 GLB models, all 27 PNG files, and all three font files match Daniel Greenheck's `dgreenheck/simcity-threejs-clone` repository byte-for-byte. The 35 copied JavaScript files do not match the current upstream branch byte-for-byte and remain reference-only.
- The upstream code is MIT licensed. The required copyright and permission notice is preserved in `THIRD_PARTY_NOTICES.md`.
- The repository itself is not initialized as a Git repository and has no local history or remote.
- `AGENTS.md` references a `DESIGN.md` file that is not present. This foundation therefore avoids inventing a finished visual system.
- Nine Three.js skills are installed: fundamentals, interaction, animation, geometry, lighting, materials, textures, shaders, and postprocessing. There is no installed GLB-loader skill.

## Reuse decisions

### Reuse

- Low-poly GLB buildings, roads, vehicles, and environment props through a new typed asset registry.
- The broad interaction pattern: bounded map camera, raycasting, object metadata, fixed simulation updates, road topology, and lane nodes.
- Asset naming as source material for a Signal City-specific registry.

### Reimplement for Signal City

- Scene lifecycle, renderer ownership, cleanup, and visibility pausing.
- Camera controls and input bindings.
- Deterministic update loop.
- District/world data model.
- Selection metadata and accessible DOM details.
- Road topology, traffic routing, weather hooks, status hooks, and quality controls.

### Exclude

- Zones and dynamic development.
- Construction gameplay, bulldozing, money, dates, residents, jobs, power simulation, and city economics.
- Source UI and toolbar code.
- Open-ended timers and global `window.game`, `window.ui`, or `window.assetManager` state.

## Phases and checkpoints

1. **Provenance gate** — record upstream source and license; classify assets before use.
2. **Scene and renderer** — client-owned canvas, lights, ground, resize, WebGL fallback, cleanup.
3. **Camera controls** — right-drag rotation, modified right-drag pan, wheel zoom, bounded target/radius.
4. **Asset registry and GLB loader** — typed IDs, caching, cloning, scale/rotation metadata, failure handling.
5. **Deterministic render loop** — fixed-step updates, clamped deltas, visibility pause, explicit stop.
6. **District/world model** — pure TypeScript market-visualization state, independent of Three.js objects.
7. **Raycasting and selection** — dedicated selection layer, stable metadata, DOM details surface.
8. **Road/tile rendering** — authored topology and isolated tile-mask lookup.
9. **Traffic graph** — deterministic lane graph, pooled cars, junction transitions, market-driven density/speed.
10. **Weather and district status hooks** — repeatable fog/light/weather/status changes from structured state.
11. **Performance controls** — DPR cap, quality tiers, pooling, instancing, LOD, culling, and mobile fallback.

Each phase must pass `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`, and a browser/runtime checkpoint before the next phase expands the surface.
