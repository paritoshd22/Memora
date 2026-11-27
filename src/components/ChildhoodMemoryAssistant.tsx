import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  CHILDHOOD_WORLD_LOCATION_CATALOGUE,
  ChildhoodWorldLocationId,
  CurationBatchItemInput,
} from '../types/curation';
import { Memory } from '../types/museum';
import {
  buildDirectlyPlacedMemoryFromFile,
  prepareFileForAutoCuration,
  UPLOAD_ACCEPT_ATTRIBUTE,
  validateUploadFileCandidate,
} from '../utils/clientMediaExtractor';

interface AssistantChatEntry {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  modelUsed?: string;
  referencedMemoryIds?: string[];
  movedMemory?: {
    memoryId: string;
    memoryTitle: string;
    targetLocationLabel: string;
  };
  suggestedGroups?: Array<{
    title: string;
    memoryIds: string[];
    rationale: string;
  }>;
}

interface ChildhoodMemoryAssistantProps {
  visible: boolean;
  childhoodMemories: Memory[];
  selectedMemory: Memory | null;
  lastAddedMemory: Memory | null;
  userId?: string | null;
  sessionToken?: string | null;
  onStartQuickUpload: (items: CurationBatchItemInput[]) => void;
  onDirectUploadMemories?: (
    newMemories: Memory[],
  ) => Promise<{ ok: boolean; savedMemories: Memory[]; errorMessage?: string }>;
  onOpenFullUploadModal: () => void;
  onSelectMemoryById: (memoryId: string) => void;
  onMemoryUpdatedFromAssistant: (updatedMemory: Memory) => void;
}

export const ChildhoodMemoryAssistant: React.FC<ChildhoodMemoryAssistantProps> = ({
  visible,
  childhoodMemories,
  selectedMemory,
  lastAddedMemory,
  userId,
  sessionToken,
  onStartQuickUpload,
  onDirectUploadMemories,
  onOpenFullUploadModal,
  onSelectMemoryById,
  onMemoryUpdatedFromAssistant,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<AssistantChatEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastObservedIdRef = useRef<string | null>(null);
  const lastAddedIdRef = useRef<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const chatSeqRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Post-upload automatic greeting when a newly saved memory enters the Childhood Room
  useEffect(() => {
    if (!lastAddedMemory || lastAddedMemory.id === lastAddedIdRef.current) {
      return;
    }
    lastAddedIdRef.current = lastAddedMemory.id;
    const zoneLabel =
      (lastAddedMemory.curatedZoneId &&
        CHILDHOOD_WORLD_LOCATION_CATALOGUE[lastAddedMemory.curatedZoneId]?.label) ||
      lastAddedMemory.subtitle ||
      'Childhood Room';
    const aiAck =
      lastAddedMemory.assistantNote ||
      lastAddedMemory.aiSuggestions?.assistantResponse ||
      `"${lastAddedMemory.title}" is now displayed at ${zoneLabel}.`;

    setMessages((prev) => [
      ...prev,
      {
        id: `added-${lastAddedMemory.id}`,
        role: 'assistant',
        content: `Your memory has been added to the room. ${aiAck}`,
        modelUsed: lastAddedMemory.aiSuggestions?.modelUsed,
        referencedMemoryIds: [lastAddedMemory.id],
      },
    ]);
    setIsOpen(true);
  }, [lastAddedMemory]);

  // Automatic grounded Gemini observation whenever a visitor selects a Childhood Room memory
  useEffect(() => {
    if (
      !visible ||
      !selectedMemory ||
      selectedMemory.roomId !== 'childhood' ||
      !userId ||
      !sessionToken
    ) {
      return;
    }
    if (lastObservedIdRef.current === selectedMemory.id) return;
    lastObservedIdRef.current = selectedMemory.id;

    let cancelled = false;
    const controller = new AbortController();

    const runObservation = async () => {
      try {
        const res = await fetch('/api/assistant/childhood-memory', {
          method: 'POST',
          credentials: 'same-origin',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            userId,
            mode: 'observe_memory',
            selectedMemoryId: selectedMemory.id,
            memories: childhoodMemories.map((m) => ({
              id: m.id,
              ownerId: m.ownerId,
              roomId: m.roomId,
              title: m.title,
              type: m.type || m.mediaType || 'image',
              date: m.date,
              location: m.location,
              description: m.description,
              tags: m.tags,
              curatedZoneId: m.curatedZoneId,
              userProvided: m.userProvided,
            })),
          }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.ok && data?.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: `obs-${selectedMemory.id}-${Date.now()}`,
              role: 'assistant',
              content: String(data.reply),
              modelUsed: data.modelUsed,
              referencedMemoryIds: [selectedMemory.id],
            },
          ]);
        }
      } catch {
        // Ignore aborted observation requests
      }
    };

    void runObservation();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [visible, selectedMemory, userId, sessionToken, childhoodMemories]);

  if (!visible) return null;

  const handleDirectFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const directMemories: Memory[] = [];
    const fallbackPrepared: CurationBatchItemInput[] = [];
    const rejectedReasons: string[] = [];
    const seenKeys = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const check = validateUploadFileCandidate(
        file,
        childhoodMemories,
        seenKeys,
      );
      if (!check.valid) {
        rejectedReasons.push(
          check.reason || `"${file.name}" cannot be uploaded.`,
        );
        continue;
      }
      try {
        if (onDirectUploadMemories) {
          const { memory } = await buildDirectlyPlacedMemoryFromFile(file, {
            roomId: 'childhood',
            ownerId: userId || undefined,
          });
          directMemories.push(memory);
        } else {
          const item = await prepareFileForAutoCuration(file);
          fallbackPrepared.push(item);
        }
      } catch {
        rejectedReasons.push(
          `"${file.name}" could not be read. Please verify the file and try again.`,
        );
      }
    }

    if (rejectedReasons.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-upload-${Date.now()}`,
          role: 'error',
          content: rejectedReasons.join(' '),
        },
      ]);
      setIsOpen(true);
    }

    if (directMemories.length > 0 && onDirectUploadMemories) {
      const result = await onDirectUploadMemories(directMemories);
      if (!result.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-save-${Date.now()}`,
            role: 'error',
            content:
              result.errorMessage ||
              'Could not save uploaded memories to storage. Please try again.',
          },
        ]);
        setIsOpen(true);
      }
    } else if (fallbackPrepared.length > 0) {
      onStartQuickUpload(fallbackPrepared);
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const query = (textOverride ?? inputText).trim();
    if (!query || isSending) return;

    if (!userId || !sessionToken) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-session-${Date.now()}`,
          role: 'error',
          content:
            'Establishing your persistent curator session… please try again in a moment.',
        },
      ]);
      return;
    }

    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;
    const reqSeq = ++chatSeqRef.current;

    const userEntry: AssistantChatEntry = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
    };
    const nextHistory = [...messages, userEntry]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    setMessages((prev) => [...prev, userEntry]);
    if (!textOverride) setInputText('');
    setIsSending(true);
    setIsOpen(true);

    try {
      const res = await fetch('/api/assistant/childhood-memory', {
        method: 'POST',
        credentials: 'same-origin',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          userId,
          mode: 'chat',
          message: query,
          selectedMemoryId: selectedMemory?.id,
          history: nextHistory,
          autoApplyMove: true,
          memories: childhoodMemories.map((m) => ({
            id: m.id,
            ownerId: m.ownerId,
            roomId: m.roomId,
            title: m.title,
            type: m.type || m.mediaType || 'image',
            date: m.date,
            location: m.location,
            description: m.description,
            tags: m.tags,
            curatedZoneId: m.curatedZoneId,
            userProvided: m.userProvided,
          })),
        }),
      });

      const data = await res.json().catch(() => null);
      if (chatSeqRef.current !== reqSeq || controller.signal.aborted) return;
      if (!res.ok || !data?.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'error',
            content:
              data?.message ||
              'Gemini assistant is currently unavailable. Your saved memories remain safe in the room.',
          },
        ]);
        return;
      }

      // If Gemini moved a saved memory, immediately sync the moved memory into React & 3D state
      if (data.proposedMove?.memoryId && data.proposedMove?.targetLocationId) {
        const existing = childhoodMemories.find(
          (m) => m.id === data.proposedMove.memoryId,
        );
        const locId = data.proposedMove
          .targetLocationId as ChildhoodWorldLocationId;
        const cat = CHILDHOOD_WORLD_LOCATION_CATALOGUE[locId];
        if (existing && cat) {
          onMemoryUpdatedFromAssistant({
            ...existing,
            curatedZoneId: locId,
            placementTarget: cat.placementTarget,
            linkedObjectId: cat.linkedObjectId,
            linkedSpaceId: cat.spaceId,
            linked3DObject: cat.label,
            subtitle: cat.label,
            confirmationStatus: 'user_edited',
            placement3D: {
              locationId: locId,
              placementTarget: cat.placementTarget,
              linkedObjectId: cat.linkedObjectId,
              position: [cat.anchor.x, cat.anchor.y, cat.anchor.z],
            },
            updatedAt: new Date().toISOString(),
          });
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: String(data.reply || 'Reviewed your Childhood Room memories.'),
          modelUsed: data.modelUsed,
          referencedMemoryIds: Array.isArray(data.referencedMemoryIds)
            ? data.referencedMemoryIds
            : undefined,
          movedMemory: data.proposedMove
            ? {
                memoryId: data.proposedMove.memoryId,
                memoryTitle: data.proposedMove.memoryTitle,
                targetLocationLabel: data.proposedMove.targetLocationLabel,
              }
            : undefined,
          suggestedGroups: Array.isArray(data.suggestedGroups)
            ? data.suggestedGroups
            : undefined,
        },
      ]);
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) return;
      if (chatSeqRef.current !== reqSeq) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `err-net-${Date.now()}`,
          role: 'error',
          content: 'Could not reach the Gemini backend. Check your connection and retry.',
        },
      ]);
    } finally {
      if (chatSeqRef.current === reqSeq) {
        setIsSending(false);
      }
    }
  };

  return (
    <section
      aria-label="Childhood Room Memory Assistant"
      className="fixed bottom-4 right-4 md:right-6 z-20 flex flex-col items-end gap-2"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={UPLOAD_ACCEPT_ATTRIBUTE}
        multiple
        className="hidden"
        onChange={handleDirectFileSelect}
      />

      {!isOpen ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFullUploadModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#854D27] text-[#FFFCF6] text-xs font-semibold shadow-lg hover:bg-[#6E3E1F] border border-[#D6A15D]/50 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#F6E2B3]" />
            <span>Add Memory</span>
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FFFCF6] text-[#27231F] text-xs font-semibold shadow-lg border border-[#D8C5A6] hover:bg-[#FAF4E8] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#854D27]" />
            <span>Memory Assistant</span>
            <ChevronUp className="w-3.5 h-3.5 text-[#6E5641]" />
          </button>
        </div>
      ) : (
        <div className="w-[min(368px,calc(100vw-2rem))] max-h-[min(460px,calc(100vh-8rem))] flex flex-col rounded-2xl bg-[#FFFCF6] border border-[#D8C5A6] shadow-2xl text-[#27231F] overflow-hidden">
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-[#EFE6D5] bg-[#FAF4E8] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-[#854D27] shrink-0" />
              <div className="min-w-0">
                <p className="font-serif-display text-xs font-semibold text-[#27231F] truncate">
                  Childhood Room Assistant
                </p>
                <p className="text-[10px] text-[#6E5641] truncate">
                  {childhoodMemories.length} saved memor
                  {childhoodMemories.length === 1 ? 'y' : 'ies'} in room
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Quick-upload photo with automatic Gemini placement"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#854D27] text-[#FFFCF6] text-[11px] font-semibold hover:bg-[#6E3E1F] cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Photo</span>
              </button>
              <button
                type="button"
                onClick={onOpenFullUploadModal}
                title="Add memory with custom notes or date"
                className="p-1 rounded-lg bg-[#EFE6D5] text-[#493629] hover:bg-[#E5D7C0] cursor-pointer"
                aria-label="Open full memory form"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Collapse Childhood Room assistant"
                className="p-1 rounded-lg text-[#6E5641] hover:bg-[#EFE6D5] cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="p-3 space-y-2.5 overflow-y-auto flex-1 text-xs">
            {messages.length === 0 && (
              <div className="rounded-xl bg-[#FAF4E8] border border-[#EFE6D5] p-3 text-[#493629] space-y-2">
                <p className="leading-relaxed">
                  Upload a photo to place it automatically in the Childhood Room, or ask me about your saved memories, organize them, or move one to the Memory Wall, Photo Frames, Toy Box, Bookshelf, or Study Desk.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => sendMessage('What memories are saved in my Childhood Room?')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFFCF6] border border-[#D8C5A6] text-[11px] font-medium text-[#27231F] hover:bg-[#EFE6D5] cursor-pointer"
                  >
                    <MessageCircle className="w-3 h-3 text-[#854D27]" />
                    Ask about memories
                  </button>
                  <button
                    type="button"
                    onClick={() => sendMessage('Suggest how to organize my saved Childhood Room memories into groups.')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFFCF6] border border-[#D8C5A6] text-[11px] font-medium text-[#27231F] hover:bg-[#EFE6D5] cursor-pointer"
                  >
                    <FolderKanban className="w-3 h-3 text-[#854D27]" />
                    Organize memories
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl px-3 py-2 space-y-1.5 ${
                  msg.role === 'user'
                    ? 'bg-[#27231F] text-[#FFFCF6] ml-6'
                    : msg.role === 'error'
                      ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                      : 'bg-[#FAF4E8] border border-[#E8DED0] text-[#27231F] mr-3'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {msg.movedMemory && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#15803D] font-medium pt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>
                      Moved &ldquo;{msg.movedMemory.memoryTitle}&rdquo; to{' '}
                      {msg.movedMemory.targetLocationLabel}
                    </span>
                  </div>
                )}

                {msg.suggestedGroups && msg.suggestedGroups.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-[#E8DED0]">
                    {msg.suggestedGroups.map((g, idx) => (
                      <div
                        key={`${msg.id}-grp-${idx}`}
                        className="rounded-lg bg-[#FFFCF6] border border-[#E8DED0] p-2"
                      >
                        <p className="font-semibold text-[11px] text-[#27231F]">
                          {g.title} ({g.memoryIds.length})
                        </p>
                        {g.rationale && (
                          <p className="text-[10px] text-[#6E5641] mt-0.5">
                            {g.rationale}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {msg.referencedMemoryIds && msg.referencedMemoryIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {msg.referencedMemoryIds.map((refId) => {
                      const found = childhoodMemories.find((m) => m.id === refId);
                      if (!found) return null;
                      return (
                        <button
                          key={refId}
                          type="button"
                          onClick={() => onSelectMemoryById(refId)}
                          className="px-2 py-0.5 rounded-md bg-[#FFFCF6] border border-[#D8C5A6] text-[10px] font-medium text-[#854D27] hover:bg-[#EFE6D5] cursor-pointer"
                        >
                          Open: {found.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 text-[11px] text-[#6E5641] px-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#854D27]" />
                <span>Consulting Gemini…</span>
              </div>
            )}
            <div ref={scrollEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="p-2.5 border-t border-[#EFE6D5] bg-[#FFFCF6] flex items-center gap-1.5 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask, organize, or move a memory…"
              aria-label="Message Childhood Room Memory Assistant"
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#FAF4E8] border border-[#D8C5A6] text-xs text-[#27231F] placeholder:text-[#8B7355] focus:outline-none focus:border-[#854D27]"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              aria-label="Send message"
              className="p-2 rounded-lg bg-[#27231F] text-[#FFFCF6] hover:bg-[#3E3026] disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
