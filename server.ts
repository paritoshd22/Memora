import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIRouter } from './src/server/aiRouter';
import { GeminiProviderAdapter } from './src/server/aiProviders';
import { AuthService } from './src/server/authService';
import { MemoryCurationService } from './src/server/memoryCurationService';
import { redactSecretsFromMessage } from './src/server/geminiConfig';
import { MemoryVaultService } from './src/server/memoryVaultService';
import { PlaylistIntegrationService } from './src/server/playlistService';
import { AIProviderId, AITaskRequest } from './src/types/aiStudio';
import {
  CHILDHOOD_WORLD_LOCATION_CATALOGUE,
  ChildhoodWorldLocationId,
} from './src/types/curation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const aiRouter = new AIRouter();
export const authService = new AuthService();
export const memoryVaultService = new MemoryVaultService();
export const memoryCurationService = new MemoryCurationService({
  onStatusUpdate: (status, errMsg) => {
    const gemini = aiRouter.getProvider('gemini');
    if (gemini instanceof GeminiProviderAdapter) {
      gemini.recordExternalOutcome(status, errMsg);
    }
  },
});
export const playlistService = new PlaylistIntegrationService();

function extractSessionToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('mymuseum_session='));
    if (match) {
      return decodeURIComponent(match.split('=')[1] || '');
    }
  }
  return null;
}

function createSlidingWindowRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const key =
      extractSessionToken(req) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'local';
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= maxRequests) {
      res.status(429).json({
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests in a short window. Please wait a moment and try again.',
      });
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}

export function resolveAuthorizedVaultUserId(
  req: express.Request,
  explicitUserId?: unknown,
):
  | { ok: true; userId: string; isGuest: boolean }
  | { ok: false; status: number; code: string; message: string } {
  const token = extractSessionToken(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: 'UNAUTHENTICATED_VAULT_ACCESS',
      message: 'Authentication required to access or modify a private memory vault.',
    };
  }

  const sessionUser = authService.getUserBySessionToken(token);
  if (!sessionUser) {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_OR_EXPIRED_SESSION',
      message: 'Session token is invalid, expired, or has been revoked.',
    };
  }

  if (typeof explicitUserId === 'string' && explicitUserId.trim()) {
    const requestedId = explicitUserId.trim();
    if (requestedId !== sessionUser.id) {
      return {
        ok: false,
        status: 403,
        code: 'FORBIDDEN_USER_VAULT',
        message: 'Access denied: cannot access or modify another user’s private memory vault.',
      };
    }
  }

  return {
    ok: true,
    userId: sessionUser.id,
    isGuest: Boolean(sessionUser.isGuest),
  };
}

async function forwardRecordsToSupabase(
  records: unknown[],
): Promise<{ configured: boolean; synced: boolean; syncedCount: number }> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  )?.trim();

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.startsWith('MY_') ||
    supabaseKey.startsWith('MY_')
  ) {
    return { configured: false, synced: false, syncedCount: 0 };
  }

  if (!Array.isArray(records) || records.length === 0) {
    return { configured: true, synced: true, syncedCount: 0 };
  }

  try {
    const sbRes = await fetch(
      `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/memories`,
      {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(records),
      },
    );
    if (!sbRes.ok) {
      return { configured: true, synced: false, syncedCount: 0 };
    }
    return { configured: true, synced: true, syncedCount: records.length };
  } catch {
    return { configured: true, synced: false, syncedCount: 0 };
  }
}

export async function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '12mb' }));
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (err && (err.type === 'entity.too.large' || err.status === 413)) {
        res.status(413).json({
          ok: false,
          analyzedBy: 'none',
          code: 'PAYLOAD_TOO_LARGE',
          httpStatus: 413,
          retryable: false,
          message:
            'Uploaded file payload exceeds the 12 MB server request limit. Please use a smaller file or lower-resolution copy.',
        });
        return;
      }
      if (err instanceof SyntaxError && (err as any).status === 400) {
        res.status(400).json({
          ok: false,
          analyzedBy: 'none',
          code: 'INVALID_INPUT',
          httpStatus: 400,
          retryable: false,
          message: 'Malformed JSON request payload.',
        });
        return;
      }
      next(err);
    },
  );

  const authRateLimiter = createSlidingWindowRateLimiter(30, 60_000);
  const storageRateLimiter = createSlidingWindowRateLimiter(90, 60_000);
  const glbRateLimiter = createSlidingWindowRateLimiter(25, 60_000);

  // =========================================================================
  // 0. ACCOUNT CREATION, SIGN-IN & SESSION ENDPOINTS
  // =========================================================================
  app.use('/api/auth', authRateLimiter);
  app.post('/api/auth/register', (req, res) => {
    const result = authService.registerUser(req.body || {});
    if (!result.ok || !result.user || !result.sessionToken) {
      res.status(result.code === 'EMAIL_EXISTS' ? 409 : 400).json(result);
      return;
    }
    res.setHeader(
      'Set-Cookie',
      `mymuseum_session=${encodeURIComponent(result.sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
    );
    res.status(201).json({
      ok: true,
      user: result.user,
      sessionToken: result.sessionToken,
      isNewRegistration: true,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const result = authService.loginUser(req.body || {});
    if (!result.ok || !result.user || !result.sessionToken) {
      res.status(result.code === 'INVALID_CREDENTIALS' ? 401 : 400).json(result);
      return;
    }
    res.setHeader(
      'Set-Cookie',
      `mymuseum_session=${encodeURIComponent(result.sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
    );
    res.json({
      ok: true,
      user: result.user,
      sessionToken: result.sessionToken,
      isNewRegistration: false,
    });
  });

  app.post('/api/auth/guest', (_req, res) => {
    const result = authService.createGuestSession();
    res.setHeader(
      'Set-Cookie',
      `mymuseum_session=${encodeURIComponent(result.sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
    );
    res.json({
      ok: true,
      user: result.user,
      sessionToken: result.sessionToken,
      isNewRegistration: false,
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = extractSessionToken(req);
    const user = authService.getUserBySessionToken(token);
    if (!user) {
      res.status(401).json({
        ok: false,
        code: 'UNAUTHENTICATED',
        message: 'No active session found.',
      });
      return;
    }
    res.json({
      ok: true,
      user,
    });
  });

  app.post('/api/auth/profile', (req, res) => {
    const token = extractSessionToken(req);
    const { displayName } = req.body || {};
    const updated = authService.updateDisplayName(
      token,
      typeof displayName === 'string' ? displayName : '',
    );
    if (!updated) {
      res.status(400).json({
        ok: false,
        message: 'Unable to update display name.',
      });
      return;
    }
    res.json({
      ok: true,
      user: updated,
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractSessionToken(req);
    authService.revokeSession(token);
    res.setHeader(
      'Set-Cookie',
      'mymuseum_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    );
    res.json({
      ok: true,
      message: 'Signed out cleanly.',
    });
  });

  // =========================================================================
  // 1. AI STUDIO PROVIDER & TASK ROUTER ENDPOINTS
  // =========================================================================
  app.get('/api/ai/providers', (_req, res) => {
    res.json({
      ok: true,
      providers: aiRouter.getAllProviderStatuses(),
    });
  });

  app.post('/api/ai/providers/:id/test', async (req, res) => {
    const providerId = req.params.id as AIProviderId;
    const result = await aiRouter.testProviderConnection(providerId);
    res.json({
      ...result,
      providerStatus: aiRouter.getProvider(providerId)?.getStatus(),
      providers: aiRouter.getAllProviderStatuses(),
    });
  });

  const handleAITask: express.RequestHandler = async (req, res) => {
    try {
      const taskRequest = req.body as AITaskRequest;
      if (!taskRequest || !taskRequest.task) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Missing required "task" field in request body.',
            canUseDemoFallback: true,
          },
        });
        return;
      }

      const result = await aiRouter.routeTask(taskRequest);
      const statusCode = result.ok
        ? 200
        : result.error?.code === 'UNAUTHORIZED_MEMORY_ACCESS'
          ? 403
          : result.error?.code === 'RATE_LIMITED'
            ? 429
            : 200;
      res.status(statusCode).json(result);
    } catch {
      res.status(500).json({
        ok: false,
        error: {
          code: 'PROVIDER_ERROR',
          message:
            'Internal AI router error occurred without exposing credentials.',
          canUseDemoFallback: true,
        },
      });
    }
  };

  app.post('/api/ai/task', handleAITask);
  app.post('/api/ai/execute', handleAITask);

  // =========================================================================
  // 1A. AUTOMATIC GEMINI MEMORY CURATION ENDPOINTS
  // =========================================================================
  app.get('/api/curation/status', (_req, res) => {
    const curationStatus = memoryCurationService.getStatus();
    const providerStatus = aiRouter.getProvider('gemini')?.getStatus();
    res.json({
      ok: true,
      geminiConfigured: curationStatus.configured,
      configured: curationStatus.configured,
      provider: 'gemini',
      connectionStatus:
        providerStatus?.connectionStatus || curationStatus.connectionStatus,
      model: curationStatus.model,
      models: curationStatus.models,
      lastError: providerStatus?.usage?.lastError || curationStatus.lastError,
      lastCheckedAt: curationStatus.lastCheckedAt,
    });
  });

  app.post('/api/curation/analyze-item', storageRateLimiter, async (req, res) => {
    try {
      const itemInput = req.body?.item || req.body;
      const consentGranted =
        typeof req.body?.consentGranted === 'boolean'
          ? req.body.consentGranted
          : true;
      const result = await memoryCurationService.analyzeItem(itemInput, {
        consentGranted,
      });
      const status =
        result.httpStatus ||
        (result.ok
          ? 200
          : result.code === 'INVALID_INPUT'
            ? 400
            : result.code === 'PAYLOAD_TOO_LARGE'
              ? 413
              : result.code === 'AUTHENTICATION_FAILED'
                ? 401
                : result.code === 'CONSENT_REQUIRED'
                  ? 403
                  : result.code === 'RATE_LIMITED'
                    ? 429
                    : result.code === 'INVALID_AI_RESPONSE'
                      ? 502
                      : 503);
      res.status(status).json(result);
    } catch (err: any) {
      res.status(503).json({
        ok: false,
        analyzedBy: 'none',
        connectionStatus: 'provider_unavailable',
        code: 'PROVIDER_UNAVAILABLE',
        retryable: true,
        message: `Curation analysis failed: ${redactSecretsFromMessage(String(err?.message || err)).slice(0, 140)}`,
      });
    }
  });

  app.post('/api/curation/organize', storageRateLimiter, async (req, res) => {
    try {
      const { newMemories, allMemories, existingCollections } = req.body || {};
      const result = await memoryCurationService.organizeMemoryBatch({
        newMemories: Array.isArray(newMemories) ? newMemories : [],
        allMemories: Array.isArray(allMemories) ? allMemories : [],
        existingCollections: Array.isArray(existingCollections)
          ? existingCollections
          : [],
      });
      res.status(result.code === 'RATE_LIMITED' ? 429 : 200).json(result);
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        code: 'PROVIDER_ERROR',
        retryable: true,
        message: `Organization failed: ${redactSecretsFromMessage(String(err?.message || err)).slice(0, 140)}`,
        collections: Array.isArray(req.body?.existingCollections)
          ? req.body.existingCollections
          : [],
        connections: [],
        placements: [],
      });
    }
  });

  // =========================================================================
  // 1A-2. CHILDHOOD ROOM LIVE GEMINI MEMORY ASSISTANT
  // =========================================================================
  app.post('/api/assistant/childhood-memory', storageRateLimiter, async (req, res) => {
    const authCheck = resolveAuthorizedVaultUserId(req, req.body?.userId);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({
        ok: false,
        code: authCheck.code,
        message: authCheck.message,
      });
      return;
    }

    try {
      const mode =
        req.body?.mode === 'observe_memory' ? 'observe_memory' : 'chat';
      const message =
        typeof req.body?.message === 'string' ? req.body.message : '';
      const selectedMemoryId =
        typeof req.body?.selectedMemoryId === 'string'
          ? req.body.selectedMemoryId
          : undefined;
      const history = Array.isArray(req.body?.history) ? req.body.history : [];

      // Always ground in the authenticated user's real saved server vault memories
      const vaultMemories = memoryVaultService
        .listUserMemories(authCheck.userId)
        .filter((m) => (m.roomId || 'childhood') === 'childhood');

      // Also include any room memories passed by the authenticated client for the same user
      // (e.g. initial starter exhibits) without ever crossing user boundaries.
      const mergedById = new Map<string, Record<string, unknown>>();
      for (const m of vaultMemories) {
        mergedById.set(m.id, m);
      }
      if (Array.isArray(req.body?.memories)) {
        for (const clientMem of req.body.memories) {
          if (
            clientMem &&
            typeof clientMem === 'object' &&
            typeof clientMem.id === 'string' &&
            !mergedById.has(clientMem.id)
          ) {
            const declaredOwner =
              typeof clientMem.ownerId === 'string'
                ? clientMem.ownerId
                : typeof clientMem.userId === 'string'
                  ? clientMem.userId
                  : null;
            if (!declaredOwner || declaredOwner === authCheck.userId) {
              mergedById.set(clientMem.id, clientMem);
            }
          }
        }
      }

      const result = await memoryCurationService.converseWithChildhoodMemories({
        mode,
        message,
        selectedMemoryId,
        memories: Array.from(mergedById.values()),
        history,
      });

      // If Gemini identified a valid move request for a saved memory in the vault, persist it immediately
      let updatedMemory: Record<string, unknown> | undefined;
      if (result.ok && result.proposedMove && req.body?.autoApplyMove !== false) {
        const targetLoc = result.proposedMove
          .targetLocationId as ChildhoodWorldLocationId;
        const catalogEntry = CHILDHOOD_WORLD_LOCATION_CATALOGUE[targetLoc];
        const existingInVault = memoryVaultService.getUserMemory(
          authCheck.userId,
          result.proposedMove.memoryId,
        );
        const baseRecord =
          existingInVault || mergedById.get(result.proposedMove.memoryId);

        if (baseRecord && catalogEntry) {
          const movedRecord = {
            ...baseRecord,
            curatedZoneId: targetLoc,
            placementTarget: catalogEntry.placementTarget,
            linkedObjectId: catalogEntry.linkedObjectId,
            linkedSpaceId: catalogEntry.spaceId,
            linked3DObject: catalogEntry.label,
            placement3D: {
              locationId: targetLoc,
              placementTarget: catalogEntry.placementTarget,
              linkedObjectId: catalogEntry.linkedObjectId,
              position: [
                catalogEntry.anchor.x,
                catalogEntry.anchor.y,
                catalogEntry.anchor.z,
              ],
            },
            confirmationStatus: 'user_edited',
            updatedAt: new Date().toISOString(),
          };
          const saveRes = memoryVaultService.upsertUserMemories(
            authCheck.userId,
            [movedRecord],
          );
          if (saveRes.ok && saveRes.savedRecords[0]) {
            updatedMemory = saveRes.savedRecords[0];
          }
        }
      }

      const status =
        result.httpStatus ||
        (result.ok
          ? 200
          : result.code === 'INVALID_INPUT'
            ? 400
            : result.code === 'AUTHENTICATION_FAILED'
              ? 401
              : result.code === 'RATE_LIMITED'
                ? 429
                : 503);

      res.status(status).json({
        ...result,
        updatedMemory,
      });
    } catch (err: any) {
      res.status(503).json({
        ok: false,
        analyzedBy: 'none',
        connectionStatus: 'provider_unavailable',
        code: 'PROVIDER_UNAVAILABLE',
        retryable: true,
        message: `Childhood Room assistant failed: ${redactSecretsFromMessage(String(err?.message || err)).slice(0, 140)}`,
      });
    }
  });

  app.get('/api/storage/curation', storageRateLimiter, (req, res) => {
    const authCheck = resolveAuthorizedVaultUserId(req, req.query.userId);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({
        ok: false,
        code: authCheck.code,
        message: authCheck.message,
      });
      return;
    }
    const state = memoryVaultService.getUserCuration(authCheck.userId);
    res.json({
      ok: true,
      userId: authCheck.userId,
      ...state,
    });
  });

  app.put('/api/storage/curation', storageRateLimiter, (req, res) => {
    const authCheck = resolveAuthorizedVaultUserId(req, req.body?.userId);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({
        ok: false,
        code: authCheck.code,
        message: authCheck.message,
      });
      return;
    }
    const saved = memoryVaultService.saveUserCuration(
      authCheck.userId,
      req.body?.collections || [],
      req.body?.connections || [],
    );
    res.json({
      ok: saved.ok,
      userId: authCheck.userId,
      ...saved.state,
    });
  });

  // =========================================================================
  // 1B. STORAGE ADAPTER, MESHY 3D PROXY & N8N AUTOMATION ENDPOINTS
  // =========================================================================
  app.get('/api/storage/status', (req, res) => {
    const supabaseConfigured = Boolean(
      process.env.SUPABASE_URL &&
        (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY) &&
        !process.env.SUPABASE_URL.startsWith('MY_'),
    );
    const meshyConfigured = Boolean(
      process.env.MESHY_API_KEY &&
        !process.env.MESHY_API_KEY.startsWith('MY_') &&
        process.env.MESHY_API_KEY.trim().length >= 10,
    );
    const token = extractSessionToken(req);
    const sessionUser = authService.getUserBySessionToken(token);
    const diagnostics = memoryVaultService.getDiagnostics(sessionUser?.id);
    res.json({
      ok: true,
      authenticated: Boolean(sessionUser),
      primaryAdapter: supabaseConfigured
        ? 'supabase_cloud'
        : 'indexeddb_plus_disk_vault',
      supabaseConfigured,
      meshyConfigured,
      indexedDbActive: true,
      localStorageBackupActive: true,
      serverDiskPersistence: diagnostics,
      message: supabaseConfigured
        ? 'Supabase Cloud + Local IndexedDB + Authenticated Server Disk Vault active with strict per-user ownership.'
        : 'Authenticated Server Disk Vault + Local Browser IndexedDB active. Server disk metadata survives Node.js process restarts on the same host, and IndexedDB caches media offline in this browser. Neither survives hosting container rebuilds or syncs large media across separate devices without configuring an external cloud provider (e.g., SUPABASE_URL).',
    });
  });

  app.get('/api/storage/demo-memories', (_req, res) => {
    res.json({
      ok: true,
      isPublicDemo: true,
      containsPrivateUserContent: false,
      message:
        'Public demonstration mode uses strictly static sample exhibits and never accesses private user vaults.',
    });
  });

  app.get('/api/storage/memories', storageRateLimiter, (req, res) => {
    const authCheck = resolveAuthorizedVaultUserId(req, req.query.userId);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({
        ok: false,
        code: authCheck.code,
        message: authCheck.message,
      });
      return;
    }

    const records = memoryVaultService.listUserMemories(authCheck.userId);
    res.json({
      ok: true,
      userId: authCheck.userId,
      count: records.length,
      memories: records,
    });
  });

  // Serve persisted original uploaded media files strictly to their authenticated owner
  app.get('/api/storage/media/:memoryId', storageRateLimiter, (req, res) => {
    const authCheck = resolveAuthorizedVaultUserId(req, req.query.userId);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({
        ok: false,
        code: authCheck.code,
        message: authCheck.message,
      });
      return;
    }

    const memoryId = String(req.params.memoryId || '').trim();
    if (!memoryId) {
      res.status(400).json({
        ok: false,
        code: 'INVALID_MEMORY_ID',
        message: 'A valid memoryId is required.',
      });
      return;
    }

    const fileResult = memoryVaultService.readUserMediaFile(
      authCheck.userId,
      memoryId,
    );
    if (!fileResult.ok) {
      res.status(fileResult.status).json({
        ok: false,
        code: fileResult.code,
        message: 'Requested memory media was not found.',
      });
      return;
    }

    res.setHeader('Content-Type', fileResult.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(fileResult.filePath);
  });

  app.post('/api/storage/memories', storageRateLimiter, async (req, res) => {
    const authCheck = resolveAuthorizedVaultUserId(req, req.body?.userId);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({
        ok: false,
        code: authCheck.code,
        message: authCheck.message,
      });
      return;
    }

    const incomingItems = Array.isArray(req.body?.memories)
      ? req.body.memories
      : req.body?.memory
        ? [req.body.memory]
        : [];

    if (incomingItems.length === 0) {
      res.status(400).json({
        ok: false,
        code: 'INVALID_MEMORY_RECORD',
        message: 'Valid memory object or memories array is required.',
      });
      return;
    }

    const upsertRes = memoryVaultService.upsertUserMemories(
      authCheck.userId,
      incomingItems,
    );
    if (!upsertRes.ok) {
      res.status(400).json({
        ok: false,
        code: upsertRes.code || 'INVALID_MEMORY_RECORD',
        message: upsertRes.errors[0] || 'Memory validation failed.',
        errors: upsertRes.errors,
      });
      return;
    }

    const sbResult = await forwardRecordsToSupabase(upsertRes.savedRecords);

    res.json({
      ok: true,
      userId: authCheck.userId,
      savedCount: upsertRes.savedCount,
      totalCount: upsertRes.totalCount,
      cloudConfigured: sbResult.configured,
      cloudSynced: sbResult.synced,
      cloudSyncedCount: sbResult.syncedCount,
      adapter: sbResult.synced
        ? 'supabase_cloud'
        : 'server_disk_vault_plus_indexeddb',
      memories: memoryVaultService.listUserMemories(authCheck.userId),
    });
  });

  app.put('/api/storage/memories/sync', storageRateLimiter, async (req, res) => {
    const authCheck = resolveAuthorizedVaultUserId(req, req.body?.userId);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({
        ok: false,
        code: authCheck.code,
        message: authCheck.message,
      });
      return;
    }

    const memories = Array.isArray(req.body?.memories)
      ? req.body.memories
      : null;
    if (!memories) {
      res.status(400).json({
        ok: false,
        code: 'INVALID_SYNC_PAYLOAD',
        message: 'Request body must include a "memories" array.',
      });
      return;
    }

    const deletedIds = Array.isArray(req.body?.deletedIds)
      ? req.body.deletedIds
      : undefined;

    const syncRes = memoryVaultService.syncUserMemories(
      authCheck.userId,
      memories,
      {
        deletedIds,
        allowEmptyReset: false,
      },
    );

    if (!syncRes.ok) {
      res.status(400).json({
        ok: false,
        code: syncRes.code || 'SYNC_FAILED',
        message: syncRes.message || 'Memory synchronization failed.',
        errors: syncRes.errors,
        totalCount: syncRes.totalCount,
      });
      return;
    }

    const sbResult = await forwardRecordsToSupabase(syncRes.memories);

    res.json({
      ok: true,
      userId: authCheck.userId,
      totalCount: syncRes.totalCount,
      savedCount: syncRes.savedCount,
      deletedCount: syncRes.deletedCount,
      rejectedCount: syncRes.rejectedCount,
      cloudConfigured: sbResult.configured,
      cloudSynced: sbResult.synced,
      cloudSyncedCount: sbResult.syncedCount,
      memories: syncRes.memories,
    });
  });

  app.post('/api/storage/memories/reset', storageRateLimiter, (req, res) => {
    const authCheck = resolveAuthorizedVaultUserId(req, req.body?.userId);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({
        ok: false,
        code: authCheck.code,
        message: authCheck.message,
      });
      return;
    }

    const resetRes = memoryVaultService.resetUserMemories(authCheck.userId, {
      confirmReset: Boolean(req.body?.confirmReset),
    });

    if (!resetRes.ok) {
      res.status(400).json({
        ok: false,
        code: resetRes.code || 'CONFIRMATION_REQUIRED',
        message:
          resetRes.message ||
          'Explicit confirmReset: true is required to reset your memory vault.',
      });
      return;
    }

    res.json({
      ok: true,
      userId: authCheck.userId,
      clearedCount: resetRes.clearedCount,
      totalCount: 0,
    });
  });

  app.delete('/api/storage/memories/:id', storageRateLimiter, (req, res) => {
    const authCheck = resolveAuthorizedVaultUserId(
      req,
      req.query.userId || req.body?.userId,
    );
    if (!authCheck.ok) {
      res.status(authCheck.status).json({
        ok: false,
        code: authCheck.code,
        message: authCheck.message,
      });
      return;
    }

    const delRes = memoryVaultService.deleteUserMemory(
      authCheck.userId,
      req.params.id,
    );
    res.json({
      ok: true,
      userId: authCheck.userId,
      deleted: delRes.deleted,
      totalCount: delRes.totalCount,
    });
  });

  app.post('/api/3d/generate-glb', glbRateLimiter, async (req, res) => {
    const { prompt, objectType, objectName, memoryId } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({
        ok: false,
        code: 'INVALID_PROMPT',
        message: 'Missing required "prompt" for 3D generation.',
      });
      return;
    }

    const meshyKey = process.env.MESHY_API_KEY?.trim();
    const meshyConfigured = Boolean(
      meshyKey && !meshyKey.startsWith('MY_') && meshyKey.length >= 10,
    );

    if (!meshyConfigured) {
      res.status(200).json({
        ok: true,
        meshyConfigured: false,
        sourceKind: 'procedural_threejs',
        priorityTier: 3,
        assetId: `procedural_${objectType || 'keepsake'}_${memoryId || Date.now()}`,
        message:
          'MESHY_API_KEY is not configured on the server; resolved via Tier 1–3 Catalog & Procedural GLB Exporter.',
      });
      return;
    }

    try {
      const response = await fetch('https://api.meshy.ai/v2/text-to-3d', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${meshyKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'preview',
          prompt: `${objectName || 'Childhood keepsake'}: ${prompt}`,
          art_style: 'realistic',
          should_remesh: true,
        }),
      });

      if (!response.ok) {
        res.status(200).json({
          ok: true,
          meshyConfigured: true,
          sourceKind: 'procedural_threejs',
          priorityTier: 3,
          assetId: `fallback_glb_${Date.now()}`,
          message: `Meshy API returned HTTP ${response.status}; cleanly fell back to local GLB synthesis.`,
        });
        return;
      }

      const data: any = await response.json();
      res.json({
        ok: true,
        meshyConfigured: true,
        sourceKind: 'meshy_glb',
        priorityTier: 4,
        taskId: data?.result || data?.id,
        glbUrlOrDataUri: data?.model_urls?.glb || undefined,
        assetId: `meshy_${data?.result || Date.now()}`,
        message: 'Meshy 3D generation task created via server proxy.',
      });
    } catch (err: any) {
      res.status(200).json({
        ok: true,
        meshyConfigured: true,
        sourceKind: 'fallback_plinth',
        priorityTier: 5,
        assetId: `fallback_${Date.now()}`,
        message: `External 3D generation interrupted (${String(err?.message || err)}); using fallback 3D keepsake.`,
      });
    }
  });

  app.get('/api/automation/n8n/status', (_req, res) => {
    const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim() || '';
    const configured = Boolean(
      webhookUrl &&
        !webhookUrl.startsWith('MY_') &&
        /^https?:\/\//i.test(webhookUrl),
    );
    res.json({
      ok: true,
      configured,
      status: configured ? 'connected' : 'not_configured',
      supportedWorkflows: [
        'memory_upload_ingest',
        'room_blueprint_generated',
        'anniversary_memory_reminder',
        'story_summary_digest',
      ],
      message: configured
        ? 'n8n automation webhook is configured and ready.'
        : 'n8n webhook is not configured yet (N8N_WEBHOOK_URL not set). All memory analysis and 3D room generation run directly inside MEMORA.',
    });
  });

  app.post('/api/automation/n8n/trigger', async (req, res) => {
    const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim() || '';
    const configured = Boolean(
      webhookUrl &&
        !webhookUrl.startsWith('MY_') &&
        /^https?:\/\//i.test(webhookUrl),
    );
    if (!configured) {
      res.status(200).json({
        ok: false,
        configured: false,
        code: 'N8N_NOT_CONFIGURED',
        message:
          'n8n automation is not configured on this server (N8N_WEBHOOK_URL is not set). No external webhook was called.',
      });
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'the-living-museum',
          triggeredAt: new Date().toISOString(),
          event: req.body?.event || 'memory_upload_ingest',
          payload: req.body?.payload || {},
        }),
      });
      res.json({
        ok: response.ok,
        configured: true,
        status: response.status,
        message: response.ok
          ? 'n8n workflow triggered successfully.'
          : `n8n webhook returned HTTP ${response.status}.`,
      });
    } catch (err: any) {
      res.status(502).json({
        ok: false,
        configured: true,
        code: 'N8N_WEBHOOK_ERROR',
        message: `Failed to reach n8n webhook: ${String(err?.message || err)}`,
      });
    }
  });

  // =========================================================================
  // 2. SPOTIFY & YOUTUBE PLAYLIST INTEGRATION ENDPOINTS
  // =========================================================================
  const getRequestOrigin = (req: express.Request): string => {
    if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
      return process.env.APP_URL.replace(/\/+$/, '');
    }
    const proto =
      (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() ||
      req.protocol ||
      'http';
    const host = req.get('host') || 'localhost:3000';
    return `${proto}://${host}`;
  };

  app.get('/api/music/providers', (req, res) => {
    const origin = getRequestOrigin(req);
    res.json({
      ok: true,
      providers: playlistService.getProvidersStatus(origin),
    });
  });

  app.get('/api/music/auth-url/:provider', (req, res) => {
    const provider = req.params.provider as 'spotify' | 'youtube';
    if (provider !== 'spotify' && provider !== 'youtube') {
      res.status(404).json({ ok: false, message: 'Unknown music provider.' });
      return;
    }

    const origin = getRequestOrigin(req);
    const redirectUri =
      typeof req.query.redirectUri === 'string' && req.query.redirectUri
        ? req.query.redirectUri
        : playlistService.getCallbackUrl(origin);

    const authResult = playlistService.getAuthorizationUrl(
      provider,
      redirectUri,
    );

    if (!authResult.ok) {
      res.status(400).json({
        ok: false,
        code: authResult.code,
        message: authResult.error,
        providers: playlistService.getProvidersStatus(origin),
      });
      return;
    }

    res.json({
      ok: true,
      url: authResult.url,
    });
  });

  app.post('/api/music/providers/:provider/disconnect', (req, res) => {
    const provider = req.params.provider as 'spotify' | 'youtube';
    if (provider === 'spotify' || provider === 'youtube') {
      playlistService.disconnectProvider(provider);
    }
    const origin = getRequestOrigin(req);
    res.json({
      ok: true,
      message: `${provider === 'spotify' ? 'Spotify' : 'YouTube'} account disconnected and authorization tokens cleared.`,
      providers: playlistService.getProvidersStatus(origin),
    });
  });

  // Search or list playlists for Spotify or YouTube
  app.get('/api/music/playlists/:provider', async (req, res) => {
    const provider = req.params.provider as 'spotify' | 'youtube';
    const query = typeof req.query.q === 'string' ? req.query.q : '';

    if (provider === 'spotify') {
      const result = await playlistService.getSpotifyPlaylists(query);
      res.json(result);
      return;
    }
    if (provider === 'youtube') {
      const result = await playlistService.getYouTubePlaylists(query);
      res.json(result);
      return;
    }

    res.status(404).json({
      ok: false,
      code: 'INVALID_PROVIDER',
      message: 'Unsupported playlist provider.',
      playlists: [],
    });
  });

  // Retrieve single playlist details & track/video items
  app.get('/api/music/playlists/:provider/:playlistId', async (req, res) => {
    const provider = req.params.provider as 'spotify' | 'youtube';
    const playlistId = req.params.playlistId;

    if (provider === 'spotify') {
      const result = await playlistService.getSpotifyPlaylistDetails(playlistId);
      res.json(result);
      return;
    }
    if (provider === 'youtube') {
      const result = await playlistService.getYouTubePlaylistDetails(playlistId);
      res.json(result);
      return;
    }

    res.status(404).json({
      ok: false,
      code: 'INVALID_PROVIDER',
      message: 'Unsupported playlist provider.',
    });
  });

  // Resolve and verify an official Spotify or YouTube playlist URL
  app.post('/api/music/playlists/resolve-url', async (req, res) => {
    const { url, customTitle } = req.body || {};
    const result = await playlistService.resolvePlaylistByUrl(url, customTitle);
    res.status(result.ok ? 200 : 400).json(result);
  });

  // OAuth Popup Callback Handler (Supports both /auth/callback and /auth/callback/)
  const oauthCallbackHandler: express.RequestHandler = async (req, res) => {
    const rawState = String(req.query.state || 'spotify');
    const provider: 'spotify' | 'youtube' =
      rawState === 'youtube' ? 'youtube' : 'spotify';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const errorParam =
      typeof req.query.error === 'string' ? req.query.error : undefined;

    const origin = getRequestOrigin(req);
    const redirectUri = playlistService.getCallbackUrl(origin);

    const result = await playlistService.handleOAuthCallback(
      provider,
      code,
      redirectUri,
      errorParam,
    );

    const providerTitle = provider === 'spotify' ? 'Spotify' : 'YouTube';
    res.send(`<!doctype html>
<html>
  <head><title>MEMORA ${providerTitle} Authentication</title></head>
  <body style="font-family: Georgia, serif; background: #F6F1E8; color: #27231F; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <div style="background: #FFFCF6; border: 1px solid #E8DED0; padding: 28px 36px; border-radius: 16px; text-align: center; max-width: 420px;">
      <h2 style="margin: 0 0 8px;">${
        result.ok
          ? `${providerTitle} Connected`
          : `${providerTitle} Authorization Failed`
      }</h2>
      <p style="font-size: 14px; color: #493629; line-height: 1.5;">${result.message}</p>
      <p style="font-size: 12px; color: #6E5641; margin-top: 12px;">Returning to MEMORA...</p>
    </div>
    <script>
      if (window.opener) {
        window.opener.postMessage({
          type: ${JSON.stringify(result.ok ? 'OAUTH_AUTH_SUCCESS' : 'OAUTH_AUTH_ERROR')},
          provider: ${JSON.stringify(provider)},
          message: ${JSON.stringify(result.message)}
        }, ${JSON.stringify(origin)});
        setTimeout(() => window.close(), 600);
      } else {
        setTimeout(() => { window.location.href = '/'; }, 1200);
      }
    </script>
  </body>
</html>`);
  };

  app.get('/auth/callback', oauthCallbackHandler);
  app.get('/auth/callback/', oauthCallbackHandler);

  // =========================================================================
  // 3. VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: !disableHmr,
        ws: disableHmr ? false : undefined,
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });
    (
      app as express.Express & { __closeVite?: () => Promise<void> }
    ).__closeVite = () => vite.close();
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

if (
  process.env.NODE_ENV !== 'test' &&
  process.env.MYMUSEUM_SKIP_AUTO_LISTEN !== '1'
) {
  createServer()
    .then((app) => {
      const port = Number(process.env.PORT) || 3000;
      const server = app.listen(port, '0.0.0.0', () => {
        console.log(`MEMORA 3D Server listening on http://localhost:${port}`);
      });

      server.on('error', (err) => {
        console.error(`MEMORA 3D Server failed to listen on port ${port}:`, err);
        process.exit(1);
      });

      const shutdown = () => {
        server.close(() => {
          const cleanup = (
            app as express.Express & { __closeVite?: () => Promise<void> }
          ).__closeVite;
          if (cleanup) {
            cleanup().finally(() => process.exit(0));
          } else {
            process.exit(0);
          }
        });
        setTimeout(() => process.exit(0), 2000).unref();
      };

      process.once('SIGTERM', shutdown);
      process.once('SIGINT', shutdown);
    })
    .catch((err) => {
      console.error('MEMORA 3D Server failed to start:', err);
      process.exit(1);
    });
}
