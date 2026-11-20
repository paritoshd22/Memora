import {
  buildGroundedFallbackReport,
  sanitizeAndOrganizeCollections,
  validateLocationPlacement,
} from '../utils/curationValidator';
import { generateGroundedMemoryConnections } from '../utils/roomThemes';
import { INITIAL_ROOMS } from '../data/initialMuseumData';

function isValidGeminiKey(key: string | undefined): key is string {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.length >= 10 && !trimmed.startsWith('MY_');
}

export class MemoryCurationService {
  private readonly getApiKey: () => string | undefined;

  constructor(getApiKey?: () => string | undefined) {
    this.getApiKey = getApiKey ?? (() => process.env.GEMINI_API_KEY);
  }

  public isConfigured(): boolean {
    return isValidGeminiKey(this.getApiKey());
  }

  public async analyzeItem(item: any): Promise<{
    ok: boolean;
    code?: string;
    message?: string;
    suggestedTitle?: string;
    suggestedDescription?: string;
    suggestedDate?: string;
    suggestedLocation?: string;
    suggestedTags?: string[];
    suggestedPeople?: string[];
    report?: any;
  }> {
    if (!item || typeof item !== 'object') {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        message: 'Valid memory upload item is required for curation analysis.',
      };
    }

    const mediaCategory = item.detectedMediaType || 'image';
    const fileName = String(item.fileName || 'uploaded_memory');
    const report = buildGroundedFallbackReport({
      mediaCategory,
      fileName,
      rawTextContent: item.rawTextContent,
      videoDurationSeconds: item.videoDurationSeconds,
    });

    const cleanTitle =
      fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim() || 'Uploaded Memory';

    const placement = validateLocationPlacement(
      report.recommendedLocationId,
      mediaCategory,
    );

    return {
      ok: true,
      suggestedTitle: cleanTitle,
      suggestedDescription:
        report.recommendedReason ||
        `Original ${mediaCategory} preserved automatically in MEMORA.`,
      suggestedDate: report.explicitDates?.[0] || '',
      suggestedLocation: placement.catalogEntry.label,
      suggestedTags: [mediaCategory, placement.locationId],
      suggestedPeople: [],
      report,
    };
  }

  public async organizeMemoryBatch(params: {
    newMemories: any[];
    allMemories: any[];
    existingCollections: any[];
  }): Promise<{
    ok: boolean;
    code?: string;
    message?: string;
    collections: any[];
    connections: any[];
    placements: Array<{ memoryId: string; locationId: string }>;
  }> {
    const newMemories = Array.isArray(params?.newMemories) ? params.newMemories : [];
    const allMemories = Array.isArray(params?.allMemories) ? params.allMemories : [];
    const existingCollections = Array.isArray(params?.existingCollections)
      ? params.existingCollections
      : [];

    const collections = sanitizeAndOrganizeCollections({
      proposedCollections: [],
      memories: allMemories,
      existingCollections,
    });

    const placements = newMemories.map((mem: any) => {
      const validated = validateLocationPlacement(
        mem?.curatedZoneId || mem?.curationReport?.recommendedLocationId || 'keepsake_corner',
        mem?.type || mem?.mediaType || 'image',
      );
      return {
        memoryId: String(mem?.id || ''),
        locationId: validated.locationId,
      };
    });

    const connections = generateGroundedMemoryConnections(
      allMemories,
      INITIAL_ROOMS,
      'childhood',
      [],
    );

    return {
      ok: true,
      collections,
      connections,
      placements,
    };
  }
}
