import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flashlight,
  FolderOpen,
  Headphones,
  Monitor,
  Pause,
  Play,
  Power,
  Radio,
  Sparkles,
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

interface BedroomInteractionOverlayProps {
  activeObjectId: InteractiveObjectId3D;
  controller: ChildhoodBedroomInteractionController;
  onClose: () => void;
  onSwitchInteraction: (objectId: InteractiveObjectId3D) => void;
  onSelectMemory: (memory: Memory) => void;
  onTriggerPageTurnHandAnim: () => void;
  onToggleFlashlight: () => boolean;
  onToggleHeadphones: () => boolean;
  onTriggerCricketSwing: () => void;
  onOpenRadioStation?: () => void;
  revision: number;
}

export const BedroomInteractionOverlay: React.FC<BedroomInteractionOverlayProps> = ({
  activeObjectId,
  controller,
  onClose,
  onSwitchInteraction,
  onSelectMemory,
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

  useEffect(() => bedroomSfx.subscribe(setSfxMuted), []);

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
        <p className="text-xs text-[#E8DED0]/85 italic py-1.5">
          {emptyMessage}
        </p>
      );
    }
    return (
      <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
        {items.slice(0, 8).map((mem) => {
          const effType = mem.mediaType || mem.type || 'image';
          const thumb =
            mem.customImageUrl ||
            (effType === 'image' || effType === 'certificate' ? mem.mediaUrl : undefined);
          const dateMeta = getAuthenticMemoryDateLabel(mem);
          return (
            <button
              key={mem.id}
              type="button"
              onClick={() => onSelectMemory(mem)}
              className="shrink-0 flex items-center gap-2 rounded-xl bg-[#352E28] hover:bg-[#443A32] border border-[#C9A66B]/40 px-2.5 py-1.5 text-left transition-colors cursor-pointer"
            >
              {thumb && (
                <img
                  src={thumb}
                  alt={mem.title}
                  className="w-8 h-8 rounded-lg object-cover border border-[#C9A66B]/40 shrink-0"
                />
              )}
              <div className="max-w-[140px]">
                <div className="text-xs font-semibold text-[#FFFCF6] truncate">
                  {mem.title}
                </div>
                <div className="text-[11px] text-[#E8DED0]/75 truncate">
                  {dateMeta.label || effType}
                </div>
              </div>
            </button>
          );
        })}
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
                  The drawer is tidy and empty. Upload a letter, diary note, or keepsake memory to store it here.
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
        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {onOpenRadioStation && (
                <button
                  type="button"
                  onClick={() => {
                    bedroomSfx.play('radio_dial');
                    onOpenRadioStation();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#C9A66B] hover:bg-[#D8B87E] text-[#27231F] font-semibold text-xs px-3 py-1.5 cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5" />
                  Open Full Audio Archive Player
                </button>
              )}
              <span className="text-xs text-[#E8DED0]/85">
                {audioList.length > 0
                  ? `${audioList.length} uploaded recording${audioList.length === 1 ? '' : 's'} ready (never autoplays).`
                  : 'No voice notes or songs uploaded yet.'}
              </span>
            </div>
            {renderMemoryStrip(
              audioList,
              'Upload voice memories or songs to listen on the bedside radio.',
            )}
          </div>
        );
      }

      case 'memory_projector': {
        const curPhoto = projectorState.photoMemories[projectorState.slideIndex];
        return (
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
              {projectorState.poweredOn ? 'Switch Projector Off' : 'Switch Projector On'}
            </button>
            {projectorState.poweredOn && projectorState.photoMemories.length > 0 && (
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
                  Slide {projectorState.slideIndex + 1} / {projectorState.photoMemories.length}
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
                {curPhoto && (
                  <button
                    type="button"
                    onClick={() => onSelectMemory(curPhoto)}
                    className="rounded-xl bg-[#C9A66B]/20 hover:bg-[#C9A66B]/30 border border-[#C9A66B]/50 text-xs text-[#FFE2B5] px-2.5 py-1.5 cursor-pointer truncate max-w-[180px]"
                  >
                    Inspect: {curPhoto.title}
                  </button>
                )}
              </>
            )}
            {projectorState.poweredOn && projectorState.photoMemories.length === 0 && (
              <span className="text-xs text-[#E8DED0]/80 italic">
                Upload photographs to project slides onto the bedroom screen.
              </span>
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
              'No cricket or sports memories uploaded yet. Tag a match photo with "cricket" or "sport" to link it here.',
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
          'No certificate or achievement memories uploaded yet. Upload a certificate or award photo to display it on this shelf.',
        );

      case 'cork_pinboard':
        return renderMemoryStrip(
          controller.getMemoriesForInteraction('cork_pinboard'),
          'No photographs uploaded yet. Upload childhood photos to pin them on this corkboard.',
        );

      case 'drawing_wall':
        return renderMemoryStrip(
          controller.getMemoriesForInteraction('drawing_wall'),
          'No drawings or artwork uploaded yet. Upload childhood sketches or paintings to hang them here.',
        );

      case 'wardrobe':
        return renderMemoryStrip(
          controller.getMemoriesForInteraction('wardrobe'),
          'Wardrobe door opened. Tag uploaded photos with "wardrobe", "outfit", or "uniform" to associate them here.',
        );

      case 'school_bag':
        return renderMemoryStrip(
          controller.getMemoriesForInteraction('school_bag'),
          'School bag opened. Tag uploaded photos or notes with "school", "class", or "notebook" to store them here.',
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
      className="pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 z-30 w-[min(94vw,680px)] px-3"
    >
      <div className="pointer-events-auto bg-[#27231F]/94 text-[#FFFCF6] border border-[#C9A66B]/70 rounded-2xl px-4 py-3 shadow-2xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3 border-b border-[#493629] pb-2">
          <div className="flex items-center gap-2 min-w-0">
            {activeObjectId === 'crt_computer' ? (
              <Monitor className="w-4 h-4 text-[#C9A66B] shrink-0" />
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
