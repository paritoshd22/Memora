import { Memory } from '../types/museum';

/**
 * MEMORA — 6-DOMAIN MEMORY STORAGE ARCHITECTURE
 * Explicitly separates:
 * 1. Memory metadata ('metadata')
 * 2. Original photographs ('photograph')
 * 3. Video files ('video')
 * 4. Audio files ('audio')
 * 5. Documents & stories ('document')
 * 6. 3D memory assets ('model_3d')
 */
export type MediaAssetDomain =
  | 'metadata'
  | 'photograph'
  | 'video'
  | 'audio'
  | 'document'
  | 'model_3d';

export interface StoredMediaAssetDescriptor {
  memoryId: string;
  domain: MediaAssetDomain;
  mimeType?: string;
  fileName?: string;
  dataUrlOrUri: string;
  updatedAt: string;
}

export interface StorageCapabilitiesReport {
  adapterId: 'indexeddb_offline_cache' | 'server_disk_vault' | 'external_cloud';
  isCloudStorage: boolean;
  survivesBrowserRefresh: boolean;
  survivesServerProcessRestart: boolean;
  survivesContainerRebuild: boolean;
  crossDeviceSyncAvailable: boolean;
  description: string;
}

export interface IMediaStorageAdapter {
  readonly adapterId: StorageCapabilitiesReport['adapterId'];
  getCapabilities(): StorageCapabilitiesReport;
  saveAsset(
    memoryId: string,
    dataUrl: string,
    domain?: MediaAssetDomain,
  ): Promise<boolean>;
  loadAsset(
    memoryId: string,
    domain?: MediaAssetDomain,
  ): Promise<string | null>;
  deleteAsset(memoryId: string, domain?: MediaAssetDomain): Promise<boolean>;
}

const DB_NAME = 'mymuseum_local_media_db';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function buildAssetKey(memoryId: string, domain?: MediaAssetDomain): string {
  if (!domain || domain === 'photograph') {
    return memoryId;
  }
  return `${memoryId}::${domain}`;
}

export async function saveMediaToIndexedDb(
  key: string,
  dataUrl: string,
  domain?: MediaAssetDomain,
): Promise<boolean> {
  if (!key || !dataUrl) return false;
  try {
    const db = await openMediaDb();
    const storeKey = buildAssetKey(key, domain);
    return await new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(dataUrl, storeKey);
        if (storeKey !== key) {
          // Also keep primary memoryId key populated for seamless lookup
          store.put(dataUrl, key);
        }
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          resolve(false);
        };
        tx.onabort = () => {
          db.close();
          resolve(false);
        };
      } catch {
        try {
          db.close();
        } catch {
          // ignore
        }
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

export async function loadMediaFromIndexedDb(
  key: string,
  domain?: MediaAssetDomain,
): Promise<string | null> {
  if (!key) return null;
  try {
    const db = await openMediaDb();
    const storeKey = buildAssetKey(key, domain);
    return await new Promise<string | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(storeKey);
        req.onsuccess = () => {
          if (typeof req.result === 'string' && req.result.length > 0) {
            db.close();
            resolve(req.result);
            return;
          }
          if (storeKey !== key) {
            const fallbackReq = store.get(key);
            fallbackReq.onsuccess = () => {
              db.close();
              resolve(
                typeof fallbackReq.result === 'string'
                  ? fallbackReq.result
                  : null,
              );
            };
            fallbackReq.onerror = () => {
              db.close();
              resolve(null);
            };
            return;
          }
          db.close();
          resolve(null);
        };
        req.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        try {
          db.close();
        } catch {
          // ignore
        }
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function deleteMediaFromIndexedDb(
  key: string,
  domain?: MediaAssetDomain,
): Promise<boolean> {
  if (!key) return false;
  try {
    const db = await openMediaDb();
    const storeKey = buildAssetKey(key, domain);
    return await new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(storeKey);
        if (storeKey !== key) {
          store.delete(key);
        }
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          resolve(false);
        };
        tx.onabort = () => {
          db.close();
          resolve(false);
        };
      } catch {
        try {
          db.close();
        } catch {
          // ignore
        }
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

export class IndexedDbOfflineMediaAdapter implements IMediaStorageAdapter {
  public readonly adapterId = 'indexeddb_offline_cache' as const;

  public getCapabilities(): StorageCapabilitiesReport {
    return {
      adapterId: 'indexeddb_offline_cache',
      isCloudStorage: false,
      survivesBrowserRefresh: true,
      survivesServerProcessRestart: true,
      survivesContainerRebuild: false,
      crossDeviceSyncAvailable: false,
      description:
        'Browser IndexedDB offline media cache. Preserves binary photographs, videos, audio, documents, and 3D assets locally on this browser/device, but is not cloud storage and does not sync binary blobs across separate devices.',
    };
  }

  public saveAsset(
    memoryId: string,
    dataUrl: string,
    domain?: MediaAssetDomain,
  ): Promise<boolean> {
    return saveMediaToIndexedDb(memoryId, dataUrl, domain);
  }

  public loadAsset(
    memoryId: string,
    domain?: MediaAssetDomain,
  ): Promise<string | null> {
    return loadMediaFromIndexedDb(memoryId, domain);
  }

  public deleteAsset(
    memoryId: string,
    domain?: MediaAssetDomain,
  ): Promise<boolean> {
    return deleteMediaFromIndexedDb(memoryId, domain);
  }
}

export const localMediaAdapter = new IndexedDbOfflineMediaAdapter();

// ============================================================================
// OFFLINE SYNC QUEUE & SERVER CONFIRMATION TRACKING
// ============================================================================

export interface OfflineSyncQueueItem {
  kind: 'upsert' | 'delete';
  userId: string;
  memoryId: string;
  memory?: Record<string, unknown>;
  queuedAt: string;
}

function getOfflineQueueStorageKey(userId: string): string {
  return `mymuseum_offline_sync_queue_v1_${userId}`;
}

export function loadOfflineSyncQueue(userId: string): OfflineSyncQueueItem[] {
  if (!userId || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getOfflineQueueStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineSyncQueue(
  userId: string,
  queue: OfflineSyncQueueItem[],
): void {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    if (queue.length === 0) {
      localStorage.removeItem(getOfflineQueueStorageKey(userId));
    } else {
      localStorage.setItem(
        getOfflineQueueStorageKey(userId),
        JSON.stringify(queue),
      );
    }
  } catch {
    // ignore storage quota errors
  }
}

export function enqueueOfflineMemoryChange(item: OfflineSyncQueueItem): void {
  if (!item.userId || !item.memoryId) return;
  const current = loadOfflineSyncQueue(item.userId);
  // Deduplicate by memoryId so the latest operation for that memoryId wins
  const filtered = current.filter((q) => q.memoryId !== item.memoryId);
  filtered.push(item);
  saveOfflineSyncQueue(item.userId, filtered);
}

/**
 * Converts a server vault record back into a complete frontend `Memory` object
 * without losing room assignments, dates, descriptions, tags, or 3D blueprints.
 */
export function normalizeServerVaultRecordToMemory(
  raw: Record<string, unknown>,
  existingLocal?: Memory,
): Memory {
  const id = typeof raw.id === 'string' ? raw.id : existingLocal?.id || '';
  const roomId =
    typeof raw.roomId === 'string' && raw.roomId.trim()
      ? raw.roomId.trim()
      : existingLocal?.roomId || 'childhood';
  const title =
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : existingLocal?.title || 'Untitled Memory';
  const dateStr =
    typeof raw.date === 'string' && raw.date.trim()
      ? raw.date.trim()
      : existingLocal?.date || new Date().toISOString().slice(0, 10);

  let yearNum = existingLocal?.year || 2024;
  if (typeof raw.year === 'number' && Number.isFinite(raw.year)) {
    yearNum = Math.round(raw.year);
  } else if (typeof raw.year === 'string' && raw.year.trim()) {
    const parsedY = Number(raw.year.trim());
    if (Number.isFinite(parsedY)) yearNum = Math.round(parsedY);
  } else if (dateStr.length >= 4) {
    const parsedFromDate = Number(dateStr.slice(0, 4));
    if (Number.isFinite(parsedFromDate)) yearNum = parsedFromDate;
  }

  const rawCategory =
    typeof raw.category === 'string' ? raw.category : existingLocal?.category;
  const validCategories = new Set([
    'Photo',
    'Video',
    'Audio',
    'Story',
    'Document',
    'KeepSake',
    'Note',
  ]);
  const category = (
    rawCategory && validCategories.has(rawCategory)
      ? rawCategory
      : raw.type === 'video'
        ? 'Video'
        : raw.type === 'audio'
          ? 'Audio'
          : raw.type === 'story'
            ? 'Story'
            : raw.type === 'document'
              ? 'Document'
              : existingLocal?.category || 'Photo'
  ) as Memory['category'];

  const storyText =
    typeof raw.story === 'string'
      ? raw.story
      : existingLocal?.story || '';
  const descriptionText =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description
      : existingLocal?.description || storyText || title;

  let palette: [string, string, string, string] = existingLocal?.palette || [
    '#F4D8AF',
    '#D38B52',
    '#442D1C',
    '#D6A15D',
  ];
  if (
    Array.isArray(raw.palette) &&
    raw.palette.length === 4 &&
    raw.palette.every((c) => typeof c === 'string')
  ) {
    palette = raw.palette as [string, string, string, string];
  }

  // Preserve resolved local binary data URLs if the server record holds an offline `idb://` placeholder
  const serverMediaUrl =
    typeof raw.mediaUrl === 'string' ? raw.mediaUrl : undefined;
  const resolvedMediaUrl =
    serverMediaUrl && !serverMediaUrl.startsWith('idb://')
      ? serverMediaUrl
      : existingLocal?.mediaUrl || serverMediaUrl;

  const serverCustomImage =
    typeof raw.customImageUrl === 'string' ? raw.customImageUrl : undefined;
  const resolvedCustomImage =
    serverCustomImage && !serverCustomImage.startsWith('idb://')
      ? serverCustomImage
      : existingLocal?.customImageUrl || serverCustomImage;

  return {
    ...(existingLocal || {}),
    id,
    roomId,
    title,
    subtitle:
      typeof raw.subtitle === 'string'
        ? raw.subtitle
        : existingLocal?.subtitle,
    date: dateStr,
    year: yearNum,
    location:
      typeof raw.location === 'string'
        ? raw.location
        : existingLocal?.location || 'Personal Archive',
    category,
    type:
      typeof raw.type === 'string'
        ? (raw.type as Memory['type'])
        : existingLocal?.type,
    description: descriptionText,
    story: storyText,
    accessionNumber:
      typeof raw.accessionNumber === 'string'
        ? raw.accessionNumber
        : existingLocal?.accessionNumber || `ACC.${yearNum}.${id.slice(-4)}`,
    motif:
      typeof raw.motif === 'string'
        ? (raw.motif as Memory['motif'])
        : existingLocal?.motif || 'courtyard_lanterns',
    palette,
    tags: Array.isArray(raw.tags)
      ? (raw.tags as string[])
      : existingLocal?.tags || [],
    people: Array.isArray(raw.people)
      ? (raw.people as string[])
      : existingLocal?.people,
    emotionTags: Array.isArray(raw.emotionTags)
      ? (raw.emotionTags as string[])
      : existingLocal?.emotionTags,
    isFavorite:
      typeof raw.isFavorite === 'boolean'
        ? raw.isFavorite
        : existingLocal?.isFavorite,
    displayOrder:
      typeof raw.displayOrder === 'number'
        ? raw.displayOrder
        : existingLocal?.displayOrder,
    frameStyle:
      typeof raw.frameStyle === 'string'
        ? (raw.frameStyle as Memory['frameStyle'])
        : existingLocal?.frameStyle,
    displayStyleOverride:
      typeof raw.displayStyleOverride === 'string'
        ? (raw.displayStyleOverride as Memory['displayStyleOverride'])
        : existingLocal?.displayStyleOverride,
    customImageUrl: resolvedCustomImage,
    mediaType:
      typeof raw.mediaType === 'string'
        ? (raw.mediaType as Memory['mediaType'])
        : existingLocal?.mediaType,
    mediaUrl: resolvedMediaUrl,
    mediaMimeType:
      typeof raw.mediaMimeType === 'string'
        ? raw.mediaMimeType
        : existingLocal?.mediaMimeType,
    mediaFileName:
      typeof raw.mediaFileName === 'string'
        ? raw.mediaFileName
        : existingLocal?.mediaFileName,
    documentText:
      typeof raw.documentText === 'string'
        ? raw.documentText
        : existingLocal?.documentText,
    transcriptText:
      typeof raw.transcriptText === 'string'
        ? raw.transcriptText
        : existingLocal?.transcriptText,
    certificateIssuer:
      typeof raw.certificateIssuer === 'string'
        ? raw.certificateIssuer
        : existingLocal?.certificateIssuer,
    placementTarget:
      typeof raw.placementTarget === 'string'
        ? (raw.placementTarget as Memory['placementTarget'])
        : existingLocal?.placementTarget,
    positionOffset:
      raw.positionOffset && typeof raw.positionOffset === 'object'
        ? (raw.positionOffset as Memory['positionOffset'])
        : existingLocal?.positionOffset,
    curatedZoneId:
      typeof raw.curatedZoneId === 'string'
        ? (raw.curatedZoneId as Memory['curatedZoneId'])
        : existingLocal?.curatedZoneId,
    hiddenFrom3D:
      typeof raw.hiddenFrom3D === 'boolean'
        ? raw.hiddenFrom3D
        : existingLocal?.hiddenFrom3D,
    curationReport:
      raw.curationReport && typeof raw.curationReport === 'object'
        ? (raw.curationReport as Memory['curationReport'])
        : existingLocal?.curationReport,
    collectionIds: Array.isArray(raw.collectionIds)
      ? (raw.collectionIds as string[])
      : existingLocal?.collectionIds,
    videoHighlights: Array.isArray(raw.videoHighlights)
      ? (raw.videoHighlights as Memory['videoHighlights'])
      : existingLocal?.videoHighlights,
    audioKind:
      typeof raw.audioKind === 'string'
        ? (raw.audioKind as Memory['audioKind'])
        : existingLocal?.audioKind,
    chatLines: Array.isArray(raw.chatLines)
      ? (raw.chatLines as Memory['chatLines'])
      : Array.isArray(raw.chatMessages)
        ? (raw.chatMessages as Memory['chatLines'])
        : existingLocal?.chatLines,
    aiSummary:
      typeof raw.aiSummary === 'string'
        ? raw.aiSummary
        : existingLocal?.aiSummary,
    memoryTo3D:
      raw.memoryTo3D && typeof raw.memoryTo3D === 'object'
        ? (raw.memoryTo3D as Memory['memoryTo3D'])
        : existingLocal?.memoryTo3D,
    memoryTo3DBlueprint:
      raw.memoryTo3DBlueprint && typeof raw.memoryTo3DBlueprint === 'object'
        ? (raw.memoryTo3DBlueprint as Memory['memoryTo3DBlueprint'])
        : existingLocal?.memoryTo3DBlueprint,
    custom3DPosition: Array.isArray(raw.custom3DPosition)
      ? (raw.custom3DPosition as [number, number, number])
      : existingLocal?.custom3DPosition,
    linked3DObject:
      typeof raw.linked3DObject === 'string'
        ? raw.linked3DObject
        : existingLocal?.linked3DObject,
    linkedObjectId:
      typeof raw.linkedObjectId === 'string'
        ? (raw.linkedObjectId as Memory['linkedObjectId'])
        : existingLocal?.linkedObjectId,
    linkedSpaceId:
      typeof raw.linkedSpaceId === 'string'
        ? (raw.linkedSpaceId as Memory['linkedSpaceId'])
        : existingLocal?.linkedSpaceId,
    linkedActivity:
      typeof raw.linkedActivity === 'string'
        ? raw.linkedActivity
        : existingLocal?.linkedActivity,
    userProvided:
      raw.userProvided && typeof raw.userProvided === 'object'
        ? (raw.userProvided as Memory['userProvided'])
        : existingLocal?.userProvided,
    aiSuggestions:
      raw.aiSuggestions && typeof raw.aiSuggestions === 'object'
        ? (raw.aiSuggestions as Memory['aiSuggestions'])
        : existingLocal?.aiSuggestions,
    confirmationStatus:
      typeof raw.confirmationStatus === 'string'
        ? (raw.confirmationStatus as Memory['confirmationStatus'])
        : existingLocal?.confirmationStatus,
    assistantNote:
      typeof raw.assistantNote === 'string'
        ? raw.assistantNote
        : existingLocal?.assistantNote,
    placement3D:
      raw.placement3D && typeof raw.placement3D === 'object'
        ? (raw.placement3D as Memory['placement3D'])
        : existingLocal?.placement3D,
    updatedAt:
      typeof raw.updatedAt === 'string'
        ? raw.updatedAt
        : (existingLocal as Memory & { updatedAt?: string })?.updatedAt ||
          new Date().toISOString(),
  } as Memory;
}

/**
 * Merges local memories and server-restored memories using stable memory IDs:
 * - Avoids duplicate memories.
 * - Excludes memories queued for deletion while offline (`deletedIds`).
 * - Compares `updatedAt` timestamps so newer changes are never overwritten by stale data.
 * - Preserves room assignments (`roomId`) and local binary media URLs when server holds `idb://` references.
 */
export function mergeServerAndLocalMemories(
  localMemories: Memory[],
  serverRecords: Array<Record<string, unknown>>,
  deletedIds: string[] = [],
): Memory[] {
  const deletedSet = new Set(deletedIds);
  const localById = new Map<string, Memory>();
  const mergedById = new Map<string, Memory>();

  for (const localMem of localMemories) {
    if (!localMem || !localMem.id || deletedSet.has(localMem.id)) continue;
    localById.set(localMem.id, localMem);
    mergedById.set(localMem.id, localMem);
  }

  for (const srvRaw of serverRecords) {
    if (!srvRaw || typeof srvRaw.id !== 'string') continue;
    const id = srvRaw.id;
    if (deletedSet.has(id)) continue;

    const existingLocal = localById.get(id);
    const normalizedServer = normalizeServerVaultRecordToMemory(
      srvRaw,
      existingLocal,
    );

    if (!existingLocal) {
      mergedById.set(id, normalizedServer);
      continue;
    }

    const localUpdated = Date.parse(
      (existingLocal as Memory & { updatedAt?: string }).updatedAt || '',
    );
    const serverUpdated = Date.parse(
      typeof srvRaw.updatedAt === 'string' ? srvRaw.updatedAt : '',
    );

    if (
      Number.isFinite(localUpdated) &&
      Number.isFinite(serverUpdated) &&
      localUpdated > serverUpdated
    ) {
      // Local record is strictly newer than server record — preserve local edits
      mergedById.set(id, existingLocal);
    } else {
      // Server record is newer or equal — use normalized server record with local media fallback
      mergedById.set(id, normalizedServer);
    }
  }

  return Array.from(mergedById.values());
}

const MAX_SERVER_INLINE_MEDIA_CHARS = 14_000_000; // ~10 MB binary in Base64

function compactMemoryForServerTransport(
  memory: Record<string, unknown>,
  options?: { allowInlineMedia?: boolean },
): Record<string, unknown> {
  const id = typeof memory.id === 'string' ? memory.id : '';
  const allowInline = options?.allowInlineMedia !== false;
  const maxLen = allowInline ? MAX_SERVER_INLINE_MEDIA_CHARS : 65000;

  const rawMediaUrl = typeof memory.mediaUrl === 'string' ? memory.mediaUrl : undefined;
  const rawCustomImageUrl =
    typeof memory.customImageUrl === 'string' ? memory.customImageUrl : undefined;

  // Avoid duplicating identical large data URLs in both mediaUrl and customImageUrl
  const mediaUrlOut =
    rawMediaUrl && rawMediaUrl.length > maxLen ? `idb://${id}` : rawMediaUrl;
  const customImageUrlOut =
    rawCustomImageUrl && rawCustomImageUrl.length > maxLen
      ? undefined
      : rawCustomImageUrl &&
          rawMediaUrl &&
          rawCustomImageUrl === rawMediaUrl &&
          rawCustomImageUrl.startsWith('data:')
        ? undefined
        : rawCustomImageUrl;

  return {
    ...memory,
    updatedAt:
      typeof memory.updatedAt === 'string'
        ? memory.updatedAt
        : new Date().toISOString(),
    mediaUrl: mediaUrlOut,
    customImageUrl: customImageUrlOut,
  };
}

/**
 * Saves original media binary to IndexedDB and persists the memory record +
 * original uploaded image/media to the authenticated project server disk vault.
 * IMPORTANT: Never marks `synced: true` until the server confirms `ok: true`.
 */
export async function syncMemoryRecordToVault(
  memory: {
    id: string;
    ownerId?: string;
    userId?: string;
    mediaUrl?: string;
    customImageUrl?: string;
    updatedAt?: string;
    [key: string]: unknown;
  },
  userId?: string | null,
  sessionToken?: string | null,
): Promise<{
  ok: boolean;
  synced: boolean;
  queuedOffline: boolean;
  adapter: string;
  savedMemory?: Record<string, unknown>;
  errorMessage?: string;
}> {
  const stampedMemory = {
    ...memory,
    updatedAt:
      typeof memory.updatedAt === 'string'
        ? memory.updatedAt
        : new Date().toISOString(),
  };

  const binaryPayload = stampedMemory.mediaUrl || stampedMemory.customImageUrl;
  if (
    binaryPayload &&
    typeof binaryPayload === 'string' &&
    !binaryPayload.startsWith('idb://') &&
    !binaryPayload.startsWith('/api/storage/media/')
  ) {
    await saveMediaToIndexedDb(stampedMemory.id, binaryPayload).catch(() => {});
  }

  if (!userId || !sessionToken || typeof fetch === 'undefined') {
    if (userId) {
      enqueueOfflineMemoryChange({
        kind: 'upsert',
        userId,
        memoryId: stampedMemory.id,
        memory: compactMemoryForServerTransport(stampedMemory, {
          allowInlineMedia: false,
        }),
        queuedAt: new Date().toISOString(),
      });
    }
    return {
      ok: false,
      synced: false,
      queuedOffline: Boolean(userId),
      adapter: 'indexeddb_offline_queue',
      errorMessage: 'No active curator session available for server persistence.',
    };
  }

  try {
    const res = await fetch('/api/storage/memories', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        userId,
        memory: compactMemoryForServerTransport(
          {
            ...stampedMemory,
            userId,
          },
          { allowInlineMedia: true },
        ),
      }),
    });

    if (!res.ok) {
      let errMsg = `Server returned HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        if (errBody?.message) errMsg = String(errBody.message);
      } catch {
        // ignore JSON parse error
      }
      enqueueOfflineMemoryChange({
        kind: 'upsert',
        userId,
        memoryId: stampedMemory.id,
        memory: compactMemoryForServerTransport(stampedMemory, {
          allowInlineMedia: false,
        }),
        queuedAt: new Date().toISOString(),
      });
      return {
        ok: false,
        synced: false,
        queuedOffline: true,
        adapter: 'indexeddb_offline_queue',
        errorMessage: errMsg,
      };
    }

    const data = await res.json();
    const confirmed = Boolean(data?.ok);
    const savedMemory = Array.isArray(data?.memories)
      ? (data.memories as Array<Record<string, unknown>>).find(
          (m) => m && m.id === stampedMemory.id,
        )
      : undefined;

    if (!confirmed) {
      enqueueOfflineMemoryChange({
        kind: 'upsert',
        userId,
        memoryId: stampedMemory.id,
        memory: compactMemoryForServerTransport(stampedMemory, {
          allowInlineMedia: false,
        }),
        queuedAt: new Date().toISOString(),
      });
    }
    return {
      ok: confirmed,
      synced: confirmed,
      queuedOffline: !confirmed,
      adapter: confirmed
        ? data?.adapter || 'server_disk_vault_plus_indexeddb'
        : 'indexeddb_offline_queue',
      savedMemory,
      errorMessage: confirmed ? undefined : data?.message || 'Server did not confirm save.',
    };
  } catch (err: any) {
    enqueueOfflineMemoryChange({
      kind: 'upsert',
      userId,
      memoryId: stampedMemory.id,
      memory: compactMemoryForServerTransport(stampedMemory, {
        allowInlineMedia: false,
      }),
      queuedAt: new Date().toISOString(),
    });
    return {
      ok: false,
      synced: false,
      queuedOffline: true,
      adapter: 'indexeddb_offline_queue',
      errorMessage: String(err?.message || 'Network request failed.'),
    };
  }
}

export async function deleteMemoryFromStorageAdapter(
  memoryId: string,
  userId?: string | null,
  sessionToken?: string | null,
): Promise<{ ok: boolean; synced: boolean; queuedOffline: boolean }> {
  await deleteMediaFromIndexedDb(memoryId).catch(() => {});
  if (!userId || !sessionToken || typeof fetch === 'undefined') {
    if (userId) {
      enqueueOfflineMemoryChange({
        kind: 'delete',
        userId,
        memoryId,
        queuedAt: new Date().toISOString(),
      });
    }
    return { ok: false, synced: false, queuedOffline: Boolean(userId) };
  }

  try {
    const res = await fetch(
      `/api/storage/memories/${encodeURIComponent(memoryId)}?userId=${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      },
    );
    if (!res.ok) {
      enqueueOfflineMemoryChange({
        kind: 'delete',
        userId,
        memoryId,
        queuedAt: new Date().toISOString(),
      });
      return { ok: false, synced: false, queuedOffline: true };
    }
    const data = await res.json();
    const confirmed = Boolean(data?.ok);
    return { ok: confirmed, synced: confirmed, queuedOffline: !confirmed };
  } catch {
    enqueueOfflineMemoryChange({
      kind: 'delete',
      userId,
      memoryId,
      queuedAt: new Date().toISOString(),
    });
    return { ok: false, synced: false, queuedOffline: true };
  }
}

export async function syncMemoriesWithServerVault(
  memories: Array<{ id: string; [key: string]: unknown }>,
  userId?: string | null,
  sessionToken?: string | null,
  deletedIds?: string[],
): Promise<{
  ok: boolean;
  synced: boolean;
  memories?: Array<Record<string, unknown>>;
}> {
  if (!userId || !sessionToken || typeof fetch === 'undefined') {
    return { ok: false, synced: false };
  }
  try {
    const compactMemories = memories.map((m) =>
      compactMemoryForServerTransport({
        ...m,
        userId,
      }),
    );
    const res = await fetch('/api/storage/memories/sync', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        userId,
        memories: compactMemories,
        deletedIds,
      }),
    });
    if (!res.ok) {
      return { ok: false, synced: false };
    }
    const data = await res.json();
    return {
      ok: Boolean(data?.ok),
      synced: Boolean(data?.ok),
      memories: Array.isArray(data?.memories) ? data.memories : undefined,
    };
  } catch {
    return { ok: false, synced: false };
  }
}

export async function resetUserMemoriesInVault(
  userId?: string | null,
  sessionToken?: string | null,
): Promise<boolean> {
  if (!userId || !sessionToken || typeof fetch === 'undefined') return false;
  saveOfflineSyncQueue(userId, []);
  try {
    const res = await fetch('/api/storage/memories/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        userId,
        confirmReset: true,
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

/**
 * Flushes any queued offline changes (`upsert` or `delete`) for the authenticated user
 * when connectivity is available.
 */
export async function flushOfflineSyncQueue(
  userId: string,
  sessionToken: string,
): Promise<{ flushedCount: number; remainingCount: number }> {
  const queue = loadOfflineSyncQueue(userId);
  if (queue.length === 0 || typeof fetch === 'undefined') {
    return { flushedCount: 0, remainingCount: queue.length };
  }

  const remaining: OfflineSyncQueueItem[] = [];
  let flushedCount = 0;

  for (const item of queue) {
    try {
      if (item.kind === 'delete') {
        const res = await fetch(
          `/api/storage/memories/${encodeURIComponent(item.memoryId)}?userId=${encodeURIComponent(userId)}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${sessionToken}`,
            },
          },
        );
        if (res.ok) {
          flushedCount++;
        } else {
          remaining.push(item);
        }
      } else if (item.kind === 'upsert' && item.memory) {
        const res = await fetch('/api/storage/memories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            userId,
            memory: {
              ...item.memory,
              userId,
            },
          }),
        });
        if (res.ok) {
          flushedCount++;
        } else {
          remaining.push(item);
        }
      }
    } catch {
      remaining.push(item);
    }
  }

  saveOfflineSyncQueue(userId, remaining);
  return { flushedCount, remainingCount: remaining.length };
}

/**
 * Complete Frontend Memory Restoration & Reconciliation Flow:
 * 1. Flushes any queued offline operations for this user.
 * 2. Retrieves server-side memory records (`GET /api/storage/memories`).
 * 3. Merges server records and local records by stable memory ID (preserving newest `updatedAt` and room assignments).
 * 4. Rehydrates any binary media cached in IndexedDB (`idb://` or missing URLs).
 * 5. Pushes any local-only or newer local memories back to the server vault so both sides stay synchronized.
 */
export async function restoreAndReconcileUserMemories(options: {
  userId: string;
  sessionToken: string;
  localMemories: Memory[];
}): Promise<{
  ok: boolean;
  syncedWithServer: boolean;
  memories: Memory[];
}> {
  const { userId, sessionToken, localMemories } = options;

  // Step 1: Flush offline queue if possible
  await flushOfflineSyncQueue(userId, sessionToken).catch(() => {});
  const remainingQueue = loadOfflineSyncQueue(userId);
  const pendingDeletedIds = remainingQueue
    .filter((q) => q.kind === 'delete')
    .map((q) => q.memoryId);

  let serverRecords: Array<Record<string, unknown>> = [];
  let fetchedFromServer = false;

  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch(
        `/api/storage/memories?userId=${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.memories)) {
          serverRecords = data.memories;
          fetchedFromServer = true;
        }
      }
    } catch {
      fetchedFromServer = false;
    }
  }

  // Step 2: Merge server and local memories using stable IDs and updatedAt timestamps
  let merged = mergeServerAndLocalMemories(
    localMemories,
    serverRecords,
    pendingDeletedIds,
  );

    // Step 3: Rehydrate any IndexedDB binary media blobs gracefully
  const rehydrated: Memory[] = [];
  for (const mem of merged) {
    if (!mem || !mem.id) continue;
    const needsRehydration =
      mem.id.startsWith('mem-upload-') ||
      mem.mediaUrl?.startsWith('idb://') ||
      mem.mediaUrl?.startsWith('blob:') ||
      mem.customImageUrl?.startsWith('idb://') ||
      mem.customImageUrl?.startsWith('blob:');

    if (needsRehydration) {
      const dataUrl = await loadMediaFromIndexedDb(mem.id).catch(() => null);
      if (dataUrl) {
        rehydrated.push({
          ...mem,
          mediaUrl: dataUrl,
          customImageUrl:
            mem.mediaType === 'image' || mem.category === 'Photo' || !mem.mediaType
              ? dataUrl
              : mem.customImageUrl,
        });
        continue;
      }
      // Handle missing or deleted IndexedDB media gracefully (strip broken idb:// or blob: URI so procedural plaque art renders cleanly)
      rehydrated.push({
        ...mem,
        mediaUrl:
          mem.mediaUrl?.startsWith('idb://') || mem.mediaUrl?.startsWith('blob:')
            ? undefined
            : mem.mediaUrl,
        customImageUrl:
          mem.customImageUrl?.startsWith('idb://') ||
          mem.customImageUrl?.startsWith('blob:')
            ? undefined
            : mem.customImageUrl,
      });
    } else {
      rehydrated.push(mem);
    }
  }
  merged = rehydrated;

  // Step 4: If online and local had records not yet on the server, sync merged dataset back to server
  let syncedWithServer = fetchedFromServer;
  if (fetchedFromServer && merged.length > 0) {
    const serverIds = new Set(
      serverRecords.map((r) => (typeof r.id === 'string' ? r.id : '')),
    );
    const hasUnsyncedLocal = merged.some((m) => !serverIds.has(m.id));
    if (hasUnsyncedLocal) {
      const syncRes = await syncMemoriesWithServerVault(
        merged as unknown as Array<{ id: string; [key: string]: unknown }>,
        userId,
        sessionToken,
        pendingDeletedIds,
      );
      syncedWithServer = syncRes.ok;
    }
  }

  return {
    ok: true,
    syncedWithServer,
    memories: merged,
  };
}

export async function loadUserCurationFromVault(
  userId?: string | null,
  sessionToken?: string | null,
): Promise<{
  ok: boolean;
  collections: unknown[];
  connections: unknown[];
}> {
  if (!userId || !sessionToken || typeof fetch === 'undefined') {
    return { ok: false, collections: [], connections: [] };
  }
  try {
    const res = await fetch(
      `/api/storage/curation?userId=${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      },
    );
    if (!res.ok) return { ok: false, collections: [], connections: [] };
    const data = await res.json();
    return {
      ok: Boolean(data?.ok),
      collections: Array.isArray(data?.collections) ? data.collections : [],
      connections: Array.isArray(data?.connections) ? data.connections : [],
    };
  } catch {
    return { ok: false, collections: [], connections: [] };
  }
}

export async function saveUserCurationToVault(
  collections: unknown[],
  connections: unknown[],
  userId?: string | null,
  sessionToken?: string | null,
): Promise<boolean> {
  if (!userId || !sessionToken || typeof fetch === 'undefined') return false;
  try {
    const res = await fetch('/api/storage/curation', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        userId,
        collections,
        connections,
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

function getCurationLocalStorageKey(userId?: string | null): string {
  const safeId = (userId || 'public_demo').trim() || 'public_demo';
  return `memora_curation_state_${safeId}_v1`;
}

export function saveCurationStateToStorage(
  userId: string | undefined | null,
  collectionsOrState:
    | unknown[]
    | { collections: unknown[]; connections: unknown[] },
  maybeConnections?: unknown[],
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload = Array.isArray(collectionsOrState)
      ? {
          collections: collectionsOrState,
          connections: Array.isArray(maybeConnections) ? maybeConnections : [],
        }
      : {
          collections: Array.isArray(collectionsOrState?.collections)
            ? collectionsOrState.collections
            : [],
          connections: Array.isArray(collectionsOrState?.connections)
            ? collectionsOrState.connections
            : [],
        };
    localStorage.setItem(
      getCurationLocalStorageKey(userId),
      JSON.stringify(payload),
    );
  } catch {
    // ignore storage quota errors
  }
}

export function loadCurationStateFromStorage<TCol = any, TCon = any>(
  userId?: string | null,
): { collections: TCol[]; connections: TCon[] } | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getCurationLocalStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      collections: Array.isArray(parsed.collections) ? parsed.collections : [],
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
    };
  } catch {
    return null;
  }
}

export async function syncCurationStateToVault(
  arg1:
    | string
    | undefined
    | null
    | { collections: unknown[]; connections: unknown[]; userId?: string | null },
  arg2?: unknown[] | string | null,
  arg3?: unknown[],
  arg4?: string | null,
): Promise<boolean> {
  if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
    const collections = Array.isArray(arg1.collections) ? arg1.collections : [];
    const connections = Array.isArray(arg1.connections) ? arg1.connections : [];
    const sessionToken = typeof arg2 === 'string' ? arg2 : null;
    const resolvedUserId =
      arg1.userId ||
      (() => {
        if (typeof localStorage === 'undefined') return null;
        try {
          const authRaw = localStorage.getItem('mymuseum_auth_session_v1');
          if (!authRaw) return null;
          const parsed = JSON.parse(authRaw);
          return parsed?.user?.id || null;
        } catch {
          return null;
        }
      })();
    return saveUserCurationToVault(
      collections,
      connections,
      resolvedUserId,
      sessionToken,
    );
  }

  const userId = typeof arg1 === 'string' ? arg1 : null;
  const collections = Array.isArray(arg2) ? arg2 : [];
  const connections = Array.isArray(arg3) ? arg3 : [];
  const sessionToken = typeof arg4 === 'string' ? arg4 : null;
  return saveUserCurationToVault(collections, connections, userId, sessionToken);
}

export async function fetchCurationStateFromVault<TCol = any, TCon = any>(
  sessionToken?: string | null,
  userId?: string | null,
): Promise<{ collections: TCol[]; connections: TCon[] } | null> {
  const resolvedUserId =
    userId ||
    (() => {
      if (typeof localStorage === 'undefined') return null;
      try {
        const authRaw = localStorage.getItem('mymuseum_auth_session_v1');
        if (!authRaw) return null;
        const parsed = JSON.parse(authRaw);
        return parsed?.user?.id || null;
      } catch {
        return null;
      }
    })();
  const res = await loadUserCurationFromVault(resolvedUserId, sessionToken);
  if (!res.ok) return null;
  return {
    collections: res.collections as TCol[],
    connections: res.connections as TCon[],
  };
}

