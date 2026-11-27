import fs from 'fs';
import os from 'os';
import path from 'path';

export interface VaultMediaAsset {
  assetCategory: 'photograph' | 'video' | 'audio' | 'document' | 'model_3d';
  mimeType?: string;
  urlOrRef?: string;
}

export interface VaultStoredMediaFile {
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface VaultMemoryRecord {
  id: string;
  userId: string;
  ownerId: string;
  roomId: string;
  title: string;
  type: string;
  mediaType?: string;
  mediaMimeType?: string;
  mediaUrl?: string;
  customImageUrl?: string;
  storedMediaFile?: VaultStoredMediaFile;
  mediaAssets?: VaultMediaAsset[];
  updatedAt: string;
  [key: string]: unknown;
}

interface UserCurationState {
  collections: unknown[];
  connections: unknown[];
  updatedAt: string;
}

interface VaultDiskData {
  users: Record<string, Record<string, VaultMemoryRecord>>;
  curation: Record<string, UserCurationState>;
}

const DISALLOWED_USER_IDS = new Set([
  'curator-primary',
  'shared',
  'public',
  'default',
  'anonymous',
  'global',
]);

const DISALLOWED_MIME_TYPES = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'application/x-bat',
  'application/javascript',
  'text/javascript',
  'text/html',
]);

function isValidPrivateUserId(userId: unknown): userId is string {
  if (typeof userId !== 'string') return false;
  const trimmed = userId.trim();
  if (trimmed.length < 3 || trimmed.length > 128) return false;
  if (DISALLOWED_USER_IDS.has(trimmed.toLowerCase())) return false;
  return /^[a-zA-Z0-9_.:-]+$/.test(trimmed);
}

function sanitizeMediaUri(uri: unknown): string | undefined {
  if (typeof uri !== 'string') return undefined;
  const trimmed = uri.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('data:application/javascript')
  ) {
    return undefined;
  }
  return trimmed;
}

function classifyAssetCategory(record: Record<string, unknown>): VaultMediaAsset['assetCategory'] {
  const mime = String(record.mediaMimeType || '').toLowerCase();
  const mediaType = String(record.mediaType || record.type || '').toLowerCase();
  if (mime.startsWith('audio/') || mediaType === 'audio' || mediaType === 'voice_note') {
    return 'audio';
  }
  if (mime.startsWith('video/') || mediaType === 'video') {
    return 'video';
  }
  if (
    mime.startsWith('image/') ||
    mediaType === 'image' ||
    mediaType === 'photo'
  ) {
    return 'photograph';
  }
  if (mediaType === 'model_3d') {
    return 'model_3d';
  }
  return 'document';
}

function parseTimestamp(iso: unknown): number {
  if (typeof iso !== 'string' || !iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

const ALLOWED_PERSISTED_MEDIA_MIMES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
};

const DISALLOWED_VAULT_FILE_EXT_RE =
  /\.(pdf|txt|md|json|csv|log|doc|docx|rtf|xls|xlsx|ppt|pptx|html|htm|xml|eml|msg|chat|zip|rar|7z|tar|gz|exe|dll|bat|sh|dmg|iso|apk|msi)$/i;

const SUPPORTED_VAULT_FORMATS_ERROR =
  'Only photos (JPG, JPEG, PNG, WEBP), videos (MP4, MOV, WEBM), and music/audio (MP3, WAV, M4A, OGG) are supported. PDFs, documents, and chat files are not allowed.';

const MAX_PERSISTED_MEDIA_BYTES = 35 * 1024 * 1024; // 35 MB

function sanitizePathSegment(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
  return cleaned.slice(0, 96) || 'item';
}

function parseDataUrlPayload(
  uri: string | undefined,
): { mimeType: string; buffer: Buffer; ext: string } | null {
  if (!uri || typeof uri !== 'string' || !uri.startsWith('data:')) return null;
  const commaIdx = uri.indexOf(',');
  if (commaIdx === -1) return null;
  const header = uri.slice(5, commaIdx).toLowerCase();
  const base64Part = uri.slice(commaIdx + 1);
  if (!header.includes(';base64')) return null;
  const mimeType = header.split(';')[0].trim();
  const ext = ALLOWED_PERSISTED_MEDIA_MIMES[mimeType];
  if (!ext) return null;
  const buffer = Buffer.from(base64Part, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_PERSISTED_MEDIA_BYTES) {
    return null;
  }
  return { mimeType, buffer, ext };
}

export class MemoryVaultService {
  private readonly vaultPath: string;
  private readonly mediaRootDir: string;
  private data: VaultDiskData = { users: {}, curation: {} };

  constructor(vaultFilePath?: string) {
    const projectDefaultPath = path.resolve(
      process.cwd(),
      'data',
      'memora-memory-vault.json',
    );
    this.vaultPath =
      vaultFilePath || process.env.MEMORA_VAULT_PATH || projectDefaultPath;
    this.mediaRootDir = path.resolve(path.dirname(this.vaultPath), 'media');

    // Seamlessly migrate legacy os.tmpdir() vault if project vault doesn't exist yet
    if (!vaultFilePath && !process.env.MEMORA_VAULT_PATH && !fs.existsSync(this.vaultPath)) {
      const legacyPath = path.join(os.tmpdir(), 'memora-memory-vault.json');
      if (fs.existsSync(legacyPath)) {
        try {
          fs.mkdirSync(path.dirname(this.vaultPath), { recursive: true });
          fs.copyFileSync(legacyPath, this.vaultPath);
        } catch {
          // ignore migration error and proceed cleanly
        }
      }
    }

    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.vaultPath)) {
        const raw = fs.readFileSync(this.vaultPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.data = {
            users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
            curation:
              parsed.curation && typeof parsed.curation === 'object'
                ? parsed.curation
                : {},
          };
        }
      }
    } catch {
      this.data = { users: {}, curation: {} };
    }
  }

  private persistToDisk(): boolean {
    try {
      const dir = path.dirname(this.vaultPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.vaultPath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.vaultPath);
      return true;
    } catch {
      return false;
    }
  }

  private persistInlineMediaToDisk(
    userId: string,
    memoryId: string,
    dataUri: string,
  ): VaultStoredMediaFile | null {
    const parsed = parseDataUrlPayload(dataUri);
    if (!parsed) return null;

    const userDirName = sanitizePathSegment(userId);
    const fileName = `${sanitizePathSegment(memoryId)}.${parsed.ext}`;
    const relativePath = path.join(userDirName, fileName);
    const resolvedTarget = path.resolve(this.mediaRootDir, relativePath);
    const rootPrefix = this.mediaRootDir.endsWith(path.sep)
      ? this.mediaRootDir
      : `${this.mediaRootDir}${path.sep}`;

    // Strict path confinement check
    if (!resolvedTarget.startsWith(rootPrefix)) {
      return null;
    }

    try {
      fs.mkdirSync(path.dirname(resolvedTarget), { recursive: true });
      const tmpPath = `${resolvedTarget}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, parsed.buffer);
      fs.renameSync(tmpPath, resolvedTarget);
      return {
        relativePath,
        mimeType: parsed.mimeType,
        sizeBytes: parsed.buffer.length,
      };
    } catch {
      return null;
    }
  }

  private removeStoredMediaFile(stored?: VaultStoredMediaFile): void {
    if (!stored?.relativePath) return;
    const resolvedTarget = path.resolve(this.mediaRootDir, stored.relativePath);
    const rootPrefix = this.mediaRootDir.endsWith(path.sep)
      ? this.mediaRootDir
      : `${this.mediaRootDir}${path.sep}`;
    if (!resolvedTarget.startsWith(rootPrefix)) return;
    try {
      if (fs.existsSync(resolvedTarget)) {
        fs.unlinkSync(resolvedTarget);
      }
    } catch {
      // ignore cleanup error
    }
  }

  public readUserMediaFile(
    userId: string,
    memoryId: string,
  ):
    | { ok: true; filePath: string; mimeType: string }
    | { ok: false; code: string; status: number } {
    if (!isValidPrivateUserId(userId)) {
      return { ok: false, code: 'UNAUTHORIZED', status: 401 };
    }
    const record = this.getUserMemory(userId, memoryId);
    if (!record) {
      return { ok: false, code: 'NOT_FOUND', status: 404 };
    }
    const stored = record.storedMediaFile;
    if (!stored?.relativePath) {
      return { ok: false, code: 'MEDIA_NOT_FOUND', status: 404 };
    }
    const resolvedTarget = path.resolve(this.mediaRootDir, stored.relativePath);
    const rootPrefix = this.mediaRootDir.endsWith(path.sep)
      ? this.mediaRootDir
      : `${this.mediaRootDir}${path.sep}`;
    if (!resolvedTarget.startsWith(rootPrefix)) {
      return { ok: false, code: 'INVALID_PATH', status: 403 };
    }
    if (!fs.existsSync(resolvedTarget)) {
      return { ok: false, code: 'MEDIA_FILE_MISSING', status: 404 };
    }
    return {
      ok: true,
      filePath: resolvedTarget,
      mimeType: stored.mimeType || 'application/octet-stream',
    };
  }

  private validateAndNormalizeRecord(
    userId: string,
    raw: unknown,
    index: number,
  ): { ok: true; record: VaultMemoryRecord } | { ok: false; error: string } {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: `Item #${index} is not a valid memory object.` };
    }
    const obj = raw as Record<string, unknown>;
    const id = typeof obj.id === 'string' ? obj.id.trim() : '';
    const title = typeof obj.title === 'string' ? obj.title.trim() : '';
    const roomId = typeof obj.roomId === 'string' ? obj.roomId.trim() : 'childhood';

    if (!id) {
      return { ok: false, error: `Item #${index} is missing a valid memory "id".` };
    }
    if (!title) {
      return { ok: false, error: `Memory "${id}" is missing a valid "title".` };
    }

    const declaredUser =
      typeof obj.userId === 'string' && obj.userId.trim()
        ? obj.userId.trim()
        : typeof obj.ownerId === 'string' && obj.ownerId.trim()
          ? obj.ownerId.trim()
          : null;
    if (declaredUser && declaredUser !== userId) {
      return {
        ok: false,
        error: `Memory "${id}" declares ownership belonging to another user (${declaredUser}).`,
      };
    }

    const mime =
      typeof obj.mediaMimeType === 'string'
        ? obj.mediaMimeType.trim().toLowerCase()
        : '';
    const mediaFileName =
      typeof obj.mediaFileName === 'string'
        ? obj.mediaFileName.trim().toLowerCase()
        : '';
    const declaredType = String(obj.mediaType || obj.type || '')
      .trim()
      .toLowerCase();

    if (mime && DISALLOWED_MIME_TYPES.has(mime)) {
      return {
        ok: false,
        error: `Memory "${id}" has a disallowed MIME type (${mime}).`,
      };
    }

    // Strictly reject PDFs, documents, and chat file uploads
    if (
      declaredType === 'document' ||
      declaredType === 'chat' ||
      declaredType === 'pdf' ||
      (mediaFileName && DISALLOWED_VAULT_FILE_EXT_RE.test(mediaFileName)) ||
      (mime &&
        mime !== 'application/octet-stream' &&
        !ALLOWED_PERSISTED_MEDIA_MIMES[mime])
    ) {
      return {
        ok: false,
        error: `Unsupported file type for "${title}". ${SUPPORTED_VAULT_FORMATS_ERROR}`,
      };
    }

    const existingRecord = this.data.users[userId]?.[id];
    let safeMediaUrl = sanitizeMediaUri(obj.mediaUrl);
    let safeCustomImageUrl = sanitizeMediaUri(obj.customImageUrl);
    let storedMediaFile: VaultStoredMediaFile | undefined =
      existingRecord?.storedMediaFile;

    // Reject inline data URLs with unsupported MIME types (e.g. data:application/pdf)
    for (const candidateUri of [safeMediaUrl, safeCustomImageUrl]) {
      if (candidateUri && candidateUri.startsWith('data:')) {
        const commaIdx = candidateUri.indexOf(',');
        if (commaIdx !== -1) {
          const dataMime = candidateUri
            .slice(5, commaIdx)
            .split(';')[0]
            .trim()
            .toLowerCase();
          if (dataMime && !ALLOWED_PERSISTED_MEDIA_MIMES[dataMime]) {
            return {
              ok: false,
              error: `Unsupported media payload "${dataMime}". ${SUPPORTED_VAULT_FORMATS_ERROR}`,
            };
          }
        }
      }
    }

    // Persist primary uploaded binary (prioritizing mediaUrl so video/audio files are saved rather than video poster thumbnails)
    const inlineCandidate =
      (safeMediaUrl && safeMediaUrl.startsWith('data:') ? safeMediaUrl : undefined) ||
      (safeCustomImageUrl && safeCustomImageUrl.startsWith('data:')
        ? safeCustomImageUrl
        : undefined);

    if (inlineCandidate) {
      const savedFile = this.persistInlineMediaToDisk(userId, id, inlineCandidate);
      if (savedFile) {
        storedMediaFile = savedFile;
        const durableUrl = `/api/storage/media/${encodeURIComponent(id)}`;
        safeMediaUrl = durableUrl;
        if (savedFile.mimeType.startsWith('image/')) {
          safeCustomImageUrl = durableUrl;
        }
      }
    } else if (storedMediaFile) {
      // Preserve durable server media URL on metadata-only edits
      const durableUrl = `/api/storage/media/${encodeURIComponent(id)}`;
      if (!safeMediaUrl || safeMediaUrl.startsWith('idb://')) {
        safeMediaUrl = durableUrl;
      }
      if (
        storedMediaFile.mimeType.startsWith('image/') &&
        (!safeCustomImageUrl || safeCustomImageUrl.startsWith('idb://'))
      ) {
        safeCustomImageUrl = durableUrl;
      }
    }

    const assetCategory = classifyAssetCategory(obj);
    const existingAssets = Array.isArray(obj.mediaAssets)
      ? (obj.mediaAssets as VaultMediaAsset[])
      : [];
    const mediaAssets: VaultMediaAsset[] =
      existingAssets.length > 0
        ? existingAssets.map((asset, idx) =>
            idx === 0 && storedMediaFile
              ? {
                  ...asset,
                  mimeType: storedMediaFile.mimeType || asset.mimeType,
                  urlOrRef: safeMediaUrl || asset.urlOrRef,
                }
              : asset,
          )
        : [
            {
              assetCategory,
              mimeType: storedMediaFile?.mimeType || mime || undefined,
              urlOrRef: safeMediaUrl,
            },
          ];

    const normalized: VaultMemoryRecord = {
      ...obj,
      id,
      userId,
      ownerId: userId,
      roomId: roomId || 'childhood',
      title,
      type: typeof obj.type === 'string' && obj.type ? obj.type : 'image',
      mediaMimeType: storedMediaFile?.mimeType || mime || (obj.mediaMimeType as string | undefined),
      mediaUrl: safeMediaUrl,
      customImageUrl: safeCustomImageUrl,
      storedMediaFile,
      mediaAssets,
      updatedAt:
        typeof obj.updatedAt === 'string' && obj.updatedAt
          ? obj.updatedAt
          : new Date().toISOString(),
    };

    return { ok: true, record: normalized };
  }

  public listUserMemories(userId: string): VaultMemoryRecord[] {
    if (!isValidPrivateUserId(userId)) return [];
    const bucket = this.data.users[userId];
    if (!bucket) return [];
    return Object.values(bucket);
  }

  public getUserMemory(userId: string, memoryId: string): VaultMemoryRecord | null {
    if (!isValidPrivateUserId(userId)) return null;
    const bucket = this.data.users[userId];
    if (!bucket) return null;
    return bucket[memoryId] ?? null;
  }

  public upsertUserMemories(
    userId: string,
    incoming: unknown[],
  ): {
    ok: boolean;
    code?: string;
    errors: string[];
    savedCount: number;
    totalCount: number;
    savedRecords: VaultMemoryRecord[];
  } {
    if (!isValidPrivateUserId(userId)) {
      return {
        ok: false,
        code: 'INVALID_USER_ID',
        errors: ['A valid authenticated private userId is required.'],
        savedCount: 0,
        totalCount: 0,
        savedRecords: [],
      };
    }

    const validated: VaultMemoryRecord[] = [];
    const errors: string[] = [];
    for (let i = 0; i < incoming.length; i++) {
      const check = this.validateAndNormalizeRecord(userId, incoming[i], i);
      if (!check.ok) {
        errors.push(check.error);
      } else {
        validated.push(check.record);
      }
    }

    if (errors.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        errors,
        savedCount: 0,
        totalCount: this.listUserMemories(userId).length,
        savedRecords: [],
      };
    }

    if (!this.data.users[userId]) {
      this.data.users[userId] = {};
    }
    const bucket = this.data.users[userId];
    const savedRecords: VaultMemoryRecord[] = [];

    for (const rec of validated) {
      const existing = bucket[rec.id];
      if (existing) {
        const existingTs = parseTimestamp(existing.updatedAt);
        const incomingTs = parseTimestamp(rec.updatedAt);
        if (existingTs > 0 && incomingTs > 0 && incomingTs < existingTs) {
          // Protect newer server record against stale overwrites
          continue;
        }
      }
      bucket[rec.id] = rec;
      savedRecords.push(rec);
    }

    const persisted = this.persistToDisk();
    if (!persisted) {
      return {
        ok: false,
        code: 'DISK_PERSIST_FAILED',
        errors: ['Could not write memory vault to project disk.'],
        savedCount: 0,
        totalCount: Object.keys(bucket).length,
        savedRecords: [],
      };
    }

    return {
      ok: true,
      errors: [],
      savedCount: savedRecords.length,
      totalCount: Object.keys(bucket).length,
      savedRecords,
    };
  }

  public syncUserMemories(
    userId: string,
    incoming: unknown[],
    options?: { deletedIds?: string[]; allowEmptyReset?: boolean },
  ): {
    ok: boolean;
    code?: string;
    message?: string;
    errors: string[];
    savedCount: number;
    deletedCount: number;
    rejectedCount: number;
    totalCount: number;
    memories: VaultMemoryRecord[];
  } {
    if (!isValidPrivateUserId(userId)) {
      return {
        ok: false,
        code: 'INVALID_USER_ID',
        message: 'A valid authenticated private userId is required.',
        errors: ['INVALID_USER_ID'],
        savedCount: 0,
        deletedCount: 0,
        rejectedCount: incoming.length,
        totalCount: 0,
        memories: [],
      };
    }

    const existingBucket = this.data.users[userId] || {};
    const existingCount = Object.keys(existingBucket).length;

    if (
      incoming.length === 0 &&
      existingCount > 0 &&
      !options?.allowEmptyReset &&
      (!options?.deletedIds || options.deletedIds.length === 0)
    ) {
      return {
        ok: false,
        code: 'EMPTY_SYNC_REJECTED',
        message:
          'Refusing to overwrite non-empty server memory vault with an empty sync array.',
        errors: ['EMPTY_SYNC_REJECTED'],
        savedCount: 0,
        deletedCount: 0,
        rejectedCount: 0,
        totalCount: existingCount,
        memories: Object.values(existingBucket),
      };
    }

    // Atomic validation pass: validate ALL incoming records before mutating state
    const validated: VaultMemoryRecord[] = [];
    const errors: string[] = [];
    for (let i = 0; i < incoming.length; i++) {
      const check = this.validateAndNormalizeRecord(userId, incoming[i], i);
      if (!check.ok) {
        errors.push(check.error);
      } else {
        validated.push(check.record);
      }
    }

    if (errors.length > 0) {
      return {
        ok: false,
        code: 'SYNC_VALIDATION_FAILED',
        message: errors[0],
        errors,
        savedCount: 0,
        deletedCount: 0,
        rejectedCount: errors.length,
        totalCount: existingCount,
        memories: Object.values(existingBucket),
      };
    }

    const nextBucket: Record<string, VaultMemoryRecord> = { ...existingBucket };
    let deletedCount = 0;
    if (Array.isArray(options?.deletedIds)) {
      for (const delId of options.deletedIds) {
        if (typeof delId === 'string' && nextBucket[delId]) {
          delete nextBucket[delId];
          deletedCount++;
        }
      }
    }

    let savedCount = 0;
    for (const rec of validated) {
      const prev = nextBucket[rec.id];
      if (prev) {
        const prevTs = parseTimestamp(prev.updatedAt);
        const nextTs = parseTimestamp(rec.updatedAt);
        if (prevTs > 0 && nextTs > 0 && nextTs < prevTs) {
          continue;
        }
      }
      nextBucket[rec.id] = rec;
      savedCount++;
    }

    this.data.users[userId] = nextBucket;
    this.persistToDisk();

    const memories = Object.values(nextBucket);
    return {
      ok: true,
      errors: [],
      savedCount,
      deletedCount,
      rejectedCount: 0,
      totalCount: memories.length,
      memories,
    };
  }

  public deleteUserMemory(
    userId: string,
    memoryId: string,
  ): { deleted: boolean; totalCount: number } {
    if (!isValidPrivateUserId(userId)) {
      return { deleted: false, totalCount: 0 };
    }
    const bucket = this.data.users[userId];
    if (!bucket || !bucket[memoryId]) {
      return { deleted: false, totalCount: bucket ? Object.keys(bucket).length : 0 };
    }
    const existing = bucket[memoryId];
    delete bucket[memoryId];
    this.removeStoredMediaFile(existing?.storedMediaFile);
    this.persistToDisk();
    return { deleted: true, totalCount: Object.keys(bucket).length };
  }

  public resetUserMemories(
    userId: string,
    options?: { confirmReset?: boolean },
  ): {
    ok: boolean;
    code?: string;
    message?: string;
    clearedCount: number;
  } {
    if (!isValidPrivateUserId(userId)) {
      return {
        ok: false,
        code: 'INVALID_USER_ID',
        message: 'Invalid user ID.',
        clearedCount: 0,
      };
    }
    if (!options?.confirmReset) {
      return {
        ok: false,
        code: 'CONFIRMATION_REQUIRED',
        message: 'Explicit confirmReset: true is required to clear a user vault.',
        clearedCount: 0,
      };
    }
    const bucket = this.data.users[userId] || {};
    const clearedCount = Object.keys(bucket).length;
    this.data.users[userId] = {};
    this.persistToDisk();
    return { ok: true, clearedCount };
  }

  public getUserCuration(userId: string): UserCurationState {
    if (!isValidPrivateUserId(userId) || !this.data.curation[userId]) {
      return { collections: [], connections: [], updatedAt: '' };
    }
    return this.data.curation[userId];
  }

  public saveUserCuration(
    userId: string,
    collections: unknown[],
    connections: unknown[],
  ): { ok: boolean; state: UserCurationState } {
    const state: UserCurationState = {
      collections: Array.isArray(collections) ? collections : [],
      connections: Array.isArray(connections) ? connections : [],
      updatedAt: new Date().toISOString(),
    };
    if (!isValidPrivateUserId(userId)) {
      return { ok: false, state };
    }
    this.data.curation[userId] = state;
    this.persistToDisk();
    return { ok: true, state };
  }

  public getDiagnostics(userId?: string): {
    vaultPath: string;
    mediaRootDir: string;
    userMemoryCount: number;
    totalUsersTracked: number;
  } {
    return {
      vaultPath: this.vaultPath,
      mediaRootDir: this.mediaRootDir,
      userMemoryCount: userId ? this.listUserMemories(userId).length : 0,
      totalUsersTracked: Object.keys(this.data.users).length,
    };
  }
}
