import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Trash2,
  Layers,
  Upload,
  CheckCircle2,
  Compass,
  Plus,
  Sparkles,
  BarChart3,
  Box,
} from 'lucide-react';
import {
  ArtworkMotif,
  ExhibitionDisplayStyle,
  Floor,
  GalleryLayoutMode,
  Memory,
  Room,
  RoomDecorativeStyle,
  RoomStatus,
} from '../types/museum';
import {
  RoomCategoryKey,
  RoomDesignConfig,
  RoomStarterMemoryTemplate,
} from '../types/aiStudio';
import { GALLERY_LAYOUT_OPTIONS } from '../utils/roomThemes';
import {
  EXHIBITION_DISPLAY_STYLE_OPTIONS,
  getEffectiveRoomExhibitionStyle,
} from '../utils/roomExhibition3D';
import {
  ROOM_CATEGORY_EXPERIENCE_PROFILES,
  ROOM_CATEGORY_LIST,
  buildSynthesizedRoomDesignConfig,
  detectRoomCategoryFromInput,
} from '../utils/roomCategoryExperience';

interface RoomEditorModalProps {
  isOpen: boolean;
  editingRoom: Room | null;
  targetFloor?: Floor | null;
  targetSlotIndex?: 0 | 1 | 2 | 3;
  roomMemories?: Memory[];
  onClose: () => void;
  onSaveRoom: (roomData: {
    id?: string;
    floorId: string;
    floorNumber: number;
    slotIndex: 0 | 1 | 2 | 3;
    status: RoomStatus;
    name: string;
    subtitle: string;
    description: string;
    theme: string;
    accentColor: string;
    featuredMotif: ArtworkMotif;
    curatorQuote: string;
    customCoverUrl?: string;
    exhibitionStyle?: ExhibitionDisplayStyle;
    galleryLayout?: GalleryLayoutMode;
    decorativeStyle?: RoomDecorativeStyle;
    designConfig?: RoomDesignConfig;
    includeStarterMemories?: boolean;
    starterMemories?: RoomStarterMemoryTemplate[];
  }) => void;
}

const ACCENT_PRESETS = [
  { label: 'Amber Gold', hex: '#D6A15D' },
  { label: 'Walnut Ochre', hex: '#854D27' },
  { label: 'Muted Sage', hex: '#87977C' },
  { label: 'Dusty Rose', hex: '#C98D87' },
  { label: 'Travel Blue', hex: '#6E8FA6' },
  { label: 'Burnished Bronze', hex: '#A16207' },
];

const THEME_PRESETS = [
  'Warm Cedar & Sunlit Meadow',
  'Warm Cedar, Sunlit Amber & Nostalgic Playroom Sanctuary',
  'Heirloom Walnut & Hearth',
  'Coastal Amber & Driftwood',
  'Coastal Travertine, Olive Slate & Cartographer Brass',
  'Dusty Rose & Lantern Glow',
  'Travel Blue & Travertine',
  'Burnished Brass & Alabaster',
  'Collegiate Sage & Parchment',
  'Muted Sage & Linen',
  'Starlight & Champagne',
];

const DECORATIVE_STYLE_OPTIONS: {
  id: RoomDecorativeStyle;
  label: string;
}[] = [
  {
    id: 'playful_nostalgia',
    label: 'Childhood — Warm Amber, Cedar Treehouse & Paper Boats',
  },
  {
    id: 'compass_atlas',
    label: 'Travels — Cartographic Globe, Coordinates & Horizons',
  },
  {
    id: 'scrapbook_salon',
    label: 'Friendships — Vinyl Lounge, Polaroids & Warmth',
  },
  {
    id: 'heirloom_hearth',
    label: 'Family — Heirloom Walnut, Lineage Dates & Hearth',
  },
  {
    id: 'laurel_monograph',
    label: 'Achievements — Formal Brass Exhibition & Certificates',
  },
  {
    id: 'campus_quadrangle',
    label: 'College Years — Academic Folio, Studios & Milestones',
  },
  {
    id: 'lantern_conservatory',
    label: 'Special Moments — Paper Lanterns & Celebrations',
  },
  {
    id: 'botanical_atelier',
    label: 'Botanical Atelier — Sculptural Plinth & Herbarium',
  },
];

const MOTIF_OPTIONS: { label: string; value: ArtworkMotif }[] = [
  { label: 'Sunlit Meadow & Treehouse', value: 'treehouse_meadow' },
  { label: 'Origami Paper Boats', value: 'paper_boats' },
  { label: 'Coastal Solstice Bonfire', value: 'coastal_bonfire' },
  { label: 'Classical Stone Arches', value: 'amalfi_arches' },
  { label: 'Architectural Atelier Desk', value: 'atelier_studio' },
  { label: 'Courtyard Paper Lanterns', value: 'courtyard_lanterns' },
  { label: 'Heirloom Family Table', value: 'family_table' },
  { label: 'Observatory & Night Stars', value: 'observatory_stars' },
  { label: 'Botanical Herbarium Press', value: 'botanical_press' },
  { label: 'Vinyl Attic Console', value: 'vinyl_attic' },
];

export const RoomEditorModal: React.FC<RoomEditorModalProps> = ({
  isOpen,
  editingRoom,
  targetFloor,
  targetSlotIndex = 0,
  roomMemories = [],
  onClose,
  onSaveRoom,
}) => {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState(THEME_PRESETS[0]);
  const [accentColor, setAccentColor] = useState('#D6A15D');
  const [featuredMotif, setFeaturedMotif] =
    useState<ArtworkMotif>('treehouse_meadow');
  const [curatorQuote, setCuratorQuote] = useState('');
  const [customCoverUrl, setCustomCoverUrl] = useState<string | undefined>(
    undefined,
  );
  const [exhibitionStyle, setExhibitionStyle] =
    useState<ExhibitionDisplayStyle>('memory_shelves');
  const [galleryLayout, setGalleryLayout] =
    useState<GalleryLayoutMode>('scrapbook');
  const [decorativeStyle, setDecorativeStyle] =
    useState<RoomDecorativeStyle>('playful_nostalgia');
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('active');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<
    RoomCategoryKey | undefined
  >(undefined);
  const [designConfig, setDesignConfig] = useState<
    RoomDesignConfig | undefined
  >(undefined);
  const [includeStarterMemories, setIncludeStarterMemories] = useState(false);
  const [isGeminiDesigning, setIsGeminiDesigning] = useState(false);
  const [geminiStatusNote, setGeminiStatusNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isActivatingEmptySlot =
    !editingRoom || editingRoom.status === 'empty';

  const applyCategoryProfileToFields = (
    catKey: RoomCategoryKey,
    roomNameInput: string,
    customConfig?: RoomDesignConfig,
  ) => {
    const profile = ROOM_CATEGORY_EXPERIENCE_PROFILES[catKey];
    const synthesized =
      customConfig ||
      buildSynthesizedRoomDesignConfig({
        roomName: roomNameInput || profile.label,
        explicitCategory: catKey,
        memories: roomMemories,
      });

    setSelectedCategoryKey(catKey);
    setSubtitle(profile.subtitle);
    setDescription(synthesized.roomDescription || profile.roomDescription);
    setTheme(synthesized.themeName || profile.themeName);
    setAccentColor(synthesized.accentColorHex || profile.accentColorHex);
    setFeaturedMotif(synthesized.featuredMotif || profile.featuredMotif);
    setCuratorQuote(synthesized.curatorQuote || profile.curatorQuote);
    setExhibitionStyle(synthesized.exhibitionStyle || profile.exhibitionStyle);
    setGalleryLayout(synthesized.galleryLayout || profile.galleryLayout);
    setDecorativeStyle(synthesized.decorativeStyle || profile.decorativeStyle);
    setDesignConfig(synthesized);
  };

  useEffect(() => {
    if (!isOpen) return;
    setGeminiStatusNote(null);

    if (editingRoom && editingRoom.status !== 'empty') {
      const detected = detectRoomCategoryFromInput(
        `${editingRoom.name} ${editingRoom.subtitle} ${editingRoom.theme}`,
        editingRoom.designConfig?.detectedCategory,
      );
      const synthesized =
        editingRoom.designConfig ||
        buildSynthesizedRoomDesignConfig({
          roomName: editingRoom.name,
          explicitCategory: detected.categoryKey,
          memories: roomMemories,
        });

      setName(editingRoom.name);
      setSubtitle(editingRoom.subtitle);
      setDescription(editingRoom.description);
      setTheme(editingRoom.theme || synthesized.themeName);
      setAccentColor(editingRoom.accentColor);
      setFeaturedMotif(editingRoom.featuredMotif);
      setCuratorQuote(editingRoom.curatorQuote);
      setCustomCoverUrl(editingRoom.customCoverUrl);
      setExhibitionStyle(getEffectiveRoomExhibitionStyle(editingRoom, roomMemories) as ExhibitionDisplayStyle);
      setGalleryLayout(editingRoom.galleryLayout || 'masonry');
      setDecorativeStyle(
        editingRoom.decorativeStyle || synthesized.decorativeStyle || 'playful_nostalgia',
      );
      setRoomStatus(editingRoom.status);
      setSelectedCategoryKey(detected.categoryKey);
      setDesignConfig(synthesized);
      setIncludeStarterMemories(roomMemories.length === 0);
    } else {
      const defaultCat: RoomCategoryKey = 'childhood';
      const startName = 'Childhood Room';
      setName(startName);
      setCustomCoverUrl(undefined);
      setRoomStatus('active');
      setIncludeStarterMemories(false);
      applyCategoryProfileToFields(defaultCat, startName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingRoom, isOpen]);

  // Live semantic detection whenever the user types a room name
  const liveDetection = useMemo(
    () => detectRoomCategoryFromInput(name, selectedCategoryKey),
    [name, selectedCategoryKey],
  );

  const activeConfig = useMemo(
    () =>
      designConfig ||
      buildSynthesizedRoomDesignConfig({
        roomName: name || liveDetection.profile.label,
        promptOrNotes: description,
        explicitCategory: liveDetection.categoryKey,
        memories: roomMemories,
      }),
    [designConfig, name, description, liveDetection, roomMemories],
  );

  const activeVisualData = activeConfig.visualDataSummary!;
  const activeBlueprint = activeConfig.blueprint;

  const handleRoomNameChange = (nextName: string) => {
    setName(nextName);
    if (nextName.trim().length >= 3) {
      const autoDetected = detectRoomCategoryFromInput(nextName);
      if (autoDetected.matchedKeywords.length > 0 && autoDetected.matchedKeywords[0] !== 'default') {
        applyCategoryProfileToFields(autoDetected.categoryKey, nextName);
        setGeminiStatusNote(
          `Gemini detected category "${autoDetected.profile.label}" from room name "${nextName}" and generated Output A (3D Environment Blueprint) + Output B (Memory Exhibition Blueprint).`,
        );
      }
    }
  };

  const handleRunGeminiAutoDesign = async () => {
    const targetName = name.trim() || 'Childhood Room';
    setIsGeminiDesigning(true);
    setGeminiStatusNote(
      `Gemini is analyzing "${targetName}" and ${roomMemories.length} uploaded memories to generate Output A (3D Environment Blueprint) + Output B (Memory Exhibition Blueprint)...`,
    );

    try {
      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'room_design',
          providerId: 'gemini',
          userId: 'curator-local',
          consentGranted: true,
          demoMode: false,
          prompt: `Generate Output A (3D Environment Blueprint) and Output B (Memory Exhibition Blueprint) for room "${targetName}" (${liveDetection.profile.label}).`,
          roomDesignPrompt: {
            roomName: targetName,
            roomCategory: liveDetection.profile.label,
            description:
              description.trim() || liveDetection.profile.roomDescription,
            styleKeywords: `${targetName} ${subtitle} ${liveDetection.profile.label}`,
          },
          memories: roomMemories.map((m) => ({
            id: m.id,
            roomId: m.roomId,
            type: m.type || m.mediaType || 'image',
            mediaUrl: m.mediaUrl || m.customImageUrl || '',
            title: m.title,
            date: m.date,
            year: m.year,
            location: m.location,
            category: m.category,
            description: m.description,
            story: m.story,
            tags: m.tags,
          })),
        }),
      });
      const json = await response.json();
      if (json.ok && json.data) {
        const cfg = json.data as RoomDesignConfig;
        const cat = cfg.detectedCategory || liveDetection.categoryKey;
        applyCategoryProfileToFields(cat, targetName, cfg);
        setGeminiStatusNote(
          `✨ Gemini (${json.modelUsed || 'gemini-3.8-flash'}) generated Output A (3D Environment Blueprint) + Output B (Memory Exhibition Blueprint) for "${cfg.categoryLabel || liveDetection.profile.label}".`,
        );
        setIsGeminiDesigning(false);
        return;
      }
    } catch {
      // Fallback to local synthesized Gemini category engine
    }

    const fallbackDetection = detectRoomCategoryFromInput(targetName);
    const synthesized = buildSynthesizedRoomDesignConfig({
      roomName: targetName,
      promptOrNotes: description,
      explicitCategory: fallbackDetection.categoryKey,
      memories: roomMemories,
    });
    applyCategoryProfileToFields(
      fallbackDetection.categoryKey,
      targetName,
      synthesized,
    );
    setGeminiStatusNote(
      `✨ Gemini Category Engine matched "${fallbackDetection.profile.label}" for "${targetName}" — Output A (3D Environment Blueprint) & Output B (Memory Exhibition Blueprint) ready.`,
    );
    setIsGeminiDesigning(false);
  };

  if (!isOpen) return null;

  const handleCoverUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomCoverUrl(reader.result);
      }
    };
    reader.readAsDataURL(files[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalCat = selectedCategoryKey || liveDetection.categoryKey;
    const finalDesignConfig =
      designConfig ||
      buildSynthesizedRoomDesignConfig({
        roomName: name.trim(),
        promptOrNotes: description.trim(),
        explicitCategory: finalCat,
        memories: roomMemories,
      });

    onSaveRoom({
      id: editingRoom?.id,
      floorId: editingRoom?.floorId || targetFloor?.id || 'floor-0',
      floorNumber:
        editingRoom?.floorNumber ?? targetFloor?.floorNumber ?? 0,
      slotIndex: editingRoom?.slotIndex ?? targetSlotIndex,
      status: roomStatus,
      name: name.trim(),
      subtitle: subtitle.trim() || theme,
      description:
        description.trim() ||
        finalDesignConfig.roomDescription ||
        'A dedicated architectural gallery preserving cherished photographs and stories.',
      theme,
      accentColor,
      featuredMotif,
      curatorQuote:
        curatorQuote.trim() ||
        finalDesignConfig.curatorQuote ||
        '“Every memory deserves a quiet room of its own.”',
      customCoverUrl,
      exhibitionStyle,
      galleryLayout,
      decorativeStyle,
      designConfig: {
        ...finalDesignConfig,
        accentColorHex: accentColor,
        exhibitionStyle,
        galleryLayout,
        decorativeStyle,
        featuredMotif,
      },
      includeStarterMemories,
      starterMemories:
        finalDesignConfig.suggestedStarterMemories ||
        ROOM_CATEGORY_EXPERIENCE_PROFILES[finalCat].starterMemories,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#18110B]/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-editor-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#FFFCF6] border border-[#E8DED0] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#F6F1E8] border-b border-[#E8DED0] shrink-0">
          <div>
            <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#854D27] font-semibold">
              {targetFloor?.name || editingRoom?.wing || 'Museum Floor'} · Fixed
              Slot #{(editingRoom?.slotIndex ?? targetSlotIndex) + 1} of 4
            </span>
            <h2
              id="room-editor-title"
              className="font-serif-display text-2xl font-semibold text-[#27231F]"
            >
              {isActivatingEmptySlot
                ? `Create 3D Memory Room in Slot #${
                    (editingRoom?.slotIndex ?? targetSlotIndex) + 1
                  }`
                : `Configure 3D Room: ${editingRoom?.name}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close room modal"
            className="p-1.5 rounded-lg text-[#493629] hover:bg-[#E9D4B1]/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto flex-1"
        >
          {/* 1. ROOM NAME + GEMINI AUTO-DETECT ACTION */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-8">
              <label className="block text-xs font-semibold text-[#27231F] mb-1">
                Room Name (Gemini Auto-Detects Category & 3D Experience) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleRoomNameChange(e.target.value)}
                placeholder="e.g., My Childhood, World Travels, Family Hearth"
                className="w-full px-3.5 py-2 rounded-lg bg-[#F6F1E8] border border-[#C9A66B] text-sm font-medium text-[#27231F]"
              />
            </div>

            <div className="sm:col-span-4">
              <button
                type="button"
                disabled={isGeminiDesigning}
                onClick={handleRunGeminiAutoDesign}
                className="w-full px-3.5 py-2 rounded-lg bg-[#27231F] hover:bg-[#493629] text-[#FFE2B5] border border-[#C9A66B] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D6A15D]" />
                <span>
                  {isGeminiDesigning
                    ? 'Generating Blueprint...'
                    : 'Gemini Auto-Design'}
                </span>
              </button>
            </div>
          </div>

          {/* 2. ROOM CATEGORY SELECTOR CHIPS */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#854D27] font-semibold">
                Select or Confirm Room Category Experience
              </label>
              <span className="text-[11px] font-mono-tabular text-[#493629]">
                Detected: <strong>{liveDetection.profile.label}</strong>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {ROOM_CATEGORY_LIST.map((cat) => {
                const isSelected =
                  (selectedCategoryKey || liveDetection.categoryKey) === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      const shouldUpdateDefaultName =
                        !name.trim() ||
                        ROOM_CATEGORY_LIST.some(
                          (c) =>
                            name.toLowerCase().includes(c.shortBadge.toLowerCase()) ||
                            name.toLowerCase().includes(c.key.replace('_', ' ')),
                        );
                      const nextRoomName = shouldUpdateDefaultName
                        ? `${cat.shortBadge} Room`
                        : name;
                      if (shouldUpdateDefaultName) setName(nextRoomName);
                      applyCategoryProfileToFields(cat.key, nextRoomName);
                      setGeminiStatusNote(
                        `Configured "${nextRoomName}" with the ${cat.label} 3D Environment Blueprint + Memory Exhibition Blueprint.`,
                      );
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-medium transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-[#27231F] text-[#FFE2B5] border-[#C9A66B] font-semibold shadow-xs'
                        : 'bg-[#F6F1E8] text-[#493629] border-[#E8DED0] hover:border-[#C9A66B]'
                    }`}
                  >
                    {cat.shortBadge}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. GEMINI 3D ENVIRONMENT BLUEPRINT (OUTPUT A) + MEMORY EXHIBITION BLUEPRINT (OUTPUT B) */}
          <div className="rounded-xl bg-[#27231F] text-[#FFFCF6] border border-[#C9A66B]/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#493629] pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D6A15D] shrink-0" />
                <div>
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#C9A66B] block">
                    Gemini Dual Blueprint · Output A (3D Environment) + Output B (Memory Exhibits)
                  </span>
                  <h3 className="font-serif-display text-lg font-semibold text-[#FFE2B5]">
                    {liveDetection.profile.label} — Real 3D Room View
                  </h3>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#3C2D22] border border-[#C9A66B]/40 text-[10px] font-mono-tabular text-[#FFE2B5]">
                {activeVisualData.totalExhibits} Exhibits ·{' '}
                {activeVisualData.earliestYear || 2004}–
                {activeVisualData.latestYear || 2024}
              </span>
            </div>

            {geminiStatusNote && (
              <p className="text-[11px] text-[#FFE2B5] bg-[#3C2D22]/90 border border-[#C9A66B]/40 rounded-lg px-3 py-1.5">
                {geminiStatusNote}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Left: Output A — 3D Environment Blueprint */}
              <div className="bg-[#1E1915] border border-[#493629] rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-wider text-[#C9A66B]">
                  <Box className="w-3.5 h-3.5" />
                  <span>Output A · 3D Environment Blueprint</span>
                </div>
                <p className="text-[10px] text-[#C9A66B]/90">
                  {activeBlueprint?.environment.style}
                </p>
                <ul className="space-y-1 text-[11px] text-[#E8DED0]">
                  {(
                    activeBlueprint?.environment.furniture.map((f) => f.label) ||
                    designConfig?.interactive3DInstallations ||
                    liveDetection.profile.interactive3DInstallations
                  )
                    .slice(0, 4)
                    .map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#D6A15D] mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {/* Right: Output B — Memory Exhibition & Data Representation */}
              <div className="bg-[#1E1915] border border-[#493629] rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-wider text-[#C9A66B]">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Output B · Memory Exhibition & Data</span>
                </div>
                <div className="space-y-1.5">
                  {activeVisualData.emotionAndThemeMetrics
                    .slice(0, 3)
                    .map((metric) => (
                      <div key={metric.theme} className="space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-[#E8DED0] truncate">
                            {metric.theme}
                          </span>
                          <span className="font-mono-tabular text-[#FFE2B5]">
                            {metric.score}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#332820] rounded-xs overflow-hidden">
                          <div
                            style={{
                              width: `${metric.score}%`,
                              backgroundColor: metric.colorHex,
                            }}
                            className="h-full"
                          />
                        </div>
                      </div>
                    ))}
                </div>
                <div className="pt-1 border-t border-[#332820] flex flex-wrap gap-1">
                  {activeVisualData.mediaBreakdown.map((mb) => (
                    <span
                      key={mb.type}
                      className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-[#2B221B] text-[#FFE2B5]"
                    >
                      {mb.type}: {mb.count} ({mb.percentage}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional demo content only — these are fictional examples, not the user's personal memories */}
            {roomMemories.length === 0 && (
              <label className="flex items-center gap-2.5 pt-1 text-xs text-[#FFE2B5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStarterMemories}
                  onChange={(e) =>
                    setIncludeStarterMemories(e.target.checked)
                  }
                  className="rounded border-[#C9A66B] accent-[#D6A15D]"
                />
                <span>
                  Include{' '}
                  <strong>
                    {liveDetection.profile.starterMemories.length} sample demo memories
                  </strong>{' '}
                  (fictional examples only; not your personal memories)
                </span>
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#27231F] mb-1">
                Room Theme & Material Palette
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-xs font-medium text-[#27231F]"
              >
                {Array.from(new Set([theme, ...THEME_PRESETS])).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#27231F] mb-1">
                3D Museum Exhibition Installation Style
              </label>
              <select
                value={exhibitionStyle}
                onChange={(e) =>
                  setExhibitionStyle(e.target.value as ExhibitionDisplayStyle)
                }
                className="w-full px-3 py-2 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-xs font-medium text-[#27231F]"
              >
                {EXHIBITION_DISPLAY_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} — {opt.badge}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#27231F] mb-1">
                Default Gallery Layout
              </label>
              <select
                value={galleryLayout}
                onChange={(e) =>
                  setGalleryLayout(e.target.value as GalleryLayoutMode)
                }
                className="w-full px-3 py-2 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-xs font-medium text-[#27231F]"
              >
                {GALLERY_LAYOUT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#27231F] mb-1">
                Decorative Atmosphere
              </label>
              <select
                value={decorativeStyle}
                onChange={(e) =>
                  setDecorativeStyle(e.target.value as RoomDecorativeStyle)
                }
                className="w-full px-3 py-2 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-xs font-medium text-[#27231F]"
              >
                {DECORATIVE_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#27231F] mb-1">
              Gallery Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#27231F] mb-1.5">
                Cover Image Motif or Upload
              </label>
              <div className="flex gap-2">
                <select
                  value={featuredMotif}
                  onChange={(e) =>
                    setFeaturedMotif(e.target.value as ArtworkMotif)
                  }
                  className="flex-1 px-2.5 py-2 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-xs text-[#27231F]"
                >
                  {MOTIF_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCoverUpload(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload custom cover image"
                  className="px-2.5 py-2 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-xs font-medium text-[#493629] hover:bg-[#E9D4B1]/50"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#27231F] mb-1.5">
                Optional Accent Color
              </label>
              <div className="flex items-center gap-2 pt-1">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setAccentColor(preset.hex)}
                    title={preset.label}
                    style={{ backgroundColor: preset.hex }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                      accentColor === preset.hex
                        ? 'border-[#27231F] scale-115 shadow'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Room State Controls (Active, Disabled, Empty) */}
          {!isActivatingEmptySlot && (
            <div className="p-3.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0]">
              <label className="block text-xs font-semibold text-[#27231F] mb-1.5">
                Room Slot Accessibility State
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'active',
                    label: 'Active (Open in 3D)',
                  },
                  {
                    id: 'disabled',
                    label: 'Disabled (Preserves Memories)',
                  },
                  {
                    id: 'empty',
                    label: 'Vacate to Empty Slot',
                  },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setRoomStatus(st.id as RoomStatus)}
                    className={`px-2.5 py-2 rounded-lg text-[11px] font-semibold border text-center cursor-pointer ${
                      roomStatus === st.id
                        ? 'bg-[#27231F] text-[#FFFCF6] border-[#27231F]'
                        : 'bg-[#FFFCF6] text-[#493629] border-[#E8DED0]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E8DED0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#493629] hover:bg-[#F6F1E8] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
            >
              {isActivatingEmptySlot
                ? 'Create & Enter 3D Room'
                : 'Save Room Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==========================================================================
   AUTOMATIC FLOOR EXPANSION CONFIRMATION MODAL
   ========================================================================== */
interface FloorExpansionConfirmModalProps {
  isOpen: boolean;
  currentFloorCount: number;
  onConfirmCreateFloor: () => void;
  onCancel: () => void;
}

export const FloorExpansionConfirmModal: React.FC<
  FloorExpansionConfirmModalProps
> = ({ isOpen, currentFloorCount, onConfirmCreateFloor, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#18110B]/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#FFFCF6] border border-[#E8DED0] rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#493629] text-[#FDE68A] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#854D27] font-semibold">
              Smart Floor Expansion
            </span>
            <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
              All Existing Floors Are Full
            </h3>
          </div>
        </div>

        <p className="text-xs text-[#493629] leading-relaxed">
          All {currentFloorCount} existing floors have their four fixed room
          slots (`0–3`) occupied. Would you like to construct{' '}
          <strong>Floor {currentFloorCount + 1}</strong> with{' '}
          <strong>four new empty room slots</strong> and extend the connected 3D
          museum architecture and automated elevator landing?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8DED0]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#493629] hover:bg-[#F6F1E8] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmCreateFloor}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D6A15D]" />
            Confirm & Construct Floor {currentFloorCount + 1}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   ROOM CREATED SUCCESS BANNER / MODAL ("Enter Room" or "Continue Exploring")
   ========================================================================== */
interface RoomCreatedPromptProps {
  room: Room | null;
  onEnterRoom: (roomId: string) => void;
  onContinueExploring: () => void;
}

export const RoomCreatedPrompt: React.FC<RoomCreatedPromptProps> = ({
  room,
  onEnterRoom,
  onContinueExploring,
}) => {
  if (!room) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-[#27231F] text-[#FFFCF6] border border-[#D6A15D] rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#D6A15D] shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#D6A15D]">
              Room Slot Activated in 3D Museum
            </span>
            <h4 className="font-serif-display text-xl font-semibold">
              {room.name} ({room.wing} · Slot #{room.slotIndex + 1})
            </h4>
            <p className="text-xs text-[#E9D4B1]/85 mt-0.5">
              Doorway, architectural signage, and mini-map slot are now active.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onContinueExploring}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-[#FFFCF6] cursor-pointer"
          >
            Continue Exploring
          </button>
          <button
            type="button"
            onClick={() => onEnterRoom(room.id)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#D6A15D] text-[#27231F] hover:bg-[#E9D4B1] cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            Enter Room
          </button>
        </div>
      </div>
    </div>
  );
};
