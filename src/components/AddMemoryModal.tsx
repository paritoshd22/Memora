import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  Plus,
  Radio,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { CurationBatchItemInput } from '../types/curation';
import { Memory, Room } from '../types/museum';
import {
  AutomaticRoomPlacement,
  buildDirectlyPlacedMemoryFromFile,
  DirectUploadMediaKind,
  resolveAutomaticRoomPlacement,
  UPLOAD_ACCEPT_ATTRIBUTE,
  validateUploadFileCandidate,
} from '../utils/clientMediaExtractor';

interface StagedUploadItem {
  id: string;
  file: File;
  mediaKind: DirectUploadMediaKind;
  placement: AutomaticRoomPlacement;
  previewUrl?: string;
}

interface UploadedPlacementReceipt {
  memoryId: string;
  title: string;
  fileName: string;
  mediaKind: DirectUploadMediaKind;
  destinationLabel: string;
}

export interface DirectUploadResult {
  ok: boolean;
  savedMemories: Memory[];
  errorMessage?: string;
  aborted?: boolean;
}

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  existingMemories?: Memory[];
  defaultRoomId?: string | null;
  ownerId?: string | null;
  onAddMemories: (newMemories: Memory[]) => void;
  onDirectUploadMemories?: (
    newMemories: Memory[],
    options?: { signal?: AbortSignal },
  ) => Promise<DirectUploadResult>;
  onStartAutoCuration?: (items: CurationBatchItemInput[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const AddMemoryModal: React.FC<AddMemoryModalProps> = ({
  isOpen,
  onClose,
  rooms,
  existingMemories = [],
  defaultRoomId,
  ownerId,
  onAddMemories,
  onDirectUploadMemories,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const stagedFilesRef = useRef<StagedUploadItem[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'camera'>('files');
  const [stagedFiles, setStagedFiles] = useState<StagedUploadItem[]>([]);
  const [contextTitle, setContextTitle] = useState('');
  const [contextDescription, setContextDescription] = useState('');
  const [contextDate, setContextDate] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [validationNotices, setValidationNotices] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedReceipts, setUploadedReceipts] = useState<
    UploadedPlacementReceipt[]
  >([]);

  useEffect(() => {
    stagedFilesRef.current = stagedFiles;
  }, [stagedFiles]);

  const revokeStagedPreviews = (items: StagedUploadItem[]) => {
    items.forEach((it) => {
      if (it?.previewUrl) {
        try {
          URL.revokeObjectURL(it.previewUrl);
        } catch {
          // ignore
        }
      }
    });
  };

  const stopCameraStream = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      activeStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      try {
        videoPreviewRef.current.pause();
        videoPreviewRef.current.srcObject = null;
      } catch {
        // ignore
      }
    }
    if (isMountedRef.current) {
      setCameraActive(false);
    }
  };

  const cancelActiveUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
    }
    if (isMountedRef.current) {
      setIsUploading(false);
      setUploadProgressPct(0);
      setUploadStatusText(null);
    }
  };

  const handleCloseModal = () => {
    cancelActiveUpload();
    stopCameraStream();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      cancelActiveUpload();
      stopCameraStream();
      setStagedFiles((prev) => {
        revokeStagedPreviews(prev);
        return [];
      });
      setContextTitle('');
      setContextDescription('');
      setContextDate('');
      setUploadStatusText(null);
      setUploadProgressPct(0);
      setCameraError(null);
      setValidationNotices([]);
      setUploadError(null);
      setUploadedReceipts([]);
      setActiveTab('files');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      uploadAbortRef.current?.abort();
      uploadAbortRef.current = null;
      stopCameraStream();
      revokeStagedPreviews(stagedFilesRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const targetRoomId = defaultRoomId || 'childhood';
  const targetRoom = rooms.find((r) => r.id === targetRoomId);
  const targetRoomName = targetRoom?.name || 'Childhood Room';

  const handleStageFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setValidationNotices([]);
    setUploadError(null);
    setUploadedReceipts([]);
    const seenBatchKeys = new Set<string>(
      stagedFiles.map(
        (s) => `${s.file.name.toLowerCase()}::${s.file.size}`,
      ),
    );
    const newlyStaged: StagedUploadItem[] = [];
    const notices: string[] = [];

    for (const file of files) {
      const check = validateUploadFileCandidate(
        file,
        existingMemories,
        seenBatchKeys,
      );
      if (check.valid && check.detectedMediaType) {
        const placement = resolveAutomaticRoomPlacement(
          check.detectedMediaType,
        );
        const previewUrl =
          check.detectedMediaType === 'image'
            ? URL.createObjectURL(file)
            : undefined;
        newlyStaged.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          mediaKind: check.detectedMediaType,
          placement,
          previewUrl,
        });
      } else if (check.reason) {
        notices.push(check.reason);
      }
    }

    if (notices.length > 0) {
      setValidationNotices(notices);
    }

    if (newlyStaged.length > 0) {
      setStagedFiles((prev) => [...prev, ...newlyStaged]);
    }
  };

  const handleRemoveStaged = (id: string) => {
    setStagedFiles((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const persistPreparedMemories = async (
    built: Array<{ memory: Memory; placement: AutomaticRoomPlacement }>,
    signal?: AbortSignal,
  ) => {
    if (signal?.aborted) return;
    const newMemories = built.map((b) => b.memory);
    setUploadProgressPct(85);
    setUploadStatusText(
      `Saving ${newMemories.length} ${newMemories.length === 1 ? 'memory' : 'memories'} to ${targetRoomName}…`,
    );

    if (onDirectUploadMemories) {
      const result = await onDirectUploadMemories(newMemories, { signal });
      if (!isMountedRef.current || signal?.aborted || result.aborted) return;
      if (!result.ok) {
        setUploadError(
          result.errorMessage ||
            'Could not save your uploaded files to storage. Please retry.',
        );
        return;
      }
    } else {
      if (signal?.aborted) return;
      onAddMemories(newMemories);
    }

    if (!isMountedRef.current || signal?.aborted) return;
    setUploadProgressPct(100);
    setUploadStatusText(null);
    setUploadedReceipts(
      built.map(({ memory, placement }) => ({
        memoryId: memory.id,
        title: memory.title,
        fileName: memory.mediaFileName || memory.title,
        mediaKind: placement.mediaKind,
        destinationLabel: placement.destinationLabel,
      })),
    );
    setStagedFiles((prev) => {
      revokeStagedPreviews(prev);
      return [];
    });
    setContextTitle('');
    setContextDescription('');
    setContextDate('');
  };

  const handleUploadStagedFiles = async () => {
    if (stagedFiles.length === 0 || isUploading) return;

    uploadAbortRef.current?.abort();
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    setIsUploading(true);
    setUploadError(null);
    setValidationNotices([]);
    setUploadProgressPct(8);
    setUploadStatusText(
      `Preparing 1 of ${stagedFiles.length} file${stagedFiles.length === 1 ? '' : 's'}…`,
    );

    try {
      const built: Array<{
        memory: Memory;
        placement: AutomaticRoomPlacement;
      }> = [];

      for (let idx = 0; idx < stagedFiles.length; idx++) {
        if (!isMountedRef.current || controller.signal.aborted) return;
        const stagedItem = stagedFiles[idx];
        const { file } = stagedItem;
        const pct = Math.round(((idx + 0.5) / stagedFiles.length) * 72) + 8;
        setUploadProgressPct(pct);
        setUploadStatusText(
          `Uploading (${idx + 1}/${stagedFiles.length}): ${file.name} → ${stagedItem.placement.destinationLabel}`,
        );
        const item = await buildDirectlyPlacedMemoryFromFile(file, {
          roomId: targetRoomId,
          ownerId: ownerId || undefined,
          userTitle: stagedFiles.length === 1 ? contextTitle : undefined,
          userDescription: contextDescription,
          userDate: contextDate,
        });
        if (!isMountedRef.current || controller.signal.aborted) return;
        built.push(item);
      }

      if (!isMountedRef.current || controller.signal.aborted) return;
      if (built.length > 0) {
        await persistPreparedMemories(built, controller.signal);
      }
    } catch (err) {
      if (isMountedRef.current && !controller.signal.aborted) {
        setUploadError(
          err instanceof Error
            ? err.message
            : 'Unable to upload one or more selected files. Please try again.',
        );
      }
    } finally {
      if (uploadAbortRef.current === controller) {
        uploadAbortRef.current = null;
      }
      if (isMountedRef.current) {
        setIsUploading(false);
      }
    }
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera capture is unavailable in this browser context.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      activeStreamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (isMountedRef.current && videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          void videoPreviewRef.current.play().catch(() => {});
        }
      });
    } catch {
      if (isMountedRef.current) {
        setCameraError(
          'Camera permission was denied or unavailable. You can still upload photos, videos, and music anytime.',
        );
      }
    }
  };

  const handleCapturePhoto = async () => {
    const video = videoPreviewRef.current;
    if (!video || isUploading) return;
    uploadAbortRef.current?.abort();
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgressPct(25);
    setUploadStatusText('Capturing photo for Cupboard & Photo Display…');

    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9),
      );
      stopCameraStream();
      if (controller.signal.aborted) return;
      if (!blob) {
        throw new Error('Could not capture photo from camera feed.');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const capturedFile = new File([blob], `captured-photo-${timestamp}.jpg`, {
        type: 'image/jpeg',
      });
      const built = await buildDirectlyPlacedMemoryFromFile(capturedFile, {
        roomId: targetRoomId,
        ownerId: ownerId || undefined,
      });
      if (!isMountedRef.current || controller.signal.aborted) return;
      await persistPreparedMemories([built], controller.signal);
      if (isMountedRef.current && !controller.signal.aborted) {
        setActiveTab('files');
      }
    } catch (err) {
      if (isMountedRef.current && !controller.signal.aborted) {
        setCameraError(
          err instanceof Error
            ? err.message
            : 'Could not capture photo from camera feed. Please try again.',
        );
      }
    } finally {
      if (uploadAbortRef.current === controller) {
        uploadAbortRef.current = null;
      }
      if (isMountedRef.current) {
        setIsUploading(false);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-memories-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#18110B]/80 backdrop-blur-sm museum-fade-in"
    >
      <div className="w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl bg-[#FFFCF6] border border-[#D8C5A6] shadow-2xl overflow-hidden text-[#27231F] museum-panel-enter">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E8DED0] bg-[#FAF4E8] flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#854D27]">
              {targetRoomName} Media Upload
            </p>
            <h2
              id="add-memories-title"
              className="font-serif-display text-xl sm:text-2xl font-semibold text-[#27231F] mt-0.5"
            >
              Bring your memories into this room
            </h2>
            <p className="text-xs text-[#493629] mt-1 leading-relaxed">
              Upload photos, videos, or music. Each file is saved and placed directly into its spot inside {targetRoomName}.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            aria-label={isUploading ? 'Cancel upload and close modal' : 'Close Upload Memories modal'}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#6E5641] hover:bg-[#EFE6D5] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher — Photos/Videos/Music Upload or Camera Capture only */}
        <div className="px-5 sm:px-6 pt-2.5 flex items-center gap-2 border-b border-[#F1E8D8] shrink-0">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              stopCameraStream();
              setActiveTab('files');
            }}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'files'
                ? 'border-[#854D27] text-[#27231F]'
                : 'border-transparent text-[#6E5641] hover:text-[#27231F]'
            }`}
          >
            Photos, Videos &amp; Music
          </button>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => setActiveTab('camera')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'camera'
                ? 'border-[#854D27] text-[#27231F]'
                : 'border-transparent text-[#6E5641] hover:text-[#27231F]'
            }`}
          >
            Camera Capture
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {activeTab === 'files' && (
            <>
              {/* Success Confirmation Panel */}
              {uploadedReceipts.length > 0 && (
                <div
                  role="status"
                  className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#14532D]">
                        {uploadedReceipts.length === 1
                          ? '1 memory placed in the room'
                          : `${uploadedReceipts.length} memories placed in the room`}
                      </p>
                      <p className="text-xs text-[#166534] mt-0.5">
                        Saved permanently and ready to open inside {targetRoomName} right away.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {uploadedReceipts.map((r) => (
                      <div
                        key={r.memoryId}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white/80 border border-[#DCFCE7] px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {r.mediaKind === 'audio' ? (
                            <Radio className="w-4 h-4 text-[#854D27] shrink-0" />
                          ) : r.mediaKind === 'video' ? (
                            <Film className="w-4 h-4 text-[#854D27] shrink-0" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-[#854D27] shrink-0" />
                          )}
                          <span className="font-medium text-[#27231F] truncate">
                            {r.title}
                          </span>
                        </div>
                        <span className="shrink-0 font-semibold text-[#15803D]">
                          → {r.destinationLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedReceipts([]);
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D8C5A6] bg-[#FFFCF6] hover:bg-[#FAF4E8] text-xs font-semibold text-[#27231F] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Upload More
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream();
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#27231F] hover:bg-[#3C2E24] text-xs font-semibold text-[#FFFCF6] cursor-pointer"
                    >
                      Explore Room
                    </button>
                  </div>
                </div>
              )}

              {/* Automatic Placement Mapping Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-xl border border-[#E8DED0] bg-[#FAF4E8]/80 px-3 py-2.5 flex items-start gap-2.5">
                  <ImageIcon className="w-4 h-4 text-[#854D27] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#27231F]">
                      Photos → Cupboard
                    </p>
                    <p className="text-[11px] text-[#6E5641]">
                      JPG, JPEG, PNG, WEBP
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#E8DED0] bg-[#FAF4E8]/80 px-3 py-2.5 flex items-start gap-2.5">
                  <Film className="w-4 h-4 text-[#854D27] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#27231F]">
                      Videos → Projector
                    </p>
                    <p className="text-[11px] text-[#6E5641]">
                      MP4, MOV, WEBM
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#E8DED0] bg-[#FAF4E8]/80 px-3 py-2.5 flex items-start gap-2.5">
                  <Music className="w-4 h-4 text-[#854D27] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#27231F]">
                      Music → Radio
                    </p>
                    <p className="text-[11px] text-[#6E5641]">
                      MP3, WAV, M4A, OGG
                    </p>
                  </div>
                </div>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isUploading) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (!isUploading && e.dataTransfer.files?.length) {
                    handleStageFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => {
                  if (!isUploading) fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (!isUploading && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`rounded-2xl border-2 border-dashed p-5 sm:p-6 text-center transition-all ${
                  isUploading
                    ? 'border-[#D8C5A6] bg-[#FAF4E8]/80 cursor-wait'
                    : isDragging
                      ? 'border-[#854D27] bg-[#FAF0CA]/45 scale-[1.01] cursor-pointer'
                      : 'border-[#D8C5A6] bg-[#FAF4E8]/60 hover:border-[#854D27] hover:bg-[#FAF4E8] cursor-pointer'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={UPLOAD_ACCEPT_ATTRIBUTE}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleStageFiles(e.target.files);
                    }
                    e.target.value = '';
                  }}
                />
                {isUploading ? (
                  <div className="space-y-3 py-2">
                    <Loader2 className="w-7 h-7 text-[#854D27] animate-spin mx-auto" />
                    <p className="text-sm font-medium text-[#27231F]">
                      {uploadStatusText || 'Uploading memories…'}
                    </p>
                    <div className="max-w-xs mx-auto h-2 rounded-full bg-[#E8DED0] overflow-hidden">
                      <div
                        className="h-full bg-[#854D27] transition-all duration-300"
                        style={{ width: `${Math.max(8, uploadProgressPct)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#27231F] text-[#D6A15D] flex items-center justify-center mx-auto shadow-md">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-serif-display text-lg font-semibold text-[#27231F]">
                        {stagedFiles.length > 0
                          ? 'Drop or click to add more photos, videos, or music'
                          : 'Drop photos, videos, or music here — or click to browse'}
                      </p>
                      <p className="text-xs text-[#6E5641] mt-0.5">
                        Up to 35 MB per file. Originals are preserved untouched.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Staged File Previews */}
              {stagedFiles.length > 0 && (
                <div className="rounded-2xl border border-[#E2D4BE] bg-[#FAF4E8]/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#27231F]">
                      Ready to Place ({stagedFiles.length}{' '}
                      {stagedFiles.length === 1 ? 'file' : 'files'})
                    </p>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        revokeStagedPreviews(stagedFiles);
                        setStagedFiles([]);
                      }}
                      className="text-[11px] font-medium text-[#854D27] hover:underline disabled:opacity-40 cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                    {stagedFiles.map((sf) => (
                      <div
                        key={sf.id}
                        className="rounded-xl border border-[#DFCDAE] bg-[#FFFCF6] p-2.5 flex items-center gap-2.5"
                      >
                        {sf.previewUrl ? (
                          <img
                            src={sf.previewUrl}
                            alt={sf.file.name}
                            className="w-12 h-12 rounded-lg object-cover bg-[#F3ECE0] border border-[#E8DED0] shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#F3ECE0] border border-[#E8DED0] flex items-center justify-center text-[#854D27] shrink-0">
                            {sf.mediaKind === 'video' ? (
                              <Film className="w-5 h-5" />
                            ) : (
                              <Music className="w-5 h-5" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#27231F] truncate">
                            {sf.file.name}
                          </p>
                          <p className="text-[11px] text-[#854D27] font-medium truncate">
                            → {sf.placement.destinationLabel}
                          </p>
                          <p className="text-[10px] text-[#6E5641]">
                            {formatFileSize(sf.file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => handleRemoveStaged(sf.id)}
                          aria-label={`Remove ${sf.file.name}`}
                          className="p-2 text-[#6E5641] hover:text-[#991B1B] disabled:opacity-40 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Optional Title / Date / Note */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {stagedFiles.length === 1 && (
                      <div>
                        <label
                          htmlFor="upload-memory-title"
                          className="block text-[11px] font-semibold text-[#493629] mb-1"
                        >
                          Title (optional)
                        </label>
                        <input
                          id="upload-memory-title"
                          type="text"
                          value={contextTitle}
                          onChange={(e) => setContextTitle(e.target.value)}
                          placeholder="Defaults to file name"
                          className="w-full px-3 py-2 rounded-lg bg-[#FFFCF6] border border-[#DFCDAE] text-xs text-[#27231F]"
                        />
                      </div>
                    )}
                    <div>
                      <label
                        htmlFor="upload-memory-date"
                        className="block text-[11px] font-semibold text-[#493629] mb-1"
                      >
                        Date or Year (optional)
                      </label>
                      <input
                        id="upload-memory-date"
                        type="text"
                        value={contextDate}
                        onChange={(e) => setContextDate(e.target.value)}
                        placeholder="e.g. Summer 2004 or 1999"
                        className="w-full px-3 py-2 rounded-lg bg-[#FFFCF6] border border-[#DFCDAE] text-xs text-[#27231F]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="upload-memory-note"
                        className="block text-[11px] font-semibold text-[#493629] mb-1"
                      >
                        Short Note (optional)
                      </label>
                      <input
                        id="upload-memory-note"
                        type="text"
                        value={contextDescription}
                        onChange={(e) => setContextDescription(e.target.value)}
                        placeholder="Add a brief memory note if you like"
                        className="w-full px-3 py-2 rounded-lg bg-[#FFFCF6] border border-[#DFCDAE] text-xs text-[#27231F]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isUploading) {
                          cancelActiveUpload();
                        } else {
                          handleCloseModal();
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#493629] hover:bg-[#EFE6D5] cursor-pointer"
                    >
                      {isUploading ? 'Cancel Upload' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => void handleUploadStagedFiles()}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#3C2E24] disabled:opacity-60 cursor-pointer"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D6A15D]" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#D6A15D]" />
                      )}
                      {isUploading
                        ? 'Uploading…'
                        : `Upload & Place in Room (${stagedFiles.length})`}
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <div
                  role="alert"
                  className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-xs text-[#991B1B] flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-snug">{uploadError}</p>
                </div>
              )}

              {validationNotices.length > 0 && (
                <div
                  role="alert"
                  className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-xs text-[#991B1B] space-y-1"
                >
                  {validationNotices.map((msg, idx) => (
                    <p key={idx} className="leading-snug">
                      • {msg}
                    </p>
                  ))}
                </div>
              )}

              <div className="rounded-xl bg-[#F6F1E8] border border-[#E8DED0] px-4 py-2.5 text-xs text-[#493629] flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                <span>
                  Supported formats only: Photos (JPG, JPEG, PNG, WEBP), Videos (MP4, MOV, WEBM), and Music (MP3, WAV, M4A, OGG). PDFs, documents, and chat exports are not accepted.
                </span>
              </div>
            </>
          )}

          {activeTab === 'camera' && (
            <div className="space-y-4 text-center">
              {!cameraActive ? (
                <div className="p-6 sm:p-8 rounded-2xl bg-[#FAF4E8] border border-[#E2D4BE] space-y-3">
                  <Camera className="w-8 h-8 text-[#854D27] mx-auto" />
                  <p className="text-sm font-semibold text-[#27231F]">
                    Take a photo directly for your Cupboard &amp; Photo Display
                  </p>
                  <p className="text-xs text-[#6E5641] max-w-md mx-auto">
                    Camera access is only requested when you click Enable Camera below.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleStartCamera()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-[#D6A15D]" />
                    Enable Camera
                  </button>
                  {cameraError && (
                    <p className="text-xs text-[#991B1B] mt-2">{cameraError}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-72 rounded-xl bg-black object-cover border border-[#D8C5A6]"
                  />
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={stopCameraStream}
                      className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#F6F1E8] text-[#493629] cursor-pointer"
                    >
                      Stop Camera
                    </button>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => void handleCapturePhoto()}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] disabled:opacity-60 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-[#D6A15D]" />
                      {isUploading ? 'Saving Photo…' : 'Capture & Place in Cupboard'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
