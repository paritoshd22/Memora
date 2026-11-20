import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  Edit3,
  Eye,
  LayoutGrid,
  Columns,
  Layers,
  Heart,
  MapPin,
  Users,
  BarChart3,
  Lock,
  Unlock,
  Music,
  Download,
  ShieldCheck,
  Sparkles,
  Check,
  X,
  FolderInput,
  Calendar,
  BookOpen,
  Frame,
  GalleryHorizontalEnd,
  Link2,
  Trash2,
  GitMerge,
} from 'lucide-react';
import {
  Collection,
  Floor,
  GalleryLayoutMode,
  Memory,
  MemoryConnection,
  MemoryMediaType,
  Room,
} from '../types/museum';
import { getProceduralMemoryArt } from '../utils/proceduralArt';
import {
  GALLERY_LAYOUT_OPTIONS,
  generateGroundedMemoryConnections,
  getRoomVisualThemeProfile,
} from '../utils/roomThemes';
import {
  computeRoomMemoryVisualData,
  detectRoomCategoryFromInput,
} from '../utils/roomCategoryExperience';
import { MemoryCard } from './MemoryCard';
import { BRAND } from '../config/brand';

/* ==========================================================================
   1. DEDICATED ROOM VIEW (Immersive Exhibition Space with 6 Live Layouts,
      7 Exhibit Types, Drag-and-Drop Organization & AI Memory Connections)
   ========================================================================== */
interface RoomInteriorViewProps {
  room: Room;
  allRooms?: Room[];
  memories: Memory[];
  allMemories?: Memory[];
  approvedConnections?: MemoryConnection[];
  reducedMotion?: boolean;
  onBackToAtrium: () => void;
  onSelectMemory: (memory: Memory) => void;
  onToggleFavorite: (memoryId: string, e: React.MouseEvent) => void;
  onOpenAddMemory: (roomId: string) => void;
  onOpenEditRoom: (room: Room) => void;
  onOpenSoundscapes?: () => void;
  onUpdateRoomLayout?: (roomId: string, layout: GalleryLayoutMode) => void;
  onReorderRoomMemories?: (roomId: string, orderedMemoryIds: string[]) => void;
  onReassignMemoryRoom?: (memoryId: string, targetRoomId: string) => void;
  onApproveMemoryConnection?: (connection: MemoryConnection) => void;
  onRemoveMemoryConnection?: (connectionId: string) => void;
}

export const RoomInteriorView: React.FC<RoomInteriorViewProps> = ({
  room,
  allRooms = [],
  memories,
  allMemories = [],
  approvedConnections = [],
  reducedMotion = false,
  onBackToAtrium,
  onSelectMemory,
  onToggleFavorite,
  onOpenAddMemory,
  onOpenEditRoom,
  onOpenSoundscapes,
  onUpdateRoomLayout,
  onReorderRoomMemories,
  onReassignMemoryRoom,
  onApproveMemoryConnection,
  onRemoveMemoryConnection,
}) => {
  const [inspect3DMode, setInspect3DMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<GalleryLayoutMode>(
    room.galleryLayout || 'masonry',
  );
  const [mediaFilter, setMediaFilter] = useState<'all' | MemoryMediaType>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<
    'custom' | 'newest' | 'oldest' | 'title'
  >('custom');
  const [searchQuery, setSearchQuery] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(24);

  // Drag-and-Drop Reordering & Cross-Room Transfer State
  const [draggedMemoryId, setDraggedMemoryId] = useState<string | null>(null);
  const [dropTargetMemoryId, setDropTargetMemoryId] = useState<string | null>(
    null,
  );
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(
    null,
  );
  const [hoveredRoomDropId, setHoveredRoomDropId] = useState<string | null>(
    null,
  );

  // AI-Suggested Memory Connections State
  const [showConnectionsPanel, setShowConnectionsPanel] = useState(false);
  const [suggestedConnections, setSuggestedConnections] = useState<
    MemoryConnection[]
  >([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(
    null,
  );
  const [editLabelDraft, setEditLabelDraft] = useState('');
  const [editEvidenceDraft, setEditEvidenceDraft] = useState('');
  const [aiStatusNote, setAiStatusNote] = useState<string | null>(null);

  // Keep layout synced if room changes
  useEffect(() => {
    setLayoutMode(room.galleryLayout || 'masonry');
    setCarouselIndex(0);
    setVisibleCount(24);
  }, [room.id, room.galleryLayout]);

  const themeProfile = useMemo(() => getRoomVisualThemeProfile(room), [room]);
  const categoryDetection = useMemo(
    () =>
      detectRoomCategoryFromInput(
        `${room.name} ${room.subtitle} ${room.theme}`,
        room.designConfig?.detectedCategory,
      ),
    [room],
  );
  const visualDataSummary = useMemo(
    () =>
      computeRoomMemoryVisualData(
        categoryDetection.categoryKey,
        room.name,
        memories,
      ),
    [categoryDetection.categoryKey, room.name, memories],
  );

  const activeOtherRooms = useMemo(
    () =>
      allRooms.filter((r) => r.status === 'active' && r.id !== room.id),
    [allRooms, room.id],
  );

  // Sort & filter memories while preserving custom displayOrder by default
  const filteredMemories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = memories.filter((m) => {
      const mType = m.type || 'image';
      if (mediaFilter !== 'all' && mType !== mediaFilter) return false;
      if (onlyFavorites && !m.isFavorite) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.story.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        (m.people || []).some((p) => p.toLowerCase().includes(q)) ||
        m.tags.some((t) => t.toLowerCase().includes(q)) ||
        String(m.year).includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'custom') {
        const orderA =
          typeof a.displayOrder === 'number' ? a.displayOrder : 9999;
        const orderB =
          typeof b.displayOrder === 'number' ? b.displayOrder : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return (b.date || '').localeCompare(a.date || '');
      }
      if (sortBy === 'newest') return (b.date || '').localeCompare(a.date || '');
      if (sortBy === 'oldest') return (a.date || '').localeCompare(b.date || '');
      return a.title.localeCompare(b.title);
    });
  }, [memories, mediaFilter, onlyFavorites, sortBy, searchQuery]);

  const windowedMemories = useMemo(
    () => filteredMemories.slice(0, visibleCount),
    [filteredMemories, visibleCount],
  );

  // Timeline layout groupings (Chronological + graceful undated section without fabricating timestamps)
  const timelineGroups = useMemo(() => {
    const dated: Memory[] = [];
    const undated: Memory[] = [];

    filteredMemories.forEach((m) => {
      const hasValidDate =
        Boolean(m.date && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(m.date.trim())) ||
        (typeof m.year === 'number' && m.year > 1800);
      if (hasValidDate) {
        dated.push(m);
      } else {
        undated.push(m);
      }
    });

    dated.sort((a, b) => (a.date || String(a.year)).localeCompare(b.date || String(b.year)));

    const groupsMap = new Map<string, Memory[]>();
    dated.forEach((m) => {
      let periodLabel = `${m.year}`;
      if (m.date && /^\d{4}-\d{2}/.test(m.date)) {
        const [y, mo] = m.date.split('-');
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        const mIdx = Math.max(0, Math.min(11, Number(mo) - 1));
        periodLabel = `${monthNames[mIdx]} ${y}`;
      }
      const existing = groupsMap.get(periodLabel) || [];
      existing.push(m);
      groupsMap.set(periodLabel, existing);
    });

    const groups = Array.from(groupsMap.entries()).map(([period, items]) => ({
      period,
      isUndated: false,
      items,
    }));

    if (undated.length > 0) {
      groups.push({
        period: 'Timeless & Undated Keepsakes',
        isUndated: true,
        items: undated,
      });
    }

    return groups;
  }, [filteredMemories]);

  // Ensure carouselIndex stays within bounds when filtering
  const safeCarouselIndex =
    filteredMemories.length > 0
      ? Math.min(carouselIndex, filteredMemories.length - 1)
      : 0;
  const activeCarouselMemory = filteredMemories[safeCarouselIndex] || null;

  // Room-scoped approved connections
  const roomMemoryIds = useMemo(
    () => new Set(memories.map((m) => m.id)),
    [memories],
  );

  const roomApprovedConnections = useMemo(
    () =>
      approvedConnections.filter(
        (c) =>
          roomMemoryIds.has(c.sourceMemoryId) ||
          roomMemoryIds.has(c.targetMemoryId),
      ),
    [approvedConnections, roomMemoryIds],
  );

  const handleSwitchLayout = (nextLayout: GalleryLayoutMode) => {
    setLayoutMode(nextLayout);
    onUpdateRoomLayout?.(room.id, nextLayout);
  };

  // Generate Grounded AI Suggestions
  const handleGenerateSuggestions = () => {
    setShowConnectionsPanel(true);
    const pool = allMemories.length > 0 ? allMemories : memories;
    const raw = generateGroundedMemoryConnections(
      pool,
      allRooms.length > 0 ? allRooms : [room],
      room.id,
      approvedConnections,
    ).filter((s) => !dismissedIds.has(s.id));

    setSuggestedConnections(raw);
    setAiStatusNote(
      raw.length > 0
        ? `Analyzed ${memories.length} room exhibits against ${pool.length} archive records using verified tags, people, dates, and locations. Review and approve any connection before saving.`
        : 'No new unapproved connections found with sufficient shared metadata (people, locations, dates, or tags). Add more metadata or memories to discover new links.',
    );
  };

  // Drag-and-Drop Reorder Handlers
  const handleCardDragStart = (memoryId: string, e: React.DragEvent) => {
    setDraggedMemoryId(memoryId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', memoryId);
    } catch {
      // ignore
    }
  };

  const handleCardDragOver = (targetMemoryId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedMemoryId || draggedMemoryId === targetMemoryId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const midX = rect.left + rect.width / 2;
    const pos: 'before' | 'after' =
      e.clientY < midY || e.clientX < midX ? 'before' : 'after';
    setDropTargetMemoryId(targetMemoryId);
    setDropPosition(pos);
  };

  const handleCardDrop = (targetMemoryId: string, e: React.DragEvent) => {
    e.preventDefault();
    const sourceId =
      draggedMemoryId || e.dataTransfer.getData('text/plain') || null;
    setDraggedMemoryId(null);
    setDropTargetMemoryId(null);
    const insertPos = dropPosition || 'after';
    setDropPosition(null);

    if (!sourceId || sourceId === targetMemoryId) return;

    const currentOrder = filteredMemories.map((m) => m.id);
    const fromIdx = currentOrder.indexOf(sourceId);
    const toIdx = currentOrder.indexOf(targetMemoryId);
    if (fromIdx === -1 || toIdx === -1) return;

    const nextIds = [...currentOrder];
    const [moved] = nextIds.splice(fromIdx, 1);
    const targetNewIdx = nextIds.indexOf(targetMemoryId);
    const finalIdx = insertPos === 'before' ? targetNewIdx : targetNewIdx + 1;
    nextIds.splice(finalIdx, 0, moved);

    // Include any unfiltered room memories at the end so no memory is ever lost
    const allRoomIds = memories.map((m) => m.id);
    const remainingIds = allRoomIds.filter((id) => !nextIds.includes(id));
    setSortBy('custom');
    onReorderRoomMemories?.(room.id, [...nextIds, ...remainingIds]);
  };

  const handleCardDragEnd = () => {
    setDraggedMemoryId(null);
    setDropTargetMemoryId(null);
    setDropPosition(null);
    setHoveredRoomDropId(null);
  };

  const handleStepReorder = (
    memoryId: string,
    direction: -1 | 1 | 'prev' | 'next',
  ) => {
    const step = direction === 'prev' ? -1 : direction === 'next' ? 1 : direction;
    const currentOrder = filteredMemories.map((m) => m.id);
    const idx = currentOrder.indexOf(memoryId);
    if (idx === -1) return;
    const targetIdx = idx + step;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;

    const nextIds = [...currentOrder];
    const [moved] = nextIds.splice(idx, 1);
    nextIds.splice(targetIdx, 0, moved);

    const allRoomIds = memories.map((m) => m.id);
    const remainingIds = allRoomIds.filter((id) => !nextIds.includes(id));
    setSortBy('custom');
    onReorderRoomMemories?.(room.id, [...nextIds, ...remainingIds]);
  };

  const handleDropOnRoomTarget = (targetRoomId: string, e: React.DragEvent) => {
    e.preventDefault();
    const sourceId =
      draggedMemoryId || e.dataTransfer.getData('text/plain') || null;
    setDraggedMemoryId(null);
    setDropTargetMemoryId(null);
    setDropPosition(null);
    setHoveredRoomDropId(null);

    if (!sourceId || targetRoomId === room.id) return;
    onReassignMemoryRoom?.(sourceId, targetRoomId);
  };

  const layoutIconMap: Record<GalleryLayoutMode, React.ReactNode> = {
    masonry: <Columns className="w-3.5 h-3.5" />,
    grid: <LayoutGrid className="w-3.5 h-3.5" />,
    timeline: <Calendar className="w-3.5 h-3.5" />,
    scrapbook: <BookOpen className="w-3.5 h-3.5" />,
    wall: <Frame className="w-3.5 h-3.5" />,
    carousel: <GalleryHorizontalEnd className="w-3.5 h-3.5" />,
  };

  if (inspect3DMode) {
    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 md:p-6 pt-20">
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 max-w-6xl w-full mx-auto bg-[#FFFCF6]/95 border border-[#E8DED0] rounded-2xl px-5 py-3.5 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToAtrium}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Museum
            </button>
            <div>
              <h1 className="font-serif-display text-xl md:text-2xl font-semibold text-[#27231F]">
                {room.name} — 3D Exhibition Alcove ({room.wing})
              </h1>
              <p className="text-xs text-[#6E5641]">
                {themeProfile.lightingSummary} · Click any framed exhibit on the 3D gallery wall to open its detail view
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInspect3DMode(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] transition-colors cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4" />
            Return to Room Exhibition ({memories.length})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="room-interior-view"
      className="fixed inset-0 z-20 pt-20 pb-8 px-4 md:px-8 overflow-y-auto bg-[#27231F]/60 museum-fade-in"
    >
      <div
        style={{ borderColor: themeProfile.headerBorderHex }}
        className="max-w-7xl mx-auto bg-[#FFFCF6] border-2 rounded-2xl shadow-2xl overflow-hidden museum-panel-enter"
      >
        {/* ==================================================================
            A. ROOM IDENTITY & VISUAL THEME HEADER BANNER
            ================================================================== */}
        <div
          style={{
            backgroundColor: themeProfile.headerBgHex,
            borderColor: themeProfile.headerBorderHex,
          }}
          className="p-6 md:p-8 border-b"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBackToAtrium}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#D6A15D]" />
              Back to Museum (Same Floor & Position)
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!showConnectionsPanel && suggestedConnections.length === 0) {
                    handleGenerateSuggestions();
                  } else {
                    setShowConnectionsPanel((prev) => !prev);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  showConnectionsPanel
                    ? 'bg-[#27231F] text-[#FDE68A] border-[#27231F]'
                    : 'bg-[#FFFCF6] text-[#493629] border-[#D6A15D] hover:bg-[#E9D4B1]/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D6A15D]" />
                Memory Connections
                {roomApprovedConnections.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#D6A15D]/30 text-[#27231F] font-mono-tabular text-[10px]">
                    {roomApprovedConnections.length}
                  </span>
                )}
              </button>

              {onOpenSoundscapes && (
                <button
                  type="button"
                  onClick={onOpenSoundscapes}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E8DED0] bg-[#FFFCF6] text-[#493629] hover:bg-[#E9D4B1]/40 cursor-pointer"
                >
                  <Music className="w-3.5 h-3.5 text-[#D6A15D]" />
                  Room Audio:{' '}
                  {room.audioSettings?.policy === 'custom'
                    ? 'Custom Track'
                    : room.audioSettings?.policy === 'silent'
                      ? 'Silent'
                      : 'Global'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setInspect3DMode(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-[#E8DED0] bg-[#FFFCF6] text-[#493629] hover:bg-[#E9D4B1]/40 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#854D27]" />
                Inspect 3D Wall
              </button>

              <button
                type="button"
                onClick={() => onOpenEditRoom(room)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-[#E8DED0] bg-[#FFFCF6] text-[#493629] hover:bg-[#E9D4B1]/40 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#854D27]" />
                Customise Room Theme
              </button>

              <button
                type="button"
                onClick={() => onOpenAddMemory(room.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#493629] text-[#FFFCF6] hover:bg-[#27231F] cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D6A15D]" />
                Add Exhibit to Room
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E5641]">
                <span
                  style={{ backgroundColor: room.accentColor }}
                  className="w-2.5 h-2.5 rounded-full inline-block"
                />
                <span className="font-semibold text-[#27231F]">
                  {themeProfile.atmosphereBadge}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {room.wing} · Slot #{room.slotIndex + 1}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular font-semibold text-[#27231F]">
                  {memories.length} {memories.length === 1 ? 'Exhibit' : 'Exhibits'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#854D27] font-medium">
                  Atmosphere: {room.theme}
                </span>
              </div>

              <h1 className="font-serif-display text-3xl md:text-5xl font-semibold text-[#27231F] mt-1.5">
                {room.name}
              </h1>
              <p className="text-sm md:text-base text-[#493629] mt-2 max-w-2xl leading-relaxed">
                {room.description}
              </p>

              {/* Atmospheric Lighting & Decorative Elements Strip */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-md bg-[#FFFCF6]/85 border border-[#E8DED0] text-[#493629]">
                  <strong>Lighting:</strong> {themeProfile.lightingSummary}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#FFFCF6]/85 border border-[#E8DED0] text-[#6E5641]">
                  <strong>Curatorial Details:</strong>{' '}
                  {themeProfile.decorativeNote}
                </span>
              </div>
            </div>

            <blockquote
              style={{ borderColor: themeProfile.headerBorderHex }}
              className="font-serif-display italic text-base md:text-lg text-[#6E5239] max-w-md border-t border-b py-2.5 bg-[#FFFCF6]/60 px-4 rounded-lg"
            >
              “{room.curatorQuote}”
            </blockquote>
          </div>

          {/* ================================================================
              B. GEMINI ROOM CATEGORY & MEMORY CONTENT DATA VISUAL REPRESENTATION
              ================================================================ */}
          <div className="mt-6 rounded-xl bg-[#27231F] text-[#FFFCF6] border border-[#C9A66B]/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#493629] pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D6A15D]" />
                <div>
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#C9A66B] block">
                    Gemini Detected Room Category & Memory Data Representation
                  </span>
                  <h2 className="font-serif-display text-lg font-semibold text-[#FFE2B5]">
                    {categoryDetection.profile.label} — 3D Interactive & Data View
                  </h2>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#3C2D22] border border-[#C9A66B]/40 text-[11px] font-mono-tabular text-[#FFE2B5]">
                {visualDataSummary.totalExhibits} Exhibits ·{' '}
                {visualDataSummary.earliestYear || 2004}–
                {visualDataSummary.latestYear || 2024}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* 1. Emotional & Curatorial Resonance */}
              <div className="bg-[#1E1915] border border-[#493629] rounded-lg p-3 space-y-1.5">
                <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#C9A66B] block">
                  Curatorial & Emotional Resonance
                </span>
                {visualDataSummary.emotionAndThemeMetrics
                  .slice(0, 3)
                  .map((m) => (
                    <div key={m.theme} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#E8DED0] truncate">
                          {m.theme}
                        </span>
                        <span className="font-mono-tabular text-[#FFE2B5]">
                          {m.score}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#332820] rounded-xs overflow-hidden">
                        <div
                          style={{
                            width: `${m.score}%`,
                            backgroundColor: m.colorHex,
                          }}
                          className="h-full"
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {/* 2. Chronological Era & Media Representation */}
              <div className="bg-[#1E1915] border border-[#493629] rounded-lg p-3 space-y-1.5">
                <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#C9A66B] block">
                  Chronological & Media Breakdown
                </span>
                {visualDataSummary.eraTimelineDistribution
                  .slice(0, 3)
                  .map((era) => (
                    <div key={era.label} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-mono-tabular text-[#E8DED0]">
                          {era.label}
                        </span>
                        <span className="font-mono-tabular text-[#FFE2B5]">
                          {era.count} ({era.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#332820] rounded-xs overflow-hidden">
                        <div
                          style={{
                            width: `${era.percentage}%`,
                            backgroundColor: room.accentColor || '#D6A15D',
                          }}
                          className="h-full"
                        />
                      </div>
                    </div>
                  ))}
                <div className="pt-1 flex flex-wrap gap-1">
                  {visualDataSummary.mediaBreakdown.map((mb) => (
                    <span
                      key={mb.type}
                      className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-[#2B221B] text-[#FFE2B5]"
                    >
                      {mb.label.split(' ')[0]}: {mb.count} ({mb.percentage}%)
                    </span>
                  ))}
                </div>
              </div>

              {/* 3. 3D Interactive Room Installations */}
              <div className="bg-[#1E1915] border border-[#493629] rounded-lg p-3 space-y-1.5">
                <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#C9A66B] block">
                  3D Interactive Room Installations
                </span>
                <ul className="space-y-1 text-[11px] text-[#E8DED0]">
                  {(
                    room.designConfig?.interactive3DInstallations ||
                    categoryDetection.profile.interactive3DInstallations
                  )
                    .slice(0, 4)
                    .map((inst, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#D6A15D] mt-0.5">•</span>
                        <span>{inst}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ================================================================
              C & D. LIVE GALLERY LAYOUT SELECTOR (6 Distinct Layouts)
              ================================================================ */}
          <div className="mt-6 pt-5 border-t border-[#E8DED0]/90 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#854D27] font-bold">
                  Exhibition Layout Selector
                </span>
                <span className="text-[11px] text-[#6E5641] hidden sm:inline">
                  — Switch layouts live without losing captions, tags, or order
                </span>
              </div>
              <span className="text-[11px] font-mono-tabular text-[#493629]">
                Showing {filteredMemories.length} of {memories.length} exhibits
              </span>
            </div>

            <div
              role="tablist"
              aria-label="Gallery Layout Modes"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
            >
              {GALLERY_LAYOUT_OPTIONS.map((opt) => {
                const isActive = layoutMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-testid={`layout-tab-${opt.id}`}
                    onClick={() => handleSwitchLayout(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-[#27231F] text-[#FFFCF6] border-[#27231F] shadow-sm'
                        : 'bg-[#FFFCF6]/90 text-[#493629] border-[#E8DED0] hover:bg-[#FFFCF6]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-xs flex items-center gap-1.5">
                        <span
                          className={
                            isActive ? 'text-[#D6A15D]' : 'text-[#854D27]'
                          }
                        >
                          {layoutIconMap[opt.id]}
                        </span>
                        {opt.label}
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D6A15D]" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] mt-1 line-clamp-1 ${
                        isActive ? 'text-[#E9D4B1]' : 'text-[#6E5641]'
                      }`}
                    >
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================================================================
              B & H. 7 EXHIBIT TYPE FILTERS, FAVORITES QUICK ACCESS & SEARCH
              ================================================================ */}
          <div className="mt-4 pt-4 border-t border-[#E8DED0]/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  { id: 'all', label: 'All Exhibits' },
                  { id: 'image', label: 'Photographs' },
                  { id: 'video', label: 'Videos' },
                  { id: 'audio', label: 'Audio' },
                  { id: 'chat', label: 'Chats' },
                  { id: 'story', label: 'Stories & Letters' },
                  { id: 'document', label: 'Documents' },
                  { id: 'certificate', label: 'Certificates' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setMediaFilter(t.id);
                    setCarouselIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    mediaFilter === t.id
                      ? 'bg-[#27231F] text-[#FFFCF6]'
                      : 'bg-[#FFFCF6]/85 text-[#493629] border border-[#E8DED0] hover:bg-[#E9D4B1]/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick-Access Favorites Filter */}
              <button
                type="button"
                data-testid="room-favorites-filter"
                onClick={() => {
                  setOnlyFavorites((prev) => !prev);
                  setCarouselIndex(0);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  onlyFavorites
                    ? 'bg-[#D6A15D] text-[#27231F] border-[#D6A15D]'
                    : 'bg-[#FFFCF6] text-[#493629] border-[#E8DED0] hover:bg-[#E9D4B1]/40'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    onlyFavorites
                      ? 'fill-[#27231F] text-[#27231F]'
                      : 'text-[#854D27]'
                  }`}
                />
                Favorites Only (
                {memories.filter((m) => m.isFavorite).length})
              </button>

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'custom' | 'newest' | 'oldest' | 'title',
                  )
                }
                aria-label="Sort Room Exhibits"
                className="px-2.5 py-1.5 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#27231F]"
              >
                <option value="custom">Sort: Curated Order (Drag)</option>
                <option value="newest">Sort: Newest Date</option>
                <option value="oldest">Sort: Oldest Date</option>
                <option value="title">Sort: Alphabetical</option>
              </select>

              <div className="relative w-48 sm:w-56">
                <Search className="w-3.5 h-3.5 text-[#856B52] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCarouselIndex(0);
                  }}
                  placeholder={`Filter in ${room.name}...`}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#27231F]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================
            E. DRAG-AND-DROP CROSS-ROOM DESTINATION BAR
            ================================================================== */}
        {activeOtherRooms.length > 0 && memories.length > 0 && (
          <div className="px-6 md:px-8 py-3 bg-[#F6F1E8] border-b border-[#E8DED0] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[#493629]">
              <FolderInput className="w-4 h-4 text-[#854D27]" />
              <span className="font-semibold">
                Drag any exhibit card to rearrange, or drop onto another room to transfer:
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {activeOtherRooms.map((targetRoom) => {
                const isDropHover = hoveredRoomDropId === targetRoom.id;
                return (
                  <div
                    key={targetRoom.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHoveredRoomDropId(targetRoom.id);
                    }}
                    onDragLeave={() => {
                      if (hoveredRoomDropId === targetRoom.id) {
                        setHoveredRoomDropId(null);
                      }
                    }}
                    onDrop={(e) => handleDropOnRoomTarget(targetRoom.id, e)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isDropHover
                        ? 'bg-[#D6A15D] text-[#27231F] border-[#27231F] scale-105 shadow-sm'
                        : draggedMemoryId
                          ? 'bg-[#FFFCF6] text-[#27231F] border-dashed border-[#854D27]'
                          : 'bg-[#FFFCF6] text-[#493629] border-[#E8DED0]'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: targetRoom.accentColor }}
                      className="w-2 h-2 rounded-full inline-block"
                    />
                    <span>{targetRoom.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================================
            G. AI-SUGGESTED MEMORY CONNECTIONS DRAWER (Review & Approve)
            ================================================================== */}
        {showConnectionsPanel && (
          <div className="p-6 md:p-8 bg-[#F6F1E8] border-b border-[#D6A15D]/60 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#854D27]" />
                  <span className="text-xs font-mono-tabular uppercase tracking-wider text-[#854D27] font-bold">
                    AI-Suggested Memory Connections · Grounded Archive Analysis
                  </span>
                </div>
                <h2 className="font-serif-display text-2xl font-semibold text-[#27231F] mt-0.5">
                  Connect Related Stories, People, Places & Milestones
                </h2>
                <p className="text-xs text-[#493629] mt-1 max-w-3xl">
                  Suggestions are strictly grounded in your actual memory metadata (shared people, locations, dates, and tags). No relationships are saved until you explicitly review and approve them.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateSuggestions}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D6A15D]" />
                  Refresh Suggestions
                </button>
                <button
                  type="button"
                  onClick={() => setShowConnectionsPanel(false)}
                  className="p-2 rounded-xl border border-[#E8DED0] bg-[#FFFCF6] text-[#493629] hover:bg-[#E9D4B1]/40 cursor-pointer"
                  aria-label="Close Memory Connections Panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {aiStatusNote && (
              <div className="p-3 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#493629]">
                {aiStatusNote}
              </div>
            )}

            {/* Pending Suggestions Requiring Review */}
            {suggestedConnections.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#854D27]">
                  Pending AI Suggestions ({suggestedConnections.length}) — Review Required
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestedConnections.map((sug) => {
                    const pool = allMemories.length > 0 ? allMemories : memories;
                    const srcMem = pool.find((m) => m.id === sug.sourceMemoryId);
                    const tgtMem = pool.find((m) => m.id === sug.targetMemoryId);
                    if (!srcMem || !tgtMem) return null;

                    const isEditingThis = editingSuggestionId === sug.id;

                    return (
                      <div
                        key={sug.id}
                        className="p-4 rounded-xl bg-[#FFFCF6] border border-[#D6A15D]/70 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#E9D4B1]/60 text-[#854D27] font-mono-tabular text-[10px] font-bold uppercase">
                            AI Suggestion · {sug.relationshipType.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] font-semibold text-[#27231F]">
                            {sug.relationshipLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 text-xs">
                          <button
                            type="button"
                            onClick={() => onSelectMemory(srcMem)}
                            className="p-2.5 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-left hover:border-[#D6A15D] cursor-pointer"
                          >
                            <span className="block text-[10px] text-[#854D27] font-mono-tabular">
                              {srcMem.year} · {srcMem.location}
                            </span>
                            <span className="font-semibold text-[#27231F] line-clamp-1">
                              {srcMem.title}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectMemory(tgtMem)}
                            className="p-2.5 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-left hover:border-[#D6A15D] cursor-pointer"
                          >
                            <span className="block text-[10px] text-[#854D27] font-mono-tabular">
                              {tgtMem.year} · {tgtMem.location}
                            </span>
                            <span className="font-semibold text-[#27231F] line-clamp-1">
                              {tgtMem.title}
                            </span>
                          </button>
                        </div>

                        {isEditingThis ? (
                          <div className="space-y-2 pt-1">
                            <input
                              type="text"
                              value={editLabelDraft}
                              onChange={(e) => setEditLabelDraft(e.target.value)}
                              placeholder="Relationship label"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-xs text-[#27231F]"
                            />
                            <textarea
                              rows={2}
                              value={editEvidenceDraft}
                              onChange={(e) => setEditEvidenceDraft(e.target.value)}
                              placeholder="Grounded reason for connection"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-xs text-[#27231F]"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-[#493629] leading-relaxed bg-[#F6F1E8]/70 p-2.5 rounded-lg border border-[#E8DED0]">
                            <strong>Available Evidence:</strong> {sug.evidenceReason}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          {isEditingThis ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSuggestedConnections((prev) =>
                                  prev.map((item) =>
                                    item.id === sug.id
                                      ? {
                                          ...item,
                                          relationshipLabel:
                                            editLabelDraft.trim() ||
                                            item.relationshipLabel,
                                          evidenceReason:
                                            editEvidenceDraft.trim() ||
                                            item.evidenceReason,
                                        }
                                      : item,
                                  ),
                                );
                                setEditingSuggestionId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#27231F] text-[#FFFCF6] cursor-pointer"
                            >
                              Save Edit
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSuggestionId(sug.id);
                                setEditLabelDraft(sug.relationshipLabel);
                                setEditEvidenceDraft(sug.evidenceReason);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[#E8DED0] text-[#493629] hover:bg-[#F6F1E8] cursor-pointer"
                            >
                              Edit Note
                            </button>
                          )}

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setDismissedIds((prev) => new Set(prev).add(sug.id));
                                setSuggestedConnections((prev) =>
                                  prev.filter((item) => item.id !== sug.id),
                                );
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[#E8DED0] text-[#991B1B] hover:bg-[#FEE2E2]/50 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const approved: MemoryConnection = {
                                  ...sug,
                                  status: 'approved',
                                };
                                onApproveMemoryConnection?.(approved);
                                setSuggestedConnections((prev) =>
                                  prev.filter((item) => item.id !== sug.id),
                                );
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#87977C] text-white hover:bg-[#6E7E63] cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Approve & Save
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Approved Connections in this Room */}
            {roomApprovedConnections.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-[#E8DED0]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#27231F] flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#87977C]" />
                  Approved Archive Connections ({roomApprovedConnections.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roomApprovedConnections.map((conn) => {
                    const pool = allMemories.length > 0 ? allMemories : memories;
                    const srcMem = pool.find((m) => m.id === conn.sourceMemoryId);
                    const tgtMem = pool.find((m) => m.id === conn.targetMemoryId);
                    if (!srcMem || !tgtMem) return null;
                    return (
                      <div
                        key={conn.id}
                        className="p-3 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono-tabular uppercase text-[#87977C] font-bold">
                            Approved · {conn.relationshipLabel}
                          </span>
                          <p className="text-xs font-semibold text-[#27231F] truncate">
                            {srcMem.title} ↔ {tgtMem.title}
                          </p>
                          <p className="text-[11px] text-[#6E5641] line-clamp-1">
                            {conn.evidenceReason}
                          </p>
                        </div>
                        {onRemoveMemoryConnection && (
                          <button
                            type="button"
                            onClick={() => onRemoveMemoryConnection(conn.id)}
                            title="Remove connection"
                            className="p-1.5 rounded-lg text-[#991B1B] hover:bg-[#FEE2E2]/40 shrink-0 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================
            MAIN GALLERY STAGE (Renders Active Layout Mode 1–6)
            ================================================================== */}
        <div
          style={{ backgroundColor: themeProfile.galleryCanvasBgHex }}
          className="p-6 md:p-8"
        >
          {filteredMemories.length === 0 ? (
            <div className="text-center py-12 bg-[#FFFCF6] rounded-xl border border-[#E8DED0] p-6">
              <p className="font-serif-display text-2xl font-semibold text-[#27231F]">
                {memories.length === 0
                  ? 'Your memory collection starts here.'
                  : `No exhibits match your filter in ${room.name}`}
              </p>
              <p className="text-xs text-[#6E5641] mt-1.5 max-w-md mx-auto">
                {memories.length === 0
                  ? `Upload photographs, videos, audio recordings, chat excerpts, letters, or certificates to begin curating ${room.name}.`
                  : 'Try clearing your search, favorites toggle, or exhibit type filter.'}
              </p>
              <button
                type="button"
                onClick={() => onOpenAddMemory(room.id)}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D6A15D]" />
                Add Exhibit to {room.name}
              </button>
            </div>
          ) : layoutMode === 'masonry' ? (
            /* ----------------------------------------------------------------
               1. MASONRY GALLERY (Dynamic multi-column layout)
               ---------------------------------------------------------------- */
            <div
              data-testid="gallery-layout-masonry"
              className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5"
            >
              {windowedMemories.map((memory, idx) => (
                <div key={memory.id} className="break-inside-avoid">
                  <MemoryCard
                    memory={memory}
                    room={room}
                    availableRooms={activeOtherRooms}
                    layoutMode="masonry"
                    cardIndex={idx}
                    reducedMotion={reducedMotion}
                    isDragTarget={dropTargetMemoryId === memory.id}
                    dropIndicatorPosition={
                      dropTargetMemoryId === memory.id ? dropPosition : null
                    }
                    onSelect={onSelectMemory}
                    onToggleFavorite={onToggleFavorite}
                    onDragStartCard={handleCardDragStart}
                    onDragOverCard={handleCardDragOver}
                    onDropOnCard={handleCardDrop}
                    onDragEndCard={handleCardDragEnd}
                    onMoveOrder={(memId, dir) => handleStepReorder(memId, dir)}
                    onReassignRoom={onReassignMemoryRoom}
                  />
                </div>
              ))}
            </div>
          ) : layoutMode === 'grid' ? (
            /* ----------------------------------------------------------------
               2. GRID GALLERY (Clean, balanced multi-column exhibition grid)
               ---------------------------------------------------------------- */
            <div
              data-testid="gallery-layout-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {windowedMemories.map((memory, idx) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  room={room}
                  availableRooms={activeOtherRooms}
                  layoutMode="grid"
                  cardIndex={idx}
                  reducedMotion={reducedMotion}
                  isDragTarget={dropTargetMemoryId === memory.id}
                  dropIndicatorPosition={
                    dropTargetMemoryId === memory.id ? dropPosition : null
                  }
                  onSelect={onSelectMemory}
                  onToggleFavorite={onToggleFavorite}
                  onDragStartCard={handleCardDragStart}
                  onDragOverCard={handleCardDragOver}
                  onDropOnCard={handleCardDrop}
                  onDragEndCard={handleCardDragEnd}
                  onMoveOrder={(memId, dir) => handleStepReorder(memId, dir)}
                  onReassignRoom={onReassignMemoryRoom}
                />
              ))}
            </div>
          ) : layoutMode === 'timeline' ? (
            /* ----------------------------------------------------------------
               3. TIMELINE GALLERY (Chronological flow by year/month + undated)
               ---------------------------------------------------------------- */
            <div
              data-testid="gallery-layout-timeline"
              className="relative pl-6 md:pl-10 border-l-2 border-[#D6A15D] space-y-8"
            >
              {timelineGroups.map((group) => (
                <div key={group.period} className="relative space-y-4">
                  <span
                    style={{ backgroundColor: room.accentColor }}
                    className="absolute -left-[31px] md:-left-[47px] top-1.5 w-4 h-4 rounded-full border-2 border-[#FFFCF6] shadow-xs"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFFCF6] border border-[#E8DED0] rounded-xl px-4 py-2.5">
                    <div>
                      <span className="font-serif-display text-2xl font-semibold text-[#27231F]">
                        {group.period}
                      </span>
                      {group.isUndated && (
                        <span className="ml-2 text-xs text-[#6E5641]">
                          (Displayed without fabricated timestamps)
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono-tabular text-[#854D27] font-semibold">
                      {group.items.length}{' '}
                      {group.items.length === 1 ? 'Exhibit' : 'Exhibits'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {group.items.map((memory, idx) => (
                      <MemoryCard
                        key={memory.id}
                        memory={memory}
                        room={room}
                        availableRooms={activeOtherRooms}
                        layoutMode="timeline"
                        cardIndex={idx}
                        reducedMotion={reducedMotion}
                        isDragTarget={dropTargetMemoryId === memory.id}
                        dropIndicatorPosition={
                          dropTargetMemoryId === memory.id ? dropPosition : null
                        }
                        onSelect={onSelectMemory}
                        onToggleFavorite={onToggleFavorite}
                        onDragStartCard={handleCardDragStart}
                        onDragOverCard={handleCardDragOver}
                        onDropOnCard={handleCardDrop}
                        onDragEndCard={handleCardDragEnd}
                        onMoveOrder={(memId, dir) =>
                          handleStepReorder(memId, dir)
                        }
                        onReassignRoom={onReassignMemoryRoom}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : layoutMode === 'scrapbook' ? (
            /* ----------------------------------------------------------------
               4. SCRAPBOOK GALLERY (Warm nostalgic collage with notes & pins)
               ---------------------------------------------------------------- */
            <div
              data-testid="gallery-layout-scrapbook"
              className="p-5 md:p-8 rounded-2xl bg-[#F4EAD8] border-2 border-dashed border-[#CBB89D] space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#DCCBBD]">
                <div>
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#854D27] font-bold">
                    Personal Scrapbook Folio · {room.name}
                  </span>
                  <p className="font-serif-display italic text-lg text-[#493629]">
                    Archival corner mounts, handwritten field notes, and tactile keepsakes
                  </p>
                </div>
                <span className="text-xs font-mono-tabular text-[#6E5641]">
                  Drag cards to rearrange your scrapbook page
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                {windowedMemories.map((memory, idx) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    room={room}
                    availableRooms={activeOtherRooms}
                    layoutMode="scrapbook"
                    cardIndex={idx}
                    reducedMotion={reducedMotion}
                    isDragTarget={dropTargetMemoryId === memory.id}
                    dropIndicatorPosition={
                      dropTargetMemoryId === memory.id ? dropPosition : null
                    }
                    onSelect={onSelectMemory}
                    onToggleFavorite={onToggleFavorite}
                    onDragStartCard={handleCardDragStart}
                    onDragOverCard={handleCardDragOver}
                    onDropOnCard={handleCardDrop}
                    onDragEndCard={handleCardDragEnd}
                    onMoveOrder={(memId, dir) => handleStepReorder(memId, dir)}
                    onReassignRoom={onReassignMemoryRoom}
                  />
                ))}
              </div>
            </div>
          ) : layoutMode === 'wall' ? (
            /* ----------------------------------------------------------------
               5. WALL GALLERY (Exhibition wall with framed hangs & spotlights)
               ---------------------------------------------------------------- */
            <div
              data-testid="gallery-layout-wall"
              style={{
                background:
                  'radial-gradient(circle at 50% 0%, #3E2D20 0%, #221811 70%, #17100B 100%)',
              }}
              className="p-6 md:p-10 rounded-2xl border-2 border-[#493629] shadow-inner space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#D6A15D]/30">
                <div>
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#D6A15D] font-semibold">
                    Museum Wall Elevation · {themeProfile.lightingSummary}
                  </span>
                  <h2 className="font-serif-display text-2xl font-semibold text-[#FFFCF6]">
                    Framed Exhibition Wall & Brass Plaques
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setInspect3DMode(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View on 3D Room Wall
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                {windowedMemories.map((memory, idx) => (
                  <div key={memory.id} className="relative pt-3">
                    {/* Overhead museum spotlight cone effect */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-2 inset-x-8 h-6 bg-gradient-to-b from-[#FDE68A]/25 to-transparent blur-md rounded-full"
                    />
                    <MemoryCard
                      memory={memory}
                      room={room}
                      availableRooms={activeOtherRooms}
                      layoutMode="wall"
                      cardIndex={idx}
                      reducedMotion={reducedMotion}
                      isDragTarget={dropTargetMemoryId === memory.id}
                      dropIndicatorPosition={
                        dropTargetMemoryId === memory.id ? dropPosition : null
                      }
                      onSelect={onSelectMemory}
                      onToggleFavorite={onToggleFavorite}
                      onDragStartCard={handleCardDragStart}
                      onDragOverCard={handleCardDragOver}
                      onDropOnCard={handleCardDrop}
                      onDragEndCard={handleCardDragEnd}
                      onMoveOrder={(memId, dir) =>
                        handleStepReorder(memId, dir)
                      }
                      onReassignRoom={onReassignMemoryRoom}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ----------------------------------------------------------------
               6. CAROUSEL GALLERY (Focused single-exhibit spotlight & filmstrip)
               ---------------------------------------------------------------- */
            <div
              data-testid="gallery-layout-carousel"
              className="space-y-6 bg-[#1E1610] p-6 md:p-8 rounded-2xl border border-[#493629] text-[#FFFCF6]"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#D6A15D]">
                    Spotlight Carousel Presentation
                  </span>
                  <h2 className="font-serif-display text-2xl font-semibold text-[#FFFCF6]">
                    Exhibit {safeCarouselIndex + 1} of {filteredMemories.length}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safeCarouselIndex === 0}
                    onClick={() =>
                      setCarouselIndex((prev) => Math.max(0, prev - 1))
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2A1F17] text-[#FFFCF6] border border-white/15 hover:border-[#D6A15D] disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#D6A15D]" />
                    Previous Exhibit
                  </button>
                  <button
                    type="button"
                    disabled={safeCarouselIndex >= filteredMemories.length - 1}
                    onClick={() =>
                      setCarouselIndex((prev) =>
                        Math.min(filteredMemories.length - 1, prev + 1),
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] disabled:opacity-40 cursor-pointer"
                  >
                    Next Exhibit
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {activeCarouselMemory && (
                <div className="max-w-2xl mx-auto">
                  <MemoryCard
                    memory={activeCarouselMemory}
                    room={room}
                    availableRooms={activeOtherRooms}
                    layoutMode="carousel"
                    cardIndex={safeCarouselIndex}
                    reducedMotion={reducedMotion}
                    onSelect={onSelectMemory}
                    onToggleFavorite={onToggleFavorite}
                    onMoveOrder={(memId, dir) => handleStepReorder(memId, dir)}
                    onReassignRoom={onReassignMemoryRoom}
                  />
                </div>
              )}

              {/* Carousel Sequence Filmstrip */}
              <div className="pt-4 border-t border-white/10 flex items-center gap-2.5 overflow-x-auto pb-2">
                {filteredMemories.map((m, idx) => {
                  const active = idx === safeCarouselIndex;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCarouselIndex(idx)}
                      className={`px-3 py-2 rounded-xl text-left border transition-all shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#D6A15D] text-[#27231F] border-[#FDE68A] font-semibold'
                          : 'bg-[#2A1F17] text-[#E9D4B1] border-white/10 hover:border-[#D6A15D]/50'
                      }`}
                    >
                      <span className="block font-mono-tabular text-[10px] opacity-80">
                        #{idx + 1} · {m.year}
                      </span>
                      <span className="block text-xs truncate max-w-[140px]">
                        {m.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progressive Windowing Load More Button for Large Galleries */}
          {layoutMode !== 'carousel' &&
            layoutMode !== 'timeline' &&
            filteredMemories.length > visibleCount && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 24)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                >
                  Load More Exhibits ({filteredMemories.length - visibleCount}{' '}
                  remaining)
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};


/* ==========================================================================
   2. MY ROOMS & MULTI-FLOOR 3-SLOT MANAGEMENT VIEW
   ========================================================================== */
interface MyRoomsViewProps {
  floors: Floor[];
  rooms: Room[];
  memories: Memory[];
  onEnterRoom: (roomId: string) => void;
  onSmartAddRoom: () => void;
  onOpenCreateRoomInSlot: (
    floorId: string,
    slotIndex: 0 | 1 | 2 | 3,
    existingRoom?: Room,
  ) => void;
  onOpenEditRoom: (room: Room) => void;
  onToggleRoomDisabled: (roomId: string) => void;
  onOpenAddMemory: (roomId: string) => void;
  onCloseView: () => void;
}

export const MyRoomsView: React.FC<MyRoomsViewProps> = ({
  rooms,
  memories,
  onEnterRoom,
  onSmartAddRoom,
  onOpenEditRoom,
  onToggleRoomDisabled,
  onOpenAddMemory,
  onCloseView,
}) => {
  const childhoodRoom =
    rooms.find((r) => r.id === 'childhood') || rooms[0];
  const isChildhoodActive = childhoodRoom?.status === 'active';
  const childhoodMemories = memories.filter(
    (m) => m.roomId === (childhoodRoom?.id || 'childhood'),
  );

  const coverImg =
    childhoodRoom?.customCoverUrl ||
    childhoodMemories[0]?.customImageUrl ||
    getProceduralMemoryArt(
      childhoodRoom?.featuredMotif || 'treehouse_meadow',
      ['#F4D8AF', '#D38B52', '#442D1C', childhoodRoom?.accentColor || '#D6A15D'],
      'Childhood Room',
      'Ground Floor Entrance',
    );

  return (
    <div className="fixed inset-0 z-20 pt-20 pb-8 px-4 md:px-8 overflow-y-auto bg-[#27231F]/65 museum-fade-in">
      <div className="max-w-3xl mx-auto bg-[#FFFCF6] border border-[#E8DED0] rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 museum-panel-enter">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E8DED0]">
          <div>
            <button
              type="button"
              onClick={onCloseView}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#854D27] hover:underline mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Museum Entrance
            </button>
            <h1 className="font-serif-display text-3xl font-semibold text-[#27231F]">
              {isChildhoodActive ? 'Childhood Room' : 'Activate Your Room'}
            </h1>
            <p className="text-sm text-[#493629] mt-1">
              {isChildhoodActive
                ? 'Your Childhood Room is active and accessible directly from the museum entrance.'
                : 'Activate your Childhood Room to unlock your personal 3D bedroom, backyard, treehouse, and memory exhibits.'}
            </p>
          </div>
        </div>

        {!isChildhoodActive ? (
          /* "Activate Your Room" Board — Shown ONLY when Childhood Room is not activated */
          <div
            data-testid="activate-your-room-board"
            className="rounded-2xl border-2 border-[#C9A66B] bg-[#27231F] text-[#FFFCF6] p-6 md:p-8 shadow-xl space-y-5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#493629] pb-4">
              <div>
                <span className="text-[11px] font-mono-tabular uppercase tracking-widest text-[#C9A66B] block">
                  Activate Your Room
                </span>
                <h2 className="font-serif-display text-2xl md:text-3xl font-semibold text-[#FFE2B5] mt-0.5">
                  Childhood Room
                </h2>
              </div>
              <span className="px-3 py-1 rounded-lg bg-[#3C2D22] border border-[#C9A66B]/50 text-xs font-mono-tabular text-[#FFE2B5]">
                1 Available Room
              </span>
            </div>

            <p className="text-sm text-[#E8DED0] leading-relaxed">
              Step into a realistic, interactive 3D childhood bedroom with a cozy wooden bed, study table, wardrobe, toys, sunlit windows, and a connected outdoor backyard with a climbable treehouse and tyre swing.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="text-xs text-[#C9A66B] font-mono-tabular">
                Includes real-time 3D room customisation & personal memory uploads
              </div>
              <button
                type="button"
                onClick={onSmartAddRoom}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#C9A66B] text-[#27231F] hover:bg-[#FFE2B5] transition-colors shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Activate Childhood Room
              </button>
            </div>
          </div>
        ) : (
          /* Active Childhood Room Card — Activate Your Room board is completely removed */
          <div className="flex flex-col bg-[#FFFCF6] border border-[#C9A66B] rounded-2xl overflow-hidden shadow-lg">
            <div
              onClick={() => onEnterRoom(childhoodRoom.id)}
              className="relative aspect-16/9 bg-[#27231F] overflow-hidden cursor-pointer group"
            >
              <img
                src={coverImg}
                alt="Childhood Room"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-black/65 text-[#FFE2B5] font-mono-tabular text-xs border border-[#C9A66B]/40">
                    Museum Entrance · Active Room
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#87977C] text-white text-xs font-semibold">
                    Active
                  </span>
                </div>
                <div>
                  <h2 className="font-serif-display text-2xl md:text-3xl font-semibold text-[#FFFCF6]">
                    Childhood Room
                  </h2>
                  <p className="text-xs text-[#E9D4B1] font-mono-tabular mt-0.5">
                    {childhoodMemories.length}{' '}
                    {childhoodMemories.length === 1 ? 'Memory' : 'Memories'} Preserved
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6 space-y-4">
              <p className="text-sm text-[#493629] leading-relaxed">
                {childhoodRoom.description}
              </p>

              <div className="pt-4 border-t border-[#E8DED0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onEnterRoom(childhoodRoom.id)}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFE2B5] hover:bg-[#493629] border border-[#C9A66B] cursor-pointer"
                  >
                    Enter Childhood Room
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAddMemory(childhoodRoom.id)}
                    className="px-4 py-2.5 rounded-xl border border-[#C9A66B] text-xs font-semibold text-[#27231F] bg-[#F6F1E8] hover:bg-[#E8DED0] cursor-pointer"
                  >
                    + Add Memory
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenEditRoom(childhoodRoom)}
                    className="px-3.5 py-2.5 rounded-xl border border-[#E8DED0] text-xs font-medium text-[#493629] hover:bg-[#F6F1E8] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Room Details
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleRoomDisabled(childhoodRoom.id)}
                  className="px-3 py-2 rounded-xl border border-[#E8DED0] text-xs font-medium text-[#991B1B] hover:bg-[#FEE2E2]/50 cursor-pointer"
                >
                  Deactivate Room
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   3. CURATED COLLECTIONS VIEW
   ========================================================================== */
interface CollectionsViewProps {
  collections: Collection[];
  memories: Memory[];
  rooms: Room[];
  initialSelectedCollectionId?: string | null;
  onSelectMemory: (memory: Memory) => void;
  onToggleFavorite: (memoryId: string, e: React.MouseEvent) => void;
  onCreateCollection: (
    title: string,
    subtitle: string,
    memoryIds: string[],
  ) => void;
  onRenameCollection?: (
    collectionId: string,
    newTitle: string,
    newCuratorNote?: string,
  ) => void;
  onMergeCollections?: (sourceId: string, targetId: string) => void;
  onSeparateMemoryFromCollection?: (
    collectionId: string,
    memoryId: string,
    targetCollectionId?: string,
  ) => void;
  onDeleteCollection?: (collectionId: string) => void;
  onCloseView: () => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  memories,
  rooms,
  initialSelectedCollectionId,
  onSelectMemory,
  onToggleFavorite,
  onCreateCollection,
  onRenameCollection,
  onMergeCollections,
  onSeparateMemoryFromCollection,
  onDeleteCollection,
  onCloseView,
}) => {
  const [activeCollectionId, setActiveCollectionId] = useState<string>(
    initialSelectedCollectionId || collections[0]?.id || '',
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [editColTitle, setEditColTitle] = useState('');
  const [editColNote, setEditColNote] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [confirmingDeleteCol, setConfirmingDeleteCol] = useState(false);

  useEffect(() => {
    if (
      initialSelectedCollectionId &&
      collections.some((c) => c.id === initialSelectedCollectionId)
    ) {
      setActiveCollectionId(initialSelectedCollectionId);
    }
  }, [initialSelectedCollectionId, collections]);

  const activeCollection =
    collections.find((c) => c.id === activeCollectionId) || collections[0];

  useEffect(() => {
    setIsEditingCollection(false);
    setConfirmingDeleteCol(false);
    if (activeCollection) {
      setEditColTitle(activeCollection.title);
      setEditColNote(activeCollection.curatorNote);
      const other = collections.find((c) => c.id !== activeCollection.id);
      setMergeTargetId(other?.id || '');
    }
  }, [activeCollection?.id]);

  const collectionMemories = useMemo(() => {
    if (!activeCollection) return [];
    return memories.filter((m) => activeCollection.memoryIds.includes(m.id));
  }, [activeCollection, memories]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const favIds = memories.filter((m) => m.isFavorite).map((m) => m.id);
    const sampleIds =
      favIds.length > 0 ? favIds : memories.slice(0, 4).map((m) => m.id);
    onCreateCollection(
      newTitle.trim(),
      newSubtitle.trim() || 'Personal Thematic Anthology',
      sampleIds,
    );
    setNewTitle('');
    setNewSubtitle('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-20 pt-20 pb-8 px-4 md:px-8 overflow-y-auto bg-[#27231F]/55 museum-fade-in">
      <div className="max-w-7xl mx-auto bg-[#FFFCF6] border border-[#E8DED0] rounded-2xl shadow-2xl p-6 md:p-8 museum-panel-enter">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E8DED0]">
          <div>
            <button
              type="button"
              onClick={onCloseView}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#854D27] hover:underline mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to 3D Atrium
            </button>
            <h1 className="font-serif-display text-3xl md:text-4xl font-semibold text-[#27231F]">
              Curated Exhibitions & Collections
            </h1>
            <p className="text-sm text-[#493629] mt-1">
              Evidence-backed personal groupings. Rename, merge, separate, or adjust any collection freely.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#D6A15D]" />
            {isCreating ? 'Close Form' : 'New Curated Collection'}
          </button>
        </div>

        {isCreating && (
          <form
            onSubmit={handleCreate}
            className="mt-5 p-4 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] flex flex-col sm:flex-row items-end gap-3"
          >
            <div className="w-full sm:flex-1">
              <label className="block text-xs font-semibold text-[#27231F] mb-1">
                Collection Title
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Summers by the Water"
                className="w-full px-3 py-2 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-xs"
              />
            </div>
            <div className="w-full sm:flex-1">
              <label className="block text-xs font-semibold text-[#27231F] mb-1">
                Subtitle
              </label>
              <input
                type="text"
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                placeholder="e.g., Selected Favorites & Keepsakes"
                className="w-full px-3 py-2 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-xs"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#D6A15D] text-[#27231F]"
            >
              Save Collection
            </button>
          </form>
        )}

        {collections.length === 0 ? (
          <div className="mt-8 p-10 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] text-center space-y-3">
            <Layers className="w-8 h-8 text-[#854D27] mx-auto" />
            <h2 className="font-serif-display text-2xl md:text-3xl font-semibold text-[#27231F]">
              Create your first collection.
            </h2>
            <p className="text-xs sm:text-sm text-[#493629] max-w-md mx-auto">
              Upload memories or start a new exhibition to weave together your photographs, films, audio, and stories.
            </p>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D6A15D]" />
              Create Collection
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 overflow-x-auto py-5 border-b border-[#E8DED0]">
              {collections.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setActiveCollectionId(col.id)}
                  className={`px-4 py-2.5 rounded-xl text-left transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
                    activeCollection?.id === col.id
                      ? 'bg-[#27231F] text-[#FFFCF6] border-[#27231F]'
                      : 'bg-[#F6F1E8] text-[#493629] border-[#E8DED0] hover:bg-[#E9D4B1]/40'
                  }`}
                >
                  <span className="block font-serif-display text-lg font-semibold leading-tight">
                    {col.title}
                  </span>
                  <span className="block text-[11px] opacity-80 mt-0.5">
                    {col.subtitle} ({col.memoryIds.length})
                  </span>
                </button>
              ))}
            </div>

            {activeCollection && (
              <div className="mt-6">
                <div className="p-5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] mb-6 space-y-4">
                  <div className="flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-widest text-[#854D27] font-semibold">
                        {activeCollection.seasonTag}
                        {activeCollection.suggestedEnvironment
                          ? ` · ${String(activeCollection.suggestedEnvironment).replace(/_/g, ' ')}`
                          : ''}
                      </p>
                      {isEditingCollection ? (
                        <div className="mt-2 space-y-2 max-w-2xl">
                          <input
                            type="text"
                            aria-label="Edit collection title"
                            value={editColTitle}
                            onChange={(e) => setEditColTitle(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#FFFCF6] border border-[#D4C3AA] text-lg font-serif-display font-semibold text-[#27231F]"
                          />
                          <textarea
                            rows={2}
                            aria-label="Edit collection curator note"
                            value={editColNote}
                            onChange={(e) => setEditColNote(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#FFFCF6] border border-[#D4C3AA] text-xs text-[#27231F]"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (onRenameCollection && editColTitle.trim()) {
                                  onRenameCollection(
                                    activeCollection.id,
                                    editColTitle.trim(),
                                    editColNote.trim(),
                                  );
                                }
                                setIsEditingCollection(false);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#27231F] text-[#FFFCF6] cursor-pointer"
                            >
                              Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingCollection(false)}
                              className="px-3 py-1.5 rounded-lg text-xs bg-[#EFE6D5] text-[#493629] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h2 className="font-serif-display text-2xl md:text-3xl font-semibold text-[#27231F] mt-1">
                            {activeCollection.title}
                          </h2>
                          <p className="text-sm text-[#493629] mt-2 max-w-3xl leading-relaxed">
                            {activeCollection.curatorNote}
                          </p>
                        </>
                      )}
                    </div>

                    {activeCollection.customCoverUrl && (
                      <img
                        src={activeCollection.customCoverUrl}
                        alt={activeCollection.title}
                        className="w-full md:w-48 aspect-16/10 object-cover rounded-xl border border-[#E8DED0] shrink-0"
                      />
                    )}
                  </div>

                  {/* Evidence Summary, Media Formats & Interactions */}
                  {(activeCollection.evidenceSummary ||
                    activeCollection.confidenceNote ||
                    (activeCollection.mediaTypes &&
                      activeCollection.mediaTypes.length > 0)) && (
                    <div className="pt-3 border-t border-[#E2D4BE] text-xs text-[#493629] grid grid-cols-1 md:grid-cols-3 gap-3">
                      {activeCollection.evidenceSummary && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider text-[#854D27] font-semibold">
                            Grouping Evidence
                          </span>
                          <p className="mt-0.5">{activeCollection.evidenceSummary}</p>
                        </div>
                      )}
                      {activeCollection.availableInteractions &&
                        activeCollection.availableInteractions.length > 0 && (
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider text-[#854D27] font-semibold">
                              3D Experiences Included
                            </span>
                            <p className="mt-0.5">
                              {activeCollection.availableInteractions.join(' · ')}
                            </p>
                          </div>
                        )}
                      {activeCollection.confidenceNote && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider text-[#854D27] font-semibold">
                            Confidence & Grounding
                          </span>
                          <p className="mt-0.5">{activeCollection.confidenceNote}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Collection Management Controls: Rename, Merge, Delete */}
                  <div className="pt-3 border-t border-[#E2D4BE] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {onRenameCollection && (
                        <button
                          type="button"
                          onClick={() => setIsEditingCollection(!isEditingCollection)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FFFCF6] border border-[#D4C3AA] text-[#27231F] hover:bg-[#EFE6D5] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#854D27]" />
                          Rename & Edit Note
                        </button>
                      )}
                      {onMergeCollections && collections.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <select
                            aria-label="Target collection for merge"
                            value={mergeTargetId}
                            onChange={(e) => setMergeTargetId(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-[#FFFCF6] border border-[#D4C3AA] text-[#27231F]"
                          >
                            {collections
                              .filter((c) => c.id !== activeCollection.id)
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  Into: {c.title}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (mergeTargetId) {
                                onMergeCollections(activeCollection.id, mergeTargetId);
                                setActiveCollectionId(mergeTargetId);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FFFCF6] border border-[#D4C3AA] text-[#27231F] hover:bg-[#EFE6D5] cursor-pointer"
                          >
                            <GitMerge className="w-3.5 h-3.5 text-[#854D27]" />
                            Merge
                          </button>
                        </div>
                      )}
                    </div>

                    {onDeleteCollection && (
                      confirmingDeleteCol ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#991B1B] font-medium">
                            Remove collection? (Memories remain safe)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCollection(activeCollection.id);
                              setConfirmingDeleteCol(false);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#991B1B] text-white cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteCol(false)}
                            className="px-2.5 py-1 rounded-lg text-xs bg-[#EFE6D5] text-[#493629] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteCol(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#991B1B] hover:bg-[#FEE2E2]/60 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Collection
                        </button>
                      )
                    )}
                  </div>
                </div>

                {collectionMemories.length === 0 ? (
                  <div className="p-8 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-center">
                    <p className="font-serif-display text-xl text-[#27231F]">
                      No memories assigned to this collection yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {collectionMemories.map((mem) => (
                      <div key={mem.id} className="space-y-1.5">
                        <MemoryCard
                          memory={mem}
                          room={rooms.find((r) => r.id === mem.roomId)}
                          onSelect={onSelectMemory}
                          onToggleFavorite={onToggleFavorite}
                        />
                        {onSeparateMemoryFromCollection && (
                          <div className="flex items-center justify-between px-1 text-[11px] text-[#6E5641]">
                            <button
                              type="button"
                              onClick={() =>
                                onSeparateMemoryFromCollection(
                                  activeCollection.id,
                                  mem.id,
                                )
                              }
                              className="hover:text-[#854D27] underline cursor-pointer"
                            >
                              Separate / Move to Unsorted
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   4. CHRONOLOGICAL LIFE TIMELINE VIEW
   ========================================================================== */
interface TimelineViewProps {
  memories: Memory[];
  rooms: Room[];
  onSelectMemory: (memory: Memory) => void;
  onEnterRoom: (roomId: string) => void;
  onOpenAddMemory?: () => void;
  onCloseView: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  memories,
  rooms,
  onSelectMemory,
  onOpenAddMemory,
  onCloseView,
}) => {
  const [selectedDecade, setSelectedDecade] = useState<string>('all');

  const sortedMemories = useMemo(() => {
    return [...memories].sort((a, b) => a.date.localeCompare(b.date));
  }, [memories]);

  const filtered = useMemo(() => {
    if (selectedDecade === 'all') return sortedMemories;
    if (selectedDecade === 'early')
      return sortedMemories.filter((m) => m.year < 2010);
    if (selectedDecade === '2010s')
      return sortedMemories.filter((m) => m.year >= 2010 && m.year < 2020);
    return sortedMemories.filter((m) => m.year >= 2020);
  }, [sortedMemories, selectedDecade]);

  return (
    <div className="fixed inset-0 z-20 pt-20 pb-8 px-4 md:px-8 overflow-y-auto bg-[#27231F]/55 museum-fade-in">
      <div className="max-w-5xl mx-auto bg-[#FFFCF6] border border-[#E8DED0] rounded-2xl shadow-2xl p-6 md:p-8 museum-panel-enter">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E8DED0]">
          <div>
            <button
              type="button"
              onClick={onCloseView}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#854D27] hover:underline mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to 3D Atrium
            </button>
            <h1 className="font-serif-display text-3xl md:text-4xl font-semibold text-[#27231F]">
              Life Timeline
            </h1>
            <p className="text-sm text-[#493629] mt-1">
              Walk through your personal archive ordered from earliest keepsake to the present day.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F6F1E8] p-1 rounded-xl border border-[#E8DED0]">
            {[
              { id: 'all', label: 'All Years' },
              { id: 'early', label: '1999–2009' },
              { id: '2010s', label: '2010–2019' },
              { id: '2020s', label: '2020–Present' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedDecade(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedDecade === tab.id
                    ? 'bg-[#27231F] text-[#FFFCF6]'
                    : 'text-[#493629]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {memories.length === 0 ? (
          <div className="mt-8 p-10 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] text-center space-y-3">
            <h2 className="font-serif-display text-2xl md:text-3xl font-semibold text-[#27231F]">
              Your story will appear here as you add memories.
            </h2>
            <p className="text-xs sm:text-sm text-[#493629] max-w-md mx-auto">
              Every photograph, story, and milestone you upload is automatically arranged in chronological order.
            </p>
            {onOpenAddMemory && (
              <button
                type="button"
                onClick={onOpenAddMemory}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D6A15D]" />
                Upload Memories
              </button>
            )}
          </div>
        ) : (
          <div className="relative mt-8 pl-6 md:pl-10 border-l-2 border-[#D6A15D] space-y-8">
            {filtered.map((mem) => {
              const room = rooms.find((r) => r.id === mem.roomId);
              const imgSrc =
                mem.customImageUrl ||
                getProceduralMemoryArt(
                  mem.motif,
                  mem.palette,
                  mem.title,
                  mem.location,
                );

              return (
                <div
                  key={mem.id}
                  className="relative group bg-[#F6F1E8] border border-[#E8DED0] rounded-xl p-4 md:p-5 shadow-xs"
                >
                  <span
                    style={{ backgroundColor: room?.accentColor || '#D6A15D' }}
                    className="absolute -left-[31px] md:-left-[47px] top-6 w-3.5 h-3.5 rounded-full border-2 border-[#FFFCF6]"
                  />
                  <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
                    <img
                      src={imgSrc}
                      alt={mem.title}
                      loading="lazy"
                      onClick={() => onSelectMemory(mem)}
                      className="w-full md:w-44 aspect-4/3 object-cover rounded-lg border border-[#E8DED0] cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E5641]">
                        <span className="font-mono-tabular font-semibold text-[#854D27]">
                          {mem.date}
                        </span>
                        <span>·</span>
                        <span>{room?.name}</span>
                        <span>·</span>
                        <span>{mem.location}</span>
                      </div>
                      <h3
                        onClick={() => onSelectMemory(mem)}
                        className="font-serif-display text-2xl font-semibold text-[#27231F] mt-1 hover:text-[#854D27] cursor-pointer"
                      >
                        {mem.title}
                      </h3>
                      <p className="text-sm text-[#493629] mt-1.5 leading-relaxed">
                        {mem.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   5. EXPLORE, MEMORY MAP, PEOPLE DIRECTORY & PERSONAL DASHBOARD VIEW
   ========================================================================== */
interface ExploreSearchViewProps {
  floors: Floor[];
  memories: Memory[];
  rooms: Room[];
  collections: Collection[];
  initialSearchQuery: string;
  initialSubTab?: 'search' | 'map' | 'people' | 'dashboard';
  onSelectMemory: (memory: Memory) => void;
  onToggleFavorite: (memoryId: string, e: React.MouseEvent) => void;
  onEnterRoom: (roomId: string) => void;
  onOpenAddMemory?: () => void;
  onCloseView: () => void;
}

export const ExploreSearchView: React.FC<ExploreSearchViewProps> = ({
  floors,
  memories,
  rooms,
  collections,
  initialSearchQuery,
  initialSubTab = 'search',
  onSelectMemory,
  onToggleFavorite,
  onEnterRoom,
  onOpenAddMemory,
  onCloseView,
}) => {
  const [subTab, setSubTab] = useState<'search' | 'map' | 'people' | 'dashboard'>(
    initialSubTab,
  );
  const [query, setQuery] = useState(initialSearchQuery);
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | MemoryMediaType>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = memories.filter((m) => {
      if (roomFilter !== 'all' && m.roomId !== roomFilter) return false;
      if (mediaFilter !== 'all' && (m.type || 'image') !== mediaFilter)
        return false;
      if (onlyFavorites && !m.isFavorite) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.story.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        (m.people || []).some((p) => p.toLowerCase().includes(q)) ||
        m.tags.some((t) => t.toLowerCase().includes(q)) ||
        String(m.year).includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortBy === 'newest') return b.date.localeCompare(a.date);
      if (sortBy === 'oldest') return a.date.localeCompare(b.date);
      return a.title.localeCompare(b.title);
    });
  }, [memories, query, roomFilter, mediaFilter, onlyFavorites, sortBy]);

  // Verified Location Clusters for Memory Map (Never invents missing locations)
  const locationGroups = useMemo(() => {
    const map = new Map<string, Memory[]>();
    memories.forEach((m) => {
      const loc = m.location?.trim() || 'Unspecified Location';
      const arr = map.get(loc) || [];
      arr.push(m);
      map.set(loc, arr);
    });
    return Array.from(map.entries());
  }, [memories]);

  // Verified People Directory (Strictly based on user-provided people tags)
  const peopleGroups = useMemo(() => {
    const map = new Map<string, Memory[]>();
    memories.forEach((m) => {
      (m.people || []).forEach((person) => {
        const clean = person.trim();
        if (!clean) return;
        const arr = map.get(clean) || [];
        arr.push(m);
        map.set(clean, arr);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [memories]);

  const handleExportArchiveJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      floors,
      rooms,
      memories,
      collections,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memora-personal-archive.json';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-20 pt-20 pb-8 px-4 md:px-8 overflow-y-auto bg-[#27231F]/55 museum-fade-in">
      <div className="max-w-7xl mx-auto bg-[#FFFCF6] border border-[#E8DED0] rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 museum-panel-enter">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E8DED0]">
          <div>
            <button
              type="button"
              onClick={onCloseView}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#854D27] hover:underline mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to 3D Atrium
            </button>
            <h1 className="font-serif-display text-3xl md:text-4xl font-semibold text-[#27231F]">
              Explore Archive, Memory Map, People & Dashboard
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'search', label: 'Search & Gallery', icon: Search },
              { id: 'map', label: 'Memory Map', icon: MapPin },
              { id: 'people', label: 'People Directory', icon: Users },
              { id: 'dashboard', label: 'Personal Dashboard', icon: BarChart3 },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSubTab(t.id as typeof subTab)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                    subTab === t.id
                      ? 'bg-[#27231F] text-[#FFFCF6] border-[#27231F]'
                      : 'bg-[#F6F1E8] text-[#493629] border-[#E8DED0]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#D6A15D]" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SUB-TAB 1: SEARCH & GALLERY */}
        {subTab === 'search' && (
          <>
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-[#F6F1E8] p-4 rounded-xl border border-[#E8DED0]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#856B52] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, city, person, year, or tag..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-sm text-[#27231F]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-xs font-medium text-[#27231F]"
                >
                  <option value="all">All Rooms</option>
                  {rooms
                    .filter((r) => r.status !== 'empty')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>

                <select
                  value={mediaFilter}
                  onChange={(e) =>
                    setMediaFilter(e.target.value as 'all' | MemoryMediaType)
                  }
                  className="px-3 py-2 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-xs font-medium text-[#27231F]"
                >
                  <option value="all">All Media Types</option>
                  <option value="image">Photographs</option>
                  <option value="video">Videos</option>
                  <option value="audio">Audio</option>
                  <option value="chat">Chat Excerpts</option>
                  <option value="story">Written Stories & Letters</option>
                  <option value="document">Documents</option>
                  <option value="certificate">Certificates & Awards</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'newest' | 'oldest' | 'title')
                  }
                  className="px-3 py-2 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-xs font-medium text-[#27231F]"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Alphabetical</option>
                </select>

                <button
                  type="button"
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer ${
                    onlyFavorites
                      ? 'bg-[#D6A15D] text-[#27231F] border-[#D6A15D]'
                      : 'bg-[#FFFCF6] text-[#493629] border-[#E8DED0]'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  Favorites
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode(viewMode === 'grid' ? 'masonry' : 'grid')
                  }
                  className="px-3 py-2 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-xs font-medium text-[#493629]"
                >
                  {viewMode === 'grid' ? 'Masonry View' : 'Grid View'}
                </button>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="p-10 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] text-center space-y-3">
                <h2 className="font-serif-display text-2xl md:text-3xl font-semibold text-[#27231F]">
                  {memories.length === 0
                    ? 'Your memory collection starts here.'
                    : 'No memories matched your filter.'}
                </h2>
                <p className="text-xs sm:text-sm text-[#493629] max-w-md mx-auto">
                  {memories.length === 0
                    ? 'Upload your first photographs, stories, or documents to populate your personal museum.'
                    : 'Try adjusting your search keywords, room selection, or media type filter.'}
                </p>
                {onOpenAddMemory && (
                  <button
                    type="button"
                    onClick={onOpenAddMemory}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#D6A15D]" />
                    Upload Memories
                  </button>
                )}
              </div>
            ) : viewMode === 'masonry' ? (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
                {results.map((memory) => (
                  <div key={memory.id} className="break-inside-avoid">
                    <MemoryCard
                      memory={memory}
                      room={rooms.find((r) => r.id === memory.roomId)}
                      onSelect={onSelectMemory}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {results.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    room={rooms.find((r) => r.id === memory.roomId)}
                    onSelect={onSelectMemory}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* SUB-TAB 2: MEMORY MAP (Grounded in User-Provided Locations) */}
        {subTab === 'map' && (
          <div className="space-y-4">
            <p className="text-xs text-[#6E5641]">
              Grounded strictly in user-provided location records ({locationGroups.length} distinct places). No coordinates or places are ever fabricated.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locationGroups.map(([loc, mems]) => (
                <div
                  key={loc}
                  className="p-4 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-serif-display text-xl font-semibold text-[#27231F]">
                      <MapPin className="w-4 h-4 text-[#D6A15D]" />
                      {loc}
                    </span>
                    <span className="text-xs font-mono-tabular text-[#854D27]">
                      {mems.length} {mems.length === 1 ? 'memory' : 'memories'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {mems.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectMemory(m)}
                        className="w-full text-left p-2 rounded-lg bg-[#FFFCF6] hover:bg-[#E9D4B1]/40 border border-[#E8DED0] text-xs flex justify-between items-center cursor-pointer"
                      >
                        <span className="font-medium text-[#27231F] truncate">
                          {m.title}
                        </span>
                        <span className="font-mono-tabular text-[10px] text-[#6E5641]">
                          {m.year}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 3: PEOPLE DIRECTORY (Based on User-Provided Information) */}
        {subTab === 'people' && (
          <div className="space-y-4">
            <p className="text-xs text-[#6E5641]">
              People directory compiled strictly from names you have tagged on your memories ({peopleGroups.length} people).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {peopleGroups.map(([person, mems]) => (
                <div
                  key={person}
                  className="p-4 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 font-serif-display text-xl font-semibold text-[#27231F]">
                      <Users className="w-4 h-4 text-[#87977C]" />
                      {person}
                    </span>
                    <span className="text-xs font-mono-tabular text-[#854D27]">
                      {mems.length} {mems.length === 1 ? 'memory' : 'memories'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {mems.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectMemory(m)}
                        className="w-full text-left p-2 rounded-lg bg-[#FFFCF6] hover:bg-[#E9D4B1]/40 border border-[#E8DED0] text-xs flex justify-between items-center cursor-pointer"
                      >
                        <span className="font-medium text-[#27231F] truncate">
                          {m.title}
                        </span>
                        <span className="font-mono-tabular text-[10px] text-[#6E5641]">
                          {m.year}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: PERSONALIZED DASHBOARD, PRIVACY & EXPORT */}
        {subTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Museum Floors', value: floors.length },
                {
                  label: 'Active Rooms',
                  value: `${rooms.filter((r) => r.status === 'active').length}/${rooms.length}`,
                },
                { label: 'Total Memories', value: memories.length },
                { label: 'Curated Collections', value: collections.length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 rounded-xl bg-[#F6F1E8] border border-[#E8DED0]"
                >
                  <span className="text-xs text-[#6E5641] block">
                    {stat.label}
                  </span>
                  <strong className="font-serif-display text-3xl text-[#27231F]">
                    {stat.value}
                  </strong>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#27231F]">
                  <ShieldCheck className="w-4 h-4 text-[#87977C]" />
                  <span>Local Browser Persistence & Privacy Transparency</span>
                </div>
                <p className="text-xs text-[#493629] leading-relaxed">
                  Your rooms, floor layouts, audio preferences, and memories are stored locally in your browser via LocalStorage and IndexedDB. {BRAND.name} does not upload your archive to cloud storage unless you explicitly invoke an external AI provider with consent.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportArchiveJson}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#D6A15D]" />
                Export Complete Museum JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
