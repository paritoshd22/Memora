import React, { useMemo, useState } from 'react';
import {
  Bike,
  Flower2,
  Headphones,
  ImageIcon,
  Plus,
  Radio,
  Shuffle,
  TreePine,
  Tv,
  Video,
} from 'lucide-react';
import type { Memory, Room } from '../types/museum';

export type ChildhoodStation = 'bicycle' | 'treehouse' | 'cinema' | 'radio' | 'garden';

interface ChildhoodRoomFallbackProps {
  room: Room;
  memories: Memory[];
  onSelectMemory: (memory: Memory) => void;
  onOpenAddMemory?: (roomId: string) => void;
  onOpenStation?: (station: ChildhoodStation) => void;
}

const STATIONS: {
  id: ChildhoodStation;
  label: string;
  hint: string;
  icon: typeof Bike;
  x: number;
  y: number;
}[] = [
  { id: 'bicycle', label: 'Bicycle Trail', hint: 'Ride past cycling memories', icon: Bike, x: 23, y: 72 },
  { id: 'treehouse', label: 'Treehouse', hint: 'Climb up to hidden keepsakes', icon: TreePine, x: 38, y: 30 },
  { id: 'cinema', label: 'Outdoor Cinema', hint: 'Screen your home videos', icon: Tv, x: 62, y: 55 },
  { id: 'radio', label: 'Memory Radio', hint: 'Tune into voices & sounds', icon: Radio, x: 87, y: 52 },
  { id: 'garden', label: 'Memory Garden', hint: 'Wander through blooming moments', icon: Flower2, x: 76, y: 88 },
];

type MediaFilter = 'all' | 'image' | 'video' | 'audio';

const FILTERS: { id: MediaFilter; label: string; icon?: typeof Bike }[] = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Photos', icon: ImageIcon },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audio', icon: Headphones },
];

const TILTS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', 'rotate-0', '-rotate-[1.5deg]'];

function mediaTypeOf(memory: Memory) {
  return memory.type ?? memory.mediaType ?? 'image';
}

function ParkScene({ onOpenStation }: { onOpenStation?: (station: ChildhoodStation) => void }) {
  const [hovered, setHovered] = useState<ChildhoodStation | null>(null);
  const active = STATIONS.find((s) => s.id === hovered);

  return (
    <figure className="mt-6 rounded-3xl overflow-hidden border border-[#C9A66B]/50 shadow-[0_20px_50px_-20px_rgba(39,35,31,0.45)] bg-[#E9DFCF]">
      <div className="relative">
      <img
        src="/images/childhood-park.png"
        alt="Illustrated childhood memory park with a bicycle trail, oak treehouse, outdoor cinema, radio booth and flower garden"
        className="block w-full aspect-[16/9] object-cover"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#27231F]/20 via-transparent to-transparent"
      />

      <ul className="absolute inset-0" aria-label="Park experiences">
        {STATIONS.map((station) => {
          const Icon = station.icon;
          return (
            <li
              key={station.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${station.x}%`, top: `${station.y}%` }}
            >
              <button
                type="button"
                aria-label={`${station.label}: ${station.hint}`}
                onClick={() => onOpenStation?.(station.id)}
                onMouseEnter={() => setHovered(station.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(station.id)}
                onBlur={() => setHovered(null)}
                className="group relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FFFCF6] text-[#27231F] border-2 border-[#C9A66B] shadow-lg transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFE2B5] cursor-pointer"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-[#C9A66B]/50 animate-ping motion-reduce:hidden"
                />
                <Icon className="relative w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </li>
          );
        })}
      </ul>
      </div>

      <figcaption
        aria-live="polite"
        className="flex items-center justify-between gap-3 bg-[#27231F] px-4 py-2.5 text-[#FFFCF6]"
      >
        <div className="min-w-0">
          <p className="font-serif-display text-base sm:text-lg leading-tight truncate">
            {active ? active.label : 'Explore the park'}
          </p>
          <p className="text-[11px] text-[#FFE2B5]/80 truncate">
            {active ? active.hint : 'Tap a glowing marker to step into an experience'}
          </p>
        </div>
        <span className="hidden sm:inline font-mono-tabular text-[10px] uppercase tracking-[0.2em] text-[#C9A66B] shrink-0">
          {STATIONS.length} spots
        </span>
      </figcaption>
    </figure>
  );
}

function Polaroid({
  memory,
  index,
  onSelect,
}: {
  memory: Memory;
  index: number;
  onSelect: (memory: Memory) => void;
}) {
  const type = mediaTypeOf(memory);
  const hasImage = memory.customImageUrl && !memory.customImageUrl.startsWith('idb:');
  const [a, b] = memory.palette ?? ['#E9DFCF', '#C9A66B'];
  const TypeIcon = type === 'video' ? Video : type === 'audio' ? Headphones : ImageIcon;

  return (
    <button
      type="button"
      onClick={() => onSelect(memory)}
      className={`group w-full text-left bg-[#FFFCF6] p-2 pb-3 rounded-sm shadow-[0_10px_25px_-12px_rgba(39,35,31,0.5)] transition-all duration-300 ${TILTS[index % TILTS.length]} hover:rotate-0 hover:-translate-y-1 hover:shadow-[0_18px_35px_-14px_rgba(39,35,31,0.55)] focus-visible:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A66B] cursor-pointer`}
    >
      <div
        className="relative aspect-square overflow-hidden flex items-center justify-center"
        style={hasImage ? undefined : { background: `linear-gradient(135deg, ${a}, ${b})` }}
      >
        {hasImage ? (
          <img
            src={memory.customImageUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <TypeIcon aria-hidden="true" className="w-7 h-7 text-[#FFFCF6]/90" />
        )}
        {type !== 'image' && hasImage && (
          <span className="absolute top-1.5 right-1.5 rounded-full bg-[#27231F]/75 p-1 text-[#FFE2B5]">
            <TypeIcon aria-hidden="true" className="w-3 h-3" />
          </span>
        )}
      </div>
      <p className="font-serif-display text-base text-[#27231F] mt-2 leading-tight truncate">
        {memory.title}
      </p>
      <p className="font-mono-tabular text-[10px] text-[#8A6A3F] mt-0.5 truncate">
        {[memory.year || null, memory.location || null].filter(Boolean).join(' · ') || 'Undated'}
      </p>
    </button>
  );
}

export function ChildhoodRoomFallback({
  room,
  memories,
  onSelectMemory,
  onOpenAddMemory,
  onOpenStation,
}: ChildhoodRoomFallbackProps) {
  const [filter, setFilter] = useState<MediaFilter>('all');

  const roomMemories = useMemo(
    () =>
      memories
        .filter((m) => m.roomId === room.id && !m.hiddenFrom3D)
        .sort((x, y) => (x.year || 9999) - (y.year || 9999)),
    [memories, room.id],
  );

  const counts = useMemo(() => {
    const c: Record<MediaFilter, number> = { all: roomMemories.length, image: 0, video: 0, audio: 0 };
    for (const m of roomMemories) {
      const t = mediaTypeOf(m);
      if (t === 'image' || t === 'video' || t === 'audio') c[t] += 1;
    }
    return c;
  }, [roomMemories]);

  const visible = filter === 'all' ? roomMemories : roomMemories.filter((m) => mediaTypeOf(m) === filter);

  const surprise = () => {
    if (roomMemories.length === 0) return;
    onSelectMemory(roomMemories[Math.floor(Math.random() * roomMemories.length)]);
  };

  const quote = room.curatorQuote?.replace(/^["“”']+|["“”']+$/g, '');

  return (
    <section aria-labelledby="childhood-room-title" className="w-full max-w-4xl">
      <header className="text-center">
        <p className="font-mono-tabular text-[11px] uppercase tracking-[0.25em] text-[#8A6A3F]">
          {room.wing} &middot; {roomMemories.length} {roomMemories.length === 1 ? 'memory' : 'memories'}
        </p>
        <h1
          id="childhood-room-title"
          className="font-serif-display text-4xl sm:text-5xl font-semibold text-[#27231F] mt-2 text-balance"
        >
          {room.name}
        </h1>
        {quote && (
          <p className="font-serif-display italic text-lg text-[#493629]/80 mt-2 max-w-lg mx-auto text-pretty">
            &ldquo;{quote}&rdquo;
          </p>
        )}
      </header>

      <ParkScene onOpenStation={onOpenStation} />

      <div className="mt-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="font-serif-display text-2xl font-semibold text-[#27231F]">Memory Wall</h2>
          <p className="text-xs text-[#493629]/75 mt-0.5">Pinned in the order they happened.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div role="tablist" aria-label="Filter memories" className="flex items-center gap-1 rounded-xl bg-[#27231F]/5 p-1">
            {FILTERS.filter((f) => f.id === 'all' || counts[f.id] > 0).map((f) => {
              const Icon = f.icon;
              const selected = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(f.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    selected ? 'bg-[#27231F] text-[#FFE2B5]' : 'text-[#493629] hover:bg-[#27231F]/10'
                  }`}
                >
                  {Icon && <Icon aria-hidden="true" className="w-3 h-3" />}
                  {f.label}
                  <span className="font-mono-tabular opacity-70">{counts[f.id]}</span>
                </button>
              );
            })}
          </div>
          {roomMemories.length > 1 && (
            <button
              type="button"
              onClick={surprise}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C9A66B]/60 bg-[#FFFCF6] text-[11px] font-semibold text-[#27231F] hover:border-[#C9A66B] hover:bg-[#FFF6E6] transition-colors cursor-pointer"
            >
              <Shuffle aria-hidden="true" className="w-3 h-3" />
              Surprise me
            </button>
          )}
        </div>
      </div>

      {visible.length > 0 ? (
        <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
          {visible.map((memory, i) => (
            <li key={memory.id}>
              <Polaroid memory={memory} index={i} onSelect={onSelectMemory} />
            </li>
          ))}
          {onOpenAddMemory && (
            <li>
              <button
                type="button"
                onClick={() => onOpenAddMemory(room.id)}
                className="w-full h-full min-h-40 flex flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-[#C9A66B]/60 text-[#8A6A3F] hover:border-[#C9A66B] hover:bg-[#FFFCF6]/70 transition-colors cursor-pointer"
              >
                <Plus aria-hidden="true" className="w-5 h-5" />
                <span className="text-xs font-semibold">Pin a memory</span>
              </button>
            </li>
          )}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[#C9A66B]/60 bg-[#FFFCF6]/70 p-8 text-center">
          <p className="font-serif-display text-xl text-[#27231F] text-balance">
            The memory wall is waiting for its first photograph.
          </p>
          <p className="text-xs text-[#493629]/75 mt-1">
            Add photos, videos or voice notes and they&apos;ll appear here and around the park.
          </p>
          {onOpenAddMemory && (
            <button
              type="button"
              onClick={() => onOpenAddMemory(room.id)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#27231F] text-[#FFE2B5] text-xs font-semibold hover:bg-[#18110B] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add a memory
            </button>
          )}
        </div>
      )}
    </section>
  );
}
