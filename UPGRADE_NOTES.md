# MEMORA — Source Upgrade Notes

This ZIP contains targeted upgrades to the supplied project.

## Changes made

1. **Childhood experience direction**
   - Rewrote the Childhood room description and AI curator rationale to prioritise a believable, explorable bedroom, backyard, treehouse, swing, bicycle, garden and play area.
   - Reframed the listed 3D installations as lived-in spaces and contextual memory playback points rather than a conventional exhibit-first gallery.

2. **Safer memory-to-object connections**
   - Removed the positional fallback that attached an unrelated memory to an interactive object when no matching memory existed.
   - Interactive objects now receive a memory only when it is explicitly linked by `linkedObjectId` or matches the object's relevant keywords.
   - This prevents, for example, an unrelated travel photo from appearing as the memory connected to a childhood toy chest just because it was next in the memories array.

3. **Fictional starter memories are opt-in**
   - Changed the default for including starter memories from enabled to disabled.
   - Updated the UI copy to identify starter content as fictional demo examples, not the user's personal memories.

4. **Gemini room-design instructions**
   - Updated the room-design prompt to ask Gemini for a lived-in, explorable environment rather than defaulting to photo walls, display cases and conventional museum exhibits.
   - Added stronger instructions to link only real supplied memory IDs, leave unsupported memories unlinked, preserve original media, and label AI-generated reconstructions as interpretations requiring user approval.

## Existing functionality preserved

The supplied project already contained:
- React + Three.js 3D scene.
- Childhood bedroom, backyard, treehouse, play area and study corner spaces.
- Interactive objects such as the toy chest, toy train, swing, bicycle, cricket set, hopscotch, ladder, desk, globe, wardrobe, bed and television.
- Tech Buddy destination and pose controls.
- Gemini and OpenAI provider adapters.
- Room customisation and atmosphere systems.

These systems were preserved rather than replaced.

## Validation status

A full build/test could not be completed in this environment because project dependencies were not installed and package installation timed out. A TypeScript check was attempted, but it stopped because the `vite/client` type package was unavailable. Please run `npm install`, then `npm run lint`, `npm test`, and `npm run build` in Google AI Studio or a local Node environment before deployment.

---

## Childhood Bedroom interaction prompt
- Added `public/assets/aistudio/AI_STUDIO_PROMPT_CHILDHOOD_BEDROOM_INTERACTIONS.md` (paste into AI Studio) and `CHILDHOOD_BEDROOM_BRIEF_SPEC.md` (full spec). The prompt forbids visual changes to existing assets, cancels the spec's "Stage 2" restyle, requires baseline-vs-final screenshots, and maps the spec onto the existing interaction system.
