import {
  AICapability,
  AIProviderId,
  AIProviderStatus,
  AITaskRequest,
  ConnectionState,
  ProviderUsageMetrics,
} from '../types/aiStudio';
import {
  classifyGeminiError,
  GEMINI_MODELS,
  generateGeminiContentWithResilience,
  isValidGeminiApiKey,
  redactSecretsFromMessage,
  resolveGeminiModelForTask,
  sanitizeBase64ImageInput,
} from './geminiConfig';

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
  connectionStatus?: ConnectionState;
  errorCode?: string;
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
  return isValidGeminiApiKey(val);
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
      const err: any = new Error(
        `AI response JSON is missing required key "${key}".`,
      );
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

  if (req.task === 'story_writing' && req.prompt?.startsWith('__STORYBOARD__:')) {
    return [
      'Create a grounded memory film storyboard JSON from the provided memories.',
      `Context: ${req.prompt}`,
      memSummary ? `Verified memories:\n${memSummary}` : 'No memories provided.',
      'Return ONLY valid JSON with keys: filmTitle, theme, aspectRatio, totalDurationSeconds, musicalMood, scenes (array of {sceneNumber, memoryId, memoryTitle, durationSeconds, cameraMotion, caption, visualPrompt}).',
    ].join('\n');
  }

  if (
    req.task === 'metadata_extraction' ||
    req.task === 'image_understanding' ||
    req.task === 'caption_generation' ||
    req.task === 'memory_classification'
  ) {
    return [
      `Task: ${req.task}. Extract grounded metadata JSON for this user memory input: ${req.prompt || 'Uploaded memory'}`,
      'Never invent dates, identities, locations, relationships, or events not explicitly visible or provided in the input.',
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
  private hasVerifiedConnection = false;
  private lastVerifiedModel: string = GEMINI_MODELS.primary;
  private usage: ProviderUsageMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
  };

  constructor(getApiKey?: () => string | undefined) {
    this.getApiKey = getApiKey ?? (() => process.env.GEMINI_API_KEY);
    // Do not claim 'connected' merely because a key string exists in process.env.
    // 'connected' is set only after a real API call succeeds.
    this.connectionStatus = this.isConfigured()
      ? 'unverified'
      : 'missing_credentials';
  }

  public isConfigured(): boolean {
    return isValidApiKey(this.getApiKey());
  }

  public recordExternalOutcome(
    status: ConnectionState,
    errorMessage?: string,
    verifiedModel?: string,
  ): void {
    this.connectionStatus = status;
    this.usage.lastUsedAt = new Date().toISOString();
    if (status === 'connected') {
      this.hasVerifiedConnection = true;
      if (verifiedModel) {
        this.lastVerifiedModel = verifiedModel;
      }
      this.usage.lastError = undefined;
    } else if (errorMessage) {
      this.usage.lastError = redactSecretsFromMessage(errorMessage);
    }
  }

  public getStatus(): AIProviderStatus {
    const configured = this.isConfigured();
    let effectiveStatus: ConnectionState;
    if (!configured) {
      effectiveStatus = 'missing_credentials';
    } else if (this.connectionStatus === 'missing_credentials') {
      effectiveStatus = this.hasVerifiedConnection ? 'connected' : 'unverified';
    } else {
      effectiveStatus = this.connectionStatus;
    }

    return {
      id: this.id,
      displayName: this.displayName,
      vendor: this.vendor,
      credentialEnvVar: this.credentialEnvVar,
      configured,
      verified: configured && this.hasVerifiedConnection && effectiveStatus === 'connected',
      connectionStatus: effectiveStatus,
      enabledCapabilities: this.supportedCapabilities,
      models: {
        textModel: GEMINI_MODELS.primary,
        visionModel: GEMINI_MODELS.vision,
        metadataModel: GEMINI_MODELS.metadata,
        classificationModel: GEMINI_MODELS.classification,
        curationModel: GEMINI_MODELS.curation,
        imageModel: GEMINI_MODELS.image,
        videoModel: GEMINI_MODELS.video,
      },
      costEstimateNote: 'Pay-as-you-go via server GEMINI_API_KEY.',
      setupInstructions:
        'Configure GEMINI_API_KEY in server environment secrets (Settings > Secrets) to enable live Gemini curation, vision, and media analysis.',
      usage: { ...this.usage },
    };
  }

  public async testConnection(): Promise<AIProviderTestResult> {
    const started = Date.now();
    const apiKey = this.getApiKey();
    if (!isValidApiKey(apiKey)) {
      this.connectionStatus = 'missing_credentials';
      this.hasVerifiedConnection = false;
      return {
        ok: false,
        latencyMs: Date.now() - started,
        model: GEMINI_MODELS.primary,
        connectionStatus: 'missing_credentials',
        errorCode: 'MISSING_CREDENTIALS',
        message:
          'GEMINI_API_KEY is not configured on the server. Add a valid key in Settings > Secrets.',
      };
    }

    this.usage.totalRequests++;
    this.usage.lastUsedAt = new Date().toISOString();

    try {
      const result = await generateGeminiContentWithResilience({
        apiKey,
        preferredModel: GEMINI_MODELS.primary,
        contents: 'Reply with the single word OK.',
        timeoutMs: 14_000,
        maxRetriesPerModel: 1,
        allowModelFallback: true,
      });

      this.usage.successfulRequests++;
      this.hasVerifiedConnection = true;
      this.lastVerifiedModel = result.modelUsed;
      this.connectionStatus = 'connected';
      this.usage.lastError = undefined;

      const fallbackNote =
        result.modelUsed !== GEMINI_MODELS.primary
          ? ` (verified via fallback model ${result.modelUsed} while ${GEMINI_MODELS.primary} experienced high demand)`
          : ` (${result.modelUsed})`;

      return {
        ok: true,
        latencyMs: Date.now() - started,
        model: result.modelUsed,
        connectionStatus: 'connected',
        message: `Google Gemini connection verified${fallbackNote}.`,
      };
    } catch (err: unknown) {
      const classified = classifyGeminiError(err);
      this.usage.failedRequests++;
      this.connectionStatus = classified.connectionStatus;
      this.usage.lastError = classified.message;
      return {
        ok: false,
        latencyMs: Date.now() - started,
        model: GEMINI_MODELS.primary,
        connectionStatus: classified.connectionStatus,
        errorCode: classified.code,
        message: classified.message,
      };
    }
  }

  public async executeTask(
    req: AITaskRequest,
  ): Promise<AIProviderExecutionResult> {
    const apiKey = this.getApiKey();
    if (!isValidApiKey(apiKey)) {
      this.connectionStatus = 'missing_credentials';
      const err: any = new Error('GEMINI_API_KEY is not configured.');
      err.code = 'MISSING_CREDENTIALS';
      throw err;
    }

    this.usage.totalRequests++;
    this.usage.lastUsedAt = new Date().toISOString();

    const hasImageInput = Boolean(req.imageBase64 && req.imageBase64.trim());
    const targetModel = resolveGeminiModelForTask(req.task, { hasImageInput });

    try {
      const prompt = buildStructuredPrompt(req);
      const parts: any[] = [{ text: prompt }];

      if (hasImageInput) {
        const sanitizedImg = sanitizeBase64ImageInput(
          req.imageBase64,
          req.imageMimeType,
        );
        if (!sanitizedImg.ok || !sanitizedImg.base64Data || !sanitizedImg.mimeType) {
          const inputErr: any = new Error(
            sanitizedImg.errorMessage || 'Invalid image payload for Gemini vision task.',
          );
          inputErr.code = 'INVALID_INPUT';
          throw inputErr;
        }
        parts.push({
          inlineData: {
            mimeType: sanitizedImg.mimeType,
            data: sanitizedImg.base64Data,
          },
        });
      }

      const result = await generateGeminiContentWithResilience({
        apiKey,
        preferredModel: targetModel,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
        },
        timeoutMs: 20_000,
        maxRetriesPerModel: 1,
        allowModelFallback: true,
      });

      const isStoryboard =
        req.task === 'story_writing' &&
        Boolean(req.prompt?.startsWith('__STORYBOARD__:'));
      const requiredKeys =
        req.task === 'room_design'
          ? ['themeName']
          : isStoryboard
            ? ['filmTitle', 'scenes']
            : req.task === 'memory_search' || req.task === 'story_writing'
              ? ['answerMarkdown']
              : [];
      const data = parseAndValidateJson(result.text, requiredKeys);

      this.usage.successfulRequests++;
      this.hasVerifiedConnection = true;
      this.lastVerifiedModel = result.modelUsed;
      this.connectionStatus = 'connected';
      this.usage.lastError = undefined;

      const inputTokens = Math.ceil(prompt.length / 4) + (hasImageInput ? 258 : 0);
      const outputTokens = Math.ceil(result.text.length / 4);
      this.usage.estimatedInputTokens += inputTokens;
      this.usage.estimatedOutputTokens += outputTokens;

      return {
        data,
        modelUsed: result.modelUsed,
        inputTokens,
        outputTokens,
        estimatedCostUsd: 0.0002,
      };
    } catch (err: unknown) {
      if ((err as any)?.code === 'INVALID_INPUT') {
        this.usage.failedRequests++;
        throw err;
      }
      const classified = classifyGeminiError(err);
      this.usage.failedRequests++;
      this.connectionStatus = classified.connectionStatus;
      this.usage.lastError = classified.message;
      const wrapped: any = new Error(classified.message);
      wrapped.code =
        (err as any)?.code === 'MALFORMED_AI_OUTPUT'
          ? 'MALFORMED_AI_OUTPUT'
          : classified.code;
      wrapped.connectionStatus = classified.connectionStatus;
      throw wrapped;
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
  private hasVerifiedConnection = false;
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
      ? 'unverified'
      : 'missing_credentials';
  }

  public isConfigured(): boolean {
    return isValidApiKey(this.getApiKey());
  }

  public getStatus(): AIProviderStatus {
    const configured = this.isConfigured();
    let effectiveStatus: ConnectionState;
    if (!configured) {
      effectiveStatus = 'missing_credentials';
    } else if (this.connectionStatus === 'missing_credentials') {
      effectiveStatus = this.hasVerifiedConnection ? 'connected' : 'unverified';
    } else {
      effectiveStatus = this.connectionStatus;
    }

    return {
      id: this.id,
      displayName: this.displayName,
      vendor: this.vendor,
      credentialEnvVar: this.credentialEnvVar,
      configured,
      verified: configured && this.hasVerifiedConnection && effectiveStatus === 'connected',
      connectionStatus: effectiveStatus,
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
      this.hasVerifiedConnection = false;
      return {
        ok: false,
        latencyMs: Date.now() - started,
        model: 'gpt-4o-mini',
        connectionStatus: 'missing_credentials',
        errorCode: 'MISSING_CREDENTIALS',
        message: 'OPENAI_API_KEY is not configured on the server.',
      };
    }

    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!res.ok) {
        this.connectionStatus = res.status === 401 || res.status === 403 ? 'auth_failed' : 'error';
        return {
          ok: false,
          latencyMs: Date.now() - started,
          model: 'gpt-4o-mini',
          connectionStatus: this.connectionStatus,
          message: `OpenAI API returned HTTP ${res.status}.`,
        };
      }
      this.hasVerifiedConnection = true;
      this.connectionStatus = 'connected';
      return {
        ok: true,
        latencyMs: Date.now() - started,
        model: 'gpt-4o-mini',
        connectionStatus: 'connected',
        message: 'OpenAI connection verified.',
      };
    } catch (err: any) {
      this.connectionStatus = 'error';
      return {
        ok: false,
        latencyMs: Date.now() - started,
        model: 'gpt-4o-mini',
        connectionStatus: 'error',
        message: `OpenAI connection check failed: ${redactSecretsFromMessage(String(err?.message || err))}`,
      };
    }
  }

  public async executeTask(
    req: AITaskRequest,
  ): Promise<AIProviderExecutionResult> {
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
      this.hasVerifiedConnection = true;
      this.connectionStatus = 'connected';
      return {
        data,
        modelUsed: 'gpt-4o-mini',
        inputTokens: json?.usage?.prompt_tokens || Math.ceil(prompt.length / 4),
        outputTokens:
          json?.usage?.completion_tokens || Math.ceil(content.length / 4),
        estimatedCostUsd: 0.0003,
      };
    } catch (err: any) {
      this.usage.failedRequests++;
      this.usage.lastError = redactSecretsFromMessage(String(err?.message || err));
      throw err;
    }
  }
}
