import React from 'react';
import { ArrowRight, ImageIcon, Lock, Plus } from 'lucide-react';
import type { Floor, Memory, Room } from '../types/museum';

interface AtriumFallbackViewProps {
  museumName: string;
  currentFloor: Floor | undefined;
  rooms: Room[];
  memories: Memory[];
  activeRoom: Room | null;
  onSelectRoom: (roomId: string | null) => void;
  onSelectMemory: (memory: Memory) => void;
  onOpenAddMemory?: (roomId: string) => void;
}

function Backdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#FFFCF6_0%,#F6F1E8_45%,#E9DFCF_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#D9CBB4]/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-6 sm:gap-10 opacity-[0.35]">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-16 sm:w-24 h-56 sm:h-80 rounded-t-full border-2 border-b-0 border-[#C9A66B]/60"
          />
        ))}
      </div>
      <div className="absolute inset-0 atrium-cinematic-vignette" />
    </div>
  );
}

function RoomDirectory({
  museumName,
  currentFloor,
  rooms,
  memories,
  onSelectRoom,
}: Pick<AtriumFallbackViewProps, 'museumName' | 'currentFloor' | 'rooms' | 'memories' | 'onSelectRoom'>) {
  const floorRooms = rooms
    .filter((r) => (currentFloor ? r.floorNumber === currentFloor.floorNumber : true))
    .sort((a, b) => a.slotIndex - b.slotIndex);

  return (
    <section aria-labelledby="fallback-directory-title" className="w-full max-w-3xl">
      <header className="text-center">
        <p className="font-mono-tabular text-[11px] uppercase tracking-[0.25em] text-[#8A6A3F]">
          {currentFloor?.name ?? 'Ground Floor'} &middot; Gallery Directory
        </p>
        <h1
          id="fallback-directory-title"
          className="font-serif-display text-4xl sm:text-5xl font-semibold text-[#27231F] mt-2 text-balance"
        >
          Welcome to {museumName}
        </h1>
        <p className="text-sm text-[#493629]/80 mt-3 max-w-md mx-auto leading-relaxed text-pretty">
          Choose a gallery to explore your memories. The immersive 3D atrium will return once your
          browser&apos;s graphics are available.
        </p>
      </header>

      <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {floorRooms.map((room) => {
          const count = memories.filter((m) => m.roomId === room.id).length;
          const isActive = room.status === 'active';
          return (
            <li key={room.id}>
              <button
                type="button"
                disabled={!isActive}
                onClick={() => onSelectRoom(room.id)}
                className="group w-full h-full text-left rounded-2xl border border-[#C9A66B]/40 bg-[#FFFCF6]/85 backdrop-blur-sm p-4 shadow-sm transition-all enabled:hover:border-[#C9A66B] enabled:hover:shadow-md enabled:hover:-translate-y-0.5 enabled:cursor-pointer disabled:opacity-55"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 ring-4 ring-[#F6F1E8]"
                    style={{ backgroundColor: isActive ? room.accentColor : '#B8AC9A' }}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif-display text-xl font-semibold text-[#27231F] leading-tight">
                      {isActive ? room.name : 'Empty Gallery'}
                    </h2>
                    <p className="text-xs text-[#493629]/75 mt-0.5 line-clamp-2">
                      {isActive ? room.subtitle : 'Reserved for a future collection'}
                    </p>
                    <p className="font-mono-tabular text-[11px] text-[#8A6A3F] mt-2">
                      {isActive ? `${count} ${count === 1 ? 'memory' : 'memories'}` : 'Not yet opened'}
                    </p>
                  </div>
                  {isActive ? (
                    <ArrowRight className="w-4 h-4 mt-1 text-[#C9A66B] transition-transform group-hover:translate-x-0.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 mt-1 text-[#B8AC9A]" />
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RoomFallback({
  room,
  memories,
  onSelectMemory,
  onOpenAddMemory,
}: {
  room: Room;
  memories: Memory[];
  onSelectMemory: (memory: Memory) => void;
  onOpenAddMemory?: (roomId: string) => void;
}) {
  const roomMemories = memories.filter((m) => m.roomId === room.id && !m.hiddenFrom3D);

  return (
    <section aria-labelledby="fallback-room-title" className="w-full max-w-3xl">
      <header className="text-center">
        <p className="font-mono-tabular text-[11px] uppercase tracking-[0.25em] text-[#8A6A3F]">
          {room.wing} &middot; {roomMemories.length} {roomMemories.length === 1 ? 'memory' : 'memories'}
        </p>
        <h1
          id="fallback-room-title"
          className="font-serif-display text-4xl sm:text-5xl font-semibold text-[#27231F] mt-2 text-balance"
        >
          {room.name}
        </h1>
        {room.curatorQuote && (
          <p className="font-serif-display italic text-lg text-[#493629]/80 mt-2 max-w-lg mx-auto text-pretty">
            &ldquo;{room.curatorQuote.replace(/^["“”']+|["“”']+$/g, '')}&rdquo;
          </p>
        )}
      </header>

      {roomMemories.length > 0 ? (
        <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {roomMemories.slice(0, 9).map((memory) => (
            <li key={memory.id}>
              <button
                type="button"
                onClick={() => onSelectMemory(memory)}
                className="group w-full text-left rounded-2xl overflow-hidden border border-[#C9A66B]/40 bg-[#FFFCF6]/90 shadow-sm transition-all hover:border-[#C9A66B] hover:shadow-md cursor-pointer"
              >
                <div className="aspect-[4/3] bg-[#E9DFCF] flex items-center justify-center overflow-hidden">
                  {memory.customImageUrl && !memory.customImageUrl.startsWith('idb:') ? (
                    <img
                      src={memory.customImageUrl}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <ImageIcon aria-hidden="true" className="w-6 h-6 text-[#C9A66B]" />
                  )}
                </div>
                <div className="p-3">
                  <h2 className="text-sm font-semibold text-[#27231F] truncate">{memory.title}</h2>
                  {memory.year ? (
                    <p className="font-mono-tabular text-[11px] text-[#8A6A3F] mt-0.5">{memory.year}</p>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-[#C9A66B]/60 bg-[#FFFCF6]/70 p-8 text-center">
          <p className="font-serif-display text-xl text-[#27231F]">This gallery is waiting for its first memory.</p>
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

export function AtriumFallbackView(props: AtriumFallbackViewProps) {
  const { activeRoom } = props;
  return (
    <div className="absolute inset-0 z-0">
      <Backdrop />
      <div className="relative h-full overflow-y-auto px-4 pt-36 sm:pt-24 pb-56 sm:pb-40 flex justify-center">
        <div className="w-full flex justify-center my-auto">
          {activeRoom ? (
            <RoomFallback
              room={activeRoom}
              memories={props.memories}
              onSelectMemory={props.onSelectMemory}
              onOpenAddMemory={props.onOpenAddMemory}
            />
          ) : (
            <RoomDirectory {...props} />
          )}
        </div>
      </div>
    </div>
  );
}
