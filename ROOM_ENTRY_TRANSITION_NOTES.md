# MEMORA — Childhood Park Doorway Transition

## Change
Added a cinematic room-entry transition in `src/App.tsx`.

## Behaviour
1. The physical atrium door continues to use the existing Three.js doorway animation.
2. When the existing room-entry callback selects the Childhood room, the app displays a short warm doorway/flash transition.
3. The two visual door panels slide apart and a warm light reveal appears.
4. After 520 ms, the Childhood room is activated underneath the transition.
5. The overlay fades away after approximately 2.05 seconds, revealing the Childhood Memory Park.
6. The transition timers are cancelled if the user returns to the atrium or signs out.

## Preservation
- No room IDs, object IDs, memory data, APIs, storage keys, or Three.js door systems were changed.
- Existing room selection callbacks are reused.
- The effect is presentation-only and does not replace the existing 3D door animation.

## Verification
- ZIP integrity: verified after packaging.
- TypeScript TSX syntax transpilation: passed for `src/App.tsx`.
- Full TypeScript check/build: not run because project dependencies are not installed in this environment (`vite/client` types unavailable).
- Browser visual test: not performed here.
