import * as THREE from 'three';
import { TechBuddyPose } from '../types/aiStudio';
import {
  SharedMuseumMaterialMaps,
  VisualQualityConfig,
  getVisualQualityConfig,
} from './museumVisualStandards';

// ============================================================================
// 1. CHARACTER STUDIO SCHEMA (VERSION 1) & TYPES
// ============================================================================

export type CharacterBodyType = 'masculine' | 'feminine' | 'neutral';

export type CharacterHairStyle =
  | 'short_crop'
  | 'side_part'
  | 'buzz'
  | 'curly_short'
  | 'wavy_medium'
  | 'straight_long'
  | 'bob'
  | 'ponytail'
  | 'bun'
  | 'single_braid'
  | 'curly_long'
  | 'bald';

export type CharacterFacialHair =
  | 'none'
  | 'stubble'
  | 'short_beard'
  | 'full_beard'
  | 'moustache';

export type CharacterOutfitId =
  | 'curator_coat'
  | 'casual'
  | 'smart'
  | 'school_uniform'
  | 'hoodie_joggers'
  | 'dress'
  | 'kurta_pyjama'
  | 'saree'
  | 'salwar_kameez'
  | 'sherwani';

export type CharacterFootwearId = 'shoes' | 'sneakers' | 'sandals' | 'boots';

export type CharacterGlassesId = 'none' | 'round_brass' | 'rectangular_walnut';
export type CharacterHeadwearId = 'none' | 'curator_cap' | 'headband';
export type CharacterEarringsId = 'none' | 'gold_studs' | 'champagne_hoops';

export interface CharacterAccessoriesConfig {
  glasses: CharacterGlassesId;
  headwear: CharacterHeadwearId;
  earrings: CharacterEarringsId;
  watch: boolean;
  satchel: boolean;
  scarf: boolean;
}

export interface CharacterOutfitColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface CharacterStudioConfigV1 {
  version: 1;
  bodyType: CharacterBodyType;
  skinTone: string;
  hairStyle: CharacterHairStyle;
  hairColor: string;
  facialHair: CharacterFacialHair;
  outfit: CharacterOutfitId;
  outfitColors: CharacterOutfitColors;
  footwear: CharacterFootwearId;
  accessories: CharacterAccessoriesConfig;
}

// ============================================================================
// 2. CURATED PALETTES & METADATA CATALOGS
// ============================================================================

export interface CharacterPaletteSwatch {
  id: string;
  label: string;
  hex: string;
  undertone?: string;
}

export const CHARACTER_SKIN_TONES: CharacterPaletteSwatch[] = [
  { id: 'porcelain_warm', label: 'Porcelain Warm', hex: '#F7E2CE', undertone: 'warm' },
  { id: 'alabaster_cool', label: 'Alabaster Cool', hex: '#F4DCD1', undertone: 'cool' },
  { id: 'ivory_classic', label: 'Classic Ivory', hex: '#F0CFB1', undertone: 'neutral' },
  { id: 'sand_beige', label: 'Warm Sand', hex: '#E6BC98', undertone: 'warm' },
  { id: 'honey_ochre', label: 'Honey Ochre', hex: '#D9A77D', undertone: 'warm' },
  { id: 'olive_tan', label: 'Mediterranean Olive', hex: '#CCA677', undertone: 'neutral' },
  { id: 'golden_caramel', label: 'Golden Caramel', hex: '#BE895B', undertone: 'warm' },
  { id: 'warm_amber', label: 'Warm Amber', hex: '#A87146', undertone: 'warm' },
  { id: 'cinnamon_sienna', label: 'Cinnamon Sienna', hex: '#8F5A38', undertone: 'neutral' },
  { id: 'chestnut_umber', label: 'Chestnut Umber', hex: '#75462B', undertone: 'cool' },
  { id: 'espresso_rich', label: 'Rich Espresso', hex: '#59331E', undertone: 'warm' },
  { id: 'obsidian_cocoa', label: 'Deep Cocoa', hex: '#3D2214', undertone: 'neutral' },
];

export const CHARACTER_HAIR_COLORS: CharacterPaletteSwatch[] = [
  { id: 'jet_black', label: 'Jet Black', hex: '#181513' },
  { id: 'natural_black', label: 'Natural Black', hex: '#26201C' },
  { id: 'dark_espresso', label: 'Dark Brown', hex: '#3A271C' },
  { id: 'warm_chestnut', label: 'Warm Chestnut', hex: '#593825' },
  { id: 'medium_walnut', label: 'Medium Brown', hex: '#734B32' },
  { id: 'copper_auburn', label: 'Copper Auburn', hex: '#8C4126' },
  { id: 'honey_blonde', label: 'Golden Blonde', hex: '#C69653' },
  { id: 'champagne_blonde', label: 'Champagne Blonde', hex: '#DEC196' },
  { id: 'silver_sage', label: 'Silver Grey', hex: '#9E9B95' },
  { id: 'snow_ivory', label: 'Salt & Snow', hex: '#E5DFD5' },
  { id: 'rose_terracotta', label: 'Rose Copper', hex: '#AD5A54' },
  { id: 'midnight_indigo', label: 'Midnight Teal', hex: '#274754' },
];

export const CHARACTER_OUTFIT_SWATCHES: CharacterPaletteSwatch[] = [
  { id: 'curator_sage', label: 'Curator Sage', hex: '#5A6B5C' },
  { id: 'oxford_navy', label: 'Oxford Navy', hex: '#2B3A4A' },
  { id: 'walnut_brown', label: 'Archival Walnut', hex: '#493629' },
  { id: 'charcoal_slate', label: 'Charcoal Slate', hex: '#36322E' },
  { id: 'warm_linen', label: 'Warm Linen', hex: '#E8DEC8' },
  { id: 'burgundy_merlot', label: 'Royal Maroon', hex: '#6E2B32' },
  { id: 'ochre_gold', label: 'Brushed Amber', hex: '#C89B5E' },
  { id: 'terracotta_rust', label: 'Terracotta Silk', hex: '#A9533B' },
  { id: 'emerald_forest', label: 'Emerald Velvet', hex: '#284E3F' },
  { id: 'peacock_blue', label: 'Peacock Indigo', hex: '#264B63' },
  { id: 'blush_champagne', label: 'Champagne Rose', hex: '#CFA495' },
  { id: 'ivory_cream', label: 'Museum Ivory', hex: '#F3ECE0' },
];

export interface CharacterOutfitPresetMeta {
  id: CharacterOutfitId;
  label: string;
  category: 'Classic & Contemporary' | 'South-Asian & Heritage';
  description: string;
  defaultColors: CharacterOutfitColors;
}

export const CHARACTER_OUTFIT_PRESETS: CharacterOutfitPresetMeta[] = [
  {
    id: 'curator_coat',
    label: 'Curator Coat',
    category: 'Classic & Contemporary',
    description: 'Tailored museum coat with brass lapel pin & leather belt',
    defaultColors: { primary: '#5A6B5C', secondary: '#36322E', accent: '#C89B5E' },
  },
  {
    id: 'casual',
    label: 'Casual Tee & Chinos',
    category: 'Classic & Contemporary',
    description: 'Relaxed crew-neck shirt with cuffed chinos',
    defaultColors: { primary: '#2B3A4A', secondary: '#D9CBB5', accent: '#C89B5E' },
  },
  {
    id: 'smart',
    label: 'Tailored Blazer',
    category: 'Classic & Contemporary',
    description: 'Structured gallery blazer over crisp shirt & tailored trousers',
    defaultColors: { primary: '#493629', secondary: '#2A2724', accent: '#E8DEC8' },
  },
  {
    id: 'school_uniform',
    label: 'Academy Uniform',
    category: 'Classic & Contemporary',
    description: 'Crested blazer, collared shirt, striped tie & tailored bottoms',
    defaultColors: { primary: '#2B3A4A', secondary: '#36322E', accent: '#6E2B32' },
  },
  {
    id: 'hoodie_joggers',
    label: 'Hoodie & Joggers',
    category: 'Classic & Contemporary',
    description: 'Soft sculpted fleece hoodie with tapered joggers',
    defaultColors: { primary: '#A9533B', secondary: '#2E2B28', accent: '#E8DEC8' },
  },
  {
    id: 'dress',
    label: 'Pleated Gallery Dress',
    category: 'Classic & Contemporary',
    description: 'Belted A-line knee-length dress with articulated pleated hem',
    defaultColors: { primary: '#6E2B32', secondary: '#CFA495', accent: '#C89B5E' },
  },
  {
    id: 'kurta_pyjama',
    label: 'Kurta & Pyjama',
    category: 'South-Asian & Heritage',
    description: 'Embroidered mandarin-collar kurta tunic with tapered churidar',
    defaultColors: { primary: '#264B63', secondary: '#F3ECE0', accent: '#C89B5E' },
  },
  {
    id: 'saree',
    label: 'Silk Saree & Pallu',
    category: 'South-Asian & Heritage',
    description: 'Pleated silk saree with zari border & shoulder-draped pallu',
    defaultColors: { primary: '#6E2B32', secondary: '#284E3F', accent: '#C89B5E' },
  },
  {
    id: 'salwar_kameez',
    label: 'Salwar Kameez & Dupatta',
    category: 'South-Asian & Heritage',
    description: 'Long tailored kameez with pleated salwar & draped dupatta',
    defaultColors: { primary: '#284E3F', secondary: '#E8DEC8', accent: '#C89B5E' },
  },
  {
    id: 'sherwani',
    label: 'Royal Sherwani',
    category: 'South-Asian & Heritage',
    description: 'Structured bandhgala coat with brushed-brass buttons & churidar',
    defaultColors: { primary: '#27231F', secondary: '#E8DEC8', accent: '#C89B5E' },
  },
];

export const CHARACTER_HAIR_STYLE_LABELS: {
  id: CharacterHairStyle;
  label: string;
  shortDesc: string;
}[] = [
  { id: 'short_crop', label: 'Short Crop', shortDesc: 'Neatly tapered classic crop' },
  { id: 'side_part', label: 'Side Part', shortDesc: 'Swept architectural side part' },
  { id: 'buzz', label: 'Close Buzz', shortDesc: 'Clean close-cropped fade' },
  { id: 'curly_short', label: 'Curly Crown', shortDesc: 'Textured short curls' },
  { id: 'wavy_medium', label: 'Medium Waves', shortDesc: 'Layered ear-length waves' },
  { id: 'bob', label: 'Sculpted Bob', shortDesc: 'Chin-length tailored bob' },
  { id: 'straight_long', label: 'Long Straight', shortDesc: 'Flowing past-shoulder locks' },
  { id: 'curly_long', label: 'Long Curls', shortDesc: 'Voluminous cascading curls' },
  { id: 'ponytail', label: 'High Ponytail', shortDesc: 'Gathered tie with dynamic tail' },
  { id: 'bun', label: 'Curator Top Bun', shortDesc: 'Crown bun with neat fringe' },
  { id: 'single_braid', label: 'Back Plait Braid', shortDesc: 'Woven braid down the back' },
  { id: 'bald', label: 'Smooth Bald', shortDesc: 'Clean unstyled crown' },
];

export const CHARACTER_FACIAL_HAIR_LABELS: {
  id: CharacterFacialHair;
  label: string;
}[] = [
  { id: 'none', label: 'Clean Shaven' },
  { id: 'stubble', label: 'Light Stubble' },
  { id: 'moustache', label: 'Sculpted Moustache' },
  { id: 'short_beard', label: 'Short Boxed Beard' },
  { id: 'full_beard', label: 'Full Curator Beard' },
];

export const CHARACTER_FOOTWEAR_LABELS: {
  id: CharacterFootwearId;
  label: string;
}[] = [
  { id: 'shoes', label: 'Leather Oxfords' },
  { id: 'sneakers', label: 'Gallery Sneakers' },
  { id: 'sandals', label: 'Heritage Sandals' },
  { id: 'boots', label: 'Chelsea Boots' },
];

// ============================================================================
// 3. DEFAULT CONFIG, VALIDATION & VERSIONED LOCALSTORAGE PERSISTENCE
// ============================================================================

export const DEFAULT_CHARACTER_CONFIG: CharacterStudioConfigV1 = {
  version: 1,
  bodyType: 'neutral',
  skinTone: '#F0CFB1',
  hairStyle: 'short_crop',
  hairColor: '#3A271C',
  facialHair: 'none',
  outfit: 'curator_coat',
  outfitColors: {
    primary: '#5A6B5C',
    secondary: '#36322E',
    accent: '#C89B5E',
  },
  footwear: 'shoes',
  accessories: {
    glasses: 'none',
    headwear: 'curator_cap',
    earrings: 'none',
    watch: false,
    satchel: true,
    scarf: true,
  },
};

const VALID_BODY_TYPES = new Set<CharacterBodyType>([
  'masculine',
  'feminine',
  'neutral',
]);

const VALID_HAIR_STYLES = new Set<CharacterHairStyle>([
  'short_crop',
  'side_part',
  'buzz',
  'curly_short',
  'wavy_medium',
  'straight_long',
  'bob',
  'ponytail',
  'bun',
  'single_braid',
  'curly_long',
  'bald',
]);

const VALID_FACIAL_HAIR = new Set<CharacterFacialHair>([
  'none',
  'stubble',
  'short_beard',
  'full_beard',
  'moustache',
]);

const VALID_OUTFITS = new Set<CharacterOutfitId>([
  'curator_coat',
  'casual',
  'smart',
  'school_uniform',
  'hoodie_joggers',
  'dress',
  'kurta_pyjama',
  'saree',
  'salwar_kameez',
  'sherwani',
]);

const VALID_FOOTWEAR = new Set<CharacterFootwearId>([
  'shoes',
  'sneakers',
  'sandals',
  'boots',
]);

const VALID_GLASSES = new Set<CharacterGlassesId>([
  'none',
  'round_brass',
  'rectangular_walnut',
]);

const VALID_HEADWEAR = new Set<CharacterHeadwearId>([
  'none',
  'curator_cap',
  'headband',
]);

const VALID_EARRINGS = new Set<CharacterEarringsId>([
  'none',
  'gold_studs',
  'champagne_hoops',
]);

function isValidHexColor(val: unknown): val is string {
  return typeof val === 'string' && /^#[0-9A-Fa-f]{6}$/.test(val.trim());
}

/**
 * Validates any raw input object and guarantees a complete, crash-free CharacterStudioConfigV1.
 * Unknown or corrupt fields fall back cleanly to DEFAULT_CHARACTER_CONFIG.
 */
export function sanitizeCharacterConfig(raw: unknown): CharacterStudioConfigV1 {
  if (!raw || typeof raw !== 'object') {
    return structuredCloneConfig(DEFAULT_CHARACTER_CONFIG);
  }
  const obj = raw as Record<string, unknown>;

  const bodyType: CharacterBodyType = VALID_BODY_TYPES.has(
    obj.bodyType as CharacterBodyType,
  )
    ? (obj.bodyType as CharacterBodyType)
    : DEFAULT_CHARACTER_CONFIG.bodyType;

  const skinTone = isValidHexColor(obj.skinTone)
    ? obj.skinTone.trim()
    : DEFAULT_CHARACTER_CONFIG.skinTone;

  const hairStyle: CharacterHairStyle = VALID_HAIR_STYLES.has(
    obj.hairStyle as CharacterHairStyle,
  )
    ? (obj.hairStyle as CharacterHairStyle)
    : DEFAULT_CHARACTER_CONFIG.hairStyle;

  const hairColor = isValidHexColor(obj.hairColor)
    ? obj.hairColor.trim()
    : DEFAULT_CHARACTER_CONFIG.hairColor;

  const facialHair: CharacterFacialHair = VALID_FACIAL_HAIR.has(
    obj.facialHair as CharacterFacialHair,
  )
    ? (obj.facialHair as CharacterFacialHair)
    : DEFAULT_CHARACTER_CONFIG.facialHair;

  const outfit: CharacterOutfitId = VALID_OUTFITS.has(
    obj.outfit as CharacterOutfitId,
  )
    ? (obj.outfit as CharacterOutfitId)
    : DEFAULT_CHARACTER_CONFIG.outfit;

  const presetDefaults =
    CHARACTER_OUTFIT_PRESETS.find((p) => p.id === outfit)?.defaultColors ||
    DEFAULT_CHARACTER_CONFIG.outfitColors;

  const rawColors =
    obj.outfitColors && typeof obj.outfitColors === 'object'
      ? (obj.outfitColors as Record<string, unknown>)
      : {};

  const outfitColors: CharacterOutfitColors = {
    primary: isValidHexColor(rawColors.primary)
      ? rawColors.primary.trim()
      : presetDefaults.primary,
    secondary: isValidHexColor(rawColors.secondary)
      ? rawColors.secondary.trim()
      : presetDefaults.secondary,
    accent: isValidHexColor(rawColors.accent)
      ? rawColors.accent.trim()
      : presetDefaults.accent,
  };

  const footwear: CharacterFootwearId = VALID_FOOTWEAR.has(
    obj.footwear as CharacterFootwearId,
  )
    ? (obj.footwear as CharacterFootwearId)
    : DEFAULT_CHARACTER_CONFIG.footwear;

  const rawAcc =
    obj.accessories && typeof obj.accessories === 'object'
      ? (obj.accessories as Record<string, unknown>)
      : {};

  const accessories: CharacterAccessoriesConfig = {
    glasses: VALID_GLASSES.has(rawAcc.glasses as CharacterGlassesId)
      ? (rawAcc.glasses as CharacterGlassesId)
      : DEFAULT_CHARACTER_CONFIG.accessories.glasses,
    headwear: VALID_HEADWEAR.has(rawAcc.headwear as CharacterHeadwearId)
      ? (rawAcc.headwear as CharacterHeadwearId)
      : DEFAULT_CHARACTER_CONFIG.accessories.headwear,
    earrings: VALID_EARRINGS.has(rawAcc.earrings as CharacterEarringsId)
      ? (rawAcc.earrings as CharacterEarringsId)
      : DEFAULT_CHARACTER_CONFIG.accessories.earrings,
    watch:
      typeof rawAcc.watch === 'boolean'
        ? rawAcc.watch
        : DEFAULT_CHARACTER_CONFIG.accessories.watch,
    satchel:
      typeof rawAcc.satchel === 'boolean'
        ? rawAcc.satchel
        : DEFAULT_CHARACTER_CONFIG.accessories.satchel,
    scarf:
      typeof rawAcc.scarf === 'boolean'
        ? rawAcc.scarf
        : DEFAULT_CHARACTER_CONFIG.accessories.scarf,
  };

  return {
    version: 1,
    bodyType,
    skinTone,
    hairStyle,
    hairColor,
    facialHair,
    outfit,
    outfitColors,
    footwear,
    accessories,
  };
}

export function structuredCloneConfig(
  cfg: CharacterStudioConfigV1,
): CharacterStudioConfigV1 {
  return {
    version: 1,
    bodyType: cfg.bodyType,
    skinTone: cfg.skinTone,
    hairStyle: cfg.hairStyle,
    hairColor: cfg.hairColor,
    facialHair: cfg.facialHair,
    outfit: cfg.outfit,
    outfitColors: { ...cfg.outfitColors },
    footwear: cfg.footwear,
    accessories: { ...cfg.accessories },
  };
}

/**
 * Resolves the active user ID from explicit parameter or localStorage session fallback.
 */
export function resolveActiveCharacterUserId(userId?: string | null): string {
  if (typeof userId === 'string' && userId.trim().length > 0) {
    return userId.trim();
  }
  if (userId === null) {
    return 'guest';
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const rawSession = localStorage.getItem('mymuseum_auth_session_v1');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed?.user?.id && typeof parsed.user.id === 'string') {
          return parsed.user.id.trim() || 'guest';
        }
      }
    }
  } catch {
    // ignore storage read errors
  }
  return 'guest';
}

export function getCharacterStorageKey(userId?: string | null): string {
  const resolvedId = resolveActiveCharacterUserId(userId);
  return `memora_character_v1:${resolvedId}`;
}

export function loadCharacterConfigFromStorage(
  userId?: string | null,
): CharacterStudioConfigV1 {
  try {
    if (typeof localStorage === 'undefined') {
      return structuredCloneConfig(DEFAULT_CHARACTER_CONFIG);
    }
    const key = getCharacterStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return structuredCloneConfig(DEFAULT_CHARACTER_CONFIG);
    }
    const parsed = JSON.parse(raw);
    return sanitizeCharacterConfig(parsed);
  } catch {
    return structuredCloneConfig(DEFAULT_CHARACTER_CONFIG);
  }
}

export function saveCharacterConfigToStorage(
  config: CharacterStudioConfigV1,
  userId?: string | null,
): CharacterStudioConfigV1 {
  const sanitized = sanitizeCharacterConfig(config);
  try {
    if (typeof localStorage !== 'undefined') {
      const key = getCharacterStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(sanitized));
    }
  } catch {
    // ignore quota or privacy mode errors
  }
  return sanitized;
}

export function createRandomCharacterConfig(): CharacterStudioConfigV1 {
  const pick = <T,>(arr: readonly T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];

  const bodyTypes: CharacterBodyType[] = ['masculine', 'feminine', 'neutral'];
  const bodyType = pick(bodyTypes);
  const skinTone = pick(CHARACTER_SKIN_TONES).hex;
  const hairStyle = pick(CHARACTER_HAIR_STYLE_LABELS).id;
  const hairColor = pick(CHARACTER_HAIR_COLORS).hex;

  const facialHairOptions: CharacterFacialHair[] =
    bodyType === 'feminine'
      ? ['none', 'none', 'none', 'stubble']
      : ['none', 'none', 'stubble', 'moustache', 'short_beard', 'full_beard'];
  const facialHair = pick(facialHairOptions);

  const outfitPreset = pick(CHARACTER_OUTFIT_PRESETS);
  const useCustomPalette = Math.random() > 0.45;
  const outfitColors: CharacterOutfitColors = useCustomPalette
    ? {
        primary: pick(CHARACTER_OUTFIT_SWATCHES).hex,
        secondary: pick(CHARACTER_OUTFIT_SWATCHES).hex,
        accent: pick(CHARACTER_OUTFIT_SWATCHES).hex,
      }
    : { ...outfitPreset.defaultColors };

  const footwear = pick(CHARACTER_FOOTWEAR_LABELS).id;
  const glassesList: CharacterGlassesId[] = [
    'none',
    'none',
    'round_brass',
    'rectangular_walnut',
  ];
  const headwearList: CharacterHeadwearId[] = [
    'none',
    'none',
    'curator_cap',
    'headband',
  ];
  const earringsList: CharacterEarringsId[] = [
    'none',
    'none',
    'gold_studs',
    'champagne_hoops',
  ];

  return {
    version: 1,
    bodyType,
    skinTone,
    hairStyle,
    hairColor,
    facialHair,
    outfit: outfitPreset.id,
    outfitColors,
    footwear,
    accessories: {
      glasses: pick(glassesList),
      headwear: pick(headwearList),
      earrings: pick(earringsList),
      watch: Math.random() > 0.45,
      satchel: Math.random() > 0.4,
      scarf: Math.random() > 0.5,
    },
  };
}

// ============================================================================
// 4. BODY PRESET PROPORTIONS (C-b)
// ============================================================================

export interface BodyProportionProfile {
  heightScale: number;
  shoulderHalfSpan: number;
  chestTopRadius: number;
  waistRadius: number;
  hipRadius: number;
  hipLegOffset: number;
  limbRadiusScale: number;
  neckRadius: number;
  handScale: number;
  headScale: number;
}

export const BODY_PROPORTION_PROFILES: Record<
  CharacterBodyType,
  BodyProportionProfile
> = {
  masculine: {
    heightScale: 1.03,
    shoulderHalfSpan: 0.275,
    chestTopRadius: 0.248,
    waistRadius: 0.205,
    hipRadius: 0.215,
    hipLegOffset: 0.105,
    limbRadiusScale: 1.08,
    neckRadius: 0.082,
    handScale: 1.06,
    headScale: 1.0,
  },
  feminine: {
    heightScale: 0.97,
    shoulderHalfSpan: 0.228,
    chestTopRadius: 0.212,
    waistRadius: 0.172,
    hipRadius: 0.238,
    hipLegOffset: 0.095,
    limbRadiusScale: 0.91,
    neckRadius: 0.068,
    handScale: 0.93,
    headScale: 0.98,
  },
  neutral: {
    heightScale: 1.0,
    shoulderHalfSpan: 0.25,
    chestTopRadius: 0.228,
    waistRadius: 0.19,
    hipRadius: 0.224,
    hipLegOffset: 0.1,
    limbRadiusScale: 1.0,
    neckRadius: 0.075,
    handScale: 1.0,
    headScale: 1.0,
  },
};

// ============================================================================
// 5. CHARACTER BUILDER FACTORY & ARTICULATION HANDLE (C-a, C-c, C-d)
// ============================================================================

export interface BuiltExplorerCharacter {
  charBodyGroup: THREE.Group;
  headMesh: THREE.Mesh;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  getConfig: () => CharacterStudioConfigV1;
  rebuild: (nextConfig: CharacterStudioConfigV1) => void;
  applyPose: (
    pose: TechBuddyPose,
    elapsedSec: number,
    walkPhase?: number,
    moveFactor?: number,
  ) => void;
  getMetrics: () => {
    drawCalls: number;
    triangles: number;
    bodyType: CharacterBodyType;
    outfit: CharacterOutfitId;
  };
  dispose: () => void;
}

export interface BuildExplorerCharacterOptions {
  config?: CharacterStudioConfigV1;
  qualityConfig?: VisualQualityConfig;
  sharedMaps?: SharedMuseumMaterialMaps | null;
}

/**
 * Builds the articulated MEMORA 3D Explorer Character with full support for
 * Masculine / Feminine / Neutral body proportions, 12 hairstyles, 5 facial-hair styles,
 * 12 skin tones, 10 outfits (with articulated lower-garment hem panels that move with legs),
 * 4 footwear styles, accessories, live in-place rebuild(), and pose evaluation.
 */
export function buildExplorerCharacter(
  options: BuildExplorerCharacterOptions = {},
): BuiltExplorerCharacter {
  const quality =
    options.qualityConfig || getVisualQualityConfig('desktop', false);
  const isMobile = quality.tier === 'mobile';
  const radialSegs = isMobile ? 10 : 16;
  const sphereSegs = isMobile ? 12 : 18;
  const sharedMaps = options.sharedMaps || null;

  let currentConfig = sanitizeCharacterConfig(
    options.config || DEFAULT_CHARACTER_CONFIG,
  );

  const charBodyGroup = new THREE.Group();
  charBodyGroup.name = 'ExplorerCharacterBodyGroup';

  // Persistent pivot references so AtriumScene3D animation loop never loses object references on live rebuild()
  const headGeometry = new THREE.SphereGeometry(0.22, sphereSegs, sphereSegs);
  const headMaterial = new THREE.MeshStandardMaterial({
    color: currentConfig.skinTone,
    roughness: 0.56,
    metalness: 0.02,
  });
  const headMesh = new THREE.Mesh(headGeometry, headMaterial);
  headMesh.name = 'ExplorerHeadMesh';
  headMesh.position.set(0, 1.38, 0);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;

  const leftLeg = new THREE.Group();
  leftLeg.name = 'ExplorerLeftLegPivot';
  leftLeg.position.set(-0.1, 0.27, 0);

  const rightLeg = new THREE.Group();
  rightLeg.name = 'ExplorerRightLegPivot';
  rightLeg.position.set(0.1, 0.27, 0);

  const leftArm = new THREE.Group();
  leftArm.name = 'ExplorerLeftArmPivot';
  leftArm.position.set(-0.25, 0.92, 0);

  const rightArm = new THREE.Group();
  rightArm.name = 'ExplorerRightArmPivot';
  rightArm.position.set(0.25, 0.92, 0);

  const torsoRigGroup = new THREE.Group();
  torsoRigGroup.name = 'ExplorerTorsoRigGroup';

  charBodyGroup.add(torsoRigGroup, headMesh, leftLeg, rightLeg, leftArm, rightArm);

  let ownedGeometries: THREE.BufferGeometry[] = [];
  let ownedMaterials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    ownedGeometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    ownedMaterials.push(m);
    return m;
  };

  const clearSubtree = (parent: THREE.Object3D) => {
    while (parent.children.length > 0) {
      parent.remove(parent.children[0]);
    }
  };

  const disposeOwnedSubtreeAssets = () => {
    clearSubtree(torsoRigGroup);
    clearSubtree(headMesh);
    clearSubtree(leftLeg);
    clearSubtree(rightLeg);
    clearSubtree(leftArm);
    clearSubtree(rightArm);

    for (const g of ownedGeometries) {
      g.dispose();
    }
    ownedGeometries = [];

    for (const m of ownedMaterials) {
      m.dispose();
    }
    ownedMaterials = [];
  };

  const populateCharacterMeshes = (cfg: CharacterStudioConfigV1) => {
    disposeOwnedSubtreeAssets();
    currentConfig = sanitizeCharacterConfig(cfg);

    const profile = BODY_PROPORTION_PROFILES[currentConfig.bodyType];
    charBodyGroup.scale.set(1, profile.heightScale, 1);

    // Update persistent pivot coordinates according to body preset
    headMesh.position.set(0, 1.38, 0);
    headMesh.scale.setScalar(profile.headScale);
    headMaterial.color.set(currentConfig.skinTone);
    headMaterial.needsUpdate = true;

    leftLeg.position.set(-profile.hipLegOffset, 0.27, 0);
    rightLeg.position.set(profile.hipLegOffset, 0.27, 0);
    leftArm.position.set(-profile.shoulderHalfSpan, 0.92, 0);
    rightArm.position.set(profile.shoulderHalfSpan, 0.92, 0);

    // Core Materials
    const skinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: currentConfig.skinTone,
        roughness: 0.56,
        metalness: 0.02,
      }),
    );

    const primaryFabricMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: currentConfig.outfitColors.primary,
        normalMap: sharedMaps?.fabricNormalMap || null,
        normalScale: new THREE.Vector2(0.12, 0.12),
        roughnessMap: sharedMaps?.fabricRoughnessMap || null,
        roughness: 0.78,
        metalness: 0.04,
      }),
    );

    const secondaryFabricMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: currentConfig.outfitColors.secondary,
        normalMap: sharedMaps?.fabricNormalMap || null,
        normalScale: new THREE.Vector2(0.1, 0.1),
        roughnessMap: sharedMaps?.fabricRoughnessMap || null,
        roughness: 0.76,
        metalness: 0.04,
      }),
    );

    const accentMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: currentConfig.outfitColors.accent,
        roughness: 0.45,
        metalness: 0.35,
      }),
    );

    const shirtInnerMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#F3ECE0',
        roughness: 0.72,
        metalness: 0.02,
      }),
    );

    const hairMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: currentConfig.hairColor,
        roughness: 0.68,
        metalness: 0.06,
      }),
    );

    const leatherMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#5C3A24',
        roughness: 0.46,
        metalness: 0.14,
      }),
    );

    const darkLeatherMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#2A231E',
        roughness: 0.44,
        metalness: 0.12,
      }),
    );

    const brassMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#C89B5E',
        roughness: 0.28,
        metalness: 0.78,
      }),
    );

    // ========================================================================
    // A. NECK & TORSO + UPPER OUTFIT SILHOUETTE
    // ========================================================================
    const neckMesh = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          profile.neckRadius * 0.92,
          profile.neckRadius,
          0.16,
          radialSegs,
        ),
      ),
      skinMat,
    );
    neckMesh.position.set(0, 1.18, 0);
    neckMesh.castShadow = true;
    torsoRigGroup.add(neckMesh);

    // Upper chest & waist sculpted core
    const chestMesh = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          profile.chestTopRadius,
          profile.waistRadius,
          0.36,
          radialSegs,
        ),
      ),
      primaryFabricMat,
    );
    chestMesh.position.set(0, 0.96, 0);
    chestMesh.scale.set(1.06, 1, 0.78);
    chestMesh.castShadow = true;
    chestMesh.receiveShadow = true;
    torsoRigGroup.add(chestMesh);

    const lowerTorsoMat =
      currentConfig.outfit === 'casual' ||
      currentConfig.outfit === 'smart' ||
      currentConfig.outfit === 'school_uniform' ||
      currentConfig.outfit === 'hoodie_joggers'
        ? secondaryFabricMat
        : primaryFabricMat;

    const pelvisMesh = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          profile.waistRadius,
          profile.hipRadius,
          0.28,
          radialSegs,
        ),
      ),
      lowerTorsoMat,
    );
    pelvisMesh.position.set(0, 0.66, 0);
    pelvisMesh.scale.set(1.04, 1, 0.78);
    pelvisMesh.castShadow = true;
    pelvisMesh.receiveShadow = true;
    torsoRigGroup.add(pelvisMesh);

    // Rounded shoulder bridge yoke
    const yokeMesh = new THREE.Mesh(
      trackGeo(
        new THREE.BoxGeometry(
          profile.shoulderHalfSpan * 2.04,
          0.09,
          profile.chestTopRadius * 1.42,
        ),
      ),
      primaryFabricMat,
    );
    yokeMesh.position.set(0, 1.11, 0);
    yokeMesh.castShadow = true;
    torsoRigGroup.add(yokeMesh);

    // Outfit-specific torso & collar details
    const outfit = currentConfig.outfit;

    if (
      outfit === 'curator_coat' ||
      outfit === 'smart' ||
      outfit === 'school_uniform'
    ) {
      // Inner shirt V-neck wedge on front (+Z)
      const shirtFront = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.14, 0.24, 0.04)),
        shirtInnerMat,
      );
      shirtFront.position.set(
        0,
        1.01,
        profile.chestTopRadius * 0.76,
      );
      torsoRigGroup.add(shirtFront);

      // Left & right tailored lapels
      [-1, 1].forEach((side) => {
        const lapel = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.055, 0.28, 0.035)),
          outfit === 'curator_coat' ? secondaryFabricMat : primaryFabricMat,
        );
        lapel.position.set(
          side * 0.075,
          0.99,
          profile.chestTopRadius * 0.78,
        );
        lapel.rotation.z = side * 0.16;
        torsoRigGroup.add(lapel);
      });

      if (outfit === 'school_uniform') {
        // Academy necktie
        const tieMesh = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.045, 0.24, 0.025)),
          accentMat,
        );
        tieMesh.position.set(0, 0.96, profile.chestTopRadius * 0.8);
        torsoRigGroup.add(tieMesh);
      }

      if (outfit === 'curator_coat') {
        // Upper waist flare of curator coat + leather belt + brass buckle + badge
        const upperFlare = new THREE.Mesh(
          trackGeo(
            new THREE.CylinderGeometry(
              profile.waistRadius * 1.02,
              profile.hipRadius * 1.08,
              0.2,
              radialSegs,
            ),
          ),
          primaryFabricMat,
        );
        upperFlare.position.set(0, 0.67, 0);
        upperFlare.scale.set(1.05, 1, 0.8);
        torsoRigGroup.add(upperFlare);

        const belt = new THREE.Mesh(
          trackGeo(
            new THREE.CylinderGeometry(
              profile.waistRadius * 1.06,
              profile.waistRadius * 1.06,
              0.05,
              radialSegs,
            ),
          ),
          leatherMat,
        );
        belt.position.set(0, 0.76, 0);
        belt.scale.set(1.05, 1, 0.81);
        torsoRigGroup.add(belt);

        const buckle = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.065, 0.055, 0.03)),
          brassMat,
        );
        buckle.position.set(0, 0.76, profile.waistRadius * 0.84);
        torsoRigGroup.add(buckle);

        const badge = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.014, 12)),
          brassMat,
        );
        badge.rotation.x = Math.PI / 2;
        badge.position.set(0.1, 1.02, profile.chestTopRadius * 0.8);
        torsoRigGroup.add(badge);
      }
    } else if (outfit === 'hoodie_joggers') {
      // Sculpted hood resting behind collar (-Z) + front kangaroo pocket (+Z)
      const hoodRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.13, 0.045, 8, radialSegs)),
        primaryFabricMat,
      );
      hoodRing.rotation.x = Math.PI / 2 - 0.28;
      hoodRing.position.set(0, 1.15, -0.04);
      torsoRigGroup.add(hoodRing);

      const pocket = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.22, 0.12, 0.035)),
        primaryFabricMat,
      );
      pocket.position.set(0, 0.81, profile.waistRadius * 0.8);
      torsoRigGroup.add(pocket);
    } else if (outfit === 'dress') {
      // Belted waist ribbon + upper A-line hip flare
      const waistRibbon = new THREE.Mesh(
        trackGeo(
          new THREE.CylinderGeometry(
            profile.waistRadius * 1.04,
            profile.waistRadius * 1.04,
            0.055,
            radialSegs,
          ),
        ),
        accentMat,
      );
      waistRibbon.position.set(0, 0.78, 0);
      waistRibbon.scale.set(1.05, 1, 0.8);
      torsoRigGroup.add(waistRibbon);

      const upperSkirt = new THREE.Mesh(
        trackGeo(
          new THREE.CylinderGeometry(
            profile.waistRadius * 1.03,
            profile.hipRadius * 1.16,
            0.24,
            radialSegs,
          ),
        ),
        primaryFabricMat,
      );
      upperSkirt.position.set(0, 0.64, 0);
      upperSkirt.scale.set(1.06, 1, 0.84);
      torsoRigGroup.add(upperSkirt);
    } else if (
      outfit === 'kurta_pyjama' ||
      outfit === 'salwar_kameez' ||
      outfit === 'sherwani'
    ) {
      // Mandarin / bandhgala standing collar + embroidered placket (+Z)
      const collar = new THREE.Mesh(
        trackGeo(
          new THREE.CylinderGeometry(
            profile.neckRadius * 1.22,
            profile.neckRadius * 1.28,
            0.065,
            radialSegs,
          ),
        ),
        outfit === 'sherwani' ? accentMat : primaryFabricMat,
      );
      collar.position.set(0, 1.15, 0);
      torsoRigGroup.add(collar);

      const placket = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.055, 0.34, 0.03)),
        accentMat,
      );
      placket.position.set(0, 0.96, profile.chestTopRadius * 0.79);
      torsoRigGroup.add(placket);

      if (outfit === 'sherwani') {
        for (let b = 0; b < 4; b++) {
          const btn = new THREE.Mesh(
            trackGeo(new THREE.SphereGeometry(0.014, 8, 8)),
            brassMat,
          );
          btn.position.set(
            0,
            1.08 - b * 0.075,
            profile.chestTopRadius * 0.83,
          );
          torsoRigGroup.add(btn);
        }
      }

      if (outfit === 'salwar_kameez') {
        // Draped dupatta across front chest (+Z) and over both shoulders
        const dupattaChest = new THREE.Mesh(
          trackGeo(
            new THREE.TorusGeometry(
              profile.chestTopRadius * 0.92,
              0.038,
              8,
              radialSegs,
              Math.PI,
            ),
          ),
          accentMat,
        );
        dupattaChest.rotation.z = Math.PI;
        dupattaChest.position.set(0, 1.05, profile.chestTopRadius * 0.45);
        torsoRigGroup.add(dupattaChest);
      }
    } else if (outfit === 'saree') {
      // Fitted choli blouse + diagonal silk pallu drape across torso to left shoulder + zari waist border
      const palluDrape = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.24, 0.52, 0.19)),
        secondaryFabricMat,
      );
      palluDrape.position.set(-0.04, 0.92, 0);
      palluDrape.rotation.z = -0.38;
      palluDrape.scale.set(1, 1, 1.02);
      torsoRigGroup.add(palluDrape);

      const palluGoldBorder = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.04, 0.54, 0.205)),
        accentMat,
      );
      palluGoldBorder.position.set(0.06, 0.92, 0);
      palluGoldBorder.rotation.z = -0.38;
      torsoRigGroup.add(palluGoldBorder);

      const sareeUpperSkirt = new THREE.Mesh(
        trackGeo(
          new THREE.CylinderGeometry(
            profile.waistRadius * 1.03,
            profile.hipRadius * 1.12,
            0.24,
            radialSegs,
          ),
        ),
        primaryFabricMat,
      );
      sareeUpperSkirt.position.set(0, 0.64, 0);
      sareeUpperSkirt.scale.set(1.05, 1, 0.82);
      torsoRigGroup.add(sareeUpperSkirt);
    }

    // Optional Neck Scarf Accessory
    if (currentConfig.accessories.scarf) {
      const scarfRing = new THREE.Mesh(
        trackGeo(
          new THREE.TorusGeometry(
            profile.neckRadius * 1.55,
            0.038,
            8,
            radialSegs,
          ),
        ),
        accentMat,
      );
      scarfRing.rotation.x = Math.PI / 2;
      scarfRing.position.set(0, 1.14, 0);
      torsoRigGroup.add(scarfRing);
    }

    // Optional Curator Cross-Body Satchel Accessory
    if (currentConfig.accessories.satchel) {
      const strap = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.048, 0.56, 0.36)),
        leatherMat,
      );
      strap.position.set(0, 0.91, 0);
      strap.rotation.z = 0.46;
      torsoRigGroup.add(strap);

      const bag = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.09, 0.21, 0.22)),
        leatherMat,
      );
      bag.position.set(-profile.hipRadius - 0.03, 0.64, -0.02);
      bag.castShadow = true;
      torsoRigGroup.add(bag);
    }

    // ========================================================================
    // B. ARMS, SHOULDERS, HANDS & OPTIONAL WRIST WATCH
    // ========================================================================
    const buildArmSubtree = (armGroup: THREE.Group, isLeft: boolean) => {
      const armRadius = 0.068 * profile.limbRadiusScale;
      const isShortSleeve =
        outfit === 'casual' || outfit === 'dress' || outfit === 'saree';

      // Rounded shoulder cap at joint origin (y = +0.18 relative to arm pivot y = 0.92 -> y = 1.10 world)
      const shoulderCap = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(armRadius * 1.18, 10, 10)),
        primaryFabricMat,
      );
      shoulderCap.position.set(0, 0.17, 0);
      shoulderCap.castShadow = true;
      armGroup.add(shoulderCap);

      if (isShortSleeve) {
        // Upper short sleeve + lower bare forearm
        const shortSleeve = new THREE.Mesh(
          trackGeo(
            new THREE.CylinderGeometry(
              armRadius * 1.12,
              armRadius * 1.05,
              0.18,
              radialSegs,
            ),
          ),
          primaryFabricMat,
        );
        shortSleeve.position.set(0, 0.09, 0);
        shortSleeve.castShadow = true;
        armGroup.add(shortSleeve);

        const forearm = new THREE.Mesh(
          trackGeo(
            new THREE.CylinderGeometry(
              armRadius * 0.94,
              armRadius * 0.82,
              0.24,
              radialSegs,
            ),
          ),
          skinMat,
        );
        forearm.position.set(0, -0.09, 0);
        forearm.castShadow = true;
        armGroup.add(forearm);
      } else {
        // Full tailored sleeve
        const sleeve = new THREE.Mesh(
          trackGeo(
            new THREE.CylinderGeometry(
              armRadius * 1.08,
              armRadius * 0.92,
              0.38,
              radialSegs,
            ),
          ),
          primaryFabricMat,
        );
        sleeve.position.set(0, -0.01, 0);
        sleeve.castShadow = true;
        armGroup.add(sleeve);

        const cuff = new THREE.Mesh(
          trackGeo(
            new THREE.CylinderGeometry(
              armRadius * 0.96,
              armRadius * 0.96,
              0.04,
              radialSegs,
            ),
          ),
          outfit === 'curator_coat' || outfit === 'sherwani'
            ? accentMat
            : secondaryFabricMat,
        );
        cuff.position.set(0, -0.19, 0);
        armGroup.add(cuff);
      }

      // Optional Wrist Watch on Left Arm
      if (isLeft && currentConfig.accessories.watch) {
        const watchBand = new THREE.Mesh(
          trackGeo(
            new THREE.CylinderGeometry(
              armRadius * 0.95,
              armRadius * 0.95,
              0.032,
              12,
            ),
          ),
          leatherMat,
        );
        watchBand.position.set(0, -0.185, 0);
        armGroup.add(watchBand);

        const watchDial = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 12)),
          brassMat,
        );
        watchDial.rotation.z = Math.PI / 2;
        watchDial.position.set(-armRadius * 0.95, -0.185, 0);
        armGroup.add(watchDial);
      }

      // Sculpted Hand + Thumb
      const handRadius = 0.056 * profile.handScale;
      const palm = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(handRadius, 10, 10)),
        skinMat,
      );
      palm.scale.set(0.85, 1.18, 0.95);
      palm.position.set(0, -0.24, 0);
      palm.castShadow = true;
      armGroup.add(palm);

      const thumb = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(handRadius * 0.42, 8, 8)),
        skinMat,
      );
      thumb.position.set(
        isLeft ? handRadius * 0.65 : -handRadius * 0.65,
        -0.23,
        handRadius * 0.55,
      );
      armGroup.add(thumb);
    };

    buildArmSubtree(leftArm, true);
    buildArmSubtree(rightArm, false);

    // ========================================================================
    // C. LEGS, ARTICULATED LOWER-GARMENT PANELS & FOOTWEAR (Zero Clipping!)
    // ========================================================================
    const buildLegSubtree = (legGroup: THREE.Group, isLeft: boolean) => {
      const legRadius = 0.084 * profile.limbRadiusScale;
      const sideSign = isLeft ? -1 : 1;

      const isBareLowerLeg = outfit === 'dress';
      const legMat = isBareLowerLeg ? skinMat : secondaryFabricMat;

      // Upper & lower leg shaft
      const legShaft = new THREE.Mesh(
        trackGeo(
          new THREE.CylinderGeometry(
            legRadius * (outfit === 'salwar_kameez' ? 1.22 : 1.05),
            legRadius * 0.88,
            0.38,
            radialSegs,
          ),
        ),
        legMat,
      );
      legShaft.position.set(0, 0.01, 0);
      legShaft.castShadow = true;
      legGroup.add(legShaft);

      // Articulated Lower-Garment Panel attached to each leg so walking/running/sitting/cycling never clips!
      if (
        outfit === 'curator_coat' ||
        outfit === 'dress' ||
        outfit === 'kurta_pyjama' ||
        outfit === 'salwar_kameez' ||
        outfit === 'sherwani' ||
        outfit === 'saree'
      ) {
        const panelHeight =
          outfit === 'saree'
            ? 0.34
            : outfit === 'dress'
              ? 0.25
              : outfit === 'sherwani' || outfit === 'kurta_pyjama'
                ? 0.24
                : 0.21;

        const panelTopR = legRadius * 1.25;
        const panelBotR =
          outfit === 'dress' || outfit === 'saree'
            ? legRadius * 1.55
            : legRadius * 1.32;

        const hemPanel = new THREE.Mesh(
          trackGeo(
            new THREE.CylinderGeometry(
              panelTopR,
              panelBotR,
              panelHeight,
              radialSegs,
            ),
          ),
          primaryFabricMat,
        );
        hemPanel.position.set(
          sideSign * -0.012,
          0.27 - panelHeight * 0.45,
          0,
        );
        hemPanel.scale.set(1.12, 1, 1.18);
        hemPanel.castShadow = true;
        legGroup.add(hemPanel);

        // Gold zari border or hem trim on saree / dress / sherwani / kurta
        if (
          outfit === 'saree' ||
          outfit === 'dress' ||
          outfit === 'sherwani' ||
          outfit === 'kurta_pyjama'
        ) {
          const hemBorder = new THREE.Mesh(
            trackGeo(
              new THREE.CylinderGeometry(
                panelBotR * 1.01,
                panelBotR * 1.02,
                0.032,
                radialSegs,
              ),
            ),
            accentMat,
          );
          hemBorder.position.set(
            sideSign * -0.012,
            0.27 - panelHeight * 0.9,
            0,
          );
          hemBorder.scale.set(1.12, 1, 1.18);
          legGroup.add(hemBorder);
        }
      }

      // Footwear at bottom of leg (y = -0.19, forward = +Z)
      const fw = currentConfig.footwear;
      if (fw === 'sneakers') {
        const sneakerUpper = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.135, 0.085, 0.26)),
          primaryFabricMat,
        );
        sneakerUpper.position.set(0, -0.185, 0.045);
        sneakerUpper.castShadow = true;
        legGroup.add(sneakerUpper);

        const whiteSole = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.142, 0.032, 0.272)),
          shirtInnerMat,
        );
        whiteSole.position.set(0, -0.228, 0.045);
        legGroup.add(whiteSole);
      } else if (fw === 'sandals') {
        const footBase = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.125, 0.06, 0.24)),
          skinMat,
        );
        footBase.position.set(0, -0.19, 0.045);
        legGroup.add(footBase);

        const sandalSole = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.132, 0.026, 0.255)),
          leatherMat,
        );
        sandalSole.position.set(0, -0.225, 0.045);
        legGroup.add(sandalSole);

        const strapFront = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.134, 0.025, 0.045)),
          brassMat,
        );
        strapFront.position.set(0, -0.175, 0.1);
        legGroup.add(strapFront);
      } else if (fw === 'boots') {
        const bootShaft = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.078, 0.074, 0.14, 12)),
          darkLeatherMat,
        );
        bootShaft.position.set(0, -0.13, 0.01);
        legGroup.add(bootShaft);

        const bootFoot = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.136, 0.095, 0.265)),
          darkLeatherMat,
        );
        bootFoot.position.set(0, -0.19, 0.045);
        bootFoot.castShadow = true;
        legGroup.add(bootFoot);
      } else {
        // Classic Leather Oxfords ('shoes')
        const shoeBody = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.13, 0.09, 0.255)),
          darkLeatherMat,
        );
        shoeBody.position.set(0, -0.19, 0.045);
        shoeBody.castShadow = true;
        legGroup.add(shoeBody);

        const shoeWelt = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.136, 0.024, 0.264)),
          leatherMat,
        );
        shoeWelt.position.set(0, -0.228, 0.045);
        legGroup.add(shoeWelt);
      }
    };

    buildLegSubtree(leftLeg, true);
    buildLegSubtree(rightLeg, false);

    // ========================================================================
    // D. STYLISED FACE, HAIR, FACIAL HAIR & HEAD ACCESSORIES (All on headMesh!)
    // ========================================================================
    const scleraMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FAF6F0',
        roughness: 0.25,
        metalness: 0.0,
      }),
    );
    const pupilMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#1E1814',
        roughness: 0.18,
        metalness: 0.1,
      }),
    );
    const lipMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#B86B5E',
        roughness: 0.48,
        metalness: 0.02,
      }),
    );

    // 1. Eyes, Pupils & Eyebrows on +Z forward face
    [-1, 1].forEach((side) => {
      const eyeX = side * 0.072;
      const sclera = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.028, 10, 10)),
        scleraMat,
      );
      sclera.scale.set(1.1, 0.95, 0.55);
      sclera.position.set(eyeX, 0.024, 0.198);
      headMesh.add(sclera);

      const pupil = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.017, 10, 10)),
        pupilMat,
      );
      pupil.scale.set(1.0, 1.0, 0.55);
      pupil.position.set(eyeX, 0.024, 0.211);
      headMesh.add(pupil);

      const brow = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.058, 0.015, 0.018)),
        hairMat,
      );
      brow.position.set(eyeX, 0.068, 0.204);
      brow.rotation.z = side * -0.08;
      headMesh.add(brow);

      // Sculpted Ear
      const ear = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.042, 8, 8)),
        skinMat,
      );
      ear.scale.set(0.45, 1.15, 0.72);
      ear.position.set(side * 0.214, 0.0, 0.01);
      headMesh.add(ear);
    });

    // 2. Sculpted Nose Bridge & Warm Smile (+Z forward)
    const nose = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.026, 0.065, 8)),
      skinMat,
    );
    nose.rotation.x = Math.PI / 2 - 0.35;
    nose.position.set(0, -0.008, 0.224);
    headMesh.add(nose);

    const smile = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.036, 0.0085, 6, 12, Math.PI * 0.85)),
      lipMat,
    );
    smile.rotation.z = Math.PI + 0.22;
    smile.position.set(0, -0.056, 0.206);
    headMesh.add(smile);

    // 3. Hair Styles (12 options)
    const hs = currentConfig.hairStyle;
    if (hs !== 'bald') {
      // Base cranial cap shared by non-bald styles
      const crownCap = new THREE.Mesh(
        trackGeo(
          new THREE.SphereGeometry(
            hs === 'buzz' ? 0.224 : 0.232,
            sphereSegs,
            sphereSegs,
          ),
        ),
        hairMat,
      );
      crownCap.position.set(0, 0.032, -0.025);
      crownCap.scale.set(1.02, 0.96, 1.03);
      headMesh.add(crownCap);

      if (hs === 'short_crop' || hs === 'side_part') {
        const fringe = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.28, 0.075, 0.14)),
          hairMat,
        );
        fringe.position.set(
          hs === 'side_part' ? 0.035 : 0,
          0.165,
          0.135,
        );
        fringe.rotation.z = hs === 'side_part' ? -0.14 : 0;
        headMesh.add(fringe);
      } else if (hs === 'curly_short' || hs === 'curly_long') {
        const puffPositions: [number, number, number, number][] = [
          [0, 0.19, 0.1, 0.085],
          [-0.12, 0.16, 0.06, 0.08],
          [0.12, 0.16, 0.06, 0.08],
          [-0.16, 0.08, -0.04, 0.082],
          [0.16, 0.08, -0.04, 0.082],
          [0, 0.15, -0.12, 0.09],
        ];
        if (hs === 'curly_long') {
          puffPositions.push(
            [-0.17, -0.1, -0.08, 0.085],
            [0.17, -0.1, -0.08, 0.085],
            [0, -0.14, -0.15, 0.1],
            [-0.12, -0.24, -0.1, 0.08],
            [0.12, -0.24, -0.1, 0.08],
          );
        }
        for (const [px, py, pz, pr] of puffPositions) {
          const puff = new THREE.Mesh(
            trackGeo(new THREE.SphereGeometry(pr, 8, 8)),
            hairMat,
          );
          puff.position.set(px, py, pz);
          headMesh.add(puff);
        }
      } else if (hs === 'wavy_medium' || hs === 'bob') {
        [-1, 1].forEach((side) => {
          const sideLock = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(0.055, 0.068, 0.24, 10)),
            hairMat,
          );
          sideLock.position.set(side * 0.185, -0.04, -0.02);
          sideLock.rotation.z = side * -0.12;
          headMesh.add(sideLock);
        });
        const backBob = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.36, 0.24, 0.12)),
          hairMat,
        );
        backBob.position.set(0, -0.04, -0.16);
        headMesh.add(backBob);
      } else if (hs === 'straight_long') {
        const backCurtain = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.38, 0.44, 0.11)),
          hairMat,
        );
        backCurtain.position.set(0, -0.14, -0.17);
        headMesh.add(backCurtain);

        [-1, 1].forEach((side) => {
          const frontStrand = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(0.045, 0.038, 0.34, 8)),
            hairMat,
          );
          frontStrand.position.set(side * 0.175, -0.11, 0.05);
          headMesh.add(frontStrand);
        });
      } else if (hs === 'ponytail') {
        const tieBand = new THREE.Mesh(
          trackGeo(new THREE.TorusGeometry(0.042, 0.015, 6, 10)),
          accentMat,
        );
        tieBand.position.set(0, 0.06, -0.22);
        headMesh.add(tieBand);

        const tail = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.075, 0.32, 10)),
          hairMat,
        );
        tail.rotation.x = -2.65;
        tail.position.set(0, -0.06, -0.29);
        headMesh.add(tail);
      } else if (hs === 'bun') {
        const topBun = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.095, 10, 10)),
          hairMat,
        );
        topBun.position.set(0, 0.24, -0.08);
        headMesh.add(topBun);
      } else if (hs === 'single_braid') {
        for (let b = 0; b < 4; b++) {
          const knot = new THREE.Mesh(
            trackGeo(new THREE.SphereGeometry(0.052 - b * 0.006, 8, 8)),
            hairMat,
          );
          knot.position.set(0, -0.04 - b * 0.075, -0.22 - b * 0.012);
          headMesh.add(knot);
        }
      }
    }

    // 4. Facial Hair Styles (5 options)
    const fh = currentConfig.facialHair;
    if (fh === 'moustache' || fh === 'short_beard' || fh === 'full_beard') {
      const stache = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.11, 0.026, 0.032)),
        hairMat,
      );
      stache.position.set(0, -0.046, 0.212);
      headMesh.add(stache);
    }
    if (fh === 'stubble' || fh === 'short_beard' || fh === 'full_beard') {
      const jawScaleY = fh === 'full_beard' ? 0.95 : 0.72;
      const jawBeard = new THREE.Mesh(
        trackGeo(
          new THREE.SphereGeometry(
            fh === 'stubble' ? 0.222 : 0.23,
            sphereSegs,
            sphereSegs,
          ),
        ),
        hairMat,
      );
      jawBeard.position.set(0, -0.055, 0.018);
      jawBeard.scale.set(0.96, jawScaleY, 0.98);
      headMesh.add(jawBeard);
    }

    // 5. Glasses ('round_brass' | 'rectangular_walnut')
    const gl = currentConfig.accessories.glasses;
    if (gl !== 'none') {
      const frameMat = gl === 'round_brass' ? brassMat : darkLeatherMat;
      [-1, 1].forEach((side) => {
        const rim =
          gl === 'round_brass'
            ? new THREE.Mesh(
                trackGeo(new THREE.TorusGeometry(0.044, 0.007, 6, 14)),
                frameMat,
              )
            : new THREE.Mesh(
                trackGeo(new THREE.BoxGeometry(0.088, 0.058, 0.014)),
                frameMat,
              );
        rim.position.set(side * 0.072, 0.024, 0.218);
        headMesh.add(rim);
      });
      const bridge = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.045, 0.01, 0.012)),
        frameMat,
      );
      bridge.position.set(0, 0.028, 0.22);
      headMesh.add(bridge);
    }

    // 6. Headwear ('curator_cap' | 'headband')
    const hw = currentConfig.accessories.headwear;
    if (hw === 'curator_cap') {
      const capDome = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.225, 0.235, 0.078, radialSegs)),
        secondaryFabricMat,
      );
      capDome.position.set(0, 0.195, 0.01);
      capDome.rotation.x = 0.12;
      headMesh.add(capDome);

      const capVisor = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.26, 0.022, 0.14)),
        leatherMat,
      );
      capVisor.position.set(0, 0.165, 0.19);
      capVisor.rotation.x = -0.12;
      headMesh.add(capVisor);
    } else if (hw === 'headband') {
      const band = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.226, 0.022, 8, radialSegs)),
        accentMat,
      );
      band.rotation.x = Math.PI / 2 + 0.35;
      band.position.set(0, 0.085, 0);
      headMesh.add(band);
    }

    // 7. Earrings ('gold_studs' | 'champagne_hoops')
    const er = currentConfig.accessories.earrings;
    if (er !== 'none') {
      [-1, 1].forEach((side) => {
        const earring =
          er === 'gold_studs'
            ? new THREE.Mesh(
                trackGeo(new THREE.SphereGeometry(0.016, 8, 8)),
                brassMat,
              )
            : new THREE.Mesh(
                trackGeo(new THREE.TorusGeometry(0.024, 0.005, 6, 12)),
                brassMat,
              );
        if (er === 'champagne_hoops') {
          earring.rotation.y = Math.PI / 2;
        }
        earring.position.set(
          side * 0.222,
          er === 'gold_studs' ? -0.032 : -0.048,
          0.01,
        );
        headMesh.add(earring);
      });
    }
  };

  // Build initial character meshes
  populateCharacterMeshes(currentConfig);

  // ==========================================================================
  // E. POSE APPLICATION & METRICS
  // ==========================================================================
  const applyPose = (
    pose: TechBuddyPose,
    elapsedSec: number,
    walkPhase = elapsedSec * 6.5,
    moveFactor = 1,
  ) => {
    const profile = BODY_PROPORTION_PROFILES[currentConfig.bodyType];
    // Reset baseline transforms before applying pose
    charBodyGroup.position.set(0, 0, 0);
    charBodyGroup.rotation.set(0, 0, 0);
    headMesh.rotation.set(0, 0, 0);
    leftLeg.position.set(-profile.hipLegOffset, 0.27, 0);
    rightLeg.position.set(profile.hipLegOffset, 0.27, 0);
    leftLeg.rotation.set(0, 0, 0);
    rightLeg.rotation.set(0, 0, 0);
    leftArm.position.set(-profile.shoulderHalfSpan, 0.92, 0);
    rightArm.position.set(profile.shoulderHalfSpan, 0.92, 0);
    leftArm.rotation.set(0, 0, 0);
    rightArm.rotation.set(0, 0, 0);

    switch (pose) {
      case 'walking': {
        const swing = Math.sin(walkPhase) * 0.45 * moveFactor;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
        leftArm.rotation.x = -swing * 0.72;
        rightArm.rotation.x = swing * 0.72;
        charBodyGroup.position.y =
          Math.abs(Math.cos(walkPhase)) * 0.038 * moveFactor;
        break;
      }
      case 'running': {
        const runPhase = walkPhase * 1.35;
        const swing = Math.sin(runPhase) * 0.68 * moveFactor;
        charBodyGroup.rotation.x = 0.08;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
        leftArm.rotation.x = -swing * 0.85;
        rightArm.rotation.x = swing * 0.85;
        charBodyGroup.position.y =
          Math.abs(Math.cos(runPhase)) * 0.062 * moveFactor;
        break;
      }
      case 'turning': {
        const turnYaw = Math.sin(elapsedSec * 2.2) * 0.28;
        charBodyGroup.rotation.z = -turnYaw * 0.35;
        headMesh.rotation.y = turnYaw;
        leftLeg.rotation.x = Math.sin(walkPhase) * 0.22;
        rightLeg.rotation.x = -Math.sin(walkPhase) * 0.22;
        break;
      }
      case 'pointing': {
        rightArm.rotation.x = -1.35;
        rightArm.rotation.y = -0.12;
        leftArm.rotation.x = 0.12;
        headMesh.rotation.y = -0.12;
        break;
      }
      case 'waving': {
        rightArm.rotation.x = -2.35 + Math.sin(elapsedSec * 6.2) * 0.26;
        rightArm.rotation.z = -0.18;
        headMesh.rotation.y = Math.sin(elapsedSec * 1.8) * 0.08;
        break;
      }
      case 'sitting': {
        charBodyGroup.position.y = -0.18;
        leftLeg.rotation.x = -1.35;
        rightLeg.rotation.x = -1.35;
        leftArm.rotation.x = -0.35;
        rightArm.rotation.x = -0.35;
        headMesh.rotation.y = Math.sin(elapsedSec * 0.9) * 0.12;
        break;
      }
      case 'interacting': {
        charBodyGroup.rotation.x = 0.06;
        rightArm.rotation.x = -0.95 + Math.sin(elapsedSec * 4.5) * 0.25;
        leftArm.rotation.x = -0.45;
        headMesh.rotation.x = 0.12;
        break;
      }
      case 'celebrating': {
        const bounce = Math.abs(Math.sin(elapsedSec * 5.2)) * 0.065;
        charBodyGroup.position.y = bounce;
        leftArm.rotation.x = -2.45 + Math.sin(elapsedSec * 5.2) * 0.2;
        rightArm.rotation.x = -2.45 - Math.sin(elapsedSec * 5.2) * 0.2;
        break;
      }
      case 'talking': {
        headMesh.rotation.y = Math.sin(elapsedSec * 2.4) * 0.12;
        headMesh.rotation.x = Math.sin(elapsedSec * 4.2) * 0.05;
        leftArm.rotation.x = -0.45 + Math.sin(elapsedSec * 3.1) * 0.18;
        rightArm.rotation.x = -0.55 - Math.sin(elapsedSec * 3.1) * 0.18;
        break;
      }
      case 'idle':
      default: {
        charBodyGroup.position.y = Math.sin(elapsedSec * 2.1) * 0.01;
        leftArm.rotation.x = Math.sin(elapsedSec * 1.4) * 0.03;
        rightArm.rotation.x = -Math.sin(elapsedSec * 1.4) * 0.03;
        headMesh.rotation.y = Math.sin(elapsedSec * 0.8) * 0.05;
        break;
      }
    }
  };

  const getMetrics = () => {
    let drawCalls = 0;
    let triangles = 0;
    charBodyGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        drawCalls += 1;
        const geom = obj.geometry;
        if (geom.index) {
          triangles += Math.round(geom.index.count / 3);
        } else if (geom.attributes.position) {
          triangles += Math.round(geom.attributes.position.count / 3);
        }
      }
    });
    return {
      drawCalls,
      triangles,
      bodyType: currentConfig.bodyType,
      outfit: currentConfig.outfit,
    };
  };

  const dispose = () => {
    disposeOwnedSubtreeAssets();
    headGeometry.dispose();
    headMaterial.dispose();
  };

  return {
    charBodyGroup,
    headMesh,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    getConfig: () => structuredCloneConfig(currentConfig),
    rebuild: (nextConfig: CharacterStudioConfigV1) => {
      populateCharacterMeshes(nextConfig);
    },
    applyPose,
    getMetrics,
    dispose,
  };
}
