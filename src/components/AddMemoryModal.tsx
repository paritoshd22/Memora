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

  const [isDragging, setIsDragging] = useState(false);
  const [isPreparingFiles, setIsPreparingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'write' | 'camera'>('files');
  const [writtenTitle, setWrittenTitle] = useState('');
  const [writtenText, setWrittenText] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [prepFeedback, setPrepFeedback] = useState<string | null>(null);
  const [validationNotices, setValidationNotices] = useState<string[]>([]);

  const stopCameraStream = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setPrepFeedback(null);
      setCameraError(null);
      setValidationNotices([]);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  if (!isOpen) return null;

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setValidationNotices([]);
    const seenBatchKeys = new Set<string>();
    const validFiles: File[] = [];
    const notices: string[] = [];

    for (const file of files) {
      const check = validateUploadFileCandidate(
        file,
        existingMemories,
        seenBatchKeys,
      );
      if (check.valid) {
        validFiles.push(file);
      } else if (check.reason) {
        notices.push(check.reason);
      }
    }

    if (notices.length > 0) {
      setValidationNotices(notices);
    }

    if (validFiles.length === 0) {
      return;
    }

    setIsPreparingFiles(true);
    setPrepFeedback(
      `Reading 1 of ${validFiles.length} file${validFiles.length === 1 ? '' : 's'} for automatic Gemini curation…`,
    );

    try {
      const prepared: CurationBatchItemInput[] = [];
      for (let idx = 0; idx < validFiles.length; idx++) {
        const file = validFiles[idx];
        setPrepFeedback(
          `Reading ${idx + 1} of ${validFiles.length}: ${file.name}`,
        );
        const item = await prepareFileForAutoCuration(file);
        prepared.push(item);
      }
      if (prepared.length > 0 && onStartAutoCuration) {
        onStartAutoCuration(prepared);
        onClose();
      }
    } finally {
      setIsPreparingFiles(false);
    }
  };

  const handleSubmitWritten = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writtenText.trim() || !onStartAutoCuration) return;
    const item = prepareTextMemoryForAutoCuration({
      text: writtenText,
      titleHint: writtenTitle,
    });
    setWrittenTitle('');
    setWrittenText('');
    onStartAutoCuration([item]);
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
      activeStreamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          void videoPreviewRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(
        'Camera permission was denied or unavailable. You can still drag and drop photos anytime.',
      );
    }
  };

  const handleCapturePhoto = async () => {
    const video = videoPreviewRef.current;
    if (!video || !onStartAutoCuration) return;
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
    onStartAutoCuration([item]);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-memories-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E150F]/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#FFFCF6] border border-[#D8C5A6] shadow-2xl overflow-hidden text-[#27231F]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E8DED0] bg-[#FAF4E8] flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#854D27] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Automatic Memory Curation
            </p>
            <h2
              id="add-memories-title"
              className="font-serif-display text-2xl md:text-3xl font-semibold text-[#27231F] mt-1"
            >
              Add Memories
            </h2>
            <p className="text-xs text-[#493629] mt-1 leading-relaxed">
              Drop photographs, videos, audio recordings, chat exports, PDFs, or written memories.
              MEMORA automatically analyses, organises, links, and places everything into your world.
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
        <div className="px-6 pt-4 flex items-center gap-2 border-b border-[#F1E8D8]">
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
            Upload Any Files
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

        <div className="p-6 space-y-5">
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
                    void handleFilesSelected(e.dataTransfer.files);
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
                className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
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
                      void handleFilesSelected(e.target.files);
                    }
                    e.target.value = '';
                  }}
                />
                {isPreparingFiles ? (
                  <div className="space-y-3 py-4">
                    <Loader2 className="w-8 h-8 text-[#854D27] animate-spin mx-auto" />
                    <p className="text-sm font-medium text-[#27231F]">
                      {prepFeedback}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#27231F] text-[#D6A15D] flex items-center justify-center mx-auto shadow-md">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-serif-display text-xl font-semibold text-[#27231F]">
                        Drop photos, videos, audio, chats & PDFs here
                      </p>
                      <p className="text-xs text-[#6E5641] mt-1">
                        Or click to browse multiple files at once. Curation begins automatically in the background.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#493629]">
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#854D27]" /> Photos
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Film className="w-3.5 h-3.5 text-[#854D27]" /> Videos
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Music className="w-3.5 h-3.5 text-[#854D27]" /> Voice & Music
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-[#854D27]" /> Chat Exports
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-[#854D27]" /> PDFs, DOCs & Stories
                      </span>
                    </div>
                  </div>
                )}
              </div>

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

              <div className="rounded-xl bg-[#F6F1E8] border border-[#E8DED0] px-4 py-3 text-xs text-[#493629] flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                <span>
                  No folders or categories required up front. Your originals are kept untouched, and you can close this dialog to explore MEMORA immediately while Gemini organises everything.
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
                  Curate Automatically
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
                      Capture & Auto-Curate
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
