# MEMORA — 3D Asset & Animation Workflow (`docs/3D_ASSET_WORKFLOW.md`)

This document defines the step-by-step workflow for adding, registering, loading, optimising, and animating 3D `.glb` / `.gltf` assets in **MEMORA**, in compliance with `MYMUSEUM_VISUAL_DESIGN_SKILL.md`.

---

## 1. Visual & Technical Principles

- **Visual North Star**: Stylized-realistic 3D with a warm luxury museum palette (`#F6F1E8` ivory plaster, `#493629` walnut, `#D6A15D` amber, `#E9D4B1` champagne gold, `#87977C` muted sage).
- **Direct Three.js Architecture**: MEMORA uses imperative Three.js (`three@^0.186.1`). Do not introduce React Three Fiber (`@react-three/fiber`).
- **Zero Remote Hotlinking**: Never load production 3D models or textures from external URLs at runtime. All approved models must live inside `public/assets/models/`.
- **Graceful Procedural Fallback**: Every asset loaded via `src/utils/gltfAssetLoader.ts` can supply a `fallbackFactory` so missing or loading `.glb` files never break scene rendering or collision physics.

---

## 2. Where to Store Model Files

Place all `.glb` files inside the corresponding category folder under `public/assets/models/`:

| Category | Directory Path | Recommended Max Triangles | Max Texture Size |
| :--- | :--- | :--- | :--- |
| `architecture` | `public/assets/models/architecture/` | `<= 15,000` tris | `2048x2048` |
| `furniture` | `public/assets/models/furniture/` | `<= 10,000` tris | `1024x1024` |
| `decorations` | `public/assets/models/decorations/` | `<= 5,000` tris | `1024x1024` |
| `nature` | `public/assets/models/nature/` | `<= 12,000` tris | `1024x1024` |
| `interactive_objects` | `public/assets/models/interactive/` | `<= 8,000` tris | `1024x1024` |
| `memory_displays` | `public/assets/models/displays/` | `<= 4,000` tris | `1024x1024` |
| `character_assets` | `public/assets/models/characters/` | `<= 8,000` tris | `1024x1024` |

> **Note:** In Vite, files inside `public/assets/models/...` are served from `/assets/models/...` at runtime.

---

## 3. How to Handle Licences (Prefer Poly Haven CC0)

1. **Preferred Source**: [Poly Haven Models](https://polyhaven.com/models) — all assets are released under the **CC0 1.0 Universal Public Domain Dedication** (`CC0-1.0`).
2. **Forbidden Assets**: Never add ripped game/movie models, non-commercial-only models, or assets with unverified licences.
3. **Mandatory Licence Recording**: Even when attribution is not legally required (`CC0-1.0`), every asset entry in `src/data/assetManifest.ts` must record:
   - `sourceUrl` (exact URL where the model was obtained)
   - `licence.type` (`'CC0-1.0'` or `'CC-BY-4.0'`)
   - `licence.spdxId`
   - `licence.author`
   - `licence.verifiedAt` (YYYY-MM-DD)

---

## 4. How to Register a New Asset (`src/data/assetManifest.ts`)

Add an entry to `MUSEUM_ASSET_MANIFEST` in `src/data/assetManifest.ts`:

```ts
  furn_vintage_gramophone_01: {
    id: 'furn_vintage_gramophone_01',
    name: 'Walnut & Brass Horn Gramophone',
    localPath: '/assets/models/interactive/furn_vintage_gramophone_01.glb',
    category: 'interactive_objects',
    description: 'Warm walnut cabinet gramophone with brushed brass horn for Audio Memories.',
    sourceUrl: 'https://polyhaven.com/a/gramophone',
    licence: {
      type: 'CC0-1.0',
      spdxId: 'CC0-1.0',
      attributionRequired: false,
      author: 'Poly Haven',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      verifiedAt: '2026-11-14',
    },
    intendedEnvironment: 'childhood_room',
    estimatedFileSizeBytes: 920_000,
    estimatedFileSizeLabel: '920 KB',
    isBundledLocally: true, // Set to true once the .glb file is placed in public/assets/models/
    polygonCount: {
      triangles: 4800,
      lodTier: 'low',
    },
    textureInfo: {
      maxResolution: '1024x1024',
      maps: ['albedo', 'normal', 'roughness', 'metalness'],
      format: 'jpg',
    },
    spatialSpec: {
      boundingBoxMeters: [0.55, 0.92, 0.55],
      pivotAlignment: 'bottom-center',
      colliderSyncRequired: true,
    },
  },
```

Run `validateAssetManifestEntry(entry)` in unit tests or during registration to verify that the ID, local path, and polygon budget conform to MEMORA standards.

---

## 5. How to Load & Reuse Models Across Rooms (`src/utils/gltfAssetLoader.ts`)

Use `loadMuseumAssetById` from `src/utils/gltfAssetLoader.ts`:

```ts
import {
  loadMuseumAssetById,
  disposeObject3DResources,
} from '../utils/gltfAssetLoader';

const result = await loadMuseumAssetById('furn_walnut_gallery_bench_01', {
  maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
  castShadow: !isSoftwareGl,
  receiveShadow: !isSoftwareGl,
  cloneMaterials: false, // Keep false to share GPU material instances across benches
  onProgress: (p) => {
    // Optional progress tracking
  },
  fallbackFactory: () => buildProceduralGalleryBench(),
});

result.scene.position.set(0, 0, -3.2);
roomGroup.add(result.scene);
```

### How Caching & Scene Cloning Prevent Duplication
1. **First Load**: `loadMuseumGLTFModel` parses the `.glb` once, tags its geometries, materials, and textures with `userData.__sharedGLTFTemplate = true`, and stores the master scene in `templateCache`.
2. **Subsequent Loads**: Calling `loadMuseumAssetById` for the same asset in another room or for multiple props clones the node hierarchy via `cloneGLTFScene` in `< 0.2ms` while **reusing the exact same GPU `BufferGeometry` and `Texture` buffers**.
3. **Instancing Repeated Props**: If an environment places `> 20` identical static meshes (e.g., balustrade spindles or foliage clusters), extract the mesh geometry from the loaded template and render via `THREE.InstancedMesh` (calling `instancedMesh.computeBoundingSphere()`).
4. **Safe Cleanup on Room Exit**:
   ```ts
   // Disposes per-instance clones while preserving shared cached templates!
   disposeObject3DResources(roomGroup);
   ```

---

## 6. Optimising Polygon Counts, Textures & Colliders

1. **Choose 1k / Low-Poly Variants**: When downloading from Poly Haven, select the **1k** texture resolution `.glb` download rather than `4k` or `8k`.
2. **Color Space & Anisotropy**: `configureGLTFObjectHierarchy` automatically sets `SRGBColorSpace` on `map` and `emissiveMap` while keeping `normalMap`, `roughnessMap`, and `metalnessMap` in linear space.
3. **Collider Agreement**: Whenever an architectural or furniture model has `spatialSpec.colliderSyncRequired: true`, pass `normalizeToBoundingBox: [width, height, depth]` and `alignBottomToZero: true` so the visual mesh matches the analytical OBB/circle collider in `src/utils/atriumCollision.ts` or `src/utils/roomExhibition3D.ts`.

---

## 7. Coordinated 3D Animations with GSAP (`src/utils/gsapMuseumAnimations.ts`)

- **UI Animations**: Continue using `motion` (`motion/react`) for React DOM modals, HUD drawers, and buttons.
- **3D Timelines & Camera Choreography**: Use `gsap` and `@gsap/react` (`useGSAP`) via the helpers in `src/utils/gsapMuseumAnimations.ts` for:
  - Smooth 3D artifact inspection/turntable rotations
  - Coordinated object entrance reveals (scale + elevation + emissive warm-up)
  - Multi-stage cinematic camera transitions (with reduced-motion support and clean `kill()` on user movement input or component unmount)
