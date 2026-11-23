import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Layers,
  Lock,
  AlertTriangle,
  RotateCcw,
  Eye,
  Grid,
  CornerUpLeft,
  SlidersHorizontal,
  Film,
  Clock,
  Edit3,
  Info,
  HelpCircle,
  X,
  Sparkles,
  BarChart3,
  Compass,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Volume2,
  Bike,
  TreePine,
  Radio,
  Tv,
  Flower2,
  MessageSquare,
} from 'lucide-react';
import {
  CharacterState,
  Collection,
  ExhibitionDisplayStyle,
  Floor,
  Memory,
  MuseumSettings,
  Room,
  WallFeatureId,
} from '../types/museum';
import { resolveMuseumDisplayName } from '../config/brand';
import { getProceduralMemoryArt } from '../utils/proceduralArt';
import { BedroomInteractionOverlay } from './BedroomInteractionOverlay';
import {
  BedroomCharacterPoseMode,
  ChildhoodBedroomInteractionController,
} from '../utils/childhoodBedroomInteractions';
import { bedroomSfx } from '../utils/bedroomSfx';
import { getRoomVisualThemeProfile } from '../utils/roomThemes';
import {
  computeRoomMemoryVisualData,
  detectRoomCategoryFromInput,
  instantiateStarterMemoriesForRoom,
} from '../utils/roomCategoryExperience';
import {
  CAMERA_COLLIDER_RADIUS,
  CameraControllerOwner,
  DOORWAY_TRIGGER_SPEC,
  DoorwayLatchState,
  FLOOR_HEIGHT,
  MIN_CAMERA_PITCH,
  MAX_CAMERA_PITCH,
  MAX_FRAME_DELTA,
  PORTAL_ARCH_SPEC,
  ROOM_DOOR_SPEC,
  ROOMS_PER_FLOOR,
  RoomDoorState,
  RoomPortalStatus,
  FloorColliderSet,
  buildCameraFloorColliders,
  buildFloorColliders,
  computeResponsiveCameraFov,
  computeRoomEntryLightState,
  createInitialRoomDoorState,
  evaluateRoomDoorwayTransitions,
  getFloorSlotPlacementCoords,
  getPerimeterArchitectureSpec,
  getRoomExitCorridorPosition,
  isCharacterInElevatorApproachZone,
  isCharacterInElevatorCabin,
  isCharacterInElevatorDoorway,
  isCharacterInElevatorProximity,
  resolveCameraControllerOwner,
  resolveCharacterMovement,
  resolveCharacterVisibility,
  resolveSingleStepPosition,
  resolveThirdPersonCameraPosition,
  sanitizeCharacterPosition,
  sanitizeFiniteNumber,
  sanitizeFloorIndex,
  sanitizePitch,
  sanitizeYaw,
  shortestAngleDiff,
  stepRoomDoorState,
  worldToPortalLocalXZ,
} from '../utils/atriumCollision';
import {
  CHILDHOOD_THEME_STYLE_PRESETS,
  EXHIBITION_DISPLAY_STYLE_OPTIONS,
  MUSEUM_LUXURY_PALETTE,
  ROOM_ENTRANCE_TRANSITION_SPEC,
  ROOM_INTERIOR_SPEC,
  BuiltExhibitionRoom3D,
  buildExhibitionRoom3DScene,
  buildRoomInteriorColliders,
  createChampagneLimestoneTexture,
  createLimestonePBRMaps,
  createNaturalBoucleTexture,
  createRichWalnutWoodTexture,
  createWoodPBRMaps,
  evaluateRoomMemoryProximity,
  getBicycleTrailPose,
  buildContextualWorldCatalog,
  getEffectiveRoomExhibitionStyle,
  resolveRoomInteriorMovement,
} from '../utils/roomExhibition3D';
import { VideoMemoryPlayer } from './VideoMemoryPlayer';
import {
  AtmospherePresetId,
  ChildhoodThemeStyleId,
  InteractiveObjectId3D,
  LivingWorldSpaceId,
  RoomCustomizationStudioConfig,
  TechBuddyPose,
} from '../types/aiStudio';
import { WALL_MENU_ITEMS } from './NavigationHubModals';
import { AnimationCleanupHandle, gsap } from '../utils/gsapMuseumAnimations';
import {
  AdaptiveGraphicsMonitor,
  GraphicsProfileId,
  SharedMuseumMaterialMaps,
  createBotanicalCanopyPBRSet,
  createBrushedMetalPBRMaps,
  createMossAndPebbleBedTexture,
  createOrganicTreeBarkPBRSet,
  createParterreMedallionMaps,
  createSyncedTravertineFloorPBRSet,
  createTailoredFabricPBRMaps,
  createWarmParquetFloorPBRSet,
  computeEffectivePixelRatio,
  detectInitialGraphicsProfile,
  ensureUv2Attribute,
  getSoftwareGlFrameIntervalMs,
  populateRefinedAtriumTree,
} from '../utils/museumVisualStandards';

export { FLOOR_HEIGHT };

interface AtriumScene3DProps {
  floors: Floor[];
  rooms: Room[];
  memories: Memory[];
  collections?: Collection[];
  activeRoomId: string | null;
  hasEnteredAtrium: boolean;
  museumSettings: MuseumSettings;
  tutorialActive: boolean;
  tutorialTargetHighlight?: string | null;
  characterState: CharacterState;
  externalLiftRequest: { floorNumber: number; timestamp: number } | null;
  isAnyModalOpen?: boolean;
  pauseRendering?: boolean;
  characterWelcomeActive?: boolean;
  onUpdateCharacterState: (next: CharacterState) => void;
  onSelectRoom: (roomId: string | null) => void;
  onSelectMemory: (memory: Memory) => void;
  onOpenCreateRoomInSlot: (
    floorId: string,
    slotIndex: 0 | 1 | 2 | 3,
    existingRoom?: Room,
  ) => void;
  onSmartAddRoom: () => void;
  onSelectWallFeature: (featureId: WallFeatureId) => void;
  onUpdateRoomExhibitionStyle?: (
    roomId: string,
    style: ExhibitionDisplayStyle,
  ) => void;
  onUpdateRoomDesignConfig?: (
    roomId: string,
    designPatch: Partial<NonNullable<Room['designConfig']>>,
  ) => void;
  onOpenRoomCatalogue?: () => void;
  onOpenAddMemory?: (roomId: string) => void;
  onOpenEditRoom?: (room: Room) => void;
  onOpenTimeline?: () => void;
  showControlsGuide?: boolean;
  onToggleControlsGuide?: () => void;
  onEmitTip?: (
    id: string,
    message: string,
    detail?: string,
    priority?: 'tip' | 'important',
  ) => void;
}

interface PortalRecord {
  roomId: string;
  floorId: string;
  floorNumber: number;
  slotIndex: 0 | 1 | 2 | 3;
  status: 'empty' | 'active' | 'disabled';
  group: THREE.Group;
  hitbox: THREE.Mesh;
  archGlowMesh: THREE.Mesh;
  pointLight: THREE.PointLight;
  baseLightScale: number;
  entryLightMats: THREE.MeshStandardMaterial[];
  entryHaloMat: THREE.MeshBasicMaterial;
  plaqueMesh: THREE.Mesh;
  doorPos: THREE.Vector3;
  labelWorldAnchor: THREE.Vector3;
  cameraPos: THREE.Vector3;
  cameraLookAt: THREE.Vector3;
  frameHitboxes: { mesh: THREE.Mesh; memoryId: string }[];
  artifactMesh: THREE.Mesh | null;
  leftDoorMesh: THREE.Mesh | null;
  rightDoorMesh: THREE.Mesh | null;
  doorState: RoomDoorState;
}

interface WallPanelRecord {
  featureId: WallFeatureId;
  floorNumber: number;
  title: string;
  subtitle: string;
  cardGroup: THREE.Group;
  bezelMesh: THREE.Mesh;
  hitbox: THREE.Mesh;
  baseScale: number;
}

interface LiftFloorRecord {
  floorNumber: number;
  leftDoor: THREE.Mesh;
  rightDoor: THREE.Mesh;
  callButtonHitbox: THREE.Mesh;
  callButtonGlowMat: THREE.MeshStandardMaterial;
  indicatorTex: THREE.CanvasTexture;
  indicatorCanvas: HTMLCanvasElement;
}

interface ProximityTarget {
  kind:
    | 'active_room'
    | 'empty_slot'
    | 'disabled_room'
    | 'lift'
    | 'feature_wall'
    | 'discovery_compass'
    | 'room_memory'
    | 'room_exit'
    | 'room_interactive_object'
    | 'contextual_station';
  title: string;
  subtitle: string;
  room?: Room;
  memory?: Memory;
  floorNumber?: number;
  slotIndex?: 0 | 1 | 2 | 3;
  stationId?: 'bicycle' | 'treehouse' | 'cinema' | 'radio' | 'garden';
  objectId?: InteractiveObjectId3D;
  promptVerb?: string;
}

export type LiftSequencePhase =
  | 'idle'
  | 'closed'
  | 'opening'
  | 'doors_opening'
  | 'open'
  | 'closing'
  | 'doors_closing'
  | 'travel_closing'
  | 'traveling'
  | 'arriving_doors_opening'
  | 'awaiting_selection'
  | 'boarding'
  | 'turning_to_doors'
  | 'doors_closing_after_entry'
  | 'exiting';

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _camPivotPos = new THREE.Vector3();
const _camRayOrigin = new THREE.Vector3();
const _camRayDir = new THREE.Vector3();
const _projVec = new THREE.Vector3();

function createPortalPlaqueTexture(
  roomName: string,
  subtitle: string,
  count: number,
  accentHex: string,
  status: 'empty' | 'active' | 'disabled',
  slotIndex: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 148;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(512 / 768, 148 / 220);

  const grad = ctx.createLinearGradient(0, 0, 768, 220);
  if (status === 'empty') {
    grad.addColorStop(0, '#493B2F');
    grad.addColorStop(1, '#382C22');
  } else if (status === 'disabled') {
    grad.addColorStop(0, '#332B26');
    grad.addColorStop(1, '#241E1A');
  } else {
    grad.addColorStop(0, '#2C1D13');
    grad.addColorStop(0.5, '#3C2719');
    grad.addColorStop(1, '#26180F');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 768, 220);

  ctx.strokeStyle = status === 'empty' ? '#CBB89D' : '#D6A15D';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 744, 196);

  ctx.fillStyle = status === 'empty' ? '#E9D4B1' : accentHex;
  ctx.fillRect(324, 34, 120, 5);

  ctx.fillStyle = '#FDF8F0';
  ctx.font = '600 48px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  const titleText =
    status === 'empty'
      ? slotIndex === 0
        ? 'Childhood Room (Not Activated)'
        : 'Architectural Alcove'
      : status === 'disabled'
        ? `${roomName} (Disabled)`
        : roomName;
  ctx.fillText(titleText.slice(0, 30), 384, 108);

  const countLabel =
    status === 'empty'
      ? slotIndex === 0
        ? 'CHILDHOOD ROOM  ·  ACTIVATE TO ENTER'
        : 'MUSEUM PROMENADE ARCHWAY'
      : status === 'disabled'
        ? `${count} MEMORIES PRESERVED  ·  DOORWAY LOCKED`
        : `${count} ${count === 1 ? 'MEMORY' : 'MEMORIES'}  ·  WALK IN TO ENTER  ·  ${subtitle.toUpperCase()}`;
  ctx.fillStyle = '#E5C38B';
  ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(countLabel.slice(0, 52), 384, 158);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

/**
 * Prominent Project Name Header Plaque at the top of the Feature Wall on every floor.
 */
function createWallHeaderTexture(
  projectName: string,
  floorName: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 144;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(768 / 1024, 144 / 192);

  ctx.fillStyle = '#27231F';
  ctx.fillRect(0, 0, 1024, 192);

  ctx.strokeStyle = '#D6A15D';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 1004, 172);

  // Project Name prominently displayed at top of the wall
  ctx.fillStyle = '#FFFCF6';
  ctx.font = '700 64px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(projectName.slice(0, 28), 512, 92);

  // Subtle gold divider rule
  ctx.fillStyle = '#D6A15D';
  ctx.fillRect(392, 112, 240, 3);

  ctx.fillStyle = '#E9D4B1';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${floorName.toUpperCase()}  ·  SELECT AN OPTION BELOW WITH YOUR MOUSE`,
    512,
    152,
  );

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

function createWallPanelCardTexture(
  numberLabel: string,
  title: string,
  subtitle: string,
  accentHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(512 / 640, 192 / 240);

  const grad = ctx.createLinearGradient(0, 0, 640, 240);
  grad.addColorStop(0, '#FFFCF6');
  grad.addColorStop(1, '#F3ECE0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 240);

  ctx.strokeStyle = '#D6A15D';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 624, 224);

  // Left accent bar
  ctx.fillStyle = accentHex;
  ctx.fillRect(28, 34, 8, 172);

  // Number badge
  ctx.fillStyle = '#27231F';
  ctx.fillRect(54, 36, 62, 36);
  ctx.fillStyle = '#FDE68A';
  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(numberLabel, 85, 62);

  // Title
  ctx.fillStyle = '#27231F';
  ctx.font = '700 42px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(title.slice(0, 24), 54, 126);

  // Subtitle
  ctx.fillStyle = '#493629';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle.slice(0, 42), 54, 170);

  // Right arrow indicator
  ctx.fillStyle = '#854D27';
  ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('OPEN →', 602, 62);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

function drawLiftIndicatorCanvas(
  canvas: HTMLCanvasElement,
  displayedFloorNumber: number,
  totalFloors: number,
  isMoving: boolean,
  directionSign: number,
) {
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1E1610';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#D6A15D';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.fillStyle = '#D6A15D';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MUSEUM ELEVATOR', canvas.width / 2, 42);

  const arrow = isMoving ? (directionSign >= 0 ? '▲ ' : '▼ ') : '';
  ctx.fillStyle = '#FDE68A';
  ctx.font = '700 56px "JetBrains Mono", monospace';
  ctx.fillText(
    `${arrow}FL ${displayedFloorNumber + 1} / ${totalFloors}`,
    canvas.width / 2,
    108,
  );

  ctx.fillStyle = '#E9D4B1';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    isMoving ? 'CABIN IN TRANSIT' : 'PRESS [E] TO ENTER LIFT',
    canvas.width / 2,
    146,
  );
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 120);
  grad.addColorStop(0, 'rgba(38, 25, 15, 0.44)');
  grad.addColorStop(0.55, 'rgba(38, 25, 15, 0.16)');
  grad.addColorStop(1, 'rgba(38, 25, 15, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWarmMoteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 252, 246, 0.95)');
  grad.addColorStop(0.38, 'rgba(233, 212, 177, 0.65)');
  grad.addColorStop(0.72, 'rgba(214, 161, 93, 0.22)');
  grad.addColorStop(1, 'rgba(214, 161, 93, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function getFloorSlotPlacement(
  floorNumber: number,
  slotIndex: 0 | 1 | 2 | 3,
): {
  pos: THREE.Vector3;
  rotY: number;
  doorPos: THREE.Vector3;
  camPos: THREE.Vector3;
  camLook: THREE.Vector3;
  labelAnchor: THREE.Vector3;
  leftWingLength: number;
  rightWingLength: number;
} {
  const c = getFloorSlotPlacementCoords(slotIndex, floorNumber);
  return {
    pos: new THREE.Vector3(c.x, c.y, c.z),
    rotY: c.rotY,
    doorPos: new THREE.Vector3(c.doorX, c.doorY, c.doorZ),
    camPos: new THREE.Vector3(c.camX, c.camY, c.camZ),
    camLook: new THREE.Vector3(c.camLookX, c.camLookY, c.camLookZ),
    labelAnchor: new THREE.Vector3(c.labelX, c.labelY, c.labelZ),
    leftWingLength: c.leftWingLength,
    rightWingLength: c.rightWingLength,
  };
}

const AtriumScene3DComponent: React.FC<AtriumScene3DProps> = ({
  floors,
  rooms,
  memories,
  collections = [],
  activeRoomId,
  hasEnteredAtrium,
  museumSettings,
  tutorialActive,
  tutorialTargetHighlight,
  characterState,
  externalLiftRequest,
  isAnyModalOpen = false,
  pauseRendering = false,
  characterWelcomeActive = false,
  onUpdateCharacterState,
  onSelectRoom,
  onSelectMemory,
  onOpenCreateRoomInSlot,
  onSmartAddRoom,
  onSelectWallFeature,
  onUpdateRoomExhibitionStyle,
  onUpdateRoomDesignConfig,
  onOpenRoomCatalogue,
  onOpenAddMemory,
  onOpenEditRoom,
  onOpenTimeline,
  showControlsGuide,
  onToggleControlsGuide,
  onEmitTip,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelContainerRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );

  const [webglError, setWebglError] = useState<string | null>(null);
  const [webglContextLost, setWebglContextLost] = useState<boolean>(false);
  const [sceneRetryNonce, setSceneRetryNonce] = useState<number>(0);

  const [hoveredInfo, setHoveredInfo] = useState<{
    title: string;
    subtitle: string;
    x: number;
    y: number;
  } | null>(null);

  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isMouseCaptured, setIsMouseCaptured] = useState(true);
  const [cameraViewMode, setCameraViewMode] = useState<
    'third_person' | 'first_person'
  >('third_person');
  const cameraViewModeRef = useRef<'third_person' | 'first_person'>(
    'third_person',
  );
  cameraViewModeRef.current = cameraViewMode;
  const cameraDistanceRef = useRef<number>(4.2);
  const [atriumLightingMood, setAtriumLightingMood] = useState<
    'golden_hour' | 'daylight_salon' | 'evening_nocturne'
  >('golden_hour');
  const atriumLightingMoodRef = useRef<
    'golden_hour' | 'daylight_salon' | 'evening_nocturne'
  >('golden_hour');
  atriumLightingMoodRef.current = atriumLightingMood;

  const [showRoomDetailsDrawer, setShowRoomDetailsDrawer] = useState(false);
  const [showRoomGuideBubble, setShowRoomGuideBubble] = useState(true);
  const [showRoomZoneMiniMap, setShowRoomZoneMiniMap] = useState(true);
  const [localControlsGuideOpen, setLocalControlsGuideOpen] = useState(true);
  const isControlsGuideVisible =
    showControlsGuide !== undefined ? showControlsGuide : localControlsGuideOpen;
  const handleToggleControlsGuide = () => {
    if (onToggleControlsGuide) {
      onToggleControlsGuide();
    } else {
      setLocalControlsGuideOpen((prev) => !prev);
    }
  };

  // Living World Multi-Space, Tech Buddy, Atmosphere & Live 3D Studio Customizer State
  const activeExhibitionBuiltRef = useRef<BuiltExhibitionRoom3D | null>(null);
  const clickToMoveTargetRef = useRef<{ x: number; z: number } | null>(null);
  const climbHeightOffsetRef = useRef<number>(0);
  const charCurrentPosRef = useRef<{ x: number; z: number }>({ x: 0, z: 3.4 });
  const walkthroughWaypointsRef = useRef<{ x: number; z: number }[]>([]);
  const walkthroughLookTargetRef = useRef<{
    focusX: number;
    focusZ: number;
    targetPitch: number;
  } | null>(null);
  const pendingStartWalkthroughRef = useRef<boolean>(false);
  const pendingStartWalkthroughTimerRef = useRef<number | null>(null);
  const activeCameraTransitionRef = useRef<AnimationCleanupHandle | null>(null);

  const [walkthroughActive, setWalkthroughActive] = useState<boolean>(false);
  const [walkthroughStepIdx, setWalkthroughStepIdx] = useState<number>(0);
  const [walkthroughAutoPlay, setWalkthroughAutoPlay] = useState<boolean>(false);
  const [walkthroughWalking, setWalkthroughWalking] = useState<boolean>(false);
  const walkthroughWalkingRef = useRef<boolean>(false);
  walkthroughWalkingRef.current = walkthroughWalking;

  const WALKTHROUGH_ZONES = useMemo(
    () =>
      [
        {
          id: 'interactive_scrapbook',
          stepNumber: 1,
          title: 'Interactive Scrapbook',
          shortLabel: '1. Scrapbook',
          categoryBadge: 'Stories & Letters',
          standX: 0.0,
          standZ: 2.35,
          focusX: 0.0,
          focusZ: 0.25,
          targetPitch: 0.16,
          spaceId: 'central_gallery' as LivingWorldSpaceId,
          buddyPose: 'pointing' as TechBuddyPose,
          guideNarration:
            'Here at the base of the central tree rests your Interactive Scrapbook, surrounded by keepsake toys and a running model train.',
          howToTitle: 'How to Interact with the Scrapbook',
          instructions: [
            'Click directly on the open illuminated Scrapbook pages or press [E] when standing near the circular podium.',
            'Read full personal stories, handwritten letters, and archived chat transcripts in stationery & conversation view.',
            'Use the ← / → arrow keys inside the viewer to flip between connected stories and keepsake entries.',
          ],
          shortcutBadge: 'Press [E] or Click Open Scrapbook Pages',
          actionButtonLabel: 'Open Scrapbook Story',
        },
        {
          id: 'cinema_corner',
          stepNumber: 2,
          title: 'Cinema Corner',
          shortLabel: '2. Cinema',
          categoryBadge: 'Video Theater',
          standX: 2.25,
          standZ: -1.95,
          focusX: 3.55,
          focusZ: -4.25,
          targetPitch: 0.04,
          spaceId: 'central_gallery' as LivingWorldSpaceId,
          buddyPose: 'celebrating' as TechBuddyPose,
          guideNarration:
            'Welcome to the Cinema Corner! Framed by burgundy velvet curtains and cozy lounge poufs, your video memories come alive on the big screen.',
          howToTitle: 'How to Interact with Cinema Corner',
          instructions: [
            'Click the widescreen theater display or press [E] in front of the lounge rug to launch the Cinema Player.',
            'Uploaded MP4/WebM video memories stream directly on the 3D screen and open with full audio, timeline scrubbing, and playback controls.',
            'You can also trigger the vintage Bedroom TV in the 3D Studio bar to preview home-video reels.',
          ],
          shortcutBadge: 'Press [E] or Click Theater Screen',
          actionButtonLabel: 'Watch Cinema Memory',
        },
        {
          id: 'audio_memories',
          stepNumber: 3,
          title: 'Audio Memories Booth',
          shortLabel: '3. Audio',
          categoryBadge: 'Voice & Soundscape',
          standX: 2.85,
          standZ: 0.15,
          focusX: 4.92,
          focusZ: 0.15,
          targetPitch: 0.08,
          spaceId: 'central_gallery' as LivingWorldSpaceId,
          buddyPose: 'talking' as TechBuddyPose,
          guideNarration:
            'This walnut and brass listening booth houses your recorded voice notes, songs, and acoustic waveforms beneath studio headphones.',
          howToTitle: 'How to Interact with Audio Memories',
          instructions: [
            'Click the suspended 3D studio headphones or the glowing acoustic waveform plaque (or press [E] nearby).',
            'Listen to uploaded MP3, WAV, or M4A voice recordings and personal audio keepsakes with a live acoustic waveform visualizer.',
            'Pair your visit with a continuous room soundtrack using the Music panel in the header.',
          ],
          shortcutBadge: 'Press [E] or Click Headphones / Waveform',
          actionButtonLabel: 'Play Audio Memory',
        },
        {
          id: 'memory_wall',
          stepNumber: 4,
          title: 'Illuminated Memory Wall',
          shortLabel: '4. Memory Wall',
          categoryBadge: 'Framed Gallery',
          standX: -2.65,
          standZ: -1.15,
          focusX: -4.92,
          focusZ: -1.2,
          targetPitch: 0.05,
          spaceId: 'central_gallery' as LivingWorldSpaceId,
          buddyPose: 'pointing' as TechBuddyPose,
          guideNarration:
            'Along the west wall, brass picture lamps illuminate your framed photographs in a curated multi-frame salon hang.',
          howToTitle: 'How to Interact with the Memory Wall',
          instructions: [
            'Hover over any portrait or landscape frame to read its title and date plaque.',
            'Click any frame or press [E] to open the full-resolution photograph, toggle 360° Panorama Pan, or customize its 3D frame finish.',
          ],
          shortcutBadge: 'Press [E] or Click Any Framed Photo',
          actionButtonLabel: 'Inspect Memory Wall Photo',
        },
        {
          id: 'floating_memories',
          stepNumber: 5,
          title: 'Floating Memories Canopy',
          shortLabel: '5. Canopy',
          categoryBadge: 'Suspended Halo Frames',
          standX: 0.45,
          standZ: 1.85,
          focusX: 0.15,
          focusZ: -0.65,
          targetPitch: -0.05,
          spaceId: 'central_gallery' as LivingWorldSpaceId,
          buddyPose: 'waving' as TechBuddyPose,
          guideNarration:
            'Look up into the branches of the central tree—glowing memory frames float gently on golden light cords.',
          howToTitle: 'How to Interact with Floating Memories',
          instructions: [
            'Tilt your view slightly upward and click any glowing frame suspended from the tree branches.',
            'Each floating frame highlights a milestone moment and opens its full curatorial record.',
          ],
          shortcutBadge: 'Click Any Suspended Canopy Frame',
          actionButtonLabel: 'Inspect Floating Memory',
        },
        {
          id: 'keepsake_gallery',
          stepNumber: 6,
          title: 'Keepsake Gallery Vitrine',
          shortLabel: '6. Keepsakes',
          categoryBadge: '3D Heirlooms & Objects',
          standX: -2.15,
          standZ: 2.25,
          focusX: -3.85,
          focusZ: 1.65,
          targetPitch: 0.12,
          spaceId: 'central_gallery' as LivingWorldSpaceId,
          buddyPose: 'interacting' as TechBuddyPose,
          guideNarration:
            'Inside this glass-and-brass museum vitrine sit 3D childhood keepsakes—a retro toy robot, rangefinder camera, golden trophy, and model car.',
          howToTitle: 'How to Interact with 3D Keepsakes',
          instructions: [
            'Click the Keepsake Gallery plaque or press [E] to inspect the curated keepsake memory.',
            'Click any of the 12 interactive 3D objects in the room (Toy Train, Toy Chest, Spinning Globe, Tyre Swing, Bicycle) to animate them in 3D!',
          ],
          shortcutBadge: 'Press [E] or Click 3D Keepsakes',
          actionButtonLabel: 'Inspect Keepsake Exhibit',
        },
        {
          id: 'memory_constellation',
          stepNumber: 7,
          title: 'Memory Constellation Table',
          shortLabel: '7. Constellation',
          categoryBadge: 'Connected Memory Graph',
          standX: 2.1,
          standZ: 2.25,
          focusX: 3.65,
          focusZ: 1.85,
          targetPitch: 0.18,
          spaceId: 'central_gallery' as LivingWorldSpaceId,
          buddyPose: 'celebrating' as TechBuddyPose,
          guideNarration:
            'Our final stop is the Memory Constellation Table, mapping how your memories connect across people, places, and eras.',
          howToTitle: 'How to Interact with Memory Constellation',
          instructions: [
            'Click the angled brass touchscreen table or press [E] to inspect connected memory nodes.',
            'Inside any memory detail card, use the Related Memories section to jump across linked moments.',
          ],
          shortcutBadge: 'Press [E] or Click Constellation Table',
          actionButtonLabel: 'Explore Memory Constellation',
        },
      ] as const,
    [],
  );

  const [activeSpaceId, setActiveSpaceId] =
    useState<LivingWorldSpaceId>('central_gallery');
  const [activeAtmospherePreset, setActiveAtmospherePreset] =
    useState<AtmospherePresetId>('golden_hour');
  const [techBuddyPoseState, setTechBuddyPoseState] =
    useState<TechBuddyPose>('waving');
  const [techBuddyVisibleState, setTechBuddyVisibleState] =
    useState<boolean>(true);
  const [techBuddySpeechText, setTechBuddySpeechText] = useState<string>(
    'Explore your memories, watch videos, read stories, or click any 3D object to interact!',
  );
  const [lastTriggeredObjectFeedback, setLastTriggeredObjectFeedback] =
    useState<{
      objectId: InteractiveObjectId3D;
      title: string;
      actionMessage: string;
      linkedMemory?: Memory;
    } | null>(null);

  // Stage 02: Contextual Exploration Catalog & Interactive Stations
  const contextualCatalog = useMemo(
    () => buildContextualWorldCatalog(memories, collections),
    [memories, collections],
  );
  const [activeContextualStation, setActiveContextualStation] = useState<
    'bicycle' | 'treehouse' | 'cinema' | 'radio' | 'garden' | null
  >(null);
  const [bicycleRideActive, setBicycleRideActive] = useState<boolean>(false);
  const bicycleRideActiveRef = useRef<boolean>(false);
  bicycleRideActiveRef.current = bicycleRideActive;
  const [bicycleRidePaused, setBicycleRidePaused] = useState<boolean>(false);
  const bicycleRidePausedRef = useRef<boolean>(false);
  bicycleRidePausedRef.current = bicycleRidePaused;
  const bicycleRideProgressRef = useRef<number>(0);
  const [selectedCinemaVideo, setSelectedCinemaVideo] = useState<Memory | null>(
    null,
  );
  const [selectedRadioTrackId, setSelectedRadioTrackId] = useState<
    string | null
  >(null);
  const [radioIsPlaying, setRadioIsPlaying] = useState<boolean>(false);
  const [radioVolume, setRadioVolume] = useState<number>(0.85);
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const openStationExperienceRef = useRef<
    ((station: 'bicycle' | 'treehouse' | 'cinema' | 'radio' | 'garden') => void) | null
  >(null);

  const handleStopBicycleRide = () => {
    setBicycleRideActive(false);
    setBicycleRidePaused(false);
    bicycleRideActiveRef.current = false;
    bicycleRidePausedRef.current = false;
    activeExhibitionBuiltRef.current?.setBicycleRidePose?.(false, null, 0);
    if (activeContextualStation === 'bicycle') {
      setActiveContextualStation(null);
    }
  };

  const handleOpenStationExperience = (
    station: 'bicycle' | 'treehouse' | 'cinema' | 'radio' | 'garden',
  ) => {
    setActiveContextualStation(station);
    if (station === 'bicycle') {
      setBicycleRideActive(true);
      setBicycleRidePaused(false);
      bicycleRideActiveRef.current = true;
      bicycleRidePausedRef.current = false;
    } else if (bicycleRideActiveRef.current) {
      handleStopBicycleRide();
      setActiveContextualStation(station);
    }
    if (station === 'radio' && !selectedRadioTrackId) {
      const firstTrack = contextualCatalog.audioTracks[0];
      if (firstTrack) {
        setSelectedRadioTrackId(firstTrack.memory.id);
        setRadioIsPlaying(false); // Never autoplay private voice recordings
      }
    }
  };
  openStationExperienceRef.current = handleOpenStationExperience;

  // Unified Childhood Bedroom Interaction State (S-a .. S-h)
  const [activeBedroomInteraction, setActiveBedroomInteraction] =
    useState<InteractiveObjectId3D | null>(null);
  const [bedroomOverlayRevision, setBedroomOverlayRevision] = useState<number>(0);
  const activeBedroomInteractionRef = useRef<InteractiveObjectId3D | null>(null);
  activeBedroomInteractionRef.current = activeBedroomInteraction;

  const explorerHeadRigRef = useRef<THREE.Object3D | null>(null);
  const savedBedroomExploreStateRef = useRef<{
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    camX: number;
    camY: number;
    camZ: number;
    lookX: number;
    lookY: number;
    lookZ: number;
  } | null>(null);
  const bedroomFocusTargetRef = useRef<{
    cameraPos: THREE.Vector3;
    lookAt: THREE.Vector3;
    pose: BedroomCharacterPoseMode;
    characterPos?: THREE.Vector3;
    characterYaw?: number;
  } | null>(null);
  const pageTurnHandAnimTimerRef = useRef<number>(0);
  const cricketSwingAnimTimerRef = useRef<number>(0);
  const enterBedroomInteractionRef = useRef<
    ((objectId: InteractiveObjectId3D) => boolean) | null
  >(null);
  const exitBedroomInteractionRef = useRef<(() => void) | null>(null);

  const DEFAULT_STUDIO_CONFIG: RoomCustomizationStudioConfig = useMemo(
    () => ({
      wallColorHex: '#F3EBDD',
      wallTexture: 'wood_wainscoting',
      floorColorHex: '#FFEAD2',
      floorMaterial: 'warm_oak',
      ceilingColorHex: '#FAF5EC',
      furnitureColorHex: '#FFFFFF',
      bedsheetColorHex: '#C87A5B',
      bedDesign: 'classic_sleigh',
      cupboardStyle: 'vintage_walnut',
      deskStyle: 'scholar_oak',
      windowStyle: 'arched_sunlit',
      curtainColorHex: '#E6D7C3',
      curtainsVisible: true,
      lightIntensity: 2.35,
      atmospherePreset: 'golden_hour',
      skyGardenAppearance: 'sunny_garden',
      childhoodThemeStyle: 'nostalgic_childhood',
      furnitureLayoutPreset: 'classic',
      toyArrangementPreset: 'train_adventure',
      showRugs: true,
      showCushions: true,
      showLamps: true,
      showPosters: true,
      showPlants: true,
      showToys: true,
      techBuddyVisible: true,
      enabledSpaces: [
        'central_gallery',
        'bedroom',
        'backyard',
        'play_area',
        'treehouse',
        'study_corner',
      ],
      enabledObjects: [
        'toy_chest',
        'toy_train',
        'tyre_swing',
        'bicycle',
        'cricket_set',
        'hopscotch',
        'treehouse_ladder',
        'study_desk',
        'spinning_globe',
        'wardrobe',
        'wooden_bed',
        'bedroom_tv',
      ],
    }),
    [],
  );

  const [showStudioCustomizer, setShowStudioCustomizer] = useState(false);
  const [customiseTab, setCustomiseTab] = useState<
    'themes' | 'interior' | 'furniture' | 'atmosphere'
  >('themes');
  const [studioHistory, setStudioHistory] = useState<
    RoomCustomizationStudioConfig[]
  >([DEFAULT_STUDIO_CONFIG]);
  const [studioHistoryIdx, setStudioHistoryIdx] = useState<number>(0);

  const currentStudioConfig =
    studioHistory[studioHistoryIdx] || DEFAULT_STUDIO_CONFIG;

  useEffect(() => {
    if (!activeRoomId) {
      setShowStudioCustomizer(false);
      return;
    }
    const targetRoom = rooms.find((r) => r.id === activeRoomId);
    if (targetRoom?.designConfig?.studioCustomization) {
      const merged = {
        ...DEFAULT_STUDIO_CONFIG,
        ...targetRoom.designConfig.studioCustomization,
      };
      setStudioHistory([merged]);
      setStudioHistoryIdx(0);
    }
  }, [activeRoomId, DEFAULT_STUDIO_CONFIG]);

  const navigateCharacterToWalkthroughStop = (stepIndex: number) => {
    const clampedIdx =
      ((stepIndex % WALKTHROUGH_ZONES.length) + WALKTHROUGH_ZONES.length) %
      WALKTHROUGH_ZONES.length;
    const stop = WALKTHROUGH_ZONES[clampedIdx];
    setWalkthroughStepIdx(clampedIdx);
    setWalkthroughWalking(true);
    walkthroughWalkingRef.current = true;
    climbHeightOffsetRef.current = 0;
    setActiveSpaceId(stop.spaceId);

    // Compute smooth path around the central tree podium if crossing between front and back
    const curX = charCurrentPosRef.current.x;
    const curZ = charCurrentPosRef.current.z;
    const waypoints: { x: number; z: number }[] = [];
    const crossesCenterZ =
      (curZ > 0.3 && stop.standZ < -0.3) || (curZ < -0.3 && stop.standZ > 0.3);
    if (
      crossesCenterZ &&
      Math.abs(curX) < 2.25 &&
      Math.abs(stop.standX) < 2.45
    ) {
      const sideSign = stop.standX >= 0 ? 1 : -1;
      waypoints.push({ x: sideSign * 2.45, z: 0.65 });
    }
    waypoints.push({ x: stop.standX, z: stop.standZ });

    walkthroughWaypointsRef.current = waypoints.slice(1);
    clickToMoveTargetRef.current = waypoints[0];
    walkthroughLookTargetRef.current = {
      focusX: stop.focusX,
      focusZ: stop.focusZ,
      targetPitch: stop.targetPitch,
    };

    setTechBuddySpeechText(stop.guideNarration);
    setShowRoomGuideBubble(true);
    setTechBuddyPoseState(stop.buddyPose);
    activeExhibitionBuiltRef.current?.commandTechBuddy?.({
      targetSpace: stop.spaceId,
      pose: stop.buddyPose,
      visible: true,
    });
  };

  const startMuseumWalkthrough = (initialStepIndex = 0) => {
    if (!activeRoomId) {
      const firstActive = rooms.find((r) => r.status === 'active');
      if (firstActive) {
        pendingStartWalkthroughRef.current = true;
        onSelectRoom(firstActive.id);
        return;
      }
      const firstSlot = rooms[0];
      if (firstSlot) {
        onOpenCreateRoomInSlot(firstSlot.floorId, firstSlot.slotIndex, firstSlot);
      }
      return;
    }
    setWalkthroughActive(true);
    setWalkthroughAutoPlay(true);
    navigateCharacterToWalkthroughStop(initialStepIndex);
  };

  const stopMuseumWalkthrough = () => {
    setWalkthroughActive(false);
    setWalkthroughAutoPlay(false);
    setWalkthroughWalking(false);
    walkthroughWalkingRef.current = false;
    walkthroughWaypointsRef.current = [];
    walkthroughLookTargetRef.current = null;
    clickToMoveTargetRef.current = null;
  };

  const resolveZoneTargetMemory = (zoneId: string): Memory | null => {
    if (!activeRoomId) return null;
    const roomObj = rooms.find((r) => r.id === activeRoomId);
    if (!roomObj) return null;
    const roomCat = detectRoomCategoryFromInput(
      `${roomObj.name} ${roomObj.subtitle} ${roomObj.theme}`,
      roomObj.designConfig?.detectedCategory,
    );
    const roomMems = memories.filter((m) => m.roomId === roomObj.id);
    const effectiveMems =
      roomMems.length > 0
        ? roomMems
        : instantiateStarterMemoriesForRoom(
            roomObj.id,
            roomObj.designConfig?.suggestedStarterMemories ||
              roomCat.profile.starterMemories,
          );
    if (effectiveMems.length === 0) return null;

    switch (zoneId) {
      case 'interactive_scrapbook':
        return (
          effectiveMems.find(
            (m) =>
              m.type === 'story' ||
              m.type === 'chat' ||
              (m.story || '').length > 40,
          ) || effectiveMems[0]
        );
      case 'cinema_corner':
        return (
          effectiveMems.find((m) => (m.type || m.mediaType) === 'video') ||
          effectiveMems[1] ||
          effectiveMems[0]
        );
      case 'audio_memories':
        return (
          effectiveMems.find((m) => (m.type || m.mediaType) === 'audio') ||
          effectiveMems[2] ||
          effectiveMems[0]
        );
      case 'memory_wall':
        return effectiveMems[0];
      case 'floating_memories':
        return effectiveMems[0];
      case 'keepsake_gallery':
        return effectiveMems[3] || effectiveMems[0];
      case 'memory_constellation':
        return effectiveMems[effectiveMems.length - 1] || effectiveMems[0];
      default:
        return effectiveMems[0];
    }
  };

  const handleWalkthroughInteractCurrentZone = () => {
    const currentZone = WALKTHROUGH_ZONES[walkthroughStepIdx];
    if (!currentZone) return;
    if (currentZone.id === 'interactive_scrapbook') {
      handleTriggerObject3D('toy_train');
    } else if (currentZone.id === 'keepsake_gallery') {
      handleTriggerObject3D('toy_chest');
    }
    const mem = resolveZoneTargetMemory(currentZone.id);
    if (mem) {
      onSelectMemory(mem);
    }
  };

  // Auto-advance timer when Auto-Tour is enabled and character has arrived at current stop
  useEffect(() => {
    if (
      !walkthroughActive ||
      !walkthroughAutoPlay ||
      walkthroughWalking ||
      isAnyModalOpen ||
      !activeRoomId
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      navigateCharacterToWalkthroughStop(walkthroughStepIdx + 1);
    }, 8500);
    return () => window.clearTimeout(timer);
  }, [
    walkthroughActive,
    walkthroughAutoPlay,
    walkthroughWalking,
    walkthroughStepIdx,
    isAnyModalOpen,
    activeRoomId,
  ]);

  useEffect(() => {
    setShowRoomDetailsDrawer(false);
    setShowStudioCustomizer(false);
    setLastTriggeredObjectFeedback(null);
    setBicycleRideActive(false);
    setBicycleRidePaused(false);
    bicycleRideActiveRef.current = false;
    bicycleRidePausedRef.current = false;
    setActiveContextualStation(null);
    setSelectedCinemaVideo(null);
    setRadioIsPlaying(false);
    climbHeightOffsetRef.current = 0;
    clickToMoveTargetRef.current = null;
    walkthroughWaypointsRef.current = [];
    walkthroughLookTargetRef.current = null;
    if (activeRoomId) {
      setShowRoomGuideBubble(true);
      setActiveSpaceId('central_gallery');
      const r = rooms.find((rm) => rm.id === activeRoomId);
      const initPreset = r?.designConfig?.atmospherePreset || 'golden_hour';
      setActiveAtmospherePreset(initPreset);
      const savedStudio = r?.designConfig?.studioCustomization;
      const initialStudio: RoomCustomizationStudioConfig = {
        ...DEFAULT_STUDIO_CONFIG,
        wallColorHex:
          savedStudio?.wallColorHex ||
          r?.designConfig?.wallColorHex ||
          DEFAULT_STUDIO_CONFIG.wallColorHex,
        floorColorHex:
          savedStudio?.floorColorHex ||
          r?.designConfig?.floorTintHex ||
          DEFAULT_STUDIO_CONFIG.floorColorHex,
        floorMaterial:
          savedStudio?.floorMaterial || DEFAULT_STUDIO_CONFIG.floorMaterial,
        lightIntensity:
          savedStudio?.lightIntensity ||
          r?.designConfig?.lightIntensity ||
          DEFAULT_STUDIO_CONFIG.lightIntensity,
        atmospherePreset: initPreset,
        techBuddyVisible: savedStudio?.techBuddyVisible ?? true,
        enabledSpaces:
          savedStudio?.enabledSpaces || DEFAULT_STUDIO_CONFIG.enabledSpaces,
        enabledObjects:
          savedStudio?.enabledObjects || DEFAULT_STUDIO_CONFIG.enabledObjects,
      };
      setStudioHistory([initialStudio]);
      setStudioHistoryIdx(0);
      setTechBuddyVisibleState(initialStudio.techBuddyVisible);
      setTechBuddySpeechText(
        `Welcome to your ${r?.name || 'Memory Room'}! Walk around with WASD, click the floor to move, or start the Guided Walkthrough tour.`,
      );
      if (pendingStartWalkthroughTimerRef.current) {
        window.clearTimeout(pendingStartWalkthroughTimerRef.current);
        pendingStartWalkthroughTimerRef.current = null;
      }
      if (pendingStartWalkthroughRef.current) {
        pendingStartWalkthroughRef.current = false;
        pendingStartWalkthroughTimerRef.current = window.setTimeout(() => {
          pendingStartWalkthroughTimerRef.current = null;
          setWalkthroughActive(true);
          setWalkthroughAutoPlay(true);
          navigateCharacterToWalkthroughStop(0);
        }, 420);
      }
    } else {
      if (pendingStartWalkthroughTimerRef.current) {
        window.clearTimeout(pendingStartWalkthroughTimerRef.current);
        pendingStartWalkthroughTimerRef.current = null;
      }
      setWalkthroughActive(false);
      setWalkthroughAutoPlay(false);
      setWalkthroughWalking(false);
      walkthroughWalkingRef.current = false;
    }
    return () => {
      if (pendingStartWalkthroughTimerRef.current) {
        window.clearTimeout(pendingStartWalkthroughTimerRef.current);
        pendingStartWalkthroughTimerRef.current = null;
      }
    };
  }, [activeRoomId]);

  const handleNavigateToSpace = (spaceId: LivingWorldSpaceId) => {
    setActiveSpaceId(spaceId);
    walkthroughLookTargetRef.current = null;
    walkthroughWaypointsRef.current = [];
    const built = activeExhibitionBuiltRef.current;
    if (!built) return;
    const coords = built.getSpaceDestinationCoords?.(spaceId);
    if (coords) {
      climbHeightOffsetRef.current = coords.y;
      clickToMoveTargetRef.current = { x: coords.x, z: coords.z };
      viewYawRef.current = sanitizeYaw(coords.yaw, viewYawRef.current);
      setTechBuddySpeechText(coords.buddySpeech);
      setShowRoomGuideBubble(true);
    }
    const buddyRes = built.commandTechBuddy?.({
      targetSpace: spaceId,
      pose: 'walking',
    });
    if (buddyRes) {
      setTechBuddyPoseState(buddyRes.pose);
    }
  };

  const handleAtmosphereChange = (presetId: AtmospherePresetId) => {
    setActiveAtmospherePreset(presetId);
    activeExhibitionBuiltRef.current?.setAtmospherePreset?.(presetId);
    if (activeRoomId && onUpdateRoomDesignConfig) {
      onUpdateRoomDesignConfig(activeRoomId, { atmospherePreset: presetId });
    }
  };

  const handleCommandTechBuddy = (options: {
    pose?: TechBuddyPose;
    targetSpace?: LivingWorldSpaceId;
    visible?: boolean;
  }) => {
    const res = activeExhibitionBuiltRef.current?.commandTechBuddy?.(options);
    if (res) {
      setTechBuddyPoseState(res.pose);
      setTechBuddyVisibleState(res.visible);
      setTechBuddySpeechText(res.speech);
      setShowRoomGuideBubble(true);
    }
  };

  const handleTriggerObject3D = (objectId: InteractiveObjectId3D) => {
    if (enterBedroomInteractionRef.current?.(objectId)) {
      return;
    }
    const res =
      activeExhibitionBuiltRef.current?.triggerInteractiveObject?.(objectId);
    if (!res) return;
    if (typeof res.climbTargetY === 'number') {
      climbHeightOffsetRef.current = res.climbTargetY;
      setActiveSpaceId(res.spaceId);
    }
    setTechBuddySpeechText(res.actionMessage);
    setShowRoomGuideBubble(true);
    setLastTriggeredObjectFeedback({
      objectId: res.objectId,
      title: res.title,
      actionMessage: res.actionMessage,
      linkedMemory: res.linkedMemory,
    });
    if (objectId === 'bicycle') {
      openStationExperienceRef.current?.('bicycle');
    } else if (objectId === 'treehouse_ladder') {
      openStationExperienceRef.current?.('treehouse');
    } else if (objectId === 'bedroom_tv') {
      openStationExperienceRef.current?.('cinema');
    } else if (objectId === 'tyre_swing') {
      openStationExperienceRef.current?.('garden');
    }
  };

  const pushStudioConfigChange = (
    patch: Partial<RoomCustomizationStudioConfig>,
  ) => {
    const nextConfig: RoomCustomizationStudioConfig = {
      ...currentStudioConfig,
      ...patch,
    };
    const nextHistory = [
      ...studioHistory.slice(0, studioHistoryIdx + 1),
      nextConfig,
    ];
    setStudioHistory(nextHistory);
    setStudioHistoryIdx(nextHistory.length - 1);
    activeExhibitionBuiltRef.current?.applyStudioCustomization?.(nextConfig);
    if (patch.atmospherePreset) {
      setActiveAtmospherePreset(patch.atmospherePreset);
    }
    if (typeof patch.techBuddyVisible === 'boolean') {
      setTechBuddyVisibleState(patch.techBuddyVisible);
    }
  };

  const handleUndoStudio = () => {
    if (studioHistoryIdx <= 0) return;
    const prevIdx = studioHistoryIdx - 1;
    const cfg = studioHistory[prevIdx];
    setStudioHistoryIdx(prevIdx);
    activeExhibitionBuiltRef.current?.applyStudioCustomization?.(cfg);
    setActiveAtmospherePreset(cfg.atmospherePreset);
    setTechBuddyVisibleState(cfg.techBuddyVisible);
  };

  const handleRedoStudio = () => {
    if (studioHistoryIdx >= studioHistory.length - 1) return;
    const nextIdx = studioHistoryIdx + 1;
    const cfg = studioHistory[nextIdx];
    setStudioHistoryIdx(nextIdx);
    activeExhibitionBuiltRef.current?.applyStudioCustomization?.(cfg);
    setActiveAtmospherePreset(cfg.atmospherePreset);
    setTechBuddyVisibleState(cfg.techBuddyVisible);
  };

  const handleResetStudio = () => {
    pushStudioConfigChange(DEFAULT_STUDIO_CONFIG);
  };

  const handleSaveStudio = () => {
    if (activeRoomId && onUpdateRoomDesignConfig) {
      onUpdateRoomDesignConfig(activeRoomId, {
        wallColorHex: currentStudioConfig.wallColorHex,
        floorTintHex: currentStudioConfig.floorColorHex,
        lightIntensity: currentStudioConfig.lightIntensity,
        atmospherePreset: currentStudioConfig.atmospherePreset,
        studioCustomization: currentStudioConfig,
      });
    }
    setShowStudioCustomizer(false);
    onEmitTip?.(
      `studio-saved-${activeRoomId}`,
      '3D Room Studio Customisation Saved',
      'Your custom materials, lighting, and interactive objects have been saved to this room.',
      'important',
    );
  };

  // Contextual Movement Control Overlay state
  const [activeKeyVisuals, setActiveKeyVisuals] = useState<{
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    interact: boolean;
  }>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    interact: false,
  });
  const [controlsOverlayBright, setControlsOverlayBright] = useState(false);
  const controlsFadeTimeoutRef = useRef<number | null>(null);
  const interactPulseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (controlsFadeTimeoutRef.current) {
        window.clearTimeout(controlsFadeTimeoutRef.current);
        controlsFadeTimeoutRef.current = null;
      }
      if (interactPulseTimerRef.current) {
        window.clearTimeout(interactPulseTimerRef.current);
        interactPulseTimerRef.current = null;
      }
      if (pendingStartWalkthroughTimerRef.current) {
        window.clearTimeout(pendingStartWalkthroughTimerRef.current);
        pendingStartWalkthroughTimerRef.current = null;
      }
    };
  }, []);

  const initialSanitizedChar = useMemo(
    () =>
      sanitizeCharacterPosition({
        position: characterState.position,
        floorNumber: characterState.currentFloorNumber,
        totalFloors: Math.max(1, floors.length),
      }),
    [],
  );

  // Animated Lift State
  const [liftPhase, setLiftPhase] = useState<LiftSequencePhase>('idle');
  const [liftCabinFloorNumber, setLiftCabinFloorNumber] = useState<number>(
    initialSanitizedChar.floorNumber,
  );
  const [liftTargetFloorNumber, setLiftTargetFloorNumber] = useState<number>(
    initialSanitizedChar.floorNumber,
  );
  const [selectedLiftFloorOption, setSelectedLiftFloorOption] = useState<
    number | null
  >(null);
  const [isInsideCabin, setIsInsideCabin] = useState(false);
  const isInsideCabinRef = useRef(false);

  const [proximityTarget, setProximityTarget] =
    useState<ProximityTarget | null>(null);
  const [currentFloorNumberState, setCurrentFloorNumberState] =
    useState<number>(initialSanitizedChar.floorNumber);

  // Deduplication refs so tick() never triggers React re-renders unless discrete UI state actually changes
  const lastEmittedFloorNumRef = useRef<number>(
    initialSanitizedChar.floorNumber,
  );
  const lastEmittedSpaceIdRef = useRef<LivingWorldSpaceId>('central_gallery');
  const lastProximityKeyRef = useRef<string>('none');
  const lastCharStateSigRef = useRef<string>('');
  const lastHoveredSigRef = useRef<string>('none');
  const latchedDoorwayRef = useRef<DoorwayLatchState | null>(null);
  const doorwayEntryContextRef = useRef<{
    roomId: string;
    lateralOffsetX: number;
    relativeYawOffset: number;
    preservedPitch: number;
    preservedSpeed: number;
  } | null>(null);
  const prevActiveRoomIdRef = useRef<string | null>(activeRoomId);
  const hasMountedSceneRef = useRef<boolean>(false);

  // Keyboard & On-Screen Touch Input State
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const touchInputRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  // Primary Mouse-Look Camera Yaw & Pitch (Single Authoritative Source)
  const viewYawRef = useRef<number>(
    sanitizeYaw(characterState.rotationY, Math.PI),
  );
  const viewPitchRef = useRef<number>(sanitizePitch(0.06, 0.06));

  // Refs for latest props inside the WebGL loop
  const floorsRef = useRef(floors);
  floorsRef.current = floors;
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const memoriesRef = useRef(memories);
  memoriesRef.current = memories;
  const activeRoomIdRef = useRef(activeRoomId);
  activeRoomIdRef.current = activeRoomId;
  const hasEnteredRef = useRef(hasEnteredAtrium);
  hasEnteredRef.current = hasEnteredAtrium;
  const museumSettingsRef = useRef(museumSettings);
  museumSettingsRef.current = museumSettings;
  const tutorialActiveRef = useRef(tutorialActive);
  tutorialActiveRef.current = tutorialActive;
  const tutorialTargetRef = useRef(tutorialTargetHighlight);
  tutorialTargetRef.current = tutorialTargetHighlight;
  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  isAnyModalOpenRef.current = isAnyModalOpen;
  const pauseRenderingRef = useRef(pauseRendering);
  pauseRenderingRef.current = pauseRendering;
  const resumeRenderLoopRef = useRef<(() => void) | null>(null);
  const characterWelcomeRef = useRef(characterWelcomeActive);
  characterWelcomeRef.current = characterWelcomeActive;
  const welcomeWaveElapsedRef = useRef<number>(0);
  const isPointerLockedRef = useRef(isPointerLocked);
  isPointerLockedRef.current = isPointerLocked;
  const isMouseCapturedRef = useRef(isMouseCaptured);
  isMouseCapturedRef.current = isMouseCaptured;

  const onSelectRoomRef = useRef(onSelectRoom);
  onSelectRoomRef.current = onSelectRoom;
  const onSelectMemoryRef = useRef(onSelectMemory);
  onSelectMemoryRef.current = onSelectMemory;
  const onOpenCreateRoomInSlotRef = useRef(onOpenCreateRoomInSlot);
  onOpenCreateRoomInSlotRef.current = onOpenCreateRoomInSlot;
  const onUpdateCharacterStateRef = useRef(onUpdateCharacterState);
  onUpdateCharacterStateRef.current = onUpdateCharacterState;
  const onSelectWallFeatureRef = useRef(onSelectWallFeature);
  onSelectWallFeatureRef.current = onSelectWallFeature;
  const onEmitTipRef = useRef(onEmitTip);
  onEmitTipRef.current = onEmitTip;

  const proximityTargetRef = useRef<ProximityTarget | null>(null);
  proximityTargetRef.current = proximityTarget;

  const rebuildSceneRef = useRef<(() => void) | null>(null);
  const triggerInteractAnimationRef = useRef<(() => void) | null>(null);
  const setExplorerRoomEntryRef = useRef<
    ((enteredRoomId: string) => void) | null
  >(null);
  const setExplorerCorridorExitRef = useRef<
    ((exitedRoomId: string) => void) | null
  >(null);
  const openLiftDoorsAndBoardRef = useRef<
    ((autoTargetFloor?: number) => void) | null
  >(null);
  const startLiftTravelToFloorRef = useRef<
    ((targetFloorNum: number) => void) | null
  >(null);
  const exitLiftImmediatelyRef = useRef<(() => void) | null>(null);

  const cachedFloorCollidersRef = useRef<{
    floorNum: number;
    slotKey: string;
    isLiftOpen: boolean;
    doorAmtKey: number;
    roomDoorsKey: string;
    colliders: FloorColliderSet;
  } | null>(null);
  const cachedRoomCollidersRef = useRef<{
    key: string;
    colliders: FloorColliderSet;
  } | null>(null);

  // Synchronize 3D exhibition room entry and corridor exit transitions cleanly without remounting WebGL
  useEffect(() => {
    const prevRoomId = prevActiveRoomIdRef.current;
    prevActiveRoomIdRef.current = activeRoomId;
    if (activeRoomId && activeRoomId !== prevRoomId) {
      setExplorerRoomEntryRef.current?.(activeRoomId);
    } else if (prevRoomId && !activeRoomId) {
      setExplorerCorridorExitRef.current?.(prevRoomId);
    }
  }, [activeRoomId]);

  const syncControlVisualsFromInput = (interactPulse = false) => {
    const keys = pressedKeysRef.current;
    const touch = touchInputRef.current;
    const forward =
      keys.has('w') || keys.has('arrowup') || touch.forward;
    const backward =
      keys.has('s') || keys.has('arrowdown') || touch.backward;
    const left = keys.has('a') || keys.has('arrowleft') || touch.left;
    const right = keys.has('d') || keys.has('arrowright') || touch.right;
    const anyActive = forward || backward || left || right || interactPulse;

    setActiveKeyVisuals({
      forward,
      backward,
      left,
      right,
      interact: interactPulse,
    });

    if (anyActive) {
      setControlsOverlayBright(true);
      if (controlsFadeTimeoutRef.current) {
        window.clearTimeout(controlsFadeTimeoutRef.current);
        controlsFadeTimeoutRef.current = null;
      }
    } else {
      if (controlsFadeTimeoutRef.current) {
        window.clearTimeout(controlsFadeTimeoutRef.current);
      }
      controlsFadeTimeoutRef.current = window.setTimeout(() => {
        setControlsOverlayBright(false);
      }, 1100);
    }
  };

  // Release pointer lock and clear any active movement inputs whenever a UI modal opens
  useEffect(() => {
    if (isAnyModalOpen) {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
      if (
        pressedKeysRef.current.size > 0 ||
        touchInputRef.current.forward ||
        touchInputRef.current.backward ||
        touchInputRef.current.left ||
        touchInputRef.current.right
      ) {
        pressedKeysRef.current.clear();
        touchInputRef.current = {
          forward: false,
          backward: false,
          left: false,
          right: false,
        };
        syncControlVisualsFromInput(false);
      }
    }
  }, [isAnyModalOpen]);

  // Resume 3D animation loop immediately when a blocking full-screen modal closes
  useEffect(() => {
    if (!pauseRendering) {
      resumeRenderLoopRef.current?.();
    }
  }, [pauseRendering]);

  useEffect(() => {
    if (characterWelcomeActive) {
      welcomeWaveElapsedRef.current = 0;
    }
  }, [characterWelcomeActive]);

  useEffect(() => {
    if (hasEnteredAtrium && !isAnyModalOpen && !characterWelcomeActive) {
      isMouseCapturedRef.current = true;
      setIsMouseCaptured(true);
    }
  }, [hasEnteredAtrium, isAnyModalOpen, characterWelcomeActive]);

  // Handle external lift travel requests (e.g., from the Feature Wall Floor Navigation modal)
  useEffect(() => {
    if (!externalLiftRequest) return;
    if (openLiftDoorsAndBoardRef.current) {
      openLiftDoorsAndBoardRef.current(externalLiftRequest.floorNumber);
    }
  }, [externalLiftRequest]);

  const triggerCompassFlourishRef = useRef<(() => void) | null>(null);

  const handleCycleAtriumAtmosphereAndDiscover = () => {
    const order: ('golden_hour' | 'daylight_salon' | 'evening_nocturne')[] = [
      'golden_hour',
      'daylight_salon',
      'evening_nocturne',
    ];
    const nextMood =
      order[(order.indexOf(atriumLightingMoodRef.current) + 1) % order.length];
    atriumLightingMoodRef.current = nextMood;
    setAtriumLightingMood(nextMood);
    triggerCompassFlourishRef.current?.();

    const moodLabel =
      nextMood === 'daylight_salon'
        ? 'Daylight Salon'
        : nextMood === 'evening_nocturne'
          ? 'Evening Nocturne'
          : 'Golden Hour';
    const allMems = memoriesRef.current;
    const featured =
      allMems.length > 0
        ? allMems[Math.floor(Date.now() / 1000) % allMems.length]
        : null;
    onEmitTipRef.current?.(
      `atrium-compass-${nextMood}-${Date.now()}`,
      `Atrium Atmosphere: ${moodLabel}`,
      featured
        ? `Memory Compass Highlight: "${featured.title}" (${featured.date || featured.year || 'Personal Archive'})`
        : 'Sculptural lightwell illumination adjusted across the rotunda.',
      'important',
    );
  };

  const handleTriggerProximityInteraction = () => {
    syncControlVisualsFromInput(true);
    if (interactPulseTimerRef.current) {
      window.clearTimeout(interactPulseTimerRef.current);
    }
    interactPulseTimerRef.current = window.setTimeout(() => {
      interactPulseTimerRef.current = null;
      syncControlVisualsFromInput(false);
    }, 220);

    const target = proximityTargetRef.current;
    if (!target) return;
    if (triggerInteractAnimationRef.current) {
      triggerInteractAnimationRef.current();
    }

    if (target.kind === 'room_memory' && target.memory) {
      onSelectMemoryRef.current(target.memory);
    } else if (target.kind === 'room_exit') {
      onSelectRoomRef.current(null);
    } else if (
      target.kind === 'empty_slot' &&
      target.room &&
      target.slotIndex !== undefined
    ) {
      onOpenCreateRoomInSlotRef.current(
        target.room.floorId,
        target.slotIndex,
        target.room,
      );
    } else if (target.kind === 'lift') {
      openLiftDoorsAndBoardRef.current?.();
    } else if (target.kind === 'feature_wall') {
      onSelectWallFeatureRef.current('museum_settings');
    } else if (target.kind === 'discovery_compass') {
      handleCycleAtriumAtmosphereAndDiscover();
    } else if (target.kind === 'room_interactive_object' && target.objectId) {
      handleTriggerObject3D(target.objectId);
    } else if (target.kind === 'contextual_station' && target.stationId) {
      openStationExperienceRef.current?.(target.stationId);
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let cancelledBeforeInit = false;
    let disposeInitializedScene: (() => void) | undefined;

    const initScene = (): (() => void) | undefined => {
      setWebglError(null);
      setWebglContextLost(false);

      // 1. Hardware Capability Probe & Adaptive 5-Profile Graphics Quality Manager
      let renderer: THREE.WebGLRenderer;
      let isSoftwareGl = false;
    let glRendererStr = '';
    let glVendorStr = '';
    let maxTextureSizeCap = 4096;

    try {
      const probeCanvas = document.createElement('canvas');
      const gl =
        probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) {
        isSoftwareGl = true;
      } else {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        glRendererStr = String(
          gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '',
        );
        glVendorStr = String(
          gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR) || '',
        );
        maxTextureSizeCap = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 4096;
        isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
          glRendererStr,
        );
        // Immediately release temporary probe WebGL context so we never leak a context slot
        try {
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        } catch {
          // Ignore if browser restricts manual context loss
        }
      }
      probeCanvas.width = 0;
      probeCanvas.height = 0;

      const viewportWidth = container.clientWidth || window.innerWidth || 1024;
      const viewportHeight = container.clientHeight || window.innerHeight || 768;
      const isCoarsePointer =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches;
      const hardwareConcurrency =
        typeof navigator !== 'undefined' && navigator.hardwareConcurrency
          ? navigator.hardwareConcurrency
          : 4;
      const deviceMemory =
        typeof navigator !== 'undefined' && 'deviceMemory' in navigator
          ? Number((navigator as { deviceMemory?: number }).deviceMemory)
          : undefined;

      const detectedHardware = detectInitialGraphicsProfile({
        viewportWidth,
        viewportHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        hardwareConcurrency,
        deviceMemory,
        isCoarsePointer,
        glRenderer: glRendererStr,
        glVendor: glVendorStr,
        maxTextureSize: maxTextureSizeCap,
        isSoftwareGl,
      });

      const graphicsMonitorLocal = new AdaptiveGraphicsMonitor(
        detectedHardware.profileId,
        detectedHardware.gpuTier,
        isSoftwareGl,
      );
      let qualityConfig = graphicsMonitorLocal.currentConfig;

      renderer = new THREE.WebGLRenderer({
        antialias: Boolean(qualityConfig.enableAntialias),
        alpha: false,
        powerPreference: 'high-performance',
      });

      // Stash monitor & capability flags cleanly on locals inside useEffect scope via outer bindings below
      (renderer as unknown as { __memoraInit?: unknown }).__memoraInit = {
        graphicsMonitorLocal,
        detectedHardware,
      };
    } catch (initErr) {
      console.error('[AtriumScene3D] Failed to initialize WebGLRenderer:', initErr);
      setWebglError(
        initErr instanceof Error
          ? initErr.message
          : 'WebGL 3D rendering is unavailable in this browser environment.',
      );
      return;
    }

    const initBundle = (
      renderer as unknown as {
        __memoraInit: {
          graphicsMonitorLocal: AdaptiveGraphicsMonitor;
          detectedHardware: ReturnType<typeof detectInitialGraphicsProfile>;
        };
      }
    ).__memoraInit;
    delete (renderer as unknown as { __memoraInit?: unknown }).__memoraInit;

    const graphicsMonitor = initBundle.graphicsMonitorLocal;
    const detectedHardware = initBundle.detectedHardware;
    let qualityConfig = graphicsMonitor.currentConfig;

    let cachedViewportW = Math.max(
      1,
      container.clientWidth || window.innerWidth || 800,
    );
    let cachedViewportH = Math.max(
      1,
      container.clientHeight || window.innerHeight || 600,
    );

    const computeAdaptivePixelRatio = () =>
      computeEffectivePixelRatio({
        viewportWidth: cachedViewportW,
        viewportHeight: cachedViewportH,
        devicePixelRatio: window.devicePixelRatio || 1,
        qualityConfig,
        isMobileDevice: detectedHardware.isMobileDevice,
        isSoftwareGl,
      });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = qualityConfig.enablePostProcessing ? 0.98 : 1.04;
    renderer.setClearColor(0xf6f1e8, 1);
    renderer.setPixelRatio(computeAdaptivePixelRatio());
    const initW = cachedViewportW;
    const initH = cachedViewportH;
    renderer.setSize(initW, initH);
    renderer.shadowMap.enabled = qualityConfig.enableShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = qualityConfig.enableShadows;
    let shadowDirtyFrames = 2;
    let lastShadowPosX = Number.NaN;
    let lastShadowPosY = Number.NaN;
    let lastShadowPosZ = Number.NaN;
    let lastShadowRotY = Number.NaN;
    let lastShadowLiftY = Number.NaN;
    let lastShadowInRoom = false;
    renderer.domElement.style.backgroundColor = '#F6F1E8';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    let cachedCanvasRect = {
      left: 0,
      top: 0,
      width: initW,
      height: initH,
    };
    const syncCanvasRect = () => {
      const r = renderer.domElement.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        cachedCanvasRect = {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        };
      }
    };
    syncCanvasRect();

    const maxAnisotropy = Math.min(
      renderer.capabilities.getMaxAnisotropy(),
      qualityConfig.maxAnisotropy ?? 4,
    );

    const staticDisposableAssets: (
      | THREE.BufferGeometry
      | THREE.Material
      | THREE.Texture
    )[] = [];
    const trackStatic = <
      T extends THREE.BufferGeometry | THREE.Material | THREE.Texture,
    >(
      asset: T,
    ): T => {
      staticDisposableAssets.push(asset);
      return asset;
    };

    const scene = new THREE.Scene();
    const bgHex = 0xf6f1e8;
    scene.background = new THREE.Color(bgHex);
    const sceneFog = new THREE.FogExp2(bgHex, 0.0085);
    scene.fog = sceneFog;

    let envRenderTarget: THREE.WebGLRenderTarget | null = null;
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envRenderTarget.texture;
      roomEnv.dispose?.();
      pmremGenerator.dispose();
    } catch (envErr) {
      console.warn('[AtriumScene3D] Fallback environment lighting:', envErr);
    }

    const initAspect = initW / initH;
    const camera = new THREE.PerspectiveCamera(
      computeResponsiveCameraFov(initAspect, 50),
      initAspect,
      0.15,
      160,
    );
    camera.position.set(0, 4.6, 13.8);

    const cameraLookTarget = new THREE.Vector3(0, 2.1, -1.5);

    // 2. Balanced Studio Golden-Hour Lighting Rig (Hemisphere + Primary Key + Rim/Fill + Warm Travertine Bounce)
    const hemiLight = new THREE.HemisphereLight(0xfff8eb, 0xc8b294, 0.82);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunKeyLight = new THREE.DirectionalLight(0xffe0b2, 1.46);
    sunKeyLight.position.set(14, 34, 18);
    sunKeyLight.castShadow = qualityConfig.enableShadows;
    sunKeyLight.shadow.mapSize.width = qualityConfig.shadowMapSize;
    sunKeyLight.shadow.mapSize.height = qualityConfig.shadowMapSize;
    const d = 19;
    sunKeyLight.shadow.camera.left = -d;
    sunKeyLight.shadow.camera.right = d;
    sunKeyLight.shadow.camera.top = d;
    sunKeyLight.shadow.camera.bottom = -d;
    sunKeyLight.shadow.camera.near = 1;
    sunKeyLight.shadow.camera.far = 85;
    sunKeyLight.shadow.bias = -0.00035;
    sunKeyLight.shadow.normalBias = 0.018;
    sunKeyLight.shadow.radius = qualityConfig.shadowRadius;
    scene.add(sunKeyLight);

    // Secondary soft architectural fill & rim light (non-shadow-casting for zero extra GPU pass)
    const rimFillLight = new THREE.DirectionalLight(0xf3e5d0, 0.44);
    rimFillLight.position.set(-16, 22, -14);
    rimFillLight.castShadow = false;
    scene.add(rimFillLight);

    // Subtle warm travertine floor-bounce fill inside the central Atrium rotunda
    const atriumBounceLight = new THREE.PointLight(0xffe7c2, 0.48, 22, 1.45);
    atriumBounceLight.position.set(0, 1.35, 1.8);
    atriumBounceLight.castShadow = false;
    scene.add(atriumBounceLight);

    // Quality-gated Post-Processing (disabled by default across balanced & mobile profiles for single-pass crisp rendering)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (qualityConfig.enablePostProcessing) {
      try {
        composer = new EffectComposer(renderer);
        composer.setPixelRatio(computeAdaptivePixelRatio());
        composer.setSize(initW, initH);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(initW, initH),
          qualityConfig.bloomStrength,
          qualityConfig.bloomRadius,
          qualityConfig.bloomThreshold,
        );
        composer.addPass(bloomPass);
        const outputPass = new OutputPass();
        composer.addPass(outputPass);
      } catch (postErr) {
        console.warn('[AtriumScene3D] Falling back to direct WebGL render:', postErr);
        composer?.dispose();
        bloomPass?.dispose();
        composer = null;
        bloomPass = null;
      }
    }

    // 3. Shared Luxury Architectural Materials with UV-Synchronized Procedural PBR Normal, Roughness & AO Maps
    const floorPBR = createSyncedTravertineFloorPBRSet(
      maxAnisotropy,
      qualityConfig.textureRes,
      qualityConfig.pbrMapRes,
    );
    const floorTex = trackStatic(floorPBR.map);
    const marbleNormalMap = trackStatic(floorPBR.normalMap);
    const marbleRoughnessMap = trackStatic(floorPBR.roughnessMap);
    const marbleAOMap = floorPBR.aoMap ? trackStatic(floorPBR.aoMap) : null;

    const parquetPBR = createWarmParquetFloorPBRSet(
      maxAnisotropy,
      qualityConfig.textureRes,
      qualityConfig.pbrMapRes,
    );
    const parquetTex = trackStatic(parquetPBR.map);
    const parquetNormalMap = trackStatic(parquetPBR.normalMap);
    const parquetRoughnessMap = trackStatic(parquetPBR.roughnessMap);
    const parquetAOMap = parquetPBR.aoMap ? trackStatic(parquetPBR.aoMap) : undefined;

    const parterrePBR = createParterreMedallionMaps(
      maxAnisotropy,
      qualityConfig.pbrMapRes,
    );
    const parterreTex = trackStatic(parterrePBR.map);
    const parterreNormalMap = trackStatic(parterrePBR.normalMap);
    const parterreRoughnessMap = trackStatic(parterrePBR.roughnessMap);

    const limestoneTex = trackStatic(
      createChampagneLimestoneTexture(maxAnisotropy),
    );
    const limestonePBR = createLimestonePBRMaps(
      maxAnisotropy,
      Math.min(512, qualityConfig.pbrMapRes),
    );
    const limestoneNormalMap = trackStatic(limestonePBR.normalMap);
    const limestoneRoughnessMap = trackStatic(limestonePBR.roughnessMap);

    const walnutTex = trackStatic(createRichWalnutWoodTexture(maxAnisotropy));
    const woodPBR = createWoodPBRMaps(
      maxAnisotropy,
      Math.min(512, qualityConfig.pbrMapRes),
    );
    const woodNormalMap = trackStatic(woodPBR.normalMap);
    const woodRoughnessMap = trackStatic(woodPBR.roughnessMap);

    const metalPBR = createBrushedMetalPBRMaps(
      maxAnisotropy,
      Math.min(512, qualityConfig.pbrMapRes),
    );
    const brushedMetalNormalMap = trackStatic(metalPBR.normalMap);
    const brushedMetalRoughnessMap = trackStatic(metalPBR.roughnessMap);

    const barkPBR = createOrganicTreeBarkPBRSet(
      maxAnisotropy,
      Math.min(512, qualityConfig.pbrMapRes),
    );
    const barkTex = trackStatic(barkPBR.map);
    const barkNormalMap = trackStatic(barkPBR.normalMap);
    const barkRoughnessMap = trackStatic(barkPBR.roughnessMap);

    const canopyPBR = createBotanicalCanopyPBRSet(
      maxAnisotropy,
      Math.min(512, qualityConfig.pbrMapRes),
    );
    const canopyTex = trackStatic(canopyPBR.map);
    const canopyNormalMap = trackStatic(canopyPBR.normalMap);
    const canopyRoughnessMap = trackStatic(canopyPBR.roughnessMap);

    const fabricPBR = createTailoredFabricPBRMaps(maxAnisotropy, 256);
    const fabricNormalMap = trackStatic(fabricPBR.normalMap);
    const fabricRoughnessMap = trackStatic(fabricPBR.roughnessMap);

    const mossBedTex = trackStatic(createMossAndPebbleBedTexture(maxAnisotropy));
    const boucleTex = trackStatic(createNaturalBoucleTexture(maxAnisotropy));
    const contactShadowTex = trackStatic(createContactShadowTexture());

    const sharedMaterialMaps: SharedMuseumMaterialMaps = {
      travertineFloor: {
        map: floorTex,
        normalMap: marbleNormalMap,
        roughnessMap: marbleRoughnessMap,
        aoMap: marbleAOMap || undefined,
      },
      parquetFloor: {
        map: parquetTex,
        normalMap: parquetNormalMap,
        roughnessMap: parquetRoughnessMap,
        aoMap: parquetAOMap,
      },
      limestoneTex,
      limestoneNormalMap,
      limestoneRoughnessMap,
      walnutTex,
      woodNormalMap,
      woodRoughnessMap,
      brushedMetalNormalMap,
      brushedMetalRoughnessMap,
      barkPBR: {
        map: barkTex,
        normalMap: barkNormalMap,
        roughnessMap: barkRoughnessMap,
      },
      canopyPBR: {
        map: canopyTex,
        normalMap: canopyNormalMap,
        roughnessMap: canopyRoughnessMap,
      },
      fabricNormalMap,
      fabricRoughnessMap,
      mossBedTex,
      boucleTex,
    };

    const useFullPhysical =
      qualityConfig.usePhysicalMaterials !== false &&
      !qualityConfig.usePhysicalHeroAccentsOnly;
    const useHeroPhysical = qualityConfig.usePhysicalMaterials !== false;

    const matTravertineFloor: THREE.MeshStandardMaterial = trackStatic(
      useFullPhysical
        ? new THREE.MeshPhysicalMaterial({
            map: floorTex,
            normalMap: marbleNormalMap,
            normalScale: new THREE.Vector2(0.18, 0.18),
            roughnessMap: marbleRoughnessMap,
            aoMap: marbleAOMap,
            aoMapIntensity: 0.42,
            color: 0xffffff,
            roughness: 0.31,
            metalness: 0.03,
            clearcoat: 0.18,
            clearcoatRoughness: 0.24,
            envMapIntensity: 0.56,
          })
        : new THREE.MeshStandardMaterial({
            map: floorTex,
            normalMap: marbleNormalMap,
            normalScale: new THREE.Vector2(0.18, 0.18),
            roughnessMap: marbleRoughnessMap,
            aoMap: marbleAOMap,
            aoMapIntensity: 0.42,
            color: 0xffffff,
            roughness: 0.29,
            metalness: 0.04,
            envMapIntensity: 0.58,
          }),
    );
    const matHonedTravertineParterre = trackStatic(
      new THREE.MeshStandardMaterial({
        map: parterreTex,
        normalMap: parterreNormalMap,
        normalScale: new THREE.Vector2(0.18, 0.18),
        roughnessMap: parterreRoughnessMap,
        color: new THREE.Color('#EFE4D2'),
        roughness: 0.38,
        metalness: 0.02,
        envMapIntensity: 0.52,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    const matWarmLimestone = trackStatic(
      new THREE.MeshStandardMaterial({
        map: limestoneTex,
        normalMap: limestoneNormalMap,
        normalScale: new THREE.Vector2(0.22, 0.22),
        roughnessMap: limestoneRoughnessMap,
        color: new THREE.Color(MUSEUM_LUXURY_PALETTE.champagneBeige),
        roughness: 0.58,
        metalness: 0.02,
        envMapIntensity: 0.38,
      }),
    );
    const matIvoryPlaster = trackStatic(
      new THREE.MeshStandardMaterial({
        map: limestoneTex,
        normalMap: limestoneNormalMap,
        normalScale: new THREE.Vector2(0.08, 0.08),
        roughnessMap: limestoneRoughnessMap,
        color: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmIvory),
        roughness: 0.72,
        metalness: 0.01,
        envMapIntensity: 0.22,
      }),
    );
    const matWalnut: THREE.MeshStandardMaterial = trackStatic(
      useFullPhysical
        ? new THREE.MeshPhysicalMaterial({
            map: walnutTex,
            normalMap: woodNormalMap,
            normalScale: new THREE.Vector2(0.24, 0.24),
            roughnessMap: woodRoughnessMap,
            color: 0xffffff,
            roughness: 0.36,
            metalness: 0.04,
            clearcoat: 0.16,
            clearcoatRoughness: 0.28,
            envMapIntensity: 0.55,
          })
        : new THREE.MeshStandardMaterial({
            map: walnutTex,
            normalMap: woodNormalMap,
            normalScale: new THREE.Vector2(0.24, 0.24),
            roughnessMap: woodRoughnessMap,
            color: 0xffffff,
            roughness: 0.35,
            metalness: 0.04,
            envMapIntensity: 0.56,
          }),
    );
    const matTreeBark = trackStatic(
      new THREE.MeshStandardMaterial({
        map: barkTex,
        normalMap: barkNormalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughnessMap: barkRoughnessMap,
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0.02,
        envMapIntensity: 0.28,
      }),
    );
    const matMossBed = trackStatic(
      new THREE.MeshStandardMaterial({
        map: mossBedTex,
        normalMap: canopyNormalMap,
        normalScale: new THREE.Vector2(0.22, 0.22),
        roughness: 0.84,
        metalness: 0.02,
        envMapIntensity: 0.25,
      }),
    );
    const matBrushedGold: THREE.MeshStandardMaterial = trackStatic(
      useHeroPhysical
        ? new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#D3AD6E'),
            normalMap: brushedMetalNormalMap,
            normalScale: new THREE.Vector2(0.14, 0.14),
            roughnessMap: brushedMetalRoughnessMap,
            roughness: 0.28,
            metalness: 0.84,
            anisotropy: 0.45,
            clearcoat: 0.22,
            clearcoatRoughness: 0.2,
            envMapIntensity: 1.08,
          })
        : new THREE.MeshStandardMaterial({
            color: new THREE.Color('#D3AD6E'),
            normalMap: brushedMetalNormalMap,
            normalScale: new THREE.Vector2(0.14, 0.14),
            roughnessMap: brushedMetalRoughnessMap,
            roughness: 0.26,
            metalness: 0.84,
            envMapIntensity: 1.04,
          }),
    );
    const matBronzeDoor: THREE.MeshStandardMaterial = trackStatic(
      useHeroPhysical
        ? new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(MUSEUM_LUXURY_PALETTE.bronze),
            normalMap: brushedMetalNormalMap,
            normalScale: new THREE.Vector2(0.16, 0.16),
            roughnessMap: brushedMetalRoughnessMap,
            roughness: 0.32,
            metalness: 0.8,
            anisotropy: 0.4,
            clearcoat: 0.2,
            clearcoatRoughness: 0.24,
            envMapIntensity: 0.96,
          })
        : new THREE.MeshStandardMaterial({
            color: new THREE.Color(MUSEUM_LUXURY_PALETTE.bronze),
            normalMap: brushedMetalNormalMap,
            normalScale: new THREE.Vector2(0.16, 0.16),
            roughnessMap: brushedMetalRoughnessMap,
            roughness: 0.3,
            metalness: 0.8,
            envMapIntensity: 0.92,
          }),
    );
    const matCanopyInstanced = trackStatic(
      new THREE.MeshStandardMaterial({
        map: canopyTex,
        normalMap: canopyNormalMap,
        normalScale: new THREE.Vector2(0.28, 0.28),
        roughnessMap: canopyRoughnessMap,
        color: 0xffffff,
        roughness: 0.64,
        metalness: 0.02,
        envMapIntensity: 0.34,
      }),
    );
    const matSageFoliage = trackStatic(
      new THREE.MeshStandardMaterial({
        map: canopyTex,
        normalMap: canopyNormalMap,
        normalScale: new THREE.Vector2(0.24, 0.24),
        roughnessMap: canopyRoughnessMap,
        color: new THREE.Color(MUSEUM_LUXURY_PALETTE.mutedSage),
        roughness: 0.64,
        metalness: 0.02,
        envMapIntensity: 0.32,
      }),
    );
    const matDeepOliveFoliage = trackStatic(
      new THREE.MeshStandardMaterial({
        map: canopyTex,
        normalMap: canopyNormalMap,
        normalScale: new THREE.Vector2(0.24, 0.24),
        roughnessMap: canopyRoughnessMap,
        color: new THREE.Color(MUSEUM_LUXURY_PALETTE.deepOliveGreen),
        roughness: 0.62,
        metalness: 0.02,
        envMapIntensity: 0.3,
      }),
    );
    const matAlabaster: THREE.MeshStandardMaterial = trackStatic(
      useFullPhysical
        ? new THREE.MeshPhysicalMaterial({
            color: 0xfffcf6,
            emissive: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
            emissiveIntensity: 0.42,
            roughness: 0.16,
            metalness: 0.04,
            clearcoat: 0.42,
            envMapIntensity: 0.6,
          })
        : new THREE.MeshStandardMaterial({
            color: 0xfffcf6,
            emissive: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
            emissiveIntensity: 0.44,
            roughness: 0.18,
            metalness: 0.04,
            envMapIntensity: 0.58,
          }),
    );
    const matCabinAlabaster: THREE.MeshStandardMaterial = trackStatic(
      useFullPhysical
        ? new THREE.MeshPhysicalMaterial({
            color: 0xfbf4e7,
            emissive: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
            emissiveIntensity: 0.18,
            roughness: 0.24,
            metalness: 0.03,
            clearcoat: 0.28,
            envMapIntensity: 0.45,
          })
        : new THREE.MeshStandardMaterial({
            color: 0xfbf4e7,
            emissive: new THREE.Color(MUSEUM_LUXURY_PALETTE.warmAmberLight),
            emissiveIntensity: 0.2,
            roughness: 0.24,
            metalness: 0.03,
            envMapIntensity: 0.44,
          }),
    );
    const matElevatorGlass: THREE.MeshStandardMaterial = trackStatic(
      useHeroPhysical
        ? new THREE.MeshPhysicalMaterial({
            color: 0xfefaf2,
            transparent: true,
            opacity: 0.3,
            roughness: 0.08,
            metalness: 0.08,
            clearcoat: 0.55,
            envMapIntensity: 1.05,
            depthWrite: false,
          })
        : new THREE.MeshStandardMaterial({
            color: 0xfefaf2,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.1,
            envMapIntensity: 0.95,
            depthWrite: false,
          }),
    );

    // 4. Upgraded Composite 3D Explorer Character Mesh Group (sanitized spawn position)
    const startCharState = sanitizeCharacterPosition({
      position: characterState.position,
      floorNumber: characterState.currentFloorNumber,
      totalFloors: Math.max(1, floorsRef.current.length),
    });

    const explorerGroup = new THREE.Group();
    explorerGroup.position.set(
      startCharState.x,
      startCharState.y,
      startCharState.z,
    );
    explorerGroup.rotation.y = sanitizeYaw(characterState.rotationY, Math.PI);
    scene.add(explorerGroup);

    // Dual-layer grounded contact shadow wrapped in a single group so camera visibility toggles both layers cleanly
    const charShadow = new THREE.Group();
    explorerGroup.add(charShadow);

    const charShadowMat = trackStatic(
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    const charOuterShadow = new THREE.Mesh(
      trackStatic(new THREE.PlaneGeometry(1.42, 1.42)),
      charShadowMat,
    );
    charOuterShadow.rotation.x = -Math.PI / 2;
    charOuterShadow.position.y = 0.018;
    charShadow.add(charOuterShadow);

    const charCoreShadow = new THREE.Mesh(
      trackStatic(new THREE.PlaneGeometry(0.62, 0.54)),
      trackStatic(
        new THREE.MeshBasicMaterial({
          map: contactShadowTex,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        }),
      ),
    );
    charCoreShadow.rotation.x = -Math.PI / 2;
    charCoreShadow.position.y = 0.022;
    charShadow.add(charCoreShadow);

    const charBodyGroup = new THREE.Group();
    explorerGroup.add(charBodyGroup);

    const matCuratorCoat: THREE.MeshStandardMaterial = trackStatic(
      useFullPhysical
        ? new THREE.MeshPhysicalMaterial({
            color: 0xf3eadc,
            normalMap: fabricNormalMap,
            normalScale: new THREE.Vector2(0.14, 0.14),
            roughnessMap: fabricRoughnessMap,
            roughness: 0.72,
            metalness: 0.02,
            sheen: 0.45,
            sheenColor: new THREE.Color('#FFFCF6'),
            sheenRoughness: 0.75,
            envMapIntensity: 0.42,
          })
        : new THREE.MeshStandardMaterial({
            color: 0xf3eadc,
            normalMap: fabricNormalMap,
            normalScale: new THREE.Vector2(0.14, 0.14),
            roughnessMap: fabricRoughnessMap,
            roughness: 0.72,
            metalness: 0.02,
            envMapIntensity: 0.4,
          }),
    );
    const matSkinTone = trackStatic(
      new THREE.MeshStandardMaterial({
        color: 0xf0cfb1,
        roughness: 0.44,
        metalness: 0.02,
        envMapIntensity: 0.35,
      }),
    );
    const matLeatherSatchel: THREE.MeshStandardMaterial = trackStatic(
      useFullPhysical
        ? new THREE.MeshPhysicalMaterial({
            color: 0x674128,
            roughness: 0.38,
            metalness: 0.06,
            clearcoat: 0.2,
            envMapIntensity: 0.55,
          })
        : new THREE.MeshStandardMaterial({
            color: 0x674128,
            roughness: 0.38,
            metalness: 0.06,
            envMapIntensity: 0.52,
          }),
    );

    const torsoMesh = new THREE.Mesh(
      trackStatic(new THREE.CylinderGeometry(0.235, 0.275, 0.72, 20)),
      matCuratorCoat,
    );
    torsoMesh.position.y = 0.88;
    torsoMesh.castShadow = qualityConfig.enableShadows;
    charBodyGroup.add(torsoMesh);

    // Tailored coat hem skirt & structured lapel collar for richer 3D silhouette
    const coatSkirtMesh = new THREE.Mesh(
      trackStatic(new THREE.CylinderGeometry(0.27, 0.295, 0.18, 20)),
      matCuratorCoat,
    );
    coatSkirtMesh.position.y = 0.56;
    coatSkirtMesh.castShadow = qualityConfig.enableShadows;
    charBodyGroup.add(coatSkirtMesh);

    const lapelTrimMesh = new THREE.Mesh(
      trackStatic(new THREE.TorusGeometry(0.215, 0.026, 8, 20, Math.PI * 1.15)),
      matWalnut,
    );
    lapelTrimMesh.rotation.x = Math.PI / 2 + 0.15;
    lapelTrimMesh.rotation.z = -Math.PI * 0.075;
    lapelTrimMesh.position.set(0, 1.18, 0.03);
    charBodyGroup.add(lapelTrimMesh);

    // Cross-body curator leather satchel strap & side bag
    const satchelStrap = new THREE.Mesh(
      trackStatic(new THREE.TorusGeometry(0.265, 0.022, 10, 28)),
      matLeatherSatchel,
    );
    satchelStrap.rotation.set(0.42, 0, 0.58);
    satchelStrap.position.set(0, 0.9, 0);
    charBodyGroup.add(satchelStrap);

    const satchelBag = new THREE.Mesh(
      trackStatic(new THREE.BoxGeometry(0.11, 0.22, 0.24)),
      matLeatherSatchel,
    );
    satchelBag.position.set(-0.27, 0.64, -0.02);
    satchelBag.castShadow = qualityConfig.enableShadows;
    charBodyGroup.add(satchelBag);

    // Brushed-gold museum curator lapel pin
    const curatorBadge = new THREE.Mesh(
      trackStatic(new THREE.CylinderGeometry(0.032, 0.032, 0.016, 14)),
      matBrushedGold,
    );
    curatorBadge.rotation.x = Math.PI / 2;
    curatorBadge.position.set(0.11, 1.06, 0.24);
    charBodyGroup.add(curatorBadge);

    const scarfMesh = new THREE.Mesh(
      trackStatic(new THREE.TorusGeometry(0.23, 0.062, 12, 24)),
      matSageFoliage,
    );
    scarfMesh.rotation.x = Math.PI / 2;
    scarfMesh.position.y = 1.22;
    charBodyGroup.add(scarfMesh);

    const beltMesh = new THREE.Mesh(
      trackStatic(new THREE.CylinderGeometry(0.268, 0.268, 0.065, 20)),
      matBrushedGold,
    );
    beltMesh.position.y = 0.68;
    charBodyGroup.add(beltMesh);

    const headMesh = new THREE.Mesh(
      trackStatic(new THREE.SphereGeometry(0.22, 22, 22)),
      matSkinTone,
    );
    headMesh.position.y = 1.48;
    headMesh.castShadow = qualityConfig.enableShadows;
    charBodyGroup.add(headMesh);
    explorerHeadRigRef.current = headMesh;

    const hairBackMesh = new THREE.Mesh(
      trackStatic(
        new THREE.SphereGeometry(0.228, 16, 12, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.32),
      ),
      matWalnut,
    );
    hairBackMesh.position.set(0, 1.47, -0.02);
    charBodyGroup.add(hairBackMesh);

    const capMesh = new THREE.Mesh(
      trackStatic(
        new THREE.SphereGeometry(
          0.232,
          18,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.55,
        ),
      ),
      matWalnut,
    );
    capMesh.position.y = 1.52;
    capMesh.rotation.x = -0.15;
    charBodyGroup.add(capMesh);

    const legGeo = trackStatic(
      new THREE.CylinderGeometry(0.085, 0.072, 0.48, 14),
    );
    const shoeGeo = trackStatic(new THREE.BoxGeometry(0.13, 0.09, 0.24));
    const shoeSoleGeo = trackStatic(new THREE.BoxGeometry(0.136, 0.024, 0.25));

    const leftLeg = new THREE.Mesh(legGeo, matWalnut);
    leftLeg.position.set(-0.11, 0.27, 0);
    const leftShoe = new THREE.Mesh(shoeGeo, matLeatherSatchel);
    leftShoe.position.set(0, -0.22, 0.035);
    const leftSole = new THREE.Mesh(shoeSoleGeo, matBrushedGold);
    leftSole.position.set(0, -0.258, 0.035);
    leftLeg.add(leftShoe);
    leftLeg.add(leftSole);
    charBodyGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, matWalnut);
    rightLeg.position.set(0.11, 0.27, 0);
    const rightShoe = new THREE.Mesh(shoeGeo, matLeatherSatchel);
    rightShoe.position.set(0, -0.22, 0.035);
    const rightSole = new THREE.Mesh(shoeSoleGeo, matBrushedGold);
    rightSole.position.set(0, -0.258, 0.035);
    rightLeg.add(rightShoe);
    rightLeg.add(rightSole);
    charBodyGroup.add(rightLeg);

    const armGeo = trackStatic(
      new THREE.CylinderGeometry(0.065, 0.055, 0.46, 14),
    );
    const handGeo = trackStatic(new THREE.SphereGeometry(0.056, 12, 12));

    const leftArm = new THREE.Mesh(armGeo, matWarmLimestone);
    leftArm.position.set(-0.32, 0.92, 0);
    const leftHand = new THREE.Mesh(handGeo, matSkinTone);
    leftHand.position.set(0, -0.24, 0);
    leftArm.add(leftHand);
    charBodyGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, matWarmLimestone);
    rightArm.position.set(0.32, 0.92, 0);
    const rightHand = new THREE.Mesh(handGeo, matSkinTone);
    rightHand.position.set(0, -0.24, 0);
    rightArm.add(rightHand);
    charBodyGroup.add(rightArm);

    const explorerLight = new THREE.PointLight(0xffd699, 0.95, 5.8, 1.5);
    explorerLight.position.set(0, 1.85, 0.45);
    explorerGroup.add(explorerLight);

    let interactAnimTimer = 0;
    triggerInteractAnimationRef.current = () => {
      interactAnimTimer = 0.6;
    };

    const staticSolidMeshes: THREE.Object3D[] = [];
    const staticCameraObstacles: THREE.Object3D[] = [];

    // 5. Signature Central Tree & Interactive Atmosphere Compass (at x=0, y=0, z=1.8)
    // Stage 01 Sculpted Organic Centerpiece: fluted limestone-and-walnut plinth (r <= 1.16m inside 1.26m collider),
    // continuous fluted lathe trunk & curved root buttresses, helical brushed-gold memory ribbon,
    // CatmullRomCurve3 arching limbs (starting y >= 3.04m so eye-level sightlines remain 100% open),
    // instanced multi-tone botanical leaf canopy, and suspended alabaster memory lanterns.
    const centerpieceGroup = new THREE.Group();
    centerpieceGroup.position.set(0, 0, 1.8);
    scene.add(centerpieceGroup);

    const builtTree = populateRefinedAtriumTree({
      centerpieceGroup,
      quality: qualityConfig,
      matWarmLimestone,
      matWalnut,
      matBrushedGold,
      matAlabaster,
      matBark: matTreeBark,
      matMossBed,
      matCanopy: matCanopyInstanced,
      trackStatic,
    });
    staticCameraObstacles.push(...builtTree.staticCameraObstacles);
    const {
      centerpieceHitbox,
      centerpieceUplight,
      kineticSculpture,
      ringOuter,
      ringMiddle,
      innerCore,
    } = builtTree;

    // GSAP coordinated flourish when the user activates the Central Memory & Atmosphere Compass
    triggerCompassFlourishRef.current = () => {
      if (museumSettingsRef.current.reducedMotion) return;
      gsap.killTweensOf(kineticSculpture.rotation);
      gsap.killTweensOf(innerCore.scale);
      gsap.killTweensOf(centerpieceUplight);

      gsap.to(kineticSculpture.rotation, {
        y: kineticSculpture.rotation.y + Math.PI * 1.25,
        duration: 1.35,
        ease: 'power3.out',
      });
      gsap.fromTo(
        innerCore.scale,
        { x: 1, y: 1, z: 1 },
        {
          x: 1.38,
          y: 1.38,
          z: 1.38,
          duration: 0.42,
          yoyo: true,
          repeat: 1,
          ease: 'sine.inOut',
        },
      );
      gsap.fromTo(
        centerpieceUplight,
        { intensity: 2.35 },
        {
          intensity: 1.22,
          duration: 1.25,
          ease: 'power2.out',
        },
      );
    };

    // Sparse, slow-moving atmospheric lightwell motes suspended in the central atrium sunbeam shaft
    const MOTE_COUNT = 42;
    const motePositions = new Float32Array(MOTE_COUNT * 3);
    const moteBaseCoords: {
      x: number;
      y: number;
      z: number;
      phase: number;
      speed: number;
    }[] = [];
    const maxShaftHeight = Math.max(3, floorsRef.current.length) * FLOOR_HEIGHT;
    for (let i = 0; i < MOTE_COUNT; i++) {
      // Deterministic golden-ratio spiral distribution inside the central lightwell (x=0, z=1.8, radius <= 2.15m)
      const angle = i * 2.3999632;
      const radius = 0.25 + ((i * 7) % 19) * 0.1;
      const bx = Math.cos(angle) * radius;
      const bz = 1.8 + Math.sin(angle) * radius;
      const by = 0.8 + ((i / MOTE_COUNT) * (maxShaftHeight - 1.4));
      motePositions[i * 3] = bx;
      motePositions[i * 3 + 1] = by;
      motePositions[i * 3 + 2] = bz;
      moteBaseCoords.push({
        x: bx,
        y: by,
        z: bz,
        phase: i * 0.77,
        speed: 0.12 + (i % 5) * 0.03,
      });
    }
    const moteGeo = trackStatic(new THREE.BufferGeometry());
    moteGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(motePositions, 3),
    );
    const moteTex = trackStatic(createWarmMoteTexture());
    const moteMat = trackStatic(
      new THREE.PointsMaterial({
        map: moteTex,
        color: 0xfde68a,
        size: 0.22,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const atriumMotesPoints = new THREE.Points(moteGeo, moteMat);
    atriumMotesPoints.frustumCulled = false;
    scene.add(atriumMotesPoints);

    // 6. Moving 3D Architectural Lift Cabin Group (Physically travels between floors!)
    //    Positioned at x = 0, z = -9.95 (front door plane at z = -8.65, back wall at z = -11.25)
    const liftCabinGroup = new THREE.Group();
    const initialFloorY = startCharState.floorNumber * FLOOR_HEIGHT;
    liftCabinGroup.position.set(0, initialFloorY, -9.95);
    scene.add(liftCabinGroup);

    // Cabin Floor
    const cabinSlabGeo = trackStatic(new THREE.BoxGeometry(3.36, 0.16, 2.7));
    const cabinFloorMesh = new THREE.Mesh(cabinSlabGeo, matTravertineFloor);
    cabinFloorMesh.position.set(0, 0.02, 0);
    cabinFloorMesh.receiveShadow = true;
    liftCabinGroup.add(cabinFloorMesh);
    staticSolidMeshes.push(cabinFloorMesh);

    // Cabin Ceiling
    const cabinCeilingMesh = new THREE.Mesh(cabinSlabGeo, matWalnut);
    cabinCeilingMesh.position.set(0, 4.32, 0);
    liftCabinGroup.add(cabinCeilingMesh);
    staticSolidMeshes.push(cabinCeilingMesh);
    staticCameraObstacles.push(cabinCeilingMesh);

    // Cabin Back Wall & Side Walls
    const cabinBackWall = new THREE.Mesh(
      trackStatic(new THREE.BoxGeometry(3.36, 4.35, 0.14)),
      matWalnut,
    );
    cabinBackWall.position.set(0, 2.16, -1.3);
    liftCabinGroup.add(cabinBackWall);
    staticSolidMeshes.push(cabinBackWall);
    staticCameraObstacles.push(cabinBackWall);

    const cabinBackInlay = new THREE.Mesh(
      trackStatic(new THREE.PlaneGeometry(2.75, 3.35)),
      matCabinAlabaster,
    );
    cabinBackInlay.position.set(0, 2.16, -1.21);
    liftCabinGroup.add(cabinBackInlay);

    const cabinInlayBrassFrame = new THREE.Mesh(
      trackStatic(new THREE.BoxGeometry(2.84, 3.44, 0.025)),
      matBrushedGold,
    );
    cabinInlayBrassFrame.position.set(0, 2.16, -1.225);
    liftCabinGroup.add(cabinInlayBrassFrame);

    const cabinHandrail = new THREE.Mesh(
      trackStatic(new THREE.CylinderGeometry(0.035, 0.035, 2.9, 12)),
      matBrushedGold,
    );
    cabinHandrail.rotation.z = Math.PI / 2;
    cabinHandrail.position.set(0, 1.05, -1.16);
    liftCabinGroup.add(cabinHandrail);

    const cabinStripMat = trackStatic(
      new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        emissive: 0xd6a15d,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      }),
    );

    const cabinSideWallGeo = trackStatic(new THREE.BoxGeometry(0.12, 4.35, 2.7));
    const cabinLightStripGeo = trackStatic(
      new THREE.BoxGeometry(0.04, 3.6, 0.08),
    );
    [-1.62, 1.62].forEach((sideX) => {
      const sideWall = new THREE.Mesh(cabinSideWallGeo, matWalnut);
      sideWall.position.set(sideX, 2.16, 0);
      liftCabinGroup.add(sideWall);
      staticSolidMeshes.push(sideWall);
      staticCameraObstacles.push(sideWall);

      // Warm vertical architectural light strip on inside of cabin side walls
      const lightStrip = new THREE.Mesh(cabinLightStripGeo, cabinStripMat);
      lightStrip.position.set(
        sideX > 0 ? sideX - 0.07 : sideX + 0.07,
        2.16,
        0.25,
      );
      liftCabinGroup.add(lightStrip);
    });

    // Cabin Front Interior Header & Synchronized Interior Cabin Doors (at local z = +1.28 -> world z = -8.67)
    const cabinFrontHeader = new THREE.Mesh(
      trackStatic(new THREE.BoxGeometry(3.36, 0.55, 0.14)),
      matWalnut,
    );
    cabinFrontHeader.position.set(0, 4.05, 1.28);
    liftCabinGroup.add(cabinFrontHeader);
    staticSolidMeshes.push(cabinFrontHeader);
    staticCameraObstacles.push(cabinFrontHeader);

    // Interior Digital Floor Indicator mounted above the cabin doors (facing -Z toward passenger inside cabin)
    const cabinInteriorIndCanvas = document.createElement('canvas');
    cabinInteriorIndCanvas.width = 512;
    cabinInteriorIndCanvas.height = 170;
    drawLiftIndicatorCanvas(
      cabinInteriorIndCanvas,
      startCharState.floorNumber,
      floorsRef.current.length,
      false,
      1,
    );
    const cabinInteriorIndTex = trackStatic(
      new THREE.CanvasTexture(cabinInteriorIndCanvas),
    );
    cabinInteriorIndTex.colorSpace = THREE.SRGBColorSpace;
    cabinInteriorIndTex.anisotropy = maxAnisotropy;
    const cabinInteriorIndMesh = new THREE.Mesh(
      trackStatic(new THREE.PlaneGeometry(1.75, 0.52)),
      trackStatic(new THREE.MeshBasicMaterial({ map: cabinInteriorIndTex })),
    );
    cabinInteriorIndMesh.position.set(0, 3.92, 1.19);
    cabinInteriorIndMesh.rotation.y = Math.PI; // Faces -Z (into the cabin)
    liftCabinGroup.add(cabinInteriorIndMesh);

    const cabinDoorGeo = trackStatic(new THREE.BoxGeometry(1.48, 3.85, 0.08));
    const cabinDoorTrimGeo = trackStatic(new THREE.BoxGeometry(1.22, 3.48, 0.092));
    const cabinLeftDoor = new THREE.Mesh(cabinDoorGeo, matBronzeDoor);
    cabinLeftDoor.position.set(-0.74, 1.925, 1.28);
    const cabinLeftTrim = new THREE.Mesh(cabinDoorTrimGeo, matBrushedGold);
    cabinLeftDoor.add(cabinLeftTrim);
    liftCabinGroup.add(cabinLeftDoor);
    staticSolidMeshes.push(cabinLeftDoor);
    staticCameraObstacles.push(cabinLeftDoor);

    const cabinRightDoor = new THREE.Mesh(cabinDoorGeo, matBronzeDoor);
    cabinRightDoor.position.set(0.74, 1.925, 1.28);
    const cabinRightTrim = new THREE.Mesh(cabinDoorTrimGeo, matBrushedGold);
    cabinRightDoor.add(cabinRightTrim);
    liftCabinGroup.add(cabinRightDoor);
    staticSolidMeshes.push(cabinRightDoor);
    staticCameraObstacles.push(cabinRightDoor);

    const cabinLight = new THREE.PointLight(0xffe0a3, 2.0, 7.0, 1.4);
    cabinLight.position.set(0, 3.95, 0);
    liftCabinGroup.add(cabinLight);

    // 7. Dynamic Multi-Floor Architecture
    const dynamicWorldGroup = new THREE.Group();
    scene.add(dynamicWorldGroup);
    let portalRecords: PortalRecord[] = [];
    let wallPanelRecords: WallPanelRecord[] = [];
    let liftFloorRecords: LiftFloorRecord[] = [];
    let solidWallMeshes: THREE.Object3D[] = [];
    let cameraObstacleMeshes: THREE.Object3D[] = [];
    let featureWallBoardHitboxes: THREE.Mesh[] = [];
    let floorLightsByFloor = new Map<number, THREE.Light[]>();
    const atriumHitboxesByFloor = new Map<number, THREE.Object3D[]>();
    let hoveredWallPanel: WallPanelRecord | null = null;
    let hoveredPortalRoomId: string | null = null;

    const disposableAssets: (
      | THREE.BufferGeometry
      | THREE.Material
      | THREE.Texture
    )[] = [];
    const trackDynamic = <
      T extends THREE.BufferGeometry | THREE.Material | THREE.Texture,
    >(
      asset: T,
    ): T => {
      disposableAssets.push(asset);
      return asset;
    };

    // Shared Arch Geometry for Room Portals
    const archWallShape = new THREE.Shape();
    archWallShape.moveTo(-2.35, 0);
    archWallShape.lineTo(2.35, 0);
    archWallShape.lineTo(2.35, 5.05);
    archWallShape.lineTo(-2.35, 5.05);
    archWallShape.closePath();

    const archOpeningShape = new THREE.Shape();
    archOpeningShape.moveTo(-1.55, 0);
    archOpeningShape.lineTo(-1.55, 2.85);
    archOpeningShape.absarc(0, 2.85, 1.55, Math.PI, 0, true);
    archOpeningShape.lineTo(1.55, 0);
    archOpeningShape.closePath();
    archWallShape.holes.push(archOpeningShape);

    const archSurroundGeo = trackStatic(
      new THREE.ExtrudeGeometry(archWallShape, {
        depth: 0.48,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.04,
        bevelThickness: 0.04,
      }),
    );
    archSurroundGeo.translate(0, 0, -0.24);

    const innerArchGeo = trackStatic(
      new THREE.ShapeGeometry(archOpeningShape, 20),
    );

    const portalDoorStateCache = new Map<string, RoomDoorState>();
    const instanceDummy = new THREE.Object3D();

    const buildPortalsAndFloors = () => {
      for (let pIdx = 0; pIdx < portalRecords.length; pIdx++) {
        portalDoorStateCache.set(
          portalRecords[pIdx].roomId,
          portalRecords[pIdx].doorState,
        );
      }
      while (dynamicWorldGroup.children.length > 0) {
        dynamicWorldGroup.remove(dynamicWorldGroup.children[0]);
      }
      disposableAssets.forEach((a) => a.dispose());
      disposableAssets.length = 0;
      portalRecords = [];
      wallPanelRecords = [];
      liftFloorRecords = [];
      solidWallMeshes = [...staticSolidMeshes];
      cameraObstacleMeshes = [...staticCameraObstacles];
      featureWallBoardHitboxes = [];
      floorLightsByFloor = new Map<number, THREE.Light[]>();
      atriumHitboxesByFloor.clear();
      hoveredWallPanel = null;
      hoveredPortalRoomId = null;

      const currentFloors = floorsRef.current;
      const currentRooms = roomsRef.current;
      const currentMemories = memoriesRef.current;
      const currentProjectName = resolveMuseumDisplayName(
        museumSettingsRef.current.projectName,
      );

      // Shared geometries & cached textures for the 9 Feature Wall menu panels across all floors
      // (eliminates 9xN duplicate CanvasTextures and 27xN duplicate Box/Plane geometries)
      const sharedWallBezelGeo = trackDynamic(
        new THREE.BoxGeometry(3.04, 0.92, 0.06),
      );
      const sharedWallFaceGeo = trackDynamic(
        new THREE.PlaneGeometry(2.94, 0.84),
      );
      const sharedWallHitboxGeo = trackDynamic(
        new THREE.BoxGeometry(3.1, 0.96, 0.24),
      );
      const sharedWallHitboxMat = trackDynamic(
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      const sharedWallCardFaceMats = WALL_MENU_ITEMS.map((item) => {
        const cardTex = trackDynamic(
          createWallPanelCardTexture(
            item.numberLabel,
            item.shortTitle,
            item.subtitle,
            item.accentHex,
            maxAnisotropy,
          ),
        );
        return trackDynamic(new THREE.MeshBasicMaterial({ map: cardTex }));
      });

      // Continuous Vertical Lift Shaft Structure spanning all floors
      const totalShaftHeight = Math.max(1, currentFloors.length) * FLOOR_HEIGHT;
      const shaftGroup = new THREE.Group();
      dynamicWorldGroup.add(shaftGroup);

      const shaftPillarGeo = trackDynamic(
        new THREE.BoxGeometry(0.24, totalShaftHeight + 0.4, 0.24),
      );
      [-1.74, 1.74].forEach((px) => {
        [-8.6, -11.3].forEach((pz) => {
          const pillar = new THREE.Mesh(shaftPillarGeo, matBrushedGold);
          pillar.position.set(px, totalShaftHeight * 0.5, pz);
          shaftGroup.add(pillar);
          solidWallMeshes.push(pillar);
          cameraObstacleMeshes.push(pillar);
        });
      });

      const shaftSideEnclosureGeo = trackDynamic(
        new THREE.BoxGeometry(0.18, totalShaftHeight, 2.76),
      );
      const shaftSideBandGeo = trackDynamic(
        new THREE.BoxGeometry(0.21, 0.14, 2.78),
      );
      [-1.74, 1.74].forEach((px) => {
        const sideEnclosure = new THREE.Mesh(
          shaftSideEnclosureGeo,
          matWarmLimestone,
        );
        sideEnclosure.position.set(px, totalShaftHeight * 0.5, -9.96);
        shaftGroup.add(sideEnclosure);
        solidWallMeshes.push(sideEnclosure);
        cameraObstacleMeshes.push(sideEnclosure);

        currentFloors.forEach((f) => {
          const band = new THREE.Mesh(shaftSideBandGeo, matBrushedGold);
          band.position.set(px, f.floorNumber * FLOOR_HEIGHT + 0.12, -9.96);
          shaftGroup.add(band);
        });
      });

      const shaftGlassBack = new THREE.Mesh(
        trackDynamic(new THREE.BoxGeometry(3.56, totalShaftHeight, 0.16)),
        matWarmLimestone,
      );
      shaftGlassBack.position.set(0, totalShaftHeight * 0.5, -11.34);
      shaftGroup.add(shaftGlassBack);
      solidWallMeshes.push(shaftGlassBack);
      cameraObstacleMeshes.push(shaftGlassBack);

      const shaftRoofCap = new THREE.Mesh(
        trackDynamic(new THREE.BoxGeometry(3.76, 0.22, 2.96)),
        matWalnut,
      );
      shaftRoofCap.position.set(0, totalShaftHeight - 0.08, -9.96);
      shaftGroup.add(shaftRoofCap);
      solidWallMeshes.push(shaftRoofCap);
      cameraObstacleMeshes.push(shaftRoofCap);

      const rotundaWallGeo = trackDynamic(
        new THREE.CylinderGeometry(
          14.6,
          14.6,
          FLOOR_HEIGHT,
          48,
          1,
          true,
        ),
      );
      const planterPotGeo = trackDynamic(
        new THREE.CylinderGeometry(0.42, 0.32, 0.82, 16),
      );
      const liftJambGeo = trackDynamic(new THREE.BoxGeometry(0.38, 4.5, 0.48));
      const liftTrimGeo = trackDynamic(new THREE.BoxGeometry(0.08, 4.4, 0.52));
      const liftHeaderGeo = trackDynamic(new THREE.BoxGeometry(3.74, 0.9, 0.5));
      const liftUpperHeaderGeo = trackDynamic(
        new THREE.BoxGeometry(3.74, FLOOR_HEIGHT - 5.02, 0.48),
      );
      const liftUpperCorniceGeo = trackDynamic(
        new THREE.BoxGeometry(3.84, 0.2, 0.56),
      );
      const callPedestalGeo = trackDynamic(
        new THREE.BoxGeometry(0.32, 1.35, 0.28),
      );
      const callButtonFaceGeo = trackDynamic(
        new THREE.CylinderGeometry(0.09, 0.09, 0.04, 20),
      );
      const wallBackingGeo = trackDynamic(
        new THREE.BoxGeometry(11.6, FLOOR_HEIGHT, 0.48),
      );
      const walnutBoardGeo = trackDynamic(
        new THREE.BoxGeometry(10.8, 4.75, 0.14),
      );
      const goldCorniceGeo = trackDynamic(
        new THREE.BoxGeometry(11.8, 0.2, 0.58),
      );
      const pilasterGeo = trackDynamic(
        new THREE.BoxGeometry(0.42, FLOOR_HEIGHT - 0.08, 0.54),
      );
      const pilasterCapGeo = trackDynamic(
        new THREE.BoxGeometry(0.5, 0.22, 0.6),
      );
      const alcoveSideWallGeo = trackDynamic(
        new THREE.BoxGeometry(
          PORTAL_ARCH_SPEC.alcoveSideWallThickness,
          PORTAL_ARCH_SPEC.alcoveHeight,
          PORTAL_ARCH_SPEC.alcoveDepth,
        ),
      );
      const alcoveCeilingGeo = trackDynamic(
        new THREE.BoxGeometry(
          PORTAL_ARCH_SPEC.alcoveBackWallWidth,
          0.18,
          PORTAL_ARCH_SPEC.alcoveDepth,
        ),
      );
      const alcoveBackWallGeo = trackDynamic(
        new THREE.BoxGeometry(
          PORTAL_ARCH_SPEC.alcoveBackWallWidth,
          PORTAL_ARCH_SPEC.alcoveHeight,
          0.18,
        ),
      );
      const alcoveFloorGeo = trackDynamic(
        new THREE.BoxGeometry(3.32, 0.02, PORTAL_ARCH_SPEC.alcoveDepth),
      );
      const portalUpperHeaderGeo = trackDynamic(
        new THREE.BoxGeometry(
          PORTAL_ARCH_SPEC.archWidth,
          PORTAL_ARCH_SPEC.upperHeaderHeight,
          PORTAL_ARCH_SPEC.wallThickness,
        ),
      );
      const portalCrownCorniceGeo = trackDynamic(
        new THREE.BoxGeometry(
          PORTAL_ARCH_SPEC.archWidth + 0.08,
          0.2,
          PORTAL_ARCH_SPEC.wallThickness + 0.08,
        ),
      );
      const portalPierBaseboardGeo = trackDynamic(
        new THREE.BoxGeometry(
          0.8,
          0.22,
          PORTAL_ARCH_SPEC.wallThickness + 0.08,
        ),
      );
      const roomDoorPanelGeo = trackDynamic(
        new THREE.BoxGeometry(
          ROOM_DOOR_SPEC.panelWidth,
          ROOM_DOOR_SPEC.panelHeight,
          ROOM_DOOR_SPEC.panelDepth,
        ),
      );
      const roomDoorInlayGeo = trackDynamic(
        new THREE.BoxGeometry(1.16, 2.26, ROOM_DOOR_SPEC.panelDepth + 0.014),
      );
      const roomDoorHandleGeo = trackDynamic(
        new THREE.CylinderGeometry(0.022, 0.022, 0.72, 12),
      );
      const roomDoorTransomGeo = trackDynamic(
        new THREE.BoxGeometry(3.12, 0.06, 0.14),
      );

      // Shared Floor Deck & Ceiling Soffit Shapes
      const fullDiscGeo = ensureUv2Attribute(
        trackDynamic(new THREE.CircleGeometry(14.8, qualityConfig.cylinderSegments + 8)),
      );
      const perforatedFloorShape = new THREE.Shape();
      perforatedFloorShape.absarc(0, 0, 14.8, 0, Math.PI * 2, false);
      const lightwellHolePath = new THREE.Path();
      lightwellHolePath.absarc(0, -1.8, 2.55, 0, Math.PI * 2, true);
      perforatedFloorShape.holes.push(lightwellHolePath);
      const perforatedDeckGeo = ensureUv2Attribute(
        trackDynamic(
          new THREE.ShapeGeometry(perforatedFloorShape, qualityConfig.cylinderSegments + 8),
        ),
      );
      const lightwellFasciaGeo = trackDynamic(
        new THREE.CylinderGeometry(2.55, 2.55, 0.14, 48, 1, true),
      );
      const matCeilingPlaster = trackDynamic(
        new THREE.MeshStandardMaterial({
          map: limestoneTex,
          normalMap: limestoneNormalMap,
          normalScale: new THREE.Vector2(0.06, 0.06),
          roughnessMap: limestoneRoughnessMap,
          color: 0xf6f1e8,
          roughness: 0.68,
          metalness: 0.02,
          envMapIntensity: 0.24,
          side: THREE.DoubleSide,
        }),
      );

      // Continuous Perimeter Wall Segments & Corner Columns Specification
      const perimeterSpec = getPerimeterArchitectureSpec();
      const perimeterSegmentGeos = perimeterSpec.wallSegments.map((seg) => ({
        seg,
        wallGeo: trackDynamic(
          new THREE.BoxGeometry(seg.length + 0.06, FLOOR_HEIGHT, seg.thickness),
        ),
        baseboardGeo: trackDynamic(
          new THREE.BoxGeometry(seg.length + 0.08, 0.22, seg.thickness + 0.05),
        ),
        corniceGeo: trackDynamic(
          new THREE.BoxGeometry(seg.length + 0.08, 0.2, seg.thickness + 0.06),
        ),
        wainscotGeo:
          seg.length > 2.2
            ? trackDynamic(new THREE.BoxGeometry(seg.length - 0.55, 3.6, 0.04))
            : null,
      }));

      const cornerColumnGeos = perimeterSpec.cornerColumns.map((col) => ({
        col,
        shaftGeo: trackDynamic(
          new THREE.CylinderGeometry(col.radius, col.radius, FLOOR_HEIGHT, 20),
        ),
        baseGeo: trackDynamic(
          new THREE.CylinderGeometry(
            col.radius + 0.04,
            col.radius + 0.05,
            0.26,
            20,
          ),
        ),
        capGeo: trackDynamic(
          new THREE.CylinderGeometry(
            col.radius + 0.05,
            col.radius + 0.03,
            0.22,
            20,
          ),
        ),
      }));

      currentFloors.forEach((floor, floorIdx) => {
        const baseY = floor.floorNumber * FLOOR_HEIGHT;
        const isTopFloor = floorIdx === currentFloors.length - 1;
        const floorGroup = new THREE.Group();
        dynamicWorldGroup.add(floorGroup);
        const thisFloorLights: THREE.Light[] = [];
        floorLightsByFloor.set(floor.floorNumber, thisFloorLights);

        // A. Consistent Connected Travertine Floor Corridor & Ceiling Soffit on Every Floor
        if (floor.floorNumber === 0) {
          const groundMesh = new THREE.Mesh(fullDiscGeo, matTravertineFloor);
          groundMesh.rotation.x = -Math.PI / 2;
          groundMesh.position.y = 0;
          groundMesh.receiveShadow = true;
          floorGroup.add(groundMesh);
          solidWallMeshes.push(groundMesh);
        } else {
          const upperDeckMesh = new THREE.Mesh(
            perforatedDeckGeo,
            matTravertineFloor,
          );
          upperDeckMesh.rotation.x = -Math.PI / 2;
          upperDeckMesh.position.y = baseY;
          upperDeckMesh.receiveShadow = true;
          floorGroup.add(upperDeckMesh);
          solidWallMeshes.push(upperDeckMesh);

          // Balustrade rim around the central atrium lightwell
          const rimRing = new THREE.Mesh(
            trackDynamic(new THREE.TorusGeometry(2.6, 0.08, 12, 40)),
            matWalnut,
          );
          rimRing.rotation.x = Math.PI / 2;
          rimRing.position.set(0, baseY + 0.95, 1.8);
          floorGroup.add(rimRing);
          solidWallMeshes.push(rimRing);
          cameraObstacleMeshes.push(rimRing);

          const goldRailRing = new THREE.Mesh(
            trackDynamic(new THREE.TorusGeometry(2.6, 0.035, 10, 40)),
            matBrushedGold,
          );
          goldRailRing.rotation.x = Math.PI / 2;
          goldRailRing.position.set(0, baseY + 1.04, 1.8);
          floorGroup.add(goldRailRing);

          // Protective balustrade glass skirt + 12 brushed-brass stanchion posts around the lightwell opening
          const balustradeSkirt = new THREE.Mesh(
            trackDynamic(
              new THREE.CylinderGeometry(2.6, 2.6, 1.02, 36, 1, true),
            ),
            matElevatorGlass,
          );
          balustradeSkirt.position.set(0, baseY + 0.51, 1.8);
          floorGroup.add(balustradeSkirt);

          const stanchionGeo = trackDynamic(
            new THREE.CylinderGeometry(0.022, 0.028, 1.0, 10),
          );
          const stanchionInst = new THREE.InstancedMesh(
            stanchionGeo,
            matBrushedGold,
            12,
          );
          for (let stIdx = 0; stIdx < 12; stIdx++) {
            const stAngle = (stIdx / 12) * Math.PI * 2;
            instanceDummy.position.set(
              Math.cos(stAngle) * 2.6,
              baseY + 0.5,
              1.8 + Math.sin(stAngle) * 2.6,
            );
            instanceDummy.rotation.set(0, 0, 0);
            instanceDummy.scale.set(1, 1, 1);
            instanceDummy.updateMatrix();
            stanchionInst.setMatrixAt(stIdx, instanceDummy.matrix);
          }
          stanchionInst.instanceMatrix.needsUpdate = true;
          floorGroup.add(stanchionInst);
        }

        // Downward-facing Ceiling Soffit Slab at top of this floor (y = baseY + FLOOR_HEIGHT)
        const ceilingSoffitMesh = new THREE.Mesh(
          isTopFloor ? fullDiscGeo : perforatedDeckGeo,
          matCeilingPlaster,
        );
        ceilingSoffitMesh.rotation.x = Math.PI / 2;
        ceilingSoffitMesh.position.y = baseY + FLOOR_HEIGHT - 0.03;
        floorGroup.add(ceilingSoffitMesh);
        solidWallMeshes.push(ceilingSoffitMesh);
        cameraObstacleMeshes.push(ceilingSoffitMesh);

        if (!isTopFloor) {
          // Solid vertical fascia curb bridging ceiling soffit and next floor's deck around lightwell
          const fasciaCurb = new THREE.Mesh(
            lightwellFasciaGeo,
            matCeilingPlaster,
          );
          fasciaCurb.position.set(0, baseY + FLOOR_HEIGHT - 0.05, 1.8);
          floorGroup.add(fasciaCurb);
        } else {
          // Grand Illuminated Skylight Oculus & Multi-Tiered Sculptural Atrium Chandelier on Top Floor Ceiling
          const oculusDisc = new THREE.Mesh(
            trackDynamic(new THREE.CircleGeometry(2.55, 48)),
            matAlabaster,
          );
          oculusDisc.rotation.x = Math.PI / 2;
          oculusDisc.position.set(0, baseY + FLOOR_HEIGHT - 0.05, 1.8);
          floorGroup.add(oculusDisc);

          const oculusBezel = new THREE.Mesh(
            trackDynamic(new THREE.TorusGeometry(2.6, 0.09, 14, 48)),
            matBrushedGold,
          );
          oculusBezel.rotation.x = Math.PI / 2;
          oculusBezel.position.set(0, baseY + FLOOR_HEIGHT - 0.08, 1.8);
          floorGroup.add(oculusBezel);

          // Sculptural Multi-Tiered Brushed Brass & Alabaster Chandelier suspended in the central atrium lightwell
          const chandelierGroup = new THREE.Group();
          const chandelierTopY = baseY + FLOOR_HEIGHT - 0.1;
          chandelierGroup.position.set(0, 0, 1.8);
          floorGroup.add(chandelierGroup);

          const chandelierTiers = [
            { radius: 2.04, drop: 1.05, flutes: 14 },
            { radius: 1.56, drop: 1.95, flutes: 10 },
            { radius: 1.12, drop: 2.85, flutes: 8 },
            { radius: 0.68, drop: 3.68, flutes: 6 },
          ];
          const cableHeight = 3.68;
          const cableGeo = trackDynamic(
            new THREE.CylinderGeometry(0.009, 0.009, cableHeight, 8),
          );
          for (let c = 0; c < 6; c++) {
            const cAngle = (c / 6) * Math.PI * 2;
            const cable = new THREE.Mesh(cableGeo, matBrushedGold);
            cable.position.set(
              Math.cos(cAngle) * 0.68,
              chandelierTopY - cableHeight * 0.5,
              Math.sin(cAngle) * 0.68,
            );
            chandelierGroup.add(cable);
          }

          const fluteGlassGeo = trackDynamic(
            new THREE.CylinderGeometry(0.036, 0.036, 0.44, 12),
          );
          const fluteCapGeo = trackDynamic(
            new THREE.CylinderGeometry(0.044, 0.044, 0.05, 12),
          );

          const totalChandelierFlutes = chandelierTiers.reduce(
            (sum, t) => sum + t.flutes,
            0,
          );
          const fluteGlassInstanced = new THREE.InstancedMesh(
            fluteGlassGeo,
            matAlabaster,
            totalChandelierFlutes,
          );
          const fluteCapInstanced = new THREE.InstancedMesh(
            fluteCapGeo,
            matBrushedGold,
            totalChandelierFlutes,
          );
          const fluteInstMatrix = new THREE.Matrix4();
          let fluteIdx = 0;

          chandelierTiers.forEach((tier) => {
            const tierY = chandelierTopY - tier.drop;
            const brassRing = new THREE.Mesh(
              trackDynamic(new THREE.TorusGeometry(tier.radius, 0.036, 14, 48)),
              matBrushedGold,
            );
            brassRing.rotation.x = Math.PI / 2;
            brassRing.position.y = tierY;
            chandelierGroup.add(brassRing);

            for (let f = 0; f < tier.flutes; f++) {
              const fAngle = (f / tier.flutes) * Math.PI * 2 + tier.drop * 0.3;
              const fx = Math.cos(fAngle) * tier.radius;
              const fz = Math.sin(fAngle) * tier.radius;

              fluteInstMatrix.makeTranslation(fx, tierY, fz);
              fluteGlassInstanced.setMatrixAt(fluteIdx, fluteInstMatrix);

              fluteInstMatrix.makeTranslation(fx, tierY + 0.23, fz);
              fluteCapInstanced.setMatrixAt(fluteIdx, fluteInstMatrix);
              fluteIdx += 1;
            }
          });
          fluteGlassInstanced.instanceMatrix.needsUpdate = true;
          fluteCapInstanced.instanceMatrix.needsUpdate = true;
          chandelierGroup.add(fluteGlassInstanced);
          chandelierGroup.add(fluteCapInstanced);

          const chandelierLight = new THREE.PointLight(
            0xffe2b5,
            2.1,
            22.0,
            1.35,
          );
          chandelierLight.position.set(0, chandelierTopY - 2.2, 0);
          chandelierGroup.add(chandelierLight);
          thisFloorLights.push(chandelierLight);
        }

        // Inlaid Honed Travertine Parterre, Brushed Champagne-Brass Floor Medallion & Childhood Room Approach Runner
        const centralParterreDisc = new THREE.Mesh(
          trackDynamic(new THREE.RingGeometry(1.16, 2.74, 64)),
          matHonedTravertineParterre,
        );
        centralParterreDisc.rotation.x = -Math.PI / 2;
        centralParterreDisc.position.set(0, baseY + 0.003, 1.8);
        centralParterreDisc.receiveShadow = true;
        floorGroup.add(centralParterreDisc);

        const innerBrassInlayRing = new THREE.Mesh(
          trackDynamic(new THREE.RingGeometry(2.74, 2.82, 64)),
          matBrushedGold,
        );
        innerBrassInlayRing.rotation.x = -Math.PI / 2;
        innerBrassInlayRing.position.set(0, baseY + 0.005, 1.8);
        floorGroup.add(innerBrassInlayRing);

        const walnutMedallionBorderRing = new THREE.Mesh(
          trackDynamic(new THREE.RingGeometry(2.83, 3.06, 64)),
          matWalnut,
        );
        walnutMedallionBorderRing.rotation.x = -Math.PI / 2;
        walnutMedallionBorderRing.position.set(0, baseY + 0.004, 1.8);
        floorGroup.add(walnutMedallionBorderRing);

        const outerMedallionBrassPin = new THREE.Mesh(
          trackDynamic(new THREE.RingGeometry(3.07, 3.12, 64)),
          matBrushedGold,
        );
        outerMedallionBrassPin.rotation.x = -Math.PI / 2;
        outerMedallionBrassPin.position.set(0, baseY + 0.005, 1.8);
        floorGroup.add(outerMedallionBrassPin);

        // 8-point cardinal & intercardinal brass meridian rays radiating symmetrically across the travertine floor
        for (let r = 0; r < 8; r++) {
          const rAngle = (r / 8) * Math.PI * 2;
          const sinA = Math.sin(rAngle);
          const cosA = Math.cos(rAngle);
          const rStart = 3.14;
          const rOuterMax =
            -1.8 * cosA + Math.sqrt(3.24 * cosA * cosA + 55.2825);
          const rEnd = Math.min(6.45, Math.max(rStart + 1.2, rOuterMax));
          const rayLen = rEnd - rStart;
          const midR = (rStart + rEnd) * 0.5;
          const ray = new THREE.Mesh(
            trackDynamic(new THREE.PlaneGeometry(0.045, rayLen)),
            matBrushedGold,
          );
          ray.rotation.x = -Math.PI / 2;
          ray.rotation.z = rAngle;
          ray.position.set(sinA * midR, baseY + 0.004, 1.8 + cosA * midR);
          floorGroup.add(ray);
        }

        // Ceremonial Honed-Travertine & Brass Floor Runner guiding visitors on Ground Floor to the Childhood Memories Room (Slot 0 at x=-8.6, z=-3.6)
        if (floor.floorNumber === 0) {
          const targetApronX = -7.62;
          const targetApronZ = -3.6;
          const medallionOriginX = 0;
          const medallionOriginZ = 1.8;
          const vecX = targetApronX - medallionOriginX;
          const vecZ = targetApronZ - medallionOriginZ;
          const totalVecDist = Math.hypot(vecX, vecZ);
          const dirX = vecX / totalVecDist;
          const dirZ = vecZ / totalVecDist;
          const startRadius = 3.14;
          const runnerLen = Math.max(2.0, totalVecDist - startRadius);
          const startX = medallionOriginX + dirX * startRadius;
          const startZ = medallionOriginZ + dirZ * startRadius;
          const midX = (startX + targetApronX) * 0.5;
          const midZ = (startZ + targetApronZ) * 0.5;

          const runnerGroup = new THREE.Group();
          runnerGroup.position.set(midX, baseY + 0.004, midZ);
          runnerGroup.rotation.y = Math.atan2(-dirZ, dirX);
          floorGroup.add(runnerGroup);

          const runnerParterre = new THREE.Mesh(
            trackDynamic(new THREE.PlaneGeometry(runnerLen, 1.48)),
            matHonedTravertineParterre,
          );
          runnerParterre.rotation.x = -Math.PI / 2;
          runnerParterre.receiveShadow = true;
          runnerGroup.add(runnerParterre);

          const runnerBrassStripGeo = trackDynamic(
            new THREE.PlaneGeometry(runnerLen, 0.045),
          );
          [-0.76, 0.76].forEach((rz) => {
            const rStrip = new THREE.Mesh(runnerBrassStripGeo, matBrushedGold);
            rStrip.rotation.x = -Math.PI / 2;
            rStrip.position.set(0, 0.001, rz);
            runnerGroup.add(rStrip);
          });
        }

        const outerBrassCorridorRing = new THREE.Mesh(
          trackDynamic(new THREE.RingGeometry(7.85, 7.93, 72)),
          matBrushedGold,
        );
        outerBrassCorridorRing.rotation.x = -Math.PI / 2;
        outerBrassCorridorRing.position.set(0, baseY + 0.005, 0);
        floorGroup.add(outerBrassCorridorRing);

        const outerWalnutBorderRing = new THREE.Mesh(
          trackDynamic(new THREE.RingGeometry(7.94, 8.18, 72)),
          matWalnut,
        );
        outerWalnutBorderRing.rotation.x = -Math.PI / 2;
        outerWalnutBorderRing.position.set(0, baseY + 0.004, 0);
        floorGroup.add(outerWalnutBorderRing);

        // Architectural Coffered Ceiling Rings, Radial Coffers & Warm Cove Lighting Strip
        const ceilingCoveRing = new THREE.Mesh(
          trackDynamic(new THREE.TorusGeometry(8.2, 0.048, 12, 64)),
          matAlabaster,
        );
        ceilingCoveRing.rotation.x = Math.PI / 2;
        ceilingCoveRing.position.set(0, baseY + FLOOR_HEIGHT - 0.07, 0);
        floorGroup.add(ceilingCoveRing);

        const innerCofferedRing = new THREE.Mesh(
          trackDynamic(new THREE.TorusGeometry(3.75, 0.07, 12, 56)),
          matWarmLimestone,
        );
        innerCofferedRing.rotation.x = Math.PI / 2;
        innerCofferedRing.position.set(0, baseY + FLOOR_HEIGHT - 0.08, 0);
        floorGroup.add(innerCofferedRing);

        const innerCofferedBrassRing = new THREE.Mesh(
          trackDynamic(new THREE.TorusGeometry(3.68, 0.022, 10, 56)),
          matBrushedGold,
        );
        innerCofferedBrassRing.rotation.x = Math.PI / 2;
        innerCofferedBrassRing.position.set(0, baseY + FLOOR_HEIGHT - 0.11, 0);
        floorGroup.add(innerCofferedBrassRing);

        const radialCeilingBeamGeo = trackDynamic(
          new THREE.BoxGeometry(0.24, 0.15, 5.4),
        );
        const radialBeamBrassSpineGeo = trackDynamic(
          new THREE.BoxGeometry(0.05, 0.025, 5.2),
        );
        const beamInst = new THREE.InstancedMesh(
          radialCeilingBeamGeo,
          matWarmLimestone,
          8,
        );
        const brassSpineInst = new THREE.InstancedMesh(
          radialBeamBrassSpineGeo,
          matBrushedGold,
          8,
        );
        for (let b = 0; b < 8; b++) {
          const bAngle = (b / 8) * Math.PI * 2;
          instanceDummy.rotation.set(0, bAngle, 0);
          instanceDummy.scale.set(1, 1, 1);
          instanceDummy.position.set(
            Math.sin(bAngle) * 6.4,
            baseY + FLOOR_HEIGHT - 0.09,
            Math.cos(bAngle) * 6.4,
          );
          instanceDummy.updateMatrix();
          beamInst.setMatrixAt(b, instanceDummy.matrix);

          instanceDummy.position.set(
            Math.sin(bAngle) * 6.4,
            baseY + FLOOR_HEIGHT - 0.168,
            Math.cos(bAngle) * 6.4,
          );
          instanceDummy.updateMatrix();
          brassSpineInst.setMatrixAt(b, instanceDummy.matrix);
        }
        beamInst.instanceMatrix.needsUpdate = true;
        brassSpineInst.instanceMatrix.needsUpdate = true;
        floorGroup.add(beamInst);
        floorGroup.add(brassSpineInst);

        // Symmetrical Recessed Brushed-Brass Architectural Downlights in Ceiling Soffit (Instanced)
        const downlightBezelGeo = trackDynamic(
          new THREE.CylinderGeometry(0.18, 0.2, 0.04, 20),
        );
        const downlightLensGeo = trackDynamic(new THREE.CircleGeometry(0.13, 20));
        const downlightBezelInst = new THREE.InstancedMesh(
          downlightBezelGeo,
          matBrushedGold,
          8,
        );
        const downlightLensInst = new THREE.InstancedMesh(
          downlightLensGeo,
          matAlabaster,
          8,
        );
        for (let dl = 0; dl < 8; dl++) {
          const dlAngle = (dl / 8) * Math.PI * 2 + Math.PI / 8;
          const dlX = Math.cos(dlAngle) * 5.85;
          const dlZ = Math.sin(dlAngle) * 5.85;
          instanceDummy.rotation.set(0, 0, 0);
          instanceDummy.scale.set(1, 1, 1);
          instanceDummy.position.set(dlX, baseY + FLOOR_HEIGHT - 0.045, dlZ);
          instanceDummy.updateMatrix();
          downlightBezelInst.setMatrixAt(dl, instanceDummy.matrix);

          instanceDummy.rotation.set(Math.PI / 2, 0, 0);
          instanceDummy.position.set(dlX, baseY + FLOOR_HEIGHT - 0.068, dlZ);
          instanceDummy.updateMatrix();
          downlightLensInst.setMatrixAt(dl, instanceDummy.matrix);
        }
        downlightBezelInst.instanceMatrix.needsUpdate = true;
        downlightLensInst.instanceMatrix.needsUpdate = true;
        floorGroup.add(downlightBezelInst);
        floorGroup.add(downlightLensInst);

        // B. Curved Outer Rotunda Shell + Continuous Interior Gallery Perimeter Wall Ring
        const wallMesh = new THREE.Mesh(rotundaWallGeo, matIvoryPlaster);
        wallMesh.material.side = THREE.DoubleSide;
        wallMesh.position.set(0, baseY + FLOOR_HEIGHT * 0.5, 0);
        floorGroup.add(wallMesh);
        solidWallMeshes.push(wallMesh);
        cameraObstacleMeshes.push(wallMesh);

        // Continuous Interior Perimeter Wall Segments connecting Lift, Room Gates & Feature Wall
        perimeterSegmentGeos.forEach(
          ({ seg, wallGeo, baseboardGeo, corniceGeo, wainscotGeo }) => {
            const segGroup = new THREE.Group();
            segGroup.position.set(seg.cx, baseY, seg.cz);
            segGroup.rotation.y = seg.rotY;
            floorGroup.add(segGroup);

            const segWall = new THREE.Mesh(wallGeo, matIvoryPlaster);
            segWall.position.set(0, FLOOR_HEIGHT * 0.5, 0);
            segWall.receiveShadow = true;
            segGroup.add(segWall);
            solidWallMeshes.push(segWall);
            cameraObstacleMeshes.push(segWall);

            const baseboard = new THREE.Mesh(baseboardGeo, matWalnut);
            baseboard.position.set(0, 0.11, 0);
            segGroup.add(baseboard);

            const cornice = new THREE.Mesh(corniceGeo, matWarmLimestone);
            cornice.position.set(0, FLOOR_HEIGHT - 0.1, 0);
            segGroup.add(cornice);

            // Lower walnut cornice shadow-line molding
            const subCorniceGeo = trackDynamic(
              new THREE.BoxGeometry(
                seg.length + 0.04,
                0.045,
                seg.thickness + 0.05,
              ),
            );
            const subCornice = new THREE.Mesh(subCorniceGeo, matBrushedGold);
            subCornice.position.set(0, FLOOR_HEIGHT - 0.22, 0);
            segGroup.add(subCornice);

            if (wainscotGeo) {
              const wainscot = new THREE.Mesh(wainscotGeo, matWarmLimestone);
              wainscot.position.set(0, 2.25, seg.thickness * 0.5 + 0.015);
              wainscot.receiveShadow = true;
              segGroup.add(wainscot);

              // Brushed-gold dado & picture-rail trim strips + end stiles forming framed millwork panels
              const trimBarGeo = trackDynamic(
                new THREE.BoxGeometry(seg.length - 0.52, 0.035, 0.052),
              );
              const topTrim = new THREE.Mesh(trimBarGeo, matBrushedGold);
              topTrim.position.set(0, 4.06, seg.thickness * 0.5 + 0.018);
              segGroup.add(topTrim);

              const dadoTrim = new THREE.Mesh(trimBarGeo, matWalnut);
              dadoTrim.position.set(0, 0.92, seg.thickness * 0.5 + 0.02);
              segGroup.add(dadoTrim);

              const stileGeo = trackDynamic(
                new THREE.BoxGeometry(0.055, 3.12, 0.05),
              );
              const stileOffset = Math.max(0.5, (seg.length - 0.62) * 0.5);
              [-stileOffset, stileOffset].forEach((sx) => {
                const stile = new THREE.Mesh(stileGeo, matWalnut);
                stile.position.set(sx, 2.49, seg.thickness * 0.5 + 0.022);
                segGroup.add(stile);
              });
            }
          },
        );

        // Full-Height Structural Corner Columns sealing every wall-to-wall & gate-to-wall vertex
        cornerColumnGeos.forEach(({ col, shaftGeo, baseGeo, capGeo }) => {
          const colShaft = new THREE.Mesh(shaftGeo, matWarmLimestone);
          colShaft.position.set(col.x, baseY + FLOOR_HEIGHT * 0.5, col.z);
          colShaft.castShadow = true;
          colShaft.receiveShadow = true;
          floorGroup.add(colShaft);
          cameraObstacleMeshes.push(colShaft);

          const colBase = new THREE.Mesh(baseGeo, matWalnut);
          colBase.position.set(col.x, baseY + 0.13, col.z);
          floorGroup.add(colBase);

          const colCap = new THREE.Mesh(capGeo, matBrushedGold);
          colCap.position.set(col.x, baseY + FLOOR_HEIGHT - 0.12, col.z);
          floorGroup.add(colCap);

          // Classical brushed-brass astragal necking & base collar rings
          const colRingGeo = trackDynamic(
            new THREE.TorusGeometry(col.radius + 0.02, 0.018, 10, 24),
          );
          const lowerRing = new THREE.Mesh(colRingGeo, matBrushedGold);
          lowerRing.rotation.x = Math.PI / 2;
          lowerRing.position.set(col.x, baseY + 0.28, col.z);
          floorGroup.add(lowerRing);

          const upperRing = new THREE.Mesh(colRingGeo, matBrushedGold);
          upperRing.rotation.x = Math.PI / 2;
          upperRing.position.set(col.x, baseY + FLOOR_HEIGHT - 0.26, col.z);
          floorGroup.add(upperRing);
        });

        // C. Sculpted Limestone & Brushed-Brass Botanical Planters with Textured Olive & Sage Foliage
        const planterRimGeo = trackDynamic(
          new THREE.TorusGeometry(0.42, 0.024, 12, 24),
        );
        const planterSoilGeo = trackDynamic(
          new THREE.CircleGeometry(0.39, 18),
        );
        const planterTrunkGeo = trackDynamic(
          new THREE.CylinderGeometry(0.04, 0.06, 0.56, 10),
        );
        const planterUpperCanopyGeo = trackDynamic(
          new THREE.IcosahedronGeometry(0.36, 2),
        );
        const planterMainCanopyGeo = trackDynamic(
          new THREE.IcosahedronGeometry(0.48, 2),
        );
        [
          { x: -3.6, z: -7.4 },
          { x: 3.6, z: -7.4 },
          { x: -6.4, z: 8.2 },
          { x: 6.4, z: 8.2 },
        ].forEach((pt, pIdx) => {
          const pot = new THREE.Mesh(planterPotGeo, matWarmLimestone);
          pot.position.set(pt.x, baseY + 0.41, pt.z);
          pot.castShadow = qualityConfig.enableShadows;
          pot.receiveShadow = true;
          floorGroup.add(pot);

          const potRim = new THREE.Mesh(planterRimGeo, matBrushedGold);
          potRim.rotation.x = Math.PI / 2;
          potRim.position.set(pt.x, baseY + 0.82, pt.z);
          floorGroup.add(potRim);

          const potSoil = new THREE.Mesh(planterSoilGeo, matMossBed);
          potSoil.rotation.x = -Math.PI / 2;
          potSoil.position.set(pt.x, baseY + 0.815, pt.z);
          floorGroup.add(potSoil);

          const trunk = new THREE.Mesh(planterTrunkGeo, matTreeBark);
          trunk.position.set(pt.x, baseY + 0.98, pt.z);
          floorGroup.add(trunk);

          const lowerCanopy = new THREE.Mesh(
            planterMainCanopyGeo,
            pIdx % 2 === 0 ? matDeepOliveFoliage : matSageFoliage,
          );
          lowerCanopy.position.set(pt.x, baseY + 1.24, pt.z);
          lowerCanopy.scale.set(1.06, 0.82, 1.06);
          lowerCanopy.castShadow = qualityConfig.enableShadows;
          floorGroup.add(lowerCanopy);

          const upperCanopy = new THREE.Mesh(
            planterUpperCanopyGeo,
            pIdx % 2 === 0 ? matSageFoliage : matDeepOliveFoliage,
          );
          upperCanopy.position.set(
            pt.x + (pIdx % 2 === 0 ? 0.1 : -0.1),
            baseY + 1.56,
            pt.z + 0.06,
          );
          upperCanopy.castShadow = qualityConfig.enableShadows;
          floorGroup.add(upperCanopy);
        });

        // D. ARCHITECTURAL LIFT ENTRANCE ON EVERY FLOOR (North Center, x = 0, z = -8.6)
        const liftEntranceGroup = new THREE.Group();
        liftEntranceGroup.position.set(0, baseY, -8.6);
        floorGroup.add(liftEntranceGroup);

        [-1.68, 1.68].forEach((jx) => {
          const jamb = new THREE.Mesh(liftJambGeo, matWalnut);
          jamb.position.set(jx, 2.25, 0);
          liftEntranceGroup.add(jamb);
          solidWallMeshes.push(jamb);
          cameraObstacleMeshes.push(jamb);

          const goldTrim = new THREE.Mesh(liftTrimGeo, matBrushedGold);
          goldTrim.position.set(jx > 0 ? jx - 0.18 : jx + 0.18, 2.2, 0);
          liftEntranceGroup.add(goldTrim);
        });

        const liftHeaderBeam = new THREE.Mesh(liftHeaderGeo, matWalnut);
        liftHeaderBeam.position.set(0, 4.65, 0);
        liftEntranceGroup.add(liftHeaderBeam);
        solidWallMeshes.push(liftHeaderBeam);
        cameraObstacleMeshes.push(liftHeaderBeam);

        // Full-height Over-Lift Entablature Wall reaching ceiling (zero gap above elevator)
        const liftUpperWall = new THREE.Mesh(
          liftUpperHeaderGeo,
          matIvoryPlaster,
        );
        liftUpperWall.position.set(
          0,
          5.02 + (FLOOR_HEIGHT - 5.02) * 0.5,
          0,
        );
        liftEntranceGroup.add(liftUpperWall);
        solidWallMeshes.push(liftUpperWall);
        cameraObstacleMeshes.push(liftUpperWall);

        const liftUpperCornice = new THREE.Mesh(
          liftUpperCorniceGeo,
          matBrushedGold,
        );
        liftUpperCornice.position.set(0, FLOOR_HEIGHT - 0.1, 0);
        liftEntranceGroup.add(liftUpperCornice);

        // Digital Lift Floor Indicator above the corridor doors
        const indCanvas = document.createElement('canvas');
        indCanvas.width = 512;
        indCanvas.height = 170;
        drawLiftIndicatorCanvas(
          indCanvas,
          floor.floorNumber,
          currentFloors.length,
          false,
          1,
        );
        const indTex = trackDynamic(new THREE.CanvasTexture(indCanvas));
        indTex.colorSpace = THREE.SRGBColorSpace;
        indTex.anisotropy = maxAnisotropy;

        const indMat = trackDynamic(new THREE.MeshBasicMaterial({ map: indTex }));
        const indMesh = new THREE.Mesh(
          trackDynamic(new THREE.PlaneGeometry(2.5, 0.82)),
          indMat,
        );
        indMesh.position.set(0, 4.65, 0.27);
        liftEntranceGroup.add(indMesh);

        // Sliding Left & Right Landing Doors + Brushed-Brass Inlaid Panels & Threshold Plate
        const liftThresholdPlate = new THREE.Mesh(
          trackDynamic(new THREE.BoxGeometry(3.04, 0.016, 0.42)),
          matBrushedGold,
        );
        liftThresholdPlate.position.set(0, 0.008, 0.02);
        liftEntranceGroup.add(liftThresholdPlate);

        const doorGeo = trackDynamic(new THREE.BoxGeometry(1.48, 4.18, 0.1));
        const liftDoorTrimGeo = trackDynamic(
          new THREE.BoxGeometry(1.18, 3.74, 0.114),
        );

        const leftDoor = new THREE.Mesh(doorGeo, matBronzeDoor);
        leftDoor.position.set(-0.74, 2.09, 0);
        const leftDoorTrim = new THREE.Mesh(liftDoorTrimGeo, matBrushedGold);
        leftDoor.add(leftDoorTrim);
        liftEntranceGroup.add(leftDoor);
        solidWallMeshes.push(leftDoor);
        cameraObstacleMeshes.push(leftDoor);

        const rightDoor = new THREE.Mesh(doorGeo, matBronzeDoor);
        rightDoor.position.set(0.74, 2.09, 0);
        const rightDoorTrim = new THREE.Mesh(liftDoorTrimGeo, matBrushedGold);
        rightDoor.add(rightDoorTrim);
        liftEntranceGroup.add(rightDoor);
        solidWallMeshes.push(rightDoor);
        cameraObstacleMeshes.push(rightDoor);

        // Interactive Lift Call Button Pedestal
        const callPedestal = new THREE.Mesh(callPedestalGeo, matWalnut);
        callPedestal.position.set(2.15, 0.675, 0.35);
        liftEntranceGroup.add(callPedestal);
        cameraObstacleMeshes.push(callPedestal);

        const callButtonGlowMat = trackDynamic(
          new THREE.MeshStandardMaterial({
            color: 0xfde68a,
            emissive: 0xd6a15d,
            emissiveIntensity: 0.65,
            roughness: 0.2,
          }),
        );

        const callButtonFace = new THREE.Mesh(
          callButtonFaceGeo,
          callButtonGlowMat,
        );
        callButtonFace.rotation.x = Math.PI / 2;
        callButtonFace.position.set(2.15, 1.12, 0.5);
        liftEntranceGroup.add(callButtonFace);

        const callHitboxGeo = trackDynamic(
          new THREE.BoxGeometry(3.9, 4.6, 1.0),
        );
        const callHitboxMat = trackDynamic(
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        const callButtonHitbox = new THREE.Mesh(callHitboxGeo, callHitboxMat);
        callButtonHitbox.position.set(0.2, 2.25, 0.2);
        callButtonHitbox.userData = {
          kind: 'lift_call_button',
          floorNumber: floor.floorNumber,
        };
        liftEntranceGroup.add(callButtonHitbox);

        liftFloorRecords.push({
          floorNumber: floor.floorNumber,
          leftDoor,
          rightDoor,
          callButtonHitbox,
          callButtonGlowMat,
          indicatorTex: indTex,
          indicatorCanvas: indCanvas,
        });

        // E. BLANK WALL — INTERACTIVE FEATURE HUB OPPOSITE ROOMS ON EVERY FLOOR (South, x = 0, z = +9.6, facing -Z)
        const featureWallGroup = new THREE.Group();
        featureWallGroup.position.set(0, baseY, 9.6);
        featureWallGroup.rotation.y = Math.PI; // Faces -Z (toward central corridor and rooms)
        floorGroup.add(featureWallGroup);

        // Full floor-to-ceiling structural backing aligned at z = 0 (thickness 0.48m)
        const wallBacking = new THREE.Mesh(wallBackingGeo, matIvoryPlaster);
        wallBacking.position.set(0, FLOOR_HEIGHT * 0.5, 0);
        wallBacking.receiveShadow = true;
        featureWallGroup.add(wallBacking);
        solidWallMeshes.push(wallBacking);
        cameraObstacleMeshes.push(wallBacking);

        const walnutBoard = new THREE.Mesh(walnutBoardGeo, matWalnut);
        walnutBoard.position.set(0, 2.6, 0.22);
        walnutBoard.userData = {
          kind: 'feature_wall_board',
          floorNumber: floor.floorNumber,
        };
        featureWallGroup.add(walnutBoard);
        featureWallBoardHitboxes.push(walnutBoard);
        cameraObstacleMeshes.push(walnutBoard);

        const goldCornice = new THREE.Mesh(goldCorniceGeo, matBrushedGold);
        goldCornice.position.set(0, FLOOR_HEIGHT - 0.1, 0.04);
        featureWallGroup.add(goldCornice);

        [-5.6, 5.6].forEach((px) => {
          const pilaster = new THREE.Mesh(pilasterGeo, matWalnut);
          pilaster.position.set(px, (FLOOR_HEIGHT - 0.08) * 0.5, 0.04);
          featureWallGroup.add(pilaster);
          cameraObstacleMeshes.push(pilaster);

          const goldCap = new THREE.Mesh(pilasterCapGeo, matBrushedGold);
          goldCap.position.set(px, FLOOR_HEIGHT - 0.22, 0.04);
          featureWallGroup.add(goldCap);
        });

        // Prominent Configurable Project Name Header at the top of the Feature Wall
        const wallHeaderTex = trackDynamic(
          createWallHeaderTexture(
            currentProjectName,
            floor.name,
            maxAnisotropy,
          ),
        );
        const wallHeaderMat = trackDynamic(
          new THREE.MeshBasicMaterial({
            map: wallHeaderTex,
          }),
        );
        const wallHeaderMesh = new THREE.Mesh(
          trackDynamic(new THREE.PlaneGeometry(7.8, 1.05)),
          wallHeaderMat,
        );
        wallHeaderMesh.position.set(0, 4.28, 0.31);
        featureWallGroup.add(wallHeaderMesh);

        // Brushed-brass architectural gallery picture-light bar illuminating the Feature Wall header & tiles
        const galleryLightHood = new THREE.Mesh(
          trackDynamic(new THREE.BoxGeometry(8.1, 0.055, 0.14)),
          matBrushedGold,
        );
        galleryLightHood.position.set(0, 4.92, 0.34);
        featureWallGroup.add(galleryLightHood);

        const galleryLightDiffuser = new THREE.Mesh(
          trackDynamic(new THREE.BoxGeometry(7.8, 0.025, 0.08)),
          matAlabaster,
        );
        galleryLightDiffuser.position.set(0, 4.885, 0.35);
        featureWallGroup.add(galleryLightDiffuser);

        const wallSpotLeft = new THREE.PointLight(0xffe4b5, 1.4, 8.5, 1.5);
        wallSpotLeft.position.set(-2.8, 4.6, 1.6);
        featureWallGroup.add(wallSpotLeft);
        thisFloorLights.push(wallSpotLeft);

        const wallSpotRight = new THREE.PointLight(0xffe4b5, 1.4, 8.5, 1.5);
        wallSpotRight.position.set(2.8, 4.6, 1.6);
        featureWallGroup.add(wallSpotRight);
        thisFloorLights.push(wallSpotRight);

        // 9 Ordered Interactive 3D Wall Menu Panels (3 columns x 3 rows)
        WALL_MENU_ITEMS.forEach((item, idx) => {
          const col = idx % 3; // 0..2
          const row = Math.floor(idx / 3); // 0..2
          const cardX = (col - 1) * 3.28; // -3.28, 0, +3.28
          const cardY = 3.12 - row * 1.04; // 3.12, 2.08, 1.04

          const cardGroup = new THREE.Group();
          cardGroup.position.set(cardX, cardY, 0.32);
          featureWallGroup.add(cardGroup);

          const bezelMat: THREE.MeshStandardMaterial = trackDynamic(
            useHeroPhysical
              ? new THREE.MeshPhysicalMaterial({
                  color: 0xd3ad6e,
                  normalMap: brushedMetalNormalMap,
                  normalScale: new THREE.Vector2(0.12, 0.12),
                  roughnessMap: brushedMetalRoughnessMap,
                  emissive: 0x000000,
                  emissiveIntensity: 0,
                  roughness: 0.28,
                  metalness: 0.84,
                  clearcoat: 0.2,
                  envMapIntensity: 1.0,
                })
              : new THREE.MeshStandardMaterial({
                  color: 0xd3ad6e,
                  normalMap: brushedMetalNormalMap,
                  normalScale: new THREE.Vector2(0.12, 0.12),
                  roughnessMap: brushedMetalRoughnessMap,
                  emissive: 0x000000,
                  emissiveIntensity: 0,
                  roughness: 0.28,
                  metalness: 0.84,
                  envMapIntensity: 0.96,
                }),
          );

          const bezelMesh = new THREE.Mesh(sharedWallBezelGeo, bezelMat);
          cardGroup.add(bezelMesh);

          const cardFaceMesh = new THREE.Mesh(
            sharedWallFaceGeo,
            sharedWallCardFaceMats[idx],
          );
          cardFaceMesh.position.z = 0.036;
          cardGroup.add(cardFaceMesh);

          const hitbox = new THREE.Mesh(
            sharedWallHitboxGeo,
            sharedWallHitboxMat,
          );
          hitbox.position.z = 0.05;
          hitbox.userData = {
            kind: 'wall_panel',
            featureId: item.id,
            floorNumber: floor.floorNumber,
            title: `${item.numberLabel}. ${item.title}`,
            subtitle: `${item.subtitle} · Click to open`,
          };
          cardGroup.add(hitbox);

          wallPanelRecords.push({
            featureId: item.id,
            floorNumber: floor.floorNumber,
            title: `${item.numberLabel}. ${item.title}`,
            subtitle: item.subtitle,
            cardGroup,
            bezelMesh,
            hitbox,
            baseScale: 1.0,
          });
        });

        // F. 4 Symmetrical Room Slots (0..3) on this Floor — Flush Gate-to-Wall & Gate-to-Ceiling Continuity
        const floorRooms = currentRooms
          .filter((r) => r.floorNumber === floor.floorNumber)
          .sort((a, b) => a.slotIndex - b.slotIndex);

        ([0, 1, 2, 3] as const).forEach((slotIdx) => {
          const room = floorRooms.find((r) => r.slotIndex === slotIdx);
          if (!room) return;

          const placement = getFloorSlotPlacement(floor.floorNumber, slotIdx);
          const roomMemories = currentMemories
            .filter((m) => m.roomId === room.id)
            .sort((a, b) => {
              const ordA =
                typeof a.displayOrder === 'number' ? a.displayOrder : 9999;
              const ordB =
                typeof b.displayOrder === 'number' ? b.displayOrder : 9999;
              if (ordA !== ordB) return ordA - ordB;
              return (b.date || '').localeCompare(a.date || '');
            });
          const design = room.designConfig;
          const themeProfile = getRoomVisualThemeProfile(room);

          const portalGroup = new THREE.Group();
          portalGroup.position.copy(placement.pos);
          portalGroup.rotation.y = placement.rotY;
          floorGroup.add(portalGroup);

          let archMat: THREE.Material = matWarmLimestone;
          if (design?.archColorHex) {
            const customArchMat = trackDynamic(
              new THREE.MeshStandardMaterial({
                color: new THREE.Color(design.archColorHex),
                roughness: 0.45,
              }),
            );
            archMat = customArchMat;
          }
          const archMesh = new THREE.Mesh(archSurroundGeo, archMat);
          archMesh.receiveShadow = true;
          portalGroup.add(archMesh);
          solidWallMeshes.push(archMesh);
          cameraObstacleMeshes.push(archMesh);

          // 1. Over-Gate Header Wall & Crown Cornice reaching Floor Ceiling (y = 6.00m, zero gap above gate)
          const upperHeaderWall = new THREE.Mesh(
            portalUpperHeaderGeo,
            matIvoryPlaster,
          );
          upperHeaderWall.position.set(
            0,
            5.03 + PORTAL_ARCH_SPEC.upperHeaderHeight * 0.5,
            0,
          );
          upperHeaderWall.receiveShadow = true;
          portalGroup.add(upperHeaderWall);
          solidWallMeshes.push(upperHeaderWall);
          cameraObstacleMeshes.push(upperHeaderWall);

          const gateCrownCornice = new THREE.Mesh(
            portalCrownCorniceGeo,
            archMat,
          );
          gateCrownCornice.position.set(0, FLOOR_HEIGHT - 0.1, 0);
          portalGroup.add(gateCrownCornice);

          // 2. Left & Right Pier Baseboards (flush with floor, never encroaching doorway [-1.55, +1.55])
          [-1.95, 1.95].forEach((pierX) => {
            const pierBase = new THREE.Mesh(portalPierBaseboardGeo, matWalnut);
            pierBase.position.set(pierX, 0.11, 0);
            portalGroup.add(pierBase);
          });

          // 3. Coplanar Left & Right Wing Wall Extensions connecting Gate Frame cleanly to Corner Columns
          if (placement.leftWingLength > 0) {
            const lwLen = placement.leftWingLength;
            const lwCenterX = -(PORTAL_ARCH_SPEC.archHalfWidth + lwLen * 0.5);
            const lwWallGeo = trackDynamic(
              new THREE.BoxGeometry(
                lwLen + 0.04,
                FLOOR_HEIGHT,
                PORTAL_ARCH_SPEC.wallThickness,
              ),
            );
            const lwMesh = new THREE.Mesh(lwWallGeo, matIvoryPlaster);
            lwMesh.position.set(lwCenterX, FLOOR_HEIGHT * 0.5, 0);
            lwMesh.receiveShadow = true;
            portalGroup.add(lwMesh);
            solidWallMeshes.push(lwMesh);
            cameraObstacleMeshes.push(lwMesh);

            const lwBaseGeo = trackDynamic(
              new THREE.BoxGeometry(
                lwLen + 0.06,
                0.22,
                PORTAL_ARCH_SPEC.wallThickness + 0.06,
              ),
            );
            const lwBase = new THREE.Mesh(lwBaseGeo, matWalnut);
            lwBase.position.set(lwCenterX, 0.11, 0);
            portalGroup.add(lwBase);

            const lwCorniceGeo = trackDynamic(
              new THREE.BoxGeometry(
                lwLen + 0.06,
                0.2,
                PORTAL_ARCH_SPEC.wallThickness + 0.06,
              ),
            );
            const lwCornice = new THREE.Mesh(lwCorniceGeo, archMat);
            lwCornice.position.set(lwCenterX, FLOOR_HEIGHT - 0.1, 0);
            portalGroup.add(lwCornice);
          }

          if (placement.rightWingLength > 0) {
            const rwLen = placement.rightWingLength;
            const rwCenterX = PORTAL_ARCH_SPEC.archHalfWidth + rwLen * 0.5;
            const rwWallGeo = trackDynamic(
              new THREE.BoxGeometry(
                rwLen + 0.04,
                FLOOR_HEIGHT,
                PORTAL_ARCH_SPEC.wallThickness,
              ),
            );
            const rwMesh = new THREE.Mesh(rwWallGeo, matIvoryPlaster);
            rwMesh.position.set(rwCenterX, FLOOR_HEIGHT * 0.5, 0);
            rwMesh.receiveShadow = true;
            portalGroup.add(rwMesh);
            solidWallMeshes.push(rwMesh);
            cameraObstacleMeshes.push(rwMesh);

            const rwBaseGeo = trackDynamic(
              new THREE.BoxGeometry(
                rwLen + 0.06,
                0.22,
                PORTAL_ARCH_SPEC.wallThickness + 0.06,
              ),
            );
            const rwBase = new THREE.Mesh(rwBaseGeo, matWalnut);
            rwBase.position.set(rwCenterX, 0.11, 0);
            portalGroup.add(rwBase);

            const rwCorniceGeo = trackDynamic(
              new THREE.BoxGeometry(
                rwLen + 0.06,
                0.2,
                PORTAL_ARCH_SPEC.wallThickness + 0.06,
              ),
            );
            const rwCornice = new THREE.Mesh(rwCorniceGeo, archMat);
            rwCornice.position.set(rwCenterX, FLOOR_HEIGHT - 0.1, 0);
            portalGroup.add(rwCornice);
          }

          const activeAccent = design?.accentColorHex || room.accentColor;
          const plaqueTex = trackDynamic(
            createPortalPlaqueTexture(
              room.name,
              design?.themeName || room.subtitle,
              roomMemories.length,
              activeAccent,
              room.status,
              slotIdx,
              maxAnisotropy,
            ),
          );
          const plaqueMat = trackDynamic(
            new THREE.MeshStandardMaterial({
              map: plaqueTex,
              roughness: 0.35,
            }),
          );
          const plaqueGeo = trackDynamic(
            new THREE.BoxGeometry(3.1, 0.86, 0.12),
          );
          const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
          plaqueMesh.position.set(0, 4.82, 0.31);
          if (room.id === 'childhood') {
            portalGroup.add(plaqueMesh);

            // Stage 01 Task 4 — Grand Architectural Entrance Frame for Childhood Memories Room
            const plaqueGoldFrame = new THREE.Mesh(
              trackDynamic(new THREE.BoxGeometry(3.26, 0.98, 0.095)),
              matBrushedGold,
            );
            plaqueGoldFrame.position.set(0, 4.82, 0.28);
            portalGroup.add(plaqueGoldFrame);

            const plaqueWalnutBacking = new THREE.Mesh(
              trackDynamic(new THREE.BoxGeometry(3.42, 1.08, 0.07)),
              matWalnut,
            );
            plaqueWalnutBacking.position.set(0, 4.82, 0.25);
            portalGroup.add(plaqueWalnutBacking);
            cameraObstacleMeshes.push(plaqueWalnutBacking);

            // Sculpted Classical Entablature Lintel & Illuminated Alabaster Tympanum Crest above Plaque
            const entablatureLintel = new THREE.Mesh(
              trackDynamic(new THREE.BoxGeometry(4.62, 0.16, 0.44)),
              matWarmLimestone,
            );
            entablatureLintel.position.set(0, 5.42, 0.2);
            portalGroup.add(entablatureLintel);
            cameraObstacleMeshes.push(entablatureLintel);

            const entablatureBrassTrim = new THREE.Mesh(
              trackDynamic(new THREE.BoxGeometry(4.68, 0.045, 0.46)),
              matBrushedGold,
            );
            entablatureBrassTrim.position.set(0, 5.52, 0.21);
            portalGroup.add(entablatureBrassTrim);

            // Illuminated Alabaster Sunburst Lunette & Brushed-Gold Arch Crest at y = 5.54m
            const tympanumLunette = new THREE.Mesh(
              trackDynamic(
                new THREE.CylinderGeometry(
                  0.52,
                  0.52,
                  0.05,
                  24,
                  1,
                  false,
                  0,
                  Math.PI,
                ),
              ),
              matAlabaster,
            );
            tympanumLunette.rotation.z = -Math.PI / 2;
            tympanumLunette.rotation.y = Math.PI / 2;
            tympanumLunette.position.set(0, 5.52, 0.28);
            portalGroup.add(tympanumLunette);

            const tympanumBrassArch = new THREE.Mesh(
              trackDynamic(
                new THREE.TorusGeometry(0.54, 0.024, 12, 28, Math.PI),
              ),
              matBrushedGold,
            );
            tympanumBrassArch.position.set(0, 5.52, 0.3);
            portalGroup.add(tympanumBrassArch);

            // Fluted Classical Entrance Columns + Walnut Backing Pilasters & Astragal Brass Rings (x = ±2.04m)
            const entranceBackingPilasterGeo = trackDynamic(
              new THREE.BoxGeometry(0.46, 4.46, 0.16),
            );
            const entrancePilasterShaftGeo = trackDynamic(
              new THREE.CylinderGeometry(0.145, 0.168, 4.24, 20),
            );
            const entrancePilasterBaseGeo = trackDynamic(
              new THREE.BoxGeometry(0.46, 0.28, 0.42),
            );
            const entrancePilasterCapGeo = trackDynamic(
              new THREE.BoxGeometry(0.48, 0.2, 0.44),
            );
            const entranceAstragalGeo = trackDynamic(
              new THREE.TorusGeometry(0.165, 0.018, 10, 24),
            );

            [-2.04, 2.04].forEach((colX) => {
              const backingPilaster = new THREE.Mesh(
                entranceBackingPilasterGeo,
                matWalnut,
              );
              backingPilaster.position.set(colX, 2.38, 0.15);
              portalGroup.add(backingPilaster);
              cameraObstacleMeshes.push(backingPilaster);

              const pilasterBase = new THREE.Mesh(
                entrancePilasterBaseGeo,
                matWalnut,
              );
              pilasterBase.position.set(colX, 0.14, 0.24);
              portalGroup.add(pilasterBase);

              const pilasterShaft = new THREE.Mesh(
                entrancePilasterShaftGeo,
                matWarmLimestone,
              );
              pilasterShaft.position.set(colX, 2.38, 0.26);
              pilasterShaft.castShadow = true;
              pilasterShaft.receiveShadow = true;
              portalGroup.add(pilasterShaft);
              cameraObstacleMeshes.push(pilasterShaft);

              const lowerAstragal = new THREE.Mesh(
                entranceAstragalGeo,
                matBrushedGold,
              );
              lowerAstragal.rotation.x = Math.PI / 2;
              lowerAstragal.position.set(colX, 0.32, 0.26);
              portalGroup.add(lowerAstragal);

              const upperAstragal = new THREE.Mesh(
                entranceAstragalGeo,
                matBrushedGold,
              );
              upperAstragal.rotation.x = Math.PI / 2;
              upperAstragal.position.set(colX, 4.44, 0.26);
              portalGroup.add(upperAstragal);

              const pilasterCap = new THREE.Mesh(
                entrancePilasterCapGeo,
                matBrushedGold,
              );
              pilasterCap.position.set(colX, 4.58, 0.25);
              portalGroup.add(pilasterCap);
            });

            // Ceremonial Walnut, Cream Bouclé & Brushed-Gold Welcome Threshold Carpet in front of Childhood Room
            const thresholdApron = new THREE.Mesh(
              trackDynamic(new THREE.BoxGeometry(3.64, 0.014, 0.92)),
              matWalnut,
            );
            thresholdApron.position.set(0, 0.007, 0.52);
            thresholdApron.receiveShadow = true;
            portalGroup.add(thresholdApron);

            const thresholdInnerInlay = new THREE.Mesh(
              trackDynamic(new THREE.BoxGeometry(3.18, 0.016, 0.64)),
              matHonedTravertineParterre,
            );
            thresholdInnerInlay.position.set(0, 0.009, 0.52);
            thresholdInnerInlay.receiveShadow = true;
            portalGroup.add(thresholdInnerInlay);

            const thresholdTrim = new THREE.Mesh(
              trackDynamic(new THREE.BoxGeometry(3.76, 0.008, 1.02)),
              matBrushedGold,
            );
            thresholdTrim.position.set(0, 0.004, 0.52);
            portalGroup.add(thresholdTrim);

            // Warm Alabaster Threshold Side Guide Strips & Overhead Portal Spotlight
            const thresholdLightStripGeo = trackDynamic(
              new THREE.BoxGeometry(0.05, 0.018, 0.78),
            );
            [-1.72, 1.72].forEach((stripX) => {
              const lightStrip = new THREE.Mesh(
                thresholdLightStripGeo,
                matAlabaster,
              );
              lightStrip.position.set(stripX, 0.011, 0.52);
              portalGroup.add(lightStrip);
            });

            const childhoodPortalLight = new THREE.PointLight(
              0xffe2b0,
              1.35,
              7.5,
              1.5,
            );
            childhoodPortalLight.position.set(0, 4.35, 1.35);
            portalGroup.add(childhoodPortalLight);
            thisFloorLights.push(childhoodPortalLight);
          } else {
            // Consistent Stage 01B architectural plaque frame & threshold brass plate for all portal entrances
            portalGroup.add(plaqueMesh);

            const stdPlaqueGold = new THREE.Mesh(
              trackDynamic(new THREE.BoxGeometry(3.22, 0.94, 0.09)),
              matBrushedGold,
            );
            stdPlaqueGold.position.set(0, 4.82, 0.28);
            portalGroup.add(stdPlaqueGold);

            const stdPlaqueWalnut = new THREE.Mesh(
              trackDynamic(new THREE.BoxGeometry(3.34, 1.02, 0.065)),
              matWalnut,
            );
            stdPlaqueWalnut.position.set(0, 4.82, 0.25);
            portalGroup.add(stdPlaqueWalnut);

            const stdThresholdSill = new THREE.Mesh(
              trackDynamic(new THREE.BoxGeometry(3.14, 0.014, 0.34)),
              matBrushedGold,
            );
            stdThresholdSill.position.set(0, 0.007, 0.16);
            portalGroup.add(stdThresholdSill);
          }

          const backWallColor =
            room.status === 'empty'
              ? new THREE.Color(0x57483b)
              : room.status === 'disabled'
                ? new THREE.Color(0x28211c)
                : design?.wallColorHex
                  ? new THREE.Color(design.wallColorHex)
                  : new THREE.Color(themeProfile.alcoveWallHex);
          const backWallMat = trackDynamic(
            new THREE.MeshStandardMaterial({
              map: limestoneTex,
              normalMap: limestoneNormalMap,
              normalScale: new THREE.Vector2(0.16, 0.16),
              roughnessMap: limestoneRoughnessMap,
              color: backWallColor,
              roughness: 0.64,
              metalness: 0.02,
              envMapIntensity: 0.34,
            }),
          );
          const backWall = new THREE.Mesh(alcoveBackWallGeo, backWallMat);
          backWall.position.set(0, 2.325, PORTAL_ARCH_SPEC.alcoveBackWallZ);
          backWall.receiveShadow = true;
          portalGroup.add(backWall);
          solidWallMeshes.push(backWall);
          cameraObstacleMeshes.push(backWall);

          // Consistent walnut skirting & brass dado reveal on alcove back wall
          const alcoveBackSkirt = new THREE.Mesh(
            trackDynamic(new THREE.BoxGeometry(3.1, 0.22, 0.04)),
            matWalnut,
          );
          alcoveBackSkirt.position.set(
            0,
            0.11,
            PORTAL_ARCH_SPEC.alcoveBackWallZ + 0.095,
          );
          portalGroup.add(alcoveBackSkirt);

          const alcoveBackDado = new THREE.Mesh(
            trackDynamic(new THREE.BoxGeometry(3.1, 0.032, 0.036)),
            matBrushedGold,
          );
          alcoveBackDado.position.set(
            0,
            0.92,
            PORTAL_ARCH_SPEC.alcoveBackWallZ + 0.095,
          );
          portalGroup.add(alcoveBackDado);

          // Enclosed Left/Right Alcove Side Walls, Ceiling Soffit & Threshold Floor so portals have solid 3D depth
          const leftAlcoveWall = new THREE.Mesh(alcoveSideWallGeo, archMat);
          leftAlcoveWall.position.set(
            -PORTAL_ARCH_SPEC.alcoveSideWallX,
            2.325,
            -0.7,
          );
          portalGroup.add(leftAlcoveWall);
          solidWallMeshes.push(leftAlcoveWall);
          cameraObstacleMeshes.push(leftAlcoveWall);

          const rightAlcoveWall = new THREE.Mesh(alcoveSideWallGeo, archMat);
          rightAlcoveWall.position.set(
            PORTAL_ARCH_SPEC.alcoveSideWallX,
            2.325,
            -0.7,
          );
          portalGroup.add(rightAlcoveWall);
          solidWallMeshes.push(rightAlcoveWall);
          cameraObstacleMeshes.push(rightAlcoveWall);

          const alcoveCeiling = new THREE.Mesh(alcoveCeilingGeo, archMat);
          alcoveCeiling.position.set(0, 4.62, -0.7);
          portalGroup.add(alcoveCeiling);
          solidWallMeshes.push(alcoveCeiling);
          cameraObstacleMeshes.push(alcoveCeiling);

          const alcoveFloor = new THREE.Mesh(
            alcoveFloorGeo,
            matTravertineFloor,
          );
          alcoveFloor.position.set(0, 0.01, -0.7);
          alcoveFloor.receiveShadow = true;
          portalGroup.add(alcoveFloor);
          solidWallMeshes.push(alcoveFloor);

          if (room.status === 'disabled') {
            const barrierBar = new THREE.Mesh(
              trackDynamic(new THREE.CylinderGeometry(0.05, 0.05, 3.1, 12)),
              matBrushedGold,
            );
            barrierBar.rotation.z = Math.PI / 2;
            barrierBar.position.set(0, 1.15, 0.15);
            portalGroup.add(barrierBar);
            solidWallMeshes.push(barrierBar);
            cameraObstacleMeshes.push(barrierBar);
          }

          // Smallest Compatible Physical Room Entrance Doors:
          // Twin recessed pocket sliding leaves inside the 3.10m x 2.85m archway jambs (at local z = -0.08m),
          // preserving all existing arch frames, plaques, lighting, and wall proportions.
          const cachedDoor = portalDoorStateCache.get(room.id);
          const initialDoorOpen =
            room.status === 'active' &&
            cachedDoor &&
            cachedDoor.floorNumber === floor.floorNumber &&
            cachedDoor.slotIndex === slotIdx
              ? cachedDoor.openAmount
              : 0;
          const doorState: RoomDoorState = createInitialRoomDoorState({
            roomId: room.id,
            floorNumber: floor.floorNumber,
            slotIndex: slotIdx as 0 | 1 | 2 | 3,
            status: room.status,
            initialOpenAmount: initialDoorOpen,
          });
          if (cachedDoor && room.status === 'active') {
            doorState.phase = cachedDoor.phase;
            doorState.closeDelayTimer = cachedDoor.closeDelayTimer;
          }

          let leftDoorMesh: THREE.Mesh | null = null;
          let rightDoorMesh: THREE.Mesh | null = null;
          if (room.status === 'active') {
            const transomBar = new THREE.Mesh(
              roomDoorTransomGeo,
              matBrushedGold,
            );
            transomBar.position.set(0, 2.86, ROOM_DOOR_SPEC.localZ);
            portalGroup.add(transomBar);

            const slideOffset =
              ROOM_DOOR_SPEC.panelHalfWidth +
              doorState.openAmount * ROOM_DOOR_SPEC.panelSlideDistance;

            leftDoorMesh = new THREE.Mesh(roomDoorPanelGeo, matWalnut);
            leftDoorMesh.position.set(
              -slideOffset,
              ROOM_DOOR_SPEC.panelHeight * 0.5,
              ROOM_DOOR_SPEC.localZ,
            );
            leftDoorMesh.castShadow = true;
            leftDoorMesh.receiveShadow = true;
            const leftInlay = new THREE.Mesh(roomDoorInlayGeo, matBrushedGold);
            leftInlay.position.set(0, 0, 0);
            leftDoorMesh.add(leftInlay);
            const leftHandle = new THREE.Mesh(roomDoorHandleGeo, matBrushedGold);
            leftHandle.position.set(0.62, -0.18, ROOM_DOOR_SPEC.panelDepth * 0.65);
            leftDoorMesh.add(leftHandle);
            portalGroup.add(leftDoorMesh);
            cameraObstacleMeshes.push(leftDoorMesh);

            rightDoorMesh = new THREE.Mesh(roomDoorPanelGeo, matWalnut);
            rightDoorMesh.position.set(
              slideOffset,
              ROOM_DOOR_SPEC.panelHeight * 0.5,
              ROOM_DOOR_SPEC.localZ,
            );
            rightDoorMesh.castShadow = true;
            rightDoorMesh.receiveShadow = true;
            const rightInlay = new THREE.Mesh(roomDoorInlayGeo, matBrushedGold);
            rightInlay.position.set(0, 0, 0);
            rightDoorMesh.add(rightInlay);
            const rightHandle = new THREE.Mesh(roomDoorHandleGeo, matBrushedGold);
            rightHandle.position.set(-0.62, -0.18, ROOM_DOOR_SPEC.panelDepth * 0.65);
            rightDoorMesh.add(rightHandle);
            portalGroup.add(rightDoorMesh);
            cameraObstacleMeshes.push(rightDoorMesh);
          }

          const glowMat = trackDynamic(
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(
                room.status === 'empty'
                  ? '#E9D4B1'
                  : room.status === 'disabled'
                    ? '#5C493A'
                    : activeAccent,
              ),
              transparent: true,
              opacity: room.status === 'active' ? 0.13 : 0.06,
              depthWrite: false,
              side: THREE.DoubleSide,
            }),
          );
          const archGlowMesh = new THREE.Mesh(innerArchGeo, glowMat);
          archGlowMesh.position.set(0, 0, -0.16);
          portalGroup.add(archGlowMesh);

          // ===================================================================
          // INTEGRATED DOORFRAME ROOM-ENTRY LIGHT FIXTURES (Flush on z = +0.24m)
          // Clearly visible whenever the camera turns toward the room entrance,
          // never floating in front of the wall and never visible through solid walls.
          // ===================================================================
          const entryEmissiveColor = new THREE.Color(
            room.status === 'empty'
              ? '#E9D4B1'
              : room.status === 'disabled'
                ? '#786656'
                : activeAccent || '#D6A15D',
          ).lerp(new THREE.Color('#FFE8B8'), 0.48);

          const entryLightDiffuserMat = trackDynamic(
            new THREE.MeshStandardMaterial({
              color: new THREE.Color('#FFFCF6'),
              emissive: entryEmissiveColor,
              emissiveIntensity: room.status === 'active' ? 0.95 : 0.55,
              roughness: 0.18,
              metalness: 0.08,
            }),
          );
          const entryLightMats: THREE.MeshStandardMaterial[] = [
            entryLightDiffuserMat,
          ];

          const entryHaloMat = trackDynamic(
            new THREE.MeshBasicMaterial({
              color: entryEmissiveColor,
              transparent: true,
              opacity: room.status === 'active' ? 0.24 : 0.12,
              depthWrite: false,
            }),
          );

          const sconceBackplateGeo = trackDynamic(
            new THREE.BoxGeometry(0.18, 1.24, 0.032),
          );
          const sconceCapGeo = trackDynamic(
            new THREE.BoxGeometry(0.2, 0.08, 0.065),
          );
          const sconceLensGeo = trackDynamic(
            new THREE.BoxGeometry(0.095, 1.08, 0.048),
          );
          const sconceHaloGeo = trackDynamic(
            new THREE.PlaneGeometry(0.36, 1.44),
          );

          // 1. Left & Right Doorframe Entry Sconces integrated on the hall-facing arch piers (lx = ±1.76m, ly = 2.15m)
          [-1.76, 1.76].forEach((sconceX) => {
            const sconceGroup = new THREE.Group();
            sconceGroup.position.set(sconceX, 2.15, 0.242);
            portalGroup.add(sconceGroup);

            const haloPlane = new THREE.Mesh(sconceHaloGeo, entryHaloMat);
            haloPlane.position.set(0, 0, 0.002);
            sconceGroup.add(haloPlane);

            const backplate = new THREE.Mesh(
              sconceBackplateGeo,
              matBrushedGold,
            );
            backplate.position.set(0, 0, 0.016);
            sconceGroup.add(backplate);

            [-0.58, 0.58].forEach((capY) => {
              const cap = new THREE.Mesh(sconceCapGeo, matBrushedGold);
              cap.position.set(0, capY, 0.028);
              sconceGroup.add(cap);
            });

            const diffuserLens = new THREE.Mesh(
              sconceLensGeo,
              entryLightDiffuserMat,
            );
            diffuserLens.position.set(0, 0, 0.034);
            sconceGroup.add(diffuserLens);
          });

          // 2. Arch Crown Entry Beacon integrated on the keystone lintel directly beneath the room plaque (lx = 0, ly = 4.28m)
          const crownBeaconHousing = new THREE.Mesh(
            trackDynamic(new THREE.BoxGeometry(1.72, 0.13, 0.055)),
            matBrushedGold,
          );
          crownBeaconHousing.position.set(0, 4.28, 0.252);
          portalGroup.add(crownBeaconHousing);

          const crownBeaconLens = new THREE.Mesh(
            trackDynamic(new THREE.BoxGeometry(1.54, 0.072, 0.045)),
            entryLightDiffuserMat,
          );
          crownBeaconLens.position.set(0, 4.28, 0.268);
          portalGroup.add(crownBeaconLens);

          // 3. Inner Doorway Jamb Reveal Light Strips & Threshold Welcome Bar (flush inside the doorway opening)
          const jambRevealStripGeo = trackDynamic(
            new THREE.BoxGeometry(0.036, 2.76, 0.045),
          );
          [-1.535, 1.535].forEach((revealX) => {
            const revealStrip = new THREE.Mesh(
              jambRevealStripGeo,
              entryLightDiffuserMat,
            );
            revealStrip.position.set(revealX, 1.42, 0.21);
            portalGroup.add(revealStrip);
          });

          const thresholdLightBar = new THREE.Mesh(
            trackDynamic(new THREE.BoxGeometry(3.04, 0.024, 0.06)),
            entryLightDiffuserMat,
          );
          thresholdLightBar.position.set(0, 0.014, 0.21);
          portalGroup.add(thresholdLightBar);

          // 4. Dedicated Doorway PointLight positioned right at the upper doorway reveal (z = +0.36m, never floating far in the corridor)
          const baseLightScale =
            room.status === 'active' && design?.lightIntensity
              ? Math.max(0.5, Math.min(1.6, design.lightIntensity / 2.25))
              : 1.0;
          const roomLight = new THREE.PointLight(
            design?.accentColorHex
              ? new THREE.Color(design.accentColorHex).getHex()
              : room.lightColor ||
                new THREE.Color(themeProfile.accentHex).getHex(),
            room.status === 'active' ? 1.35 * baseLightScale : 0.65,
            9.5,
            1.65,
          );
          roomLight.position.set(0, 3.15, 0.36);
          roomLight.castShadow = false;
          portalGroup.add(roomLight);
          thisFloorLights.push(roomLight);

          const frameHitboxes: { mesh: THREE.Mesh; memoryId: string }[] = [];
          if (room.status === 'active') {
            const previewMemories = roomMemories.slice(0, 3);
            const galleryLayout = room.galleryLayout || 'masonry';
            const layoutMode = design?.exhibitLayout || 'triptych';
            const framePositions =
              layoutMode === 'salon_grid' || galleryLayout === 'masonry' || galleryLayout === 'scrapbook'
                ? [
                    { x: -0.82, y: 2.72, scale: 0.84 },
                    { x: 0.72, y: 2.65, scale: 0.9 },
                    { x: -0.12, y: 1.68, scale: 0.86 },
                  ]
                : [
                    { x: -0.95, y: 2.24, scale: 0.82 },
                    { x: 0, y: 2.38, scale: 1.0 },
                    { x: 0.95, y: 2.24, scale: 0.82 },
                  ];

            const outerFrameGeo = trackDynamic(
              new THREE.BoxGeometry(0.9, 0.7, 0.05),
            );
            const artPlaneGeo = trackDynamic(
              new THREE.PlaneGeometry(0.72, 0.52),
            );
            const picLightHousingGeo = trackDynamic(
              new THREE.BoxGeometry(0.46, 0.035, 0.07),
            );
            const picLightLensGeo = trackDynamic(
              new THREE.BoxGeometry(0.4, 0.018, 0.045),
            );

            previewMemories.forEach((mem, mIdx) => {
              const fp = framePositions[mIdx];
              const frameGroup = new THREE.Group();
              // Positioned at z = -1.25 (cleanly in front of backWall at z = -1.38 so frames never clip)
              frameGroup.position.set(fp.x, fp.y, -1.25);
              frameGroup.scale.setScalar(fp.scale);
              portalGroup.add(frameGroup);

              const outerFrame = new THREE.Mesh(
                outerFrameGeo,
                mem.type === 'certificate' ? matBrushedGold : matWalnut,
              );
              frameGroup.add(outerFrame);

              // Subtle museum picture-light hood & warm emissive lens integrated at the top of each 3D memory frame
              const picLightHousing = new THREE.Mesh(
                picLightHousingGeo,
                matBrushedGold,
              );
              picLightHousing.position.set(0, 0.38, 0.04);
              frameGroup.add(picLightHousing);

              const picLightLens = new THREE.Mesh(
                picLightLensGeo,
                entryLightDiffuserMat,
              );
              picLightLens.position.set(0, 0.365, 0.045);
              frameGroup.add(picLightLens);

              const imgDataUrl =
                mem.customImageUrl ||
                getProceduralMemoryArt(
                  mem.motif,
                  mem.palette,
                  mem.title,
                  mem.location,
                );
              const artMat = trackDynamic(
                new THREE.MeshStandardMaterial({
                  color: 0xe8decb,
                  emissive: 0x3b2a1a,
                  emissiveIntensity: 0.16,
                  roughness: 0.35,
                  metalness: 0.04,
                }),
              );
              const img = new Image();
              const artTex = trackDynamic(new THREE.Texture(img));
              artTex.colorSpace = THREE.SRGBColorSpace;
              img.onload = () => {
                artTex.needsUpdate = true;
                artMat.map = artTex;
                artMat.emissiveMap = artTex;
                artMat.emissive.setHex(0xfff4dc);
                artMat.emissiveIntensity = 0.18;
                artMat.color.setHex(0xffffff);
                artMat.needsUpdate = true;
              };
              img.src = imgDataUrl;
              const artPlane = new THREE.Mesh(artPlaneGeo, artMat);
              artPlane.position.z = 0.032;
              artPlane.userData = { memoryId: mem.id, roomId: room.id };
              frameGroup.add(artPlane);
              frameHitboxes.push({ mesh: artPlane, memoryId: mem.id });
            });

            // Subtle Category-Specific 3D Decorative Pedestal Artifact (tucked at side x = 1.15, z = -0.92, never blocking doorway)
            const pedestalGroup = new THREE.Group();
            pedestalGroup.position.set(1.15, 0, -0.92);
            portalGroup.add(pedestalGroup);

            const pedBase = new THREE.Mesh(
              trackDynamic(new THREE.CylinderGeometry(0.18, 0.22, 0.82, 16)),
              matWarmLimestone,
            );
            pedBase.position.y = 0.41;
            pedestalGroup.add(pedBase);

            const decoStyle = themeProfile.decorativeStyle;
            let artifactGeo: THREE.BufferGeometry;
            if (decoStyle === 'compass_atlas') {
              artifactGeo = new THREE.SphereGeometry(0.16, 16, 16);
            } else if (decoStyle === 'laurel_monograph') {
              artifactGeo = new THREE.OctahedronGeometry(0.17, 0);
            } else if (decoStyle === 'playful_nostalgia') {
              artifactGeo = new THREE.TorusKnotGeometry(0.1, 0.035, 36, 8);
            } else {
              artifactGeo = new THREE.DodecahedronGeometry(0.15, 0);
            }
            trackDynamic(artifactGeo);
            const artifactMesh = new THREE.Mesh(artifactGeo, matBrushedGold);
            artifactMesh.position.y = 0.98;
            pedestalGroup.add(artifactMesh);

            const hitboxGeo = trackDynamic(
              new THREE.BoxGeometry(3.5, 4.9, 0.9),
            );
            const hitboxMat = trackDynamic(
              new THREE.MeshBasicMaterial({ visible: false }),
            );
            const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
            hitbox.position.set(0, 2.45, 0.1);
            hitbox.userData = {
              kind: 'room_portal',
              roomId: room.id,
              floorId: room.floorId,
              slotIndex: slotIdx,
              status: room.status,
            };
            portalGroup.add(hitbox);

            portalRecords.push({
              roomId: room.id,
              floorId: room.floorId,
              floorNumber: floor.floorNumber,
              slotIndex: slotIdx,
              status: room.status,
              group: portalGroup,
              hitbox,
              archGlowMesh,
              pointLight: roomLight,
              baseLightScale,
              entryLightMats,
              entryHaloMat,
              plaqueMesh,
              doorPos: placement.doorPos,
              labelWorldAnchor: placement.labelAnchor,
              cameraPos: placement.camPos,
              cameraLookAt: placement.camLook,
              frameHitboxes,
              artifactMesh,
              leftDoorMesh,
              rightDoorMesh,
              doorState,
            });
            return;
          }

          const hitboxGeo = trackDynamic(
            new THREE.BoxGeometry(3.5, 4.9, 0.9),
          );
          const hitboxMat = trackDynamic(
            new THREE.MeshBasicMaterial({ visible: false }),
          );
          const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
          hitbox.position.set(0, 2.45, 0.1);
          hitbox.userData = {
            kind: 'room_portal',
            roomId: room.id,
            floorId: room.floorId,
            slotIndex: slotIdx,
            status: room.status,
          };
          portalGroup.add(hitbox);

          portalRecords.push({
            roomId: room.id,
            floorId: room.floorId,
            floorNumber: floor.floorNumber,
            slotIndex: slotIdx,
            status: room.status,
            group: portalGroup,
            hitbox,
            archGlowMesh,
            pointLight: roomLight,
            baseLightScale,
            entryLightMats,
            entryHaloMat,
            plaqueMesh,
            doorPos: placement.doorPos,
            labelWorldAnchor: placement.labelAnchor,
            cameraPos: placement.camPos,
            cameraLookAt: placement.camLook,
            frameHitboxes,
            artifactMesh: null,
            leftDoorMesh,
            rightDoorMesh,
            doorState,
          });
        });
      });

      scene.updateMatrixWorld(true);

      // Partition interactive Atrium hitboxes by floor once on rebuild (zero per-frame/per-hover allocations)
      for (let i = 0; i < wallPanelRecords.length; i++) {
        const w = wallPanelRecords[i];
        let arr = atriumHitboxesByFloor.get(w.floorNumber);
        if (!arr) {
          arr = [];
          atriumHitboxesByFloor.set(w.floorNumber, arr);
        }
        arr.push(w.hitbox);
      }
      for (let i = 0; i < liftFloorRecords.length; i++) {
        const l = liftFloorRecords[i];
        let arr = atriumHitboxesByFloor.get(l.floorNumber);
        if (!arr) {
          arr = [];
          atriumHitboxesByFloor.set(l.floorNumber, arr);
        }
        arr.push(l.callButtonHitbox);
      }
      for (let i = 0; i < portalRecords.length; i++) {
        const p = portalRecords[i];
        let arr = atriumHitboxesByFloor.get(p.floorNumber);
        if (!arr) {
          arr = [];
          atriumHitboxesByFloor.set(p.floorNumber, arr);
        }
        arr.push(p.hitbox);
      }
      let floor0Hitboxes = atriumHitboxesByFloor.get(0);
      if (!floor0Hitboxes) {
        floor0Hitboxes = [];
        atriumHitboxesByFloor.set(0, floor0Hitboxes);
      }
      floor0Hitboxes.push(centerpieceHitbox);

      // Freeze purely static structural meshes so Three.js skips redundant matrix compositions every frame
      for (let i = 0; i < solidWallMeshes.length; i++) {
        const obj = solidWallMeshes[i];
        if (obj.parent !== liftCabinGroup) {
          obj.updateMatrix();
          obj.matrixAutoUpdate = false;
        }
      }

      shadowDirtyFrames = 2;
    };

    const syncFloorLightCulling = (
      activeFloorNum: number,
      inRoom3D: boolean,
    ) => {
      const cullInactiveFloors = Boolean(qualityConfig.enableFloorLightCulling);
      floorLightsByFloor.forEach((lights, fNum) => {
        const shouldEnable =
          !inRoom3D && (!cullInactiveFloors || fNum === activeFloorNum);
        for (let i = 0; i < lights.length; i++) {
          lights[i].visible = shouldEnable;
        }
      });
      centerpieceUplight.visible = !inRoom3D;
      atriumBounceLight.visible = !inRoom3D;
      cabinLight.visible = !inRoom3D;
    };

    const syncAllPortalEntryLights = (
      playerX: number,
      playerZ: number,
      camX: number,
      camY: number,
      camZ: number,
      camLookX: number,
      camLookY: number,
      camLookZ: number,
      elapsedSec: number,
      reducedMotion: boolean,
      deltaSec = 0,
      onlyFloorNum?: number,
    ) => {
      const fwdX = camLookX - camX;
      const fwdY = camLookY - camY;
      const fwdZ = camLookZ - camZ;
      const smoothAlpha =
        reducedMotion || deltaSec <= 0
          ? 1
          : Math.min(1, 1 - Math.exp(-10 * deltaSec));

      for (let i = 0; i < portalRecords.length; i++) {
        const p = portalRecords[i];
        if (onlyFloorNum !== undefined && p.floorNumber !== onlyFloorNum) {
          continue;
        }
        const pulseWave = reducedMotion
          ? 0.5
          : 0.5 + 0.5 * Math.sin(elapsedSec * 2.1 + p.slotIndex * 1.15);

        const lightState = computeRoomEntryLightState({
          slotIndex: p.slotIndex,
          floorNumber: p.floorNumber,
          status: p.status,
          playerX,
          playerZ,
          cameraX: camX,
          cameraY: camY,
          cameraZ: camZ,
          cameraForwardX: fwdX,
          cameraForwardY: fwdY,
          cameraForwardZ: fwdZ,
          isHovered: hoveredPortalRoomId === p.roomId,
          isSelected: activeRoomIdRef.current === p.roomId,
          pulseWave,
        });

        const targetPointIntensity =
          lightState.pointLightIntensity * p.baseLightScale;
        p.pointLight.intensity = THREE.MathUtils.lerp(
          p.pointLight.intensity,
          targetPointIntensity,
          smoothAlpha,
        );

        for (let m = 0; m < p.entryLightMats.length; m++) {
          p.entryLightMats[m].emissiveIntensity = THREE.MathUtils.lerp(
            p.entryLightMats[m].emissiveIntensity,
            lightState.sconceEmissiveIntensity,
            smoothAlpha,
          );
        }

        const targetHaloOpacity = 0.14 + lightState.highlightFactor * 0.28;
        p.entryHaloMat.opacity = THREE.MathUtils.lerp(
          p.entryHaloMat.opacity,
          targetHaloOpacity,
          smoothAlpha,
        );

        const glowMat = p.archGlowMesh.material as THREE.MeshBasicMaterial;
        glowMat.opacity = THREE.MathUtils.lerp(
          glowMat.opacity,
          lightState.archGlowOpacity * 0.62,
          smoothAlpha,
        );
      }
    };

    // 7B. Dedicated Walkable 3D Memory Exhibition Room Instance & Smooth Entrance Animation State
    let activeExhibitionBuilt: BuiltExhibitionRoom3D | null = null;
    let hoveredRoomMemoryId: string | null = null;
    let roomEntranceState: {
      active: boolean;
      roomId: string | null;
      elapsed: number;
      duration: number;
      cameraSpringArmBlend: number;
    } = {
      active: false,
      roomId: null,
      elapsed: 0,
      duration: ROOM_ENTRANCE_TRANSITION_SPEC.durationSec,
      cameraSpringArmBlend: 1,
    };

    const disposeActiveExhibitionBuilt = () => {
      if (activeExhibitionBuilt) {
        scene.remove(activeExhibitionBuilt.rootGroup);
        activeExhibitionBuilt.cleanup?.();
        activeExhibitionBuilt = null;
      }
      activeExhibitionBuiltRef.current = null;
      hoveredRoomMemoryId = null;
      roomEntranceState.active = false;
      roomEntranceState.roomId = null;
      roomEntranceState.elapsed = 0;
      roomEntranceState.cameraSpringArmBlend = 1;
    };

    let activeRoomInteractiveTargets: THREE.Object3D[] = [];
    let activeRoomColliderKey = '';

    const syncActiveExhibitionRoom = () => {
      disposeActiveExhibitionBuilt();
      activeRoomInteractiveTargets = [];
      activeRoomColliderKey = '';
      shadowDirtyFrames = 2;
      const currentActiveRoomId = activeRoomIdRef.current;
      const room = currentActiveRoomId
        ? roomsRef.current.find(
            (r) => r.id === currentActiveRoomId && r.status === 'active',
          )
        : null;

      if (!room) {
        dynamicWorldGroup.visible = true;
        centerpieceGroup.visible = true;
        atriumMotesPoints.visible =
          !isSoftwareGl &&
          !qualityConfig.profileId?.startsWith('desktop_') &&
          qualityConfig.profileId !== 'mobile_performance';
        liftCabinGroup.visible = true;
        return;
      }

      // Hide Atrium groups while exploring inside the dedicated 3D exhibition room
      dynamicWorldGroup.visible = false;
      centerpieceGroup.visible = false;
      atriumMotesPoints.visible = false;
      liftCabinGroup.visible = false;

      const roomMemories = memoriesRef.current.filter(
        (m) => m.roomId === room.id,
      );
      const built = buildExhibitionRoom3DScene({
        room,
        memories: roomMemories,
        maxAnisotropy,
        floorTexture: floorTex,
        qualityConfig,
        sharedMaps: sharedMaterialMaps,
        atriumMood: atriumLightingMoodRef.current,
      });
      scene.add(built.rootGroup);
      built.rootGroup.updateMatrixWorld(true);
      built.rootGroup.traverse((obj) => {
        const kind = obj.userData?.kind;
        if (
          kind === 'room_memory_display' ||
          kind === 'room_interactive_object' ||
          kind === 'room_interior_exit'
        ) {
          activeRoomInteractiveTargets.push(obj);
        }
      });
      activeRoomColliderKey = `${room.id}|${built.exhibitionStyle}|${built.displayRecords.map((d) => d.placement.memory.id).join(',')}`;
      activeExhibitionBuilt = built;
      activeExhibitionBuiltRef.current = built;
    };

    buildPortalsAndFloors();
    syncActiveExhibitionRoom();
    syncFloorLightCulling(
      startCharState.floorNumber,
      Boolean(activeRoomIdRef.current && activeExhibitionBuilt),
    );
    if (activeRoomIdRef.current && activeExhibitionBuilt) {
      const initRoomObj = roomsRef.current.find(
        (r) => r.id === activeRoomIdRef.current,
      );
      const initRoomY = (initRoomObj?.floorNumber ?? 0) * FLOOR_HEIGHT;
      explorerGroup.position.set(
        ROOM_INTERIOR_SPEC.spawnX,
        initRoomY,
        ROOM_INTERIOR_SPEC.spawnZ,
      );
      explorerGroup.rotation.set(0, Math.PI, 0);
      viewYawRef.current = Math.PI;
      viewPitchRef.current = 0.08;
      roomEntranceState = {
        active: true,
        roomId: activeRoomIdRef.current,
        elapsed: 0,
        duration: ROOM_ENTRANCE_TRANSITION_SPEC.durationSec,
        cameraSpringArmBlend: 0,
      };
      (
        activeExhibitionBuilt as BuiltExhibitionRoom3D | null
      )?.applyEntranceAnimation(
        0,
        ROOM_ENTRANCE_TRANSITION_SPEC.durationSec,
        Boolean(museumSettingsRef.current.reducedMotion),
      );
    }
    syncAllPortalEntryLights(
      explorerGroup.position.x,
      explorerGroup.position.z,
      camera.position.x,
      camera.position.y,
      camera.position.z,
      cameraLookTarget.x,
      cameraLookTarget.y,
      cameraLookTarget.z,
      0,
      Boolean(museumSettingsRef.current.reducedMotion),
    );
    rebuildSceneRef.current = () => {
      buildPortalsAndFloors();
      syncActiveExhibitionRoom();
      const rebuildFloor = sanitizeFloorIndex(
        Math.round(sanitizeFiniteNumber(explorerGroup.position.y, 0) / FLOOR_HEIGHT),
        Math.max(1, floorsRef.current.length),
        0,
      );
      syncFloorLightCulling(
        rebuildFloor,
        Boolean(activeRoomIdRef.current && activeExhibitionBuilt),
      );
      syncAllPortalEntryLights(
        explorerGroup.position.x,
        explorerGroup.position.z,
        camera.position.x,
        camera.position.y,
        camera.position.z,
        cameraLookTarget.x,
        cameraLookTarget.y,
        cameraLookTarget.z,
        0,
        Boolean(museumSettingsRef.current.reducedMotion),
      );
    };

    // 8. Explicit First-Person Cabin Elevator State Machine
    let liftState: {
      doorPhase:
        | 'closed'
        | 'opening'
        | 'open'
        | 'closing'
        | 'travel_closing'
        | 'traveling';
      phase: LiftSequencePhase;
      cabinY: number;
      doorOpenAmount: number; // 0 = closed, 1 = open
      activeFloorNum: number;
      targetFloorNum: number;
      autoTravelTargetFloor: number | null;
      phaseTimer: number;
      travelDuration: number;
      travelStartY: number;
      travelTargetY: number;
    } = {
      doorPhase: 'closed',
      phase: 'idle',
      cabinY: initialFloorY,
      doorOpenAmount: 0,
      activeFloorNum: startCharState.floorNumber,
      targetFloorNum: startCharState.floorNumber,
      autoTravelTargetFloor: null,
      phaseTimer: 0,
      travelDuration: 1.6,
      travelStartY: initialFloorY,
      travelTargetY: initialFloorY,
    };

    const syncLiftReactState = () => {
      setLiftPhase(liftState.phase);
      setLiftCabinFloorNumber(liftState.activeFloorNum);
      setLiftTargetFloorNumber(liftState.targetFloorNum);
    };

    const refreshAllLiftIndicators = (
      displayedFloor: number,
      isMoving: boolean,
      directionSign: number,
    ) => {
      const safeTotalFloors = Math.max(1, floorsRef.current.length);
      const safeDisplayed = sanitizeFloorIndex(
        displayedFloor,
        safeTotalFloors,
        0,
      );
      drawLiftIndicatorCanvas(
        cabinInteriorIndCanvas,
        safeDisplayed,
        safeTotalFloors,
        isMoving,
        directionSign,
      );
      cabinInteriorIndTex.needsUpdate = true;

      liftFloorRecords.forEach((rec) => {
        drawLiftIndicatorCanvas(
          rec.indicatorCanvas,
          safeDisplayed,
          safeTotalFloors,
          isMoving,
          directionSign,
        );
        rec.indicatorTex.needsUpdate = true;
      });
    };

    const cancelActiveCameraTransition = () => {
      if (activeCameraTransitionRef.current) {
        activeCameraTransitionRef.current.kill();
        activeCameraTransitionRef.current = null;
      }
    };

    // Spawn character inside the 3D exhibition room when entering a room through its doorway or UI
    // Preserves player camera control, relative viewing direction, pitch, and movement momentum,
    // and initiates the 0.88s architectural entrance lighting & display reveal transition.
    setExplorerRoomEntryRef.current = (enteredRoomId: string) => {
      if (
        activeExhibitionBuilt &&
        activeExhibitionBuilt.roomId === enteredRoomId &&
        roomEntranceState.roomId === enteredRoomId
      ) {
        // Prevent duplicate room-entry animation triggers for the same doorway crossing
        return;
      }

      cancelActiveCameraTransition();
      const enteredRoom = roomsRef.current.find((r) => r.id === enteredRoomId);
      latchedDoorwayRef.current = null;
      syncActiveExhibitionRoom();
      if (!enteredRoom) return;

      const entryCtx =
        doorwayEntryContextRef.current &&
        doorwayEntryContextRef.current.roomId === enteredRoomId
          ? doorwayEntryContextRef.current
          : null;
      doorwayEntryContextRef.current = null;

      const roomFloorY = enteredRoom.floorNumber * FLOOR_HEIGHT;
      const entryX = entryCtx
        ? THREE.MathUtils.clamp(entryCtx.lateralOffsetX, -1.05, 1.05)
        : ROOM_INTERIOR_SPEC.spawnX;
      const entryYaw = entryCtx
        ? sanitizeYaw(Math.PI + entryCtx.relativeYawOffset, Math.PI)
        : Math.PI;
      const entryPitch = entryCtx
        ? sanitizePitch(entryCtx.preservedPitch, authoritativePitch)
        : sanitizePitch(authoritativePitch, 0.1);

      explorerGroup.position.set(
        entryX,
        roomFloorY,
        ROOM_INTERIOR_SPEC.spawnZ,
      );
      explorerGroup.rotation.set(0, entryYaw, 0);
      viewYawRef.current = entryYaw;
      authoritativeYaw = entryYaw;
      viewPitchRef.current = entryPitch;
      authoritativePitch = entryPitch;
      climbHeightOffsetRef.current = 0;
      clickToMoveTargetRef.current = null;
      walkthroughWaypointsRef.current = [];
      walkthroughLookTargetRef.current = null;
      if (walkthroughWalkingRef.current) {
        walkthroughWalkingRef.current = false;
        setWalkthroughWalking(false);
      }
      if (activeBedroomInteractionRef.current) {
        exitBedroomInteractionRef.current?.();
      }

      // Preserve walking momentum along the player's viewing direction so movement is never blocked
      if (entryCtx && entryCtx.preservedSpeed > 0.05) {
        velX = Math.sin(entryYaw) * entryCtx.preservedSpeed;
        velZ = Math.cos(entryYaw) * entryCtx.preservedSpeed;
      } else {
        velX = 0;
        velZ = 0;
      }

      // Align camera immediately and collision-safely with player's preserved yaw & pitch
      const lookDirX = Math.sin(entryYaw) * Math.cos(entryPitch);
      const lookDirY = -Math.sin(entryPitch);
      const lookDirZ = Math.cos(entryYaw) * Math.cos(entryPitch);
      const pivotY = roomFloorY + 1.65;
      if (cameraViewModeRef.current === 'first_person') {
        camera.position.set(entryX, roomFloorY + 1.66, ROOM_INTERIOR_SPEC.spawnZ);
        cameraLookTarget.set(
          entryX + lookDirX * 5.5,
          pivotY + 0.1 + lookDirY * 5.5,
          ROOM_INTERIOR_SPEC.spawnZ + lookDirZ * 5.5,
        );
      } else {
        const startDist = Math.min(
          2.05,
          THREE.MathUtils.clamp(cameraDistanceRef.current, 1.8, 6.4),
        );
        smoothedCamDist = startDist;
        const entryRoomColliders = buildRoomInteriorColliders(
          enteredRoom,
          activeExhibitionBuilt?.exhibitionStyle,
          activeExhibitionBuilt?.displayRecords.map(
            (d) => d.placement.memory,
          ) || [],
        );
        const entryCam = resolveThirdPersonCameraPosition({
          pivotX: entryX,
          pivotY,
          pivotZ: ROOM_INTERIOR_SPEC.spawnZ,
          floorBaseY: roomFloorY,
          yaw: entryYaw,
          pitch: entryPitch,
          distance: startDist,
          colliderSet: entryRoomColliders,
          shoulderHeightOffset: 0.22,
          minFloorOffset: 0.55,
          maxCeilingOffset: ROOM_INTERIOR_SPEC.height - 0.45,
        });
        smoothedCamDist = THREE.MathUtils.clamp(
          entryCam.distToPivot3D,
          0.85,
          startDist,
        );
        camera.position.set(entryCam.x, entryCam.y, entryCam.z);
        cameraLookTarget.set(entryCam.lookX, entryCam.lookY, entryCam.lookZ);
      }

      roomEntranceState = {
        active: true,
        roomId: enteredRoomId,
        elapsed: 0,
        duration: ROOM_ENTRANCE_TRANSITION_SPEC.durationSec,
        cameraSpringArmBlend: 0,
      };
      if (activeExhibitionBuilt) {
        activeExhibitionBuilt.applyEntranceAnimation(
          0,
          ROOM_ENTRANCE_TRANSITION_SPEC.durationSec,
          Boolean(museumSettingsRef.current.reducedMotion),
        );
      }

      lastProximityKeyRef.current = 'none';
      setProximityTarget(null);
      isMouseCapturedRef.current = true;
      setIsMouseCaptured(true);
    };

    // Unified Childhood Bedroom Focus Interaction Enter / Exit (saves & restores character + camera)
    exitBedroomInteractionRef.current = () => {
      const prevId = activeBedroomInteractionRef.current;
      const ctrl = activeExhibitionBuilt?.bedroomInteractions;
      if (ctrl) {
        ctrl.setScrapbookOpen(false);
        ctrl.setUnderBedActive(false);
        if (prevId === 'bedside_drawer') {
          ctrl.toggleBedsideDrawer(false);
        }
        if (prevId === 'school_bag') {
          ctrl.setSchoolBagOpen(false);
        }
        ctrl.stopCrtMedia();
        if (prevId === 'crt_computer' && ctrl.isHeadphonesWorn()) {
          ctrl.toggleHeadphonesWorn(headMesh, false);
        }
      }
      bedroomFocusTargetRef.current = null;
      pageTurnHandAnimTimerRef.current = 0;
      cricketSwingAnimTimerRef.current = 0;

      // Restore neutral character rig pose
      charBodyGroup.position.y = 0;
      charBodyGroup.rotation.set(0, 0, 0);
      headMesh.rotation.set(0, 0, 0);
      leftLeg.rotation.set(0, 0, 0);
      rightLeg.rotation.set(0, 0, 0);
      leftArm.rotation.set(0, 0, 0);
      rightArm.rotation.set(0, 0, 0);

      const saved = savedBedroomExploreStateRef.current;
      if (saved) {
        explorerGroup.position.set(saved.x, saved.y, saved.z);
        authoritativeYaw = saved.yaw;
        authoritativePitch = saved.pitch;
        viewYawRef.current = saved.yaw;
        viewPitchRef.current = saved.pitch;
        explorerGroup.rotation.y = saved.yaw;
        camera.position.set(saved.camX, saved.camY, saved.camZ);
        cameraLookTarget.set(saved.lookX, saved.lookY, saved.lookZ);
        savedBedroomExploreStateRef.current = null;
      }

      activeBedroomInteractionRef.current = null;
      setActiveBedroomInteraction(null);
      setBedroomOverlayRevision((r) => r + 1);
    };

    enterBedroomInteractionRef.current = (objectId: InteractiveObjectId3D) => {
      const ctrl: ChildhoodBedroomInteractionController | null | undefined =
        activeExhibitionBuilt?.bedroomInteractions;
      if (!ctrl) return false;
      const zone = ctrl.getZoneById(objectId);
      if (!zone) return false;

      if (!savedBedroomExploreStateRef.current) {
        savedBedroomExploreStateRef.current = {
          x: explorerGroup.position.x,
          y: explorerGroup.position.y,
          z: explorerGroup.position.z,
          yaw: authoritativeYaw,
          pitch: authoritativePitch,
          camX: camera.position.x,
          camY: camera.position.y,
          camZ: camera.position.z,
          lookX: cameraLookTarget.x,
          lookY: cameraLookTarget.y,
          lookZ: cameraLookTarget.z,
        };
      }

      releaseScenePointerLock();
      pressedKeysRef.current.clear();
      clickToMoveTargetRef.current = null;

      const focus = zone.getFocusCamera();
      bedroomFocusTargetRef.current = {
        cameraPos: new THREE.Vector3(...focus.cameraPos),
        lookAt: new THREE.Vector3(...focus.lookAt),
        pose: focus.pose,
        characterPos: focus.characterPos
          ? new THREE.Vector3(...focus.characterPos)
          : undefined,
        characterYaw: focus.characterYaw,
      };

      if (objectId === 'wooden_bed') {
        ctrl.setUnderBedActive(true);
      } else if (objectId === 'under_bed_flashlight') {
        ctrl.setUnderBedActive(true);
        ctrl.setFlashlightHeld(!ctrl.isFlashlightHeld(), headMesh);
      } else if (objectId === 'under_bed_scrapbook') {
        ctrl.setUnderBedActive(true);
        ctrl.setScrapbookOpen(true);
      } else if (objectId === 'bedside_drawer') {
        ctrl.toggleBedsideDrawer(true);
      } else if (objectId === 'crt_computer') {
        ctrl.setCrtPower(true);
      } else if (objectId === 'wired_headphones') {
        ctrl.toggleHeadphonesWorn(headMesh);
        ctrl.setCrtPower(true);
      } else if (objectId === 'wardrobe') {
        activeExhibitionBuilt?.triggerInteractiveObject?.('wardrobe');
        bedroomSfx.play('wood_creak');
      } else if (objectId === 'school_bag') {
        ctrl.setSchoolBagOpen(true);
      } else if (objectId === 'bedroom_window') {
        bedroomSfx.play('fabric_rustle');
      } else if (objectId === 'memory_radio') {
        bedroomSfx.play('radio_dial');
      } else if (objectId === 'memory_projector') {
        ctrl.toggleProjector(true);
      } else if (objectId === 'cricket_set') {
        cricketSwingAnimTimerRef.current = 0.72;
        ctrl.triggerCricketSwing();
        activeExhibitionBuilt?.triggerInteractiveObject?.('cricket_set');
      } else if (objectId === 'wall_clock_calendar') {
        bedroomSfx.play('clock_chime');
      } else {
        bedroomSfx.play('click');
      }

      const resolvedId: InteractiveObjectId3D =
        objectId === 'wired_headphones' ? 'crt_computer' : objectId;
      activeBedroomInteractionRef.current = resolvedId;
      setActiveBedroomInteraction(resolvedId);
      setBedroomOverlayRevision((r) => r + 1);
      return true;
    };

    // Reposition character cleanly into corridor just outside room doorway when returning to museum
    setExplorerCorridorExitRef.current = (exitedRoomId: string) => {
      if (activeBedroomInteractionRef.current) {
        exitBedroomInteractionRef.current?.();
      }
      cancelActiveCameraTransition();
      const exitedRoom = roomsRef.current.find((r) => r.id === exitedRoomId);
      latchedDoorwayRef.current = null;
      doorwayEntryContextRef.current = null;
      climbHeightOffsetRef.current = 0;
      clickToMoveTargetRef.current = null;
      walkthroughWaypointsRef.current = [];
      walkthroughLookTargetRef.current = null;
      if (walkthroughWalkingRef.current) {
        walkthroughWalkingRef.current = false;
        setWalkthroughWalking(false);
      }
      syncActiveExhibitionRoom();
      if (!exitedRoom) return;

      // Seed the exited room's pocket door open behind the character so exit is unobstructed and auto-closes cleanly
      for (let i = 0; i < portalRecords.length; i++) {
        const rec = portalRecords[i];
        if (rec.roomId === exitedRoom.id && rec.status === 'active') {
          rec.doorState = {
            ...rec.doorState,
            phase: 'open',
            openAmount: 1,
            closeDelayTimer: ROOM_DOOR_SPEC.closeDelaySec,
          };
          const openOffset =
            ROOM_DOOR_SPEC.panelHalfWidth + ROOM_DOOR_SPEC.panelSlideDistance;
          if (rec.leftDoorMesh) rec.leftDoorMesh.position.x = -openOffset;
          if (rec.rightDoorMesh) rec.rightDoorMesh.position.x = openOffset;
        }
      }

      const exitPose = getRoomExitCorridorPosition(
        exitedRoom.slotIndex,
        exitedRoom.floorNumber,
      );
      explorerGroup.position.set(exitPose.x, exitPose.y, exitPose.z);
      explorerGroup.rotation.set(0, exitPose.rotationY, 0);
      viewYawRef.current = exitPose.rotationY;
      authoritativeYaw = exitPose.rotationY;
      viewPitchRef.current = sanitizePitch(authoritativePitch, 0.16);
      authoritativePitch = viewPitchRef.current;
      velX = 0;
      velZ = 0;

      // Immediately resolve and snap camera in the Atrium corridor so it never sweeps through walls on exit
      const exitSlotStatuses: Record<number, RoomPortalStatus> = {
        0: 'active',
        1: 'active',
        2: 'active',
        3: 'active',
      };
      const exitDoorOpenAmounts: Record<number, number> = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
      };
      for (let i = 0; i < portalRecords.length; i++) {
        const p = portalRecords[i];
        if (p.floorNumber === exitedRoom.floorNumber) {
          exitSlotStatuses[p.slotIndex] = p.status;
          exitDoorOpenAmounts[p.slotIndex] = p.doorState.openAmount;
        }
      }
      const exitFloorColliders = buildFloorColliders({
        floorNumber: exitedRoom.floorNumber,
        slotStatuses: exitSlotStatuses,
        isLiftDoorOpen: false,
        doorOpenAmount: 0,
        roomDoorOpenAmounts: exitDoorOpenAmounts,
      });
      const exitPivotY = exitPose.y + 1.65;
      if (cameraViewModeRef.current === 'first_person') {
        const lookDirX =
          Math.sin(exitPose.rotationY) * Math.cos(authoritativePitch);
        const lookDirY = -Math.sin(authoritativePitch);
        const lookDirZ =
          Math.cos(exitPose.rotationY) * Math.cos(authoritativePitch);
        camera.position.set(exitPose.x, exitPose.y + 1.66, exitPose.z);
        cameraLookTarget.set(
          exitPose.x + lookDirX * 6.0,
          exitPose.y + 1.66 + lookDirY * 6.0,
          exitPose.z + lookDirZ * 6.0,
        );
        charBodyGroup.visible = false;
        charShadow.visible = false;
      } else {
        const exitDist = THREE.MathUtils.clamp(
          cameraDistanceRef.current,
          1.8,
          6.4,
        );
        const resolvedExitCam = resolveThirdPersonCameraPosition({
          pivotX: exitPose.x,
          pivotY: exitPivotY,
          pivotZ: exitPose.z,
          floorBaseY: exitPose.y,
          yaw: exitPose.rotationY,
          pitch: authoritativePitch,
          distance: exitDist,
          colliderSet: exitFloorColliders,
          shoulderHeightOffset: 0.25,
          minFloorOffset: 0.55,
          maxCeilingOffset: FLOOR_HEIGHT - 0.45,
        });
        smoothedCamDist = THREE.MathUtils.clamp(
          resolvedExitCam.distToPivot3D,
          0.85,
          exitDist,
        );
        camera.position.set(
          resolvedExitCam.x,
          resolvedExitCam.y,
          resolvedExitCam.z,
        );
        cameraLookTarget.set(
          resolvedExitCam.lookX,
          resolvedExitCam.lookY,
          resolvedExitCam.lookZ,
        );
        const vis = resolveCharacterVisibility({
          cameraOwner: 'third_person',
          cameraDistToPivot3D: resolvedExitCam.distToPivot3D,
        });
        charBodyGroup.visible = vis.bodyVisible;
        charShadow.visible = vis.shadowVisible;
      }

      lastProximityKeyRef.current = 'none';
      setProximityTarget(null);
      isMouseCapturedRef.current = true;
      setIsMouseCaptured(true);
    };

    // Automatic or manual request to open elevator doors smoothly
    openLiftDoorsAndBoardRef.current = (autoTargetFloor?: number) => {
      const totalFloors = Math.max(1, floorsRef.current.length);
      const charFloor = sanitizeFloorIndex(
        Math.round(explorerGroup.position.y / FLOOR_HEIGHT),
        totalFloors,
        0,
      );
      const validAutoTarget =
        typeof autoTargetFloor === 'number' && Number.isFinite(autoTargetFloor)
          ? sanitizeFloorIndex(autoTargetFloor, totalFloors, charFloor)
          : null;

      if (validAutoTarget !== null && validAutoTarget !== charFloor) {
        // External navigation request directly to destination floor
        startLiftTravelToFloorRef.current?.(validAutoTarget);
        return;
      }

      liftState.activeFloorNum = charFloor;
      liftState.targetFloorNum = charFloor;
      liftState.cabinY = charFloor * FLOOR_HEIGHT;
      liftCabinGroup.position.y = liftState.cabinY;
      liftState.doorPhase = 'opening';
      liftState.phase = 'doors_opening';
      liftState.phaseTimer = 0;
      setSelectedLiftFloorOption(null);
      syncLiftReactState();
    };

    // User selects a destination floor inside the cabin or triggers external floor navigation
    startLiftTravelToFloorRef.current = (destFloorNum: number) => {
      const totalFloors = Math.max(1, floorsRef.current.length);
      const clampedDest = sanitizeFloorIndex(destFloorNum, totalFloors, 0);
      const currentCabinFloor = sanitizeFloorIndex(
        Math.round(liftState.cabinY / FLOOR_HEIGHT),
        totalFloors,
        0,
      );

      setSelectedLiftFloorOption(clampedDest);

      if (clampedDest === currentCabinFloor) {
        // Already on this floor -> ensure doors are open and passenger can step out freely
        liftState.targetFloorNum = currentCabinFloor;
        liftState.doorPhase = 'opening';
        liftState.phase = 'doors_opening';
        liftState.phaseTimer = 0;
        syncLiftReactState();
        return;
      }

      // If initiated externally from the Feature Wall / HUD while character is out in the hall,
      // safely board the character inside the cabin so vertical travel never drags them through floor slabs.
      cancelActiveCameraTransition();
      clickToMoveTargetRef.current = null;
      walkthroughWaypointsRef.current = [];
      walkthroughLookTargetRef.current = null;
      if (
        !isCharacterInElevatorCabin(
          explorerGroup.position.x,
          explorerGroup.position.z,
        )
      ) {
        explorerGroup.position.set(0, liftState.cabinY, -9.95);
        explorerGroup.rotation.set(0, 0, 0);
        viewYawRef.current = 0;
        authoritativeYaw = 0;
        viewPitchRef.current = 0.06;
        authoritativePitch = 0.06;
        velX = 0;
        velZ = 0;
        camera.position.set(0, liftState.cabinY + 1.65, -10.35);
        cameraLookTarget.set(0, liftState.cabinY + 1.62, -5.0);
        smoothedCamDist = cameraDistanceRef.current;
      }

      liftState.targetFloorNum = clampedDest;
      liftState.travelStartY = liftState.cabinY;
      liftState.travelTargetY = clampedDest * FLOOR_HEIGHT;
      const floorsDiff = Math.max(
        1,
        Math.abs(clampedDest - currentCabinFloor),
      );
      liftState.travelDuration = Math.min(2.8, 1.25 + floorsDiff * 0.65);
      // Close doors smoothly before vertical transit
      liftState.doorPhase = 'travel_closing';
      liftState.phase = 'traveling';
      liftState.phaseTimer = 0;
      syncLiftReactState();
    };

    // Safe door open request
    exitLiftImmediatelyRef.current = () => {
      liftState.doorPhase = 'opening';
      liftState.phase = 'doors_opening';
      liftState.phaseTimer = 0;
      syncLiftReactState();
    };

    // 9. Keyboard Listeners (Simultaneous Directional Input, E to Interact, 1..9 in Lift, Escape)
    const normalizeKey = (key: string): string => key.toLowerCase();

    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'SELECT' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (document.pointerLockElement) {
          document.exitPointerLock?.();
        }
        isMouseCapturedRef.current = false;
        setIsMouseCaptured(false);
        setIsPointerLocked(false);
        if (activeBedroomInteractionRef.current) {
          exitBedroomInteractionRef.current?.();
          return;
        }
        if (liftState.doorPhase === 'travel_closing') {
          exitLiftImmediatelyRef.current?.();
        }
        return;
      }

      // Keyboard controls while focused on a Childhood Bedroom interaction
      if (activeBedroomInteractionRef.current && !isAnyModalOpenRef.current) {
        const ctrl = activeExhibitionBuiltRef.current?.bedroomInteractions;
        if (activeBedroomInteractionRef.current === 'under_bed_scrapbook' && ctrl) {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            const res = ctrl.turnScrapbookPage(1);
            if (res.turned) pageTurnHandAnimTimerRef.current = 0.55;
            setBedroomOverlayRevision((r) => r + 1);
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const res = ctrl.turnScrapbookPage(-1);
            if (res.turned) pageTurnHandAnimTimerRef.current = 0.55;
            setBedroomOverlayRevision((r) => r + 1);
            return;
          }
        }
        if (activeBedroomInteractionRef.current === 'memory_projector' && ctrl) {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            ctrl.stepProjectorSlide(1);
            setBedroomOverlayRevision((r) => r + 1);
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            ctrl.stepProjectorSlide(-1);
            setBedroomOverlayRevision((r) => r + 1);
            return;
          }
        }
        if (activeBedroomInteractionRef.current === 'cricket_set' && e.key === ' ') {
          e.preventDefault();
          cricketSwingAnimTimerRef.current = 0.72;
          ctrl?.triggerCricketSwing();
          activeExhibitionBuiltRef.current?.triggerInteractiveObject?.('cricket_set');
          return;
        }
        return;
      }

      // Allow keyboard number selection (1..9) when inside the elevator cabin
      if (
        isInsideCabinRef.current ||
        liftState.doorPhase === 'open' ||
        liftState.phase === 'awaiting_selection'
      ) {
        const num = parseInt(e.key, 10);
        if (
          !Number.isNaN(num) &&
          num >= 1 &&
          num <= floorsRef.current.length
        ) {
          startLiftTravelToFloorRef.current?.(num - 1);
          return;
        }
      }

      if (isAnyModalOpenRef.current) return;

      const k = normalizeKey(e.key);
      if (
        k === 'w' ||
        k === 'arrowup' ||
        k === 's' ||
        k === 'arrowdown' ||
        k === 'a' ||
        k === 'arrowleft' ||
        k === 'd' ||
        k === 'arrowright' ||
        k === 'shift'
      ) {
        if (
          k === 'arrowup' ||
          k === 'arrowdown' ||
          k === 'arrowleft' ||
          k === 'arrowright'
        ) {
          e.preventDefault();
        }
        cancelActiveCameraTransition();
        pressedKeysRef.current.add(k);
        syncControlVisualsFromInput(false);
      } else if (k === 'e' && !e.repeat) {
        handleTriggerProximityInteraction();
      } else if (k === 'v' && !e.repeat) {
        setCameraViewMode((prev) =>
          prev === 'third_person' ? 'first_person' : 'third_person',
        );
      } else if (k === 'm' && !e.repeat) {
        setShowRoomZoneMiniMap((prev) => !prev);
      } else if (k === 'c' && !e.repeat) {
        if (
          document.pointerLockElement === renderer.domElement ||
          isMouseCapturedRef.current
        ) {
          if (document.pointerLockElement) {
            document.exitPointerLock?.();
          }
          isMouseCapturedRef.current = false;
          setIsMouseCaptured(false);
          setIsPointerLocked(false);
        } else {
          isMouseCapturedRef.current = true;
          setIsMouseCaptured(true);
          try {
            const p = renderer.domElement.requestPointerLock?.() as unknown as
              | Promise<void>
              | undefined;
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch {
            // ignore
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = normalizeKey(e.key);
      if (pressedKeysRef.current.has(k)) {
        pressedKeysRef.current.delete(k);
        syncControlVisualsFromInput(false);
      }
    };

    const onWindowBlur = () => {
      if (pressedKeysRef.current.size > 0) {
        pressedKeysRef.current.clear();
        syncControlVisualsFromInput(false);
      }
      touchInputRef.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
      };
      isDraggingLook = false;
      hasLastPointerPos = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    // 10. Mouse Camera POV, Pointer-Lock Deltas & Accurate Raycasting on 3D Wall Panels, Lift & Rooms
    const raycaster = new THREE.Raycaster();
    const camCollisionRaycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let isDraggingLook = false;
    let dragDistance = 0;
    let hasLastPointerPos = false;
    let lastPointerPos = { x: 0, y: 0 };

    const requestScenePointerLock = () => {
      isMouseCapturedRef.current = true;
      setIsMouseCaptured(true);
      if (document.pointerLockElement !== renderer.domElement) {
        try {
          const lockResult =
            renderer.domElement.requestPointerLock?.() as unknown as
              | Promise<void>
              | undefined;
          if (lockResult && typeof lockResult.catch === 'function') {
            lockResult.catch(() => {
              // Fallback to unlocked mouse-delta capture if pointer lock is restricted
            });
          }
        } catch {
          // Ignore if restricted by sandboxed iframe
        }
      }
    };

    const releaseScenePointerLock = () => {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
      isMouseCapturedRef.current = false;
      setIsMouseCaptured(false);
      setIsPointerLocked(false);
      isDraggingLook = false;
      hasLastPointerPos = false;
      renderer.domElement.style.cursor = 'default';
    };

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      setIsPointerLocked(locked);
      if (locked) {
        isMouseCapturedRef.current = true;
        setIsMouseCaptured(true);
      } else {
        // Released via Escape key or modal open
        isMouseCapturedRef.current = false;
        setIsMouseCaptured(false);
        isDraggingLook = false;
        hasLastPointerPos = false;
        renderer.domElement.style.cursor = 'default';
      }
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    const clearWallPanelHover = () => {
      if (hoveredWallPanel) {
        const prevMat = hoveredWallPanel.bezelMesh
          .material as THREE.MeshStandardMaterial;
        prevMat.emissive.setHex(0x000000);
        prevMat.emissiveIntensity = 0;
        hoveredWallPanel.baseScale = 1.0;
        hoveredWallPanel = null;
      }
    };

    const setHoverIfChanged = (
      nextInfo: {
        title: string;
        subtitle: string;
        x: number;
        y: number;
      } | null,
    ) => {
      if (
        !nextInfo ||
        document.pointerLockElement === renderer.domElement
      ) {
        if (lastHoveredSigRef.current !== 'none') {
          lastHoveredSigRef.current = 'none';
          setHoveredInfo(null);
        }
        return;
      }
      const qx = Math.round(nextInfo.x / 6) * 6;
      const qy = Math.round(nextInfo.y / 6) * 6;
      const sig = `${nextInfo.title}::${nextInfo.subtitle}::${qx}::${qy}`;
      if (lastHoveredSigRef.current !== sig) {
        lastHoveredSigRef.current = sig;
        setHoveredInfo(nextInfo);
      }
    };

    const updateHoverFromRaycast = (
      ndcX: number,
      ndcY: number,
      tooltipX: number,
      tooltipY: number,
    ): {
      hitInteractive: boolean;
      overFeatureWallBoard: boolean;
    } => {
      if (!Number.isFinite(ndcX) || !Number.isFinite(ndcY)) {
        return { hitInteractive: false, overFeatureWallBoard: false };
      }
      pointer.set(ndcX, ndcY);
      raycaster.setFromCamera(pointer, camera);

      // Inside an active 3D Exhibition Room: raycast against 3D memory installations and exit archway (respecting solid wall occlusion)
      if (activeRoomIdRef.current && activeExhibitionBuilt) {
        clearWallPanelHover();
        hoveredPortalRoomId = null;
        hoveredRoomMemoryId = null;

        const roomHits = raycaster.intersectObjects(
          activeRoomInteractiveTargets,
          false,
        );
        const wallBlocks = raycaster.intersectObjects(
          activeExhibitionBuilt.solidWallMeshes || [],
          false,
        );
        const firstWallDist =
          wallBlocks.length > 0 ? wallBlocks[0].distance : Infinity;

        if (
          roomHits.length > 0 &&
          roomHits[0].distance <= 10.5 &&
          roomHits[0].distance <= firstWallDist + 0.45
        ) {
          const hitData = roomHits[0].object.userData;
          if (hitData.kind === 'room_interactive_object' && hitData.objectId) {
            renderer.domElement.style.cursor = 'pointer';
            setHoverIfChanged({
              title: hitData.title || 'Interactive 3D Object',
              subtitle:
                hitData.subtitle || 'Click or press [E] to interact in 3D',
              x: tooltipX,
              y: tooltipY,
            });
            return { hitInteractive: true, overFeatureWallBoard: false };
          }
          if (hitData.kind === 'room_memory_display' && hitData.memoryId) {
            const mem: Memory | undefined =
              memoriesRef.current.find((m) => m.id === hitData.memoryId) ||
              hitData.memory;
            if (mem) {
              hoveredRoomMemoryId = mem.id;
              renderer.domElement.style.cursor = 'pointer';
              setHoverIfChanged({
                title: hitData.title || mem.title,
                subtitle:
                  hitData.subtitle ||
                  `${mem.date || mem.year || 'Personal Keepsake'} · Click or press [E] to inspect`,
                x: tooltipX,
                y: tooltipY,
              });
              return { hitInteractive: true, overFeatureWallBoard: false };
            }
          }
          if (hitData.kind === 'room_interior_exit') {
            renderer.domElement.style.cursor = 'pointer';
            setHoverIfChanged({
              title: 'Exit to Museum Atrium',
              subtitle: 'Walk through archway or click to return to corridor',
              x: tooltipX,
              y: tooltipY,
            });
            return { hitInteractive: true, overFeatureWallBoard: false };
          }
        }

        renderer.domElement.style.cursor = 'default';
        setHoverIfChanged(null);
        return { hitInteractive: false, overFeatureWallBoard: false };
      }

      const activeHoverFloor = sanitizeFloorIndex(
        Math.round(
          sanitizeFiniteNumber(explorerGroup.position.y, 0) / FLOOR_HEIGHT,
        ),
        Math.max(1, floorsRef.current.length),
        0,
      );
      const floorHitboxes = atriumHitboxesByFloor.get(activeHoverFloor) || [];

      const hits = raycaster.intersectObjects(floorHitboxes, false);
      const boardHits = raycaster.intersectObjects(
        featureWallBoardHitboxes,
        false,
      );
      const overFeatureWallBoard =
        boardHits.length > 0 && boardHits[0].distance < 15.5;

      clearWallPanelHover();
      hoveredPortalRoomId = null;
      hoveredRoomMemoryId = null;

      if (hits.length > 0 && liftState.phase === 'idle') {
        const hitData = hits[0].object.userData;

        // 1. Hovered a 3D Feature Wall Panel
        if (hitData.kind === 'wall_panel') {
          const matchedPanel = wallPanelRecords.find(
            (w) =>
              w.featureId === hitData.featureId &&
              w.floorNumber === hitData.floorNumber,
          );
          if (matchedPanel) {
            hoveredWallPanel = matchedPanel;
            const mat = matchedPanel.bezelMesh
              .material as THREE.MeshStandardMaterial;
            mat.emissive.setHex(0xfde68a);
            mat.emissiveIntensity = 0.65;
            matchedPanel.baseScale = 1.04;
          }
          renderer.domElement.style.cursor = 'pointer';
          setHoverIfChanged({
            title: hitData.title,
            subtitle: hitData.subtitle,
            x: tooltipX,
            y: tooltipY,
          });
          return { hitInteractive: true, overFeatureWallBoard: true };
        }

        // 2. Hovered the Architectural Lift Entrance / Call Button
        if (hitData.kind === 'lift_call_button') {
          renderer.domElement.style.cursor = 'pointer';
          setHoverIfChanged({
            title: `Museum Elevator (Floor ${(hitData.floorNumber ?? 0) + 1})`,
            subtitle: 'Click or press [E] to enter lift',
            x: tooltipX,
            y: tooltipY,
          });
          return { hitInteractive: true, overFeatureWallBoard };
        }

        // 3. Hovered the Central Memory Discovery & Atmosphere Compass
        if (hitData.kind === 'discovery_compass' && hits[0].distance < 9.5) {
          renderer.domElement.style.cursor = 'pointer';
          setHoverIfChanged({
            title: hitData.title || 'Atrium Memory & Atmosphere Compass',
            subtitle:
              hitData.subtitle ||
              'Click or press [E] to cycle Atrium Lighting & discover a memory',
            x: tooltipX,
            y: tooltipY,
          });
          return { hitInteractive: true, overFeatureWallBoard };
        }

        // 4. Hovered a Room Portal Archway (Active rooms are entered ONLY by walking the character through the doorway)
        if (hitData.kind === 'room_portal') {
          const room = roomsRef.current.find((r) => r.id === hitData.roomId);
          if (room) {
            hoveredPortalRoomId = room.id;
            const count = memoriesRef.current.filter(
              (m) => m.roomId === room.id,
            ).length;
            if (room.status === 'empty') {
              renderer.domElement.style.cursor = 'pointer';
              setHoverIfChanged({
                title: `Empty Slot #${room.slotIndex + 1} (${room.name})`,
                subtitle: 'Click or press [E] to ＋ Create Room in this slot',
                x: tooltipX,
                y: tooltipY,
              });
              return { hitInteractive: true, overFeatureWallBoard };
            }
            renderer.domElement.style.cursor = 'default';
            setHoverIfChanged({
              title: room.name,
              subtitle:
                room.status === 'disabled'
                  ? `Disabled (${count} memories preserved)`
                  : `${count} ${count === 1 ? 'Memory' : 'Memories'} · Walk character through doorway to enter`,
              x: tooltipX,
              y: tooltipY,
            });
            return { hitInteractive: false, overFeatureWallBoard };
          }
        }
      }

      renderer.domElement.style.cursor = 'default';
      setHoverIfChanged(null);
      return { hitInteractive: false, overFeatureWallBoard };
    };

    const isInteractiveUiTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          'button, select, input, textarea, a, label, [role="dialog"], [data-ui-interactive="true"]',
        ),
      );
    };

    let lastHoverRaycastMs = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (isAnyModalOpenRef.current || isInteractiveUiTarget(e.target)) return;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      lastPointerPos = { x: e.clientX, y: e.clientY };
      hasLastPointerPos = true;
      dragDistance = 0;
      if (e.button === 0 || e.button === 2 || e.pointerType === 'touch') {
        isDraggingLook = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isAnyModalOpenRef.current) {
        renderer.domElement.style.cursor = 'default';
        hasLastPointerPos = false;
        return;
      }

      const settings = museumSettingsRef.current;
      const sens =
        Math.max(0.1, sanitizeFiniteNumber(settings.mouseSensitivity, 1.0)) *
        0.0032;
      const invertMult = settings.invertCameraY ? -1 : 1;

      // A. Native Pointer-Locked Mouse Look (uses movementX / movementY deltas + throttled reticle raycast)
      if (document.pointerLockElement === renderer.domElement) {
        const dx = THREE.MathUtils.clamp(
          sanitizeFiniteNumber(e.movementX, 0),
          -120,
          120,
        );
        const dy = THREE.MathUtils.clamp(
          sanitizeFiniteNumber(e.movementY, 0),
          -120,
          120,
        );
        if (hasEnteredRef.current) {
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            walkthroughLookTargetRef.current = null;
          }
          viewYawRef.current = sanitizeYaw(viewYawRef.current - dx * sens);
          viewPitchRef.current = sanitizePitch(
            viewPitchRef.current + dy * sens * invertMult,
          );
        }
        const nowMove = performance.now();
        if (nowMove - lastHoverRaycastMs >= 36) {
          lastHoverRaycastMs = nowMove;
          const rect = cachedCanvasRect;
          updateHoverFromRaycast(
            0,
            0,
            rect.left + rect.width * 0.5,
            rect.top + rect.height * 0.5,
          );
        }
        return;
      }

      // When hovering over interactive HUD buttons while unlocked, track pointer position without rotating the camera
      if (!isDraggingLook && isInteractiveUiTarget(e.target)) {
        lastPointerPos = { x: e.clientX, y: e.clientY };
        hasLastPointerPos = true;
        setHoverIfChanged(null);
        return;
      }

      // Compute mouse deltas (prefer movementX/movementY where supported, fallback to clientX/Y delta)
      let dx = 0;
      let dy = 0;
      if (hasLastPointerPos) {
        const rawDx =
          typeof e.movementX === 'number' && e.movementX !== 0
            ? e.movementX
            : e.clientX - lastPointerPos.x;
        const rawDy =
          typeof e.movementY === 'number' && e.movementY !== 0
            ? e.movementY
            : e.clientY - lastPointerPos.y;
        dx = THREE.MathUtils.clamp(sanitizeFiniteNumber(rawDx, 0), -85, 85);
        dy = THREE.MathUtils.clamp(sanitizeFiniteNumber(rawDy, 0), -85, 85);
      }
      lastPointerPos = { x: e.clientX, y: e.clientY };
      hasLastPointerPos = true;
      dragDistance += Math.hypot(dx, dy);

      // B. Explicit Mouse / Touch Drag Look
      if (
        isDraggingLook &&
        Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) >
          4
      ) {
        cancelActiveCameraTransition();
        walkthroughLookTargetRef.current = null;
        const dragMult = e.pointerType === 'touch' ? 1.35 : 1.15;
        viewYawRef.current = sanitizeYaw(
          viewYawRef.current - dx * sens * dragMult,
        );
        viewPitchRef.current = sanitizePitch(
          viewPitchRef.current + dy * sens * dragMult * invertMult,
        );
        renderer.domElement.style.cursor = 'grabbing';
        setHoverIfChanged(null);
        return;
      }

      // C. Throttled Raycast against Interactive 3D Wall Panels, Lift Call Buttons & Room Portals (~35Hz max)
      const nowHoverMs = performance.now();
      if (nowHoverMs - lastHoverRaycastMs >= 28) {
        lastHoverRaycastMs = nowHoverMs;
        const rect = cachedCanvasRect;
        if (rect.width > 0 && rect.height > 0) {
          const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          updateHoverFromRaycast(ndcX, ndcY, e.clientX, e.clientY);
        }
      }

      // D. Primary Mouse-Look Capture at All Times During Exploration (continuous 360° yaw & clamped pitch rotation)
      if (
        isMouseCapturedRef.current &&
        hasEnteredRef.current &&
        !characterWelcomeRef.current &&
        e.pointerType !== 'touch'
      ) {
        const fineHoverDamp =
          hoveredWallPanel && Math.hypot(dx, dy) < 3.5 ? 0.35 : 1.0;
        viewYawRef.current = sanitizeYaw(
          viewYawRef.current - dx * sens * fineHoverDamp,
        );
        viewPitchRef.current = sanitizePitch(
          viewPitchRef.current + dy * sens * fineHoverDamp * invertMult,
        );
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isInteractiveUiTarget(e.target)) {
        isDraggingLook = false;
        dragDistance = 0;
        return;
      }

      const wasDragging =
        isDraggingLook &&
        (dragDistance > 10 ||
          Math.hypot(
            e.clientX - pointerDownPos.x,
            e.clientY - pointerDownPos.y,
          ) > 6);
      isDraggingLook = false;
      dragDistance = 0;

      if (isAnyModalOpenRef.current) return;
      if (wasDragging && document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.style.cursor = 'default';
        return;
      }

      const rect = cachedCanvasRect;
      if (document.pointerLockElement === renderer.domElement) {
        pointer.set(0, 0);
      } else if (rect.width > 0 && rect.height > 0) {
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }
      raycaster.setFromCamera(pointer, camera);

      // Inside an active 3D Exhibition Room: clicking any interactive 3D object, memory display, exit arch, or floor (Click-to-Move)
      if (activeRoomIdRef.current && activeExhibitionBuilt) {
        const roomHits = raycaster.intersectObjects(
          activeRoomInteractiveTargets,
          false,
        );
        const wallBlocks = raycaster.intersectObjects(
          activeExhibitionBuilt.solidWallMeshes || [],
          false,
        );
        const firstWallDist =
          wallBlocks.length > 0 ? wallBlocks[0].distance : Infinity;

        if (
          roomHits.length > 0 &&
          roomHits[0].distance <= 9.5 &&
          roomHits[0].distance <= firstWallDist + 0.45
        ) {
          const hitData = roomHits[0].object.userData;
          if (hitData.kind === 'room_interactive_object' && hitData.objectId) {
            const oid = hitData.objectId as InteractiveObjectId3D;
            if (enterBedroomInteractionRef.current?.(oid)) {
              return;
            }
            const res = activeExhibitionBuilt.triggerInteractiveObject?.(oid);
            if (res) {
              if (typeof res.climbTargetY === 'number') {
                climbHeightOffsetRef.current = res.climbTargetY;
                setActiveSpaceId(res.spaceId);
              }
              setTechBuddySpeechText(res.actionMessage);
              setShowRoomGuideBubble(true);
              setLastTriggeredObjectFeedback({
                objectId: res.objectId,
                title: res.title,
                actionMessage: res.actionMessage,
                linkedMemory: res.linkedMemory,
              });
              if (res.objectId === 'bicycle') {
                openStationExperienceRef.current?.('bicycle');
              } else if (res.objectId === 'treehouse_ladder') {
                openStationExperienceRef.current?.('treehouse');
              } else if (res.objectId === 'bedroom_tv') {
                openStationExperienceRef.current?.('cinema');
              } else if (res.objectId === 'tyre_swing') {
                openStationExperienceRef.current?.('garden');
              }
            }
            return;
          }
          if (hitData.kind === 'room_memory_display' && hitData.memoryId) {
            const mem: Memory | undefined =
              memoriesRef.current.find((m) => m.id === hitData.memoryId) ||
              hitData.memory;
            if (mem) {
              releaseScenePointerLock();
              onSelectMemoryRef.current(mem);
              return;
            }
          }
          if (hitData.kind === 'room_interior_exit') {
            releaseScenePointerLock();
            onSelectRoomRef.current(null);
            return;
          }
        }

        // Click-to-Move on the room floor when clicking an open floor area
        if (
          wallBlocks.length > 0 &&
          wallBlocks[0].point &&
          Math.abs(wallBlocks[0].point.y - explorerGroup.position.y) < 0.45
        ) {
          const pt = wallBlocks[0].point;
          const clampedX = THREE.MathUtils.clamp(pt.x, -5.2, 5.2);
          const clampedZ = THREE.MathUtils.clamp(pt.z, -3.5, 3.6);
          clickToMoveTargetRef.current = { x: clampedX, z: clampedZ };
          return;
        }
      } else {
        const activeClickFloor = sanitizeFloorIndex(
          Math.round(
            sanitizeFiniteNumber(explorerGroup.position.y, 0) / FLOOR_HEIGHT,
          ),
          Math.max(1, floorsRef.current.length),
          0,
        );
        const floorHitboxes =
          atriumHitboxesByFloor.get(activeClickFloor) || [];

        const hits = raycaster.intersectObjects(floorHitboxes, false);
        if (hits.length > 0) {
          const hitData = hits[0].object.userData;

          if (hitData.kind === 'wall_panel' && hitData.featureId) {
            releaseScenePointerLock();
            onSelectWallFeatureRef.current(hitData.featureId as WallFeatureId);
            return;
          }

          if (hitData.kind === 'lift_call_button') {
            releaseScenePointerLock();
            openLiftDoorsAndBoardRef.current?.();
            return;
          }

          if (hitData.kind === 'discovery_compass' && hits[0].distance < 9.5) {
            if (triggerInteractAnimationRef.current) {
              triggerInteractAnimationRef.current();
            }
            handleCycleAtriumAtmosphereAndDiscover();
            return;
          }

          // Note: Active rooms are NEVER entered via cursor click — only empty slots can open the Create Room modal on click.
          if (hitData.kind === 'room_portal') {
            const { roomId, floorId, slotIndex, status } = hitData;
            const room = roomsRef.current.find((r) => r.id === roomId);
            if (status === 'empty' && room) {
              releaseScenePointerLock();
              onOpenCreateRoomInSlotRef.current(floorId, slotIndex, room);
              return;
            }
          }
        }
      }

      // Clicking the 3D scene on desktop re-enables mouse capture and requests pointer lock
      if (
        hasEnteredRef.current &&
        e.button === 0 &&
        e.pointerType !== 'touch'
      ) {
        requestScenePointerLock();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (isAnyModalOpenRef.current || isInteractiveUiTarget(e.target)) return;
      if (!hasEnteredRef.current) return;
      const step = Math.sign(e.deltaY) * 0.35;
      if (cameraViewModeRef.current === 'first_person' && step > 0) {
        cameraDistanceRef.current = 2.1;
        setCameraViewMode('third_person');
        return;
      }
      const nextDist = THREE.MathUtils.clamp(
        cameraDistanceRef.current + step,
        1.8,
        6.4,
      );
      cameraDistanceRef.current = nextDist;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    domElem.addEventListener('pointerup', onPointerUp);
    domElem.addEventListener('wheel', onWheel, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth || window.innerWidth || 800);
      const h = Math.max(
        1,
        container.clientHeight || window.innerHeight || 600,
      );
      cachedViewportW = w;
      cachedViewportH = h;
      const nextAspect = w / h;
      const nextFov = computeResponsiveCameraFov(nextAspect, 50);
      if (Math.abs(camera.fov - nextFov) > 0.05) {
        camera.fov = nextFov;
      }
      camera.aspect = nextAspect;
      camera.updateProjectionMatrix();
      const nextPxRatio = computeAdaptivePixelRatio();
      renderer.setPixelRatio(nextPxRatio);
      renderer.setSize(w, h);
      if (composer) {
        composer.setPixelRatio(nextPxRatio);
        composer.setSize(w, h);
        bloomPass?.setSize(w, h);
      }
      syncCanvasRect();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', syncCanvasRect, { passive: true });
    let containerResizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      containerResizeObserver = new ResizeObserver(() => onResize());
      containerResizeObserver.observe(container);
    }

    // 11. Physics, Single Authoritative Yaw, Normalized Diagonal Movement, Lift Cabin & Render Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;
    let isContextLostLocal = false;
    let isTabHidden = typeof document !== 'undefined' && document.hidden;
    let velX = 0;
    let velZ = 0;
    // Single authoritative horizontal yaw value shared by both camera orientation and character facing direction
    let authoritativeYaw = sanitizeYaw(viewYawRef.current, Math.PI);
    let authoritativePitch = sanitizePitch(viewPitchRef.current, 0.18);
    let walkCycle = 0;
    let smoothedCamDist = cameraDistanceRef.current;
    let previousCameraOwner: CameraControllerOwner = 'intro';
    let lastStateEmitTime = 0;
    let lastCulledFloorNum = -1;
    let lastCulledInRoom = false;
    let perfFrameCounter = 0;
    let cachedCamRayState: {
      px: number;
      py: number;
      pz: number;
      yaw: number;
      pitch: number;
      maxDist: number;
      inRoom: boolean;
      resultDist: number;
    } | null = null;
    let cachedCamFloorColliders: {
      source: FloorColliderSet;
      heightBucket: number;
      colliders: FloorColliderSet;
    } | null = null;
    let lastMoteUpdateMs = 0;
    const _targetFogColor = new THREE.Color(0xf3ebdd);
    const _targetSunColor = new THREE.Color(0xfff5e4);

    let softwareGlMinFrameMs = getSoftwareGlFrameIntervalMs(
      isSoftwareGl,
      qualityConfig.profileId,
    );
    let lastRenderedFrameMs = 0;

    const applyRuntimeGraphicsProfile = (nextProfileId: GraphicsProfileId) => {
      qualityConfig = graphicsMonitor.currentConfig;
      softwareGlMinFrameMs = getSoftwareGlFrameIntervalMs(
        isSoftwareGl,
        qualityConfig.profileId,
      );
      const nextPx = computeAdaptivePixelRatio();
      renderer.setPixelRatio(nextPx);
      renderer.setSize(cachedViewportW, cachedViewportH);
      renderer.shadowMap.enabled = qualityConfig.enableShadows;
      sunKeyLight.castShadow = qualityConfig.enableShadows;
      sunKeyLight.shadow.radius = qualityConfig.shadowRadius;
      if (
        sunKeyLight.shadow.mapSize.width !== qualityConfig.shadowMapSize ||
        sunKeyLight.shadow.mapSize.height !== qualityConfig.shadowMapSize
      ) {
        if (sunKeyLight.shadow.map) {
          sunKeyLight.shadow.map.dispose();
          sunKeyLight.shadow.map = null;
        }
        sunKeyLight.shadow.mapSize.set(
          qualityConfig.shadowMapSize,
          qualityConfig.shadowMapSize,
        );
      }
      renderer.shadowMap.needsUpdate = qualityConfig.enableShadows;
      shadowDirtyFrames = 2;
      // Performance Patch V1: keep animated ambient particles off on desktop.
      // They remain available in source and can be re-enabled after profiling.
      const showMotes =
        !isSoftwareGl &&
        !qualityConfig.profileId?.startsWith('desktop_') &&
        qualityConfig.profileId !== 'mobile_performance';
      atriumMotesPoints.visible = showMotes && !activeRoomIdRef.current;
      torsoMesh.castShadow = qualityConfig.enableShadows;
      coatSkirtMesh.castShadow = qualityConfig.enableShadows;
      satchelBag.castShadow = qualityConfig.enableShadows;
      headMesh.castShadow = qualityConfig.enableShadows;
      syncFloorLightCulling(
        lastCulledFloorNum >= 0 ? lastCulledFloorNum : startCharState.floorNumber,
        lastCulledInRoom,
      );
      if (typeof window !== 'undefined') {
        (window as unknown as { __MEMORA_PERF_STATS__?: unknown }).__MEMORA_PERF_STATS__ = {
          profileId: nextProfileId,
          gpuTier: detectedHardware.gpuTier,
          isMobileDevice: detectedHardware.isMobileDevice,
          isSoftwareGl,
          estimatedFps: graphicsMonitor.estimatedFps,
          avgFrameMs: Number(graphicsMonitor.averageFrameMs.toFixed(2)),
          pixelRatio: renderer.getPixelRatio(),
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        };
      }
    };

    if (
      isSoftwareGl ||
      qualityConfig.profileId?.startsWith('desktop_') ||
      qualityConfig.profileId === 'mobile_performance'
    ) {
      // Performance Patch V1: disable animated dust/motes for all desktop profiles.
      atriumMotesPoints.visible = false;
    }

    const scheduleNextFrame = (cb: FrameRequestCallback) => {
      frameId = requestAnimationFrame(cb);
    };

    let hasRenderedInitialFrame = false;

    const resumeRenderLoop = () => {
      if (isDisposed || isContextLostLocal || isTabHidden || pauseRenderingRef.current) {
        return;
      }
      clock.getDelta();
      if (!frameId) {
        frameId = requestAnimationFrame(tick);
      }
    };
    resumeRenderLoopRef.current = resumeRenderLoop;

    const onVisibilityChange = () => {
      isTabHidden = document.hidden;
      if (isTabHidden) {
        cancelActiveCameraTransition();
        pressedKeysRef.current.clear();
        touchInputRef.current = {
          forward: false,
          backward: false,
          left: false,
          right: false,
        };
      } else {
        resumeRenderLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      isContextLostLocal = true;
      setWebglContextLost(true);
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const onContextRestored = () => {
      isContextLostLocal = false;
      setWebglContextLost(false);
      resumeRenderLoop();
    };

    domElem.addEventListener('webglcontextlost', onContextLost, false);
    domElem.addEventListener('webglcontextrestored', onContextRestored, false);

    function tick() {
      if (isDisposed || isContextLostLocal) return;
      if (isTabHidden || (pauseRenderingRef.current && hasRenderedInitialFrame)) {
        frameId = 0;
        return;
      }

      const nowFrameMs = performance.now();
      if (
        softwareGlMinFrameMs > 0 &&
        lastRenderedFrameMs > 0 &&
        nowFrameMs - lastRenderedFrameMs < softwareGlMinFrameMs
      ) {
        if (!isDisposed && !isContextLostLocal) {
          scheduleNextFrame(tick);
        }
        return;
      }
      lastRenderedFrameMs = nowFrameMs;
      hasRenderedInitialFrame = true;

      try {
        const rawDelta = clock.getDelta();
        const delta = Math.min(
          Math.max(0.001, sanitizeFiniteNumber(rawDelta, 0.016)),
          MAX_FRAME_DELTA,
        );
        const adaptedProfile = graphicsMonitor.recordFrame(
          rawDelta * 1000,
          nowFrameMs,
        );
        if (adaptedProfile) {
          applyRuntimeGraphicsProfile(adaptedProfile);
        }

        const elapsed = sanitizeFiniteNumber(clock.getElapsedTime(), 0);
        const reducedMotion = Boolean(museumSettingsRef.current.reducedMotion);
        const totalFloors = Math.max(1, floorsRef.current.length);
        const inActiveRoom3D = Boolean(
          activeRoomIdRef.current && activeExhibitionBuilt,
        );

        if (!inActiveRoom3D) {
          // Smoothly interpolate Atrium studio lighting mood presets only while in Atrium
          const mood = atriumLightingMoodRef.current;
          const moodHemiTarget =
            mood === 'daylight_salon'
              ? 1.02
              : mood === 'evening_nocturne'
                ? 0.66
                : 0.84;
          const moodSunTarget =
            mood === 'daylight_salon'
              ? 1.62
              : mood === 'evening_nocturne'
                ? 0.96
                : 1.42;
          const moodRimTarget =
            mood === 'daylight_salon'
              ? 0.54
              : mood === 'evening_nocturne'
                ? 0.34
                : 0.44;
          const moodBounceTarget =
            mood === 'daylight_salon'
              ? 0.54
              : mood === 'evening_nocturne'
                ? 0.36
                : 0.48;
          _targetFogColor.setHex(
            mood === 'daylight_salon'
              ? 0xf7f2e8
              : mood === 'evening_nocturne'
                ? 0xe2d5c1
                : 0xf3ebdd,
          );
          _targetSunColor.setHex(
            mood === 'daylight_salon'
              ? 0xfffaf0
              : mood === 'evening_nocturne'
                ? 0xffdcb0
                : 0xfff5e4,
          );
          const lightLerp = Math.min(1, delta * 3.5);
          hemiLight.intensity = THREE.MathUtils.lerp(
            hemiLight.intensity,
            moodHemiTarget,
            lightLerp,
          );
          sunKeyLight.intensity = THREE.MathUtils.lerp(
            sunKeyLight.intensity,
            moodSunTarget,
            lightLerp,
          );
          sunKeyLight.color.lerp(_targetSunColor, lightLerp);
          rimFillLight.intensity = THREE.MathUtils.lerp(
            rimFillLight.intensity,
            moodRimTarget,
            lightLerp,
          );
          atriumBounceLight.intensity = THREE.MathUtils.lerp(
            atriumBounceLight.intensity,
            moodBounceTarget,
            lightLerp,
          );
          sceneFog.color.lerp(_targetFogColor, lightLerp);

          if (!reducedMotion) {
            ringOuter.rotation.y = elapsed * 0.25;
            ringMiddle.rotation.z = elapsed * 0.32;
            innerCore.position.y = Math.sin(elapsed * 1.5) * 0.05;

            // Animate sparse lightwell dust motes gently rising and swaying (~20Hz buffer upload throttle)
            if (
              atriumMotesPoints.visible &&
              nowFrameMs - lastMoteUpdateMs >= 48
            ) {
              lastMoteUpdateMs = nowFrameMs;
              const posAttr = moteGeo.getAttribute(
                'position',
              ) as THREE.BufferAttribute;
              const activeShaftH = totalFloors * FLOOR_HEIGHT - 0.8;
              for (let i = 0; i < MOTE_COUNT; i++) {
                const base = moteBaseCoords[i];
                const swayX = Math.sin(elapsed * 0.42 + base.phase) * 0.14;
                const swayZ = Math.cos(elapsed * 0.36 + base.phase) * 0.14;
                const cycledY =
                  0.6 +
                  ((base.y + elapsed * base.speed) % Math.max(4, activeShaftH));
                posAttr.setXYZ(i, base.x + swayX, cycledY, base.z + swayZ);
              }
              posAttr.needsUpdate = true;
            }

            // Subtle rotation & floating motion on decorative pedestal artifacts inside active room alcoves
            for (let i = 0; i < portalRecords.length; i++) {
              const art = portalRecords[i].artifactMesh;
              if (art) {
                art.rotation.y = elapsed * 0.35 + i * 0.9;
                art.position.y = 0.98 + Math.sin(elapsed * 1.6 + i) * 0.025;
              }
            }
          }

          // Smoothly animate 3D Wall Panel hover scales
          for (let wIdx = 0; wIdx < wallPanelRecords.length; wIdx++) {
            const wp = wallPanelRecords[wIdx];
            if (Math.abs(wp.cardGroup.scale.x - wp.baseScale) > 0.001) {
              const s = THREE.MathUtils.lerp(
                wp.cardGroup.scale.x,
                wp.baseScale,
                Math.min(1, delta * 14),
              );
              wp.cardGroup.scale.setScalar(s);
            }
          }
        }

        // A. Automatic Architectural Elevator & Intelligent Door State Machine
        // States: 'closed' | 'opening' | 'open' | 'closing' | 'travel_closing' | 'traveling'
        const charX = explorerGroup.position.x;
        const charZ = explorerGroup.position.z;
        const charY = explorerGroup.position.y;
        const activeFloorNum = sanitizeFloorIndex(
          Math.round(
            sanitizeFiniteNumber(charY, 0) / FLOOR_HEIGHT,
          ),
          totalFloors,
          0,
        );

        if (
          activeFloorNum !== lastCulledFloorNum ||
          inActiveRoom3D !== lastCulledInRoom
        ) {
          lastCulledFloorNum = activeFloorNum;
          lastCulledInRoom = inActiveRoom3D;
          syncFloorLightCulling(activeFloorNum, inActiveRoom3D);
        }

        // Authoritative elevator proximity zone checks
        const isNearElevatorEntrance = isCharacterInElevatorApproachZone(charX, charZ);
        const isCrossingElevatorDoorway = isCharacterInElevatorDoorway(charX, charZ);
        const isInsideElevatorCabin = isCharacterInElevatorCabin(charX, charZ);

        // Update React state for cabin floor panel
        if (isInsideCabinRef.current !== isInsideElevatorCabin) {
          isInsideCabinRef.current = isInsideElevatorCabin;
          setIsInsideCabin(isInsideElevatorCabin);
        }

        const isElevatorProximityActive =
          !inActiveRoom3D &&
          hasEnteredRef.current &&
          !characterWelcomeRef.current &&
          !isAnyModalOpenRef.current &&
          (isNearElevatorEntrance || isCrossingElevatorDoorway || isInsideElevatorCabin);

        const isCabinAtActiveFloor =
          Math.abs(liftState.cabinY - activeFloorNum * FLOOR_HEIGHT) < 0.25;

        if (liftState.doorPhase === 'travel_closing') {
          // Passenger selected a destination floor; doors are smoothly closing before travel
          liftState.phaseTimer += delta;

          // Safety anti-pinch: if passenger steps into doorway threshold, reopen immediately
          if (isCrossingElevatorDoorway) {
            liftState.doorPhase = 'opening';
            liftState.phase = 'doors_opening';
            liftState.phaseTimer = 0;
            syncLiftReactState();
          } else {
            liftState.doorOpenAmount = Math.max(
              0,
              liftState.doorOpenAmount - delta * 2.5,
            );
            if (liftState.doorOpenAmount <= 0) {
              liftState.doorOpenAmount = 0;
              liftState.doorPhase = 'traveling';
              liftState.phase = 'traveling';
              liftState.phaseTimer = 0;
              liftState.travelStartY = liftState.cabinY;
              liftState.travelTargetY = liftState.targetFloorNum * FLOOR_HEIGHT;
              const floorsDiff = Math.max(
                1,
                Math.abs(liftState.targetFloorNum - liftState.activeFloorNum),
              );
              liftState.travelDuration = Math.min(2.8, 1.25 + floorsDiff * 0.65);
              refreshAllLiftIndicators(
                liftState.activeFloorNum,
                true,
                liftState.travelTargetY >= liftState.travelStartY ? 1 : -1,
              );
              syncLiftReactState();
            }
          }
        } else if (liftState.doorPhase === 'traveling') {
          // Vertical cabin transit between floors with synchronized character rising/descending
          liftState.phaseTimer += delta;
          const safeDuration = Math.max(0.5, liftState.travelDuration);
          const rawT = Math.min(1, liftState.phaseTimer / safeDuration);
          const easedT =
            rawT < 0.5
              ? 4 * rawT * rawT * rawT
              : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

          const prevCabinY = liftState.cabinY;
          liftState.cabinY = THREE.MathUtils.lerp(
            liftState.travelStartY,
            liftState.travelTargetY,
            easedT,
          );
          const deltaCabinY = liftState.cabinY - prevCabinY;
          liftCabinGroup.position.y = liftState.cabinY;

          // Passenger rises or descends with the cabin smoothly (unrestricted inside cabin)
          explorerGroup.position.y += deltaCabinY;

          // Cabin interior lighting cues during vertical travel
          cabinLight.intensity = 1.9 + Math.sin(elapsed * 9) * 0.3;
          cabinStripMat.emissiveIntensity =
            0.85 + Math.sin(elapsed * 11) * 0.35;

          const passingFloor = sanitizeFloorIndex(
            Math.round(liftState.cabinY / FLOOR_HEIGHT),
            totalFloors,
            0,
          );
          if (passingFloor !== liftState.activeFloorNum) {
            liftState.activeFloorNum = passingFloor;
            setLiftCabinFloorNumber(passingFloor);
            refreshAllLiftIndicators(
              passingFloor,
              true,
              liftState.travelTargetY >= liftState.travelStartY ? 1 : -1,
            );
          }

          if (rawT >= 1) {
            // Arrived at destination floor landing!
            liftState.cabinY = liftState.travelTargetY;
            liftCabinGroup.position.y = liftState.cabinY;
            explorerGroup.position.y = liftState.travelTargetY;
            liftState.activeFloorNum = sanitizeFloorIndex(
              liftState.targetFloorNum,
              totalFloors,
              0,
            );
            cabinLight.intensity = 2.0;
            cabinStripMat.emissiveIntensity = 0.85;
            refreshAllLiftIndicators(liftState.activeFloorNum, false, 1);

            // Automatically open doors upon arrival at destination floor and align passenger toward hall (+Z)
            liftState.doorPhase = 'opening';
            liftState.phase = 'doors_opening';
            liftState.phaseTimer = 0;
            viewYawRef.current = 0;
            authoritativeYaw = 0;
            viewPitchRef.current = sanitizePitch(authoritativePitch, 0.08);
            authoritativePitch = viewPitchRef.current;
            explorerGroup.rotation.set(0, 0, 0);
            smoothedCamDist = Math.min(1.6, cameraDistanceRef.current);
            setSelectedLiftFloorOption(null);
            syncLiftReactState();

            const arrivedFloorObj = floorsRef.current.find(
              (f) => f.floorNumber === liftState.activeFloorNum,
            );
            onEmitTipRef.current?.(
              `arrived-floor-${liftState.activeFloorNum}`,
              `Arrived at ${arrivedFloorObj?.name || `Floor ${liftState.activeFloorNum + 1}`}`,
              'Walk out into the gallery corridor to explore.',
              'important',
            );
          }
        } else if (isCabinAtActiveFloor) {
          liftState.activeFloorNum = activeFloorNum;

          // Intelligent automatic door state transitions based on character proximity:
          // CLOSED -> OPENING -> OPEN -> CLOSING -> CLOSED
          if (isElevatorProximityActive) {
            // Character approached elevator, is in doorway, or inside cabin -> open doors
            if (liftState.doorPhase === 'closed' || liftState.doorPhase === 'closing') {
              liftState.doorPhase = 'opening';
              liftState.phase = 'doors_opening';
              liftState.phaseTimer = 0;
              syncLiftReactState();
            }
          } else {
            // Character has left the proximity area (walked away into the corridor) -> close doors
            if (liftState.doorPhase === 'open' || liftState.doorPhase === 'opening') {
              liftState.doorPhase = 'closing';
              liftState.phase = 'doors_closing';
              liftState.phaseTimer = 0;
              syncLiftReactState();
            }
          }

          // Advance door open/close animation
          if (liftState.doorPhase === 'opening') {
            liftState.doorOpenAmount = Math.min(
              1,
              liftState.doorOpenAmount + delta * 2.5,
            );
            if (liftState.doorOpenAmount >= 1) {
              liftState.doorOpenAmount = 1;
              liftState.doorPhase = 'open';
              liftState.phase = 'open';
              liftState.phaseTimer = 0;
              syncLiftReactState();
            }
          } else if (liftState.doorPhase === 'closing') {
            liftState.doorOpenAmount = Math.max(
              0,
              liftState.doorOpenAmount - delta * 2.0,
            );
            if (liftState.doorOpenAmount <= 0) {
              liftState.doorOpenAmount = 0;
              liftState.doorPhase = 'closed';
              liftState.phase = 'idle';
              liftState.phaseTimer = 0;
              syncLiftReactState();
            }
          } else if (liftState.doorPhase === 'open') {
            liftState.doorOpenAmount = 1;
          } else if (liftState.doorPhase === 'closed') {
            liftState.doorOpenAmount = 0;
          }
        }

        // Synchronize both Cabin Doors and Floor Landing Doors
        cabinLeftDoor.position.x = -0.74 - liftState.doorOpenAmount * 1.32;
        cabinRightDoor.position.x = 0.74 + liftState.doorOpenAmount * 1.32;

        liftFloorRecords.forEach((rec) => {
          const isCabinHere =
            Math.abs(liftState.cabinY - rec.floorNumber * FLOOR_HEIGHT) < 0.25;
          const openAmt = isCabinHere ? liftState.doorOpenAmount : 0;
          rec.leftDoor.position.x = -0.74 - openAmt * 1.32;
          rec.rightDoor.position.x = 0.74 + openAmt * 1.32;
        });

        // A2. Independent Normal Room Entrance Pocket Doors State Machine
        // Completely separate from elevator doors; supports doorway-aware detection,
        // smooth mid-motion reversal, anti-pinch hold, and floor isolation.
        const roomDoorOpenAmounts: Record<number, number> = {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
        };
        const isRoomDoorProximityEnabled =
          !inActiveRoom3D &&
          hasEnteredRef.current &&
          !characterWelcomeRef.current &&
          !isAnyModalOpenRef.current &&
          liftState.phase !== 'traveling';
        for (let pIdx = 0; pIdx < portalRecords.length; pIdx++) {
          const p = portalRecords[pIdx];
          p.doorState = stepRoomDoorState(p.doorState, {
            playerX: charX,
            playerZ: charZ,
            activeFloorNumber: activeFloorNum,
            delta,
            enabled: isRoomDoorProximityEnabled,
            reducedMotion,
          });
          if (p.floorNumber === activeFloorNum) {
            roomDoorOpenAmounts[p.slotIndex] =
              p.status === 'active' ? p.doorState.openAmount : 0;
          }
          if (p.leftDoorMesh && p.rightDoorMesh) {
            const slideOffset =
              ROOM_DOOR_SPEC.panelHalfWidth +
              p.doorState.openAmount * ROOM_DOOR_SPEC.panelSlideDistance;
            p.leftDoorMesh.position.x = -slideOffset;
            p.rightDoorMesh.position.x = slideOffset;
          }
        }

        // B. Authoritative Yaw, Clamped Pitch & Explorer Character Movement
        // Note: Character movement operates completely independently from elevator door operations!
        const movementBlocked =
          isAnyModalOpenRef.current ||
          (tutorialActiveRef.current &&
            tutorialTargetRef.current !== 'movement_controls');

        const keys = pressedKeysRef.current;
        const touch = touchInputRef.current;
        const isForward =
          keys.has('w') || keys.has('arrowup') || touch.forward;
        const isBackward =
          keys.has('s') || keys.has('arrowdown') || touch.backward;
        const isLeft = keys.has('a') || keys.has('arrowleft') || touch.left;
        const isRight = keys.has('d') || keys.has('arrowright') || touch.right;

        const forwardAxis = (isForward ? 1 : 0) - (isBackward ? 1 : 0);
        const rightAxis = (isRight ? 1 : 0) - (isLeft ? 1 : 0);

        charCurrentPosRef.current = {
          x: explorerGroup.position.x,
          z: explorerGroup.position.z,
        };

        // Guided Walkthrough smooth camera focal alignment (yields immediately to manual mouse or WASD input)
        if (
          inActiveRoom3D &&
          walkthroughLookTargetRef.current &&
          forwardAxis === 0 &&
          rightAxis === 0
        ) {
          const wtLook = walkthroughLookTargetRef.current;
          const desiredYaw = Math.atan2(
            wtLook.focusX - explorerGroup.position.x,
            wtLook.focusZ - explorerGroup.position.z,
          );
          const wtAlpha = reducedMotion ? 1 : 1 - Math.exp(-4.8 * delta);
          const yawDiff = shortestAngleDiff(viewYawRef.current, desiredYaw);
          const pitchDiff = wtLook.targetPitch - viewPitchRef.current;
          viewYawRef.current = sanitizeYaw(
            viewYawRef.current + yawDiff * wtAlpha,
            viewYawRef.current,
          );
          viewPitchRef.current = sanitizePitch(
            viewPitchRef.current + pitchDiff * wtAlpha,
            0.12,
          );
          if (
            !clickToMoveTargetRef.current &&
            Math.abs(yawDiff) < 0.015 &&
            Math.abs(pitchDiff) < 0.015
          ) {
            walkthroughLookTargetRef.current = null;
          }
        }

        // Frame-rate-independent, high-responsiveness update of the single authoritative yaw & clamped pitch
        const lookAlpha = reducedMotion ? 1 : 1 - Math.exp(-32 * delta);
        viewYawRef.current = sanitizeYaw(viewYawRef.current, authoritativeYaw);
        const prevAuthoritativeYaw = authoritativeYaw;
        authoritativeYaw = sanitizeYaw(
          authoritativeYaw +
            shortestAngleDiff(authoritativeYaw, viewYawRef.current) * lookAlpha,
          0,
        );
        const turnRateYaw = shortestAngleDiff(
          prevAuthoritativeYaw,
          authoritativeYaw,
        );
        viewPitchRef.current = sanitizePitch(viewPitchRef.current, 0.16);
        authoritativePitch = sanitizePitch(
          THREE.MathUtils.lerp(
            authoritativePitch,
            viewPitchRef.current,
            lookAlpha,
          ),
          0.16,
        );

        // Keep character facing the horizontal camera viewing direction at all times
        if (characterWelcomeRef.current) {
          explorerGroup.position.set(0, 0, 4.8);
          explorerGroup.rotation.set(0, 0, 0);
          charBodyGroup.rotation.set(0, 0, 0);
        } else {
          explorerGroup.rotation.set(0, authoritativeYaw, 0);
        }

        const isSprinting = keys.has('shift');
        const maxSpeed = isSprinting ? 8.6 : 6.0;
        let targetVelX = 0;
        let targetVelZ = 0;

        if (!movementBlocked && (forwardAxis !== 0 || rightAxis !== 0)) {
          // Manual WASD / Arrow movement immediately cancels any active Click-to-Move or Walkthrough path
          clickToMoveTargetRef.current = null;
          walkthroughWaypointsRef.current = [];
          walkthroughLookTargetRef.current = null;
          if (walkthroughWalkingRef.current) {
            walkthroughWalkingRef.current = false;
            setWalkthroughWalking(false);
          }
          // Normalize combined input vector so diagonal movement is never faster than straight movement
          const inputLen = Math.hypot(forwardAxis, rightAxis);
          const normF = forwardAxis / inputLen;
          const normR = rightAxis / inputLen;

          // Forward vector along authoritativeYaw: (sin(yaw), cos(yaw))
          // Right vector perpendicular to authoritativeYaw: (-cos(yaw), sin(yaw))
          const forwardDirX = Math.sin(authoritativeYaw);
          const forwardDirZ = Math.cos(authoritativeYaw);
          const rightDirX = -Math.cos(authoritativeYaw);
          const rightDirZ = Math.sin(authoritativeYaw);

          const worldDirX = forwardDirX * normF + rightDirX * normR;
          const worldDirZ = forwardDirZ * normF + rightDirZ * normR;

          targetVelX = worldDirX * maxSpeed;
          targetVelZ = worldDirZ * maxSpeed;
        } else if (
          !movementBlocked &&
          inActiveRoom3D &&
          clickToMoveTargetRef.current
        ) {
          const dx = clickToMoveTargetRef.current.x - explorerGroup.position.x;
          const dz = clickToMoveTargetRef.current.z - explorerGroup.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.16) {
            const clickSpeed = Math.min(maxSpeed * 0.72, Math.max(1.85, dist * 3.8));
            targetVelX = (dx / dist) * clickSpeed;
            targetVelZ = (dz / dist) * clickSpeed;
          } else if (walkthroughWaypointsRef.current.length > 0) {
            const nextWp = walkthroughWaypointsRef.current.shift()!;
            clickToMoveTargetRef.current = nextWp;
          } else {
            clickToMoveTargetRef.current = null;
            if (walkthroughWalkingRef.current) {
              walkthroughWalkingRef.current = false;
              setWalkthroughWalking(false);
            }
          }
        }

        const accelRate = 1 - Math.exp(-16 * delta);
        velX = sanitizeFiniteNumber(
          THREE.MathUtils.lerp(velX, targetVelX, accelRate),
          0,
        );
        velZ = sanitizeFiniteNumber(
          THREE.MathUtils.lerp(velZ, targetVelZ, accelRate),
          0,
        );
        const currentSpeed = Math.hypot(velX, velZ);

        // Smooth torso forward lean & banking into turns + subtle head turn (Idle / Walk / Run / Turn states)
        if (!characterWelcomeRef.current) {
          const speedRatio = Math.min(1.35, currentSpeed / 6.0);
          const targetLeanX = reducedMotion
            ? 0
            : forwardAxis >= 0
              ? speedRatio * 0.065
              : -speedRatio * 0.04;
          const targetBankZ = reducedMotion
            ? 0
            : THREE.MathUtils.clamp(
                -rightAxis * 0.045 - turnRateYaw * 1.4,
                -0.12,
                0.12,
              );
          const targetHeadYaw = reducedMotion
            ? 0
            : THREE.MathUtils.clamp(
                -rightAxis * 0.18 + turnRateYaw * 2.2,
                -0.32,
                0.32,
              );
          charBodyGroup.rotation.x = THREE.MathUtils.lerp(
            charBodyGroup.rotation.x,
            targetLeanX,
            0.18,
          );
          charBodyGroup.rotation.z = THREE.MathUtils.lerp(
            charBodyGroup.rotation.z,
            targetBankZ,
            0.18,
          );
          headMesh.rotation.y = THREE.MathUtils.lerp(
            headMesh.rotation.y,
            targetHeadYaw,
            0.2,
          );
        }

        const limbSwingAmp = isSprinting ? 0.72 : 0.55;
        const armSwingAmp = isSprinting ? 0.56 : 0.42;
        const bobAmp = isSprinting ? 0.068 : 0.05;

        const slotStatuses: Record<number, RoomPortalStatus> = {
          0: 'active',
          1: 'active',
          2: 'active',
          3: 'active',
        };
        for (let i = 0; i < portalRecords.length; i++) {
          const p = portalRecords[i];
          if (p.floorNumber === activeFloorNum) {
            slotStatuses[p.slotIndex] = p.status;
          }
        }
        const doorOpenAmountForCollision = isCabinAtActiveFloor
          ? liftState.doorOpenAmount
          : 0;
        const isLiftDoorOpenOnFloor = doorOpenAmountForCollision > 0.45;

        const slotKey = `${slotStatuses[0]}_${slotStatuses[1]}_${slotStatuses[2]}_${slotStatuses[3]}`;
        const isLiftOpenKey = isLiftDoorOpenOnFloor;
        const floorKey = activeFloorNum;
        const doorAmtKey = Math.round(doorOpenAmountForCollision * 10);
        const roomDoorsKey = `${Math.round((roomDoorOpenAmounts[0] || 0) * 10)}_${Math.round((roomDoorOpenAmounts[1] || 0) * 10)}_${Math.round((roomDoorOpenAmounts[2] || 0) * 10)}_${Math.round((roomDoorOpenAmounts[3] || 0) * 10)}`;

        if (
          !cachedFloorCollidersRef.current ||
          cachedFloorCollidersRef.current.floorNum !== floorKey ||
          cachedFloorCollidersRef.current.slotKey !== slotKey ||
          cachedFloorCollidersRef.current.isLiftOpen !== isLiftOpenKey ||
          cachedFloorCollidersRef.current.doorAmtKey !== doorAmtKey ||
          cachedFloorCollidersRef.current.roomDoorsKey !== roomDoorsKey
        ) {
          cachedFloorCollidersRef.current = {
            floorNum: floorKey,
            slotKey,
            isLiftOpen: isLiftOpenKey,
            doorAmtKey,
            roomDoorsKey,
            colliders: buildFloorColliders({
              floorNumber: activeFloorNum,
              slotStatuses,
              isLiftDoorOpen: isLiftDoorOpenOnFloor,
              doorOpenAmount: doorOpenAmountForCollision,
              roomDoorOpenAmounts,
            }),
          };
        }
        const cachedFloorColliders = cachedFloorCollidersRef.current.colliders;

        const prevCharX = explorerGroup.position.x;
        const prevCharZ = explorerGroup.position.z;

        if (inActiveRoom3D && activeExhibitionBuilt) {
          const activeRoomObj =
            roomsRef.current.find(
              (r) => r.id === activeExhibitionBuilt!.roomId,
            ) || roomsRef.current[0];
          const roomFloorY =
            (activeRoomObj?.floorNumber ?? 0) * FLOOR_HEIGHT +
            climbHeightOffsetRef.current;

          // Step 2–6: Advance the 0.88s smooth room-entrance lighting & display reveal transition
          if (
            roomEntranceState.active &&
            roomEntranceState.roomId === activeExhibitionBuilt.roomId
          ) {
            roomEntranceState.elapsed += delta;
            const animRes = activeExhibitionBuilt.applyEntranceAnimation(
              roomEntranceState.elapsed,
              roomEntranceState.duration,
              reducedMotion,
            );
            roomEntranceState.cameraSpringArmBlend =
              animRes.cameraSpringArmBlend;
            if (animRes.isComplete) {
              roomEntranceState.active = false;
            }
          }

          if (!reducedMotion) {
            activeExhibitionBuilt.updateAmbientAnimations?.(elapsed);
            for (
              let dIdx = 0;
              dIdx < activeExhibitionBuilt.displayRecords.length;
              dIdx++
            ) {
              const rec = activeExhibitionBuilt.displayRecords[dIdx];
              if (rec.placement.mountStyle === 'floating_exhibition') {
                rec.rootGroup.position.y =
                  rec.baseY + Math.sin(elapsed * 1.45 + dIdx * 0.9) * 0.028;
              }
            }
          } else {
            activeExhibitionBuilt.bedroomInteractions?.update(
              delta,
              elapsed,
              true,
              false,
            );
          }

          if (bedroomFocusTargetRef.current && activeRoomObj) {
            // Character held cleanly at the focused interaction pose
            velX = 0;
            velZ = 0;
            if (bedroomFocusTargetRef.current.characterPos) {
              explorerGroup.position.set(
                bedroomFocusTargetRef.current.characterPos.x,
                roomFloorY + bedroomFocusTargetRef.current.characterPos.y,
                bedroomFocusTargetRef.current.characterPos.z,
              );
            }
            if (typeof bedroomFocusTargetRef.current.characterYaw === 'number') {
              explorerGroup.rotation.y = bedroomFocusTargetRef.current.characterYaw;
            }
          } else if (bicycleRideActiveRef.current && activeRoomObj) {
            if (!bicycleRidePausedRef.current && !isAnyModalOpenRef.current) {
              const rideSpeed = forwardAxis > 0 ? 0.085 : 0.048;
              bicycleRideProgressRef.current =
                (bicycleRideProgressRef.current + delta * rideSpeed) % 1;
            }
            const ridePose = getBicycleTrailPose(bicycleRideProgressRef.current);
            explorerGroup.position.set(ridePose.x, roomFloorY, ridePose.z);
            if (!isDraggingLook) {
              const yawStep = shortestAngleDiff(authoritativeYaw, ridePose.yaw);
              authoritativeYaw = sanitizeYaw(
                authoritativeYaw + yawStep * Math.min(1, delta * 5.5),
                ridePose.yaw,
              );
              viewYawRef.current = authoritativeYaw;
              explorerGroup.rotation.set(0, authoritativeYaw, 0);
            }
            const pedalActive = !bicycleRidePausedRef.current && !isAnyModalOpenRef.current;
            activeExhibitionBuilt.setBicycleRidePose?.(
              true,
              ridePose,
              pedalActive ? delta * 5.2 : 0,
            );
            if (pedalActive) {
              walkCycle += delta * 7.2;
              leftLeg.rotation.x = Math.sin(walkCycle) * 0.55;
              rightLeg.rotation.x = -Math.sin(walkCycle) * 0.55;
              leftArm.rotation.x = -0.38;
              rightArm.rotation.x = -0.38;
            }
          } else if (!movementBlocked && currentSpeed > 0.03 && activeRoomObj) {
            const roomMove = resolveRoomInteriorMovement({
              room: activeRoomObj,
              memories: activeExhibitionBuilt.displayRecords.map(
                (d) => d.placement.memory,
              ),
              styleOverride: activeExhibitionBuilt.exhibitionStyle,
              startX: explorerGroup.position.x,
              startY: roomFloorY,
              startZ: explorerGroup.position.z,
              velX,
              velZ,
              delta,
            });

            explorerGroup.position.set(roomMove.x, roomFloorY, roomMove.z);

            const walkDirSign = forwardAxis < 0 && rightAxis === 0 ? -1 : 1;
            walkCycle += walkDirSign * currentSpeed * delta * 3.1;
            leftLeg.rotation.x = Math.sin(walkCycle) * limbSwingAmp;
            rightLeg.rotation.x = -Math.sin(walkCycle) * limbSwingAmp;
            leftArm.rotation.x = -Math.sin(walkCycle) * armSwingAmp;
            rightArm.rotation.x = Math.sin(walkCycle) * armSwingAmp;
            charBodyGroup.position.y = Math.abs(Math.sin(walkCycle * 2)) * bobAmp;

            if (roomMove.exitedRoom && !isAnyModalOpenRef.current) {
              // Keep mouse-look & exploration controls active when walking back into the Atrium
              climbHeightOffsetRef.current = 0;
              clickToMoveTargetRef.current = null;
              onSelectRoomRef.current(null);
            }
          } else if (activeRoomObj) {
            const roomColliderKey = `${activeRoomObj.id}|${activeExhibitionBuilt.exhibitionStyle}|${activeExhibitionBuilt.displayRecords.map((d) => d.placement.memory.id).join(',')}`;
            if (
              !cachedRoomCollidersRef.current ||
              cachedRoomCollidersRef.current.key !== roomColliderKey
            ) {
              cachedRoomCollidersRef.current = {
                key: roomColliderKey,
                colliders: buildRoomInteriorColliders(
                  activeRoomObj,
                  activeExhibitionBuilt.exhibitionStyle,
                  activeExhibitionBuilt.displayRecords.map(
                    (d) => d.placement.memory,
                  ),
                ),
              };
            }
            const roomColliders = cachedRoomCollidersRef.current.colliders;
            const safeRoomIdle = resolveSingleStepPosition(
              explorerGroup.position.x,
              explorerGroup.position.z,
              roomColliders,
            );
            explorerGroup.position.set(
              safeRoomIdle.x,
              roomFloorY,
              safeRoomIdle.z,
            );

            leftLeg.rotation.x = THREE.MathUtils.lerp(
              leftLeg.rotation.x,
              0,
              0.15,
            );
            rightLeg.rotation.x = THREE.MathUtils.lerp(
              rightLeg.rotation.x,
              0,
              0.15,
            );
            leftArm.rotation.x = THREE.MathUtils.lerp(
              leftArm.rotation.x,
              0,
              0.15,
            );
            rightArm.rotation.x = THREE.MathUtils.lerp(
              rightArm.rotation.x,
              0,
              0.15,
            );
            charBodyGroup.position.y = reducedMotion
              ? 0
              : Math.sin(elapsed * 2.2) * 0.025;
          }
        } else if (!movementBlocked && currentSpeed > 0.03) {
          // Authoritative sub-stepped spatial collision resolution with natural wall sliding
          const characterCurrentY =
            liftState.phase === 'traveling'
              ? liftState.cabinY
              : activeFloorNum * FLOOR_HEIGHT;
          const moveRes = resolveCharacterMovement({
            startX: explorerGroup.position.x,
            startY: characterCurrentY,
            startZ: explorerGroup.position.z,
            velX,
            velZ,
            delta,
            totalFloors,
            slotStatuses,
            isLiftDoorOpen: isLiftDoorOpenOnFloor,
            doorOpenAmount: doorOpenAmountForCollision,
            roomDoorOpenAmounts,
            colliderSet: cachedFloorColliders,
          });

          explorerGroup.position.set(moveRes.x, moveRes.y, moveRes.z);

          // Walking / Running limb swing animation
          const walkDirSign = forwardAxis < 0 && rightAxis === 0 ? -1 : 1;
          walkCycle += walkDirSign * currentSpeed * delta * 3.1;
          leftLeg.rotation.x = Math.sin(walkCycle) * limbSwingAmp;
          rightLeg.rotation.x = -Math.sin(walkCycle) * limbSwingAmp;
          leftArm.rotation.x = -Math.sin(walkCycle) * armSwingAmp;
          rightArm.rotation.x = Math.sin(walkCycle) * armSwingAmp;
          charBodyGroup.position.y = Math.abs(Math.sin(walkCycle * 2)) * bobAmp;
        } else if (liftState.phase !== 'traveling') {
          // Ensure idle character remains grounded on a valid floor and outside any obstacles
          if (!characterWelcomeRef.current) {
            const safeIdle = sanitizeCharacterPosition({
              position: explorerGroup.position,
              floorNumber: activeFloorNum,
              totalFloors,
              slotStatuses,
              isLiftDoorOpen: isLiftDoorOpenOnFloor,
              doorOpenAmount: doorOpenAmountForCollision,
              roomDoorOpenAmounts,
              colliderSet: cachedFloorColliders,
            });
            explorerGroup.position.set(safeIdle.x, safeIdle.y, safeIdle.z);
          }

          leftLeg.rotation.x = THREE.MathUtils.lerp(
            leftLeg.rotation.x,
            0,
            0.15,
          );
          rightLeg.rotation.x = THREE.MathUtils.lerp(
            rightLeg.rotation.x,
            0,
            0.15,
          );
          leftArm.rotation.x = THREE.MathUtils.lerp(
            leftArm.rotation.x,
            0,
            0.15,
          );
          if (characterWelcomeRef.current && !reducedMotion) {
            welcomeWaveElapsedRef.current += delta;
            if (welcomeWaveElapsedRef.current < 3.6) {
              const wavePhase = welcomeWaveElapsedRef.current * 6.5;
              rightArm.rotation.x = -2.35 + Math.sin(wavePhase) * 0.28;
            } else {
              rightArm.rotation.x = THREE.MathUtils.lerp(
                rightArm.rotation.x,
                0,
                0.15,
              );
            }
          } else {
            rightArm.rotation.x = THREE.MathUtils.lerp(
              rightArm.rotation.x,
              0,
              0.15,
            );
          }
          charBodyGroup.position.y = reducedMotion
            ? 0
            : Math.sin(elapsed * 2.2) * 0.025;
        }

        // Automatic Room Doorway Entry Detection (triggers strictly when character walks across active doorway threshold)
        if (
          !inActiveRoom3D &&
          hasEnteredRef.current &&
          liftState.phase !== 'traveling' &&
          !characterWelcomeRef.current &&
          !isAnyModalOpenRef.current
        ) {
          const doorwayRes = evaluateRoomDoorwayTransitions({
            prevX: prevCharX,
            prevZ: prevCharZ,
            currX: explorerGroup.position.x,
            currZ: explorerGroup.position.z,
            floorNumber: activeFloorNum,
            slotStatuses,
            currentLatch: latchedDoorwayRef.current,
          });
          latchedDoorwayRef.current = doorwayRes.nextLatch;

          if (
            doorwayRes.triggeredSlotIndex !== null &&
            !activeRoomIdRef.current
          ) {
            const enteredRoom = roomsRef.current.find(
              (r) =>
                r.floorNumber === activeFloorNum &&
                r.slotIndex === doorwayRes.triggeredSlotIndex &&
                r.status === 'active',
            );
            if (enteredRoom) {
              // Capture the character's lateral offset, relative camera yaw, pitch, and walking speed
              // so entering the room keeps full camera & movement control without teleporting or snapping away
              const local = worldToPortalLocalXZ(
                enteredRoom.slotIndex,
                explorerGroup.position.x,
                explorerGroup.position.z,
              );
              const portalRotY = getFloorSlotPlacementCoords(
                enteredRoom.slotIndex,
                activeFloorNum,
              ).rotY;
              const inwardPortalYaw = sanitizeYaw(
                portalRotY + Math.PI,
                Math.PI,
              );
              const relativeYawOffset = THREE.MathUtils.clamp(
                shortestAngleDiff(inwardPortalYaw, authoritativeYaw),
                -Math.PI * 0.45,
                Math.PI * 0.45,
              );
              doorwayEntryContextRef.current = {
                roomId: enteredRoom.id,
                lateralOffsetX: local.lx,
                relativeYawOffset,
                preservedPitch: authoritativePitch,
                preservedSpeed: currentSpeed,
              };
              onSelectRoomRef.current(enteredRoom.id);
            }
          }
        }

        if (interactAnimTimer > 0) {
          interactAnimTimer = Math.max(0, interactAnimTimer - delta);
          rightArm.rotation.x =
            -Math.sin(interactAnimTimer * Math.PI * 3) * 0.9;
        }

        // Focused Childhood Bedroom character pose animations (crawl, scrapbook page-turn hand, cricket bat swing, flashlight aim)
        const bFocus = bedroomFocusTargetRef.current;
        const bCtrl = activeExhibitionBuilt?.bedroomInteractions;
        if (bFocus) {
          if (bFocus.pose === 'crawl' || bFocus.pose === 'scrapbook_read') {
            charBodyGroup.position.y = -0.58;
            charBodyGroup.rotation.x = 1.24;
            headMesh.rotation.x = -0.78;
            leftLeg.rotation.x = -0.45;
            rightLeg.rotation.x = -0.35;
            leftArm.rotation.x = -1.15;
            if (pageTurnHandAnimTimerRef.current > 0) {
              pageTurnHandAnimTimerRef.current = Math.max(
                0,
                pageTurnHandAnimTimerRef.current - delta,
              );
              const t = 1 - pageTurnHandAnimTimerRef.current / 0.55;
              rightArm.rotation.x = -1.25 - Math.sin(t * Math.PI) * 0.45;
              rightArm.rotation.z = -Math.sin(t * Math.PI) * 0.65;
            } else {
              rightArm.rotation.x = -1.15;
              rightArm.rotation.z = 0;
            }
          } else if (bFocus.pose === 'cricket_swing') {
            charBodyGroup.position.y = 0;
            charBodyGroup.rotation.x = 0.06;
            if (cricketSwingAnimTimerRef.current > 0) {
              cricketSwingAnimTimerRef.current = Math.max(
                0,
                cricketSwingAnimTimerRef.current - delta,
              );
              const phase = 1 - cricketSwingAnimTimerRef.current / 0.72;
              const swingArc = Math.sin(phase * Math.PI) * 1.45;
              rightArm.rotation.x = -0.6 - swingArc;
              leftArm.rotation.x = -0.5 - swingArc * 0.85;
              charBodyGroup.rotation.y = Math.sin(phase * Math.PI) * 0.45;
            } else {
              rightArm.rotation.x = -0.45;
              leftArm.rotation.x = -0.4;
              charBodyGroup.rotation.y = 0;
            }
          } else {
            charBodyGroup.position.y = 0;
            charBodyGroup.rotation.x = 0;
            charBodyGroup.rotation.y = 0;
            headMesh.rotation.x = 0;
            rightArm.rotation.z = 0;
          }
        } else {
          charBodyGroup.rotation.y = 0;
          headMesh.rotation.x = 0;
          rightArm.rotation.z = 0;
        }

        if (bCtrl?.isFlashlightHeld()) {
          headMesh.getWorldPosition(_camPivotPos);
          _camTargetLook
            .set(
              Math.sin(authoritativeYaw) * Math.cos(authoritativePitch),
              -Math.sin(authoritativePitch) - 0.14,
              Math.cos(authoritativeYaw) * Math.cos(authoritativePitch),
            )
            .normalize();
          bCtrl.updateFlashlightAim(_camPivotPos, _camTargetLook);
        }

        // Single-Memory Proximity Highlighting inside 3D Exhibition Room (every frame for smooth subtle glow)
        let activeRoomProxEval: ReturnType<
          typeof evaluateRoomMemoryProximity
        > = {
          activePlacement: null,
          distanceToClosest: Infinity,
          highlightStrength: 0,
        };
        if (inActiveRoom3D && activeExhibitionBuilt) {
          activeRoomProxEval = evaluateRoomMemoryProximity({
            placements: activeExhibitionBuilt.displayRecords.map(
              (it) => it.placement,
            ),
            playerX: explorerGroup.position.x,
            playerZ: explorerGroup.position.z,
            cameraForwardX: Math.sin(authoritativeYaw),
            cameraForwardZ: Math.cos(authoritativeYaw),
          });
          const activeMemId =
            activeRoomProxEval.activePlacement?.memory.id ?? null;
          const hlLerp = Math.min(1, delta * 14);
          for (
            let i = 0;
            i < activeExhibitionBuilt.displayRecords.length;
            i++
          ) {
            const it = activeExhibitionBuilt.displayRecords[i];
            const memId = it.placement.memory.id;
            const isSelected =
              memId === activeMemId || memId === hoveredRoomMemoryId;
            const targetStrength = isSelected
              ? Math.max(
                  0.65,
                  memId === activeMemId
                    ? activeRoomProxEval.highlightStrength
                    : 0.85,
                )
              : 0;
            if (it.haloMat) {
              it.haloMat.opacity = THREE.MathUtils.lerp(
                it.haloMat.opacity,
                targetStrength * 0.62,
                hlLerp,
              );
            }
            const fMat = it.frameMesh.material as THREE.MeshStandardMaterial;
            fMat.emissive.setHex(isSelected ? 0xd6a15d : 0x000000);
            fMat.emissiveIntensity = THREE.MathUtils.lerp(
              fMat.emissiveIntensity,
              targetStrength * 0.48,
              hlLerp,
            );
          }
        }

        // C. Proximity Detection (3D Room Exhibits / Exit Archway OR Atrium Rooms, Empty Slots, Lift, Feature Wall)
        const currentFloorNum = sanitizeFloorIndex(
          Math.round(
            sanitizeFiniteNumber(explorerGroup.position.y, 0) / FLOOR_HEIGHT,
          ),
          totalFloors,
          0,
        );
        const currentFloorObj =
          floorsRef.current.find((f) => f.floorNumber === currentFloorNum) ||
          floorsRef.current[0];

        if (lastEmittedFloorNumRef.current !== currentFloorNum) {
          lastEmittedFloorNumRef.current = currentFloorNum;
          setCurrentFloorNumberState(currentFloorNum);
        }

        const now = performance.now();
        if (now - lastStateEmitTime > 160) {
          lastStateEmitTime = now;

          let foundProximity: ProximityTarget | null = null;

          if (inActiveRoom3D && activeExhibitionBuilt) {
            const activeMem = activeRoomProxEval.activePlacement?.memory;
            const bedroomProxZone =
              !activeBedroomInteractionRef.current
                ? activeExhibitionBuilt.bedroomInteractions?.evaluateProximity(
                    explorerGroup.position.x,
                    explorerGroup.position.z,
                    false,
                  )
                : null;
            if (bedroomProxZone) {
              foundProximity = {
                kind: 'room_interactive_object',
                objectId: bedroomProxZone.objectId,
                title: bedroomProxZone.title,
                promptVerb: bedroomProxZone.promptVerb,
                subtitle: bedroomProxZone.subtitle,
                floorNumber: currentFloorNum,
              };
            } else if (activeMem) {
              foundProximity = {
                kind: 'room_memory',
                title: activeMem.title,
                subtitle: `${activeMem.date || activeMem.year || 'Personal Keepsake'} · ${activeMem.location || 'Archive'} · Press E or Click to inspect`,
                memory: activeMem,
                floorNumber: currentFloorNum,
              };
            } else if (
              explorerGroup.position.z >= 4.75 &&
              Math.abs(explorerGroup.position.x) <= 1.85
            ) {
              foundProximity = {
                kind: 'room_exit',
                title: 'South Exit Archway · Return to Atrium',
                subtitle:
                  'Walk through the archway or press E to step back into the corridor',
                floorNumber: currentFloorNum,
              };
            } else if (
              !bicycleRideActiveRef.current &&
              Math.hypot(explorerGroup.position.x - 4.85, explorerGroup.position.z - 4.35) < 2.25
            ) {
              foundProximity = {
                kind: 'contextual_station',
                stationId: 'bicycle',
                title: 'Childhood Bicycle Trail',
                subtitle: 'Press E or Click to ride the bicycle trail & explore cycling memories',
                floorNumber: currentFloorNum,
              };
            } else if (
              Math.hypot(explorerGroup.position.x - 4.52, explorerGroup.position.z + 1.35) < 2.25
            ) {
              foundProximity = {
                kind: 'contextual_station',
                stationId: 'treehouse',
                title: 'Treehouse Hideaway',
                subtitle: 'Press E or Click to open friendship photos & archived conversations',
                floorNumber: currentFloorNum,
              };
            } else if (
              Math.hypot(explorerGroup.position.x + 2.95, explorerGroup.position.z - 6.02) < 2.35 ||
              Math.hypot(explorerGroup.position.x + 4.35, explorerGroup.position.z + 0.6) < 2.15
            ) {
              foundProximity = {
                kind: 'contextual_station',
                stationId: 'cinema',
                title: 'Outdoor Cinema & Video Screen',
                subtitle: 'Press E or Click to browse video collections & play videos',
                floorNumber: currentFloorNum,
              };
            } else if (
              Math.hypot(explorerGroup.position.x - 4.85, explorerGroup.position.z + 2.35) < 2.15
            ) {
              foundProximity = {
                kind: 'contextual_station',
                stationId: 'garden',
                title: 'Memory Garden Trail',
                subtitle: 'Press E or Click to browse related garden photographs',
                floorNumber: currentFloorNum,
              };
            }
          } else {
            let minDoorDist = 3.8;

            // 1. Check room doorways on current floor
            portalRecords
              .filter((p) => p.floorNumber === currentFloorNum)
              .forEach((p) => {
                const d = Math.hypot(
                  explorerGroup.position.x - p.doorPos.x,
                  explorerGroup.position.z - p.doorPos.z,
                );
                const isNear = d < minDoorDist;

                if (isNear) {
                  minDoorDist = d;
                  const room = roomsRef.current.find((r) => r.id === p.roomId);
                  if (room) {
                    const memCount = memoriesRef.current.filter(
                      (m) => m.roomId === room.id,
                    ).length;
                    if (room.status === 'active') {
                      foundProximity = {
                        kind: 'active_room',
                        title: room.name,
                        subtitle: `Walk through doorway to enter · ${memCount} ${memCount === 1 ? 'Memory' : 'Memories'}`,
                        room,
                        floorNumber: currentFloorNum,
                        slotIndex: p.slotIndex,
                      };
                    } else if (room.status === 'empty' && room.id === 'childhood') {
                      foundProximity = {
                        kind: 'empty_slot',
                        title: 'Childhood Room (Not Activated)',
                        subtitle: 'Activate Childhood Room to enter',
                        room,
                        floorNumber: currentFloorNum,
                        slotIndex: p.slotIndex,
                      };
                    } else {
                      foundProximity = {
                        kind: 'disabled_room',
                        title: `${room.name} (Disabled)`,
                        subtitle: `${memCount} memories preserved · Enable in My Rooms to enter`,
                        room,
                        floorNumber: currentFloorNum,
                        slotIndex: p.slotIndex,
                      };
                    }
                  }
                }
              });

            // 2. Check Architectural Lift proximity (North corridor, x near 0, z <= -5.5)
            if (
              !foundProximity &&
              liftState.phase !== 'traveling' &&
              Math.abs(explorerGroup.position.x) < 3.0 &&
              explorerGroup.position.z <= -5.5 &&
              !isCharacterInElevatorCabin(explorerGroup.position.x, explorerGroup.position.z)
            ) {
              foundProximity = {
                kind: 'lift',
                title: 'Automatic Elevator',
                subtitle: `${currentFloorObj?.name || `Floor ${currentFloorNum + 1}`} · Walk inside cabin to select destination floor`,
                floorNumber: currentFloorNum,
              };
              onEmitTipRef.current?.(
                'near-lift-tip',
                'Automatic Elevator: Walk inside cabin to select destination',
                'Doors open automatically as you approach. Walk inside to choose a floor.',
                'tip',
              );
            }

            // 3. Check Blank-Wall Interactive Feature Hub proximity (South corridor, z >= 5.6)
            if (
              !foundProximity &&
              liftState.phase !== 'traveling' &&
              Math.abs(explorerGroup.position.x) < 5.8 &&
              explorerGroup.position.z >= 5.6
            ) {
              foundProximity = {
                kind: 'feature_wall',
                title: `${museumSettingsRef.current.projectName} Feature Wall`,
                subtitle:
                  'Click any of the 9 wall panels with your mouse or press E to open',
                floorNumber: currentFloorNum,
              };
              onEmitTipRef.current?.(
                'near-wall-tip',
                'Interactive Feature Wall Reached',
                'Click any panel on the wall with your mouse to open Music, Settings, AI Studio, or Rooms.',
                'tip',
              );
            }

            // 4. Check Ground-Floor Central Memory Discovery & Atmosphere Compass Sculpture (x = 0, z = 1.8)
            if (
              !foundProximity &&
              currentFloorNum === 0 &&
              liftState.phase !== 'traveling' &&
              Math.hypot(
                explorerGroup.position.x,
                explorerGroup.position.z - 1.8,
              ) < 2.85
            ) {
              foundProximity = {
                kind: 'discovery_compass',
                title: 'Central Memory Discovery & Atmosphere Compass',
                subtitle:
                  'Press E or Click sculpture to cycle Atrium lighting mood & spotlight a memory',
                floorNumber: currentFloorNum,
              };
            }
          }

          const proxTarget = foundProximity as ProximityTarget | null;
          const nextProximityKey = proxTarget
            ? `${proxTarget.kind}:${proxTarget.room?.id || ''}:${proxTarget.memory?.id || ''}:${proxTarget.floorNumber ?? ''}:${proxTarget.slotIndex ?? ''}:${proxTarget.title}:${proxTarget.subtitle}`
            : 'none';

          if (lastProximityKeyRef.current !== nextProximityKey) {
            lastProximityKeyRef.current = nextProximityKey;
            setProximityTarget(proxTarget);
          }

          if (inActiveRoom3D) {
            let detectedSpace: LivingWorldSpaceId = 'central_gallery';
            if (climbHeightOffsetRef.current > 0.8) {
              detectedSpace = 'treehouse';
            } else if (
              explorerGroup.position.x > 0.85 &&
              explorerGroup.position.z < 1.85
            ) {
              detectedSpace = 'backyard';
            } else if (
              explorerGroup.position.z > 0.85 &&
              explorerGroup.position.x >= -2.35 &&
              explorerGroup.position.x <= 1.25
            ) {
              detectedSpace = 'play_area';
            }
            if (lastEmittedSpaceIdRef.current !== detectedSpace) {
              lastEmittedSpaceIdRef.current = detectedSpace;
              setActiveSpaceId(detectedSpace);
            }
          }

          if (currentFloorObj && currentSpeed < 0.08 && !inActiveRoom3D) {
            const qx = Number(
              (Math.round(explorerGroup.position.x * 2) / 2).toFixed(1),
            );
            const qy = Number(
              (Math.round(explorerGroup.position.y * 2) / 2).toFixed(1),
            );
            const qz = Number(
              (Math.round(explorerGroup.position.z * 2) / 2).toFixed(1),
            );
            const qYaw = Number(
              (Math.round(authoritativeYaw * 4) / 4).toFixed(2),
            );
            const inLift = liftState.phase !== 'idle';
            const nextCharSig = `${qx},${qy},${qz}:${qYaw}:${currentFloorNum}:${activeRoomIdRef.current || ''}:${inLift}`;

            if (lastCharStateSigRef.current !== nextCharSig) {
              lastCharStateSigRef.current = nextCharSig;
              onUpdateCharacterStateRef.current({
                position: [
                  Number(explorerGroup.position.x.toFixed(2)),
                  Number(explorerGroup.position.y.toFixed(2)),
                  Number(explorerGroup.position.z.toFixed(2)),
                ],
                rotationY: Number(authoritativeYaw.toFixed(2)),
                currentFloorId: currentFloorObj.id,
                currentFloorNumber: currentFloorNum,
                currentRoomId: activeRoomIdRef.current,
                lastVisitedLocation: currentFloorObj.name,
                isInLift: inLift,
              });
            }
          }
        }

        // D. Camera Choreography (Single Authoritative Camera Owner & Synchronized Character Visibility)
        const isScriptedGsapActive = Boolean(
          activeCameraTransitionRef.current?.isActive?.(),
        );
        if (!isScriptedGsapActive && activeCameraTransitionRef.current) {
          activeCameraTransitionRef.current = null;
        }
        const currentCameraOwner = resolveCameraControllerOwner({
          hasEnteredAtrium: hasEnteredRef.current,
          isWelcomeActive: characterWelcomeRef.current,
          liftPhase: liftState.phase,
          inActiveRoom3D,
          isTutorialActive: tutorialActiveRef.current,
          tutorialTarget: tutorialTargetRef.current,
          isScriptedGsapActive,
          cameraViewMode: cameraViewModeRef.current,
        });

        if (currentCameraOwner !== 'scripted_gsap' && isScriptedGsapActive) {
          cancelActiveCameraTransition();
        }

        // Re-anchor spring-arm distance when handing control back from intro/welcome/tutorial/lift/first-person
        if (
          currentCameraOwner === 'third_person' &&
          previousCameraOwner !== 'third_person'
        ) {
          const handoffPivotY = explorerGroup.position.y + 1.65;
          const handoffDist = Math.hypot(
            camera.position.x - explorerGroup.position.x,
            camera.position.y - handoffPivotY,
            camera.position.z - explorerGroup.position.z,
          );
          smoothedCamDist = THREE.MathUtils.clamp(
            handoffDist,
            0.85,
            cameraDistanceRef.current,
          );
        }
        previousCameraOwner = currentCameraOwner;

        if (currentCameraOwner === 'intro') {
          const vis = resolveCharacterVisibility({ cameraOwner: 'intro' });
          charBodyGroup.visible = vis.bodyVisible;
          charShadow.visible = vis.shadowVisible;
          _camTargetPos.set(0, 5.2, 15.2);
          _camTargetLook.set(0, 2.5, -2.0);
          camera.position.lerp(_camTargetPos, 0.05);
          cameraLookTarget.lerp(_camTargetLook, 0.05);
        } else if (currentCameraOwner === 'welcome') {
          const vis = resolveCharacterVisibility({ cameraOwner: 'welcome' });
          charBodyGroup.visible = vis.bodyVisible;
          charShadow.visible = vis.shadowVisible;
          _camTargetPos.set(0, 2.15, 8.6);
          _camTargetLook.set(0, 1.48, 4.8);
          const welcomeLerp = reducedMotion ? 1 : 0.1;
          camera.position.lerp(_camTargetPos, welcomeLerp);
          cameraLookTarget.lerp(_camTargetLook, welcomeLerp);
        } else if (currentCameraOwner === 'tutorial') {
          const vis = resolveCharacterVisibility({ cameraOwner: 'tutorial' });
          charBodyGroup.visible = vis.bodyVisible;
          charShadow.visible = vis.shadowVisible;
          const floorBaseY = currentFloorNum * FLOOR_HEIGHT;
          if (tutorialTargetRef.current === 'childhood_entrance') {
            _camTargetPos.set(1.8, floorBaseY + 2.35, -0.8);
            _camTargetLook.set(-8.6, floorBaseY + 2.0, -3.8);
          } else if (tutorialTargetRef.current === 'feature_wall') {
            _camTargetPos.set(0, floorBaseY + 2.8, 2.0);
            _camTargetLook.set(0, floorBaseY + 2.7, 9.6);
          } else if (tutorialTargetRef.current === 'lift') {
            _camTargetPos.set(0, floorBaseY + 2.8, -2.4);
            _camTargetLook.set(0, floorBaseY + 2.5, -9.2);
          } else {
            _camTargetPos.set(0, floorBaseY + 2.35, 8.6);
            _camTargetLook.set(0, floorBaseY + 1.48, 4.2);
          }
          camera.position.lerp(_camTargetPos, 0.08);
          cameraLookTarget.lerp(_camTargetLook, 0.08);
        } else if (currentCameraOwner === 'lift_travel') {
          const vis = resolveCharacterVisibility({ cameraOwner: 'lift_travel' });
          charBodyGroup.visible = vis.bodyVisible;
          charShadow.visible = vis.shadowVisible;
          camera.position.set(0, liftState.cabinY + 1.65, -10.35);
          cameraLookTarget.set(0, liftState.cabinY + 1.62, -5.0);
        } else if (currentCameraOwner === 'scripted_gsap') {
          const vis = resolveCharacterVisibility({ cameraOwner: 'scripted_gsap' });
          charBodyGroup.visible = vis.bodyVisible;
          charShadow.visible = vis.shadowVisible;
        } else if (bedroomFocusTargetRef.current && inActiveRoom3D) {
          const bf = bedroomFocusTargetRef.current;
          const floorBaseY = currentFloorNum * FLOOR_HEIGHT;
          _camTargetPos.set(
            bf.cameraPos.x,
            floorBaseY + bf.cameraPos.y,
            bf.cameraPos.z,
          );
          _camTargetLook.set(
            bf.lookAt.x,
            floorBaseY + bf.lookAt.y,
            bf.lookAt.z,
          );
          const focusAlpha = reducedMotion ? 1 : 1 - Math.exp(-10 * delta);
          camera.position.lerp(_camTargetPos, focusAlpha);
          cameraLookTarget.lerp(_camTargetLook, focusAlpha);
          const showChar =
            bf.pose === 'crawl' ||
            bf.pose === 'scrapbook_read' ||
            bf.pose === 'cricket_swing';
          charBodyGroup.visible = showChar;
          charShadow.visible = showChar;
        } else if (currentCameraOwner === 'first_person') {
          // True First-Person Exploration Camera (eye level at +1.66m)
          const vis = resolveCharacterVisibility({ cameraOwner: 'first_person' });
          charBodyGroup.visible = vis.bodyVisible;
          charShadow.visible = vis.shadowVisible;
          const lookDirX =
            Math.sin(authoritativeYaw) * Math.cos(authoritativePitch);
          const lookDirY = -Math.sin(authoritativePitch);
          const lookDirZ =
            Math.cos(authoritativeYaw) * Math.cos(authoritativePitch);

          const eyeX = explorerGroup.position.x;
          const eyeY = explorerGroup.position.y + 1.66;
          const eyeZ = explorerGroup.position.z;

          _camTargetPos.set(eyeX, eyeY, eyeZ);
          _camTargetLook.set(
            eyeX + lookDirX * 6.0,
            eyeY + lookDirY * 6.0,
            eyeZ + lookDirZ * 6.0,
          );
          const posAlpha = reducedMotion ? 1 : 1 - Math.exp(-42 * delta);
          camera.position.lerp(_camTargetPos, posAlpha);
          cameraLookTarget.lerp(_camTargetLook, posAlpha);
        } else {
          // Primary Third-Person Mouse-Look Camera around Character using authoritativeYaw & authoritativePitch
          // with Multi-Ray Spring-Arm Raycast + Spatial Collider Clamping + Post-Lerp Containment
          const floorBaseY = currentFloorNum * FLOOR_HEIGHT;
          const userZoomDist = THREE.MathUtils.clamp(
            cameraDistanceRef.current,
            1.8,
            6.4,
          );
          const roomTargetCamDist = THREE.MathUtils.lerp(
            Math.min(4.85, userZoomDist + 0.35),
            Math.min(4.35, userZoomDist),
            roomEntranceState.cameraSpringArmBlend,
          );
          const maxCamDist = inActiveRoom3D ? roomTargetCamDist : userZoomDist;
          const minCamDist = 0.85;
          let rawTargetDist = maxCamDist;

          const lookDirX =
            Math.sin(authoritativeYaw) * Math.cos(authoritativePitch);
          const lookDirY = -Math.sin(authoritativePitch);
          const lookDirZ =
            Math.cos(authoritativeYaw) * Math.cos(authoritativePitch);

          _camPivotPos.set(
            explorerGroup.position.x,
            explorerGroup.position.y + 1.65,
            explorerGroup.position.z,
          );

          const maxCeilingOffset = inActiveRoom3D
            ? ROOM_INTERIOR_SPEC.height - 0.45
            : FLOOR_HEIGHT - 0.45;
          const idealCandX = _camPivotPos.x - lookDirX * maxCamDist;
          const idealCandY = THREE.MathUtils.clamp(
            _camPivotPos.y + 0.25 - lookDirY * maxCamDist,
            floorBaseY + 0.55,
            floorBaseY + maxCeilingOffset,
          );
          const idealCandZ = _camPivotPos.z - lookDirZ * maxCamDist;

          _camRayDir.set(
            idealCandX - _camPivotPos.x,
            idealCandY - _camPivotPos.y,
            idealCandZ - _camPivotPos.z,
          );
          const idealRayLen = _camRayDir.length();
          if (idealRayLen > 1e-4) {
            _camRayDir.divideScalar(idealRayLen);
          } else {
            _camRayDir.set(-lookDirX, -lookDirY, -lookDirZ).normalize();
          }

          // Ensure only dynamic matrices near the camera are refreshed instead of traversing all 3 floors every frame
          explorerGroup.updateMatrixWorld();
          const activeCamObstacles =
            inActiveRoom3D && activeExhibitionBuilt
              ? activeExhibitionBuilt.cameraObstacleMeshes
              : cameraObstacleMeshes;

          // 1. Multi-ray spring-arm raycast with movement/rotation cache when camera & character are stationary
          const camRayDirty =
            !cachedCamRayState ||
            cachedCamRayState.inRoom !== inActiveRoom3D ||
            Math.abs(cachedCamRayState.px - _camPivotPos.x) > 0.005 ||
            Math.abs(cachedCamRayState.py - _camPivotPos.y) > 0.005 ||
            Math.abs(cachedCamRayState.pz - _camPivotPos.z) > 0.005 ||
            Math.abs(cachedCamRayState.yaw - authoritativeYaw) > 0.002 ||
            Math.abs(cachedCamRayState.pitch - authoritativePitch) > 0.002 ||
            Math.abs(cachedCamRayState.maxDist - maxCamDist) > 0.005;

          if (!camRayDirty && cachedCamRayState) {
            rawTargetDist = cachedCamRayState.resultDist;
          } else {
            if (!inActiveRoom3D) {
              liftCabinGroup.updateMatrixWorld();
            }
            if (activeCamObstacles.length > 0 && idealRayLen > 0.2) {
              const rightWhiskerX = -Math.cos(authoritativeYaw) * 0.26;
              const rightWhiskerZ = Math.sin(authoritativeYaw) * 0.26;

              camCollisionRaycaster.near = 0.02;
              camCollisionRaycaster.far = Math.max(1.2, idealRayLen + 0.45);

              for (let rIdx = 0; rIdx < 3; rIdx++) {
                const ox =
                  rIdx === 0
                    ? 0
                    : rIdx === 1
                      ? rightWhiskerX
                      : -rightWhiskerX;
                const oy = rIdx === 0 ? 0 : 0.08;
                const oz =
                  rIdx === 0
                    ? 0
                    : rIdx === 1
                      ? rightWhiskerZ
                      : -rightWhiskerZ;
                _camRayOrigin.set(
                  _camPivotPos.x + ox,
                  _camPivotPos.y + oy,
                  _camPivotPos.z + oz,
                );
                camCollisionRaycaster.set(_camRayOrigin, _camRayDir);
                const wallHits = camCollisionRaycaster.intersectObjects(
                  activeCamObstacles,
                  false,
                );
                if (wallHits.length > 0) {
                  rawTargetDist = Math.min(
                    rawTargetDist,
                    Math.max(minCamDist, wallHits[0].distance - 0.42),
                  );
                }
              }
            }
            cachedCamRayState = {
              px: _camPivotPos.x,
              py: _camPivotPos.y,
              pz: _camPivotPos.z,
              yaw: authoritativeYaw,
              pitch: authoritativePitch,
              maxDist: maxCamDist,
              inRoom: inActiveRoom3D,
              resultDist: rawTargetDist,
            };
          }

          // Smooth spring-arm distance damping (faster pull-in on obstacle, gentle recovery when cleared)
          const distLambda = rawTargetDist < smoothedCamDist ? 28 : 11;
          smoothedCamDist = reducedMotion
            ? rawTargetDist
            : THREE.MathUtils.damp(
                smoothedCamDist,
                rawTargetDist,
                distLambda,
                delta,
              );
          const actualCamDist = THREE.MathUtils.clamp(
            smoothedCamDist,
            minCamDist,
            maxCamDist,
          );

          // 2. Place candidate along exact raycasted arm vector and resolve against full height-aware spatial colliders
          const armFrac =
            idealRayLen > 1e-4 ? Math.min(1, actualCamDist / idealRayLen) : 1;
          let desiredCamX = THREE.MathUtils.lerp(
            _camPivotPos.x,
            idealCandX,
            armFrac,
          );
          let desiredCamY = THREE.MathUtils.clamp(
            THREE.MathUtils.lerp(_camPivotPos.y, idealCandY, armFrac),
            floorBaseY + 0.55,
            floorBaseY + maxCeilingOffset,
          );
          let desiredCamZ = THREE.MathUtils.lerp(
            _camPivotPos.z,
            idealCandZ,
            armFrac,
          );

          const activeCamRoomObj =
            inActiveRoom3D && activeExhibitionBuilt
              ? roomsRef.current.find(
                  (r) => r.id === activeExhibitionBuilt!.roomId,
                ) || roomsRef.current[0]
              : null;
          let rawCamColliders = cachedFloorColliders;
          if (inActiveRoom3D && activeExhibitionBuilt && activeCamRoomObj) {
            const camRoomColliderKey = activeRoomColliderKey;
            if (
              !cachedRoomCollidersRef.current ||
              cachedRoomCollidersRef.current.key !== camRoomColliderKey
            ) {
              cachedRoomCollidersRef.current = {
                key: camRoomColliderKey,
                colliders: buildRoomInteriorColliders(
                  activeCamRoomObj,
                  activeExhibitionBuilt.exhibitionStyle,
                  activeExhibitionBuilt.displayRecords.map(
                    (d) => d.placement.memory,
                  ),
                ),
              };
            }
            rawCamColliders = cachedRoomCollidersRef.current.colliders;
          }
          const camHeightBucket = Math.round((desiredCamY - floorBaseY) * 20);
          if (
            !cachedCamFloorColliders ||
            cachedCamFloorColliders.source !== rawCamColliders ||
            cachedCamFloorColliders.heightBucket !== camHeightBucket
          ) {
            cachedCamFloorColliders = {
              source: rawCamColliders,
              heightBucket: camHeightBucket,
              colliders: buildCameraFloorColliders(
                rawCamColliders,
                desiredCamY - floorBaseY,
              ),
            };
          }
          const camFloorColliders = cachedCamFloorColliders.colliders;
          const camResolved = resolveSingleStepPosition(
            desiredCamX,
            desiredCamZ,
            camFloorColliders,
            CAMERA_COLLIDER_RADIUS,
          );
          desiredCamX = camResolved.x;
          desiredCamZ = camResolved.z;

          _camTargetPos.set(desiredCamX, desiredCamY, desiredCamZ);
          _camTargetLook.set(
            _camPivotPos.x + lookDirX * 5.5,
            _camPivotPos.y + 0.1 + lookDirY * 5.5,
            _camPivotPos.z + lookDirZ * 5.5,
          );

          const posAlpha = reducedMotion ? 1 : 1 - Math.exp(-36 * delta);
          camera.position.lerp(_camTargetPos, posAlpha);
          cameraLookTarget.lerp(_camTargetLook, posAlpha);

          // 3. Post-lerp containment & line-of-sight guard so rapid yaw swings never clip through walls or corners
          const postLerpResolved = resolveSingleStepPosition(
            camera.position.x,
            camera.position.z,
            camFloorColliders,
            CAMERA_COLLIDER_RADIUS,
          );
          camera.position.x = postLerpResolved.x;
          camera.position.z = postLerpResolved.z;
          camera.position.y = THREE.MathUtils.clamp(
            camera.position.y,
            floorBaseY + 0.55,
            floorBaseY + maxCeilingOffset,
          );

          // Hide character mesh only when camera is pushed very close to character pivot
          const finalDistToPivot3D = camera.position.distanceTo(_camPivotPos);
          const vis = resolveCharacterVisibility({
            cameraOwner: 'third_person',
            cameraDistToPivot3D: finalDistToPivot3D,
          });
          charBodyGroup.visible = vis.bodyVisible;
          charShadow.visible = vis.shadowVisible;
        }

        // Sanitize camera vectors against NaN/Infinity before rendering
        if (
          !Number.isFinite(camera.position.x) ||
          !Number.isFinite(camera.position.y) ||
          !Number.isFinite(camera.position.z)
        ) {
          camera.position.set(0, 5.2, 14.5);
        }
        if (
          !Number.isFinite(cameraLookTarget.x) ||
          !Number.isFinite(cameraLookTarget.y) ||
          !Number.isFinite(cameraLookTarget.z)
        ) {
          cameraLookTarget.set(0, 2.2, 0);
        }

        camera.lookAt(cameraLookTarget);

        // Synchronize active-floor room-entry lights only while inside Atrium
        if (!inActiveRoom3D) {
          syncAllPortalEntryLights(
            explorerGroup.position.x,
            explorerGroup.position.z,
            camera.position.x,
            camera.position.y,
            camera.position.z,
            cameraLookTarget.x,
            cameraLookTarget.y,
            cameraLookTarget.z,
            elapsed,
            reducedMotion,
            delta,
            activeFloorNum,
          );
        }

        // On-demand shadow map update: re-render shadow map only when shadows are enabled
        // and a shadow-casting entity (explorer, lift, active room, or rebuilt world) changed.
        if (renderer.shadowMap.enabled) {
          const shadowSceneMoved =
            shadowDirtyFrames > 0 ||
            inActiveRoom3D !== lastShadowInRoom ||
            !Number.isFinite(lastShadowPosX) ||
            Math.abs(explorerGroup.position.x - lastShadowPosX) > 0.002 ||
            Math.abs(explorerGroup.position.y - lastShadowPosY) > 0.002 ||
            Math.abs(explorerGroup.position.z - lastShadowPosZ) > 0.002 ||
            Math.abs(explorerGroup.rotation.y - lastShadowRotY) > 0.015 ||
            Math.abs(liftCabinGroup.position.y - lastShadowLiftY) > 0.002;
          if (shadowSceneMoved) {
            renderer.shadowMap.needsUpdate = true;
            lastShadowPosX = explorerGroup.position.x;
            lastShadowPosY = explorerGroup.position.y;
            lastShadowPosZ = explorerGroup.position.z;
            lastShadowRotY = explorerGroup.rotation.y;
            lastShadowLiftY = liftCabinGroup.position.y;
            lastShadowInRoom = inActiveRoom3D;
            if (shadowDirtyFrames > 0) shadowDirtyFrames -= 1;
          }
        }

        if (composer && qualityConfig.enablePostProcessing) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }

        // Record passive internal stats snapshot every 30 frames for diagnostics
        perfFrameCounter = (perfFrameCounter + 1) % 30;
        if (perfFrameCounter === 0 && typeof window !== 'undefined') {
          (window as unknown as { __MEMORA_PERF_STATS__?: unknown }).__MEMORA_PERF_STATS__ = {
            profileId: graphicsMonitor.currentProfileId,
            gpuTier: detectedHardware.gpuTier,
            isMobileDevice: detectedHardware.isMobileDevice,
            estimatedFps: graphicsMonitor.estimatedFps,
            avgFrameMs: Number(graphicsMonitor.averageFrameMs.toFixed(2)),
            pixelRatio: renderer.getPixelRatio(),
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
            activeFloorNum,
            inActiveRoom3D,
          };
        }

        // E. Update 3D-projected archway badges (uses cached resize dims instead of per-frame DOM reads)
        const width = cachedViewportW;
        const height = cachedViewportH;
        for (let pIdx = 0; pIdx < portalRecords.length; pIdx++) {
          const portal = portalRecords[pIdx];
          const btn = labelContainerRefs.current[portal.roomId];
          if (!btn) continue;

          if (
            portal.roomId !== 'childhood' ||
            portal.status !== 'empty' ||
            inActiveRoom3D ||
            !hasEnteredRef.current ||
            liftState.phase === 'traveling' ||
            portal.floorNumber !== currentFloorNum
          ) {
            if (btn.dataset.visState !== 'hidden') {
              btn.dataset.visState = 'hidden';
              btn.style.opacity = '0';
              btn.style.pointerEvents = 'none';
            }
            continue;
          }

          _projVec.copy(portal.labelWorldAnchor);
          _projVec.project(camera);

          if (
            !Number.isFinite(_projVec.x) ||
            !Number.isFinite(_projVec.y) ||
            _projVec.z < -1 ||
            _projVec.z > 1
          ) {
            if (btn.dataset.visState !== 'hidden') {
              btn.dataset.visState = 'hidden';
              btn.style.opacity = '0';
              btn.style.pointerEvents = 'none';
            }
            continue;
          }

          const sx = Math.round((_projVec.x + 1) * 0.5 * width * 2) * 0.5;
          const sy = Math.round((-_projVec.y + 1) * 0.5 * height * 2) * 0.5;
          const nextState = `vis:${sx}:${sy}:${portal.status}`;
          if (btn.dataset.visState !== nextState) {
            btn.dataset.visState = nextState;
            btn.style.opacity = '1';
            btn.style.pointerEvents =
              portal.status === 'empty' ? 'auto' : 'none';
            btn.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
          }
        }
      } catch (tickErr) {
        console.error('[AtriumScene3D] Recovered from frame error:', tickErr);
      }

      if (!isDisposed && !isContextLostLocal) {
        scheduleNextFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', syncCanvasRect);
      containerResizeObserver?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      domElem.removeEventListener('pointerdown', onPointerDown);
      domElem.removeEventListener('pointerup', onPointerUp);
      domElem.removeEventListener('wheel', onWheel);
      domElem.removeEventListener('webglcontextlost', onContextLost);
      domElem.removeEventListener('webglcontextrestored', onContextRestored);
      if (document.pointerLockElement === domElem) {
        document.exitPointerLock?.();
      }
      triggerCompassFlourishRef.current = null;
      resumeRenderLoopRef.current = null;
      cancelActiveCameraTransition();
      gsap.killTweensOf(kineticSculpture.rotation);
      gsap.killTweensOf(innerCore.scale);
      gsap.killTweensOf(centerpieceUplight);
      disposeActiveExhibitionBuilt();
      disposableAssets.forEach((a) => a.dispose());
      disposableAssets.length = 0;
      staticDisposableAssets.forEach((a) => a.dispose());
      staticDisposableAssets.length = 0;
      envRenderTarget?.dispose();
      bloomPass?.dispose();
      composer?.dispose();
      renderer.dispose();
    };
    };

    const initRafId = requestAnimationFrame(() => {
      if (cancelledBeforeInit) return;
      disposeInitializedScene = initScene();
    });

    return () => {
      cancelledBeforeInit = true;
      cancelAnimationFrame(initRafId);
      disposeInitializedScene?.();
    };
  }, [sceneRetryNonce]);

  // Memoized structural signature so we only rebuild 3D floor/portal/room meshes when 3D-visible data changes
  const sceneStructureSignature = useMemo(() => {
    const floorSig = floors
      .map((f) => `${f.id}:${f.floorNumber}:${f.name}`)
      .join('|');
    const roomSig = rooms
      .map((r) => {
        const roomMems = memories.filter((m) => m.roomId === r.id);
        const previewSig = roomMems
          .map(
            (m) =>
              `${m.id}:${m.title}:${m.type}:${m.date || ''}:${m.year || ''}:${m.displayOrder ?? ''}:${m.frameStyle || ''}:${m.displayStyleOverride || ''}:${m.motif}:${m.palette}:${m.hiddenFrom3D ? '1' : '0'}:${m.curatedZoneId || ''}:${m.customImageUrl ? m.customImageUrl.slice(0, 48) : ''}`,
          )
          .join(',');
        return `${r.id}:${r.floorNumber}:${r.slotIndex}:${r.name}:${r.subtitle}:${r.status}:${r.accentColor}:${r.exhibitionStyle || ''}:${r.galleryLayout || ''}:${JSON.stringify(r.designConfig || {})}:${roomMems.length}:${previewSig}`;
      })
      .join('|');
    return `${resolveMuseumDisplayName(museumSettings.projectName)}::${floorSig}::${roomSig}`;
  }, [floors, rooms, memories, museumSettings.projectName]);

  useEffect(() => {
    if (!hasMountedSceneRef.current) {
      hasMountedSceneRef.current = true;
      return;
    }
    if (rebuildSceneRef.current) {
      rebuildSceneRef.current();
    }
  }, [sceneStructureSignature]);

  const currentFloorObj = useMemo(
    () =>
      floors.find((f) => f.floorNumber === currentFloorNumberState) ||
      floors[0],
    [floors, currentFloorNumberState],
  );

  const activeRoomObj = useMemo(
    () =>
      activeRoomId ? rooms.find((r) => r.id === activeRoomId) || null : null,
    [rooms, activeRoomId],
  );
  const activeRoomMemoriesCount = useMemo(
    () =>
      activeRoomId ? memories.filter((m) => m.roomId === activeRoomId).length : 0,
    [memories, activeRoomId],
  );

  return (
    <div className="relative w-full h-full bg-[#F6F1E8] select-none overflow-hidden">
      {/* WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full bg-[#F6F1E8]"
        aria-label="Interactive Multi-Floor 3D Personal Museum"
      />

      {/* WebGL Context Lost / Initialization Error Recovery Banner & Interactive Fallback */}
      {(webglError || webglContextLost) && (
        <div
          role="alert"
          className="fixed inset-0 z-40 bg-[#F6F1E8]/95 backdrop-blur-md flex items-center justify-center p-6"
        >
          <div className="max-w-xl w-full bg-[#FFFCF6] border-2 border-[#D6A15D] rounded-3xl p-6 sm:p-8 shadow-2xl text-[#27231F] space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#D6A15D]/20 border border-[#D6A15D] flex items-center justify-center shrink-0 text-[#854D27]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono-tabular uppercase tracking-widest text-[#854D27] block">
                  {webglContextLost
                    ? '3D Graphics Context Paused'
                    : 'Interactive Museum Fallback Mode'}
                </span>
                <h2 className="font-serif-display text-2xl font-bold text-[#27231F] mt-0.5">
                  {webglContextLost
                    ? 'Restoring 3D Museum Renderer'
                    : `${resolveMuseumDisplayName(museumSettings.projectName)} Directory`}
                </h2>
                <p className="text-xs text-[#493629] mt-1 leading-relaxed">
                  {webglError ||
                    'The browser temporarily reclaimed the WebGL graphics context. You can restore the 3D museum view or open any gallery room directly below.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#493629]">
                Active Gallery Rooms ({currentFloorObj?.name || 'Floor 1'})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rooms
                  .filter(
                    (r) =>
                      r.floorNumber === (currentFloorObj?.floorNumber ?? 0),
                  )
                  .map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        if (r.status === 'active') onSelectRoom(r.id);
                        else if (r.status === 'empty')
                          onOpenCreateRoomInSlot(r.floorId, r.slotIndex, r);
                      }}
                      className="px-3.5 py-2.5 rounded-xl border border-[#E8DED0] bg-[#F6F1E8] hover:border-[#D6A15D] text-left transition-colors cursor-pointer"
                    >
                      <p className="font-serif-display font-semibold text-sm text-[#27231F] truncate">
                        {r.name}
                      </p>
                      <p className="text-[11px] text-[#493629] truncate">
                        {r.status === 'active'
                          ? 'Click to enter exhibition'
                          : r.status === 'empty'
                            ? '＋ Create room in slot'
                            : 'Disabled room'}
                      </p>
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E8DED0]">
              <button
                type="button"
                onClick={() => onSelectWallFeature('museum_settings')}
                className="px-4 py-2 rounded-xl border border-[#D6A15D] text-xs font-semibold text-[#493629] hover:bg-[#F6F1E8] cursor-pointer"
              >
                Open Feature Wall Hub
              </button>
              <button
                type="button"
                onClick={() => {
                  setWebglError(null);
                  setWebglContextLost(false);
                  setSceneRetryNonce((n) => n + 1);
                }}
                className="px-4 py-2 rounded-xl bg-[#27231F] text-[#FDE68A] hover:bg-[#493629] text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry 3D Museum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Center Aim Reticle when Native Pointer Lock is Active */}
      {isPointerLocked && liftPhase !== 'traveling' && !isAnyModalOpen && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center"
        >
          <div className="w-2 h-2 rounded-full bg-[#FDE68A]/90 border border-[#27231F] shadow-xs" />
        </div>
      )}

      {/* =====================================================================
          MINIMAL IN-ROOM CONTROLS & REAL-TIME 3D CUSTOMISATION PANEL
          When inside the Childhood Room, keep only Exit Room, Add Memory, and Customise Room.
         ===================================================================== */}
      {hasEnteredAtrium && activeRoomObj && !isAnyModalOpen && (
        <>
          {/* Minimal 3-Button In-Room Control Bar */}
          <nav
            aria-label="Room Controls"
            className="fixed top-4 right-4 sm:right-6 z-30 flex items-center gap-2 pointer-events-auto"
          >
            <button
              type="button"
              onClick={() => onSelectRoom(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#27231F]/90 hover:bg-[#27231F] text-[#FFFCF6] border border-[#C9A66B]/50 text-xs font-semibold shadow-lg transition-all cursor-pointer"
            >
              <CornerUpLeft className="w-3.5 h-3.5 text-[#C9A66B]" />
              <span>Exit Room</span>
            </button>

            {onOpenAddMemory && (
              <button
                type="button"
                onClick={() => onOpenAddMemory(activeRoomObj.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#27231F]/90 hover:bg-[#27231F] text-[#FFE2B5] border border-[#C9A66B]/60 text-xs font-semibold shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D6A15D]" />
                <span>Add Memory</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowStudioCustomizer((prev) => !prev)}
              aria-expanded={showStudioCustomizer}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-lg transition-all cursor-pointer ${
                showStudioCustomizer
                  ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                  : 'bg-[#27231F]/90 hover:bg-[#27231F] text-[#FFFCF6] border-[#C9A66B]/50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Customise Room</span>
            </button>
          </nav>

          {/* Compact Floating Real-Time 3D Customise Room Panel */}
          {showStudioCustomizer && (
            <aside
              aria-label="Customise Childhood Room"
              className="fixed top-16 right-4 sm:right-6 z-30 w-80 sm:w-96 max-h-[80vh] flex flex-col bg-[#27231F]/96 text-[#FFFCF6] border border-[#C9A66B]/60 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              {/* Panel Header */}
              <div className="px-4 py-3 border-b border-[#FFFCF6]/12 flex items-center justify-between">
                <div>
                  <h2 className="font-serif-display text-lg font-semibold text-[#FFE2B5] leading-tight">
                    Customise Childhood Room
                  </h2>
                  <p className="text-[11px] text-[#E8DED0]/75">
                    Real-time 3D interior, furniture & atmosphere
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStudioCustomizer(false)}
                  aria-label="Close Customisation"
                  className="p-1.5 rounded-lg text-[#E8DED0]/75 hover:text-[#FFFCF6] hover:bg-[#FFFCF6]/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category Tabs */}
              <div className="grid grid-cols-4 gap-1 p-2 bg-[#1E1915] border-b border-[#FFFCF6]/10 text-[11px] font-semibold">
                {(
                  [
                    { id: 'themes', label: 'Themes' },
                    { id: 'interior', label: 'Interior' },
                    { id: 'furniture', label: 'Furniture' },
                    { id: 'atmosphere', label: 'Atmosphere' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCustomiseTab(tab.id)}
                    className={`py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                      customiseTab === tab.id
                        ? 'bg-[#C9A66B] text-[#27231F]'
                        : 'text-[#E8DED0]/80 hover:bg-[#FFFCF6]/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Customisation Body */}
              <div className="p-4 space-y-3.5 overflow-y-auto text-xs flex-1">
                {customiseTab === 'themes' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#E8DED0]/80 mb-2">
                      Select a Childhood Theme Style to transform the 3D bedroom, furniture, and lighting immediately:
                    </p>
                    {(
                      Object.values(CHILDHOOD_THEME_STYLE_PRESETS) as Array<
                        (typeof CHILDHOOD_THEME_STYLE_PRESETS)[ChildhoodThemeStyleId]
                      >
                    ).map((preset) => {
                      const isSelected =
                        currentStudioConfig.childhoodThemeStyle === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => pushStudioConfigChange(preset.config)}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#C9A66B]/20 border-[#C9A66B] text-[#FFE2B5]'
                              : 'bg-[#1E1915]/90 border-[#FFFCF6]/12 text-[#FFFCF6] hover:border-[#C9A66B]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-serif-display text-sm font-semibold">
                              {preset.label}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#C9A66B] text-[#27231F] font-bold">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#E8DED0]/75 mt-1 leading-snug">
                            {preset.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {customiseTab === 'interior' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="flex items-center justify-between bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2">
                        <span className="text-[11px] text-[#E8DED0]">Wall Colour</span>
                        <input
                          type="color"
                          value={currentStudioConfig.wallColorHex}
                          onChange={(e) =>
                            pushStudioConfigChange({ wallColorHex: e.target.value })
                          }
                          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                      </label>
                      <label className="flex items-center justify-between bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2">
                        <span className="text-[11px] text-[#E8DED0]">Floor Colour</span>
                        <input
                          type="color"
                          value={currentStudioConfig.floorColorHex}
                          onChange={(e) =>
                            pushStudioConfigChange({ floorColorHex: e.target.value })
                          }
                          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                      </label>
                      <label className="flex items-center justify-between bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2">
                        <span className="text-[11px] text-[#E8DED0]">Ceiling</span>
                        <input
                          type="color"
                          value={currentStudioConfig.ceilingColorHex || '#FAF5EC'}
                          onChange={(e) =>
                            pushStudioConfigChange({ ceilingColorHex: e.target.value })
                          }
                          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                      </label>
                      <label className="flex items-center justify-between bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2">
                        <span className="text-[11px] text-[#E8DED0]">Curtains</span>
                        <input
                          type="color"
                          value={currentStudioConfig.curtainColorHex || '#E6D7C3'}
                          onChange={(e) =>
                            pushStudioConfigChange({ curtainColorHex: e.target.value })
                          }
                          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                      </label>
                    </div>

                    <label className="block bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#C9A66B]">
                        Wall Texture
                      </span>
                      <select
                        value={currentStudioConfig.wallTexture || 'wood_wainscoting'}
                        onChange={(e) =>
                          pushStudioConfigChange({
                            wallTexture: e.target
                              .value as RoomCustomizationStudioConfig['wallTexture'],
                          })
                        }
                        className="w-full bg-[#27231F] text-[#FFFCF6] rounded-lg px-2 py-1.5 text-xs border border-[#FFFCF6]/15"
                      >
                        <option value="smooth_plaster">Smooth Plaster</option>
                        <option value="wood_wainscoting">Wood Wainscoting</option>
                        <option value="striped_wallpaper">Vintage Striped Wallpaper</option>
                        <option value="storybook_mural">Storybook Mural Finish</option>
                      </select>
                    </label>

                    <label className="block bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#C9A66B]">
                        Floor Material
                      </span>
                      <select
                        value={currentStudioConfig.floorMaterial}
                        onChange={(e) =>
                          pushStudioConfigChange({
                            floorMaterial: e.target
                              .value as RoomCustomizationStudioConfig['floorMaterial'],
                          })
                        }
                        className="w-full bg-[#27231F] text-[#FFFCF6] rounded-lg px-2 py-1.5 text-xs border border-[#FFFCF6]/15"
                      >
                        <option value="warm_oak">Warm Oak Parquet</option>
                        <option value="herringbone_walnut">Herringbone Walnut</option>
                        <option value="polished_marble">Polished Cream Marble</option>
                        <option value="travertine_stone">Travertine Stone</option>
                      </select>
                    </label>

                    <label className="block bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#C9A66B]">
                        Window Style & Curtains
                      </span>
                      <select
                        value={currentStudioConfig.windowStyle || 'arched_sunlit'}
                        onChange={(e) =>
                          pushStudioConfigChange({
                            windowStyle: e.target
                              .value as RoomCustomizationStudioConfig['windowStyle'],
                          })
                        }
                        className="w-full bg-[#27231F] text-[#FFFCF6] rounded-lg px-2 py-1.5 text-xs border border-[#FFFCF6]/15"
                      >
                        <option value="arched_sunlit">Tall Arched Sunlit Windows</option>
                        <option value="stained_amber">Warm Amber Tinted Windows</option>
                        <option value="wide_garden_view">Clear Backyard Garden View</option>
                      </select>
                      <div className="pt-1.5 flex items-center justify-between">
                        <span className="text-[11px] text-[#E8DED0]">Show Window Curtains</span>
                        <input
                          type="checkbox"
                          checked={currentStudioConfig.curtainsVisible ?? true}
                          onChange={(e) =>
                            pushStudioConfigChange({ curtainsVisible: e.target.checked })
                          }
                          className="accent-[#C9A66B]"
                        />
                      </div>
                    </label>
                  </div>
                )}

                {customiseTab === 'furniture' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="flex items-center justify-between bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2">
                        <span className="text-[11px] text-[#E8DED0]">Furniture Wood</span>
                        <input
                          type="color"
                          value={currentStudioConfig.furnitureColorHex || '#FFFFFF'}
                          onChange={(e) =>
                            pushStudioConfigChange({
                              furnitureColorHex: e.target.value,
                            })
                          }
                          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                      </label>
                      <label className="flex items-center justify-between bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2">
                        <span className="text-[11px] text-[#E8DED0]">Bedsheet</span>
                        <input
                          type="color"
                          value={currentStudioConfig.bedsheetColorHex || '#C87A5B'}
                          onChange={(e) =>
                            pushStudioConfigChange({
                              bedsheetColorHex: e.target.value,
                            })
                          }
                          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="block bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-2.5 py-2 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-[#C9A66B]">
                          Bed Design
                        </span>
                        <select
                          value={currentStudioConfig.bedDesign || 'classic_sleigh'}
                          onChange={(e) =>
                            pushStudioConfigChange({
                              bedDesign: e.target
                                .value as RoomCustomizationStudioConfig['bedDesign'],
                            })
                          }
                          className="w-full bg-[#27231F] text-[#FFFCF6] rounded-lg px-2 py-1 text-xs border border-[#FFFCF6]/15"
                        >
                          <option value="classic_sleigh">Classic Sleigh Bed</option>
                          <option value="cozy_canopy">4-Poster Canopy Bed</option>
                          <option value="modern_timber">Modern Timber Bed</option>
                        </select>
                      </label>

                      <label className="block bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-2.5 py-2 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-[#C9A66B]">
                          Cupboard / Wardrobe
                        </span>
                        <select
                          value={currentStudioConfig.cupboardStyle || 'vintage_walnut'}
                          onChange={(e) =>
                            pushStudioConfigChange({
                              cupboardStyle: e.target
                                .value as RoomCustomizationStudioConfig['cupboardStyle'],
                            })
                          }
                          className="w-full bg-[#27231F] text-[#FFFCF6] rounded-lg px-2 py-1 text-xs border border-[#FFFCF6]/15"
                        >
                          <option value="vintage_walnut">Vintage Walnut</option>
                          <option value="painted_ivory">Painted Ivory</option>
                          <option value="glass_display">Glass Keepsake</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="block bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-2.5 py-2 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-[#C9A66B]">
                          Desk & Chair Style
                        </span>
                        <select
                          value={currentStudioConfig.deskStyle || 'scholar_oak'}
                          onChange={(e) =>
                            pushStudioConfigChange({
                              deskStyle: e.target
                                .value as RoomCustomizationStudioConfig['deskStyle'],
                            })
                          }
                          className="w-full bg-[#27231F] text-[#FFFCF6] rounded-lg px-2 py-1 text-xs border border-[#FFFCF6]/15"
                        >
                          <option value="scholar_oak">Scholar Oak Desk</option>
                          <option value="playful_craft">Playful Craft Table</option>
                          <option value="minimal_birch">Minimal Birch Desk</option>
                        </select>
                      </label>

                      <label className="block bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-2.5 py-2 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-[#C9A66B]">
                          Furniture Layout
                        </span>
                        <select
                          value={currentStudioConfig.furnitureLayoutPreset || 'classic'}
                          onChange={(e) =>
                            pushStudioConfigChange({
                              furnitureLayoutPreset: e.target
                                .value as RoomCustomizationStudioConfig['furnitureLayoutPreset'],
                            })
                          }
                          className="w-full bg-[#27231F] text-[#FFFCF6] rounded-lg px-2 py-1 text-xs border border-[#FFFCF6]/15"
                        >
                          <option value="classic">Classic Bedroom</option>
                          <option value="window_facing">Angled by Window</option>
                          <option value="spacious_play">Spacious Play Floor</option>
                        </select>
                      </label>
                    </div>

                    <label className="block bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#C9A66B]">
                        Toy & Decoration Arrangement
                      </span>
                      <select
                        value={currentStudioConfig.toyArrangementPreset || 'train_adventure'}
                        onChange={(e) =>
                          pushStudioConfigChange({
                            toyArrangementPreset: e.target
                              .value as RoomCustomizationStudioConfig['toyArrangementPreset'],
                          })
                        }
                        className="w-full bg-[#27231F] text-[#FFFCF6] rounded-lg px-2 py-1.5 text-xs border border-[#FFFCF6]/15"
                      >
                        <option value="train_adventure">Express Train & Play Circle</option>
                        <option value="playtime_circle">Gathered Playtime Circle</option>
                        <option value="tidied_shelf">Tidied Along Alcove</option>
                      </select>
                    </label>

                    <div className="bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl p-3 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-[#C9A66B] block">
                        Decorative Objects (Add / Remove)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { key: 'showRugs', label: 'Woven Rugs' },
                            { key: 'showCushions', label: 'Floor Cushions' },
                            { key: 'showLamps', label: 'Reading Lamps' },
                            { key: 'showPosters', label: 'Wall Posters' },
                            { key: 'showPlants', label: 'Indoor Plants' },
                            { key: 'showToys', label: 'Childhood Toys' },
                          ] as const
                        ).map((item) => (
                          <label
                            key={item.key}
                            className="flex items-center gap-2 text-[11px] text-[#E8DED0] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={currentStudioConfig[item.key] ?? true}
                              onChange={(e) =>
                                pushStudioConfigChange({
                                  [item.key]: e.target.checked,
                                })
                              }
                              className="accent-[#C9A66B]"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {customiseTab === 'atmosphere' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-[#C9A66B] block">
                        Room Lighting & Time of Day
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { id: 'morning_sunlight', label: 'Warm Daylight' },
                            { id: 'golden_hour', label: 'Evening Golden Hour' },
                            { id: 'night_starlight', label: 'Night Starlight' },
                            { id: 'rainy_window', label: 'Soft Ambient & Rain' },
                          ] as { id: AtmospherePresetId; label: string }[]
                        ).map((atm) => (
                          <button
                            key={atm.id}
                            type="button"
                            onClick={() =>
                              pushStudioConfigChange({ atmospherePreset: atm.id })
                            }
                            className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                              currentStudioConfig.atmospherePreset === atm.id
                                ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5] font-semibold'
                                : 'bg-[#1E1915] text-[#E8DED0] border-[#FFFCF6]/12 hover:border-[#C9A66B]/50'
                            }`}
                          >
                            {atm.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="block bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#E8DED0]">Lighting Intensity</span>
                        <span className="font-mono-tabular text-[#FFE2B5]">
                          {currentStudioConfig.lightIntensity.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.8}
                        max={4.0}
                        step={0.1}
                        value={currentStudioConfig.lightIntensity}
                        onChange={(e) =>
                          pushStudioConfigChange({
                            lightIntensity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-[#C9A66B]"
                      />
                    </label>

                    <label className="block bg-[#1E1915] border border-[#FFFCF6]/12 rounded-xl px-3 py-2 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#C9A66B]">
                        Outdoor Sky & Garden Appearance
                      </span>
                      <select
                        value={
                          currentStudioConfig.skyGardenAppearance || 'sunny_garden'
                        }
                        onChange={(e) =>
                          pushStudioConfigChange({
                            skyGardenAppearance: e.target
                              .value as RoomCustomizationStudioConfig['skyGardenAppearance'],
                          })
                        }
                        className="w-full bg-[#27231F] text-[#FFFCF6] rounded-lg px-2 py-1.5 text-xs border border-[#FFFCF6]/15"
                      >
                        <option value="sunny_garden">Sunlit Backyard Garden</option>
                        <option value="sunset_meadow">Warm Sunset Meadow</option>
                        <option value="starlit_sky">Starlit Night Canopy</option>
                        <option value="rainy_courtyard">Misty Rainy Courtyard</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              {/* Panel Footer Actions: Apply Changes, Reset Customisation, Close Customisation */}
              <div className="p-3 bg-[#1E1915] border-t border-[#FFFCF6]/12 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleResetStudio}
                  className="px-3 py-1.5 rounded-xl border border-[#FFFCF6]/15 bg-[#27231F] hover:bg-[#3C2D22] text-[#E8DED0] text-xs font-medium transition-colors cursor-pointer"
                >
                  Reset Customisation
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStudioCustomizer(false)}
                    className="px-3 py-1.5 rounded-xl border border-[#FFFCF6]/15 bg-transparent hover:bg-[#FFFCF6]/10 text-[#E8DED0] text-xs font-medium transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStudio}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#D6A15D] to-[#C9A66B] hover:brightness-105 text-[#27231F] text-xs font-semibold shadow-md transition-all cursor-pointer"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            </aside>
          )}
        </>
      )}

      {/* 3D-Anchored Archway Badge (Only for Childhood Room slot) */}
      <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
        {rooms
          .filter((room) => room.id === 'childhood')
          .map((room) => {
            const count = memories.filter((m) => m.roomId === room.id).length;
            return (
              <button
                key={room.id}
                ref={(el) => {
                  labelContainerRefs.current[room.id] = el;
                }}
                type="button"
                onClick={() => {
                  if (room.status === 'empty') {
                    onSmartAddRoom?.();
                  }
                }}
                style={{ opacity: 0, pointerEvents: 'none' }}
                className={`fixed top-0 left-0 px-3 py-1 rounded-xl border shadow-md transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  room.status === 'empty'
                    ? 'bg-[#FFFCF6]/95 text-[#493629] border-[#C9A66B] hover:bg-[#F6F1E8] cursor-pointer'
                    : 'bg-[#2A1C12]/92 text-[#FAF5EC] border-[#C9A66B]/60 cursor-default'
                }`}
              >
                {room.status === 'empty' ? (
                  <>
                    <Plus className="w-3 h-3 text-[#493629]" />
                    <span className="font-serif-display text-xs font-semibold">
                      Activate Childhood Room
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      style={{ backgroundColor: room.accentColor }}
                      className="w-2 h-2 rounded-full shrink-0"
                    />
                    <span className="font-serif-display text-sm font-semibold text-[#FFE2B5]">
                      {room.name}
                    </span>
                    <span className="text-[11px] text-[#E5D6C3] font-mono-tabular">
                      {count}
                    </span>
                  </>
                )}
              </button>
            );
          })}
      </div>

      {/* =====================================================================
          FIRST-PERSON ELEVATOR CABIN FLOOR-SELECTION PANEL (Automatic Elevator)
          Positioned inside the cabin view so the cabin interior & doors stay visible
         ===================================================================== */}
      {hasEnteredAtrium &&
        !activeRoomId &&
        (isInsideCabin ||
          liftPhase === 'traveling' ||
          liftPhase === 'travel_closing') && (
          <div
            role="dialog"
            aria-label="Elevator Cabin Floor Selection Panel"
            className="fixed inset-y-0 right-4 sm:right-8 z-30 flex items-center pointer-events-none"
          >
            <div className="pointer-events-auto w-72 sm:w-80 bg-[#27231F]/96 text-[#FFFCF6] border-2 border-[#C9A66B] rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5">
              {/* Cabin Digital Floor Indicator Header */}
              <div className="flex items-center justify-between border-b border-[#493629] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#1E1610] border border-[#C9A66B] text-[#FFE2B5] font-mono-tabular font-bold text-sm flex items-center justify-center">
                    F{liftCabinFloorNumber + 1}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#C9A66B] block">
                      {liftPhase === 'traveling'
                        ? 'Cabin In Transit'
                        : liftPhase === 'travel_closing'
                          ? 'Doors Closing'
                          : 'Cabin Floor Panel'}
                    </span>
                    <h3 className="font-serif-display text-lg font-semibold text-[#FFFCF6] leading-tight">
                      {liftPhase === 'traveling'
                        ? `Travelling to Floor ${liftTargetFloorNumber + 1}`
                        : liftPhase === 'travel_closing'
                          ? 'Closing Doors...'
                          : 'Select a Floor'}
                    </h3>
                  </div>
                </div>

                {liftPhase !== 'traveling' && liftPhase !== 'travel_closing' && (
                  <button
                    type="button"
                    onClick={() => exitLiftImmediatelyRef.current?.()}
                    className="px-2.5 py-1.5 rounded-xl bg-[#3C2D22] text-[#E9D4B1] hover:text-[#FFFCF6] text-[11px] font-semibold cursor-pointer"
                  >
                    Exit Lift
                  </button>
                )}
              </div>

              {/* Floor Buttons List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                {[...floors]
                  .sort((a, b) => b.floorNumber - a.floorNumber)
                  .map((fl) => {
                    const isCurrent = fl.floorNumber === liftCabinFloorNumber;
                    const isSelected =
                      selectedLiftFloorOption === fl.floorNumber ||
                      (liftPhase === 'traveling' &&
                        liftTargetFloorNumber === fl.floorNumber);
                    const activeCount = rooms.filter(
                      (r) =>
                        r.floorNumber === fl.floorNumber &&
                        r.status === 'active',
                    ).length;

                    return (
                      <button
                        key={fl.id}
                        type="button"
                        disabled={
                          liftPhase === 'traveling' ||
                          liftPhase === 'travel_closing'
                        }
                        onClick={() =>
                          startLiftTravelToFloorRef.current?.(fl.floorNumber)
                        }
                        className={`w-full px-3.5 py-2.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer disabled:cursor-default ${
                          isSelected
                            ? 'bg-[#C9A66B] border-[#FFE2B5] text-[#27231F] shadow-md'
                            : isCurrent
                              ? 'bg-[#3C2D22] border-[#C9A66B]/80 text-[#FFE2B5]'
                              : 'bg-[#1E1915] border-[#493629] text-[#FFFCF6] hover:border-[#C9A66B]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-full font-mono-tabular text-xs font-bold flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-[#27231F] text-[#FFE2B5] border-[#27231F]'
                                : 'bg-[#27231F] text-[#FFE2B5] border-[#C9A66B]/50'
                            }`}
                          >
                            {fl.floorNumber + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-serif-display text-base font-semibold leading-tight truncate">
                              {fl.name}
                            </p>
                            <p
                              className={`text-[10px] truncate ${
                                isSelected
                                  ? 'text-[#27231F]/80 font-medium'
                                  : 'text-[#E9D4B1]/75'
                              }`}
                            >
                              {activeCount} active{' '}
                              {activeCount === 1 ? 'gallery' : 'galleries'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono-tabular font-bold uppercase px-2 py-0.5 rounded-md shrink-0 ${
                            isSelected
                              ? 'bg-[#27231F] text-[#FFE2B5]'
                              : isCurrent
                                ? 'bg-[#27231F]/70 text-[#C9A66B]'
                                : 'text-[#C9A66B]'
                          }`}
                        >
                          {isSelected
                            ? liftPhase === 'traveling'
                              ? 'Selected'
                              : 'Arriving'
                            : isCurrent
                              ? 'Current'
                              : `Key ${fl.floorNumber + 1}`}
                        </span>
                      </button>
                    );
                  })}
              </div>

              <div className="pt-2 border-t border-[#493629] flex items-center justify-between text-[11px] text-[#E9D4B1]/80">
                <span>
                  Current: <strong>Floor {liftCabinFloorNumber + 1}</strong>
                </span>
                <span>
                  {liftPhase === 'traveling'
                    ? 'Transit in progress'
                    : liftPhase === 'travel_closing'
                      ? 'Closing doors...'
                      : 'Click or press 1–9'}
                </span>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================================
          IN-ROOM MEMORY INSPECTION, CONTEXTUAL STATION & ATRIUM COMPASS PROMPT
         ===================================================================== */}
      {hasEnteredAtrium &&
        !isAnyModalOpen &&
        !activeBedroomInteraction &&
        ((activeRoomObj &&
          proximityTarget?.kind === 'room_interactive_object' &&
          proximityTarget.objectId) ||
          (activeRoomObj &&
            proximityTarget?.kind === 'room_memory' &&
            proximityTarget.memory) ||
          (activeRoomObj &&
            proximityTarget?.kind === 'contextual_station' &&
            proximityTarget.stationId) ||
          (!activeRoomObj &&
            proximityTarget?.kind === 'discovery_compass')) && (
          <div className="pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 z-20 px-4">
            <button
              type="button"
              onClick={() => {
                if (
                  proximityTarget?.kind === 'room_interactive_object' &&
                  proximityTarget.objectId
                ) {
                  handleTriggerObject3D(proximityTarget.objectId);
                } else if (
                  proximityTarget?.kind === 'room_memory' &&
                  proximityTarget.memory
                ) {
                  onSelectMemory(proximityTarget.memory);
                } else if (
                  proximityTarget?.kind === 'contextual_station' &&
                  proximityTarget.stationId
                ) {
                  handleOpenStationExperience(proximityTarget.stationId);
                } else if (proximityTarget?.kind === 'discovery_compass') {
                  handleCycleAtriumAtmosphereAndDiscover();
                }
              }}
              className="pointer-events-auto bg-[#27231F]/94 hover:bg-[#27231F] text-[#FFFCF6] border border-[#C9A66B]/70 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <kbd className="w-6 h-6 rounded-lg bg-[#C9A66B] text-[#27231F] font-mono-tabular text-xs font-bold flex items-center justify-center shrink-0">
                E
              </kbd>
              <span className="text-xs font-semibold text-[#FFE2B5]">
                {proximityTarget.kind === 'room_interactive_object'
                  ? proximityTarget.promptVerb || `Interact with ${proximityTarget.title}`
                  : proximityTarget.kind === 'discovery_compass'
                    ? 'Cycle Atmosphere & Discover'
                    : proximityTarget.kind === 'contextual_station'
                      ? proximityTarget.stationId === 'bicycle'
                        ? 'Ride Bicycle Trail'
                        : `Explore ${proximityTarget.title}`
                      : 'Inspect memory'}
              </span>
              <span className="text-xs text-[#E8DED0] border-l border-[#493629] pl-2.5 max-w-[200px] sm:max-w-[280px] truncate">
                {proximityTarget.kind === 'room_interactive_object'
                  ? proximityTarget.title
                  : proximityTarget.kind === 'discovery_compass'
                    ? atriumLightingMood === 'golden_hour'
                      ? 'Golden Hour Salon'
                      : atriumLightingMood === 'daylight_salon'
                        ? 'Daylight Salon'
                        : 'Evening Nocturne'
                    : proximityTarget.kind === 'contextual_station'
                      ? proximityTarget.subtitle
                      : proximityTarget.memory?.title}
              </span>
            </button>
          </div>
        )}

      {hasEnteredAtrium &&
        activeRoomObj &&
        activeBedroomInteraction &&
        activeExhibitionBuiltRef.current?.bedroomInteractions && (
          <BedroomInteractionOverlay
            activeObjectId={activeBedroomInteraction}
            controller={activeExhibitionBuiltRef.current.bedroomInteractions}
            revision={bedroomOverlayRevision}
            onClose={() => exitBedroomInteractionRef.current?.()}
            onSwitchInteraction={(oid) => enterBedroomInteractionRef.current?.(oid)}
            onSelectMemory={(mem) => onSelectMemory(mem)}
            onTriggerPageTurnHandAnim={() => {
              pageTurnHandAnimTimerRef.current = 0.55;
            }}
            onToggleFlashlight={() => {
              const ctrl = activeExhibitionBuiltRef.current?.bedroomInteractions;
              if (!ctrl) return false;
              const next = ctrl.setFlashlightHeld(
                !ctrl.isFlashlightHeld(),
                explorerHeadRigRef.current,
              );
              setBedroomOverlayRevision((r) => r + 1);
              return next;
            }}
            onToggleHeadphones={() => {
              const ctrl = activeExhibitionBuiltRef.current?.bedroomInteractions;
              if (!ctrl) return false;
              const next = ctrl.toggleHeadphonesWorn(explorerHeadRigRef.current);
              setBedroomOverlayRevision((r) => r + 1);
              return next;
            }}
            onTriggerCricketSwing={() => {
              cricketSwingAnimTimerRef.current = 0.72;
              activeExhibitionBuiltRef.current?.bedroomInteractions?.triggerCricketSwing();
              activeExhibitionBuiltRef.current?.triggerInteractiveObject?.('cricket_set');
            }}
            onOpenRadioStation={() => {
              exitBedroomInteractionRef.current?.();
              handleOpenStationExperience('radio');
            }}
          />
        )}

      {/* =====================================================================
          STAGE 02 CONTEXTUAL PARK & ROOM MEMORY EXPERIENCES
          1. Bicycle Trail Ride Mode & Cycling Memories Strip
          2. Treehouse Friendship Photos & Archived Conversation Explorer
          3. Outdoor Cinema Video Collection & Video Player
          4. Memory Radio Audio Collection & Non-Autoplay Voice Player
          5. Memory Garden Trail Photo Browser
         ===================================================================== */}
      {hasEnteredAtrium &&
        activeRoomObj &&
        !isAnyModalOpen &&
        !walkthroughActive && (
          <>
            {/* Quick Contextual Park Experiences Bar (top-left inside Childhood Room/Park) */}
            <div
              data-ui-interactive="true"
              className="fixed top-4 left-4 sm:left-6 z-20 flex flex-wrap items-center gap-1.5 pointer-events-auto"
            >
              <button
                type="button"
                onClick={() =>
                  bicycleRideActive
                    ? handleStopBicycleRide()
                    : handleOpenStationExperience('bicycle')
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-md transition-all cursor-pointer ${
                  bicycleRideActive || activeContextualStation === 'bicycle'
                    ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                    : 'bg-[#27231F]/88 hover:bg-[#27231F] text-[#FFFCF6] border-[#C9A66B]/45'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>{bicycleRideActive ? 'Riding Trail' : 'Bicycle Trail'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveContextualStation((prev) =>
                    prev === 'treehouse' ? null : 'treehouse',
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-md transition-all cursor-pointer ${
                  activeContextualStation === 'treehouse' ||
                  activeSpaceId === 'treehouse'
                    ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                    : 'bg-[#27231F]/88 hover:bg-[#27231F] text-[#FFFCF6] border-[#C9A66B]/45'
                }`}
              >
                <TreePine className="w-3.5 h-3.5" />
                <span>Treehouse</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveContextualStation((prev) =>
                    prev === 'cinema' ? null : 'cinema',
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-md transition-all cursor-pointer ${
                  activeContextualStation === 'cinema'
                    ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                    : 'bg-[#27231F]/88 hover:bg-[#27231F] text-[#FFFCF6] border-[#C9A66B]/45'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Outdoor Cinema</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveContextualStation((prev) =>
                    prev === 'radio' ? null : 'radio',
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-md transition-all cursor-pointer ${
                  activeContextualStation === 'radio'
                    ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                    : 'bg-[#27231F]/88 hover:bg-[#27231F] text-[#FFFCF6] border-[#C9A66B]/45'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Memory Radio</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveContextualStation((prev) =>
                    prev === 'garden' ? null : 'garden',
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-md transition-all cursor-pointer ${
                  activeContextualStation === 'garden'
                    ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                    : 'bg-[#27231F]/88 hover:bg-[#27231F] text-[#FFFCF6] border-[#C9A66B]/45'
                }`}
              >
                <Flower2 className="w-3.5 h-3.5" />
                <span>Memory Garden</span>
              </button>
            </div>

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
        )}

      {/* =====================================================================
          GUIDED MUSEUM WALKTHROUGH OVERLAY & INSTRUCTIONAL TOOLTIPS
          Uses the character controller to walk from zone to zone with step-by-step
          instructions for the Scrapbook, Cinema Corner, Audio Memories, and more
         ===================================================================== */}
      {hasEnteredAtrium &&
        activeRoomObj &&
        walkthroughActive &&
        !isAnyModalOpen &&
        (() => {
          const currentStop =
            WALKTHROUGH_ZONES[walkthroughStepIdx] || WALKTHROUGH_ZONES[0];
          const isScrapbook = currentStop.id === 'interactive_scrapbook';
          const isCinema = currentStop.id === 'cinema_corner';
          const isAudio = currentStop.id === 'audio_memories';

          return (
            <section
              aria-label="Guided Museum Walkthrough"
              data-ui-interactive="true"
              className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[94vw] max-w-2xl bg-[#27231F]/96 text-[#FFFCF6] border-2 border-[#C9A66B] rounded-2xl shadow-2xl p-3.5 sm:p-4 space-y-2.5"
            >
              {/* Top Row: Stop Progress Badge, Walking/Arrived Status, 1st/3rd Person Toggle & Close */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#493629] pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#C9A66B] text-[#27231F] font-mono-tabular text-[10px] font-bold uppercase tracking-wider">
                    Stop {currentStop.stepNumber} of {WALKTHROUGH_ZONES.length}
                  </span>
                  <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#FFE2B5] font-semibold">
                    {currentStop.categoryBadge}
                  </span>
                  <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-[#3C2D22] text-[#E9D4B1] border border-[#C9A66B]/40">
                    {walkthroughWalking
                      ? 'Character Walking to Zone...'
                      : 'Arrived at Exhibition Zone'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCameraViewMode((prev) =>
                        prev === 'third_person'
                          ? 'first_person'
                          : 'third_person',
                      )
                    }
                    title="Switch between 1st-Person and 3rd-Person character view"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#3C2D22] hover:bg-[#493629] text-[#FFE2B5] border border-[#C9A66B]/40 text-[10px] font-semibold cursor-pointer"
                  >
                    <Eye className="w-3 h-3 text-[#C9A66B]" />
                    <span>
                      {cameraViewMode === 'first_person'
                        ? 'Switch to 3rd Person'
                        : 'Switch to 1st Person'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalkthroughAutoPlay((prev) => !prev)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${
                      walkthroughAutoPlay
                        ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                        : 'bg-[#3C2D22] text-[#E9D4B1] border-[#6E5641]'
                    }`}
                  >
                    {walkthroughAutoPlay ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>Auto-Tour: On</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        <span>Auto-Tour: Paused</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={stopMuseumWalkthrough}
                    aria-label="End Guided Museum Walkthrough"
                    className="p-1 rounded-lg bg-[#3C2D22] hover:bg-[#493629] text-[#E9D4B1] hover:text-[#FFFCF6] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Body: Zone Narration + Instructional Tooltip Box */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
                {/* Left Column: Zone Title, Guide Narration & Primary Action */}
                <div className="sm:col-span-5 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-serif-display text-lg font-semibold text-[#FFE2B5] flex items-center gap-1.5 leading-snug">
                      {isScrapbook && (
                        <BookOpen className="w-4 h-4 text-[#C9A66B] shrink-0" />
                      )}
                      {isCinema && (
                        <Film className="w-4 h-4 text-[#C9A66B] shrink-0" />
                      )}
                      {isAudio && (
                        <Volume2 className="w-4 h-4 text-[#C9A66B] shrink-0" />
                      )}
                      <span>{currentStop.title}</span>
                    </h3>
                    <p className="text-xs text-[#E8DED0] mt-1 leading-relaxed">
                      {currentStop.guideNarration}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleWalkthroughInteractCurrentZone}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C9A66B] hover:bg-[#FFE2B5] text-[#27231F] text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      <kbd className="px-1.5 py-0.5 rounded bg-[#27231F] text-[#FFE2B5] font-mono-tabular text-[10px]">
                        E
                      </kbd>
                      <span>{currentStop.actionButtonLabel}</span>
                    </button>

                    {!walkthroughWalking && (
                      <button
                        type="button"
                        onClick={() =>
                          navigateCharacterToWalkthroughStop(walkthroughStepIdx)
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-[#3C2D22] hover:bg-[#493629] text-[#FFE2B5] border border-[#C9A66B]/40 text-[11px] font-medium cursor-pointer"
                      >
                        Re-Center Character
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Column: Instructional Tooltip Box (How to Interact with Scrapbook, Cinema, Audio, etc.) */}
                <div className="sm:col-span-7 rounded-xl bg-[#1E1610] border border-[#C9A66B]/60 p-2.5 sm:p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono-tabular uppercase tracking-wider font-bold text-[#C9A66B] flex items-center gap-1">
                      <Info className="w-3 h-3 text-[#C9A66B] shrink-0" />
                      {currentStop.howToTitle}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-[#FFE2B5] bg-[#3C2D22] px-2 py-0.5 rounded">
                      {currentStop.shortcutBadge}
                    </span>
                  </div>

                  <ul className="space-y-1 text-[11px] text-[#FAF5EC] leading-snug list-disc list-inside">
                    {currentStop.instructions.map((inst, i) => (
                      <li key={i} className="text-[#E8DED0]">
                        {inst}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottom Row: 7-Zone Stepper Pills + Prev / Next Stop Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#493629]">
                <div className="flex flex-wrap items-center gap-1">
                  {WALKTHROUGH_ZONES.map((zone, idx) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => navigateCharacterToWalkthroughStop(idx)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono-tabular font-semibold border transition-colors cursor-pointer ${
                        idx === walkthroughStepIdx
                          ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5]'
                          : 'bg-[#3C2D22] hover:bg-[#493629] text-[#E9D4B1] border-[#493629]'
                      }`}
                    >
                      {zone.shortLabel}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() =>
                      navigateCharacterToWalkthroughStop(walkthroughStepIdx - 1)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3C2D22] hover:bg-[#493629] text-[#FFE2B5] border border-[#C9A66B]/45 text-xs font-semibold cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev Zone</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigateCharacterToWalkthroughStop(walkthroughStepIdx + 1)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C9A66B] hover:bg-[#FFE2B5] text-[#27231F] text-xs font-bold cursor-pointer"
                  >
                    <span>Next Zone</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </section>
          );
        })()}

      {/* =====================================================================
          BOTTOM-LEFT ROOM AND SECTION NAME (Sole Location Indicator)
          Displays Central Atrium, Childhood Room, Backyard, Treehouse, or Play Area
         ===================================================================== */}
      {hasEnteredAtrium && museumSettings.showMiniMap && (
        <aside
          aria-label="Current Location Indicator"
          className="pointer-events-none fixed bottom-4 left-4 sm:left-6 z-20 bg-[#27231F]/95 text-[#FFFCF6] border border-[#C9A66B]/45 rounded-xl shadow-lg px-3.5 py-1.5 flex items-center gap-2 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-[#C9A66B] shrink-0" />
          <span className="font-serif-display text-xs sm:text-sm font-semibold text-[#FFE2B5] tracking-wide">
            {!activeRoomObj
              ? 'Central Atrium'
              : activeSpaceId === 'backyard'
                ? 'Backyard'
                : activeSpaceId === 'treehouse'
                  ? 'Treehouse'
                  : activeSpaceId === 'play_area'
                    ? 'Play Area'
                    : 'Childhood Room'}
          </span>
        </aside>
      )}

      {/* =====================================================================
          BOTTOM-RIGHT CONTROLS GUIDE (Atrium + Touch/Mobile Room Exploration)
          Provides responsive touch D-pad on mobile/tablet and keyboard/mouse guide on desktop
         ===================================================================== */}
      {hasEnteredAtrium && !isAnyModalOpen && !walkthroughActive && (
        <aside
          aria-label="Exploration Controls Guide"
          className={`fixed bottom-4 right-4 sm:right-6 z-20 flex flex-col items-end gap-1.5 ${
            activeRoomObj && !isControlsGuideVisible ? 'md:hidden' : ''
          }`}
        >
          {isControlsGuideVisible ? (
            <div
              className={`bg-[#27231F]/90 text-[#FFFCF6] border rounded-2xl shadow-lg p-2.5 flex flex-col items-center gap-1.5 transition-opacity duration-300 ${
                controlsOverlayBright ||
                tutorialTargetHighlight === 'movement_controls'
                  ? 'opacity-100 border-[#C9A66B]'
                  : 'opacity-85 hover:opacity-100 border-[#C9A66B]/45'
              }`}
            >
              <div className="w-full flex items-center justify-between gap-3 pb-1 border-b border-[#493629] text-[10px]">
                <span className="font-mono-tabular text-[#FFE2B5]">
                  {isMouseCaptured || isPointerLocked
                    ? 'Mouse Look · Esc release'
                    : 'Drag / Touch to look'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleControlsGuide}
                  aria-label="Hide controls guide"
                  title="Hide controls guide"
                  className="text-[#E8DED0]/75 hover:text-[#FFFCF6] p-1 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                aria-label="Move Forward (W or Up Arrow)"
                onPointerDown={() => {
                  touchInputRef.current.forward = true;
                  syncControlVisualsFromInput(false);
                }}
                onPointerUp={() => {
                  touchInputRef.current.forward = false;
                  syncControlVisualsFromInput(false);
                }}
                onPointerLeave={() => {
                  touchInputRef.current.forward = false;
                  syncControlVisualsFromInput(false);
                }}
                className={`w-11 h-9 sm:w-9 sm:h-7 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${
                  activeKeyVisuals.forward
                    ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5] scale-105'
                    : 'bg-[#3C2D22]/90 hover:bg-[#493629] text-[#FFFCF6] border-[#6E5641]'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                <span className="text-[8px] font-mono-tabular font-bold leading-none">
                  W
                </span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Move Left (A or Left Arrow)"
                  onPointerDown={() => {
                    touchInputRef.current.left = true;
                    syncControlVisualsFromInput(false);
                  }}
                  onPointerUp={() => {
                    touchInputRef.current.left = false;
                    syncControlVisualsFromInput(false);
                  }}
                  onPointerLeave={() => {
                    touchInputRef.current.left = false;
                    syncControlVisualsFromInput(false);
                  }}
                  className={`w-11 h-9 sm:w-9 sm:h-7 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${
                    activeKeyVisuals.left
                      ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5] scale-105'
                      : 'bg-[#3C2D22]/90 hover:bg-[#493629] text-[#FFFCF6] border-[#6E5641]'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span className="text-[8px] font-mono-tabular font-bold leading-none">
                    A
                  </span>
                </button>

                <button
                  type="button"
                  aria-label="Interact (Key E)"
                  onClick={handleTriggerProximityInteraction}
                  className={`w-11 h-9 sm:w-9 sm:h-7 rounded-lg font-mono-tabular text-[10px] font-bold flex flex-col items-center justify-center cursor-pointer transition-all border ${
                    activeKeyVisuals.interact
                      ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5] scale-105'
                      : 'bg-[#27231F] hover:bg-[#493629] text-[#FFE2B5] border-[#C9A66B]/50'
                  }`}
                >
                  <span>E</span>
                </button>

                <button
                  type="button"
                  aria-label="Move Right (D or Right Arrow)"
                  onPointerDown={() => {
                    touchInputRef.current.right = true;
                    syncControlVisualsFromInput(false);
                  }}
                  onPointerUp={() => {
                    touchInputRef.current.right = false;
                    syncControlVisualsFromInput(false);
                  }}
                  onPointerLeave={() => {
                    touchInputRef.current.right = false;
                    syncControlVisualsFromInput(false);
                  }}
                  className={`w-11 h-9 sm:w-9 sm:h-7 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${
                    activeKeyVisuals.right
                      ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5] scale-105'
                      : 'bg-[#3C2D22]/90 hover:bg-[#493629] text-[#FFFCF6] border-[#6E5641]'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span className="text-[8px] font-mono-tabular font-bold leading-none">
                    D
                  </span>
                </button>
              </div>

              <button
                type="button"
                aria-label="Move Backward (S or Down Arrow)"
                onPointerDown={() => {
                  touchInputRef.current.backward = true;
                  syncControlVisualsFromInput(false);
                }}
                onPointerUp={() => {
                  touchInputRef.current.backward = false;
                  syncControlVisualsFromInput(false);
                }}
                onPointerLeave={() => {
                  touchInputRef.current.backward = false;
                  syncControlVisualsFromInput(false);
                }}
                className={`w-11 h-9 sm:w-9 sm:h-7 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${
                  activeKeyVisuals.backward
                    ? 'bg-[#C9A66B] text-[#27231F] border-[#FFE2B5] scale-105'
                    : 'bg-[#3C2D22]/90 hover:bg-[#493629] text-[#FFFCF6] border-[#6E5641]'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                <span className="text-[8px] font-mono-tabular font-bold leading-none">
                  S
                </span>
              </button>

              <div className="w-full pt-1 border-t border-[#493629] flex items-center justify-between gap-2 text-[9px] font-mono-tabular text-[#E8DED0]/80">
                <span>Move: WASD / Touch</span>
                <span>View: V</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleToggleControlsGuide}
              aria-label="Show controls guide"
              title="Show controls guide"
              className="bg-[#27231F]/90 hover:bg-[#27231F] text-[#FFE2B5] border border-[#C9A66B]/45 rounded-xl px-3 py-2 sm:py-1.5 shadow-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#C9A66B]" />
              <span>Controls</span>
            </button>
          )}
        </aside>
      )}

      {/* Hover Tooltip for 3D Wall Panels, Lift & Room Portals */}
      {hoveredInfo && !isPointerLocked && liftPhase !== 'traveling' && (
        <div
          style={{
            transform: `translate3d(${Math.min(
              hoveredInfo.x + 16,
              window.innerWidth - 280,
            )}px, ${Math.max(hoveredInfo.y - 56, 16)}px, 0)`,
          }}
          className="pointer-events-none fixed top-0 left-0 z-30 bg-[#27231F]/95 text-[#FFFCF6] px-3.5 py-2 rounded-lg border border-[#C9A66B]/50 shadow-lg"
        >
          <p className="font-serif-display text-base font-semibold leading-tight text-[#FFE2B5]">
            {hoveredInfo.title}
          </p>
          <p className="text-xs text-[#E9D4B1] mt-0.5 whitespace-nowrap">
            {hoveredInfo.subtitle}
          </p>
        </div>
      )}
    </div>
  );
};

export const AtriumScene3D = React.memo(AtriumScene3DComponent);
