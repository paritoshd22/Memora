/**
 * MEMORA — Reusable GLB/GLTF Asset Loader & GPU Resource Manager
 * (`src/utils/gltfAssetLoader.ts`)
 *
 * Built on top of Three.js's native `GLTFLoader` (`three/addons/loaders/GLTFLoader.js`).
 * Features:
 * - In-memory template caching (`Map<string, CachedGLTFTemplate>`) to prevent redundant network/parse overhead.
 * - Safe scene cloning (`cloneGLTFScene`) that shares underlying `BufferGeometry` and `Texture` buffers across rooms.
 * - Progress callbacks, timeout protection, and structured error handling.
 * - Graceful procedural fallback when a local `.glb` file is not yet bundled on disk (zero 404 crashes).
 * - Deterministic GPU memory disposal (`disposeObject3DResources`) with cache-aware reference protection.
 */

import * as THREE from 'three';
import {
  GLTFLoader,
  type GLTF,
} from 'three/addons/loaders/GLTFLoader.js';
import {
  getAssetManifestEntry,
  type AssetManifestEntry,
} from '../data/assetManifest';

export interface GLTFLoadProgress {
  assetIdOrPath: string;
  loadedBytes: number;
  totalBytes: number;
  percent: number | null;
}

export interface GLTFCloneOptions {
  /** Clone materials so per-instance color/emissive/opacity tweaks do not mutate cached templates (default: false) */
  cloneMaterials?: boolean;
  /** Enable shadow casting on all child meshes (default: true) */
  castShadow?: boolean;
  /** Enable shadow receiving on all child meshes (default: true) */
  receiveShadow?: boolean;
  /** Target anisotropic filtering level for textures (default: 4) */
  maxAnisotropy?: number;
  /** Environment map intensity multiplier for PBR materials (default: 0.85) */
  envMapIntensity?: number;
  /** Optional target bounding-box normalization in meters [width, height, depth] */
  normalizeToBoundingBox?: [number, number, number];
  /** Align bottom of bounding box to y = 0 (default: false) */
  alignBottomToZero?: boolean;
}

export interface GLTFLoadOptions extends GLTFCloneOptions {
  /** Progress callback invoked during network transfer */
  onProgress?: (progress: GLTFLoadProgress) => void;
  /** Optional procedural fallback builder invoked if the GLB file is missing or fails to load */
  fallbackFactory?: () => THREE.Object3D;
  /** Bypass or populate the shared template cache (default: true) */
  useCache?: boolean;
}

export interface GLTFLoadResult {
  /** Ready-to-mount Three.js Object3D (either a cloned GLTF scene or the procedural fallback) */
  scene: THREE.Object3D;
  /** Animations included in the GLB file, if any */
  animations: THREE.AnimationClip[];
  /** Resolution status */
  status: 'loaded' | 'cached' | 'fallback' | 'error';
  /** Associated manifest metadata if loaded by manifest ID */
  manifestEntry?: AssetManifestEntry;
  /** Non-fatal error details if fallback was triggered */
  error?: Error;
}

interface CachedGLTFTemplate {
  path: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  loadedAt: number;
}

const MAX_CACHED_TEMPLATES = 48;
const templateCache = new Map<string, CachedGLTFTemplate>();
const inFlightRequests = new Map<string, Promise<GLTF>>();

let sharedGLTFLoader: GLTFLoader | null = null;

/**
 * Returns the singleton Three.js `GLTFLoader` instance.
 */
export function getSharedGLTFLoader(): GLTFLoader {
  if (!sharedGLTFLoader) {
    sharedGLTFLoader = new GLTFLoader();
  }
  return sharedGLTFLoader;
}

const STANDARD_PBR_TEXTURE_SLOTS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
] as const;

/**
 * Configures color spaces, anisotropy, and shadow properties on a loaded or cloned GLTF hierarchy.
 */
export function configureGLTFObjectHierarchy(
  root: THREE.Object3D,
  options: GLTFCloneOptions = {},
): void {
  const {
    castShadow = true,
    receiveShadow = true,
    maxAnisotropy = 4,
    envMapIntensity = 0.85,
    normalizeToBoundingBox,
    alignBottomToZero = false,
  } = options;

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];

    materials.forEach((mat) => {
      const stdMat = mat as THREE.MeshStandardMaterial;
      if (typeof stdMat.envMapIntensity === 'number') {
        stdMat.envMapIntensity = envMapIntensity;
      }

      // Ensure color/emissive maps use SRGBColorSpace and data maps remain linear
      if (stdMat.map) {
        stdMat.map.colorSpace = THREE.SRGBColorSpace;
        stdMat.map.anisotropy = maxAnisotropy;
      }
      if (stdMat.emissiveMap) {
        stdMat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        stdMat.emissiveMap.anisotropy = maxAnisotropy;
      }
      if (stdMat.normalMap) {
        stdMat.normalMap.anisotropy = maxAnisotropy;
      }
      if (stdMat.roughnessMap) {
        stdMat.roughnessMap.anisotropy = maxAnisotropy;
      }
    });
  });

  if (normalizeToBoundingBox || alignBottomToZero) {
    const box = new THREE.Box3().setFromObject(root);
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      if (
        normalizeToBoundingBox &&
        size.x > 0.0001 &&
        size.y > 0.0001 &&
        size.z > 0.0001
      ) {
        const [targetW, targetH, targetD] = normalizeToBoundingBox;
        const scaleFactor = Math.min(
          targetW / size.x,
          targetH / size.y,
          targetD / size.z,
        );
        root.scale.multiplyScalar(scaleFactor);
        box.setFromObject(root);
        box.getCenter(center);
      }

      if (alignBottomToZero) {
        root.position.set(
          root.position.x - center.x,
          root.position.y - box.min.y,
          root.position.z - center.z,
        );
      }
    }
  }
}

/**
 * Clones a cached GLTF template scene for safe reuse across multiple rooms or instances.
 * Geometries and Textures remain shared in GPU memory and are marked with `userData.__sharedGLTFTemplate = true`
 * so instance disposal does not destroy shared template buffers.
 */
export function cloneGLTFScene(
  templateScene: THREE.Object3D,
  options: GLTFCloneOptions = {},
): THREE.Object3D {
  const clonedRoot = templateScene.clone(true);

  clonedRoot.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    if (mesh.geometry) {
      mesh.geometry.userData.__sharedGLTFTemplate = true;
    }

    if (options.cloneMaterials && mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => {
          const clonedMat = m.clone();
          clonedMat.userData.__sharedGLTFTemplate = false;
          return clonedMat;
        });
      } else {
        const clonedMat = mesh.material.clone();
        clonedMat.userData.__sharedGLTFTemplate = false;
        mesh.material = clonedMat;
      }
    } else if (mesh.material) {
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      mats.forEach((m) => {
        m.userData.__sharedGLTFTemplate = true;
      });
    }
  });

  configureGLTFObjectHierarchy(clonedRoot, options);
  return clonedRoot;
}

/**
 * Evicts the oldest template from the cache if `MAX_CACHED_TEMPLATES` is exceeded.
 */
function enforceCacheLimit(): void {
  if (templateCache.size <= MAX_CACHED_TEMPLATES) return;
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  templateCache.forEach((entry, key) => {
    if (entry.loadedAt < oldestTime) {
      oldestTime = entry.loadedAt;
      oldestKey = key;
    }
  });

  if (oldestKey) {
    disposeSingleCachedAsset(oldestKey);
  }
}

/**
 * Loads a local `.glb` / `.gltf` file by path with template caching, progress reporting,
 * and automatic fallback if the file is missing.
 */
export async function loadMuseumGLTFModel(
  localPath: string,
  options: GLTFLoadOptions = {},
): Promise<GLTFLoadResult> {
  const { onProgress, fallbackFactory, useCache = true } = options;

  if (!localPath.startsWith('/') || /^https?:\/\//i.test(localPath)) {
    const err = new Error(
      `[gltfAssetLoader] Rejected non-local path "${localPath}". Models must be served locally from /assets/models/.`,
    );
    if (fallbackFactory) {
      return {
        scene: fallbackFactory(),
        animations: [],
        status: 'fallback',
        error: err,
      };
    }
    const emptyGroup = new THREE.Group();
    emptyGroup.name = `missing_asset_${localPath}`;
    return {
      scene: emptyGroup,
      animations: [],
      status: 'error',
      error: err,
    };
  }

  // 1. Return cloned instance immediately if cached
  if (useCache && templateCache.has(localPath)) {
    const cached = templateCache.get(localPath)!;
    cached.loadedAt = Date.now();
    onProgress?.({
      assetIdOrPath: localPath,
      loadedBytes: 1,
      totalBytes: 1,
      percent: 100,
    });
    return {
      scene: cloneGLTFScene(cached.scene, options),
      animations: cached.animations,
      status: 'cached',
    };
  }

  try {
    let loadPromise = inFlightRequests.get(localPath);
    if (!loadPromise) {
      const loader = getSharedGLTFLoader();
      loadPromise = new Promise<GLTF>((resolve, reject) => {
        loader.load(
          localPath,
          (gltf) => resolve(gltf),
          (event) => {
            if (onProgress) {
              const total = event.total || 0;
              const loaded = event.loaded || 0;
              onProgress({
                assetIdOrPath: localPath,
                loadedBytes: loaded,
                totalBytes: total,
                percent:
                  total > 0
                    ? Math.min(100, Math.round((loaded / total) * 100))
                    : null,
              });
            }
          },
          (err) =>
            reject(
              err instanceof Error
                ? err
                : new Error(`Failed to load GLTF at "${localPath}"`),
            ),
        );
      });
      inFlightRequests.set(localPath, loadPromise);
    }

    const gltf = await loadPromise;
    inFlightRequests.delete(localPath);

    // Mark template geometries, materials, and textures as shared cache resources
    gltf.scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.geometry) {
        mesh.geometry.userData.__sharedGLTFTemplate = true;
      }
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : [];
      mats.forEach((mat) => {
        mat.userData.__sharedGLTFTemplate = true;
        const record = mat as unknown as Record<string, unknown>;
        STANDARD_PBR_TEXTURE_SLOTS.forEach((slot) => {
          const tex = record[slot] as THREE.Texture | undefined;
          if (tex && tex.isTexture) {
            tex.userData.__sharedGLTFTemplate = true;
          }
        });
      });
    });

    if (useCache) {
      templateCache.set(localPath, {
        path: localPath,
        scene: gltf.scene,
        animations: gltf.animations || [],
        loadedAt: Date.now(),
      });
      enforceCacheLimit();
    }

    return {
      scene: cloneGLTFScene(gltf.scene, options),
      animations: gltf.animations || [],
      status: 'loaded',
    };
  } catch (rawError) {
    inFlightRequests.delete(localPath);
    const error =
      rawError instanceof Error ? rawError : new Error(String(rawError));

    if (fallbackFactory) {
      const fallbackObj = fallbackFactory();
      configureGLTFObjectHierarchy(fallbackObj, options);
      return {
        scene: fallbackObj,
        animations: [],
        status: 'fallback',
        error,
      };
    }

    const placeholder = new THREE.Group();
    placeholder.name = `fallback_empty_${localPath}`;
    return {
      scene: placeholder,
      animations: [],
      status: 'error',
      error,
    };
  }
}

/**
 * Loads a registered 3D asset by its manifest ID from `src/data/assetManifest.ts`.
 * If `entry.isBundledLocally === false`, immediately invokes `options.fallbackFactory`
 * without triggering a 404 network request!
 */
export async function loadMuseumAssetById(
  assetId: string,
  options: GLTFLoadOptions = {},
): Promise<GLTFLoadResult> {
  const entry = getAssetManifestEntry(assetId);
  if (!entry) {
    const err = new Error(
      `[gltfAssetLoader] Unknown asset manifest ID "${assetId}". Register it in src/data/assetManifest.ts first.`,
    );
    if (options.fallbackFactory) {
      const fallbackObj = options.fallbackFactory();
      configureGLTFObjectHierarchy(fallbackObj, options);
      return {
        scene: fallbackObj,
        animations: [],
        status: 'fallback',
        error: err,
      };
    }
    return {
      scene: new THREE.Group(),
      animations: [],
      status: 'error',
      error: err,
    };
  }

  // Avoid unnecessary 404 requests for manifest entries that are still using procedural fallbacks
  if (entry.isBundledLocally === false && options.fallbackFactory) {
    const fallbackObj = options.fallbackFactory();
    configureGLTFObjectHierarchy(fallbackObj, {
      normalizeToBoundingBox: entry.spatialSpec?.boundingBoxMeters,
      alignBottomToZero: entry.spatialSpec?.pivotAlignment === 'bottom-center',
      ...options,
    });
    return {
      scene: fallbackObj,
      animations: [],
      status: 'fallback',
      manifestEntry: entry,
    };
  }

  const result = await loadMuseumGLTFModel(entry.localPath, {
    normalizeToBoundingBox: entry.spatialSpec?.boundingBoxMeters,
    alignBottomToZero: entry.spatialSpec?.pivotAlignment === 'bottom-center',
    ...options,
  });

  return {
    ...result,
    manifestEntry: entry,
  };
}

/**
 * Safely disposes of an `Object3D` hierarchy's geometries, materials, textures, and `ImageBitmap` sources.
 * By default (`forceDisposeSharedTemplates = false`), any geometry/material/texture still owned by the
 * template cache (`userData.__sharedGLTFTemplate === true`) is preserved so other rooms can continue using it.
 */
export function disposeObject3DResources(
  root: THREE.Object3D | null | undefined,
  options: { forceDisposeSharedTemplates?: boolean } = {},
): void {
  if (!root) return;
  const { forceDisposeSharedTemplates = false } = options;

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    if (
      mesh.geometry &&
      (forceDisposeSharedTemplates ||
        !mesh.geometry.userData?.__sharedGLTFTemplate)
    ) {
      mesh.geometry.dispose();
    }

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];

    materials.forEach((mat) => {
      if (
        !forceDisposeSharedTemplates &&
        mat.userData?.__sharedGLTFTemplate
      ) {
        return;
      }

      const record = mat as unknown as Record<string, unknown>;
      STANDARD_PBR_TEXTURE_SLOTS.forEach((slot) => {
        const tex = record[slot] as THREE.Texture | undefined;
        if (
          tex &&
          tex.isTexture &&
          (forceDisposeSharedTemplates || !tex.userData?.__sharedGLTFTemplate)
        ) {
          const sourceData = tex.source?.data as
            | { close?: () => void }
            | undefined;
          if (sourceData && typeof sourceData.close === 'function') {
            sourceData.close();
          }
          tex.dispose();
        }
      });

      mat.dispose();
    });
  });
}

/**
 * Disposes and removes a single cached GLTF template by its `localPath`.
 */
export function disposeSingleCachedAsset(localPath: string): boolean {
  const cached = templateCache.get(localPath);
  if (!cached) return false;
  disposeObject3DResources(cached.scene, { forceDisposeSharedTemplates: true });
  templateCache.delete(localPath);
  return true;
}

/**
 * Clears the entire in-memory GLTF template cache and frees all GPU buffers.
 */
export function clearGLTFTemplateCache(): void {
  templateCache.forEach((entry) => {
    disposeObject3DResources(entry.scene, {
      forceDisposeSharedTemplates: true,
    });
  });
  templateCache.clear();
  inFlightRequests.clear();
}

/**
 * Returns current cache diagnostics for performance auditing.
 */
export function getGLTFCacheStats(): {
  cachedTemplateCount: number;
  inFlightCount: number;
  cachedPaths: string[];
} {
  return {
    cachedTemplateCount: templateCache.size,
    inFlightCount: inFlightRequests.size,
    cachedPaths: Array.from(templateCache.keys()),
  };
}
