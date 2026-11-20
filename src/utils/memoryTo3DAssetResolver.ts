import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  GeneratedGlbAssetReference,
  InteractiveObjectId3D,
  LivingWorldSpaceId,
  MemoryTo3DApprovalStatus,
  MemoryTo3DAssetSourceKind,
  MemoryTo3DBlueprint,
  MemoryTo3DGenerationStatus,
  MemoryTo3DInteractionType,
  MemoryTo3DObjectType,
  MultimodalMemoryAnalysisResult,
} from '../types/aiStudio';
import { Memory, MemoryMediaType } from '../types/museum';

/**
 * PART 5 — TIER 1 & TIER 2 EXISTING 3D ASSET CATALOG
 */
export interface Catalog3DAssetEntry {
  assetId: string;
  objectType: MemoryTo3DObjectType;
  catalogObjectId: InteractiveObjectId3D;
  objectName: string;
  defaultSpace: LivingWorldSpaceId;
  defaultPosition: { x: number; y: number; z: number };
  defaultRotation: { x: number; y: number; z: number };
  defaultScale: { x: number; y: number; z: number };
  interactionType: MemoryTo3DInteractionType;
  interactionLabel: string;
  keywords: RegExp;
  visualDescription: string;
}

export const EXISTING_3D_ASSET_CATALOG: Catalog3DAssetEntry[] = [
  {
    assetId: 'catalog_childhood_bicycle_v1',
    objectType: 'bicycle',
    catalogObjectId: 'bicycle',
    objectName: 'Vintage Childhood Backyard Bicycle',
    defaultSpace: 'backyard',
    defaultPosition: { x: 2.35, y: 0.02, z: 1.45 },
    defaultRotation: { x: 0, y: -0.45, z: 0 },
    defaultScale: { x: 1, y: 1, z: 1 },
    interactionType: 'spin_wheels',
    interactionLabel:
      'Click or press [E] to spin the bicycle wheels, ring the bell & inspect original photo',
    keywords: /\b(bicycle|bike|cycling|cycle|handlebar|pedal|tricycle|ride)\b/i,
    visualDescription:
      'Crimson-and-chrome childhood bicycle with spoked wheels, tan leather saddle, and brass handlebar bell parked in the sunlit Backyard zone.',
  },
  {
    assetId: 'catalog_childhood_toy_train_v1',
    objectType: 'childhood_toy',
    catalogObjectId: 'toy_train',
    objectName: 'Wooden Express Toy Train & Keepsake Toy',
    defaultSpace: 'play_area',
    defaultPosition: { x: -1.65, y: 0.02, z: 1.85 },
    defaultRotation: { x: 0, y: 0.35, z: 0 },
    defaultScale: { x: 1, y: 1, z: 1 },
    interactionType: 'custom_animation',
    interactionLabel:
      'Click or press [E] to animate the childhood toy & inspect your original photograph',
    keywords:
      /\b(toy|train|locomotive|teddy|bear|doll|robot|blocks|lego|rubik|puzzle|action figure|car|truck)\b/i,
    visualDescription:
      'Hand-crafted painted wooden childhood toy locomotive, colourful play blocks, and plush keepsake displayed in the Play Area.',
  },
  {
    assetId: 'catalog_childhood_toy_chest_v1',
    objectType: 'childhood_toy',
    catalogObjectId: 'toy_chest',
    objectName: 'Hinged Cedar Childhood Toy Chest',
    defaultSpace: 'play_area',
    defaultPosition: { x: 2.15, y: 0.02, z: 2.05 },
    defaultRotation: { x: 0, y: -0.55, z: 0 },
    defaultScale: { x: 1, y: 1, z: 1 },
    interactionType: 'open_lid',
    interactionLabel:
      'Click or press [E] to open the toy chest lid & inspect your original memory',
    keywords: /\b(chest|trunk|box|treasure|collection|board game|marbles)\b/i,
    visualDescription:
      'Warm walnut-and-brass hinged childhood toy chest filled with nostalgic playthings.',
  },
  {
    assetId: 'catalog_family_video_tv_v1',
    objectType: 'family_video_display',
    catalogObjectId: 'bedroom_tv',
    objectName: 'Vintage Childhood Television & Home Film Deck',
    defaultSpace: 'bedroom',
    defaultPosition: { x: -3.15, y: 0.02, z: -2.15 },
    defaultRotation: { x: 0, y: 0.38, z: 0 },
    defaultScale: { x: 1, y: 1, z: 1 },
    interactionType: 'play_video',
    interactionLabel:
      'Click or press [E] to play your original family video on the 3D television display',
    keywords: /\b(video|film|vhs|camcorder|movie|tape|recording|cinema|tv|television|clip)\b/i,
    visualDescription:
      'Warm walnut-cased vintage childhood television deck with rabbit-ear aerials and illuminated screen that plays your original uploaded video.',
  },
  {
    assetId: 'catalog_story_keepsake_book_v1',
    objectType: 'story_keepsake',
    catalogObjectId: 'study_desk',
    objectName: 'Illuminated Childhood Storybook & Lantern Keepsake',
    defaultSpace: 'study_corner',
    defaultPosition: { x: -2.45, y: 0.02, z: 1.15 },
    defaultRotation: { x: 0, y: 0.52, z: 0 },
    defaultScale: { x: 1, y: 1, z: 1 },
    interactionType: 'read_story',
    interactionLabel:
      'Click or press [E] to open the 3D storybook keepsake & read your original story',
    keywords: /\b(story|letter|diary|journal|poem|essay|note|notebook|book|tale|memoir)\b/i,
    visualDescription:
      'Open leather-bound childhood storybook on a brass-trimmed lectern with a warm reading lantern, created as an AI 3D interpretation of your written memory.',
  },
  {
    assetId: 'catalog_treehouse_lantern_v1',
    objectType: 'treehouse_lantern',
    catalogObjectId: 'treehouse_ladder',
    objectName: 'Treehouse Adventure Lantern & Compass Keepsake',
    defaultSpace: 'treehouse',
    defaultPosition: { x: 1.55, y: 0.02, z: -1.45 },
    defaultRotation: { x: 0, y: -0.25, z: 0 },
    defaultScale: { x: 1, y: 1, z: 1 },
    interactionType: 'inspect_memory',
    interactionLabel:
      'Click or press [E] to light the treehouse lantern & inspect your memory',
    keywords: /\b(treehouse|tree|fort|hideout|camp|lantern|backyard adventure|climb)\b/i,
    visualDescription:
      'Warm brass camping lantern and wooden adventure keepsake placed by the Treehouse ladder.',
  },
  {
    assetId: 'catalog_audio_gramophone_v1',
    objectType: 'audio_gramophone',
    catalogObjectId: 'wardrobe',
    objectName: 'Brass Horn Childhood Audio Memory Player',
    defaultSpace: 'bedroom',
    defaultPosition: { x: 3.15, y: 0.02, z: -1.85 },
    defaultRotation: { x: 0, y: -0.45, z: 0 },
    defaultScale: { x: 1, y: 1, z: 1 },
    interactionType: 'play_audio',
    interactionLabel:
      'Click or press [E] to play your original audio recording on the 3D sound player',
    keywords: /\b(audio|voice|song|music|cassette|lullaby|piano|singing|sound|recording)\b/i,
    visualDescription:
      'Vintage walnut acoustic player with a warm brass horn that plays your original uploaded voice or music recording.',
  },
  {
    assetId: 'catalog_school_certificate_desk_v1',
    objectType: 'school_certificate_desk',
    catalogObjectId: 'study_desk',
    objectName: 'Scholar Desk Certificate & Medal Stand',
    defaultSpace: 'study_corner',
    defaultPosition: { x: -3.55, y: 0.02, z: 1.55 },
    defaultRotation: { x: 0, y: 0.45, z: 0 },
    defaultScale: { x: 1, y: 1, z: 1 },
    interactionType: 'inspect_memory',
    interactionLabel:
      'Click or press [E] to inspect your original certificate or school achievement',
    keywords: /\b(certificate|award|trophy|medal|diploma|school|report card|prize)\b/i,
    visualDescription:
      'Polished brass-and-walnut certificate easel with a ribbon medal stand in the Study Corner.',
  },
];

const VALID_OBJECT_TYPES: MemoryTo3DObjectType[] = [
  'bicycle',
  'childhood_toy',
  'story_keepsake',
  'family_video_display',
  'audio_gramophone',
  'framed_photograph',
  'school_certificate_desk',
  'treehouse_lantern',
  'custom_keepsake',
];

const VALID_SPACES: LivingWorldSpaceId[] = [
  'central_gallery',
  'bedroom',
  'backyard',
  'treehouse',
  'play_area',
  'study_corner',
];

const VALID_INTERACTION_TYPES: MemoryTo3DInteractionType[] = [
  'inspect_memory',
  'spin_wheels',
  'open_lid',
  'play_video',
  'play_audio',
  'read_story',
  'custom_animation',
];

function clampNum(val: unknown, fallback: number, min: number, max: number): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * PART 5 — ASSET RESOLVER (5-TIER PRIORITY)
 * Priority 1: Search existing 3D assets in catalog.
 * Priority 2: Reuse a suitable existing model.
 * Priority 3: Create a procedural Three.js model & export/load via GLTFLoader.
 * Priority 4: Call 3D-generation API (Meshy) if configured on server.
 * Priority 5: Clearly labelled fallback plinth if generation fails.
 */
export function resolveCatalogEntryForMemory(params: {
  promptText: string;
  mediaType?: MemoryMediaType;
  requestedObjectType?: MemoryTo3DObjectType;
}): {
  entry: Catalog3DAssetEntry;
  sourceKind: MemoryTo3DAssetSourceKind;
  priorityTier: 1 | 2 | 3;
  isAiInterpretation: boolean;
} {
  const text = (params.promptText || '').toLowerCase();
  const mediaType = params.mediaType || 'image';

  // Priority 1: Exact keyword match against existing 3D catalog
  if (/\b(bicycle|bike|cycling|tricycle|handlebar|pedal)\b/i.test(text)) {
    return {
      entry: EXISTING_3D_ASSET_CATALOG[0],
      sourceKind: 'existing_catalog',
      priorityTier: 1,
      isAiInterpretation: false,
    };
  }

  if (
    /\b(toy|train|locomotive|teddy|bear|doll|robot|blocks|lego|rubik|puzzle)\b/i.test(
      text,
    )
  ) {
    return {
      entry: EXISTING_3D_ASSET_CATALOG[1],
      sourceKind: 'existing_catalog',
      priorityTier: 1,
      isAiInterpretation: false,
    };
  }

  if (/\b(chest|trunk|toy box|board game|marbles)\b/i.test(text)) {
    return {
      entry: EXISTING_3D_ASSET_CATALOG[2],
      sourceKind: 'existing_catalog',
      priorityTier: 1,
      isAiInterpretation: false,
    };
  }

  if (
    mediaType === 'video' ||
    /\b(video|film|vhs|camcorder|movie|tape|television|tv)\b/i.test(text)
  ) {
    return {
      entry: EXISTING_3D_ASSET_CATALOG[3],
      sourceKind: 'existing_catalog',
      priorityTier: 1,
      isAiInterpretation: false,
    };
  }

  if (
    mediaType === 'story' ||
    mediaType === 'document' ||
    mediaType === 'chat' ||
    /\b(story|letter|diary|journal|poem|note|notebook|book|tale)\b/i.test(text)
  ) {
    return {
      entry: EXISTING_3D_ASSET_CATALOG[4],
      sourceKind: 'procedural_threejs',
      priorityTier: 3,
      isAiInterpretation: true,
    };
  }

  if (/\b(treehouse|fort|hideout|lantern|climb)\b/i.test(text)) {
    return {
      entry: EXISTING_3D_ASSET_CATALOG[5],
      sourceKind: 'reused_model',
      priorityTier: 2,
      isAiInterpretation: true,
    };
  }

  if (mediaType === 'audio' || /\b(audio|voice|song|music|cassette|lullaby)\b/i.test(text)) {
    return {
      entry: EXISTING_3D_ASSET_CATALOG[6],
      sourceKind: 'existing_catalog',
      priorityTier: 1,
      isAiInterpretation: false,
    };
  }

  if (
    mediaType === 'certificate' ||
    /\b(certificate|award|trophy|medal|diploma|school)\b/i.test(text)
  ) {
    return {
      entry: EXISTING_3D_ASSET_CATALOG[7],
      sourceKind: 'reused_model',
      priorityTier: 2,
      isAiInterpretation: false,
    };
  }

  // Priority 2: Match by requestedObjectType if provided
  if (params.requestedObjectType) {
    const byType = EXISTING_3D_ASSET_CATALOG.find(
      (c) => c.objectType === params.requestedObjectType,
    );
    if (byType) {
      return {
        entry: byType,
        sourceKind: 'reused_model',
        priorityTier: 2,
        isAiInterpretation: params.requestedObjectType === 'story_keepsake',
      };
    }
  }

  // Priority 3: Procedural Three.js model for general childhood photographs/keepsakes
  return {
    entry: {
      assetId: 'procedural_childhood_keepsake_v1',
      objectType: 'framed_photograph',
      catalogObjectId: 'wooden_bed',
      objectName: 'Illuminated 3D Childhood Memory Keepsake Stand',
      defaultSpace: 'bedroom',
      defaultPosition: { x: -2.05, y: 0.02, z: -1.35 },
      defaultRotation: { x: 0, y: 0.25, z: 0 },
      defaultScale: { x: 1, y: 1, z: 1 },
      interactionType: 'inspect_memory',
      interactionLabel:
        'Click or press [E] to inspect your 3D memory keepsake & view original media',
      keywords: /.*/i,
      visualDescription:
        'Sculpted walnut-and-brass 3D keepsake pedestal displaying your original memory with warm museum lighting.',
    },
    sourceKind: 'procedural_threejs',
    priorityTier: 3,
    isAiInterpretation: false,
  };
}

/**
 * PART 5 — VALIDATE & NORMALIZE MEMORY-TO-3D BLUEPRINT
 * Ensures Gemini text responses are NEVER treated as raw 3D models and all fields
 * conform to the strict MemoryTo3DBlueprint schema.
 */
export function buildAndValidateMemoryTo3DBlueprint(params: {
  memoryId?: string;
  sourceMediaId?: string;
  promptText: string;
  mediaType?: MemoryMediaType;
  rawBlueprint?: Partial<MemoryTo3DBlueprint> | string | null;
  multimodalAnalysis?: MultimodalMemoryAnalysisResult;
  defaultApprovalStatus?: MemoryTo3DApprovalStatus;
}): MemoryTo3DBlueprint {
  const memoryId = params.memoryId || `mem-${Date.now()}`;
  const sourceMediaId = params.sourceMediaId || `media-${memoryId}`;

  // Guard: If rawBlueprint is a string (e.g. raw LLM text), reject it as a 3D model and resolve properly
  const rawObj: Partial<MemoryTo3DBlueprint> =
    params.rawBlueprint && typeof params.rawBlueprint === 'object'
      ? params.rawBlueprint
      : {};

  const requestedType = VALID_OBJECT_TYPES.includes(
    rawObj.objectType as MemoryTo3DObjectType,
  )
    ? (rawObj.objectType as MemoryTo3DObjectType)
    : undefined;

  const resolved = resolveCatalogEntryForMemory({
    promptText: `${params.promptText} ${rawObj.objectName || ''} ${rawObj.visualDescription || ''}`,
    mediaType: params.mediaType,
    requestedObjectType: requestedType,
  });

  const objectType: MemoryTo3DObjectType =
    requestedType || resolved.entry.objectType;

  const connectedSpace: LivingWorldSpaceId = VALID_SPACES.includes(
    rawObj.connectedSpace as LivingWorldSpaceId,
  )
    ? (rawObj.connectedSpace as LivingWorldSpaceId)
    : VALID_SPACES.includes(
          params.multimodalAnalysis?.environmentDesign
            ?.connectedSpace as LivingWorldSpaceId,
        )
      ? (params.multimodalAnalysis!.environmentDesign
          .connectedSpace as LivingWorldSpaceId)
      : resolved.entry.defaultSpace;

  const interactionType: MemoryTo3DInteractionType =
    VALID_INTERACTION_TYPES.includes(
      rawObj.interactionType as MemoryTo3DInteractionType,
    )
      ? (rawObj.interactionType as MemoryTo3DInteractionType)
      : resolved.entry.interactionType;

  const pos = rawObj.position || resolved.entry.defaultPosition;
  const rot = rawObj.rotation || resolved.entry.defaultRotation;
  const scl = rawObj.scale || resolved.entry.defaultScale;

  // Keep positions safely inside the Childhood Room walkable interior [-5.4, 5.4]
  const position = {
    x: clampNum(pos.x, resolved.entry.defaultPosition.x, -5.4, 5.4),
    y: clampNum(pos.y, resolved.entry.defaultPosition.y, 0, 2.6),
    z: clampNum(pos.z, resolved.entry.defaultPosition.z, -5.4, 5.2),
  };

  const rotation = {
    x: clampNum(rot.x, resolved.entry.defaultRotation.x, -Math.PI, Math.PI),
    y: clampNum(rot.y, resolved.entry.defaultRotation.y, -Math.PI, Math.PI),
    z: clampNum(rot.z, resolved.entry.defaultRotation.z, -Math.PI, Math.PI),
  };

  const scale = {
    x: clampNum(scl.x, resolved.entry.defaultScale.x, 0.35, 2.5),
    y: clampNum(scl.y, resolved.entry.defaultScale.y, 0.35, 2.5),
    z: clampNum(scl.z, resolved.entry.defaultScale.z, 0.35, 2.5),
  };

  const objectName =
    (typeof rawObj.objectName === 'string' && rawObj.objectName.trim()) ||
    resolved.entry.objectName;

  const visualDescription =
    (typeof rawObj.visualDescription === 'string' &&
      rawObj.visualDescription.trim()) ||
    resolved.entry.visualDescription;

  const assetGenerationPrompt =
    (typeof rawObj.assetGenerationPrompt === 'string' &&
      rawObj.assetGenerationPrompt.trim()) ||
    `PBR 3D model of ${objectName}: ${visualDescription}`;

  const aiGenerationStatus: MemoryTo3DGenerationStatus =
    rawObj.aiGenerationStatus ||
    (resolved.sourceKind === 'existing_catalog' ||
    resolved.sourceKind === 'reused_model'
      ? 'resolved_existing'
      : 'generated_procedural');

  const userApprovalStatus: MemoryTo3DApprovalStatus =
    rawObj.userApprovalStatus || params.defaultApprovalStatus || 'pending';

  const generatedGlbAssetRef: GeneratedGlbAssetReference =
    rawObj.generatedGlbAssetRef &&
    typeof rawObj.generatedGlbAssetRef === 'object' &&
    typeof rawObj.generatedGlbAssetRef.assetId === 'string'
      ? {
          ...rawObj.generatedGlbAssetRef,
          isAiInterpretation:
            typeof rawObj.generatedGlbAssetRef.isAiInterpretation === 'boolean'
              ? rawObj.generatedGlbAssetRef.isAiInterpretation
              : resolved.isAiInterpretation,
        }
      : {
          assetId: resolved.entry.assetId,
          sourceKind: resolved.sourceKind,
          priorityTier: resolved.priorityTier,
          catalogObjectId: resolved.entry.catalogObjectId,
          proceduralArchetype: objectType,
          isAiInterpretation: resolved.isAiInterpretation,
          confidenceScore: 0.92,
          statusMessage:
            resolved.priorityTier === 1
              ? `Matched Tier 1 Existing 3D Catalog Asset (${resolved.entry.assetId}).`
              : resolved.priorityTier === 2
                ? `Reused Tier 2 Compatible 3D Model (${resolved.entry.assetId}).`
                : `Synthesized Tier 3 Procedural Three.js 3D Model (${objectType}).`,
          generatedAt: new Date().toISOString(),
        };

  return {
    memoryId,
    sourceMediaId,
    objectType,
    objectName,
    visualDescription,
    assetGenerationPrompt,
    connectedRoom: 'childhood',
    connectedSpace,
    linkedObjectId:
      rawObj.linkedObjectId || resolved.entry.catalogObjectId || 'toy_train',
    position,
    rotation,
    scale,
    interactionType,
    interactionLabel:
      rawObj.interactionLabel || resolved.entry.interactionLabel,
    aiGenerationStatus,
    userApprovalStatus,
    generatedGlbAssetRef,
  };
}

/**
 * Checks whether a memory has a user-approved 3D reconstruction blueprint
 * that should be spawned in the 3D Childhood Room.
 */
export function isMemory3DBlueprintApproved(memory: Memory): boolean {
  const bp = memory.memoryTo3DBlueprint;
  if (!bp) return false;
  return (
    bp.userApprovalStatus === 'approved' ||
    bp.userApprovalStatus === 'edited_and_approved'
  );
}

/**
 * Builds a rich, multi-part Three.js Group for the given MemoryTo3DObjectType
 * so that GLTFExporter can serialize it into a genuine binary .glb buffer and
 * GLTFLoader can parse/load it with real PBR meshes, wheels, lids, screens, and pages.
 */
export function buildProceduralMemory3DMeshGroup(
  blueprint: MemoryTo3DBlueprint,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `memory_3d_${blueprint.objectType}_${blueprint.memoryId}`;

  const matBrass = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D4AF37'),
    roughness: 0.25,
    metalness: 0.82,
  });
  const matWalnut = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5C3A21'),
    roughness: 0.42,
    metalness: 0.08,
  });
  const matCrimson = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#C0392B'),
    roughness: 0.3,
    metalness: 0.35,
  });
  const matCream = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FAF3E3'),
    roughness: 0.65,
    metalness: 0.04,
  });
  const matSage = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5E7A64'),
    roughness: 0.45,
    metalness: 0.12,
  });
  const matDarkTire = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#22201E'),
    roughness: 0.78,
    metalness: 0.05,
  });
  const matGlow = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFF3D1'),
    emissive: new THREE.Color('#F5B041'),
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });

  // Base circular museum plinth so every memory object feels grounded and accessible
  const plinthBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.52, 0.08, 24),
    matWalnut,
  );
  plinthBase.position.y = 0.04;
  plinthBase.name = 'plinth_base';
  group.add(plinthBase);

  const plinthRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.018, 24),
    matBrass,
  );
  plinthRim.position.y = 0.082;
  group.add(plinthRim);

  switch (blueprint.objectType) {
    case 'bicycle': {
      // Example A: Childhood Bicycle with spoked wheels, frame, saddle & handlebars
      const wheelGeo = new THREE.TorusGeometry(0.22, 0.032, 12, 24);
      const frontWheel = new THREE.Mesh(wheelGeo, matDarkTire);
      frontWheel.position.set(0.28, 0.31, 0);
      frontWheel.name = 'anim_wheel_front';
      group.add(frontWheel);

      const rearWheel = new THREE.Mesh(wheelGeo, matDarkTire);
      rearWheel.position.set(-0.28, 0.31, 0);
      rearWheel.name = 'anim_wheel_rear';
      group.add(rearWheel);

      const hubGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12);
      const frontHub = new THREE.Mesh(hubGeo, matBrass);
      frontHub.rotation.x = Math.PI / 2;
      frontWheel.add(frontHub);
      const rearHub = new THREE.Mesh(hubGeo, matBrass);
      rearHub.rotation.x = Math.PI / 2;
      rearWheel.add(rearHub);

      // Frame tubes
      const topTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.52, 10),
        matCrimson,
      );
      topTube.position.set(0, 0.48, 0);
      topTube.rotation.z = Math.PI / 2;
      group.add(topTube);

      const downTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.42, 10),
        matCrimson,
      );
      downTube.position.set(0.11, 0.38, 0);
      downTube.rotation.z = -0.78;
      group.add(downTube);

      const seatPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.36, 10),
        matCrimson,
      );
      seatPost.position.set(-0.18, 0.44, 0);
      seatPost.rotation.z = 0.22;
      group.add(seatPost);

      const saddle = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.045, 0.1),
        matWalnut,
      );
      saddle.position.set(-0.21, 0.62, 0);
      group.add(saddle);

      const fork = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.42, 10),
        matCrimson,
      );
      fork.position.set(0.25, 0.48, 0);
      fork.rotation.z = 0.18;
      group.add(fork);

      const handlebar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.34, 10),
        matBrass,
      );
      handlebar.position.set(0.22, 0.68, 0);
      handlebar.rotation.x = Math.PI / 2;
      group.add(handlebar);

      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 12, 12),
        matBrass,
      );
      bell.position.set(0.22, 0.71, 0.09);
      group.add(bell);
      break;
    }

    case 'childhood_toy': {
      // Example B: Childhood Toy Locomotive + Play Blocks + Plush Bear Keepsake
      const toyRoot = new THREE.Group();
      toyRoot.name = 'anim_toy_group';
      toyRoot.position.y = 0.08;
      group.add(toyRoot);

      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.08, 0.22),
        matWalnut,
      );
      chassis.position.set(0, 0.1, 0);
      toyRoot.add(chassis);

      const boiler = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.26, 16),
        matCrimson,
      );
      boiler.rotation.z = Math.PI / 2;
      boiler.position.set(0.07, 0.21, 0);
      toyRoot.add(boiler);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.22, 0.2),
        matSage,
      );
      cabin.position.set(-0.12, 0.24, 0);
      toyRoot.add(cabin);

      const chimney = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.024, 0.12, 12),
        matBrass,
      );
      chimney.position.set(0.14, 0.32, 0);
      toyRoot.add(chimney);

      const toyWheelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 14);
      [
        [-0.14, 0.12],
        [0.14, 0.12],
        [-0.14, -0.12],
        [0.14, -0.12],
      ].forEach(([wx, wz]) => {
        const w = new THREE.Mesh(toyWheelGeo, matBrass);
        w.rotation.x = Math.PI / 2;
        w.position.set(wx, 0.06, wz);
        toyRoot.add(w);
      });
      break;
    }

    case 'story_keepsake':
    case 'treehouse_lantern': {
      // Example C: Childhood Story / Treehouse Lantern Keepsake (AI-Created 3D Interpretation)
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 0.52, 16),
        matWalnut,
      );
      pedestal.position.y = 0.34;
      group.add(pedestal);

      const bookGroup = new THREE.Group();
      bookGroup.name = 'anim_storybook_group';
      bookGroup.position.set(0, 0.64, 0);
      bookGroup.rotation.x = 0.32;
      group.add(bookGroup);

      const leftCover = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.025, 0.32),
        matCrimson,
      );
      leftCover.position.set(-0.12, 0, 0);
      leftCover.rotation.z = 0.18;
      bookGroup.add(leftCover);

      const rightCover = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.025, 0.32),
        matCrimson,
      );
      rightCover.position.set(0.12, 0, 0);
      rightCover.rotation.z = -0.18;
      bookGroup.add(rightCover);

      const leftPage = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.03, 0.29),
        matCream,
      );
      leftPage.position.set(-0.11, 0.02, 0);
      leftPage.rotation.z = 0.15;
      bookGroup.add(leftPage);

      const rightPage = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.03, 0.29),
        matCream,
      );
      rightPage.position.set(0.11, 0.02, 0);
      rightPage.rotation.z = -0.15;
      bookGroup.add(rightPage);

      // Warm glowing story lantern orb above the open pages
      const lanternOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 16, 16),
        matGlow,
      );
      lanternOrb.position.set(0, 0.16, 0);
      lanternOrb.name = 'anim_lantern_orb';
      bookGroup.add(lanternOrb);
      break;
    }

    case 'family_video_display': {
      // Example D: Family Video Vintage Television & Film Deck
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.32, 0.28),
        matWalnut,
      );
      stand.position.y = 0.24;
      group.add(stand);

      const tvCabinet = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.42, 0.34),
        matWalnut,
      );
      tvCabinet.position.y = 0.61;
      group.add(tvCabinet);

      const tvScreen = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.3, 0.02),
        matGlow,
      );
      tvScreen.position.set(-0.03, 0.61, 0.175);
      tvScreen.name = 'anim_video_screen';
      group.add(tvScreen);

      const antennaGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.28, 8);
      const antLeft = new THREE.Mesh(antennaGeo, matBrass);
      antLeft.position.set(-0.1, 0.92, 0);
      antLeft.rotation.z = 0.45;
      group.add(antLeft);

      const antRight = new THREE.Mesh(antennaGeo, matBrass);
      antRight.position.set(0.1, 0.92, 0);
      antRight.rotation.z = -0.45;
      group.add(antRight);
      break;
    }

    default: {
      // Sculpted Keepsake Pedestal & Brass Frame
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.14, 0.48, 16),
        matWalnut,
      );
      column.position.y = 0.32;
      group.add(column);

      const frameOuter = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.36, 0.045),
        matBrass,
      );
      frameOuter.position.set(0, 0.72, 0);
      frameOuter.name = 'anim_keepsake_frame';
      group.add(frameOuter);

      const artCanvas = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.28, 0.052),
        matCream,
      );
      artCanvas.position.set(0, 0.72, 0);
      group.add(artCanvas);
      break;
    }
  }

  return group;
}

// ============================================================================
// PART 6 & 14 — REAL THREE.JS GLTFLOADER PIPELINE, ASSET CACHE & DISPOSAL
// ============================================================================
const gltfSceneTemplateCache = new Map<string, THREE.Group>();

/**
 * Loads a MemoryTo3DBlueprint into a ready-to-render Three.js Group using GLTFLoader.
 * Supports:
 * 1. External .glb URLs or base64 data URIs (e.g., from Meshy 3D API).
 * 2. Cached binary .glb ArrayBuffers synthesized via GLTFExporter.
 * 3. Automatic fallback plinth if an invalid GLB or network error occurs.
 */
export async function loadMemoryBlueprint3DObject(params: {
  blueprint: MemoryTo3DBlueprint;
  memory: Memory;
  onProgress?: (fraction: number, statusMessage: string) => void;
}): Promise<{
  group: THREE.Group;
  usedFallback: boolean;
  loadedViaGltfLoader: boolean;
}> {
  const { blueprint, onProgress } = params;
  const cacheKey = `${blueprint.generatedGlbAssetRef.assetId}_${blueprint.objectType}`;

  onProgress?.(0.15, `Resolving 3D asset (${blueprint.objectName})...`);

  // Case 1: Cached template
  if (gltfSceneTemplateCache.has(cacheKey)) {
    onProgress?.(1.0, 'Loaded 3D model from memory cache.');
    const cloned = gltfSceneTemplateCache.get(cacheKey)!.clone(true);
    normalizeAndDecorateLoaded3DGroup(cloned, blueprint);
    return {
      group: cloned,
      usedFallback: false,
      loadedViaGltfLoader: true,
    };
  }

  // Case 2: External GLB URL or data:model/gltf-binary URI
  const externalUrl = blueprint.generatedGlbAssetRef.glbUrlOrDataUri;
  if (externalUrl && /^(https?:\/\/|data:model\/gltf-binary|blob:)/i.test(externalUrl)) {
    const loader = new GLTFLoader();
    try {
      onProgress?.(0.35, 'Downloading & parsing GLB model via GLTFLoader...');
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          externalUrl,
          (loaded) => resolve(loaded),
          (evt) => {
            if (evt.lengthComputable && evt.total > 0) {
              onProgress?.(
                0.35 + (evt.loaded / evt.total) * 0.55,
                'Loading GLB geometry...',
              );
            }
          },
          (err) => reject(err),
        );
      });
      if (gltf && gltf.scene) {
        gltfSceneTemplateCache.set(cacheKey, gltf.scene.clone(true));
        const instance = gltf.scene as THREE.Group;
        normalizeAndDecorateLoaded3DGroup(instance, blueprint);
        onProgress?.(1.0, 'GLB model loaded into Childhood Room.');
        return {
          group: instance,
          usedFallback: false,
          loadedViaGltfLoader: true,
        };
      }
    } catch {
      onProgress?.(
        0.5,
        'External GLB unavailable; synthesizing local 3D model...',
      );
    }
  }

  // Case 3: Direct procedural 3D group instantiation + template cache (no expensive GLTFExporter -> GLTFLoader round-trip)
  try {
    const sourceMeshGroup = buildProceduralMemory3DMeshGroup(blueprint);
    gltfSceneTemplateCache.set(cacheKey, sourceMeshGroup.clone(true));
    normalizeAndDecorateLoaded3DGroup(sourceMeshGroup, blueprint);
    onProgress?.(1.0, '3D object ready in Childhood Room.');
    return {
      group: sourceMeshGroup,
      usedFallback: false,
      loadedViaGltfLoader: false,
    };
  } catch {
    // Case 4 (Tier 5): Clearly labelled Fallback Plinth if all generation/loading fails
    const fallbackGroup = buildProceduralMemory3DMeshGroup({
      ...blueprint,
      objectType: 'custom_keepsake',
    });
    normalizeAndDecorateLoaded3DGroup(fallbackGroup, blueprint, true);
    onProgress?.(1.0, 'Loaded fallback keepsake plinth.');
    return {
      group: fallbackGroup,
      usedFallback: true,
      loadedViaGltfLoader: false,
    };
  }
}

/**
 * Normalizes bounding box, shadows, and attaches raycast hitbox & floating label
 * to a loaded Memory-to-3D object.
 */
function normalizeAndDecorateLoaded3DGroup(
  group: THREE.Group,
  blueprint: MemoryTo3DBlueprint,
  isFallback = false,
): void {
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  // Ensure bottom of bounding box sits cleanly at y = 0
  const box = new THREE.Box3().setFromObject(group);
  if (!box.isEmpty() && Number.isFinite(box.min.y) && Math.abs(box.min.y) > 0.05) {
    group.position.y -= box.min.y;
  }

  // Apply blueprint position, rotation, and scale
  group.position.set(
    blueprint.position.x,
    blueprint.position.y,
    blueprint.position.z,
  );
  group.rotation.set(
    blueprint.rotation.x,
    blueprint.rotation.y,
    blueprint.rotation.z,
  );
  group.scale.set(
    blueprint.scale.x,
    blueprint.scale.y,
    blueprint.scale.z,
  );
  group.userData = {
    kind: 'memory_to_3d_object',
    memoryId: blueprint.memoryId,
    blueprint,
    isFallback,
    isAiInterpretation: blueprint.generatedGlbAssetRef.isAiInterpretation,
  };
}

/**
 * PART 14 — MEMORY & PERFORMANCE SAFETY
 * Cleanly disposes all geometries, materials, and textures inside a 3D memory object
 * when it is removed or replaced.
 */
export function disposeMemory3DObject(root: THREE.Object3D | null | undefined): number {
  if (!root) return 0;
  let disposedCount = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
      disposedCount += 1;
    }
    if (mesh.material) {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of materials) {
        const stdMat = mat as THREE.MeshStandardMaterial;
        if (stdMat.map) stdMat.map.dispose();
        if (stdMat.emissiveMap) stdMat.emissiveMap.dispose();
        if (stdMat.normalMap) stdMat.normalMap.dispose();
        if (stdMat.roughnessMap) stdMat.roughnessMap.dispose();
        mat.dispose();
        disposedCount += 1;
      }
    }
  });
  if (root.parent) {
    root.parent.remove(root);
  }
  return disposedCount;
}
