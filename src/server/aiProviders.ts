import { GoogleGenAI } from '@google/genai';
import {
  AICapability,
  AIProviderId,
  AIProviderStatus,
  AITaskRequest,
  ConnectionState,
  ProviderUsageMetrics,
} from '../types/aiStudio';

export interface AIProviderExecutionResult {
  data: unknown;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd?: number;
}

export interface AIProviderTestResult {
  ok: boolean;
  latencyMs: number;
  model: string;
  message: string;
}

export interface AIProviderAdapter {
  readonly id: AIProviderId;
  readonly displayName: string;
  readonly vendor: string;
  readonly credentialEnvVar: string;
  readonly supportedCapabilities: AICapability[];
  isConfigured(): boolean;
  getStatus(): AIProviderStatus;
  testConnection(): Promise<AIProviderTestResult>;
  executeTask(req: AITaskRequest): Promise<AIProviderExecutionResult>;
}

function isValidApiKey(val: string | undefined): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.length >= 10 && !trimmed.startsWith('MY_');
}

export function parseAndValidateJson<T = Record<string, unknown>>(
  rawText: string,
  requiredKeys: string[] = [],
): T {
  const cleaned = String(rawText || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        const err: any = new Error('Malformed JSON output from AI provider.');
        err.code = 'MALFORMED_AI_OUTPUT';
        throw err;
      }
    } else {
      const err: any = new Error('Malformed JSON output from AI provider.');
      err.code = 'MALFORMED_AI_OUTPUT';
      throw err;
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const err: any = new Error('AI response JSON must be an object.');
    err.code = 'MALFORMED_AI_OUTPUT';
    throw err;
  }

  for (const key of requiredKeys) {
    if (!(key in parsed) || parsed[key] === undefined) {
      const err: any = new Error(`AI response JSON is missing required key "${key}".`);
      err.code = 'MALFORMED_AI_OUTPUT';
      throw err;
    }
  }

  return parsed as T;
}

const GEMINI_CAPABILITIES: AICapability[] = [
  'caption_generation',
  'image_understanding',
  'metadata_extraction',
  'memory_classification',
  'memory_search',
  'story_writing',
  'collection_descriptions',
  'room_design',
  'image_generation',
  'video_generation',
];

const OPENAI_CAPABILITIES: AICapability[] = [
  'caption_generation',
  'image_understanding',
  'metadata_extraction',
  'memory_classification',
  'memory_search',
  'story_writing',
  'collection_descriptions',
  'room_design',
  'image_generation',
];

function buildStructuredPrompt(req: AITaskRequest): string {
  const memSummary = (req.memories || [])
    .slice(0, 20)
    .map(
      (m) =>
        `[${m.id}] "${m.title}" (${m.date || m.year || 'undated'}, ${m.location || 'unspecified'}): ${m.description || m.story || ''}`,
    )
    .join('\n');

  if (req.task === 'room_design') {
    const rd = req.roomDesignPrompt;
    return [
      `Design a curated museum room JSON for "${rd?.roomName || req.prompt || 'Personal Gallery'}".`,
      rd?.description ? `Description: ${rd.description}` : '',
      rd?.styleKeywords ? `Style: ${rd.styleKeywords}` : '',
      'Return ONLY valid JSON with keys: themeName, wallColorHex, floorTintHex, archColorHex, accentColorHex, lightingPreset, lightIntensity, exhibitLayout, decorations, roomDescription, curatorRationale.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (
    req.task === 'metadata_extraction' ||
    req.task === 'image_understanding' ||
    req.task === 'caption_generation' ||
    req.task === 'memory_classification'
  ) {
    return [
      `Extract grounded metadata JSON for this user memory input: ${req.prompt || 'Uploaded memory'}`,
      'Never invent people or dates not present in the input.',
      'Return ONLY valid JSON with keys: suggestedRoomId, suggestedRoomName, suggestedTitle, suggestedLocation, suggestedCategory, suggestedCaption, suggestedStory, suggestedTags, suggestedMotif, confidenceNote.',
    ].join('\n');
  }

  return [
    `You are the MEMORA Archival Curator. Answer strictly using the verified memories below.`,
    `User query: ${req.prompt || 'Summarize my archive.'}`,
    memSummary ? `Verified memories:\n${memSummary}` : 'No memories provided.',
    'Return ONLY valid JSON with keys: answerMarkdown, factsSummary (string[]), curatorialSuggestions (string[]), citations (array of {memoryId,title,date,location,roomId,relevanceNote}).',
  ].join('\n');
}

export class GeminiProviderAdapter implements AIProviderAdapter {
  public readonly id: AIProviderId = 'gemini';
  public readonly displayName = 'Google Gemini';
  public readonly vendor = 'Google';
  public readonly credentialEnvVar = 'GEMINI_API_KEY';
  public readonly supportedCapabilities = GEMINI_CAPABILITIES;

  private readonly getApiKey: () => string | undefined;
  private connectionStatus: ConnectionState = 'missing_credentials';
  private usage: ProviderUsageMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
  };

  constructor(getApiKey?: () => string | undefined) {
    this.getApiKey = getApiKey ?? (() => process.env.GEMINI_API_KEY);
    this.connectionStatus = this.isConfigured()
      ? 'connected'
      : 'missing_credentials';
  }

  public isConfigured(): boolean {
    return isValidApiKey(this.getApiKey());
  }

  public getStatus(): AIProviderStatus {
    const configured = this.isConfigured();
    return {
      id: this.id,
      displayName: this.displayName,
      vendor: this.vendor,
      credentialEnvVar: this.credentialEnvVar,
      configured,
      connectionStatus: configured ? this.connectionStatus : 'missing_credentials',
      enabledCapabilities: this.supportedCapabilities,
      models: {
        textModel: 'gemini-2.5-flash',
        visionModel: 'gemini-2.5-flash',
        imageModel: 'gemini-2.5-flash-image',
        videoModel: 'veo-2.0-generate-001',
      },
      costEstimateNote: 'Pay-as-you-go via server GEMINI_API_KEY.',
      setupInstructions:
        'Set GEMINI_API_KEY in your server environment to enable live Gemini curation, vision, and media generation.',
      usage: { ...this.usage },
    };
  }

  public async testConnection(): Promise<AIProviderTestResult> {
    const started = Date.now();
    const apiKey = this.getApiKey();
    if (!isValidApiKey(apiKey)) {
      this.connectionStatus = 'missing_credentials';
      return {
        ok: false,
        latencyMs: Date.now() - started,
        model: 'gemini-2.5-flash',
        message: 'GEMINI_API_KEY is not configured on the server.',
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Reply with OK.',
      });
      this.connectionStatus = 'connected';
      return {
        ok: true,
        latencyMs: Date.now() - started,
        model: 'gemini-2.5-flash',
        message: 'Google Gemini connection verified.',
      };
    } catch (err: any) {
      this.connectionStatus = 'error';
      this.usage.lastError = String(err?.message || err);
      return {
        ok: false,
        latencyMs: Date.now() - started,
        model: 'gemini-2.5-flash',
        message: `Gemini connection check failed: ${String(err?.message || err)}`,
      };
    }
  }

  public async executeTask(req: AITaskRequest): Promise<AIProviderExecutionResult> {
    const apiKey = this.getApiKey();
    if (!isValidApiKey(apiKey)) {
      const err: any = new Error('GEMINI_API_KEY is not configured.');
      err.code = 'MISSING_CREDENTIALS';
      throw err;
    }

    this.usage.totalRequests++;
    this.usage.lastUsedAt = new Date().toISOString();

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const prompt = buildStructuredPrompt(req);
      const parts: any[] = [{ text: prompt }];
      if (req.imageBase64 && req.imageMimeType) {
        parts.push({
          inlineData: {
            mimeType: req.imageMimeType,
            data: req.imageBase64.replace(/^data:[^;]+;base64,/, ''),
          },
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts }],
      });
      const text = response.text || '{}';
      const requiredKeys =
        req.task === 'room_design'
          ? ['themeName']
          : req.task === 'memory_search' || req.task === 'story_writing'
            ? ['answerMarkdown']
            : [];
      const data = parseAndValidateJson(text, requiredKeys);
      this.usage.successfulRequests++;
      this.connectionStatus = 'connected';

      return {
        data,
        modelUsed: 'gemini-2.5-flash',
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(text.length / 4),
        estimatedCostUsd: 0.0002,
      };
    } catch (err: any) {
      this.usage.failedRequests++;
      this.usage.lastError = String(err?.message || err);
      throw err;
    }
  }
}

export class OpenAIProviderAdapter implements AIProviderAdapter {
  public readonly id: AIProviderId = 'openai';
  public readonly displayName = 'OpenAI';
  public readonly vendor = 'OpenAI';
  public readonly credentialEnvVar = 'OPENAI_API_KEY';
  public readonly supportedCapabilities = OPENAI_CAPABILITIES;

  private readonly getApiKey: () => string | undefined;
  private connectionStatus: ConnectionState = 'missing_credentials';
  private usage: ProviderUsageMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
  };

  constructor(getApiKey?: () => string | undefined) {
    this.getApiKey = getApiKey ?? (() => process.env.OPENAI_API_KEY);
    this.connectionStatus = this.isConfigured()
      ? 'connected'
      : 'missing_credentials';
  }

  public isConfigured(): boolean {
    return isValidApiKey(this.getApiKey());
  }

  public getStatus(): AIProviderStatus {
    const configured = this.isConfigured();
    return {
      id: this.id,
      displayName: this.displayName,
      vendor: this.vendor,
      credentialEnvVar: this.credentialEnvVar,
      configured,
      connectionStatus: configured ? this.connectionStatus : 'missing_credentials',
      enabledCapabilities: this.supportedCapabilities,
      models: {
        textModel: 'gpt-4o-mini',
        visionModel: 'gpt-4o-mini',
        imageModel: 'gpt-image-1',
      },
      costEstimateNote: 'Pay-as-you-go via server OPENAI_API_KEY.',
      setupInstructions:
        'Set OPENAI_API_KEY in your server environment to enable OpenAI curation and image tools.',
      usage: { ...this.usage },
    };
  }

  public async testConnection(): Promise<AIProviderTestResult> {
    const started = Date.now();
    const apiKey = this.getApiKey();
    if (!isValidApiKey(apiKey)) {
      this.connectionStatus = 'missing_credentials';
      return {
        ok: false,
        latencyMs: Date.now() - started,
        model: 'gpt-4o-mini',
        message: 'OPENAI_API_KEY is not configured on the server.',
      };
    }

    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!res.ok) {
        this.connectionStatus = 'error';
        return {
          ok: false,
          latencyMs: Date.now() - started,
          model: 'gpt-4o-mini',
          message: `OpenAI API returned HTTP ${res.status}.`,
        };
      }
      this.connectionStatus = 'connected';
      return {
        ok: true,
        latencyMs: Date.now() - started,
        model: 'gpt-4o-mini',
        message: 'OpenAI connection verified.',
      };
    } catch (err: any) {
      this.connectionStatus = 'error';
      return {
        ok: false,
        latencyMs: Date.now() - started,
        model: 'gpt-4o-mini',
        message: `OpenAI connection check failed: ${String(err?.message || err)}`,
      };
    }
  }

  public async executeTask(req: AITaskRequest): Promise<AIProviderExecutionResult> {
    const apiKey = this.getApiKey();
    if (!isValidApiKey(apiKey)) {
      const err: any = new Error('OPENAI_API_KEY is not configured.');
      err.code = 'MISSING_CREDENTIALS';
      throw err;
    }

    this.usage.totalRequests++;
    this.usage.lastUsedAt = new Date().toISOString();

    try {
      const prompt = buildStructuredPrompt(req);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI API returned HTTP ${res.status}`);
      }
      const json: any = await res.json();
      const content = json?.choices?.[0]?.message?.content || '{}';
      const data = parseAndValidateJson(content);
      this.usage.successfulRequests++;
      this.connectionStatus = 'connected';
      return {
        data,
        modelUsed: 'gpt-4o-mini',
        inputTokens: json?.usage?.prompt_tokens || Math.ceil(prompt.length / 4),
        outputTokens: json?.usage?.completion_tokens || Math.ceil(content.length / 4),
        estimatedCostUsd: 0.0003,
      };
    } catch (err: any) {
      this.usage.failedRequests++;
      this.usage.lastError = String(err?.message || err);
      throw err;
    }
  }
}
