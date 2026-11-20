import {
  InteractiveObjectId3D,
  LivingWorldSpaceId,
  MemoryTo3DBlueprint,
  MultimodalMemoryAnalysisResult,
  RoomDesignConfig,
} from './aiStudio';

export type ArtworkMotif =
  | 'treehouse_meadow'
  | 'coastal_bonfire'
  | 'amalfi_arches'
  | 'atelier_studio'
  | 'courtyard_lanterns'
  | 'family_table'
  | 'paper_boats'
  | 'vinyl_attic'
  | 'kyoto_torii'
  | 'alpine_train'
  | 'symphony_hall'
  | 'marathon_dawn'
  | 'observatory_stars'
  | 'greenhouse_vows'
  | 'grandparents_orchard'
  | 'sunday_baking'
  | 'polaroid_roadtrip'
  | 'botanical_press';

export type RoomStatus = 'empty' | 'active' | 'disabled';

export type RoomAudioPolicy = 'use_global' | 'custom' | 'ambient' | 'silent';

export interface RoomAudioSettings {
  roomId: string;
  policy: RoomAudioPolicy;
  sourceType: 'builtin' | 'local_file' | 'external_preview' | 'spotify' | 'youtube';
  sourceId: string;
  enabled: boolean;
  volume: number; // 0..1
  autoplayOnEntry: boolean;
  transitionPolicy: 'crossfade' | 'immediate';
}

export interface MuseumAudioSettings {
  globalSourceType: 'builtin' | 'local_file' | 'external_preview' | 'spotify' | 'youtube';
  globalSourceId: string;
  globalEnabled: boolean;
  masterVolume: number; // 0..1
  muted: boolean;
  ambientEnabled: boolean;
  ambientSourceId: string;
  transitionDuration: number; // seconds, e.g. 1.2
  guidedTourActive?: boolean;
}

export interface PlaylistItemPreview {
  id: string;
  title: string;
  artistOrChannel: string;
  durationLabel?: string;
  thumbnailUrl?: string;
  externalUrl?: string;
  previewAudioUrl?: string;
  embeddable?: boolean;
  unavailableReason?: string;
}

export interface MusicSource {
  id: string;
  provider: 'builtin' | 'local' | 'spotify' | 'youtube';
  externalPlaylistId?: string;
  title: string;
  subtitle: string;
  ownerName?: string;
  trackCount?: number | null;
  artist?: string;
  artworkColor: string;
  artworkUrl?: string;
  sourceType:
    | 'ambient_synth'
    | 'local_audio'
    | 'external_preview'
    | 'embedded_playlist';
  synthPreset?:
    | 'calm_museum'
    | 'warm_piano'
    | 'forest_ambience'
    | 'gentle_rain'
    | 'ocean_waves'
    | 'evening_atmosphere'
    | 'cinematic_memories';
  externalUrl?: string;
  externalServiceUrl?: string;
  embedUrl?: string;
  spotifyEmbedUrl?: string;
  embedAllowed?: boolean;
  unavailableReason?: string;
  itemsPreview?: PlaylistItemPreview[];
  localDataUrl?: string;
  durationLabel: string;
  availabilityStatus:
    | 'available'
    | 'preview_only'
    | 'embed_only'
    | 'unavailable';
}

export interface MusicProviderStatus {
  id: 'spotify' | 'youtube';
  name: string;
  connected: boolean;
  connectionState: 'connected' | 'disconnected' | 'setup_required' | 'error';
  connectionMode?:
    | 'oauth'
    | 'api_key'
    | 'client_credentials'
    | 'disconnected';
  accountName?: string;
  configuredOnServer: boolean;
  oauthConfiguredOnServer: boolean;
  credentialEnvVars: string[];
  requiredScopes: string[];
  callbackUrl: string;
  capabilities: {
    userPlaylists: boolean;
    publicPlaylistSearch: boolean;
    playlistItems: boolean;
    embeddedPlayer: boolean;
    fullNativeCatalogPlayback: boolean;
  };
  playbackRestrictionNote: string;
  setupInstructions: string;
  lastError?: string;
}

export const ROOMS_PER_FLOOR = 4;
export type RoomSlotIndex = 0 | 1 | 2 | 3;

export interface Floor {
  id: string;
  floorNumber: number; // 0 = Ground Floor, 1 = First Floor, 2 = Second Floor, etc.
  name: string;
  subtitle: string;
  roomSlotIds: [string, string, string, string]; // Always 4 fixed slots (0..3)
  createdAt: string;
}

export type GalleryLayoutMode =
  | 'masonry'
  | 'grid'
  | 'timeline'
  | 'scrapbook'
  | 'wall'
  | 'carousel';

export type ExhibitionDisplayStyle =
  | 'floating_exhibition'
  | 'classic_wall_gallery'
  | 'timeline_wall'
  | 'floating_island'
  | 'cinematic_video_gallery'
  | 'memory_shelves'
  | 'scrapbook_collage'
  | 'immersive_panorama';

export type MemoryDisplayFrameStyle =
  | 'auto'
  | 'walnut_classic'
  | 'champagne_brass'
  | 'bronze_museum'
  | 'minimal_dark'
  | 'floating_halo'
  | 'vitrine_niche'
  | 'scrapbook_board'
  | 'cinema_screen';

export type RoomDecorativeStyle =
  | 'playful_nostalgia'
  | 'compass_atlas'
  | 'scrapbook_salon'
  | 'heirloom_hearth'
  | 'laurel_monograph'
  | 'campus_quadrangle'
  | 'lantern_conservatory'
  | 'botanical_atelier';

export interface Room {
  id: string;
  floorId: string;
  floorNumber: number;
  slotIndex: RoomSlotIndex; // Fixed slot index 0..3 on its floor
  status: RoomStatus; // 'empty' | 'active' | 'disabled'
  enabled: boolean; // true when status === 'active'
  name: string;
  subtitle: string;
  description: string;
  theme: string;
  accentColor: string; // Hex e.g. #D6A15D
  lightColor: number; // Three.js hex e.g. 0xffb347
  wing: 'Ground Floor' | 'First Floor' | 'Second Floor' | string;
  archIndex: number; // Global index
  featuredMotif: ArtworkMotif;
  curatorQuote: string;
  customCoverUrl?: string;
  galleryLayout?: GalleryLayoutMode;
  exhibitionStyle?: ExhibitionDisplayStyle;
  decorativeStyle?: RoomDecorativeStyle;
  wallTintHex?: string;
  designConfig?: RoomDesignConfig;
  audioSettings?: RoomAudioSettings;
  isUserCreated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type MemoryMediaType =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'chat'
  | 'story'
  | 'certificate';

export interface ChatMessageLine {
  sender: string;
  text: string;
  timestamp?: string;
}

export type MemoryConnectionType =
  | 'same_event'
  | 'shared_people'
  | 'shared_place'
  | 'related_story'
  | 'time_period'
  | 'cross_room';

export interface MemoryConnection {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relationshipType: MemoryConnectionType;
  relationshipLabel: string;
  evidenceReason: string;
  status: 'suggested' | 'approved' | 'rejected';
  providerNote?: string;
  approvedAt?: string;
}

export interface Memory {
  id: string;
  ownerId?: string;
  roomId: string;
  title: string;
  subtitle?: string;
  type?: MemoryMediaType; // defaults to 'image'
  mediaType?: MemoryMediaType; // alias for type
  mediaUrl?: string; // optional video/audio/document data URL or IndexedDB ref
  mediaMimeType?: string;
  mediaFileName?: string;
  date: string; // YYYY-MM-DD or empty if undated
  year: number;
  location: string;
  people?: string[]; // user-provided people associated with memory
  emotionTags?: string[];
  category: string;
  description: string;
  story: string;
  accessionNumber: string;
  motif: ArtworkMotif;
  palette: [string, string, string, string];
  customImageUrl?: string;
  soundtrackSourceId?: string;
  isFavorite?: boolean;
  displayOrder?: number;
  displayStyleOverride?: ExhibitionDisplayStyle;
  frameStyle?: MemoryDisplayFrameStyle;
  isPanorama360?: boolean;
  chatLines?: ChatMessageLine[];
  certificateIssuer?: string;
  documentAuthor?: string;
  documentText?: string;
  transcriptText?: string;
  aiSummary?: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  multimodalAnalysis?: MultimodalMemoryAnalysisResult;
  memoryTo3D?: Record<string, unknown>;
  memoryTo3DBlueprint?: MemoryTo3DBlueprint;
  custom3DPosition?: [number, number, number];
  linked3DObject?: string;
  linkedObjectId?: InteractiveObjectId3D;
  linkedSpaceId?: LivingWorldSpaceId;
  linkedActivity?: string;
  placementTarget?: import('./aiStudio').MemoryPlacementTarget;
  positionOffset?: { x: number; y: number };
  curatedZoneId?: import('./curation').ChildhoodWorldLocationId;
  hiddenFrom3D?: boolean;
  curationReport?: import('./curation').MemoryAnalysisReport;
  collectionIds?: string[];
  videoHighlights?: import('./curation').VideoHighlightMoment[];
  audioKind?: 'music' | 'speech' | 'environmental';
}

export type MemoryItem = Memory;

export interface Collection {
  id: string;
  title: string;
  subtitle: string;
  curatorNote: string;
  memoryIds: string[];
  accentColor: string;
  seasonTag: string;
  themeTag?: string;
  customCoverUrl?: string;
  soundtrackSourceId?: string;
  evidenceSummary?: string;
  suggestedEnvironment?: import('./curation').ChildhoodWorldLocationId | string;
  mediaTypes?: MemoryMediaType[];
  availableInteractions?: string[];
  confidenceNote?: string;
  isAutoGenerated?: boolean;
  createdAt?: string;
}

export type CollectionItem = Collection;

export interface CharacterState {
  position: [number, number, number];
  rotationY: number;
  currentFloorId: string;
  currentFloorNumber: number;
  currentRoomId?: string | null;
  lastVisitedLocation?: string;
  pose?: 'idle' | 'walking' | 'interacting';
  nearbyRoomId?: string | null;
  nearbySlotFloorId?: string | null;
  nearbySlotIndex?: number | null;
  isOnStairs?: boolean;
  isInLift?: boolean;
}

export type WallFeatureId =
  | 'museum_settings'
  | 'music_playlists'
  | 'floor_navigation'
  | 'my_rooms'
  | 'memories'
  | 'ai_studio'
  | 'collections_timeline'
  | 'profile_privacy'
  | 'help_tutorials'
  | 'additional_features';

export interface MuseumUserAccount {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
  isGuest?: boolean;
}

export interface MuseumSettings {
  projectName: string;
  curatorName: string;
  curatorBio: string;
  mouseSensitivity: number; // 0.4 .. 2.0
  invertCameraY: boolean;
  reducedMotion: boolean;
  showMiniMap: boolean;
  highContrastPlaqueText: boolean;
  showOptionalTips?: boolean;
}

export type ActiveNavTab =
  | 'home'
  | 'rooms'
  | 'collections'
  | 'timeline'
  | 'explore'
  | 'ai-studio'
  | 'ai_studio'
  | 'soundscapes'
  | 'dashboard'
  | 'add';


