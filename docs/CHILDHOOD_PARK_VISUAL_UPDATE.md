# Childhood Memory Park — Visual Update

## Scope
This update changes only rooms detected as the `childhood` category. All other room categories retain their existing architectural shell and rendering order.

## Experience direction
The Childhood room is presented as an open-air, walkable memory park:
- A timber entrance arbor with a park title sign.
- Soft meadow ground and a winding gravel memory path.
- Stepping stones, flower beds, distant meadow mounds and a timber boundary fence.
- Three small park trees that complement the existing central memory tree and treehouse.
- A reflection pond and timber bench.
- A trellis backing for the existing Childhood Memory Wall so it reads as an intentional outdoor memory installation.
- Existing treehouse, tyre swing, bicycle, hopscotch, cricket set, toy train, bedroom keepsakes and uploaded-memory interactions are preserved.

## Technical implementation
- Added `src/utils/childhoodParkEnvironment.ts`.
- Integrated the park only when `detectRoomCategoryFromInput()` returns `childhood`.
- The original architectural shell is grouped and hidden only for the Childhood category.
- The invisible room exit hitbox remains available.
- Hidden shell meshes are removed from the camera-obstacle and solid-wall render lists.
- Park ground, sky and garden details are procedural; no remote assets or new dependencies are required.
- Repeated details use `InstancedMesh` to keep draw calls controlled.
- All created geometries, materials and canvas textures are registered with the room builder's existing disposal tracker.
- No new animation loop was added.

## Visual reference
Palette: meadow sage, warm timber, gravel beige, soft flower colours and a blue-to-warm horizon sky. The overall style follows `MYMUSEUM_VISUAL_DESIGN_SKILL`: stylised realism, balanced detail, warm lighting and clear exploration paths.

## Validation
- TypeScript syntax transpilation passed for all modified TypeScript files.
- Full dependency installation, type-check, production build and live 3D browser verification were not available in this environment. Run `npm install`, `npm run lint`, `npm test` and `npm run build` in the project environment before deployment.
