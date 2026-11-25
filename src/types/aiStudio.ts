import {
  ArtworkMotif,
  ExhibitionDisplayStyle,
  GalleryLayoutMode,
  MemoryDisplayFrameStyle,
  MemoryMediaType,
  RoomDecorativeStyle,
} from './museum';

export type AIProviderId = 'gemini' | 'openai';

export type AICapability =
  | 'caption_generation'
  | 'image_understanding'
  | 'metadata_extraction'
  | 'memory_classification'
  | 'memory_search'
  | 'story_writing'
  | 'collection_descriptions'
  | 'room_design'
  | 'image_generation'
  | 'video_generation';

export type ConnectionState =
  | 'connected'
  | 'unverified'
  | 'missing_credentials'
  | 'auth_failed'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'invalid_response'
  | 'error';

export interface ProviderUsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  lastUsedAt?: string;
  lastError?: string;
}

export interface AIProviderStatus {
  id: AIProviderId;
  displayName: string;
  vendor: string;
  credentialEnvVar: string;
  configured: boolean;
  verified?: boolean;
  connectionStatus: ConnectionState;
  enabledCapabilities: AICapability[];
  models: {
    textModel: string;
    visionModel?: string;
    metadataModel?: string;
    classificationModel?: string;
    curationModel?: string;
    imageModel?: string;
    videoModel?: string;
  };
  costEstimateNote: string;
  setupInstructions: string;
  usage: ProviderUsageMetrics;
}

export interface MemorySanitizedContext {
  id: string;
  ownerId?: string;
  roomId: string;
  roomName?: string;
  type?: MemoryMediaType;
  mediaUrl?: string;
  title: string;
  date: string;
  year: number;
  location: string;
  category: string;
  description: string;
  story: string;
  tags: string[];
}

export type RoomCategoryKey =
  | 'childhood'
  | 'travels'
  | 'family'
  | 'friendships'
  | 'achievements'
  | 'college_years'
  | 'special_moments'
  | 'creative_atelier'
  | 'music_sound'
  | 'nature_sanctuary';

export type BlueprintExhibitFormatType =
  | 'framed-photo'
  | 'vintage-television'
  | 'interactive-scrapbook'
  | 'interactive-school-bag'
  | 'keepsake-vitrine'
  | 'school-timeline-plaque'
  | 'travel-globe-station'
  | 'vinyl-listening-post'
  | 'heirloom-frame'
  | 'laurel-pedestal';

export type BlueprintExhibitInteractionType =
  | 'open-memory'
  | 'play-video'
  | 'flip-scrapbook'
  | 'inspect-keepsake';

export interface BlueprintRoomSpec {
  name: string;
  category: string;
  categoryKey: RoomCategoryKey;
  concept: string;
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
}

/**
 * OUTPUT A — 3D ENVIRONMENT BLUEPRINT
 */
export interface BlueprintEnvironmentSpec {
  style: string;
  colors: string[];
  materials: Array<{
    surface: string;
    material: string;
    finish: string;
    colorHex: string;
  }>;
  architecture: Array<{
    element: string;
    style: string;
    position: { x: number; y: number; z: number };
  }>;
  furniture: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number; z: number };
    dimensions: { width: number; height: number; depth: number };
    rotationY?: number;
  }>;
  decorations: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number; z: number };
  }>;
  lighting: Array<{
    type: string;
    colorHex: string;
    intensity: number;
    position: { x: number; y: number; z: number };
  }>;
  zones: Array<{
    id: string;
    name: string;
    purpose: string;
    center: { x: number; z: number };
    radius: number;
  }>;
}

/**
 * OUTPUT B — MEMORY EXHIBITION BLUEPRINT
 * Strictly references existing memory IDs; never invents fake memories.
 */
export interface BlueprintMemoryExhibitSpec {
  memoryId: string;
  type: BlueprintExhibitFormatType;
  title: string;
  position: { x: number; y: number; z: number };
  rotationY: number;
  dimensions: { width: number; height: number; depth: number };
  associated3DObject: string;
  interaction: BlueprintExhibitInteractionType;
  availableMetadata: {
    date?: string;
    location?: string;
    mediaType?: MemoryMediaType;
  };
  storytellingContext: string;
}

export interface ImmersiveRoomBlueprint {
  room: BlueprintRoomSpec;
  environment: BlueprintEnvironmentSpec;
  exhibits: BlueprintMemoryExhibitSpec[];
}

export interface RoomStarterMemoryTemplate {
  title: string;
  subtitle?: string;
  date: string;
  year: number;
  location: string;
  category: string;
  description: string;
  story: string;
  tags: string[];
  people: string[];
  type: MemoryMediaType;
  motif: ArtworkMotif;
  palette: [string, string, string, string];
  frameStyle: MemoryDisplayFrameStyle;
}

export interface RoomMemoryVisualDataSummary {
  detectedCategory: RoomCategoryKey;
  categoryBadge: string;
  totalExhibits: number;
  earliestYear: number | null;
  latestYear: number | null;
  eraTimelineDistribution: Array<{
    label: string;
    count: number;
    percentage: number;
    highlightTitle: string;
  }>;
  mediaBreakdown: Array<{
    type: MemoryMediaType;
    label: string;
    count: number;
    percentage: number;
    colorHex: string;
  }>;
  emotionAndThemeMetrics: Array<{
    theme: string;
    score: number;
    colorHex: string;
    note: string;
  }>;
  topTags: Array<{
    label: string;
    count: number;
  }>;
  placeAndPeopleHighlights: Array<{
    label: string;
    kind: 'place' | 'person';
    count: number;
  }>;
  narrativeDataSynthesis: string;
}

export type LivingWorldSpaceId =
  | 'central_gallery'
  | 'bedroom'
  | 'backyard'
  | 'treehouse'
  | 'play_area'
  | 'study_corner';

export type TechBuddyPose =
  | 'idle'
  | 'walking'
  | 'running'
  | 'turning'
  | 'pointing'
  | 'waving'
  | 'sitting'
  | 'interacting'
  | 'celebrating'
  | 'talking';

export type AtmospherePresetId =
  | 'morning_sunlight'
  | 'golden_hour'
  | 'night_starlight'
  | 'rainy_window';

export type InteractiveObjectId3D =
  | 'wooden_bed'
  | 'under_bed_scrapbook'
  | 'under_bed_flashlight'
  | 'bedside_drawer'
  | 'trophy_shelf'
  | 'cork_pinboard'
  | 'crt_computer'
  | 'wired_headphones'
  | 'study_desk'
  | 'spinning_globe'
  | 'wardrobe'
  | 'bedroom_tv'
  | 'school_bag'
  | 'bedroom_window'
  | 'memory_radio'
  | 'memory_projector'
  | 'wall_clock_calendar'
  | 'drawing_wall'
  | 'toy_chest'
  | 'toy_train'
  | 'hopscotch'
  | 'cricket_set'
  | 'tyre_swing'
  | 'bicycle'
  | 'treehouse_ladder';

export type MemoryTo3DObjectType =
  | 'bicycle'
  | 'childhood_toy'
  | 'story_keepsake'
  | 'family_video_display'
  | 'audio_gramophone'
  | 'framed_photograph'
  | 'school_certificate_desk'
  | 'treehouse_lantern'
  | 'custom_keepsake';

export type MemoryTo3DInteractionType =
  | 'inspect_memory'
  | 'spin_wheels'
  | 'open_lid'
  | 'play_video'
  | 'play_audio'
  | 'read_story'
  | 'custom_animation';

export type MemoryTo3DGenerationStatus =
  | 'idle'
  | 'analyzing'
  | 'resolved_existing'
  | 'generated_procedural'
  | 'generating_glb'
  | 'generated_glb'
  | 'fallback_used'
  | 'failed';

export type MemoryTo3DApprovalStatus =
  | 'pending'
  | 'approved'
  | 'edited_and_approved'
  | 'keep_media_only'
  | 'rejected';

export type MemoryTo3DAssetSourceKind =
  | 'existing_catalog'
  | 'reused_model'
  | 'procedural_threejs'
  | 'meshy_glb'
  | 'fallback_plinth';

export interface GeneratedGlbAssetReference {
  assetId: string;
  sourceKind: MemoryTo3DAssetSourceKind;
  priorityTier: 1 | 2 | 3 | 4 | 5;
  catalogObjectId?: InteractiveObjectId3D;
  glbUrlOrDataUri?: string;
  proceduralArchetype?: MemoryTo3DObjectType;
  isAiInterpretation: boolean;
  confidenceScore: number; // 0..1
  statusMessage: string;
  generatedAt?: string;
}

/**
 * PART 5 — Structured Memory-to-3D Blueprint
 * Every approved memory generates or resolves a structured 3D blueprint.
 * Never assumes Gemini text output is itself a 3D model.
 */
export interface MemoryTo3DBlueprint {
  memoryId: string;
  sourceMediaId: string;
  objectType: MemoryTo3DObjectType;
  objectName: string;
  visualDescription: string;
  assetGenerationPrompt: string;
  connectedRoom: string;
  connectedSpace: LivingWorldSpaceId;
  linkedObjectId: InteractiveObjectId3D;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  interactionType: MemoryTo3DInteractionType;
  interactionLabel: string;
  aiGenerationStatus: MemoryTo3DGenerationStatus;
  userApprovalStatus: MemoryTo3DApprovalStatus;
  generatedGlbAssetRef: GeneratedGlbAssetReference;
}

/**
 * Gemini Multimodal Memory Understanding — Output A (Verified Memory Analysis)
 * & Output B (Personalised 3D Environment & Object Binding)
 */
export interface MultimodalMemoryAnalysisResult {
  memoryAnalysis: {
    mediaType: MemoryMediaType;
    summary?: string;
    detectedObjects: string[];
    detectedActivities: string[];
    sceneDescription: string;
    extractedText?: string;
    storyTheme: string;
    verifiedFacts: string[];
    uncertainInferences: string[];
    possibleConnections: string[];
  };
  environmentDesign: {
    roomCategory: RoomCategoryKey | string;
    connectedSpace: LivingWorldSpaceId;
    linked3DObject: string;
    linkedObjectId: InteractiveObjectId3D;
    linkedActivity: string;
    objectPlacementLabel: string;
    originalMediaPreservedNote: string;
    aiInterpretationSummary: string;
  };
}

export type ChildhoodThemeStyleId =
  | 'nostalgic_childhood'
  | 'colourful_playroom'
  | 'cozy_vintage_bedroom'
  | 'nature_inspired_childhood'
  | 'minimal_modern_childhood';

export type MemoryPlacementTarget =
  | 'wall_frame'
  | 'study_desk'
  | 'bedside_shelf'
  | 'scrapbook_podium'
  | 'cinema_screen'
  | 'audio_booth'
  | 'keepsake_cabinet'
  | 'garden_trail'
  | 'treehouse_nook'
  | 'bicycle_trail';

export interface RoomCustomizationStudioConfig {
  wallColorHex: string;
  wallTexture?:
    | 'smooth_plaster'
    | 'wood_wainscoting'
    | 'striped_wallpaper'
    | 'storybook_mural';
  floorColorHex: string;
  floorMaterial:
    | 'warm_oak'
    | 'herringbone_walnut'
    | 'polished_marble'
    | 'ivory_marble'
    | 'travertine_stone'
    | 'warm_parquet';
  ceilingColorHex?: string;
  atmospherePreset: AtmospherePresetId;
  skyGardenAppearance?:
    | 'sunny_garden'
    | 'sunset_meadow'
    | 'starlit_sky'
    | 'rainy_courtyard';
  lightIntensity: number;
  windowStyle?: 'arched_sunlit' | 'stained_amber' | 'wide_garden_view';
  curtainColorHex?: string;
  curtainsVisible?: boolean;
  furnitureColorHex?: string;
  bedsheetColorHex?: string;
  bedDesign?: 'classic_sleigh' | 'cozy_canopy' | 'modern_timber';
  cupboardStyle?: 'vintage_walnut' | 'painted_ivory' | 'glass_display';
  deskStyle?: 'scholar_oak' | 'playful_craft' | 'minimal_birch';
  furnitureLayoutPreset?: 'classic' | 'window_facing' | 'spacious_play';
  toyArrangementPreset?:
    | 'tidied_shelf'
    | 'playtime_circle'
    | 'train_adventure';
  showRugs?: boolean;
  showCushions?: boolean;
  showLamps?: boolean;
  showPosters?: boolean;
  showPlants?: boolean;
  showToys?: boolean;
  childhoodThemeStyle?: ChildhoodThemeStyleId;
  techBuddyVisible: boolean;
  enabledSpaces: LivingWorldSpaceId[];
  enabledObjects: InteractiveObjectId3D[];
  customCuratorNote?: string;
}

export interface RoomDesignConfig {
  themeName: string;
  wallColorHex: string;
  floorTintHex: string;
  archColorHex: string;
  accentColorHex: string;
  lightingPreset:
    | 'golden_hour'
    | 'warm_salon'
    | 'moonlit_atrium'
    | 'daylight_gallery';
  lightIntensity: number; // 0.8 to 4.0
  exhibitLayout: 'triptych' | 'salon_grid' | 'panoramic';
  decorations: 'botanical_olive' | 'sculptural_plinths' | 'minimalist';
  roomDescription: string;
  curatorRationale: string;
  detectedCategory?: RoomCategoryKey;
  categoryLabel?: string;
  exhibitionStyle?: ExhibitionDisplayStyle;
  galleryLayout?: GalleryLayoutMode;
  decorativeStyle?: RoomDecorativeStyle;
  featuredMotif?: ArtworkMotif;
  curatorQuote?: string;
  interactive3DInstallations?: string[];
  visualDataSummary?: RoomMemoryVisualDataSummary;
  suggestedStarterMemories?: RoomStarterMemoryTemplate[];
  blueprint?: ImmersiveRoomBlueprint;
  atmospherePreset?: AtmospherePresetId;
  studioCustomization?: RoomCustomizationStudioConfig;
}

export interface StoryboardScene {
  sceneNumber: number;
  memoryId: string;
  memoryTitle: string;
  durationSeconds: number;
  cameraMotion: 'slow_zoom_in' | 'pan_left_to_right' | 'gentle_drift' | 'static_focus';
  caption: string;
  visualPrompt: string;
}

export interface StoryboardPlan {
  filmTitle: string;
  theme: string;
  aspectRatio: '16:9' | '9:16';
  totalDurationSeconds: number;
  musicalMood: string;
  scenes: StoryboardScene[];
}

export interface CuratorCitation {
  memoryId: string;
  title: string;
  date: string;
  location: string;
  roomId: string;
  relevanceNote: string;
}

export interface CuratorResponsePayload {
  answerMarkdown: string;
  factsSummary: string[];
  curatorialSuggestions: string[];
  uncertaintyNote?: string;
  citations: CuratorCitation[];
  suggestedCollectionTitle?: string;
}

export interface MetadataExtractionPayload {
  suggestedRoomId: string;
  suggestedRoomName: string;
  suggestedTitle: string;
  suggestedLocation: string;
  suggestedDate?: string;
  suggestedCategory: string;
  suggestedCaption: string;
  suggestedStory: string;
  suggestedTags: string[];
  suggestedMotif: ArtworkMotif;
  confidenceNote: string;
  multimodalAnalysis?: MultimodalMemoryAnalysisResult;
  memoryTo3DBlueprint?: MemoryTo3DBlueprint;
}

export interface AITaskRequest {
  task: AICapability;
  providerId?: AIProviderId;
  userId: string;
  consentGranted: boolean;
  demoMode?: boolean;
  prompt?: string;
  memories?: MemorySanitizedContext[];
  rooms?: { id: string; name: string; subtitle: string }[];
  imageBase64?: string;
  imageMimeType?: string;
  imageConfig?: {
    aspectRatio?: '1:1' | '4:3' | '16:9' | '3:4' | '9:16';
    purpose?: 'collection_cover' | 'room_moodboard' | 'decorative_backdrop' | 'image_edit';
  };
  videoConfig?: {
    aspectRatio?: '16:9' | '9:16';
    duration?: '5s' | '10s';
    theme?: string;
    storyboard?: StoryboardPlan;
  };
  roomDesignPrompt?: {
    roomName: string;
    roomCategory?: string;
    description?: string;
    currentSubtitle?: string;
    styleKeywords?: string;
  };
}

export interface AITaskResponse<T = unknown> {
  ok: boolean;
  task: AICapability;
  providerUsed: AIProviderId | 'demo_local';
  modelUsed: string;
  isDemo: boolean;
  latencyMs: number;
  estimatedCostUsd?: number;
  data?: T;
  error?: {
    code:
      | 'MISSING_CREDENTIALS'
      | 'CONSENT_REQUIRED'
      | 'UNAUTHORIZED_MEMORY_ACCESS'
      | 'AUTHENTICATION_FAILED'
      | 'RATE_LIMITED'
      | 'MODEL_UNAVAILABLE'
      | 'PROVIDER_UNAVAILABLE'
      | 'INVALID_AI_RESPONSE'
      | 'INVALID_INPUT'
      | 'MALFORMED_AI_OUTPUT'
      | 'PROVIDER_ERROR'
      | 'CAPABILITY_UNSUPPORTED';
    message: string;
    availableAlternativeProviders?: AIProviderId[];
    canUseDemoFallback: boolean;
  };
}
