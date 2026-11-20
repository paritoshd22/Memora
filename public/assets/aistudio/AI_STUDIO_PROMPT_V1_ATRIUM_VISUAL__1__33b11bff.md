# PASTE THIS INTO GOOGLE AI STUDIO (Build mode) — MEMORA Visual Sprint V1: Central Atrium

You are working on my existing MEMORA app (React 19 + TypeScript + Vite + **direct Three.js**, Express server). **Never rebuild or rewrite the app. Do not migrate to React Three Fiber. Do not add new npm dependencies.**

## Goal (visual first)
Make the **Central Atrium** look like a real premium architectural museum: grand, warm, detailed, cinematic. This is a visual-only sprint. Style: **Premium Modern Nostalgic Museum** — warm ivory, walnut, champagne gold, travertine, natural stone; stylised-realistic; high-quality PBR; subtle ambient animation. Follow the standard in `public/assets/aistudio/MYMUSEUM_VISUAL_DESIGN_SKILL_7e343784.md` (design tokens: ivory #F6F1E8, walnut #493629, amber #D6A15D, champagne #E9D4B1).

## What I found in the code (verify, don't assume)
- `src/components/AtriumScene3D.tsx` (~10,000 lines) builds most of the atrium from `BoxGeometry` / `CylinderGeometry`, with no GLB use in the scene (`public/assets/models/` is empty). **Richer helpers already exist in `src/utils/museumVisualStandards.ts`** (lathe, tube, CatmullRom curves, `InstancedMesh`), and the central tree is already built by `populateRefinedAtriumTree` from there. **Reuse these helpers; do not duplicate or rebuild them.**
- Materials are procedural canvas textures (`createLuxuryMarbleFloorTexture`, `createChampagneLimestoneTexture`, `createRichWalnutWoodTexture`, PBR map helpers in `src/utils/roomExhibition3D.ts`).
- Renderer already has ACES tone mapping, PCF-soft shadows, `RoomEnvironment` image-based lighting, fog, `UnrealBloomPass`, and quality tiers via `getVisualQualityConfig` (mobile / tablet / desktop). Keep and respect these.
- Collision lives in `src/utils/atriumCollision.ts` (`buildFloorColliders`, `getPerimeterArchitectureSpec`, `ROTUNDA_WALL_RADIUS = 14.6`, `FLOOR_HEIGHT = 6.0`, `LIGHTWELL_*`, `GROUND_SCULPTURE_PLINTH_RADIUS = 1.26`, `ROOMS_PER_FLOOR = 4`).

## Step 1 — Inspect and plan (no edits yet)
1. Read the atrium-building code in `AtriumScene3D.tsx` (columns, pilasters, wall panels, planters, central tree/plinth, lightwell, balustrade, floor, ceiling, room portals, elevator, feature wall).
2. Take **screenshots of the running preview** (desktop width, then a ~768px tablet width, then ~390px mobile width) of: the atrium from spawn, the central tree, a room portal, the elevator front, an upper floor.
3. Report: what looks primitive, flat, empty, repetitive or inconsistent, with screenshot evidence, then a **short plan** (max 10 bullets) for V1. **Stop and wait for my approval** before editing.

## Step 2 — Implement V1 (only after I approve the plan)
Work in sub-steps and report after each: **V1-a** architecture shell, **V1-b** central tree and plinth, **V1-c** materials and lighting, **V1-d** details and ambient animation.

Required improvements:
- **Architecture:** replace plain box/cylinder structure with profiled geometry where it is visible — fluted/profiled column shafts with base and capital (use `LatheGeometry`), cornices and baseboards, ceiling coffers or a refined ceiling treatment, arched or framed portal surrounds, floor inlay pattern (travertine with champagne-gold bands), refined lightwell balustrade.
- **Central tree:** it already has a refined builder (`populateRefinedAtriumTree`). **Review it in your screenshots first.** Only improve what visibly looks weak (e.g. canopy density, trunk/root detail, lighting on it, leaf sway), keep it inside its existing plinth collider (radius 1.26 m), and do not rewrite it.
- **Materials:** better PBR use — roughness/normal/AO variation on walnut, travertine and plaster; avoid obvious tiling and flat colours; champagne-gold accents as metal with controlled roughness.
- **Lighting:** a cinematic but balanced setup — warm key light, soft fill, accent light on the tree and feature areas, subtle volumetric-looking light shafts or dust motes, correct shadows without acne. Keep the existing 2-point-light style budget low; prefer baked-looking gradients and emissive trims over many lights.
- **Details:** planters, benches, signage plaques, sconces — **no empty zones, no floating objects, no repeated identical furniture, no excessive clutter**.
- **Repetition:** use `InstancedMesh` for repeated elements in the atrium architecture (columns, sconces, planters) where it reduces draw calls, following the pattern already used for the tree canopy.

## Hard constraints
1. **Preserve** all room IDs, object IDs, portal slots (0–3 per floor), elevator behaviour, memory display anchors, camera, character movement and existing interactions.
2. **Colliders must match visuals.** If you change any wall, column, planter or plinth footprint, update `atriumCollision.ts` in the same change, keep the character collider radius (0.44) and camera collider radius (0.28) working, and ensure **no object blocks pathways** (keep at least 0.9 m clear walking width between obstacles).
3. **Performance budgets:** mobile tier must keep working. Do not add shadow-casting lights beyond the existing key light. Respect `qualityConfig` (disable the heaviest effects on mobile/tablet). Target: no more than +15% draw calls versus the current atrium; report the before/after draw-call count (`renderer.info.render.calls`) and triangle count (`renderer.info.render.triangles`).
4. Procedural geometry only. **No new GLB/textures unless I supply them.** Keep procedural fallbacks.
5. Do not touch authentication, storage, Gemini/AI code, or server routes in this sprint.
6. Do not claim anything works unless you ran it. Do not mark a visual task complete based on code alone.

## Visual verification (mandatory before you say V1 is done)
Capture screenshots at **desktop, tablet (~768px) and mobile (~390px)** of: the atrium from spawn, central tree close-up, a column and ceiling detail, floor material detail, a room portal, the elevator front, an upper-floor view. Check for: floating objects, intersections/z-fighting, blocked pathways, camera clipping through new geometry, unfinished or empty areas, inconsistent materials, and shadow artefacts. Fix what you see, then show the final screenshots.

## Report format (after each sub-step and at the end)
- Objective
- Problems found (with screenshots)
- Visual improvements completed
- Functional/collision changes
- Files modified
- Tests/checks actually run (`npm run lint`, `npm test`, `npm run build` — state results exactly; if one fails or cannot run, say so)
- Performance impact (draw calls, triangles, frame feel on mobile tier)
- Remaining issues
- Classification of each item: Implemented and verified / Partially implemented / Unverified / Not implemented / Blocked

**Do not start any other stage (exterior, other rooms, AI, uploads, storage). Wait for my approval after V1.**
