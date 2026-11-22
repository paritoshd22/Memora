# MEMORA Performance Patch V1

This patch is a conservative first pass focused on reducing desktop GPU work and bounding procedural-art cache memory. It preserves the existing museum features and leaves mobile quality profiles unchanged.

## Changes

1. Desktop real-time shadows are temporarily disabled in all three desktop graphics profiles (`desktop_high`, `desktop_balanced`, `desktop_performance`). Mobile profiles are unchanged.
2. Desktop pixel-ratio ceilings are reduced to 1.35 / 1.0 / 0.85 for high / balanced / performance profiles. Existing viewport pixel-budget logic still applies.
3. Animated atrium dust/mote particles are hidden for all desktop profiles, including when returning from a room to the atrium. Mobile behavior is unchanged.
4. Procedural artwork cache is now LRU-bounded to 48 entries, preventing unbounded growth as different memories are visited. Artwork generation resolution and JPEG quality are unchanged.
5. Corrected the `tier` metadata for `desktop_performance` from `tablet` to `desktop`.

## What was deliberately not changed

- Character movement and collision detection
- Room/floor navigation and elevator
- Memory records, memory visibility, and gallery contents
- Video/audio features
- Room architecture and design configuration
- Mobile graphics profiles
- Existing Three.js scene and component architecture

## Reverting temporary visual reductions

To restore desktop shadows, change `enableShadows: false` back to `true` in the three desktop profile objects in `src/utils/museumVisualStandards.ts`.

To restore desktop ambient motes, remove the `!qualityConfig.profileId?.startsWith('desktop_')` conditions in `src/components/AtriumScene3D.tsx` and restore the prior desktop-performance-only visibility check. Keep the cache bound unless there is a measured reason to remove it.

To restore the previous pixel-ratio ceilings, set desktop profile values back to 1.75 / 1.35 / 1.0 respectively. Do this only after FPS and frame-time profiling.

## Validation status

This patch must still be validated by running the project's own `npm install`, `npm run lint`, `npm test`, and `npm run build`, followed by desktop and mobile browser testing. No FPS improvement is claimed until measured on the target hardware and deployed build.
