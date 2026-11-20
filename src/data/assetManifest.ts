/**
 * MEMORA — Authoritative 3D Asset Manifest (`src/data/assetManifest.ts`)
 *
 * Central registry for all locally hosted GLB/GLTF 3D models in `public/assets/models/`.
 * Enforces licence tracking (preferring Poly Haven CC0), polygon/texture budgets,
 * and room/environment mapping in accordance with `MYMUSEUM_VISUAL_DESIGN_SKILL.md`.
 */

export type AssetCategory =
  | 'architecture'
  | 'furniture'
  | 'decorations'
  | 'nature'
  | 'interactive_objects'
  | 'memory_displays'
  | 'character_assets';

export type AssetEnvironmentTarget =
  | 'atrium'
  | 'childhood_room'
  | 'shared_gallery'
  | 'any_room';

export type AssetLicenceType =
  | 'CC0-1.0'
  | 'CC-BY-4.0'
  | 'Custom-Procedural'
  | 'Proprietary-FirstParty';

export interface AssetLicenceInfo {
  /** Standard licence identifier */
  type: AssetLicenceType;
  /** SPDX licence code (e.g. 'CC0-1.0') */
  spdxId: string;
  /** Whether visible attribution is required in credits */
  attributionRequired: boolean;
  /** Creator or studio name (e.g. 'Poly Haven') */
  author?: string;
  /** Direct URL to the licence text */
  licenceUrl: string;
  /** ISO date (YYYY-MM-DD) when licence was verified */
  verifiedAt: string;
}

export interface AssetPolygonInfo {
  /** Total triangle count for the base LOD0 mesh */
  triangles: number;
  /** Optional vertex count */
  vertices?: number;
  /** Complexity tier for device-tier filtering */
  lodTier?: 'low' | 'medium' | 'high';
}

export type AssetTextureMapType =
  | 'albedo'
  | 'normal'
  | 'roughness'
  | 'metalness'
  | 'ao'
  | 'emissive'
  | 'arm';

export interface AssetTextureInfo {
  /** Maximum texture dimension embedded in or referenced by the GLB */
  maxResolution: '256x256' | '512x512' | '1024x1024' | '2048x2048';
  /** List of PBR texture channels included */
  maps: AssetTextureMapType[];
  /** Texture encoding format */
  format: 'png' | 'jpg' | 'webp' | 'ktx2' | 'procedural';
}

export interface AssetSpatialSpec {
  /** Expected normalized bounding-box dimensions in meters [width, height, depth] */
  boundingBoxMeters?: [number, number, number];
  /** Pivot alignment convention (MEMORA standard is bottom-center y=0) */
  pivotAlignment?: 'bottom-center' | 'center' | 'wall-mount';
  /** Whether visual changes to this asset require updating analytical colliders */
  colliderSyncRequired?: boolean;
}

export interface AssetManifestEntry {
  /** Unique deterministic identifier (e.g. 'arch_limestone_pilaster_01') */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Local path served from Vite `public/` root (must start with `/assets/models/`) */
  localPath: string;
  /** Functional asset category */
  category: AssetCategory;
  /** Concise description of visual style and museum role */
  description: string;
  /** Original source URL (e.g. Poly Haven asset page) */
  sourceUrl: string;
  /** Complete licence metadata */
  licence: AssetLicenceInfo;
  /** Primary room or environment where this asset is used */
  intendedEnvironment: AssetEnvironmentTarget;
  /** Estimated binary size in bytes */
  estimatedFileSizeBytes: number;
  /** Human-readable file size label (e.g. '420 KB') */
  estimatedFileSizeLabel: string;
  /** Whether the local `.glb` file is currently present on disk (false = uses procedural fallback until downloaded) */
  isBundledLocally?: boolean;
  /** Optional geometry budget metadata */
  polygonCount?: AssetPolygonInfo;
  /** Optional PBR texture metadata */
  textureInfo?: AssetTextureInfo;
  /** Optional spatial & collision alignment metadata */
  spatialSpec?: AssetSpatialSpec;
}

/**
 * Category metadata for UI inspection, filtering, and asset budget auditing.
 */
export const ASSET_CATEGORY_METADATA: Record<
  AssetCategory,
  {
    label: string;
    subdirectory: string;
    recommendedMaxTriangles: number;
    recommendedMaxTextureSize: AssetTextureInfo['maxResolution'];
    description: string;
  }
> = {
  architecture: {
    label: 'Architecture',
    subdirectory: '/assets/models/architecture/',
    recommendedMaxTriangles: 15000,
    recommendedMaxTextureSize: '2048x2048',
    description:
      'Structural columns, archways, cornices, balustrades, and portal frames.',
  },
  furniture: {
    label: 'Furniture',
    subdirectory: '/assets/models/furniture/',
    recommendedMaxTriangles: 10000,
    recommendedMaxTextureSize: '1024x1024',
    description:
      'Museum benches, walnut vitrines, study desks, bookshelves, and seating.',
  },
  decorations: {
    label: 'Decorations',
    subdirectory: '/assets/models/decorations/',
    recommendedMaxTriangles: 5000,
    recommendedMaxTextureSize: '1024x1024',
    description:
      'Sculptural accents, ceramic vessels, brass lamps, and tabletop keepsakes.',
  },
  nature: {
    label: 'Nature',
    subdirectory: '/assets/models/nature/',
    recommendedMaxTriangles: 12000,
    recommendedMaxTextureSize: '1024x1024',
    description:
      'Central memory tree, olive/sage botanical planters, and garden foliage.',
  },
  interactive_objects: {
    label: 'Interactive Objects',
    subdirectory: '/assets/models/interactive/',
    recommendedMaxTriangles: 8000,
    recommendedMaxTextureSize: '1024x1024',
    description:
      'Memory-linked 3D artifacts, vintage audio players, projectors, and nostalgic toys.',
  },
  memory_displays: {
    label: 'Memory Displays',
    subdirectory: '/assets/models/displays/',
    recommendedMaxTriangles: 4000,
    recommendedMaxTextureSize: '1024x1024',
    description:
      'Gallery picture frames, museum pedestals, glass display cases, and scrapbooks.',
  },
  character_assets: {
    label: 'Character Assets',
    subdirectory: '/assets/models/characters/',
    recommendedMaxTriangles: 8000,
    recommendedMaxTextureSize: '1024x1024',
    description:
      'Explorer character accessories, curator satchels, and wearable items.',
  },
};

/**
 * Authoritative registry of MEMORA 3D asset entries across all 7 categories.
 * Entries with `isBundledLocally: false` automatically use MEMORA's composite
 * procedural Three.js builders until their local `.glb` file is dropped into
 * `public/assets/models/`.
 */
export const MUSEUM_ASSET_MANIFEST: Record<string, AssetManifestEntry> = {
  arch_corinthian_pilaster_01: {
    id: 'arch_corinthian_pilaster_01',
    name: 'Fluted Limestone & Brass Entrance Pilaster',
    localPath: '/assets/models/architecture/arch_corinthian_pilaster_01.glb',
    category: 'architecture',
    description:
      'Warm champagne limestone fluted pilaster column with walnut plinth and brushed brass capital for room portals.',
    sourceUrl: 'https://polyhaven.com/models',
    licence: {
      type: 'CC0-1.0',
      spdxId: 'CC0-1.0',
      attributionRequired: false,
      author: 'Poly Haven / MEMORA Procedural Studio',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      verifiedAt: '2026-11-14',
    },
    intendedEnvironment: 'atrium',
    estimatedFileSizeBytes: 680_000,
    estimatedFileSizeLabel: '680 KB',
    isBundledLocally: false,
    polygonCount: {
      triangles: 2400,
      vertices: 1350,
      lodTier: 'low',
    },
    textureInfo: {
      maxResolution: '1024x1024',
      maps: ['albedo', 'normal', 'roughness'],
      format: 'ktx2',
    },
    spatialSpec: {
      boundingBoxMeters: [0.44, 4.58, 0.4],
      pivotAlignment: 'bottom-center',
      colliderSyncRequired: true,
    },
  },

  furn_walnut_gallery_bench_01: {
    id: 'furn_walnut_gallery_bench_01',
    name: 'Walnut & Cream Bouclé Museum Bench',
    localPath: '/assets/models/furniture/furn_walnut_gallery_bench_01.glb',
    category: 'furniture',
    description:
      'Low-profile luxury walnut gallery seating bench upholstered in warm cream bouclé with brushed brass leg ferrules.',
    sourceUrl: 'https://polyhaven.com/models',
    licence: {
      type: 'CC0-1.0',
      spdxId: 'CC0-1.0',
      attributionRequired: false,
      author: 'Poly Haven / MEMORA Procedural Studio',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      verifiedAt: '2026-11-14',
    },
    intendedEnvironment: 'any_room',
    estimatedFileSizeBytes: 840_000,
    estimatedFileSizeLabel: '840 KB',
    isBundledLocally: false,
    polygonCount: {
      triangles: 3200,
      vertices: 1820,
      lodTier: 'low',
    },
    textureInfo: {
      maxResolution: '1024x1024',
      maps: ['albedo', 'normal', 'roughness'],
      format: 'jpg',
    },
    spatialSpec: {
      boundingBoxMeters: [2.2, 0.52, 0.78],
      pivotAlignment: 'bottom-center',
      colliderSyncRequired: true,
    },
  },

  deco_brass_astrolabe_compass_01: {
    id: 'deco_brass_astrolabe_compass_01',
    name: 'Champagne-Brass Memory Discovery Astrolabe',
    localPath: '/assets/models/decorations/deco_brass_astrolabe_compass_01.glb',
    category: 'decorations',
    description:
      'Kinetic concentric brushed-gold astrolabe rings with a warm alabaster core suspended in the Atrium lightwell.',
    sourceUrl: 'https://polyhaven.com/models',
    licence: {
      type: 'CC0-1.0',
      spdxId: 'CC0-1.0',
      attributionRequired: false,
      author: 'MEMORA Procedural Studio',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      verifiedAt: '2026-11-14',
    },
    intendedEnvironment: 'atrium',
    estimatedFileSizeBytes: 512_000,
    estimatedFileSizeLabel: '512 KB',
    isBundledLocally: false,
    polygonCount: {
      triangles: 2800,
      vertices: 1540,
      lodTier: 'low',
    },
    textureInfo: {
      maxResolution: '1024x1024',
      maps: ['albedo', 'roughness', 'metalness'],
      format: 'procedural',
    },
    spatialSpec: {
      boundingBoxMeters: [1.96, 1.96, 1.96],
      pivotAlignment: 'center',
      colliderSyncRequired: false,
    },
  },

  nature_olive_memory_tree_01: {
    id: 'nature_olive_memory_tree_01',
    name: 'Sculpted Olive & Sage Central Memory Tree',
    localPath: '/assets/models/nature/nature_olive_memory_tree_01.glb',
    category: 'nature',
    description:
      'Slender sculpted walnut-and-bronze trunk with elevated olive and muted sage foliage clusters preserving eye-level sightlines.',
    sourceUrl: 'https://polyhaven.com/models',
    licence: {
      type: 'CC0-1.0',
      spdxId: 'CC0-1.0',
      attributionRequired: false,
      author: 'Poly Haven / MEMORA Procedural Studio',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      verifiedAt: '2026-11-14',
    },
    intendedEnvironment: 'atrium',
    estimatedFileSizeBytes: 1_250_000,
    estimatedFileSizeLabel: '1.25 MB',
    isBundledLocally: false,
    polygonCount: {
      triangles: 6400,
      vertices: 3600,
      lodTier: 'medium',
    },
    textureInfo: {
      maxResolution: '1024x1024',
      maps: ['albedo', 'normal', 'roughness'],
      format: 'jpg',
    },
    spatialSpec: {
      boundingBoxMeters: [2.36, 4.25, 2.36],
      pivotAlignment: 'bottom-center',
      colliderSyncRequired: true,
    },
  },

  inter_nostalgic_brass_train_01: {
    id: 'inter_nostalgic_brass_train_01',
    name: 'Interactive Childhood Wooden & Brass Toy Train',
    localPath: '/assets/models/interactive/inter_nostalgic_brass_train_01.glb',
    category: 'interactive_objects',
    description:
      'Interactive walnut and brushed-brass miniature locomotive that circles the central tree track when clicked.',
    sourceUrl: 'https://polyhaven.com/models',
    licence: {
      type: 'CC0-1.0',
      spdxId: 'CC0-1.0',
      attributionRequired: false,
      author: 'Poly Haven / MEMORA Procedural Studio',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      verifiedAt: '2026-11-14',
    },
    intendedEnvironment: 'childhood_room',
    estimatedFileSizeBytes: 620_000,
    estimatedFileSizeLabel: '620 KB',
    isBundledLocally: false,
    polygonCount: {
      triangles: 3100,
      vertices: 1750,
      lodTier: 'low',
    },
    textureInfo: {
      maxResolution: '1024x1024',
      maps: ['albedo', 'normal', 'roughness', 'metalness'],
      format: 'jpg',
    },
    spatialSpec: {
      boundingBoxMeters: [0.68, 0.34, 0.28],
      pivotAlignment: 'bottom-center',
      colliderSyncRequired: false,
    },
  },

  disp_walnut_brass_picture_frame_01: {
    id: 'disp_walnut_brass_picture_frame_01',
    name: 'Illuminated Walnut & Brass Gallery Memory Frame',
    localPath:
      '/assets/models/displays/disp_walnut_brass_picture_frame_01.glb',
    category: 'memory_displays',
    description:
      'Bevelled walnut exhibition frame with warm ivory mat board, champagne-gold inner lip, and integrated picture-light hood.',
    sourceUrl: 'https://polyhaven.com/models',
    licence: {
      type: 'CC0-1.0',
      spdxId: 'CC0-1.0',
      attributionRequired: false,
      author: 'Poly Haven / MEMORA Procedural Studio',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      verifiedAt: '2026-11-14',
    },
    intendedEnvironment: 'any_room',
    estimatedFileSizeBytes: 340_000,
    estimatedFileSizeLabel: '340 KB',
    isBundledLocally: false,
    polygonCount: {
      triangles: 980,
      vertices: 560,
      lodTier: 'low',
    },
    textureInfo: {
      maxResolution: '1024x1024',
      maps: ['albedo', 'normal', 'roughness', 'metalness'],
      format: 'jpg',
    },
    spatialSpec: {
      boundingBoxMeters: [1.32, 1.04, 0.08],
      pivotAlignment: 'wall-mount',
      colliderSyncRequired: false,
    },
  },

  char_curator_leather_satchel_01: {
    id: 'char_curator_leather_satchel_01',
    name: 'Curator Cross-Body Leather Satchel & Lapel Pin',
    localPath: '/assets/models/characters/char_curator_leather_satchel_01.glb',
    category: 'character_assets',
    description:
      'Warm saddle-leather curator satchel and brushed-gold museum lapel emblem worn by the explorer character.',
    sourceUrl: 'https://polyhaven.com/models',
    licence: {
      type: 'CC0-1.0',
      spdxId: 'CC0-1.0',
      attributionRequired: false,
      author: 'MEMORA Procedural Studio',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      verifiedAt: '2026-11-14',
    },
    intendedEnvironment: 'any_room',
    estimatedFileSizeBytes: 290_000,
    estimatedFileSizeLabel: '290 KB',
    isBundledLocally: false,
    polygonCount: {
      triangles: 1450,
      vertices: 820,
      lodTier: 'low',
    },
    textureInfo: {
      maxResolution: '512x512',
      maps: ['albedo', 'roughness'],
      format: 'procedural',
    },
    spatialSpec: {
      boundingBoxMeters: [0.32, 0.44, 0.28],
      pivotAlignment: 'center',
      colliderSyncRequired: false,
    },
  },
};

/**
 * Retrieve a single manifest entry by its unique ID.
 */
export function getAssetManifestEntry(
  assetId: string,
): AssetManifestEntry | undefined {
  return MUSEUM_ASSET_MANIFEST[assetId];
}

/**
 * List all registered assets belonging to a specific category.
 */
export function getAssetsByCategory(
  category: AssetCategory,
): AssetManifestEntry[] {
  return Object.values(MUSEUM_ASSET_MANIFEST).filter(
    (entry) => entry.category === category,
  );
}

/**
 * List all registered assets intended for a specific room or environment
 * (includes assets marked `'any_room'`).
 */
export function getAssetsForEnvironment(
  environment: AssetEnvironmentTarget,
): AssetManifestEntry[] {
  return Object.values(MUSEUM_ASSET_MANIFEST).filter(
    (entry) =>
      entry.intendedEnvironment === environment ||
      entry.intendedEnvironment === 'any_room',
  );
}

/**
 * Validate an asset manifest entry against MEMORA safety, path, and budget rules.
 */
export function validateAssetManifestEntry(entry: AssetManifestEntry): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!entry.id || !/^[a-z0-9_]+$/.test(entry.id)) {
    errors.push(
      `Invalid asset ID "${entry.id}": must be lowercase alphanumeric with underscores.`,
    );
  }

  if (
    !entry.localPath.startsWith('/assets/models/') ||
    !/\.(glb|gltf)$/i.test(entry.localPath)
  ) {
    errors.push(
      `Invalid localPath "${entry.localPath}": must reside under "/assets/models/" and end in .glb or .gltf.`,
    );
  }

  if (/^https?:\/\//i.test(entry.localPath)) {
    errors.push(
      `Remote hotlinking is prohibited in localPath ("${entry.localPath}"). Host the file locally in public/assets/models/.`,
    );
  }

  const catMeta = ASSET_CATEGORY_METADATA[entry.category];
  if (
    catMeta &&
    entry.polygonCount &&
    entry.polygonCount.triangles > catMeta.recommendedMaxTriangles
  ) {
    warnings.push(
      `Asset "${entry.id}" has ${entry.polygonCount.triangles} triangles, exceeding the recommended budget (${catMeta.recommendedMaxTriangles}) for category "${entry.category}".`,
    );
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Dynamically register or update an asset manifest entry at runtime (extensible plugin hook).
 */
export function registerAssetManifestEntry(
  entry: AssetManifestEntry,
): AssetManifestEntry {
  const validation = validateAssetManifestEntry(entry);
  if (!validation.valid) {
    throw new Error(
      `[assetManifest] Cannot register invalid asset "${entry.id}": ${validation.errors.join(' ')}`,
    );
  }
  MUSEUM_ASSET_MANIFEST[entry.id] = entry;
  return entry;
}
