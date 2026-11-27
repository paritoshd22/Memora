import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Heart,
  Trash2,
  FolderOutput,
  Download,
  Edit3,
  Users,
  Check,
  Music,
  Film,
  FileText,
  MessageSquare,
  BookOpen,
  Award,
  Link2,
  Maximize2,
  Minimize2,
  Compass,
  Frame,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import {
  Memory,
  MemoryConnection,
  MemoryDisplayFrameStyle,
  MemoryMediaType,
  Room,
} from '../types/museum';
import {
  InteractiveObjectId3D,
  LivingWorldSpaceId,
  MemoryPlacementTarget,
} from '../types/aiStudio';
import {
  CHILDHOOD_WORLD_LOCATION_CATALOGUE,
  ChildhoodWorldLocationId,
} from '../types/curation';
import { getProceduralMemoryArt } from '../utils/proceduralArt';
import { EXHIBIT_TYPE_LABELS } from '../utils/roomThemes';
import { MEMORY_FRAME_STYLE_OPTIONS } from '../utils/roomExhibition3D';
import {
  buildAndValidateMemoryTo3DBlueprint,
  isMemory3DBlueprintApproved,
} from '../utils/memoryTo3DAssetResolver';
import { VideoMemoryPlayer } from './VideoMemoryPlayer';

const MEMORY_PLACEMENT_OPTIONS: Array<{
  id: MemoryPlacementTarget;
  label: string;
  linked3DObject: string;
  linkedObjectId: InteractiveObjectId3D;
  curatedZoneId: ChildhoodWorldLocationId;
}> = [
  {
    id: 'memory_wall',
    label: 'Memory Wall (Important Moments)',
    linked3DObject: 'Childhood Memory Wall',
    linkedObjectId: 'cork_pinboard',
    curatedZoneId: 'memory_wall',
  },
  {
    id: 'wall_frame',
    label: 'Photo Frames (Bedroom Alcove)',
    linked3DObject: 'Childhood Bedroom Photo Frame',
    linkedObjectId: 'wooden_bed',
    curatedZoneId: 'bedroom',
  },
  {
    id: 'toy_box',
    label: 'Toy Box (Childhood Keepsakes)',
    linked3DObject: 'Hinged Childhood Toy Chest',
    linkedObjectId: 'toy_chest',
    curatedZoneId: 'toy_box',
  },
  {
    id: 'bookshelf',
    label: 'Bookshelf (Books & School Memories)',
    linked3DObject: 'Childhood Bookshelf',
    linkedObjectId: 'bookshelf',
    curatedZoneId: 'bookshelf',
  },
  {
    id: 'study_desk',
    label: 'Study Desk (Drawings, Projects & Certificates)',
    linked3DObject: 'Study Desk Display',
    linkedObjectId: 'study_desk',
    curatedZoneId: 'study_corner',
  },
  {
    id: 'bedside_shelf',
    label: 'Bedside Shelf & Keepsake Ledge',
    linked3DObject: 'Bedside Shelf Frame',
    linkedObjectId: 'wooden_bed',
    curatedZoneId: 'bedroom',
  },
  {
    id: 'scrapbook_podium',
    label: 'Interactive Scrapbook Table',
    linked3DObject: 'Interactive Scrapbook Podium',
    linkedObjectId: 'toy_train',
    curatedZoneId: 'memory_wall',
  },
  {
    id: 'cinema_screen',
    label: 'Cinema Corner Projector Screen',
    linked3DObject: 'Cinema Corner Screen',
    linkedObjectId: 'bedroom_tv',
    curatedZoneId: 'outdoor_cinema',
  },
  {
    id: 'audio_booth',
    label: 'Audio Memories Listening Booth',
    linked3DObject: 'Audio Listening Station',
    linkedObjectId: 'wardrobe',
    curatedZoneId: 'memory_radio',
  },
  {
    id: 'keepsake_cabinet',
    label: 'Keepsake Glass Display Cabinet',
    linked3DObject: 'Keepsake Glass Cabinet',
    linkedObjectId: 'toy_chest',
    curatedZoneId: 'keepsake_corner',
  },
];

interface MemoryDetailModalProps {
  memory: Memory | null;
  allMemories?: Memory[];
  approvedConnections?: MemoryConnection[];
  rooms: Room[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onToggleFavorite: (memoryId: string) => void;
  onReassignRoom: (memoryId: string, newRoomId: string) => void;
  onUpdateMemory?: (updated: Memory) => void;
  onDeleteMemory: (memoryId: string) => void;
  onEnterRoom?: (roomId: string) => void;
  onSelectConnectedMemory?: (memoryId: string) => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
  memory,
  allMemories = [],
  approvedConnections = [],
  rooms,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onToggleFavorite,
  onReassignRoom,
  onUpdateMemory,
  onDeleteMemory,
  onEnterRoom,
  onSelectConnectedMemory,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fitContain, setFitContain] = useState(true);
  const [isPanoramaView, setIsPanoramaView] = useState(false);
  const [panoOffset, setPanoOffset] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const [isDraggingPano, setIsDraggingPano] = useState(false);
  const [panoDragStart, setPanoDragStart] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStory, setEditStory] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPeople, setEditPeople] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editType, setEditType] = useState<MemoryMediaType>('image');
  const [chatReplayVisibleCount, setChatReplayVisibleCount] = useState<number>(Infinity);
  const [isChatReplayPlaying, setIsChatReplayPlaying] = useState(false);

  const archivedChatMessages = useMemo(() => {
    if (!memory) return [];
    if (memory.chatLines && memory.chatLines.length > 0) return memory.chatLines;
    if (memory.curationReport?.parsedChatMessages?.length) {
      return memory.curationReport.parsedChatMessages;
    }
    return [
      {
        sender: memory.people?.[0] || 'Participant',
        text: memory.description,
        timestamp: memory.date,
      },
      ...(memory.story
        ? [
            {
              sender: memory.people?.[1] || 'Archive Note',
              text: memory.story,
              timestamp: '',
            },
          ]
        : []),
    ];
  }, [memory]);

  useEffect(() => {
    setConfirmingDelete(false);
    setIsEditing(false);
    setIsChatReplayPlaying(false);
    setChatReplayVisibleCount(Infinity);
    setPanoOffset({ x: 50, y: 50 });
    if (memory) {
      setIsPanoramaView(
        Boolean(
          memory.isPanorama360 ||
            memory.roomId === 'travels' ||
            memory.tags?.some((t) =>
              /panorama|360|landscape|horizon/i.test(t),
            ),
        ),
      );
      setEditTitle(memory.title);
      setEditDate(memory.date || '');
      setEditDescription(memory.description);
      setEditStory(memory.story || '');
      setEditLocation(memory.location);
      setEditPeople((memory.people || []).join(', '));
      setEditTags((memory.tags || []).join(', '));
      setEditType(memory.type || 'image');
    }
  }, [memory]);

  useEffect(() => {
    if (!isChatReplayPlaying || !memory) return;
    if (chatReplayVisibleCount >= archivedChatMessages.length) {
      setIsChatReplayPlaying(false);
      return;
    }
    const timer = window.setInterval(() => {
      setChatReplayVisibleCount((prev) => {
        const next = prev + 1;
        if (next >= archivedChatMessages.length) {
          setIsChatReplayPlaying(false);
        }
        return Math.min(archivedChatMessages.length, next);
      });
    }, 1150);
    return () => window.clearInterval(timer);
  }, [isChatReplayPlaying, chatReplayVisibleCount, archivedChatMessages.length, memory]);

  useEffect(() => {
    if (!memory) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [memory, hasPrev, hasNext, onClose, onPrev, onNext, isEditing]);

  const fallbackProceduralArt = useMemo(() => {
    if (!memory) return '';
    return getProceduralMemoryArt(
      memory.motif,
      memory.palette,
      memory.title,
      memory.location,
    );
  }, [memory]);

  const imageSrc = useMemo(() => {
    if (!memory) return '';
    if (
      memory.customImageUrl &&
      !memory.customImageUrl.startsWith('idb://')
    ) {
      return memory.customImageUrl;
    }
    if (
      memory.mediaUrl &&
      !memory.mediaUrl.startsWith('idb://') &&
      (memory.mediaUrl.startsWith('data:image/') ||
        memory.mediaUrl.startsWith('blob:') ||
        /^https?:\/\//i.test(memory.mediaUrl))
    ) {
      return memory.mediaUrl;
    }
    return fallbackProceduralArt;
  }, [memory, fallbackProceduralArt]);

  const playableVideoSrc = useMemo(() => {
    if (!memory) return null;
    const src = memory.mediaUrl || memory.customImageUrl || '';
    if (
      (memory.type === 'video' || src.startsWith('data:video/')) &&
      (src.startsWith('data:video/') ||
        src.startsWith('blob:') ||
        /\.(mp4|webm|ogg)$/i.test(src))
    ) {
      return src;
    }
    return null;
  }, [memory]);

  const playableAudioSrc = useMemo(() => {
    if (!memory) return null;
    const src = memory.mediaUrl || memory.customImageUrl || '';
    if (
      (memory.type === 'audio' || src.startsWith('data:audio/')) &&
      (src.startsWith('data:audio/') ||
        src.startsWith('blob:') ||
        /\.(mp3|wav|ogg|m4a)$/i.test(src))
    ) {
      return src;
    }
    return null;
  }, [memory]);

  const relatedConnections = useMemo(() => {
    if (!memory) return [];
    return approvedConnections
      .filter(
        (c) =>
          c.status === 'approved' &&
          (c.sourceMemoryId === memory.id || c.targetMemoryId === memory.id),
      )
      .map((conn) => {
        const otherId =
          conn.sourceMemoryId === memory.id
            ? conn.targetMemoryId
            : conn.sourceMemoryId;
        const otherMem = allMemories.find((m) => m.id === otherId);
        return { conn, otherMem };
      })
      .filter((item) => Boolean(item.otherMem));
  }, [memory, approvedConnections, allMemories]);

  const relatedRoomAndTagMemories = useMemo(() => {
    if (!memory) return [];
    const connectedIds = new Set(
      relatedConnections.map((rc) => rc.otherMem?.id).filter(Boolean),
    );
    const memTags = new Set(
      (memory.tags || []).map((t) => t.toLowerCase().trim()),
    );
    const memPeople = new Set(
      (memory.people || []).map((p) => p.toLowerCase().trim()),
    );

    return allMemories
      .filter((m) => m.id !== memory.id && !connectedIds.has(m.id))
      .map((candidate) => {
        let score = 0;
        let reason = '';
        const sharedPeople = (candidate.people || []).filter((p) =>
          memPeople.has(p.toLowerCase().trim()),
        );
        const sharedTags = (candidate.tags || []).filter((t) =>
          memTags.has(t.toLowerCase().trim()),
        );
        if (candidate.roomId === memory.roomId) {
          score += 3;
          reason = 'Same exhibition room';
        }
        if (sharedPeople.length > 0) {
          score += 4;
          reason = `Shared people: ${sharedPeople.slice(0, 2).join(', ')}`;
        } else if (sharedTags.length > 0) {
          score += 2;
          reason = `Shared theme: ${sharedTags.slice(0, 2).join(', ')}`;
        }
        return { memory: candidate, score, reason };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [memory, allMemories, relatedConnections]);

  if (!memory) return null;

  const currentRoom = rooms.find((r) => r.id === memory.roomId);
  const mediaType: MemoryMediaType = memory.type || 'image';
  const typeMeta = EXHIBIT_TYPE_LABELS[mediaType] || EXHIBIT_TYPE_LABELS.image;
  const formattedDate = memory.date || (memory.year ? String(memory.year) : '');

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = memory.mediaUrl || imageSrc;
    const ext =
      mediaType === 'video' && playableVideoSrc
        ? 'mp4'
        : mediaType === 'audio' && playableAudioSrc
          ? 'mp3'
          : 'jpg';
    a.download = `${memory.title.toLowerCase().replace(/\s+/g, '-')}.${ext}`;
    a.click();
  };

  const handleSaveEdit = () => {
    if (onUpdateMemory) {
      const parsedYear =
        parseInt(editDate.slice(0, 4), 10) || memory.year || 2024;
      onUpdateMemory({
        ...memory,
        title: editTitle.trim() || memory.title,
        date: editDate.trim(),
        year: parsedYear,
        type: editType,
        description: editDescription.trim() || memory.description,
        story: editStory.trim() || memory.story,
        location: editLocation.trim() || memory.location,
        people: editPeople
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
    }
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#27231F]/82 p-4 md:p-6 overflow-y-auto museum-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-detail-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl bg-[#FFFCF6] border border-[#E8DED0] rounded-2xl shadow-2xl overflow-hidden my-auto museum-panel-enter"
      >
        {/* Top Modal Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 bg-[#F6F1E8] border-b border-[#E8DED0]">
          <div className="flex items-center gap-2.5 text-xs text-[#493629]">
            <span className="font-mono-tabular uppercase tracking-widest font-semibold text-[#493629]">
              {memory.accessionNumber}
            </span>
            <span aria-hidden="true">·</span>
            <span className="uppercase font-semibold text-[#854D27]">
              {typeMeta.badgeLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span>{currentRoom?.name || 'Archive'} Wing</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mediaType === 'image' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsPanoramaView((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    isPanoramaView
                      ? 'border-[#C9A66B] bg-[#27231F] text-[#FDE68A]'
                      : 'border-[#E8DED0] bg-[#FFFCF6] text-[#493629] hover:bg-[#E9D4B1]/40'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  {isPanoramaView ? 'Exit 360° Pan' : '360° / Panorama Pan'}
                </button>
                <button
                  type="button"
                  onClick={() => setFitContain((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#E8DED0] bg-[#FFFCF6] text-[#493629] hover:bg-[#E9D4B1]/40 transition-colors cursor-pointer"
                >
                  {fitContain ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      Fill Frame
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      Full Proportions
                    </>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#E8DED0] bg-[#FFFCF6] text-[#493629] hover:bg-[#E9D4B1]/40 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#E8DED0] bg-[#FFFCF6] text-[#493629] hover:bg-[#E9D4B1]/40 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditing ? 'Cancel Edit' : 'Edit Exhibit'}
            </button>

            <button
              type="button"
              onClick={() => onToggleFavorite(memory.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E8DED0] bg-[#FFFCF6] text-[#493629] hover:bg-[#E9D4B1]/40 transition-colors cursor-pointer"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  memory.isFavorite
                    ? 'fill-[#D6A15D] text-[#D6A15D]'
                    : 'text-[#6E5641]'
                }`}
              />
              {memory.isFavorite ? 'Favorited' : 'Favorite'}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close memory detail view"
              className="p-2 rounded-lg text-[#493629] hover:bg-[#E9D4B1]/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Two-Column Museum Accession View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left: Media-Appropriate Exhibit Showcase */}
          <div className="lg:col-span-7 bg-[#27231F] p-6 md:p-8 flex flex-col justify-between relative">
            <div className="my-auto">
              {/* 1. VIDEO PLAYBACK VIEW */}
              {mediaType === 'video' ? (
                <div className="bg-[#493629] p-3 md:p-4 rounded-xl shadow-2xl border border-[#D6A15D]/40">
                  <div className="bg-[#18110B] p-3 rounded-lg relative">
                    {playableVideoSrc ? (
                      <VideoMemoryPlayer
                        src={playableVideoSrc}
                        poster={imageSrc}
                        title={memory.title}
                        variant="detail"
                        defaultMuted={false}
                        hoverPreview={false}
                        aspectClassName="aspect-16/10"
                      />
                    ) : (
                      <div className="relative">
                        <img
                          src={imageSrc}
                          alt={memory.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full aspect-4/3 object-cover rounded border border-[#E8DED0]/30"
                        />
                        <div className="mt-3 p-3 rounded-lg bg-[#27231F] border border-[#D6A15D]/40 text-xs text-[#E9D4B1] flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2">
                            <Film className="w-4 h-4 text-[#D6A15D] shrink-0" />
                            <span>
                              Archival Film Still / Storyboard Record — upload an MP4 or WebM video file to enable direct video stream playback.
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : mediaType === 'audio' ? (
                /* 2. AUDIO PLAYBACK VIEW */
                <div className="bg-[#493629] p-4 md:p-6 rounded-xl shadow-2xl border border-[#6E4D33]">
                  <div className="bg-[#1E150F] p-6 rounded-xl border border-[#D6A15D]/35 text-[#FFFCF6] space-y-5">
                    <div className="flex items-center gap-4">
                      <img
                        src={imageSrc}
                        alt={memory.title}
                        className="w-24 h-24 rounded-xl object-cover border border-[#D6A15D]/50 shrink-0"
                      />
                      <div>
                        <span className="text-[11px] font-mono-tabular uppercase tracking-widest text-[#D6A15D]">
                          Audio Memory Exhibit · {memory.accessionNumber}
                        </span>
                        <h3 className="font-serif-display text-2xl font-semibold text-[#FFFCF6] mt-0.5">
                          {memory.title}
                        </h3>
                        <p className="text-xs text-[#E9D4B1]/80 mt-1">
                          {memory.location} · {formattedDate}
                        </p>
                      </div>
                    </div>

                    {/* Acoustic Waveform */}
                    <div
                      aria-hidden="true"
                      className="flex items-center justify-center gap-1.5 h-16 px-4 bg-black/30 rounded-xl border border-white/10"
                    >
                      {[
                        30, 55, 45, 75, 60, 90, 65, 40, 85, 70, 95, 50, 80, 60,
                        45, 70, 50, 35, 65, 45, 75, 55, 40, 30,
                      ].map((h, i) => (
                        <span
                          key={i}
                          style={{ height: `${h}%` }}
                          className="w-1.5 rounded-full bg-[#D6A15D]"
                        />
                      ))}
                    </div>

                    {playableAudioSrc ? (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-[#E9D4B1]">
                          Uploaded Audio Recording Playback:
                        </label>
                        <audio
                          controls
                          src={playableAudioSrc}
                          className="w-full"
                        />
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#E9D4B1] flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2">
                          <Music className="w-4 h-4 text-[#D6A15D] shrink-0" />
                          <span>
                            {memory.soundtrackSourceId
                              ? `Paired with museum soundscape (${memory.soundtrackSourceId}). Upload an MP3/WAV/M4A file to play a personal voice or audio file.`
                              : 'No raw audio file attached to this record. Upload an MP3, WAV, or M4A recording to play back.'}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : mediaType === 'chat' ? (
                /* 3. ARCHIVED CHAT REPLAY BOARD (Strictly preserved order, senders & timestamps) */
                <div className="bg-[#FAF4E8] p-5 md:p-6 rounded-xl shadow-2xl border-2 border-[#D6A15D]/60 text-[#27231F] max-h-[460px] flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2D4BE]">
                    <div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#C26D3A]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#493629]">
                          Replay of Archived Messages — Not a Live Conversation
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6E5641] mt-0.5">
                        Preserves original sender names, chronological order ({archivedChatMessages.length} messages), and timestamps verbatim.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (chatReplayVisibleCount >= archivedChatMessages.length) {
                            setChatReplayVisibleCount(1);
                          }
                          setIsChatReplayPlaying((p) => !p);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#27231F] text-[#FFFCF6] cursor-pointer"
                      >
                        {isChatReplayPlaying ? (
                          <Pause className="w-3 h-3 text-[#D6A15D]" />
                        ) : (
                          <Play className="w-3 h-3 text-[#D6A15D]" />
                        )}
                        {isChatReplayPlaying ? 'Pause' : 'Play Replay'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsChatReplayPlaying(false);
                          setChatReplayVisibleCount((prev) =>
                            prev === Infinity
                              ? 1
                              : Math.min(archivedChatMessages.length, prev + 1),
                          );
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[#FFFCF6] border border-[#D4C3AA] text-[#27231F] cursor-pointer"
                      >
                        <SkipForward className="w-3 h-3" />
                        Step
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsChatReplayPlaying(false);
                          setChatReplayVisibleCount(Infinity);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[#FFFCF6] border border-[#D4C3AA] text-[#27231F] cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Show All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 overflow-y-auto pr-1">
                    {archivedChatMessages
                      .slice(0, chatReplayVisibleCount)
                      .map((line, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border text-sm leading-relaxed ${
                            idx % 2 === 0
                              ? 'bg-[#FFFCF6] border-[#E4D6C3] text-[#27231F] mr-6'
                              : 'bg-[#493629] border-[#493629] text-[#FFFCF6] ml-6'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs opacity-80 mb-1">
                            <span className="font-semibold">{line.sender}</span>
                            {line.timestamp && (
                              <span className="font-mono-tabular text-[11px]">
                                {line.timestamp}
                              </span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap">{line.text}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ) : mediaType === 'story' ? (
                /* 4. WRITTEN STORY & LETTER STATIONERY VIEW */
                <div className="bg-[#FDF9F0] p-6 md:p-8 rounded-xl shadow-2xl border-2 border-[#D8C5A6] text-[#27231F] max-h-[430px] overflow-y-auto">
                  <div className="flex items-center justify-between text-xs text-[#7C6450] pb-4 border-b border-[#E5D8C3]">
                    <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-widest text-[#854D27]">
                      <BookOpen className="w-4 h-4" />
                      {memory.documentAuthor || 'Personal Letter & Story'}
                    </span>
                    <span className="font-mono-tabular">
                      {memory.location} · {formattedDate}
                    </span>
                  </div>
                  <h3 className="font-serif-display text-2xl md:text-3xl font-semibold text-[#27231F] mt-5">
                    {memory.title}
                  </h3>
                  <p className="mt-4 font-serif-display text-lg text-[#27231F] leading-relaxed first-letter:text-5xl first-letter:font-semibold first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:text-[#854D27]">
                    {memory.story || memory.description}
                  </p>
                  {memory.people && memory.people.length > 0 && (
                    <p className="mt-6 pt-4 border-t border-[#E5D8C3] font-serif-display italic text-base text-[#6E5641] text-right">
                      — With {memory.people.join(', ')}
                    </p>
                  )}
                </div>
              ) : mediaType === 'certificate' ? (
                /* 5. FORMAL CERTIFICATE & ACHIEVEMENT DISPLAY */
                <div className="bg-[#493629] p-4 rounded-xl shadow-2xl border-2 border-[#D6A15D]">
                  <div className="bg-[#FFFCF6] p-6 md:p-8 rounded-lg border-2 border-[#D6A15D] text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-[#FAF0CA] border border-[#D6A15D] text-[#A16207] flex items-center justify-center mx-auto">
                      <Award className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-mono-tabular uppercase tracking-widest text-[#854D27] font-semibold">
                      {memory.certificateIssuer ||
                        'Permanent Museum Achievement Citation'}
                    </p>
                    <h3 className="font-serif-display text-3xl font-semibold text-[#27231F]">
                      {memory.title}
                    </h3>
                    <p className="text-sm text-[#493629] max-w-lg mx-auto leading-relaxed">
                      {memory.description}
                    </p>
                    <div className="pt-4 border-t border-[#E8DED0] flex items-center justify-around text-xs text-[#6E5641]">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider">
                          Date Recorded
                        </span>
                        <span className="font-mono-tabular font-semibold text-[#27231F]">
                          {formattedDate}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider">
                          Location
                        </span>
                        <span className="font-semibold text-[#27231F]">
                          {memory.location}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider">
                          Accession
                        </span>
                        <span className="font-mono-tabular font-semibold text-[#854D27]">
                          {memory.accessionNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : mediaType === 'document' ? (
                /* 6. ARCHIVAL DOCUMENT PREVIEW & READER */
                <div className="bg-[#493629] p-3 md:p-4 rounded-xl shadow-2xl border border-[#6E4D33]">
                  <div className="bg-[#FAF5EB] p-5 rounded-lg border border-[#D8C7AE] text-[#27231F] space-y-4">
                    <div className="flex items-center justify-between text-xs text-[#6E5641] pb-3 border-b border-[#E5D8C5]">
                      <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[#493629]">
                        <FileText className="w-4 h-4 text-[#854D27]" />
                        Archival Document Preview
                      </span>
                      <span className="font-mono-tabular">
                        {memory.accessionNumber}
                      </span>
                    </div>
                    {memory.mediaUrl?.startsWith('data:application/pdf') ? (
                      <iframe
                        title={memory.title}
                        src={memory.mediaUrl}
                        className="w-full h-72 rounded border border-[#D4C3AA]"
                      />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                        <img
                          src={imageSrc}
                          alt={memory.title}
                          className="sm:col-span-5 w-full aspect-4/3 object-cover rounded border border-[#D4C3AA]"
                        />
                        <div className="sm:col-span-7 space-y-2">
                          <h4 className="font-serif-display text-xl font-semibold text-[#27231F]">
                            {memory.title}
                          </h4>
                          <p className="text-xs text-[#493629] leading-relaxed">
                            {memory.description}
                          </p>
                          <p className="text-xs text-[#5C493A] leading-relaxed bg-[#FFFCF6] p-3 rounded border border-[#E8DED0]">
                            {memory.story}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 7. FRAMED PHOTOGRAPH OR INTERACTIVE 360° / PANORAMA CYCLORAMA SHOWCASE */
                <div className="bg-[#493629] p-3 md:p-4 rounded-xl shadow-2xl border border-[#6E4D33]">
                  <div className="bg-[#FFFCF6] p-3 md:p-5 rounded-lg shadow-inner relative">
                    {isPanoramaView ? (
                      <div
                        role="region"
                        aria-label="Interactive Panoramic Memory Viewer"
                        onPointerDown={(e) => {
                          setIsDraggingPano(true);
                          setPanoDragStart({ x: e.clientX, y: e.clientY });
                        }}
                        onPointerMove={(e) => {
                          if (!isDraggingPano) return;
                          const dx = e.clientX - panoDragStart.x;
                          const dy = e.clientY - panoDragStart.y;
                          setPanoDragStart({ x: e.clientX, y: e.clientY });
                          setPanoOffset((prev) => ({
                            x: Math.max(0, Math.min(100, prev.x - dx * 0.18)),
                            y: Math.max(0, Math.min(100, prev.y - dy * 0.14)),
                          }));
                        }}
                        onPointerUp={() => setIsDraggingPano(false)}
                        onPointerLeave={() => setIsDraggingPano(false)}
                        style={{
                          backgroundImage: `url("${imageSrc}")`,
                          backgroundSize: '215% auto',
                          backgroundPosition: `${panoOffset.x}% ${panoOffset.y}%`,
                        }}
                        className="w-full aspect-16/10 rounded-lg border border-[#C9A66B] relative overflow-hidden cursor-grab active:cursor-grabbing select-none shadow-inner"
                      >
                        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#27231F]/88 text-[#FFFCF6] border border-[#C9A66B]/50 text-[11px]">
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#FDE68A]">
                            <Compass className="w-3.5 h-3.5 text-[#C9A66B]" />
                            Drag horizontally & vertically to pan across the
                            panoramic horizon
                          </span>
                          <span className="font-mono-tabular text-[#D8CCB9]">
                            Yaw {Math.round((panoOffset.x - 50) * 1.8)}°
                          </span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={imageSrc}
                        alt={memory.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          if (
                            fallbackProceduralArt &&
                            e.currentTarget.src !== fallbackProceduralArt
                          ) {
                            e.currentTarget.src = fallbackProceduralArt;
                          }
                        }}
                        className={`w-full aspect-4/3 ${
                          fitContain
                            ? 'object-contain bg-[#FAF5EB]'
                            : 'object-cover'
                        } rounded border border-[#E8DED0]`}
                      />
                    )}
                  </div>
                </div>
              )}

              <p className="text-center font-serif-display italic text-sm text-[#E9D4B1] mt-3">
                Fig. {memory.accessionNumber} — {memory.title} (
                {memory.year || formattedDate})
              </p>
            </div>

            {/* Previous / Next Navigation Bar */}
            <div className="flex items-center justify-between pt-5 mt-5 border-t border-[#493629]">
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#493629] text-[#FFFCF6] hover:bg-[#5C4633] disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Exhibit
              </button>
              <span className="text-xs text-[#E9D4B1]/70 hidden sm:inline">
                Use ← → arrow keys to browse
              </span>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#493629] text-[#FFFCF6] hover:bg-[#5C4633] disabled:opacity-35 cursor-pointer"
              >
                Next Exhibit
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Curatorial Essay, Connections & Accession Metadata */}
          <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-between bg-[#FFFCF6] max-h-[82vh] overflow-y-auto">
            <div>
              {isEditing ? (
                <div className="space-y-3 bg-[#F6F1E8] p-4 rounded-xl border border-[#E8DED0]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#27231F] mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-1.5 rounded bg-[#FFFCF6] border border-[#E8DED0] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#27231F] mb-1">
                        Exhibit Type
                      </label>
                      <select
                        value={editType}
                        onChange={(e) =>
                          setEditType(e.target.value as MemoryMediaType)
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-[#FFFCF6] border border-[#E8DED0] text-xs"
                      >
                        {(
                          Object.keys(EXHIBIT_TYPE_LABELS) as MemoryMediaType[]
                        ).map((k) => (
                          <option key={k} value={k}>
                            {EXHIBIT_TYPE_LABELS[k].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#27231F] mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded bg-[#FFFCF6] border border-[#E8DED0] text-xs font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#27231F] mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full px-3 py-1.5 rounded bg-[#FFFCF6] border border-[#E8DED0] text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#27231F] mb-1">
                      Short Caption
                    </label>
                    <textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-[#FFFCF6] border border-[#E8DED0] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#27231F] mb-1">
                      Full Story / Letter Text
                    </label>
                    <textarea
                      rows={3}
                      value={editStory}
                      onChange={(e) => setEditStory(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-[#FFFCF6] border border-[#E8DED0] text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#27231F] mb-1">
                        People (Comma-Separated)
                      </label>
                      <input
                        type="text"
                        value={editPeople}
                        onChange={(e) => setEditPeople(e.target.value)}
                        className="w-full px-3 py-1.5 rounded bg-[#FFFCF6] border border-[#E8DED0] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#27231F] mb-1">
                        Tags (Comma-Separated)
                      </label>
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="w-full px-3 py-1.5 rounded bg-[#FFFCF6] border border-[#E8DED0] text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#27231F] text-[#FFFCF6] cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              ) : (
                <>
                  <h2
                    id="memory-detail-title"
                    className="font-serif-display text-2xl md:text-3xl font-semibold text-[#27231F] leading-snug"
                  >
                    {memory.title}
                  </h2>

                  {(formattedDate || memory.location) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-[#746B60]">
                      {formattedDate && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#C9A66B]" />
                          <span className="font-mono-tabular">
                            {formattedDate}
                          </span>
                        </span>
                      )}
                      {memory.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#C9A66B]" />
                          <span>{memory.location}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {memory.people && memory.people.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#493629]">
                      <Users className="w-3.5 h-3.5 text-[#87977C]" />
                      <span>People: {memory.people.join(', ')}</span>
                    </div>
                  )}

                  <div className="my-5 border-t border-[#E8DED0]" />

                  {memory.description && (
                    <p className="text-sm font-medium text-[#27231F] leading-relaxed">
                      {memory.description}
                    </p>
                  )}

                  {memory.story && (
                    <p className="mt-4 text-sm text-[#493629] leading-relaxed first-letter:text-4xl first-letter:font-serif first-letter:font-semibold first-letter:float-left first-letter:mr-2.5 first-letter:leading-none first-letter:text-[#493629]">
                      {memory.story}
                    </p>
                  )}
                </>
              )}

              {/* Related Memories & Curatorial Connections Section */}
              {(relatedConnections.length > 0 ||
                relatedRoomAndTagMemories.length > 0) && (
                <div className="mt-6 pt-4 border-t border-[#E8DED0] space-y-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#493629] flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#C9A66B]" />
                    Related Memories (
                    {relatedConnections.length +
                      relatedRoomAndTagMemories.length}
                    )
                  </span>
                  <div className="space-y-2">
                    {relatedConnections.map(({ conn, otherMem }) =>
                      otherMem ? (
                        <button
                          key={conn.id}
                          type="button"
                          onClick={() =>
                            onSelectConnectedMemory?.(otherMem.id)
                          }
                          className="w-full text-left p-2.5 rounded-xl bg-[#F6F1E8] hover:bg-[#E8DED0]/65 border border-[#E8DED0] transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-[#27231F]">
                            <span className="truncate">{otherMem.title}</span>
                            {(otherMem.date || otherMem.year) && (
                              <span className="text-[10px] font-mono-tabular text-[#746B60] shrink-0 ml-2">
                                {otherMem.date || otherMem.year}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#746B60] mt-0.5">
                            {conn.relationshipLabel} — {conn.evidenceReason}
                          </p>
                        </button>
                      ) : null,
                    )}

                    {relatedRoomAndTagMemories.map(
                      ({ memory: relMem, reason }) => (
                        <button
                          key={relMem.id}
                          type="button"
                          onClick={() => onSelectConnectedMemory?.(relMem.id)}
                          className="w-full text-left p-2.5 rounded-xl bg-[#F6F1E8] hover:bg-[#E8DED0]/65 border border-[#E8DED0] transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-[#27231F]">
                            <span className="truncate">{relMem.title}</span>
                            {(relMem.date || relMem.year) && (
                              <span className="text-[10px] font-mono-tabular text-[#746B60] shrink-0 ml-2">
                                {relMem.date || relMem.year}
                              </span>
                            )}
                          </div>
                          {reason && (
                            <p className="text-[11px] text-[#746B60] mt-0.5">
                              {reason}
                            </p>
                          )}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Original Memory vs AI 3D Living World Interpretation & Blueprint Controls */}
              <div className="mt-6 p-3.5 rounded-xl bg-[#F6F1E8] border border-[#D6A15D]/60 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest font-semibold text-[#854D27]">
                    Original Upload vs. Memory-to-3D Object
                  </span>
                  <div className="flex items-center gap-1.5">
                    {memory.memoryTo3DBlueprint?.generatedGlbAssetRef
                      ?.isAiInterpretation && (
                      <span className="px-2 py-0.5 rounded bg-[#B45309] text-white text-[10px] font-mono-tabular uppercase font-semibold">
                        AI-Interpreted 3D Keepsake
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-[#27231F] text-[#FDE68A] text-[10px] font-mono-tabular uppercase">
                      {(
                        memory.memoryTo3DBlueprint?.connectedSpace ||
                        memory.linkedSpaceId ||
                        memory.multimodalAnalysis?.environmentDesign
                          .connectedSpace ||
                        'central_gallery'
                      ).replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#27231F]">
                  <strong>3D Object in Childhood Room:</strong>{' '}
                  {isMemory3DBlueprintApproved(memory) &&
                  memory.memoryTo3DBlueprint
                    ? `${memory.memoryTo3DBlueprint.objectName} (Approved · Tier ${memory.memoryTo3DBlueprint.generatedGlbAssetRef.priorityTier})`
                    : memory.linked3DObject ||
                      memory.multimodalAnalysis?.environmentDesign
                        .linked3DObject ||
                      'Original Media Only (No 3D Reconstruction Spawned)'}
                </p>

                {memory.memoryTo3DBlueprint?.visualDescription && (
                  <p className="text-[11px] text-[#493629]">
                    <strong>3D Appearance:</strong>{' '}
                    {memory.memoryTo3DBlueprint.visualDescription}
                  </p>
                )}

                {(memory.memoryTo3DBlueprint?.interactionLabel ||
                  memory.linkedActivity ||
                  memory.multimodalAnalysis?.environmentDesign
                    .linkedActivity) && (
                  <p className="text-[11px] text-[#493629]">
                    <strong>3D World Interaction:</strong>{' '}
                    {memory.memoryTo3DBlueprint?.interactionLabel ||
                      memory.linkedActivity ||
                      memory.multimodalAnalysis?.environmentDesign
                        .linkedActivity}
                  </p>
                )}

                {(memory.curationReport || memory.multimodalAnalysis?.memoryAnalysis) && (
                  <div className="pt-2 border-t border-[#E8DED0] space-y-1.5 text-[11px]">
                    <p className="font-semibold text-[#15803D] inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Evidence & Grounding Report
                    </p>
                    <p className="text-[#27231F]">
                      <strong>Verified Facts:</strong>{' '}
                      {(
                        memory.curationReport?.verifiedFacts ||
                        memory.multimodalAnalysis?.memoryAnalysis.verifiedFacts ||
                        []
                      ).join(' · ') || 'Original file preserved.'}
                    </p>
                    {(memory.curationReport?.aiInferences?.length || 0) > 0 && (
                      <p className="text-[#493629]">
                        <strong>AI Context Suggestions:</strong>{' '}
                        {memory.curationReport!.aiInferences.join(' · ')}
                      </p>
                    )}
                    <p className="text-[#746B60]">
                      <strong>Uncertain / Unconfirmed:</strong>{' '}
                      {(
                        memory.curationReport?.uncertainInfo ||
                        memory.multimodalAnalysis?.memoryAnalysis.uncertainInferences ||
                        []
                      ).join(' · ') || 'None noted.'}
                    </p>
                    {memory.curationReport?.transcript && (
                      <p className="text-[#493629] bg-[#FAF4E8] p-2 rounded border border-[#E2D4BE]">
                        <strong>Audio Transcript:</strong>{' '}
                        {memory.curationReport.transcript}
                      </p>
                    )}
                  </div>
                )}

                {onUpdateMemory && (
                  <div className="pt-2 border-t border-[#E8DED0] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-[#6E5641] font-medium">
                        World Location:
                      </span>
                      <select
                        aria-label="Select Childhood Room or Park Location"
                        value={memory.curatedZoneId || 'keepsake_corner'}
                        onChange={(e) => {
                          const locId = e.target.value as ChildhoodWorldLocationId;
                          const loc = CHILDHOOD_WORLD_LOCATION_CATALOGUE[locId];
                          onUpdateMemory({
                            ...memory,
                            curatedZoneId: locId,
                            placementTarget: loc.placementTarget,
                            linkedSpaceId: loc.spaceId,
                            linkedObjectId: loc.linkedObjectId || memory.linkedObjectId,
                          });
                        }}
                        className="px-2 py-0.5 rounded bg-[#FFFCF6] border border-[#D4C3AA] text-[11px] text-[#27231F]"
                      >
                        {Object.values(CHILDHOOD_WORLD_LOCATION_CATALOGUE).map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMemory({
                          ...memory,
                          hiddenFrom3D: !memory.hiddenFrom3D,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F6F1E8] border border-[#D4C3AA] text-[#27231F] hover:bg-[#EFE6D5] cursor-pointer"
                    >
                      {memory.hiddenFrom3D ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-[#15803D]" />
                          Show in 3D World
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-[#854D27]" />
                          Hide from 3D (Keep Media)
                        </>
                      )}
                    </button>
                  </div>
                )}

                {onUpdateMemory && (
                  <div className="pt-2 border-t border-[#E8DED0] flex flex-wrap items-center justify-between gap-2">
                    {isMemory3DBlueprintApproved(memory) ? (
                      <>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-[#6E5641] font-medium">
                            3D Zone:
                          </span>
                          <select
                            aria-label="Change 3D Object Zone in Childhood Room"
                            value={
                              memory.memoryTo3DBlueprint?.connectedSpace ||
                              'bedroom'
                            }
                            onChange={(e) => {
                              const nextSpace = e.target
                                .value as LivingWorldSpaceId;
                              if (memory.memoryTo3DBlueprint) {
                                onUpdateMemory({
                                  ...memory,
                                  linkedSpaceId: nextSpace,
                                  memoryTo3DBlueprint: {
                                    ...memory.memoryTo3DBlueprint,
                                    connectedSpace: nextSpace,
                                    userApprovalStatus: 'edited_and_approved',
                                  },
                                });
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-[#FFFCF6] border border-[#D4C3AA] text-[11px] text-[#27231F]"
                          >
                            <option value="backyard">Backyard</option>
                            <option value="play_area">Play Area</option>
                            <option value="bedroom">Childhood Bedroom</option>
                            <option value="study_corner">Study Corner</option>
                            <option value="treehouse">Treehouse</option>
                            <option value="central_gallery">
                              Central Gallery
                            </option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (memory.memoryTo3DBlueprint) {
                              onUpdateMemory({
                                ...memory,
                                memoryTo3DBlueprint: {
                                  ...memory.memoryTo3DBlueprint,
                                  userApprovalStatus: 'keep_media_only',
                                },
                              });
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#991B1B] bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] cursor-pointer"
                        >
                          Remove 3D Object (Keep Original Media)
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const bp =
                            memory.memoryTo3DBlueprint ||
                            buildAndValidateMemoryTo3DBlueprint({
                              memoryId: memory.id,
                              sourceMediaId: memory.id,
                              promptText: `${memory.title} ${memory.description} ${memory.story}`,
                              mediaType: memory.type || 'image',
                              multimodalAnalysis: memory.multimodalAnalysis,
                              defaultApprovalStatus: 'approved',
                            });
                          onUpdateMemory({
                            ...memory,
                            linked3DObject: bp.objectName,
                            linkedObjectId: bp.linkedObjectId,
                            linkedSpaceId: bp.connectedSpace,
                            linkedActivity: bp.interactionLabel,
                            memoryTo3DBlueprint: {
                              ...bp,
                              userApprovalStatus: 'approved',
                            },
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#15803D] text-white hover:bg-[#166534] cursor-pointer"
                      >
                        Approve & Spawn 3D Object in Childhood Room
                      </button>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-[#7C6450]">
                  Original uploaded media and text are preserved unchanged alongside this 3D spatial exhibition.
                </p>
              </div>

              <dl className="mt-6 pt-5 border-t border-[#E8DED0] space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-[#F6F1E8]">
                  <dt className="text-[#7C6450] uppercase tracking-wider">
                    Exhibition Wing
                  </dt>
                  <dd className="font-medium text-[#27231F] flex items-center gap-2">
                    <span>{currentRoom?.name}</span>
                    {onEnterRoom && currentRoom && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEnterRoom(currentRoom.id);
                        }}
                        className="text-[#854D27] underline cursor-pointer"
                      >
                        Visit Room
                      </button>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F6F1E8]">
                  <dt className="text-[#7C6450] uppercase tracking-wider">
                    Exhibit Format
                  </dt>
                  <dd className="text-[#493629] font-medium">
                    {typeMeta.label}
                  </dd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#F6F1E8]">
                  <dt className="text-[#7C6450] uppercase tracking-wider flex items-center gap-1.5">
                    <Frame className="w-3.5 h-3.5 text-[#C9A66B]" />
                    <span>3D Frame & Mount</span>
                  </dt>
                  <dd>
                    <select
                      aria-label="Select 3D Frame and Mount Style"
                      value={memory.frameStyle || 'walnut'}
                      onChange={(e) => {
                        if (onUpdateMemory) {
                          onUpdateMemory({
                            ...memory,
                            frameStyle: e.target
                              .value as MemoryDisplayFrameStyle,
                          });
                        }
                      }}
                      className="bg-[#F6F1E8] border border-[#E8DED0] rounded-lg px-2 py-1 text-xs font-medium text-[#27231F] cursor-pointer"
                    >
                      {MEMORY_FRAME_STYLE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#F6F1E8]">
                  <dt className="text-[#7C6450] uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#C9A66B]" />
                    <span>3D Room Placement</span>
                  </dt>
                  <dd>
                    <select
                      aria-label="Select 3D Room Placement"
                      value={memory.placementTarget || 'memory_wall'}
                      onChange={(e) => {
                        if (onUpdateMemory) {
                          const targetId = e.target
                            .value as MemoryPlacementTarget;
                          const matched = MEMORY_PLACEMENT_OPTIONS.find(
                            (o) => o.id === targetId,
                          );
                          const nextZone =
                            matched?.curatedZoneId ||
                            memory.curatedZoneId ||
                            'memory_wall';
                          const catalogEntry =
                            CHILDHOOD_WORLD_LOCATION_CATALOGUE[nextZone];
                          onUpdateMemory({
                            ...memory,
                            curatedZoneId: nextZone,
                            placementTarget: targetId,
                            linked3DObject:
                              matched?.linked3DObject || memory.linked3DObject,
                            linkedObjectId:
                              matched?.linkedObjectId || memory.linkedObjectId,
                            linkedSpaceId:
                              catalogEntry?.spaceId || memory.linkedSpaceId,
                            confirmationStatus: 'user_edited',
                            placement3D: catalogEntry
                              ? {
                                  locationId: nextZone,
                                  placementTarget: targetId,
                                  linkedObjectId:
                                    matched?.linkedObjectId ||
                                    catalogEntry.linkedObjectId,
                                  position: [
                                    catalogEntry.anchor.x,
                                    catalogEntry.anchor.y,
                                    catalogEntry.anchor.z,
                                  ],
                                }
                              : memory.placement3D,
                            updatedAt: new Date().toISOString(),
                          });
                        }
                      }}
                      className="bg-[#F6F1E8] border border-[#E8DED0] rounded-lg px-2 py-1 text-xs font-medium text-[#27231F] cursor-pointer"
                    >
                      {MEMORY_PLACEMENT_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                {(memory.userProvided || memory.aiSuggestions) && (
                  <div className="py-2 px-3 rounded-lg bg-[#FAF5EB] border border-[#E8DED0] space-y-1.5 text-[11px]">
                    <p className="font-semibold uppercase tracking-wider text-[10px] text-[#854D27]">
                      Source Provenance
                    </p>
                    {memory.userProvided &&
                      (memory.userProvided.title ||
                        memory.userProvided.description ||
                        memory.userProvided.date) && (
                        <div className="text-[#27231F]">
                          <span className="font-semibold">Your input: </span>
                          {[
                            memory.userProvided.title,
                            memory.userProvided.description,
                            memory.userProvided.date,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                    {memory.aiSuggestions && (
                      <div className="text-[#493629]">
                        <span className="font-semibold text-[#854D27]">
                          Gemini suggestion
                          {memory.aiSuggestions.modelUsed
                            ? ` (${memory.aiSuggestions.modelUsed})`
                            : ''}
                          :{' '}
                        </span>
                        {memory.aiSuggestions.assistantResponse ||
                          memory.aiSuggestions.description ||
                          memory.aiSuggestions.title}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center py-1 border-b border-[#F6F1E8]">
                  <dt className="text-[#7C6450] uppercase tracking-wider">
                    Reposition in 3D
                  </dt>
                  <dd className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMemory?.({
                          ...memory,
                          positionOffset: {
                            x: Number(((memory.positionOffset?.x || 0) - 0.35).toFixed(2)),
                            y: memory.positionOffset?.y || 0,
                          },
                        })
                      }
                      className="px-2 py-0.5 rounded bg-[#F6F1E8] border border-[#E8DED0] text-[11px] font-medium text-[#27231F] hover:bg-[#EFE6D5] cursor-pointer"
                      title="Nudge Left in 3D Room"
                    >
                      ← Left
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMemory?.({
                          ...memory,
                          positionOffset: {
                            x: Number(((memory.positionOffset?.x || 0) + 0.35).toFixed(2)),
                            y: memory.positionOffset?.y || 0,
                          },
                        })
                      }
                      className="px-2 py-0.5 rounded bg-[#F6F1E8] border border-[#E8DED0] text-[11px] font-medium text-[#27231F] hover:bg-[#EFE6D5] cursor-pointer"
                      title="Nudge Right in 3D Room"
                    >
                      Right →
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMemory?.({
                          ...memory,
                          positionOffset: {
                            x: memory.positionOffset?.x || 0,
                            y: Number(((memory.positionOffset?.y || 0) + 0.25).toFixed(2)),
                          },
                        })
                      }
                      className="px-2 py-0.5 rounded bg-[#F6F1E8] border border-[#E8DED0] text-[11px] font-medium text-[#27231F] hover:bg-[#EFE6D5] cursor-pointer"
                      title="Nudge Up in 3D Room"
                    >
                      ↑ Up
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMemory?.({
                          ...memory,
                          positionOffset: {
                            x: memory.positionOffset?.x || 0,
                            y: Number(((memory.positionOffset?.y || 0) - 0.25).toFixed(2)),
                          },
                        })
                      }
                      className="px-2 py-0.5 rounded bg-[#F6F1E8] border border-[#E8DED0] text-[11px] font-medium text-[#27231F] hover:bg-[#EFE6D5] cursor-pointer"
                      title="Nudge Down in 3D Room"
                    >
                      ↓ Down
                    </button>
                    {(memory.positionOffset?.x || memory.positionOffset?.y) ? (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateMemory?.({
                            ...memory,
                            positionOffset: { x: 0, y: 0 },
                          })
                        }
                        className="px-2 py-0.5 rounded bg-[#EFE6D5] text-[10px] font-semibold text-[#854D27] cursor-pointer"
                      >
                        Reset
                      </button>
                    ) : null}
                  </dd>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F6F1E8]">
                  <dt className="text-[#7C6450] uppercase tracking-wider">
                    Tags
                  </dt>
                  <dd className="text-[#493629]">
                    {memory.tags.join(' · ') || 'Personal Archive'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Room Status & Confirmed Delete Controls */}
            <div className="mt-8 pt-4 border-t border-[#E8DED0] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#493629]">
                <FolderOutput className="w-4 h-4 text-[#854D27]" />
                <span>Active Wing:</span>
                <span className="bg-[#F6F1E8] border border-[#E8DED0] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#27231F]">
                  Childhood Room
                </span>
              </div>

              {confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#991B1B]">
                    Confirm delete?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteMemory(memory.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#991B1B] text-white cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-[#493629] bg-[#F6F1E8] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#991B1B] hover:bg-[#FEE2E2]/60 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Memory
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
