import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Film,
  Flashlight,
  FolderOpen,
  Headphones,
  Image as ImageIcon,
  Monitor,
  Music,
  Pause,
  Play,
  Plus,
  Power,
  Radio,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { InteractiveObjectId3D } from '../types/aiStudio';
import { Memory } from '../types/museum';
import {
  BedroomCrtState,
  BedroomDrawerState,
  BedroomProjectorState,
  BedroomScrapbookState,
  ChildhoodBedroomInteractionController,
  CrtAppView,
} from '../utils/childhoodBedroomInteractions';
import { getAuthenticMemoryDateLabel } from '../utils/roomTextureGenerators';
import { bedroomSfx } from '../utils/bedroomSfx';
import { VideoMemoryPlayer } from './VideoMemoryPlayer';

interface BedroomInteractionOverlayProps {
  activeObjectId: InteractiveObjectId3D;
  controller: ChildhoodBedroomInteractionController;
  onClose: () => void;
  onSwitchInteraction: (objectId: InteractiveObjectId3D) => void;
  onSelectMemory: (memory: Memory) => void;
  onDeleteMemory?: (memoryId: string) => void;
  onOpenAddMemory?: () => void;
  onTriggerPageTurnHandAnim: () => void;
  onToggleFlashlight: () => boolean;
  onToggleHeadphones: () => boolean;
  onTriggerCricketSwing: () => void;
  onOpenRadioStation?: () => void;
  revision: number;
}

function formatAudioSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

export const BedroomInteractionOverlay: React.FC<BedroomInteractionOverlayProps> = ({
  activeObjectId,
  controller,
  onClose,
  onSwitchInteraction,
  onSelectMemory,
  onDeleteMemory,
  onOpenAddMemory,
  onTriggerPageTurnHandAnim,
  onToggleFlashlight,
  onToggleHeadphones,
  onTriggerCricketSwing,
  onOpenRadioStation,
  revision,
}) => {
  const [sfxMuted, setSfxMuted] = useState<boolean>(() => bedroomSfx.isMuted());
  const [, setLocalTick] = useState(0);
  const bump = () => setLocalTick((n) => n + 1);

  // Inline Radio Player state (strictly user-initiated — never autoplays)
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedRadioId, setSelectedRadioId] = useState<string | null>(null);
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioCurrentTime, setRadioCurrentTime] = useState(0);
  const [radioDuration, setRadioDuration] = useState(0);
  const [radioVolume, setRadioVolume] = useState(0.8);
  const [radioError, setRadioError] = useState<string | null>(null);

  useEffect(() => bedroomSfx.subscribe(setSfxMuted), []);

  // Stop inline radio audio whenever user leaves the radio overlay or unmounts
  useEffect(() => {
    if (activeObjectId !== 'memory_radio' && radioAudioRef.current) {
      radioAudioRef.current.pause();
      setRadioPlaying(false);
    }
  }, [activeObjectId]);

  useEffect(() => {
    return () => {
      if (radioAudioRef.current) {
        radioAudioRef.current.pause();
      }
    };
  }, []);

  // Poll lightweight CRT progress bar only when CRT media is actively playing
  useEffect(() => {
    if (activeObjectId !== 'crt_computer') return;
    const id = window.setInterval(() => {
      if (controller.getCrtState().isPlaying) {
        bump();
      }
    }, 350);
    return () => window.clearInterval(id);
  }, [activeObjectId, controller]);

  void revision;

  const zoneMeta = controller.getZoneById(activeObjectId);
  const title = zoneMeta?.title || 'Childhood Bedroom Object';
  const flashlightHeld = controller.isFlashlightHeld();
  const headphonesWorn = controller.isHeadphonesWorn();
  const scrapbookState: BedroomScrapbookState = controller.getScrapbookState();
  const drawerState: BedroomDrawerState = controller.getDrawerState();
  const crtState: BedroomCrtState = controller.getCrtState();
  const crtCatalog = controller.getCrtCatalog();
  const projectorState: BedroomProjectorState = controller.getProjectorState();
  const curtainsOpen = controller.isWindowCurtainsOpen();

  const renderMemoryStrip = (items: Memory[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 py-1">
          <p className="text-xs text-[#E8DED0]/85 italic">{emptyMessage}</p>
          {onOpenAddMemory && (
            <button
              type="button"
              onClick={onOpenAddMemory}
              className="inline-flex items-center gap-1 rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Memory
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
        {items.slice(0, 12).map((mem) => {
          const effType = mem.mediaType || mem.type || 'image';
          const thumb =
            mem.customImageUrl ||
            (effType === 'image' || effType === 'certificate' ? mem.mediaUrl : undefined);
          const dateMeta = getAuthenticMemoryDateLabel(mem);
          return (
            <div
              key={mem.id}
              className="shrink-0 flex items-center gap-1.5 rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/40 px-2.5 py-1.5 transition-colors"
            >
              <button
                type="button"
                onClick={() => onSelectMemory(mem)}
                className="flex items-center gap-2 text-left cursor-pointer"
              >
                {thumb && (
                  <img
                    src={thumb}
                    alt={mem.title}
                    className="w-9 h-9 rounded-lg object-cover border border-[#C9A66B]/40 shrink-0"
                  />
                )}
                <div className="max-w-[140px]">
                  <div className="text-xs font-semibold text-[#FFFCF6] truncate">
                    {mem.title}
                  </div>
                  <div className="text-[11px] text-[#E8DED0]/75 truncate">
                    {dateMeta.label || mem.mediaFileName || effType}
                  </div>
                </div>
              </button>
              {onDeleteMemory && (
                <button
                  type="button"
                  onClick={() => onDeleteMemory(mem.id)}
                  aria-label={`Remove ${mem.title}`}
                  title="Remove memory"
                  className="p-1.5 rounded-lg text-[#E8DED0]/65 hover:text-[#FCA5A5] hover:bg-[#4A2525]/60 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPhotoGalleryGrid = (
    items: Memory[],
    emptyMessage: string,
    headerLabel: string,
  ) => {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-[#E8DED0]/90">
            <ImageIcon className="w-3.5 h-3.5 text-[#C9A66B] shrink-0" />
            <span>
              {items.length > 0
                ? `${items.length} uploaded photo${items.length === 1 ? '' : 's'} in ${headerLabel}`
                : emptyMessage}
            </span>
          </div>
          {onOpenAddMemory && (
            <button
              type="button"
              onClick={onOpenAddMemory}
              className="inline-flex items-center gap-1 rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Upload Photos
            </button>
          )}
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
            {items.map((mem) => {
              const thumb = mem.customImageUrl || mem.mediaUrl;
              const dateMeta = getAuthenticMemoryDateLabel(mem);
              return (
                <div
                  key={mem.id}
                  className="group relative rounded-xl overflow-hidden bg-[#1E1915] border border-[#C9A66B]/40 flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => onSelectMemory(mem)}
                    className="text-left flex flex-col flex-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C9A66B]"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={mem.title}
                        className="w-full h-24 object-cover bg-[#2B241E]"
                      />
                    ) : (
                      <div className="w-full h-24 bg-[#2B241E] flex items-center justify-center text-[#C9A66B]">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs font-semibold text-[#FFFCF6] truncate">
                        {mem.title}
                      </p>
                      <p className="text-[10px] text-[#E8DED0]/70 truncate">
                        {dateMeta.label || mem.mediaFileName || 'Photo'}
                      </p>
                    </div>
                  </button>
                  {onDeleteMemory && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMemory(mem.id);
                      }}
                      aria-label={`Remove ${mem.title}`}
                      title="Remove photo"
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-[#1E1915]/85 text-[#E8DED0] hover:text-[#FCA5A5] hover:bg-[#4A2525] border border-[#C9A66B]/30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderBody = () => {
    switch (activeObjectId) {
      case 'wooden_bed':
      case 'under_bed_flashlight': {
        return (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSwitchInteraction('under_bed_scrapbook');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Open Hidden Memory Book
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleFlashlight();
                bump();
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border text-xs font-semibold px-3 py-1.5 cursor-pointer ${
                flashlightHeld
                  ? 'bg-[#4A3B28] border-[#FFE2B5] text-[#FFE2B5]'
                  : 'bg-[#352E28] hover:bg-[#443A32] border-[#C9A66B]/50 text-[#FFFCF6]'
              }`}
            >
              <Flashlight className="w-3.5 h-3.5" />
              {flashlightHeld ? 'Put Down Flashlight' : 'Hold Flashlight in Mouth'}
            </button>
            <span className="text-xs text-[#E8DED0]/80">
              Beneath the bed — choose the scrapbook or illuminate with the flashlight.
            </span>
          </div>
        );
      }

      case 'under_bed_scrapbook': {
        const leftMem = scrapbookState.photoMemories[scrapbookState.spreadIndex * 2];
        const rightMem = scrapbookState.photoMemories[scrapbookState.spreadIndex * 2 + 1];
        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={scrapbookState.spreadIndex <= 0}
                onClick={() => {
                  const res = controller.turnScrapbookPage(-1);
                  if (res.turned) onTriggerPageTurnHandAnim();
                  bump();
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-[#352E28] hover:bg-[#443A32] disabled:opacity-40 border border-[#C9A66B]/50 text-xs font-semibold px-2.5 py-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev (←)
              </button>
              <span className="text-xs font-mono-tabular text-[#FFE2B5] px-1">
                Spread {scrapbookState.spreadIndex + 1} / {scrapbookState.totalSpreads}
              </span>
              <button
                type="button"
                disabled={scrapbookState.spreadIndex >= scrapbookState.totalSpreads - 1}
                onClick={() => {
                  const res = controller.turnScrapbookPage(1);
                  if (res.turned) onTriggerPageTurnHandAnim();
                  bump();
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-[#352E28] hover:bg-[#443A32] disabled:opacity-40 border border-[#C9A66B]/50 text-xs font-semibold px-2.5 py-1.5 cursor-pointer"
              >
                Next (→)
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleFlashlight();
                  bump();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/50 text-xs font-semibold px-2.5 py-1.5 cursor-pointer"
              >
                <Flashlight className="w-3.5 h-3.5" />
                {flashlightHeld ? 'Flashlight On' : 'Flashlight Off'}
              </button>
              {leftMem && (
                <button
                  type="button"
                  onClick={() => onSelectMemory(leftMem)}
                  className="rounded-xl bg-[#C9A66B]/20 hover:bg-[#C9A66B]/30 border border-[#C9A66B]/50 text-xs text-[#FFE2B5] px-2.5 py-1.5 cursor-pointer truncate max-w-[170px]"
                >
                  Inspect: {leftMem.title}
                </button>
              )}
              {rightMem && (
                <button
                  type="button"
                  onClick={() => onSelectMemory(rightMem)}
                  className="rounded-xl bg-[#C9A66B]/20 hover:bg-[#C9A66B]/30 border border-[#C9A66B]/50 text-xs text-[#FFE2B5] px-2.5 py-1.5 cursor-pointer truncate max-w-[170px]"
                >
                  Inspect: {rightMem.title}
                </button>
              )}
            </div>
            {scrapbookState.photoMemories.length === 0 && (
              <p className="text-xs text-[#E8DED0]/80 italic">
                No photographs uploaded yet. Upload photo memories to populate this 3D scrapbook.
              </p>
            )}
          </div>
        );
      }

      case 'bedside_drawer': {
        const activeKeepsake = drawerState.keepsakeMemories[drawerState.selectedIndex];
        const dateMeta = activeKeepsake
          ? getAuthenticMemoryDateLabel(activeKeepsake)
          : { isUndated: true, label: null };
        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  controller.toggleBedsideDrawer();
                  bump();
                }}
                className="rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
              >
                {drawerState.isOpen ? 'Close Drawer' : 'Open Drawer'}
              </button>
              {drawerState.isOpen && (
                <button
                  type="button"
                  onClick={() => {
                    controller.setDrawerInspectingKeepsake(!drawerState.inspectingKeepsake);
                    bump();
                  }}
                  className="rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/50 text-xs font-semibold px-3 py-1.5 cursor-pointer"
                >
                  {drawerState.inspectingKeepsake ? 'Put Keepsake Back' : 'Pick Up & Inspect Keepsake'}
                </button>
              )}
              {drawerState.isOpen && drawerState.keepsakeMemories.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      controller.stepDrawerKeepsake(-1);
                      bump();
                    }}
                    className="rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/40 p-1.5 cursor-pointer"
                    aria-label="Previous keepsake"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      controller.stepDrawerKeepsake(1);
                      bump();
                    }}
                    className="rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/40 p-1.5 cursor-pointer"
                    aria-label="Next keepsake"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {drawerState.inspectingKeepsake && activeKeepsake && (
                <button
                  type="button"
                  onClick={() => onSelectMemory(activeKeepsake)}
                  className="rounded-xl bg-[#C9A66B]/20 hover:bg-[#C9A66B]/30 border border-[#C9A66B]/50 text-xs text-[#FFE2B5] px-2.5 py-1.5 cursor-pointer"
                >
                  Read Full Memory
                </button>
              )}
            </div>
            {drawerState.inspectingKeepsake && (
              activeKeepsake ? (
                <div className="rounded-xl bg-[#352E28]/90 border border-[#C9A66B]/35 px-3 py-2 text-xs">
                  <div className="font-semibold text-[#FFE2B5]">
                    {activeKeepsake.title}
                    {dateMeta.label ? ` · ${dateMeta.label}` : ''}
                  </div>
                  <p className="text-[#E8DED0]/90 mt-0.5 line-clamp-2">
                    {activeKeepsake.story || activeKeepsake.description || 'Personal uploaded keepsake.'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#E8DED0]/80 italic">
                  The drawer is tidy and empty.
                </p>
              )
            )}
          </div>
        );
      }

      case 'crt_computer':
      case 'wired_headphones': {
        const apps: { id: CrtAppView; label: string }[] = [
          { id: 'desktop', label: 'Desktop' },
          { id: 'videos', label: `My Videos (${crtCatalog.videos.length})` },
          { id: 'music', label: `My Music (${crtCatalog.music.length})` },
          { id: 'voices', label: `Voice Memories (${crtCatalog.voices.length})` },
          { id: 'folders', label: `Memory Folders (${crtCatalog.folders.length})` },
        ];
        const currentList =
          crtState.appView === 'videos'
            ? crtCatalog.videos
            : crtState.appView === 'music'
              ? crtCatalog.music
              : crtState.appView === 'voices'
                ? crtCatalog.voices
                : crtState.appView === 'folders'
                  ? crtCatalog.folders
                  : [];
        const selectedItem = currentList[crtState.selectedIndex];

        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  controller.setCrtPower(!crtState.poweredOn);
                  bump();
                }}
                className={`inline-flex items-center gap-1 rounded-xl border text-xs font-semibold px-2.5 py-1.5 cursor-pointer ${
                  crtState.poweredOn
                    ? 'bg-[#2E5238] border-[#6BE89C]/70 text-[#DFFFEA]'
                    : 'bg-[#352E28] border-[#C9A66B]/40 text-[#FFFCF6]'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {crtState.poweredOn ? 'Power On' : 'Boot CRT'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleHeadphones();
                  bump();
                }}
                className={`inline-flex items-center gap-1 rounded-xl border text-xs font-semibold px-2.5 py-1.5 cursor-pointer ${
                  headphonesWorn
                    ? 'bg-[#4A3B28] border-[#FFE2B5] text-[#FFE2B5]'
                    : 'bg-[#352E28] hover:bg-[#443A32] border-[#C9A66B]/40 text-[#FFFCF6]'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                {headphonesWorn ? 'Remove Headphones' : 'Wear Headphones'}
              </button>
              {crtState.poweredOn &&
                apps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      controller.setCrtAppView(app.id);
                      bump();
                    }}
                    className={`rounded-xl text-xs font-semibold px-2.5 py-1.5 border cursor-pointer ${
                      crtState.appView === app.id
                        ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                        : 'bg-[#352E28] hover:bg-[#443A32] text-[#FFFCF6] border-[#C9A66B]/35'
                    }`}
                  >
                    {app.label}
                  </button>
                ))}
            </div>

            {crtState.poweredOn && crtState.appView !== 'desktop' && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {currentList.length === 0 ? (
                  <span className="text-xs text-[#E8DED0]/80 italic">
                    No uploaded files in this folder yet.
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        controller.selectCrtItem(
                          (crtState.selectedIndex - 1 + currentList.length) % currentList.length,
                        );
                        bump();
                      }}
                      className="rounded-lg bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/40 p-1.5 cursor-pointer"
                      aria-label="Previous item"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-[#FFE2B5] font-semibold max-w-[180px] truncate">
                      {selectedItem?.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        controller.selectCrtItem((crtState.selectedIndex + 1) % currentList.length);
                        bump();
                      }}
                      className="rounded-lg bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/40 p-1.5 cursor-pointer"
                      aria-label="Next item"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {crtState.appView !== 'folders' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            controller.toggleCrtMediaPlay();
                            bump();
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
                        >
                          {crtState.isPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" /> Play
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            controller.toggleCrtMute();
                            bump();
                          }}
                          className="rounded-lg bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/40 p-1.5 cursor-pointer"
                          aria-label={crtState.muted ? 'Unmute media' : 'Mute media'}
                        >
                          {crtState.muted ? (
                            <VolumeX className="w-3.5 h-3.5 text-[#E8DED0]" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 text-[#FFE2B5]" />
                          )}
                        </button>
                      </>
                    ) : (
                      selectedItem && (
                        <button
                          type="button"
                          onClick={() => onSelectMemory(selectedItem)}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> Open Full Memory
                        </button>
                      )
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'bedroom_window': {
        return (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                controller.toggleWindowCurtains();
                bump();
              }}
              className="rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
            >
              {curtainsOpen ? 'Draw Curtains Together' : 'Part Curtains Open'}
            </button>
            <span className="text-xs text-[#E8DED0]/85">
              Looking out over your sunlit Childhood Memory Park.
            </span>
          </div>
        );
      }

      case 'memory_radio': {
        const audioList = controller.getMemoriesForInteraction('memory_radio');
        const activeTrack =
          audioList.find((m) => m.id === selectedRadioId) || audioList[0] || null;

        const handleToggleRadioPlay = async () => {
          const el = radioAudioRef.current;
          if (!el || !activeTrack?.mediaUrl) return;
          setRadioError(null);
          if (radioPlaying) {
            el.pause();
            setRadioPlaying(false);
            return;
          }
          try {
            el.volume = radioVolume;
            await el.play();
            setRadioPlaying(true);
          } catch {
            setRadioPlaying(false);
            setRadioError('Unable to play this audio track in the browser.');
          }
        };

        const handleSelectTrack = (track: Memory) => {
          bedroomSfx.play('radio_dial');
          if (radioAudioRef.current) {
            radioAudioRef.current.pause();
            radioAudioRef.current.currentTime = 0;
          }
          setRadioPlaying(false);
          setRadioCurrentTime(0);
          setRadioDuration(0);
          setRadioError(null);
          setSelectedRadioId(track.id);
        };

        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-[#E8DED0]/90">
                <Radio className="w-4 h-4 text-[#C9A66B] shrink-0" />
                <span>
                  {audioList.length > 0
                    ? `${audioList.length} uploaded music track${audioList.length === 1 ? '' : 's'} on this radio (never autoplays)`
                    : 'No music uploaded yet. Upload MP3, WAV, M4A, or OGG files to listen here.'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {onOpenAddMemory && (
                  <button
                    type="button"
                    onClick={onOpenAddMemory}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Upload Music
                  </button>
                )}
                {onOpenRadioStation && audioList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (radioAudioRef.current) radioAudioRef.current.pause();
                      setRadioPlaying(false);
                      bedroomSfx.play('radio_dial');
                      onOpenRadioStation();
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/40 text-xs font-medium text-[#FFE2B5] px-2.5 py-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Full Panel
                  </button>
                )}
              </div>
            </div>

            {activeTrack && (
              <div className="rounded-xl bg-[#1E1915] border border-[#C9A66B]/45 p-3 space-y-2.5">
                <audio
                  ref={radioAudioRef}
                  key={activeTrack.id}
                  src={activeTrack.mediaUrl || undefined}
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (Number.isFinite(dur)) setRadioDuration(dur);
                  }}
                  onTimeUpdate={(e) => {
                    setRadioCurrentTime(e.currentTarget.currentTime);
                  }}
                  onEnded={() => {
                    setRadioPlaying(false);
                    setRadioCurrentTime(0);
                  }}
                  onError={() => {
                    setRadioPlaying(false);
                    setRadioError('This audio format could not be decoded by the browser.');
                  }}
                  className="hidden"
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#C9A66B]">
                      Selected Track
                    </p>
                    <p className="text-sm font-semibold text-[#FFE2B5] truncate">
                      {activeTrack.title}
                    </p>
                    {activeTrack.mediaFileName && (
                      <p className="text-[11px] text-[#E8DED0]/70 truncate">
                        {activeTrack.mediaFileName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectMemory(activeTrack)}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/40 text-[11px] font-medium text-[#FFE2B5] cursor-pointer"
                  >
                    Details
                  </button>
                </div>

                {/* Controls + Seek + Volume */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleToggleRadioPlay()}
                    disabled={!activeTrack.mediaUrl}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] disabled:opacity-40 text-[#27231F] font-semibold text-xs px-3.5 py-2 cursor-pointer"
                  >
                    {radioPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Play
                      </>
                    )}
                  </button>

                  <div className="flex-1 min-w-[140px] flex items-center gap-2">
                    <span className="text-[11px] font-mono-tabular text-[#E8DED0]/80 w-9 text-right">
                      {formatAudioSeconds(radioCurrentTime)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={radioDuration || 100}
                      step={0.1}
                      value={radioDuration > 0 ? Math.min(radioCurrentTime, radioDuration) : 0}
                      onChange={(e) => {
                        const nextTime = parseFloat(e.target.value);
                        setRadioCurrentTime(nextTime);
                        if (radioAudioRef.current && radioDuration > 0) {
                          radioAudioRef.current.currentTime = nextTime;
                        }
                      }}
                      aria-label="Seek track position"
                      className="flex-1 accent-[#C9A66B] cursor-pointer"
                    />
                    <span className="text-[11px] font-mono-tabular text-[#E8DED0]/80 w-9">
                      {formatAudioSeconds(radioDuration)}
                    </span>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs text-[#E8DED0]">
                    <Volume2 className="w-3.5 h-3.5 text-[#C9A66B]" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={radioVolume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setRadioVolume(v);
                        if (radioAudioRef.current) {
                          radioAudioRef.current.volume = v;
                        }
                      }}
                      aria-label="Radio volume"
                      className="w-20 accent-[#C9A66B] cursor-pointer"
                    />
                  </label>
                </div>

                {radioError && (
                  <p className="text-[11px] text-[#FCA5A5]">{radioError}</p>
                )}
              </div>
            )}

            {/* Playlist of uploaded music tracks */}
            {audioList.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {audioList.map((track) => {
                  const isCurrent = activeTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors ${
                        isCurrent
                          ? 'bg-[#3C2D22] border-[#C9A66B] text-[#FFE2B5]'
                          : 'bg-[#1E1915] border-[#493629] text-[#E8DED0] hover:border-[#C9A66B]/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectTrack(track)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <Music className="w-3.5 h-3.5 text-[#C9A66B] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{track.title}</p>
                          {track.mediaFileName && (
                            <p className="text-[10px] opacity-75 truncate">
                              {track.mediaFileName}
                            </p>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-[#27231F] text-[#FFE2B5]">
                          {isCurrent ? (radioPlaying ? 'Playing' : 'Selected') : 'Select'}
                        </span>
                        {onDeleteMemory && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isCurrent && radioAudioRef.current) {
                                radioAudioRef.current.pause();
                                setRadioPlaying(false);
                              }
                              onDeleteMemory(track.id);
                            }}
                            aria-label={`Remove ${track.title}`}
                            title="Remove music track"
                            className="p-1.5 rounded-lg text-[#E8DED0]/70 hover:text-[#FCA5A5] hover:bg-[#4A2525]/60 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'memory_projector': {
        const videoList = projectorState.videoMemories;
        const activeVideo = videoList[projectorState.slideIndex] || videoList[0] || null;
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    controller.toggleProjector();
                    bump();
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border text-xs font-semibold px-3 py-1.5 cursor-pointer ${
                    projectorState.poweredOn
                      ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                      : 'bg-[#352E28] hover:bg-[#443A32] text-[#FFFCF6] border-[#C9A66B]/45'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {projectorState.poweredOn ? 'Projector On' : 'Switch Projector On'}
                </button>
                {videoList.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        controller.stepProjectorSlide(-1);
                        bump();
                      }}
                      className="rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/45 px-2.5 py-1.5 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="text-xs font-mono-tabular text-[#FFE2B5]">
                      {projectorState.slideIndex + 1} / {videoList.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        controller.stepProjectorSlide(1);
                        bump();
                      }}
                      className="rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/45 px-2.5 py-1.5 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {activeVideo && (
                  <button
                    type="button"
                    onClick={() => onSelectMemory(activeVideo)}
                    className="rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/45 text-xs text-[#FFE2B5] px-2.5 py-1.5 cursor-pointer"
                  >
                    Details
                  </button>
                )}
                {onOpenAddMemory && (
                  <button
                    type="button"
                    onClick={onOpenAddMemory}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Upload Video
                  </button>
                )}
              </div>
            </div>

            {videoList.length === 0 ? (
              <p className="text-xs text-[#E8DED0]/85 italic py-1">
                No videos uploaded yet. Upload MP4, MOV, or WEBM videos to play them in the projector.
              </p>
            ) : (
              <>
                {activeVideo && activeVideo.mediaUrl && (
                  <div className="rounded-xl overflow-hidden border border-[#C9A66B]/40 bg-black">
                    <VideoMemoryPlayer
                      key={activeVideo.id}
                      src={activeVideo.mediaUrl}
                      poster={activeVideo.customImageUrl}
                      title={activeVideo.title}
                      variant="detail"
                      aspectClassName="aspect-video max-h-60"
                    />
                  </div>
                )}

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {videoList.map((vid, idx) => {
                    const isCurrent = activeVideo?.id === vid.id;
                    return (
                      <div
                        key={vid.id}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors ${
                          isCurrent
                            ? 'bg-[#3C2D22] border-[#C9A66B] text-[#FFE2B5]'
                            : 'bg-[#1E1915] border-[#493629] text-[#E8DED0] hover:border-[#C9A66B]/50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            controller.selectProjectorIndex(idx);
                            bump();
                          }}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <Film className="w-3.5 h-3.5 text-[#C9A66B] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{vid.title}</p>
                            {vid.mediaFileName && (
                              <p className="text-[10px] opacity-75 truncate">
                                {vid.mediaFileName}
                              </p>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-[#27231F] text-[#FFE2B5]">
                            {isCurrent ? 'Selected' : 'Play'}
                          </span>
                          {onDeleteMemory && (
                            <button
                              type="button"
                              onClick={() => onDeleteMemory(vid.id)}
                              aria-label={`Remove ${vid.title}`}
                              title="Remove video"
                              className="p-1.5 rounded-lg text-[#E8DED0]/70 hover:text-[#FCA5A5] hover:bg-[#4A2525]/60 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      }

      case 'cricket_set': {
        const sportMems = controller.getMemoriesForInteraction('cricket_set');
        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onTriggerCricketSwing();
                  bump();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Swing Cricket Bat
              </button>
              <span className="text-xs text-[#E8DED0]/85">
                Pick up the bat for a backyard drive & revisit cricket memories.
              </span>
            </div>
            {renderMemoryStrip(
              sportMems,
              'No cricket or sports memories uploaded yet.',
            )}
          </div>
        );
      }

      case 'wall_clock_calendar': {
        const { dated, undated } = controller.getVerifiedTimelineMemories();
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-[#FFE2B5]">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                Verified Memory Timeline — {dated.length} dated
                {undated.length > 0 ? `, ${undated.length} undated` : ''}
              </span>
            </div>
            {dated.length === 0 && undated.length === 0 ? (
              <p className="text-xs text-[#E8DED0]/80 italic">
                No uploaded memories in this room yet. Dates appear here strictly from verified memory metadata.
              </p>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {dated.map((m) => {
                  const dm = getAuthenticMemoryDateLabel(m);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelectMemory(m)}
                      className="shrink-0 rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/45 px-2.5 py-1.5 text-left cursor-pointer"
                    >
                      <div className="text-[11px] font-mono-tabular text-[#C9A66B]">
                        {dm.label}
                      </div>
                      <div className="text-xs font-semibold text-[#FFFCF6] max-w-[140px] truncate">
                        {m.title}
                      </div>
                    </button>
                  );
                })}
                {undated.slice(0, 4).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMemory(m)}
                    className="shrink-0 rounded-xl bg-[#352E28]/70 hover:bg-[#443A32] border border-[#C9A66B]/25 px-2.5 py-1.5 text-left cursor-pointer"
                  >
                    <div className="text-[11px] font-mono-tabular text-[#E8DED0]/65">
                      Undated
                    </div>
                    <div className="text-xs font-semibold text-[#FFFCF6] max-w-[140px] truncate">
                      {m.title}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'trophy_shelf':
        return renderMemoryStrip(
          controller.getMemoriesForInteraction('trophy_shelf'),
          'No certificate or achievement memories uploaded yet.',
        );

      case 'cork_pinboard':
        return renderPhotoGalleryGrid(
          controller.getMemoriesForInteraction('cork_pinboard'),
          'No photos uploaded yet. Upload JPG, PNG, or WEBP photos to display them here.',
          'Photo Display',
        );

      case 'drawing_wall':
        return renderMemoryStrip(
          controller.getMemoriesForInteraction('drawing_wall'),
          'No drawings or artwork uploaded yet.',
        );

      case 'wardrobe':
        return renderPhotoGalleryGrid(
          controller.getMemoriesForInteraction('wardrobe'),
          'Cupboard is open. Upload JPG, PNG, or WEBP photos to store and browse them here.',
          'Cupboard',
        );

      case 'school_bag':
        return renderMemoryStrip(
          controller.getMemoriesForInteraction('school_bag'),
          'School bag opened. No school-tagged memories uploaded yet.',
        );

      default:
        return (
          <p className="text-xs text-[#E8DED0]/85">
            {zoneMeta?.subtitle || 'Inspecting childhood bedroom object.'}
          </p>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-label={title}
      className="pointer-events-none fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[min(95vw,720px)] px-2 sm:px-3"
    >
      <div className="pointer-events-auto bg-[#27231F]/95 text-[#FFFCF6] border border-[#C9A66B]/70 rounded-2xl px-4 py-3 shadow-2xl flex flex-col gap-2.5 max-h-[78dvh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-[#493629] pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {activeObjectId === 'crt_computer' ? (
              <Monitor className="w-4 h-4 text-[#C9A66B] shrink-0" />
            ) : activeObjectId === 'memory_radio' ? (
              <Radio className="w-4 h-4 text-[#C9A66B] shrink-0" />
            ) : activeObjectId === 'memory_projector' ? (
              <Film className="w-4 h-4 text-[#C9A66B] shrink-0" />
            ) : activeObjectId === 'wardrobe' || activeObjectId === 'cork_pinboard' ? (
              <ImageIcon className="w-4 h-4 text-[#C9A66B] shrink-0" />
            ) : (
              <BookOpen className="w-4 h-4 text-[#C9A66B] shrink-0" />
            )}
            <h2 className="text-sm font-semibold text-[#FFE2B5] truncate">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                bedroomSfx.toggleMuted();
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/40 px-2 py-1 text-[11px] text-[#E8DED0] cursor-pointer"
              aria-label={sfxMuted ? 'Unmute bedroom sound effects' : 'Mute bedroom sound effects'}
              title={sfxMuted ? 'Unmute subtle SFX' : 'Mute subtle SFX'}
            >
              {sfxMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#E8DED0]/70" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#FFE2B5]" />
              )}
              <span className="hidden sm:inline">{sfxMuted ? 'SFX Off' : 'SFX On'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg bg-[#352E28] hover:bg-[#4A3B28] border border-[#C9A66B]/60 px-2.5 py-1 text-xs font-semibold text-[#FFE2B5] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
              <kbd className="ml-0.5 text-[10px] font-mono-tabular opacity-80">Esc</kbd>
            </button>
          </div>
        </div>

        {renderBody()}
      </div>
    </div>
  );
};
