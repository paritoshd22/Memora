import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { AICapability, ConnectionState } from '../types/aiStudio';

/**
 * Authoritative, single-source Gemini model configuration for MEMORA server routes.
 * Verified against the installed `@google/genai` SDK (>= 2.29.1) and official model aliases.
 * Used consistently across provider status, connection testing, image analysis,
 * metadata extraction, memory classification, and upload curation.
 */
export const GEMINI_MODELS = {
  primary: 'gemini-4-hydrogen',
  curation: 'gemini-4-hydrogen',
  vision: 'gemini-4-hydrogen',
  metadata: 'gemini-3.1-flash-lite',
  classification: 'gemini-3.1-flash-lite',
  transcribe: 'gemini-3.5-transcribe',
  image: 'gemini-3.1-flash-lite-image',
  video: 'gemini-omni-1.2-flash',
} as const;

/**
 * Ordered list of verified compatible multimodal/text models for automatic resilience
 * when a model experiences transient 503 high-demand spikes or regional availability issues.
 */
export const GEMINI_FALLBACK_TEXT_MODELS = [
  GEMINI_MODELS.primary,
  GEMINI_MODELS.metadata,
] as const;

export const ALLOWED_IMAGE_MIME_TYPES = new Set<string>([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_AUDIO_MIME_TYPES = new Set<string>([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
]);

export const ALLOWED_VIDEO_MIME_TYPES = new Set<string>([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set<string>([]);

export const SUPPORTED_SERVER_EXTENSIONS = new Set<string>([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'mp4',
  'mov',
  'webm',
  'mp3',
  'wav',
  'm4a',
  'ogg',
]);

export const DISALLOWED_BINARY_EXTENSIONS = new Set<string>([
  'pdf',
  'txt',
  'md',
  'json',
  'csv',
  'log',
  'doc',
  'docx',
  'rtf',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'html',
  'htm',
  'xml',
  'eml',
  'msg',
  'chat',
  'exe',
  'dll',
  'bat',
  'cmd',
  'sh',
  'dmg',
  'iso',
  'apk',
  'msi',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'bin',
]);

export const SUPPORTED_SERVER_FORMATS_MESSAGE =
  'Only photos (JPG, JPEG, PNG, WEBP), videos (MP4, MOV, WEBM), and music/audio (MP3, WAV, M4A, OGG) are supported. PDFs, documents, and chat files are not allowed.';

export const MAX_IMAGE_BASE64_BYTES = 10 * 1024 * 1024; // 10 MB decoded image limit
export const MAX_AUDIO_BASE64_BYTES = 8 * 1024 * 1024; // 8 MB decoded audio limit
export const MAX_DOCUMENT_BASE64_BYTES = 8 * 1024 * 1024; // 8 MB decoded document limit
export const MAX_DECLARED_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB max upload file size

/**
 * Routes each MEMORA AI capability to its designated Gemini model ID.
 */
export function resolveGeminiModelForTask(
  task: AICapability,
  options?: { hasImageInput?: boolean },
): string {
  switch (task) {
    case 'image_understanding':
      return GEMINI_MODELS.vision;
    case 'caption_generation':
      return options?.hasImageInput ? GEMINI_MODELS.vision : GEMINI_MODELS.curation;
    case 'metadata_extraction':
      return GEMINI_MODELS.metadata;
    case 'memory_classification':
      return GEMINI_MODELS.classification;
    case 'collection_descriptions':
    case 'story_writing':
    case 'memory_search':
    case 'room_design':
      return options?.hasImageInput ? GEMINI_MODELS.vision : GEMINI_MODELS.curation;
    case 'image_generation':
      return GEMINI_MODELS.image;
    case 'video_generation':
      return GEMINI_MODELS.video;
    default:
      return GEMINI_MODELS.primary;
  }
}

export type GeminiErrorCode =
  | 'MISSING_CREDENTIALS'
  | 'CONSENT_REQUIRED'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'MODEL_UNAVAILABLE'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_AI_RESPONSE'
  | 'INVALID_INPUT'
  | 'PAYLOAD_TOO_LARGE';

export interface ClassifiedGeminiError {
  code: GeminiErrorCode;
  connectionStatus: ConnectionState;
  httpStatus: number;
  retryable: boolean;
  message: string;
}

const PLACEHOLDER_KEY_PATTERNS = [
  /^MY_/i,
  /^YOUR_/i,
  /^REPLACE_/i,
  /^INSERT_/i,
  /^ENTER_/i,
  /^ADD_/i,
  /^SET_/i,
  /^TODO/i,
  /^FIXME/i,
  /^CHANGE_ME/i,
  /^EXAMPLE/i,
  /^PLACEHOLDER/i,
  /^DUMMY/i,
  /^TEST_KEY$/i,
  /^<.*>$/,
  /GEMINI_API_KEY/i,
  /^xxx+$/i,
];

/**
 * Validates that a server environment value is a real credential rather than
 * an empty string or `.env.example` placeholder. Never logs or echoes the key.
 */
export function isValidGeminiApiKey(val: string | undefined): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length < 16) return false;
  if (/\s/.test(trimmed)) return false;
  for (const pattern of PLACEHOLDER_KEY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  return true;
}

/**
 * Redacts any potential API key or bearer tokens (`AIza...`, `AQ....`, `Bearer ...`)
 * from error strings so credentials can never leak into logs, responses, or UI messages.
 */
export function redactSecretsFromMessage(input: string): string {
  if (!input) return '';
  let sanitized = input
    .replace(/AIza[0-9A-Za-z_-]{12,}/g, '[REDACTED_KEY]')
    .replace(/AQ\.[0-9A-Za-z._-]{12,}/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[0-9A-Za-z._-]{16,}/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED_KEY]');
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (envKey && envKey.length >= 10 && sanitized.includes(envKey)) {
    sanitized = sanitized.split(envKey).join('[REDACTED_KEY]');
  }
  return sanitized;
}

export interface SanitizedImagePayloadResult {
  ok: boolean;
  base64Data?: string;
  mimeType?: string;
  approximateBytes?: number;
  code?: 'INVALID_INPUT' | 'PAYLOAD_TOO_LARGE';
  httpStatus?: number;
  errorMessage?: string;
}

/**
 * Validates and normalizes base64 image payloads and MIME types before sending
 * to Gemini vision/curation endpoints.
 */
export function sanitizeBase64ImageInput(
  rawBase64: string | undefined,
  rawMimeType?: string,
  maxBytes: number = MAX_IMAGE_BASE64_BYTES,
): SanitizedImagePayloadResult {
  if (!rawBase64 || typeof rawBase64 !== 'string' || !rawBase64.trim()) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      httpStatus: 400,
      errorMessage: 'Image base64 payload is empty or missing.',
    };
  }

  let cleaned = rawBase64.trim();
  let detectedMime = (rawMimeType || '').trim().toLowerCase();

  const dataUrlMatch = cleaned.match(/^data:([^;,]+);base64,([\s\S]+)$/i);
  if (dataUrlMatch) {
    if (!detectedMime) {
      detectedMime = dataUrlMatch[1].trim().toLowerCase();
    }
    cleaned = dataUrlMatch[2].trim();
  }

  // Strip whitespace/newlines inside base64 payload
  cleaned = cleaned.replace(/\s+/g, '');

  if (cleaned.length < 8 || !/^[A-Za-z0-9+/=_-]+$/.test(cleaned)) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      httpStatus: 400,
      errorMessage: 'Malformed base64 image encoding.',
    };
  }

  // Normalize URL-safe base64 if present
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');

  if (!detectedMime) {
    detectedMime = 'image/jpeg';
  } else if (detectedMime === 'image/jpg') {
    detectedMime = 'image/jpeg';
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(detectedMime)) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      httpStatus: 400,
      errorMessage: `Unsupported image MIME type "${detectedMime}". Supported types: JPEG, PNG, WebP, GIF.`,
    };
  }

  const approximateBytes = Math.floor((cleaned.length * 3) / 4);
  if (approximateBytes > maxBytes) {
    return {
      ok: false,
      code: 'PAYLOAD_TOO_LARGE',
      httpStatus: 413,
      approximateBytes,
      errorMessage: `Image payload (${(approximateBytes / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit (${(maxBytes / (1024 * 1024)).toFixed(0)} MB).`,
    };
  }

  return {
    ok: true,
    base64Data: cleaned,
    mimeType: detectedMime,
    approximateBytes,
  };
}

export interface MediaUploadValidationResult {
  ok: boolean;
  code?: 'INVALID_INPUT' | 'PAYLOAD_TOO_LARGE';
  httpStatus?: number;
  errorMessage?: string;
}

/**
 * Validates file type, MIME type, and size limits for uploaded memory items
 * (photos, videos, audio, and text/documents) before invoking Gemini.
 */
export function validateMemoryUploadMediaInput(item: {
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  audioBase64?: string;
  audioMimeType?: string;
  documentBase64?: string;
  detectedMediaType?: string;
  sourceType?: string;
}): MediaUploadValidationResult {
  const fileName = String(item.fileName || '').trim();
  const mimeType = String(item.mimeType || '').trim().toLowerCase();
  const declaredMediaType = String(item.detectedMediaType || item.sourceType || '')
    .trim()
    .toLowerCase();
  const extMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : '';

  if (typeof item.sizeBytes === 'number' && item.sizeBytes > MAX_DECLARED_UPLOAD_BYTES) {
    return {
      ok: false,
      code: 'PAYLOAD_TOO_LARGE',
      httpStatus: 413,
      errorMessage: `"${fileName || 'Uploaded file'}" (${(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds the 50 MB upload size limit.`,
    };
  }

  if (
    declaredMediaType === 'document' ||
    declaredMediaType === 'chat' ||
    declaredMediaType === 'pdf' ||
    (typeof item.documentBase64 === 'string' && item.documentBase64.trim().length > 0)
  ) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      httpStatus: 400,
      errorMessage: `"${fileName || 'Uploaded file'}" is not supported. ${SUPPORTED_SERVER_FORMATS_MESSAGE}`,
    };
  }

  if (ext && (DISALLOWED_BINARY_EXTENSIONS.has(ext) || !SUPPORTED_SERVER_EXTENSIONS.has(ext))) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      httpStatus: 400,
      errorMessage: `"${fileName}" is not supported. ${SUPPORTED_SERVER_FORMATS_MESSAGE}`,
    };
  }

  const isKnownMime =
    !mimeType ||
    mimeType === 'application/octet-stream' ||
    ALLOWED_IMAGE_MIME_TYPES.has(mimeType) ||
    ALLOWED_AUDIO_MIME_TYPES.has(mimeType) ||
    ALLOWED_VIDEO_MIME_TYPES.has(mimeType);

  if (mimeType && mimeType !== 'application/octet-stream' && !isKnownMime) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      httpStatus: 400,
      errorMessage: `Unsupported file format "${mimeType}" for "${fileName || 'uploaded file'}". ${SUPPORTED_SERVER_FORMATS_MESSAGE}`,
    };
  }

  if (typeof item.audioBase64 === 'string' && item.audioBase64.trim().length > 0) {
    const cleanedAudio = item.audioBase64
      .trim()
      .replace(/^data:[^;]+;base64,/i, '')
      .replace(/\s+/g, '');
    const audioBytes = Math.floor((cleanedAudio.length * 3) / 4);
    if (audioBytes > MAX_AUDIO_BASE64_BYTES) {
      return {
        ok: false,
        code: 'PAYLOAD_TOO_LARGE',
        httpStatus: 413,
        errorMessage: `Audio clip (${(audioBytes / (1024 * 1024)).toFixed(1)} MB) exceeds the 8 MB server analysis limit. Trim or compress the clip and try again.`,
      };
    }
    const audioMime = String(item.audioMimeType || mimeType || '').toLowerCase();
    if (audioMime && !ALLOWED_AUDIO_MIME_TYPES.has(audioMime)) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        httpStatus: 400,
        errorMessage: `Unsupported audio MIME type "${audioMime}". Supported music/audio formats: MP3, WAV, M4A, OGG.`,
      };
    }
  }

  return { ok: true };
}

export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractCleanErrorMessage(raw: string): string {
  const trimmed = redactSecretsFromMessage(raw.trim());
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        error?: { message?: string };
        message?: string;
      };
      const inner = parsed?.error?.message || parsed?.message;
      if (typeof inner === 'string' && inner.trim().length > 0) {
        return redactSecretsFromMessage(inner.trim());
      }
    } catch {
      // Keep original string if not valid JSON
    }
  }
  return trimmed;
}

/**
 * Classifies Gemini SDK / HTTP / JSON errors into honest connection states and
 * structured error codes without leaking secrets or masking upstream failures.
 */
export function classifyGeminiError(err: unknown): ClassifiedGeminiError {
  const anyErr = err as {
    code?: string;
    status?: number;
    statusCode?: number;
    message?: string;
  };
  const code = String(anyErr?.code || '').toUpperCase();
  const status = Number(anyErr?.status || anyErr?.statusCode || 0);
  const rawMessage = extractCleanErrorMessage(
    String(anyErr?.message || err || 'Unknown Gemini error'),
  );
  const lower = rawMessage.toLowerCase();

  if (code === 'MISSING_CREDENTIALS') {
    return {
      code: 'MISSING_CREDENTIALS',
      connectionStatus: 'missing_credentials',
      httpStatus: 503,
      retryable: false,
      message:
        'GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets to enable live Gemini analysis.',
    };
  }

  if (code === 'CONSENT_REQUIRED') {
    return {
      code: 'CONSENT_REQUIRED',
      connectionStatus: 'unverified',
      httpStatus: 403,
      retryable: false,
      message:
        'Explicit privacy consent is required before sending personal memory media to Gemini.',
    };
  }

  if (
    code === 'MALFORMED_AI_OUTPUT' ||
    code === 'INVALID_AI_RESPONSE' ||
    lower.includes('malformed json') ||
    lower.includes('invalid json') ||
    lower.includes('empty response') ||
    lower.includes('missing required key')
  ) {
    return {
      code: 'INVALID_AI_RESPONSE',
      connectionStatus: 'invalid_response',
      httpStatus: 502,
      retryable: true,
      message: `Gemini returned an invalid structured response: ${rawMessage.slice(0, 160)}`,
    };
  }

  if (
    code === 'AUTHENTICATION_FAILED' ||
    status === 401 ||
    status === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('permission_denied') ||
    lower.includes('insufficient authentication scopes') ||
    lower.includes('unauthenticated') ||
    lower.includes('invalid api key')
  ) {
    return {
      code: 'AUTHENTICATION_FAILED',
      connectionStatus: 'auth_failed',
      httpStatus: 401,
      retryable: false,
      message:
        'Gemini authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }

  if (
    code === 'MODEL_UNAVAILABLE' ||
    status === 404 ||
    lower.includes('model is not found') ||
    lower.includes('models/') && lower.includes('not found') ||
    lower.includes('not supported for generatecontent')
  ) {
    return {
      code: 'MODEL_UNAVAILABLE',
      connectionStatus: 'provider_unavailable',
      httpStatus: 404,
      retryable: false,
      message: `Requested Gemini model is unavailable for this API key (${rawMessage.slice(0, 140)}).`,
    };
  }

  if (
    code === 'RATE_LIMITED' ||
    status === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('quota') ||
    lower.includes('too many requests')
  ) {
    return {
      code: 'RATE_LIMITED',
      connectionStatus: 'rate_limited',
      httpStatus: 429,
      retryable: true,
      message:
        'Gemini rate limit or quota reached. Please wait a moment and retry.',
    };
  }

  return {
    code: 'PROVIDER_UNAVAILABLE',
    connectionStatus: 'provider_unavailable',
    httpStatus: 503,
    retryable: true,
    message: `Gemini service is currently unavailable (${rawMessage.slice(0, 160)}). Please retry shortly.`,
  };
}

export interface ResilientGeminiGenerateOptions {
  apiKey: string;
  preferredModel: string;
  contents: unknown;
  config?: Record<string, unknown>;
  timeoutMs?: number;
  maxRetriesPerModel?: number;
  allowModelFallback?: boolean;
}

export interface ResilientGeminiGenerateResult {
  text: string;
  modelUsed: string;
  attempts: number;
}

/**
 * Executes `client.models.generateContent` with per-attempt timeout, exponential
 * backoff retry on transient 503/429 errors, and optional fallback across verified
 * compatible Gemini text/multimodal models (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`).
 */
export async function generateGeminiContentWithResilience(
  options: ResilientGeminiGenerateOptions,
): Promise<ResilientGeminiGenerateResult> {
  const {
    apiKey,
    preferredModel,
    contents,
    config,
    timeoutMs = 18_000,
    maxRetriesPerModel = 1,
    allowModelFallback = true,
  } = options;

  const client = createGeminiClient(apiKey);
  const candidateModels: string[] = [preferredModel];
  if (allowModelFallback) {
    for (const fallback of GEMINI_FALLBACK_TEXT_MODELS) {
      if (!candidateModels.includes(fallback)) {
        candidateModels.push(fallback);
      }
    }
  }

  let totalAttempts = 0;
  let lastError: unknown = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const modelId = candidateModels[mIdx];
    const effectiveConfig: Record<string, unknown> = { ...(config || {}) };
    if (
      !effectiveConfig.thinkingConfig &&
      (modelId === GEMINI_MODELS.primary || modelId === GEMINI_MODELS.metadata)
    ) {
      effectiveConfig.thinkingConfig = {
        thinkingLevel:
          modelId === GEMINI_MODELS.metadata
            ? ThinkingLevel.MINIMAL
            : ThinkingLevel.LOW,
      };
    }

    for (let retry = 0; retry <= maxRetriesPerModel; retry++) {
      totalAttempts++;
      let timerId: ReturnType<typeof setTimeout> | null = null;
      try {
        const response = await Promise.race([
          client.models.generateContent({
            model: modelId,
            contents: contents as any,
            config:
              Object.keys(effectiveConfig).length > 0
                ? (effectiveConfig as any)
                : undefined,
          }),
          new Promise<never>((_, reject) => {
            timerId = setTimeout(() => {
              const timeoutErr: any = new Error(
                `Gemini model ${modelId} timed out after ${timeoutMs}ms`,
              );
              timeoutErr.status = 503;
              timeoutErr.code = 'PROVIDER_UNAVAILABLE';
              timeoutErr.isTimeout = true;
              reject(timeoutErr);
            }, timeoutMs);
          }),
        ]);

        if (timerId) clearTimeout(timerId);

        const text = response.text;
        if (!text || !text.trim()) {
          const emptyErr: any = new Error('Empty response text from Gemini API.');
          emptyErr.code = 'MALFORMED_AI_OUTPUT';
          throw emptyErr;
        }

        return {
          text: text.trim(),
          modelUsed: modelId,
          attempts: totalAttempts,
        };
      } catch (err: unknown) {
        if (timerId) clearTimeout(timerId);
        lastError = err;
        const classified = classifyGeminiError(err);

        // Authentication errors are never retryable and cannot be fixed by switching models
        if (
          classified.code === 'AUTHENTICATION_FAILED' ||
          classified.code === 'MISSING_CREDENTIALS' ||
          classified.code === 'CONSENT_REQUIRED'
        ) {
          throw err;
        }

        // If model returned 404 MODEL_UNAVAILABLE or timed out and a faster fallback exists, move immediately to next model
        if (
          classified.code === 'MODEL_UNAVAILABLE' ||
          ((err as any)?.isTimeout && mIdx < candidateModels.length - 1)
        ) {
          break;
        }

        // Backoff before retrying same model if retries remain
        if (retry < maxRetriesPerModel && classified.retryable) {
          const backoffMs = 450 * Math.pow(2, retry);
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    }
  }

  throw lastError || new Error('Gemini request failed after retries.');
}
