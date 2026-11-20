import * as THREE from 'three';
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

/**
 * Generates a high-resolution warm ivory & champagne-beige Calacatta/Crema Marfil marble texture
 * with organic natural veining, subtle mineral clouds, large-format architectural slab joints,
 * and hairline brushed-brass corner inlays.
 */
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
    const applyMemoryOrPlaceholderTexture = (
      targetMat: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial,
      mem: Memory | undefined,
      placeholderTitle: string,
      placeholderSubtitle: string,
    ) => {
      if (mem) {
        const imgUrl =
          mem.customImageUrl ||
          getProceduralMemoryArt(mem.motif, mem.palette, mem.title, mem.location);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const tex = track(new THREE.Texture(img));
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAnisotropy;
        img.onload = () => {
          tex.needsUpdate = true;
          targetMat.map = tex;
          if ('emissiveMap' in targetMat) {
            targetMat.emissiveMap = tex;
          }
          targetMat.needsUpdate = true;
        };
        img.src = imgUrl;
      } else {
        const emptyTex = track(
          createEmptyExhibitPlaceholderTexture(
            placeholderTitle,
            placeholderSubtitle,
            maxAnisotropy,
          ),
        );
        targetMat.map = emptyTex;
        targetMat.needsUpdate = true;
      }
    };

    // Helper to create a 3D rounded dark-walnut & gold Zone Sign Plaque with interactive hitbox
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
      const w = opts.width || 1.48;
      const h = opts.height || 0.48;
      const signGroup = new THREE.Group();
      signGroup.name = `zone_sign_${opts.zoneId}`;
      signGroup.position.set(opts.x, opts.y, opts.z);
      signGroup.rotation.y = opts.rotY || 0;
      rootGroup.add(signGroup);

      const signBack = new THREE.Mesh(
        track(new THREE.BoxGeometry(w, h, 0.045)),
        matWalnut,
      );
      signGroup.add(signBack);

      const signRim = new THREE.Mesh(
        track(new THREE.BoxGeometry(w + 0.035, h + 0.035, 0.035)),
        matChampagneGold,
      );
      signRim.position.z = -0.005;
      signGroup.add(signRim);

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
      signFace.position.z = 0.026;
      signGroup.add(signFace);

      const mem = opts.linkedMemory || defaultInteractMem;
      if (mem) {
        const zoneHitbox = new THREE.Mesh(
          track(new THREE.BoxGeometry(w + 0.55, h + 0.95, 0.72)),
          track(new THREE.MeshBasicMaterial({ visible: false })),
        );
        zoneHitbox.position.set(0, -0.22, 0.16);
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

      const targetMem = mem || defaultInteractMem;
      if (targetMem) {
        const hit = new THREE.Mesh(
          track(new THREE.BoxGeometry(spec.w + 0.16, spec.h + 0.16, 0.24)),
          track(new THREE.MeshBasicMaterial({ visible: false })),
        );
        hit.userData = {
          kind: 'room_memory_display',
          memoryId: targetMem.id,
          memory: targetMem,
          roomId: room.id,
          title: mem ? mem.title : `Memory Wall · ${spec.slotLabel}`,
          exhibitFormatType: 'memory_wall',
          associated3DObject: 'Memory Wall Frame',
          interactionType: 'open-memory',
          subtitle: 'Memory Wall Gallery · Click or press [E] to inspect',
        };
        fNode.add(hit);
      }
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
      fGroup.position.set(spot.x, spot.y, spot.z);
      fGroup.rotation.y = spot.rotY;
      rootGroup.add(fGroup);

      animatedFloatingFrames.push({
        group: fGroup,
        baseY: spot.y,
        baseRotY: spot.rotY,
        phase: idx * 1.15,
      });

      // Double glowing golden neon-border frame matching the reference image
      const glowFrameOuter = new THREE.Mesh(
        track(new THREE.BoxGeometry(spot.w + 0.1, spot.h + 0.1, 0.036)),
        matWarmEmissiveStrip,
      );
      fGroup.add(glowFrameOuter);
      cameraObstacleMeshes.push(glowFrameOuter);

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

      const targetMem = fMem || defaultInteractMem;
      if (targetMem) {
        const fHitbox = new THREE.Mesh(
          track(new THREE.BoxGeometry(spot.w + 0.18, spot.h + 0.18, 0.28)),
          track(new THREE.MeshBasicMaterial({ visible: false })),
        );
        fHitbox.userData = {
          kind: 'room_memory_display',
          memoryId: targetMem.id,
          memory: targetMem,
          roomId: room.id,
          title: fMem ? fMem.title : `Floating Memories · Canopy Slot #${idx + 1}`,
          exhibitFormatType: 'floating_memories',
          associated3DObject: 'Floating Memory Frame',
          interactionType: 'open-memory',
          subtitle: 'Floating Memories Canopy · Click or press [E] to inspect',
        };
        fGroup.add(fHitbox);
      }
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

    const videoMem =
      uploadedMemories.find((m) => (m.type || m.mediaType) === 'video') ||
      uploadedMemories[1] ||
      uploadedMemories[0];

    const cinemaScreenMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      }),
    );

    const videoSrc = videoMem ? videoMem.mediaUrl || videoMem.customImageUrl || '' : '';
    if (
      videoMem &&
      ((videoMem.type || videoMem.mediaType) === 'video' ||
        videoSrc.startsWith('data:video') ||
        videoSrc.startsWith('blob:') ||
        videoSrc.endsWith('.mp4') ||
        videoSrc.endsWith('.webm')) &&
      videoSrc
    ) {
      const cVideoElem = document.createElement('video');
      cVideoElem.src = videoSrc;
      cVideoElem.muted = true;
      cVideoElem.loop = true;
      cVideoElem.playsInline = true;
      cVideoElem.crossOrigin = 'anonymous';
      cVideoElem.preload = 'metadata';
      activeVideoElements.push(cVideoElem);

      const cVideoTex = track(new THREE.VideoTexture(cVideoElem));
      cVideoTex.colorSpace = THREE.SRGBColorSpace;
      cinemaScreenMat.map = cVideoTex;
      cVideoElem.play().catch(() => {
        // Muted autoplay fallback
      });
    } else {
      applyMemoryOrPlaceholderTexture(
        cinemaScreenMat,
        videoMem,
        'Cinema Corner Widescreen',
        'Upload a childhood video or memory to play here',
      );
    }

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
    const cinemaTargetMem = videoMem || defaultInteractMem;
    if (cinemaTargetMem) {
      const screenHit = new THREE.Mesh(
        track(new THREE.BoxGeometry(2.95, 1.75, 0.35)),
        track(new THREE.MeshBasicMaterial({ visible: false })),
      );
      screenHit.position.set(0, 2.08, 0.1);
      screenHit.userData = {
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
      cinemaCornerGroup.add(screenHit);
    }

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
      linkedMemory: videoMem || defaultInteractMem,
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
  }

  // =========================================================================
  // 4. BUILD INDIVIDUAL 3D MEMORY EXHIBITION DISPLAYS (ALL 8 STYLES)
  // =========================================================================
  const placements = computeExhibitionPlacements(
    room,
    rawMemories,
    effectiveStyle,
  );

  placements.forEach((p, pIdx) => {
    const mem = p.memory;
    const offsetX = mem.positionOffset?.x || 0;
    const offsetY = mem.positionOffset?.y || 0;
    let targetX = p.x + offsetX;
    let localY = p.y - floorBaseY + offsetY;
    let targetZ = p.z;
    let targetRotY = p.rotY;

    // If the user or Gemini curator assigned a 3D placement target, position it at that zone
    if (mem.placementTarget === 'study_desk') {
      targetX = -5.15 + (pIdx % 3) * 0.38 + offsetX;
      localY = 1.48 + offsetY;
      targetZ = -4.55;
      targetRotY = Math.PI * 0.36;
    } else if (mem.placementTarget === 'bedside_shelf') {
      targetX = -5.65 + offsetX;
      localY = 1.75 + (pIdx % 2) * 0.55 + offsetY;
      targetZ = 2.65 + (pIdx % 3) * 0.55;
      targetRotY = Math.PI / 2;
    } else if (mem.placementTarget === 'scrapbook_podium') {
      targetX = -0.45 + (pIdx % 3) * 0.45 + offsetX;
      localY = 1.28 + offsetY;
      targetZ = -0.35;
      targetRotY = 0;
    } else if (mem.placementTarget === 'garden_trail') {
      targetX = 5.72 + offsetX;
      localY = 1.38 + offsetY;
      targetZ = -3.45 + (pIdx % 4) * 1.45;
      targetRotY = -Math.PI * 0.46;
    } else if (mem.placementTarget === 'treehouse_nook') {
      targetX = 4.35 + (pIdx % 2) * 0.72 + offsetX;
      localY = 2.86 + offsetY;
      targetZ = -2.25;
      targetRotY = -Math.PI * 0.22;
    } else if (mem.placementTarget === 'bicycle_trail') {
      targetX = 0.65 + (pIdx % 3) * 1.45 + offsetX;
      localY = 1.26 + offsetY;
      targetZ = 5.45;
      targetRotY = Math.PI;
    }

    const displayGroup = new THREE.Group();
    displayGroup.position.set(targetX, localY, targetZ);
    displayGroup.rotation.y = targetRotY;
    // Section 3B already mounts the first 7 memories into the dedicated Memory Wall,
    // Central Tree Floating Canopy, Scrapbook, Cinema, and Audio zones.
    // Only add additional standalone Section 4 frames to rootGroup when an explicit
    // placementTarget is set or for overflow memories beyond Section 3B's 7 slots,
    // preventing overlapping duplicate frames in the middle of the room.
    const isAlreadyInSection3B = pIdx < 7 && !mem.placementTarget;
    if (!isAlreadyInSection3B) {
      rootGroup.add(displayGroup);
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

    const frameMat = track(
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
      track(new THREE.BoxGeometry(frameW + 0.14, frameH + 0.14, frameDepth)),
      frameMat,
    );
    displayGroup.add(frameMesh);
    if (!isAlreadyInSection3B) {
      cameraObstacleMeshes.push(frameMesh);
    }

    if (!p.isMainCinemaScreen) {
      const matBoard = new THREE.Mesh(
        track(new THREE.BoxGeometry(frameW + 0.02, frameH + 0.02, frameDepth + 0.01)),
        track(
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

    const artMat = track(
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
    const videoSrc = mem.mediaUrl || mem.customImageUrl || '';

    if (
      isVideoMem &&
      p.isMainCinemaScreen &&
      videoSrc &&
      (videoSrc.startsWith('data:video') ||
        videoSrc.startsWith('blob:') ||
        videoSrc.endsWith('.mp4') ||
        videoSrc.endsWith('.webm'))
    ) {
      videoElem = document.createElement('video');
      videoElem.src = videoSrc;
      videoElem.muted = true;
      videoElem.loop = true;
      videoElem.playsInline = true;
      videoElem.crossOrigin = 'anonymous';
      videoElem.preload = 'metadata';
      activeVideoElements.push(videoElem);

      videoTex = track(new THREE.VideoTexture(videoElem));
      videoTex.colorSpace = THREE.SRGBColorSpace;
      artMat.map = videoTex;
      artMat.emissiveMap = videoTex;
      videoElem.play().catch(() => {
        // Fallback if browser blocks even muted playback
      });
    } else {
      const imgDataUrl =
        mem.customImageUrl ||
        getProceduralMemoryArt(
          mem.motif,
          mem.palette,
          mem.title,
          mem.location,
        );
      const img = new Image();
      const artTex = track(new THREE.Texture(img));
      artTex.colorSpace = THREE.SRGBColorSpace;
      artTex.anisotropy = maxAnisotropy;
      img.onload = () => {
        artTex.needsUpdate = true;
        artMat.map = artTex;
        artMat.emissiveMap = artTex;
        artMat.needsUpdate = true;
      };
      img.src = imgDataUrl;
    }

    const artPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(frameW - 0.12, frameH - 0.12)),
      artMat,
    );
    artPlane.position.z = frameDepth * 0.5 + 0.012;
    displayGroup.add(artPlane);

    const haloMat = track(
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
      track(new THREE.PlaneGeometry(frameW + 0.42, frameH + 0.42)),
      haloMat,
    );
    haloMesh.position.z = -frameDepth * 0.5 - 0.015;
    displayGroup.add(haloMesh);

    const picHoodW = Math.min(0.68, frameW * 0.45);
    const picHood = new THREE.Mesh(
      track(new THREE.BoxGeometry(picHoodW, 0.04, 0.09)),
      matChampagneGold,
    );
    picHood.position.set(0, frameH * 0.5 + 0.12, 0.06);
    displayGroup.add(picHood);

    const picLightMat = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FFFCF6'),
        emissive: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
        emissiveIntensity: 0.9,
        roughness: 0.2,
      }),
    );
    const picLightLens = new THREE.Mesh(
      track(new THREE.BoxGeometry(picHoodW * 0.86, 0.018, 0.055)),
      picLightMat,
    );
    picLightLens.position.set(0, frameH * 0.5 + 0.1, 0.065);
    displayGroup.add(picLightLens);

    const plaqueTex = track(
      createMemoryMuseumPlaqueTexture(
        mem,
        p.chronologicalDateLabel,
        room.accentColor,
        maxAnisotropy,
      ),
    );
    const plaqueMesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(Math.min(1.32, frameW * 0.85), 0.34)),
      track(new THREE.MeshBasicMaterial({ map: plaqueTex })),
    );
    plaqueMesh.position.set(0, -frameH * 0.5 - 0.26, 0.035);
    displayGroup.add(plaqueMesh);

    if (p.mountStyle === 'floating_exhibition') {
      const cableHeight = Math.max(0.5, roomH - localY - frameH * 0.5);
      const cableGeo = track(
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
        track(new THREE.BoxGeometry(0.025, stemLen, 0.025)),
        matChampagneGold,
      );
      stem.position.set(0, -frameH * 0.5 - stemLen * 0.5, 0.01);
      displayGroup.add(stem);

      const dateBadgeText = p.chronologicalDateLabel || 'UNDATED';
      const dateNodeTex = track(
        createTimelineDateNodeTexture(
          dateBadgeText,
          room.accentColor,
          maxAnisotropy,
        ),
      );
      const dateNodeMesh = new THREE.Mesh(
        track(new THREE.PlaneGeometry(0.68, 0.22)),
        track(new THREE.MeshBasicMaterial({ map: dateNodeTex })),
      );
      dateNodeMesh.position.set(0, 1.38 - localY, 0.045);
      displayGroup.add(dateNodeMesh);
    } else if (p.mountStyle === 'memory_shelves') {
      const shelfLedge = new THREE.Mesh(
        track(new THREE.BoxGeometry(frameW + 0.36, 0.06, 0.42)),
        matWalnut,
      );
      shelfLedge.position.set(0, -frameH * 0.5 - 0.1, 0.14);
      displayGroup.add(shelfLedge);

      const glassFront = new THREE.Mesh(
        track(new THREE.BoxGeometry(frameW + 0.32, frameH + 0.36, 0.34)),
        matVitrineGlass,
      );
      glassFront.position.set(0, 0.04, 0.12);
      displayGroup.add(glassFront);
    } else if (p.mountStyle === 'scrapbook_collage') {
      const boardMesh = new THREE.Mesh(
        track(new THREE.BoxGeometry(frameW + 0.34, frameH + 0.52, 0.03)),
        matWarmLimestone,
      );
      boardMesh.position.set(0, -0.08, -0.025);
      displayGroup.add(boardMesh);

      const pinGeo = track(new THREE.SphereGeometry(0.025, 10, 10));
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
        track(new THREE.BoxGeometry(0.06, 0.06, 0.65)),
        matChampagneGold,
      );
      arm.position.set(0, 0, -0.34);
      displayGroup.add(arm);
    }

    const blueprintEx = exhibitBlueprintMap.get(mem.id);
    if (blueprintEx) {
      if (blueprintEx.type === 'vintage-television') {
        const tvAntennaGeo = track(
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
          track(new THREE.BoxGeometry(0.04, 0.22, 0.015)),
          matChampagneGold,
        );
        ribbon.position.set(frameW * 0.28, -frameH * 0.5 - 0.14, 0.04);
        displayGroup.add(ribbon);
      } else if (
        blueprintEx.type === 'interactive-school-bag' ||
        blueprintEx.type === 'keepsake-vitrine'
      ) {
        const keepsakeShelf = new THREE.Mesh(
          track(new THREE.BoxGeometry(frameW * 0.72, 0.04, 0.22)),
          matWalnut,
        );
        keepsakeShelf.position.set(0, -frameH * 0.5 - 0.46, 0.09);
        displayGroup.add(keepsakeShelf);
      }
    }

    const hitboxMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(frameW + 0.3, frameH + 0.5, 0.35)),
      track(new THREE.MeshBasicMaterial({ visible: false })),
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

  // =========================================================================
  // 4B. MEMORY-TO-3D RECONSTRUCTION REGISTRY & REAL GLTFLOADER INTEGRATION
  //     Only spawns 3D objects for memories explicitly approved by the user!
  // =========================================================================
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

  const approved3DMemories = rawMemories.filter(
    (m) => !m.hiddenFrom3D && isMemory3DBlueprintApproved(m),
  );

  approved3DMemories.forEach((mem, idx) => {
    const bp = mem.memoryTo3DBlueprint!;
    const offsetX = mem.positionOffset?.x || 0;
    const offsetY = mem.positionOffset?.y || 0;

    // Slight deterministic offset if multiple approved objects share identical default coordinates
    const slotSpreadX = (idx % 3 === 1 ? 0.65 : idx % 3 === 2 ? -0.65 : 0);
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
    rootGroup.add(containerGroup);

    // 1. Immediate synchronous mesh so there is zero empty frame while optional external GLB loads
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

    // 2. Asynchronously load external .glb or cached procedural template cleanly
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
        if (!containerGroup.parent) {
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

    // 3. Floating 3D Museum Plaque & AI-Interpretation / Asset Tier Badge above the 3D object
    const badgeLabel = bp.generatedGlbAssetRef.isAiInterpretation
      ? 'AI-INTERPRETED 3D KEEPSAKE'
      : `3D MEMORY OBJECT · ${bp.connectedSpace.replace('_', ' ').toUpperCase()}`;
    const plaqueTex = track(
      createMemoryMuseumPlaqueTexture(
        mem,
        badgeLabel,
        room.accentColor,
        maxAnisotropy,
      ),
    );
    const plaqueMesh = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.15, 0.32)),
      track(
        new THREE.MeshBasicMaterial({
          map: plaqueTex,
          side: THREE.DoubleSide,
        }),
      ),
    );
    plaqueMesh.position.set(0, 1.08, 0);
    containerGroup.add(plaqueMesh);

    // 4. Raycast & Proximity Hitbox connected to the original uploaded memory
    const hitboxMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.15, 1.35, 1.15)),
      track(new THREE.MeshBasicMaterial({ visible: false })),
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

    const proxyFrameMat = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(MUSEUM_LUXURY_PALETTE.champagneGold),
        roughness: 0.28,
        metalness: 0.78,
      }),
    );
    const proxyFrameMesh = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.49, 0.49, 0.02, 24)),
      proxyFrameMat,
    );
    proxyFrameMesh.position.set(0, 0.085, 0);
    containerGroup.add(proxyFrameMesh);

    const proxyLightMat = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FFFCF6'),
        emissive: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
        emissiveIntensity: 0.85,
      }),
    );
    const proxyHaloMat = track(
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
  };

  const interactiveStates: Record<InteractiveObjectId3D, boolean> = {
    toy_chest: false,
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
  };

  const interactiveAnimTimers: Record<InteractiveObjectId3D, number> = {
    toy_chest: 0,
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
  };

  // Match uploaded memories to interactive 3D objects by explicit linkedObjectId or keywords
  const findLinkedMemoryForObject = (
    objectId: InteractiveObjectId3D,
    keywords: RegExp,
  ): Memory | undefined => {
    // Only attach a memory when the user or AI explicitly linked it, or when
    // its own metadata contains a relevant keyword. Never attach an unrelated
    // memory just because it happens to occupy a fallback array position.
    const explicit = memories.find((m) => m.linkedObjectId === objectId);
    if (explicit) return explicit;
    return memories.find((m) =>
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
    new THREE.MeshStandardMaterial({ color: '#C87A5B', roughness: 0.78 }),
  );
  const matWardrobeDoor = track(
    new THREE.MeshStandardMaterial({ color: '#5A3E2B', roughness: 0.45 }),
  );
  const matStudyDeskTop = track(
    new THREE.MeshStandardMaterial({
      map: walnutTex,
      color: '#FFFFFF',
      roughness: 0.34,
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
    // Positioned cleanly in the SW corner so it never overlaps the West Memory Wall (z = -2.97..+0.67)
    const bedGroup = interactiveObjectGroups.wooden_bed;
    bedGroup.position.set(-5.05, 0, 3.65);
    bedGroup.rotation.y = Math.PI / 2;
    spaceGroups.bedroom.add(bedGroup);

    const bedFrame = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.45, 0.34, 1.95)),
      matWalnut,
    );
    bedFrame.position.set(0, 0.19, 0);
    bedFrame.castShadow = true;
    bedGroup.add(bedFrame);
    cameraObstacleMeshes.push(bedFrame);

    const headboard = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.48, 0.96, 0.12)),
      matWalnut,
    );
    headboard.position.set(0, 0.52, -0.92);
    bedGroup.add(headboard);
    cameraObstacleMeshes.push(headboard);

    // Optional Cozy 4-Poster Canopy Frame (toggled when bedDesign === 'cozy_canopy')
    bedGroup.add(bedCanopyGroup);
    [
      [-0.68, -0.9],
      [0.68, -0.9],
      [-0.68, 0.9],
      [0.68, 0.9],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.032, 0.032, 1.85, 10)),
        matWalnut,
      );
      post.position.set(px, 0.95, pz);
      bedCanopyGroup.add(post);
    });
    const canopyRoof = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.46, 0.06, 1.92)),
      matBoucleFabric,
    );
    canopyRoof.position.set(0, 1.88, 0);
    bedCanopyGroup.add(canopyRoof);

    const mattress = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.34, 0.22, 1.82)),
      track(new THREE.MeshStandardMaterial({ color: '#FAF4E8', roughness: 0.72 })),
    );
    mattress.position.set(0, 0.42, 0.02);
    bedGroup.add(mattress);

    const blanket = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.36, 0.24, 1.18)),
      matBedBlanket,
    );
    blanket.position.set(0, 0.43, 0.32);
    bedGroup.add(blanket);

    // Cozy Woven Bedroom & Playroom Rugs (toggled via showRugs)
    const bedRug = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.35, 1.35, 0.014, 32)),
      matWovenLinenRug,
    );
    bedRug.position.set(-4.65, 0.008, 3.65);
    bedroomRugsGroup.add(bedRug);

    const playRug = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.05, 1.05, 0.014, 32)),
      track(new THREE.MeshStandardMaterial({ color: '#DFC5A5', roughness: 0.9 })),
    );
    playRug.position.set(-3.35, 0.008, 2.55);
    bedroomRugsGroup.add(playRug);

    // Decorative Floor Cushions neatly beside the play rug (toggled via showCushions)
    [
      { x: -3.65, z: 2.35, color: '#D67A5C' },
      { x: -3.15, z: 2.75, color: '#6E8B74' },
      { x: -3.55, z: 2.85, color: '#D9A05B' },
    ].forEach((c) => {
      const cush = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.24, 0.26, 0.1, 20)),
        track(new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.82 })),
      );
      cush.position.set(c.x, 0.05, c.z);
      bedroomCushionsGroup.add(cush);
    });

    // Framed Childhood Wall Posters on the SW bedroom wall (replaces protruding red wall box)
    [
      { x: -halfW + 0.25, y: 2.45, z: 3.25, color: '#547A8C' },
      { x: -halfW + 0.25, y: 2.45, z: 4.15, color: '#D6A15D' },
    ].forEach((poster) => {
      const posterMesh = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.03, 0.62, 0.48)),
        track(new THREE.MeshStandardMaterial({ color: poster.color, roughness: 0.55 })),
      );
      posterMesh.position.set(poster.x, poster.y, poster.z);
      bedroomPostersGroup.add(posterMesh);
    });

    // Warm Bedside Nightstand Lamp in the SW bedroom alcove (toggled via showLamps)
    const nightstandLamp = new THREE.Group();
    nightstandLamp.position.set(-5.85, 0, 2.45);
    bedroomLampsGroup.add(nightstandLamp);
    const standTable = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.44, 0.54, 0.44)),
      matWalnut,
    );
    standTable.position.set(0, 0.27, 0);
    nightstandLamp.add(standTable);
    const standShade = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.16, 0.22, 16)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#FFF3D6',
          emissive: new THREE.Color('#FFD996'),
          emissiveIntensity: 0.65,
        }),
      ),
    );
    standShade.position.set(0, 0.7, 0);
    nightstandLamp.add(standShade);

    bedPillowBounceGroup = new THREE.Group();
    bedPillowBounceGroup.position.set(0, 0.56, -0.58);
    bedGroup.add(bedPillowBounceGroup);

    [-0.32, 0.32].forEach((px) => {
      const pillow = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.52, 0.12, 0.34)),
        track(new THREE.MeshStandardMaterial({ color: '#FFFDF8', roughness: 0.65 })),
      );
      pillow.position.set(px, 0, 0);
      bedPillowBounceGroup!.add(pillow);
    });

    // Little Teddy Bear sitting on the bed pillow
    const bedTeddyMat = track(
      new THREE.MeshStandardMaterial({ color: '#B87B44', roughness: 0.8 }),
    );
    const bedTeddyBody = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.12, 14, 14)),
      bedTeddyMat,
    );
    bedTeddyBody.position.set(0, 0.14, 0.08);
    bedPillowBounceGroup.add(bedTeddyBody);
    const bedTeddyHead = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.095, 14, 14)),
      bedTeddyMat,
    );
    bedTeddyHead.position.set(0, 0.29, 0.08);
    bedPillowBounceGroup.add(bedTeddyHead);

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

    // Walnut Bedroom Wardrobe with Opening Hinged Door along the South-West wall (facing North)
    const wardrobeGroup = interactiveObjectGroups.wardrobe;
    wardrobeGroup.position.set(-4.35, 0, 6.08);
    wardrobeGroup.rotation.y = Math.PI;
    spaceGroups.bedroom.add(wardrobeGroup);

    const wardrobeBody = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.96, 1.92, 0.52)),
      matWalnut,
    );
    wardrobeBody.position.set(0, 0.96, 0);
    wardrobeGroup.add(wardrobeBody);
    cameraObstacleMeshes.push(wardrobeBody);

    wardrobeDoorPivot = new THREE.Group();
    wardrobeDoorPivot.position.set(-0.46, 0.96, 0.27);
    wardrobeGroup.add(wardrobeDoorPivot);

    const wardrobeDoorMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.92, 1.82, 0.04)),
      matWardrobeDoor,
    );
    wardrobeDoorMesh.position.set(0.46, 0, 0);
    wardrobeDoorPivot.add(wardrobeDoorMesh);

    const wardrobeHandle = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.032, 10, 10)),
      matChampagneGold,
    );
    wardrobeHandle.position.set(0.82, 0, 0.04);
    wardrobeDoorPivot.add(wardrobeHandle);

    const wardrobeMem = findLinkedMemoryForObject(
      'wardrobe',
      /wardrobe|outfit|dress|uniform|school|clothes|jacket/,
    );
    registerInteractiveHitbox(
      wardrobeGroup,
      'wardrobe',
      'bedroom',
      'Walnut Childhood Wardrobe',
      'Click or press [E] to open wardrobe door & inspect keepsakes inside',
      [1.15, 2.0, 0.85],
      [0, 1.0, 0.15],
      wardrobeMem,
    );

    // Bedroom Retro Television Set in the SW alcove along the South-West wall
    const tvGroup = interactiveObjectGroups.bedroom_tv;
    tvGroup.position.set(-2.95, 0, 6.02);
    tvGroup.rotation.y = Math.PI;
    spaceGroups.bedroom.add(tvGroup);

    const tvStand = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.82, 0.62, 0.44)),
      matWalnut,
    );
    tvStand.position.set(0, 0.31, 0);
    tvGroup.add(tvStand);
    cameraObstacleMeshes.push(tvStand);

    const tvCabinet = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.74, 0.54, 0.38)),
      track(new THREE.MeshStandardMaterial({ color: '#3B281B', roughness: 0.42 })),
    );
    tvCabinet.position.set(0, 0.89, 0);
    tvGroup.add(tvCabinet);
    cameraObstacleMeshes.push(tvCabinet);

    bedroomTvScreenMat = track(
      new THREE.MeshStandardMaterial({
        color: '#2B4C6F',
        emissive: new THREE.Color('#5CA8FF'),
        emissiveIntensity: 0.35,
        roughness: 0.2,
      }),
    );
    const tvScreen = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.58, 0.4)),
      bedroomTvScreenMat,
    );
    tvScreen.position.set(0, 0.9, 0.195);
    tvGroup.add(tvScreen);

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

    const deskTop = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.32, 0.07, 0.74)),
      matStudyDeskTop,
    );
    deskTop.position.set(0, 0.76, 0);
    deskGroup.add(deskTop);
    cameraObstacleMeshes.push(deskTop);

    [
      [-0.58, -0.3],
      [0.58, -0.3],
      [-0.58, 0.3],
      [0.58, 0.3],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.035, 0.028, 0.74, 10)),
        matWalnut,
      );
      leg.position.set(lx, 0.37, lz);
      deskGroup.add(leg);
    });

    deskDrawerMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.58, 0.11, 0.62)),
      track(new THREE.MeshStandardMaterial({ color: '#61432D', roughness: 0.5 })),
    );
    deskDrawerMesh.position.set(0, 0.67, 0.04);
    deskGroup.add(deskDrawerMesh);

    // Desk lamp & certificate scroll on desk
    studyDeskLampGroup = new THREE.Group();
    deskGroup.add(studyDeskLampGroup);
    const lampBase = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.09, 0.11, 0.04, 14)),
      matChampagneGold,
    );
    lampBase.position.set(-0.42, 0.81, -0.16);
    studyDeskLampGroup.add(lampBase);

    const lampShade = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.14, 0.16, 16)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#2F5D46',
          emissive: new THREE.Color('#FFE09E'),
          emissiveIntensity: 0.45,
          roughness: 0.35,
        }),
      ),
    );
    lampShade.position.set(-0.36, 1.08, -0.12);
    studyDeskLampGroup.add(lampShade);

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

    // Interactive Spinning World Globe on Study Desk
    const globeGroup = interactiveObjectGroups.spinning_globe;
    globeGroup.position.set(-4.95, 0.8, -4.45);
    spaceGroups.study_corner.add(globeGroup);

    const globeBase = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.1, 0.13, 0.05)),
      matChampagneGold,
    );
    globeGroup.add(globeBase);

    globeSphereMesh = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.17, 22, 22)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#4F86A6',
          roughness: 0.38,
          metalness: 0.12,
        }),
      ),
    );
    globeSphereMesh.position.set(0, 0.22, 0);
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
  }

  // -------------------------------------------------------------------------
  // SPACE C: CHILDHOOD PLAY AREA (Organized around perimeter & central track)
  // Hinged Toy Chest, Chugging Toy Train, Chalk Hopscotch Court & Cricket Set
  // -------------------------------------------------------------------------
  let toyChestLidPivot: THREE.Group | null = null;
  let toyTrainCarriageGroup: THREE.Group | null = null;
  let hopscotchPuckMesh: THREE.Mesh | null = null;
  let cricketBatPivot: THREE.Group | null = null;
  let cricketBallMesh: THREE.Mesh | null = null;
  {
    // 1. Hinged Wooden Toy Storage Chest in SW Play Alcove
    const chestGroup = interactiveObjectGroups.toy_chest;
    chestGroup.position.set(-3.55, 0, 2.35);
    chestGroup.rotation.y = 0.42;
    spaceGroups.play_area.add(chestGroup);

    const chestBox = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.86, 0.44, 0.52)),
      matWalnut,
    );
    chestBox.position.set(0, 0.22, 0);
    chestGroup.add(chestBox);

    toyChestLidPivot = new THREE.Group();
    toyChestLidPivot.position.set(0, 0.44, -0.25);
    chestGroup.add(toyChestLidPivot);

    const chestLid = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.88, 0.08, 0.54)),
      track(new THREE.MeshStandardMaterial({ color: '#7A5234', roughness: 0.48 })),
    );
    chestLid.position.set(0, 0.04, 0.25);
    toyChestLidPivot.add(chestLid);

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

    // 2. Express Toy Train on Circular Brass Track around Central Tree Plinth (centered at (0, 0, -1.1))
    const trainRoot = interactiveObjectGroups.toy_train;
    trainRoot.position.set(0, 0, -1.1);
    spaceGroups.play_area.add(trainRoot);

    const trackRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.62, 0.014, 10, 56)),
      matChampagneGold,
    );
    trackRing.rotation.x = Math.PI / 2;
    trackRing.position.y = 0.02;
    trainRoot.add(trackRing);

    toyTrainCarriageGroup = new THREE.Group();
    toyTrainCarriageGroup.position.set(1.62, 0.08, 0);
    trainRoot.add(toyTrainCarriageGroup);

    const locoEngine = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.32, 0.16, 0.16)),
      track(new THREE.MeshStandardMaterial({ color: '#922B21', roughness: 0.4 })),
    );
    locoEngine.position.set(0, 0.08, 0);
    toyTrainCarriageGroup.add(locoEngine);

    const locoChimney = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 12)),
      matChampagneGold,
    );
    locoChimney.position.set(0.09, 0.2, 0);
    toyTrainCarriageGroup.add(locoChimney);

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
      matChampagneGold,
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

    // 4. Backyard/Play Area Cricket Bat, Ball & Wickets Set in SE Play Court
    const cricketGroup = interactiveObjectGroups.cricket_set;
    cricketGroup.position.set(3.85, 0, 2.75);
    cricketGroup.rotation.y = -0.35;
    spaceGroups.play_area.add(cricketGroup);

    // 3 Wooden Stumps + Bail
    [-0.08, 0, 0.08].forEach((wx) => {
      const stump = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.016, 0.016, 0.58)),
        track(new THREE.MeshStandardMaterial({ color: '#DFC18D', roughness: 0.52 })),
      );
      stump.position.set(wx, 0.29, 0);
      cricketGroup.add(stump);
    });

    cricketBatPivot = new THREE.Group();
    cricketBatPivot.position.set(0.26, 0.42, 0.12);
    cricketBatPivot.rotation.z = -0.28;
    cricketGroup.add(cricketBatPivot);

    const batBlade = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.09, 0.48, 0.035)),
      track(new THREE.MeshStandardMaterial({ color: '#D6AF74', roughness: 0.55 })),
    );
    batBlade.position.set(0, -0.16, 0);
    cricketBatPivot.add(batBlade);

    const batHandle = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 10)),
      track(new THREE.MeshStandardMaterial({ color: '#FAF3E6', roughness: 0.7 })),
    );
    batHandle.position.set(0, 0.18, 0);
    cricketBatPivot.add(batHandle);

    cricketBallMesh = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.045, 14, 14)),
      track(new THREE.MeshStandardMaterial({ color: '#B32821', roughness: 0.35 })),
    );
    cricketBallMesh.position.set(0.14, 0.045, 0.24);
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
    roomHemiLight.intensity = targets.hemiIntensity;
    centerCeilingLight.color.set(targets.centerColorHex);
    centerCeilingLight.intensity =
      studioLightIntensityOverride ?? targets.centerIntensity;
    northWallWasher.color.set(targets.northColorHex);
    northWallWasher.intensity = targets.northIntensity;
    westWallWasher.intensity = targets.sideWashIntensity;
    eastWallWasher.intensity = targets.sideWashIntensity;
    southEntryLight.intensity = targets.southEntryIntensity;
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
        interactiveObjectGroups.spinning_globe.position.set(-4.95, 0.8, -4.45);
      } else if (config.furnitureLayoutPreset === 'window_facing') {
        interactiveObjectGroups.wooden_bed.position.set(-4.85, 0, 3.85);
        interactiveObjectGroups.wooden_bed.rotation.y = Math.PI * 0.42;
        interactiveObjectGroups.wardrobe.position.set(-4.15, 0, 6.08);
        interactiveObjectGroups.study_desk.position.set(-5.05, 0, -4.45);
        interactiveObjectGroups.spinning_globe.position.set(-4.75, 0.8, -4.25);
      } else if (config.furnitureLayoutPreset === 'spacious_play') {
        interactiveObjectGroups.wooden_bed.position.set(-5.25, 0, 3.95);
        interactiveObjectGroups.wooden_bed.rotation.y = Math.PI / 2;
        interactiveObjectGroups.wardrobe.position.set(-4.45, 0, 6.12);
        interactiveObjectGroups.study_desk.position.set(-5.35, 0, -4.85);
        interactiveObjectGroups.spinning_globe.position.set(-5.05, 0.8, -4.65);
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
      rigTargets.southEntryIntensity * state.entranceGlowMultiplier;
    matEntranceSconceGlow.emissiveIntensity =
      0.95 * state.entranceGlowMultiplier;

    roomHemiLight.intensity =
      rigTargets.hemiIntensity * state.interiorLightFactor;
    centerCeilingLight.intensity =
      (studioLightIntensityOverride ?? rigTargets.centerIntensity) *
      state.interiorLightFactor;
    northWallWasher.intensity =
      rigTargets.northIntensity * state.interiorLightFactor;
    westWallWasher.intensity =
      rigTargets.sideWashIntensity * state.interiorLightFactor;
    eastWallWasher.intensity =
      rigTargets.sideWashIntensity * state.interiorLightFactor;
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

  // Continuous ambient animation for Floating Memories, 12 Interactive 3D Objects, Rain/Atmosphere & Tech Buddy
  const updateAmbientAnimations = (elapsedSec: number) => {
    const dt = Math.min(0.1, Math.max(0.001, elapsedSec - lastAnimElapsedSec));
    lastAnimElapsedSec = elapsedSec;

    for (let i = 0; i < animatedFloatingFrames.length; i++) {
      const item = animatedFloatingFrames[i];
      item.group.position.y =
        item.baseY + Math.sin(elapsedSec * 1.35 + item.phase) * 0.045;
      item.group.rotation.y =
        item.baseRotY + Math.cos(elapsedSec * 0.95 + item.phase) * 0.032;
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
    if (toyTrainCarriageGroup && interactiveStates.toy_train) {
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
      const swingAmp =
        interactiveAnimTimers.tyre_swing > 0 || interactiveStates.tyre_swing
          ? 0.28
          : 0.035;
      tyreSwingPivot.rotation.z = Math.sin(elapsedSec * 2.4) * swingAmp;
    }

    // 4. Bicycle wheels spin when triggered
    if (bicycleFrontWheel && bicycleRearWheel) {
      if (interactiveAnimTimers.bicycle > 0 || interactiveStates.bicycle) {
        bicycleFrontWheel.rotation.z -= dt * 8.5;
        bicycleRearWheel.rotation.z -= dt * 8.5;
      }
    }

    // 5. Cricket bat swing & ball arc
    if (cricketBatPivot && cricketBallMesh) {
      if (interactiveAnimTimers.cricket_set > 0) {
        const phase = (2.4 - interactiveAnimTimers.cricket_set) / 2.4;
        cricketBatPivot.rotation.z = -0.28 + Math.sin(phase * Math.PI * 2) * 0.85;
        cricketBallMesh.position.y =
          0.045 + Math.abs(Math.sin(phase * Math.PI * 2)) * 0.55;
        cricketBallMesh.position.z =
          0.24 + Math.sin(phase * Math.PI) * 0.75;
      } else {
        cricketBatPivot.rotation.z = -0.28;
        cricketBallMesh.position.set(0.14, 0.045, 0.24);
      }
    }

    // 6. Hopscotch marker puck hopping across squares
    if (hopscotchPuckMesh) {
      if (interactiveAnimTimers.hopscotch > 0 || interactiveStates.hopscotch) {
        const hopPhase = (elapsedSec * 2.2) % 1.7;
        hopscotchPuckMesh.position.z = -hopPhase;
        hopscotchPuckMesh.position.y =
          0.025 + Math.abs(Math.sin(elapsedSec * 8.5)) * 0.14;
      } else {
        hopscotchPuckMesh.position.set(0, 0.025);
      }
    }

    // 7. Study Desk Drawer slide open/closed
    if (deskDrawerMesh) {
      const targetZ = interactiveStates.study_desk ? 0.32 : 0.04;
      deskDrawerMesh.position.z +=
        (targetZ - deskDrawerMesh.position.z) * Math.min(1, dt * 8);
    }

    // 8. Spinning Globe rotation
    if (globeSphereMesh) {
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
      if (interactiveAnimTimers.wooden_bed > 0) {
        bedPillowBounceGroup.position.y =
          0.56 + Math.abs(Math.sin(elapsedSec * 9)) * 0.11;
      } else {
        bedPillowBounceGroup.position.y = 0.56;
      }
    }

    // 11. Bedroom TV Screen glow pulse
    if (bedroomTvScreenMat) {
      bedroomTvScreenMat.emissiveIntensity = interactiveStates.bedroom_tv
        ? 0.85 + Math.sin(elapsedSec * 6) * 0.12
        : 0.28;
    }

    // 12. Rain streaks outside windows when Rainy Window atmosphere is active
    if (rainStreaksGroup.visible) {
      for (let i = 0; i < rainDrops.length; i++) {
        const rd = rainDrops[i];
        rd.mesh.position.y -= rd.speed * dt;
        if (rd.mesh.position.y < 0.4) {
          rd.mesh.position.y = 4.1;
        }
      }
    }

    // 13. Tech Buddy Autonomous Walking & 10-Pose Articulation
    if (guideCharacterGroup) {
      const dx = techBuddyTargetPos.x - guideCharacterGroup.position.x;
      const dz = techBuddyTargetPos.z - guideCharacterGroup.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.08) {
        const moveSpeed = techBuddyPose === 'running' ? 3.2 : 1.85;
        const step = Math.min(dist, moveSpeed * dt);
        guideCharacterGroup.position.x += (dx / dist) * step;
        guideCharacterGroup.position.z += (dz / dist) * step;
        guideCharacterGroup.rotation.y = Math.atan2(dx, dz);
        guideCharacterGroup.position.y =
          Math.abs(Math.sin(elapsedSec * 9.5)) * 0.045;
      } else {
        guideCharacterGroup.rotation.y +=
          (techBuddyTargetYaw - guideCharacterGroup.rotation.y) *
          Math.min(1, dt * 6);
        guideCharacterGroup.position.y =
          techBuddyPose === 'sitting'
            ? -0.28
            : techBuddyPose === 'celebrating'
              ? Math.abs(Math.sin(elapsedSec * 7.5)) * 0.12
              : 0;
        if (techBuddyPose === 'walking' || techBuddyPose === 'running') {
          techBuddyPose = 'talking';
        }
      }

      if (guideRightArmPivot) {
        if (techBuddyPose === 'waving') {
          guideRightArmPivot.rotation.z =
            -1.25 + Math.sin(elapsedSec * 5.2) * 0.28;
        } else if (techBuddyPose === 'pointing') {
          guideRightArmPivot.rotation.z = -1.45;
          guideRightArmPivot.rotation.x = -0.55;
        } else if (techBuddyPose === 'celebrating') {
          guideRightArmPivot.rotation.z =
            -2.15 + Math.sin(elapsedSec * 8.0) * 0.25;
        } else if (techBuddyPose === 'interacting') {
          guideRightArmPivot.rotation.z =
            -1.05 + Math.sin(elapsedSec * 4.5) * 0.22;
        } else {
          guideRightArmPivot.rotation.z =
            -0.88 + Math.sin(elapsedSec * 2.1) * 0.08;
        }
      }
      if (guideHeadPivot) {
        guideHeadPivot.rotation.y =
          techBuddyPose === 'talking'
            ? Math.sin(elapsedSec * 3.8) * 0.14
            : Math.sin(elapsedSec * 1.1) * 0.09;
        guideHeadPivot.position.y = 1.38 + Math.sin(elapsedSec * 2.1) * 0.008;
      }
    }

    // 14. Animate Cached Memory-to-3D Reconstruction Sub-Nodes (zero per-frame .traverse())
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
  };

  const cleanup = () => {
    memoryTo3DObjectsRegistry.forEach((entry) => {
      disposeMemory3DObject(entry.containerGroup);
    });
    memoryTo3DObjectsRegistry.length = 0;
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
    triggerInteractiveObject,
    setAtmospherePreset,
    getAtmospherePreset,
    commandTechBuddy,
    getSpaceDestinationCoords,
    applyStudioCustomization,
    setBicycleRidePose,
    cleanup,
  };
}
