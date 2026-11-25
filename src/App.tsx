import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { HelpCircle, Music, Settings, User, Volume2, VolumeX, X } from 'lucide-react';
import {
  ActiveNavTab,
  ArtworkMotif,
  CharacterState,
  Collection,
  ExhibitionDisplayStyle,
  Floor,
  GalleryLayoutMode,
  Memory,
  MemoryConnection,
  MuseumAudioSettings,
  MuseumSettings,
  MuseumUserAccount,
  MusicSource,
  Room,
  RoomDecorativeStyle,
  RoomStatus,
  WallFeatureId,
} from './types/museum';
import {
  RoomDesignConfig,
  RoomStarterMemoryTemplate,
} from './types/aiStudio';
import {
  buildSynthesizedRoomDesignConfig,
  instantiateStarterMemoriesForRoom,
} from './utils/roomCategoryExperience';
import {
  INITIAL_AUDIO_SETTINGS,
  INITIAL_COLLECTIONS,
  INITIAL_FLOORS,
  INITIAL_MEMORIES,
  INITIAL_ROOMS,
} from './data/initialMuseumData';
import {
  deleteMemoryFromStorageAdapter,
  fetchCurationStateFromVault,
  loadCurationStateFromStorage,
  loadMediaFromIndexedDb,
  resetUserMemoriesInVault,
  restoreAndReconcileUserMemories,
  saveCurationStateToStorage,
  syncCurationStateToVault,
  syncMemoryRecordToVault,
} from './utils/mediaStorage';
import { museumAudioEngine } from './services/audioEngine';
import { AtriumScene3D } from './components/AtriumScene3D';
import { PersistentMiniPlayer } from './components/PersistentMiniPlayer';
import {
  CurationStatusHUD,
  PlacementApprovalUpdate,
} from './components/CurationStatusHUD';
import {
  CHILDHOOD_WORLD_LOCATION_CATALOGUE,
  CurationBatchItemInput,
  CurationBatchState,
} from './types/curation';
import { executeAutoCurationBatch } from './utils/curationPipeline';

// Code-split heavy secondary views & modals so initial desktop startup only parses the Atrium shell
const MemoryDetailModal = lazy(() =>
  import('./components/MemoryDetailModal').then((m) => ({
    default: m.MemoryDetailModal,
  })),
);
const AddMemoryModal = lazy(() =>
  import('./components/AddMemoryModal').then((m) => ({
    default: m.AddMemoryModal,
  })),
);
const RoomEditorModal = lazy(() =>
  import('./components/RoomModals').then((m) => ({
    default: m.RoomEditorModal,
  })),
);
const FloorExpansionConfirmModal = lazy(() =>
  import('./components/RoomModals').then((m) => ({
    default: m.FloorExpansionConfirmModal,
  })),
);
const RoomCreatedPrompt = lazy(() =>
  import('./components/RoomModals').then((m) => ({
    default: m.RoomCreatedPrompt,
  })),
);
const CollectionsView = lazy(() =>
  import('./components/MuseumViews').then((m) => ({
    default: m.CollectionsView,
  })),
);
const ExploreSearchView = lazy(() =>
  import('./components/MuseumViews').then((m) => ({
    default: m.ExploreSearchView,
  })),
);
const MyRoomsView = lazy(() =>
  import('./components/MuseumViews').then((m) => ({
    default: m.MyRoomsView,
  })),
);
const RoomInteriorView = lazy(() =>
  import('./components/MuseumViews').then((m) => ({
    default: m.RoomInteriorView,
  })),
);
const TimelineView = lazy(() =>
  import('./components/MuseumViews').then((m) => ({
    default: m.TimelineView,
  })),
);
const AIStudioWorkspace = lazy(() =>
  import('./components/AIStudioWorkspace').then((m) => ({
    default: m.AIStudioWorkspace,
  })),
);
const MusicSoundscapesView = lazy(() =>
  import('./components/MusicSoundscapesView').then((m) => ({
    default: m.MusicSoundscapesView,
  })),
);
import {
  CharacterWelcomeBubble,
  DEFAULT_NOTIFICATION_DURATION_MS,
  FeatureWallHubModal,
  InteractiveTutorialOverlay,
  MuseumNotificationItem,
  ResetMuseumConfirmModal,
  TemporaryNotificationBanner,
  TUTORIAL_STEPS,
  UnifiedHeaderPopover,
  WelcomeScreenOverlay,
} from './components/NavigationHubModals';
import {
  BRAND,
  resolveBrowserTitle,
  resolveMuseumDisplayName,
} from './config/brand';

interface AtriumErrorBoundaryProps {
  children: React.ReactNode;
  onOpenFeatureWall: () => void;
  onResetCharacter: () => void;
}

interface AtriumErrorBoundaryState {
  hasError: boolean;
}

class AtriumErrorBoundary extends React.Component<
  AtriumErrorBoundaryProps,
  AtriumErrorBoundaryState
> {
  state: AtriumErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AtriumErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn(`[${BRAND.name}] Caught 3D scene error in AtriumErrorBoundary:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-4 left-4 z-40 max-w-sm rounded-2xl bg-[#27231F] text-[#FFFCF6] border border-[#C9A66B]/60 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#C9A66B]">
                3D View Recovery
              </p>
              <h2 className="font-serif-display text-base font-semibold text-[#FFE2B5] mt-0.5">
                Restore 3D Museum View
              </h2>
              <p className="text-xs text-[#E8DED0]/85 mt-1 leading-relaxed">
                A temporary graphics interruption occurred. Your memories and galleries remain intact.
              </p>
            </div>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              aria-label="Dismiss recovery notice"
              className="p-1 rounded-lg text-[#E8DED0]/70 hover:text-[#FFFCF6] hover:bg-white/10 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                this.props.onResetCharacter();
                this.setState({ hasError: false });
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#C9A66B] hover:brightness-105 text-[#27231F] text-xs font-semibold tracking-wide transition-all cursor-pointer"
            >
              Restore 3D View
            </button>
            <button
              type="button"
              onClick={this.props.onOpenFeatureWall}
              className="px-3 py-1.5 rounded-xl bg-[#FFFCF6]/10 hover:bg-[#FFFCF6]/20 text-[#FFFCF6] border border-[#C9A66B]/40 text-xs font-medium transition-colors cursor-pointer"
            >
              Museum Directory
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const LEGACY_STORAGE_KEYS = {
  FLOORS: 'mymuseum_floors_v2',
  ROOMS: 'mymuseum_rooms_v2',
  MEMORIES: 'mymuseum_memories_v2',
  COLLECTIONS: 'mymuseum_collections_v2',
  CONNECTIONS: 'mymuseum_connections_v2',
  AUDIO_SETTINGS: 'mymuseum_audio_settings_v2',
  CUSTOM_MUSIC: 'mymuseum_custom_music_v2',
  MUSEUM_SETTINGS: 'mymuseum_settings_v1',
  ONBOARDING_COMPLETED: 'mymuseum_onboarding_completed_v1',
};

const AUTH_STORAGE_KEY = 'mymuseum_auth_session_v1';

function getScopedStorageKeys(user: MuseumUserAccount | null) {
  if (!user || !user.id) {
    return {
      ...LEGACY_STORAGE_KEYS,
      WELCOME_SHOWN: 'mymuseum_public_demo_welcome_shown_v1',
      TUTORIAL_COMPLETED: 'mymuseum_public_demo_tutorial_completed_v1',
      CHILDHOOD_ACTIVATED: 'mymuseum_public_demo_childhood_activated_v1',
    };
  }
  const prefix = user.isGuest
    ? `mymuseum_guest_${user.id}`
    : `mymuseum_user_${user.id}`;
  return {
    FLOORS: `${prefix}_floors_v1`,
    ROOMS: `${prefix}_rooms_v1`,
    MEMORIES: `${prefix}_memories_v1`,
    COLLECTIONS: `${prefix}_collections_v1`,
    CONNECTIONS: `${prefix}_connections_v1`,
    AUDIO_SETTINGS: `${prefix}_audio_settings_v1`,
    CUSTOM_MUSIC: `${prefix}_custom_music_v1`,
    MUSEUM_SETTINGS: `${prefix}_settings_v1`,
    ONBOARDING_COMPLETED: `${prefix}_onboarding_completed_v1`,
    WELCOME_SHOWN: `${prefix}_welcome_shown_v1`,
    TUTORIAL_COMPLETED: `${prefix}_tutorial_completed_v1`,
    CHILDHOOD_ACTIVATED: `${prefix}_childhood_activated_v1`,
  };
}

function createFreshPredefinedRooms(activated = true): Room[] {
  return INITIAL_ROOMS.map((r) => {
    const isChildhood = r.id === 'childhood';
    const shouldActivate = isChildhood && activated;
    return {
      ...r,
      name: isChildhood ? 'Childhood Room' : r.name,
      status: (shouldActivate ? 'active' : 'empty') as RoomStatus,
      enabled: shouldActivate,
      isUserCreated: false,
    };
  });
}

/**
 * Ensures any persisted museum data is cleanly normalized to the 4-rooms-per-floor layout
 * (slotIndex: 0 | 1 | 2 | 3) across all floors while preserving 100% of uploaded memories,
 * custom rooms, activation states, and floor configurations.
 */
function normalizeMuseumToFourRoomsPerFloor(
  rawFloors: Floor[],
  rawRooms: Room[],
  rawMemories: Memory[],
  isBrandNewUser = false,
): {
  floors: Floor[];
  rooms: Room[];
  memories: Memory[];
} {
  // Brand new users start directly inside the museum with the Childhood Memory Park active and ready to explore
  if (isBrandNewUser) {
    const brandNewFloors: Floor[] = INITIAL_FLOORS.map((f) => ({
      ...f,
      roomSlotIds: [...f.roomSlotIds] as [string, string, string, string],
    }));
    const brandNewRooms: Room[] = createFreshPredefinedRooms(true);
    return {
      floors: brandNewFloors,
      rooms: brandNewRooms,
      memories: [],
    };
  }

  const needsMigration =
    rawFloors.some((f) => !Array.isArray(f.roomSlotIds) || f.roomSlotIds.length !== 4) ||
    rawRooms.some((r) => typeof r.slotIndex !== 'number' || r.slotIndex > 3 || r.slotIndex < 0) ||
    rawRooms.length < rawFloors.length * 4;

  if (!needsMigration) {
    return {
      floors: rawFloors,
      rooms: rawRooms,
      memories: rawMemories,
    };
  }

  // Predefined base 12 rooms (4 per floor across floors 0..2)
  const predefinedById = new Map<string, Room>(
    INITIAL_ROOMS.map((r) => [r.id, { ...r, isUserCreated: false }]),
  );
  const savedById = new Map<string, Room>(rawRooms.map((r) => [r.id, r]));

  // Carry over user customizations and active/empty statuses on known rooms
  for (const [id, baseRoom] of predefinedById.entries()) {
    const saved = savedById.get(id);
    if (saved) {
      predefinedById.set(id, {
        ...baseRoom,
        name: saved.name || baseRoom.name,
        subtitle: saved.subtitle || baseRoom.subtitle,
        description: saved.description || baseRoom.description,
        theme: saved.theme || baseRoom.theme,
        accentColor: saved.accentColor || baseRoom.accentColor,
        lightColor: saved.lightColor ?? baseRoom.lightColor,
        featuredMotif: saved.featuredMotif || baseRoom.featuredMotif,
        curatorQuote: saved.curatorQuote || baseRoom.curatorQuote,
        customCoverUrl: saved.customCoverUrl ?? baseRoom.customCoverUrl,
        exhibitionStyle: saved.exhibitionStyle ?? baseRoom.exhibitionStyle,
        galleryLayout: saved.galleryLayout ?? baseRoom.galleryLayout,
        decorativeStyle: saved.decorativeStyle ?? baseRoom.decorativeStyle,
        wallTintHex: saved.wallTintHex ?? baseRoom.wallTintHex,
        designConfig: saved.designConfig ?? baseRoom.designConfig,
        audioSettings: saved.audioSettings ?? baseRoom.audioSettings,
        status: saved.status ?? baseRoom.status,
        enabled: (saved.status ?? baseRoom.status) === 'active',
        isUserCreated: saved.isUserCreated ?? baseRoom.isUserCreated,
      });
    }
  }

  const normalizedFloors: Floor[] = INITIAL_FLOORS.map((f) => ({
    ...f,
    roomSlotIds: [...f.roomSlotIds] as [string, string, string, string],
  }));
  const normalizedRooms: Room[] = INITIAL_ROOMS.map(
    (r) => predefinedById.get(r.id) || { ...r },
  );

  // Preserve any custom user-created rooms
  const basePredefinedIds = new Set(INITIAL_ROOMS.map((r) => r.id));
  const extraUserRooms = rawRooms.filter(
    (r) => !basePredefinedIds.has(r.id) && (r.isUserCreated || r.status === 'active'),
  );

  const ordinalNames = [
    'Ground Floor',
    'First Floor',
    'Second Floor',
    'Third Floor',
    'Fourth Floor',
    'Fifth Floor',
  ];

  for (const customRoom of extraUserRooms) {
    const emptyIdx = normalizedRooms.findIndex((r) => r.status === 'empty');
    if (emptyIdx >= 0) {
      const targetSlot = normalizedRooms[emptyIdx];
      const floorObj = normalizedFloors.find(
        (f) => f.floorNumber === targetSlot.floorNumber,
      )!;
      normalizedRooms[emptyIdx] = {
        ...customRoom,
        floorId: targetSlot.floorId,
        floorNumber: targetSlot.floorNumber,
        slotIndex: targetSlot.slotIndex,
        wing: `${floorObj.name} · Slot ${targetSlot.slotIndex + 1}`,
        archIndex: targetSlot.archIndex,
      };
      floorObj.roomSlotIds[targetSlot.slotIndex] = customRoom.id;
    } else {
      // Expand with a new 4-slot floor
      const nextFloorNumber = normalizedFloors.length;
      const nextFloorId = `floor-${nextFloorNumber}`;
      const floorName =
        ordinalNames[nextFloorNumber] || `Floor ${nextFloorNumber + 1}`;
      const r0 = customRoom.id;
      const r1 = `room-f${nextFloorNumber}-s1`;
      const r2 = `room-f${nextFloorNumber}-s2`;
      const r3 = `room-f${nextFloorNumber}-s3`;
      const newFloor: Floor = {
        id: nextFloorId,
        floorNumber: nextFloorNumber,
        name: floorName,
        subtitle: 'Expanded Upper Gallery Deck & Connected Elevator Landing',
        roomSlotIds: [r0, r1, r2, r3],
        createdAt: new Date().toISOString().slice(0, 10),
      };
      normalizedFloors.push(newFloor);
      normalizedRooms.push(
        {
          ...customRoom,
          floorId: nextFloorId,
          floorNumber: nextFloorNumber,
          slotIndex: 0,
          wing: `${floorName} · Slot 1`,
          archIndex: nextFloorNumber * 4,
        },
        ...([1, 2, 3] as const).map((slotIdx) => ({
          id: `room-f${nextFloorNumber}-s${slotIdx}`,
          floorId: nextFloorId,
          floorNumber: nextFloorNumber,
          slotIndex: slotIdx,
          status: 'empty' as const,
          enabled: false,
          isUserCreated: false,
          name: `Empty Slot #${slotIdx + 1}`,
          subtitle: 'Available Gallery Wing',
          theme: 'Warm Cedar & Sunlit Meadow',
          wing: `${floorName} · Slot ${slotIdx + 1}`,
          archIndex: nextFloorNumber * 4 + slotIdx,
          description:
            'An open architectural alcove awaiting your next personal memory collection.',
          curatorQuote: 'Every new chapter deserves a quiet gallery of its own.',
          accentColor: '#D6A15D',
          lightColor: 0xfde68a,
          featuredMotif: 'courtyard_lanterns' as const,
        })),
      );
    }
  }

  const validRoomIds = new Set(normalizedRooms.map((r) => r.id));
  const normalizedMemories = rawMemories.map((mem) => {
    if (validRoomIds.has(mem.roomId)) {
      return mem;
    }
    const fallbackId = normalizedRooms[0]?.id || 'childhood';
    return {
      ...mem,
      roomId: fallbackId,
    };
  });

  return {
    floors: normalizedFloors,
    rooms: normalizedRooms,
    memories: normalizedMemories,
  };
}

function getDefaultCharacterState(): CharacterState {
  return {
    position: [0, 0, 5.2],
    rotationY: Math.PI,
    currentFloorId: 'floor-0',
    currentFloorNumber: 0,
    pose: 'idle',
    nearbyRoomId: null,
    nearbySlotFloorId: null,
    nearbySlotIndex: null,
    isOnStairs: false,
    isInLift: false,
  };
}

export default function App() {
  // 0. Authenticated User & Session State (Never stores passwords in localStorage)
  const [currentUser, setCurrentUser] = useState<MuseumUserAccount | null>(
    () => {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.user?.id && parsed?.user?.email) {
            return parsed.user as MuseumUserAccount;
          }
        }
      } catch {
        // ignore
      }
      return null;
    },
  );

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.sessionToken === 'string') {
          return parsed.sessionToken;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const scopedKeys = useMemo(
    () => getScopedStorageKeys(currentUser),
    [currentUser],
  );

  // Verify session with backend on startup if a token is present
  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    })
      .then(async (res) => {
        if (res.status === 401) {
          return { unauthorized: true };
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (cancelled || !data) return;
        if ('unauthorized' in data && data.unauthorized) {
          // Session token was expired, revoked, or compromised — clear local auth and private state
          try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          } catch {
            // ignore
          }
          setMemories([]);
          setCollections([]);
          setApprovedConnections([]);
          setCustomMusicSources([]);
          setSelectedMemoryId(null);
          setActiveRoomId(null);
          setCurrentUser(null);
          setSessionToken(null);
          return;
        }
        if (data?.ok && data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {
        // Keep existing local session if offline
      });
    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  // 1. Persistent State with Per-User Isolation (New users start completely fresh; Guest/Existing preserves data)
  const loadUserMuseumData = useCallback((user: MuseumUserAccount | null) => {
    const keys = getScopedStorageKeys(user);
    const isPrivateAccount = Boolean(user && !user.isGuest);
    const isBrandNewUser = localStorage.getItem(keys.ROOMS) === null;
    let loadedFloors: Floor[] = INITIAL_FLOORS;
    try {
      const saved = localStorage.getItem(keys.FLOORS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          loadedFloors = parsed;
        }
      }
    } catch {
      // ignore
    }

    let loadedRooms: Room[] = isBrandNewUser
      ? createFreshPredefinedRooms(false)
      : createFreshPredefinedRooms(true);
    try {
      const saved = localStorage.getItem(keys.ROOMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length >= 4 &&
          typeof parsed[0]?.slotIndex === 'number'
        ) {
          loadedRooms = parsed;
        }
      }
    } catch {
      // ignore
    }

    // Genuinely new users start with 0 memories; returning users preserve all memories
    let loadedMemories: Memory[] = (isBrandNewUser || isPrivateAccount) ? [] : INITIAL_MEMORIES;
    try {
      const saved = localStorage.getItem(keys.MEMORIES);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loadedMemories = parsed;
        }
      }
    } catch {
      // ignore
    }

    const isChildhoodExplicitlyActivated =
      localStorage.getItem(keys.CHILDHOOD_ACTIVATED) !== 'false';

    const normalized = normalizeMuseumToFourRoomsPerFloor(
      loadedFloors,
      loadedRooms,
      loadedMemories,
      isBrandNewUser,
    );
    loadedFloors = normalized.floors;
    loadedRooms = normalized.rooms.map((r) => {
      if (r.id === 'childhood') {
        return {
          ...r,
          name:
            r.name && !r.name.startsWith('Empty Slot')
              ? r.name
              : 'Childhood Room',
          status: (isChildhoodExplicitlyActivated ? 'active' : 'empty') as RoomStatus,
          enabled: isChildhoodExplicitlyActivated,
        };
      }
      return {
        ...r,
        status: 'empty' as RoomStatus,
        enabled: false,
      };
    });
    loadedMemories = normalized.memories.map((m) => ({
      ...m,
      roomId: 'childhood',
    }));

    let loadedCollections: Collection[] = isPrivateAccount
      ? []
      : INITIAL_COLLECTIONS;
    try {
      const saved = localStorage.getItem(keys.COLLECTIONS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loadedCollections = parsed;
        }
      }
    } catch {
      // ignore
    }

    let loadedAudio: MuseumAudioSettings = INITIAL_AUDIO_SETTINGS;
    try {
      const saved = localStorage.getItem(keys.AUDIO_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.masterVolume === 'number') {
          loadedAudio = parsed;
        }
      }
    } catch {
      // ignore
    }

    let loadedCustomMusic: MusicSource[] = [];
    try {
      const saved = localStorage.getItem(keys.CUSTOM_MUSIC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loadedCustomMusic = parsed;
        }
      }
    } catch {
      // ignore
    }

    const prefersReduced =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    let loadedSettings: MuseumSettings = {
      projectName: BRAND.name,
      curatorName: user?.displayName || 'Elena Vance',
      curatorBio:
        'Preserving the people, places, and moments that shape our lives.',
      mouseSensitivity: 1.0,
      invertCameraY: false,
      reducedMotion: prefersReduced,
      showMiniMap: true,
      highContrastPlaqueText: false,
      showOptionalTips: true,
    };

    try {
      const saved = localStorage.getItem(keys.MUSEUM_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.projectName === 'string') {
          loadedSettings = {
            projectName: parsed.projectName || BRAND.name,
            curatorName:
              parsed.curatorName || user?.displayName || 'Elena Vance',
            curatorBio:
              parsed.curatorBio ||
              'Preserving the people, places, and moments that shape our lives.',
            mouseSensitivity:
              typeof parsed.mouseSensitivity === 'number'
                ? parsed.mouseSensitivity
                : 1.0,
            invertCameraY: Boolean(parsed.invertCameraY),
            reducedMotion:
              typeof parsed.reducedMotion === 'boolean'
                ? parsed.reducedMotion
                : prefersReduced,
            showMiniMap:
              typeof parsed.showMiniMap === 'boolean'
                ? parsed.showMiniMap
                : true,
            highContrastPlaqueText: Boolean(parsed.highContrastPlaqueText),
            showOptionalTips:
              typeof parsed.showOptionalTips === 'boolean'
                ? parsed.showOptionalTips
                : true,
          };
        }
      }
    } catch {
      // ignore
    }

    let loadedConnections: MemoryConnection[] = [];
    try {
      const saved = localStorage.getItem(keys.CONNECTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loadedConnections = parsed;
        }
      }
    } catch {
      // ignore
    }

    const savedCuration = loadCurationStateFromStorage(user?.id);
    if (savedCuration) {
      if (
        Array.isArray(savedCuration.collections) &&
        savedCuration.collections.length > 0 &&
        loadedCollections.length === 0
      ) {
        loadedCollections = savedCuration.collections;
      }
      if (
        Array.isArray(savedCuration.connections) &&
        savedCuration.connections.length > 0 &&
        loadedConnections.length === 0
      ) {
        loadedConnections = savedCuration.connections;
      }
    }

    return {
      loadedFloors,
      loadedRooms,
      loadedMemories,
      loadedCollections,
      loadedConnections,
      loadedAudio,
      loadedCustomMusic,
      loadedSettings,
    };
  }, []);

  const initialBundle = useMemo(
    () => loadUserMuseumData(currentUser),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [floors, setFloors] = useState<Floor[]>(initialBundle.loadedFloors);
  const [rooms, setRooms] = useState<Room[]>(initialBundle.loadedRooms);
  const [memories, setMemories] = useState<Memory[]>(
    initialBundle.loadedMemories,
  );
  const [collections, setCollections] = useState<Collection[]>(
    initialBundle.loadedCollections,
  );
  const [approvedConnections, setApprovedConnections] = useState<
    MemoryConnection[]
  >(initialBundle.loadedConnections);
  const [audioSettings, setAudioSettings] = useState<MuseumAudioSettings>(
    initialBundle.loadedAudio,
  );
  const [customMusicSources, setCustomMusicSources] = useState<MusicSource[]>(
    initialBundle.loadedCustomMusic,
  );
  const [museumSettings, setMuseumSettings] = useState<MuseumSettings>(
    initialBundle.loadedSettings,
  );

  // Rehydrate IndexedDB binary media & reconcile with authenticated server vault on startup, login, or network reconnect
  useEffect(() => {
    let cancelled = false;

    async function runCompleteMemoryRestoration() {
      if (!currentUser?.id || !sessionToken) {
        // Guest / local mode: rehydrate all IndexedDB-backed uploaded photos & media across refreshes
        const updates: Record<string, string> = {};
        for (const mem of memories) {
          const needsHydration =
            mem.customImageUrl?.startsWith('idb://') ||
            mem.mediaUrl?.startsWith('idb://') ||
            ((mem.id.startsWith('mem-upload-') || mem.id.startsWith('mem-auto-')) &&
              (!mem.customImageUrl ||
                mem.customImageUrl.startsWith('blob:') ||
                !mem.mediaUrl ||
                mem.mediaUrl.startsWith('blob:')));
          if (needsHydration) {
            const dataUrl = await loadMediaFromIndexedDb(mem.id);
            if (dataUrl) updates[mem.id] = dataUrl;
          }
        }
        if (!cancelled && Object.keys(updates).length > 0) {
          setMemories((prev) =>
            prev.map((m) =>
              updates[m.id]
                ? {
                    ...m,
                    customImageUrl:
                      (m.type || m.mediaType || 'image') === 'image'
                        ? updates[m.id]
                        : m.customImageUrl,
                    mediaUrl: updates[m.id],
                  }
                : m,
            ),
          );
        }
        return;
      }

      const keys = getScopedStorageKeys(currentUser);
      let currentLocal: Memory[] = [];
      try {
        const saved = localStorage.getItem(keys.MEMORIES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) currentLocal = parsed;
        }
      } catch {
        // ignore
      }

      const reconciled = await restoreAndReconcileUserMemories({
        userId: currentUser.id,
        sessionToken,
        localMemories: currentLocal,
      });

      if (cancelled || !reconciled.ok) return;

      // Hydrate any idb:// references from IndexedDB into active session memory state
      const hydrated = await Promise.all(
        reconciled.memories.map(async (m) => {
          if (
            m.customImageUrl?.startsWith('idb://') ||
            m.mediaUrl?.startsWith('idb://')
          ) {
            const dataUrl = await loadMediaFromIndexedDb(m.id);
            if (dataUrl) {
              return {
                ...m,
                customImageUrl:
                  (m.type || m.mediaType || 'image') === 'image'
                    ? dataUrl
                    : m.customImageUrl,
                mediaUrl: dataUrl,
              };
            }
          }
          return m;
        }),
      );

      if (cancelled) return;
      setMemories(hydrated);
      try {
        const lightweight = hydrated.map((m) => ({
          ...m,
          customImageUrl:
            m.customImageUrl &&
            m.customImageUrl.startsWith('data:') &&
            m.customImageUrl.length > 16384
              ? `idb://${m.id}`
              : m.customImageUrl,
          mediaUrl:
            m.mediaUrl &&
            m.mediaUrl.startsWith('data:') &&
            m.mediaUrl.length > 16384
              ? `idb://${m.id}`
              : m.mediaUrl,
        }));
        localStorage.setItem(keys.MEMORIES, JSON.stringify(lightweight));
      } catch {
        // ignore
      }

      // If memories were restored from the server for the childhood room, ensure the room is marked active
      if (reconciled.memories.length > 0) {
        try {
          localStorage.setItem(keys.CHILDHOOD_ACTIVATED, 'true');
        } catch {
          // ignore
        }
        setRooms((prev) =>
          prev.map((r) =>
            r.id === 'childhood'
              ? {
                  ...r,
                  name:
                    r.name && !r.name.startsWith('Empty Slot')
                      ? r.name
                      : 'Childhood Room',
                  status: 'active',
                  enabled: true,
                }
              : r,
          ),
        );
      }

      const remoteCuration = await fetchCurationStateFromVault(sessionToken);
      if (!cancelled && remoteCuration) {
        if (remoteCuration.collections.length > 0) {
          setCollections(remoteCuration.collections);
        }
        if (remoteCuration.connections.length > 0) {
          setApprovedConnections(remoteCuration.connections);
        }
      }
    }

    runCompleteMemoryRestoration();

    const handleOnline = () => {
      if (!cancelled && currentUser?.id && sessionToken) {
        runCompleteMemoryRestoration();
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
    };
  }, [currentUser?.id, sessionToken]);

  // Persist user-scoped state cleanly (only when an authenticated user or isolated guest session is active)
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      localStorage.setItem(scopedKeys.FLOORS, JSON.stringify(floors));
    } catch {
      // ignore
    }
  }, [floors, scopedKeys.FLOORS, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      localStorage.setItem(scopedKeys.ROOMS, JSON.stringify(rooms));
    } catch {
      // ignore
    }
  }, [rooms, scopedKeys.ROOMS, currentUser?.id]);

  useEffect(() => {
    try {
      // Never store large base64 image binaries directly in localStorage; keep idb:// pointers instead
      const lightweight = memories.map((m) => ({
        ...m,
        customImageUrl:
          m.customImageUrl &&
          m.customImageUrl.startsWith('data:') &&
          m.customImageUrl.length > 16384
            ? `idb://${m.id}`
            : m.customImageUrl,
        mediaUrl:
          m.mediaUrl &&
          m.mediaUrl.startsWith('data:') &&
          m.mediaUrl.length > 16384
            ? `idb://${m.id}`
            : m.mediaUrl,
      }));
      localStorage.setItem(scopedKeys.MEMORIES, JSON.stringify(lightweight));
    } catch {
      // ignore
    }
  }, [memories, scopedKeys.MEMORIES]);

  useEffect(() => {
    try {
      localStorage.setItem(
        scopedKeys.COLLECTIONS,
        JSON.stringify(collections),
      );
    } catch {
      // ignore
    }
  }, [collections, scopedKeys.COLLECTIONS]);

  useEffect(() => {
    try {
      localStorage.setItem(
        scopedKeys.CONNECTIONS,
        JSON.stringify(approvedConnections),
      );
    } catch {
      // ignore
    }
  }, [approvedConnections, scopedKeys.CONNECTIONS]);

  useEffect(() => {
    saveCurationStateToStorage(currentUser?.id, {
      collections,
      connections: approvedConnections,
    });
  }, [collections, approvedConnections, currentUser?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(
        scopedKeys.AUDIO_SETTINGS,
        JSON.stringify(audioSettings),
      );
    } catch {
      // ignore
    }
  }, [audioSettings, scopedKeys.AUDIO_SETTINGS]);

  useEffect(() => {
    try {
      localStorage.setItem(
        scopedKeys.CUSTOM_MUSIC,
        JSON.stringify(customMusicSources),
      );
    } catch {
      // ignore
    }
  }, [customMusicSources, scopedKeys.CUSTOM_MUSIC]);

  useEffect(() => {
    try {
      localStorage.setItem(
        scopedKeys.MUSEUM_SETTINGS,
        JSON.stringify(museumSettings),
      );
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.title = resolveBrowserTitle(museumSettings.projectName);
    }
  }, [museumSettings, scopedKeys.MUSEUM_SETTINGS]);

  // 2. Navigation, 3D Explorer Character, Character Welcome & Onboarding States
  const [activeNav, setActiveNav] = useState<ActiveNavTab>('home');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomEntryTransition, setRoomEntryTransition] = useState(false);
  const roomEntryActivateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomEntryHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRoomCatalogueOpen, setIsRoomCatalogueOpen] =
    useState<boolean>(false);
  const [hasEnteredAtrium, setHasEnteredAtrium] = useState<boolean>(true);

  // Keep the entry transition timers scoped to the application lifecycle.
  useEffect(() => {
    return () => {
      if (roomEntryActivateTimerRef.current) {
        clearTimeout(roomEntryActivateTimerRef.current);
      }
      if (roomEntryHideTimerRef.current) {
        clearTimeout(roomEntryHideTimerRef.current);
      }
    };
  }, []);
  const [characterWelcomeActive, setCharacterWelcomeActive] =
    useState<boolean>(false);

  // Temporary 10-Second Notification / Tip State (Single active item, non-repeating tips, critical exception)
  const [activeNotification, setActiveNotification] =
    useState<MuseumNotificationItem | null>(null);
  const shownTipIdsRef = useRef<Set<string>>(new Set());

  const emitNotification = useCallback(
    (
      id: string,
      message: string,
      detail?: string,
      priority: 'tip' | 'important' | 'critical' = 'tip',
      persistent = false,
    ) => {
      if (priority === 'tip' && museumSettings.showOptionalTips === false) {
        return;
      }
      if (priority === 'tip' && shownTipIdsRef.current.has(id)) {
        return;
      }
      if (priority === 'tip') {
        shownTipIdsRef.current.add(id);
      }
      setActiveNotification((prev) => {
        // Never allow an ordinary tip or non-critical notice to overwrite an active critical warning
        if (
          prev &&
          (prev.priority === 'critical' || prev.persistent) &&
          priority !== 'critical'
        ) {
          return prev;
        }
        // Do not let an ordinary tip override an active important confirmation
        if (prev && prev.priority === 'important' && priority === 'tip') {
          return prev;
        }
        return {
          id: `${id}-${Date.now()}`,
          message,
          detail,
          priority,
          durationMs: DEFAULT_NOTIFICATION_DURATION_MS,
          persistent: persistent || priority === 'critical',
        };
      });
    },
    [museumSettings.showOptionalTips],
  );

  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);

  const [isFeatureWallModalOpen, setIsFeatureWallModalOpen] = useState(false);
  const [featureWallSection, setFeatureWallSection] =
    useState<WallFeatureId>('museum_settings');
  const [externalLiftRequest, setExternalLiftRequest] = useState<{
    floorNumber: number;
    timestamp: number;
  } | null>(null);

  const [characterState, setCharacterState] = useState<CharacterState>(
    getDefaultCharacterState,
  );

  // 3. Modals, Smart Room Creation & Popovers State
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [isAddMemoryOpen, setIsAddMemoryOpen] = useState(false);
  const [addMemoryDefaultRoomId, setAddMemoryDefaultRoomId] = useState<
    string | null
  >(null);
  const [curationBatchState, setCurationBatchState] =
    useState<CurationBatchState | null>(null);
  const lastBatchInputItemsRef = useRef<CurationBatchItemInput[] | null>(null);

  const recordReversibleSnapshot = useCallback(
    (summaryLabel: string) => {
      const undoSnapshot = {
        batchId: `undo_${Date.now()}`,
        createdAt: new Date().toISOString(),
        createdMemoryIds: [],
        createdCollectionIds: [],
        previousMemories: [...memories],
        previousCollections: [...collections],
        previousConnections: [...approvedConnections],
        summaryLabel,
      };
      setCurationBatchState((prev) => ({
        batchId: prev?.batchId || `org_${Date.now()}`,
        phase: 'ready',
        phaseLabel: summaryLabel,
        totalCount: prev?.totalCount || 1,
        completedCount: prev?.completedCount || 1,
        failedCount: 0,
        items: prev?.items || [],
        primaryReadyCollectionId: prev?.primaryReadyCollectionId,
        primaryReadyCollectionTitle: prev?.primaryReadyCollectionTitle,
        lastUndoSnapshot: undoSnapshot,
      }));
    },
    [memories, collections, approvedConnections],
  );

  const [isRoomEditorOpen, setIsRoomEditorOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [targetFloorForSlot, setTargetFloorForSlot] = useState<Floor | null>(
    null,
  );
  const [targetSlotIndex, setTargetSlotIndex] = useState<0 | 1 | 2 | 3>(0);

  const [isFloorExpansionOpen, setIsFloorExpansionOpen] = useState(false);
  const [newlyCreatedRoom, setNewlyCreatedRoom] = useState<Room | null>(null);
  const [showActivationThankYou, setShowActivationThankYou] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const [quickSearchQuery] = useState('');
  const [exploreSubTab, setExploreSubTab] = useState<
    'search' | 'map' | 'people' | 'dashboard'
  >('search');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
  const [showControlsGuide, setShowControlsGuide] = useState(false);
  const [atriumOpeningVeil, setAtriumOpeningVeil] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(
    () => museumAudioEngine.getSnapshot().isPlaying,
  );

  useEffect(() => {
    const timer = setTimeout(() => setAtriumOpeningVeil(false), 550);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return museumAudioEngine.subscribe((snap) => {
      setIsAudioPlaying((prev) =>
        prev === snap.isPlaying ? prev : snap.isPlaying,
      );
    });
  }, []);

  // 4. Derived Lookups
  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeRoomId) || null,
    [rooms, activeRoomId],
  );

  const childhoodRoom = useMemo(
    () => rooms.find((r) => r.id === 'childhood') || rooms[0] || null,
    [rooms],
  );

  const isChildhoodRoomActive = childhoodRoom?.status === 'active';

  const activatedRoomsCount = useMemo(
    () => (isChildhoodRoomActive ? 1 : 0),
    [isChildhoodRoomActive],
  );

  useEffect(() => {
    museumAudioEngine.syncState(audioSettings, activeRoom, customMusicSources);
  }, [audioSettings, activeRoom, customMusicSources]);

  const activeRoomMemories = useMemo(
    () => memories.filter((m) => m.roomId === activeRoomId),
    [memories, activeRoomId],
  );

  const modalMemoryPool = useMemo(() => {
    if (activeRoomId) {
      return memories.filter((m) => m.roomId === activeRoomId);
    }
    return memories;
  }, [memories, activeRoomId]);

  const selectedMemoryIndex = useMemo(
    () => modalMemoryPool.findIndex((m) => m.id === selectedMemoryId),
    [modalMemoryPool, selectedMemoryId],
  );

  const selectedMemory =
    selectedMemoryIndex >= 0
      ? modalMemoryPool[selectedMemoryIndex]
      : memories.find((m) => m.id === selectedMemoryId) || null;

  // 5. Authentication & Onboarding Handlers
  const handleAuthenticated = (
    user: MuseumUserAccount,
    token: string,
    isNewRegistration: boolean,
  ) => {
    try {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user, sessionToken: token }),
      );
    } catch {
      // ignore
    }

    const keys = getScopedStorageKeys(user);

    if (isNewRegistration && !user.isGuest) {
      // Fresh Start for New Users:
      // 0 memories, 0 collections, 0 personal stories/documents, 0 user-created rooms, 0 saved playlists,
      // 3 default floors with 4 predefined room slots per floor
      const freshFloors = INITIAL_FLOORS;
      const freshRooms = createFreshPredefinedRooms();
      const freshMemories: Memory[] = [];
      const freshCollections: Collection[] = [];
      const freshPlaylists: MusicSource[] = [];
      const prefersReduced =
        typeof window !== 'undefined'
          ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
          : false;
      const freshSettings: MuseumSettings = {
        projectName: BRAND.name,
        curatorName: user.displayName,
        curatorBio:
          'Preserving the people, places, and moments that shape our lives.',
        mouseSensitivity: 1.0,
        invertCameraY: false,
        reducedMotion: prefersReduced,
        showMiniMap: true,
        highContrastPlaqueText: false,
        showOptionalTips: true,
      };

      try {
        localStorage.setItem(keys.FLOORS, JSON.stringify(freshFloors));
        localStorage.setItem(keys.ROOMS, JSON.stringify(freshRooms));
        localStorage.setItem(keys.MEMORIES, JSON.stringify(freshMemories));
        localStorage.setItem(
          keys.COLLECTIONS,
          JSON.stringify(freshCollections),
        );
        localStorage.setItem(keys.CONNECTIONS, JSON.stringify([]));
        localStorage.setItem(
          keys.CUSTOM_MUSIC,
          JSON.stringify(freshPlaylists),
        );
        localStorage.setItem(
          keys.MUSEUM_SETTINGS,
          JSON.stringify(freshSettings),
        );
        localStorage.setItem(keys.ONBOARDING_COMPLETED, 'true');
      } catch {
        // ignore
      }

      setFloors(freshFloors);
      setRooms(freshRooms);
      setMemories(freshMemories);
      setCollections(freshCollections);
      setApprovedConnections([]);
      setCustomMusicSources(freshPlaylists);
      setAudioSettings(INITIAL_AUDIO_SETTINGS);
      setMuseumSettings(freshSettings);
      setCharacterState(getDefaultCharacterState());
      setCurrentUser(user);
      setSessionToken(token);
      setActiveRoomId(null);
      setActiveNav('home');
      setHasEnteredAtrium(true);
      setCharacterWelcomeActive(false);
      try {
        localStorage.setItem(keys.WELCOME_SHOWN, 'true');
      } catch {
        // ignore
      }
      return;
    }

    // Returning user or Guest session: load their isolated museum state without clearing existing data
    const bundle = loadUserMuseumData(user);
    setFloors(bundle.loadedFloors);
    setRooms(bundle.loadedRooms);
    setMemories(bundle.loadedMemories);
    setCollections(bundle.loadedCollections);
    setApprovedConnections(bundle.loadedConnections);
    setAudioSettings(bundle.loadedAudio);
    setCustomMusicSources(bundle.loadedCustomMusic);
    setMuseumSettings({
      ...bundle.loadedSettings,
      curatorName: user.displayName || bundle.loadedSettings.curatorName,
    });
    setCharacterState(getDefaultCharacterState());
    setCurrentUser(user);
    setSessionToken(token);
    setActiveRoomId(null);
    setActiveNav('home');
    setHasEnteredAtrium(true);
    setCharacterWelcomeActive(false);
    try {
      localStorage.setItem(keys.WELCOME_SHOWN, 'true');
    } catch {
      // ignore
    }
  };

  const handleSignOut = async () => {
    if (roomEntryActivateTimerRef.current) {
      clearTimeout(roomEntryActivateTimerRef.current);
      roomEntryActivateTimerRef.current = null;
    }
    if (roomEntryHideTimerRef.current) {
      clearTimeout(roomEntryHideTimerRef.current);
      roomEntryHideTimerRef.current = null;
    }
    setRoomEntryTransition(false);
    const tokenToRevoke = sessionToken;
    // 1. Immediately clear all private in-memory state so no subsequent user or guest can see previous memories
    setMemories([]);
    setCollections([]);
    setApprovedConnections([]);
    setCustomMusicSources([]);
    setSelectedMemoryId(null);
    setRooms(createFreshPredefinedRooms(false));
    setFloors(INITIAL_FLOORS);
    setCurrentUser(null);
    setSessionToken(null);
    setHasEnteredAtrium(false);
    setCharacterWelcomeActive(false);
    setTutorialActive(false);
    setActiveRoomId(null);
    setActiveNav('home');
    setShowProfileMenu(false);

    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: tokenToRevoke
          ? { Authorization: `Bearer ${tokenToRevoke}` }
          : undefined,
      });
    } catch {
      // ignore network error on logout
    }
  };

  const handleMarkTutorialCompleted = () => {
    setTutorialActive(false);
    try {
      localStorage.setItem(scopedKeys.TUTORIAL_COMPLETED, 'true');
    } catch {
      // ignore
    }
  };

  // 6. Museum Room, Memory & Reset Handlers
  const handleActivateChildhoodRoom = useCallback(() => {
    try {
      localStorage.setItem(scopedKeys.CHILDHOOD_ACTIVATED, 'true');
    } catch {
      // ignore
    }
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === 'childhood') {
          const existingMemories = memories.filter((m) => m.roomId === 'childhood');
          const designConfig =
            r.designConfig ||
            buildSynthesizedRoomDesignConfig({
              roomName: 'Childhood Room',
              promptOrNotes: 'Nostalgic childhood bedroom and sunlit backyard',
              memories: existingMemories,
            });
          return {
            ...r,
            name: 'Childhood Room',
            status: 'active',
            enabled: true,
            isUserCreated: true,
            designConfig,
          };
        }
        return {
          ...r,
          status: 'empty',
          enabled: false,
        };
      }),
    );
    // Do not immediately enter the room after activation; show the thank-you screen first
    setActiveRoomId(null);
    setActiveNav('home');
    setIsRoomEditorOpen(false);
    setCharacterWelcomeActive(false);
    setNewlyCreatedRoom(null);
    setShowActivationThankYou(true);
  }, [memories, scopedKeys.CHILDHOOD_ACTIVATED]);

  const handleExploreMyRoomAfterActivation = useCallback(() => {
    setShowActivationThankYou(false);
    setActiveRoomId(null);
    setActiveNav('home');
    setHasEnteredAtrium(true);
    setCharacterWelcomeActive(false);
    // Keep the character naturally inside the central atrium lobby on the Ground Floor
    setCharacterState((prev) => ({
      ...prev,
      position: [0, 0, 4.8],
      rotationY: Math.PI,
      currentFloorId: 'floor-0',
      currentFloorNumber: 0,
      pose: 'idle',
      isInLift: false,
    }));

    // Launch the 6-step Interactive Project Walkthrough if this is the first time
    const alreadyCompleted =
      localStorage.getItem(scopedKeys.TUTORIAL_COMPLETED) === 'true';
    if (!alreadyCompleted) {
      setTutorialStepIndex(0);
      setTutorialActive(true);
    }
  }, [scopedKeys.TUTORIAL_COMPLETED]);

  const handleDeactivateChildhoodRoom = useCallback(() => {
    try {
      localStorage.setItem(scopedKeys.CHILDHOOD_ACTIVATED, 'false');
    } catch {
      // ignore
    }
    setRooms((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'empty',
        enabled: false,
      })),
    );
    setActiveRoomId(null);
    setShowActivationThankYou(false);
    setNewlyCreatedRoom(null);
  }, [scopedKeys.CHILDHOOD_ACTIVATED]);

  const handleEnterRoom = useCallback(
    (roomId: string) => {
      const targetId = rooms.some((r) => r.id === roomId) ? roomId : 'childhood';
      const targetRoom = rooms.find((r) => r.id === targetId);
      if (!targetRoom) return;

      // Guard against duplicate entry triggers when already inside this room
      if (activeRoomId === targetId) return;

      if (roomEntryActivateTimerRef.current) {
        clearTimeout(roomEntryActivateTimerRef.current);
        roomEntryActivateTimerRef.current = null;
      }
      if (roomEntryHideTimerRef.current) {
        clearTimeout(roomEntryHideTimerRef.current);
        roomEntryHideTimerRef.current = null;
      }

      if (targetRoom.status !== 'active') {
        try {
          if (targetId === 'childhood') {
            localStorage.setItem(scopedKeys.CHILDHOOD_ACTIVATED, 'true');
          }
        } catch {
          // ignore
        }
        setRooms((prev) =>
          prev.map((r) =>
            r.id === targetId
              ? {
                  ...r,
                  status: 'active',
                  enabled: true,
                }
              : r,
          ),
        );
      }

      setHasEnteredAtrium(true);
      setActiveNav('home');
      setIsRoomCatalogueOpen(false);
      setIsMusicPlayerOpen(false);
      setShowControlsGuide(false);
      setShowProfileMenu(false);
      setShowActivationThankYou(false);
      setActiveNotification(null);
      setNewlyCreatedRoom(null);

      // Set activeRoomId immediately so AtriumScene3D mounts the 3D room on the very first frame
      // and never re-triggers doorway detection in a 60fps loop.
      setActiveRoomId(targetId);
      setRoomEntryTransition(true);

      roomEntryHideTimerRef.current = setTimeout(() => {
        setRoomEntryTransition(false);
        roomEntryHideTimerRef.current = null;
      }, 1250);
    },
    [rooms, activeRoomId, scopedKeys.CHILDHOOD_ACTIVATED],
  );

  const handleBackToAtrium = useCallback(() => {
    if (roomEntryActivateTimerRef.current) {
      clearTimeout(roomEntryActivateTimerRef.current);
      roomEntryActivateTimerRef.current = null;
    }
    if (roomEntryHideTimerRef.current) {
      clearTimeout(roomEntryHideTimerRef.current);
      roomEntryHideTimerRef.current = null;
    }
    setRoomEntryTransition(false);
    setIsRoomCatalogueOpen(false);
    setActiveRoomId(null);
    setActiveNav('home');
  }, []);

  const handleToggleFavorite = (memoryId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMemories((prev) =>
      prev.map((m) =>
        m.id === memoryId ? { ...m, isFavorite: !m.isFavorite } : m,
      ),
    );
  };

  const handleReassignMemoryRoom = (memoryId: string, newRoomId: string) => {
    const targetRoom = rooms.find((r) => r.id === newRoomId);
    const mem = memories.find((m) => m.id === memoryId);
    if (!targetRoom || !mem) return;

    const previousMemories = memories;
    const nextMemories = memories.map((m) =>
      m.id === memoryId ? { ...m, roomId: newRoomId } : m,
    );

    try {
      localStorage.setItem(scopedKeys.MEMORIES, JSON.stringify(nextMemories));
      setMemories(nextMemories);
      emitNotification(
        `memory-moved-${memoryId}-${Date.now()}`,
        `Exhibit Moved to ${targetRoom.name}`,
        `“${mem.title}” and all its metadata and media are now in ${targetRoom.name}.`,
        'important',
      );
    } catch {
      setMemories(previousMemories);
      emitNotification(
        `memory-move-error-${memoryId}`,
        'Could Not Save Room Transfer',
        'Storage limit reached. Your exhibit was restored to its original room.',
        'critical',
        true,
      );
    }
  };

  const handleUpdateRoomLayout = (
    roomId: string,
    galleryLayout: GalleryLayoutMode,
  ) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, galleryLayout } : r)),
    );
  };

  const handleUpdateRoomExhibitionStyle = useCallback(
    (roomId: string, exhibitionStyle: ExhibitionDisplayStyle) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, exhibitionStyle } : r)),
      );
    },
    [],
  );

  const handleUpdateRoomDesignConfig = useCallback(
    (
      roomId: string,
      designPatch: Partial<NonNullable<Room['designConfig']>>,
    ) => {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? {
                ...r,
                designConfig: {
                  ...(r.designConfig || {
                    themeName: r.theme || 'Golden Hour Salon',
                    wallColorHex: '#F3EBDD',
                    floorTintHex: '#E8D9C5',
                    archColorHex: '#DFD2BE',
                    accentColorHex: r.accentColor || '#C9A66B',
                    lightingPreset: 'golden_hour',
                    lightIntensity: 2.35,
                    exhibitLayout: 'salon_grid',
                    decorations: 'botanical_olive',
                    curatorQuote: r.curatorQuote || '',
                    roomDescription: r.description || '',
                    curatorRationale:
                      r.curatorQuote || `${BRAND.name} curatorial configuration.`,
                  }),
                  ...designPatch,
                },
              }
            : r,
        ),
      );
    },
    [],
  );

  const handleReorderRoomMemories = (
    roomId: string,
    orderedMemoryIds: string[],
  ) => {
    const previousMemories = memories;
    const orderLookup = new Map<string, number>();
    orderedMemoryIds.forEach((id, idx) => {
      orderLookup.set(id, idx);
    });

    const nextMemories = memories.map((m) => {
      if (m.roomId !== roomId) return m;
      const newOrder = orderLookup.get(m.id);
      return typeof newOrder === 'number'
        ? { ...m, displayOrder: newOrder }
        : m;
    });

    try {
      localStorage.setItem(scopedKeys.MEMORIES, JSON.stringify(nextMemories));
      setMemories(nextMemories);
    } catch {
      setMemories(previousMemories);
      emitNotification(
        `reorder-error-${roomId}`,
        'Could Not Save Exhibit Order',
        'Your gallery returned to its previous saved order.',
        'critical',
        true,
      );
    }
  };

  const handleApproveMemoryConnection = (connection: MemoryConnection) => {
    setApprovedConnections((prev) => {
      const exists = prev.some((c) => c.id === connection.id);
      if (exists) {
        return prev.map((c) => (c.id === connection.id ? connection : c));
      }
      return [
        { ...connection, status: 'approved', approvedAt: new Date().toISOString() },
        ...prev,
      ];
    });
    emitNotification(
      `connection-approved-${connection.id}`,
      'Memory Connection Approved',
      `Saved "${connection.relationshipLabel}" to your personal museum archive.`,
      'important',
    );
  };

  const handleRemoveMemoryConnection = (connectionId: string) => {
    setApprovedConnections((prev) =>
      prev.filter((c) => c.id !== connectionId),
    );
  };

  const handleUpdateMemory = (updated: Memory) => {
    recordReversibleSnapshot(`Updated "${updated.title}"`);
    const stamped = {
      ...updated,
      updatedAt: new Date().toISOString(),
    } as Memory;
    setMemories((prev) =>
      prev.map((m) => (m.id === stamped.id ? stamped : m)),
    );
    syncMemoryRecordToVault(
      stamped as unknown as { id: string; [key: string]: unknown },
      currentUser?.id,
      sessionToken,
    ).catch(() => {});
  };

  const handleDeleteMemory = (memoryId: string) => {
    const targetMem = memories.find((m) => m.id === memoryId);
    recordReversibleSnapshot(`Removed "${targetMem?.title || 'memory'}"`);
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    setCollections((prev) =>
      prev.map((c) => ({
        ...c,
        memoryIds: c.memoryIds.filter((id) => id !== memoryId),
      })),
    );
    setApprovedConnections((prev) =>
      prev.filter(
        (c) => c.sourceMemoryId !== memoryId && c.targetMemoryId !== memoryId,
      ),
    );
    if (selectedMemoryId === memoryId) {
      setSelectedMemoryId(null);
    }
    deleteMemoryFromStorageAdapter(
      memoryId,
      currentUser?.id,
      sessionToken,
    ).catch(() => {});
  };

  const handleAddMemories = (newMemories: Memory[]) => {
    const nowIso = new Date().toISOString();
    const stampedMemories = newMemories.map(
      (mem) =>
        ({
          ...mem,
          updatedAt: nowIso,
        }) as Memory,
    );
    setMemories((prev) => [...stampedMemories, ...prev]);
    Promise.all(
      stampedMemories.map((mem) =>
        syncMemoryRecordToVault(
          mem as unknown as { id: string; [key: string]: unknown },
          currentUser?.id,
          sessionToken,
        ),
      ),
    )
      .then((results) => {
        const allSynced = results.every((r) => r.synced);
        emitNotification(
          'memory-added',
          `${stampedMemories.length === 1 ? 'Memory Added' : `${stampedMemories.length} Memories Added`}`,
          allSynced
            ? 'Synchronised with your authenticated server vault and local archive.'
            : 'Saved locally and queued for server synchronisation when online.',
          'important',
        );
      })
      .catch(() => {
        emitNotification(
          'memory-added',
          `${stampedMemories.length === 1 ? 'Memory Added' : `${stampedMemories.length} Memories Added`}`,
          'Saved locally and queued for server synchronisation.',
          'important',
        );
      });
    if (stampedMemories.length === 1) {
      handleEnterRoom(stampedMemories[0].roomId);
    }
  };

  const handleStartAutoCuration = (
    items: CurationBatchItemInput[],
    options?: { explicitLocalFallback?: boolean },
  ) => {
    lastBatchInputItemsRef.current = items;
    setCurationBatchState({
      batchId: `batch_${Date.now()}`,
      phase: 'uploading',
      phaseLabel: options?.explicitLocalFallback
        ? 'Preparing explicit local fallback…'
        : 'Starting Gemini curation…',
      totalCount: items.length,
      completedCount: 0,
      failedCount: 0,
      items: items.map((it) => ({
        tempId: it.tempId,
        fileName: it.fileName,
        detectedMediaType: it.detectedMediaType,
        status: 'queued',
        thumbnailUrl:
          it.detectedMediaType === 'image' ? it.originalDataUrl : undefined,
        inputSnapshot: it,
      })),
    });

    void executeAutoCurationBatch({
      items,
      existingMemories: memories,
      existingCollections: collections,
      existingConnections: approvedConnections,
      userId: currentUser?.id || 'demo-curator',
      sessionToken,
      explicitLocalFallback: Boolean(options?.explicitLocalFallback),
      callbacks: {
        onStateChange: (nextState) => {
          setCurationBatchState(nextState);
        },
        onMemoriesAndCollectionsReady: ({
          addedMemories,
          updatedCollections,
          addedConnections,
        }) => {
          setMemories((prev) => [...addedMemories, ...prev]);
          setCollections(updatedCollections);
          if (addedConnections.length > 0) {
            setApprovedConnections((prev: MemoryConnection[]) => [
              ...addedConnections,
              ...prev,
            ]);
          }
        },
      },
    });
  };

  const handleRetryFailedCuration = () => {
    if (!curationBatchState || !lastBatchInputItemsRef.current) return;
    const failedTempIds = new Set(
      curationBatchState.items
        .filter((i) => i.status === 'failed')
        .map((i) => i.tempId),
    );
    const retryItems = lastBatchInputItemsRef.current.filter((it) =>
      failedTempIds.has(it.tempId),
    );
    if (retryItems.length > 0) {
      handleStartAutoCuration(retryItems);
    }
  };

  const handleSaveFailedWithLocalFallback = () => {
    if (!curationBatchState || !lastBatchInputItemsRef.current) return;
    const failedTempIds = new Set(
      curationBatchState.items
        .filter((i) => i.status === 'failed')
        .map((i) => i.tempId),
    );
    const fallbackItems = lastBatchInputItemsRef.current.filter((it) =>
      failedTempIds.has(it.tempId),
    );
    if (fallbackItems.length > 0) {
      handleStartAutoCuration(fallbackItems, { explicitLocalFallback: true });
    }
  };

  const applyPlacementApprovals = (updates: PlacementApprovalUpdate[]) => {
    if (updates.length === 0) return;
    const updateMap = new Map(updates.map((u) => [u.memoryId, u]));
    const updatedForVault: Memory[] = [];

    setMemories((prev) =>
      prev.map((m) => {
        const upd = updateMap.get(m.id);
        if (!upd) return m;
        const catalogEntry =
          CHILDHOOD_WORLD_LOCATION_CATALOGUE[upd.locationId] ||
          CHILDHOOD_WORLD_LOCATION_CATALOGUE.keepsake_corner;
        const cleanTitle = (upd.title ?? m.title).trim() || m.title;
        const cleanDesc = (upd.description ?? m.description).trim() || m.description;
        const cleanDate = (upd.date ?? m.date).trim();
        const yearMatch = cleanDate.match(/(\d{4})/);
        const nextMem: Memory = {
          ...m,
          roomId: 'childhood',
          title: cleanTitle,
          description: cleanDesc,
          date: cleanDate,
          year: yearMatch ? Number(yearMatch[1]) : m.year,
          subtitle: upd.moveToUnsorted
            ? `${catalogEntry.label} (Unsorted)`
            : catalogEntry.label,
          location: catalogEntry.label,
          curatedZoneId: catalogEntry.id,
          placementTarget: catalogEntry.placementTarget,
          linkedSpaceId: catalogEntry.spaceId,
          linkedObjectId: catalogEntry.linkedObjectId,
          hiddenFrom3D: false,
          curationReport: m.curationReport
            ? {
                ...m.curationReport,
                recommendedRoomId: 'childhood',
                recommendedLocationId: catalogEntry.id,
                recommendedDisplayObject: catalogEntry.linkedObjectId,
                autoPlacedIn3D: true,
              }
            : m.curationReport,
          memoryTo3DBlueprint: m.memoryTo3DBlueprint
            ? {
                ...m.memoryTo3DBlueprint,
                connectedSpace: catalogEntry.spaceId,
                linkedObjectId:
                  catalogEntry.linkedObjectId ??
                  m.memoryTo3DBlueprint.linkedObjectId,
                userApprovalStatus: 'approved',
              }
            : m.memoryTo3DBlueprint,
          updatedAt: new Date().toISOString(),
        };
        updatedForVault.push(nextMem);
        return nextMem;
      }),
    );

    const activeUserId = currentUser?.id || 'demo-curator';
    updatedForVault.forEach((mem) => {
      void syncMemoryRecordToVault(
        { ...mem, userId: activeUserId },
        activeUserId,
        sessionToken,
      ).catch(() => {});
    });

    setCurationBatchState((prev) => {
      if (!prev) return prev;
      const nextItems = prev.items.map((it) => {
        const upd = it.memoryId ? updateMap.get(it.memoryId) : undefined;
        if (!upd) return it;
        const cat =
          CHILDHOOD_WORLD_LOCATION_CATALOGUE[upd.locationId] ||
          CHILDHOOD_WORLD_LOCATION_CATALOGUE.keepsake_corner;
        return {
          ...it,
          locationId: cat.id,
          locationLabel: cat.label,
          suggestedTitle: upd.title ?? it.suggestedTitle,
          suggestedDescription: upd.description ?? it.suggestedDescription,
          suggestedDate: upd.date ?? it.suggestedDate,
          isUnsorted: Boolean(upd.moveToUnsorted),
          placementApproved: true,
        };
      });
      const stillPending = nextItems.some(
        (it) => it.status === 'done' && !it.placementApproved,
      );
      return {
        ...prev,
        phase: stillPending ? 'review' : 'ready',
        phaseLabel: stillPending
          ? 'Review remaining 3D placements'
          : 'Placed in 3D Childhood Memory Park',
        items: nextItems,
      };
    });

    emitNotification(
      `placement-approved-${Date.now()}`,
      updates.length === 1
        ? 'Photo Placed in 3D Childhood Park'
        : `${updates.length} Memories Placed in 3D Park`,
      'Approved placement saved and mounted in your 3D Childhood Memory Park.',
      'important',
    );
  };

  const handleApproveItemPlacement = (update: PlacementApprovalUpdate) => {
    applyPlacementApprovals([update]);
  };

  const handleApproveAllPlacements = (updates: PlacementApprovalUpdate[]) => {
    applyPlacementApprovals(updates);
  };

  const handleUndoCurationBatch = () => {
    if (!curationBatchState?.lastUndoSnapshot) return;
    const snap = curationBatchState.lastUndoSnapshot;
    setMemories(snap.previousMemories);
    setCollections(snap.previousCollections);
    setApprovedConnections(snap.previousConnections);
    setCurationBatchState(null);
    emitNotification(
      'curation-undo',
      'Batch Organising Undone',
      `Restored previous museum state prior to "${snap.summaryLabel}".`,
      'important',
    );
  };

  const handleOpenCreateRoomInSlot = useCallback(
    (
      floorId: string,
      slotIndex: 0 | 1 | 2 | 3,
      existingRoom?: Room,
    ) => {
      const floorObj = floors.find((f) => f.id === floorId) || floors[0];
      const slotRoom =
        existingRoom ||
        rooms.find(
          (r) =>
            r.floorNumber === floorObj.floorNumber && r.slotIndex === slotIndex,
        ) ||
        null;
      setTargetFloorForSlot(floorObj);
      setTargetSlotIndex(slotIndex);
      setEditingRoom(slotRoom);
      setIsRoomEditorOpen(true);
    },
    [floors, rooms],
  );

  const handleProgressiveActivateRoom = useCallback(() => {
    handleActivateChildhoodRoom();
  }, [handleActivateChildhoodRoom]);

  const handleSmartAddRoom = useCallback(() => {
    handleActivateChildhoodRoom();
  }, [handleActivateChildhoodRoom]);

  const handleConfirmCreateFloor = () => {
    const nextFloorNumber = floors.length;
    const nextFloorId = `floor-${nextFloorNumber}`;
    const ordinalNames = [
      'Ground Floor',
      'First Floor',
      'Second Floor',
      'Third Floor',
      'Fourth Floor',
      'Fifth Floor',
    ];
    const r0 = `room-f${nextFloorNumber}-s0`;
    const r1 = `room-f${nextFloorNumber}-s1`;
    const r2 = `room-f${nextFloorNumber}-s2`;
    const r3 = `room-f${nextFloorNumber}-s3`;

    const newFloor: Floor = {
      id: nextFloorId,
      floorNumber: nextFloorNumber,
      name: ordinalNames[nextFloorNumber] || `Floor ${nextFloorNumber + 1}`,
      subtitle: 'Expanded Upper Gallery Deck & Connected Elevator Landing',
      roomSlotIds: [r0, r1, r2, r3],
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const newFloorRooms: Room[] = ([0, 1, 2, 3] as const).map((slotIdx) => ({
      id: `room-f${nextFloorNumber}-s${slotIdx}`,
      floorId: nextFloorId,
      floorNumber: nextFloorNumber,
      slotIndex: slotIdx,
      status: 'empty',
      enabled: false,
      isUserCreated: false,
      name: `Empty Slot #${slotIdx + 1}`,
      subtitle: 'Available Gallery Wing',
      theme: 'Warm Cedar & Sunlit Meadow',
      wing: `${newFloor.name} · Slot ${slotIdx + 1}`,
      archIndex: nextFloorNumber * 4 + slotIdx,
      description:
        'An open architectural alcove awaiting your next personal memory collection.',
      curatorQuote:
        'Every new chapter deserves a quiet gallery of its own.',
      accentColor: '#D6A15D',
      lightColor: 0xfde68a,
      featuredMotif: 'courtyard_lanterns',
    }));

    setFloors((prev) => [...prev, newFloor]);
    setRooms((prev) => [...prev, ...newFloorRooms]);
    setIsFloorExpansionOpen(false);

    emitNotification(
      `floor-created-${nextFloorNumber}`,
      `${newFloor.name} Constructed`,
      'Includes 4 room slots, automated elevator landing, and an interactive Feature Wall.',
      'important',
    );

    setTargetFloorForSlot(newFloor);
    setTargetSlotIndex(0);
    setEditingRoom(newFloorRooms[0]);
    setIsRoomEditorOpen(true);
  };

  const handleSaveRoom = (roomData: {
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
  }) => {
    const floorObj =
      floors.find((f) => f.floorNumber === roomData.floorNumber) || floors[0];
    const targetRoomObj = rooms.find(
      (r) =>
        r.floorNumber === roomData.floorNumber &&
        r.slotIndex === roomData.slotIndex,
    );
    const targetRoomId =
      targetRoomObj?.id ||
      roomData.id ||
      `room-f${roomData.floorNumber}-s${roomData.slotIndex}`;
    const existingRoomMemories = memories.filter(
      (m) => m.roomId === targetRoomId,
    );

    const synthesizedDesign =
      roomData.designConfig ||
      buildSynthesizedRoomDesignConfig({
        roomName: roomData.name,
        promptOrNotes: `${roomData.subtitle} ${roomData.theme}`,
        memories: existingRoomMemories,
      });

    let savedRoomRef: Room | null = null;

    setRooms((prev) =>
      prev.map((r) => {
        if (
          r.floorNumber === roomData.floorNumber &&
          r.slotIndex === roomData.slotIndex
        ) {
          const updated: Room = {
            ...r,
            name: roomData.name,
            subtitle: roomData.subtitle,
            description: roomData.description,
            theme: roomData.theme,
            wing: `${floorObj.name} · Slot ${roomData.slotIndex + 1}`,
            accentColor: roomData.accentColor,
            featuredMotif: roomData.featuredMotif,
            curatorQuote: roomData.curatorQuote,
            customCoverUrl: roomData.customCoverUrl,
            exhibitionStyle:
              roomData.exhibitionStyle ||
              synthesizedDesign.exhibitionStyle ||
              r.exhibitionStyle ||
              'classic_wall_gallery',
            galleryLayout:
              roomData.galleryLayout ||
              synthesizedDesign.galleryLayout ||
              r.galleryLayout ||
              'masonry',
            decorativeStyle:
              roomData.decorativeStyle ||
              synthesizedDesign.decorativeStyle ||
              r.decorativeStyle,
            designConfig: synthesizedDesign,
            status: roomData.status,
            enabled: roomData.status === 'active',
            isUserCreated: roomData.status === 'empty' ? false : true,
          };
          savedRoomRef = updated;
          return updated;
        }
        return r;
      }),
    );

    if (
      roomData.status === 'active' &&
      roomData.includeStarterMemories &&
      existingRoomMemories.length === 0
    ) {
      const templates =
        roomData.starterMemories ||
        synthesizedDesign.suggestedStarterMemories ||
        [];
      if (templates.length > 0) {
        const starterItems = instantiateStarterMemoriesForRoom(
          targetRoomId,
          templates,
        );
        setMemories((prev) => [...starterItems, ...prev]);
      }
    }

    if (roomData.status === 'active') {
      const wasAlreadyActive = isChildhoodRoomActive;
      try {
        localStorage.setItem(scopedKeys.CHILDHOOD_ACTIVATED, 'true');
      } catch {
        // ignore
      }
      if (!wasAlreadyActive) {
        setActiveRoomId(null);
        setActiveNav('home');
        setShowActivationThankYou(true);
      }
    } else {
      try {
        localStorage.removeItem(scopedKeys.CHILDHOOD_ACTIVATED);
      } catch {
        // ignore
      }
    }
  };

  const handleToggleRoomDisabled = (roomId: string) => {
    if (roomId === 'childhood') {
      if (isChildhoodRoomActive) {
        handleDeactivateChildhoodRoom();
      } else {
        handleActivateChildhoodRoom();
      }
    }
  };

  const handleCreateCollection = (
    title: string,
    subtitle: string,
    memoryIds: string[],
    customCoverUrl?: string,
    curatorNote?: string,
  ) => {
    recordReversibleSnapshot(`Created collection "${title}"`);
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      title,
      subtitle,
      curatorNote:
        curatorNote ||
        'A bespoke personal anthology curated from your favorite museum memories across rooms.',
      memoryIds,
      accentColor: '#D6A15D',
      seasonTag: 'Personal Anthology · Curated Edition',
      customCoverUrl,
    };
    const nextCols = [newCol, ...collections];
    setCollections(nextCols);
    syncCurationStateToVault(
      { collections: nextCols, connections: approvedConnections },
      sessionToken,
    ).catch(() => {});
    emitNotification(
      `collection-created-${newCol.id}`,
      `Collection "${title}" Created`,
      'Saved to your personal museum collections.',
      'important',
    );
  };

  const handleRenameCollection = (
    collectionId: string,
    nextTitle: string,
    nextSubtitle?: string,
  ) => {
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    recordReversibleSnapshot(`Renamed collection to "${trimmed}"`);
    const nextCols = collections.map((c) =>
      c.id === collectionId
        ? {
            ...c,
            title: trimmed,
            subtitle: nextSubtitle !== undefined ? nextSubtitle : c.subtitle,
          }
        : c,
    );
    setCollections(nextCols);
    syncCurationStateToVault(
      { collections: nextCols, connections: approvedConnections },
      sessionToken,
    ).catch(() => {});
  };

  const handleMergeCollections = (
    sourceCollectionId: string,
    targetCollectionId: string,
  ) => {
    if (sourceCollectionId === targetCollectionId) return;
    const sourceCol = collections.find((c) => c.id === sourceCollectionId);
    const targetCol = collections.find((c) => c.id === targetCollectionId);
    if (!sourceCol || !targetCol) return;
    recordReversibleSnapshot(
      `Merged "${sourceCol.title}" into "${targetCol.title}"`,
    );
    const mergedMemoryIds = Array.from(
      new Set([...targetCol.memoryIds, ...sourceCol.memoryIds]),
    );
    const nextCols = collections
      .filter((c) => c.id !== sourceCollectionId)
      .map((c) =>
        c.id === targetCollectionId ? { ...c, memoryIds: mergedMemoryIds } : c,
      );
    setCollections(nextCols);
    syncCurationStateToVault(
      { collections: nextCols, connections: approvedConnections },
      sessionToken,
    ).catch(() => {});
  };

  const handleSeparateMemoryFromCollection = (
    collectionId: string,
    memoryId: string,
  ) => {
    const col = collections.find((c) => c.id === collectionId);
    const mem = memories.find((m) => m.id === memoryId);
    if (!col || !mem) return;
    recordReversibleSnapshot(
      `Separated "${mem.title}" from "${col.title}"`,
    );
    const updatedSourceIds = col.memoryIds.filter((id) => id !== memoryId);
    let nextCols = collections.map((c) =>
      c.id === collectionId ? { ...c, memoryIds: updatedSourceIds } : c,
    );
    // Ensure separated memory remains accessible in Unsorted Memories if not in another collection
    const stillInAny = nextCols.some((c) => c.memoryIds.includes(memoryId));
    if (!stillInAny) {
      const unsortedIdx = nextCols.findIndex(
        (c) =>
          c.id === 'col-unsorted-memories' ||
          c.title.toLowerCase() === 'unsorted memories',
      );
      if (unsortedIdx >= 0) {
        const u = nextCols[unsortedIdx];
        nextCols[unsortedIdx] = {
          ...u,
          memoryIds: Array.from(new Set([memoryId, ...u.memoryIds])),
        };
      } else {
        nextCols = [
          ...nextCols,
          {
            id: 'col-unsorted-memories',
            title: 'Unsorted Memories',
            subtitle: 'Keepsake Corner • Separated & Unclassified Items',
            curatorNote:
              'Memories separated from a collection or awaiting manual curatorial grouping.',
            memoryIds: [memoryId],
            accentColor: '#9E8566',
            seasonTag: 'Keepsake Corner',
          },
        ];
      }
    }
    setCollections(nextCols);
    syncCurationStateToVault(
      { collections: nextCols, connections: approvedConnections },
      sessionToken,
    ).catch(() => {});
  };

  const handleDeleteCollection = (collectionId: string) => {
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return;
    recordReversibleSnapshot(`Removed collection "${col.title}"`);
    const nextCols = collections.filter((c) => c.id !== collectionId);
    setCollections(nextCols);
    syncCurationStateToVault(
      { collections: nextCols, connections: approvedConnections },
      sessionToken,
    ).catch(() => {});
  };

  const handleApplyRoomDesign = (roomId: string, config: RoomDesignConfig) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              status: 'active',
              enabled: true,
              isUserCreated: true,
              accentColor: config.accentColorHex || r.accentColor,
              description: config.roomDescription || r.description,
              designConfig: config,
            }
          : r,
      ),
    );
  };

  // Reset MEMORA (Clears personal memories, collections, playlists, and user-created rooms while preserving 3 default floors & 4 predefined room slots per floor)
  const handleConfirmResetMuseum = () => {
    const freshFloors = INITIAL_FLOORS;
    const freshRooms = createFreshPredefinedRooms();
    const freshMemories: Memory[] = [];
    const freshCollections: Collection[] = [];
    const freshPlaylists: MusicSource[] = [];

    setFloors(freshFloors);
    setRooms(freshRooms);
    setMemories(freshMemories);
    setCollections(freshCollections);
    setApprovedConnections([]);
    setCustomMusicSources(freshPlaylists);
    setAudioSettings(INITIAL_AUDIO_SETTINGS);
    setCharacterState(getDefaultCharacterState());
    setActiveRoomId(null);
    setActiveNav('home');
    setShowProfileMenu(false);
    setIsResetConfirmOpen(false);

    try {
      localStorage.removeItem(scopedKeys.CHILDHOOD_ACTIVATED);
      localStorage.setItem(scopedKeys.FLOORS, JSON.stringify(freshFloors));
      localStorage.setItem(scopedKeys.ROOMS, JSON.stringify(freshRooms));
      localStorage.setItem(scopedKeys.MEMORIES, JSON.stringify(freshMemories));
      localStorage.setItem(
        scopedKeys.COLLECTIONS,
        JSON.stringify(freshCollections),
      );
      localStorage.setItem(scopedKeys.CONNECTIONS, JSON.stringify([]));
      localStorage.setItem(
        scopedKeys.CUSTOM_MUSIC,
        JSON.stringify(freshPlaylists),
      );
    } catch {
      // ignore
    }

    resetUserMemoriesInVault(currentUser?.id, sessionToken).catch(() => {});

    emitNotification(
      'museum-reset',
      'Your Museum Has Been Reset',
      'All personal memories, collections, and playlists were cleared. Default 3 floors and 9 room slots are ready.',
      'important',
    );
  };

  const handleOpenWallFeature = useCallback((section: WallFeatureId) => {
    setFeatureWallSection(section);
    setIsFeatureWallModalOpen(true);
  }, []);

  const handleDismissNotification = useCallback(() => {
    setActiveNotification(null);
  }, []);

  const handleDisableOptionalTips = useCallback(() => {
    setMuseumSettings((prev) => ({
      ...prev,
      showOptionalTips: false,
    }));
  }, []);

  const handleSelectMemoryFrom3D = useCallback((mem: Memory) => {
    setSelectedMemoryId(mem.id);
  }, []);

  const handleToggleControlsGuideFrom3D = useCallback(() => {
    setShowControlsGuide((prev) => !prev);
  }, []);

  const handleSelectRoomFrom3D = useCallback(
    (id: string | null) => {
      if (id) {
        handleEnterRoom(id);
      } else {
        handleBackToAtrium();
      }
    },
    [handleEnterRoom, handleBackToAtrium],
  );

  const handleOpenRoomCatalogueFrom3D = useCallback(() => {
    setIsRoomCatalogueOpen(true);
  }, []);

  const handleOpenEditRoomFrom3D = useCallback(
    (room: Room) => {
      handleOpenCreateRoomInSlot(room.floorId, room.slotIndex, room);
    },
    [handleOpenCreateRoomInSlot],
  );

  const handleOpenTimelineFrom3D = useCallback(() => {
    setActiveRoomId(null);
    setActiveNav('timeline');
  }, []);

  const handleOpenAddMemoryFrom3D = useCallback((rId: string) => {
    setAddMemoryDefaultRoomId(rId);
    setIsAddMemoryOpen(true);
  }, []);

  const handleOpenFeatureWallFromBoundary = useCallback(() => {
    handleOpenWallFeature('my_rooms');
  }, [handleOpenWallFeature]);

  const handleResetCharacterFromBoundary = useCallback(() => {
    setCharacterState((prev) => ({
      ...prev,
      position: [0, 0, 5.5],
      rotationY: Math.PI,
      currentFloorId: floors[0]?.id || 'floor-0',
      currentFloorNumber: 0,
      pose: 'idle',
      isInLift: false,
    }));
  }, [floors]);

  const activeTutorialHighlight = tutorialActive
    ? TUTORIAL_STEPS[tutorialStepIndex]?.targetHighlight || null
    : null;

  const currentFloorObj = useMemo(
    () =>
      floors.find((f) => f.floorNumber === characterState.currentFloorNumber) ||
      floors[0],
    [floors, characterState.currentFloorNumber],
  );

  const displayMuseumTitle = resolveMuseumDisplayName(museumSettings.projectName);

  const isAnyOverlayModalOpen =
    !hasEnteredAtrium ||
    Boolean(activeRoomId && isRoomCatalogueOpen) ||
    activeNav !== 'home' ||
    isFeatureWallModalOpen ||
    Boolean(selectedMemoryId) ||
    isAddMemoryOpen ||
    isRoomEditorOpen ||
    isFloorExpansionOpen ||
    isResetConfirmOpen ||
    showActivationThankYou ||
    Boolean(newlyCreatedRoom) ||
    showProfileMenu ||
    isMusicPlayerOpen;

  const isFullScreenBlockingModalOpen =
    activeNav !== 'home' ||
    isFeatureWallModalOpen ||
    Boolean(activeRoomId && isRoomCatalogueOpen) ||
    Boolean(selectedMemoryId) ||
    isAddMemoryOpen ||
    isRoomEditorOpen ||
    isFloorExpansionOpen ||
    isResetConfirmOpen;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#F6F1E8] select-none">
      {/* ====================================================================
          1. FULL-SCREEN 3D MULTI-FLOOR MUSEUM ATRIUM & CHARACTER (Three.js)
          ==================================================================== */}
      <AtriumErrorBoundary
        onOpenFeatureWall={handleOpenFeatureWallFromBoundary}
        onResetCharacter={handleResetCharacterFromBoundary}
      >
        <AtriumScene3D
          floors={floors}
          rooms={rooms}
          memories={memories}
          collections={collections}
          activeRoomId={activeRoomId}
          hasEnteredAtrium={hasEnteredAtrium}
          museumSettings={museumSettings}
          tutorialActive={tutorialActive}
          tutorialTargetHighlight={activeTutorialHighlight}
          characterState={characterState}
          externalLiftRequest={externalLiftRequest}
          isAnyModalOpen={isAnyOverlayModalOpen}
          pauseRendering={isFullScreenBlockingModalOpen}
          characterWelcomeActive={characterWelcomeActive}
          showControlsGuide={showControlsGuide}
          onToggleControlsGuide={handleToggleControlsGuideFrom3D}
          onUpdateCharacterState={setCharacterState}
          onSelectRoom={handleSelectRoomFrom3D}
          onSelectMemory={handleSelectMemoryFrom3D}
          onOpenCreateRoomInSlot={handleOpenCreateRoomInSlot}
          onSmartAddRoom={handleSmartAddRoom}
          onSelectWallFeature={handleOpenWallFeature}
          onUpdateRoomExhibitionStyle={handleUpdateRoomExhibitionStyle}
          onUpdateRoomDesignConfig={handleUpdateRoomDesignConfig}
          onOpenRoomCatalogue={handleOpenRoomCatalogueFrom3D}
          onOpenEditRoom={handleOpenEditRoomFrom3D}
          onOpenTimeline={handleOpenTimelineFrom3D}
          onOpenAddMemory={handleOpenAddMemoryFrom3D}
          onEmitTip={emitNotification}
        />
      </AtriumErrorBoundary>

      {/* ====================================================================
          2. REDESIGNED EXPLORATION HUD HEADER
              Top-left: Museum identity (MEMORA wordmark, current floor, room title)
              Center: Temporary 10-Second Notification / Tip (when active)
              Top-right: Quick controls (Music player, Sound/ambience mute, Settings, Help & shortcuts, Profile/Menu)
          ==================================================================== */}
      {/* ====================================================================
          2. EXPLORATION HUD HEADER (Hidden inside active room for 100% 3D immersion)
          ==================================================================== */}
      {!activeRoomId && (
        <header
          aria-label="Museum Header"
          className="fixed top-3 sm:top-4 inset-x-4 sm:inset-x-6 z-30 pointer-events-none flex items-start justify-between gap-4"
        >
          {/* Top-Left: MEMORA · Floor Name */}
          <button
            type="button"
            onClick={handleBackToAtrium}
            title="Return to 3D Museum Atrium"
            className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#27231F]/95 hover:bg-[#27231F] text-[#FFFCF6] border border-[#C9A66B]/45 shadow-[0_12px_28px_rgba(24,20,16,0.28)] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C9A66B]"
          >
            <span className="font-serif-display text-lg sm:text-xl font-semibold tracking-tight text-[#FFFCF6]">
              {displayMuseumTitle}
            </span>
            <span className="text-[#C9A66B] font-semibold" aria-hidden="true">
              ·
            </span>
            <span className="text-xs sm:text-sm font-medium tracking-wide text-[#FFE2B5]">
              {currentFloorObj?.name || 'Ground Floor'}
            </span>
          </button>

          {/* Tips and quick controls stay in the atrium, not inside immersive rooms. */}
          <div className="flex-1 flex justify-center pointer-events-none">
            <TemporaryNotificationBanner
              notification={activeNotification}
              reducedMotion={museumSettings.reducedMotion}
              onDismiss={handleDismissNotification}
              onDisableOptionalTips={handleDisableOptionalTips}
            />
          </div>

          {/* Atrium-only quick controls */}
          <div className="relative pointer-events-auto shrink-0 flex items-center gap-1.5 bg-[#27231F]/95 border border-[#C9A66B]/45 rounded-2xl p-1 shadow-[0_12px_28px_rgba(24,20,16,0.28)]">
            {/* Music Player Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsMusicPlayerOpen((prev) => !prev);
                setShowProfileMenu(false);
              }}
              aria-label="Toggle Museum Music Player"
              aria-expanded={isMusicPlayerOpen}
              title="Spotify & Museum Music Player"
              className={`relative h-8 px-2.5 rounded-xl flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                isMusicPlayerOpen
                  ? 'bg-[#C9A66B] text-[#27231F] font-semibold'
                  : isAudioPlaying
                    ? 'bg-[#C9A66B]/20 text-[#FFE2B5] hover:bg-[#C9A66B]/30'
                    : 'text-[#FFFCF6]/80 hover:text-[#FFFCF6] hover:bg-[#FFFCF6]/10'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Music</span>
              {isAudioPlaying && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isMusicPlayerOpen
                      ? 'bg-[#27231F]'
                      : 'bg-[#87977C]'
                  }`}
                />
              )}
            </button>

            {/* Sound / Ambience Mute Toggle */}
            <button
              type="button"
              onClick={() =>
                setAudioSettings((prev) => ({
                  ...prev,
                  muted: !prev.muted,
                }))
              }
              aria-label={
                audioSettings.muted ? 'Unmute Museum Audio' : 'Mute Museum Audio'
              }
              title={
                audioSettings.muted
                  ? 'Unmute Sound & Ambience'
                  : 'Mute Sound & Ambience'
              }
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                audioSettings.muted
                  ? 'bg-[#C98D87]/20 text-[#C98D87] hover:bg-[#C98D87]/30'
                  : 'text-[#FFFCF6]/80 hover:text-[#FFFCF6] hover:bg-[#FFFCF6]/10'
              }`}
            >
              {audioSettings.muted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Settings Quick Button */}
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false);
                setIsMusicPlayerOpen(false);
                handleOpenWallFeature('museum_settings');
              }}
              aria-label="Open Museum Settings"
              title="Museum & Camera Settings"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#FFFCF6]/80 hover:text-[#FFFCF6] hover:bg-[#FFFCF6]/10 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Help & Keyboard Shortcuts Guide Toggle */}
            <button
              type="button"
              onClick={() => setShowControlsGuide((prev) => !prev)}
              aria-label="Toggle Controls Guide"
              aria-pressed={showControlsGuide}
              title={
                showControlsGuide
                  ? 'Hide Controls Guide'
                  : 'Show Controls & Shortcuts Guide'
              }
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                showControlsGuide
                  ? 'bg-[#FFFCF6]/15 text-[#FFE2B5]'
                  : 'text-[#FFFCF6]/80 hover:text-[#FFFCF6] hover:bg-[#FFFCF6]/10'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            <span className="h-4 w-[1px] bg-[#FFFCF6]/15 mx-0.5" />

            {/* Profile / Navigation Menu */}
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu((prev) => !prev);
                setIsMusicPlayerOpen(false);
              }}
              aria-label="Open Profile and Navigation Menu"
              aria-expanded={showProfileMenu}
              title="Curator Profile & Navigation Hub"
              className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C9A66B] ${
                activeTutorialHighlight === 'header_menu'
                  ? 'bg-[#27231F] text-[#FFE2B5] border-2 border-[#C9A66B] ring-4 ring-[#C9A66B]/35'
                  : showProfileMenu
                    ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                    : 'bg-[#FFFCF6]/10 hover:bg-[#FFFCF6]/20 text-[#FFE2B5] border-[#C9A66B]/40'
              }`}
            >
              <User className="w-3.5 h-3.5" />
            </button>

            <UnifiedHeaderPopover
              isOpen={showProfileMenu}
              currentUser={currentUser}
              museumSettings={museumSettings}
              activeNav={activeNav}
              activeRoomId={activeRoomId}
              floorsCount={floors.length}
              activeRoomsCount={activatedRoomsCount}
              memoriesCount={memories.length}
              onClose={() => setShowProfileMenu(false)}
              onReturnTo3DAtrium={handleBackToAtrium}
              onNavigateTab={(tab, sub) => {
                setActiveRoomId(null);
                if (sub) setExploreSubTab(sub);
                setActiveNav(tab);
              }}
              onOpenWallSection={(sec) => {
                setActiveRoomId(null);
                setActiveNav('home');
                handleOpenWallFeature(sec);
              }}
              onOpenAddMemory={() => {
                setAddMemoryDefaultRoomId('childhood');
                setIsAddMemoryOpen(true);
              }}
              onStartTutorial={() => {
                setActiveRoomId(null);
                setActiveNav('home');
                setHasEnteredAtrium(true);
                setCharacterWelcomeActive(false);
                setTutorialStepIndex(0);
                setTutorialActive(true);
              }}
              onRequestResetMuseum={() => setIsResetConfirmOpen(true)}
              onSignOut={handleSignOut}
            />
          </div>
        </header>
      )}

      {/* Expandable HUD Spotify & Museum Music Player (Atrium only) */}
      {!activeRoomId && (
        <PersistentMiniPlayer
          isOpen={isMusicPlayerOpen}
          onClose={() => setIsMusicPlayerOpen(false)}
          audioSettings={audioSettings}
          onUpdateAudioSettings={setAudioSettings}
          onOpenSoundscapes={() => {
            setIsMusicPlayerOpen(false);
            setActiveRoomId(null);
            setActiveNav('soundscapes');
          }}
        />
      )}

      {/* Brief elegant loading fade veil on initial Atrium entry */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-50 pointer-events-none bg-[#F6F1E8] flex items-center justify-center transition-opacity duration-500 ${
          atriumOpeningVeil ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="font-serif-display text-xl tracking-[0.22em] uppercase text-[#27231F]">
            {BRAND.name}
          </span>
          <span className="h-[1px] w-16 bg-[#C9A66B]" />
        </div>
      </div>

      {/* ====================================================================
          2B. SINGLE ACTIVE ROOM SYSTEM — "ACTIVATE YOUR ROOM" BOARD & THANK-YOU SCREEN
          ==================================================================== */}
      {hasEnteredAtrium &&
        activeNav === 'home' &&
        !activeRoomId &&
        !tutorialActive && (
          <>
            {!isChildhoodRoomActive && !showActivationThankYou && (
              /* Initially, when no room is activated, show the "Activate Your Room" board with only Childhood Room */
              <div className="fixed inset-x-4 top-20 z-30 pointer-events-none flex justify-center animate-in fade-in slide-in-from-top-3 duration-300">
                <div className="pointer-events-auto w-full max-w-xl bg-[#27231F]/96 text-[#FFFCF6] border-2 border-[#C9A66B]/65 rounded-3xl p-5 sm:p-6 shadow-[0_24px_60px_rgba(16,12,8,0.65)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#C9A66B]/20 border border-[#C9A66B]/45 text-[10px] font-semibold uppercase tracking-widest text-[#FFE2B5]">
                        Activate Your Room
                      </span>
                      <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#FFFCF6] mt-2">
                        Childhood Room
                      </h2>
                      <p className="text-xs sm:text-sm text-[#E8DED0]/85 mt-1.5 leading-relaxed">
                        A realistic 3D childhood bedroom with bed, study table, wardrobe, toys, sunlit windows, personal photographs, and a connected outdoor backyard with a treehouse, tyre swing, and bicycle.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#FFFCF6]/12 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-[#FFE2B5]/85 font-medium">
                      Available Category: Childhood Room
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleActivateChildhoodRoom}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D6A15D] to-[#C9A66B] hover:brightness-105 active:scale-95 text-[#27231F] font-semibold text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
                      >
                        Activate Childhood Room
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showActivationThankYou && (
              /* Beautiful Success / Thank-You Screen after activating Childhood Room */
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Your Childhood Room is ready"
                className="fixed inset-0 z-40 flex items-center justify-center px-4 bg-[#1C1612]/72 pointer-events-auto animate-in fade-in duration-300"
              >
                <div className="w-full max-w-md bg-[#27231F]/96 text-[#FFFCF6] border-2 border-[#D6A15D] rounded-3xl p-7 sm:p-8 shadow-[0_28px_72px_rgba(12,9,6,0.75)] text-center space-y-5">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-[#D6A15D]/20 border border-[#D6A15D] flex items-center justify-center text-[#FFE2B5] font-serif-display text-2xl font-bold shadow-inner">
                    ✓
                  </div>

                  <div className="space-y-2">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-[#87977C]/25 border border-[#87977C]/50 text-[10px] font-mono-tabular uppercase tracking-widest text-[#CFE0C3]">
                      Childhood Room Activated
                    </span>
                    <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#FFE2B5] leading-tight">
                      Your Childhood Room is ready!
                    </h2>
                    <p className="text-xs sm:text-sm text-[#E8DED0]/90 leading-relaxed max-w-sm mx-auto">
                      Your personal world is waiting for you. Step inside and explore your memories.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleExploreMyRoomAfterActivation}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#D6A15D] to-[#C9A66B] hover:brightness-105 active:scale-95 text-[#27231F] font-semibold text-sm shadow-xl transition-all cursor-pointer"
                    >
                      Explore My Room
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      {/* ====================================================================
          3. ACCOUNT CREATION & SIGN-IN WELCOME SCREEN OVERLAY
          ==================================================================== */}
      {activeNav === 'home' && !activeRoomId && !hasEnteredAtrium && (
        <WelcomeScreenOverlay
          projectName={museumSettings.projectName}
          onAuthenticated={handleAuthenticated}
        />
      )}

      {/* ====================================================================
          4. 3D CHARACTER WELCOME EXPERIENCE DIALOGUE BUBBLE (Only after room activation)
          ==================================================================== */}
      {hasEnteredAtrium &&
        activeNav === 'home' &&
        !activeRoomId &&
        isChildhoodRoomActive &&
        !showActivationThankYou &&
        characterWelcomeActive && (
          <CharacterWelcomeBubble
            isOpen={characterWelcomeActive}
            displayName={
              currentUser?.displayName || museumSettings.curatorName
            }
            onLetsExplore={() => setCharacterWelcomeActive(false)}
            onTakeQuickTour={() => {
              setCharacterWelcomeActive(false);
              setTutorialStepIndex(0);
              setTutorialActive(true);
            }}
            onSkipForNow={() => setCharacterWelcomeActive(false)}
          />
        )}

      {/* ====================================================================
          5. 9-STEP INTERACTIVE ONBOARDING TUTORIAL OVERLAY
          ==================================================================== */}
      {hasEnteredAtrium && tutorialActive && (
        <InteractiveTutorialOverlay
          activeStepIndex={tutorialStepIndex}
          onPrevStep={() =>
            setTutorialStepIndex((prev) => Math.max(0, prev - 1))
          }
          onNextStep={() =>
            setTutorialStepIndex((prev) =>
              Math.min(TUTORIAL_STEPS.length - 1, prev + 1),
            )
          }
          onRestartTutorial={() => setTutorialStepIndex(0)}
          onSkipTutorial={handleMarkTutorialCompleted}
          onFinishTutorial={handleMarkTutorialCompleted}
        />
      )}

      {/* ====================================================================
          6. DEDICATED ROOM 2D CATALOGUE DRAWER & SECONDARY VIEWS (LAZY-LOADED)
          ==================================================================== */}
      <Suspense fallback={null}>
        {activeRoom && isRoomCatalogueOpen && (
          <RoomInteriorView
            room={activeRoom}
            allRooms={rooms}
            memories={activeRoomMemories}
            allMemories={memories}
            approvedConnections={approvedConnections}
            reducedMotion={museumSettings.reducedMotion}
            onBackToAtrium={() => setIsRoomCatalogueOpen(false)}
            onSelectMemory={(mem) => setSelectedMemoryId(mem.id)}
            onToggleFavorite={handleToggleFavorite}
            onOpenAddMemory={(rId) => {
              setAddMemoryDefaultRoomId(rId);
              setIsAddMemoryOpen(true);
            }}
            onOpenEditRoom={(roomToEdit) => {
              const fObj =
                floors.find((f) => f.floorNumber === roomToEdit.floorNumber) ||
                floors[0];
              handleOpenCreateRoomInSlot(
                fObj.id,
                roomToEdit.slotIndex,
                roomToEdit,
              );
            }}
            onOpenSoundscapes={() => {
              setIsRoomCatalogueOpen(false);
              setActiveRoomId(null);
              setActiveNav('soundscapes');
            }}
            onUpdateRoomLayout={handleUpdateRoomLayout}
            onReorderRoomMemories={handleReorderRoomMemories}
            onReassignMemoryRoom={handleReassignMemoryRoom}
            onApproveMemoryConnection={handleApproveMemoryConnection}
            onRemoveMemoryConnection={handleRemoveMemoryConnection}
          />
        )}

        {!activeRoom && activeNav === 'rooms' && (
          <MyRoomsView
            floors={floors}
            rooms={rooms}
            memories={memories}
            onEnterRoom={handleEnterRoom}
            onSmartAddRoom={handleSmartAddRoom}
            onOpenCreateRoomInSlot={handleOpenCreateRoomInSlot}
            onOpenEditRoom={(roomToEdit) => {
              const fObj =
                floors.find((f) => f.floorNumber === roomToEdit.floorNumber) ||
                floors[0];
              handleOpenCreateRoomInSlot(
                fObj.id,
                roomToEdit.slotIndex,
                roomToEdit,
              );
            }}
            onToggleRoomDisabled={handleToggleRoomDisabled}
            onOpenAddMemory={(rId) => {
              setAddMemoryDefaultRoomId(rId);
              setIsAddMemoryOpen(true);
            }}
            onCloseView={() => setActiveNav('home')}
          />
        )}

        {!activeRoom && activeNav === 'collections' && (
          <CollectionsView
            collections={collections}
            memories={memories}
            rooms={rooms}
            initialSelectedCollectionId={selectedCollectionId}
            onSelectMemory={(mem) => setSelectedMemoryId(mem.id)}
            onToggleFavorite={handleToggleFavorite}
            onCreateCollection={(title, subtitle, memIds) =>
              handleCreateCollection(title, subtitle, memIds)
            }
            onRenameCollection={handleRenameCollection}
            onMergeCollections={handleMergeCollections}
            onSeparateMemoryFromCollection={handleSeparateMemoryFromCollection}
            onDeleteCollection={handleDeleteCollection}
            onCloseView={() => setActiveNav('home')}
          />
        )}

        {!activeRoom && activeNav === 'timeline' && (
          <TimelineView
            memories={memories}
            rooms={rooms}
            onSelectMemory={(mem) => setSelectedMemoryId(mem.id)}
            onEnterRoom={handleEnterRoom}
            onOpenAddMemory={() => {
              setAddMemoryDefaultRoomId(activeRoomId || 'childhood');
              setIsAddMemoryOpen(true);
            }}
            onCloseView={() => setActiveNav('home')}
          />
        )}

        {!activeRoom && activeNav === 'explore' && (
          <ExploreSearchView
            floors={floors}
            memories={memories}
            rooms={rooms}
            collections={collections}
            initialSearchQuery={quickSearchQuery}
            initialSubTab={exploreSubTab}
            onSelectMemory={(mem) => setSelectedMemoryId(mem.id)}
            onToggleFavorite={handleToggleFavorite}
            onEnterRoom={handleEnterRoom}
            onOpenAddMemory={() => {
              setAddMemoryDefaultRoomId(activeRoomId || 'childhood');
              setIsAddMemoryOpen(true);
            }}
            onCloseView={() => setActiveNav('home')}
          />
        )}

        {!activeRoom && activeNav === 'soundscapes' && (
          <MusicSoundscapesView
            rooms={rooms}
            audioSettings={audioSettings}
            customSources={customMusicSources}
            onUpdateAudioSettings={setAudioSettings}
            onUpdateRoomAudio={(roomId, roomAudio) => {
              setRooms((prev) =>
                prev.map((r) =>
                  r.id === roomId ? { ...r, audioSettings: roomAudio } : r,
                ),
              );
            }}
            onAddCustomMusicSource={(source) =>
              setCustomMusicSources((prev) =>
                prev.some((s) => s.id === source.id)
                  ? prev.map((s) => (s.id === source.id ? source : s))
                  : [source, ...prev],
              )
            }
            onRemoveCustomMusicSource={(sourceId) =>
              setCustomMusicSources((prev) =>
                prev.filter((s) => s.id !== sourceId),
              )
            }
            onCloseView={() => setActiveNav('home')}
          />
        )}

        {!activeRoom && activeNav === 'ai_studio' && (
          <AIStudioWorkspace
            userId={currentUser?.id || 'curator-local'}
            memories={memories}
            rooms={rooms}
            collections={collections}
            onApplyRoomDesign={handleApplyRoomDesign}
            onAddMemory={(memInput) => {
              const newMem: Memory = {
                ...memInput,
                id: `mem-ai-${Date.now()}`,
                palette: memInput.palette || [
                  '#F4D8AF',
                  '#D38B52',
                  '#442D1C',
                  '#D6A15D',
                ],
              };
              setMemories((prev) => [newMem, ...prev]);
            }}
            onCreateCollection={(colInput) => {
              handleCreateCollection(
                colInput.title,
                colInput.subtitle,
                colInput.memoryIds,
                colInput.customCoverUrl,
                colInput.curatorNote,
              );
            }}
            onSelectMemory={(mem) => setSelectedMemoryId(mem.id)}
            onEnterRoom={handleEnterRoom}
          />
        )}

        {/* ====================================================================
            7. MODALS (Memory Detail, Add Memory, Room Editor, Floor Expansion, Reset Confirm, Feature Wall Hub)
            ==================================================================== */}
        {selectedMemory && (
          <MemoryDetailModal
            memory={selectedMemory}
            rooms={rooms}
            allMemories={memories}
            approvedConnections={approvedConnections}
            onClose={() => setSelectedMemoryId(null)}
            onPrev={() => {
              if (selectedMemoryIndex > 0) {
                setSelectedMemoryId(modalMemoryPool[selectedMemoryIndex - 1].id);
              }
            }}
            onNext={() => {
              if (
                selectedMemoryIndex >= 0 &&
                selectedMemoryIndex < modalMemoryPool.length - 1
              ) {
                setSelectedMemoryId(modalMemoryPool[selectedMemoryIndex + 1].id);
              }
            }}
            hasPrev={selectedMemoryIndex > 0}
            hasNext={
              selectedMemoryIndex >= 0 &&
              selectedMemoryIndex < modalMemoryPool.length - 1
            }
            onToggleFavorite={(id) => handleToggleFavorite(id)}
            onReassignRoom={handleReassignMemoryRoom}
            onUpdateMemory={handleUpdateMemory}
            onDeleteMemory={handleDeleteMemory}
            onEnterRoom={(rId) => {
              setSelectedMemoryId(null);
              handleEnterRoom(rId);
            }}
            onSelectConnectedMemory={(memId) => setSelectedMemoryId(memId)}
          />
        )}

        {isAddMemoryOpen && (
          <AddMemoryModal
            isOpen={isAddMemoryOpen}
            onClose={() => setIsAddMemoryOpen(false)}
            rooms={rooms}
            defaultRoomId={addMemoryDefaultRoomId}
            existingMemories={memories}
            onAddMemories={handleAddMemories}
            onStartAutoCuration={handleStartAutoCuration}
          />
        )}

        {isRoomEditorOpen && (
          <RoomEditorModal
            isOpen={isRoomEditorOpen}
            editingRoom={editingRoom}
            targetFloor={targetFloorForSlot}
            targetSlotIndex={targetSlotIndex}
            roomMemories={
              editingRoom
                ? memories.filter((m) => m.roomId === editingRoom.id)
                : []
            }
            onClose={() => setIsRoomEditorOpen(false)}
            onSaveRoom={handleSaveRoom}
          />
        )}

        {isFloorExpansionOpen && (
          <FloorExpansionConfirmModal
            isOpen={isFloorExpansionOpen}
            currentFloorCount={floors.length}
            onCancel={() => setIsFloorExpansionOpen(false)}
            onConfirmCreateFloor={handleConfirmCreateFloor}
          />
        )}

        {newlyCreatedRoom && (
          <RoomCreatedPrompt
            room={newlyCreatedRoom}
            onEnterRoom={(id) => handleEnterRoom(id)}
            onContinueExploring={() => setNewlyCreatedRoom(null)}
          />
        )}
      </Suspense>

      <CurationStatusHUD
        batchState={curationBatchState}
        onDismiss={() => setCurationBatchState(null)}
        onOpenCollection={(colId) => {
          setSelectedCollectionId(colId);
          setActiveRoomId(null);
          setActiveNav('collections');
        }}
        onRetryFailed={handleRetryFailedCuration}
        onSaveWithLocalFallback={handleSaveFailedWithLocalFallback}
        onUndoLastBatch={handleUndoCurationBatch}
        onApproveItemPlacement={handleApproveItemPlacement}
        onApproveAllPlacements={handleApproveAllPlacements}
        onEnterChildhoodPark={() => handleEnterRoom('childhood')}
      />

      <ResetMuseumConfirmModal
        isOpen={isResetConfirmOpen}
        displayName={currentUser?.displayName || museumSettings.curatorName}
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirmReset={handleConfirmResetMuseum}
      />

      <FeatureWallHubModal
        isOpen={isFeatureWallModalOpen}
        initialSection={featureWallSection}
        currentUser={currentUser}
        museumSettings={museumSettings}
        floors={floors}
        rooms={rooms}
        memories={memories}
        collections={collections}
        currentFloorNumber={characterState.currentFloorNumber}
        onClose={() => setIsFeatureWallModalOpen(false)}
        onUpdateMuseumSettings={(next) => {
          setMuseumSettings(next);
          if (
            currentUser &&
            next.curatorName &&
            next.curatorName !== currentUser.displayName
          ) {
            setCurrentUser({ ...currentUser, displayName: next.curatorName });
          }
        }}
        onNavigateTab={(tab, sub) => {
          setActiveRoomId(null);
          if (sub) setExploreSubTab(sub);
          setActiveNav(tab);
        }}
        onOpenAddMemory={() => {
          setAddMemoryDefaultRoomId(activeRoomId || 'childhood');
          setIsAddMemoryOpen(true);
        }}
        onSmartAddRoom={handleSmartAddRoom}
        onEnterRoom={handleEnterRoom}
        onCallLiftToFloor={(targetFloorNum) => {
          setActiveRoomId(null);
          setActiveNav('home');
          setExternalLiftRequest({
            floorNumber: targetFloorNum,
            timestamp: Date.now(),
          });
        }}
        onOpenFloorExpansion={() => setIsFloorExpansionOpen(true)}
        onStartTutorial={() => {
          setActiveRoomId(null);
          setActiveNav('home');
          setHasEnteredAtrium(true);
          setCharacterWelcomeActive(false);
          setTutorialStepIndex(0);
          setTutorialActive(true);
        }}
        onRequestResetMuseum={() => setIsResetConfirmOpen(true)}
        onSignOut={handleSignOut}
      />

      {roomEntryTransition && (
        <div
          className="memora-room-entry-transition"
          role="status"
          aria-live="polite"
          aria-label="Entering Childhood Memory Park"
        >
          <style>{`
            @keyframes memora-entry-wash {
              0% { opacity: 0; }
              16% { opacity: 1; }
              72% { opacity: 1; }
              100% { opacity: 0; }
            }
            @keyframes memora-entry-door-left {
              0% { transform: translateX(0) scaleX(1); }
              36% { transform: translateX(-2.5vw) scaleX(.94); }
              100% { transform: translateX(-105%) scaleX(.88); }
            }
            @keyframes memora-entry-door-right {
              0% { transform: translateX(0) scaleX(1); }
              36% { transform: translateX(2.5vw) scaleX(.94); }
              100% { transform: translateX(105%) scaleX(.88); }
            }
            @keyframes memora-entry-light {
              0% { transform: scaleX(.08); opacity: 0; }
              28% { transform: scaleX(.35); opacity: .65; }
              58% { transform: scaleX(1); opacity: 1; }
              100% { transform: scaleX(1.5); opacity: 0; }
            }
            @keyframes memora-entry-copy {
              0%, 22% { opacity: 0; transform: translateY(12px); }
              42%, 78% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-5px); }
            }
            .memora-room-entry-transition {
              position: fixed;
              inset: 0;
              z-index: 120;
              display: grid;
              place-items: center;
              overflow: hidden;
              pointer-events: none;
              background: radial-gradient(ellipse at center, rgba(255,246,222,.98) 0%, rgba(229,205,163,.96) 46%, rgba(55,47,38,.98) 100%);
              animation: memora-entry-wash 2.05s ease-in-out both;
            }
            .memora-entry-door {
              position: absolute;
              top: 0;
              bottom: 0;
              width: 50.5%;
              background:
                linear-gradient(90deg, rgba(38,29,22,.22), transparent 18%, transparent 82%, rgba(38,29,22,.18)),
                repeating-linear-gradient(90deg, #6d5037 0px, #795b3e 34px, #684a33 68px, #806044 102px);
              box-shadow: inset 0 0 45px rgba(24,17,12,.32);
              will-change: transform;
            }
            .memora-entry-door-left {
              left: 0;
              transform-origin: left center;
              animation: memora-entry-door-left 1.18s cubic-bezier(.7,0,.2,1) both;
            }
            .memora-entry-door-right {
              right: 0;
              transform-origin: right center;
              animation: memora-entry-door-right 1.18s cubic-bezier(.7,0,.2,1) both;
            }
            .memora-entry-light {
              position: absolute;
              inset: 0 auto 0 50%;
              width: min(44vw, 620px);
              transform: translateX(-50%) scaleX(.08);
              transform-origin: center;
              background: linear-gradient(90deg, transparent, rgba(255,251,232,.98) 35%, #fffdf4 50%, rgba(255,239,195,.9) 65%, transparent);
              filter: blur(22px);
              animation: memora-entry-light 1.45s .12s ease-out both;
            }
            .memora-entry-copy {
              position: relative;
              z-index: 2;
              text-align: center;
              color: #493724;
              padding: 24px;
              animation: memora-entry-copy 2.05s ease both;
            }
            .memora-entry-kicker {
              font: 600 10px/1.2 ui-sans-serif, system-ui, sans-serif;
              letter-spacing: .32em;
              text-transform: uppercase;
              color: #98734a;
              margin-bottom: 14px;
            }
            .memora-entry-title {
              font: 500 clamp(30px, 5vw, 58px)/1.05 Georgia, 'Times New Roman', serif;
              letter-spacing: -.035em;
              text-shadow: 0 2px 24px rgba(255,255,255,.5);
            }
            .memora-entry-subtitle {
              margin-top: 12px;
              font: 500 11px/1.5 ui-sans-serif, system-ui, sans-serif;
              letter-spacing: .18em;
              text-transform: uppercase;
              color: #866b4e;
            }
            @media (prefers-reduced-motion: reduce) {
              .memora-room-entry-transition, .memora-entry-door-left,
              .memora-entry-door-right, .memora-entry-light, .memora-entry-copy {
                animation-duration: .01ms !important;
                animation-delay: 0ms !important;
              }
            }
          `}</style>
          <div className="memora-entry-door memora-entry-door-left" />
          <div className="memora-entry-door memora-entry-door-right" />
          <div className="memora-entry-light" />
          <div className="memora-entry-copy">
            <div className="memora-entry-kicker">A doorway to your memories</div>
            <div className="memora-entry-title">Childhood Memory Park</div>
            <div className="memora-entry-subtitle">Opening your world of wonder</div>
          </div>
        </div>
      )}
    </div>
  );
}
