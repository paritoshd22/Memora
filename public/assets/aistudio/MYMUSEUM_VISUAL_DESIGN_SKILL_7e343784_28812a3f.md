# MEMORA Visual Design Skill

## High-quality stylized-realistic 3D · Warm luxury museum · Balanced performance

Use this file as the persistent visual and technical standard whenever
modifying MEMORA's 3D environment.

## 1. Project context and non-negotiable constraints

MEMORA is an existing React 19 + TypeScript + Vite application using
Three.js directly. Its existing codebase includes a substantial
`AtriumScene3D.tsx`, room and floor systems, character movement,
collision detection, room interiors, memory interactions, procedural
artwork, audio and AI features.

**Do not rebuild or replace the application.** Preserve the current
direct-Three.js architecture. Do not migrate the museum scene to React
Three Fiber. Do not replace working geometry, camera, character,
collision, room, memory or navigation systems without first explaining
the need and obtaining approval.

Current design tokens found in the project include: - Ivory: `#F6F1E8` -
Panel ivory: `#FFFCF6` - Walnut: `#493629` - Amber: `#D6A15D` -
Champagne: `#E9D4B1` - Sage: `#87977C` - Rose: `#C98D87` - Blue:
`#6E8FA6` - Main text: `#27231F`

Typography already includes Cormorant Garamond for display headings and
Plus Jakarta Sans for UI. Maintain consistency unless a deliberate
design-system change is approved.

## 2. Visual north star

Create a **high-quality stylized-realistic 3D world** with a **warm
luxury museum** atmosphere and **balanced performance** across desktop,
tablet and mobile.

The world should feel: - Welcoming, personal, calm and emotionally
meaningful. - Like a polished exploration game, not a generic
architectural walkthrough. - Rich in material detail but visually
restrained. - Warm and luminous, with clear focal points and readable
navigation. - Consistent across atrium, room entrances, galleries and
memory spaces.

Use stylized realism rather than strict photorealism. Preserve readable
silhouettes, intentional shapes and warm colour harmony. Avoid childish
low-poly styling, plastic-looking surfaces, excessive gold,
over-decoration and visual noise.

## 3. Composition and architecture

For every environment change: 1. Identify the visual focal point and
ensure it is visible from the default camera. 2. Maintain clear
circulation paths and accessible room entrances. 3. Check sightlines
from character height and camera height. 4. Use hierarchy: primary
architecture first, interactive destinations second, decorative props
last. 5. Avoid object intersections, floating props, z-fighting, clipped
geometry and repeated decorative duplicates. 6. Keep the central tree as
an intentional signature element unless the product owner explicitly
approves replacing it. It must not dominate or obstruct the atrium. 7.
Keep the Childhood Memories Room and other room portals legible and easy
to approach. 8. Validate architecture against existing collision
volumes; visual geometry and colliders must agree.

Do not remove functional objects or memory-linked displays merely to
reduce clutter. Reposition, resize or simplify them safely.

## 4. Materials and surface language

Use a restrained material palette: - Warm ivory plaster or limestone for
major walls. - Walnut for selected architectural features, furniture and
trims. - Champagne/aged brass for small accents. - Travertine, limestone
or warm marble for floors. - Soft fabric, paper, ceramic and glass for
selected props.

Material rules: - Use `MeshStandardMaterial` or `MeshPhysicalMaterial`
only where physically based response adds value. - Avoid making every
surface glossy or metallic. - Vary roughness and subtle colour tone to
prevent a flat, synthetic look. - Use normal/roughness maps only when
their resolution and scale are appropriate. - Ensure UV scale is
correct; avoid obvious repeated texture tiling. - Prefer procedural
canvas textures already used by the project when they are visually
sufficient. - Reuse materials and textures across repeated objects. -
Set colour spaces and texture filtering correctly. - Dispose of textures
and GPU resources when their owning scene/component is removed.

## 5. Lighting and atmosphere

Aim for warm, layered lighting: - A soft ambient/hemisphere
foundation. - One coherent key light direction. - Selective warm
practical lights near focal architecture and room portals. - Subtle fill
lighting to preserve readable shadows. - Controlled highlights on brass,
glass and polished stone.

Avoid: - Overexposure and washed-out ivory surfaces. - Too many point
lights. - Hard, distracting shadow edges. - Strong bloom that obscures
detail. - Heavy fog or post-processing that reduces visibility. - Large
uncompressed HDR environments on mobile.

Use HDRI/environment lighting selectively. Prefer a single well-chosen
environment map with restrained intensity over many competing lights. If
using post-processing, make it optional and quality-tiered.

## 6. Camera and player readability

Preserve the existing camera and character controller unless a change is
specifically requested.

Check: - The character remains visible and correctly scaled. - The
camera does not clip through walls or props. - Important room portals
remain in view. - Camera movement is smooth but not sluggish. - Camera
collision respects existing world geometry. - Camera framing works at
desktop, tablet and mobile aspect ratios. - UI overlays do not obscure
critical movement or interaction cues.

Never change coordinate conventions, floor heights, doorway trigger
dimensions or collision assumptions without inspecting dependent code.

## 7. Interaction and animation

Use motion to communicate meaning: - Gentle idle movement for selected
environmental objects. - Clear approach/activation feedback for room
portals. - Smooth, short transitions for doors, displays and camera
focus. - Subtle hover/proximity feedback rather than constant pulsing. -
Motion should never distract from personal memories.

For React DOM/UI animation, the project already has `motion`; prefer it
for existing UI patterns. For complex coordinated timelines or 3D object
animation, GSAP may be added as an optional dependency after review. If
GSAP is used in React, scope animations and clean them up on unmount;
prefer `@gsap/react`'s `useGSAP` hook.

Do not run independent animation loops for objects that can share the
existing scene update loop. Avoid creating multiple competing render
loops.

## 8. Asset workflow

Preferred model format: GLB/glTF.

Use free assets with clear licences. Poly Haven assets are CC0; retain a
small asset manifest recording asset name, source URL, licence and date
downloaded even when attribution is not required.

Asset rules: - Download only assets that materially improve the scene. -
Prefer low/medium polygon variants for interactive web scenes. - Use
Draco or Meshopt compression where supported and correctly configured. -
Use KTX2/Basis compressed textures only when the transcoder assets and
`KTX2Loader` configuration are included and tested. - Keep texture
dimensions appropriate to the object and device tier. - Avoid remote
hotlinking as a production asset strategy; place approved assets in the
project and serve them locally. - Do not add copyrighted game/movie
assets or assets with unclear licences. - Do not add a large model pack
without first checking download size, triangle count, materials,
animations and licence.

Three.js `GLTFLoader` is available through
`three/addons/loaders/GLTFLoader.js`. Follow the current Three.js
documentation for supported extensions and proper disposal of image
bitmaps and GPU resources.

## 9. Performance budgets and device tiers

The target is balanced quality and smooth interaction, not maximum
effects.

Desktop: - Full-quality materials and selected shadows. - Moderate
environment detail. - Optional subtle post-processing on capable
devices.

Tablet: - Reduced shadow map size and post-processing. - Moderate
texture resolution. - Keep interaction and camera smooth.

Mobile: - No expensive post-processing by default. - Reduced shadow
quality or disabled real-time shadows on weak devices. - Smaller
textures and simplified distant props. - Preserve essential interactions
and visual hierarchy.

General rules: - Reuse geometries/materials. - Instance repeated props
where appropriate. - Avoid unnecessary transparent layers and
overdraw. - Limit dynamic lights and shadow-casting lights. - Use
frustum culling and sensible LOD/distance-based detail where helpful. -
Avoid per-frame object allocation. - Cap pixel ratio based on device
capability. - Pause or reduce work when the tab is hidden. - Dispose of
geometries, materials, textures, render targets and event listeners
correctly. - Measure before and after; do not claim performance gains
without measurements.

## 10. Accessibility and reduced motion

-   Respect `prefers-reduced-motion`.
-   Provide clear interaction cues that do not rely on colour alone.
-   Keep UI text readable against the 3D scene.
-   Provide touch-sized controls on mobile.
-   Avoid essential actions that require hover only.
-   Keep keyboard controls and existing accessibility affordances
    working.

## 11. Required workflow for every visual change

Before editing: 1. Inspect the relevant component, helper, type and
collision code. 2. Identify existing behaviour and dependencies. 3.
State the exact files expected to change. 4. Create a checkpoint/backup.
5. Make the smallest coherent change.

After editing: 1. Run TypeScript/lint and build commands available in
the project. 2. Test the affected scene in preview. 3. Test desktop,
tablet and mobile layouts. 4. Check character movement, collisions, room
entry and memory interactions. 5. Inspect console errors and failed
asset requests. 6. Report files changed, behaviour preserved, test
results and remaining issues.

Never report a test as passed unless it was actually executed.

## 12. Change boundaries

Unless specifically requested, a visual-design task must not: - Change
authentication, account/session logic or memory-vault persistence. -
Change memory data schemas or delete user data. - Replace room IDs,
floor IDs or portal IDs. - Remove character movement or collision
code. - Replace the 3D engine. - Introduce paid services, API keys or
subscriptions. - Install new packages without checking compatibility and
explaining their purpose.

## 13. Visual review checklist

Before declaring a scene complete, check: - \[ \] Clear focal point and
balanced composition. - \[ \] No important sightline blocked. - \[ \]
Walkable paths and room entrances remain clear. - \[ \] No visible mesh
intersections or floating props. - \[ \] Materials have believable
roughness and scale. - \[ \] Textures do not visibly repeat or blur. -
\[ \] Lighting is warm but not overexposed. - \[ \] Character and
interaction points are easy to read. - \[ \] Camera does not clip. - \[
\] Responsive quality tiers work. - \[ \] No major console errors or
failed assets. - \[ \] Existing functionality remains intact.

**Product principle:** MEMORA is a personal memory world. Every visual
decision should make memories feel meaningful, discoverable and
welcoming---not merely make the scene more complex.
