import * as THREE from 'three';
import { buildChildhoodParkEnvironment } from './childhoodParkEnvironment';
import {
  attachChildhoodBedroomInteractions,
  ChildhoodBedroomInteractionController,
} from './childhoodBedroomInteractions';
import { createChildhoodBedroomMaterialLibrary } from './childhoodBedroomMaterials';
import {
  Collection,
  ExhibitionDisplayStyle,
  Memory,
  MemoryDisplayFrameStyle,
  Room,
} from '../types/museum';
import { getProceduralMemoryArt } from './proceduralArt';
import { getRoomVisualThemeProfile } from './roomThemes';
import {
  computeRoomMemoryVisualData,
  detectRoomCategoryFromInput,
  instantiateStarterMemoriesForRoom,
  validateAndNormalizeRoomBlueprint,
} from './roomCategoryExperience';
import {
  AtmospherePresetId,
  BlueprintMemoryExhibitSpec,
  ChildhoodThemeStyleId,
  InteractiveObjectId3D,
  LivingWorldSpaceId,
  RoomCustomizationStudioConfig,
  RoomMemoryVisualDataSummary,
  TechBuddyPose,
} from '../types/aiStudio';
import {
  CHARACTER_COLLIDER_RADIUS,
  CircleCollider,
  FLOOR_HEIGHT,
  FloorColliderSet,
  MAX_FRAME_DELTA,
  OBBCollider,
  resolveSingleStepPosition,
  sanitizeFiniteNumber,
} from './atriumCollision';
import {
  buildProceduralMemory3DMeshGroup,
  disposeMemory3DObject,
  isMemory3DBlueprintApproved,
  loadMemoryBlueprint3DObject,
} from './memoryTo3DAssetResolver';
import {
  AtriumMoodId,
  SharedMuseumMaterialMaps,
  VisualQualityConfig,
  computeRoomLightingRigTargets,
  createBotanicalCanopyPBRSet,
  createBrushedMetalPBRMaps,
  createMossAndPebbleBedTexture,
  createOrganicTreeBarkPBRSet,
  createWarmParquetFloorPBRSet,
  ensureUv2Attribute,
  getVisualQualityConfig,
  populateRefinedRoomCentralTree,
} from './museumVisualStandards';

import {
  traceRoundedRect,
  createLuxuryMarbleFloorTexture,
  createChampagneLimestoneTexture,
  createRichWalnutWoodTexture,
  createRoundedZoneSignPlaqueTexture,
  createArchedRoomTympanumTexture,
  createEmptyExhibitPlaceholderTexture,
  createRubiksCubeFaceTexture,
  createOpenScrapbookPagesTexture,
  createMemoryConstellationTableTexture,
  ROOM_ENTRANCE_TRANSITION_SPEC,
  ROOM_INTERIOR_SPEC,
  buildRoomInteriorColliders,
  createLimestonePBRMaps,
  createNaturalBoucleTexture,
  createWoodPBRMaps,
  computeRoomEntranceAnimationState,
  MEMORY_FRAME_STYLE_OPTIONS,
  EXHIBITION_DISPLAY_STYLE_OPTIONS,
  getEffectiveRoomExhibitionStyle,
  getRoomLuxuryArchitectureColors,
  evaluateRoomMemoryProximity,
  getAuthenticMemoryDateLabel,
  getBicycleTrailPose,
  buildContextualWorldCatalog,
  resolveRoomInteriorMovement,
  evaluateRoomInteriorExitDoorway,
  computeExhibitionPlacements,
  createTimelineDateNodeTexture,
  createRoomHeaderBannerTexture,
  createMemoryMuseumPlaqueTexture,
  createAudioWaveformPlayerTexture,
} from './roomTextureGenerators';
import type {
  BuiltExhibitionDisplayRecord3D,
  BuiltExhibitionRoom3D,
  RoomEntranceAnimationState,
  ContextualWorldCatalog,
} from './roomTextureGenerators';

export type { ContextualWorldCatalog };

export {
  traceRoundedRect,
  createLuxuryMarbleFloorTexture,
  createChampagneLimestoneTexture,
  createRichWalnutWoodTexture,
  createRoundedZoneSignPlaqueTexture,
  createArchedRoomTympanumTexture,
  createEmptyExhibitPlaceholderTexture,
  createRubiksCubeFaceTexture,
  createOpenScrapbookPagesTexture,
  createMemoryConstellationTableTexture,
  ROOM_ENTRANCE_TRANSITION_SPEC,
  ROOM_INTERIOR_SPEC,
  buildRoomInteriorColliders,
  createLimestonePBRMaps,
  createNaturalBoucleTexture,
  createWoodPBRMaps,
  createBrushedMetalPBRMaps,
  computeRoomEntranceAnimationState,
  MEMORY_FRAME_STYLE_OPTIONS,
  EXHIBITION_DISPLAY_STYLE_OPTIONS,
  getEffectiveRoomExhibitionStyle,
  getRoomLuxuryArchitectureColors,
  evaluateRoomMemoryProximity,
  getAuthenticMemoryDateLabel,
  getBicycleTrailPose,
  buildContextualWorldCatalog,
  resolveRoomInteriorMovement,
  evaluateRoomInteriorExitDoorway,
  computeExhibitionPlacements,
  createTimelineDateNodeTexture,
  createRoomHeaderBannerTexture,
  createMemoryMuseumPlaqueTexture,
  createAudioWaveformPlayerTexture,
} from './roomTextureGenerators';

export type {
  BuiltExhibitionDisplayRecord3D,
  BuiltExhibitionRoom3D,
  RoomEntranceAnimationState,
} from './roomTextureGenerators';

/**
 * Established MEMORA Luxury Architectural Design Palette
 * (Contemporary luxury museum × boutique hotel × modern classic architecture)
 */
export const MUSEUM_LUXURY_PALETTE = {
  warmIvory: '#F3EBDD',
  cream: '#FAF5EC',
  champagneBeige: '#DFD2BE',
  caramel: '#B57B4C',
  walnut: '#493629',
  champagneGold: '#C9A66B',
  bronze: '#7A5B3E',
  mutedSage: '#7A8B70',
  deepOliveGreen: '#55634E',
  dustyTerracotta: '#B8745E',
  midnightBlue: '#223242',
  warmAmberLight: '#FFE2B5',
} as const;

export const CHILDHOOD_THEME_STYLE_PRESETS: Record<
  ChildhoodThemeStyleId,
  {
    id: ChildhoodThemeStyleId;
    label: string;
    description: string;
    config: Partial<RoomCustomizationStudioConfig>;
  }
> = {
  nostalgic_childhood: {
    id: 'nostalgic_childhood',
    label: 'Nostalgic Childhood',
    description: 'Warm golden sunlight, classic walnut furniture, terracotta bedding & oak floors.',
    config: {
      childhoodThemeStyle: 'nostalgic_childhood',
      wallColorHex: '#F3EBDD',
      wallTexture: 'wood_wainscoting',
      floorColorHex: '#FFEAD2',
      floorMaterial: 'warm_oak',
      ceilingColorHex: '#FAF5EC',
      furnitureColorHex: '#FFFFFF',
      bedsheetColorHex: '#C87A5B',
      bedDesign: 'classic_sleigh',
      cupboardStyle: 'vintage_walnut',
      deskStyle: 'scholar_oak',
      windowStyle: 'arched_sunlit',
      curtainColorHex: '#E6D7C3',
      curtainsVisible: true,
      lightIntensity: 2.45,
      atmospherePreset: 'golden_hour',
      skyGardenAppearance: 'sunny_garden',
      showRugs: true,
      showCushions: true,
      showLamps: true,
      showPosters: true,
      showPlants: true,
      showToys: true,
    },
  },
  colourful_playroom: {
    id: 'colourful_playroom',
    label: 'Colourful Playroom',
    description: 'Cheerful sunlit playroom with storybook walls, bright bedding & playful craft desk.',
    config: {
      childhoodThemeStyle: 'colourful_playroom',
      wallColorHex: '#FFF6E5',
      wallTexture: 'storybook_mural',
      floorColorHex: '#FFE8C2',
      floorMaterial: 'warm_oak',
      ceilingColorHex: '#FFFDF9',
      furnitureColorHex: '#F5CBA7',
      bedsheetColorHex: '#E66C5C',
      bedDesign: 'classic_sleigh',
      cupboardStyle: 'painted_ivory',
      deskStyle: 'playful_craft',
      windowStyle: 'wide_garden_view',
      curtainColorHex: '#F7DC6F',
      curtainsVisible: true,
      lightIntensity: 2.75,
      atmospherePreset: 'morning_sunlight',
      skyGardenAppearance: 'sunny_garden',
      toyArrangementPreset: 'playtime_circle',
      showRugs: true,
      showCushions: true,
      showLamps: true,
      showPosters: true,
      showPlants: true,
      showToys: true,
    },
  },
  cozy_vintage_bedroom: {
    id: 'cozy_vintage_bedroom',
    label: 'Cozy Vintage Bedroom',
    description: 'Heirloom walnut canopy bed, herringbone floors, warm amber lamps & evening glow.',
    config: {
      childhoodThemeStyle: 'cozy_vintage_bedroom',
      wallColorHex: '#EAE0D0',
      wallTexture: 'striped_wallpaper',
      floorColorHex: '#D8B898',
      floorMaterial: 'herringbone_walnut',
      ceilingColorHex: '#F4ECE0',
      furnitureColorHex: '#D7B399',
      bedsheetColorHex: '#9E473B',
      bedDesign: 'cozy_canopy',
      cupboardStyle: 'vintage_walnut',
      deskStyle: 'scholar_oak',
      windowStyle: 'stained_amber',
      curtainColorHex: '#C99E7A',
      curtainsVisible: true,
      lightIntensity: 2.15,
      atmospherePreset: 'golden_hour',
      skyGardenAppearance: 'sunset_meadow',
      showRugs: true,
      showCushions: true,
      showLamps: true,
      showPosters: true,
      showPlants: true,
      showToys: true,
    },
  },
  nature_inspired_childhood: {
    id: 'nature_inspired_childhood',
    label: 'Nature-Inspired Childhood',
    description: 'Botanical sage walls, natural timber furniture, lush indoor greenery & garden views.',
    config: {
      childhoodThemeStyle: 'nature_inspired_childhood',
      wallColorHex: '#E4ECE2',
      wallTexture: 'smooth_plaster',
      floorColorHex: '#EED9BE',
      floorMaterial: 'warm_oak',
      ceilingColorHex: '#F7FAF5',
      furnitureColorHex: '#E6D2B5',
      bedsheetColorHex: '#6E8B74',
      bedDesign: 'modern_timber',
      cupboardStyle: 'glass_display',
      deskStyle: 'minimal_birch',
      windowStyle: 'wide_garden_view',
      curtainColorHex: '#D5E2D0',
      curtainsVisible: true,
      lightIntensity: 2.6,
      atmospherePreset: 'morning_sunlight',
      skyGardenAppearance: 'sunny_garden',
      showRugs: true,
      showCushions: true,
      showLamps: true,
      showPosters: false,
      showPlants: true,
      showToys: true,
    },
  },
  minimal_modern_childhood: {
    id: 'minimal_modern_childhood',
    label: 'Minimal Modern Childhood',
    description: 'Calm warm alabaster walls, birch timber furniture, sand linen bedding & tidy shelves.',
    config: {
      childhoodThemeStyle: 'minimal_modern_childhood',
      wallColorHex: '#F8F6F2',
      wallTexture: 'smooth_plaster',
      floorColorHex: '#F2E8DC',
      floorMaterial: 'travertine_stone',
      ceilingColorHex: '#FFFFFF',
      furnitureColorHex: '#F5E6D3',
      bedsheetColorHex: '#C9B79C',
      bedDesign: 'modern_timber',
      cupboardStyle: 'painted_ivory',
      deskStyle: 'minimal_birch',
      windowStyle: 'arched_sunlit',
      curtainColorHex: '#F0ECE4',
      curtainsVisible: false,
      lightIntensity: 2.5,
      atmospherePreset: 'morning_sunlight',
      skyGardenAppearance: 'sunny_garden',
      toyArrangementPreset: 'tidied_shelf',
      showRugs: true,
      showCushions: false,
      showLamps: true,
      showPosters: false,
      showPlants: true,
      showToys: true,
    },
  },
};

export interface Resolved3DMemoryPlacement {
  x: number;
  y: number;
  z: number;
  rotY: number;
  needsEaselStand: boolean;
  zoneKey: string;
}

/**
 * Resolves a memory's approved Childhood World location (`curatedZoneId` or `placementTarget`)
 * into non-overlapping, walkable-clear Three.js coordinates inside the exhibition room / park.
 * Supports all 9 locations in CHILDHOOD_WORLD_LOCATION_CATALOGUE with per-zone slot progression
 * and graceful overflow routing when a zone's primary display rack reaches capacity.
 */
export function resolve3DPlacementPosition(
  mem: Pick<Memory, 'curatedZoneId' | 'placementTarget' | 'positionOffset'>,
  slotInZone: number,
  fallback: { x: number; y: number; z: number; rotY: number },
): Resolved3DMemoryPlacement {
  const offsetX = mem.positionOffset?.x || 0;
  const offsetY = mem.positionOffset?.y || 0;
  const zone = mem.curatedZoneId;
  const target = mem.placementTarget;

  // Overflow beyond 6 items in a single zone routes neatly to the perimeter meadow gallery
  const overflowSlot = slotInZone >= 6 ? slotInZone - 6 : -1;
  if (overflowSlot >= 0) {
    return {
      x: -3.2 + (overflowSlot % 4) * 1.45 + offsetX,
      y: 1.32 + offsetY,
      z: -5.65 + Math.floor(overflowSlot / 4) * 0.85,
      rotY: 0,
      needsEaselStand: true,
      zoneKey: `${zone || target || 'overflow'}_overflow`,
    };
  }

  if (zone === 'memory_garden') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: 1.15 + col * 1.18 + offsetX,
      y: 1.32 + offsetY,
      z: 4.55 - row * 1.25,
      rotY: Math.PI * 0.92,
      needsEaselStand: true,
      zoneKey: 'memory_garden',
    };
  }

  if (zone === 'backyard') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: 5.42 - row * 1.12 + offsetX,
      y: 1.32 + offsetY,
      z: 1.95 + col * 1.12,
      rotY: -Math.PI * 0.48,
      needsEaselStand: true,
      zoneKey: 'backyard',
    };
  }

  if (zone === 'treehouse' || target === 'treehouse_nook') {
    const col = slotInZone % 2;
    const row = Math.floor(slotInZone / 2);
    return {
      x: 4.18 + col * 1.02 + offsetX,
      y: 2.86 + offsetY,
      z: -2.42 + row * 0.72,
      rotY: -Math.PI * 0.22,
      needsEaselStand: false,
      zoneKey: 'treehouse',
    };
  }

  if (zone === 'bicycle_trail' || target === 'bicycle_trail') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: 2.85 + col * 1.15 + offsetX,
      y: 1.28 + offsetY,
      z: 5.55 - row * 0.85,
      rotY: Math.PI,
      needsEaselStand: true,
      zoneKey: 'bicycle_trail',
    };
  }

  if (zone === 'memory_wall' || target === 'memory_wall') {
    const col = slotInZone % 4;
    const row = Math.floor(slotInZone / 4);
    return {
      x: -2.25 + col * 1.48 + offsetX,
      y: 2.24 - row * 0.96 + offsetY,
      z: -6.78,
      rotY: 0,
      needsEaselStand: false,
      zoneKey: 'memory_wall',
    };
  }

  if (zone === 'toy_box' || target === 'toy_box') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: -3.55 + (col - 1) * 0.68 + offsetX,
      y: 1.05 + row * 0.68 + offsetY,
      z: 2.02,
      rotY: 0.42,
      needsEaselStand: false,
      zoneKey: 'toy_box',
    };
  }

  if (zone === 'bookshelf' || target === 'bookshelf') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: -6.22 + offsetX,
      y: 1.24 + row * 0.58 + offsetY,
      z: -1.68 + col * 0.54,
      rotY: Math.PI / 2,
      needsEaselStand: false,
      zoneKey: 'bookshelf',
    };
  }

  if (zone === 'bedroom' || target === 'bedside_shelf' || target === 'wall_frame') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: -5.68 + offsetX,
      y: 1.66 + row * 0.78 + offsetY,
      z: 2.45 + col * 1.08,
      rotY: Math.PI / 2,
      needsEaselStand: false,
      zoneKey: 'bedroom',
    };
  }

  if (zone === 'study_corner' || target === 'study_desk') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: -5.35 + col * 0.96 + offsetX,
      y: 1.54 + row * 0.72 + offsetY,
      z: -4.85,
      rotY: Math.PI * 0.28,
      needsEaselStand: false,
      zoneKey: 'study_corner',
    };
  }

  if (zone === 'outdoor_cinema' || target === 'cinema_screen') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: 2.35 + col * 1.14 + offsetX,
      y: 1.46 + row * 0.72 + offsetY,
      z: -4.82,
      rotY: -Math.PI * 0.14,
      needsEaselStand: true,
      zoneKey: 'outdoor_cinema',
    };
  }

  if (zone === 'memory_radio' || target === 'audio_booth') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: 5.65 + offsetX,
      y: 1.44 + row * 0.72 + offsetY,
      z: -0.82 + col * 1.02,
      rotY: -Math.PI / 2,
      needsEaselStand: false,
      zoneKey: 'memory_radio',
    };
  }

  if (zone === 'keepsake_corner' || target === 'keepsake_cabinet') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: -5.58 + offsetX,
      y: 1.42 + row * 0.74 + offsetY,
      z: -2.25 + col * 1.05,
      rotY: Math.PI / 2,
      needsEaselStand: true,
      zoneKey: 'keepsake_corner',
    };
  }

  if (target === 'garden_trail') {
    const col = slotInZone % 3;
    const row = Math.floor(slotInZone / 3);
    return {
      x: 5.52 - row * 1.1 + offsetX,
      y: 1.36 + offsetY,
      z: -2.65 + col * 1.35,
      rotY: -Math.PI * 0.46,
      needsEaselStand: true,
      zoneKey: 'garden_trail',
    };
  }

  if (target === 'scrapbook_podium') {
    return {
      x: -0.65 + (slotInZone % 3) * 0.65 + offsetX,
      y: 1.28 + offsetY,
      z: -0.45,
      rotY: 0,
      needsEaselStand: false,
      zoneKey: 'scrapbook_podium',
    };
  }

  return {
    x: fallback.x + offsetX,
    y: fallback.y + offsetY,
    z: fallback.z,
    rotY: fallback.rotY,
    needsEaselStand: false,
    zoneKey: 'default',
  };
}

/**
 * Generates a high-resolution warm ivory & champagne-beige Calacatta/Crema Marfil marble texture
 * with organic natural veining, subtle mineral clouds, large-format architectural slab joints,
 * and hairline brushed-brass corner inlays.
 */
const MAX_3D_DISPLAY_TEXTURE_DIM = 1024;

export function isRenderableRoomMediaUrl(
  url: string | undefined | null,
): url is string {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('idb://')) return false;
  return (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/api/storage/media/') ||
    trimmed.startsWith('/') ||
    /^https?:\/\//i.test(trimmed)
  );
}

export function resolveRoomMemoryImageUrl(mem: Memory): string | undefined {
  if (
    isRenderableRoomMediaUrl(mem.customImageUrl) &&
    !mem.customImageUrl.startsWith('data:video/') &&
    !mem.customImageUrl.startsWith('data:audio/')
  ) {
    return mem.customImageUrl;
  }
  const mt = mem.mediaType || mem.type;
  if (
    isRenderableRoomMediaUrl(mem.mediaUrl) &&
    (mt === 'image' ||
      mt === 'certificate' ||
      mem.mediaUrl.startsWith('data:image/'))
  ) {
    return mem.mediaUrl;
  }
  return undefined;
}

export function resolveRoomMemoryVideoUrl(mem: Memory): string | undefined {
  const mt = mem.mediaType || mem.type;
  const candidate = mem.mediaUrl || mem.customImageUrl;
  if (!isRenderableRoomMediaUrl(candidate)) return undefined;
  if (
    mt === 'video' ||
    candidate.startsWith('data:video/') ||
    /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(candidate)
  ) {
    return candidate;
  }
  return undefined;
}

export function createBoundedCanvasFromImage(
  img: HTMLImageElement,
  maxDim = MAX_3D_DISPLAY_TEXTURE_DIM,
): { canvas: HTMLCanvasElement; natW: number; natH: number } {
  const natW = Math.max(1, img.naturalWidth || img.width || 512);
  const natH = Math.max(1, img.naturalHeight || img.height || 384);
  const scale = Math.min(1, maxDim / Math.max(natW, natH));
  const targetW = Math.max(2, Math.round(natW * scale));
  const targetH = Math.max(2, Math.round(natH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);
  }
  return { canvas, natW, natH };
}

export function buildExhibitionRoom3DScene(params: {
  room: Room;
  memories: Memory[];
  styleOverride?: ExhibitionDisplayStyle;
  maxAnisotropy: number;
  floorTexture: THREE.Texture;
  qualityConfig?: VisualQualityConfig;
  sharedMaps?: SharedMuseumMaterialMaps;
  atriumMood?: AtriumMoodId;
}): BuiltExhibitionRoom3D {
  const {
    room,
    memories: rawMemories,
    styleOverride,
    maxAnisotropy,
    floorTexture,
    qualityConfig = getVisualQualityConfig('desktop', false),
    sharedMaps,
    atriumMood = 'golden_hour',
  } = params;
  const categoryDetection = detectRoomCategoryFromInput(
    `${room.name || ''} ${room.subtitle || ''} ${room.theme || ''}`,
    room.designConfig?.detectedCategory,
  );
  // Ensure every room has rich 3D visual + memory content representation even before custom uploads
  const memories =
    rawMemories.length > 0
      ? rawMemories
      : instantiateStarterMemoriesForRoom(
          room.id,
          room.designConfig?.suggestedStarterMemories ||
            categoryDetection.profile.starterMemories,
        );
  const visualDataSummary =
    room.designConfig?.visualDataSummary && rawMemories.length === 0
      ? room.designConfig.visualDataSummary
      : computeRoomMemoryVisualData(
          categoryDetection.categoryKey,
          room.name || categoryDetection.profile.label,
          memories,
        );
  const activeBlueprint = validateAndNormalizeRoomBlueprint(
    room.designConfig?.blueprint,
    {
      roomName: room.name || categoryDetection.profile.label,
      categoryKey: categoryDetection.categoryKey,
      description: room.description,
      memories,
    },
  );
  const exhibitBlueprintMap = new Map<string, BlueprintMemoryExhibitSpec>();
  activeBlueprint.exhibits.forEach((ex) => {
    exhibitBlueprintMap.set(ex.memoryId, ex);
  });

  const effectiveStyle =
    styleOverride ||
    room.designConfig?.exhibitionStyle ||
    getEffectiveRoomExhibitionStyle(room, memories);
  const styleMeta =
    EXHIBITION_DISPLAY_STYLE_OPTIONS.find((s) => s.id === effectiveStyle) ||
    EXHIBITION_DISPLAY_STYLE_OPTIONS[0];
  const palette = getRoomLuxuryArchitectureColors(room, effectiveStyle);
  const themeProfile = getRoomVisualThemeProfile(room);
  const floorBaseY =
    Math.max(0, Math.floor(sanitizeFiniteNumber(room.floorNumber, 0))) *
    FLOOR_HEIGHT;

  const rootGroup = new THREE.Group();
  rootGroup.name = `exhibition_room_3d_${room.id}`;
  rootGroup.position.set(0, floorBaseY, 0);

  const disposables: { dispose: () => void }[] = [];
  const activeVideoElements: HTMLVideoElement[] = [];
  const track = <T extends { dispose: () => void }>(asset: T): T => {
    disposables.push(asset);
    return asset;
  };
  let isRoomDisposed = false;
  let memoryUpdateGeneration = 0;
  const section3BDynamicTextures = new Map<THREE.Material, THREE.Texture>();
  const section3BCinemaVideos: HTMLVideoElement[] = [];
  const section3BMemoryUpdaters: Array<
    (nextUploaded: Memory[], defaultMem: Memory | undefined) => void
  > = [];

  const releaseMaterialDynamicTexture = (mat: THREE.Material) => {
    const prev = section3BDynamicTextures.get(mat);
    if (prev) {
      try {
        prev.dispose();
      } catch {
        // ignore
      }
      section3BDynamicTextures.delete(mat);
    }
  };

  const assignMaterialDynamicTexture = (
    mat: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial,
    tex: THREE.Texture,
  ) => {
    releaseMaterialDynamicTexture(mat);
    section3BDynamicTextures.set(mat, tex);
    mat.map = tex;
    if ('emissiveMap' in mat) {
      mat.emissiveMap = tex;
    }
    mat.needsUpdate = true;
  };

  const solidWallMeshes: THREE.Mesh[] = [];
  const cameraObstacleMeshes: THREE.Mesh[] = [];
  const displayRecords: BuiltExhibitionDisplayRecord3D[] = [];

  // Shared Luxury PBR Textures & Materials (reuse Atrium sharedMaps cleanly without double-disposal)
  const limestoneTex =
    sharedMaps?.limestoneTex || track(createChampagneLimestoneTexture(maxAnisotropy));
  const walnutTex =
    sharedMaps?.walnutTex || track(createRichWalnutWoodTexture(maxAnisotropy));
  const boucleTex =
    sharedMaps?.boucleTex || track(createNaturalBoucleTexture(maxAnisotropy));

  let localLimestonePBR: {
    normalMap: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  } | null = null;
  if (!sharedMaps) {
    localLimestonePBR = createLimestonePBRMaps(
      maxAnisotropy,
      Math.min(512, qualityConfig.pbrMapRes),
    );
    track(localLimestonePBR.normalMap);
    track(localLimestonePBR.roughnessMap);
  }
  const limestonePBR = {
    normalMap: sharedMaps?.limestoneNormalMap || localLimestonePBR!.normalMap,
    roughnessMap:
      sharedMaps?.limestoneRoughnessMap || localLimestonePBR!.roughnessMap,
  };

  let localWoodPBR: {
    normalMap: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  } | null = null;
  if (!sharedMaps) {
    localWoodPBR = createWoodPBRMaps(
      maxAnisotropy,
      Math.min(512, qualityConfig.pbrMapRes),
    );
    track(localWoodPBR.normalMap);
    track(localWoodPBR.roughnessMap);
  }
  const woodPBR = {
    normalMap: sharedMaps?.woodNormalMap || localWoodPBR!.normalMap,
    roughnessMap: sharedMaps?.woodRoughnessMap || localWoodPBR!.roughnessMap,
  };

  let localMetalPBR: {
    normalMap: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  } | null = null;
  if (!sharedMaps) {
    localMetalPBR = createBrushedMetalPBRMaps(
      maxAnisotropy,
      Math.min(512, qualityConfig.pbrMapRes),
    );
    track(localMetalPBR.normalMap);
    track(localMetalPBR.roughnessMap);
  }
  const metalPBR = {
    normalMap: sharedMaps?.brushedMetalNormalMap || localMetalPBR!.normalMap,
    roughnessMap:
      sharedMaps?.brushedMetalRoughnessMap || localMetalPBR!.roughnessMap,
  };

  const parquetFloorPBR =
    sharedMaps?.parquetFloor ||
    (() => {
      const p = createWarmParquetFloorPBRSet(
        maxAnisotropy,
        qualityConfig.textureRes,
        qualityConfig.pbrMapRes,
      );
      track(p.map);
      track(p.normalMap);
      track(p.roughnessMap);
      if (p.aoMap) track(p.aoMap);
      return p;
    })();
  const parquetFloorTex = parquetFloorPBR.map;

  const travertineFloorPBR = sharedMaps?.travertineFloor || {
    map: floorTexture,
    normalMap: limestonePBR.normalMap,
    roughnessMap: limestonePBR.roughnessMap,
    aoMap: undefined,
  };

  const barkPBR =
    sharedMaps?.barkPBR ||
    (() => {
      const b = createOrganicTreeBarkPBRSet(
        maxAnisotropy,
        Math.min(512, qualityConfig.pbrMapRes),
      );
      track(b.map);
      track(b.normalMap);
      track(b.roughnessMap);
      return b;
    })();
  const canopyPBR =
    sharedMaps?.canopyPBR ||
    (() => {
      const c = createBotanicalCanopyPBRSet(
        maxAnisotropy,
        Math.min(512, qualityConfig.pbrMapRes),
      );
      track(c.map);
      track(c.normalMap);
      track(c.roughnessMap);
      return c;
    })();
  const mossBedTex =
    sharedMaps?.mossBedTex || track(createMossAndPebbleBedTexture(maxAnisotropy));

  const useWarmParquetFloor =
    categoryDetection.categoryKey === 'childhood' ||
    categoryDetection.categoryKey === 'family' ||
    categoryDetection.categoryKey === 'friendships' ||
    categoryDetection.categoryKey === 'travels' ||
    categoryDetection.categoryKey === 'music_sound' ||
    categoryDetection.categoryKey === 'college_years';

  const matPrimaryWall = track(
    new THREE.MeshStandardMaterial({
      map: limestoneTex,
      normalMap: limestonePBR.normalMap,
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughnessMap: limestonePBR.roughnessMap,
      color: new THREE.Color(palette.primaryWallHex),
      roughness: 0.66,
      metalness: 0.03,
      envMapIntensity: 0.34,
    }),
  );
  const matFeatureWall = track(
    new THREE.MeshStandardMaterial({
      map: limestoneTex,
      normalMap: limestonePBR.normalMap,
      normalScale: new THREE.Vector2(0.2, 0.2),
      roughnessMap: limestonePBR.roughnessMap,
      color: new THREE.Color(palette.featureWallHex),
      roughness: 0.58,
      metalness: 0.05,
      envMapIntensity: 0.38,
    }),
  );
  const useFullPhysical = qualityConfig.usePhysicalMaterials !== false && !qualityConfig.usePhysicalHeroAccentsOnly;
  const useHeroPhysical = qualityConfig.usePhysicalMaterials !== false;

  const matWalnut: THREE.MeshStandardMaterial = track(
    useFullPhysical
      ? new THREE.MeshPhysicalMaterial({
          map: walnutTex,
          normalMap: woodPBR.normalMap,
          normalScale: new THREE.Vector2(0.22, 0.22),
          roughnessMap: woodPBR.roughnessMap,
          color: new THREE.Color('#FFFFFF'),
          roughness: 0.36,
          metalness: 0.04,
          clearcoat: 0.16,
          clearcoatRoughness: 0.28,
          envMapIntensity: 0.52,
        })
      : new THREE.MeshStandardMaterial({
          map: walnutTex,
          normalMap: woodPBR.normalMap,
          normalScale: new THREE.Vector2(0.2, 0.2),
          roughnessMap: woodPBR.roughnessMap,
          color: new THREE.Color('#FFFFFF'),
          roughness: 0.36,
          metalness: 0.04,
          envMapIntensity: 0.48,
        }),
  );
  const matChampagneGold: THREE.MeshStandardMaterial = track(
    useHeroPhysical
      ? new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#D3AD6E'),
          normalMap: metalPBR.normalMap,
          normalScale: new THREE.Vector2(0.14, 0.14),
          roughnessMap: metalPBR.roughnessMap,
          roughness: 0.28,
          metalness: 0.84,
          anisotropy: 0.45,
          clearcoat: 0.22,
          clearcoatRoughness: 0.2,
          envMapIntensity: 1.05,
        })
      : new THREE.MeshStandardMaterial({
          color: new THREE.Color('#D3AD6E'),
          normalMap: metalPBR.normalMap,
          normalScale: new THREE.Vector2(0.14, 0.14),
          roughnessMap: metalPBR.roughnessMap,
          roughness: 0.28,
          metalness: 0.84,
          envMapIntensity: 1.0,
        }),
  );
  const matBronze: THREE.MeshStandardMaterial = track(
    useHeroPhysical
      ? new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(MUSEUM_LUXURY_PALETTE.bronze),
          normalMap: metalPBR.normalMap,
          normalScale: new THREE.Vector2(0.15, 0.15),
          roughnessMap: metalPBR.roughnessMap,
          roughness: 0.32,
          metalness: 0.8,
          anisotropy: 0.4,
          clearcoat: 0.2,
          clearcoatRoughness: 0.24,
          envMapIntensity: 0.92,
        })
      : new THREE.MeshStandardMaterial({
          color: new THREE.Color(MUSEUM_LUXURY_PALETTE.bronze),
          normalMap: metalPBR.normalMap,
          normalScale: new THREE.Vector2(0.15, 0.15),
          roughnessMap: metalPBR.roughnessMap,
          roughness: 0.32,
          metalness: 0.8,
          envMapIntensity: 0.88,
        }),
  );
  const matMinimalDark = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#231F1C'),
      roughness: 0.34,
      metalness: 0.25,
    }),
  );
  const matWarmLimestone = track(
    new THREE.MeshStandardMaterial({
      map: limestoneTex,
      normalMap: limestonePBR.normalMap,
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughnessMap: limestonePBR.roughnessMap,
      color: new THREE.Color(MUSEUM_LUXURY_PALETTE.champagneBeige),
      roughness: 0.56,
      metalness: 0.02,
      envMapIntensity: 0.38,
    }),
  );
  const matTreeBark = track(
    new THREE.MeshStandardMaterial({
      map: barkPBR.map,
      normalMap: barkPBR.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: barkPBR.roughnessMap,
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.02,
      envMapIntensity: 0.28,
    }),
  );
  const matMossBed = track(
    new THREE.MeshStandardMaterial({
      map: mossBedTex,
      normalMap: canopyPBR.normalMap,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughness: 0.84,
      metalness: 0.02,
      envMapIntensity: 0.25,
    }),
  );
  const matCanopyInstanced = track(
    new THREE.MeshStandardMaterial({
      map: canopyPBR.map,
      normalMap: canopyPBR.normalMap,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughnessMap: canopyPBR.roughnessMap,
      color: 0xffffff,
      roughness: 0.64,
      metalness: 0.02,
      envMapIntensity: 0.34,
    }),
  );
  const matBoucleFabric: THREE.MeshStandardMaterial = track(
    useFullPhysical
      ? new THREE.MeshPhysicalMaterial({
          map: boucleTex,
          color: new THREE.Color('#FAF5EC'),
          roughness: 0.86,
          metalness: 0.02,
          sheen: 0.85,
          sheenRoughness: 0.65,
          sheenColor: new THREE.Color('#FFF8EE'),
        })
      : new THREE.MeshStandardMaterial({
          map: boucleTex,
          color: new THREE.Color('#FAF5EC'),
          roughness: 0.86,
          metalness: 0.02,
          envMapIntensity: 0.3,
        }),
  );
  const matCaramelLeather: THREE.MeshStandardMaterial = track(
    useFullPhysical
      ? new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(MUSEUM_LUXURY_PALETTE.caramel),
          roughness: 0.42,
          metalness: 0.04,
          clearcoat: 0.14,
          sheen: 0.55,
          sheenRoughness: 0.5,
          sheenColor: new THREE.Color('#F3C89B'),
        })
      : new THREE.MeshStandardMaterial({
          color: new THREE.Color(MUSEUM_LUXURY_PALETTE.caramel),
          roughness: 0.42,
          metalness: 0.04,
          envMapIntensity: 0.42,
        }),
  );
  const matWovenLinenRug = track(
    new THREE.MeshStandardMaterial({
      map: boucleTex,
      color: new THREE.Color('#E6DAC6'),
      roughness: 0.92,
      metalness: 0.01,
    }),
  );
  const matWarmEmissiveStrip = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFCF6'),
      emissive: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
      emissiveIntensity: 0.92,
      roughness: 0.18,
    }),
  );
  const matVitrineGlass: THREE.MeshStandardMaterial = track(
    useHeroPhysical
      ? new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.24,
          roughness: 0.08,
          metalness: 0.05,
          reflectivity: 0.9,
          depthWrite: false,
        })
      : new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.24,
          roughness: 0.1,
          metalness: 0.1,
          depthWrite: false,
        }),
  );
  const matFoliage = track(
    new THREE.MeshStandardMaterial({
      map: canopyPBR.map,
      normalMap: canopyPBR.normalMap,
      normalScale: new THREE.Vector2(0.24, 0.24),
      roughnessMap: canopyPBR.roughnessMap,
      color: new THREE.Color(MUSEUM_LUXURY_PALETTE.deepOliveGreen),
      roughness: 0.64,
      metalness: 0.02,
      envMapIntensity: 0.32,
    }),
  );
  const matSageLeafAccent = track(
    new THREE.MeshStandardMaterial({
      map: canopyPBR.map,
      normalMap: canopyPBR.normalMap,
      normalScale: new THREE.Vector2(0.24, 0.24),
      roughnessMap: canopyPBR.roughnessMap,
      color: new THREE.Color(MUSEUM_LUXURY_PALETTE.mutedSage),
      roughness: 0.62,
      metalness: 0.02,
      envMapIntensity: 0.32,
    }),
  );

  const roomW = ROOM_INTERIOR_SPEC.width;
  const roomD = ROOM_INTERIOR_SPEC.depth;
  const roomH = ROOM_INTERIOR_SPEC.height;
  const halfW = ROOM_INTERIOR_SPEC.halfWidth;
  const halfD = ROOM_INTERIOR_SPEC.halfDepth;
  const isChildhoodPark = categoryDetection.categoryKey === 'childhood';
  const architectureShellStartIndex = rootGroup.children.length;

  // =========================================================================
  // 1. ARCHITECTURAL SHELL: WARM PARQUET / MARBLE FLOOR, BRASS INLAYS, WALLS & CEILING
  // =========================================================================
  const activeFloorPBR = useWarmParquetFloor ? parquetFloorPBR : travertineFloorPBR;
  const floorMat: THREE.MeshStandardMaterial = track(
    useFullPhysical
      ? new THREE.MeshPhysicalMaterial({
          map: activeFloorPBR.map,
          normalMap: activeFloorPBR.normalMap,
          normalScale: new THREE.Vector2(0.16, 0.16),
          roughnessMap: activeFloorPBR.roughnessMap,
          aoMap: activeFloorPBR.aoMap || null,
          aoMapIntensity: 0.38,
          color: new THREE.Color(useWarmParquetFloor ? '#FFEED8' : palette.floorBaseHex),
          roughness: useWarmParquetFloor ? 0.32 : 0.28,
          metalness: 0.04,
          clearcoat: 0.22,
          clearcoatRoughness: 0.24,
          envMapIntensity: 0.54,
        })
      : new THREE.MeshStandardMaterial({
          map: activeFloorPBR.map,
          normalMap: activeFloorPBR.normalMap,
          normalScale: new THREE.Vector2(0.16, 0.16),
          roughnessMap: activeFloorPBR.roughnessMap,
          aoMap: activeFloorPBR.aoMap || null,
          aoMapIntensity: 0.38,
          color: new THREE.Color(useWarmParquetFloor ? '#FFEED8' : palette.floorBaseHex),
          roughness: useWarmParquetFloor ? 0.34 : 0.3,
          metalness: 0.04,
          envMapIntensity: 0.5,
        }),
  );
  const floorMesh = new THREE.Mesh(
    ensureUv2Attribute(track(new THREE.BoxGeometry(roomW + 0.8, 0.24, roomD + 0.8))),
    floorMeshMatOrDefault(floorMat),
  );
  floorMesh.position.set(0, -0.12, 0);
  floorMesh.receiveShadow = true;
  rootGroup.add(floorMesh);

  function floorMeshMatOrDefault(m: THREE.Material) {
    return m;
  }

  // Architectural Honed Travertine Perimeter Plinth & Threshold Transition Apron
  const perimeterPlinthGeoH = track(new THREE.BoxGeometry(roomW - 0.3, 0.016, 0.68));
  const perimeterPlinthGeoV = track(new THREE.BoxGeometry(0.68, 0.016, roomD - 0.3));
  [-halfD + 0.42, halfD - 0.42].forEach((pz) => {
    const stoneMargin = new THREE.Mesh(perimeterPlinthGeoH, matWarmLimestone);
    stoneMargin.position.set(0, 0.004, pz);
    stoneMargin.receiveShadow = true;
    rootGroup.add(stoneMargin);
  });
  [-halfW + 0.42, halfW - 0.42].forEach((px) => {
    const stoneMargin = new THREE.Mesh(perimeterPlinthGeoV, matWarmLimestone);
    stoneMargin.position.set(px, 0.004, 0);
    stoneMargin.receiveShadow = true;
    rootGroup.add(stoneMargin);
  });

  // Inlaid Champagne-Gold Floor Perimeter Border Strips (Outer & Inner Double Frame)
  const borderStripH = track(new THREE.BoxGeometry(roomW - 1.5, 0.012, 0.055));
  const borderStripV = track(new THREE.BoxGeometry(0.055, 0.012, roomD - 1.5));
  [-halfD + 0.82, halfD - 0.82].forEach((bz) => {
    const strip = new THREE.Mesh(borderStripH, matChampagneGold);
    strip.position.set(0, 0.006, bz);
    rootGroup.add(strip);
  });
  [-halfW + 0.82, halfW - 0.82].forEach((bx) => {
    const strip = new THREE.Mesh(borderStripV, matChampagneGold);
    strip.position.set(bx, 0.006, 0);
    rootGroup.add(strip);
  });

  // Inner gallery promenade brass inlay border
  const innerStripH = track(new THREE.BoxGeometry(roomW - 3.6, 0.012, 0.032));
  const innerStripV = track(new THREE.BoxGeometry(0.032, 0.012, roomD - 3.6));
  [-halfD + 1.85, halfD - 1.85].forEach((bz) => {
    const strip = new THREE.Mesh(innerStripH, matChampagneGold);
    strip.position.set(0, 0.006, bz);
    rootGroup.add(strip);
  });
  [-halfW + 1.85, halfW - 1.85].forEach((bx) => {
    const strip = new THREE.Mesh(innerStripV, matChampagneGold);
    strip.position.set(bx, 0.006, 0);
    rootGroup.add(strip);
  });

  // North Focal Wall (z = -halfD) with Recessed Architectural Feature Reveal & Indirect Cove Glow
  const northWall = new THREE.Mesh(
    track(new THREE.BoxGeometry(roomW + 0.8, roomH, 0.44)),
    matFeatureWall,
  );
  northWall.position.set(0, roomH * 0.5, -halfD);
  northWall.receiveShadow = true;
  rootGroup.add(northWall);
  solidWallMeshes.push(northWall);
  cameraObstacleMeshes.push(northWall);

  // North Wall Architectural Reveal Surround Frame & Concealed Indirect LED Strip
  const northRevealFrameTop = new THREE.Mesh(
    track(new THREE.BoxGeometry(9.6, 0.06, 0.06)),
    matChampagneGold,
  );
  northRevealFrameTop.position.set(0, 3.85, -halfD + 0.24);
  rootGroup.add(northRevealFrameTop);

  const northRevealLed = new THREE.Mesh(
    track(new THREE.BoxGeometry(9.4, 0.035, 0.04)),
    matWarmEmissiveStrip,
  );
  northRevealLed.position.set(0, 3.81, -halfD + 0.23);
  rootGroup.add(northRevealLed);

  [-4.78, 4.78].forEach((rx) => {
    const sideTrim = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.06, 3.35, 0.06)),
      matChampagneGold,
    );
    sideTrim.position.set(rx, 2.18, -halfD + 0.24);
    rootGroup.add(sideTrim);
  });

  // West & East Gallery Walls (x = ±halfW) with Classical Dado Wainscoting & Recessed Display Niches
  const sideWallGeo = track(new THREE.BoxGeometry(0.44, roomH, roomD + 0.8));
  const westWall = new THREE.Mesh(sideWallGeo, matPrimaryWall);
  westWall.position.set(-halfW, roomH * 0.5, 0);
  westWall.receiveShadow = true;
  rootGroup.add(westWall);
  solidWallMeshes.push(westWall);
  cameraObstacleMeshes.push(westWall);

  const eastWall = new THREE.Mesh(sideWallGeo, matPrimaryWall);
  eastWall.position.set(halfW, roomH * 0.5, 0);
  eastWall.receiveShadow = true;
  rootGroup.add(eastWall);
  solidWallMeshes.push(eastWall);
  cameraObstacleMeshes.push(eastWall);

  // Classical Champagne-Limestone & Brass Dado Rail along West, East, North & South Wing Walls (y = 0.92m)
  const dadoRailGeo = track(new THREE.BoxGeometry(0.06, 0.065, roomD - 0.8));
  const dadoBrassGeo = track(new THREE.BoxGeometry(0.07, 0.022, roomD - 0.8));
  [-halfW + 0.23, halfW - 0.23].forEach((wx) => {
    const dado = new THREE.Mesh(dadoRailGeo, matWarmLimestone);
    dado.position.set(wx, 0.92, 0);
    rootGroup.add(dado);

    const brassLine = new THREE.Mesh(dadoBrassGeo, matChampagneGold);
    brassLine.position.set(wx, 0.96, 0);
    rootGroup.add(brassLine);
  });

  const northDadoRail = new THREE.Mesh(
    track(new THREE.BoxGeometry(roomW - 0.8, 0.065, 0.06)),
    matWarmLimestone,
  );
  northDadoRail.position.set(0, 0.92, -halfD + 0.225);
  rootGroup.add(northDadoRail);

  const northDadoBrass = new THREE.Mesh(
    track(new THREE.BoxGeometry(roomW - 0.8, 0.022, 0.07)),
    matChampagneGold,
  );
  northDadoBrass.position.set(0, 0.96, -halfD + 0.225);
  rootGroup.add(northDadoBrass);

  const southWingDadoGeo = track(new THREE.BoxGeometry(4.7, 0.065, 0.06));
  const southWingBrassGeo = track(new THREE.BoxGeometry(4.7, 0.022, 0.07));
  [-4.25, 4.25].forEach((sx) => {
    const sDado = new THREE.Mesh(southWingDadoGeo, matWarmLimestone);
    sDado.position.set(sx, 0.92, halfD - 0.225);
    rootGroup.add(sDado);

    const sBrass = new THREE.Mesh(southWingBrassGeo, matChampagneGold);
    sBrass.position.set(sx, 0.96, halfD - 0.225);
    rootGroup.add(sBrass);
  });

  // Recessed Architectural Wall Niche Frames on West & East Gallery Bays (z = -2.4, z = +1.8)
  const bayCentersZ = [-2.4, 1.8];
  bayCentersZ.forEach((bz) => {
    [-1, 1].forEach((sideSign) => {
      const wallX = sideSign * (halfW - 0.235);
      const nicheBack = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.03, 2.65, 2.75)),
        matWalnut,
      );
      nicheBack.position.set(wallX, 2.38, bz);
      rootGroup.add(nicheBack);

      const nicheTopBrass = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.06, 0.05, 2.82)),
        matChampagneGold,
      );
      nicheTopBrass.position.set(wallX - sideSign * 0.015, 3.72, bz);
      rootGroup.add(nicheTopBrass);

      const nicheLed = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.04, 0.03, 2.7)),
        matWarmEmissiveStrip,
      );
      nicheLed.position.set(wallX - sideSign * 0.02, 3.68, bz);
      rootGroup.add(nicheLed);
    });
  });

  // South Entrance/Exit Wall split around 3.0m central Arched Doorway (x in [-1.5, +1.5])
  const southWingGeo = track(new THREE.BoxGeometry(5.5, roomH, 0.44));
  const southWestWall = new THREE.Mesh(southWingGeo, matPrimaryWall);
  southWestWall.position.set(-4.25, roomH * 0.5, halfD);
  rootGroup.add(southWestWall);
  solidWallMeshes.push(southWestWall);
  cameraObstacleMeshes.push(southWestWall);

  const southEastWall = new THREE.Mesh(southWingGeo, matPrimaryWall);
  southEastWall.position.set(4.25, roomH * 0.5, halfD);
  rootGroup.add(southEastWall);
  solidWallMeshes.push(southEastWall);
  cameraObstacleMeshes.push(southEastWall);

  const southOverDoorHeader = new THREE.Mesh(
    track(new THREE.BoxGeometry(3.6, 1.35, 0.46)),
    matPrimaryWall,
  );
  southOverDoorHeader.position.set(0, roomH - 0.675, halfD);
  rootGroup.add(southOverDoorHeader);
  solidWallMeshes.push(southOverDoorHeader);
  cameraObstacleMeshes.push(southOverDoorHeader);

  // Dedicated Entrance Sconce & Threshold Welcome Emissive Material (for entrance animation step 3)
  const matEntranceSconceGlow = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFCF6'),
      emissive: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
      emissiveIntensity: 0.95,
      roughness: 0.18,
    }),
  );

  // Classical Sculpted Limestone Arched Entrance Surround on South Wall
  const roomArchShape = new THREE.Shape();
  roomArchShape.moveTo(-2.1, 0);
  roomArchShape.lineTo(2.1, 0);
  roomArchShape.lineTo(2.1, 4.45);
  roomArchShape.lineTo(-2.1, 4.45);
  roomArchShape.closePath();

  const roomArchHole = new THREE.Path();
  roomArchHole.moveTo(-1.52, 0);
  roomArchHole.lineTo(-1.52, 2.75);
  roomArchHole.absarc(0, 2.75, 1.52, Math.PI, 0, true);
  roomArchHole.lineTo(1.52, 0);
  roomArchHole.closePath();
  roomArchShape.holes.push(roomArchHole);

  const roomArchGeo = track(
    new THREE.ExtrudeGeometry(roomArchShape, {
      depth: 0.56,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    }),
  );
  roomArchGeo.translate(0, 0, -0.28);
  const roomArchSurround = new THREE.Mesh(roomArchGeo, matWarmLimestone);
  roomArchSurround.position.set(0, 0, halfD - 0.04);
  roomArchSurround.castShadow = true;
  roomArchSurround.receiveShadow = true;
  rootGroup.add(roomArchSurround);

  // South Exit Archway Jamb Colliders & Integrated Brushed-Brass Doorframe Sconces
  const exitJambGeo = track(new THREE.BoxGeometry(0.38, 4.25, 0.54));
  [-1.68, 1.68].forEach((jx) => {
    const jamb = new THREE.Mesh(exitJambGeo, matWalnut);
    jamb.position.set(jx, 2.125, halfD - 0.04);
    rootGroup.add(jamb);
    solidWallMeshes.push(jamb);
    cameraObstacleMeshes.push(jamb);

    const sconceBack = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.14, 1.24, 0.04)),
      matChampagneGold,
    );
    sconceBack.position.set(jx, 2.15, halfD - 0.33);
    rootGroup.add(sconceBack);

    const sconce = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.08, 1.12, 0.06)),
      matEntranceSconceGlow,
    );
    sconce.position.set(jx, 2.15, halfD - 0.35);
    rootGroup.add(sconce);
  });

  // Warm illuminated welcome threshold strip flush inside the room entrance archway
  const entranceThresholdBar = new THREE.Mesh(
    track(new THREE.BoxGeometry(3.04, 0.016, 0.08)),
    matEntranceSconceGlow,
  );
  entranceThresholdBar.position.set(0, 0.009, halfD - 0.26);
  rootGroup.add(entranceThresholdBar);

  const exitLintel = new THREE.Mesh(
    track(new THREE.BoxGeometry(4.28, 0.24, 0.62)),
    matChampagneGold,
  );
  exitLintel.position.set(0, 4.46, halfD - 0.04);
  rootGroup.add(exitLintel);
  cameraObstacleMeshes.push(exitLintel);

  const exitPlaqueTex = track(
    createTimelineDateNodeTexture(
      '← ATRIUM PROMENADE',
      MUSEUM_LUXURY_PALETTE.champagneGold,
      maxAnisotropy,
    ),
  );
  const exitPlaqueMesh = new THREE.Mesh(
    track(new THREE.PlaneGeometry(2.2, 0.48)),
    track(new THREE.MeshBasicMaterial({ map: exitPlaqueTex })),
  );
  exitPlaqueMesh.position.set(0, 4.82, halfD - 0.28);
  exitPlaqueMesh.rotation.y = Math.PI;
  rootGroup.add(exitPlaqueMesh);

  // Warm vestibule depth behind exit doorway
  const exitVestibuleBack = new THREE.Mesh(
    track(new THREE.BoxGeometry(3.4, 4.4, 0.2)),
    matWarmLimestone,
  );
  exitVestibuleBack.position.set(0, 2.2, halfD + 0.55);
  rootGroup.add(exitVestibuleBack);
  cameraObstacleMeshes.push(exitVestibuleBack);

  const exitArchHitbox = new THREE.Mesh(
    track(new THREE.BoxGeometry(3.2, 4.3, 0.9)),
    track(new THREE.MeshBasicMaterial({ visible: false })),
  );
  exitArchHitbox.position.set(0, 2.15, halfD - 0.15);
  exitArchHitbox.userData = { kind: 'room_interior_exit', roomId: room.id };
  rootGroup.add(exitArchHitbox);

  // Walnut Skirting Baseboards & Upper Crown Moulding
  const northSkirt = new THREE.Mesh(
    track(new THREE.BoxGeometry(roomW, 0.24, 0.52)),
    matWalnut,
  );
  northSkirt.position.set(0, 0.12, -halfD);
  rootGroup.add(northSkirt);

  const sideSkirtGeo = track(new THREE.BoxGeometry(0.52, 0.24, roomD));
  [-halfW, halfW].forEach((sx) => {
    const skirt = new THREE.Mesh(sideSkirtGeo, matWalnut);
    skirt.position.set(sx, 0.12, 0);
    rootGroup.add(skirt);
  });

  // Architectural Wall Pilasters with Brushed-Brass Capitals & Bases
  const pilasterGeo = track(new THREE.BoxGeometry(0.36, roomH, 0.36));
  const pilasterCapGeo = track(new THREE.BoxGeometry(0.44, 0.18, 0.44));
  const pilasterCoords: [number, number][] = [
    [-halfW + 0.2, -halfD + 0.2],
    [halfW - 0.2, -halfD + 0.2],
    [-halfW + 0.2, halfD - 0.2],
    [halfW - 0.2, halfD - 0.2],
    [-halfW + 0.2, -1.6],
    [-halfW + 0.2, 1.6],
    [halfW - 0.2, -1.6],
    [halfW - 0.2, 1.6],
  ];
  pilasterCoords.forEach(([px, pz]) => {
    const pil = new THREE.Mesh(pilasterGeo, matWalnut);
    pil.position.set(px, roomH * 0.5, pz);
    rootGroup.add(pil);
    cameraObstacleMeshes.push(pil);

    const cap = new THREE.Mesh(pilasterCapGeo, matChampagneGold);
    cap.position.set(px, roomH - 0.12, pz);
    rootGroup.add(cap);

    const base = new THREE.Mesh(pilasterCapGeo, matChampagneGold);
    base.position.set(px, 0.12, pz);
    rootGroup.add(base);
  });

  // Coffered Ceiling Slab, Architectural Walnut Cross-Beams & Recessed Skylight Well
  const matCeiling = track(
    new THREE.MeshStandardMaterial({
      map: limestoneTex,
      normalMap: limestonePBR.normalMap,
      normalScale: new THREE.Vector2(0.06, 0.06),
      roughnessMap: limestonePBR.roughnessMap,
      color: new THREE.Color('#FAF5EC'),
      roughness: 0.72,
      metalness: 0.02,
      envMapIntensity: 0.24,
    }),
  );
  const ceilingSlab = new THREE.Mesh(
    track(new THREE.BoxGeometry(roomW + 0.8, 0.28, roomD + 0.8)),
    matCeiling,
  );
  ceilingSlab.position.set(0, roomH + 0.14, 0);
  rootGroup.add(ceilingSlab);
  cameraObstacleMeshes.push(ceilingSlab);

  const cofferBeamEW = track(new THREE.BoxGeometry(roomW - 0.4, 0.18, 0.28));
  [-4.2, 3.0].forEach((cz) => {
    const beam = new THREE.Mesh(cofferBeamEW, matWalnut);
    beam.position.set(0, roomH - 0.09, cz);
    rootGroup.add(beam);
  });
  const cofferBeamNS = track(new THREE.BoxGeometry(0.28, 0.18, roomD - 0.4));
  [-3.45, 3.45].forEach((cx) => {
    const beam = new THREE.Mesh(cofferBeamNS, matWalnut);
    beam.position.set(cx, roomH - 0.09, 0);
    rootGroup.add(beam);
  });

  const skylightDiffuser = new THREE.Mesh(
    track(new THREE.PlaneGeometry(6.6, 6.9)),
    matWarmEmissiveStrip,
  );
  skylightDiffuser.rotation.x = Math.PI / 2;
  skylightDiffuser.position.set(0, roomH - 0.02, -0.6);
  rootGroup.add(skylightDiffuser);

  // 6 Symmetrical Recessed Brushed-Brass Ceiling Downlights
  const downlightBezelGeo = track(
    new THREE.CylinderGeometry(0.18, 0.18, 0.04, 20),
  );
  const downlightLensGeo = track(
    new THREE.CylinderGeometry(0.13, 0.13, 0.05, 20),
  );
  [
    [-4.8, -3.6],
    [4.8, -3.6],
    [-4.8, 0],
    [4.8, 0],
    [-4.8, 3.6],
    [4.8, 3.6],
  ].forEach(([dx, dz]) => {
    const bezel = new THREE.Mesh(downlightBezelGeo, matChampagneGold);
    bezel.position.set(dx, roomH - 0.02, dz);
    rootGroup.add(bezel);

    const lens = new THREE.Mesh(downlightLensGeo, matWarmEmissiveStrip);
    lens.position.set(dx, roomH - 0.025, dz);
    rootGroup.add(lens);
  });

  // Concealed Linear Ceiling Cove LED Strips
  const ledStripNS = track(new THREE.BoxGeometry(0.08, 0.05, roomD - 1.4));
  [-halfW + 0.45, halfW - 0.45].forEach((lx) => {
    const strip = new THREE.Mesh(ledStripNS, matWarmEmissiveStrip);
    strip.position.set(lx, roomH - 0.08, 0);
    rootGroup.add(strip);
  });
  const ledStripEW = track(new THREE.BoxGeometry(roomW - 1.4, 0.05, 0.08));
  const northCoveStrip = new THREE.Mesh(ledStripEW, matWarmEmissiveStrip);
  northCoveStrip.position.set(0, roomH - 0.08, -halfD + 0.45);
  rootGroup.add(northCoveStrip);

  // Room Architectural Lighting (Unified with Atrium Golden Hour exposure & room atmosphere presets)
  let activeAtmospherePreset: AtmospherePresetId =
    room.designConfig?.atmospherePreset || 'golden_hour';
  let studioLightIntensityOverride: number | null =
    typeof room.designConfig?.studioCustomization?.lightIntensity === 'number'
      ? room.designConfig.studioCustomization.lightIntensity
      : null;
  const initRigTargets = computeRoomLightingRigTargets(
    activeAtmospherePreset,
    atriumMood,
  );

  const roomHemiLight = new THREE.HemisphereLight(
    initRigTargets.hemiSkyHex,
    initRigTargets.hemiGroundHex,
    initRigTargets.hemiIntensity,
  );
  roomHemiLight.position.set(0, roomH, 0);
  rootGroup.add(roomHemiLight);

  const centerCeilingLight = new THREE.PointLight(
    initRigTargets.centerColorHex,
    studioLightIntensityOverride ?? initRigTargets.centerIntensity,
    19,
    1.32,
  );
  centerCeilingLight.position.set(0, roomH - 0.5, -1.0);
  rootGroup.add(centerCeilingLight);

  const northWallWasher = new THREE.PointLight(
    initRigTargets.northColorHex,
    initRigTargets.northIntensity,
    15,
    1.35,
  );
  northWallWasher.position.set(0, roomH - 0.7, -4.6);
  rootGroup.add(northWallWasher);

  const isPerfRoomProfile =
    qualityConfig.profileId === 'desktop_performance' ||
    qualityConfig.profileId === 'mobile_performance';

  const westWallWasher = new THREE.PointLight(
    0xffe5bd,
    initRigTargets.sideWashIntensity,
    13,
    1.4,
  );
  westWallWasher.position.set(-4.3, roomH - 0.85, -0.4);
  if (!isPerfRoomProfile) {
    rootGroup.add(westWallWasher);
  }

  const eastWallWasher = new THREE.PointLight(
    0xffe5bd,
    initRigTargets.sideWashIntensity,
    13,
    1.4,
  );
  eastWallWasher.position.set(4.3, roomH - 0.85, -0.4);
  if (!isPerfRoomProfile) {
    rootGroup.add(eastWallWasher);
  }

  const southEntryLight = new THREE.PointLight(
    0xffe2b5,
    initRigTargets.southEntryIntensity,
    13,
    1.35,
  );
  southEntryLight.position.set(0, roomH - 0.8, 4.5);
  rootGroup.add(southEntryLight);

  // Grand South Entrance Archway Frame & Illuminated Tympanum Header ("Childhood Memories Room")
  // Anchored cleanly above the South Entrance portal (z = halfD - 0.28, facing North into the room)
  // instead of floating at an angle in mid-air.
  const southPortalColumnsGroup = new THREE.Group();
  southPortalColumnsGroup.name = 'south_entrance_portal_frame';
  southPortalColumnsGroup.position.set(0, 0, halfD - 0.28);
  rootGroup.add(southPortalColumnsGroup);

  [-1.92, 1.92].forEach((px) => {
    const colShaft = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.13, 0.15, 3.85, 20)),
      matWarmLimestone,
    );
    colShaft.position.set(px, 1.98, 0);
    southPortalColumnsGroup.add(colShaft);
    cameraObstacleMeshes.push(colShaft);

    const colBase = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.38, 0.22, 0.36)),
      matWalnut,
    );
    colBase.position.set(px, 0.11, 0);
    southPortalColumnsGroup.add(colBase);

    const colCap = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.42, 0.16, 0.38)),
      matChampagneGold,
    );
    colCap.position.set(px, 3.92, 0);
    southPortalColumnsGroup.add(colCap);
  });

  const thresholdBrassPlate = new THREE.Mesh(
    track(new THREE.BoxGeometry(2.88, 0.016, 0.42)),
    matChampagneGold,
  );
  thresholdBrassPlate.position.set(0, 0.008, 0.04);
  southPortalColumnsGroup.add(thresholdBrassPlate);

  const tympanumTex = track(
    createArchedRoomTympanumTexture(
      room.name || categoryDetection.profile.label,
      categoryDetection.categoryKey,
      room.designConfig?.accentColorHex || room.accentColor,
      maxAnisotropy,
    ),
  );
  const tympanumMat = track(
    new THREE.MeshBasicMaterial({
      map: tympanumTex,
      transparent: true,
    }),
  );
  const westTympanumGroup = new THREE.Group();
  westTympanumGroup.name = 'arched_room_tympanum_header';
  westTympanumGroup.position.set(0, 4.46, halfD - 0.28);
  westTympanumGroup.rotation.y = Math.PI;
  rootGroup.add(westTympanumGroup);

  const westTympanumMesh = new THREE.Mesh(
    track(new THREE.PlaneGeometry(3.45, 1.62)),
    tympanumMat,
  );
  westTympanumGroup.add(westTympanumMesh);

  // Glowing golden arch surround moulding around the entrance tympanum
  const tympanumArchRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(1.68, 0.036, 14, 36, Math.PI)),
    matWarmEmissiveStrip,
  );
  tympanumArchRing.position.set(0, -0.74, 0.02);
  westTympanumGroup.add(tympanumArchRing);

  const tympanumBaseMold = new THREE.Mesh(
    track(new THREE.BoxGeometry(3.52, 0.08, 0.08)),
    matChampagneGold,
  );
  tympanumBaseMold.position.set(0, -0.8, 0.02);
  westTympanumGroup.add(tympanumBaseMold);

  const headerBannerTex = track(
    createRoomHeaderBannerTexture(
      room.name,
      palette.themeLabel,
      styleMeta.badge,
      room.curatorQuote || themeProfile.decorativeNote,
      room.accentColor,
      maxAnisotropy,
    ),
  );
  const headerBannerMesh = new THREE.Mesh(
    track(new THREE.PlaneGeometry(5.2, 1.08)),
    track(new THREE.MeshBasicMaterial({ map: headerBannerTex })),
  );
  headerBannerMesh.position.set(0, 4.58, -halfD + 0.25);
  headerBannerMesh.visible = !isChildhoodPark;
  rootGroup.add(headerBannerMesh);

  // Back-Left & Back-Center Illuminated Wooden Bookcases with Books & Cascading Ivy (matching reference background)
  const bookSpineColors = [
    '#9E332E',
    '#2F5478',
    '#3E6B48',
    '#C88A36',
    '#6B4376',
    '#B55338',
  ];
  const bookSpineMats = bookSpineColors.map((hex) =>
    track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.65,
      }),
    ),
  );
  [-4.6, -2.35].forEach((bx) => {
    const bookcaseGroup = new THREE.Group();
    bookcaseGroup.position.set(bx, 0, -halfD + 0.42);
    rootGroup.add(bookcaseGroup);

    const caseFrame = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.68, 3.25, 0.38)),
      matWalnut,
    );
    caseFrame.position.set(0, 1.625, 0);
    bookcaseGroup.add(caseFrame);
    cameraObstacleMeshes.push(caseFrame);

    const caseCrown = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.78, 0.1, 0.44)),
      matChampagneGold,
    );
    caseCrown.position.set(0, 3.28, 0);
    bookcaseGroup.add(caseCrown);

    [0.75, 1.38, 2.02, 2.65].forEach((sy, sIdx) => {
      const shelf = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.56, 0.04, 0.36)),
        matChampagneGold,
      );
      shelf.position.set(0, sy, 0.02);
      bookcaseGroup.add(shelf);

      const shelfGlow = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.48, 0.02, 0.04)),
        matWarmEmissiveStrip,
      );
      shelfGlow.position.set(0, sy + 0.56, 0.16);
      bookcaseGroup.add(shelfGlow);

      for (let b = 0; b < 7; b++) {
        const bw = 0.065 + (b % 3) * 0.015;
        const bh = 0.28 + ((b + sIdx) % 3) * 0.05;
        const bookMesh = new THREE.Mesh(
          track(new THREE.BoxGeometry(bw, bh, 0.22)),
          bookSpineMats[(b + sIdx * 2) % bookSpineMats.length],
        );
        bookMesh.position.set(
          -0.58 + b * 0.19,
          sy + 0.02 + bh * 0.5,
          0.05,
        );
        bookcaseGroup.add(bookMesh);
      }
    });
  });

  // Tall Arched Multi-Pane Sunlit Windows on Right Side & Clerestory (with outdoor green foliage & warm sunbeams)
  const matSunlightWindowGlow = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFDF7'),
      emissive: new THREE.Color('#FFE4AD'),
      emissiveIntensity: 0.96,
      roughness: 0.12,
    }),
  );
  const matWindowCurtains = track(
    new THREE.MeshStandardMaterial({
      map: boucleTex,
      color: new THREE.Color('#E6D7C3'),
      roughness: 0.85,
      metalness: 0.02,
    }),
  );
  const windowCurtainGroups: THREE.Group[] = [];
  [
    { x: halfW - 0.24, y: 3.55, z: -2.5, rotY: -Math.PI / 2, w: 2.25, h: 2.45 },
    { x: halfW - 0.24, y: 3.55, z: 2.15, rotY: -Math.PI / 2, w: 2.25, h: 2.45 },
    { x: 2.95, y: 4.35, z: -halfD + 0.24, rotY: 0, w: 2.35, h: 1.45 },
  ].forEach((win) => {
    const winGroup = new THREE.Group();
    winGroup.position.set(win.x, win.y, win.z);
    winGroup.rotation.y = win.rotY;
    rootGroup.add(winGroup);

    const frame = new THREE.Mesh(
      track(new THREE.BoxGeometry(win.w, win.h, 0.07)),
      matWalnut,
    );
    winGroup.add(frame);

    const goldArchTrim = new THREE.Mesh(
      track(new THREE.BoxGeometry(win.w + 0.06, win.h + 0.06, 0.04)),
      matChampagneGold,
    );
    goldArchTrim.position.z = -0.01;
    winGroup.add(goldArchTrim);

    const pane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(win.w - 0.18, win.h - 0.18)),
      matSunlightWindowGlow,
    );
    pane.position.z = 0.04;
    winGroup.add(pane);

    // Mullion grid bars matching the tall arched multi-pane windows in the reference image
    [-win.w * 0.24, 0, win.w * 0.24].forEach((mx) => {
      const vBar = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.032, win.h - 0.16, 0.085)),
        matWalnut,
      );
      vBar.position.set(mx, 0, 0.015);
      winGroup.add(vBar);
    });
    [-win.h * 0.22, 0, win.h * 0.22].forEach((my) => {
      const hBar = new THREE.Mesh(
        track(new THREE.BoxGeometry(win.w - 0.16, 0.032, 0.085)),
        matWalnut,
      );
      hBar.position.set(0, my, 0.015);
      winGroup.add(hBar);
    });

    // Draped Window Curtains (Left & Right panels + brass curtain rod)
    const curtainSubGroup = new THREE.Group();
    curtainSubGroup.name = 'window_curtain_pair';
    winGroup.add(curtainSubGroup);
    windowCurtainGroups.push(curtainSubGroup);

    const curtainRod = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.018, 0.018, win.w + 0.36, 12)),
      matChampagneGold,
    );
    curtainRod.rotation.z = Math.PI / 2;
    curtainRod.position.set(0, win.h * 0.5 + 0.08, 0.08);
    curtainSubGroup.add(curtainRod);

    [-win.w * 0.44, win.w * 0.44].forEach((cx) => {
      const drape = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.34, win.h + 0.18, 0.06)),
        matWindowCurtains,
      );
      drape.position.set(cx, -0.02, 0.08);
      curtainSubGroup.add(drape);
    });
  });

  // Group for all botanical plants & hanging ivy (toggled via showPlants)
  const botanicalPlantsGroup = new THREE.Group();
  botanicalPlantsGroup.name = 'customizable_plants_group';
  rootGroup.add(botanicalPlantsGroup);

  // Cascading Botanical Ivy Clusters along upper cornices, pilasters & bookcases
  const ivyLeafGeo = track(new THREE.DodecahedronGeometry(0.16, 1));
  [
    [-halfW + 0.35, 3.92, -4.2],
    [-halfW + 0.35, 3.92, -0.4],
    [-3.45, 3.45, -halfD + 0.55],
    [halfW - 0.35, 3.92, -4.2],
    [halfW - 0.35, 3.92, -0.4],
  ].forEach(([ix, iy, iz]) => {
    for (let v = 0; v < 6; v++) {
      const ivyCluster = new THREE.Mesh(
        ivyLeafGeo,
        v % 2 === 0 ? matFoliage : matSageLeafAccent,
      );
      ivyCluster.position.set(
        ix,
        iy - v * 0.14,
        iz + (v - 2.5) * 0.14,
      );
      botanicalPlantsGroup.add(ivyCluster);
    }
  });

  // =========================================================================
  // 2. FOUR ARCHITECTURAL BOTANICAL PLANTERS IN CORNERS (Sculpted Limestone, Moss Soil & Bark)
  // =========================================================================
  const planterSegs = Math.max(16, Math.min(28, qualityConfig.cylinderSegments));
  const planterBaseGeo = track(new THREE.CylinderGeometry(0.42, 0.34, 0.74, planterSegs));
  const planterRimGeo = track(new THREE.TorusGeometry(0.41, 0.025, 12, planterSegs));
  const planterSoilGeo = track(new THREE.CircleGeometry(0.39, planterSegs));
  const trunkGeo = track(new THREE.CylinderGeometry(0.055, 0.08, 0.72, 10));
  const canopyMainGeo = track(new THREE.DodecahedronGeometry(0.44, 1));
  const canopySecondaryGeo = track(new THREE.DodecahedronGeometry(0.3, 1));
  [
    [-5.85, -5.95],
    [5.85, -5.95],
    [-5.85, 5.85],
    [5.85, 5.85],
  ].forEach(([px, pz]) => {
    const pot = new THREE.Mesh(planterBaseGeo, matWarmLimestone);
    pot.position.set(px, 0.37, pz);
    pot.castShadow = qualityConfig.enableShadows;
    pot.receiveShadow = true;
    botanicalPlantsGroup.add(pot);

    const brassRim = new THREE.Mesh(planterRimGeo, matChampagneGold);
    brassRim.rotation.x = Math.PI / 2;
    brassRim.position.set(px, 0.74, pz);
    botanicalPlantsGroup.add(brassRim);

    const potSoil = new THREE.Mesh(planterSoilGeo, matMossBed);
    potSoil.rotation.x = -Math.PI / 2;
    potSoil.position.set(px, 0.735, pz);
    botanicalPlantsGroup.add(potSoil);

    const trunk = new THREE.Mesh(trunkGeo, matTreeBark);
    trunk.position.set(px, 0.96, pz);
    botanicalPlantsGroup.add(trunk);

    const mainCanopy = new THREE.Mesh(canopyMainGeo, matFoliage);
    mainCanopy.position.set(px, 1.42, pz);
    mainCanopy.castShadow = qualityConfig.enableShadows;
    botanicalPlantsGroup.add(mainCanopy);

    const accentCanopy = new THREE.Mesh(canopySecondaryGeo, matSageLeafAccent);
    accentCanopy.position.set(
      px + (px < 0 ? 0.18 : -0.18),
      1.66,
      pz + (pz < 0 ? 0.14 : -0.14),
    );
    botanicalPlantsGroup.add(accentCanopy);
  });

  // =========================================================================
  // 3. STYLE-SPECIFIC ARCHITECTURAL ACCENTS
  // =========================================================================
  if (effectiveStyle === 'floating_exhibition') {
    const beamGeo = track(new THREE.BoxGeometry(0.12, 0.14, roomD - 2.2));
    [-2.95, 0, 2.95].forEach((bx) => {
      const beam = new THREE.Mesh(beamGeo, matChampagneGold);
      beam.position.set(bx, roomH - 0.35, -0.5);
      rootGroup.add(beam);
    });
  } else if (effectiveStyle === 'timeline_wall') {
    const railMat = matChampagneGold;
    const northRail = new THREE.Mesh(
      track(new THREE.BoxGeometry(roomW - 0.8, 0.045, 0.045)),
      railMat,
    );
    northRail.position.set(0, 1.38, -halfD + 0.26);
    rootGroup.add(northRail);

    const sideRailGeo = track(new THREE.BoxGeometry(0.045, 0.045, roomD - 2.2));
    [-halfW + 0.26, halfW - 0.26].forEach((rx) => {
      const sRail = new THREE.Mesh(sideRailGeo, railMat);
      sRail.position.set(rx, 1.38, -0.4);
      rootGroup.add(sRail);
    });
  } else if (effectiveStyle === 'immersive_panorama') {
    const cycGeo = track(
      new THREE.CylinderGeometry(
        5.52,
        5.52,
        3.9,
        48,
        1,
        true,
        Math.PI * 0.62,
        Math.PI * 0.76,
      ),
    );
    const cycWall = new THREE.Mesh(
      cycGeo,
      track(
        new THREE.MeshStandardMaterial({
          map: limestoneTex,
          color: new THREE.Color(palette.featureWallHex),
          roughness: 0.56,
          side: THREE.DoubleSide,
        }),
      ),
    );
    cycWall.position.set(0, 2.35, -1.2);
    rootGroup.add(cycWall);
    cameraObstacleMeshes.push(cycWall);
  }

  const bedroomMats = createChildhoodBedroomMaterialLibrary(maxAnisotropy, track);
  const allowBedroomShadows =
    !qualityConfig.isSoftwareGl &&
    qualityConfig.profileId !== 'desktop_performance' &&
    qualityConfig.profileId !== 'mobile_performance';

  // Only the Childhood category becomes an open-air park. Other categories keep
  // the original museum architecture and render order completely unchanged.
  let parkSeesawPivot: THREE.Object3D | null = null;
  let bedroomSunDustPoints: THREE.Points | null = null;
  let bedroomSunDustBasePos: Float32Array | null = null;
  const galleryHemiScale = isChildhoodPark ? 0.34 : 1.0;
  const galleryLightScale = isChildhoodPark ? 0.16 : 1.0;
  if (isChildhoodPark) {
    // Keep all room lights and the South entrance/exit archway in rootGroup so they
    // are never disabled by roomArchitectureGroup.visible = false.
    const keepInRootObjects = new Set<THREE.Object3D>([
      exitArchHitbox,
      roomHemiLight,
      centerCeilingLight,
      northWallWasher,
      westWallWasher,
      eastWallWasher,
      southEntryLight,
      southPortalColumnsGroup,
      westTympanumGroup,
      roomArchSurround,
      exitPlaqueMesh,
      entranceThresholdBar,
    ]);
    const architectureShellChildren = rootGroup.children.slice(architectureShellStartIndex);
    const roomArchitectureGroup = new THREE.Group();
    roomArchitectureGroup.name = `room_architecture_shell_${room.id}`;
    const hiddenShellObjects = new Set<THREE.Object3D>();
    architectureShellChildren.forEach((child) => {
      if (keepInRootObjects.has(child) || (child as THREE.Light).isLight) {
        return;
      }
      rootGroup.remove(child);
      roomArchitectureGroup.add(child);
      hiddenShellObjects.add(child);
    });
    roomArchitectureGroup.visible = false;
    rootGroup.add(roomArchitectureGroup);

    // Hidden gallery walls must not continue blocking the park camera.
    for (let i = solidWallMeshes.length - 1; i >= 0; i--) {
      if (hiddenShellObjects.has(solidWallMeshes[i])) solidWallMeshes.splice(i, 1);
    }
    for (let i = cameraObstacleMeshes.length - 1; i >= 0; i--) {
      if (hiddenShellObjects.has(cameraObstacleMeshes[i])) cameraObstacleMeshes.splice(i, 1);
    }

    // Dial back generic museum-gallery ceiling washers in the Childhood Bedroom so
    // the golden-hour directional window light, warm study lamp & accent spotlights
    // sculpt crisp soft shadows without washing out walls or oak floorboards.
    roomHemiLight.intensity = initRigTargets.hemiIntensity * galleryHemiScale;
    centerCeilingLight.intensity =
      (studioLightIntensityOverride ?? initRigTargets.centerIntensity) * galleryLightScale;
    northWallWasher.intensity = initRigTargets.northIntensity * galleryLightScale;
    westWallWasher.intensity = initRigTargets.sideWashIntensity * galleryLightScale;
    eastWallWasher.intensity = initRigTargets.sideWashIntensity * galleryLightScale;
    southEntryLight.intensity = initRigTargets.southEntryIntensity * galleryLightScale;

    // -----------------------------------------------------------------------
    // CHILDHOOD BEDROOM GOLDEN-HOUR LIGHTING RIG
    // Warm golden-hour window light (#FFE5BE) + soft ambient fill (#F6EFE2) +
    // subtle accent spotlights over trophy shelf, cork pinboard & study desk.
    // -----------------------------------------------------------------------
    const goldenHourWindowLight = new THREE.DirectionalLight('#FFE5BE', 2.15);
    goldenHourWindowLight.position.set(-0.85, 5.2, -9.4);
    goldenHourWindowLight.target.position.set(-4.35, 0.85, 0.45);
    rootGroup.add(goldenHourWindowLight.target);
    goldenHourWindowLight.castShadow = allowBedroomShadows;
    const bedroomShadowSize = qualityConfig.tier === 'mobile' ? 1024 : 2048;
    goldenHourWindowLight.shadow.mapSize.set(bedroomShadowSize, bedroomShadowSize);
    goldenHourWindowLight.shadow.camera.left = -7.6;
    goldenHourWindowLight.shadow.camera.right = 7.6;
    goldenHourWindowLight.shadow.camera.top = 7.6;
    goldenHourWindowLight.shadow.camera.bottom = -7.6;
    goldenHourWindowLight.shadow.camera.near = 1.5;
    goldenHourWindowLight.shadow.camera.far = 22;
    goldenHourWindowLight.shadow.bias = -0.00025;
    goldenHourWindowLight.shadow.normalBias = 0.018;
    goldenHourWindowLight.shadow.radius = 3.2;
    rootGroup.add(goldenHourWindowLight);

    const bedroomAmbientFill = new THREE.AmbientLight('#F6EFE2', 0.38);
    rootGroup.add(bedroomAmbientFill);

    const bedroomInteriorBounce = new THREE.PointLight('#FFE8C4', 0.48, 12.0, 1.5);
    bedroomInteriorBounce.position.set(-4.15, 2.75, 1.1);
    bedroomInteriorBounce.castShadow = false;
    rootGroup.add(bedroomInteriorBounce);

    const addAccentSpotlight = (
      from: [number, number, number],
      to: [number, number, number],
      intensity: number,
      angle = 0.56,
    ) => {
      const spot = new THREE.SpotLight('#FFE6BC', intensity, 5.8, angle, 0.72, 1.6);
      spot.position.set(from[0], from[1], from[2]);
      spot.target.position.set(to[0], to[1], to[2]);
      spot.castShadow = false;
      rootGroup.add(spot.target);
      rootGroup.add(spot);

      // Subtle architectural brass mini-spotlight fixture mounted at the light source
      const fixtureGroup = new THREE.Group();
      fixtureGroup.position.set(from[0], from[1], from[2]);
      fixtureGroup.lookAt(to[0], to[1], to[2]);
      const can = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.028, 0.036, 0.085, 12)),
        bedroomMats.matPolishedBrass,
      );
      can.rotation.x = Math.PI / 2;
      fixtureGroup.add(can);
      const lens = new THREE.Mesh(
        track(new THREE.CircleGeometry(0.026, 12)),
        track(
          new THREE.MeshBasicMaterial({
            color: '#FFF1D2',
          }),
        ),
      );
      lens.position.z = 0.044;
      fixtureGroup.add(lens);
      rootGroup.add(fixtureGroup);
    };
    // Subtle accent spotlight over Trophy & Certificate Shelf
    addAccentSpotlight([-5.25, 3.05, 1.38], [-6.42, 1.38, 1.38], 1.55, 0.54);
    // Subtle accent spotlight over Cork Pinboard
    addAccentSpotlight([-3.55, 3.02, -5.05], [-3.55, 1.42, -6.28], 1.45, 0.58);
    // Subtle accent spotlight over Study Desk & Retro PC
    addAccentSpotlight([-4.55, 3.02, -3.75], [-5.25, 0.92, -4.65], 1.45, 0.56);

    // -----------------------------------------------------------------------
    // CHILDHOOD BEDROOM ALCOVE ARCHITECTURE
    // Warm honey-oak floorboards (#B48452) + warm linen-plaster walls (#EAE2D3)
    // + cream baseboards, dado chair rail, crown molding & open window cutout (#F4EFE6)
    // -----------------------------------------------------------------------
    const bedroomArchGroup = new THREE.Group();
    bedroomArchGroup.name = 'childhood_bedroom_alcove_architecture';
    rootGroup.add(bedroomArchGroup);

    const addArchBox = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: THREE.Material,
      opts?: { cast?: boolean; receive?: boolean; cameraObstacle?: boolean },
    ) => {
      const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), mat);
      m.position.set(x, y, z);
      m.castShadow = opts?.cast ?? false;
      m.receiveShadow = opts?.receive ?? true;
      bedroomArchGroup.add(m);
      if (opts?.cameraObstacle) cameraObstacleMeshes.push(m);
      return m;
    };

    // Honey-Oak Floorboard Deck (sits at y = 0.016 above park meadow, clears circular toy train track at x = -1.62)
    addArchBox(5.06, 0.024, 13.18, -4.31, 0.004, -0.07, bedroomMats.matHoneyOakFloor, {
      cast: false,
      receive: true,
    });
    // North window alcove floor bay (x: -1.78 .. -0.94, z: -6.66 .. -4.30)
    addArchBox(0.84, 0.024, 2.36, -1.36, 0.004, -5.48, bedroomMats.matHoneyOakFloor, {
      cast: false,
      receive: true,
    });
    // South alcove floor bay under vintage TV & memory radio (x: -1.78 .. -1.24, z: 2.20 .. 6.52)
    addArchBox(0.54, 0.024, 4.32, -1.51, 0.004, 4.36, bedroomMats.matHoneyOakFloor, {
      cast: false,
      receive: true,
    });
    // Subtle beveled oak floor threshold border along open edge
    addArchBox(0.06, 0.018, 6.5, -1.77, 0.009, -1.05, bedroomMats.matBedWalnut, {
      cast: false,
      receive: true,
    });

    const alcoveWallH = 3.36;
    const wallT = 0.12;
    // West Linen-Plaster Wall (inner face at x = -6.78, z: -6.68 .. 6.52)
    addArchBox(wallT, alcoveWallH, 13.26, -6.84, alcoveWallH * 0.5, -0.08, bedroomMats.matLinenWall, {
      cast: true,
      receive: true,
      cameraObstacle: true,
    });
    // West Wall Cream Trim: Baseboard, Chair Rail & Crown Molding
    addArchBox(0.03, 0.14, 13.16, -6.765, 0.086, -0.08, bedroomMats.matCreamTrim, { receive: true });
    addArchBox(0.035, 0.055, 13.16, -6.762, 0.94, -0.08, bedroomMats.matCreamTrim, { receive: true });
    addArchBox(0.07, 0.11, 13.22, -6.745, alcoveWallH - 0.055, -0.08, bedroomMats.matCreamTrim, {
      cast: true,
      receive: true,
    });

    // South-West Linen-Plaster Wall (inner face at z = 6.48, x: -6.84 .. -1.22)
    addArchBox(5.68, alcoveWallH, wallT, -4.03, alcoveWallH * 0.5, 6.54, bedroomMats.matLinenWall, {
      cast: true,
      receive: true,
      cameraObstacle: true,
    });
    addArchBox(5.6, 0.14, 0.03, -4.02, 0.086, 6.465, bedroomMats.matCreamTrim, { receive: true });
    addArchBox(5.6, 0.055, 0.035, -4.02, 0.94, 6.462, bedroomMats.matCreamTrim, { receive: true });
    addArchBox(5.66, 0.11, 0.07, -4.02, alcoveWallH - 0.055, 6.445, bedroomMats.matCreamTrim, {
      cast: true,
      receive: true,
    });
    // Finished vertical cream pilaster cap at SW wall open edge
    addArchBox(0.14, alcoveWallH, 0.15, -1.22, alcoveWallH * 0.5, 6.53, bedroomMats.matCreamTrim, {
      cast: true,
      receive: true,
    });

    // North-West Linen-Plaster Wall (inner face at z = -6.62, x: -6.84 .. -0.94)
    // Built with a genuine open architectural window cutout at x in [-2.78, -1.12], y in [0.96, 2.48]
    addArchBox(4.08, alcoveWallH, wallT, -4.82, alcoveWallH * 0.5, -6.68, bedroomMats.matLinenWall, {
      cast: true,
      receive: true,
      cameraObstacle: true,
    });
    addArchBox(0.22, alcoveWallH, wallT, -1.03, alcoveWallH * 0.5, -6.68, bedroomMats.matLinenWall, {
      cast: true,
      receive: true,
      cameraObstacle: true,
    });
    // Under-window sill wall & over-window lintel
    addArchBox(1.68, 0.96, wallT, -1.95, 0.48, -6.68, bedroomMats.matLinenWall, {
      cast: true,
      receive: true,
    });
    addArchBox(1.68, alcoveWallH - 2.48, wallT, -1.95, 2.48 + (alcoveWallH - 2.48) * 0.5, -6.68, bedroomMats.matLinenWall, {
      cast: true,
      receive: true,
    });
    // North-West Cream Baseboard, Chair Rail (left of window), Crown & Window Casing Sill/Trim
    addArchBox(5.86, 0.14, 0.03, -3.88, 0.086, -6.605, bedroomMats.matCreamTrim, { receive: true });
    addArchBox(4.02, 0.055, 0.035, -4.78, 0.94, -6.602, bedroomMats.matCreamTrim, { receive: true });
    addArchBox(5.92, 0.11, 0.07, -3.88, alcoveWallH - 0.055, -6.585, bedroomMats.matCreamTrim, {
      cast: true,
      receive: true,
    });
    // Cream window sill, lintel header & side jamb casings framing the sunlit park view
    addArchBox(1.86, 0.06, 0.2, -1.95, 0.95, -6.62, bedroomMats.matCreamTrim, { cast: true, receive: true });
    addArchBox(1.86, 0.075, 0.16, -1.95, 2.51, -6.64, bedroomMats.matCreamTrim, { cast: true, receive: true });
    addArchBox(0.075, 1.56, 0.16, -2.79, 1.72, -6.64, bedroomMats.matCreamTrim, { cast: true, receive: true });
    addArchBox(0.075, 1.56, 0.16, -1.11, 1.72, -6.64, bedroomMats.matCreamTrim, { cast: true, receive: true });
    // Finished vertical cream pilaster cap at NW wall open edge
    addArchBox(0.14, alcoveWallH, 0.15, -0.94, alcoveWallH * 0.5, -6.67, bedroomMats.matCreamTrim, {
      cast: true,
      receive: true,
    });

    // Soft grounded ambient-occlusion contact shadows beneath major bedroom furniture
    const contactShadowMat = track(
      new THREE.MeshBasicMaterial({
        map: bedroomMats.contactShadowTex,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
    );
    const addContactShadow = (x: number, z: number, w: number, d: number, rotY = 0) => {
      const cs = new THREE.Mesh(track(new THREE.PlaneGeometry(w, d)), contactShadowMat);
      cs.rotation.x = -Math.PI / 2;
      cs.rotation.z = rotY;
      cs.position.set(x, 0.0175, z);
      cs.castShadow = false;
      cs.receiveShadow = false;
      bedroomArchGroup.add(cs);
    };
    addContactShadow(-5.05, 3.65, 2.25, 1.72, 0); // Wooden Bed
    addContactShadow(-4.35, 6.08, 1.28, 0.78, 0); // Wardrobe
    addContactShadow(-5.85, 2.45, 0.66, 0.66, 0); // Nightstand
    addContactShadow(-2.95, 6.02, 1.05, 0.65, 0); // Vintage TV Stand
    addContactShadow(-5.25, -4.65, 1.65, 1.02, Math.PI * 0.36); // Study Desk
    addContactShadow(-6.56, -1.15, 0.72, 1.92, 0); // Childhood Bookshelf
    addContactShadow(-6.48, 1.38, 0.58, 1.56, 0); // Trophy Shelf

    // Subtle Golden-Hour Window Sunlight Shaft & Drifting Dust Motes streaming from NW Window
    const sunbeamMat = track(
      new THREE.MeshBasicMaterial({
        map: bedroomMats.sunbeamGradTex,
        color: '#FFE6BE',
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const sunbeamPlaneA = new THREE.Mesh(track(new THREE.PlaneGeometry(1.75, 4.4)), sunbeamMat);
    sunbeamPlaneA.position.set(-2.65, 1.28, -4.95);
    sunbeamPlaneA.rotation.set(0.76, -0.34, 0.24);
    sunbeamPlaneA.castShadow = false;
    sunbeamPlaneA.receiveShadow = false;
    bedroomArchGroup.add(sunbeamPlaneA);

    const sunbeamPlaneB = new THREE.Mesh(track(new THREE.PlaneGeometry(1.55, 4.1)), sunbeamMat);
    sunbeamPlaneB.position.set(-2.72, 1.22, -4.88);
    sunbeamPlaneB.rotation.set(0.76, 0.42, -0.18);
    sunbeamPlaneB.castShadow = false;
    sunbeamPlaneB.receiveShadow = false;
    bedroomArchGroup.add(sunbeamPlaneB);

    if (!isPerfRoomProfile && !qualityConfig.isSoftwareGl) {
      const moteCount = qualityConfig.tier === 'mobile' ? 18 : 34;
      const motePositions = new Float32Array(moteCount * 3);
      bedroomSunDustBasePos = new Float32Array(moteCount * 3);
      for (let i = 0; i < moteCount; i++) {
        const t = (i + 0.5) / moteCount;
        const bx = -1.95 - t * 1.65 + (Math.sin(i * 12.7) * 0.48);
        const by = 0.45 + (1 - t) * 1.75 + (Math.cos(i * 7.3) * 0.26);
        const bz = -6.25 + t * 2.85 + (Math.sin(i * 5.9) * 0.42);
        motePositions[i * 3] = bx;
        motePositions[i * 3 + 1] = by;
        motePositions[i * 3 + 2] = bz;
        bedroomSunDustBasePos[i * 3] = bx;
        bedroomSunDustBasePos[i * 3 + 1] = by;
        bedroomSunDustBasePos[i * 3 + 2] = bz;
      }
      const moteGeo = track(new THREE.BufferGeometry());
      moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
      const moteMat = track(
        new THREE.PointsMaterial({
          color: '#FFF0CE',
          size: 0.028,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      bedroomSunDustPoints = new THREE.Points(moteGeo, moteMat);
      bedroomSunDustPoints.castShadow = false;
      bedroomArchGroup.add(bedroomSunDustPoints);
    }

    const builtPark = buildChildhoodParkEnvironment({
      root: rootGroup,
      track,
      cameraObstacleMeshes,
      enableShadows: allowBedroomShadows,
    });
    parkSeesawPivot = (builtPark.userData?.seesawPivot as THREE.Object3D) || null;
  }

  // Animated groups for smooth render-loop ambient motion
  const animatedFloatingFrames: {
    group: THREE.Group;
    baseY: number;
    baseRotY: number;
    phase: number;
  }[] = [];
  let guideCharacterGroup: THREE.Group | null = null;
  let guideRightArmPivot: THREE.Group | null = null;
  let guideHeadPivot: THREE.Group | null = null;
  let guideTorsoMesh: THREE.Mesh | null = null;
  let guideLeftArmMesh: THREE.Mesh | null = null;
  let guideWasVisitorNear = false;
  let guideApproachWaveTimer = 0;

  // =========================================================================
  // 3B. EXACT INTERIOR REPLICATION: 7 INTERACTIVE MEMORY EXHIBITION ZONES + 3D GUIDE CHARACTER
  //     (Strict adherence to reference spatial composition & actual uploaded user memories)
  // =========================================================================
  {
    const catKey = categoryDetection.categoryKey;
    const accentHex =
      room.designConfig?.accentColorHex ||
      room.accentColor ||
      MUSEUM_LUXURY_PALETTE.champagneGold;

    // Strictly use actual user-uploaded memories (rawMemories) when populating frames/exhibits,
    // falling back to memories[0] for interaction payloads when needed, never inventing fake personal stories.
    const uploadedMemories = rawMemories.filter((m) => !m.hiddenFrom3D);
    const defaultInteractMem: Memory | undefined =
      uploadedMemories[0] || memories.find((m) => !m.hiddenFrom3D);

    // Helper to load an actual user memory photo onto a MeshBasicMaterial or MeshStandardMaterial,
    // or show an elegant curatorial placeholder texture if no memory is uploaded for that slot.
    // Safely guards against disposal/stale generations, downscales large photos, and supports /api/storage/media/ URLs.
    const applyMemoryOrPlaceholderTexture = (
      targetMat: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial,
      mem: Memory | undefined,
      placeholderTitle: string,
      placeholderSubtitle: string,
    ) => {
      const capturedGen = memoryUpdateGeneration;
      if (mem) {
        const validCustomUrl = resolveRoomMemoryImageUrl(mem);
        const fallbackArtUrl = getProceduralMemoryArt(
          mem.motif,
          mem.palette,
          mem.title,
          mem.location,
        );
        const imgUrl = validCustomUrl || fallbackArtUrl;
        if (typeof Image === 'undefined') {
          const emptyTex = createEmptyExhibitPlaceholderTexture(
            mem.title || placeholderTitle,
            placeholderSubtitle,
            maxAnisotropy,
          );
          assignMaterialDynamicTexture(targetMat, emptyTex);
          return;
        }
        const img = new Image();
        if (/^https?:\/\//i.test(imgUrl)) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
          if (isRoomDisposed || capturedGen !== memoryUpdateGeneration) {
            return;
          }
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 384;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Archival linen mat board backing
            ctx.fillStyle = '#FAF5EB';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const pad = 16;
            const availW = canvas.width - pad * 2;
            const availH = canvas.height - pad * 2;
            const natW = Math.max(1, img.naturalWidth || img.width || availW);
            const natH = Math.max(1, img.naturalHeight || img.height || availH);
            const scale = Math.min(availW / natW, availH / natH);
            const drawW = natW * scale;
            const drawH = natH * scale;
            const drawX = (canvas.width - drawW) * 0.5;
            const drawY = (canvas.height - drawH) * 0.5;

            ctx.drawImage(img, drawX, drawY, drawW, drawH);

            // Subtle champagne-brass inner mat bevel
            ctx.strokeStyle = 'rgba(201, 166, 107, 0.58)';
            ctx.lineWidth = 2;
            ctx.strokeRect(
              drawX - 1,
              drawY - 1,
              drawW + 2,
              drawH + 2,
            );
          }

          const tex = new THREE.CanvasTexture(canvas);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = maxAnisotropy;
          tex.needsUpdate = true;
          assignMaterialDynamicTexture(targetMat, tex);
        };
        img.onerror = () => {
          if (isRoomDisposed || capturedGen !== memoryUpdateGeneration) {
            return;
          }
          if (img.src !== fallbackArtUrl) {
            img.src = fallbackArtUrl;
          }
        };
        img.src = imgUrl;
      } else {
        const emptyTex = createEmptyExhibitPlaceholderTexture(
          placeholderTitle,
          placeholderSubtitle,
          maxAnisotropy,
        );
        assignMaterialDynamicTexture(targetMat, emptyTex);
      }
    };

    // Helper to create a 3D walnut & champagne-brass Zone Sign Plaque (grounded architectural lectern in Childhood Park)
    const addZoneSignPlaque3D = (opts: {
      title: string;
      subtitle: string;
      x: number;
      y: number;
      z: number;
      rotY?: number;
      width?: number;
      height?: number;
      linkedMemory?: Memory;
      zoneId: string;
    }) => {
      const useGroundedLectern = isChildhoodPark && opts.zoneId !== 'interactive_scrapbook';
      const w = useGroundedLectern ? Math.min(0.76, (opts.width || 1.2) * 0.52) : (opts.width || 1.48);
      const h = useGroundedLectern ? 0.24 : (opts.height || 0.48);
      const plaqueY = useGroundedLectern ? 0.86 : opts.y;

      const signGroup = new THREE.Group();
      signGroup.name = `zone_sign_${opts.zoneId}`;
      signGroup.position.set(opts.x, plaqueY, opts.z);
      signGroup.rotation.y = opts.rotY || 0;
      rootGroup.add(signGroup);

      const headGroup = new THREE.Group();
      if (useGroundedLectern) {
        headGroup.rotation.x = -0.38;
        const postHeight = Math.max(0.2, plaqueY - 0.04);
        const post = new THREE.Mesh(
          track(new THREE.CylinderGeometry(0.024, 0.032, postHeight, 10)),
          matWalnut,
        );
        post.position.set(0, -postHeight * 0.5, -0.02);
        signGroup.add(post);

        const basePlinth = new THREE.Mesh(
          track(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 12)),
          matChampagneGold,
        );
        basePlinth.position.set(0, -plaqueY + 0.02, -0.02);
        signGroup.add(basePlinth);
      }
      signGroup.add(headGroup);

      const signBack = new THREE.Mesh(
        track(new THREE.BoxGeometry(w, h, 0.038)),
        matWalnut,
      );
      headGroup.add(signBack);

      const signRim = new THREE.Mesh(
        track(new THREE.BoxGeometry(w + 0.028, h + 0.028, 0.03)),
        matChampagneGold,
      );
      signRim.position.z = -0.004;
      headGroup.add(signRim);

      const signTex = track(
        createRoundedZoneSignPlaqueTexture(
          opts.title,
          opts.subtitle,
          accentHex,
          maxAnisotropy,
        ),
      );
      const signFace = new THREE.Mesh(
        track(new THREE.PlaneGeometry(w - 0.02, h - 0.02)),
        track(
          new THREE.MeshBasicMaterial({
            map: signTex,
            transparent: true,
          }),
        ),
      );
      signFace.position.z = 0.022;
      headGroup.add(signFace);

      const mem = opts.linkedMemory || defaultInteractMem;
      if (mem) {
        const zoneHitbox = new THREE.Mesh(
          track(new THREE.BoxGeometry(w + 0.45, h + 0.75, 0.62)),
          track(new THREE.MeshBasicMaterial({ visible: false })),
        );
        zoneHitbox.position.set(0, -0.18, 0.14);
        zoneHitbox.userData = {
          kind: 'room_memory_display',
          memoryId: mem.id,
          memory: mem,
          roomId: room.id,
          title: `${opts.title}: ${mem.title}`,
          exhibitFormatType: opts.zoneId,
          associated3DObject: opts.title,
          interactionType: 'open-memory',
          subtitle: `${opts.subtitle} · Click or press [E] to explore`,
        };
        signGroup.add(zoneHitbox);
      }
    };

    // Shared vibrant materials for 3D Childhood & Category Keepsakes
    const matCrimsonVelvet = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#7C1D24'),
        roughness: 0.72,
      }),
    );
    const matMustardPouf = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#DF9B28'),
        roughness: 0.78,
      }),
    );
    const matTerracottaPouf = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#B84A39'),
        roughness: 0.78,
      }),
    );
    const matPlushHoney = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C88D48'),
        roughness: 0.88,
      }),
    );
    const matPlushSnout = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#E8C391'),
        roughness: 0.82,
      }),
    );
    const matRetroRed = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#D1342F'),
        roughness: 0.32,
        metalness: 0.25,
      }),
    );

    // =======================================================================
    // B. LEFT SIDE — "MEMORY WALL" MULTI-FRAME SALON GALLERY (x = -halfW + 0.28, z = -1.15)
    //    Multi-frame arrangement with 1 large central hero frame flanked by 2 stacked left frames
    //    and 4 stacked right frames + lower wooden exhibition cabinet, populated with actual uploaded memories
    // =======================================================================
    const memoryWallGroup = new THREE.Group();
    memoryWallGroup.name = 'zone_memory_wall_salon_3d';
    memoryWallGroup.position.set(-halfW + 0.26, 0, -1.15);
    memoryWallGroup.rotation.y = Math.PI / 2;
    rootGroup.add(memoryWallGroup);

    // Overhead warm brass picture-light bar above the Memory Wall salon
    [-1.05, 1.05].forEach((lx) => {
      const lightBar = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.022, 0.022, 1.15, 12)),
        matChampagneGold,
      );
      lightBar.rotation.z = Math.PI / 2;
      lightBar.position.set(lx, 3.38, 0.12);
      memoryWallGroup.add(lightBar);

      const lightGlow = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.05, 0.025, 0.04)),
        matWarmEmissiveStrip,
      );
      lightGlow.position.set(lx, 3.35, 0.12);
      memoryWallGroup.add(lightGlow);
    });

    // Lower wooden exhibition credenza & small tabletop frames beneath the Memory Wall
    const wallCredenza = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.65, 0.78, 0.38)),
      matWalnut,
    );
    wallCredenza.position.set(0, 0.39, 0.14);
    memoryWallGroup.add(wallCredenza);
    cameraObstacleMeshes.push(wallCredenza);

    const salonFrameSpecs: {
      x: number;
      y: number;
      w: number;
      h: number;
      slotLabel: string;
    }[] = [
      // Large Central Hero Portrait Frame (matching the large smiling portrait in the reference image)
      { x: -0.22, y: 2.32, w: 1.38, h: 1.38, slotLabel: 'Featured Childhood Portrait' },
      // Left Column (2 stacked vertical frames)
      { x: -1.36, y: 2.74, w: 0.72, h: 0.78, slotLabel: 'Early Years Moment' },
      { x: -1.36, y: 1.84, w: 0.72, h: 0.78, slotLabel: 'Playtime Snapshot' },
      // Right Column 1 (2 stacked landscape frames)
      { x: 0.88, y: 2.74, w: 0.76, h: 0.68, slotLabel: 'Friends & Family' },
      { x: 0.88, y: 1.9, w: 0.76, h: 0.68, slotLabel: 'School & Milestones' },
      // Right Column 2 (2 stacked landscape frames)
      { x: 1.72, y: 2.7, w: 0.72, h: 0.64, slotLabel: 'Summer Adventures' },
      { x: 1.72, y: 1.9, w: 0.72, h: 0.64, slotLabel: 'Favorite Celebration' },
    ];

    salonFrameSpecs.forEach((spec, idx) => {
      const mem = uploadedMemories[idx];
      const fNode = new THREE.Group();
      fNode.position.set(spec.x, spec.y, 0.04);
      memoryWallGroup.add(fNode);

      const outerFrame = new THREE.Mesh(
        track(new THREE.BoxGeometry(spec.w + 0.1, spec.h + 0.1, 0.055)),
        idx === 0 ? matChampagneGold : matWalnut,
      );
      fNode.add(outerFrame);

      const innerGoldTrim = new THREE.Mesh(
        track(new THREE.BoxGeometry(spec.w + 0.03, spec.h + 0.03, 0.062)),
        matChampagneGold,
      );
      fNode.add(innerGoldTrim);

      const matPhoto = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
      applyMemoryOrPlaceholderTexture(
        matPhoto,
        mem,
        spec.slotLabel,
        'Memory Wall Salon Frame',
      );

      const photoMesh = new THREE.Mesh(
        track(new THREE.PlaneGeometry(spec.w - 0.04, spec.h - 0.04)),
        matPhoto,
      );
      photoMesh.position.z = 0.034;
      fNode.add(photoMesh);

      const hit = new THREE.Mesh(
        track(new THREE.BoxGeometry(spec.w + 0.16, spec.h + 0.16, 0.24)),
        track(new THREE.MeshBasicMaterial({ visible: false })),
      );
      const syncWallSlotHitbox = (slotMem: Memory | undefined, fallbackMem: Memory | undefined) => {
        const targetMem = slotMem || fallbackMem;
        if (targetMem) {
          hit.userData = {
            kind: 'room_memory_display',
            memoryId: targetMem.id,
            memory: targetMem,
            roomId: room.id,
            title: slotMem ? slotMem.title : `Memory Wall · ${spec.slotLabel}`,
            exhibitFormatType: 'memory_wall',
            associated3DObject: 'Memory Wall Frame',
            interactionType: 'open-memory',
            subtitle: 'Memory Wall Gallery · Click or press [E] to inspect',
          };
        } else {
          hit.userData = {};
        }
      };
      syncWallSlotHitbox(mem, defaultInteractMem);
      fNode.add(hit);

      section3BMemoryUpdaters.push((nextUploaded, nextDefault) => {
        const nextMem = nextUploaded[idx];
        applyMemoryOrPlaceholderTexture(
          matPhoto,
          nextMem,
          spec.slotLabel,
          'Memory Wall Salon Frame',
        );
        syncWallSlotHitbox(nextMem, nextDefault);
      });
    });

    addZoneSignPlaque3D({
      zoneId: 'memory_wall',
      title: 'Memory Wall',
      subtitle: 'Curated framed photographs and milestone moments.',
      x: -halfW + 0.3,
      y: 3.68,
      z: -1.35,
      rotY: Math.PI / 2,
      width: 1.56,
      height: 0.46,
      linkedMemory: uploadedMemories[0] || defaultInteractMem,
    });

    // =======================================================================
    // C & D. CENTRE — "FLOATING MEMORIES" & REFINED SCULPTURAL INDOOR TREE +
    //        CENTRE FOREGROUND — "INTERACTIVE SCRAPBOOK" CIRCULAR PLATFORM (x = 0, z = -1.1)
    //        Proportioned so trunk, branches & canopy never obstruct sightlines or movement.
    // =======================================================================
    const centralIslandGroup = new THREE.Group();
    centralIslandGroup.name = `central_feature_installation_${catKey}`;
    centralIslandGroup.position.set(0, 0, -1.1);
    rootGroup.add(centralIslandGroup);

    // Ornate circular woven heritage rug beneath the central pedestal
    const heritageRugOuter = new THREE.Mesh(
      track(new THREE.CylinderGeometry(2.15, 2.15, 0.014, 56)),
      matWovenLinenRug,
    );
    heritageRugOuter.position.y = 0.007;
    centralIslandGroup.add(heritageRugOuter);

    const heritageRugBorder = new THREE.Mesh(
      track(new THREE.RingGeometry(1.88, 2.08, 56)),
      matChampagneGold,
    );
    heritageRugBorder.rotation.x = -Math.PI / 2;
    heritageRugBorder.position.y = 0.015;
    centralIslandGroup.add(heritageRugBorder);

    const heritageRugInnerGold = new THREE.Mesh(
      track(new THREE.RingGeometry(1.42, 1.48, 56)),
      matChampagneGold,
    );
    heritageRugInnerGold.rotation.x = -Math.PI / 2;
    heritageRugInnerGold.position.y = 0.016;
    centralIslandGroup.add(heritageRugInnerGold);

    // Refined low-profile fluted warm-walnut & champagne-brass island pedestal (radius = 1.24m, height = 0.44m)
    const islandPedestal = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.22, 1.28, 0.44, 48)),
      matWalnut,
    );
    islandPedestal.position.y = 0.22;
    islandPedestal.castShadow = true;
    islandPedestal.receiveShadow = true;
    centralIslandGroup.add(islandPedestal);
    cameraObstacleMeshes.push(islandPedestal);

    const islandTopBrassRim = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.24, 0.028, 16, 56)),
      matChampagneGold,
    );
    islandTopBrassRim.rotation.x = Math.PI / 2;
    islandTopBrassRim.position.y = 0.44;
    centralIslandGroup.add(islandTopBrassRim);

    const islandBaseGlowRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.29, 0.02, 14, 56)),
      matWarmEmissiveStrip,
    );
    islandBaseGlowRing.rotation.x = Math.PI / 2;
    islandBaseGlowRing.position.y = 0.024;
    centralIslandGroup.add(islandBaseGlowRing);

    // Stage 01B Refined Central Living Indoor Tree (organic fluted bark trunk, curved boughs & instanced canopy)
    populateRefinedRoomCentralTree({
      centralIslandGroup,
      quality: qualityConfig,
      matWalnut,
      matChampagneGold,
      matWarmEmissiveStrip,
      matBark: matTreeBark,
      matMossBed,
      matCanopy: matCanopyInstanced,
      cameraObstacleMeshes,
      track,
    });

    // -----------------------------------------------------------------------
    // D. CENTRE FOREGROUND: INTERACTIVE SCRAPBOOK + CURATED KEEPSAKES ON PLATFORM
    // -----------------------------------------------------------------------
    const scrapbookGroup = new THREE.Group();
    scrapbookGroup.name = 'zone_interactive_scrapbook_3d';
    scrapbookGroup.position.set(0, 0.52, 0.68);
    scrapbookGroup.rotation.x = -0.34;
    centralIslandGroup.add(scrapbookGroup);

    // Illuminated Golden Glass Lectern Case / Cradle surrounding the Open Scrapbook
    const cradleBase = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.24, 0.78, 0.03)),
      matChampagneGold,
    );
    cradleBase.position.z = -0.025;
    scrapbookGroup.add(cradleBase);

    const cradleGlowRim = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.28, 0.82, 0.02)),
      matWarmEmissiveStrip,
    );
    cradleGlowRim.position.z = -0.032;
    scrapbookGroup.add(cradleGlowRim);

    const bookCover = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.14, 0.72, 0.046)),
      matWalnut,
    );
    scrapbookGroup.add(bookCover);

    const bookPagesTex = track(
      createOpenScrapbookPagesTexture(
        room.name || categoryDetection.profile.label,
        uploadedMemories,
        maxAnisotropy,
      ),
    );
    const bookPagesPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.08, 0.66)),
      track(new THREE.MeshBasicMaterial({ map: bookPagesTex })),
    );
    bookPagesPlane.position.z = 0.028;
    scrapbookGroup.add(bookPagesPlane);

    const scrapbookMem =
      uploadedMemories.find((m) => (m.story || '').length > 20) ||
      uploadedMemories[0] ||
      defaultInteractMem;

    if (scrapbookMem) {
      const sbHit = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.32, 0.86, 0.32)),
        track(new THREE.MeshBasicMaterial({ visible: false })),
      );
      sbHit.userData = {
        kind: 'room_memory_display',
        memoryId: scrapbookMem.id,
        memory: scrapbookMem,
        roomId: room.id,
        title: `Interactive Scrapbook: ${scrapbookMem.title}`,
        exhibitFormatType: 'interactive_scrapbook',
        associated3DObject: 'Interactive Scrapbook',
        interactionType: 'open-memory',
        subtitle: 'Open Childhood Scrapbook · Click or press [E] to read stories',
      };
      scrapbookGroup.add(sbHit);
    }

    // "Interactive Scrapbook" Plaque mounted directly on the front face of the circular wooden platform
    addZoneSignPlaque3D({
      zoneId: 'interactive_scrapbook',
      title: 'Interactive Scrapbook',
      subtitle: 'Read stories, view notes, and explore related memories.',
      x: 0,
      y: 0.28,
      z: 0.22,
      rotY: 0,
      width: 1.42,
      height: 0.42,
      linkedMemory: scrapbookMem,
    });

    // 1. Detailed 3D Plush Teddy Bear sitting to the left of the Scrapbook
    const bearGroup = new THREE.Group();
    bearGroup.position.set(-0.74, 0.44, 0.38);
    bearGroup.rotation.y = 0.36;
    bearGroup.scale.setScalar(0.86);
    centralIslandGroup.add(bearGroup);

    const bearTorso = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.23, 20, 20)),
      matPlushHoney,
    );
    bearTorso.position.set(0, 0.23, 0);
    bearTorso.scale.set(1, 1.18, 0.92);
    bearGroup.add(bearTorso);

    const bearBelly = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.15, 16, 16)),
      matPlushSnout,
    );
    bearBelly.position.set(0, 0.22, 0.11);
    bearBelly.scale.set(0.95, 1.1, 0.6);
    bearGroup.add(bearBelly);

    const bearHead = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.185, 20, 20)),
      matPlushHoney,
    );
    bearHead.position.set(0, 0.54, 0.02);
    bearGroup.add(bearHead);

    const bearSnout = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.075, 16, 16)),
      matPlushSnout,
    );
    bearSnout.position.set(0, 0.51, 0.17);
    bearSnout.scale.set(1.1, 0.85, 0.9);
    bearGroup.add(bearSnout);

    const bearNose = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.026, 12, 12)),
      matMinimalDark,
    );
    bearNose.position.set(0, 0.53, 0.235);
    bearGroup.add(bearNose);

    [-0.065, 0.065].forEach((ex) => {
      const eye = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.02, 12, 12)),
        matMinimalDark,
      );
      eye.position.set(ex, 0.57, 0.185);
      bearGroup.add(eye);
    });

    [-0.135, 0.135].forEach((ex) => {
      const ear = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.068, 14, 14)),
        matPlushHoney,
      );
      ear.position.set(ex, 0.69, 0);
      bearGroup.add(ear);

      const leg = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.072, 0.072, 0.24, 14)),
        matPlushHoney,
      );
      leg.rotation.x = Math.PI / 2;
      leg.position.set(ex, 0.09, 0.17);
      bearGroup.add(leg);

      const pawPad = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.068, 12, 12)),
        matPlushSnout,
      );
      pawPad.position.set(ex, 0.09, 0.28);
      bearGroup.add(pawPad);

      const arm = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.058, 0.058, 0.22, 14)),
        matPlushHoney,
      );
      arm.rotation.z = ex < 0 ? 0.52 : -0.52;
      arm.position.set(ex * 1.48, 0.29, 0.06);
      bearGroup.add(arm);
    });

    // 2. Colorful 3x3 Rubik's Cube beside Teddy Bear on the platform
    const rubikFaceColors = [
      '#D1342F',
      '#2B65EC',
      '#F3C623',
      '#2E9E4B',
      '#F07826',
      '#FAF5EC',
    ];
    const rubikMats = rubikFaceColors.map((hex, idx) =>
      track(
        new THREE.MeshStandardMaterial({
          map: track(
            createRubiksCubeFaceTexture(
              hex,
              [
                rubikFaceColors[(idx + 1) % 6],
                rubikFaceColors[(idx + 2) % 6],
              ],
              maxAnisotropy,
            ),
          ),
          roughness: 0.28,
        }),
      ),
    );
    const rubikCube = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.17, 0.17, 0.17)),
      rubikMats,
    );
    rubikCube.position.set(0.76, 0.525, 0.42);
    rubikCube.rotation.y = 0.48;
    centralIslandGroup.add(rubikCube);

    // -----------------------------------------------------------------------
    // C. CENTRE: 6 SUSPENDED "FLOATING MEMORIES" FRAMES AROUND THE INDOOR TREE
    //    Populated with actual uploaded memories & gentle floating bob/sway animation
    // -----------------------------------------------------------------------
    const floatingFrameSpots = [
      // Central Hero Illuminated Frame directly above the Scrapbook
      { x: -0.06, y: 2.34, z: -0.72, w: 1.08, h: 1.02, rotY: 0.04, isHero: true },
      // Upper-Left Suspended Frame
      { x: -1.32, y: 2.74, z: -1.18, w: 0.88, h: 0.84, rotY: 0.24, isHero: false },
      // Lower-Left Suspended Frame
      { x: -1.24, y: 1.82, z: -1.38, w: 0.72, h: 0.68, rotY: 0.28, isHero: false },
      // Upper-Right Suspended Frame
      { x: 0.88, y: 2.86, z: -1.08, w: 0.9, h: 0.86, rotY: -0.2, isHero: false },
      // Lower-Right Suspended Frame
      { x: 1.18, y: 1.98, z: -1.32, w: 0.84, h: 0.78, rotY: -0.26, isHero: false },
      // Far-Right Suspended Frame
      { x: 2.04, y: 2.58, z: -1.52, w: 0.78, h: 0.74, rotY: -0.35, isHero: false },
    ];

    floatingFrameSpots.forEach((spot, idx) => {
      const fMem = uploadedMemories[idx];
      const fGroup = new THREE.Group();
      const frameY = isChildhoodPark ? Math.min(2.15, spot.y - 0.22) : spot.y;
      fGroup.position.set(spot.x, frameY, spot.z);
      fGroup.rotation.y = spot.rotY;
      fGroup.visible = !(isChildhoodPark && !fMem && idx >= Math.max(2, uploadedMemories.length));
      rootGroup.add(fGroup);

      animatedFloatingFrames.push({
        group: fGroup,
        baseY: frameY,
        baseRotY: spot.rotY,
        phase: idx * 1.15,
      });

      // Warm walnut & champagne-brass heirloom frame in Childhood Park
      const glowFrameOuter = new THREE.Mesh(
        track(new THREE.BoxGeometry(spot.w + 0.08, spot.h + 0.08, 0.036)),
        isChildhoodPark ? matWalnut : matWarmEmissiveStrip,
      );
      fGroup.add(glowFrameOuter);
      if (!isChildhoodPark) {
        cameraObstacleMeshes.push(glowFrameOuter);
      }

      const goldInnerBezel = new THREE.Mesh(
        track(new THREE.BoxGeometry(spot.w + 0.02, spot.h + 0.02, 0.042)),
        matChampagneGold,
      );
      fGroup.add(goldInnerBezel);

      const photoMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
      applyMemoryOrPlaceholderTexture(
        photoMat,
        fMem,
        `Floating Memory #${idx + 1}`,
        'Suspended Tree Canopy Exhibit',
      );

      const photoMesh = new THREE.Mesh(
        track(new THREE.PlaneGeometry(spot.w - 0.04, spot.h - 0.04)),
        photoMat,
      );
      photoMesh.position.z = 0.025;
      fGroup.add(photoMesh);

      // Golden suspension filament up to the tree branches
      const cord = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.006, 0.006, 1.55, 8)),
        matChampagneGold,
      );
      cord.position.set(0, spot.h * 0.5 + 0.77, 0);
      fGroup.add(cord);

      const fHitbox = new THREE.Mesh(
        track(new THREE.BoxGeometry(spot.w + 0.18, spot.h + 0.18, 0.28)),
        track(new THREE.MeshBasicMaterial({ visible: false })),
      );
      const syncFloatingHitbox = (slotMem: Memory | undefined, fallbackMem: Memory | undefined) => {
        const targetMem = slotMem || fallbackMem;
        if (targetMem && fGroup.visible) {
          fHitbox.userData = {
            kind: 'room_memory_display',
            memoryId: targetMem.id,
            memory: targetMem,
            roomId: room.id,
            title: slotMem ? slotMem.title : `Floating Memories · Canopy Slot #${idx + 1}`,
            exhibitFormatType: 'floating_memories',
            associated3DObject: 'Floating Memory Frame',
            interactionType: 'open-memory',
            subtitle: 'Floating Memories Canopy · Click or press [E] to inspect',
          };
        } else {
          fHitbox.userData = {};
        }
      };
      syncFloatingHitbox(fMem, defaultInteractMem);
      fGroup.add(fHitbox);

      section3BMemoryUpdaters.push((nextUploaded, nextDefault) => {
        const nextMem = nextUploaded[idx];
        fGroup.visible = !(isChildhoodPark && !nextMem && idx >= Math.max(2, nextUploaded.length));
        applyMemoryOrPlaceholderTexture(
          photoMat,
          nextMem,
          `Floating Memory #${idx + 1}`,
          'Suspended Tree Canopy Exhibit',
        );
        syncFloatingHitbox(nextMem, nextDefault);
      });
    });

    addZoneSignPlaque3D({
      zoneId: 'floating_memories',
      title: 'Floating Memories',
      subtitle: `Discover moments from your ${(room.name || 'childhood').toLowerCase()}.`,
      x: 0.44,
      y: 1.62,
      z: -0.66,
      rotY: -0.08,
      width: 1.44,
      height: 0.45,
      linkedMemory: uploadedMemories[0] || defaultInteractMem,
    });

    // =======================================================================
    // E. RIGHT SIDE — "CINEMA CORNER" (x = 3.55, z = -4.25, rotY = -0.36)
    //    Large landscape video screen with live HTML5 VideoTexture playback for uploaded videos,
    //    pleated burgundy velvet curtains, circular lounge rug, 3 beanbag poufs & side table
    // =======================================================================
    const cinemaCornerGroup = new THREE.Group();
    cinemaCornerGroup.name = 'zone_cinema_corner_3d';
    cinemaCornerGroup.position.set(3.55, 0, -4.25);
    cinemaCornerGroup.rotation.y = -0.36;
    rootGroup.add(cinemaCornerGroup);

    // Widescreen theater casing & walnut lower credenza
    const cinemaCredenza = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.25, 0.74, 0.36)),
      matWalnut,
    );
    cinemaCredenza.position.set(0, 0.37, 0);
    cinemaCornerGroup.add(cinemaCredenza);
    cameraObstacleMeshes.push(cinemaCredenza);

    const cinemaCasing = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.98, 1.76, 0.12)),
      matMinimalDark,
    );
    cinemaCasing.position.set(0, 2.06, 0);
    cinemaCornerGroup.add(cinemaCasing);
    cameraObstacleMeshes.push(cinemaCasing);

    const cinemaScreenMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      }),
    );

    const stopSection3BCinemaVideos = () => {
      section3BCinemaVideos.forEach((v) => {
        try {
          v.pause();
          v.removeAttribute('src');
          v.load();
        } catch {
          // ignore
        }
      });
      section3BCinemaVideos.length = 0;
    };

    const bindCinemaScreenMemory = (
      nextUploaded: Memory[],
      nextDefault: Memory | undefined,
      screenHitMesh?: THREE.Mesh,
    ) => {
      stopSection3BCinemaVideos();
      const capturedGen = memoryUpdateGeneration;
      const nextVideoMem =
        nextUploaded.find((m) => (m.type || m.mediaType) === 'video') ||
        nextUploaded[1] ||
        nextUploaded[0];
      const nextVideoSrc = nextVideoMem
        ? resolveRoomMemoryVideoUrl(nextVideoMem)
        : undefined;

      // Always bind poster or placeholder immediately so WebGL never samples an unready video texture
      applyMemoryOrPlaceholderTexture(
        cinemaScreenMat,
        nextVideoMem,
        'Cinema Corner Widescreen',
        'Upload a childhood video or memory to play here',
      );

      if (nextVideoMem && nextVideoSrc && typeof document !== 'undefined') {
        const cVideoElem = document.createElement('video');
        if (/^https?:\/\//i.test(nextVideoSrc)) {
          cVideoElem.crossOrigin = 'anonymous';
        }
        cVideoElem.muted = true;
        cVideoElem.loop = true;
        cVideoElem.playsInline = true;
        cVideoElem.preload = 'metadata';
        section3BCinemaVideos.push(cVideoElem);

        const attachReadyVideoTexture = () => {
          if (
            isRoomDisposed ||
            capturedGen !== memoryUpdateGeneration ||
            cVideoElem.readyState < 2 ||
            cVideoElem.videoWidth <= 0
          ) {
            return;
          }
          const cVideoTex = new THREE.VideoTexture(cVideoElem);
          cVideoTex.colorSpace = THREE.SRGBColorSpace;
          cVideoTex.minFilter = THREE.LinearFilter;
          cVideoTex.magFilter = THREE.LinearFilter;
          cVideoTex.generateMipmaps = false;
          assignMaterialDynamicTexture(cinemaScreenMat, cVideoTex);
        };

        cVideoElem.addEventListener('loadeddata', attachReadyVideoTexture, { once: true });
        cVideoElem.addEventListener(
          'error',
          () => {
            // Keep poster/placeholder texture on broken or unsupported video stream
          },
          { once: true },
        );
        cVideoElem.src = nextVideoSrc;
        cVideoElem.play().catch(() => {
          // Muted autoplay fallback
        });
      }

      if (screenHitMesh) {
        const cinemaTargetMem = nextVideoMem || nextDefault;
        if (cinemaTargetMem) {
          screenHitMesh.userData = {
            kind: 'room_memory_display',
            stationId: 'cinema_corner',
            memoryId: cinemaTargetMem.id,
            memory: cinemaTargetMem,
            roomId: room.id,
            title: `Cinema Corner: ${cinemaTargetMem.title}`,
            exhibitFormatType: 'cinema_corner',
            associated3DObject: 'Cinema Corner Screen',
            interactionType: 'play-video',
            subtitle: 'Cinema Corner Theater · Click or press [E] to watch',
          };
        } else {
          screenHitMesh.userData = {};
        }
      }
    };

    const cinemaScreenMesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(2.74, 1.54)),
      cinemaScreenMat,
    );
    cinemaScreenMesh.position.set(0, 2.08, 0.068);
    cinemaCornerGroup.add(cinemaScreenMesh);

    // Center Play Button Overlay & Red Progress Scrubber Bar on Cinema Screen
    const playCircleBg = new THREE.Mesh(
      track(new THREE.CircleGeometry(0.2, 28)),
      track(
        new THREE.MeshBasicMaterial({
          color: 0x181412,
          transparent: true,
          opacity: 0.65,
        }),
      ),
    );
    playCircleBg.position.set(0, 2.1, 0.073);
    cinemaCornerGroup.add(playCircleBg);

    const playCircleRing = new THREE.Mesh(
      track(new THREE.RingGeometry(0.18, 0.21, 28)),
      track(new THREE.MeshBasicMaterial({ color: 0xffffff })),
    );
    playCircleRing.position.set(0, 2.1, 0.075);
    cinemaCornerGroup.add(playCircleRing);

    const progressTrack = new THREE.Mesh(
      track(new THREE.PlaneGeometry(2.38, 0.032)),
      track(new THREE.MeshBasicMaterial({ color: 0xd1342f })),
    );
    progressTrack.position.set(0, 1.39, 0.075);
    cinemaCornerGroup.add(progressTrack);

    // Interactive hitbox on the Cinema Screen itself
    const screenHit = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.95, 1.75, 0.35)),
      track(new THREE.MeshBasicMaterial({ visible: false })),
    );
    screenHit.position.set(0, 2.08, 0.1);
    cinemaCornerGroup.add(screenHit);

    bindCinemaScreenMemory(uploadedMemories, defaultInteractMem, screenHit);
    section3BMemoryUpdaters.push((nextUploaded, nextDefault) => {
      bindCinemaScreenMemory(nextUploaded, nextDefault, screenHit);
    });

    // Architectural fluted walnut & brushed champagne-gold acoustic framing pilasters
    // (Replaces distracting bright crimson vertical curtain tubes with refined luxury theatre trim)
    [-1.44, 1.44].forEach((cx) => {
      const acousticColumn = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.18, 2.22, 0.14)),
        matWalnut,
      );
      acousticColumn.position.set(cx, 1.98, 0.08);
      cinemaCornerGroup.add(acousticColumn);
      cameraObstacleMeshes.push(acousticColumn);

      const brassInlay = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.036, 2.16, 0.155)),
        matChampagneGold,
      );
      brassInlay.position.set(cx, 1.98, 0.085);
      cinemaCornerGroup.add(brassInlay);
    });
    const curtainValance = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.16, 0.16, 0.18)),
      matWalnut,
    );
    curtainValance.position.set(0, 3.04, 0.1);
    cinemaCornerGroup.add(curtainValance);

    const valanceBrassTrim = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.18, 0.03, 0.195)),
      matChampagneGold,
    );
    valanceBrassTrim.position.set(0, 2.96, 0.1);
    cinemaCornerGroup.add(valanceBrassTrim);

    // Patterned Cinema Lounge Rug, 3 Cozy Beanbag Poufs (Cream, Mustard, Terracotta) & Side Table
    const cinemaRug = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.38, 1.38, 0.012, 36)),
      matWovenLinenRug,
    );
    cinemaRug.position.set(0, 0.008, 1.42);
    cinemaCornerGroup.add(cinemaRug);

    [
      { x: -0.72, z: 1.24, r: 0.32, mat: matBoucleFabric },
      { x: -0.05, z: 1.15, r: 0.4, mat: matMustardPouf },
      { x: 0.64, z: 1.38, r: 0.42, mat: matTerracottaPouf },
    ].forEach((pouf) => {
      const poufMesh = new THREE.Mesh(
        track(new THREE.SphereGeometry(pouf.r, 20, 16)),
        pouf.mat,
      );
      poufMesh.scale.y = 0.66;
      poufMesh.position.set(pouf.x, pouf.r * 0.6, pouf.z);
      cinemaCornerGroup.add(poufMesh);
    });

    // Small round wooden side table next to the cinema seating
    const sideTableTop = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.24, 0.24, 0.035, 20)),
      matWalnut,
    );
    sideTableTop.position.set(-1.24, 0.52, 1.15);
    cinemaCornerGroup.add(sideTableTop);
    const sideTableStem = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.04, 0.08, 0.5, 12)),
      matWalnut,
    );
    sideTableStem.position.set(-1.24, 0.25, 1.15);
    cinemaCornerGroup.add(sideTableStem);

    addZoneSignPlaque3D({
      zoneId: 'cinema_corner',
      title: 'Cinema Corner',
      subtitle: 'Watch your childhood videos and special moments.',
      x: 3.55,
      y: 3.46,
      z: -4.1,
      rotY: -0.36,
      width: 1.54,
      height: 0.48,
      linkedMemory:
        uploadedMemories.find(
          (m) => m.type === 'video' || m.mediaType === 'video',
        ) || defaultInteractMem,
    });

    // =======================================================================
    // F. FAR RIGHT — "AUDIO MEMORIES" BOOTH (x = halfW - 0.70, z = 0.15, rotY = -Math.PI * 0.44)
    // =======================================================================
    const audioBoothGroup = new THREE.Group();
    audioBoothGroup.name = 'zone_audio_memories_3d';
    audioBoothGroup.position.set(halfW - 0.7, 0, 0.15);
    audioBoothGroup.rotation.y = -Math.PI * 0.44;
    rootGroup.add(audioBoothGroup);

    const audioCabinet = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.72, 2.75, 0.52)),
      matWalnut,
    );
    audioCabinet.position.set(0, 1.375, 0);
    audioBoothGroup.add(audioCabinet);
    cameraObstacleMeshes.push(audioCabinet);

    // Illuminated Golden Arch Surround around the Audio Memories cabinet
    const audioGoldFrame = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.78, 2.82, 0.46)),
      matChampagneGold,
    );
    audioGoldFrame.position.set(0, 1.39, -0.02);
    audioBoothGroup.add(audioGoldFrame);

    // Warm cream backlit acoustic panel inside the headphone niche
    const acousticBackPanel = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.28, 1.38)),
      matSunlightWindowGlow,
    );
    acousticBackPanel.position.set(0, 1.58, 0.27);
    audioBoothGroup.add(acousticBackPanel);

    // Overhead vintage brass library shade lamp above the Audio Memories sign
    const lampArm = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 10)),
      matChampagneGold,
    );
    lampArm.rotation.x = Math.PI / 2;
    lampArm.position.set(0, 2.92, 0.18);
    audioBoothGroup.add(lampArm);

    const lampShade = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.18, 0.14, 18)),
      matChampagneGold,
    );
    lampShade.position.set(0, 2.86, 0.34);
    audioBoothGroup.add(lampShade);

    // 3D Studio Headphones suspended inside the illuminated niche
    const hpArc = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.24, 0.032, 16, 32, Math.PI)),
      matMinimalDark,
    );
    hpArc.position.set(0, 1.72, 0.32);
    audioBoothGroup.add(hpArc);

    [-0.23, 0.23].forEach((hx) => {
      const earcup = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.105, 0.105, 0.075, 20)),
        matMinimalDark,
      );
      earcup.rotation.z = Math.PI / 2;
      earcup.position.set(hx, 1.66, 0.32);
      audioBoothGroup.add(earcup);

      const goldRing = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 20)),
        matChampagneGold,
      );
      goldRing.rotation.z = Math.PI / 2;
      goldRing.position.set(hx * 1.05, 1.66, 0.32);
      audioBoothGroup.add(goldRing);
    });

    // Brass gramophone horn & archival vinyl/tape shelf on the left edge of the audio booth
    const gramophoneHorn = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.13, 0.24, 16, 1, true)),
      matChampagneGold,
    );
    gramophoneHorn.rotation.z = -Math.PI / 3;
    gramophoneHorn.position.set(-0.68, 1.82, 0.28);
    audioBoothGroup.add(gramophoneHorn);

    // Glowing Audio Waveform Player Plaque
    const audioMem =
      uploadedMemories.find((m) => (m.type || m.mediaType) === 'audio') ||
      uploadedMemories[2] ||
      uploadedMemories[0];
    const waveformTex = track(
      createAudioWaveformPlayerTexture(
        audioMem ? audioMem.title : 'Upload voice notes or songs to listen',
        accentHex,
        maxAnisotropy,
      ),
    );
    const waveformMesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.22, 0.38)),
      track(new THREE.MeshBasicMaterial({ map: waveformTex, transparent: true })),
    );
    waveformMesh.position.set(0, 1.18, 0.29);
    audioBoothGroup.add(waveformMesh);

    const audioHit = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.75, 2.6, 0.72)),
      track(new THREE.MeshBasicMaterial({ visible: false })),
    );
    audioHit.position.set(0, 1.38, 0.25);
    audioHit.userData = {
      kind: 'room_memory_display',
      stationId: 'audio_memories',
      memoryId: (audioMem || defaultInteractMem)?.id || 'audio_station',
      memory: audioMem || defaultInteractMem,
      roomId: room.id,
      title: 'Memory Radio & Audio Station',
      exhibitFormatType: 'audio_memories',
      associated3DObject: 'Audio Memories Booth',
      interactionType: 'play-audio',
      subtitle: 'Listen to voice notes, recordings & songs on demand (zero autoplay)',
    };
    audioBoothGroup.add(audioHit);

    addZoneSignPlaque3D({
      zoneId: 'audio_memories',
      title: 'Audio Memories',
      subtitle: 'Listen to voices, songs, and recorded memories.',
      x: halfW - 0.98,
      y: 2.54,
      z: 0.205,
      rotY: -Math.PI * 0.44,
      width: 1.52,
      height: 0.46,
      linkedMemory: audioMem || defaultInteractMem,
    });

    // =======================================================================
    // G. LEFT FOREGROUND — "KEEPSAKE GALLERY" GLASS DISPLAY CABINET
    //    Positioned in the left foreground (x = -3.85, z = 1.65, rotY = Math.PI * 0.28)
    //    matching the reference image perspective!
    // =======================================================================
    const keepsakeGroup = new THREE.Group();
    keepsakeGroup.name = 'zone_keepsake_gallery_3d';
    keepsakeGroup.position.set(-5.65, 0, -3.55);
    keepsakeGroup.rotation.y = Math.PI * 0.36;
    rootGroup.add(keepsakeGroup);

    // Fluted Walnut & Gold Pedestal Base
    const vitrineBase = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.66, 0.96, 0.82)),
      matWalnut,
    );
    vitrineBase.position.set(0, 0.48, 0);
    vitrineBase.castShadow = true;
    keepsakeGroup.add(vitrineBase);
    cameraObstacleMeshes.push(vitrineBase);

    const vitrineBaseGlow = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.72, 0.035, 0.88)),
      matWarmEmissiveStrip,
    );
    vitrineBaseGlow.position.set(0, 0.02, 0);
    keepsakeGroup.add(vitrineBaseGlow);

    const vitrineBrassTop = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.7, 0.055, 0.86)),
      matChampagneGold,
    );
    vitrineBrassTop.position.set(0, 0.98, 0);
    keepsakeGroup.add(vitrineBrassTop);

    // Transparent Glass Display Enclosure + 4 Brass Corner Pillars + Top Frame + Middle Glass Shelf
    const vitrineGlassBox = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.6, 1.18, 0.76)),
      matVitrineGlass,
    );
    vitrineGlassBox.position.set(0, 1.59, 0);
    keepsakeGroup.add(vitrineGlassBox);
    cameraObstacleMeshes.push(vitrineGlassBox);

    const vitrineTopCap = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.68, 0.05, 0.82)),
      matChampagneGold,
    );
    vitrineTopCap.position.set(0, 2.19, 0);
    keepsakeGroup.add(vitrineTopCap);
    cameraObstacleMeshes.push(vitrineTopCap);

    [
      [-0.78, -0.36],
      [0.78, -0.36],
      [-0.78, 0.36],
      [0.78, 0.36],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.018, 0.018, 1.18, 10)),
        matChampagneGold,
      );
      post.position.set(px, 1.59, pz);
      keepsakeGroup.add(post);

      const spotDot = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.035, 10, 10)),
        matWarmEmissiveStrip,
      );
      spotDot.position.set(px * 0.85, 2.14, pz * 0.85);
      keepsakeGroup.add(spotDot);
    });

    const middleShelf = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.52, 0.025, 0.68)),
      matChampagneGold,
    );
    middleShelf.position.set(0, 1.46, 0);
    keepsakeGroup.add(middleShelf);

    // 1. Retro Red-and-Gold 3D Toy Robot (Top Left Shelf)
    const robotTorso = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.23, 0.28, 0.15)),
      matRetroRed,
    );
    robotTorso.position.set(-0.42, 1.72, 0);
    keepsakeGroup.add(robotTorso);

    const robotChestPlate = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.16, 0.14, 0.16)),
      matChampagneGold,
    );
    robotChestPlate.position.set(-0.42, 1.73, 0.01);
    keepsakeGroup.add(robotChestPlate);

    const robotHead = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.17, 0.15, 0.13)),
      matRetroRed,
    );
    robotHead.position.set(-0.42, 1.95, 0);
    keepsakeGroup.add(robotHead);

    [-0.045, 0.045].forEach((rx) => {
      const rEye = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.022, 10, 10)),
        matWarmEmissiveStrip,
      );
      rEye.position.set(-0.42 + rx, 1.96, 0.07);
      keepsakeGroup.add(rEye);
    });

    [-0.49, -0.35].forEach((lx) => {
      const rLeg = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.065, 0.12, 0.09)),
        matChampagneGold,
      );
      rLeg.position.set(lx, 1.53, 0);
      keepsakeGroup.add(rLeg);
    });

    // 2. Vintage Rangefinder Camera (Top Right Shelf)
    const camBody = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.28, 0.17, 0.13)),
      matMinimalDark,
    );
    camBody.position.set(0.28, 1.58, 0);
    keepsakeGroup.add(camBody);

    const camTopPlate = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.28, 0.045, 0.135)),
      matChampagneGold,
    );
    camTopPlate.position.set(0.28, 1.68, 0);
    keepsakeGroup.add(camTopPlate);

    const camLens = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.072, 0.072, 0.1, 20)),
      matChampagneGold,
    );
    camLens.rotation.x = Math.PI / 2;
    camLens.position.set(0.28, 1.58, 0.095);
    keepsakeGroup.add(camLens);

    // 3. Golden Trophy Cup, Red Toy Car & Baseball (Bottom Vitrine Shelf)
    const trophyCup = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.095, 0.042, 0.25, 18)),
      matChampagneGold,
    );
    trophyCup.position.set(-0.46, 1.15, 0.06);
    keepsakeGroup.add(trophyCup);

    const toyCar = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.29, 0.1, 0.15)),
      matRetroRed,
    );
    toyCar.position.set(0.02, 1.06, 0.08);
    keepsakeGroup.add(toyCar);

    const toyCarCabin = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.16, 0.08, 0.13)),
      matMustardPouf,
    );
    toyCarCabin.position.set(0.0, 1.14, 0.08);
    keepsakeGroup.add(toyCarCabin);

    const baseball = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.078, 18, 18)),
      matBoucleFabric,
    );
    baseball.position.set(0.46, 1.08, 0.08);
    keepsakeGroup.add(baseball);

    const keepsakeMem = uploadedMemories[3] || uploadedMemories[0] || defaultInteractMem;
    addZoneSignPlaque3D({
      zoneId: 'keepsake_gallery',
      title: 'Keepsake Gallery',
      subtitle: 'Explore your childhood keepsakes, toys, and special objects.',
      x: -5.22,
      y: 0.54,
      z: -3.28,
      rotY: Math.PI * 0.36,
      width: 1.5,
      height: 0.5,
      linkedMemory: keepsakeMem,
    });

    // =======================================================================
    // H. RIGHT FOREGROUND — "MEMORY CONSTELLATION" INTERACTIVE TABLE
    // =======================================================================
    const constellationGroup = new THREE.Group();
    constellationGroup.name = 'zone_memory_constellation_3d';
    constellationGroup.position.set(3.85, 0, 1.85);
    constellationGroup.rotation.y = -Math.PI * 0.32;
    rootGroup.add(constellationGroup);

    // Twin fluted walnut pedestal legs
    [-0.6, 0.6].forEach((lx) => {
      const leg = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.3, 0.94, 0.5)),
        matWalnut,
      );
      leg.position.set(lx, 0.47, 0);
      leg.castShadow = true;
      constellationGroup.add(leg);
      cameraObstacleMeshes.push(leg);

      const legFoot = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.34, 0.05, 0.54)),
        matChampagneGold,
      );
      legFoot.position.set(lx, 0.025, 0);
      constellationGroup.add(legFoot);
    });

    // Angled Brass-Rimmed Interactive Touchscreen Table
    const tableTiltGroup = new THREE.Group();
    tableTiltGroup.position.set(0, 1.04, 0);
    tableTiltGroup.rotation.x = -0.56;
    constellationGroup.add(tableTiltGroup);

    const tableBezel = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.98, 1.38, 0.095)),
      matChampagneGold,
    );
    tableTiltGroup.add(tableBezel);
    cameraObstacleMeshes.push(tableBezel);

    const tableGlowTrim = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.88, 1.28, 0.102)),
      matWarmEmissiveStrip,
    );
    tableTiltGroup.add(tableGlowTrim);

    const constellationTex = track(
      createMemoryConstellationTableTexture(
        room.name || categoryDetection.profile.label,
        uploadedMemories,
        visualDataSummary,
        maxAnisotropy,
      ),
    );
    const constellationScreen = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.82, 1.22)),
      track(new THREE.MeshBasicMaterial({ map: constellationTex })),
    );
    constellationScreen.position.z = 0.056;
    tableTiltGroup.add(constellationScreen);

    const constellationMem =
      uploadedMemories[uploadedMemories.length - 1] || defaultInteractMem;

    if (constellationMem) {
      const constHit = new THREE.Mesh(
        track(new THREE.BoxGeometry(2.05, 1.45, 0.35)),
        track(new THREE.MeshBasicMaterial({ visible: false })),
      );
      constHit.userData = {
        kind: 'room_memory_display',
        memoryId: constellationMem.id,
        memory: constellationMem,
        roomId: room.id,
        title: `Memory Constellation: ${constellationMem.title}`,
        exhibitFormatType: 'memory_constellation',
        associated3DObject: 'Memory Constellation Table',
        interactionType: 'open-memory',
        subtitle: 'Interactive Memory Constellation · Click or press [E] to explore connections',
      };
      tableTiltGroup.add(constHit);
    }

    addZoneSignPlaque3D({
      zoneId: 'memory_constellation',
      title: 'Memory Constellation',
      subtitle: 'See how your memories are connected.',
      x: 3.52,
      y: 0.58,
      z: 2.18,
      rotY: -Math.PI * 0.32,
      width: 1.52,
      height: 0.48,
      linkedMemory: constellationMem,
    });

    // =======================================================================
    // I. 3D MUSEUM GUIDE CHARACTER IN WELCOME PROMENADE (x = -2.15, z = 3.65, rotY = 0.42)
    // =======================================================================
    guideCharacterGroup = new THREE.Group();
    guideCharacterGroup.name = 'museum_room_character_guide_3d';
    guideCharacterGroup.position.set(-2.15, 0, 3.65);
    guideCharacterGroup.rotation.y = 0.42;
    rootGroup.add(guideCharacterGroup);

    const matGuideSkin = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#E8A87C'),
        roughness: 0.52,
      }),
    );
    const matGuideHoodie = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#F3E6D0'),
        roughness: 0.78,
      }),
    );
    const matGuideTrousers = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#4A3425'),
        roughness: 0.76,
      }),
    );
    const matGuideHair = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#261A13'),
        roughness: 0.48,
      }),
    );
    const matGuideBackpack = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#6E4C30'),
        roughness: 0.68,
      }),
    );

    // Shoes & Cargo Trousers Legs
    [-0.11, 0.11].forEach((lx) => {
      const shoe = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.13, 0.08, 0.24)),
        matMinimalDark,
      );
      shoe.position.set(lx, 0.04, 0.04);
      guideCharacterGroup!.add(shoe);

      const legMesh = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.072, 0.065, 0.68, 14)),
        matGuideTrousers,
      );
      legMesh.position.set(lx, 0.4, 0);
      guideCharacterGroup!.add(legMesh);
    });

    // Cream Hoodie Torso + Atom Emblem on Chest + Backpack
    const guideTorso = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.18, 0.16, 0.56, 18)),
      matGuideHoodie,
    );
    guideTorso.position.set(0, 0.98, 0);
    guideTorso.scale.set(1.12, 1, 0.78);
    guideCharacterGroup.add(guideTorso);
    guideTorsoMesh = guideTorso;

    // Atom orbital rings emblem on hoodie chest (matching the reference character's hoodie)
    [-0.55, 0.55, 1.57].forEach((rotZ) => {
      const atomOrbit = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.055, 0.004, 8, 24)),
        matMinimalDark,
      );
      atomOrbit.position.set(0, 1.02, 0.145);
      atomOrbit.scale.set(1, 0.42, 1);
      atomOrbit.rotation.z = rotZ;
      guideCharacterGroup!.add(atomOrbit);
    });

    const backpackMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.3, 0.4, 0.16)),
      matGuideBackpack,
    );
    backpackMesh.position.set(0, 0.99, -0.18);
    guideCharacterGroup.add(backpackMesh);

    // Headphones resting around neck
    const neckHeadphoneBand = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.125, 0.018, 12, 24, Math.PI * 1.2)),
      matMinimalDark,
    );
    neckHeadphoneBand.rotation.x = Math.PI / 2 + 0.25;
    neckHeadphoneBand.rotation.z = -Math.PI * 0.6;
    neckHeadphoneBand.position.set(0, 1.26, 0.02);
    guideCharacterGroup.add(neckHeadphoneBand);

    [-0.1, 0.1].forEach((hx) => {
      const neckCup = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.045, 0.045, 0.032, 14)),
        matMinimalDark,
      );
      neckCup.rotation.x = Math.PI / 2;
      neckCup.position.set(hx, 1.24, 0.12);
      guideCharacterGroup!.add(neckCup);
    });

    // Left Arm relaxed near pocket
    const leftArm = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.052, 0.045, 0.48, 12)),
      matGuideHoodie,
    );
    leftArm.position.set(-0.24, 0.94, 0.02);
    leftArm.rotation.z = 0.18;
    guideCharacterGroup.add(leftArm);
    guideLeftArmMesh = leftArm;

    // Right Arm extended in an open, welcoming museum-host gesture toward the room centerpiece
    guideRightArmPivot = new THREE.Group();
    guideRightArmPivot.position.set(0.22, 1.16, 0.02);
    guideRightArmPivot.rotation.set(-0.35, 0, -0.88);
    guideCharacterGroup.add(guideRightArmPivot);

    const rightSleeve = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.052, 0.046, 0.44, 12)),
      matGuideHoodie,
    );
    rightSleeve.position.set(0, -0.2, 0);
    guideRightArmPivot.add(rightSleeve);

    const rightHand = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.048, 12, 12)),
      matGuideSkin,
    );
    rightHand.position.set(0, -0.44, 0.02);
    guideRightArmPivot.add(rightHand);

    // Head, Expressive Eyes, Warm Smile & Wavy Dark Hair
    guideHeadPivot = new THREE.Group();
    guideHeadPivot.position.set(0, 1.38, 0.02);
    guideCharacterGroup.add(guideHeadPivot);

    const headSphere = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.155, 22, 22)),
      matGuideSkin,
    );
    headSphere.scale.set(0.95, 1.06, 0.96);
    guideHeadPivot.add(headSphere);

    [-0.052, 0.052].forEach((ex) => {
      const eyeMesh = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.02, 12, 12)),
        matMinimalDark,
      );
      eyeMesh.position.set(ex, 0.02, 0.14);
      guideHeadPivot!.add(eyeMesh);
    });

    const hairCrown = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.168, 18, 18)),
      matGuideHair,
    );
    hairCrown.position.set(0, 0.055, -0.015);
    hairCrown.scale.set(1.02, 0.92, 1.04);
    guideHeadPivot.add(hairCrown);

    // Clickable / hoverable hitbox so visitors can greet the guide and receive landmark tips
    const guideHitbox = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.42, 0.42, 1.65, 10)),
      track(new THREE.MeshBasicMaterial({ visible: false })),
    );
    guideHitbox.position.set(0, 0.85, 0);
    guideHitbox.userData = {
      kind: 'room_guide_character',
      roomId: room.id,
      title: 'Museum Guide',
      subtitle: 'Click to greet & highlight a nearby memory landmark',
    };
    guideCharacterGroup.add(guideHitbox);
  }

  // =========================================================================
  // 4. BUILD INDIVIDUAL 3D MEMORY EXHIBITION DISPLAYS (UPDATABLE IN-PLACE)
  // =========================================================================
  const dynamicDisplaysGroup = new THREE.Group();
  dynamicDisplaysGroup.name = 'dynamic_memory_displays_group';
  rootGroup.add(dynamicDisplaysGroup);

  const dynamicDisplayDisposables: Array<{ dispose: () => void }> = [];
  const dynamicDisplayVideoElements: HTMLVideoElement[] = [];
  const dynamicDisplayObstacles = new Set<THREE.Mesh>();
  const trackDisplay = <T extends { dispose: () => void }>(asset: T): T => {
    dynamicDisplayDisposables.push(asset);
    return asset;
  };

  const collectAnimatedNodes = (group: THREE.Group) => {
    const wheels: THREE.Object3D[] = [];
    const lanternOrbs: THREE.Object3D[] = [];
    const toyGroups: THREE.Object3D[] = [];
    group.traverse((child) => {
      if (child.name === 'anim_wheel_front' || child.name === 'anim_wheel_rear') {
        wheels.push(child);
      } else if (child.name === 'anim_lantern_orb') {
        lanternOrbs.push(child);
      } else if (child.name === 'anim_toy_group') {
        toyGroups.push(child);
      }
    });
    return { wheels, lanternOrbs, toyGroups };
  };

  const memoryTo3DObjectsRegistry: Array<{
    memoryId: string;
    containerGroup: THREE.Group;
    loadedModelGroup: THREE.Group;
    wheels: THREE.Object3D[];
    lanternOrbs: THREE.Object3D[];
    toyGroups: THREE.Object3D[];
  }> = [];

  const clearDynamicMemoryDisplays = () => {
    memoryTo3DObjectsRegistry.forEach((entry) => {
      disposeMemory3DObject(entry.containerGroup);
    });
    memoryTo3DObjectsRegistry.length = 0;

    dynamicDisplayVideoElements.forEach((v) => {
      try {
        v.pause();
        v.removeAttribute('src');
        v.load();
      } catch {
        // ignore
      }
    });
    dynamicDisplayVideoElements.length = 0;

    if (dynamicDisplayObstacles.size > 0) {
      for (let i = cameraObstacleMeshes.length - 1; i >= 0; i--) {
        if (dynamicDisplayObstacles.has(cameraObstacleMeshes[i])) {
          cameraObstacleMeshes.splice(i, 1);
        }
      }
      dynamicDisplayObstacles.clear();
    }

    while (dynamicDisplaysGroup.children.length > 0) {
      dynamicDisplaysGroup.remove(dynamicDisplaysGroup.children[0]);
    }

    dynamicDisplayDisposables.forEach((d) => {
      try {
        d.dispose();
      } catch {
        // ignore
      }
    });
    dynamicDisplayDisposables.length = 0;
    displayRecords.length = 0;
  };

  const rebuildDynamicMemoryDisplays = (nextRawMemories: Memory[]) => {
    if (isRoomDisposed) return;
    memoryUpdateGeneration += 1;
    const capturedGen = memoryUpdateGeneration;
    clearDynamicMemoryDisplays();

    const safeIncoming = Array.isArray(nextRawMemories) ? nextRawMemories : [];
    const visibleSection4Memories = safeIncoming.filter((m) => m && !m.hiddenFrom3D);
    const placements = computeExhibitionPlacements(
      room,
      visibleSection4Memories,
      effectiveStyle,
    );
    const zoneSlotCounters: Record<string, number> = {};

    placements.forEach((p, pIdx) => {
      const mem = p.memory;
      const zoneKey =
        mem.curatedZoneId || mem.placementTarget || 'default';
      const slotInZone = zoneSlotCounters[zoneKey] || 0;
      zoneSlotCounters[zoneKey] = slotInZone + 1;

      const resolvedPos = resolve3DPlacementPosition(mem, slotInZone, {
        x: p.x,
        y: p.y - floorBaseY,
        z: p.z,
        rotY: p.rotY,
      });

      const targetX = resolvedPos.x;
      const localY = resolvedPos.y;
      const targetZ = resolvedPos.z;
      const targetRotY = resolvedPos.rotY;

      const displayGroup = new THREE.Group();
      displayGroup.name = `memora_photo_display_${mem.id}`;
      displayGroup.position.set(targetX, localY, targetZ);
      displayGroup.rotation.y = targetRotY;
      // Section 3B already mounts the first 7 memories into the dedicated Memory Wall,
      // Central Tree Floating Canopy, Scrapbook, Cinema, and Audio zones.
      // Any memory with an explicit approved placement (curatedZoneId or placementTarget)
      // or overflow beyond Section 3B mounts cleanly as a physical 3D display at its approved location.
      const hasExplicitPlacement = Boolean(mem.curatedZoneId || mem.placementTarget);
      const isAlreadyInSection3B = pIdx < 7 && !hasExplicitPlacement;
      if (!isAlreadyInSection3B) {
        dynamicDisplaysGroup.add(displayGroup);
      }

      // Grounded walnut-and-champagne-brass freestanding easel for outdoor park displays
      if (resolvedPos.needsEaselStand && !isAlreadyInSection3B) {
        const standHeight = Math.max(0.55, localY - 0.12);
        const legGeo = trackDisplay(new THREE.BoxGeometry(0.045, standHeight, 0.045));
        [-0.32, 0.32].forEach((lx) => {
          const leg = new THREE.Mesh(legGeo, matWalnut);
          leg.position.set(lx, -standHeight * 0.5 - 0.08, -0.04);
          leg.rotation.x = 0.08;
          displayGroup.add(leg);
        });
        const backLeg = new THREE.Mesh(
          trackDisplay(new THREE.BoxGeometry(0.04, standHeight * 1.05, 0.04)),
          matWalnut,
        );
        backLeg.position.set(0, -standHeight * 0.5 - 0.08, -0.26);
        backLeg.rotation.x = -0.26;
        displayGroup.add(backLeg);
        const ledgeBar = new THREE.Mesh(
          trackDisplay(new THREE.BoxGeometry(0.92, 0.04, 0.09)),
          matChampagneGold,
        );
        ledgeBar.position.set(0, -0.58, 0.03);
        displayGroup.add(ledgeBar);
      }

      let baseFrameHex: string = '#FFFFFF';
      let baseFrameRoughness = 0.34;
      let baseFrameMetalness = 0.06;
      const isMetallicFrame =
        p.frameStyle === 'champagne_brass' ||
        p.frameStyle === 'floating_halo' ||
        p.frameStyle === 'bronze_museum';
      const isDarkFrame =
        p.frameStyle === 'minimal_dark' || p.frameStyle === 'cinema_screen';
      if (
        p.frameStyle === 'champagne_brass' ||
        p.frameStyle === 'floating_halo'
      ) {
        baseFrameHex = '#D3AD6E';
        baseFrameRoughness = 0.28;
        baseFrameMetalness = 0.84;
      } else if (p.frameStyle === 'bronze_museum') {
        baseFrameHex = MUSEUM_LUXURY_PALETTE.bronze;
        baseFrameRoughness = 0.32;
        baseFrameMetalness = 0.8;
      } else if (isDarkFrame) {
        baseFrameHex = '#1E1A17';
        baseFrameRoughness = 0.32;
        baseFrameMetalness = 0.35;
      }

      const frameMat = trackDisplay(
        new THREE.MeshPhysicalMaterial({
          map: isMetallicFrame || isDarkFrame ? null : walnutTex,
          normalMap: isMetallicFrame
            ? metalPBR.normalMap
            : isDarkFrame
              ? null
              : woodPBR.normalMap,
          normalScale: new THREE.Vector2(0.18, 0.18),
          roughnessMap: isMetallicFrame
            ? metalPBR.roughnessMap
            : isDarkFrame
              ? null
              : woodPBR.roughnessMap,
          color: new THREE.Color(baseFrameHex),
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0,
          roughness: baseFrameRoughness,
          metalness: baseFrameMetalness,
          clearcoat: isMetallicFrame ? 0.22 : isDarkFrame ? 0.12 : 0.16,
          envMapIntensity: isMetallicFrame ? 0.96 : 0.48,
        }),
      );

      const frameW = p.width;
      const frameH = p.height;

      const frameDepth = p.isMainCinemaScreen ? 0.12 : 0.065;
      const frameMesh = new THREE.Mesh(
        trackDisplay(new THREE.BoxGeometry(frameW + 0.14, frameH + 0.14, frameDepth)),
        frameMat,
      );
      displayGroup.add(frameMesh);
      if (!isAlreadyInSection3B) {
        cameraObstacleMeshes.push(frameMesh);
        dynamicDisplayObstacles.add(frameMesh);
      }

      if (!p.isMainCinemaScreen) {
        const matBoard = new THREE.Mesh(
          trackDisplay(new THREE.BoxGeometry(frameW + 0.02, frameH + 0.02, frameDepth + 0.01)),
          trackDisplay(
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(
                p.mountStyle === 'scrapbook_collage' ? '#EFE4D2' : '#FAF5EC',
              ),
              roughness: 0.8,
            }),
          ),
        );
        matBoard.position.z = 0.006;
        displayGroup.add(matBoard);
      }

      const artMat = trackDisplay(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: new THREE.Color('#FFF4DC'),
          emissiveIntensity: p.isMainCinemaScreen ? 0.32 : 0.16,
          roughness: 0.32,
          metalness: 0.04,
        }),
      );

      let videoElem: HTMLVideoElement | null = null;
      let videoTex: THREE.VideoTexture | null = null;
      const isVideoMem = (mem.type || mem.mediaType) === 'video';
      const videoSrc = resolveRoomMemoryVideoUrl(mem);

      // Warm ivory archival museum mat backing so aspect-ratio-fitted photos sit gracefully framed
      const matBoardW = frameW - 0.1;
      const matBoardH = frameH - 0.1;
      const matBoardMesh = new THREE.Mesh(
        trackDisplay(new THREE.PlaneGeometry(matBoardW, matBoardH)),
        trackDisplay(
          new THREE.MeshStandardMaterial({
            color: new THREE.Color('#F5EDE0'),
            roughness: 0.9,
            metalness: 0.02,
          }),
        ),
      );
      matBoardMesh.position.z = frameDepth * 0.5 + 0.006;
      displayGroup.add(matBoardMesh);

      const artPlaneMaxW = frameW - 0.16;
      const artPlaneMaxH = frameH - 0.16;
      const artPlane = new THREE.Mesh(
        trackDisplay(new THREE.PlaneGeometry(artPlaneMaxW, artPlaneMaxH)),
        artMat,
      );
      artPlane.position.z = frameDepth * 0.5 + 0.014;
      displayGroup.add(artPlane);

      const bindBoundedDisplayImage = (imgDataUrl: string, fallbackArtUrl: string) => {
        if (typeof Image === 'undefined') return;
        const img = new Image();
        if (/^https?:\/\//i.test(imgDataUrl)) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
          if (isRoomDisposed || capturedGen !== memoryUpdateGeneration) {
            return;
          }
          const { canvas, natW, natH } = createBoundedCanvasFromImage(
            img,
            MAX_3D_DISPLAY_TEXTURE_DIM,
          );
          const imgAspect = natW / natH;
          const boxAspect = artPlaneMaxW / artPlaneMaxH;
          if (imgAspect > boxAspect) {
            artPlane.scale.set(1, Math.max(0.28, boxAspect / imgAspect), 1);
          } else {
            artPlane.scale.set(Math.max(0.28, imgAspect / boxAspect), 1, 1);
          }
          const boundedTex = trackDisplay(new THREE.CanvasTexture(canvas));
          boundedTex.colorSpace = THREE.SRGBColorSpace;
          boundedTex.anisotropy = maxAnisotropy;
          boundedTex.minFilter = THREE.LinearMipmapLinearFilter;
          boundedTex.magFilter = THREE.LinearFilter;
          boundedTex.generateMipmaps = true;
          boundedTex.needsUpdate = true;
          artMat.map = boundedTex;
          artMat.emissiveMap = boundedTex;
          artMat.needsUpdate = true;
        };
        img.onerror = () => {
          if (isRoomDisposed || capturedGen !== memoryUpdateGeneration) {
            return;
          }
          if (img.src !== fallbackArtUrl) {
            img.src = fallbackArtUrl;
          }
        };
        img.src = imgDataUrl;
      };

      const fallbackArtUrl = getProceduralMemoryArt(
        mem.motif,
        mem.palette,
        mem.title,
        mem.location,
      );

      if (
        isVideoMem &&
        p.isMainCinemaScreen &&
        videoSrc &&
        typeof document !== 'undefined'
      ) {
        // Bind poster / procedural image immediately so frame 0 is never a broken video texture
        const posterUrl = resolveRoomMemoryImageUrl(mem) || fallbackArtUrl;
        bindBoundedDisplayImage(posterUrl, fallbackArtUrl);

        videoElem = document.createElement('video');
        if (/^https?:\/\//i.test(videoSrc)) {
          videoElem.crossOrigin = 'anonymous';
        }
        videoElem.muted = true;
        videoElem.loop = true;
        videoElem.playsInline = true;
        videoElem.preload = 'metadata';
        dynamicDisplayVideoElements.push(videoElem);

        const activeVid = videoElem;
        activeVid.addEventListener(
          'loadeddata',
          () => {
            if (
              isRoomDisposed ||
              capturedGen !== memoryUpdateGeneration ||
              activeVid.readyState < 2 ||
              activeVid.videoWidth <= 0
            ) {
              return;
            }
            const readyTex = trackDisplay(new THREE.VideoTexture(activeVid));
            readyTex.colorSpace = THREE.SRGBColorSpace;
            readyTex.minFilter = THREE.LinearFilter;
            readyTex.magFilter = THREE.LinearFilter;
            readyTex.generateMipmaps = false;
            videoTex = readyTex;
            artMat.map = readyTex;
            artMat.emissiveMap = readyTex;
            artMat.needsUpdate = true;
          },
          { once: true },
        );
        activeVid.addEventListener(
          'error',
          () => {
            // Retain poster/procedural art safely on video load error
          },
          { once: true },
        );
        activeVid.src = videoSrc;
        activeVid.play().catch(() => {
          // Fallback if browser blocks even muted playback
        });
      } else {
        const candidateImgUrl = resolveRoomMemoryImageUrl(mem);
        const imgDataUrl = candidateImgUrl || fallbackArtUrl;
        bindBoundedDisplayImage(imgDataUrl, fallbackArtUrl);
      }

      // Subtle champagne-brass corner medallion indicates an interactive placed photograph
      if (mem.customImageUrl || mem.curatedZoneId) {
        const badgeDot = new THREE.Mesh(
          trackDisplay(new THREE.CylinderGeometry(0.036, 0.036, 0.014, 14)),
          matChampagneGold,
        );
        badgeDot.rotation.x = Math.PI / 2;
        badgeDot.position.set(
          frameW * 0.5 - 0.06,
          -frameH * 0.5 + 0.06,
          frameDepth * 0.5 + 0.02,
        );
        displayGroup.add(badgeDot);
      }

      const haloMat = trackDisplay(
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
          transparent: true,
          opacity:
            p.mountStyle === 'floating_exhibition' || p.isMainCinemaScreen
              ? 0.24
              : 0.06,
          depthWrite: false,
        }),
      );
      const haloMesh = new THREE.Mesh(
        trackDisplay(new THREE.PlaneGeometry(frameW + 0.42, frameH + 0.42)),
        haloMat,
      );
      haloMesh.position.z = -frameDepth * 0.5 - 0.015;
      displayGroup.add(haloMesh);

      const picHoodW = Math.min(0.68, frameW * 0.45);
      const picHood = new THREE.Mesh(
        trackDisplay(new THREE.BoxGeometry(picHoodW, 0.04, 0.09)),
        matChampagneGold,
      );
      picHood.position.set(0, frameH * 0.5 + 0.12, 0.06);
      displayGroup.add(picHood);

      const picLightMat = trackDisplay(
        new THREE.MeshStandardMaterial({
          color: new THREE.Color('#FFFCF6'),
          emissive: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
          emissiveIntensity: 0.9,
          roughness: 0.2,
        }),
      );
      const picLightLens = new THREE.Mesh(
        trackDisplay(new THREE.BoxGeometry(picHoodW * 0.86, 0.018, 0.055)),
        picLightMat,
      );
      picLightLens.position.set(0, frameH * 0.5 + 0.1, 0.065);
      displayGroup.add(picLightLens);

      const plaqueTex = trackDisplay(
        createMemoryMuseumPlaqueTexture(
          mem,
          p.chronologicalDateLabel,
          room.accentColor,
          maxAnisotropy,
        ),
      );
      const plaqueMesh = new THREE.Mesh(
        trackDisplay(new THREE.PlaneGeometry(Math.min(1.32, frameW * 0.85), 0.34)),
        trackDisplay(new THREE.MeshBasicMaterial({ map: plaqueTex })),
      );
      plaqueMesh.position.set(0, -frameH * 0.5 - 0.26, 0.035);
      displayGroup.add(plaqueMesh);

      if (p.mountStyle === 'floating_exhibition') {
        const cableHeight = Math.max(0.5, roomH - localY - frameH * 0.5);
        const cableGeo = trackDisplay(
          new THREE.CylinderGeometry(0.008, 0.008, cableHeight, 8),
        );
        [-frameW * 0.38, frameW * 0.38].forEach((cx) => {
          const cable = new THREE.Mesh(cableGeo, matChampagneGold);
          cable.position.set(cx, frameH * 0.5 + cableHeight * 0.5, -0.01);
          displayGroup.add(cable);
        });
      } else if (p.mountStyle === 'timeline_wall') {
        const stemLen = Math.max(0.2, localY - frameH * 0.5 - 1.38);
        const stem = new THREE.Mesh(
          trackDisplay(new THREE.BoxGeometry(0.025, stemLen, 0.025)),
          matChampagneGold,
        );
        stem.position.set(0, -frameH * 0.5 - stemLen * 0.5, 0.01);
        displayGroup.add(stem);

        const dateBadgeText = p.chronologicalDateLabel || 'UNDATED';
        const dateNodeTex = trackDisplay(
          createTimelineDateNodeTexture(
            dateBadgeText,
            room.accentColor,
            maxAnisotropy,
          ),
        );
        const dateNodeMesh = new THREE.Mesh(
          trackDisplay(new THREE.PlaneGeometry(0.68, 0.22)),
          trackDisplay(new THREE.MeshBasicMaterial({ map: dateNodeTex })),
        );
        dateNodeMesh.position.set(0, 1.38 - localY, 0.045);
        displayGroup.add(dateNodeMesh);
      } else if (p.mountStyle === 'memory_shelves') {
        const shelfLedge = new THREE.Mesh(
          trackDisplay(new THREE.BoxGeometry(frameW + 0.36, 0.06, 0.42)),
          matWalnut,
        );
        shelfLedge.position.set(0, -frameH * 0.5 - 0.1, 0.14);
        displayGroup.add(shelfLedge);

        const glassFront = new THREE.Mesh(
          trackDisplay(new THREE.BoxGeometry(frameW + 0.32, frameH + 0.36, 0.34)),
          matVitrineGlass,
        );
        glassFront.position.set(0, 0.04, 0.12);
        displayGroup.add(glassFront);
      } else if (p.mountStyle === 'scrapbook_collage') {
        const boardMesh = new THREE.Mesh(
          trackDisplay(new THREE.BoxGeometry(frameW + 0.34, frameH + 0.52, 0.03)),
          matWarmLimestone,
        );
        boardMesh.position.set(0, -0.08, -0.025);
        displayGroup.add(boardMesh);

        const pinGeo = trackDisplay(new THREE.SphereGeometry(0.025, 10, 10));
        [
          [-frameW * 0.45, frameH * 0.45],
          [frameW * 0.45, frameH * 0.45],
          [-frameW * 0.45, -frameH * 0.45],
          [frameW * 0.45, -frameH * 0.45],
        ].forEach(([px, py]) => {
          const pin = new THREE.Mesh(pinGeo, matChampagneGold);
          pin.position.set(px, py, 0.045);
          displayGroup.add(pin);
        });
      } else if (p.mountStyle === 'floating_island') {
        const arm = new THREE.Mesh(
          trackDisplay(new THREE.BoxGeometry(0.06, 0.06, 0.65)),
          matChampagneGold,
        );
        arm.position.set(0, 0, -0.34);
        displayGroup.add(arm);
      }

      const blueprintEx = exhibitBlueprintMap.get(mem.id);
      if (blueprintEx) {
        if (blueprintEx.type === 'vintage-television') {
          const tvAntennaGeo = trackDisplay(
            new THREE.CylinderGeometry(0.006, 0.006, 0.36, 8),
          );
          [-0.22, 0.22].forEach((ax) => {
            const ant = new THREE.Mesh(tvAntennaGeo, matChampagneGold);
            ant.position.set(ax, frameH * 0.5 + 0.24, 0.02);
            ant.rotation.z = ax < 0 ? 0.5 : -0.5;
            displayGroup.add(ant);
          });
        } else if (blueprintEx.type === 'interactive-scrapbook') {
          const ribbon = new THREE.Mesh(
            trackDisplay(new THREE.BoxGeometry(0.04, 0.22, 0.015)),
            matChampagneGold,
          );
          ribbon.position.set(frameW * 0.28, -frameH * 0.5 - 0.14, 0.04);
          displayGroup.add(ribbon);
        } else if (
          blueprintEx.type === 'interactive-school-bag' ||
          blueprintEx.type === 'keepsake-vitrine'
        ) {
          const keepsakeShelf = new THREE.Mesh(
            trackDisplay(new THREE.BoxGeometry(frameW * 0.72, 0.04, 0.22)),
            matWalnut,
          );
          keepsakeShelf.position.set(0, -frameH * 0.5 - 0.46, 0.09);
          displayGroup.add(keepsakeShelf);
        }
      }

      const hitboxMesh = new THREE.Mesh(
        trackDisplay(new THREE.BoxGeometry(frameW + 0.3, frameH + 0.5, 0.35)),
        trackDisplay(new THREE.MeshBasicMaterial({ visible: false })),
      );
      hitboxMesh.position.set(0, -0.08, 0.06);
      const bpLabel = blueprintEx
        ? `${blueprintEx.associated3DObject} · `
        : '';
      hitboxMesh.userData = {
        kind: 'room_memory_display',
        memoryId: mem.id,
        memory: mem,
        roomId: room.id,
        title: mem.title,
        exhibitFormatType: blueprintEx?.type || 'framed-photo',
        associated3DObject: blueprintEx?.associated3DObject || 'Museum Frame',
        interactionType: blueprintEx?.interaction || 'open-memory',
        subtitle: `${p.chronologicalDateLabel ? `${p.chronologicalDateLabel} · ` : ''}${bpLabel}Click or press [E] to inspect`,
      };
      displayGroup.add(hitboxMesh);

      const baseArtEmissiveIntensity = p.isMainCinemaScreen ? 0.32 : 0.18;

      displayRecords.push({
        memoryId: mem.id,
        mesh: displayGroup,
        title: mem.title,
        placement: p,
        rootGroup: displayGroup,
        hitboxMesh,
        frameMesh,
        artMat,
        picLightMat,
        haloMat,
        spotLight: null,
        baseY: localY,
        baseArtEmissiveIntensity,
        videoElement: videoElem,
        videoTexture: videoTex,
      });
    });

    // =======================================================================
    // 4B. MEMORY-TO-3D RECONSTRUCTION REGISTRY & REAL GLTFLOADER INTEGRATION
    //     Only spawns 3D objects for memories explicitly approved by the user!
    // =======================================================================
    const approved3DMemories = safeIncoming.filter(
      (m) => m && !m.hiddenFrom3D && isMemory3DBlueprintApproved(m),
    );

    approved3DMemories.forEach((mem, idx) => {
      const bp = mem.memoryTo3DBlueprint!;
      const offsetX = mem.positionOffset?.x || 0;
      const offsetY = mem.positionOffset?.y || 0;

      const slotSpreadX = idx % 3 === 1 ? 0.65 : idx % 3 === 2 ? -0.65 : 0;
      const targetX = Math.max(
        -5.4,
        Math.min(5.4, bp.position.x + offsetX + (idx > 0 ? slotSpreadX : 0)),
      );
      const targetY = Math.max(0.02, bp.position.y + offsetY);
      const targetZ = Math.max(-5.4, Math.min(5.0, bp.position.z));

      const containerGroup = new THREE.Group();
      containerGroup.name = `approved_memory_3d_container_${mem.id}`;
      containerGroup.position.set(targetX, targetY, targetZ);
      containerGroup.rotation.set(bp.rotation.x, bp.rotation.y, bp.rotation.z);
      containerGroup.scale.set(bp.scale.x, bp.scale.y, bp.scale.z);
      dynamicDisplaysGroup.add(containerGroup);

      const activeModelGroup = buildProceduralMemory3DMeshGroup(bp);
      activeModelGroup.position.set(0, 0, 0);
      containerGroup.add(activeModelGroup);

      const registryEntry = {
        memoryId: mem.id,
        containerGroup,
        loadedModelGroup: activeModelGroup,
        ...collectAnimatedNodes(activeModelGroup),
      };
      memoryTo3DObjectsRegistry.push(registryEntry);

      loadMemoryBlueprint3DObject({
        blueprint: {
          ...bp,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        memory: mem,
      })
        .then((loaded) => {
          if (
            isRoomDisposed ||
            capturedGen !== memoryUpdateGeneration ||
            !containerGroup.parent
          ) {
            disposeMemory3DObject(loaded.group);
            return;
          }
          containerGroup.remove(activeModelGroup);
          disposeMemory3DObject(activeModelGroup);
          loaded.group.position.set(0, 0, 0);
          containerGroup.add(loaded.group);
          registryEntry.loadedModelGroup = loaded.group;
          const animNodes = collectAnimatedNodes(loaded.group);
          registryEntry.wheels = animNodes.wheels;
          registryEntry.lanternOrbs = animNodes.lanternOrbs;
          registryEntry.toyGroups = animNodes.toyGroups;
        })
        .catch(() => {
          // Keep initial procedural fallback mesh if async load fails
        });

      const badgeLabel = bp.generatedGlbAssetRef.isAiInterpretation
        ? 'AI-INTERPRETED 3D KEEPSAKE'
        : `3D MEMORY OBJECT · ${bp.connectedSpace.replace('_', ' ').toUpperCase()}`;
      const plaqueTex = trackDisplay(
        createMemoryMuseumPlaqueTexture(
          mem,
          badgeLabel,
          room.accentColor,
          maxAnisotropy,
        ),
      );
      const plaqueMesh = new THREE.Mesh(
        trackDisplay(new THREE.PlaneGeometry(1.15, 0.32)),
        trackDisplay(
          new THREE.MeshBasicMaterial({
            map: plaqueTex,
            side: THREE.DoubleSide,
          }),
        ),
      );
      plaqueMesh.position.set(0, 1.08, 0);
      containerGroup.add(plaqueMesh);

      const hitboxMesh = new THREE.Mesh(
        trackDisplay(new THREE.BoxGeometry(1.15, 1.35, 1.15)),
        trackDisplay(new THREE.MeshBasicMaterial({ visible: false })),
      );
      hitboxMesh.position.set(0, 0.62, 0);
      hitboxMesh.userData = {
        kind: 'room_memory_display',
        memoryId: mem.id,
        memory: mem,
        roomId: room.id,
        title: `${bp.objectName} (${mem.title})`,
        exhibitFormatType: bp.objectType,
        associated3DObject: bp.objectName,
        interactionType: bp.interactionType,
        isMemoryTo3DObject: true,
        isAiInterpretation: bp.generatedGlbAssetRef.isAiInterpretation,
        subtitle: `${bp.generatedGlbAssetRef.isAiInterpretation ? '[AI-Interpreted 3D Object] · ' : ''}${bp.interactionLabel}`,
      };
      containerGroup.add(hitboxMesh);

      const proxyFrameMat = trackDisplay(
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(MUSEUM_LUXURY_PALETTE.champagneGold),
          roughness: 0.28,
          metalness: 0.78,
        }),
      );
      const proxyFrameMesh = new THREE.Mesh(
        trackDisplay(new THREE.CylinderGeometry(0.49, 0.49, 0.02, 24)),
        proxyFrameMat,
      );
      proxyFrameMesh.position.set(0, 0.085, 0);
      containerGroup.add(proxyFrameMesh);

      const proxyLightMat = trackDisplay(
        new THREE.MeshStandardMaterial({
          color: new THREE.Color('#FFFCF6'),
          emissive: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
          emissiveIntensity: 0.85,
        }),
      );
      const proxyHaloMat = trackDisplay(
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
          transparent: true,
          opacity: 0.18,
        }),
      );

      displayRecords.push({
        memoryId: mem.id,
        mesh: containerGroup,
        title: mem.title,
        placement: {
          memoryId: mem.id,
          memory: mem,
          index: idx,
          mountStyle: 'floating_island',
          frameStyle: 'champagne_brass',
          x: targetX,
          y: floorBaseY + targetY + 0.55,
          z: targetZ,
          rotY: bp.rotation.y,
          width: 0.95,
          height: 0.95,
          normalX: Math.sin(bp.rotation.y),
          normalZ: Math.cos(bp.rotation.y),
          interactionX: targetX,
          interactionZ: targetZ,
          interactionRadius: 2.35,
          chronologicalDateLabel: badgeLabel,
          isUndated: !mem.date,
        },
        rootGroup: containerGroup,
        hitboxMesh,
        frameMesh: proxyFrameMesh,
        artMat: proxyLightMat,
        picLightMat: proxyLightMat,
        haloMat: proxyHaloMat,
        spotLight: null,
        baseY: targetY,
        baseArtEmissiveIntensity: 0.85,
        videoElement: null,
        videoTexture: null,
      });
    });
  };

  rebuildDynamicMemoryDisplays(rawMemories);

  // Smooth Room-Entrance Animation Updater (0.5s – 1.2s)
  // =========================================================================
  // 5. MEMORA LIVING WORLD — EXPLORABLE MULTI-SPACE 3D WORLD, INTERACTIVE OBJECTS,
  //    TECH BUDDY 10-POSE GUIDE, 4-ATMOSPHERE SYSTEM & LIVE STUDIO CUSTOMIZER
  // =========================================================================
  const spaceGroups: Record<LivingWorldSpaceId, THREE.Group> = {
    central_gallery: new THREE.Group(),
    bedroom: new THREE.Group(),
    backyard: new THREE.Group(),
    play_area: new THREE.Group(),
    treehouse: new THREE.Group(),
    study_corner: new THREE.Group(),
  };
  (Object.keys(spaceGroups) as LivingWorldSpaceId[]).forEach((sid) => {
    spaceGroups[sid].name = `living_world_space_${sid}`;
    rootGroup.add(spaceGroups[sid]);
  });

  const interactiveObjectGroups: Record<InteractiveObjectId3D, THREE.Group> = {
    toy_chest: new THREE.Group(),
    bookshelf: new THREE.Group(),
    toy_train: new THREE.Group(),
    tyre_swing: new THREE.Group(),
    bicycle: new THREE.Group(),
    cricket_set: new THREE.Group(),
    hopscotch: new THREE.Group(),
    treehouse_ladder: new THREE.Group(),
    study_desk: new THREE.Group(),
    spinning_globe: new THREE.Group(),
    wardrobe: new THREE.Group(),
    wooden_bed: new THREE.Group(),
    bedroom_tv: new THREE.Group(),
    under_bed_scrapbook: new THREE.Group(),
    under_bed_flashlight: new THREE.Group(),
    bedside_drawer: new THREE.Group(),
    trophy_shelf: new THREE.Group(),
    cork_pinboard: new THREE.Group(),
    crt_computer: new THREE.Group(),
    wired_headphones: new THREE.Group(),
    school_bag: new THREE.Group(),
    bedroom_window: new THREE.Group(),
    memory_radio: new THREE.Group(),
    memory_projector: new THREE.Group(),
    wall_clock_calendar: new THREE.Group(),
    drawing_wall: new THREE.Group(),
  };

  const interactiveStates: Record<InteractiveObjectId3D, boolean> = {
    toy_chest: false,
    bookshelf: false,
    toy_train: true, // Train chugs around central tree plinth by default
    tyre_swing: false,
    bicycle: false,
    cricket_set: false,
    hopscotch: false,
    treehouse_ladder: false,
    study_desk: false,
    spinning_globe: false,
    wardrobe: false,
    wooden_bed: false,
    bedroom_tv: false,
    under_bed_scrapbook: false,
    under_bed_flashlight: false,
    bedside_drawer: false,
    trophy_shelf: false,
    cork_pinboard: false,
    crt_computer: false,
    wired_headphones: false,
    school_bag: false,
    bedroom_window: false,
    memory_radio: false,
    memory_projector: false,
    wall_clock_calendar: false,
    drawing_wall: false,
  };

  const interactiveAnimTimers: Record<InteractiveObjectId3D, number> = {
    toy_chest: 0,
    bookshelf: 0,
    toy_train: 0,
    tyre_swing: 0,
    bicycle: 0,
    cricket_set: 0,
    hopscotch: 0,
    treehouse_ladder: 0,
    study_desk: 0,
    spinning_globe: 0,
    wardrobe: 0,
    wooden_bed: 0,
    bedroom_tv: 0,
    under_bed_scrapbook: 0,
    under_bed_flashlight: 0,
    bedside_drawer: 0,
    trophy_shelf: 0,
    cork_pinboard: 0,
    crt_computer: 0,
    wired_headphones: 0,
    school_bag: 0,
    bedroom_window: 0,
    memory_radio: 0,
    memory_projector: 0,
    wall_clock_calendar: 0,
    drawing_wall: 0,
  };

  // Match uploaded memories to interactive 3D objects by explicit linkedObjectId, zone, or keywords
  const findLinkedMemoryForObject = (
    objectId: InteractiveObjectId3D,
    keywords: RegExp,
  ): Memory | undefined => {
    const explicit = memories.find(
      (m) =>
        !m.hiddenFrom3D &&
        (m.linkedObjectId === objectId ||
          (objectId === 'toy_chest' && m.curatedZoneId === 'toy_box') ||
          (objectId === 'bookshelf' && m.curatedZoneId === 'bookshelf') ||
          (objectId === 'study_desk' && m.curatedZoneId === 'study_corner') ||
          (objectId === 'cork_pinboard' && m.curatedZoneId === 'memory_wall')),
    );
    if (explicit) return explicit;
    return memories.find(
      (m) =>
        !m.hiddenFrom3D &&
        keywords.test(
          `${m.title} ${m.description} ${m.story} ${(m.tags || []).join(' ')} ${m.linked3DObject || ''}`.toLowerCase(),
        ),
    );
  };

  const registerInteractiveHitbox = (
    parent: THREE.Group,
    objectId: InteractiveObjectId3D,
    spaceId: LivingWorldSpaceId,
    title: string,
    subtitle: string,
    size: [number, number, number],
    offset: [number, number, number],
    linkedMem?: Memory,
  ) => {
    const hb = new THREE.Mesh(
      track(new THREE.BoxGeometry(size[0], size[1], size[2])),
      track(new THREE.MeshBasicMaterial({ visible: false })),
    );
    hb.position.set(offset[0], offset[1], offset[2]);
    hb.userData = {
      kind: 'room_interactive_object',
      objectId,
      spaceId,
      roomId: room.id,
      title,
      subtitle,
      memoryId: linkedMem?.id,
      memory: linkedMem,
    };
    parent.add(hb);
  };

  // -------------------------------------------------------------------------
  // SPACE A: CHILDHOOD BEDROOM ALCOVE (NW Wing: x = -4.2, z = -2.4)
  // Cozy Wooden Bed + Teddy Bear + Pillows + Wardrobe + Bedroom TV
  // -------------------------------------------------------------------------
  let bedPillowBounceGroup: THREE.Group | null = null;
  let wardrobeDoorPivot: THREE.Group | null = null;
  let bedroomTvScreenMat: THREE.MeshStandardMaterial | null = null;
  const matBedBlanket = track(
    new THREE.MeshStandardMaterial({
      color: '#C87A5B',
      map: bedroomMats.matCottonSheet.map,
      bumpMap: bedroomMats.matCottonSheet.bumpMap,
      bumpScale: 0.012,
      roughness: 0.86,
      metalness: 0.0,
    }),
  );
  const matWardrobeDoor = track(
    new THREE.MeshStandardMaterial({
      map: bedroomMats.matBedWalnut.map,
      bumpMap: bedroomMats.matBedWalnut.bumpMap,
      bumpScale: 0.008,
      color: '#6B4A32',
      roughness: 0.62,
      metalness: 0.02,
    }),
  );
  const matStudyDeskTop = track(
    new THREE.MeshStandardMaterial({
      map: bedroomMats.matDeskWood.map,
      bumpMap: bedroomMats.matDeskWood.bumpMap,
      bumpScale: 0.008,
      color: '#FFFFFF',
      roughness: 0.6,
      metalness: 0.02,
    }),
  );
  const bedCanopyGroup = new THREE.Group();
  bedCanopyGroup.visible = false;
  const bedroomRugsGroup = new THREE.Group();
  rootGroup.add(bedroomRugsGroup);
  const bedroomCushionsGroup = new THREE.Group();
  rootGroup.add(bedroomCushionsGroup);
  const bedroomLampsGroup = new THREE.Group();
  rootGroup.add(bedroomLampsGroup);
  const bedroomPostersGroup = new THREE.Group();
  rootGroup.add(bedroomPostersGroup);
  {
    // SPACE A: CHILDHOOD BEDROOM ALCOVE (South-West Alcove: x = -5.05, z = 3.65)
    // Solid Walnut/Oak Bed Frame (#6B4A32, roughness ~0.62) with CLEAR OPEN UNDER-BED SPACE
    const bedGroup = interactiveObjectGroups.wooden_bed;
    bedGroup.position.set(-5.05, 0, 3.65);
    bedGroup.rotation.y = Math.PI / 2;
    spaceGroups.bedroom.add(bedGroup);

    const bedWoodMat = bedroomMats.matBedWalnut;

    // 4 Solid Turned/Tapered Corner Bed Posts planted flush on floorboards (leaving y = 0..0.24 completely open!)
    [
      [-0.69, -0.93],
      [0.69, -0.93],
      [-0.69, 0.93],
      [0.69, 0.93],
    ].forEach(([lx, lz]) => {
      const postH = lz < 0 ? 1.04 : 0.56;
      const legPost = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.085, postH, 0.085)),
        bedWoodMat,
      );
      legPost.position.set(lx, postH * 0.5, lz);
      bedGroup.add(legPost);

      const finial = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.048, 12, 10)),
        bedWoodMat,
      );
      finial.position.set(lx, postH + 0.032, lz);
      bedGroup.add(finial);
    });

    // Raised Perimeter Bed Rails (y = 0.24..0.36) so the under-bed cavity is open & shadowed around scrapbook & flashlight
    const leftRail = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.055, 0.12, 1.84)),
      bedWoodMat,
    );
    leftRail.position.set(-0.69, 0.3, 0);
    bedGroup.add(leftRail);
    cameraObstacleMeshes.push(leftRail);

    const rightRail = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.055, 0.12, 1.84)),
      bedWoodMat,
    );
    rightRail.position.set(0.69, 0.3, 0);
    bedGroup.add(rightRail);
    cameraObstacleMeshes.push(rightRail);

    const footRail = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.42, 0.24, 0.065)),
      bedWoodMat,
    );
    footRail.position.set(0, 0.38, 0.93);
    bedGroup.add(footRail);
    cameraObstacleMeshes.push(footRail);

    const footCap = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.48, 0.05, 0.095)),
      bedWoodMat,
    );
    footCap.position.set(0, 0.52, 0.93);
    bedGroup.add(footCap);

    // Recessed Under-Mattress Wooden Support Slats (y = 0.29)
    for (let s = 0; s < 6; s++) {
      const slat = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.32, 0.025, 0.11)),
        bedWoodMat,
      );
      slat.position.set(0, 0.29, -0.74 + s * 0.295);
      bedGroup.add(slat);
    }

    // Paneled Craftsman Headboard with top molding rail
    const headboard = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.36, 0.72, 0.07)),
      bedWoodMat,
    );
    headboard.position.set(0, 0.64, -0.93);
    bedGroup.add(headboard);
    cameraObstacleMeshes.push(headboard);

    const headboardCap = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.5, 0.065, 0.115)),
      bedWoodMat,
    );
    headboardCap.position.set(0, 1.02, -0.93);
    bedGroup.add(headboardCap);

    [-0.36, 0.36].forEach((px) => {
      const insetPanel = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.56, 0.44, 0.025)),
        matWardrobeDoor,
      );
      insetPanel.position.set(px, 0.68, -0.89);
      bedGroup.add(insetPanel);
    });

    // Optional Cozy 4-Poster Canopy Frame (toggled when bedDesign === 'cozy_canopy')
    bedGroup.add(bedCanopyGroup);
    [
      [-0.69, -0.93],
      [0.69, -0.93],
      [-0.69, 0.93],
      [0.69, 0.93],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.032, 0.032, 1.85, 10)),
        bedWoodMat,
      );
      post.position.set(px, 0.95, pz);
      bedCanopyGroup.add(post);
    });
    const canopyRoof = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.46, 0.06, 1.92)),
      bedroomMats.matCottonSheet,
    );
    canopyRoof.position.set(0, 1.88, 0);
    bedCanopyGroup.add(canopyRoof);

    // Layered Cotton Mattress & Fitted Sheet
    const mattress = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.32, 0.21, 1.8)),
      bedroomMats.matCottonSheet,
    );
    mattress.position.set(0, 0.415, 0);
    bedGroup.add(mattress);

    // Crisp Folded-Back Top Cotton Sheet Cuff across upper bed
    const foldedSheetCuff = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.37, 0.055, 0.26)),
      bedroomMats.matCottonPillow,
    );
    foldedSheetCuff.position.set(0, 0.525, -0.22);
    foldedSheetCuff.rotation.x = 0.05;
    bedGroup.add(foldedSheetCuff);

    // Sculpted Softly Folded Cotton Duvet Blanket with organic ripples & draped side overhangs
    const blanketTopGeo = track(new THREE.BoxGeometry(1.38, 0.11, 1.24, 14, 2, 14));
    const bPos = blanketTopGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const vx = bPos.getX(i);
      const vy = bPos.getY(i);
      const vz = bPos.getZ(i);
      if (vy > 0) {
        const fold =
          Math.sin(vx * 5.2 + vz * 2.1) * 0.014 +
          Math.cos(vz * 4.4 - vx * 1.8) * 0.011;
        const edgeRoll = -0.022 * Math.pow(Math.abs(vx) / 0.69, 3);
        bPos.setY(i, vy + fold + edgeRoll);
      }
    }
    blanketTopGeo.computeVertexNormals();
    const blanket = new THREE.Mesh(blanketTopGeo, matBedBlanket);
    blanket.position.set(0, 0.505, 0.31);
    bedGroup.add(blanket);

    // Soft Side Drapes of the duvet hanging naturally over the mattress edges
    [-0.7, 0.7].forEach((sideX) => {
      const drape = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.042, 0.24, 1.22)),
        matBedBlanket,
      );
      drape.position.set(sideX, 0.41, 0.31);
      bedGroup.add(drape);
    });
    const footDrape = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.4, 0.22, 0.045)),
      matBedBlanket,
    );
    footDrape.position.set(0, 0.41, 0.91);
    bedGroup.add(footDrape);

    // Textured Cream Wool Bedroom Rug (#E7DEC9, roughness ~0.95) sitting flush on oak floorboards
    const bedRug = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.42, 1.44, 0.014, 40)),
      bedroomMats.matCreamWoolRug,
    );
    bedRug.position.set(-4.65, 0.023, 3.65);
    bedRug.castShadow = false;
    bedRug.receiveShadow = true;
    bedroomRugsGroup.add(bedRug);

    const bedRugBorder = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.41, 0.009, 6, 48)),
      bedroomMats.matCottonSheet,
    );
    bedRugBorder.rotation.x = Math.PI / 2;
    bedRugBorder.position.set(-4.65, 0.028, 3.65);
    bedRugBorder.castShadow = false;
    bedRugBorder.receiveShadow = true;
    bedroomRugsGroup.add(bedRugBorder);

    const playRug = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.06, 1.08, 0.014, 36)),
      bedroomMats.matPlayWoolRug,
    );
    playRug.position.set(-3.35, 0.023, 2.55);
    playRug.castShadow = false;
    playRug.receiveShadow = true;
    bedroomRugsGroup.add(playRug);

    // Decorative Piped Floor Cushions neatly beside the play rug (toggled via showCushions)
    [
      { x: -3.65, z: 2.35, color: '#C66F52' },
      { x: -3.15, z: 2.75, color: '#637F69' },
      { x: -3.55, z: 2.85, color: '#CFA05A' },
    ].forEach((c) => {
      const cushGeo = track(new THREE.SphereGeometry(0.25, 20, 14));
      cushGeo.scale(1.0, 0.36, 1.0);
      const cush = new THREE.Mesh(
        cushGeo,
        track(
          new THREE.MeshStandardMaterial({
            color: c.color,
            bumpMap: bedroomMats.matCottonSheet.bumpMap,
            bumpScale: 0.01,
            roughness: 0.9,
          }),
        ),
      );
      cush.position.set(c.x, 0.088, c.z);
      bedroomCushionsGroup.add(cush);

      const tuftBtn = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.022, 0.022, 0.014, 10)),
        bedroomMats.matCottonSheet,
      );
      tuftBtn.position.set(c.x, 0.172, c.z);
      bedroomCushionsGroup.add(tuftBtn);
    });

    // Framed Childhood Wall Posters on the West linen-plaster wall + Vintage Wall Stickers
    [
      { x: -6.75, y: 2.35, z: 3.18, tex: bedroomMats.posterStarChartTex },
      { x: -6.75, y: 2.35, z: 4.18, tex: bedroomMats.posterAdventureTex },
    ].forEach((poster) => {
      const pFrameGroup = new THREE.Group();
      pFrameGroup.position.set(poster.x, poster.y, poster.z);
      const frameBox = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.036, 0.68, 0.54)),
        bedWoodMat,
      );
      pFrameGroup.add(frameBox);
      const printPlane = new THREE.Mesh(
        track(new THREE.PlaneGeometry(0.46, 0.6)),
        track(
          new THREE.MeshStandardMaterial({
            map: poster.tex,
            roughness: 0.42,
            metalness: 0.02,
          }),
        ),
      );
      printPlane.rotation.y = Math.PI / 2;
      printPlane.position.x = 0.02;
      pFrameGroup.add(printPlane);
      bedroomPostersGroup.add(pFrameGroup);
    });

    // Matte Paper Childhood Wall Stickers (stars, moon, planet, rocket, kite) on West bedroom wall
    const wallStickersPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.85, 0.85)),
      track(
        new THREE.MeshStandardMaterial({
          map: bedroomMats.wallStickerSheetTex,
          transparent: true,
          alphaTest: 0.08,
          roughness: 0.78,
          metalness: 0.0,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
      ),
    );
    wallStickersPlane.rotation.y = Math.PI / 2;
    wallStickersPlane.position.set(-6.768, 1.56, 3.68);
    bedroomPostersGroup.add(wallStickersPlane);

    // Warm Bedside Nightstand & Pleated Lamp in the SW bedroom alcove (toggled via showLamps)
    const nightstandLamp = new THREE.Group();
    nightstandLamp.position.set(-5.85, 0, 2.45);
    bedroomLampsGroup.add(nightstandLamp);

    // 4 Nightstand legs flush on floorboards
    [
      [-0.19, -0.19],
      [0.19, -0.19],
      [-0.19, 0.19],
      [0.19, 0.19],
    ].forEach(([nx, nz]) => {
      const nLeg = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.02, 0.015, 0.52, 8)),
        bedWoodMat,
      );
      nLeg.position.set(nx, 0.26, nz);
      nightstandLamp.add(nLeg);
    });
    const standCabinet = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.44, 0.28, 0.42)),
      bedWoodMat,
    );
    standCabinet.position.set(0, 0.37, 0);
    nightstandLamp.add(standCabinet);
    const standTop = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.48, 0.035, 0.46)),
      bedWoodMat,
    );
    standTop.position.set(0, 0.525, 0);
    nightstandLamp.add(standTop);

    // Turned brass lamp base & glowing linen drum shade
    const lampFoot = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.065, 0.082, 0.032, 16)),
      bedroomMats.matPolishedBrass,
    );
    lampFoot.position.set(0, 0.558, 0);
    nightstandLamp.add(lampFoot);
    const lampStem = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.016, 0.022, 0.17, 12)),
      bedroomMats.matPolishedBrass,
    );
    lampStem.position.set(0, 0.65, 0);
    nightstandLamp.add(lampStem);
    const standShade = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.115, 0.165, 0.21, 20, 1, true)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#FFF2D4',
          emissive: new THREE.Color('#FFD28E'),
          emissiveIntensity: 0.72,
          roughness: 0.85,
          side: THREE.DoubleSide,
        }),
      ),
    );
    standShade.position.set(0, 0.78, 0);
    nightstandLamp.add(standShade);

    const bedsideGlowLight = new THREE.PointLight('#FFD28E', 0.78, 3.4, 1.7);
    bedsideGlowLight.position.set(0, 0.74, 0);
    bedsideGlowLight.castShadow = false;
    nightstandLamp.add(bedsideGlowLight);

    // Sculpted Soft Cotton Pillows with subtle pinched folds inside bedPillowBounceGroup
    bedPillowBounceGroup = new THREE.Group();
    bedPillowBounceGroup.position.set(0, 0.585, -0.6);
    bedGroup.add(bedPillowBounceGroup);

    const makePillowGeo = () => {
      const g = track(new THREE.SphereGeometry(0.29, 18, 14));
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        // Sculpt soft pinched pillow silhouette
        const sx = x * 1.02;
        const sy = y * 0.34 * (1 - 0.18 * (x * x + z * z));
        const sz = z * 0.68;
        const crease = Math.sin(x * 11) * 0.006 * (y > 0 ? 1 : -0.5);
        p.setXYZ(i, sx, sy + crease, sz);
      }
      g.computeVertexNormals();
      return g;
    };
    const pillowGeo = makePillowGeo();

    [-0.31, 0.31].forEach((px, pIdx) => {
      const pillow = new THREE.Mesh(pillowGeo, bedroomMats.matCottonPillow);
      pillow.position.set(px, 0, pIdx === 0 ? -0.01 : 0.01);
      pillow.rotation.set(0.18, pIdx === 0 ? 0.06 : -0.07, 0);
      bedPillowBounceGroup!.add(pillow);
    });

    // Multi-Part Plush Childhood Teddy Bear resting snugly on the pillows
    const bedTeddyGroup = new THREE.Group();
    bedTeddyGroup.position.set(0, 0.06, 0.11);
    bedTeddyGroup.rotation.y = 0.12;
    bedPillowBounceGroup.add(bedTeddyGroup);

    const bedTeddyMat = track(
      new THREE.MeshStandardMaterial({
        color: '#A96D3B',
        bumpMap: bedroomMats.matCreamWoolRug.bumpMap,
        bumpScale: 0.014,
        roughness: 0.92,
      }),
    );
    const bedTeddyMuzzleMat = track(
      new THREE.MeshStandardMaterial({ color: '#E3C69E', roughness: 0.88 }),
    );
    const bedTeddyButtonMat = track(
      new THREE.MeshStandardMaterial({ color: '#221812', roughness: 0.25 }),
    );
    const bedTeddyRibbonMat = track(
      new THREE.MeshStandardMaterial({ color: '#9E322C', roughness: 0.62 }),
    );

    const bedTeddyBody = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.115, 16, 14)),
      bedTeddyMat,
    );
    bedTeddyBody.scale.set(0.95, 1.08, 0.88);
    bedTeddyBody.position.set(0, 0.11, 0);
    bedTeddyGroup.add(bedTeddyBody);

    const teddyBelly = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.072, 12, 10)),
      bedTeddyMuzzleMat,
    );
    teddyBelly.scale.set(0.9, 1.0, 0.45);
    teddyBelly.position.set(0, 0.1, 0.082);
    bedTeddyGroup.add(teddyBelly);

    const bedTeddyHead = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.092, 16, 14)),
      bedTeddyMat,
    );
    bedTeddyHead.position.set(0, 0.265, 0.01);
    bedTeddyGroup.add(bedTeddyHead);

    const teddySnout = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.038, 12, 10)),
      bedTeddyMuzzleMat,
    );
    teddySnout.scale.set(1.1, 0.85, 0.95);
    teddySnout.position.set(0, 0.248, 0.088);
    bedTeddyGroup.add(teddySnout);

    const teddyNose = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.014, 10, 8)),
      bedTeddyButtonMat,
    );
    teddyNose.position.set(0, 0.258, 0.122);
    bedTeddyGroup.add(teddyNose);

    [-0.032, 0.032].forEach((ex) => {
      const eye = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.011, 8, 8)),
        bedTeddyButtonMat,
      );
      eye.position.set(ex, 0.282, 0.084);
      bedTeddyGroup.add(eye);
    });
    [-0.068, 0.068].forEach((ex) => {
      const ear = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.034, 10, 10)),
        bedTeddyMat,
      );
      ear.scale.set(1, 1, 0.6);
      ear.position.set(ex, 0.345, -0.005);
      bedTeddyGroup.add(ear);
    });
    [-0.1, 0.1].forEach((ax) => {
      const arm = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.044, 10, 10)),
        bedTeddyMat,
      );
      arm.scale.set(0.75, 1.3, 0.78);
      arm.position.set(ax, 0.135, 0.04);
      arm.rotation.z = ax < 0 ? 0.38 : -0.38;
      bedTeddyGroup.add(arm);
    });
    [-0.062, 0.062].forEach((lx) => {
      const leg = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.046, 10, 10)),
        bedTeddyMat,
      );
      leg.scale.set(0.85, 0.8, 1.25);
      leg.position.set(lx, 0.04, 0.09);
      bedTeddyGroup.add(leg);
    });
    const teddyBow = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.056, 0.011, 6, 16)),
      bedTeddyRibbonMat,
    );
    teddyBow.rotation.x = Math.PI / 2;
    teddyBow.position.set(0, 0.19, 0.015);
    bedTeddyGroup.add(teddyBow);

    const bedMem = findLinkedMemoryForObject(
      'wooden_bed',
      /bed|sleep|teddy|dream|story|night|childhood/,
    );
    registerInteractiveHitbox(
      bedGroup,
      'wooden_bed',
      'bedroom',
      'Childhood Wooden Bed & Teddy Bear',
      'Click or press [E] to fluff pillows, hug teddy & view bedtime memory',
      [1.6, 1.2, 2.1],
      [0, 0.6, 0],
      bedMem,
    );

    // Shaker-Paneled Walnut Bedroom Wardrobe with Opening Hinged Door along the South-West wall (facing North)
    const wardrobeGroup = interactiveObjectGroups.wardrobe;
    wardrobeGroup.position.set(-4.35, 0, 6.08);
    wardrobeGroup.rotation.y = Math.PI;
    spaceGroups.bedroom.add(wardrobeGroup);

    const wardrobePlinth = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.02, 0.1, 0.56)),
      bedWoodMat,
    );
    wardrobePlinth.position.set(0, 0.05, 0);
    wardrobeGroup.add(wardrobePlinth);

    const wardrobeBody = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.96, 1.84, 0.52)),
      bedWoodMat,
    );
    wardrobeBody.position.set(0, 1.0, 0);
    wardrobeGroup.add(wardrobeBody);
    cameraObstacleMeshes.push(wardrobeBody);

    const wardrobeCrown = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.06, 0.09, 0.58)),
      bedWoodMat,
    );
    wardrobeCrown.position.set(0, 1.96, 0.01);
    wardrobeGroup.add(wardrobeCrown);

    wardrobeDoorPivot = new THREE.Group();
    wardrobeDoorPivot.position.set(-0.46, 0.99, 0.27);
    wardrobeGroup.add(wardrobeDoorPivot);

    const wardrobeDoorMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.92, 1.8, 0.04)),
      matWardrobeDoor,
    );
    wardrobeDoorMesh.position.set(0.46, 0, 0);
    wardrobeDoorPivot.add(wardrobeDoorMesh);

    // Shaker recessed door molding panels + brass hinges
    [0.44, -0.44].forEach((py) => {
      const panelTrim = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.72, 0.66, 0.016)),
        bedWoodMat,
      );
      panelTrim.position.set(0.46, py, 0.022);
      wardrobeDoorPivot!.add(panelTrim);
    });
    [-0.64, 0.64].forEach((hy) => {
      const hinge = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.01, 0.01, 0.065, 8)),
        bedroomMats.matPolishedBrass,
      );
      hinge.position.set(0.01, hy, 0.02);
      wardrobeDoorPivot!.add(hinge);
    });

    const wardrobeHandle = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.032, 12, 10)),
      bedroomMats.matPolishedBrass,
    );
    wardrobeHandle.position.set(0.82, 0, 0.046);
    wardrobeDoorPivot.add(wardrobeHandle);

    const wardrobeMem = findLinkedMemoryForObject(
      'wardrobe',
      /wardrobe|cupboard|photo|outfit|dress|uniform|school|clothes|jacket/,
    );
    registerInteractiveHitbox(
      wardrobeGroup,
      'wardrobe',
      'bedroom',
      'Cupboard — Photo Collection',
      'Click or press [E] to open the cupboard and browse uploaded photos',
      [1.15, 2.0, 0.85],
      [0, 1.0, 0.15],
      wardrobeMem,
    );

    // Bedroom Retro Television Set in the SW alcove along the South-West wall
    const tvGroup = interactiveObjectGroups.bedroom_tv;
    tvGroup.position.set(-2.95, 0, 6.02);
    tvGroup.rotation.y = Math.PI;
    spaceGroups.bedroom.add(tvGroup);

    // Console table with tapered legs & shelf flush on floorboards
    [
      [-0.36, -0.18],
      [0.36, -0.18],
      [-0.36, 0.18],
      [0.36, 0.18],
    ].forEach(([tx, tz]) => {
      const tLeg = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.022, 0.016, 0.6, 8)),
        bedWoodMat,
      );
      tLeg.position.set(tx, 0.3, tz);
      tvGroup.add(tLeg);
    });
    const tvStand = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.84, 0.24, 0.45)),
      bedWoodMat,
    );
    tvStand.position.set(0, 0.48, 0);
    tvGroup.add(tvStand);
    cameraObstacleMeshes.push(tvStand);

    const tvLowerShelf = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.76, 0.03, 0.38)),
      bedWoodMat,
    );
    tvLowerShelf.position.set(0, 0.16, 0);
    tvGroup.add(tvLowerShelf);

    const tvCabinet = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.74, 0.54, 0.38)),
      track(
        new THREE.MeshStandardMaterial({
          map: bedroomMats.matBedWalnut.map,
          color: '#5B3E2B',
          roughness: 0.48,
        }),
      ),
    );
    tvCabinet.position.set(0, 0.87, 0);
    tvGroup.add(tvCabinet);
    cameraObstacleMeshes.push(tvCabinet);

    const tvBezel = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.64, 0.45, 0.026)),
      bedroomMats.matDarkAnodizedMetal,
    );
    tvBezel.position.set(-0.02, 0.88, 0.186);
    tvGroup.add(tvBezel);

    bedroomTvScreenMat = track(
      new THREE.MeshStandardMaterial({
        color: '#2B4C6F',
        emissive: new THREE.Color('#5CA8FF'),
        emissiveIntensity: 0.35,
        roughness: 0.16,
        metalness: 0.08,
      }),
    );
    const tvScreen = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.56, 0.38)),
      bedroomTvScreenMat,
    );
    tvScreen.position.set(-0.02, 0.88, 0.201);
    tvGroup.add(tvScreen);

    // Rotary tuning dials + classic V rabbit-ear brass antennas
    [0.98, 0.86].forEach((dy) => {
      const dial = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.02, 0.02, 0.022, 10)),
        bedroomMats.matPolishedBrass,
      );
      dial.rotation.x = Math.PI / 2;
      dial.position.set(0.325, dy, 0.195);
      tvGroup.add(dial);
    });
    [-1, 1].forEach((side) => {
      const ant = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.004, 0.005, 0.34, 6)),
        bedroomMats.matAntiqueSilver,
      );
      ant.position.set(side * 0.11, 1.28, -0.02);
      ant.rotation.z = side * -0.46;
      tvGroup.add(ant);
    });

    const tvMem = findLinkedMemoryForObject(
      'bedroom_tv',
      /video|tv|television|cartoon|movie|film|tape/,
    );
    registerInteractiveHitbox(
      tvGroup,
      'bedroom_tv',
      'bedroom',
      'Bedroom Vintage Television',
      'Click or press [E] to toggle childhood video broadcast & inspect memory',
      [0.95, 1.4, 0.65],
      [0, 0.7, 0],
      tvMem,
    );
  }

  // -------------------------------------------------------------------------
  // SPACE B: STUDY CORNER (North-West Alcove: x = -5.25, z = -4.65)
  // Study Desk with Sliding Drawer, Brass Reading Lamp & Spinning Globe
  // Positioned cleanly in the NW corner so it never overlaps the Keepsake Vitrine
  // -------------------------------------------------------------------------
  let deskDrawerMesh: THREE.Mesh | null = null;
  let globeSphereMesh: THREE.Mesh | null = null;
  let studyDeskLampGroup: THREE.Group | null = null;
  {
    const deskGroup = interactiveObjectGroups.study_desk;
    deskGroup.position.set(-5.25, 0, -4.65);
    deskGroup.rotation.y = Math.PI * 0.36;
    spaceGroups.study_corner.add(deskGroup);

    // Warm Wood Study Table (#735137, roughness ~0.60) with beveled top, apron rails & brass-ferrule legs
    const deskTop = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.34, 0.065, 0.76)),
      matStudyDeskTop,
    );
    deskTop.position.set(0, 0.762, 0);
    deskGroup.add(deskTop);
    cameraObstacleMeshes.push(deskTop);

    // Under-top structural wooden apron rails
    const deskBackApron = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.18, 0.11, 0.035)),
      bedroomMats.matDeskWood,
    );
    deskBackApron.position.set(0, 0.675, -0.31);
    deskGroup.add(deskBackApron);
    [-0.58, 0.58].forEach((sx) => {
      const sideApron = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.035, 0.11, 0.62)),
        bedroomMats.matDeskWood,
      );
      sideApron.position.set(sx, 0.675, 0);
      deskGroup.add(sideApron);
    });

    // 4 Tapered Wooden Desk Legs planted flush at y = 0 with polished brass ferrules
    [
      [-0.58, -0.3],
      [0.58, -0.3],
      [-0.58, 0.3],
      [0.58, 0.3],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.034, 0.023, 0.73, 12)),
        bedroomMats.matDeskWood,
      );
      leg.position.set(lx, 0.365, lz);
      deskGroup.add(leg);

      const ferrule = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.025, 0.023, 0.065, 12)),
        bedroomMats.matPolishedBrass,
      );
      ferrule.position.set(lx, 0.038, lz);
      deskGroup.add(ferrule);
    });

    deskDrawerMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.58, 0.105, 0.62)),
      bedroomMats.matDeskWood,
    );
    deskDrawerMesh.position.set(0, 0.675, 0.04);
    deskGroup.add(deskDrawerMesh);

    // Brass cup drawer pull attached to deskDrawerMesh so it slides cleanly with the drawer
    const drawerPull = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.028, 0.007, 8, 12, Math.PI)),
      bedroomMats.matPolishedBrass,
    );
    drawerPull.rotation.x = Math.PI;
    drawerPull.position.set(0, -0.005, 0.318);
    deskDrawerMesh.add(drawerPull);

    // Subtle school desk details: stacked notebook & ceramic cup with colored pencils
    const notebookStack = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.18, 0.022, 0.24)),
      track(new THREE.MeshStandardMaterial({ color: '#3E5B74', roughness: 0.78 })),
    );
    notebookStack.position.set(-0.48, 0.806, 0.04);
    notebookStack.rotation.y = 0.14;
    deskGroup.add(notebookStack);

    const pencilCup = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.034, 0.03, 0.088, 14)),
      bedroomMats.matCreamTrim,
    );
    pencilCup.position.set(-0.54, 0.838, -0.24);
    deskGroup.add(pencilCup);
    ['#C84B3B', '#E2A83B', '#3E7A56'].forEach((pHex, pIdx) => {
      const pencil = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.0045, 0.0045, 0.135, 6)),
        track(new THREE.MeshStandardMaterial({ color: pHex, roughness: 0.6 })),
      );
      pencil.position.set(
        -0.54 + (pIdx - 1) * 0.013,
        0.885,
        -0.24 + (pIdx % 2 === 0 ? 0.008 : -0.008),
      );
      pencil.rotation.z = (pIdx - 1) * 0.16;
      deskGroup.add(pencil);
    });

    // Articulated Brass & Emerald Banker's Study Lamp + Warm Study Lamp Glow (#FFD28E)
    studyDeskLampGroup = new THREE.Group();
    deskGroup.add(studyDeskLampGroup);

    const lampBase = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.082, 0.105, 0.032, 18)),
      bedroomMats.matPolishedBrass,
    );
    lampBase.position.set(-0.44, 0.811, -0.17);
    studyDeskLampGroup.add(lampBase);

    const lampLowerArm = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.012, 0.015, 0.24, 10)),
      bedroomMats.matPolishedBrass,
    );
    lampLowerArm.position.set(-0.44, 0.93, -0.18);
    lampLowerArm.rotation.z = -0.12;
    studyDeskLampGroup.add(lampLowerArm);

    const lampJoint = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.02, 10, 10)),
      bedroomMats.matPolishedBrass,
    );
    lampJoint.position.set(-0.425, 1.05, -0.18);
    studyDeskLampGroup.add(lampJoint);

    const lampUpperArm = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.01, 0.012, 0.16, 10)),
      bedroomMats.matPolishedBrass,
    );
    lampUpperArm.position.set(-0.37, 1.11, -0.14);
    lampUpperArm.rotation.z = -0.78;
    lampUpperArm.rotation.x = 0.4;
    studyDeskLampGroup.add(lampUpperArm);

    const lampShade = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.145, 0.14, 20, 1, true)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#25523D',
          emissive: new THREE.Color('#FFD28E'),
          emissiveIntensity: 0.38,
          roughness: 0.26,
          metalness: 0.18,
          side: THREE.DoubleSide,
        }),
      ),
    );
    lampShade.position.set(-0.32, 1.11, -0.1);
    lampShade.rotation.z = -0.22;
    studyDeskLampGroup.add(lampShade);

    const lampBulb = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.032, 12, 10)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#FFF9E8',
          emissive: new THREE.Color('#FFD28E'),
          emissiveIntensity: 2.2,
          roughness: 0.2,
        }),
      ),
    );
    lampBulb.position.set(-0.32, 1.06, -0.1);
    studyDeskLampGroup.add(lampBulb);

    // Warm Study Lamp Glow (#FFD28E) illuminating desk wood, retro PC & open notebooks
    const studyLampGlow = new THREE.PointLight('#FFD28E', 1.45, 4.2, 1.6);
    studyLampGlow.position.set(-0.3, 1.02, -0.08);
    studyLampGlow.castShadow = false;
    studyDeskLampGroup.add(studyLampGlow);

    const deskMem = findLinkedMemoryForObject(
      'study_desk',
      /study|desk|school|certificate|exam|book|homework|letter|diary/,
    );
    registerInteractiveHitbox(
      deskGroup,
      'study_desk',
      'study_corner',
      'Study Desk & Certificate Drawer',
      'Click or press [E] to slide open desk drawer & read archival notes',
      [1.45, 1.3, 0.9],
      [0, 0.65, 0],
      deskMem,
    );

    // Interactive Vintage Spinning World Globe seated flush on rear-right corner of Study Desk (y = 0.7945)
    const globeGroup = interactiveObjectGroups.spinning_globe;
    globeGroup.position.set(-5.23, 0.7945, -5.18);
    spaceGroups.study_corner.add(globeGroup);

    const globeBase = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.085, 0.115, 0.042, 18)),
      bedroomMats.matBedWalnut,
    );
    globeBase.position.y = 0.021;
    globeGroup.add(globeBase);

    const globeStem = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.015, 0.022, 0.06, 12)),
      bedroomMats.matPolishedBrass,
    );
    globeStem.position.y = 0.062;
    globeGroup.add(globeStem);

    const globeMeridian = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.188, 0.01, 10, 28, Math.PI * 1.15)),
      bedroomMats.matPolishedBrass,
    );
    globeMeridian.position.set(0, 0.24, 0);
    globeMeridian.rotation.z = -Math.PI * 0.56;
    globeGroup.add(globeMeridian);

    globeSphereMesh = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.165, 24, 20)),
      bedroomMats.matVintageGlobe,
    );
    globeSphereMesh.position.set(0, 0.24, 0);
    globeSphereMesh.rotation.z = 0.41; // Realistic 23.5° axial tilt
    globeGroup.add(globeSphereMesh);

    const globeMem = findLinkedMemoryForObject(
      'spinning_globe',
      /globe|map|world|travel|geography|trip|atlas/,
    );
    registerInteractiveHitbox(
      globeGroup,
      'spinning_globe',
      'study_corner',
      'Brass & Parchment Spinning Globe',
      'Click or press [E] to spin the world globe & explore place memories',
      [0.55, 0.65, 0.55],
      [0, 0.22, 0],
      globeMem,
    );

    // Composite 3D Walnut Childhood Bookshelf along West Wall (x = -6.56, z = -1.15)
    const shelfGroup = interactiveObjectGroups.bookshelf;
    shelfGroup.position.set(-6.56, 0, -1.15);
    shelfGroup.rotation.y = Math.PI / 2;
    spaceGroups.study_corner.add(shelfGroup);

    const shelfBack = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.66, 2.18, 0.05)),
      track(
        new THREE.MeshStandardMaterial({
          map: bedroomMats.matBedWalnut.map,
          color: '#573A26',
          roughness: 0.72,
        }),
      ),
    );
    shelfBack.position.set(0, 1.09, -0.18);
    shelfGroup.add(shelfBack);

    [-0.81, 0.81].forEach((sx) => {
      const sidePanel = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.06, 2.18, 0.42)),
        bedroomMats.matBedWalnut,
      );
      sidePanel.position.set(sx, 1.09, 0);
      shelfGroup.add(sidePanel);
    });

    const crownTop = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.76, 0.095, 0.48)),
      bedroomMats.matBedWalnut,
    );
    crownTop.position.set(0, 2.21, 0.01);
    shelfGroup.add(crownTop);

    [0.08, 0.58, 1.08, 1.58, 2.08].forEach((sy) => {
      const plank = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.58, 0.045, 0.39)),
        bedroomMats.matBedWalnut,
      );
      plank.position.set(0, sy, 0.01);
      shelfGroup.add(plank);

      const brassLip = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.58, 0.014, 0.015)),
        bedroomMats.matPolishedBrass,
      );
      brassLip.position.set(0, sy, 0.21);
      shelfGroup.add(brassLip);
    });

    // Varied Childhood Book Spines across 3 shelves (linen/leather colors, gold bands, leaning books & brass bookends)
    const bookColors = [
      '#8E3529',
      '#2B5842',
      '#355573',
      '#B47D3B',
      '#674366',
      '#9B5833',
      '#4A6B62',
      '#7B3A42',
    ];
    const bookMats = bookColors.map((hex) =>
      track(
        new THREE.MeshStandardMaterial({
          color: hex,
          bumpMap: bedroomMats.matAgedLeather.bumpMap,
          bumpScale: 0.006,
          roughness: 0.68,
        }),
      ),
    );
    [0.103, 0.603, 1.103].forEach((shelfTopY, rowIdx) => {
      let cursorX = -0.68 + rowIdx * 0.06;
      const count = rowIdx === 0 ? 9 : 8;
      for (let bi = 0; bi < count; bi++) {
        const bw = 0.044 + ((bi * 3 + rowIdx) % 4) * 0.011;
        const bh = 0.23 + ((bi * 2 + rowIdx) % 4) * 0.042;
        const bd = 0.21 + ((bi + rowIdx) % 2) * 0.04;
        const isLeaning = bi === count - 1;
        const bookGroup = new THREE.Group();
        bookGroup.position.set(
          cursorX + bw * 0.5 + (isLeaning ? 0.045 : 0),
          shelfTopY + bh * 0.5 - (isLeaning ? 0.012 : 0),
          0.02,
        );
        if (isLeaning) bookGroup.rotation.z = -0.26;

        const bookCover = new THREE.Mesh(
          track(new THREE.BoxGeometry(bw, bh, bd)),
          bookMats[(bi + rowIdx * 3) % bookMats.length],
        );
        bookGroup.add(bookCover);

        // Cream page block subtly recessed from cover
        const pages = new THREE.Mesh(
          track(new THREE.BoxGeometry(bw * 0.78, bh * 0.94, bd * 0.92)),
          bedroomMats.matAgedPaper,
        );
        pages.position.z = -0.008;
        bookGroup.add(pages);

        // Gold-foil spine band
        if (bi % 2 === 0) {
          const band = new THREE.Mesh(
            track(new THREE.BoxGeometry(bw + 0.002, 0.016, 0.008)),
            bedroomMats.matPolishedBrass,
          );
          band.position.set(0, bh * 0.24, bd * 0.5);
          bookGroup.add(band);
        }
        shelfGroup.add(bookGroup);
        cursorX += bw + 0.012;
      }

      // Brass L-bookend keeping the books grounded
      const bookend = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.018, 0.14, 0.14)),
        bedroomMats.matPolishedBrass,
      );
      bookend.position.set(cursorX + 0.08, shelfTopY + 0.07, 0.02);
      shelfGroup.add(bookend);
    });

    // 4th Bookshelf Tier (y = 1.603): Horizontal vintage book stack, carved wooden biplane & keepsake box
    {
      const topShelfY = 1.603;
      const stackSpecs: Array<[number, number, number, number, number]> = [
        [-0.44, topShelfY + 0.022, 0.02, 0.34, 0.044],
        [-0.42, topShelfY + 0.062, 0.01, 0.3, 0.036],
        [-0.43, topShelfY + 0.096, 0.02, 0.25, 0.032],
      ];
      stackSpecs.forEach(([sx, sy, sz, sw, sh], idx) => {
        const flatBook = new THREE.Mesh(
          track(new THREE.BoxGeometry(sw, sh, 0.22)),
          bookMats[(idx + 2) % bookMats.length],
        );
        flatBook.position.set(sx, sy, sz);
        flatBook.rotation.y = (idx - 1) * 0.08;
        shelfGroup.add(flatBook);
      });

      // Miniature Carved Wooden Toy Biplane resting flush on top shelf
      const biplaneGroup = new THREE.Group();
      biplaneGroup.position.set(0.08, topShelfY + 0.056, 0.03);
      biplaneGroup.rotation.y = -0.32;
      const fuselage = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.024, 0.016, 0.26, 10)),
        bedroomMats.matWillowBat,
      );
      fuselage.rotation.z = Math.PI / 2;
      biplaneGroup.add(fuselage);
      [0.042, -0.018].forEach((wy) => {
        const wing = new THREE.Mesh(
          track(new THREE.BoxGeometry(0.068, 0.012, 0.28)),
          bookMats[0],
        );
        wing.position.set(0.03, wy, 0);
        biplaneGroup.add(wing);
      });
      const tailFin = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.045, 0.055, 0.01)),
        bookMats[0],
      );
      tailFin.position.set(-0.11, 0.03, 0);
      biplaneGroup.add(tailFin);
      const propHub = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.008, 0.09, 0.014)),
        bedroomMats.matPolishedBrass,
      );
      propHub.position.set(0.135, 0, 0);
      biplaneGroup.add(propHub);
      [-0.04, 0.04].forEach((wz) => {
        const planeWheel = new THREE.Mesh(
          track(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 10)),
          bedroomMats.matDarkAnodizedMetal,
        );
        planeWheel.rotation.x = Math.PI / 2;
        planeWheel.position.set(0.05, -0.036, wz);
        biplaneGroup.add(planeWheel);
      });
      shelfGroup.add(biplaneGroup);

      // Brass-clasped wooden keepsake box on right end of 4th shelf
      const keepBox = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.24, 0.11, 0.18)),
        bedroomMats.matDeskWood,
      );
      keepBox.position.set(0.5, topShelfY + 0.055, 0.02);
      keepBox.rotation.y = -0.14;
      shelfGroup.add(keepBox);
      const keepClasp = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.036, 0.032, 0.01)),
        bedroomMats.matPolishedBrass,
      );
      keepClasp.position.set(0.5, topShelfY + 0.065, 0.112);
      shelfGroup.add(keepClasp);
    }

    const bookshelfMem = findLinkedMemoryForObject(
      'bookshelf',
      /book|bookshelf|school|read|notebook|library|comic|study/,
    );
    registerInteractiveHitbox(
      shelfGroup,
      'bookshelf',
      'study_corner',
      'Childhood Bookshelf',
      'Click or press [E] to inspect books & school memories on the shelf',
      [1.72, 2.24, 0.56],
      [0, 1.12, 0.04],
      bookshelfMem,
    );
  }

  // -------------------------------------------------------------------------
  // SPACE C: CHILDHOOD PLAY AREA (Organized around perimeter & central track)
  // Hinged Toy Chest, Classic Toys, Chugging Toy Train, Chalk Hopscotch & Cricket Set
  // -------------------------------------------------------------------------
  let toyChestLidPivot: THREE.Group | null = null;
  let toyTrainCarriageGroup: THREE.Group | null = null;
  let hopscotchPuckMesh: THREE.Mesh | null = null;
  let cricketBatPivot: THREE.Group | null = null;
  let cricketBallMesh: THREE.Mesh | null = null;
  {
    // 1. Hinged Wooden Toy Storage Chest + Classic Wooden Blocks in SW Play Alcove
    const chestGroup = interactiveObjectGroups.toy_chest;
    chestGroup.position.set(-3.55, 0, 2.35);
    chestGroup.rotation.y = 0.42;
    spaceGroups.play_area.add(chestGroup);

    // 4 short oak chest feet flush on oak floorboards
    [
      [-0.39, -0.22],
      [0.39, -0.22],
      [-0.39, 0.22],
      [0.39, 0.22],
    ].forEach(([cx, cz]) => {
      const foot = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.07, 0.045, 0.07)),
        bedroomMats.matBedWalnut,
      );
      foot.position.set(cx, 0.0225, cz);
      chestGroup.add(foot);
    });

    const chestBox = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.86, 0.41, 0.52)),
      bedroomMats.matBedWalnut,
    );
    chestBox.position.set(0, 0.245, 0);
    chestGroup.add(chestBox);

    // Brass chest clasp & corner straps
    const chestClasp = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.08, 0.075, 0.025)),
      bedroomMats.matPolishedBrass,
    );
    chestClasp.position.set(0, 0.39, 0.266);
    chestGroup.add(chestClasp);

    [-0.415, 0.415].forEach((bx) => {
      const strap = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.04, 0.42, 0.535)),
        bedroomMats.matPolishedBrass,
      );
      strap.position.set(bx, 0.245, 0);
      chestGroup.add(strap);
    });

    toyChestLidPivot = new THREE.Group();
    toyChestLidPivot.position.set(0, 0.45, -0.25);
    chestGroup.add(toyChestLidPivot);

    const chestLid = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.9, 0.08, 0.56)),
      bedroomMats.matDeskWood,
    );
    chestLid.position.set(0, 0.04, 0.25);
    toyChestLidPivot.add(chestLid);

    // Classic painted wooden alphabet/stacking blocks, spinning top & toy car resting flush on playRug (y = 0.030)
    const blockSpecs: Array<[number, number, number, string, number]> = [
      [0.54, 0.07, 0.16, '#C84B3B', 0.25],
      [0.64, 0.07, 0.14, '#3D6E8E', -0.18],
      [0.59, 0.15, 0.15, '#D9A043', 0.45],
    ];
    blockSpecs.forEach(([bx, by, bz, colorHex, ry]) => {
      const blk = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.08, 0.08, 0.08)),
        track(new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.68 })),
      );
      blk.position.set(bx, by, bz);
      blk.rotation.y = ry;
      chestGroup.add(blk);
    });

    // Classic Wooden Spinning Top leaning naturally beside blocks
    const spinTopGroup = new THREE.Group();
    spinTopGroup.position.set(0.46, 0.058, 0.3);
    spinTopGroup.rotation.z = 0.28;
    const topCone = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.042, 0.062, 16)),
      track(new THREE.MeshStandardMaterial({ color: '#B54736', roughness: 0.5 })),
    );
    topCone.rotation.x = Math.PI;
    spinTopGroup.add(topCone);
    const topBand = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.043, 0.043, 0.012, 16)),
      bedroomMats.matCreamTrim,
    );
    topBand.position.y = 0.024;
    spinTopGroup.add(topBand);
    const topStem = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.008, 0.009, 0.038, 10)),
      bedroomMats.matWillowBat,
    );
    topStem.position.y = 0.046;
    spinTopGroup.add(topStem);
    chestGroup.add(spinTopGroup);

    // Classic Hand-Painted Wooden Toy Car seated flush beside chest
    const toyCarGroup = new THREE.Group();
    toyCarGroup.position.set(0.66, 0.03, 0.34);
    toyCarGroup.rotation.y = -0.58;
    const carBody = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.18, 0.055, 0.095)),
      track(new THREE.MeshStandardMaterial({ color: '#396987', roughness: 0.52 })),
    );
    carBody.position.y = 0.048;
    toyCarGroup.add(carBody);
    const carCabin = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.095, 0.048, 0.086)),
      bedroomMats.matCreamTrim,
    );
    carCabin.position.set(-0.01, 0.094, 0);
    toyCarGroup.add(carCabin);
    [
      [-0.055, 0.05],
      [0.055, 0.05],
      [-0.055, -0.05],
      [0.055, -0.05],
    ].forEach(([wx, wz]) => {
      const carWheel = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.024, 0.024, 0.016, 12)),
        bedroomMats.matBedWalnut,
      );
      carWheel.rotation.x = Math.PI / 2;
      carWheel.position.set(wx, 0.024, wz);
      toyCarGroup.add(carWheel);
    });
    chestGroup.add(toyCarGroup);

    const chestMem = findLinkedMemoryForObject(
      'toy_chest',
      /toy|chest|blocks|lego|game|doll|action|play/,
    );
    registerInteractiveHitbox(
      chestGroup,
      'toy_chest',
      'play_area',
      'Hinged Childhood Toy Chest',
      'Click or press [E] to open/close toy chest lid & inspect childhood toys',
      [1.05, 0.85, 0.75],
      [0, 0.4, 0],
      chestMem,
    );

    // 2. Classic Wooden & Brass Express Toy Train on Circular Track around Central Tree Plinth (0, 0, -1.1)
    const trainRoot = interactiveObjectGroups.toy_train;
    trainRoot.position.set(0, 0, -1.1);
    spaceGroups.play_area.add(trainRoot);

    [1.56, 1.68].forEach((r) => {
      const railRing = new THREE.Mesh(
        track(new THREE.TorusGeometry(r, 0.011, 8, 64)),
        bedroomMats.matPolishedBrass,
      );
      railRing.rotation.x = Math.PI / 2;
      railRing.position.y = 0.018;
      trainRoot.add(railRing);
    });
    // Wooden railway sleepers around track
    for (let ti = 0; ti < 32; ti++) {
      const ang = (ti / 32) * Math.PI * 2;
      const sleeper = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.18, 0.012, 0.032)),
        bedroomMats.matBedWalnut,
      );
      sleeper.position.set(Math.cos(ang) * 1.62, 0.008, Math.sin(ang) * 1.62);
      sleeper.rotation.y = -ang;
      trainRoot.add(sleeper);
    }

    toyTrainCarriageGroup = new THREE.Group();
    toyTrainCarriageGroup.position.set(1.62, 0.025, 0);
    trainRoot.add(toyTrainCarriageGroup);

    const trainRedMat = track(
      new THREE.MeshStandardMaterial({ color: '#9C2D23', roughness: 0.42, metalness: 0.08 }),
    );
    const trainGreenMat = track(
      new THREE.MeshStandardMaterial({ color: '#2B5B44', roughness: 0.46, metalness: 0.06 }),
    );
    const trainChassis = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.36, 0.04, 0.16)),
      bedroomMats.matDarkAnodizedMetal,
    );
    trainChassis.position.set(0, 0.048, 0);
    toyTrainCarriageGroup.add(trainChassis);

    const locoBoiler = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.068, 0.068, 0.22, 16)),
      trainRedMat,
    );
    locoBoiler.rotation.z = Math.PI / 2;
    locoBoiler.position.set(0.05, 0.12, 0);
    toyTrainCarriageGroup.add(locoBoiler);

    const locoCab = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.13, 0.16, 0.15)),
      trainGreenMat,
    );
    locoCab.position.set(-0.1, 0.145, 0);
    toyTrainCarriageGroup.add(locoCab);

    const locoRoof = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.15, 0.02, 0.17)),
      bedroomMats.matDarkAnodizedMetal,
    );
    locoRoof.position.set(-0.1, 0.232, 0);
    toyTrainCarriageGroup.add(locoRoof);

    const locoChimney = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.028, 0.02, 0.11, 12)),
      bedroomMats.matPolishedBrass,
    );
    locoChimney.position.set(0.12, 0.21, 0);
    toyTrainCarriageGroup.add(locoChimney);

    const locoDome = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.032, 12, 10)),
      bedroomMats.matPolishedBrass,
    );
    locoDome.position.set(0.03, 0.19, 0);
    toyTrainCarriageGroup.add(locoDome);

    // 4 Spoked Brass Wheels sitting flush on rail top
    [
      [-0.1, 0.085],
      [0.09, 0.085],
      [-0.1, -0.085],
      [0.09, -0.085],
    ].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.04, 0.04, 0.018, 14)),
        bedroomMats.matPolishedBrass,
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.04, wz);
      toyTrainCarriageGroup!.add(wheel);
    });

    const trainMem = findLinkedMemoryForObject(
      'toy_train',
      /train|track|railway|engine|toy/,
    );
    registerInteractiveHitbox(
      toyTrainCarriageGroup,
      'toy_train',
      'play_area',
      'Express Childhood Toy Train',
      'Click or press [E] to toggle chugging train around the circular track',
      [0.65, 0.5, 0.5],
      [0, 0.15, 0],
      trainMem,
    );

    // 3. Chalk Hopscotch Court in the South-East Play Court
    const hopscotchGroup = interactiveObjectGroups.hopscotch;
    hopscotchGroup.position.set(2.35, 0.012, 3.55);
    spaceGroups.play_area.add(hopscotchGroup);

    const squareCoords = [
      [0, 0],
      [0, -0.34],
      [-0.17, -0.68],
      [0.17, -0.68],
      [0, -1.02],
      [-0.17, -1.36],
      [0.17, -1.36],
      [0, -1.7],
    ];
    squareCoords.forEach(([sx, sz], idx) => {
      const sqMesh = new THREE.Mesh(
        track(new THREE.RingGeometry(0.11, 0.15)),
        track(
          new THREE.MeshBasicMaterial({
            color: idx % 2 === 0 ? '#FFE6A3' : '#F4B8A8',
            side: THREE.DoubleSide,
          }),
        ),
      );
      sqMesh.rotation.x = -Math.PI / 2;
      sqMesh.rotation.z = Math.PI / 4;
      sqMesh.position.set(sx, 0.005, sz);
      hopscotchGroup.add(sqMesh);
    });

    hopscotchPuckMesh = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 16)),
      bedroomMats.matPolishedBrass,
    );
    hopscotchPuckMesh.position.set(0, 0.025, 0);
    hopscotchGroup.add(hopscotchPuckMesh);

    const hopMem = findLinkedMemoryForObject(
      'hopscotch',
      /hopscotch|jump|playground|recess|schoolyard|friend/,
    );
    registerInteractiveHitbox(
      hopscotchGroup,
      'hopscotch',
      'play_area',
      'Chalk Hopscotch Court',
      'Click or press [E] to hop the golden marker across the court',
      [0.85, 0.45, 2.1],
      [0, 0.2, -0.85],
      hopMem,
    );

    // 4. Realistic English-Willow Cricket Bat, Stitched Leather Ball & Ash Wickets Set in SE Play Court
    const cricketGroup = interactiveObjectGroups.cricket_set;
    cricketGroup.position.set(3.85, 0, 2.75);
    cricketGroup.rotation.y = -0.35;
    spaceGroups.play_area.add(cricketGroup);

    // 3 Turned Ash Stumps planted flush at y = 0 + 2 Carved Wooden Bails on top
    [-0.082, 0, 0.082].forEach((wx) => {
      const stump = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.015, 0.016, 0.62, 12)),
        bedroomMats.matAshStump,
      );
      stump.position.set(wx, 0.31, 0);
      cricketGroup.add(stump);

      const stumpCrown = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.0155, 10, 8)),
        bedroomMats.matAshStump,
      );
      stumpCrown.position.set(wx, 0.62, 0);
      cricketGroup.add(stumpCrown);
    });
    [-0.041, 0.041].forEach((bx) => {
      const bail = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.0085, 0.0085, 0.078, 8)),
        bedroomMats.matAshStump,
      );
      bail.rotation.z = Math.PI / 2;
      bail.position.set(bx, 0.638, 0);
      cricketGroup.add(bail);
    });

    // Sculpted English-Willow Cricket Bat leaning naturally against the right ash stump (toe guard flush on floor)
    cricketBatPivot = new THREE.Group();
    cricketBatPivot.position.set(0.21, 0.418, 0.07);
    cricketBatPivot.rotation.set(-0.04, 0, 0.25);
    cricketGroup.add(cricketBatPivot);

    const batBlade = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.102, 0.5, 0.028)),
      bedroomMats.matWillowBat,
    );
    batBlade.position.set(0, -0.17, 0);
    cricketBatPivot.add(batBlade);

    // Classic peaked dorsal spine ridge along the back of the willow blade
    const batSpine = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.012, 0.026, 0.44, 4)),
      bedroomMats.matWillowBat,
    );
    batSpine.rotation.y = Math.PI / 4;
    batSpine.position.set(0, -0.19, -0.014);
    cricketBatPivot.add(batSpine);

    // Protective dark rubber toe guard at bottom of blade
    const batToeGuard = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.104, 0.02, 0.032)),
      bedroomMats.matDarkAnodizedMetal,
    );
    batToeGuard.position.set(0, -0.425, 0);
    cricketBatPivot.add(batToeGuard);

    // Tapered willow shoulder splice + ribbed rubber-wrapped cane handle
    const batShoulder = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.017, 0.042, 0.075, 10)),
      bedroomMats.matWillowBat,
    );
    batShoulder.position.set(0, 0.095, 0);
    cricketBatPivot.add(batShoulder);

    const batHandle = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.0165, 0.018, 0.25, 12)),
      bedroomMats.matBatGrip,
    );
    batHandle.position.set(0, 0.24, 0);
    cricketBatPivot.add(batHandle);

    // Tactile ribbed chevron grip rings along rubber handle
    for (let gi = 0; gi < 6; gi++) {
      const gripRing = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.0182, 0.0024, 6, 12)),
        bedroomMats.matDarkAnodizedMetal,
      );
      gripRing.rotation.x = Math.PI / 2;
      gripRing.position.set(0, 0.145 + gi * 0.038, 0);
      cricketBatPivot.add(gripRing);
    }

    // Stitched Crimson Leather Cricket Ball resting flush on ground (radius 0.042 -> y = 0.042)
    cricketBallMesh = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.042, 20, 16)),
      bedroomMats.matCricketBall,
    );
    cricketBallMesh.position.set(0.14, 0.042, 0.24);
    cricketBallMesh.rotation.set(0.35, 0.7, 0.2);
    // Subtle raised cream linen seam ring encircling the leather ball
    const ballSeamRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.0422, 0.0018, 6, 24)),
      bedroomMats.matCottonSheet,
    );
    ballSeamRing.rotation.x = Math.PI / 2;
    cricketBallMesh.add(ballSeamRing);
    cricketGroup.add(cricketBallMesh);

    const cricketMem = findLinkedMemoryForObject(
      'cricket_set',
      /cricket|bat|ball|match|sport|trophy|six|stadium/,
    );
    registerInteractiveHitbox(
      cricketGroup,
      'cricket_set',
      'play_area',
      'Childhood Cricket Bat, Ball & Wickets',
      'Click or press [E] to swing the cricket bat & replay match memories',
      [0.85, 0.85, 0.75],
      [0.1, 0.4, 0.1],
      cricketMem,
    );
  }

  // Additive Interactive Childhood Bedroom System (enhanced with unified PBR bedroom materials)
  const bedroomInteractions: ChildhoodBedroomInteractionController =
    attachChildhoodBedroomInteractions({
      rootGroup,
      bedroomSpaceGroup: spaceGroups.bedroom,
      studyCornerSpaceGroup: spaceGroups.study_corner,
      playAreaSpaceGroup: spaceGroups.play_area,
      bedGroup: interactiveObjectGroups.wooden_bed,
      wardrobeGroup: interactiveObjectGroups.wardrobe,
      deskGroup: interactiveObjectGroups.study_desk,
      cricketGroup: interactiveObjectGroups.cricket_set,
      memories: rawMemories,
      qualityConfig,
      matWalnut: bedroomMats.matBedWalnut,
      matChampagneGold: bedroomMats.matPolishedBrass,
      matBoucleFabric: bedroomMats.matCottonSheet,
      bedroomMats,
      registerInteractiveHitbox,
      track,
      cameraObstacleMeshes,
    });

  // Unified shadow pass across Childhood Bedroom, Study Corner, Play Area & decorative groups
  // (Skips invisible interaction hitboxes, additive cones, flat rugs & MeshBasicMaterial overlays)
  [
    spaceGroups.bedroom,
    spaceGroups.study_corner,
    spaceGroups.play_area,
    bedroomCushionsGroup,
    bedroomLampsGroup,
    bedroomPostersGroup,
  ].forEach((grp) => {
    grp.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (
          !mat ||
          mat.visible === false ||
          (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial ||
          mat.blending === THREE.AdditiveBlending
        ) {
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          return;
        }
        mesh.castShadow = allowBedroomShadows;
        mesh.receiveShadow = true;
      }
    });
  });

  // -------------------------------------------------------------------------
  // SPACE D & E: BACKYARD GARDEN & ELEVATED WOODEN TREEHOUSE (NE Garden Corner: x = 4.75, z = -2.15)
  // Positioned in the NE garden corner so the treehouse deck & ladder never obstruct
  // the Central Memory Tree or floating exhibition sightlines!
  // -------------------------------------------------------------------------
  let tyreSwingPivot: THREE.Group | null = null;
  let bicycleFrontWheel: THREE.Mesh | null = null;
  let bicycleRearWheel: THREE.Mesh | null = null;
  {
    // 1. Elevated Treehouse Deck in the NE Garden Alcove (y = 2.38m) + Climbable Ladder
    const treehouseDeckGroup = new THREE.Group();
    treehouseDeckGroup.position.set(4.75, 2.38, -2.15);
    treehouseDeckGroup.rotation.y = -Math.PI * 0.18;
    spaceGroups.treehouse.add(treehouseDeckGroup);

    const deckFloor = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.55, 0.09, 1.38)),
      matWalnut,
    );
    treehouseDeckGroup.add(deckFloor);
    cameraObstacleMeshes.push(deckFloor);

    // Wooden railings around the treehouse deck
    [
      [0, 0.28, -0.66, 1.55, 0.06, 0.06],
      [0, 0.28, 0.66, 1.55, 0.06, 0.06],
      [-0.74, 0.28, 0, 0.06, 0.06, 1.38],
      [0.74, 0.28, 0, 0.06, 0.06, 1.38],
    ].forEach(([rx, ry, rz, rw, rh, rd]) => {
      const rail = new THREE.Mesh(
        track(new THREE.BoxGeometry(rw, rh, rd)),
        matWalnut,
      );
      rail.position.set(rx, ry, rz);
      treehouseDeckGroup.add(rail);
    });

    // Cozy cushions inside the treehouse
    const cushionMesh = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.24, 0.26, 0.1)),
      track(new THREE.MeshStandardMaterial({ color: '#D67A5C', roughness: 0.8 })),
    );
    cushionMesh.position.set(-0.28, 0.1, -0.18);
    treehouseDeckGroup.add(cushionMesh);

    // Climbable Wooden Ladder tucked cleanly beside the NE garden treehouse deck
    const ladderGroup = interactiveObjectGroups.treehouse_ladder;
    ladderGroup.position.set(4.52, 0, -1.35);
    ladderGroup.rotation.y = -Math.PI * 0.18;
    spaceGroups.backyard.add(ladderGroup);

    [-0.2, 0.2].forEach((railX) => {
      const rail = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.024, 0.024, 2.42, 10)),
        matWalnut,
      );
      rail.position.set(railX, 1.18, 0);
      rail.rotation.x = -0.12;
      ladderGroup.add(rail);
    });

    for (let r = 0; r < 7; r++) {
      const rung = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 10)),
        track(new THREE.MeshStandardMaterial({ color: '#8C623E', roughness: 0.6 })),
      );
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, 0.28 + r * 0.3, -r * 0.032);
      ladderGroup.add(rung);
    }

    const ladderMem = findLinkedMemoryForObject(
      'treehouse_ladder',
      /treehouse|climb|ladder|branch|hideout|secret|tree/,
    );
    registerInteractiveHitbox(
      ladderGroup,
      'treehouse_ladder',
      'treehouse',
      'Climbable Treehouse Ladder',
      'Click or press [E] to climb up into the elevated Treehouse or descend to the floor',
      [0.75, 2.45, 0.65],
      [0, 1.18, 0],
      ladderMem,
    );

    // 2. Hanging Tyre Swing suspended beneath the NE Garden Treehouse Loft
    const swingRoot = interactiveObjectGroups.tyre_swing;
    swingRoot.position.set(4.85, 0, -2.35);
    spaceGroups.backyard.add(swingRoot);

    tyreSwingPivot = new THREE.Group();
    tyreSwingPivot.position.set(0, 2.34, 0);
    swingRoot.add(tyreSwingPivot);

    const swingRope = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.014, 0.014, 1.48, 8)),
      track(new THREE.MeshStandardMaterial({ color: '#C6A97E', roughness: 0.85 })),
    );
    swingRope.position.set(0, -0.74, 0);
    tyreSwingPivot.add(swingRope);

    const tyreMesh = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.22, 0.075, 14, 24)),
      track(new THREE.MeshStandardMaterial({ color: '#232325', roughness: 0.78 })),
    );
    tyreMesh.position.set(0, -1.52, 0);
    tyreSwingPivot.add(tyreMesh);

    const swingMem = findLinkedMemoryForObject(
      'tyre_swing',
      /swing|tyre|tire|backyard|garden|summer|breeze/,
    );
    registerInteractiveHitbox(
      swingRoot,
      'tyre_swing',
      'backyard',
      'Backyard Oak Tyre Swing',
      'Click or press [E] to push the hanging tyre swing & relive backyard play',
      [0.8, 1.4, 0.8],
      [0, 0.85, 0],
      swingMem,
    );

    // 3. Vintage Childhood Bicycle in the SE Garden Alcove
    const bikeGroup = interactiveObjectGroups.bicycle;
    bikeGroup.position.set(4.85, 0, 4.35);
    bikeGroup.rotation.y = -Math.PI * 0.65;
    spaceGroups.backyard.add(bikeGroup);

    const wheelGeo = track(new THREE.TorusGeometry(0.28, 0.032, 12));
    const wheelMat = track(
      new THREE.MeshStandardMaterial({ color: '#2B2B2E', roughness: 0.65 }),
    );
    bicycleRearWheel = new THREE.Mesh(wheelGeo, wheelMat);
    bicycleRearWheel.position.set(-0.42, 0.31, 0);
    bikeGroup.add(bicycleRearWheel);

    bicycleFrontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    bicycleFrontWheel.position.set(0.42, 0.31, 0);
    bikeGroup.add(bicycleFrontWheel);

    const bikeFrameMat = track(
      new THREE.MeshStandardMaterial({
        color: '#2B6CB0',
        metalness: 0.35,
        roughness: 0.32,
      }),
    );
    const bikeTopTube = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.022, 0.022, 0.78, 10)),
      bikeFrameMat,
    );
    bikeTopTube.rotation.z = Math.PI / 2;
    bikeTopTube.position.set(0, 0.56, 0);
    bikeGroup.add(bikeTopTube);

    const bikeSeat = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.18, 0.05, 0.12)),
      matWalnut,
    );
    bikeSeat.position.set(-0.28, 0.68, 0);
    bikeGroup.add(bikeSeat);

    const bikeHandlebar = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 10)),
      matChampagneGold,
    );
    bikeHandlebar.rotation.x = Math.PI / 2;
    bikeHandlebar.position.set(0.36, 0.78, 0);
    bikeGroup.add(bikeHandlebar);

    const bikeMem = findLinkedMemoryForObject(
      'bicycle',
      /bicycle|bike|cycle|ride|wheel|street|summer/,
    );
    registerInteractiveHitbox(
      bikeGroup,
      'bicycle',
      'backyard',
      'Backyard Childhood Bicycle',
      'Click or press [E] to spin the bicycle wheels & open riding memory',
      [1.35, 1.0, 0.55],
      [0, 0.5, 0],
      bikeMem,
    );
  }

  // -------------------------------------------------------------------------
  // ENVIRONMENTAL ATMOSPHERE EFFECTS (Quality-Scaled Rain, Starlight, Wind Motes)
  // -------------------------------------------------------------------------
  const rainStreaksGroup = new THREE.Group();
  rainStreaksGroup.name = 'living_world_rain_streaks';
  rainStreaksGroup.visible = activeAtmospherePreset === 'rainy_window';
  rootGroup.add(rainStreaksGroup);

  const rainDrops: { mesh: THREE.Mesh; speed: number; baseX: number; baseZ: number }[] = [];
  const rainGeo = track(new THREE.CylinderGeometry(0.006, 0.006, 0.38));
  const rainMat = track(
    new THREE.MeshBasicMaterial({
      color: '#B8DCFF',
      transparent: true,
      opacity: 0.58,
    }),
  );
  const rainCount =
    qualityConfig.tier === 'desktop'
      ? 48
      : qualityConfig.tier === 'tablet'
        ? 28
        : 18;
  for (let r = 0; r < rainCount; r++) {
    const drop = new THREE.Mesh(rainGeo, rainMat);
    const side = r % 2 === 0 ? -1 : 1;
    const rx = side * (halfW - 0.12);
    const rz = -3.4 + ((r * 0.37) % 6.8);
    const ry = 0.8 + ((r * 0.53) % 3.4);
    drop.position.set(rx, ry, rz);
    rainStreaksGroup.add(drop);
    rainDrops.push({
      mesh: drop,
      speed: 2.6 + (r % 5) * 0.45,
      baseX: rx,
      baseZ: rz,
    });
  }

  const starlightGroup = new THREE.Group();
  starlightGroup.name = 'living_world_starlight';
  starlightGroup.visible = activeAtmospherePreset === 'night_starlight';
  rootGroup.add(starlightGroup);

  const starGeo = track(new THREE.SphereGeometry(0.028, 8, 8));
  const starMat = track(
    new THREE.MeshBasicMaterial({
      color: '#FFF4C8',
    }),
  );
  const starCount =
    qualityConfig.tier === 'desktop'
      ? 36
      : qualityConfig.tier === 'tablet'
        ? 24
        : 16;
  for (let s = 0; s < starCount; s++) {
    const star = new THREE.Mesh(starGeo, starMat);
    const angle = (s / starCount) * Math.PI * 2;
    const rad = 2.2 + (s % 4) * 0.9;
    star.position.set(
      Math.cos(angle) * rad,
      3.95 + (s % 3) * 0.18,
      Math.sin(angle) * rad - 0.5,
    );
    starlightGroup.add(star);
  }

  const setAtmospherePreset = (presetId: AtmospherePresetId) => {
    activeAtmospherePreset = presetId;
    rainStreaksGroup.visible = presetId === 'rainy_window';
    starlightGroup.visible = presetId === 'night_starlight';

    const targets = computeRoomLightingRigTargets(presetId, atriumMood);
    roomHemiLight.color.set(targets.hemiSkyHex);
    roomHemiLight.groundColor.set(targets.hemiGroundHex);
    roomHemiLight.intensity = targets.hemiIntensity * galleryHemiScale;
    centerCeilingLight.color.set(targets.centerColorHex);
    centerCeilingLight.intensity =
      (studioLightIntensityOverride ?? targets.centerIntensity) * galleryLightScale;
    northWallWasher.color.set(targets.northColorHex);
    northWallWasher.intensity = targets.northIntensity * galleryLightScale;
    westWallWasher.intensity = targets.sideWashIntensity * galleryLightScale;
    eastWallWasher.intensity = targets.sideWashIntensity * galleryLightScale;
    southEntryLight.intensity = targets.southEntryIntensity * galleryLightScale;
  };

  const getAtmospherePreset = (): AtmospherePresetId => activeAtmospherePreset;

  // Apply initial preset if specified on room
  if (room.designConfig?.atmospherePreset) {
    setAtmospherePreset(room.designConfig.atmospherePreset);
  }

  // -------------------------------------------------------------------------
  // TECH BUDDY 10-POSE & DESTINATION NAVIGATION CONTROLLER
  // -------------------------------------------------------------------------
  const SPACE_DESTINATIONS: Record<
    LivingWorldSpaceId,
    {
      x: number;
      y: number;
      z: number;
      yaw: number;
      buddyX: number;
      buddyZ: number;
      buddyYaw: number;
      label: string;
      buddySpeech: string;
    }
  > = {
    central_gallery: {
      x: 0,
      y: 0,
      z: 2.85,
      yaw: 0,
      buddyX: -2.15,
      buddyZ: 3.65,
      buddyYaw: 0.42,
      label: 'Central Gallery & Memory Tree',
      buddySpeech:
        'Welcome to the Central Gallery! Click any floating memory, open the scrapbook, or explore the connected spaces around us.',
    },
    bedroom: {
      x: -3.65,
      y: 0,
      z: 3.85,
      yaw: 1.25,
      buddyX: -3.25,
      buddyZ: 4.55,
      buddyYaw: 0.85,
      label: 'Childhood Bedroom',
      buddySpeech:
        'Here is your Childhood Bedroom! You can fluff the pillows & teddy bear, open the walnut wardrobe door, or turn on the vintage TV.',
    },
    study_corner: {
      x: -3.85,
      y: 0,
      z: -3.85,
      yaw: 0.78,
      buddyX: -3.55,
      buddyZ: -3.25,
      buddyYaw: 0.55,
      label: 'Study Corner & Globe',
      buddySpeech:
        'This is your Study Corner! Click the desk to slide open the certificate drawer or spin the brass world globe.',
    },
    play_area: {
      x: 1.35,
      y: 0,
      z: 2.85,
      yaw: -0.35,
      buddyX: 0.85,
      buddyZ: 2.35,
      buddyYaw: -0.25,
      label: 'Childhood Play Area',
      buddySpeech:
        'Welcome to the Play Area! Open the hinged toy chest, toggle the chugging toy train, hop on the hopscotch court, or swing the cricket bat!',
    },
    backyard: {
      x: 3.65,
      y: 0,
      z: -1.45,
      yaw: -0.65,
      buddyX: 3.25,
      buddyZ: -0.95,
      buddyYaw: -0.55,
      label: 'Backyard Swing & Bicycle',
      buddySpeech:
        'Out in the Backyard zone you can push the oak branch tyre swing, spin the vintage bicycle wheels, or climb the ladder up to the Treehouse!',
    },
    treehouse: {
      x: 4.55,
      y: 2.38,
      z: -2.05,
      yaw: 0.45,
      buddyX: 3.85,
      buddyZ: -1.25,
      buddyYaw: -0.55,
      label: 'Elevated Wooden Treehouse',
      buddySpeech:
        'You climbed up into the elevated Wooden Treehouse! Enjoy the canopy view of your entire memory world, or click the ladder anytime to climb back down.',
    },
  };

  let techBuddyPose: TechBuddyPose = 'waving';
  let techBuddySpace: LivingWorldSpaceId = 'central_gallery';
  let techBuddyTargetPos = new THREE.Vector3(-2.15, 0, 3.65);
  let techBuddyTargetYaw = 0.42;
  let techBuddySpeech = SPACE_DESTINATIONS.central_gallery.buddySpeech;

  const getSpaceDestinationCoords = (spaceId: LivingWorldSpaceId) => {
    const dest = SPACE_DESTINATIONS[spaceId] || SPACE_DESTINATIONS.central_gallery;
    return {
      x: dest.x,
      y: dest.y,
      z: dest.z,
      yaw: dest.yaw,
      label: dest.label,
      buddySpeech: dest.buddySpeech,
    };
  };

  const commandTechBuddy = (options: {
    pose?: TechBuddyPose;
    targetSpace?: LivingWorldSpaceId;
    visible?: boolean;
  }) => {
    if (typeof options.visible === 'boolean' && guideCharacterGroup) {
      guideCharacterGroup.visible = options.visible;
    }
    if (options.targetSpace) {
      techBuddySpace = options.targetSpace;
      const dest =
        SPACE_DESTINATIONS[options.targetSpace] ||
        SPACE_DESTINATIONS.central_gallery;
      techBuddyTargetPos.set(dest.buddyX, 0, dest.buddyZ);
      techBuddyTargetYaw = dest.buddyYaw;
      techBuddySpeech = dest.buddySpeech;
      techBuddyPose = options.pose || 'walking';
    } else if (options.pose) {
      techBuddyPose = options.pose;
      if (options.pose === 'celebrating') {
        techBuddySpeech = 'Celebrating your preserved personal memories!';
      } else if (options.pose === 'pointing') {
        techBuddySpeech =
          'Look closely—every 3D object in this room connects directly to your uploaded memories.';
      } else if (options.pose === 'waving') {
        techBuddySpeech =
          'Hello! Click any floor space to walk there, or click any 3D object to interact with it.';
      } else if (options.pose === 'sitting') {
        techBuddySpeech =
          'Taking a cozy seat in your MEMORA world. Let me know whenever you want a guided tour!';
      }
    }

    return {
      pose: techBuddyPose,
      targetSpace: techBuddySpace,
      speech: techBuddySpeech,
      worldPos: {
        x: guideCharacterGroup?.position.x ?? techBuddyTargetPos.x,
        y: guideCharacterGroup?.position.y ?? 0,
        z: guideCharacterGroup?.position.z ?? techBuddyTargetPos.z,
      },
      visible: guideCharacterGroup ? guideCharacterGroup.visible : true,
    };
  };

  // -------------------------------------------------------------------------
  // INTERACTIVE 3D OBJECT TRIGGER CONTROLLER
  // -------------------------------------------------------------------------
  const triggerInteractiveObject = (objectId: InteractiveObjectId3D) => {
    interactiveStates[objectId] = !interactiveStates[objectId];
    const isActive = interactiveStates[objectId];
    interactiveAnimTimers[objectId] = 2.4; // 2.4s active animation burst

    let title = 'Interactive 3D Object';
    let spaceId: LivingWorldSpaceId = 'central_gallery';
    let actionMessage = 'Interacted with 3D object.';
    let linkedMemory: Memory | undefined;
    let climbTargetY: number | undefined;

    switch (objectId) {
      case 'toy_chest':
        title = 'Hinged Childhood Toy Chest';
        spaceId = 'play_area';
        actionMessage = isActive
          ? 'Opened the wooden toy chest lid—revealing childhood blocks & keepsakes!'
          : 'Closed the wooden toy chest lid.';
        linkedMemory = findLinkedMemoryForObject('toy_chest', /toy|chest|play/);
        break;
      case 'toy_train':
        title = 'Express Childhood Toy Train';
        spaceId = 'play_area';
        actionMessage = isActive
          ? 'All aboard! The Express Toy Train is chugging around the circular track.'
          : 'Paused the Express Toy Train at the station.';
        linkedMemory = findLinkedMemoryForObject('toy_train', /train|track|toy/);
        break;
      case 'tyre_swing':
        title = 'Backyard Oak Tyre Swing';
        spaceId = 'backyard';
        actionMessage =
          'Pushed the hanging tyre swing beneath the oak tree branches!';
        linkedMemory = findLinkedMemoryForObject('tyre_swing', /swing|tree|yard/);
        break;
      case 'bicycle':
        title = 'Backyard Childhood Bicycle';
        spaceId = 'backyard';
        actionMessage =
          'Spun the vintage bicycle wheels & rang the handlebar bell!';
        linkedMemory = findLinkedMemoryForObject('bicycle', /bicycle|bike|ride/);
        break;
      case 'cricket_set':
        title = 'Childhood Cricket Bat & Wickets';
        spaceId = 'play_area';
        actionMessage =
          'Swung the wooden cricket bat—sending the crimson ball arcing across the play area!';
        linkedMemory = findLinkedMemoryForObject('cricket_set', /cricket|bat|sport/);
        break;
      case 'hopscotch':
        title = 'Chalk Hopscotch Court';
        spaceId = 'play_area';
        actionMessage =
          'Hopped the golden marker across squares 1 to 8 on the hopscotch court!';
        linkedMemory = findLinkedMemoryForObject('hopscotch', /hopscotch|play|jump/);
        break;
      case 'treehouse_ladder':
        title = 'Climbable Treehouse Ladder';
        spaceId = isActive ? 'treehouse' : 'backyard';
        climbTargetY = isActive ? 2.15 : 0;
        actionMessage = isActive
          ? 'Climbed up the wooden ladder into the elevated Treehouse hideaway!'
          : 'Climbed down the wooden ladder back to the Backyard floor.';
        linkedMemory = findLinkedMemoryForObject(
          'treehouse_ladder',
          /treehouse|ladder|tree/,
        );
        break;
      case 'bookshelf':
        title = 'Childhood Bookshelf';
        spaceId = 'study_corner';
        actionMessage =
          'Inspected the walnut Childhood Bookshelf for saved books & school memories.';
        linkedMemory = findLinkedMemoryForObject(
          'bookshelf',
          /book|bookshelf|school|read|notebook|library|comic/,
        );
        break;
      case 'study_desk':
        title = 'Study Desk & Certificate Drawer';
        spaceId = 'study_corner';
        actionMessage = isActive
          ? 'Slid open the study desk drawer to inspect certificates & letters.'
          : 'Closed the study desk drawer.';
        linkedMemory = findLinkedMemoryForObject(
          'study_desk',
          /study|desk|school|certificate/,
        );
        break;
      case 'spinning_globe':
        title = 'Brass & Parchment Spinning Globe';
        spaceId = 'study_corner';
        actionMessage =
          'Spun the brass world globe to trace your recorded memory locations!';
        linkedMemory = findLinkedMemoryForObject(
          'spinning_globe',
          /globe|world|travel|map/,
        );
        break;
      case 'wardrobe':
        title = 'Walnut Childhood Wardrobe';
        spaceId = 'bedroom';
        actionMessage = isActive
          ? 'Swung open the walnut wardrobe door to reveal childhood keepsakes.'
          : 'Closed the walnut wardrobe door.';
        linkedMemory = findLinkedMemoryForObject(
          'wardrobe',
          /wardrobe|clothes|school/,
        );
        break;
      case 'wooden_bed':
        title = 'Childhood Wooden Bed & Teddy Bear';
        spaceId = 'bedroom';
        actionMessage =
          'Fluffed the bedroom pillows & gave the childhood teddy bear a cheerful bounce!';
        linkedMemory = findLinkedMemoryForObject(
          'wooden_bed',
          /bed|teddy|sleep|dream/,
        );
        break;
      case 'bedroom_tv':
        title = 'Bedroom Vintage Television';
        spaceId = 'bedroom';
        actionMessage = isActive
          ? 'Switched on the Bedroom Television—glowing with nostalgic home video light!'
          : 'Switched the Bedroom Television to standby.';
        linkedMemory = findLinkedMemoryForObject(
          'bedroom_tv',
          /tv|video|film|cartoon/,
        );
        break;
      case 'under_bed_scrapbook':
        title = 'Hidden Memory Scrapbook';
        spaceId = 'bedroom';
        actionMessage = 'Opened the hidden 3D memory scrapbook beneath the bed.';
        linkedMemory = bedroomInteractions.getMemoriesForInteraction('under_bed_scrapbook')[0];
        break;
      case 'under_bed_flashlight':
        title = 'Under-Bed Flashlight';
        spaceId = 'bedroom';
        actionMessage = isActive
          ? 'Picked up the flashlight to illuminate beneath the bed.'
          : 'Returned the flashlight beneath the bed.';
        break;
      case 'bedside_drawer':
        title = 'Bedside Nightstand Drawer';
        spaceId = 'bedroom';
        actionMessage = isActive
          ? 'Slid open the bedside drawer to inspect keepsakes.'
          : 'Closed the bedside drawer.';
        linkedMemory = bedroomInteractions.getMemoriesForInteraction('bedside_drawer')[0];
        break;
      case 'trophy_shelf':
        title = 'Trophy & Certificate Shelf';
        spaceId = 'bedroom';
        actionMessage = 'Inspecting trophies & uploaded achievement certificates.';
        linkedMemory = bedroomInteractions.getMemoriesForInteraction('trophy_shelf')[0];
        break;
      case 'cork_pinboard':
        title = 'Cork Photo Pinboard';
        spaceId = 'study_corner';
        actionMessage = 'Inspecting pinned photographs on the corkboard.';
        linkedMemory = bedroomInteractions.getMemoriesForInteraction('cork_pinboard')[0];
        break;
      case 'crt_computer':
        title = 'Retro CRT Computer';
        spaceId = 'study_corner';
        actionMessage = 'Powered on the retro CRT computer desktop.';
        break;
      case 'wired_headphones':
        title = 'Wired Studio Headphones';
        spaceId = 'study_corner';
        actionMessage = 'Toggled wired desk headphones.';
        break;
      case 'school_bag':
        title = 'Childhood School Bag';
        spaceId = 'study_corner';
        actionMessage = 'Opened the childhood school bag to inspect school memories.';
        linkedMemory = bedroomInteractions.getMemoriesForInteraction('school_bag')[0];
        break;
      case 'bedroom_window':
        title = 'Sunlit Bedroom Window';
        spaceId = 'bedroom';
        actionMessage = 'Looking out through the bedroom window curtains.';
        break;
      case 'memory_radio':
        title = 'Vintage Memory Radio';
        spaceId = 'bedroom';
        actionMessage = 'Tuned the vintage bedside memory radio.';
        linkedMemory = bedroomInteractions.getMemoriesForInteraction('memory_radio')[0];
        break;
      case 'memory_projector':
        title = 'Vintage Memory Projector';
        spaceId = 'bedroom';
        actionMessage = 'Focused on the vintage memory slide projector.';
        linkedMemory = bedroomInteractions.getMemoriesForInteraction('memory_projector')[0];
        break;
      case 'wall_clock_calendar':
        title = 'Wall Clock & Memory Calendar';
        spaceId = 'bedroom';
        actionMessage = 'Opened the verified memory calendar timeline.';
        break;
      case 'drawing_wall':
        title = 'Childhood Drawing Wall';
        spaceId = 'bedroom';
        actionMessage = 'Inspecting childhood drawings & artwork.';
        linkedMemory = bedroomInteractions.getMemoriesForInteraction('drawing_wall')[0];
        break;
    }

    // Have Tech Buddy react enthusiastically to the interaction
    techBuddyPose = 'interacting';
    techBuddySpeech = actionMessage;

    return {
      objectId,
      title,
      spaceId,
      isActive,
      actionMessage,
      linkedMemory,
      climbTargetY,
    };
  };

  // -------------------------------------------------------------------------
  // LIVE 3D ROOM CUSTOMISATION STUDIO APPLIER
  // -------------------------------------------------------------------------
  const applyStudioCustomization = (
    config: Partial<RoomCustomizationStudioConfig>,
  ) => {
    // 1. Interior Walls & Wall Texture
    if (config.wallColorHex) {
      matPrimaryWall.color.set(config.wallColorHex);
      matFeatureWall.color.set(config.wallColorHex);
    }
    if (config.wallTexture) {
      if (config.wallTexture === 'smooth_plaster') {
        matPrimaryWall.roughness = 0.72;
        matFeatureWall.roughness = 0.68;
      } else if (config.wallTexture === 'wood_wainscoting') {
        matPrimaryWall.roughness = 0.52;
        matFeatureWall.roughness = 0.48;
      } else if (config.wallTexture === 'striped_wallpaper') {
        matPrimaryWall.roughness = 0.82;
        matFeatureWall.roughness = 0.78;
      } else if (config.wallTexture === 'storybook_mural') {
        matPrimaryWall.roughness = 0.6;
        matFeatureWall.roughness = 0.55;
      }
    }

    // 2. Floor Colour & Synchronized Material PBR Set
    if (config.floorColorHex) {
      floorMat.color.set(config.floorColorHex);
    }
    if (config.floorMaterial) {
      if (config.floorMaterial === 'polished_marble') {
        floorMat.map = travertineFloorPBR.map;
        floorMat.normalMap = travertineFloorPBR.normalMap;
        floorMat.roughnessMap = travertineFloorPBR.roughnessMap;
        floorMat.aoMap = travertineFloorPBR.aoMap || null;
        floorMat.roughness = 0.22;
        floorMat.metalness = 0.05;
      } else if (config.floorMaterial === 'warm_oak') {
        floorMat.map = parquetFloorPBR.map;
        floorMat.normalMap = parquetFloorPBR.normalMap;
        floorMat.roughnessMap = parquetFloorPBR.roughnessMap;
        floorMat.aoMap = parquetFloorPBR.aoMap || null;
        floorMat.roughness = 0.34;
        floorMat.metalness = 0.03;
      } else if (config.floorMaterial === 'herringbone_walnut') {
        floorMat.map = parquetFloorPBR.map;
        floorMat.normalMap = parquetFloorPBR.normalMap;
        floorMat.roughnessMap = parquetFloorPBR.roughnessMap;
        floorMat.aoMap = parquetFloorPBR.aoMap || null;
        floorMat.roughness = 0.28;
        floorMat.metalness = 0.04;
      } else if (config.floorMaterial === 'travertine_stone') {
        floorMat.map = limestoneTex;
        floorMat.normalMap = limestonePBR.normalMap;
        floorMat.roughnessMap = limestonePBR.roughnessMap;
        floorMat.aoMap = null;
        floorMat.roughness = 0.52;
        floorMat.metalness = 0.02;
      }
      floorMat.needsUpdate = true;
    }

    // 3. Ceiling Appearance & Room Lighting Intensity
    if (config.ceilingColorHex) {
      matCeiling.color.set(config.ceilingColorHex);
    }
    if (typeof config.lightIntensity === 'number') {
      studioLightIntensityOverride = config.lightIntensity;
      centerCeilingLight.intensity = config.lightIntensity;
    }

    // 4. Windows & Curtains
    if (config.windowStyle) {
      if (config.windowStyle === 'arched_sunlit') {
        matSunlightWindowGlow.emissive.set('#FFE4AD');
        matSunlightWindowGlow.emissiveIntensity = 0.96;
      } else if (config.windowStyle === 'stained_amber') {
        matSunlightWindowGlow.emissive.set('#F5B041');
        matSunlightWindowGlow.emissiveIntensity = 0.88;
      } else if (config.windowStyle === 'wide_garden_view') {
        matSunlightWindowGlow.emissive.set('#E8F8F5');
        matSunlightWindowGlow.emissiveIntensity = 1.05;
      }
    }
    if (config.curtainColorHex) {
      matWindowCurtains.color.set(config.curtainColorHex);
    }
    if (typeof config.curtainsVisible === 'boolean') {
      windowCurtainGroups.forEach((cg) => {
        cg.visible = config.curtainsVisible!;
      });
    }

    // 5. Furniture, Bed, Bedsheet, Cupboard & Desk Styles
    if (config.furnitureColorHex) {
      matWalnut.color.set(config.furnitureColorHex);
    }
    if (config.bedsheetColorHex) {
      matBedBlanket.color.set(config.bedsheetColorHex);
    }
    if (config.bedDesign) {
      bedCanopyGroup.visible = config.bedDesign === 'cozy_canopy';
    }
    if (config.cupboardStyle) {
      if (config.cupboardStyle === 'vintage_walnut') {
        matWardrobeDoor.color.set('#5A3E2B');
        matWardrobeDoor.roughness = 0.45;
      } else if (config.cupboardStyle === 'painted_ivory') {
        matWardrobeDoor.color.set('#F5EFE6');
        matWardrobeDoor.roughness = 0.62;
      } else if (config.cupboardStyle === 'glass_display') {
        matWardrobeDoor.color.set('#CFE2E8');
        matWardrobeDoor.roughness = 0.18;
      }
    }
    if (config.deskStyle) {
      if (config.deskStyle === 'scholar_oak') {
        matStudyDeskTop.color.set('#FFFFFF');
      } else if (config.deskStyle === 'playful_craft') {
        matStudyDeskTop.color.set('#FAD7A0');
      } else if (config.deskStyle === 'minimal_birch') {
        matStudyDeskTop.color.set('#F5EEF0');
      }
    }

    // 6. Repositioning Supported Furniture & Toy Arrangements (Non-overlapping perimeter alcoves)
    if (config.furnitureLayoutPreset) {
      if (config.furnitureLayoutPreset === 'classic') {
        interactiveObjectGroups.wooden_bed.position.set(-5.05, 0, 3.65);
        interactiveObjectGroups.wooden_bed.rotation.y = Math.PI / 2;
        interactiveObjectGroups.wardrobe.position.set(-4.35, 0, 6.08);
        interactiveObjectGroups.study_desk.position.set(-5.25, 0, -4.65);
        interactiveObjectGroups.spinning_globe.position.set(-5.23, 0.7945, -5.18);
      } else if (config.furnitureLayoutPreset === 'window_facing') {
        interactiveObjectGroups.wooden_bed.position.set(-4.85, 0, 3.85);
        interactiveObjectGroups.wooden_bed.rotation.y = Math.PI * 0.42;
        interactiveObjectGroups.wardrobe.position.set(-4.15, 0, 6.08);
        interactiveObjectGroups.study_desk.position.set(-5.05, 0, -4.45);
        interactiveObjectGroups.spinning_globe.position.set(-5.03, 0.7945, -4.98);
      } else if (config.furnitureLayoutPreset === 'spacious_play') {
        interactiveObjectGroups.wooden_bed.position.set(-5.25, 0, 3.95);
        interactiveObjectGroups.wooden_bed.rotation.y = Math.PI / 2;
        interactiveObjectGroups.wardrobe.position.set(-4.45, 0, 6.12);
        interactiveObjectGroups.study_desk.position.set(-5.35, 0, -4.85);
        interactiveObjectGroups.spinning_globe.position.set(-5.33, 0.7945, -5.38);
      }
    }
    if (config.toyArrangementPreset) {
      if (config.toyArrangementPreset === 'tidied_shelf') {
        interactiveObjectGroups.toy_chest.position.set(-3.75, 0, 2.25);
        interactiveObjectGroups.cricket_set.position.set(4.15, 0, 2.95);
        interactiveObjectGroups.hopscotch.position.set(2.55, 0.012, 3.75);
      } else if (config.toyArrangementPreset === 'playtime_circle') {
        interactiveObjectGroups.toy_chest.position.set(-3.25, 0, 2.45);
        interactiveObjectGroups.cricket_set.position.set(3.55, 0, 2.55);
        interactiveObjectGroups.hopscotch.position.set(2.15, 0.012, 3.35);
      } else if (config.toyArrangementPreset === 'train_adventure') {
        interactiveObjectGroups.toy_chest.position.set(-3.55, 0, 2.35);
        interactiveObjectGroups.cricket_set.position.set(3.85, 0, 2.75);
        interactiveObjectGroups.hopscotch.position.set(2.35, 0.012, 3.55);
      }
    }

    // 7. Decorative Objects Visibility Toggles (Rugs, Cushions, Lamps, Posters, Plants, Toys)
    if (typeof config.showRugs === 'boolean') {
      bedroomRugsGroup.visible = config.showRugs;
    }
    if (typeof config.showCushions === 'boolean') {
      bedroomCushionsGroup.visible = config.showCushions;
    }
    if (typeof config.showLamps === 'boolean') {
      bedroomLampsGroup.visible = config.showLamps;
      if (studyDeskLampGroup) studyDeskLampGroup.visible = config.showLamps;
    }
    if (typeof config.showPosters === 'boolean') {
      bedroomPostersGroup.visible = config.showPosters;
    }
    if (typeof config.showPlants === 'boolean') {
      botanicalPlantsGroup.visible = config.showPlants;
    }
    if (typeof config.showToys === 'boolean') {
      interactiveObjectGroups.toy_chest.visible = config.showToys;
      interactiveObjectGroups.toy_train.visible = config.showToys;
      interactiveObjectGroups.cricket_set.visible = config.showToys;
      interactiveObjectGroups.hopscotch.visible = config.showToys;
    }

    // 8. Atmosphere & Sky/Garden Appearance
    if (config.atmospherePreset) {
      setAtmospherePreset(config.atmospherePreset);
    }
    if (config.skyGardenAppearance) {
      if (config.skyGardenAppearance === 'sunny_garden') {
        matFoliage.color.set('#55634E');
        matSageLeafAccent.color.set('#7A8B70');
      } else if (config.skyGardenAppearance === 'sunset_meadow') {
        matFoliage.color.set('#6E5D46');
        matSageLeafAccent.color.set('#9C7E54');
      } else if (config.skyGardenAppearance === 'starlit_sky') {
        matFoliage.color.set('#2C3E35');
        matSageLeafAccent.color.set('#3E5448');
      } else if (config.skyGardenAppearance === 'rainy_courtyard') {
        matFoliage.color.set('#3F594D');
        matSageLeafAccent.color.set('#5B7A6C');
      }
    }

    if (typeof config.techBuddyVisible === 'boolean' && guideCharacterGroup) {
      guideCharacterGroup.visible = config.techBuddyVisible;
    }
    if (Array.isArray(config.enabledSpaces)) {
      const enabledSet = new Set(config.enabledSpaces);
      (Object.keys(spaceGroups) as LivingWorldSpaceId[]).forEach((sid) => {
        if (sid !== 'central_gallery') {
          spaceGroups[sid].visible = enabledSet.has(sid);
        }
      });
    }
    if (Array.isArray(config.enabledObjects)) {
      const enabledObjSet = new Set(config.enabledObjects);
      (Object.keys(interactiveObjectGroups) as InteractiveObjectId3D[]).forEach(
        (oid) => {
          if (
            typeof config.showToys === 'boolean' &&
            !config.showToys &&
            (oid === 'toy_chest' ||
              oid === 'toy_train' ||
              oid === 'cricket_set' ||
              oid === 'hopscotch')
          ) {
            interactiveObjectGroups[oid].visible = false;
            return;
          }
          interactiveObjectGroups[oid].visible = enabledObjSet.has(oid);
        },
      );
    }
  };

  if (room.designConfig?.studioCustomization) {
    applyStudioCustomization(room.designConfig.studioCustomization);
  }

  const applyEntranceAnimation = (
    elapsedSec: number,
    durationSec?: number,
    reducedMotion?: boolean,
  ): RoomEntranceAnimationState => {
    const state = computeRoomEntranceAnimationState({
      elapsedSec,
      durationSec,
      reducedMotion,
    });
    const rigTargets = computeRoomLightingRigTargets(
      activeAtmospherePreset,
      atriumMood,
    );

    southEntryLight.intensity =
      rigTargets.southEntryIntensity * galleryLightScale * state.entranceGlowMultiplier;
    matEntranceSconceGlow.emissiveIntensity =
      0.95 * state.entranceGlowMultiplier;

    roomHemiLight.intensity =
      rigTargets.hemiIntensity * galleryHemiScale * state.interiorLightFactor;
    centerCeilingLight.intensity =
      (studioLightIntensityOverride ?? rigTargets.centerIntensity) *
      galleryLightScale *
      state.interiorLightFactor;
    northWallWasher.intensity =
      rigTargets.northIntensity * galleryLightScale * state.interiorLightFactor;
    westWallWasher.intensity =
      rigTargets.sideWashIntensity * galleryLightScale * state.interiorLightFactor;
    eastWallWasher.intensity =
      rigTargets.sideWashIntensity * galleryLightScale * state.interiorLightFactor;
    matWarmEmissiveStrip.emissiveIntensity = 0.92 * state.interiorLightFactor;

    const count = Math.max(1, displayRecords.length);
    for (let i = 0; i < displayRecords.length; i++) {
      const rec = displayRecords[i];
      const staggerDelay = (i / count) * 0.25;
      const localProgress = state.isComplete
        ? 1
        : Math.max(
            0,
            Math.min(1, (state.progress - staggerDelay) / (1 - staggerDelay)),
          );
      const localEase = 1 - Math.pow(1 - localProgress, 2.4);
      const dispFactor = 0.24 + 0.76 * localEase;
      const warmWakeBoost = state.isComplete
        ? 0
        : Math.sin(localProgress * Math.PI) * 0.28;

      if (rec.picLightMat) {
        rec.picLightMat.emissiveIntensity =
          0.9 * dispFactor + warmWakeBoost * 0.6;
      }
      if (rec.artMat) {
        rec.artMat.emissiveIntensity =
          (rec.baseArtEmissiveIntensity ?? 0.16) * dispFactor + warmWakeBoost * 0.18;
      }
    }

    return state;
  };

  let lastAnimElapsedSec = 0;

  // Continuous ambient animation for Floating Memories, Interactive 3D Objects, Park Seesaw, Atmosphere & Museum Guide
  const updateAmbientAnimations = (
    elapsedSec: number,
    playerLocalPos?: { x: number; z: number },
    reducedMotionOverride?: boolean,
  ) => {
    const dt = Math.min(0.1, Math.max(0.001, elapsedSec - lastAnimElapsedSec));
    lastAnimElapsedSec = elapsedSec;
    const prefersReduced =
      typeof reducedMotionOverride === 'boolean'
        ? reducedMotionOverride
        : typeof window !== 'undefined' &&
          Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    if (!prefersReduced) {
      for (let i = 0; i < animatedFloatingFrames.length; i++) {
        const item = animatedFloatingFrames[i];
        item.group.position.y =
          item.baseY + Math.sin(elapsedSec * 1.35 + item.phase) * 0.045;
        item.group.rotation.y =
          item.baseRotY + Math.cos(elapsedSec * 0.95 + item.phase) * 0.032;
      }
    }

    // Gentle playground seesaw motion in Childhood Memory Park
    if (parkSeesawPivot) {
      parkSeesawPivot.rotation.z = prefersReduced
        ? 0.06
        : Math.sin(elapsedSec * 1.15) * 0.11;
    }

    // Decrement burst timers
    (Object.keys(interactiveAnimTimers) as InteractiveObjectId3D[]).forEach(
      (oid) => {
        if (interactiveAnimTimers[oid] > 0) {
          interactiveAnimTimers[oid] = Math.max(
            0,
            interactiveAnimTimers[oid] - dt,
          );
        }
      },
    );

    // 1. Toy Chest Lid smooth open/close
    if (toyChestLidPivot) {
      const targetRotX = interactiveStates.toy_chest ? -1.15 : 0;
      toyChestLidPivot.rotation.x +=
        (targetRotX - toyChestLidPivot.rotation.x) * Math.min(1, dt * 8);
    }

    // 2. Toy Train chugging around the central circular track
    if (toyTrainCarriageGroup && interactiveStates.toy_train && !prefersReduced) {
      const trainAngle = elapsedSec * 0.75;
      const trackR = 1.62;
      toyTrainCarriageGroup.position.set(
        Math.cos(trainAngle) * trackR,
        0.08 + Math.abs(Math.sin(elapsedSec * 14)) * 0.008,
        Math.sin(trainAngle) * trackR,
      );
      toyTrainCarriageGroup.rotation.y = -trainAngle + Math.PI;
    }

    // 3. Hanging Tyre Swing pendulum motion
    if (tyreSwingPivot) {
      const swingAmp = prefersReduced
        ? 0
        : interactiveAnimTimers.tyre_swing > 0 || interactiveStates.tyre_swing
          ? 0.28
          : 0.035;
      tyreSwingPivot.rotation.z = Math.sin(elapsedSec * 2.4) * swingAmp;
    }

    // 4. Bicycle wheels spin when triggered
    if (bicycleFrontWheel && bicycleRearWheel && !prefersReduced) {
      if (interactiveAnimTimers.bicycle > 0 || interactiveStates.bicycle) {
        bicycleFrontWheel.rotation.z -= dt * 8.5;
        bicycleRearWheel.rotation.z -= dt * 8.5;
      }
    }

    // 5. Cricket bat swing & ball arc
    if (cricketBatPivot && cricketBallMesh) {
      if (interactiveAnimTimers.cricket_set > 0 && !prefersReduced) {
        const phase = (2.4 - interactiveAnimTimers.cricket_set) / 2.4;
        cricketBatPivot.rotation.z = 0.25 + Math.sin(phase * Math.PI * 2) * 0.85;
        cricketBallMesh.position.y =
          0.042 + Math.abs(Math.sin(phase * Math.PI * 2)) * 0.55;
        cricketBallMesh.position.z =
          0.24 + Math.sin(phase * Math.PI) * 0.75;
      } else {
        cricketBatPivot.rotation.z = 0.25;
        cricketBallMesh.position.set(0.14, 0.042, 0.24);
      }
    }

    // 6. Hopscotch marker puck hopping across squares
    if (hopscotchPuckMesh) {
      if ((interactiveAnimTimers.hopscotch > 0 || interactiveStates.hopscotch) && !prefersReduced) {
        const hopPhase = (elapsedSec * 2.2) % 1.7;
        hopscotchPuckMesh.position.z = -hopPhase;
        hopscotchPuckMesh.position.y =
          0.025 + Math.abs(Math.sin(elapsedSec * 8.5)) * 0.14;
      } else {
        hopscotchPuckMesh.position.set(0, 0.025, 0);
      }
    }

    // 7. Study Desk Drawer slide open/closed
    if (deskDrawerMesh) {
      const targetZ = interactiveStates.study_desk ? 0.32 : 0.04;
      deskDrawerMesh.position.z +=
        (targetZ - deskDrawerMesh.position.z) * Math.min(1, dt * 8);
    }

    // 8. Spinning Globe rotation
    if (globeSphereMesh && !prefersReduced) {
      const spinSpeed =
        interactiveAnimTimers.spinning_globe > 0 ||
        interactiveStates.spinning_globe
          ? 4.2
          : 0.35;
      globeSphereMesh.rotation.y += dt * spinSpeed;
    }

    // 9. Wardrobe hinged door swing open/closed
    if (wardrobeDoorPivot) {
      const targetDoorY = interactiveStates.wardrobe ? -1.35 : 0;
      wardrobeDoorPivot.rotation.y +=
        (targetDoorY - wardrobeDoorPivot.rotation.y) * Math.min(1, dt * 7);
    }

    // 10. Bedroom pillows & Teddy Bear cheerful bounce
    if (bedPillowBounceGroup) {
      if (interactiveAnimTimers.wooden_bed > 0 && !prefersReduced) {
        bedPillowBounceGroup.position.y =
          0.585 + Math.abs(Math.sin(elapsedSec * 9)) * 0.11;
      } else {
        bedPillowBounceGroup.position.y = 0.585;
      }
    }

    // 11. Bedroom TV Screen glow pulse
    if (bedroomTvScreenMat) {
      bedroomTvScreenMat.emissiveIntensity = interactiveStates.bedroom_tv
        ? prefersReduced
          ? 0.82
          : 0.85 + Math.sin(elapsedSec * 6) * 0.12
        : 0.28;
    }

    // 11a. Gentle golden-hour dust motes drifting inside the NW window sunbeam
    if (bedroomSunDustPoints && bedroomSunDustBasePos && !prefersReduced && rootGroup.visible) {
      const posAttr = bedroomSunDustPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const bx = bedroomSunDustBasePos[i * 3];
        const by = bedroomSunDustBasePos[i * 3 + 1];
        const bz = bedroomSunDustBasePos[i * 3 + 2];
        posAttr.setXYZ(
          i,
          bx + Math.sin(elapsedSec * 0.42 + i * 1.3) * 0.06,
          by + Math.cos(elapsedSec * 0.34 + i * 0.9) * 0.055,
          bz + Math.sin(elapsedSec * 0.29 + i * 1.7) * 0.05,
        );
      }
      posAttr.needsUpdate = true;
    }

    // 11b. Additive Childhood Bedroom interactive props (pauses automatically when hidden)
    bedroomInteractions.update(dt, elapsedSec, prefersReduced, !rootGroup.visible);

    // 12. Rain streaks outside windows when Rainy Window atmosphere is active
    if (rainStreaksGroup.visible && !prefersReduced) {
      for (let i = 0; i < rainDrops.length; i++) {
        const rd = rainDrops[i];
        rd.mesh.position.y -= rd.speed * dt;
        if (rd.mesh.position.y < 0.4) {
          rd.mesh.position.y = 4.1;
        }
      }
    }

    // 13. Museum Guide Character: Natural Idle, Visitor Approach Turning & Welcome Wave
    if (guideCharacterGroup) {
      const dx = techBuddyTargetPos.x - guideCharacterGroup.position.x;
      const dz = techBuddyTargetPos.z - guideCharacterGroup.position.z;
      const dist = Math.hypot(dx, dz);

      let visitorNear = false;
      let desiredIdleYaw = techBuddyTargetYaw;

      if (playerLocalPos) {
        const vdx = playerLocalPos.x - guideCharacterGroup.position.x;
        const vdz = playerLocalPos.z - guideCharacterGroup.position.z;
        const visitorDist = Math.hypot(vdx, vdz);
        if (visitorDist < 4.1 && visitorDist > 0.25) {
          visitorNear = true;
          desiredIdleYaw = Math.atan2(vdx, vdz);
        }
      }

      if (visitorNear && !guideWasVisitorNear) {
        guideApproachWaveTimer = 2.6;
      }
      guideWasVisitorNear = visitorNear;
      if (guideApproachWaveTimer > 0) {
        guideApproachWaveTimer = Math.max(0, guideApproachWaveTimer - dt);
      }

      if (dist > 0.08) {
        const moveSpeed = techBuddyPose === 'running' ? 3.2 : 1.85;
        const step = Math.min(dist, moveSpeed * dt);
        guideCharacterGroup.position.x += (dx / dist) * step;
        guideCharacterGroup.position.z += (dz / dist) * step;
        guideCharacterGroup.rotation.y = Math.atan2(dx, dz);
        guideCharacterGroup.position.y = prefersReduced
          ? 0
          : Math.abs(Math.sin(elapsedSec * 9.5)) * 0.045;
      } else {
        // Shortest-angle smooth yaw blend toward visitor or resting facing
        const yawDiff = Math.atan2(
          Math.sin(desiredIdleYaw - guideCharacterGroup.rotation.y),
          Math.cos(desiredIdleYaw - guideCharacterGroup.rotation.y),
        );
        guideCharacterGroup.rotation.y += yawDiff * Math.min(1, dt * 5.2);
        guideCharacterGroup.position.y =
          techBuddyPose === 'sitting'
            ? -0.28
            : techBuddyPose === 'celebrating' && !prefersReduced
              ? Math.abs(Math.sin(elapsedSec * 7.5)) * 0.12
              : 0;
        if (techBuddyPose === 'walking' || techBuddyPose === 'running') {
          techBuddyPose = 'talking';
        }
      }

      // Subtle breathing & relaxed idle posture
      if (guideTorsoMesh) {
        const breath = prefersReduced ? 0 : Math.sin(elapsedSec * 2.0) * 0.014;
        guideTorsoMesh.scale.set(1.12 + breath, 1 + breath * 0.6, 0.78 + breath);
      }
      if (guideLeftArmMesh) {
        guideLeftArmMesh.rotation.z = prefersReduced
          ? 0.18
          : 0.18 + Math.sin(elapsedSec * 1.65) * 0.035;
      }

      const activeWave = guideApproachWaveTimer > 0 || techBuddyPose === 'waving';
      if (guideRightArmPivot) {
        if (prefersReduced) {
          guideRightArmPivot.rotation.set(-0.28, 0, visitorNear ? -1.18 : -0.82);
        } else if (activeWave) {
          guideRightArmPivot.rotation.x = -0.42;
          guideRightArmPivot.rotation.z =
            -1.32 + Math.sin(elapsedSec * 5.6) * 0.26;
        } else if (techBuddyPose === 'pointing') {
          guideRightArmPivot.rotation.z = -1.45;
          guideRightArmPivot.rotation.x = -0.55;
        } else if (techBuddyPose === 'celebrating') {
          guideRightArmPivot.rotation.x = -0.25;
          guideRightArmPivot.rotation.z =
            -2.15 + Math.sin(elapsedSec * 8.0) * 0.25;
        } else if (techBuddyPose === 'interacting') {
          guideRightArmPivot.rotation.x = -0.35;
          guideRightArmPivot.rotation.z =
            -1.05 + Math.sin(elapsedSec * 4.5) * 0.22;
        } else {
          guideRightArmPivot.rotation.x = -0.28;
          guideRightArmPivot.rotation.z =
            -0.84 + Math.sin(elapsedSec * 1.9) * 0.065;
        }
      }
      if (guideHeadPivot) {
        if (prefersReduced) {
          guideHeadPivot.rotation.set(0, 0, 0);
          guideHeadPivot.position.y = 1.38;
        } else {
          guideHeadPivot.rotation.y = visitorNear
            ? Math.sin(elapsedSec * 2.2) * 0.06
            : techBuddyPose === 'talking'
              ? Math.sin(elapsedSec * 3.8) * 0.14
              : Math.sin(elapsedSec * 1.05) * 0.11;
          guideHeadPivot.rotation.x =
            guideApproachWaveTimer > 1.2
              ? Math.sin(elapsedSec * 4.5) * 0.07
              : 0;
          guideHeadPivot.position.y = 1.38 + Math.sin(elapsedSec * 2.0) * 0.008;
        }
      }
    }

    // 14. Animate Cached Memory-to-3D Reconstruction Sub-Nodes (zero per-frame .traverse())
    if (!prefersReduced) {
      for (let i = 0; i < memoryTo3DObjectsRegistry.length; i++) {
        const reg = memoryTo3DObjectsRegistry[i];
        for (let w = 0; w < reg.wheels.length; w++) {
          reg.wheels[w].rotation.z -= dt * 2.4;
        }
        for (let l = 0; l < reg.lanternOrbs.length; l++) {
          reg.lanternOrbs[l].position.y = 0.16 + Math.sin(elapsedSec * 2.8 + i) * 0.025;
        }
        for (let t = 0; t < reg.toyGroups.length; t++) {
          reg.toyGroups[t].position.y = 0.08 + Math.abs(Math.sin(elapsedSec * 5.2 + i)) * 0.015;
        }
      }
    }
  };

  const updateMemories = (nextMemories: Memory[]) => {
    if (isRoomDisposed) return;
    const safeList = Array.isArray(nextMemories) ? nextMemories : [];
    const nextUploaded = safeList.filter((m) => m && !m.hiddenFrom3D);
    const nextDefault = nextUploaded[0];

    rebuildDynamicMemoryDisplays(safeList);
    section3BMemoryUpdaters.forEach((updater) => {
      try {
        updater(nextUploaded, nextDefault);
      } catch {
        // Keep room stable even if a single display updater encounters malformed media
      }
    });
    bedroomInteractions.updateMemories(safeList);
  };

  const cleanup = () => {
    isRoomDisposed = true;
    memoryUpdateGeneration += 1;
    clearDynamicMemoryDisplays();
    section3BCinemaVideos.forEach((v) => {
      try {
        v.pause();
        v.removeAttribute('src');
        v.load();
      } catch {
        // ignore
      }
    });
    section3BCinemaVideos.length = 0;
    section3BDynamicTextures.forEach((tex) => {
      try {
        tex.dispose();
      } catch {
        // ignore
      }
    });
    section3BDynamicTextures.clear();
    activeVideoElements.forEach((v) => {
      try {
        v.pause();
        v.removeAttribute('src');
        v.load();
      } catch {
        // ignore
      }
    });
    activeVideoElements.length = 0;
    bedroomInteractions.dispose();
    disposables.forEach((d) => {
      try {
        d.dispose();
      } catch {
        // ignore
      }
    });
    disposables.length = 0;
  };

  const setBicycleRidePose = (
    active: boolean,
    pose?: { x: number; z: number; yaw: number },
    wheelSpinDelta = 0,
  ) => {
    const bikeGroup = interactiveObjectGroups.bicycle;
    if (!bikeGroup) return;
    if (active && pose) {
      bikeGroup.position.set(pose.x, 0, pose.z);
      // In buildExhibitionRoom3DScene the bike wheels align along local +X forward,
      // so subtracting Math.PI/2 aligns +X tangent smoothly along heading yaw.
      bikeGroup.rotation.y = pose.yaw - Math.PI / 2;
      if (bicycleFrontWheel && bicycleRearWheel && wheelSpinDelta) {
        bicycleFrontWheel.rotation.z -= wheelSpinDelta;
        bicycleRearWheel.rotation.z -= wheelSpinDelta;
      }
    } else {
      bikeGroup.position.set(4.85, 0, 4.35);
      bikeGroup.rotation.y = -Math.PI * 0.65;
    }
  };

  return {
    roomId: room.id,
    exhibitionStyle: effectiveStyle,
    rootGroup,
    disposables,
    solidWallMeshes,
    cameraObstacleMeshes,
    displayRecords,
    exitArchHitbox,
    applyEntranceAnimation,
    updateAmbientAnimations,
    updateMemories,
    triggerInteractiveObject,
    setAtmospherePreset,
    getAtmospherePreset,
    commandTechBuddy,
    getSpaceDestinationCoords,
    applyStudioCustomization,
    setBicycleRidePose,
    bedroomInteractions,
    cleanup,
  };
}
