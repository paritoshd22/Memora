import {
  AIProviderId,
  AIProviderStatus,
  AITaskRequest,
  AITaskResponse,
  CuratorCitation,
  CuratorResponsePayload,
} from '../types/aiStudio';
import {
  AIProviderAdapter,
  AIProviderTestResult,
  GeminiProviderAdapter,
  OpenAIProviderAdapter,
} from './aiProviders';
import { buildSynthesizedRoomDesignConfig } from '../utils/roomCategoryExperience';

export interface AIRouterOptions {
  adapters?: AIProviderAdapter[];
  maxRequestsPerMinute?: number;
}

export class AIRouter {
  private readonly adapters: Map<AIProviderId, AIProviderAdapter> = new Map();
  private readonly maxRequestsPerMinute: number;
  private readonly userHits: Map<string, number[]> = new Map();

  constructor(options: AIRouterOptions = {}) {
    const adapterList = options.adapters ?? [
      new GeminiProviderAdapter(),
      new OpenAIProviderAdapter(),
    ];
    for (const adapter of adapterList) {
      this.adapters.set(adapter.id, adapter);
    }
    this.maxRequestsPerMinute = options.maxRequestsPerMinute ?? 30;
  }

  public getProvider(id: AIProviderId): AIProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAllProviderStatuses(): AIProviderStatus[] {
    return Array.from(this.adapters.values()).map((a) => a.getStatus());
  }

  public async testProviderConnection(
    id: AIProviderId,
  ): Promise<AIProviderTestResult> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return {
        ok: false,
        latencyMs: 0,
        model: 'unknown',
        message: `Unknown AI provider "${id}".`,
      };
    }
    return adapter.testConnection();
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const key = userId || 'anonymous';
    const recent = (this.userHits.get(key) || []).filter((t) => now - t < 60_000);
    if (recent.length >= this.maxRequestsPerMinute) {
      this.userHits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.userHits.set(key, recent);
    return true;
  }

  private executeGroundedDemo(req: AITaskRequest): unknown {
    const memories = Array.isArray(req.memories) ? req.memories : [];
    const query = String(req.prompt || '').trim();

    if (req.task === 'room_design') {
      const rd = req.roomDesignPrompt;
      return buildSynthesizedRoomDesignConfig({
        roomName: rd?.roomName || query || 'Personal Gallery',
        promptOrNotes: rd?.description || rd?.styleKeywords || query,
        memories: memories as any,
      });
    }

    if (
      req.task === 'metadata_extraction' ||
      req.task === 'image_understanding' ||
      req.task === 'caption_generation' ||
      req.task === 'memory_classification'
    ) {
      const cleanTitle = query
        ? query.slice(0, 64)
        : 'Preserved Personal Memory';
      return {
        suggestedRoomId: 'childhood',
        suggestedRoomName: 'Childhood Room',
        suggestedTitle: cleanTitle,
        suggestedLocation: 'Personal Archive',
        suggestedCategory: 'Archive Keepsake',
        suggestedCaption: `Grounded local curation summary for "${cleanTitle}".`,
        suggestedStory: query || 'Preserved inside MEMORA.',
        suggestedTags: ['archive', 'personal'],
        suggestedMotif: 'treehouse_meadow',
        confidenceNote: 'Generated locally in grounded demo mode without external API calls.',
      };
    }

    // Grounded local memory search / curator response strictly from supplied memories
    const tokens = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3);

    const scored = memories
      .map((m) => {
        const haystack = [
          m.title,
          m.location,
          m.category,
          m.description,
          m.story,
          ...(m.tags || []),
          String(m.year || ''),
          m.date,
        ]
          .join(' ')
          .toLowerCase();
        const matchCount =
          tokens.length === 0
            ? 1
            : tokens.reduce((acc, tok) => acc + (haystack.includes(tok) ? 1 : 0), 0);
        return { memory: m, matchCount };
      })
      .filter((entry) => entry.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);

    const citations: CuratorCitation[] = scored.slice(0, 6).map(({ memory }) => ({
      memoryId: memory.id,
      title: memory.title,
      date: memory.date || String(memory.year || ''),
      location: memory.location || 'Archive',
      roomId: memory.roomId || 'childhood',
      relevanceNote: `Matched directly in your verified archive (${memory.location || memory.category}).`,
    }));

    const payload: CuratorResponsePayload = {
      answerMarkdown:
        citations.length > 0
          ? `Found **${citations.length}** verified ${citations.length === 1 ? 'memory' : 'memories'} matching "${query || 'your archive'}": ${citations.map((c) => `**${c.title}** (${c.location})`).join(', ')}.`
          : 'No matching memories were found in your current archive for that query.',
      factsSummary: citations.map(
        (c) => `${c.title}${c.date ? ` (${c.date})` : ''}${c.location ? ` — ${c.location}` : ''}`,
      ),
      curatorialSuggestions:
        citations.length > 0
          ? ['Group these memories into a dedicated curated collection.']
          : ['Upload photographs, stories, or videos to expand your personal archive.'],
      citations,
    };

    return payload;
  }

  public async routeTask(req: AITaskRequest): Promise<AITaskResponse> {
    const started = Date.now();

    // 1. Cross-user memory ownership isolation
    if (Array.isArray(req.memories) && req.userId) {
      const foreign = req.memories.find(
        (m) => m.ownerId && m.ownerId !== req.userId,
      );
      if (foreign) {
        return {
          ok: false,
          task: req.task,
          providerUsed: req.providerId || 'gemini',
          modelUsed: 'none',
          isDemo: Boolean(req.demoMode),
          latencyMs: Date.now() - started,
          error: {
            code: 'UNAUTHORIZED_MEMORY_ACCESS',
            message:
              'Access denied: memory payload contains records owned by a different user.',
            canUseDemoFallback: false,
          },
        };
      }
    }

    // 2. Per-user sliding-window rate limiting
    if (!this.checkRateLimit(req.userId)) {
      return {
        ok: false,
        task: req.task,
        providerUsed: req.demoMode ? 'demo_local' : req.providerId || 'gemini',
        modelUsed: 'none',
        isDemo: Boolean(req.demoMode),
        latencyMs: Date.now() - started,
        error: {
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded. Please wait a moment before sending another AI request.',
          canUseDemoFallback: true,
        },
      };
    }

    // 3. Local Grounded Demo Mode (zero external data transmission)
    if (req.demoMode) {
      const data = this.executeGroundedDemo(req);
      return {
        ok: true,
        task: req.task,
        providerUsed: 'demo_local',
        modelUsed: 'memora-grounded-local',
        isDemo: true,
        latencyMs: Date.now() - started,
        data,
      };
    }

    // 4. Privacy consent required for external AI providers
    if (!req.consentGranted) {
      return {
        ok: false,
        task: req.task,
        providerUsed: req.providerId || 'gemini',
        modelUsed: 'none',
        isDemo: false,
        latencyMs: Date.now() - started,
        error: {
          code: 'CONSENT_REQUIRED',
          message:
            'Explicit privacy consent is required before sending personal memory data to an external AI provider.',
          canUseDemoFallback: true,
        },
      };
    }

    const requestedId: AIProviderId = req.providerId || 'gemini';
    const adapter = this.adapters.get(requestedId);

    const findAlternatives = (): AIProviderId[] =>
      Array.from(this.adapters.values())
        .filter(
          (a) =>
            a.id !== requestedId &&
            a.isConfigured() &&
            a.supportedCapabilities.includes(req.task),
        )
        .map((a) => a.id);

    if (!adapter) {
      return {
        ok: false,
        task: req.task,
        providerUsed: requestedId,
        modelUsed: 'none',
        isDemo: false,
        latencyMs: Date.now() - started,
        error: {
          code: 'PROVIDER_ERROR',
          message: `Requested AI provider "${requestedId}" is not registered.`,
          availableAlternativeProviders: findAlternatives(),
          canUseDemoFallback: true,
        },
      };
    }

    // 5. Capability compatibility check (non-silent)
    if (!adapter.supportedCapabilities.includes(req.task)) {
      return {
        ok: false,
        task: req.task,
        providerUsed: adapter.id,
        modelUsed: 'none',
        isDemo: false,
        latencyMs: Date.now() - started,
        error: {
          code: 'CAPABILITY_UNSUPPORTED',
          message: `${adapter.displayName} does not support "${req.task}".`,
          availableAlternativeProviders: findAlternatives(),
          canUseDemoFallback: true,
        },
      };
    }

    // 6. Credentials check (non-silent — never silently switch providers)
    if (!adapter.isConfigured()) {
      return {
        ok: false,
        task: req.task,
        providerUsed: adapter.id,
        modelUsed: 'none',
        isDemo: false,
        latencyMs: Date.now() - started,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: `${adapter.displayName} requires ${adapter.credentialEnvVar} to be configured on the server.`,
          availableAlternativeProviders: findAlternatives(),
          canUseDemoFallback: true,
        },
      };
    }

    // 7. Execute live provider call
    try {
      const exec = await adapter.executeTask(req);
      return {
        ok: true,
        task: req.task,
        providerUsed: adapter.id,
        modelUsed: exec.modelUsed,
        isDemo: false,
        latencyMs: Date.now() - started,
        estimatedCostUsd: exec.estimatedCostUsd,
        data: exec.data,
      };
    } catch (err: any) {
      const rawCode = String(err?.code || '');
      const code: NonNullable<AITaskResponse['error']>['code'] =
        rawCode === 'MALFORMED_AI_OUTPUT'
          ? 'MALFORMED_AI_OUTPUT'
          : rawCode === 'INVALID_AI_RESPONSE'
            ? 'INVALID_AI_RESPONSE'
            : rawCode === 'INVALID_INPUT'
              ? 'INVALID_INPUT'
              : rawCode === 'AUTHENTICATION_FAILED'
                ? 'AUTHENTICATION_FAILED'
                : rawCode === 'RATE_LIMITED'
                  ? 'RATE_LIMITED'
                  : rawCode === 'MODEL_UNAVAILABLE'
                    ? 'MODEL_UNAVAILABLE'
                    : rawCode === 'PROVIDER_UNAVAILABLE'
                      ? 'PROVIDER_UNAVAILABLE'
                      : 'PROVIDER_ERROR';
      return {
        ok: false,
        task: req.task,
        providerUsed: adapter.id,
        modelUsed: 'none',
        isDemo: false,
        latencyMs: Date.now() - started,
        error: {
          code,
          message: String(err?.message || 'Upstream AI provider request failed.'),
          availableAlternativeProviders: findAlternatives(),
          canUseDemoFallback: true,
        },
      };
    }
  }
}
