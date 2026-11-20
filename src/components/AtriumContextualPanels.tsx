import React from 'react';
import {
  Bike,
  Flower2,
  MessageSquare,
  Play,
  Pause,
  Radio,
  TreePine,
  Tv,
  Volume2,
  X,
} from 'lucide-react';
import { Collection, Memory } from '../types/museum';
import { ContextualWorldCatalog } from '../utils/roomExhibition3D';
import { VideoMemoryPlayer } from './VideoMemoryPlayer';
import { InteractiveObjectId3D } from '../types/aiStudio';

export interface AtriumContextualPanelsProps {
  activeContextualStation: string | null;
  setActiveContextualStation: (station: string | null) => void;
  bicycleRideActive: boolean;
  bicycleRidePaused: boolean;
  setBicycleRidePaused: React.Dispatch<React.SetStateAction<boolean>>;
  handleStopBicycleRide: () => void;
  contextualCatalog: ContextualWorldCatalog;
  onSelectMemory: (memory: Memory) => void;
  activeSpaceId: string;
  handleTriggerObject3D: (objectId: InteractiveObjectId3D) => void;
  selectedCinemaVideo: Memory | null;
  setSelectedCinemaVideo: (mem: Memory | null) => void;
  collections: Collection[];
  selectedRadioTrackId: string | null;
  setSelectedRadioTrackId: (id: string | null) => void;
  radioAudioRef: React.RefObject<HTMLAudioElement | null>;
  radioIsPlaying: boolean;
  setRadioIsPlaying: (playing: boolean) => void;
  radioVolume: number;
  setRadioVolume: (vol: number) => void;
}

export const AtriumContextualPanels: React.FC<AtriumContextualPanelsProps> = ({
  activeContextualStation,
  setActiveContextualStation,
  bicycleRideActive,
  bicycleRidePaused,
  setBicycleRidePaused,
  handleStopBicycleRide,
  contextualCatalog,
  onSelectMemory,
  activeSpaceId,
  handleTriggerObject3D,
  selectedCinemaVideo,
  setSelectedCinemaVideo,
  collections,
  selectedRadioTrackId,
  setSelectedRadioTrackId,
  radioAudioRef,
  radioIsPlaying,
  setRadioIsPlaying,
  radioVolume,
  setRadioVolume,
}) => {
  return (
    <>
      {/* 1. BICYCLE TRAIL RIDE MODE & CYCLING MEMORIES PANEL */}
      {(bicycleRideActive || activeContextualStation === 'bicycle') && (
        <aside
          aria-label="Bicycle Trail Memory Ride"
          data-ui-interactive="true"
          className="fixed bottom-16 left-4 sm:left-6 z-30 w-[min(420px,calc(100vw-2rem))] rounded-2xl bg-[#27231F]/96 text-[#FFFCF6] border border-[#C9A66B]/70 shadow-2xl p-4 space-y-3 pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-[#C9A66B]" />
              <div>
                <p className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#C9A66B]">
                  Childhood Park • Bicycle Trail
                </p>
                <h3 className="font-serif-display text-base font-semibold text-[#FFE2B5]">
                  {bicycleRidePaused
                    ? 'Stopped Along Bicycle Trail'
                    : 'Riding the Childhood Bicycle Trail'}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {bicycleRideActive && (
                <button
                  type="button"
                  onClick={() => setBicycleRidePaused((p) => !p)}
                  className="px-2.5 py-1 rounded-lg bg-[#3C2D22] hover:bg-[#493629] text-[#FFE2B5] border border-[#C9A66B]/40 text-xs font-semibold cursor-pointer"
                >
                  {bicycleRidePaused ? 'Resume Ride' : 'Stop & Look'}
                </button>
              )}
              <button
                type="button"
                onClick={handleStopBicycleRide}
                className="px-2.5 py-1 rounded-lg bg-[#C9A66B] hover:bg-[#FFE2B5] text-[#27231F] text-xs font-bold cursor-pointer"
              >
                Dismount
              </button>
            </div>
          </div>

          <p className="text-xs text-[#E8DED0]/85 leading-relaxed">
            {contextualCatalog.bicycleTrailMemories.length > 0
              ? 'Cycling memories placed along the backyard trail. Click any memory below or in the 3D scene to stop and inspect it:'
              : 'Ride along the perimeter garden path. Upload cycling or outdoor adventure photos to display them on trail easels.'}
          </p>

          {contextualCatalog.bicycleTrailMemories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {contextualCatalog.bicycleTrailMemories.map((mem) => (
                <button
                  key={mem.id}
                  type="button"
                  onClick={() => {
                    setBicycleRidePaused(true);
                    onSelectMemory(mem);
                  }}
                  className="shrink-0 w-44 text-left p-2.5 rounded-xl bg-[#1E1915] hover:bg-[#3C2D22] border border-[#C9A66B]/40 transition-colors cursor-pointer"
                >
                  <p className="font-serif-display text-xs font-semibold text-[#FFE2B5] truncate">
                    {mem.title}
                  </p>
                  <p className="text-[10px] text-[#E8DED0]/75 truncate mt-0.5">
                    {mem.date || mem.year || 'Trail Memory'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* 2. TREEHOUSE FRIENDSHIP PHOTOS & ARCHIVED CONVERSATIONS */}
      {activeContextualStation === 'treehouse' && (
        <aside
          aria-label="Treehouse Friendship & Chat Memories"
          data-ui-interactive="true"
          className="fixed top-16 left-4 sm:left-6 z-30 w-[min(420px,calc(100vw-2rem))] max-h-[72vh] overflow-y-auto rounded-2xl bg-[#27231F]/96 text-[#FFFCF6] border border-[#C9A66B]/70 shadow-2xl p-4 space-y-3 pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TreePine className="w-4 h-4 text-[#C9A66B]" />
              <div>
                <p className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#C9A66B]">
                  Elevated Wooden Treehouse
                </p>
                <h3 className="font-serif-display text-base font-semibold text-[#FFE2B5]">
                  Friendship Photos & Archived Chats
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveContextualStation(null)}
              aria-label="Close Treehouse Explorer"
              className="p-1 rounded-lg text-[#E8DED0] hover:bg-[#3C2D22] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTriggerObject3D('treehouse_ladder')}
              className="px-3 py-1.5 rounded-xl bg-[#3C2D22] hover:bg-[#493629] text-[#FFE2B5] border border-[#C9A66B]/50 text-xs font-semibold cursor-pointer"
            >
              {activeSpaceId === 'treehouse'
                ? 'Climb Down Ladder'
                : 'Climb Up to Treehouse Loft'}
            </button>
          </div>

          {contextualCatalog.treehouseMemories.length === 0 ? (
            <p className="text-xs text-[#E8DED0]/80">
              Upload friendship photographs or chat exports (.txt / .json) to display and replay them inside the Treehouse.
            </p>
          ) : (
            <div className="space-y-2">
              {contextualCatalog.treehouseMemories.map((mem) => {
                const chatList =
                  mem.chatLines ||
                  mem.curationReport?.parsedChatMessages ||
                  [];
                const isChat =
                  mem.type === 'chat' ||
                  mem.mediaType === 'chat' ||
                  chatList.length > 0;
                return (
                  <button
                    key={mem.id}
                    type="button"
                    onClick={() => onSelectMemory(mem)}
                    className="w-full text-left p-3 rounded-xl bg-[#1E1915] hover:bg-[#3C2D22] border border-[#C9A66B]/40 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#C9A66B] flex items-center gap-1">
                        {isChat && <MessageSquare className="w-3 h-3" />}
                        {isChat
                          ? `Archived Conversation (${chatList.length || 1} msgs)`
                          : 'Friendship Memory'}
                      </span>
                      <p className="font-serif-display text-sm font-semibold text-[#FFE2B5] truncate">
                        {mem.title}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#C9A66B] text-[#27231F] text-[11px] font-bold shrink-0">
                      {isChat ? 'Replay Chat' : 'Open'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>
      )}

      {/* 3. OUTDOOR CINEMA VIDEO COLLECTIONS & VIDEO PLAYER */}
      {activeContextualStation === 'cinema' && (
        <aside
          aria-label="Outdoor Cinema Video Collections"
          data-ui-interactive="true"
          className="fixed top-16 left-4 sm:left-6 z-30 w-[min(460px,calc(100vw-2rem))] max-h-[78vh] overflow-y-auto rounded-2xl bg-[#27231F]/96 text-[#FFFCF6] border border-[#C9A66B]/70 shadow-2xl p-4 space-y-3 pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-[#C9A66B]" />
              <div>
                <p className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#C9A66B]">
                  Outdoor Cinema & Screening Corner
                </p>
                <h3 className="font-serif-display text-base font-semibold text-[#FFE2B5]">
                  Video Collections & Home Films
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCinemaVideo(null);
                setActiveContextualStation(null);
              }}
              aria-label="Close Outdoor Cinema"
              className="p-1 rounded-lg text-[#E8DED0] hover:bg-[#3C2D22] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedCinemaVideo ? (
            <div className="space-y-2">
              <VideoMemoryPlayer
                src={selectedCinemaVideo.mediaUrl || ''}
                poster={selectedCinemaVideo.customImageUrl}
                title={selectedCinemaVideo.title}
                variant="detail"
              />
              <div className="flex items-center justify-between text-xs text-[#E8DED0]">
                <button
                  type="button"
                  onClick={() => setSelectedCinemaVideo(null)}
                  className="px-2.5 py-1 rounded-lg bg-[#3C2D22] text-[#FFE2B5] font-semibold cursor-pointer"
                >
                  ← Back to Video List
                </button>
                <button
                  type="button"
                  onClick={() => onSelectMemory(selectedCinemaVideo)}
                  className="text-[#FFE2B5] underline cursor-pointer"
                >
                  Open Full Curatorial Details
                </button>
              </div>
            </div>
          ) : contextualCatalog.cinemaVideos.length === 0 ? (
            <p className="text-xs text-[#E8DED0]/80">
              No video memories uploaded yet. Upload MP4 or WebM videos via Add Memories to screen them here.
            </p>
          ) : (
            <div className="space-y-2">
              {contextualCatalog.cinemaVideos.map((videoMem) => {
                const colTitle =
                  collections.find((c) =>
                    c.memoryIds.includes(videoMem.id),
                  )?.title || 'Video Archive';
                return (
                  <div
                    key={videoMem.id}
                    className="p-3 rounded-xl bg-[#1E1915] border border-[#C9A66B]/40 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#C9A66B] block">
                        {colTitle}
                      </span>
                      <p className="font-serif-display text-sm font-semibold text-[#FFE2B5] truncate">
                        {videoMem.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedCinemaVideo(videoMem)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#C9A66B] hover:bg-[#FFE2B5] text-[#27231F] text-xs font-bold cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Play
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectMemory(videoMem)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#3C2D22] text-[#FFE2B5] text-xs cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      )}

      {/* 4. MEMORY RADIO AUDIO COLLECTIONS & VOICE PLAYER (Never Autoplays) */}
      {activeContextualStation === 'radio' && (
        <aside
          aria-label="Memory Radio Audio Collections"
          data-ui-interactive="true"
          className="fixed top-16 left-4 sm:left-6 z-30 w-[min(440px,calc(100vw-2rem))] max-h-[75vh] overflow-y-auto rounded-2xl bg-[#27231F]/96 text-[#FFFCF6] border border-[#C9A66B]/70 shadow-2xl p-4 space-y-3 pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#C9A66B]" />
              <div>
                <p className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#C9A66B]">
                  Memory Radio • Voice & Audio Archive
                </p>
                <h3 className="font-serif-display text-base font-semibold text-[#FFE2B5]">
                  Audio Collections & Voice Notes
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (radioAudioRef.current) {
                  radioAudioRef.current.pause();
                }
                setRadioIsPlaying(false);
                setActiveContextualStation(null);
              }}
              aria-label="Close Memory Radio"
              className="p-1 rounded-lg text-[#E8DED0] hover:bg-[#3C2D22] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {contextualCatalog.audioTracks.length === 0 ? (
            <p className="text-xs text-[#E8DED0]/80">
              No audio recordings uploaded yet. Upload MP3, WAV, or M4A voice notes via Add Memories to listen here.
            </p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const activeTrack =
                  contextualCatalog.audioTracks.find(
                    (t) => t.memory.id === selectedRadioTrackId,
                  ) || contextualCatalog.audioTracks[0];
                const audioSrc = activeTrack?.memory.mediaUrl || '';
                const activeColTitle = activeTrack
                  ? collections.find((c) =>
                      c.memoryIds.includes(activeTrack.memory.id),
                    )?.title || 'Voice & Audio Archive'
                  : 'Voice & Audio Archive';

                return (
                  activeTrack && (
                    <div className="p-3 rounded-xl bg-[#1E1915] border border-[#C9A66B]/60 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#C9A66B] block">
                            Selected Track • {activeColTitle}
                          </span>
                          <p className="font-serif-display text-sm font-semibold text-[#FFE2B5] truncate">
                            {activeTrack.memory.title}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectMemory(activeTrack.memory)}
                          className="px-2.5 py-1 rounded-lg bg-[#3C2D22] text-[#FFE2B5] text-[11px] font-semibold cursor-pointer"
                        >
                          Transcript & Details
                        </button>
                      </div>

                      {audioSrc ? (
                        <>
                          <audio
                            ref={radioAudioRef}
                            src={audioSrc}
                            preload="metadata"
                            onPlay={() => setRadioIsPlaying(true)}
                            onPause={() => setRadioIsPlaying(false)}
                            onEnded={() => setRadioIsPlaying(false)}
                            className="hidden"
                          />
                          <div className="flex items-center justify-between gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const el = radioAudioRef.current;
                                if (!el) return;
                                if (el.paused) {
                                  el.volume = radioVolume;
                                  el.play().catch(() => {});
                                } else {
                                  el.pause();
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C9A66B] hover:bg-[#FFE2B5] text-[#27231F] text-xs font-bold cursor-pointer"
                            >
                              {radioIsPlaying ? (
                                <>
                                  <Pause className="w-3.5 h-3.5" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5" />
                                  Play Recording
                                </>
                              )}
                            </button>

                            <label className="flex items-center gap-2 text-[11px] text-[#E8DED0]">
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
                                aria-label="Memory Radio Volume"
                                className="w-24 accent-[#C9A66B]"
                              />
                            </label>
                          </div>
                        </>
                      ) : (
                        <p className="text-[11px] text-[#E8DED0]/80">
                          Open Transcript & Details to read this voice memory record.
                        </p>
                      )}
                    </div>
                  )
                );
              })()}

              <div className="space-y-1.5">
                {contextualCatalog.audioTracks.map((entry) => {
                  const isSelected =
                    entry.memory.id ===
                    (selectedRadioTrackId ||
                      contextualCatalog.audioTracks[0]?.memory.id);
                  const entryColTitle =
                    collections.find((c) =>
                      c.memoryIds.includes(entry.memory.id),
                    )?.title || 'Voice & Audio Archive';
                  return (
                    <button
                      key={entry.memory.id}
                      type="button"
                      onClick={() => {
                        if (radioAudioRef.current) {
                          radioAudioRef.current.pause();
                        }
                        setRadioIsPlaying(false);
                        setSelectedRadioTrackId(entry.memory.id);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#3C2D22] border-[#C9A66B] text-[#FFE2B5]'
                          : 'bg-[#1E1915] border-[#493629] text-[#E8DED0] hover:border-[#C9A66B]/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono-tabular text-[#C9A66B] block">
                          {entryColTitle}
                        </span>
                        <p className="text-xs font-semibold truncate">
                          {entry.memory.title}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-[#27231F] text-[#FFE2B5]">
                        {isSelected ? 'Selected' : 'Select'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* 5. MEMORY GARDEN PHOTOGRAPH BROWSER */}
      {activeContextualStation === 'garden' && (
        <aside
          aria-label="Memory Garden Photographs"
          data-ui-interactive="true"
          className="fixed top-16 left-4 sm:left-6 z-30 w-[min(420px,calc(100vw-2rem))] max-h-[72vh] overflow-y-auto rounded-2xl bg-[#27231F]/96 text-[#FFFCF6] border border-[#C9A66B]/70 shadow-2xl p-4 space-y-3 pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flower2 className="w-4 h-4 text-[#C9A66B]" />
              <div>
                <p className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#C9A66B]">
                  Childhood Park • Memory Garden
                </p>
                <h3 className="font-serif-display text-base font-semibold text-[#FFE2B5]">
                  Garden Trail Photographs
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveContextualStation(null)}
              aria-label="Close Memory Garden"
              className="p-1 rounded-lg text-[#E8DED0] hover:bg-[#3C2D22] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#E8DED0]/85 leading-relaxed">
            Related photographs displayed along the sunlit garden trail easels. Click any photograph below or on the 3D garden easels to inspect:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {contextualCatalog.gardenTrailMemories.map((mem) => (
              <button
                key={mem.id}
                type="button"
                onClick={() => onSelectMemory(mem)}
                className="text-left p-2.5 rounded-xl bg-[#1E1915] hover:bg-[#3C2D22] border border-[#C9A66B]/40 transition-colors cursor-pointer"
              >
                <p className="font-serif-display text-xs font-semibold text-[#FFE2B5] truncate">
                  {mem.title}
                </p>
                <p className="text-[10px] text-[#E8DED0]/75 truncate mt-0.5">
                  {mem.location || mem.date || mem.year || 'Garden Exhibit'}
                </p>
              </button>
            ))}
          </div>
        </aside>
      )}
    </>
  );
};
