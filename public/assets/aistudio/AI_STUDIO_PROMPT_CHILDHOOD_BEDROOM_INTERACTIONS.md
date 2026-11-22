# PASTE THIS INTO GOOGLE AI STUDIO (Build mode) — MEMORA Childhood Bedroom: Interactive Experience (NO VISUAL CHANGES)

You are working on my existing MEMORA app (React 19 + TypeScript + Vite + **direct Three.js**, Express server). **Never rebuild or rewrite the app. Do not migrate to React Three Fiber. Do not add npm dependencies.**

## The one rule above all others: DO NOT CHANGE THE EXISTING VISUALS
This sprint adds **behaviour, interaction, camera moves, animation and memory wiring**. It must not change how anything that already exists looks.
- Do **not** modify existing geometry, materials, textures, colours, palette, lighting, shadows, fog, tone mapping, post-processing, UI styling, fonts, layout, object positions, room architecture, the Childhood Park doorway transition, or the atrium.
- Do **not** re-enable the desktop shadows / dust motes / pixel-ratio ceilings that `PERFORMANCE_PATCH_V1.md` deliberately reduced.
- Do **not** run any "Stage 2 — improve furniture, materials and lighting" work from the spec. **That stage is cancelled for this sprint.**
- New things may only be added **where the spec needs an object that does not exist yet**, built procedurally in the *same* style/palette/material language as the neighbouring furniture (reuse the existing material helpers and `roomExhibition3D.ts` conventions), placed in genuinely free floor/wall space, with a matching collider. Put each new object behind its own group so it can be removed in one line.
- Animation of an existing object means moving its **existing** meshes/pivots (door pivot, lid, drawer, etc.) — never swapping or re-skinning them.
- Before/after proof is required: screenshots of the bedroom from the same camera positions before any edit and after the sprint must look identical apart from the new objects/interactions. Anything else that differs is a bug — revert it.

## Spec
The full feature spec is in `public/assets/aistudio/CHILDHOOD_BEDROOM_BRIEF_SPEC.md`. Read it completely. It is the source of truth for **what each interaction does**. Where it says to build, retexture or relight something that already exists, **keep the existing look** and only add the interaction. Where it conflicts with this prompt, this prompt wins.

## Skills to load first
Read `public/assets/aistudio/MYMUSEUM_VISUAL_DESIGN_SKILL_7e343784.md` (project rules, wins over every skill), then these from the same folder: `bestthreeSKILL_ca27fe89.md` (Three.js best practices), `three.jsSKILL_bc9a9305.md`, `optimize-threejs-games` (`optimiseSKILL_d50e8c26.md`), `performance_SKILL_39b515db.md`, `tour_SKILL_e1626474.md` (camera paths and mode handoffs), `game_uiSKILL_f68b6a0a.md` (prompts/HUD over a 3D view), `motionSKILL_e7d53387.md` and `motion2SKILL_920da8c8.md` (easing, timing, reduced motion), `fronutuiSKILL_34a9036c.md`, `digital-accessibilitySKILL_dcd9371c.md`, `playwrightSKILL_2babd657.md` (screenshots/E2E only, as dev tooling, not an app dependency). Optional: `CLoth_SKILL_c5a4a060.md` (curtain motion only, no new cloth visuals).
Do **not** use `reactjsSKILL` (R3F), `gameSKILL` (Tripo API/new GLBs), `scroolSKILL`, or any skill instruction to install packages. In your plan, list the skills you used and any deliberate deviation.

## What exists today (verified — re-verify, don't assume)
- Bedroom is built in `src/utils/roomExhibition3D.ts` (`buildExhibitionRoom3DScene`): `spaceGroups.bedroom`; existing interactive objects `wooden_bed`, `wardrobe`, `bedroom_tv`, `study_desk` (+ `toy_chest`, `toy_train`, `cricket_set`, `spinning_globe`, outdoor ones) in `interactiveObjectGroups`; each is registered with `registerInteractiveHitbox(group, id, spaceId, title, prompt, size, offset, linkedMemory)`; `triggerInteractiveObject(objectId)` runs the existing per-object behaviour; the wardrobe already has a door pivot.
- Memory linking: `findLinkedMemoryForObject(...)`, `linkedObjectId` in `src/types/curation.ts`, asset resolution in `src/utils/memoryTo3DAssetResolver.ts`. `ROOM_ENTRY_TRANSITION_NOTES` says an object receives a memory only if explicitly linked or keyword-matched. **Keep that rule.**
- Input/proximity: `E` key → `handleTriggerProximityInteraction()` in `src/components/AtriumScene3D.tsx` using `proximityTargetRef`; `V` toggles first/third person; camera has `cancelActiveCameraTransition`, `cameraObstacleMeshes`, and quality tiers in `src/utils/museumVisualStandards.ts`.
- Types: `InteractiveObjectId3D` / `LivingWorldSpaceId` in `src/types/aiStudio.ts` (several `Record<InteractiveObjectId3D, …>` maps exist; adding an ID means updating every one).

## Step 1 — Inspect and report (no edits yet)
1. Read the code above plus the existing interaction/camera code paths. Take **baseline screenshots** of the bedroom (desktop, ~768px, ~390px) from fixed spots: spawn, bed, wardrobe, desk/TV, each wall.
2. Produce a **gap table** against the spec's 16 areas: bed/under-bed book, bedside drawer, trophy shelf, pinboard, CRT computer, cupboard/school bag, window, radio, projector, cricket corner, clock/calendar, drawing wall. For each: *exists as-is (interaction only)* / *exists but needs interaction hook* / *missing (needs a new additive object)*, with file/line evidence.
3. Propose a plan (max 12 bullets) that reuses one **central interaction manager** (extend the existing `proximityTargetRef` + `registerInteractiveHitbox` flow rather than inventing a parallel one): per-object ID, type, linked memory IDs, radius, prompt, animation, camera destination, state, exit; save/restore character + camera; one active interaction at a time; Escape and a visible close control always exit.
4. **Stop and wait for my approval.**

## Step 2 — Implement (only after approval), in sub-steps, report after each
**S-a** interaction manager + prompts ("E — …") + save/restore + Esc; **S-b** bed / under-bed / flashlight / memory book; **S-c** bedside drawer + item inspection; **S-d** trophy shelf, pinboard, drawing wall viewers; **S-e** CRT computer, headphones, media playback; **S-f** cupboard, school bag, window, radio; **S-g** projector, cricket, clock/calendar; **S-h** sound toggles, polish, memory wiring, performance.
After each sub-step, re-take the baseline screenshots and confirm nothing existing changed.

## Hard constraints
1. **Preserve** all room IDs, object IDs, existing interactions, memory records/storage keys, character movement, collision, doorway transition, atrium and park.
2. **Colliders match visuals.** Any new object needs a collider; keep character radius 0.44 and camera radius 0.28 working; no clipping through walls/furniture/bed in any camera mode; never teleport the camera except for recovery.
3. **Real memories only.** Show original uploaded files by existing memory ID; never AI-replace a photo; never invent letters, chats, certificates, dates, awards or locations; archived messages are verbatim and labelled as archived records; no match → empty state and the object stays a normal decoration. Don't infer dates/places from uncertain AI recognition.
4. **Privacy:** never autoplay private audio/video; mute/sound toggle persists; subtle sounds only, procedurally generated or existing assets (no new audio files unless I supply them).
5. **Performance (desktop lag is a known issue):** no new real-time lights beyond one flashlight spot + at most one small warm light active at a time; no new shadow-casting lights except the flashlight with a small shadow map and only while active; `InstancedMesh` for repeats; cap particles and respect `qualityConfig`; pause updates when the room isn't visible; no React state updates per frame; dispose geometries/materials/textures/video/audio on exit; reuse render targets. The CRT screen uses a canvas/render-target texture inside the 3D monitor, not a full-screen web page.
6. Accessibility: keyboard-only path for every interaction, visible close control, focus handled in viewers, `prefers-reduced-motion` shortens camera/animation moves, prompts readable (WCAG 2.2 AA). UI chrome follows `DESIGN.md`; the 3D look is untouched.
7. No changes to authentication, storage format, server routes or Gemini/AI code except what is needed to read existing memory records.
8. Do not claim anything works unless you ran it. Visual and interaction claims need screenshots or a recorded run from the running app.

## Verification (mandatory before you say done)
For **every** object: approach → prompt appears at the right distance → prompt disappears → interaction starts → correct animation and camera → real uploaded memory shown (and empty state when none) → exit by Esc and by close button → character and camera restored exactly → no other interaction still active. Also: baseline-vs-final screenshot comparison (desktop/tablet/mobile) showing no unintended visual change; frame-time numbers before/after on desktop; `npm run lint`, `npm test`, `npm run build` results.

## Report format (after each sub-step and at the end)
Files changed · new components/objects added (and where) · interactions completed · memory connections implemented · performance impact (measured) · screenshot evidence of **no visual change to existing assets** · known limitations · build/test results.
