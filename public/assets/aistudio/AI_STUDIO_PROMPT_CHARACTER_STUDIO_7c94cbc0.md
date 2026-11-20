# PASTE THIS INTO GOOGLE AI STUDIO (Build mode) — MEMORA Character Upgrade + Character Studio (Men / Women / Neutral)

You are working on my existing MEMORA app (React 19 + TypeScript + Vite + **direct Three.js**). **Never rebuild the app. Do not migrate to React Three Fiber. Do not add new npm dependencies.** This sprint is about the **player character only**: make it look much better, and let the user customise it as a man, a woman, or a neutral character.

## What exists today (verify in code, don't assume)
- The character is built inline in `src/components/AtriumScene3D.tsx` (around lines 2206–2435): `explorerGroup` → `charBodyGroup`, built from primitives: torso `CylinderGeometry`, coat skirt, lapel `TorusGeometry`, cross-body satchel, brushed-gold badge, sage scarf, belt, head `SphereGeometry` (r 0.22, y 1.48), hair-back and cap spheres, cylinder legs with box shoes and soles, cylinder arms with sphere hands. Total height about 1.7 m.
- Materials include `matCuratorCoat`, `matSkinTone` (single fixed colour `0xf0cfb1`), `matLeatherSatchel`, `matWalnut`, `matWarmLimestone`, `matBrushedGold`, `matSageFoliage`. Geometries are registered with `trackStatic(...)` for disposal.
- Animation is driven by rotating `leftLeg`, `rightLeg`, `leftArm`, `rightArm` (`rotation.x` from a `walkCycle`) and bobbing `charBodyGroup.position.y` (around lines 6860–6995). There are 10 `TechBuddyPose` values: `idle, walking, running, turning, pointing, waving, sitting, interacting, celebrating, talking`.
- Collision radius is `CHARACTER_COLLIDER_RADIUS = 0.44` and the camera collider is `0.28` (`src/utils/atriumCollision.ts`). The body is hidden when the third-person camera gets very close (`resolveCharacterVisibility`).
- There is **no character customisation and no stored character preference** today. The only localStorage key I found is the auth session key `mymuseum_auth_session_v1`.
- The character also appears in room interiors and special modes (bicycle ride, swing, ladder climb). All of these must keep working.

## Step 1 — Inspect and plan (no edits yet)
1. Read the character code, the animation code, `resolveCharacterVisibility`, and every place that reads `leftLeg / rightLeg / leftArm / rightArm / charBodyGroup / headMesh`.
2. Screenshot the current character in the preview: front, side, back and three-quarter views, walking, running, and from the normal third-person distance on desktop and mobile widths. Is the face featureless? Do proportions look blocky?
3. Report problems with screenshot evidence and give a **plan of at most 12 bullets**. **Stop and wait for my approval before editing.**

## Step 2 — Implement in sub-steps (report after each, wait if I ask)
**C-a. Extract the builder, zero visual change.** Move character construction into `src/utils/characterBuilder.ts` exporting something like `buildExplorerCharacter(config, qualityConfig, trackStatic)` that returns `{ root, charBodyGroup, headMesh, leftArm, rightArm, leftLeg, rightLeg, dispose, rebuild(config) }`. `AtriumScene3D.tsx` calls it with a **default config that reproduces today's curator look exactly**. Prove no regression with before/after screenshots and by running the existing animation, bicycle, swing and ladder paths.

**C-b. Body presets: Masculine, Feminine, Neutral.** A *body type* setting that changes silhouette only (shoulder/chest/waist/hip proportions, limb thickness, subtle height differences within about ±6%, neck, hand size). These are independent of every other option: any hairstyle, outfit and colour can be combined with any body type. Keep overall height within the camera's expectations (head top ≈ 1.7 m, pivot ≈ 1.65 m).

**C-c. Face, hair, skin.**
- Skin tones: a palette of at least 10 realistic tones, from very light to very deep, with warm and cool undertones.
- Face: if the head is currently featureless, add a minimal stylised face (eyes, brows, subtle nose and mouth) that reads well at ~4 m third-person distance. No uncanny realism.
- Hair styles (each independent of body type): short crop, side part, buzz, curly short, wavy medium, straight long, bob, ponytail, bun, single braid, curly long, and bald. Facial hair options: none, stubble, short beard, full beard, moustache. Hair colours: at least 10 (black, dark brown, brown, auburn, blonde, grey, white, plus 2–3 fashion colours).
- Optional accessories: glasses (2 styles), cap, headband, earrings, watch.

**C-d. Outfits** (each tintable with a colour picker or palette, and each must animate cleanly with the leg/arm swing without clipping):
- Existing **Curator coat** (default, unchanged).
- Casual (t-shirt/shirt + trousers or jeans), Smart (blazer + trousers or skirt), School uniform, Hoodie + joggers, Dress (A-line, knee-length; the skirt should follow leg swing with limited, believable motion, not rigid cylinders), Kurta + pyjama/trousers, Saree-style drape (simplified, stylised, must not block leg animation), Salwar-kameez style, Sherwani-style long jacket.
- Footwear options: shoes, sneakers, sandals, boots.
- Build clothing as extra meshes on the same pivots, or as a lower-body group that rotates with the legs; do not break the existing leg/arm rotation logic.

**C-e. Character Studio UI + persistence.**
- A "Customise character" entry in the existing UI (choose a sensible place, e.g. the controls/navigation area), opening a responsive modal/panel with a **live rotating preview** (a small Three.js canvas using the same `buildExplorerCharacter` function; dispose it on close).
- Tabs: Body, Face & Hair, Outfit, Accessories, Colours. Buttons: Randomise, Reset to default, Undo/Redo, Save, Cancel.
- Apply changes to the in-world character live (call `rebuild(config)`; do not recreate the whole scene).
- Persist a **versioned config** (`{ version: 1, bodyType, skinTone, hairStyle, hairColor, facialHair, outfit, outfitColors, footwear, accessories }`) in `localStorage` under `memora_character_v1:<userId or 'guest'>`. Validate on load: unknown or invalid values fall back to defaults; never crash on bad data. Do **not** change server schemas or the IndexedDB schema in this sprint.
- Use the existing design tokens (ivory #F6F1E8, panel #FFFCF6, walnut #493629, amber #D6A15D, champagne #E9D4B1) and fonts (Cormorant Garamond headings, Plus Jakarta Sans UI). Must work with touch, keyboard and screen readers (labels, focus order, 44px touch targets).

**C-f. Verification (mandatory).** Screenshots at desktop, tablet (~768px) and mobile (~390px) of: the studio UI; 6 combinations (man, woman, neutral × two different outfits each, including a dress/saree and a kurta); front/side/back; walking and running; each of the 10 poses; sitting/interaction near furniture; bicycle ride; swing; ladder climb; the camera at close range (no hair, clothing or accessory clipping through walls or camera). Check for: clothing or hair intersecting the body during the walk cycle, floating accessories, mismatched seams between parts, z-fighting, wrong shadows.

## Hard constraints
1. **Preserve** the collider radii (0.44 / 0.28), movement, camera behaviour, all poses, all interactions (bicycle, swing, ladder, elevator, memory interactions), room IDs and object IDs.
2. **Performance:** share geometries and materials across rebuilds, dispose old ones, and keep the character within about **12k triangles on desktop and about 6k on the mobile tier** (use `qualityConfig`/device tier for lower detail). Do not add shadow-casting lights; keep the existing `explorerLight`. Report draw calls and triangles for the character before and after.
3. Procedural geometry only. No new GLB/textures unless I supply them (the builder should be structured so GLB parts can be added later).
4. Do not touch authentication, storage, Gemini/AI code, or server routes.
5. Represent people respectfully and neutrally: stylised, not caricatured. Do not tie any option to assumptions about the user; all options are available to everyone.
6. Do not claim anything works that you did not run. Do not mark a visual task complete from code alone.

## Report format (after each sub-step and at the end)
Objective · Problems found (with screenshots) · Visual improvements · Functional changes · Files modified · Tests/checks actually run (`npm run lint`, `npm test`, `npm run build` — exact results; say so if one fails or cannot run) · Performance impact (draw calls, triangles, mobile tier) · Remaining issues · Classification of each item: Implemented and verified / Partially implemented / Unverified / Not implemented / Blocked.

**Do not start any other stage. Wait for my approval after each sub-step if I ask, and after the whole sprint.**
