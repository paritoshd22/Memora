import {
  InteractiveObjectId3D,
  LivingWorldSpaceId,
  MemoryPlacementTarget,
} from './aiStudio';
import {
  Collection,
  Memory,
  MemoryConnection,
  MemoryMediaType,
} from './museum';

export type ChildhoodWorldLocationId =
  | 'bedroom'
  | 'study_corner'
  | 'backyard'
  | 'treehouse'
  | 'bicycle_trail'
  | 'outdoor_cinema'
  | 'memory_radio'
  | 'memory_garden'
  | 'keepsake_corner';

export interface ChildhoodLocationCatalogueEntry {
  id: ChildhoodWorldLocationId;
  label: string;
  spaceId: LivingWorldSpaceId;
  placementTarget: MemoryPlacementTarget;
  linkedObjectId?: InteractiveObjectId3D;
  anchor: { x: number; y: number; z: number };
  safeRadius: number;
  allowedMediaTypes: MemoryMediaType[];
  experienceSummary: string;
}

export const CHILDHOOD_WORLD_LOCATION_CATALOGUE: Record<
  ChildhoodWorldLocationId,
  ChildhoodLocationCatalogueEntry
> = {
  bedroom: {
    id: 'bedroom',
    label: 'Childhood Bedroom',
    spaceId: 'bedroom',
    placementTarget: 'bedside_shelf',
    linkedObjectId: 'wooden_bed',
    anchor: { x: -4.95, y: 1.55, z: 3.65 },
    safeRadius: 1.4,
    allowedMediaTypes: ['image', 'story', 'document', 'audio', 'chat'],
    experienceSummary: 'Warm walnut bed alcove and intimate bedside gallery frames.',
  },
  study_corner: {
    id: 'study_corner',
    label: 'Study Corner & Reading Desk',
    spaceId: 'study_corner',
    placementTarget: 'study_desk',
    linkedObjectId: 'study_desk',
    anchor: { x: -5.25, y: 0.92, z: -4.65 },
    safeRadius: 1.35,
    allowedMediaTypes: ['document', 'certificate', 'story', 'chat', 'image'],
    experienceSummary:
      'Brass-lamp reading desk designed for certificates, notebooks, PDFs, and letters.',
  },
  backyard: {
    id: 'backyard',
    label: 'Sunlit Backyard Meadow',
    spaceId: 'backyard',
    placementTarget: 'garden_trail',
    linkedObjectId: 'cricket_set',
    anchor: { x: 4.15, y: 0.02, z: 2.85 },
    safeRadius: 1.6,
    allowedMediaTypes: ['image', 'video', 'story', 'audio'],
    experienceSummary:
      'Open-air afternoon yard connecting backyard games, family gatherings, and sunlit photos.',
  },
  treehouse: {
    id: 'treehouse',
    label: 'Cedar Treehouse Platform',
    spaceId: 'treehouse',
    placementTarget: 'treehouse_nook',
    linkedObjectId: 'treehouse_ladder',
    anchor: { x: 4.75, y: 2.52, z: -2.15 },
    safeRadius: 1.25,
    allowedMediaTypes: ['image', 'chat', 'story', 'audio', 'document'],
    experienceSummary:
      'Elevated oak deck reached via the ladder; surfaces friendship chats, notes, and secret-fort photos.',
  },
  bicycle_trail: {
    id: 'bicycle_trail',
    label: 'Backyard Bicycle Trail',
    spaceId: 'backyard',
    placementTarget: 'bicycle_trail',
    linkedObjectId: 'bicycle',
    anchor: { x: 4.85, y: 0.02, z: 4.35 },
    safeRadius: 1.5,
    allowedMediaTypes: ['image', 'video', 'story'],
    experienceSummary:
      'Perimeter cycling path paired with Ride Mode and an ambient photo trail strip.',
  },
  outdoor_cinema: {
    id: 'outdoor_cinema',
    label: 'Memory Screening Corner',
    spaceId: 'play_area',
    placementTarget: 'cinema_screen',
    linkedObjectId: 'bedroom_tv',
    anchor: { x: 3.55, y: 1.05, z: -4.25 },
    safeRadius: 1.45,
    allowedMediaTypes: ['video', 'image'],
    experienceSummary:
      'Dedicated video screening deck presenting full uploaded clips and scene highlights.',
  },
  memory_radio: {
    id: 'memory_radio',
    label: 'Memory Radio & Listening Booth',
    spaceId: 'central_gallery',
    placementTarget: 'audio_booth',
    linkedObjectId: 'wardrobe',
    anchor: { x: 5.95, y: 0.85, z: 0.15 },
    safeRadius: 1.2,
    allowedMediaTypes: ['audio', 'story', 'chat'],
    experienceSummary:
      'Acoustic listening station separating songs, ambient soundscapes, and user-triggered voice notes.',
  },
  memory_garden: {
    id: 'memory_garden',
    label: 'Memory Garden Photo Trail',
    spaceId: 'backyard',
    placementTarget: 'garden_trail',
    linkedObjectId: 'tyre_swing',
    anchor: { x: 2.35, y: 0.02, z: 4.25 },
    safeRadius: 1.45,
    allowedMediaTypes: ['image', 'story', 'audio'],
    experienceSummary:
      'Walkable garden easel trail displaying seasonal photographs without blocking walkways.',
  },
  keepsake_corner: {
    id: 'keepsake_corner',
    label: 'Heirloom Keepsake Vitrine',
    spaceId: 'study_corner',
    placementTarget: 'keepsake_cabinet',
    linkedObjectId: 'toy_chest',
    anchor: { x: -5.65, y: 0.88, z: -3.55 },
    safeRadius: 1.35,
    allowedMediaTypes: [
      'image',
      'certificate',
      'document',
      'story',
      'chat',
      'video',
      'audio',
    ],
    experienceSummary:
      'Museum-grade vitrine and archival wall for ambiguous or multi-era treasured mementos.',
  },
};

export interface ParsedChatMessage {
  sender: string;
  text: string;
  timestamp?: string;
  orderIndex: number;
  rawLine?: string;
}

export interface ParsedChatExport {
  formatDetected: 'whatsapp' | 'imessage' | 'json' | 'transcript' | 'plain';
  participants: string[];
  messages: ParsedChatMessage[];
  warnings: string[];
}

export interface VideoHighlightMoment {
  timestampLabel: string;
  seconds?: number;
  description: string;
}

export interface MemoryAnalysisReport {
  analyzedBy: 'gemini' | 'deterministic_fallback';
  modelUsed?: string;
  analyzedAt: string;
  mediaCategory: MemoryMediaType;
  mainSubject?: string;
  eventContext?: string;
  confidenceScore?: number;
  detectedObjects: string[];
  detectedActivities: string[];
  sceneCues: string[];
  extractedText?: string;
  documentType?: string;
  explicitDates: string[];
  topics: string[];
  transcript?: string;
  audioKind?: 'music' | 'speech' | 'environmental';
  videoMoments?: VideoHighlightMoment[];
  parsedChatMessages?: ParsedChatMessage[];
  verifiedFacts: string[];
  aiInferences: string[];
  uncertainInfo: string[];
  recommendedRoomId?: string;
  recommendedLocationId: ChildhoodWorldLocationId;
  recommendedDisplayObject?: InteractiveObjectId3D;
  recommendedInteraction?: string;
  recommendedReason: string;
  sensitiveReconstructionRequiresApproval: boolean;
  autoPlacedIn3D: boolean;
}

export type CurationLifecyclePhase =
  | 'idle'
  | 'uploading'
  | 'preserving_original'
  | 'analysing'
  | 'organising'
  | 'finding_related'
  | 'linking'
  | 'preparing_collections'
  | 'assigning_locations'
  | 'review'
  | 'preparing'
  | 'ready'
  | 'error';

export interface CurationBatchItemInput {
  tempId: string;
  fileName: string;
  mimeType: string;
  detectedMediaType: MemoryMediaType;
  sizeBytes?: number;
  originalDataUrl?: string;
  analysisImageBase64?: string;
  analysisImageMimeType?: string;
  videoKeyframesBase64?: string[];
  videoDurationSeconds?: number;
  audioBase64?: string;
  audioMimeType?: string;
  rawTextContent?: string;
  documentBase64?: string;
  captureSource?: 'upload' | 'camera' | 'written';
  userTitle?: string;
  userDescription?: string;
  userDate?: string;
}

export interface CurationBatchItemStatus {
  tempId: string;
  fileName: string;
  detectedMediaType: MemoryMediaType;
  status: 'queued' | 'processing' | 'done' | 'failed';
  memoryId?: string;
  collectionTitle?: string;
  locationId?: ChildhoodWorldLocationId;
  locationLabel?: string;
  suggestedTitle?: string;
  suggestedDescription?: string;
  suggestedDate?: string;
  recommendedReason?: string;
  confidenceScore?: number;
  analyzedBy?: 'gemini' | 'deterministic_fallback';
  modelUsed?: string;
  isDemo?: boolean;
  isUnsorted?: boolean;
  warnings?: string[];
  thumbnailUrl?: string;
  placementApproved?: boolean;
  errorMessage?: string;
  inputSnapshot: CurationBatchItemInput;
}

export interface CurationUndoSnapshot {
  batchId: string;
  createdAt: string;
  createdMemoryIds: string[];
  createdCollectionIds: string[];
  previousMemories: Memory[];
  previousCollections: Collection[];
  previousConnections: MemoryConnection[];
  summaryLabel: string;
}

export interface CurationBatchState {
  batchId: string;
  phase: CurationLifecyclePhase;
  phaseLabel: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  items: CurationBatchItemStatus[];
  primaryReadyCollectionId?: string;
  primaryReadyCollectionTitle?: string;
  errorBannerMessage?: string;
  lastUndoSnapshot?: CurationUndoSnapshot | null;
}

export interface CuratedOrganizationProposedCollection {
  id?: string;
  title: string;
  subtitle?: string;
  curatorNote: string;
  memoryIds: string[];
  suggestedEnvironment: ChildhoodWorldLocationId;
  evidenceSummary: string;
  confidenceNote: string;
}

export interface CuratedOrganizationProposedConnection {
  sourceMemoryId: string;
  targetMemoryId: string;
  relationshipType: MemoryConnection['relationshipType'];
  relationshipLabel: string;
  evidenceReason: string;
}

export interface CuratedOrganizationProposedPlacement {
  memoryId: string;
  locationId: ChildhoodWorldLocationId;
  reason: string;
}

export interface OrganizationResultPayload {
  collections: CuratedOrganizationProposedCollection[];
  connections: CuratedOrganizationProposedConnection[];
  placements: CuratedOrganizationProposedPlacement[];
  modelUsed?: string;
}
