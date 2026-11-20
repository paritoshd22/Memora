# MEMORA Local 3D Models Directory (`public/assets/models/`)

This directory stores locally hosted `.glb` / `.gltf` 3D assets used by **MEMORA**.

## Directory Structure Conventions

- `public/assets/models/architecture/` — Columns, arches, moldings, doors, and structural trim
- `public/assets/models/furniture/` — Benches, vitrines, desks, beds, bookshelves, and seating
- `public/assets/models/decorations/` — Sculptures, vases, lamps, clocks, and ambient props
- `public/assets/models/nature/` — Botanical planters, trees, foliage clusters, and rocks
- `public/assets/models/interactive/` — Nostalgic toys, audio gramophones, projectors, and keepsakes
- `public/assets/models/displays/` — Picture frames, pedestals, scrapbooks, and certificate cases
- `public/assets/models/characters/` — Character accessories and wearable props

## Rules & Standards

1. **No Remote Hotlinking**: All production 3D models must be stored locally inside `public/assets/models/` and registered in `src/data/assetManifest.ts`.
2. **Licence Compliance**: Prefer **CC0 1.0 Universal** assets (such as [Poly Haven](https://polyhaven.com/models)). Never commit copyrighted or unlicensed models.
3. **Performance Budgets**:
   - Individual decorative props: `<= 5,000` triangles (`1024x1024` max textures).
   - Hero architectural / centerpiece models: `<= 20,000` triangles (`2048x2048` max textures).
   - Always provide a procedural fallback via `src/utils/gltfAssetLoader.ts` so missing or loading files never block scene rendering.
