import { CurationBatchItemInput } from '../types/curation';
import { MemoryMediaType } from '../types/museum';
import { parseChatExportText } from './curationValidator';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read text file.'));
    reader.readAsText(file);
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

export const MAX_UPLOAD_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB max per file

export const SUPPORTED_UPLOAD_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'heic',
  'avif',
  'mp4',
  'mov',
  'webm',
  'm4v',
  'mkv',
  'mp3',
  'wav',
  'm4a',
  'ogg',
  'aac',
  'flac',
  'weba',
  'pdf',
  'txt',
  'md',
  'json',
  'csv',
  'log',
  'doc',
  'docx',
  'rtf',
] as const;

export interface UploadFileValidationResult {
  valid: boolean;
  code?:
    | 'EMPTY_FILE'
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_FORMAT'
    | 'DUPLICATE_MEMORY';
  reason?: string;
  detectedMediaType?: MemoryMediaType;
  dedupKey: string;
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
      reason: `"${fileName || 'File'}" is empty (0 bytes) and cannot be processed.`,
      dedupKey,
    };
  }

  if (size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      reason: `"${fileName}" exceeds the 50 MB file size limit (${(size / (1024 * 1024)).toFixed(1)} MB).`,
      dedupKey,
    };
  }

  const extMatch = normalizedName.match(/\.([a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';
  const hasSupportedExt = (
    SUPPORTED_UPLOAD_EXTENSIONS as readonly string[]
  ).includes(ext);
  const hasSupportedMime =
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/rtf' ||
    mimeType === 'application/msword' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const isDisallowedBinary = /\.(exe|dll|bat|sh|dmg|iso|apk|msi|zip|rar|7z|tar|gz)$/i.test(
    normalizedName,
  );

  if (isDisallowedBinary || (!hasSupportedExt && !hasSupportedMime)) {
    return {
      valid: false,
      code: 'UNSUPPORTED_FORMAT',
      reason: `"${fileName}" is not a supported memory format. Supported formats: JPG, PNG, WEBP, MP4, WebM, MP3, WAV, M4A, PDF, TXT, DOC/DOCX, and Chat exports.`,
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
      reason: `"${fileName}" is already preserved in your MEMORA archive.`,
      dedupKey,
    };
  }

  if (seenBatchKeys) {
    seenBatchKeys.add(dedupKey);
  }

  return {
    valid: true,
    detectedMediaType: detectMediaTypeFromFile(fileName, mimeType),
    dedupKey,
  };
}

export function extractReadableDocumentText(
  rawText: string,
  fileName: string,
): string {
  if (!rawText) return '';
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.rtf')) {
    return rawText
      .replace(/\\par[d]?/g, '\n')
      .replace(/\{\*?\\[^{}]+}|[{}]|\\\n?[A-Za-z]+\n?(?:-?\d+)?[ ]?/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    // Extract readable XML/ASCII text runs if present without corrupting binary bytes
    const xmlMatches = rawText.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (xmlMatches && xmlMatches.length > 0) {
      return xmlMatches
        .map((m) => m.replace(/<[^>]+>/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    const printableRuns = rawText.match(/[A-Za-z0-9 ,.;:'"?!()\-\n]{12,}/g);
    if (printableRuns && printableRuns.length > 0) {
      return printableRuns.join(' ').slice(0, 8000).trim();
    }
    return '';
  }
  return rawText.trim();
}

export function detectMediaTypeFromFile(
  fileName: string,
  mimeType: string,
  textSample?: string,
): MemoryMediaType {
  const lowerName = (fileName || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  if (lowerMime.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|avif)$/i.test(lowerName)) {
    return 'image';
  }
  if (lowerMime.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv)$/i.test(lowerName)) {
    return 'video';
  }
  if (lowerMime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac|weba)$/i.test(lowerName)) {
    return 'audio';
  }

  if (textSample) {
    const chatCheck = parseChatExportText(textSample, fileName);
    if (
      chatCheck.formatDetected === 'whatsapp' ||
      chatCheck.formatDetected === 'imessage' ||
      chatCheck.formatDetected === 'json' ||
      (chatCheck.messages.length >= 2 && chatCheck.participants.length >= 2)
    ) {
      return 'chat';
    }
  }

  if (/\b(whatsapp|imessage|chat|messages|conversation)\b/i.test(lowerName)) {
    return 'chat';
  }

  if (/\b(certificate|diploma|award|transcript|report[-_ ]card)\b/i.test(lowerName)) {
    return 'certificate';
  }

  if (
    lowerMime === 'application/pdf' ||
    /\.(pdf|docx?|rtf)$/i.test(lowerName)
  ) {
    return 'document';
  }

  if (/\.(txt|md|json|csv|log)$/i.test(lowerName) || lowerMime.startsWith('text/')) {
    if (textSample && textSample.length < 4000 && !/whatsapp|chat/i.test(lowerName)) {
      return 'story';
    }
    return 'document';
  }

  return 'document';
}

export async function prepareFileForAutoCuration(
  file: File,
): Promise<CurationBatchItemInput> {
  const tempId = `batch_item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const mimeType = file.type || 'application/octet-stream';
  const lowerName = file.name.toLowerCase();

  const isTextLike =
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/rtf' ||
    /\.(txt|md|json|csv|log|rtf|docx?)$/i.test(lowerName);

  let rawTextContent: string | undefined;
  if (isTextLike) {
    const rawRead = await readFileAsText(file).catch(() => '');
    rawTextContent = extractReadableDocumentText(rawRead, file.name);
  }

  const detectedMediaType = detectMediaTypeFromFile(
    file.name,
    mimeType,
    rawTextContent,
  );

  const originalDataUrl = await readFileAsDataUrl(file).catch(() => undefined);

  const result: CurationBatchItemInput = {
    tempId,
    fileName: file.name,
    mimeType,
    detectedMediaType,
    sizeBytes: file.size,
    originalDataUrl,
    rawTextContent,
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
    // Keep server transfer within express json limit (~7MB base64 max)
    if (originalDataUrl.length < 7_500_000) {
      result.audioBase64 = originalDataUrl.replace(/^data:[^;]+;base64,/, '');
      result.audioMimeType = mimeType.startsWith('audio/') ? mimeType : 'audio/mpeg';
    }
  } else if (
    (detectedMediaType === 'document' || detectedMediaType === 'certificate') &&
    mimeType === 'application/pdf' &&
    originalDataUrl &&
    originalDataUrl.length < 6_500_000
  ) {
    result.documentBase64 = originalDataUrl.replace(/^data:[^;]+;base64,/, '');
  }

  return result;
}

export function prepareTextMemoryForAutoCuration(params: {
  text: string;
  titleHint?: string;
}): CurationBatchItemInput {
  const trimmed = (params.text || '').trim();
  const chatCheck = parseChatExportText(trimmed);
  const looksLikeChat =
    chatCheck.formatDetected === 'whatsapp' ||
    chatCheck.formatDetected === 'imessage' ||
    chatCheck.formatDetected === 'json' ||
    (chatCheck.messages.length >= 2 && chatCheck.participants.length >= 2);

  const safeTitle = (params.titleHint || '').trim();
  const fileName = looksLikeChat
    ? safeTitle || 'Archived Chat Conversation.txt'
    : safeTitle || 'Personal Written Memory.txt';

  return {
    tempId: `batch_text_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    fileName,
    mimeType: 'text/plain',
    detectedMediaType: looksLikeChat ? 'chat' : 'story',
    rawTextContent: trimmed,
    originalDataUrl: undefined,
    captureSource: 'written',
  };
}

export async function prepareCameraCaptureForAutoCuration(
  dataUrl: string,
  label?: string,
): Promise<CurationBatchItemInput> {
  const compressed = await compressImageDataUrlForAnalysis(dataUrl);
  return {
    tempId: `batch_cam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    fileName: label || `Captured Memory ${new Date().toLocaleTimeString()}.jpg`,
    mimeType: 'image/jpeg',
    detectedMediaType: 'image',
    originalDataUrl: dataUrl,
    analysisImageBase64: compressed.base64,
    analysisImageMimeType: compressed.mimeType,
    captureSource: 'camera',
  };
}
