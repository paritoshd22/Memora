import { CurationBatchItemInput } from '../types/curation';
import { MemoryMediaType } from '../types/museum';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

async function compressImageDataUrlForAnalysis(
  dataUrl: string,
  maxDim = 1024,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve({
          base64: compressed.replace(/^data:[^;]+;base64,/, ''),
          mimeType: 'image/jpeg',
        });
      } else {
        resolve({
          base64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
          mimeType: 'image/jpeg',
        });
      }
    };
    img.onerror = () => {
      resolve({
        base64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
        mimeType: 'image/jpeg',
      });
    };
    img.src = dataUrl;
  });
}

async function extractVideoKeyframes(
  file: File,
): Promise<{ keyframesBase64: string[]; durationSeconds: number }> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return { keyframesBase64: [], durationSeconds: 0 };
  }
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => resolve(), 3500);
      video.onloadedmetadata = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Could not decode video metadata'));
      };
      video.src = objectUrl;
    });

    const duration =
      Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const sampleTimes =
      duration > 1.2
        ? [duration * 0.12, duration * 0.5, duration * 0.84]
        : [0.05];

    const keyframesBase64: string[] = [];
    const canvas = document.createElement('canvas');
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 360;
    const scale = Math.min(1, 640 / Math.max(vw, vh, 1));
    canvas.width = Math.max(1, Math.round(vw * scale));
    canvas.height = Math.max(1, Math.round(vh * scale));
    const ctx = canvas.getContext('2d');

    for (const t of sampleTimes) {
      await new Promise<void>((resolve) => {
        const seekTimeout = window.setTimeout(() => resolve(), 1800);
        video.onseeked = () => {
          window.clearTimeout(seekTimeout);
          resolve();
        };
        try {
          video.currentTime = Math.max(0, Math.min(duration || 0, t));
        } catch {
          window.clearTimeout(seekTimeout);
          resolve();
        }
      });
      if (ctx && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameUrl = canvas.toDataURL('image/jpeg', 0.72);
        keyframesBase64.push(frameUrl.replace(/^data:[^;]+;base64,/, ''));
      }
    }

    return {
      keyframesBase64,
      durationSeconds: duration,
    };
  } catch {
    return { keyframesBase64: [], durationSeconds: 0 };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

export const MAX_UPLOAD_FILE_SIZE_BYTES = 35 * 1024 * 1024; // 35 MB max per file

export const SUPPORTED_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'] as const;
export const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg'] as const;

export const SUPPORTED_UPLOAD_EXTENSIONS = [
  ...SUPPORTED_PHOTO_EXTENSIONS,
  ...SUPPORTED_VIDEO_EXTENSIONS,
  ...SUPPORTED_AUDIO_EXTENSIONS,
] as const;

export const SUPPORTED_PHOTO_MIMES = new Set<string>([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const SUPPORTED_VIDEO_MIMES = new Set<string>([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export const SUPPORTED_AUDIO_MIMES = new Set<string>([
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

export const UPLOAD_ACCEPT_ATTRIBUTE =
  '.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.mp3,.wav,.m4a,.ogg,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4,audio/ogg';

export const SUPPORTED_UPLOAD_FORMATS_MESSAGE =
  'Only photos (JPG, JPEG, PNG, WEBP), videos (MP4, MOV, WEBM), and music/audio (MP3, WAV, M4A, OGG) are supported. PDFs, documents, and chat files are not allowed.';

export type DirectUploadMediaKind = 'image' | 'video' | 'audio';

export interface AutomaticRoomPlacement {
  mediaKind: DirectUploadMediaKind;
  destinationId: 'radio' | 'projector' | 'cupboard';
  destinationLabel: string;
  curatedZoneId: 'memory_radio' | 'outdoor_cinema' | 'memory_wall';
  linkedObjectId: 'memory_radio' | 'memory_projector' | 'wardrobe';
  linkedSpaceId: 'bedroom';
  placementTarget: 'audio_booth' | 'cinema_screen' | 'wall_frame';
  linked3DObject: string;
  category: 'Photo' | 'Video' | 'Audio';
  subtitle: string;
}

export function resolveAutomaticRoomPlacement(
  mediaKind: DirectUploadMediaKind,
): AutomaticRoomPlacement {
  if (mediaKind === 'audio') {
    return {
      mediaKind: 'audio',
      destinationId: 'radio',
      destinationLabel: 'Radio',
      curatedZoneId: 'memory_radio',
      linkedObjectId: 'memory_radio',
      linkedSpaceId: 'bedroom',
      placementTarget: 'audio_booth',
      linked3DObject: 'Vintage Memory Radio',
      category: 'Audio',
      subtitle: 'Radio Track',
    };
  }
  if (mediaKind === 'video') {
    return {
      mediaKind: 'video',
      destinationId: 'projector',
      destinationLabel: 'Projector',
      curatedZoneId: 'outdoor_cinema',
      linkedObjectId: 'memory_projector',
      linkedSpaceId: 'bedroom',
      placementTarget: 'cinema_screen',
      linked3DObject: 'Memory Projector',
      category: 'Video',
      subtitle: 'Projector Film',
    };
  }
  return {
    mediaKind: 'image',
    destinationId: 'cupboard',
    destinationLabel: 'Cupboard & Photo Display',
    curatedZoneId: 'memory_wall',
    linkedObjectId: 'wardrobe',
    linkedSpaceId: 'bedroom',
    placementTarget: 'wall_frame',
    linked3DObject: 'Cupboard & Photo Display',
    category: 'Photo',
    subtitle: 'Cupboard & Photo Display',
  };
}

export interface UploadFileValidationResult {
  valid: boolean;
  code?:
    | 'EMPTY_FILE'
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_FORMAT'
    | 'DUPLICATE_MEMORY';
  reason?: string;
  detectedMediaType?: DirectUploadMediaKind;
  dedupKey: string;
}

function resolveAllowedDirectMediaKind(
  fileName: string,
  mimeType: string,
): DirectUploadMediaKind | null {
  const normalizedName = (fileName || '').trim().toLowerCase();
  const normalizedMime = (mimeType || '').trim().toLowerCase();
  const extMatch = normalizedName.match(/\.([a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';

  // Explicitly block PDFs, documents, text, and chat files regardless of MIME quirks
  if (
    /\.(pdf|txt|md|json|csv|log|doc|docx|rtf|xls|xlsx|ppt|pptx|html|htm|xml|eml|msg|chat|zip|rar|7z|tar|gz|exe|dll|bat|sh|dmg|iso|apk|msi)$/i.test(
      normalizedName,
    )
  ) {
    return null;
  }
  if (
    normalizedMime === 'application/pdf' ||
    normalizedMime.startsWith('text/') ||
    normalizedMime === 'application/json' ||
    normalizedMime === 'application/rtf' ||
    normalizedMime === 'application/msword' ||
    normalizedMime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return null;
  }

  const isPhotoExt = (SUPPORTED_PHOTO_EXTENSIONS as readonly string[]).includes(ext);
  const isVideoExt = (SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
  const isAudioExt = (SUPPORTED_AUDIO_EXTENSIONS as readonly string[]).includes(ext);

  const isPhotoMime = SUPPORTED_PHOTO_MIMES.has(normalizedMime);
  const isVideoMime = SUPPORTED_VIDEO_MIMES.has(normalizedMime);
  const isAudioMime = SUPPORTED_AUDIO_MIMES.has(normalizedMime);

  // If extension is present, it MUST be one of the strictly supported extensions
  if (ext) {
    if (isPhotoExt && (!normalizedMime || normalizedMime === 'application/octet-stream' || isPhotoMime)) {
      return 'image';
    }
    if (isVideoExt && (!normalizedMime || normalizedMime === 'application/octet-stream' || isVideoMime)) {
      return 'video';
    }
    if (isAudioExt && (!normalizedMime || normalizedMime === 'application/octet-stream' || isAudioMime)) {
      return 'audio';
    }
    return null;
  }

  // Fallback when filename has no extension: check strict MIME
  if (isPhotoMime) return 'image';
  if (isVideoMime) return 'video';
  if (isAudioMime) return 'audio';
  return null;
}

export function validateUploadFileCandidate(
  file: { name: string; type?: string; size: number },
  existingMemories: Array<{
    mediaFileName?: string;
    title?: string;
    mediaMimeType?: string;
  }> = [],
  seenBatchKeys?: Set<string>,
): UploadFileValidationResult {
  const fileName = (file?.name || '').trim();
  const mimeType = (file?.type || '').trim().toLowerCase();
  const size = typeof file?.size === 'number' ? file.size : 0;
  const normalizedName = fileName.toLowerCase();
  const dedupKey = `${normalizedName}::${size}`;

  if (!fileName || size <= 0) {
    return {
      valid: false,
      code: 'EMPTY_FILE',
      reason: `"${fileName || 'File'}" is empty (0 bytes) and cannot be uploaded.`,
      dedupKey,
    };
  }

  if (size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      reason: `"${fileName}" exceeds the 35 MB file size limit (${(size / (1024 * 1024)).toFixed(1)} MB).`,
      dedupKey,
    };
  }

  const detected = resolveAllowedDirectMediaKind(fileName, mimeType);
  if (!detected) {
    return {
      valid: false,
      code: 'UNSUPPORTED_FORMAT',
      reason: `"${fileName}" is not supported. ${SUPPORTED_UPLOAD_FORMATS_MESSAGE}`,
      dedupKey,
    };
  }

  if (seenBatchKeys && seenBatchKeys.has(dedupKey)) {
    return {
      valid: false,
      code: 'DUPLICATE_MEMORY',
      reason: `"${fileName}" was already selected in this upload batch.`,
      dedupKey,
    };
  }

  const duplicateInArchive = existingMemories.some((m) => {
    const existingFile = (m.mediaFileName || '').trim().toLowerCase();
    return Boolean(existingFile && existingFile === normalizedName);
  });

  if (duplicateInArchive) {
    return {
      valid: false,
      code: 'DUPLICATE_MEMORY',
      reason: `"${fileName}" is already saved in your room.`,
      dedupKey,
    };
  }

  if (seenBatchKeys) {
    seenBatchKeys.add(dedupKey);
  }

  return {
    valid: true,
    detectedMediaType: detected,
    dedupKey,
  };
}

export function extractReadableDocumentText(
  rawText: string,
  fileName: string,
): string {
  const text = (rawText || '').trim();
  if (!text) return '';
  if (/\.rtf$/i.test(fileName) || text.startsWith('{\\rtf')) {
    return text
      .replace(/\{\\\*[^{}]*\}/g, ' ')
      .replace(/\{\\fonttbl[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, ' ')
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
      .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
      .replace(/[{}]/g, '')
      .replace(/\s+\n/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
  return text;
}

export function detectMediaTypeFromFile(
  fileName: string,
  mimeType: string,
  _textSample?: string,
): MemoryMediaType {
  const allowed = resolveAllowedDirectMediaKind(fileName, mimeType);
  if (allowed) return allowed;
  const lowerName = (fileName || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();
  if (lowerMime.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(lowerName)) {
    return 'image';
  }
  if (lowerMime.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(lowerName)) {
    return 'video';
  }
  if (lowerMime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg)$/i.test(lowerName)) {
    return 'audio';
  }
  return 'document';
}

function inferMimeFromExtension(fileName: string, fallbackMime: string): string {
  if (fallbackMime && fallbackMime !== 'application/octet-stream') {
    return fallbackMime.toLowerCase();
  }
  const extMatch = (fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
  };
  return map[ext] || fallbackMime || 'application/octet-stream';
}

function deriveCleanTitleFromFileName(fileName: string): string {
  const withoutExt = (fileName || 'Uploaded Memory').replace(/\.[^.]+$/, '');
  const spaced = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced || 'Uploaded Memory';
}

export async function prepareFileForAutoCuration(
  file: File,
): Promise<CurationBatchItemInput> {
  const check = validateUploadFileCandidate(file);
  if (!check.valid || !check.detectedMediaType) {
    throw new Error(check.reason || SUPPORTED_UPLOAD_FORMATS_MESSAGE);
  }
  const tempId = `batch_item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const mimeType = inferMimeFromExtension(file.name, file.type);
  const detectedMediaType = check.detectedMediaType;
  const originalDataUrl = await readFileAsDataUrl(file);

  const result: CurationBatchItemInput = {
    tempId,
    fileName: file.name,
    mimeType,
    detectedMediaType,
    sizeBytes: file.size,
    originalDataUrl,
    captureSource: 'upload',
  };

  if (detectedMediaType === 'image' && originalDataUrl) {
    const compressed = await compressImageDataUrlForAnalysis(originalDataUrl);
    result.analysisImageBase64 = compressed.base64;
    result.analysisImageMimeType = compressed.mimeType;
  } else if (detectedMediaType === 'video') {
    const kf = await extractVideoKeyframes(file);
    result.videoKeyframesBase64 = kf.keyframesBase64;
    result.videoDurationSeconds = kf.durationSeconds;
  } else if (detectedMediaType === 'audio' && originalDataUrl) {
    if (originalDataUrl.length < 7_500_000) {
      result.audioBase64 = originalDataUrl.replace(/^data:[^;]+;base64,/, '');
      result.audioMimeType = mimeType.startsWith('audio/') ? mimeType : 'audio/mpeg';
    }
  }

  return result;
}

/**
 * Prepares a validated Photo, Video, or Music file directly for immediate
 * persistence and automatic room placement (Cupboard & Photo Display, Projector, or Radio)
 * without requiring Gemini.
 */
export async function buildDirectlyPlacedMemoryFromFile(
  file: File,
  options: {
    roomId: string;
    ownerId?: string;
    userTitle?: string;
    userDescription?: string;
    userDate?: string;
  },
): Promise<{
  memory: import('../types/museum').Memory;
  placement: AutomaticRoomPlacement;
}> {
  const check = validateUploadFileCandidate(file);
  if (!check.valid || !check.detectedMediaType) {
    throw new Error(check.reason || SUPPORTED_UPLOAD_FORMATS_MESSAGE);
  }

  const mediaKind = check.detectedMediaType;
  const mimeType = inferMimeFromExtension(file.name, file.type);
  const placement = resolveAutomaticRoomPlacement(mediaKind);
  const originalDataUrl = await readFileAsDataUrl(file);

  let videoPosterDataUrl: string | undefined;
  if (mediaKind === 'video') {
    const kf = await extractVideoKeyframes(file).catch(() => ({
      keyframesBase64: [],
      durationSeconds: 0,
    }));
    if (kf.keyframesBase64[0]) {
      videoPosterDataUrl = `data:image/jpeg;base64,${kf.keyframesBase64[0]}`;
    }
  }

  const now = new Date();
  const id = `mem-upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const cleanTitle = (options.userTitle || '').trim() || deriveCleanTitleFromFileName(file.name);
  const cleanDescription = (options.userDescription || '').trim();
  const cleanDate = (options.userDate || '').trim();
  const yearMatch = cleanDate.match(/\b(19|20)\d{2}\b/);
  const parsedYear = yearMatch ? Number(yearMatch[0]) : now.getFullYear();

  const memory: import('../types/museum').Memory = {
    id,
    ownerId: options.ownerId,
    roomId: options.roomId || 'childhood',
    title: cleanTitle,
    subtitle: placement.subtitle,
    date: cleanDate,
    year: parsedYear,
    location: placement.destinationLabel,
    category: placement.category,
    type: mediaKind,
    mediaType: mediaKind,
    mediaUrl: originalDataUrl,
    customImageUrl: mediaKind === 'image' ? originalDataUrl : videoPosterDataUrl,
    mediaMimeType: mimeType,
    mediaFileName: file.name,
    audioKind: mediaKind === 'audio' ? 'music' : undefined,
    description:
      cleanDescription ||
      (mediaKind === 'audio'
        ? `Uploaded music track placed on the room Radio (${file.name}).`
        : mediaKind === 'video'
          ? `Uploaded video placed in the room Projector (${file.name}).`
          : `Uploaded photo placed in the Cupboard & Photo Display (${file.name}).`),
    story: cleanDescription,
    accessionNumber: `ACC.${parsedYear}.${id.slice(-4).toUpperCase()}`,
    motif:
      mediaKind === 'audio'
        ? 'courtyard_lanterns'
        : mediaKind === 'video'
          ? 'observatory_stars'
          : 'treehouse_meadow',
    palette:
      mediaKind === 'audio'
        ? ['#F2DEC0', '#C9A66B', '#3E2B1E', '#E6B86A']
        : mediaKind === 'video'
          ? ['#E9DEC9', '#8A633C', '#241C16', '#D6A15D']
          : ['#F4D8AF', '#D38B52', '#442D1C', '#D6A15D'],
    tags: [
      mediaKind === 'audio' ? 'radio' : mediaKind === 'video' ? 'projector' : 'photo',
      placement.destinationId,
    ],
    curatedZoneId: placement.curatedZoneId,
    placementTarget: placement.placementTarget,
    linkedObjectId: placement.linkedObjectId,
    linkedSpaceId: placement.linkedSpaceId,
    linked3DObject: placement.linked3DObject,
    hiddenFrom3D: false,
    confirmationStatus: 'manual_no_ai',
    userProvided: {
      title: options.userTitle?.trim() || undefined,
      description: cleanDescription || undefined,
      date: cleanDate || undefined,
    },
    updatedAt: now.toISOString(),
  };

  return { memory, placement };
}

export async function prepareCameraCaptureForAutoCuration(
  dataUrl: string,
  label?: string,
): Promise<CurationBatchItemInput> {
  const compressed = await compressImageDataUrlForAnalysis(dataUrl);
  return {
    tempId: `batch_cam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    fileName: label || `Captured Photo ${new Date().toLocaleTimeString()}.jpg`,
    mimeType: 'image/jpeg',
    detectedMediaType: 'image',
    originalDataUrl: dataUrl,
    analysisImageBase64: compressed.base64,
    analysisImageMimeType: compressed.mimeType,
    captureSource: 'camera',
  };
}

