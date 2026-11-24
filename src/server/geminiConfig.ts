import { GoogleGenAI } from '@google/genai';
import type { ConnectionState } from '../types/aiStudio';

/**
 * Authoritative, single-source Gemini model configuration for MEMORA server routes.
 * Verified against the installed `@google/genai` SDK (>= 2.29.1).
 * Used consistently across provider status, connection testing, image analysis,
 * metadata extraction, memory classification, and upload curation.
 */
export const GEMINI_MODELS = {
  primary: 'gemini-4-hydrogen',
  curation: 'gemini-4-hydrogen',
  vision: 'gemini-4-hydrogen',
  metadata: 'gemini-4-hydrogen',
  classification: 'gemini-4-hydrogen',
  transcribe: 'gemini-3.5-transcribe',
  image: 'gemini-3.1-flash-lite-image',
  video: 'gemini-omni-1.2-flash',
} as const;

export type GeminiErrorCode =
  | 'MISSING_CREDENTIALS'
  | 'CONSENT_REQUIRED'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_AI_RESPONSE';

export interface ClassifiedGeminiError {
  code: GeminiErrorCode;
  connectionStatus: ConnectionState;
  httpStatus: number;
  retryable: boolean;
  message: string;
}

export function isValidGeminiApiKey(val: string | undefined): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.length >= 10 && !trimmed.startsWith('MY_');
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
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        error?: { message?: string };
        message?: string;
      };
      const inner = parsed?.error?.message || parsed?.message;
      if (typeof inner === 'string' && inner.trim().length > 0) {
        return inner.trim();
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
      connectionStatus: 'connected',
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
