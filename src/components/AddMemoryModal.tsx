import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Music,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { CurationBatchItemInput } from '../types/curation';
import { Memory, Room } from '../types/museum';
import {
  prepareCameraCaptureForAutoCuration,
  prepareFileForAutoCuration,
  prepareTextMemoryForAutoCuration,
  validateUploadFileCandidate,
} from '../utils/clientMediaExtractor';

interface StagedUploadItem {
  id: string;
  file: File;
  previewUrl?: string;
}

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  existingMemories?: Memory[];
  defaultRoomId?: string | null;
  onAddMemories: (newMemories: Memory[]) => void;
  onStartAutoCuration?: (items: CurationBatchItemInput[]) => void;
}

export const AddMemoryModal: React.FC<AddMemoryModalProps> = ({
  isOpen,
  onClose,
  existingMemories = [],
  onStartAutoCuration,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const stagedFilesRef = useRef<StagedUploadItem[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [isPreparingFiles, setIsPreparingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'write' | 'camera'>('files');
  const [stagedFiles, setStagedFiles] = useState<StagedUploadItem[]>([]);
  const [contextTitle, setContextTitle] = useState('');
  const [contextDescription, setContextDescription] = useState('');
  const [contextDate, setContextDate] = useState('');
  const [writtenTitle, setWrittenTitle] = useState('');
  const [writtenText, setWrittenText] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [prepFeedback, setPrepFeedback] = useState<string | null>(null);
  const [validationNotices, setValidationNotices] = useState<string[]>([]);

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

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setStagedFiles((prev) => {
        revokeStagedPreviews(prev);
        return [];
      });
      setContextTitle('');
      setContextDescription('');
      setContextDate('');
      setPrepFeedback(null);
      setCameraError(null);
      setValidationNotices([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopCameraStream();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCameraStream();
      revokeStagedPreviews(stagedFilesRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleStageFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setValidationNotices([]);
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
      if (check.valid) {
        const previewUrl = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined;
        newlyStaged.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
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

  const handleStartUploadAndAnalyze = async () => {
    if (stagedFiles.length === 0 || !onStartAutoCuration || isPreparingFiles) {
      return;
    }

    setIsPreparingFiles(true);
    setPrepFeedback(
      `Preparing 1 of ${stagedFiles.length} file${stagedFiles.length === 1 ? '' : 's'} for Gemini analysis…`,
    );

    try {
      const prepared: CurationBatchItemInput[] = [];
      for (let idx = 0; idx < stagedFiles.length; idx++) {
        if (!isMountedRef.current) return;
        const stagedItem = stagedFiles[idx];
        if (!stagedItem?.file) continue;
        const { file } = stagedItem;
        setPrepFeedback(
          `Preserving original (${idx + 1}/${stagedFiles.length}): ${file.name}`,
        );
        const item = await prepareFileForAutoCuration(file);
        if (stagedFiles.length === 1 && contextTitle.trim()) {
          item.userTitle = contextTitle.trim();
        }
        if (contextDescription.trim()) {
          item.userDescription = contextDescription.trim();
        }
        if (contextDate.trim()) {
          item.userDate = contextDate.trim();
        }
        prepared.push(item);
      }

      if (!isMountedRef.current) return;
      if (prepared.length > 0) {
        onStartAutoCuration(prepared);
        onClose();
      }
    } catch (err) {
      if (isMountedRef.current) {
        setValidationNotices([
          err instanceof Error
            ? err.message
            : 'Unable to prepare one or more selected files. Please try again.',
        ]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsPreparingFiles(false);
      }
    }
  };

  const handleSubmitWritten = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writtenText.trim() || !onStartAutoCuration || isPreparingFiles) return;
    setIsPreparingFiles(true);
    const item = prepareTextMemoryForAutoCuration({
      text: writtenText,
      titleHint: writtenTitle,
    });
    if (writtenTitle.trim()) item.userTitle = writtenTitle.trim();
    setWrittenTitle('');
    setWrittenText('');
    onStartAutoCuration([item]);
    setIsPreparingFiles(false);
    onClose();
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
          'Camera permission was denied or unavailable. You can still drag and drop photos anytime.',
        );
      }
    }
  };

  const handleCapturePhoto = async () => {
    const video = videoPreviewRef.current;
    if (!video || !onStartAutoCuration || isPreparingFiles) return;
    setIsPreparingFiles(true);
    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      stopCameraStream();
      const item = await prepareCameraCaptureForAutoCuration(dataUrl);
      if (!isMountedRef.current) return;
      onStartAutoCuration([item]);
      onClose();
    } catch {
      if (isMountedRef.current) {
        setCameraError('Could not capture photo from camera feed. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsPreparingFiles(false);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-memories-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18110B]/80 backdrop-blur-sm museum-fade-in"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#FFFCF6] border border-[#D8C5A6] shadow-2xl overflow-hidden text-[#27231F] museum-panel-enter">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8DED0] bg-[#FAF4E8] flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#854D27] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Gemini Memory Analysis & 3D Placement
            </p>
            <h2
              id="add-memories-title"
              className="font-serif-display text-2xl font-semibold text-[#27231F] mt-0.5"
            >
              Add Childhood Memories
            </h2>
            <p className="text-xs text-[#493629] mt-1 leading-relaxed">
              Preview photos before uploading. Gemini analyses each memory and suggests a Childhood Memory Park location for your approval.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            aria-label="Close Add Memories modal"
            className="p-2 rounded-xl text-[#6E5641] hover:bg-[#EFE6D5] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-[#F1E8D8] shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              setActiveTab('files');
            }}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'files'
                ? 'border-[#854D27] text-[#27231F]'
                : 'border-transparent text-[#6E5641] hover:text-[#27231F]'
            }`}
          >
            Upload Photos & Files
          </button>
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              setActiveTab('write');
            }}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'write'
                ? 'border-[#854D27] text-[#27231F]'
                : 'border-transparent text-[#6E5641] hover:text-[#27231F]'
            }`}
          >
            Write Story / Paste Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'camera'
                ? 'border-[#854D27] text-[#27231F]'
                : 'border-transparent text-[#6E5641] hover:text-[#27231F]'
            }`}
          >
            Camera Capture
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {activeTab === 'files' && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.length) {
                    handleStageFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-[#854D27] bg-[#FAF0CA]/45 scale-[1.01]'
                    : 'border-[#D8C5A6] bg-[#FAF4E8]/60 hover:border-[#854D27] hover:bg-[#FAF4E8]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.txt,.md,.json,.csv,.log,.doc,.docx,.rtf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleStageFiles(e.target.files);
                    }
                    e.target.value = '';
                  }}
                />
                {isPreparingFiles ? (
                  <div className="space-y-2 py-3">
                    <Loader2 className="w-7 h-7 text-[#854D27] animate-spin mx-auto" />
                    <p className="text-sm font-medium text-[#27231F]">
                      {prepFeedback}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#27231F] text-[#D6A15D] flex items-center justify-center mx-auto shadow-md">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-serif-display text-lg font-semibold text-[#27231F]">
                        {stagedFiles.length > 0
                          ? 'Drop or click to add more photographs or files'
                          : 'Drop childhood photos, videos, audio, chats & PDFs here'}
                      </p>
                      <p className="text-xs text-[#6E5641] mt-0.5">
                        Originals are preserved untouched at full quality.
                      </p>
                    </div>
                    <div className="pt-1 flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#493629]">
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#854D27]" /> Photos
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Film className="w-3.5 h-3.5 text-[#854D27]" /> Videos
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Music className="w-3.5 h-3.5 text-[#854D27]" /> Audio
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-[#854D27]" /> Chats
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-[#854D27]" /> Docs & PDFs
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Staged File Previews + Optional Context Before Upload */}
              {stagedFiles.length > 0 && (
                <div className="rounded-2xl border border-[#E2D4BE] bg-[#FAF4E8]/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#27231F]">
                      Ready to Upload ({stagedFiles.length}{' '}
                      {stagedFiles.length === 1 ? 'file' : 'files'})
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        revokeStagedPreviews(stagedFiles);
                        setStagedFiles([]);
                      }}
                      className="text-[11px] font-medium text-[#854D27] hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto pr-1">
                    {stagedFiles.map((sf) => (
                      <div
                        key={sf.id}
                        className="relative rounded-xl border border-[#DFCDAE] bg-[#FFFCF6] overflow-hidden flex flex-col"
                      >
                        {sf.previewUrl ? (
                          <img
                            src={sf.previewUrl}
                            alt={sf.file.name}
                            className="w-full h-24 object-contain bg-[#F3ECE0]"
                          />
                        ) : (
                          <div className="w-full h-24 bg-[#F3ECE0] flex items-center justify-center text-[#854D27]">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                          <span className="text-[11px] text-[#27231F] truncate">
                            {sf.file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStaged(sf.id)}
                            aria-label={`Remove ${sf.file.name}`}
                            className="p-0.5 text-[#6E5641] hover:text-[#991B1B] cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {stagedFiles.length === 1 && (
                      <div>
                        <label className="block text-[11px] font-semibold text-[#493629] mb-1">
                          Title (optional)
                        </label>
                        <input
                          type="text"
                          value={contextTitle}
                          onChange={(e) => setContextTitle(e.target.value)}
                          placeholder="Leave blank for Gemini suggestion"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#FFFCF6] border border-[#DFCDAE] text-xs text-[#27231F]"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#493629] mb-1">
                        Date or Approximate Year (optional)
                      </label>
                      <input
                        type="text"
                        value={contextDate}
                        onChange={(e) => setContextDate(e.target.value)}
                        placeholder="e.g. Summer 2004 or 1999"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#FFFCF6] border border-[#DFCDAE] text-xs text-[#27231F]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-[#493629] mb-1">
                        Personal Note or Context (optional)
                      </label>
                      <input
                        type="text"
                        value={contextDescription}
                        onChange={(e) => setContextDescription(e.target.value)}
                        placeholder="Who or what makes this moment special? (helps Gemini recommend the right spot)"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#FFFCF6] border border-[#DFCDAE] text-xs text-[#27231F]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream();
                        onClose();
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#493629] hover:bg-[#EFE6D5] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isPreparingFiles}
                      onClick={() => void handleStartUploadAndAnalyze()}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#3C2E24] disabled:opacity-60 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#D6A15D]" />
                      Upload &amp; Analyse with Gemini
                    </button>
                  </div>
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
                  Original photos are preserved untouched in browser storage. You can review and approve every recommended Childhood Park location before it becomes permanent in 3D.
                </span>
              </div>
            </>
          )}

          {activeTab === 'write' && (
            <form onSubmit={handleSubmitWritten} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#27231F] mb-1">
                  Optional Title or Context
                </label>
                <input
                  type="text"
                  value={writtenTitle}
                  onChange={(e) => setWrittenTitle(e.target.value)}
                  placeholder="Optional — Gemini can title this automatically"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E2D4BE] text-sm text-[#27231F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#27231F] mb-1">
                  Written Memory or Pasted Chat Transcript
                </label>
                <textarea
                  rows={6}
                  required
                  value={writtenText}
                  onChange={(e) => setWrittenText(e.target.value)}
                  placeholder="Write a personal story, diary entry, or paste WhatsApp / iMessage lines directly…"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF4E8] border border-[#E2D4BE] text-sm text-[#27231F]"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#493629] hover:bg-[#F3ECE0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D6A15D]" />
                  Analyse with Gemini
                </button>
              </div>
            </form>
          )}

          {activeTab === 'camera' && (
            <div className="space-y-4 text-center">
              {!cameraActive ? (
                <div className="p-8 rounded-2xl bg-[#FAF4E8] border border-[#E2D4BE] space-y-3">
                  <Camera className="w-8 h-8 text-[#854D27] mx-auto" />
                  <p className="text-sm font-semibold text-[#27231F]">
                    Capture a physical keepsake or moment directly
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
                      onClick={stopCameraStream}
                      className="px-4 py-2 rounded-xl text-xs font-medium bg-[#F6F1E8] text-[#493629] cursor-pointer"
                    >
                      Stop Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCapturePhoto()}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-[#D6A15D]" />
                      Capture &amp; Analyse
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
