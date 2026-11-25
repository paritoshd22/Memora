import {
  CHILDHOOD_WORLD_LOCATION_CATALOGUE,
  ChildhoodWorldLocationId,
  MemoryAnalysisReport,
} from '../types/curation';
import type { ConnectionState } from '../types/aiStudio';
import {
  parseChatExportText,
  sanitizeAndOrganizeCollections,
  validateLocationPlacement,
} from '../utils/curationValidator';
import { generateGroundedMemoryConnections } from '../utils/roomThemes';
import { INITIAL_ROOMS } from '../data/initialMuseumData';
import { parseAndValidateJson } from './aiProviders';
import {
  classifyGeminiError,
  GEMINI_MODELS,
  generateGeminiContentWithResilience,
  isValidGeminiApiKey,
  redactSecretsFromMessage,
  sanitizeBase64ImageInput,
} from './geminiConfig';

export interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export type GeminiModelExecutor = (params: {
  apiKey: string;
  model: string;
  parts: GeminiContentPart[];
  responseMimeType?: string;
}) => Promise<string>;

export interface MemoryCurationServiceOptions {
  getApiKey?: () => string | undefined;
  executeModel?: GeminiModelExecutor;
  onStatusUpdate?: (status: ConnectionState, errorMessage?: string) => void;
  timeoutMs?: number;
}

export interface CurationAnalysisResult {
  ok: boolean;
  analyzedBy: 'gemini' | 'none';
  modelUsed?: string;
  isDemo: boolean;
  confidenceScore?: number;
  warnings: string[];
  isUnsorted?: boolean;
  connectionStatus: ConnectionState;
  code?: string;
  httpStatus?: number;
  retryable?: boolean;
  message?: string;
  suggestedTitle?: string;
  suggestedDescription?: string;
  suggestedDate?: string;
  suggestedLocation?: string;
  suggestedTags?: string[];
  suggestedPeople?: string[];
  report?: MemoryAnalysisReport;
}

export const LOW_CONFIDENCE_THRESHOLD = 0.55;

const VALID_LOCATION_LIST = Object.values(CHILDHOOD_WORLD_LOCATION_CATALOGUE)
  .map((c) => `- "${c.id}": ${c.label} (${c.experienceSummary})`)
  .join('\n');

function extractBase64Payload(
  dataOrUrl: string | undefined,
  fallbackMime: string,
): { mimeType: string; data: string } | null {
  if (!dataOrUrl || typeof dataOrUrl !== 'string') return null;
  const trimmed = dataOrUrl.trim();
  if (!trimmed) return null;
  if (fallbackMime.startsWith('image/')) {
    const sanitized = sanitizeBase64ImageInput(trimmed, fallbackMime);
    if (sanitized.ok && sanitized.base64Data && sanitized.mimeType) {
      return {
        mimeType: sanitized.mimeType,
        data: sanitized.base64Data,
      };
    }
    return null;
  }
  const match = trimmed.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (match) {
    return {
      mimeType: match[1].trim() || fallbackMime,
      data: match[2].replace(/\s+/g, ''),
    };
  }
  // Plain base64 string (no data: prefix)
  if (/^[A-Za-z0-9+/=\s_-]+$/.test(trimmed) && trimmed.length >= 16) {
    return {
      mimeType: fallbackMime,
      data: trimmed.replace(/\s+/g, ''),
    };
  }
  return null;
}

function asCleanStringArray(val: unknown, max = 12): string[] {
  if (!Array.isArray(val)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of val) {
    const s = String(item || '').trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s.slice(0, 140));
    if (out.length >= max) break;
  }
  return out;
}

async function defaultGeminiExecutor(params: {
  apiKey: string;
  model: string;
  parts: GeminiContentPart[];
  responseMimeType?: string;
}): Promise<string> {
  const res = await generateGeminiContentWithResilience({
    apiKey: params.apiKey,
    preferredModel: params.model,
    contents: { parts: params.parts as any },
    config: params.responseMimeType
      ? { responseMimeType: params.responseMimeType }
      : undefined,
    timeoutMs: 20_000,
    maxRetriesPerModel: 1,
    allowModelFallback: true,
  });
  return res.text;
}

export class MemoryCurationService {
  private readonly getApiKey: () => string | undefined;
  private readonly executeModel: GeminiModelExecutor;
  private readonly onStatusUpdate?: (
    status: ConnectionState,
    errorMessage?: string,
  ) => void;
  private readonly timeoutMs: number;
  private connectionStatus: ConnectionState = 'missing_credentials';
  private hasVerifiedConnection = false;
  private lastError?: string;
  private lastCheckedAt?: string;

  constructor(
    optionsOrGetKey?: MemoryCurationServiceOptions | (() => string | undefined),
  ) {
    if (typeof optionsOrGetKey === 'function') {
      this.getApiKey = optionsOrGetKey;
      this.executeModel = defaultGeminiExecutor;
      this.timeoutMs = 30000;
    } else {
      this.getApiKey =
        optionsOrGetKey?.getApiKey ?? (() => process.env.GEMINI_API_KEY);
      this.executeModel =
        optionsOrGetKey?.executeModel ?? defaultGeminiExecutor;
      this.onStatusUpdate = optionsOrGetKey?.onStatusUpdate;
      this.timeoutMs = optionsOrGetKey?.timeoutMs ?? 30000;
    }
    // Do not display 'connected' merely because a key exists; require an API request to succeed.
    this.connectionStatus = this.isConfigured()
      ? 'unverified'
      : 'missing_credentials';
  }

  private async runModelWithTimeout(params: {
    apiKey: string;
    model: string;
    parts: GeminiContentPart[];
    responseMimeType?: string;
  }): Promise<string> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.executeModel(params),
        new Promise<string>((_, reject) => {
          timer = setTimeout(() => {
            const timeoutErr: any = new Error(
              `Gemini request timed out after ${Math.round(this.timeoutMs / 1000)}s.`,
            );
            timeoutErr.status = 504;
            timeoutErr.code = 'PROVIDER_UNAVAILABLE';
            reject(timeoutErr);
          }, this.timeoutMs);
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  public isConfigured(): boolean {
    return isValidGeminiApiKey(this.getApiKey());
  }

  public getStatus(): {
    configured: boolean;
    verified: boolean;
    connectionStatus: ConnectionState;
    model: string;
    models: {
      primary: string;
      curation: string;
      vision: string;
      metadata: string;
      classification: string;
      transcribe: string;
      image: string;
      video: string;
    };
    lastError?: string;
    lastCheckedAt?: string;
  } {
    const configured = this.isConfigured();
    const effectiveStatus: ConnectionState = !configured
      ? 'missing_credentials'
      : this.connectionStatus === 'missing_credentials'
        ? this.hasVerifiedConnection
          ? 'connected'
          : 'unverified'
        : this.connectionStatus;
    return {
      configured,
      verified: configured && this.hasVerifiedConnection && effectiveStatus === 'connected',
      connectionStatus: effectiveStatus,
      model: GEMINI_MODELS.curation,
      models: {
        primary: GEMINI_MODELS.primary,
        curation: GEMINI_MODELS.curation,
        vision: GEMINI_MODELS.vision,
        metadata: GEMINI_MODELS.metadata,
        classification: GEMINI_MODELS.classification,
        transcribe: GEMINI_MODELS.transcribe,
        image: GEMINI_MODELS.image,
        video: GEMINI_MODELS.video,
      },
      lastError: this.lastError,
      lastCheckedAt: this.lastCheckedAt,
    };
  }

  private setStatus(status: ConnectionState, errorMessage?: string): void {
    this.connectionStatus = status;
    if (status === 'connected') {
      this.hasVerifiedConnection = true;
    }
    this.lastCheckedAt = new Date().toISOString();
    this.lastError =
      status === 'connected'
        ? undefined
        : errorMessage
          ? redactSecretsFromMessage(errorMessage)
          : undefined;
    this.onStatusUpdate?.(status, this.lastError);
  }

  public async analyzeItem(
    item: any,
    options: { consentGranted?: boolean } = {},
  ): Promise<CurationAnalysisResult> {
    if (!item || typeof item !== 'object') {
      return {
        ok: false,
        analyzedBy: 'none',
        isDemo: false,
        warnings: ['Invalid or empty upload payload.'],
        connectionStatus: this.isConfigured()
          ? this.connectionStatus
          : 'missing_credentials',
        code: 'INVALID_INPUT',
        httpStatus: 400,
        retryable: false,
        message: 'Valid memory upload item is required for curation analysis.',
      };
    }

    const consentGranted =
      options.consentGranted !== false && item.consentGranted !== false;
    if (!consentGranted) {
      return {
        ok: false,
        analyzedBy: 'none',
        isDemo: false,
        warnings: ['User consent is required before sending media to Gemini.'],
        connectionStatus: this.isConfigured()
          ? this.connectionStatus
          : 'missing_credentials',
        code: 'CONSENT_REQUIRED',
        httpStatus: 403,
        retryable: false,
        message:
          'Explicit privacy consent is required before sending uploaded memory media to Gemini.',
      };
    }

    const apiKey = this.getApiKey();
    if (!isValidGeminiApiKey(apiKey)) {
      this.setStatus(
        'missing_credentials',
        'GEMINI_API_KEY is not configured on the server.',
      );
      return {
        ok: false,
        analyzedBy: 'none',
        isDemo: false,
        warnings: ['GEMINI_API_KEY is not configured on the server.'],
        connectionStatus: 'missing_credentials',
        code: 'MISSING_CREDENTIALS',
        httpStatus: 503,
        retryable: false,
        message:
          'GEMINI_API_KEY is not configured on the server. Live Gemini analysis is unavailable until configured in Settings > Secrets.',
      };
    }

    const rawMediaHint = String(
      item.detectedMediaType || item.mediaType || '',
    )
      .trim()
      .toLowerCase();
    const mimeHint = String(item.mimeType || '').trim().toLowerCase();
    const mediaCategory =
      rawMediaHint === 'audio' || mimeHint.startsWith('audio/')
        ? 'audio'
        : rawMediaHint === 'video' || mimeHint.startsWith('video/')
          ? 'video'
          : rawMediaHint === 'certificate'
            ? 'certificate'
            : rawMediaHint === 'chat'
              ? 'chat'
              : rawMediaHint === 'story'
                ? 'story'
                : rawMediaHint === 'document' || mimeHint === 'application/pdf'
                  ? 'document'
                  : 'image';
    const fileName = String(item.fileName || 'uploaded_memory').slice(0, 180);
    const rawTextContent =
      typeof item.rawTextContent === 'string'
        ? item.rawTextContent.slice(0, 12000)
        : undefined;

    // Optional real Gemini audio transcription step for uploaded audio
    let transcriptFromGemini: string | undefined;
    const audioPayload =
      mediaCategory === 'audio'
        ? extractBase64Payload(
            item.audioBase64 || item.originalDataUrl,
            item.audioMimeType || item.mimeType || 'audio/mpeg',
          )
        : null;

    if (audioPayload) {
      try {
        const transcriptRaw = await this.runModelWithTimeout({
          apiKey,
          model: GEMINI_MODELS.transcribe,
          parts: [
            {
              inlineData: {
                mimeType: audioPayload.mimeType,
                data: audioPayload.data,
              },
            },
            {
              text: 'Transcribe any spoken words verbatim. If this audio is purely instrumental music or ambient sound with no speech, reply with an empty string.',
            },
          ],
        });
        if (transcriptRaw && transcriptRaw.length > 0) {
          transcriptFromGemini = transcriptRaw.slice(0, 4000);
        }
      } catch (transcribeErr: unknown) {
        const classified = classifyGeminiError(transcribeErr);
        // Auth or rate-limit errors fail immediately rather than silently masking
        if (
          classified.code === 'AUTHENTICATION_FAILED' ||
          classified.code === 'RATE_LIMITED'
        ) {
          this.setStatus(classified.connectionStatus, classified.message);
          return {
            ok: false,
            analyzedBy: 'none',
            isDemo: false,
            warnings: [classified.message],
            connectionStatus: classified.connectionStatus,
            code: classified.code,
            httpStatus: classified.httpStatus,
            retryable: classified.retryable,
            message: classified.message,
          };
        }
      }
    }

    // Build multimodal parts for live Gemini analysis
    const parts: GeminiContentPart[] = [];

    const rawCandidateImage =
      item.analysisImageBase64 ||
      item.imageBase64 ||
      item.base64 ||
      (item.mimeType?.startsWith('image/') ? item.originalDataUrl : undefined);
    const candidateImageMime =
      item.analysisImageMimeType || item.imageMimeType || item.mimeType || 'image/jpeg';

    if (
      (mediaCategory === 'image' ||
        mediaCategory === 'certificate' ||
        mediaCategory === 'document') &&
      typeof rawCandidateImage === 'string' &&
      rawCandidateImage.trim().length > 0
    ) {
      const sanitizedImg = sanitizeBase64ImageInput(
        rawCandidateImage,
        candidateImageMime,
      );
      if (!sanitizedImg.ok || !sanitizedImg.base64Data || !sanitizedImg.mimeType) {
        return {
          ok: false,
          analyzedBy: 'none',
          isDemo: false,
          warnings: [sanitizedImg.errorMessage || 'Invalid image payload.'],
          connectionStatus: this.getStatus().connectionStatus,
          code: 'INVALID_INPUT',
          httpStatus: 400,
          retryable: false,
          message:
            sanitizedImg.errorMessage ||
            'The uploaded image payload or MIME type could not be validated for Gemini analysis.',
        };
      }
      parts.push({
        inlineData: {
          mimeType: sanitizedImg.mimeType,
          data: sanitizedImg.base64Data,
        },
      });
    }

    if (
      mediaCategory === 'video' &&
      Array.isArray(item.videoKeyframesBase64) &&
      item.videoKeyframesBase64.length > 0
    ) {
      for (const frame of item.videoKeyframesBase64.slice(0, 3)) {
        const framePayload = extractBase64Payload(frame, 'image/jpeg');
        if (framePayload) {
          parts.push({
            inlineData: {
              mimeType: framePayload.mimeType,
              data: framePayload.data,
            },
          });
        }
      }
    }

    const parsedChat =
      mediaCategory === 'chat' && rawTextContent
        ? parseChatExportText(rawTextContent, fileName)
        : undefined;

    const systemGroundedPrompt = [
      'You are the MEMORA Archival Memory Curator.',
      'Analyze the uploaded memory media and metadata strictly from observable evidence.',
      'STRICT ANTI-FABRICATION RULES:',
      '- NEVER invent dates, years, ages, personal identities, names, locations, relationships, or events that are not directly visible in the media or explicitly written in the text/filename.',
      '- Leave suggestedDate, suggestedLocation, and suggestedPeople empty if not explicitly evidenced.',
      '- Clearly separate directly observed facts ("verifiedFacts") from tentative visual/contextual suggestions ("aiInferences") and unknown details ("uncertainInfo").',
      '',
      `File Name: ${fileName}`,
      `Detected Media Category: ${mediaCategory}`,
      item.userTitle ? `User-Provided Title Hint: ${String(item.userTitle).slice(0, 120)}` : '',
      item.userDescription
        ? `User-Provided Description Hint: ${String(item.userDescription).slice(0, 400)}`
        : '',
      item.userDate ? `User-Provided Date/Year Hint: ${String(item.userDate).slice(0, 40)}` : '',
      item.videoDurationSeconds
        ? `Video Duration: ${item.videoDurationSeconds}s`
        : '',
      rawTextContent
        ? `Provided Text Content:\n"""\n${rawTextContent.slice(0, 4500)}\n"""`
        : '',
      transcriptFromGemini
        ? `Audio Transcript:\n"""\n${transcriptFromGemini.slice(0, 2500)}\n"""`
        : '',
      '',
      'Available MEMORA Childhood World Locations (pick ONE valid recommendedLocationId):',
      VALID_LOCATION_LIST,
      '',
      'Return ONLY a single JSON object with these exact keys:',
      '{',
      '  "suggestedTitle": string (concise, grounded, non-melodramatic title),',
      '  "suggestedDescription": string (1-2 factual archival sentences describing only what is observed),',
      '  "suggestedDate": string (explicit date/year ONLY if visible or written, otherwise ""),',
      '  "suggestedLocation": string (explicit place name ONLY if visible or written, otherwise ""),',
      '  "suggestedTags": string[] (2-6 factual keywords),',
      '  "suggestedPeople": string[] (names ONLY if explicitly written/labeled, otherwise []),',
      '  "mainSubject": string,',
      '  "eventContext": string,',
      '  "detectedObjects": string[],',
      '  "detectedActivities": string[],',
      '  "sceneCues": string[],',
      '  "extractedText": string,',
      '  "explicitDates": string[],',
      '  "topics": string[],',
      '  "audioKind": "music" | "speech" | "environmental" (optional for audio),',
      '  "verifiedFacts": string[] (at least 1 directly observed fact),',
      '  "aiInferences": string[],',
      '  "uncertainInfo": string[],',
      '  "recommendedLocationId": one of the exact IDs listed above,',
      '  "recommendedReason": string (1 factual sentence explaining why this museum location fits),',
      '  "confidenceScore": number between 0 and 1',
      '}',
    ]
      .filter(Boolean)
      .join('\n');

    parts.push({ text: systemGroundedPrompt });

    const hasInlineVisual = parts.some((p) => Boolean(p.inlineData));
    const targetCurationModel = hasInlineVisual
      ? GEMINI_MODELS.vision
      : GEMINI_MODELS.curation;

    try {
      const rawResponseText = await this.runModelWithTimeout({
        apiKey,
        model: targetCurationModel,
        parts,
        responseMimeType: 'application/json',
      });

      if (!rawResponseText) {
        const emptyErr: any = new Error(
          'Gemini returned an empty response for upload curation.',
        );
        emptyErr.code = 'INVALID_AI_RESPONSE';
        throw emptyErr;
      }

      const parsed = parseAndValidateJson<Record<string, any>>(
        rawResponseText,
        ['suggestedTitle', 'recommendedLocationId'],
      );

      const warnings: string[] = [];
      const rawConfidence = Number(parsed.confidenceScore);
      const confidenceScore = Number.isFinite(rawConfidence)
        ? Math.max(0, Math.min(1, rawConfidence))
        : 0.78;

      const isLowConfidence = confidenceScore < LOW_CONFIDENCE_THRESHOLD;
      const requestedLocation = isLowConfidence
        ? 'keepsake_corner'
        : String(parsed.recommendedLocationId || 'keepsake_corner');

      const placement = validateLocationPlacement(
        requestedLocation,
        mediaCategory,
      );

      if (isLowConfidence) {
        warnings.push(
          `Low analysis confidence (${Math.round(confidenceScore * 100)}%) — placed in Keepsake Corner (Unsorted) for your review.`,
        );
      }
      if (placement.wasCorrected && placement.correctionNote) {
        warnings.push(placement.correctionNote);
      }

      const cleanTitle =
        String(item.userTitle || '').trim().slice(0, 120) ||
        String(parsed.suggestedTitle || '').trim().slice(0, 120) ||
        fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() ||
        'Uploaded Memory';

      const cleanDescription =
        String(item.userDescription || '').trim().slice(0, 420) ||
        String(parsed.suggestedDescription || '').trim().slice(0, 420) ||
        String(parsed.recommendedReason || '').trim().slice(0, 420) ||
        `Original ${mediaCategory} preserved in MEMORA.`;

      const explicitDates = asCleanStringArray(parsed.explicitDates, 6);
      const suggestedDate =
        String(item.userDate || '').trim().slice(0, 40) ||
        String(parsed.suggestedDate || '').trim().slice(0, 40) ||
        explicitDates[0] ||
        '';
      const suggestedLocation = String(parsed.suggestedLocation || '')
        .trim()
        .slice(0, 100);
      const suggestedTags = asCleanStringArray(parsed.suggestedTags, 8);
      const suggestedPeople = asCleanStringArray(parsed.suggestedPeople, 10);

      const verifiedFacts = asCleanStringArray(parsed.verifiedFacts, 8);
      if (verifiedFacts.length === 0) {
        verifiedFacts.push(`Original ${mediaCategory} file "${fileName}" preserved.`);
      }

      const report: MemoryAnalysisReport = {
        analyzedBy: 'gemini',
        modelUsed: targetCurationModel,
        analyzedAt: new Date().toISOString(),
        mediaCategory,
        mainSubject: String(parsed.mainSubject || cleanTitle).trim().slice(0, 140),
        eventContext: String(parsed.eventContext || '').trim().slice(0, 160) || undefined,
        confidenceScore,
        detectedObjects: asCleanStringArray(parsed.detectedObjects, 10),
        detectedActivities: asCleanStringArray(parsed.detectedActivities, 8),
        sceneCues: asCleanStringArray(parsed.sceneCues, 8),
        extractedText: String(parsed.extractedText || '').trim().slice(0, 2000) || undefined,
        documentType:
          mediaCategory === 'certificate' || mediaCategory === 'document'
            ? String(parsed.documentType || mediaCategory).slice(0, 60)
            : undefined,
        explicitDates,
        topics: asCleanStringArray(parsed.topics, 8),
        transcript: transcriptFromGemini,
        audioKind:
          parsed.audioKind === 'music' ||
          parsed.audioKind === 'speech' ||
          parsed.audioKind === 'environmental'
            ? parsed.audioKind
            : undefined,
        parsedChatMessages: parsedChat?.messages,
        verifiedFacts,
        aiInferences: asCleanStringArray(parsed.aiInferences, 8),
        uncertainInfo: asCleanStringArray(parsed.uncertainInfo, 8),
        recommendedRoomId: 'childhood',
        recommendedLocationId: placement.locationId,
        recommendedDisplayObject: placement.catalogEntry.linkedObjectId,
        recommendedInteraction: placement.catalogEntry.experienceSummary,
        recommendedReason: isLowConfidence
          ? `Confidence was low (${Math.round(confidenceScore * 100)}%); placed in Keepsake Corner / Unsorted until you confirm a location.`
          : String(parsed.recommendedReason || '').trim().slice(0, 260) ||
            placement.catalogEntry.experienceSummary,
        sensitiveReconstructionRequiresApproval: false,
        autoPlacedIn3D: !isLowConfidence,
      };

      this.setStatus('connected');

      return {
        ok: true,
        analyzedBy: 'gemini',
        modelUsed: targetCurationModel,
        isDemo: false,
        confidenceScore,
        warnings,
        isUnsorted: isLowConfidence,
        connectionStatus: 'connected',
        httpStatus: 200,
        suggestedTitle: cleanTitle,
        suggestedDescription: cleanDescription,
        suggestedDate,
        suggestedLocation,
        suggestedTags:
          suggestedTags.length > 0
            ? suggestedTags
            : [mediaCategory, placement.locationId],
        suggestedPeople:
          suggestedPeople.length > 0
            ? suggestedPeople
            : parsedChat?.participants || [],
        report,
      };
    } catch (err: unknown) {
      const classified = classifyGeminiError(err);
      this.setStatus(classified.connectionStatus, classified.message);
      return {
        ok: false,
        analyzedBy: 'none',
        isDemo: false,
        warnings: [classified.message],
        connectionStatus: classified.connectionStatus,
        code: classified.code,
        httpStatus: classified.httpStatus,
        retryable: classified.retryable,
        message: classified.message,
      };
    }
  }

  public async organizeMemoryBatch(params: {
    newMemories: any[];
    allMemories: any[];
    existingCollections: any[];
  }): Promise<{
    ok: boolean;
    analyzedBy: 'gemini' | 'local_organizer';
    modelUsed?: string;
    code?: string;
    message?: string;
    collections: any[];
    connections: any[];
    placements: Array<{ memoryId: string; locationId: ChildhoodWorldLocationId }>;
  }> {
    const newMemories = Array.isArray(params?.newMemories)
      ? params.newMemories
      : [];
    const allMemories = Array.isArray(params?.allMemories)
      ? params.allMemories
      : [];
    const existingCollections = Array.isArray(params?.existingCollections)
      ? params.existingCollections
      : [];

    let proposedCollections: any[] = [];
    let analyzedBy: 'gemini' | 'local_organizer' = 'local_organizer';
    let modelUsed: string | undefined;

    const apiKey = this.getApiKey();
    if (isValidGeminiApiKey(apiKey) && allMemories.length > 0) {
      try {
        const memSummaries = allMemories
          .slice(0, 30)
          .map(
            (m: any) =>
              `- id="${m.id}" | title="${m.title}" | type="${m.type || m.mediaType || 'image'}" | date="${m.date || ''}" | location="${m.location || ''}" | zone="${m.curatedZoneId || 'keepsake_corner'}" | tags=[${(m.tags || []).join(', ')}]`,
          )
          .join('\n');

        const prompt = [
          'Group the verified MEMORA memories below into 1-4 concise, evidence-backed archival collections.',
          'NEVER fabricate dates, names, locations, or events not present in the memory list.',
          'Memories:',
          memSummaries,
          'Return ONLY valid JSON: { "collections": [{ "title": string, "subtitle": string, "curatorNote": string, "memoryIds": string[], "suggestedEnvironment": string, "evidenceSummary": string, "confidenceNote": string }] }',
        ].join('\n');

        const raw = await this.executeModel({
          apiKey,
          model: GEMINI_MODELS.curation,
          parts: [{ text: prompt }],
          responseMimeType: 'application/json',
        });

        if (raw) {
          const parsed = parseAndValidateJson<{ collections?: any[] }>(raw);
          if (Array.isArray(parsed.collections)) {
            proposedCollections = parsed.collections;
            analyzedBy = 'gemini';
            modelUsed = GEMINI_MODELS.curation;
            this.setStatus('connected');
          }
        }
      } catch (err: unknown) {
        const classified = classifyGeminiError(err);
        this.setStatus(classified.connectionStatus, classified.message);
      }
    }

    const collections = sanitizeAndOrganizeCollections({
      proposedCollections,
      memories: allMemories,
      existingCollections,
    });

    const placements = newMemories.map((mem: any) => {
      const validated = validateLocationPlacement(
        mem?.curatedZoneId ||
          mem?.curationReport?.recommendedLocationId ||
          'keepsake_corner',
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
      analyzedBy,
      modelUsed,
      collections,
      connections,
      placements,
    };
  }
}
