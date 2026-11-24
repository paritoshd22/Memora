import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Film,
  Box,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Sliders,
  Plus,
  Check,
  Search,
  BookOpen,
  Play,
  Pause,
} from 'lucide-react';
import {
  AICapability,
  AIProviderId,
  AIProviderStatus,
  AITaskRequest,
  AITaskResponse,
  CuratorResponsePayload,
  RoomDesignConfig,
  StoryboardPlan,
} from '../types/aiStudio';
import { CollectionItem, MemoryItem, Room } from '../types/museum';
import { BRAND } from '../config/brand';

interface AIStudioWorkspaceProps {
  userId: string;
  memories: MemoryItem[];
  rooms: Room[];
  collections: CollectionItem[];
  onApplyRoomDesign: (roomId: string, design: RoomDesignConfig) => void;
  onAddMemory: (memory: Omit<MemoryItem, 'id'>) => void;
  onCreateCollection: (col: Omit<CollectionItem, 'id'>) => void;
  onSelectMemory: (memory: MemoryItem) => void;
  onEnterRoom: (roomId: string) => void;
}

type StudioTab =
  | 'curator'
  | 'image_studio'
  | 'film_studio'
  | 'room_designer'
  | 'providers';

export const AIStudioWorkspace: React.FC<AIStudioWorkspaceProps> = ({
  userId,
  memories,
  rooms,
  collections,
  onApplyRoomDesign,
  onAddMemory,
  onCreateCollection,
  onSelectMemory,
  onEnterRoom,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('curator');
  const [providers, setProviders] = useState<AIProviderStatus[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>('gemini');
  const [useDemoMode, setUseDemoMode] = useState<boolean>(false);
  const [userConsentGranted, setUserConsentGranted] = useState<boolean>(true);
  const [loadingProviders, setLoadingProviders] = useState<boolean>(false);
  const [testingProviderId, setTestingProviderId] = useState<AIProviderId | null>(
    null,
  );
  const [testMessages, setTestMessages] = useState<Record<string, string>>({});

  // Task State
  const [isRunningTask, setIsRunningTask] = useState<boolean>(false);
  const [taskError, setTaskError] = useState<{
    message: string;
    alternatives?: AIProviderId[];
    canUseDemo?: boolean;
  } | null>(null);
  const [lastProviderUsed, setLastProviderUsed] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  // 1. AI Curator State
  const [curatorTask, setCuratorTask] = useState<AICapability>('memory_search');
  const [curatorPrompt, setCuratorPrompt] = useState<string>(
    'Find my summer travel and coastal memories and write a reflective exhibition narrative.',
  );
  const [curatorResult, setCuratorResult] =
    useState<CuratorResponsePayload | null>(null);
  const [collectionCreatedBanner, setCollectionCreatedBanner] =
    useState<boolean>(false);

  // 2. Image Studio State
  const [imagePrompt, setImagePrompt] = useState<string>(
    'Warm golden-hour museum exhibition cover with travertine arches, olive branches, and framed heirloom photographs',
  );
  const [imageAspectRatio, setImageAspectRatio] = useState<
    '1:1' | '4:3' | '16:9'
  >('4:3');
  const [imagePurpose, setImagePurpose] = useState<
    'collection_cover' | 'room_moodboard' | 'decorative_backdrop'
  >('collection_cover');
  const [generatedImage, setGeneratedImage] = useState<{
    imageUrl: string;
    caption: string;
    isDemo: boolean;
  } | null>(null);
  const [targetRoomForImage, setTargetRoomForImage] = useState<string>(
    rooms.find((r) => r.status === 'active')?.id || 'childhood',
  );
  const [savedImageNotice, setSavedImageNotice] = useState<boolean>(false);

  // 3. Memory Film Studio State
  const [selectedFilmMemoryIds, setSelectedFilmMemoryIds] = useState<string[]>(
    () => memories.slice(0, 4).map((m) => m.id),
  );
  const [filmTheme, setFilmTheme] = useState<string>(
    'Warm Nostalgic Golden Hour Documentary',
  );
  const [filmDuration, setFilmDuration] = useState<'5s' | '10s'>('5s');
  const [filmAspectRatio, setFilmAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [storyboardResult, setStoryboardResult] = useState<StoryboardPlan | null>(
    null,
  );
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isPlayingDemoReel, setIsPlayingDemoReel] = useState<boolean>(false);
  const [activeReelSceneIdx, setActiveReelSceneIdx] = useState<number>(0);

  // 4. 3D Room Designer State
  const [selectedRoomForDesign, setSelectedRoomForDesign] = useState<string>(
    rooms.find((r) => r.status === 'active')?.id || 'childhood',
  );
  const [roomDesignKeywords, setRoomDesignKeywords] = useState<string>(
    'Warm Mediterranean limestone salon with golden-hour sunlight, walnut frames, and olive trees',
  );
  const [roomDesignResult, setRoomDesignResult] =
    useState<RoomDesignConfig | null>(null);
  const [appliedRoomBanner, setAppliedRoomBanner] = useState<boolean>(false);

  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const res = await fetch('/api/ai/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch {
      // ignore network error
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Demo reel advancement timer
  useEffect(() => {
    if (!isPlayingDemoReel || !storyboardResult || storyboardResult.scenes.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveReelSceneIdx((prev) => (prev + 1) % storyboardResult.scenes.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isPlayingDemoReel, storyboardResult]);

  const handleTestProvider = async (id: AIProviderId) => {
    setTestingProviderId(id);
    try {
      const res = await fetch(`/api/ai/providers/${id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      setTestMessages((prev) => ({
        ...prev,
        [id]: data.message || (data.ok ? 'Connection verified' : 'Failed'),
      }));
      await fetchProviders();
    } catch (err: any) {
      setTestMessages((prev) => ({
        ...prev,
        [id]: err?.message || 'Network error testing provider',
      }));
    } finally {
      setTestingProviderId(null);
    }
  };

  const buildSanitizedMemories = (subset?: MemoryItem[]) => {
    const list = subset || memories;
    return list.map((m) => {
      const roomObj = rooms.find((r) => r.id === m.roomId);
      return {
        id: m.id,
        ownerId: m.ownerId || userId,
        roomId: m.roomId,
        roomName: roomObj?.name || m.roomId,
        title: m.title,
        date: m.date,
        year: m.year,
        location: m.location,
        category: m.category,
        description: m.description,
        story: m.story,
        tags: m.tags || [],
      };
    });
  };

  const runAITask = async <T,>(
    req: Omit<
      AITaskRequest,
      'userId' | 'providerId' | 'demoMode' | 'consentGranted'
    >,
    overrideProvider?: AIProviderId,
    forceDemo?: boolean,
  ): Promise<AITaskResponse<T> | null> => {
    setIsRunningTask(true);
    setTaskError(null);
    try {
      const fullReq: AITaskRequest = {
        ...req,
        userId,
        providerId: overrideProvider || selectedProvider,
        demoMode: forceDemo ?? useDemoMode,
        consentGranted: userConsentGranted,
      };
      const res = await fetch('/api/ai/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullReq),
      });
      const data: AITaskResponse<T> = await res.json();
      if (!data.ok) {
        setTaskError({
          message: data.error?.message || 'AI task failed to complete.',
          alternatives: data.error?.availableAlternativeProviders,
          canUseDemo: data.error?.canUseDemoFallback,
        });
        return null;
      }
      setLastProviderUsed(
        data.isDemo
          ? 'Local Demo Engine (Simulated)'
          : `${data.providerUsed} (${data.modelUsed})`,
      );
      setLastLatencyMs(data.latencyMs);
      fetchProviders();
      return data;
    } catch (err: any) {
      setTaskError({
        message: err?.message || 'Network error communicating with AI Router.',
        canUseDemo: true,
      });
      return null;
    } finally {
      setIsRunningTask(false);
    }
  };

  const handleRunCurator = async (
    overrideProv?: AIProviderId,
    forceDemo?: boolean,
  ) => {
    const resp = await runAITask<CuratorResponsePayload>(
      {
        task: curatorTask,
        prompt: curatorPrompt,
        memories: buildSanitizedMemories(),
        rooms: rooms
          .filter((r) => r.status === 'active')
          .map((r) => ({ id: r.id, name: r.name, subtitle: r.subtitle })),
      },
      overrideProv,
      forceDemo,
    );
    if (resp?.data) {
      setCuratorResult(resp.data);
      setCollectionCreatedBanner(false);
    }
  };

  const handleRunImageStudio = async (
    overrideProv?: AIProviderId,
    forceDemo?: boolean,
  ) => {
    const resp = await runAITask<{ imageUrl: string; caption: string }>(
      {
        task: 'image_generation',
        prompt: imagePrompt,
        imageConfig: {
          aspectRatio: imageAspectRatio,
          purpose: imagePurpose,
        },
      },
      overrideProv,
      forceDemo,
    );
    if (resp?.data) {
      setGeneratedImage({
        imageUrl: resp.data.imageUrl,
        caption: resp.data.caption,
        isDemo: resp.isDemo,
      });
      setSavedImageNotice(false);
    }
  };

  const handleRunFilmStudio = async (
    overrideProv?: AIProviderId,
    forceDemo?: boolean,
  ) => {
    const chosenMemories = memories.filter((m) =>
      selectedFilmMemoryIds.includes(m.id),
    );
    // Step 1: Generate Storyboard
    const sbResp = await runAITask<StoryboardPlan>(
      {
        task: 'story_writing',
        prompt: `__STORYBOARD__: Theme: ${filmTheme} | Aspect: ${filmAspectRatio} | Duration: ${filmDuration}`,
        memories: buildSanitizedMemories(
          chosenMemories.length > 0 ? chosenMemories : memories.slice(0, 4),
        ),
        videoConfig: {
          aspectRatio: filmAspectRatio,
          duration: filmDuration,
          theme: filmTheme,
        },
      },
      overrideProv,
      forceDemo,
    );

    if (sbResp?.data && Array.isArray(sbResp.data.scenes)) {
      setStoryboardResult(sbResp.data);
      setActiveReelSceneIdx(0);
      setIsPlayingDemoReel(true);
    }

    // Step 2: If live mode or user clicked generate video, request video generation
    const vidResp = await runAITask<{
      videoDataUrl?: string;
      storyboard?: StoryboardPlan;
      demoNotice?: string;
    }>(
      {
        task: 'video_generation',
        prompt: `Theme: ${filmTheme}. Memories: ${chosenMemories
          .map((m) => m.title)
          .join(', ')}`,
        memories: buildSanitizedMemories(
          chosenMemories.length > 0 ? chosenMemories : memories.slice(0, 4),
        ),
        videoConfig: {
          aspectRatio: filmAspectRatio,
          duration: filmDuration,
          theme: filmTheme,
          storyboard: sbResp?.data,
        },
      },
      overrideProv,
      forceDemo,
    );

    if (vidResp?.data) {
      if (vidResp.data.storyboard && !sbResp?.data) {
        setStoryboardResult(vidResp.data.storyboard);
      }
      setGeneratedVideoUrl(vidResp.data.videoDataUrl || null);
    }
  };

  const handleRunRoomDesigner = async (
    overrideProv?: AIProviderId,
    forceDemo?: boolean,
  ) => {
    const targetRoom = rooms.find((r) => r.id === selectedRoomForDesign);
    const resp = await runAITask<RoomDesignConfig>(
      {
        task: 'room_design',
        prompt: roomDesignKeywords,
        roomDesignPrompt: {
          roomName: targetRoom?.name || 'Personal Gallery',
          currentSubtitle: targetRoom?.subtitle,
          styleKeywords: roomDesignKeywords,
        },
      },
      overrideProv,
      forceDemo,
    );
    if (resp?.data) {
      setRoomDesignResult(resp.data);
      setAppliedRoomBanner(false);
    }
  };

  const activeRooms = rooms.filter((r) => r.status === 'active');

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto pt-24 pb-28 px-4 md:px-8 bg-[#F6F1E8]/92 backdrop-blur-xl animate-fadeIn">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl p-6 md:p-8 shadow-xl mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D6A15D]/15 text-[#493629] text-xs font-medium mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#D6A15D]" />
                <span>{BRAND.name} AI STUDIO · MULTI-PROVIDER ARCHITECTURE</span>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl text-[#27231F]">
                AI Curatorial & Creative Studio
              </h1>
              <p className="text-sm text-[#6F655B] mt-1 max-w-2xl">
                Search and narrate your archive, generate room artwork, compose
                memory storyboards, and customize 3D room architecture with
                strict privacy and transparent provider routing.
              </p>
            </div>

            {/* Provider & Consent Controls */}
            <div className="flex flex-wrap items-center gap-3 bg-[#F6F1E8] p-3.5 rounded-2xl border border-[#E8DED0]">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6F655B] font-semibold mb-1">
                  Active AI Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) =>
                    setSelectedProvider(e.target.value as AIProviderId)
                  }
                  disabled={useDemoMode}
                  className="px-3 py-1.5 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs font-medium text-[#27231F] disabled:opacity-50"
                >
                  <option value="gemini">Google Gemini API</option>
                  <option value="openai">OpenAI API</option>
                </select>
              </div>

              <div className="h-8 w-px bg-[#E8DED0] hidden sm:block" />

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#27231F] font-medium px-2 py-1 rounded-lg hover:bg-[#E8DED0]/40">
                <input
                  type="checkbox"
                  checked={useDemoMode}
                  onChange={(e) => {
                    setUseDemoMode(e.target.checked);
                    setTaskError(null);
                  }}
                  className="rounded text-[#D6A15D]"
                />
                <span>Simulated Demo Mode</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#27231F] font-medium px-2 py-1 rounded-lg hover:bg-[#E8DED0]/40">
                <input
                  type="checkbox"
                  checked={userConsentGranted}
                  onChange={(e) => setUserConsentGranted(e.target.checked)}
                  className="rounded text-[#87977C]"
                />
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#87977C]" />
                  Data Consent
                </span>
              </label>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-[#E8DED0]">
            {[
              { id: 'curator', label: 'AI Curator', icon: Wand2 },
              { id: 'image_studio', label: 'Image Studio', icon: ImageIcon },
              { id: 'film_studio', label: 'Memory Film Studio', icon: Film },
              { id: 'room_designer', label: '3D Room Designer', icon: Box },
              { id: 'providers', label: 'Connected Providers', icon: Cpu },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as StudioTab);
                    setTaskError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#27231F] text-[#FFFCF6] shadow-sm'
                      : 'bg-[#F6F1E8] text-[#6F655B] hover:text-[#27231F]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {lastProviderUsed && (
              <div className="ml-auto flex items-center gap-2 text-[11px] text-[#6F655B] bg-[#F6F1E8] px-3 py-1.5 rounded-xl border border-[#E8DED0]">
                <span>Routed via:</span>
                <strong className="text-[#27231F]">{lastProviderUsed}</strong>
                {lastLatencyMs !== null && <span>({lastLatencyMs}ms)</span>}
              </div>
            )}
          </div>
        </div>

        {/* Non-Silent Provider Error & Fallback Prompt */}
        {taskError && (
          <div className="bg-amber-50/95 border border-amber-300 rounded-2xl p-5 mb-6 shadow-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-950">
                  Provider Routing Notice (No Silent Fallback)
                </h3>
                <p className="text-xs text-amber-900 mt-1">
                  {taskError.message}
                </p>
                <div className="flex flex-wrap items-center gap-2.5 mt-3">
                  {taskError.alternatives &&
                    taskError.alternatives.map((alt) => (
                      <button
                        key={alt}
                        onClick={() => {
                          setSelectedProvider(alt);
                          if (activeTab === 'curator') handleRunCurator(alt, false);
                          if (activeTab === 'image_studio')
                            handleRunImageStudio(alt, false);
                          if (activeTab === 'film_studio')
                            handleRunFilmStudio(alt, false);
                          if (activeTab === 'room_designer')
                            handleRunRoomDesigner(alt, false);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-800 text-white text-xs font-medium hover:bg-amber-900 transition-colors"
                      >
                        Switch & Retry with {alt.toUpperCase()}
                      </button>
                    ))}
                  {taskError.canUseDemo && (
                    <button
                      onClick={() => {
                        setUseDemoMode(true);
                        if (activeTab === 'curator')
                          handleRunCurator(undefined, true);
                        if (activeTab === 'image_studio')
                          handleRunImageStudio(undefined, true);
                        if (activeTab === 'film_studio')
                          handleRunFilmStudio(undefined, true);
                        if (activeTab === 'room_designer')
                          handleRunRoomDesigner(undefined, true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#27231F] text-[#FFFCF6] text-xs font-medium hover:bg-[#493629] transition-colors"
                    >
                      Run in Local Simulated Demo Mode
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: AI CURATOR */}
        {activeTab === 'curator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl p-6 shadow-md space-y-5">
              <div>
                <h2 className="font-serif text-2xl text-[#27231F]">
                  AI Curator & Archive Historian
                </h2>
                <p className="text-xs text-[#6F655B] mt-1">
                  Grounded strictly in your {memories.length} stored memories.
                  Never fabricates dates, people, or locations.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#27231F] mb-1.5">
                  Curatorial Task
                </label>
                <select
                  value={curatorTask}
                  onChange={(e) =>
                    setCuratorTask(e.target.value as AICapability)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F]"
                >
                  <option value="memory_search">
                    Natural-Language Memory Search
                  </option>
                  <option value="story_writing">
                    Biographical & Exhibition Story Writing
                  </option>
                  <option value="collection_descriptions">
                    Curate Thematic Collection & Essay
                  </option>
                  <option value="caption_generation">
                    Generate Archival Captions
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#27231F] mb-1.5">
                  Your Inquiry or Curatorial Prompt
                </label>
                <textarea
                  rows={4}
                  value={curatorPrompt}
                  onChange={(e) => setCuratorPrompt(e.target.value)}
                  placeholder="Ask about specific years, rooms, people, or request a story..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F]"
                />
              </div>

              {/* Preset Prompts */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase tracking-wider text-[#6F655B] font-semibold">
                  Sample Inquiries
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Find my summer travel memories and coastal trips',
                    'Write a warm story connecting my family and childhood memories',
                    'Suggest a curated collection for my proudest achievements',
                    'Summarize all memories from 2018 to 2024',
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCuratorPrompt(preset)}
                      className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-[#F6F1E8] hover:bg-[#E9D4B1]/50 text-[#493629] transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleRunCurator()}
                disabled={isRunningTask}
                className="w-full py-3 rounded-xl bg-[#27231F] text-[#FFFCF6] text-sm font-medium hover:bg-[#493629] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRunningTask ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Consulting Archive...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#D6A15D]" />
                    <span>Run AI Curator</span>
                  </>
                )}
              </button>
            </div>

            <div className="lg:col-span-7 bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl p-6 shadow-md">
              {!curatorResult ? (
                <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 text-[#6F655B]">
                  <BookOpen className="w-10 h-10 text-[#D6A15D] mb-3 opacity-80" />
                  <h3 className="font-serif text-xl text-[#27231F]">
                    Curatorial Reading Room
                  </h3>
                  <p className="text-xs max-w-md mt-1">
                    Run a search or story prompt on the left to inspect grounded
                    citations, exhibition essays, and one-click collection
                    creation.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4 border-b border-[#E8DED0] pb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#D6A15D] font-semibold">
                        GROUNDED ARCHIVE RESPONSE
                      </span>
                      <h3 className="font-serif text-2xl text-[#27231F] mt-0.5">
                        {curatorResult.suggestedCollectionTitle ||
                          'Curatorial Synthesis'}
                      </h3>
                    </div>
                    {curatorResult.citations.length > 0 && (
                      <button
                        onClick={() => {
                          onCreateCollection({
                            title:
                              curatorResult.suggestedCollectionTitle ||
                              'AI Curated Exhibition',
                            subtitle: `Curated by ${BRAND.name} AI Studio`,
                            curatorNote: curatorResult.answerMarkdown.slice(
                              0,
                              240,
                            ),
                            memoryIds: curatorResult.citations.map(
                              (c) => c.memoryId,
                            ),
                            accentColor: '#D6A15D',
                            seasonTag: 'AI Anthology',
                            themeTag: 'AI Anthology',
                          });
                          setCollectionCreatedBanner(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#D6A15D]/20 text-[#493629] hover:bg-[#D6A15D] hover:text-[#27231F] text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save as Collection</span>
                      </button>
                    )}
                  </div>

                  {collectionCreatedBanner && (
                    <div className="p-3 rounded-xl bg-[#87977C]/20 border border-[#87977C]/40 text-xs text-[#27231F] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#87977C]" />
                      <span>
                        Saved to your museum Collections! You can view it in the
                        Collections tab.
                      </span>
                    </div>
                  )}

                  {curatorResult.uncertaintyNote && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      <strong>Archival Note:</strong>{' '}
                      {curatorResult.uncertaintyNote}
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F] leading-relaxed whitespace-pre-line">
                    {curatorResult.answerMarkdown}
                  </div>

                  {curatorResult.factsSummary.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6F655B] mb-2">
                        Verified Archive Facts ({curatorResult.factsSummary.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {curatorResult.factsSummary.map((fact, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-[#27231F] flex items-start gap-2"
                          >
                            <span className="text-[#D6A15D] mt-0.5">•</span>
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {curatorResult.citations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6F655B] mb-2.5">
                        Referenced Museum Exhibits ({curatorResult.citations.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {curatorResult.citations.map((cit) => {
                          const fullMem = memories.find(
                            (m) => m.id === cit.memoryId,
                          );
                          return (
                            <div
                              key={cit.memoryId}
                              onClick={() => fullMem && onSelectMemory(fullMem)}
                              className="p-3 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] hover:border-[#D6A15D] cursor-pointer transition-all flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-[#27231F] truncate">
                                  {cit.title}
                                </div>
                                <div className="text-[11px] text-[#6F655B] truncate">
                                  {cit.date} · {cit.location}
                                </div>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-[#D6A15D] shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: IMAGE STUDIO */}
        {activeTab === 'image_studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl p-6 shadow-md space-y-4">
              <div>
                <h2 className="font-serif text-2xl text-[#27231F]">
                  Museum Image Studio
                </h2>
                <p className="text-xs text-[#6F655B] mt-1">
                  Generate room cover artwork, collection illustrations, and
                  stylized architectural backdrops.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#27231F] mb-1">
                  Artwork Purpose
                </label>
                <select
                  value={imagePurpose}
                  onChange={(e) => setImagePurpose(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F]"
                >
                  <option value="collection_cover">
                    Collection & Exhibition Cover Art
                  </option>
                  <option value="room_moodboard">
                    Room Architectural Moodboard
                  </option>
                  <option value="decorative_backdrop">
                    Stylized Museum Backdrop Plate
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#27231F] mb-1">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1:1', '4:3', '16:9'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setImageAspectRatio(ratio)}
                      className={`py-2 rounded-xl text-xs font-medium border ${
                        imageAspectRatio === ratio
                          ? 'bg-[#27231F] text-[#FFFCF6] border-[#27231F]'
                          : 'bg-[#F6F1E8] text-[#6F655B] border-[#E8DED0]'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#27231F] mb-1">
                  Visual Prompt
                </label>
                <textarea
                  rows={4}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F]"
                />
              </div>

              <button
                onClick={() => handleRunImageStudio()}
                disabled={isRunningTask}
                className="w-full py-3 rounded-xl bg-[#27231F] text-[#FFFCF6] text-sm font-medium hover:bg-[#493629] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRunningTask ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rendering Studio Plate...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 text-[#D6A15D]" />
                    <span>Generate Museum Artwork</span>
                  </>
                )}
              </button>
            </div>

            <div className="lg:col-span-7 bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl p-6 shadow-md flex flex-col justify-between">
              {!generatedImage ? (
                <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 text-[#6F655B]">
                  <ImageIcon className="w-10 h-10 text-[#D6A15D] mb-3 opacity-80" />
                  <h3 className="font-serif text-xl text-[#27231F]">
                    Artwork Easel
                  </h3>
                  <p className="text-xs max-w-md mt-1">
                    Enter a prompt to generate bespoke exhibition covers or save
                    generated plates directly into any room in your 3D museum.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#6F655B]">
                      Generated Studio Plate
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        generatedImage.isDemo
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {generatedImage.isDemo
                        ? 'Simulated Demo Artwork'
                        : 'Live AI Model Output'}
                    </span>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-[#E8DED0] bg-[#F6F1E8] max-h-[360px] flex items-center justify-center">
                    <img
                      src={generatedImage.imageUrl}
                      alt={generatedImage.caption}
                      className="w-full h-full object-contain max-h-[350px]"
                    />
                  </div>

                  <p className="text-xs text-[#6F655B] italic">
                    {generatedImage.caption}
                  </p>

                  <div className="pt-3 border-t border-[#E8DED0] flex flex-wrap items-center gap-3">
                    <select
                      value={targetRoomForImage}
                      onChange={(e) => setTargetRoomForImage(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-xs text-[#27231F]"
                    >
                      {activeRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          Save to: {r.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        onAddMemory({
                          roomId: targetRoomForImage,
                          title: imagePrompt.slice(0, 48),
                          date: new Date().toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          }),
                          year: new Date().getFullYear(),
                          location: `${BRAND.name} AI Image Studio`,
                          category: 'Studio Artwork',
                          description: generatedImage.caption,
                          story: `Created in ${BRAND.name} Image Studio (${
                            generatedImage.isDemo
                              ? 'Simulated Demo Mode'
                              : 'Live AI Provider'
                          }). Prompt: ${imagePrompt}`,
                          accessionNumber: `MM-AI-${Date.now().toString().slice(-4)}`,
                          motif: 'atelier_studio',
                          palette: ['#D6A15D', '#493629', '#E9D4B1', '#27231F'],
                          customImageUrl: generatedImage.imageUrl,
                          type: 'image',
                          mediaType: 'image',
                          tags: ['AI Studio', imagePurpose],
                        });
                        setSavedImageNotice(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#27231F] text-[#FFFCF6] text-xs font-medium hover:bg-[#493629] transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Artwork to Selected Room</span>
                    </button>

                    {savedImageNotice && (
                      <span className="text-xs text-[#87977C] font-medium flex items-center gap-1">
                        <Check className="w-4 h-4" /> Added to room exhibit!
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MEMORY FILM STUDIO */}
        {activeTab === 'film_studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl p-6 shadow-md space-y-4">
              <div>
                <h2 className="font-serif text-2xl text-[#27231F]">
                  Memory Film Studio
                </h2>
                <p className="text-xs text-[#6F655B] mt-1">
                  Select memories, generate a multi-scene documentary
                  storyboard, and synthesize a cinematic memory reel.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#27231F] mb-1">
                  Film Direction & Theme
                </label>
                <input
                  type="text"
                  value={filmTheme}
                  onChange={(e) => setFilmTheme(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#27231F] mb-1">
                    Duration
                  </label>
                  <select
                    value={filmDuration}
                    onChange={(e) => setFilmDuration(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-xs text-[#27231F]"
                  >
                    <option value="5s">5 Seconds</option>
                    <option value="10s">10 Seconds</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#27231F] mb-1">
                    Aspect Ratio
                  </label>
                  <select
                    value={filmAspectRatio}
                    onChange={(e) => setFilmAspectRatio(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-xs text-[#27231F]"
                  >
                    <option value="16:9">16:9 Widescreen</option>
                    <option value="9:16">9:16 Vertical Reel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#27231F] mb-1.5">
                  Select Memories for Storyboard ({selectedFilmMemoryIds.length}{' '}
                  selected)
                </label>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {memories.slice(0, 14).map((m) => {
                    const checked = selectedFilmMemoryIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-[#D6A15D]/15 border-[#D6A15D] text-[#27231F]'
                            : 'bg-[#F6F1E8] border-[#E8DED0] text-[#6F655B]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedFilmMemoryIds((prev) =>
                              checked
                                ? prev.filter((id) => id !== m.id)
                                : [...prev, m.id],
                            );
                          }}
                        />
                        <span className="truncate font-medium">{m.title}</span>
                        <span className="ml-auto text-[10px] opacity-75">
                          {m.year}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => handleRunFilmStudio()}
                disabled={isRunningTask}
                className="w-full py-3 rounded-xl bg-[#27231F] text-[#FFFCF6] text-sm font-medium hover:bg-[#493629] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRunningTask ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Composing Storyboard & Film...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 text-[#D6A15D]" />
                    <span>Generate Storyboard & Memory Film</span>
                  </>
                )}
              </button>
            </div>

            <div className="lg:col-span-7 bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl p-6 shadow-md">
              {!storyboardResult ? (
                <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 text-[#6F655B]">
                  <Film className="w-10 h-10 text-[#D6A15D] mb-3 opacity-80" />
                  <h3 className="font-serif text-xl text-[#27231F]">
                    Screening Room & Storyboard Deck
                  </h3>
                  <p className="text-xs max-w-md mt-1">
                    Generate a scene-by-scene documentary storyboard from your
                    selected memories and preview your cinematic memory reel.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E8DED0] pb-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#D6A15D] font-semibold">
                        MEMORY FILM STORYBOARD
                      </span>
                      <h3 className="font-serif text-2xl text-[#27231F]">
                        {storyboardResult.filmTitle}
                      </h3>
                      <p className="text-xs text-[#6F655B]">
                        Soundtrack Mood: {storyboardResult.musicalMood} · Total
                        Duration: {storyboardResult.totalDurationSeconds}s
                      </p>
                    </div>
                  </div>

                  {generatedVideoUrl ? (
                    <div className="rounded-2xl overflow-hidden border border-[#E8DED0] bg-black">
                      <video
                        src={generatedVideoUrl}
                        controls
                        autoPlay
                        loop
                        className="w-full max-h-[280px] object-contain"
                      />
                    </div>
                  ) : (
                    /* Interactive Ken Burns Storyboard Preview Player */
                    <div className="rounded-2xl overflow-hidden border border-[#E8DED0] bg-[#27231F] text-[#FFFCF6] p-5 relative">
                      <div className="flex items-center justify-between text-[11px] text-[#E9D4B1] mb-3">
                        <span>
                          SCENE {activeReelSceneIdx + 1} OF{' '}
                          {storyboardResult.scenes.length} ·{' '}
                          {storyboardResult.scenes[
                            activeReelSceneIdx
                          ]?.cameraMotion.replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={() =>
                            setIsPlayingDemoReel(!isPlayingDemoReel)
                          }
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
                        >
                          {isPlayingDemoReel ? (
                            <>
                              <Pause className="w-3 h-3" /> Pause Preview
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" /> Play Preview
                            </>
                          )}
                        </button>
                      </div>
                      <div className="py-6 text-center space-y-2">
                        <div className="font-serif text-2xl text-[#FFFCF6]">
                          {
                            storyboardResult.scenes[activeReelSceneIdx]
                              ?.memoryTitle
                          }
                        </div>
                        <p className="text-xs text-[#E9D4B1] max-w-lg mx-auto">
                          "
                          {storyboardResult.scenes[activeReelSceneIdx]?.caption}
                          "
                        </p>
                        <p className="text-[11px] text-[#FFFCF6]/60 italic max-w-md mx-auto pt-2">
                          Camera:{' '}
                          {
                            storyboardResult.scenes[activeReelSceneIdx]
                              ?.visualPrompt
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {storyboardResult.scenes.map((sc, idx) => (
                      <div
                        key={sc.sceneNumber}
                        onClick={() => setActiveReelSceneIdx(idx)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          activeReelSceneIdx === idx
                            ? 'bg-[#D6A15D]/15 border-[#D6A15D]'
                            : 'bg-[#F6F1E8] border-[#E8DED0]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-[#27231F]">
                          <span>
                            Scene {sc.sceneNumber}: {sc.memoryTitle}
                          </span>
                          <span className="text-[11px] text-[#6F655B]">
                            {sc.durationSeconds}s ·{' '}
                            {sc.cameraMotion.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-[#6F655B] mt-1">
                          {sc.caption}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: 3D ROOM DESIGNER */}
        {activeTab === 'room_designer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl p-6 shadow-md space-y-4">
              <div>
                <h2 className="font-serif text-2xl text-[#27231F]">
                  3D Room Architectural Designer
                </h2>
                <p className="text-xs text-[#6F655B] mt-1">
                  Generate structured PBR colors, lighting presets, and exhibit
                  layouts that update your 3D museum rooms immediately.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#27231F] mb-1">
                  Target Museum Room
                </label>
                <select
                  value={selectedRoomForDesign}
                  onChange={(e) => setSelectedRoomForDesign(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F]"
                >
                  {activeRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Floor {r.floorNumber + 1} · Slot{' '}
                      {r.slotIndex + 1})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#27231F] mb-1">
                  Architectural Style & Atmosphere Prompt
                </label>
                <textarea
                  rows={4}
                  value={roomDesignKeywords}
                  onChange={(e) => setRoomDesignKeywords(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-sm text-[#27231F]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  'Golden-hour travertine loggia with warm brass spotlights',
                  'Botanical sage conservatory with olive trees and limestone',
                  'Nocturne twilight salon with warm amber lantern glow',
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setRoomDesignKeywords(preset)}
                    className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-[#F6F1E8] hover:bg-[#E9D4B1]/50 text-[#493629]"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleRunRoomDesigner()}
                disabled={isRunningTask}
                className="w-full py-3 rounded-xl bg-[#27231F] text-[#FFFCF6] text-sm font-medium hover:bg-[#493629] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRunningTask ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Computing 3D Room Parameters...</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-4 h-4 text-[#D6A15D]" />
                    <span>Generate 3D Room Design</span>
                  </>
                )}
              </button>
            </div>

            <div className="lg:col-span-7 bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl p-6 shadow-md">
              {!roomDesignResult ? (
                <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 text-[#6F655B]">
                  <Box className="w-10 h-10 text-[#D6A15D] mb-3 opacity-80" />
                  <h3 className="font-serif text-xl text-[#27231F]">
                    3D Architectural Blueprint
                  </h3>
                  <p className="text-xs max-w-md mt-1">
                    Generate a room theme on the left to preview wall, floor,
                    and arch color swatches and apply them directly to your 3D
                    museum portal.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4 border-b border-[#E8DED0] pb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#D6A15D] font-semibold">
                        STRUCTURED 3D PBR CONFIGURATION
                      </span>
                      <h3 className="font-serif text-2xl text-[#27231F]">
                        {roomDesignResult.themeName}
                      </h3>
                      <p className="text-xs text-[#6F655B] mt-0.5">
                        Lighting: {roomDesignResult.lightingPreset} (Intensity{' '}
                        {roomDesignResult.lightIntensity}) · Layout:{' '}
                        {roomDesignResult.exhibitLayout} · Decor:{' '}
                        {roomDesignResult.decorations}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onApplyRoomDesign(
                            selectedRoomForDesign,
                            roomDesignResult,
                          );
                          setAppliedRoomBanner(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#27231F] text-[#FFFCF6] text-xs font-medium hover:bg-[#493629] transition-colors"
                      >
                        Apply to 3D Room
                      </button>
                      <button
                        onClick={() => onEnterRoom(selectedRoomForDesign)}
                        className="px-3.5 py-2 rounded-xl bg-[#D6A15D]/20 text-[#493629] text-xs font-medium hover:bg-[#D6A15D]/40 transition-colors"
                      >
                        Visit Room
                      </button>
                    </div>
                  </div>

                  {appliedRoomBanner && (
                    <div className="p-3 rounded-xl bg-[#87977C]/20 border border-[#87977C]/40 text-xs text-[#27231F] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#87977C]" />
                      <span>
                        Applied to 3D room architecture! Return to the 3D Museum
                        to see the updated portal lighting and palette.
                      </span>
                    </div>
                  )}

                  {/* Color Swatches */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Wall Stone', hex: roomDesignResult.wallColorHex },
                      {
                        label: 'Floor Travertine',
                        hex: roomDesignResult.floorTintHex,
                      },
                      {
                        label: 'Archway Trim',
                        hex: roomDesignResult.archColorHex,
                      },
                      {
                        label: 'Portal Accent Light',
                        hex: roomDesignResult.accentColorHex,
                      },
                    ].map((swatch) => (
                      <div
                        key={swatch.label}
                        className="p-3 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] flex items-center gap-3"
                      >
                        <div
                          className="w-9 h-9 rounded-xl border border-black/15 shrink-0 shadow-inner"
                          style={{ backgroundColor: swatch.hex }}
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-[#27231F] truncate">
                            {swatch.label}
                          </div>
                          <div className="text-[10px] font-mono text-[#6F655B]">
                            {swatch.hex}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] space-y-2">
                    <div className="text-xs font-semibold text-[#27231F]">
                      Architectural Description
                    </div>
                    <p className="text-xs text-[#6F655B] leading-relaxed">
                      {roomDesignResult.roomDescription}
                    </p>
                    {roomDesignResult.curatorRationale && (
                      <p className="text-[11px] text-[#493629] italic pt-1">
                        Rationale: {roomDesignResult.curatorRationale}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CONNECTED PROVIDERS */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {providers.map((prov) => {
                const statusMeta: Record<
                  string,
                  { label: string; className: string }
                > = {
                  connected: {
                    label: 'Connected',
                    className: 'bg-emerald-100 text-emerald-900',
                  },
                  missing_credentials: {
                    label: 'Missing Key',
                    className: 'bg-amber-100 text-amber-900',
                  },
                  auth_failed: {
                    label: 'Authentication Failed',
                    className: 'bg-rose-100 text-rose-900',
                  },
                  rate_limited: {
                    label: 'Rate Limited',
                    className: 'bg-amber-100 text-amber-900',
                  },
                  provider_unavailable: {
                    label: 'Provider Unavailable',
                    className: 'bg-stone-200 text-stone-800',
                  },
                  invalid_response: {
                    label: 'Invalid AI Response',
                    className: 'bg-orange-100 text-orange-900',
                  },
                  error: {
                    label: 'Connection Error',
                    className: 'bg-rose-100 text-rose-900',
                  },
                };
                const st =
                  statusMeta[prov.connectionStatus] || statusMeta.error;
                return (
                  <div
                    key={prov.id}
                    className="bg-[#FFFCF6] border border-[#E8DED0] rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#6F655B] font-semibold">
                            {prov.vendor}
                          </span>
                          <h3 className="font-serif text-2xl text-[#27231F]">
                            {prov.displayName}
                          </h3>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </div>

                      <div className="text-xs text-[#6F655B] bg-[#F6F1E8] p-3 rounded-xl border border-[#E8DED0] space-y-1">
                        <div>
                          <strong>Server Env Var:</strong>{' '}
                          <code className="font-mono text-[#27231F]">
                            {prov.credentialEnvVar}
                          </code>
                        </div>
                        <div>
                          <strong>Text Model:</strong> {prov.models.textModel}
                        </div>
                        {prov.models.imageModel && (
                          <div>
                            <strong>Image Model:</strong>{' '}
                            {prov.models.imageModel}
                          </div>
                        )}
                        {prov.models.videoModel && (
                          <div>
                            <strong>Video Model:</strong>{' '}
                            {prov.models.videoModel}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6F655B] mb-1.5">
                          Enabled Capabilities (
                          {prov.enabledCapabilities.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {prov.enabledCapabilities.map((cap) => (
                            <span
                              key={cap}
                              className="px-2 py-0.5 rounded-md bg-[#F6F1E8] border border-[#E8DED0] text-[10px] text-[#493629]"
                            >
                              {cap.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-[#6F655B] space-y-1 pt-2 border-t border-[#E8DED0]">
                        <div className="flex justify-between">
                          <span>Requests (Success / Total):</span>
                          <strong className="text-[#27231F]">
                            {prov.usage.successfulRequests} /{' '}
                            {prov.usage.totalRequests}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. Tokens (In / Out):</span>
                          <strong className="text-[#27231F]">
                            {prov.usage.estimatedInputTokens} /{' '}
                            {prov.usage.estimatedOutputTokens}
                          </strong>
                        </div>
                        <div className="text-[11px] text-[#6F655B] pt-1">
                          {prov.costEstimateNote}
                        </div>
                      </div>

                      <p className="text-[11px] text-[#6F655B]">
                        {prov.setupInstructions}
                      </p>

                      {testMessages[prov.id] && (
                        <div className="p-2.5 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-[11px] text-[#27231F]">
                          {testMessages[prov.id]}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleTestProvider(prov.id)}
                      disabled={testingProviderId === prov.id}
                      className="w-full py-2.5 rounded-xl bg-[#27231F] text-[#FFFCF6] text-xs font-medium hover:bg-[#493629] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {testingProviderId === prov.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing Server Credential...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#D6A15D]" />
                          <span>Test Connection</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
