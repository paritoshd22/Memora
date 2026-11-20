import React, { useMemo, useState } from 'react';
import {
  Heart,
  MapPin,
  Calendar,
  Film,
  Music,
  FileText,
  MessageSquare,
  BookOpen,
  Award,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  FolderOutput,
  Info,
  Play,
} from 'lucide-react';
import {
  GalleryLayoutMode,
  Memory,
  Room,
} from '../types/museum';
import { getProceduralMemoryArt } from '../utils/proceduralArt';
import {
  EXHIBIT_TYPE_LABELS,
  getRoomVisualThemeProfile,
} from '../utils/roomThemes';
import { VideoMemoryPlayer } from './VideoMemoryPlayer';

interface MemoryCardProps {
  memory: Memory;
  room?: Room;
  allRooms?: Room[];
  availableRooms?: Room[];
  layoutMode?: GalleryLayoutMode;
  cardIndex?: number;
  totalCards?: number;
  isSelected?: boolean;
  reducedMotion?: boolean;
  isDragging?: boolean;
  isDragTarget?: boolean;
  dropIndicator?: 'before' | 'after' | null;
  dropIndicatorPosition?: 'before' | 'after' | null;
  onSelect: (memory: Memory) => void;
  onToggleFavorite?: (memoryId: string, e: React.MouseEvent) => void;
  onMoveOrder?: (memoryId: string, direction: 'prev' | 'next') => void;
  onReassignRoom?: (memoryId: string, targetRoomId: string) => void;
  onDragStartCard?: (memoryId: string, e: React.DragEvent) => void;
  onDragOverCard?: (memoryId: string, e: React.DragEvent) => void;
  onDropOnCard?: (targetMemoryId: string, e: React.DragEvent) => void;
  onDragEndCard?: () => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  room,
  allRooms,
  availableRooms,
  layoutMode = 'grid',
  cardIndex = 0,
  totalCards = 1,
  isSelected = false,
  reducedMotion = false,
  isDragging = false,
  isDragTarget = false,
  dropIndicator = null,
  dropIndicatorPosition = null,
  onSelect,
  onToggleFavorite,
  onMoveOrder,
  onReassignRoom,
  onDragStartCard,
  onDragOverCard,
  onDropOnCard,
  onDragEndCard,
}) => {
  const effectiveAllRooms = allRooms ?? availableRooms;
  const effectiveIsDragging = isDragging || isDragTarget;
  const effectiveDropIndicator = dropIndicator ?? dropIndicatorPosition;
  void effectiveAllRooms;
  void effectiveIsDragging;
  void effectiveDropIndicator;
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [touchOverlayOpen, setTouchOverlayOpen] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const mediaType = memory.type || 'image';
  const typeMeta = EXHIBIT_TYPE_LABELS[mediaType] || EXHIBIT_TYPE_LABELS.image;
  const themeProfile = useMemo(
    () =>
      room
        ? getRoomVisualThemeProfile(room)
        : {
            frameOuterHex: '#493629',
            frameMatHex: '#FAF4E8',
            accentHex: '#D6A15D',
            plaqueBgHex: '#27231F',
            plaqueTextHex: '#FDE68A',
            categoryKey: 'default',
          },
    [room],
  );

  const imageSrc = useMemo(() => {
    if (memory.customImageUrl) return memory.customImageUrl;
    return getProceduralMemoryArt(
      memory.motif,
      memory.palette,
      memory.title,
      memory.location,
    );
  }, [memory]);

  const playableVideoSrc = useMemo(() => {
    const src = memory.mediaUrl || memory.customImageUrl || '';
    if (
      mediaType === 'video' &&
      (src.startsWith('data:video/') ||
        src.startsWith('blob:') ||
        /\.(mp4|webm|ogg)$/i.test(src))
    ) {
      return src;
    }
    return null;
  }, [mediaType, memory.mediaUrl, memory.customImageUrl]);

  const playableAudioSrc = useMemo(() => {
    const src = memory.mediaUrl || '';
    if (
      mediaType === 'audio' &&
      (src.startsWith('data:audio/') ||
        src.startsWith('blob:') ||
        /\.(mp3|wav|ogg|m4a)$/i.test(src))
    ) {
      return src;
    }
    return null;
  }, [mediaType, memory.mediaUrl]);

  // Vary aspect ratios naturally in Masonry layout so photographs preserve expressive proportions
  const masonryAspectClass = useMemo(() => {
    if (layoutMode !== 'masonry') return 'aspect-4/3';
    const mod = (cardIndex + memory.title.length) % 3;
    if (mod === 0) return 'aspect-4/3';
    if (mod === 1) return 'aspect-square';
    return 'aspect-16/10';
  }, [layoutMode, cardIndex, memory.title.length]);

  // Restrained scrapbook rotation (disabled when reducedMotion is true)
  const scrapbookRotationStyle = useMemo(() => {
    if (layoutMode !== 'scrapbook' || reducedMotion) return undefined;
    const angles = ['-1.2deg', '0.9deg', '-0.7deg', '1.1deg'];
    return {
      transform: `rotate(${angles[cardIndex % angles.length]})`,
    };
  }, [layoutMode, reducedMotion, cardIndex]);

  const activeRooms = useMemo(
    () => (allRooms || []).filter((r) => r.status === 'active'),
    [allRooms],
  );

  const formattedDate = memory.date ? memory.date : 'Undated Keepsake';

  return (
    <article
      draggable={Boolean(onDragStartCard)}
      onDragStart={(e) => {
        if (onDragStartCard) {
          onDragStartCard(memory.id, e);
        }
      }}
      onDragOver={(e) => {
        if (onDragOverCard) {
          e.preventDefault();
          onDragOverCard(memory.id, e);
        }
      }}
      onDrop={(e) => {
        if (onDropOnCard) {
          e.preventDefault();
          onDropOnCard(memory.id, e);
        }
      }}
      onDragEnd={() => {
        if (onDragEndCard) onDragEndCard();
      }}
      onClick={() => onSelect(memory)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(memory);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Inspect ${typeMeta.label}: ${memory.title}`}
      style={scrapbookRotationStyle}
      className={`group relative flex flex-col rounded-xl overflow-hidden text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6A15D] ${
        reducedMotion
          ? ''
          : 'hover:-translate-y-0.5 transition-all duration-150'
      } ${
        layoutMode === 'wall'
          ? 'bg-[#2A1E15] border-2 border-[#8C6223] shadow-xl text-[#FFFCF6]'
          : layoutMode === 'scrapbook'
            ? 'bg-[#FAF3E4] border border-[#D8C4A3] shadow-md'
            : 'bg-[#FFFCF6] border border-[#E8DED0] shadow-xs hover:shadow-md'
      } ${
        isSelected
          ? 'ring-2 ring-[#D6A15D] border-[#D6A15D]'
          : memory.isFavorite
            ? 'border-[#D6A15D]/80'
            : ''
      } ${isDragging ? 'opacity-45 scale-98 ring-2 ring-[#D6A15D]' : ''}`}
    >
      {/* Visible Drop Target Insertion Indicator (Before / After) */}
      {dropIndicator === 'before' && (
        <div
          aria-hidden="true"
          className="
            absolute inset-x-0 top-0 h-1.5 bg-[#D6A15D] z-30
            shadow-[0_0_12px_#D6A15D]
          "
        />
      )}
      {dropIndicator === 'after' && (
        <div
          aria-hidden="true"
          className="
            absolute inset-x-0 bottom-0 h-1.5 bg-[#D6A15D] z-30
            shadow-[0_0_12px_#D6A15D]
          "
        />
      )}

      {/* Scrapbook Tape Accent at Top Center */}
      {layoutMode === 'scrapbook' && (
        <div
          aria-hidden="true"
          className="w-20 h-4 bg-[#E9D4B1]/75 border border-[#D4BC94] mx-auto -mt-1.5 rounded-xs shadow-2xs z-10"
        />
      )}

      {/* ====================================================================
          EXHIBIT VISUAL STAGE BY MEDIA TYPE
          ==================================================================== */}
      <div
        style={{
          backgroundColor:
            layoutMode === 'wall'
              ? themeProfile.frameOuterHex
              : themeProfile.frameOuterHex,
        }}
        className={`relative w-full overflow-hidden ${
          layoutMode === 'wall' ? 'p-3.5' : 'p-2.5'
        }`}
      >
        <div
          style={{ backgroundColor: themeProfile.frameMatHex }}
          className={`relative w-full rounded-lg overflow-hidden border border-[#E8DEC8]/40 ${
            layoutMode === 'wall' ? 'p-2 shadow-inner' : ''
          }`}
        >
          {/* 1. CHAT EXCERPT EXHIBIT */}
          {mediaType === 'chat' ? (
            <div className="min-h-[190px] bg-[#FAF4E8] p-3.5 flex flex-col justify-between rounded border border-[#E2D4BE]">
              <div className="flex items-center justify-between text-[11px] text-[#6E5641] pb-2 border-b border-[#E8DED0]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#493629]">
                  <MessageSquare className="w-3.5 h-3.5 text-[#C26D3A]" />
                  Conversation Excerpt
                </span>
                <span className="font-mono-tabular">{formattedDate}</span>
              </div>
              <div className="my-2.5 space-y-2">
                {(memory.chatLines && memory.chatLines.length > 0
                  ? memory.chatLines.slice(0, 3)
                  : [
                      {
                        sender: memory.people?.[0] || 'Archive Note',
                        text: memory.description || memory.story,
                        timestamp: memory.date,
                      },
                    ]
                ).map((line, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-xs leading-snug ${
                      idx % 2 === 0
                        ? 'bg-[#FFFCF6] border border-[#E4D6C3] text-[#27231F] mr-4'
                        : 'bg-[#493629] text-[#FFFCF6] ml-4'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] opacity-75 mb-0.5">
                      <span className="font-semibold">{line.sender}</span>
                      {line.timestamp && (
                        <span className="font-mono-tabular">
                          {line.timestamp}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2">{line.text}</p>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-[#78624F] flex items-center justify-between pt-1">
                <span>Click to read full conversation</span>
                <span className="font-mono-tabular uppercase">
                  {memory.accessionNumber}
                </span>
              </div>
            </div>
          ) : mediaType === 'story' ? (
            /* 2. WRITTEN STORY / LETTER EXHIBIT */
            <div className="min-h-[190px] bg-[#FDF9F0] p-4 flex flex-col justify-between rounded border border-[#DFD1B8] shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-[#7C6450] border-b border-[#EAE0D0] pb-2">
                <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-[#854D27]">
                  <BookOpen className="w-3.5 h-3.5" />
                  {memory.documentAuthor || 'Written Story & Letter'}
                </span>
                <span className="font-mono-tabular">{formattedDate}</span>
              </div>
              <div className="my-3">
                <p className="font-serif-display italic text-sm text-[#27231F] leading-relaxed line-clamp-4 first-letter:text-2xl first-letter:font-semibold first-letter:text-[#854D27] first-letter:mr-1">
                  “{memory.story || memory.description}”
                </p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#6E5641] pt-2 border-t border-[#EAE0D0]">
                <span>{memory.location || 'Personal Manuscript'}</span>
                <span className="font-mono-tabular">
                  {memory.accessionNumber}
                </span>
              </div>
            </div>
          ) : mediaType === 'certificate' ? (
            /* 3. FORMAL CERTIFICATE & ACHIEVEMENT EXHIBIT */
            <div className="min-h-[190px] bg-[#FFFCF6] p-3.5 rounded border-2 border-[#D6A15D] flex flex-col justify-between relative">
              <div className="border border-[#E8DED0] p-3 rounded flex-1 flex flex-col justify-between text-center">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-widest text-[#A16207]">
                  <Award className="w-4 h-4 text-[#D6A15D]" />
                  <span>
                    {memory.certificateIssuer ||
                      'Official Exhibition Citation'}
                  </span>
                </div>
                <div className="my-2">
                  <p className="font-serif-display text-lg font-semibold text-[#27231F] line-clamp-2">
                    {memory.title}
                  </p>
                  <p className="text-[11px] text-[#5C493A] mt-1 line-clamp-2">
                    {memory.description}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#78624F] pt-2 border-t border-[#EAE0D0]">
                  <span>{formattedDate}</span>
                  <span className="font-mono-tabular font-semibold text-[#854D27]">
                    {memory.accessionNumber}
                  </span>
                </div>
              </div>
            </div>
          ) : mediaType === 'audio' ? (
            /* 4. AUDIO MEMORY EXHIBIT */
            <div className="min-h-[190px] bg-[#241A12] text-[#FFFCF6] p-4 rounded flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] text-[#E9D4B1]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#FDE68A]">
                  <Music className="w-3.5 h-3.5 text-[#D6A15D]" />
                  Audio Memory Recording
                </span>
                <span className="font-mono-tabular text-[10px]">
                  {memory.accessionNumber}
                </span>
              </div>

              {/* Acoustic Waveform Visual Bars */}
              <div
                aria-hidden="true"
                className="my-3 flex items-center justify-center gap-1 h-12 px-2"
              >
                {[
                  35, 65, 45, 85, 55, 95, 70, 40, 80, 60, 90, 50, 75, 45, 65,
                  35, 55, 40,
                ].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className="w-1.5 rounded-full bg-[#D6A15D]/80 group-hover:bg-[#FDE68A] transition-colors"
                  />
                ))}
              </div>

              {playableAudioSrc ? (
                <div onClick={(e) => e.stopPropagation()} className="mt-1">
                  <audio
                    controls
                    preload="metadata"
                    src={playableAudioSrc}
                    className="w-full h-8"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-[#E9D4B1]/90 bg-white/10 px-3 py-1.5 rounded-lg">
                  <span className="inline-flex items-center gap-1.5">
                    <Play className="w-3 h-3 fill-[#FDE68A] text-[#FDE68A]" />
                    {memory.soundtrackSourceId
                      ? 'Linked Museum Soundscape'
                      : 'Open Audio Exhibit'}
                  </span>
                  <span className="font-mono-tabular">{formattedDate}</span>
                </div>
              )}
            </div>
          ) : mediaType === 'document' ? (
            /* 5. ARCHIVAL DOCUMENT EXHIBIT */
            <div className="min-h-[190px] bg-[#F8F3E8] p-3.5 rounded border border-[#D8C7AE] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-[#6E5641] pb-2 border-b border-[#E5D8C5]">
                <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[#493629]">
                  <FileText className="w-3.5 h-3.5 text-[#854D27]" />
                  Archival Document
                </span>
                <span className="font-mono-tabular">
                  {memory.accessionNumber}
                </span>
              </div>
              <div className="my-2.5 flex items-start gap-3">
                {!imgError && imageSrc && (
                  <img
                    src={imageSrc}
                    alt={memory.title}
                    loading="lazy"
                    onError={() => setImgError(true)}
                    className="w-16 h-20 object-cover rounded border border-[#D4C3AA] shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-serif-display text-sm font-semibold text-[#27231F] line-clamp-1">
                    {memory.title}
                  </p>
                  <p className="text-xs text-[#493629] mt-1 line-clamp-3 leading-relaxed">
                    {memory.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#78624F] pt-1.5 border-t border-[#E5D8C5]">
                <span>Click to preview & read document</span>
                <span className="font-mono-tabular">{formattedDate}</span>
              </div>
            </div>
          ) : (
            /* 6. PHOTOGRAPH OR VIDEO SCREEN EXHIBIT */
            <div
              className={`relative w-full ${masonryAspectClass} bg-[#27231F] rounded overflow-hidden shadow-inner`}
            >
              {playableVideoSrc ? (
                <VideoMemoryPlayer
                  src={playableVideoSrc}
                  poster={imageSrc}
                  title={memory.title}
                  variant="card"
                  defaultMuted={true}
                  hoverPreview={!reducedMotion}
                  aspectClassName={masonryAspectClass}
                  onLoadedData={() => setIsLoaded(true)}
                />
              ) : !imgError && imageSrc ? (
                <>
                  {!isLoaded && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-[#3A281B] animate-pulse flex items-center justify-center text-[11px] text-[#E9D4B1]/70"
                    >
                      Loading exhibit...
                    </div>
                  )}
                  <img
                    src={imageSrc}
                    alt={memory.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onLoad={() => setIsLoaded(true)}
                    onError={() => {
                      setImgError(true);
                      setIsLoaded(true);
                    }}
                    className={`w-full h-full object-cover ${
                      reducedMotion
                        ? ''
                        : 'group-hover:scale-103 transition-transform duration-300'
                    }`}
                  />
                </>
              ) : (
                <div
                  style={{
                    background: `linear-gradient(135deg, ${memory.palette[0]}, ${memory.palette[1]}, ${memory.palette[2]})`,
                  }}
                  className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-[#FAF5EC]"
                >
                  <span className="font-serif-display text-lg italic">
                    {memory.title}
                  </span>
                  <span className="text-xs opacity-75 mt-1">
                    {memory.location}
                  </span>
                </div>
              )}

              {/* Video Screen Badge (only when no direct playable video stream is attached) */}
              {mediaType === 'video' && !playableVideoSrc && (
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-[#27231F]/90 text-[#E9D4B1] text-[10px] font-semibold flex items-center gap-1.5 border border-[#D6A15D]/50">
                  <Film className="w-3 h-3 text-[#D6A15D]" />
                  <span>VIDEO SCREEN</span>
                </div>
              )}
            </div>
          )}

          {/* Top-Right Quick Controls: Drag Handle, Info Toggle (Touch), & Favorite */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
            {onDragStartCard && (
              <span
                title="Drag to reorder or move to another room"
                className="p-1.5 rounded-full bg-black/45 text-[#FAF5EC] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTouchOverlayOpen((prev) => !prev);
              }}
              aria-label="Toggle memory details overlay"
              title="Quick Metadata Preview"
              className="p-1.5 rounded-full bg-black/45 text-[#FAF5EC] hover:bg-black/70 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(memory.id, e);
                }}
                aria-label={
                  memory.isFavorite
                    ? 'Remove from favorites'
                    : 'Mark as favorite'
                }
                className={`p-1.5 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-[#FDE68A] ${
                  memory.isFavorite
                    ? 'bg-[#27231F]/85 text-[#F59E0B] shadow-xs'
                    : 'bg-black/45 text-[#FAF5EC] hover:bg-black/70'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    memory.isFavorite
                      ? 'fill-[#F59E0B] text-[#F59E0B]'
                      : 'text-[#FAF5EC]'
                  }`}
                />
              </button>
            )}
          </div>

          {/* Compact Hover / Tap Discovery Overlay (Requirement F) */}
          <div
            className={` inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#18110B]/95 via-[#18110B]/80 to-transparent p-3 text-[#FFFCF6] transition-opacity duration-150 ${
              touchOverlayOpen
                ? 'opacity-100 relative'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 absolute pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] text-[#E9D4B1]">
              <span className="font-mono-tabular">{formattedDate}</span>
              <span className="uppercase tracking-wider text-[#D6A15D]">
                {typeMeta.label}
              </span>
            </div>
            <p className="font-serif-display text-sm font-semibold text-[#FFFCF6] line-clamp-1 mt-0.5">
              {memory.title}
            </p>
            <p className="text-[11px] text-[#F4E9D8]/90 line-clamp-2 mt-0.5 leading-snug">
              {memory.description}
            </p>
            {memory.tags && memory.tags.length > 0 && (
              <p className="text-[10px] text-[#D6A15D] truncate mt-1">
                {memory.tags.slice(0, 4).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          CARD FOOTER & ACCESSIBLE REORDER / ROOM MOVE CONTROLS
          ==================================================================== */}
      <div
        className={`flex flex-col flex-1 p-4 justify-between ${
          layoutMode === 'wall' ? 'bg-[#231912] text-[#FFFCF6]' : ''
        }`}
      >
        <div>
          {/* Clean Unboxed Metadata Line (Zero-Pill Discipline) */}
          <div
            className={`flex items-center gap-1.5 text-xs truncate ${
              layoutMode === 'wall' ? 'text-[#E9D4B1]/80' : 'text-[#78624F]'
            }`}
          >
            {room && (
              <>
                <span
                  className={`font-medium ${
                    layoutMode === 'wall' ? 'text-[#FDE68A]' : 'text-[#5A4230]'
                  }`}
                >
                  {room.name}
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{typeMeta.label}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              {memory.year || formattedDate}
            </span>
            {memory.isFavorite && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#D97706] font-semibold">★ Favorite</span>
              </>
            )}
          </div>

          <h3
            className={`font-serif-display text-xl font-semibold mt-1 transition-colors line-clamp-1 ${
              layoutMode === 'wall'
                ? 'text-[#FFFCF6] group-hover:text-[#FDE68A]'
                : 'text-[#241A12] group-hover:text-[#9A5B25]'
            }`}
          >
            {memory.title}
          </h3>

          <p
            className={`text-sm mt-1.5 line-clamp-2 leading-relaxed ${
              layoutMode === 'wall'
                ? 'text-[#E9D4B1]/85'
                : layoutMode === 'scrapbook'
                  ? 'text-[#493629] italic font-serif-display text-base'
                  : 'text-[#5C493A]'
            }`}
          >
            {memory.description}
          </p>

          {memory.tags && memory.tags.length > 0 && (
            <div
              className={`mt-2 text-[11px] truncate ${
                layoutMode === 'wall' ? 'text-[#D6A15D]' : 'text-[#856B52]'
              }`}
            >
              {memory.tags.join(' · ')}
            </div>
          )}
        </div>

        <div
          className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
            layoutMode === 'wall'
              ? 'border-[#493629] text-[#E9D4B1]/75'
              : 'border-[#EAE0D0] text-[#78624F]'
          }`}
        >
          <span className="inline-flex items-center gap-1 truncate max-w-[55%]">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#9A6A3A]" />
            <span className="truncate">
              {memory.location || 'Personal Archive'}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 font-mono-tabular shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#9A6A3A]" />
            {formattedDate}
          </span>
        </div>

        {/* Touch & Keyboard Organization Bar (Reorder & Move Room) */}
        {(onMoveOrder || (onReassignRoom && activeRooms.length > 1)) && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-1.5 text-[11px] ${
              layoutMode === 'wall'
                ? 'border-[#493629]/80 text-[#E9D4B1]'
                : 'border-[#EAE0D0]/80 text-[#5C493A]'
            }`}
          >
            {onMoveOrder && totalCards > 1 && (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={cardIndex === 0}
                  onClick={() => onMoveOrder(memory.id, 'prev')}
                  title="Move exhibit earlier in gallery"
                  aria-label={`Move ${memory.title} earlier`}
                  className="p-1 rounded border border-[#D4C3AA] hover:bg-[#E9D4B1]/40 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <span className="font-mono-tabular text-[10px] px-1">
                  #{cardIndex + 1}
                </span>
                <button
                  type="button"
                  disabled={cardIndex >= totalCards - 1}
                  onClick={() => onMoveOrder(memory.id, 'next')}
                  title="Move exhibit later in gallery"
                  aria-label={`Move ${memory.title} later`}
                  className="p-1 rounded border border-[#D4C3AA] hover:bg-[#E9D4B1]/40 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {onReassignRoom && activeRooms.length > 1 && (
              <div className="relative">
                {showMoveMenu ? (
                  <select
                    value={memory.roomId}
                    onChange={(e) => {
                      setShowMoveMenu(false);
                      if (e.target.value !== memory.roomId) {
                        onReassignRoom(memory.id, e.target.value);
                      }
                    }}
                    onBlur={() => setShowMoveMenu(false)}
                    aria-label={`Move ${memory.title} to another room`}
                    className="px-2 py-0.5 rounded bg-[#F6F1E8] border border-[#D6A15D] text-[11px] text-[#27231F] font-medium"
                  >
                    {activeRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id === memory.roomId
                          ? `Current: ${r.name}`
                          : `Move to ${r.name}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMoveMenu(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#D4C3AA] hover:bg-[#E9D4B1]/40 text-[10px] font-medium cursor-pointer"
                  >
                    <FolderOutput className="w-3 h-3 text-[#854D27]" />
                    <span>Move Room</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
