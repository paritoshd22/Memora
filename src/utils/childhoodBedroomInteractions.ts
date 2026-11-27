import * as THREE from 'three';
import { Memory } from '../types/museum';
import { InteractiveObjectId3D, LivingWorldSpaceId } from '../types/aiStudio';
import { VisualQualityConfig } from './museumVisualStandards';
import { getAuthenticMemoryDateLabel } from './roomTextureGenerators';
import { bedroomSfx } from './bedroomSfx';
import type { ChildhoodBedroomMaterialLibrary } from './childhoodBedroomMaterials';

export type BedroomCharacterPoseMode =
  | 'idle'
  | 'crawl'
  | 'scrapbook_read'
  | 'crt_sit'
  | 'drawer_inspect'
  | 'cricket_swing'
  | 'window_gaze'
  | 'inspect';

export type CrtAppView = 'boot' | 'desktop' | 'videos' | 'music' | 'voices' | 'folders';

export interface BedroomInteractiveZoneMeta {
  objectId: InteractiveObjectId3D;
  spaceId: LivingWorldSpaceId;
  title: string;
  promptVerb: string;
  subtitle: string;
  radius: number;
  underBedOnly?: boolean;
  anchor: THREE.Object3D;
  getFocusCamera: () => {
    cameraPos: [number, number, number];
    lookAt: [number, number, number];
    characterPos?: [number, number, number];
    characterYaw?: number;
    pose: BedroomCharacterPoseMode;
  };
}

export interface BedroomScrapbookState {
  spreadIndex: number;
  totalSpreads: number;
  photoMemories: Memory[];
}

export interface BedroomCrtState {
  poweredOn: boolean;
  bootProgress: number;
  appView: CrtAppView;
  selectedIndex: number;
  activeMediaId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
}

export interface BedroomProjectorState {
  poweredOn: boolean;
  slideIndex: number;
  videoMemories: Memory[];
}

export interface BedroomDrawerState {
  isOpen: boolean;
  inspectingKeepsake: boolean;
  keepsakeMemories: Memory[];
  selectedIndex: number;
}

export interface ChildhoodBedroomInteractionController {
  zones: BedroomInteractiveZoneMeta[];
  evaluateProximity: (
    playerX: number,
    playerZ: number,
    isUnderBed: boolean,
  ) => BedroomInteractiveZoneMeta | null;
  getZoneById: (objectId: InteractiveObjectId3D) => BedroomInteractiveZoneMeta | undefined;
  update: (
    dt: number,
    elapsed: number,
    reducedMotion: boolean,
    isHidden: boolean,
  ) => void;
  // S-b: Under-bed scrapbook & flashlight
  setUnderBedActive: (active: boolean) => void;
  setScrapbookOpen: (open: boolean) => void;
  turnScrapbookPage: (dir: -1 | 1) => { spreadIndex: number; totalSpreads: number; turned: boolean };
  getScrapbookState: () => BedroomScrapbookState;
  setFlashlightHeld: (held: boolean, headRig?: THREE.Object3D | null) => boolean;
  isFlashlightHeld: () => boolean;
  updateFlashlightAim: (origin: THREE.Vector3, forwardDir: THREE.Vector3) => void;
  // S-c: Bedside drawer
  toggleBedsideDrawer: (forceOpen?: boolean) => BedroomDrawerState;
  setDrawerInspectingKeepsake: (inspecting: boolean) => BedroomDrawerState;
  stepDrawerKeepsake: (dir: -1 | 1) => BedroomDrawerState;
  getDrawerState: () => BedroomDrawerState;
  // S-e: Retro CRT Computer & Headphones
  setCrtPower: (on: boolean) => BedroomCrtState;
  setCrtAppView: (view: CrtAppView) => BedroomCrtState;
  selectCrtItem: (index: number) => BedroomCrtState;
  toggleCrtMediaPlay: () => BedroomCrtState;
  seekCrtMedia: (timeSec: number) => void;
  setCrtVolume: (vol: number) => void;
  toggleCrtMute: () => BedroomCrtState;
  stopCrtMedia: () => void;
  getCrtState: () => BedroomCrtState;
  getCrtCatalog: () => {
    videos: Memory[];
    music: Memory[];
    voices: Memory[];
    folders: Memory[];
  };
  toggleHeadphonesWorn: (headRig?: THREE.Object3D | null, force?: boolean) => boolean;
  isHeadphonesWorn: () => boolean;
  // S-f: School bag & Window
  setSchoolBagOpen: (open: boolean) => boolean;
  toggleWindowCurtains: (forceOpen?: boolean) => boolean;
  isWindowCurtainsOpen: () => boolean;
  // S-g: Memory Projector & Cricket bat
  toggleProjector: (forceOn?: boolean) => BedroomProjectorState;
  stepProjectorSlide: (dir: -1 | 1) => BedroomProjectorState;
  selectProjectorIndex: (index: number) => BedroomProjectorState;
  getProjectorState: () => BedroomProjectorState;
  triggerCricketSwing: () => void;
  // Filtered real-memory buckets (strictly real uploaded memories, never invented)
  getMemoriesForInteraction: (objectId: InteractiveObjectId3D) => Memory[];
  getVerifiedTimelineMemories: () => { dated: Memory[]; undated: Memory[] };
  updateMemories: (nextMemories: Memory[]) => void;
  dispose: () => void;
}

export interface AttachChildhoodBedroomInteractionsParams {
  rootGroup: THREE.Group;
  bedroomSpaceGroup: THREE.Group;
  studyCornerSpaceGroup: THREE.Group;
  playAreaSpaceGroup: THREE.Group;
  bedGroup: THREE.Group;
  wardrobeGroup: THREE.Group;
  deskGroup: THREE.Group;
  cricketGroup: THREE.Group;
  memories: Memory[];
  qualityConfig: VisualQualityConfig;
  matWalnut: THREE.Material;
  matChampagneGold: THREE.Material;
  matBoucleFabric: THREE.Material;
  bedroomMats?: ChildhoodBedroomMaterialLibrary;
  registerInteractiveHitbox: (
    parent: THREE.Group,
    objectId: InteractiveObjectId3D,
    spaceId: LivingWorldSpaceId,
    title: string,
    subtitle: string,
    size: [number, number, number],
    offset: [number, number, number],
    linkedMem?: Memory,
  ) => void;
  track: <T extends { dispose: () => void }>(item: T) => T;
  cameraObstacleMeshes: THREE.Object3D[];
}

function getEffectiveMediaType(m: Memory): string {
  return m.mediaType || m.type || 'image';
}

function isPhotoMemory(m: Memory): boolean {
  if (m.hiddenFrom3D) return false;
  const mt = getEffectiveMediaType(m);
  if (mt === 'video' || mt === 'audio') return false;
  return Boolean(m.customImageUrl || (mt === 'image' && m.mediaUrl));
}

function getMemoryImageSrc(m: Memory): string | null {
  const mt = getEffectiveMediaType(m);
  const candidate =
    m.customImageUrl ||
    (mt === 'image' || mt === 'certificate' ? m.mediaUrl || null : null);
  if (!candidate || candidate.startsWith('idb://')) return null;
  return candidate;
}

function getMemoryMediaSrc(m: Memory): string | null {
  const candidate = m.mediaUrl || m.customImageUrl || null;
  if (!candidate || candidate.startsWith('idb://')) return null;
  return candidate;
}

function matchesKeywords(m: Memory, re: RegExp): boolean {
  const hay = `${m.title || ''} ${m.description || ''} ${m.story || ''} ${(m.tags || []).join(' ')} ${m.linked3DObject || ''}`.toLowerCase();
  return re.test(hay);
}

function loadImageIntoCanvas(
  src: string,
  onLoaded: (img: HTMLImageElement) => void,
  onError?: () => void,
): void {
  if (typeof Image === 'undefined' || !src || src.startsWith('idb://')) {
    onError?.();
    return;
  }
  const img = new Image();
  if (/^https?:\/\//i.test(src)) {
    img.crossOrigin = 'anonymous';
  }
  img.onload = () => {
    if ((img.naturalWidth || img.width) > 0 && (img.naturalHeight || img.height) > 0) {
      onLoaded(img);
    } else {
      onError?.();
    }
  };
  img.onerror = () => {
    onError?.();
  };
  img.src = src;
}

function drawRoundedPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const words = (text || '').trim().split(/\s+/);
  let line = '';
  let lineCount = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = words[i];
      lineCount++;
      if (lineCount >= maxLines - 1) {
        const rest = [line, ...words.slice(i + 1)].join(' ');
        const truncated = rest.length > 42 ? `${rest.slice(0, 39)}...` : rest;
        ctx.fillText(truncated, x, y + lineCount * lineHeight);
        return;
      }
    } else {
      line = test;
    }
  }
  if (line && lineCount < maxLines) {
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }
}

export function attachChildhoodBedroomInteractions(
  params: AttachChildhoodBedroomInteractionsParams,
): ChildhoodBedroomInteractionController {
  const {
    rootGroup,
    bedroomSpaceGroup,
    studyCornerSpaceGroup,
    bedGroup,
    wardrobeGroup,
    deskGroup,
    cricketGroup,
    memories,
    qualityConfig,
    matWalnut,
    matChampagneGold,
    matBoucleFabric,
    registerInteractiveHitbox,
    track,
    cameraObstacleMeshes,
  } = params;

  let visibleMemories: Memory[] = [];
  let photoMemories: Memory[] = [];
  let videoMemories: Memory[] = [];
  let audioMemories: Memory[] = [];
  let voiceMemories: Memory[] = [];
  let musicMemories: Memory[] = [];
  let certificateMemories: Memory[] = [];
  let drawingMemories: Memory[] = [];
  let effectiveDrawings: Memory[] = [];
  let keepsakeMemories: Memory[] = [];
  let effectiveDrawerKeepsakes: Memory[] = [];
  let schoolBagMemories: Memory[] = [];
  let wardrobeMemories: Memory[] = [];
  let cricketMemories: Memory[] = [];

  const recomputeMemoryBuckets = (sourceMemories: Memory[]) => {
    const safeList = Array.isArray(sourceMemories) ? sourceMemories : [];
    visibleMemories = safeList.filter((m) => m && !m.hiddenFrom3D);
    photoMemories = visibleMemories.filter(isPhotoMemory);
    videoMemories = visibleMemories.filter(
      (m) => getEffectiveMediaType(m) === 'video' && Boolean(m.mediaUrl),
    );
    audioMemories = visibleMemories.filter(
      (m) => getEffectiveMediaType(m) === 'audio' && Boolean(m.mediaUrl),
    );
    voiceMemories = audioMemories.filter((m) =>
      matchesKeywords(m, /voice|story|note|memo|speech|grand|mom|dad|family|talk|diary|interview/),
    );
    musicMemories = audioMemories.filter((m) => !voiceMemories.includes(m));
    certificateMemories = visibleMemories.filter(
      (m) =>
        getEffectiveMediaType(m) === 'certificate' ||
        m.linkedObjectId === 'trophy_shelf' ||
        m.linkedObjectId === 'study_desk' ||
        matchesKeywords(m, /certificate|trophy|award|medal|diploma|honor|honour|prize|school|graduat|first place|champion/),
    );
    drawingMemories = photoMemories.filter(
      (m) =>
        m.linkedObjectId === 'drawing_wall' ||
        matchesKeywords(m, /draw|sketch|paint|art|crayon|doodle|poster|color|colour/),
    );
    effectiveDrawings =
      drawingMemories.length > 0 ? drawingMemories : photoMemories.slice(0, 4);
    keepsakeMemories = visibleMemories.filter(
      (m) =>
        m.linkedObjectId === 'bedside_drawer' ||
        matchesKeywords(m, /letter|note|diary|journal|postcard|ticket|keepsake|secret|bedside|story/),
    );
    effectiveDrawerKeepsakes =
      keepsakeMemories.length > 0
        ? keepsakeMemories
        : visibleMemories.filter((m) => Boolean(m.story || m.description)).slice(0, 6);
    schoolBagMemories = visibleMemories.filter(
      (m) =>
        m.linkedObjectId === 'school_bag' ||
        matchesKeywords(m, /school|class|notebook|exam|homework|teacher|bag|backpack|uniform|study|friend/),
    );
    const wardrobeExplicitPhotos = photoMemories.filter(
      (m) =>
        m.linkedObjectId === 'wardrobe' ||
        matchesKeywords(m, /wardrobe|cupboard|clothes|outfit|dress|uniform|jacket|costume|shirt|shoe|sweater/),
    );
    const wardrobeExplicitIds = new Set(wardrobeExplicitPhotos.map((m) => m.id));
    wardrobeMemories = [
      ...wardrobeExplicitPhotos,
      ...photoMemories.filter((m) => !wardrobeExplicitIds.has(m.id)),
    ];
    cricketMemories = visibleMemories.filter(
      (m) =>
        m.linkedObjectId === 'cricket_set' ||
        matchesKeywords(m, /cricket|bat|ball|match|sport|wicket|stadium|play|game|team/),
    );
  };
  recomputeMemoryBuckets(memories);

  // Loaded HTMLImageElement cache (disposed by clearing map on exit)
  const loadedImages = new Map<string, HTMLImageElement>();
  let isDisposed = false;

  const bedroomMats = params.bedroomMats;
  const allowFlashlightShadows =
    !qualityConfig.isSoftwareGl &&
    qualityConfig.profileId !== 'desktop_performance' &&
    qualityConfig.profileId !== 'mobile_performance';

  // Shared PBR materials synced with Childhood Bedroom visual language
  const matAgedLeather =
    bedroomMats?.matAgedLeather ??
    track(
      new THREE.MeshStandardMaterial({ color: '#5A3422', roughness: 0.72, metalness: 0.05 }),
    );
  const matAgedPaper =
    bedroomMats?.matAgedPaper ??
    track(
      new THREE.MeshStandardMaterial({ color: '#EFE3CB', roughness: 0.88, metalness: 0.02 }),
    );
  const matDarkMetal =
    bedroomMats?.matDarkAnodizedMetal ??
    track(
      new THREE.MeshStandardMaterial({ color: '#2F3134', roughness: 0.36, metalness: 0.68 }),
    );
  const matBeigePlastic =
    bedroomMats?.matRetroBeigePlastic ??
    track(
      new THREE.MeshStandardMaterial({ color: '#D8CEBA', roughness: 0.56, metalness: 0.04 }),
    );
  const matBeigeTrim =
    bedroomMats?.matRetroBeigeTrim ??
    track(
      new THREE.MeshStandardMaterial({ color: '#BFB39B', roughness: 0.62, metalness: 0.04 }),
    );
  const matCork =
    bedroomMats?.matCorkboard ??
    track(
      new THREE.MeshStandardMaterial({ color: '#B8895A', roughness: 0.9, metalness: 0.0 }),
    );
  const matCanvasBag =
    bedroomMats?.matCanvasBag ??
    track(
      new THREE.MeshStandardMaterial({ color: '#4E6759', roughness: 0.88, metalness: 0.02 }),
    );
  const matLeatherStrap =
    bedroomMats?.matLeatherStrap ??
    track(
      new THREE.MeshStandardMaterial({ color: '#6A4128', roughness: 0.68, metalness: 0.04 }),
    );
  const matCurtainCloth =
    bedroomMats?.matCurtainLinen ??
    track(
      new THREE.MeshStandardMaterial({
        color: '#E9DCC8',
        roughness: 0.88,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
    );
  const matAntiqueSilver =
    bedroomMats?.matAntiqueSilver ??
    track(
      new THREE.MeshStandardMaterial({ color: '#D4D6D8', roughness: 0.24, metalness: 0.88 }),
    );
  const matHeadphoneCushion =
    bedroomMats?.matHeadphoneCushion ??
    track(
      new THREE.MeshStandardMaterial({ color: '#262320', roughness: 0.78, metalness: 0.04 }),
    );
  const matCableRubber =
    bedroomMats?.matCableRubber ??
    track(
      new THREE.MeshStandardMaterial({ color: '#1F1E1C', roughness: 0.82, metalness: 0.05 }),
    );

  const zones: BedroomInteractiveZoneMeta[] = [];
  const tmpWorldPos = new THREE.Vector3();
  const tmpSpotlightTarget = new THREE.Vector3();

  // Register existing wooden_bed, wardrobe, cricket_set in unified registry (visuals untouched!)
  zones.push({
    objectId: 'wooden_bed',
    spaceId: 'bedroom',
    title: 'Childhood Wooden Bed',
    promptVerb: 'Crawl under bed',
    subtitle: 'Crawl beneath the bed to reach the hidden memory book & flashlight',
    radius: 2.15,
    anchor: bedGroup,
    getFocusCamera: () => {
      bedGroup.getWorldPosition(tmpWorldPos);
      return {
        cameraPos: [tmpWorldPos.x + 1.55, 0.42, tmpWorldPos.z + 0.12],
        lookAt: [tmpWorldPos.x + 0.18, 0.16, tmpWorldPos.z + 0.05],
        characterPos: [tmpWorldPos.x + 1.12, 0, tmpWorldPos.z + 0.08],
        characterYaw: -Math.PI / 2,
        pose: 'crawl',
      };
    },
  });

  // =========================================================================
  // S-b: UNDER-BED HIDDEN MEMORY BOOK (3D SCRAPBOOK) & FLASHLIGHT
  // =========================================================================
  const underBedGroup = new THREE.Group();
  underBedGroup.name = 'childhood_under_bed_interactive_group';
  bedGroup.add(underBedGroup);

  // 1. 3D Hidden Vintage Scrapbook (sits flush on cream rug / oak floor in open under-bed space + subtle dust motes)
  const scrapbookGroup = new THREE.Group();
  scrapbookGroup.name = 'under_bed_scrapbook_3d';
  const scrapbookRestPos = new THREE.Vector3(0.42, 0.039, 0.92);
  const scrapbookReadPos = new THREE.Vector3(0.08, 0.042, 1.38);
  scrapbookGroup.position.copy(scrapbookRestPos);
  underBedGroup.add(scrapbookGroup);

  const bookBaseCover = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.47, 0.018, 0.35)),
    matAgedLeather,
  );
  bookBaseCover.position.y = -0.002;
  scrapbookGroup.add(bookBaseCover);

  // Thick stacked aged-parchment page blocks on left & right of open binding
  [-0.112, 0.112].forEach((px) => {
    const pageBlock = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.214, 0.014, 0.308)),
      matAgedPaper,
    );
    pageBlock.position.set(px, 0.009, 0);
    scrapbookGroup.add(pageBlock);
  });

  // Rounded ribbed vintage leather spine + burgundy silk bookmark ribbon
  const bookSpine = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.016, 0.016, 0.352, 12)),
    matAgedLeather,
  );
  bookSpine.rotation.x = Math.PI / 2;
  bookSpine.position.set(0, 0.004, 0);
  scrapbookGroup.add(bookSpine);

  [-0.11, -0.035, 0.035, 0.11].forEach((rz) => {
    const spineRib = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.0165, 0.003, 6, 12)),
      matChampagneGold,
    );
    spineRib.position.set(0, 0.004, rz);
    scrapbookGroup.add(spineRib);
  });

  const bookmarkRibbon = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.016, 0.003, 0.22)),
    track(new THREE.MeshStandardMaterial({ color: '#8E2B2E', roughness: 0.72 })),
  );
  bookmarkRibbon.position.set(0.02, 0.016, 0.14);
  bookmarkRibbon.rotation.y = 0.22;
  scrapbookGroup.add(bookmarkRibbon);

  // Brass corner clasps on vintage scrapbook cover
  const cornerGeo = track(new THREE.BoxGeometry(0.038, 0.024, 0.038));
  const cornerInst = new THREE.InstancedMesh(cornerGeo, matChampagneGold, 4);
  const cDummy = new THREE.Object3D();
  [
    [-0.22, 0.001, -0.16],
    [0.22, 0.001, -0.16],
    [-0.22, 0.001, 0.16],
    [0.22, 0.001, 0.16],
  ].forEach(([cx, cy, cz], idx) => {
    cDummy.position.set(cx, cy, cz);
    cDummy.updateMatrix();
    cornerInst.setMatrixAt(idx, cDummy.matrix);
  });
  cornerInst.instanceMatrix.needsUpdate = true;
  scrapbookGroup.add(cornerInst);

  // Subtle ambient golden dust motes drifting beneath the open bed frame around the scrapbook
  const underBedDustCount =
    qualityConfig.profileId === 'desktop_performance' ||
    qualityConfig.profileId === 'mobile_performance'
      ? 0
      : 26;
  let underBedDustPoints: THREE.Points | null = null;
  let underBedDustPositions: Float32Array | null = null;
  if (underBedDustCount > 0) {
    underBedDustPositions = new Float32Array(underBedDustCount * 3);
    for (let i = 0; i < underBedDustCount; i++) {
      underBedDustPositions[i * 3] = Math.sin(i * 7.3) * 0.56;
      underBedDustPositions[i * 3 + 1] = 0.04 + ((i * 0.073) % 0.19);
      underBedDustPositions[i * 3 + 2] = -0.55 + (i / underBedDustCount) * 1.65;
    }
    const ubDustGeo = track(new THREE.BufferGeometry());
    ubDustGeo.setAttribute('position', new THREE.BufferAttribute(underBedDustPositions, 3));
    const ubDustMat = track(
      new THREE.PointsMaterial({
        color: '#F5E4BE',
        size: 0.015,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    underBedDustPoints = new THREE.Points(ubDustGeo, ubDustMat);
    underBedGroup.add(underBedDustPoints);
  }

  // Left & Right 3D CanvasTexture pages
  const leftPageCanvas = document.createElement('canvas');
  leftPageCanvas.width = 512;
  leftPageCanvas.height = 512;
  const leftPageTex = track(new THREE.CanvasTexture(leftPageCanvas));
  leftPageTex.colorSpace = THREE.SRGBColorSpace;

  const rightPageCanvas = document.createElement('canvas');
  rightPageCanvas.width = 512;
  rightPageCanvas.height = 512;
  const rightPageTex = track(new THREE.CanvasTexture(rightPageCanvas));
  rightPageTex.colorSpace = THREE.SRGBColorSpace;

  const pagePlaneGeo = track(new THREE.PlaneGeometry(0.215, 0.305));
  const leftPageMesh = new THREE.Mesh(
    pagePlaneGeo,
    track(new THREE.MeshStandardMaterial({ map: leftPageTex, roughness: 0.88 })),
  );
  leftPageMesh.rotation.x = -Math.PI / 2;
  leftPageMesh.position.set(-0.11, 0.017, 0);
  scrapbookGroup.add(leftPageMesh);

  const rightPageMesh = new THREE.Mesh(
    pagePlaneGeo,
    track(new THREE.MeshStandardMaterial({ map: rightPageTex, roughness: 0.88 })),
  );
  rightPageMesh.rotation.x = -Math.PI / 2;
  rightPageMesh.position.set(0.11, 0.017, 0);
  scrapbookGroup.add(rightPageMesh);

  // Animated 3D turning leaf pivot at book spine
  const flipLeafPivot = new THREE.Group();
  flipLeafPivot.position.set(0, 0.02, 0);
  flipLeafPivot.visible = false;
  scrapbookGroup.add(flipLeafPivot);

  const flipLeafMesh = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.212, 0.302)),
    track(
      new THREE.MeshStandardMaterial({
        color: '#F2E6CE',
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
    ),
  );
  flipLeafMesh.rotation.x = -Math.PI / 2;
  flipLeafMesh.position.set(0.106, 0.002, 0);
  flipLeafPivot.add(flipLeafMesh);

  let scrapbookSpreadIndex = 0;
  let scrapbookOpen = false;
  let pageFlipAnimProgress = 1;
  let pageFlipDir: -1 | 1 = 1;
  let totalScrapbookSpreads = Math.max(1, Math.ceil(photoMemories.length / 2));

  const renderScrapbookPage = (
    canvas: HTMLCanvasElement,
    tex: THREE.CanvasTexture,
    memory: Memory | undefined,
    pageNum: number,
    isLeft: boolean,
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Aged parchment paper background
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#F6ECD7');
    grad.addColorStop(0.5, '#EFE1C4');
    grad.addColorStop(1, '#E3CFA9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle vintage paper edge shading & spine crease
    ctx.strokeStyle = 'rgba(118, 86, 52, 0.38)';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, 476, 476);
    ctx.strokeStyle = 'rgba(118, 86, 52, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(28, 28, 456, 456);

    const spineGrad = ctx.createLinearGradient(isLeft ? 470 : 0, 0, isLeft ? 512 : 42, 0);
    spineGrad.addColorStop(0, isLeft ? 'rgba(72,46,24,0)' : 'rgba(72,46,24,0.22)');
    spineGrad.addColorStop(1, isLeft ? 'rgba(72,46,24,0.22)' : 'rgba(72,46,24,0)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(isLeft ? 470 : 0, 0, 42, 512);

    if (!memory) {
      ctx.fillStyle = '#5D442B';
      ctx.font = '600 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        photoMemories.length === 0 ? 'Your Hidden Scrapbook' : 'End of Scrapbook',
        256,
        220,
      );
      ctx.font = '16px Georgia, serif';
      ctx.fillStyle = '#7D6042';
      wrapCanvasText(
        ctx,
        photoMemories.length === 0
          ? 'Upload photographs to your Childhood Room and they will appear on these aged scrapbook pages.'
          : 'Add more photographs to continue filling these pages.',
        256,
        262,
        360,
        26,
        4,
      );
      ctx.textAlign = 'left';
    } else {
      // Polaroid / vintage photo mount
      ctx.fillStyle = '#FCF8EE';
      ctx.fillRect(54, 48, 404, 294);
      ctx.strokeStyle = 'rgba(105, 76, 45, 0.32)';
      ctx.lineWidth = 2;
      ctx.strokeRect(54, 48, 404, 294);

      const imgSrc = getMemoryImageSrc(memory);
      const cached = imgSrc ? loadedImages.get(imgSrc) : undefined;
      if (cached) {
        const boxX = 68;
        const boxY = 62;
        const boxW = 376;
        const boxH = 266;
        const scale = Math.max(boxW / cached.width, boxH / cached.height);
        const sw = boxW / scale;
        const sh = boxH / scale;
        const sx = (cached.width - sw) * 0.5;
        const sy = (cached.height - sh) * 0.5;
        ctx.drawImage(cached, sx, sy, sw, sh, boxX, boxY, boxW, boxH);
      } else {
        ctx.fillStyle = '#D9C8AA';
        ctx.fillRect(68, 62, 376, 266);
        ctx.fillStyle = '#6A4E34';
        ctx.font = 'italic 18px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading memory photograph…', 256, 200);
        ctx.textAlign = 'left';
        if (imgSrc) {
          loadImageIntoCanvas(imgSrc, (img) => {
            if (isDisposed) return;
            loadedImages.set(imgSrc, img);
            renderScrapbookSpread();
          });
        }
      }

      // Vintage photo corner tabs
      ctx.fillStyle = '#583A23';
      const drawCornerTab = (cx: number, cy: number, dx: number, dy: number) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dx, cy);
        ctx.lineTo(cx, cy + dy);
        ctx.closePath();
        ctx.fill();
      };
      drawCornerTab(54, 48, 22, 22);
      drawCornerTab(458, 48, -22, 22);
      drawCornerTab(54, 342, 22, -22);
      drawCornerTab(458, 342, -22, -22);

      // Authentic title & verified date only
      ctx.fillStyle = '#3B2818';
      ctx.font = '700 22px Georgia, serif';
      const titleTxt = (memory.title || 'Untitled Memory').slice(0, 32);
      ctx.fillText(titleTxt, 56, 378);

      const dateMeta = getAuthenticMemoryDateLabel(memory);
      if (!dateMeta.isUndated && dateMeta.label) {
        ctx.fillStyle = '#8A633C';
        ctx.font = '600 15px monospace';
        ctx.fillText(dateMeta.label, 56, 404);
      }

      const caption = memory.story || memory.description || '';
      if (caption) {
        ctx.fillStyle = '#533B25';
        ctx.font = 'italic 15px Georgia, serif';
        wrapCanvasText(ctx, caption, 56, 430, 400, 21, 2);
      }
    }

    // Page number footer
    ctx.fillStyle = '#7E5E3E';
    ctx.font = '600 14px Georgia, serif';
    ctx.textAlign = isLeft ? 'left' : 'right';
    ctx.fillText(`p. ${pageNum}`, isLeft ? 38 : 474, 486);
    ctx.textAlign = 'left';

    tex.needsUpdate = true;
  };

  const renderScrapbookSpread = () => {
    const leftIdx = scrapbookSpreadIndex * 2;
    const rightIdx = leftIdx + 1;
    renderScrapbookPage(leftPageCanvas, leftPageTex, photoMemories[leftIdx], leftIdx + 1, true);
    renderScrapbookPage(rightPageCanvas, rightPageTex, photoMemories[rightIdx], rightIdx + 1, false);
  };
  renderScrapbookSpread();

  registerInteractiveHitbox(
    scrapbookGroup,
    'under_bed_scrapbook',
    'bedroom',
    'Hidden Memory Scrapbook',
    'Press [E] or click to open the aged 3D scrapbook',
    [0.62, 0.25, 0.52],
    [0, 0.08, 0],
    photoMemories[0],
  );

  zones.push({
    objectId: 'under_bed_scrapbook',
    spaceId: 'bedroom',
    title: 'Hidden Memory Scrapbook',
    promptVerb: 'Open hidden memory book',
    subtitle: 'Use Left/Right arrows to turn aged scrapbook pages',
    radius: 2.3,
    underBedOnly: true,
    anchor: scrapbookGroup,
    getFocusCamera: () => {
      bedGroup.getWorldPosition(tmpWorldPos);
      // Bed is rotated +PI/2 so local +Z points along world +X
      return {
        cameraPos: [tmpWorldPos.x + 1.38, 0.92, tmpWorldPos.z + 0.08],
        lookAt: [tmpWorldPos.x + 1.38, 0.05, tmpWorldPos.z - 0.05],
        characterPos: [tmpWorldPos.x + 1.15, 0, tmpWorldPos.z + 0.34],
        characterYaw: Math.PI,
        pose: 'scrapbook_read',
      };
    },
  });

  // 2. Under-Bed Realistic Flashlight (Ground prop flush on rug + Mouth-held attachment + Shadowed SpotLight + Dust)
  const flashlightGroundGroup = new THREE.Group();
  flashlightGroundGroup.name = 'under_bed_flashlight_ground';
  flashlightGroundGroup.position.set(-0.34, 0.056, 0.92);
  flashlightGroundGroup.rotation.set(-0.05, 0.55, 0);
  underBedGroup.add(flashlightGroundGroup);

  const buildFlashlightMesh = (parent: THREE.Group, enableShadows = false) => {
    // Rubberized tail cap & mouth bite-grip collar (centered near z = -0.02 for clean mouth grip)
    const tailGrip = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.022, 0.021, 0.055, 14)),
      matCableRubber,
    );
    tailGrip.rotation.x = Math.PI / 2;
    tailGrip.position.z = -0.015;
    parent.add(tailGrip);

    // Knurled dark anodized aluminum flashlight barrel
    const body = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.024, 0.023, 0.145, 16)),
      matDarkMetal,
    );
    body.rotation.x = Math.PI / 2;
    body.position.z = 0.075;
    parent.add(body);

    // Tactile grip rings along barrel
    [0.035, 0.062, 0.089].forEach((rz) => {
      const ring = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.0245, 0.0025, 6, 16)),
        matCableRubber,
      );
      ring.position.z = rz;
      parent.add(ring);
    });

    // Brass thumb slide power switch on top of barrel
    const thumbSwitch = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.012, 0.009, 0.026)),
      matChampagneGold,
    );
    thumbSwitch.position.set(0, 0.026, 0.105);
    parent.add(thumbSwitch);

    // Flared lamp head cone & polished brass bezel ring
    const headFlare = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.037, 0.025, 0.048, 16)),
      matDarkMetal,
    );
    headFlare.rotation.x = Math.PI / 2;
    headFlare.position.z = 0.168;
    parent.add(headFlare);

    const bezel = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.0365, 0.0045, 8, 18)),
      matChampagneGold,
    );
    bezel.position.z = 0.193;
    parent.add(bezel);

    // Recessed silver parabolic reflector + glowing filament bulb + convex glass lens
    const reflector = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.033, 0.012, 0.024, 16, 1, true)),
      matAntiqueSilver,
    );
    reflector.rotation.x = Math.PI / 2;
    reflector.position.z = 0.181;
    parent.add(reflector);

    const bulb = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.01, 10, 8)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#FFFDF2',
          emissive: new THREE.Color('#FFE8A6'),
          emissiveIntensity: 1.4,
          roughness: 0.12,
        }),
      ),
    );
    bulb.position.z = 0.175;
    parent.add(bulb);

    const lens = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.033, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.35)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#FFF9E4',
          emissive: new THREE.Color('#FFE4A0'),
          emissiveIntensity: 0.72,
          roughness: 0.08,
          metalness: 0.12,
          transparent: true,
          opacity: 0.85,
        }),
      ),
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.176;
    parent.add(lens);

    if (enableShadows) {
      parent.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          const isOptical = m === bulb || m === lens || m === reflector;
          m.castShadow = !isOptical && allowFlashlightShadows;
          m.receiveShadow = !isOptical;
        }
      });
    }
  };
  buildFlashlightMesh(flashlightGroundGroup, false);

  registerInteractiveHitbox(
    flashlightGroundGroup,
    'under_bed_flashlight',
    'bedroom',
    'Under-Bed Flashlight',
    'Press [E] or click to hold flashlight in mouth & light up under the bed',
    [0.42, 0.24, 0.42],
    [0, 0.06, 0.08],
  );

  zones.push({
    objectId: 'under_bed_flashlight',
    spaceId: 'bedroom',
    title: 'Under-Bed Flashlight',
    promptVerb: 'Pick up flashlight',
    subtitle: 'Hold flashlight to illuminate hidden corners beneath the bed',
    radius: 2.3,
    underBedOnly: true,
    anchor: flashlightGroundGroup,
    getFocusCamera: () => {
      bedGroup.getWorldPosition(tmpWorldPos);
      return {
        cameraPos: [tmpWorldPos.x + 1.55, 0.42, tmpWorldPos.z + 0.12],
        lookAt: [tmpWorldPos.x + 0.18, 0.16, tmpWorldPos.z + 0.05],
        characterPos: [tmpWorldPos.x + 1.12, 0, tmpWorldPos.z + 0.08],
        characterYaw: -Math.PI / 2,
        pose: 'crawl',
      };
    },
  });

  // Mouth-held flashlight group (attached cleanly to character headMesh mouth point while held)
  const mouthFlashlightGroup = new THREE.Group();
  mouthFlashlightGroup.name = 'mouth_held_flashlight_prop';
  mouthFlashlightGroup.visible = false;
  buildFlashlightMesh(mouthFlashlightGroup, true);

  // Subtle volumetric flashlight beam cone (soft additive falloff)
  const beamConeMat = track(
    new THREE.MeshBasicMaterial({
      color: '#FFECC0',
      transparent: true,
      opacity: 0.068,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const beamCone = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.68, 2.7, 20, 1, true)),
    beamConeMat,
  );
  beamCone.rotation.x = -Math.PI / 2;
  beamCone.position.z = 1.54;
  beamCone.castShadow = false;
  beamCone.receiveShadow = false;
  mouthFlashlightGroup.add(beamCone);

  // Capped flashlight beam dust particles (respecting qualityConfig; 0 on performance profiles)
  const moteCount =
    qualityConfig.profileId === 'desktop_performance' ||
    qualityConfig.profileId === 'mobile_performance'
      ? 0
      : 28;
  let flashlightDustPoints: THREE.Points | null = null;
  let flashlightDustPositions: Float32Array | null = null;
  if (moteCount > 0) {
    flashlightDustPositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const dist = 0.36 + (i / moteCount) * 2.25;
      const spread = dist * 0.24;
      flashlightDustPositions[i * 3] = Math.sin(i * 12.7) * 0.5 * spread;
      flashlightDustPositions[i * 3 + 1] = Math.cos(i * 9.3) * 0.5 * spread;
      flashlightDustPositions[i * 3 + 2] = dist;
    }
    const dustGeo = track(new THREE.BufferGeometry());
    dustGeo.setAttribute('position', new THREE.BufferAttribute(flashlightDustPositions, 3));
    const dustMat = track(
      new THREE.PointsMaterial({
        color: '#FFF4D2',
        size: 0.022,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    flashlightDustPoints = new THREE.Points(dustGeo, dustMat);
    mouthFlashlightGroup.add(flashlightDustPoints);
  }

  // Single flashlight SpotLight with crisp 1024x1024 shadow map (originates ahead of lens tip to avoid head self-shadowing)
  const flashlightSpot = new THREE.SpotLight(0xfff1cc, 0, 9.2, Math.PI * 0.22, 0.62, 1.45);
  flashlightSpot.visible = false;
  flashlightSpot.castShadow = false;
  flashlightSpot.shadow.mapSize.set(1024, 1024);
  flashlightSpot.shadow.camera.near = 0.08;
  flashlightSpot.shadow.camera.far = 9.2;
  flashlightSpot.shadow.bias = -0.0003;
  flashlightSpot.shadow.normalBias = 0.014;
  flashlightSpot.shadow.radius = 2.8;
  const flashlightTargetObj = new THREE.Object3D();
  const tmpFlashlightLensWorld = new THREE.Vector3();
  rootGroup.add(flashlightSpot);
  rootGroup.add(flashlightTargetObj);
  flashlightSpot.target = flashlightTargetObj;

  let isUnderBedMode = false;
  let flashlightHeld = false;
  let attachedFlashlightParent: THREE.Object3D | null = null;

  // =========================================================================
  // S-c: BEDSIDE TABLE FUNCTIONAL DRAWER (additive inside existing nightstand at -5.85, 0, 2.45)
  // =========================================================================
  const bedsideDrawerRoot = new THREE.Group();
  bedsideDrawerRoot.name = 'bedside_functional_drawer_group';
  bedsideDrawerRoot.position.set(-5.85, 0, 2.45);
  bedroomSpaceGroup.add(bedsideDrawerRoot);

  const drawerSlideGroup = new THREE.Group();
  drawerSlideGroup.position.set(0.02, 0.35, 0);
  bedsideDrawerRoot.add(drawerSlideGroup);

  const drawerFront = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.035, 0.14, 0.38)),
    track(new THREE.MeshStandardMaterial({ color: '#64442C', roughness: 0.46 })),
  );
  drawerFront.position.set(0.22, 0, 0);
  drawerSlideGroup.add(drawerFront);

  const drawerKnob = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.022, 10, 10)),
    matChampagneGold,
  );
  drawerKnob.position.set(0.25, 0, 0);
  drawerSlideGroup.add(drawerKnob);

  const drawerTray = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.36, 0.09, 0.34)),
    track(new THREE.MeshStandardMaterial({ color: '#4B3220', roughness: 0.62 })),
  );
  drawerTray.position.set(0.03, -0.02, 0);
  drawerSlideGroup.add(drawerTray);

  // Inspectable keepsake envelope inside the drawer
  const drawerKeepsakeMesh = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.18, 0.014, 0.13)),
    matAgedPaper,
  );
  drawerKeepsakeMesh.position.set(0.06, 0.038, 0);
  drawerKeepsakeMesh.rotation.y = 0.16;
  drawerSlideGroup.add(drawerKeepsakeMesh);

  let drawerOpen = false;
  let drawerInspecting = false;
  let drawerSelectedIndex = 0;

  registerInteractiveHitbox(
    bedsideDrawerRoot,
    'bedside_drawer',
    'bedroom',
    'Bedside Nightstand Drawer',
    'Press [E] or click to slide open the bedside drawer & inspect keepsakes',
    [0.65, 0.72, 0.65],
    [0.12, 0.35, 0],
    effectiveDrawerKeepsakes[0],
  );

  zones.push({
    objectId: 'bedside_drawer',
    spaceId: 'bedroom',
    title: 'Bedside Nightstand Drawer',
    promptVerb: 'Open bedside drawer',
    subtitle: 'Slide open the drawer to inspect hidden letters & keepsakes',
    radius: 1.85,
    anchor: bedsideDrawerRoot,
    getFocusCamera: () => ({
      cameraPos: [-4.72, 0.92, 2.52],
      lookAt: [-5.62, 0.42, 2.45],
      pose: 'drawer_inspect',
    }),
  });

  // =========================================================================
  // S-d: TROPHY & CERTIFICATE SHELF, CORK PINBOARD, DRAWING WALL
  // =========================================================================
  // 1. Trophy & Certificate Shelf (free space at x = -6.38, z = 1.38 facing +X)
  const trophyShelfGroup = new THREE.Group();
  trophyShelfGroup.name = 'childhood_trophy_certificate_shelf';
  trophyShelfGroup.position.set(-6.38, 0, 1.38);
  trophyShelfGroup.rotation.y = Math.PI / 2;
  bedroomSpaceGroup.add(trophyShelfGroup);

  const shelfPlinth = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.24, 0.08, 0.34)),
    matWalnut,
  );
  shelfPlinth.position.set(0, 0.04, -0.01);
  trophyShelfGroup.add(shelfPlinth);

  const shelfBack = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.18, 1.88, 0.05)),
    matWalnut,
  );
  shelfBack.position.set(0, 0.98, -0.14);
  trophyShelfGroup.add(shelfBack);
  cameraObstacleMeshes.push(shelfBack);

  [-0.58, 0.58].forEach((sx) => {
    const sideStile = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.045, 1.88, 0.3)),
      matWalnut,
    );
    sideStile.position.set(sx, 0.98, -0.01);
    trophyShelfGroup.add(sideStile);
  });

  const shelfCrown = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.26, 0.07, 0.35)),
    matWalnut,
  );
  shelfCrown.position.set(0, 1.94, 0);
  trophyShelfGroup.add(shelfCrown);

  [0.55, 1.02, 1.52].forEach((sy) => {
    const plank = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.14, 0.04, 0.29)),
      matWalnut,
    );
    plank.position.set(0, sy, -0.01);
    trophyShelfGroup.add(plank);

    const trimLip = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.14, 0.012, 0.012)),
      matChampagneGold,
    );
    trimLip.position.set(0, sy, 0.138);
    trophyShelfGroup.add(trimLip);
  });

  // 3 Sculpted LatheGeometry Polished Brass & Antique Silver Chalice Trophies with Dual Handles & Plaques
  const chaliceProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.036, 0.0),
    new THREE.Vector2(0.028, 0.014),
    new THREE.Vector2(0.012, 0.024),
    new THREE.Vector2(0.011, 0.056),
    new THREE.Vector2(0.018, 0.068),
    new THREE.Vector2(0.042, 0.088),
    new THREE.Vector2(0.058, 0.135),
    new THREE.Vector2(0.064, 0.165),
    new THREE.Vector2(0.058, 0.165),
    new THREE.Vector2(0.048, 0.125),
    new THREE.Vector2(0.014, 0.086),
    new THREE.Vector2(0.0, 0.086),
  ];
  const chaliceGeo = track(new THREE.LatheGeometry(chaliceProfile, 20));
  const trophyHandleGeo = track(new THREE.TorusGeometry(0.028, 0.005, 8, 14, Math.PI * 1.15));
  const cupBaseGeo = track(new THREE.BoxGeometry(0.095, 0.046, 0.095));
  const plaqueGeo = track(new THREE.BoxGeometry(0.058, 0.024, 0.006));

  [-0.36, 0, 0.36].forEach((tx, idx) => {
    const scaleH = idx === 1 ? 1.24 : idx === 0 ? 1.02 : 0.94;
    const trophyMat = idx === 2 ? matAntiqueSilver : matChampagneGold;
    const trophyGrp = new THREE.Group();
    trophyGrp.position.set(tx, 1.04, 0.02);
    trophyShelfGroup.add(trophyGrp);

    const base = new THREE.Mesh(cupBaseGeo, matWalnut);
    base.position.y = 0.023;
    trophyGrp.add(base);

    const plaque = new THREE.Mesh(plaqueGeo, matChampagneGold);
    plaque.position.set(0, 0.023, 0.049);
    trophyGrp.add(plaque);

    const cup = new THREE.Mesh(chaliceGeo, trophyMat);
    cup.scale.set(scaleH * 0.95, scaleH, scaleH * 0.95);
    cup.position.y = 0.046;
    trophyGrp.add(cup);

    [-1, 1].forEach((side) => {
      const handle = new THREE.Mesh(trophyHandleGeo, trophyMat);
      handle.position.set(side * 0.052 * scaleH * 0.95, 0.046 + 0.125 * scaleH, 0);
      handle.rotation.z = side < 0 ? Math.PI * 0.48 : -Math.PI * 0.58;
      handle.scale.setScalar(scaleH * 0.92);
      trophyGrp.add(handle);
    });
  });

  // 3 Framed Certificate Slots on upper shelf (strictly real uploaded certificate/achievement memories)
  const createUpdatableMiniFrameTexture = (
    initialMem: Memory | undefined,
    fallbackTitle: string,
    accentHex: string,
  ): { tex: THREE.CanvasTexture; updateMemory: (nextMem: Memory | undefined) => void } => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const tex = track(new THREE.CanvasTexture(canvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    let currentMem = initialMem;
    let loadGen = 0;

    const redraw = () => {
      if (isDisposed) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#FAF3E4';
      ctx.fillRect(0, 0, 256, 192);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 236, 172);

      const src = currentMem ? getMemoryImageSrc(currentMem) : null;
      const img = src ? loadedImages.get(src) : undefined;
      if (img) {
        const iw = Math.max(1, img.naturalWidth || img.width);
        const ih = Math.max(1, img.naturalHeight || img.height);
        const s = Math.max(224 / iw, 160 / ih);
        const sw = 224 / s;
        const sh = 160 / s;
        ctx.drawImage(img, (iw - sw) * 0.5, (ih - sh) * 0.5, sw, sh, 16, 16, 224, 160);
      } else {
        ctx.fillStyle = '#4B3624';
        ctx.font = '700 16px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText((currentMem?.title || fallbackTitle).slice(0, 24), 128, 92);
        const dateMeta = currentMem ? getAuthenticMemoryDateLabel(currentMem) : { isUndated: true, label: null };
        ctx.fillStyle = '#8C6A42';
        ctx.font = '13px sans-serif';
        ctx.fillText(
          dateMeta.label || (currentMem ? 'Uploaded Memory' : 'Empty Frame'),
          128,
          120,
        );
        ctx.textAlign = 'left';
        if (src) {
          const capturedGen = loadGen;
          loadImageIntoCanvas(src, (loaded) => {
            if (isDisposed || loadGen !== capturedGen) return;
            loadedImages.set(src, loaded);
            redraw();
          });
        }
      }
      tex.needsUpdate = true;
    };
    redraw();
    return {
      tex,
      updateMemory: (nextMem: Memory | undefined) => {
        currentMem = nextMem;
        loadGen += 1;
        redraw();
      },
    };
  };

  const certFrameUpdaters: Array<(mem: Memory | undefined) => void> = [];
  const pinboardFrameUpdaters: Array<(mem: Memory | undefined) => void> = [];
  const drawingFrameUpdaters: Array<(mem: Memory | undefined) => void> = [];
  const cupboardSlotControllers: Array<{
    group: THREE.Group;
    plane: THREE.Mesh;
    updateMemory: (mem: Memory | undefined) => void;
  }> = [];

  const certGlassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: '#FFFDF8',
      roughness: 0.08,
      metalness: 0.02,
      clearcoat: 0.4,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  );
  [-0.36, 0, 0.36].forEach((fx, idx) => {
    const certMem = certificateMemories[idx];
    const frameGroup = new THREE.Group();
    // Seated flush on top shelf plank (y = 1.54 -> center y = 1.665 for 0.255m tall tilted frame)
    frameGroup.position.set(fx, 1.665, -0.02);
    frameGroup.rotation.x = -0.08;
    trophyShelfGroup.add(frameGroup);

    const frameOuter = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.32, 0.255, 0.024)),
      matWalnut,
    );
    frameGroup.add(frameOuter);

    // Rear walnut easel stand prop grounding the tilted frame cleanly on the shelf
    const easelLeg = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.055, 0.18, 0.01)),
      matWalnut,
    );
    easelLeg.position.set(0, -0.032, -0.048);
    easelLeg.rotation.x = 0.42;
    frameGroup.add(easelLeg);

    const frameGoldFillet = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.285, 0.22, 0.027)),
      matChampagneGold,
    );
    frameGroup.add(frameGoldFillet);
    const certHandle = createUpdatableMiniFrameTexture(certMem, 'Certificate Slot', '#B88C4A');
    certFrameUpdaters.push(certHandle.updateMemory);
    const certPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.26, 0.195)),
      track(
        new THREE.MeshStandardMaterial({
          map: certHandle.tex,
          roughness: 0.44,
          metalness: 0.02,
        }),
      ),
    );
    certPlane.position.z = 0.015;
    frameGroup.add(certPlane);

    const certGlass = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.264, 0.198)),
      certGlassMat,
    );
    certGlass.position.z = 0.0165;
    frameGroup.add(certGlass);
  });

  registerInteractiveHitbox(
    trophyShelfGroup,
    'trophy_shelf',
    'bedroom',
    'Trophy & Certificate Display Shelf',
    'Press [E] or click to inspect trophies & uploaded certificates',
    [1.3, 1.9, 0.55],
    [0, 0.95, 0.05],
    certificateMemories[0],
  );

  zones.push({
    objectId: 'trophy_shelf',
    spaceId: 'bedroom',
    title: 'Trophy & Certificate Shelf',
    promptVerb: 'Inspect trophies & certificates',
    subtitle: 'View uploaded awards, certificates & school milestones',
    radius: 1.95,
    anchor: trophyShelfGroup,
    getFocusCamera: () => ({
      cameraPos: [-4.92, 1.48, 1.38],
      lookAt: [-6.32, 1.38, 1.38],
      pose: 'inspect',
    }),
  });

  // 2. Warm Cork Pinboard (#B8895A, roughness ~0.90) with Vintage Photo Prints & Corner Push Pins
  const pinboardGroup = new THREE.Group();
  pinboardGroup.name = 'childhood_cork_pinboard_group';
  pinboardGroup.position.set(-3.55, 0, -6.25);
  studyCornerSpaceGroup.add(pinboardGroup);

  // Walnut frame posts planted flush on oak floorboards
  [-0.58, 0.58].forEach((lx) => {
    const post = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.05, 1.86, 0.05)),
      matWalnut,
    );
    post.position.set(lx, 0.93, -0.02);
    pinboardGroup.add(post);
  });

  const corkFrame = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.34, 0.94, 0.052)),
    matWalnut,
  );
  corkFrame.position.set(0, 1.42, 0);
  pinboardGroup.add(corkFrame);
  cameraObstacleMeshes.push(corkFrame);

  const corkSurface = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.22, 0.82, 0.025)),
    matCork,
  );
  corkSurface.position.set(0, 1.42, 0.02);
  pinboardGroup.add(corkSurface);

  // Up to 6 vintage-styled Polaroid photo prints with corner push pins (strictly real uploaded photos / empty state)
  const pinHeadGeo = track(new THREE.CylinderGeometry(0.009, 0.012, 0.016, 10));
  const pinShaftGeo = track(new THREE.CylinderGeometry(0.002, 0.002, 0.016, 6));
  const pinPalette = ['#B83B2E', '#2F6652', '#C98A32', '#355A7A', '#A8485C', '#B8893A'];
  const pinMats = pinPalette.map((hex) =>
    track(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.32, metalness: 0.12 })),
  );
  const polaroidBackingMat = track(
    new THREE.MeshStandardMaterial({ color: '#F6F0E4', roughness: 0.84 }),
  );
  const pinSlots: [number, number, number][] = [
    [-0.38, 1.6, -0.055],
    [0, 1.62, 0.038],
    [0.38, 1.59, -0.042],
    [-0.36, 1.23, 0.048],
    [0.02, 1.21, -0.045],
    [0.39, 1.24, 0.032],
  ];
  pinSlots.forEach(([px, py, rotZ], idx) => {
    const pMem = photoMemories[idx];
    const printGroup = new THREE.Group();
    printGroup.position.set(px, py, 0.035);
    printGroup.rotation.z = rotZ;
    pinboardGroup.add(printGroup);

    // Subtle contact drop-shadow card lifting vintage Polaroid slightly off the corkboard
    const cardShadow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.326, 0.282)),
      track(
        new THREE.MeshBasicMaterial({
          color: '#2B1D10',
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        }),
      ),
    );
    cardShadow.position.set(0.005, -0.017, -0.0015);
    printGroup.add(cardShadow);

    // Cream vintage Polaroid paper card with wider bottom margin
    const polaroidCard = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.32, 0.275, 0.005)),
      polaroidBackingMat,
    );
    polaroidCard.position.set(0, -0.012, 0);
    printGroup.add(polaroidCard);

    const pinHandle = createUpdatableMiniFrameTexture(pMem, 'Pinned Photo', '#C9A66B');
    pinboardFrameUpdaters.push(pinHandle.updateMemory);
    const card = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.286, 0.214)),
      track(
        new THREE.MeshStandardMaterial({
          map: pinHandle.tex,
          roughness: 0.56,
          metalness: 0.0,
        }),
      ),
    );
    card.position.set(0, 0.005, 0.004);
    printGroup.add(card);

    // Dual corner push pins (top-left & top-right corners of each vintage print)
    const pMat = pinMats[idx % pinMats.length];
    [-0.13, 0.13].forEach((cx) => {
      const pinHead = new THREE.Mesh(pinHeadGeo, pMat);
      pinHead.rotation.x = Math.PI / 2;
      pinHead.position.set(cx, 0.105, 0.014);
      printGroup.add(pinHead);

      const pinShaft = new THREE.Mesh(pinShaftGeo, matAntiqueSilver);
      pinShaft.rotation.x = Math.PI / 2;
      pinShaft.position.set(cx, 0.105, 0.005);
      printGroup.add(pinShaft);
    });
  });

  registerInteractiveHitbox(
    pinboardGroup,
    'cork_pinboard',
    'study_corner',
    'Cork Photo Pinboard',
    'Press [E] or click to inspect pinned childhood photographs',
    [1.4, 1.9, 0.45],
    [0, 1.15, 0.08],
    photoMemories[0],
  );

  zones.push({
    objectId: 'cork_pinboard',
    spaceId: 'study_corner',
    title: 'Cork Photo Pinboard',
    promptVerb: 'Inspect pinned photos',
    subtitle: 'Browse pinned photographs from your uploaded collection',
    radius: 2.0,
    anchor: pinboardGroup,
    getFocusCamera: () => ({
      cameraPos: [-3.55, 1.44, -4.88],
      lookAt: [-3.55, 1.42, -6.22],
      pose: 'inspect',
    }),
  });

  // 3. Drawing Wall (free space in SW corner beside bed at x = -6.45, z = 5.05 facing +X)
  const drawingWallGroup = new THREE.Group();
  drawingWallGroup.name = 'childhood_drawing_wall_group';
  drawingWallGroup.position.set(-6.45, 0, 5.05);
  drawingWallGroup.rotation.y = Math.PI / 2;
  bedroomSpaceGroup.add(drawingWallGroup);

  const artStandBack = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.16, 1.78, 0.05)),
    track(new THREE.MeshStandardMaterial({ color: '#EAE0CE', roughness: 0.82 })),
  );
  artStandBack.position.set(0, 0.94, -0.04);
  drawingWallGroup.add(artStandBack);
  cameraObstacleMeshes.push(artStandBack);

  const artRail = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.22, 0.05, 0.09)),
    matWalnut,
  );
  artRail.position.set(0, 1.84, -0.02);
  drawingWallGroup.add(artRail);

  const tapeMat = track(
    new THREE.MeshStandardMaterial({
      color: '#EFE5C8',
      roughness: 0.85,
      transparent: true,
      opacity: 0.88,
    }),
  );
  [
    [-0.28, 1.46, -0.03],
    [0.28, 1.48, 0.04],
    [-0.26, 0.98, 0.03],
    [0.27, 0.96, -0.03],
  ].forEach(([dx, dy, rz], idx) => {
    const drawMem = effectiveDrawings[idx];
    const sheetGroup = new THREE.Group();
    sheetGroup.position.set(dx, dy, 0.005);
    sheetGroup.rotation.z = rz;
    drawingWallGroup.add(sheetGroup);

    const drawHandle = createUpdatableMiniFrameTexture(drawMem, 'Drawing Slot', '#D18B47');
    drawingFrameUpdaters.push(drawHandle.updateMemory);
    const sheet = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.42, 0.34)),
      track(
        new THREE.MeshStandardMaterial({
          map: drawHandle.tex,
          roughness: 0.84,
          metalness: 0.0,
        }),
      ),
    );
    sheetGroup.add(sheet);

    [-0.17, 0.17].forEach((tx) => {
      const tape = new THREE.Mesh(track(new THREE.BoxGeometry(0.068, 0.02, 0.003)), tapeMat);
      tape.position.set(tx, 0.158, 0.0025);
      tape.rotation.z = tx < 0 ? 0.42 : -0.42;
      sheetGroup.add(tape);
    });
  });

  registerInteractiveHitbox(
    drawingWallGroup,
    'drawing_wall',
    'bedroom',
    'Childhood Drawing Wall',
    'Press [E] or click to inspect childhood drawings & artwork',
    [1.28, 1.85, 0.45],
    [0, 0.98, 0.06],
    effectiveDrawings[0],
  );

  zones.push({
    objectId: 'drawing_wall',
    spaceId: 'bedroom',
    title: 'Childhood Drawing Wall',
    promptVerb: 'Inspect drawings',
    subtitle: 'View childhood sketches, artwork & creative memories',
    radius: 1.95,
    anchor: drawingWallGroup,
    getFocusCamera: () => ({
      cameraPos: [-5.02, 1.28, 5.05],
      lookAt: [-6.42, 1.24, 5.05],
      pose: 'inspect',
    }),
  });

  // =========================================================================
  // S-e: RETRO CRT COMPUTER + WIRED HEADPHONES (additive on study_desk)
  // =========================================================================
  const crtSetupGroup = new THREE.Group();
  crtSetupGroup.name = 'childhood_retro_crt_computer_group';
  deskGroup.add(crtSetupGroup);

  // CRT Monitor positioned flush on center-right of desk top (y = 0.795)
  const crtMonitorGroup = new THREE.Group();
  crtMonitorGroup.position.set(0.14, 0.795, -0.1);
  crtSetupGroup.add(crtMonitorGroup);

  const crtStandBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.125, 0.155, 0.036, 20)),
    matBeigeTrim,
  );
  crtStandBase.position.set(0, 0.018, 0);
  crtMonitorGroup.add(crtStandBase);

  const crtSwivelNeck = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.068, 0.085, 0.042, 16)),
    matBeigeTrim,
  );
  crtSwivelNeck.position.set(0, 0.052, 0);
  crtMonitorGroup.add(crtSwivelNeck);

  // Main beige CRT chassis + stepped upper/lower bevels + tapered rear tube with vent louvers
  const crtChassis = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.46, 0.37, 0.23)),
    matBeigePlastic,
  );
  crtChassis.position.set(0, 0.24, 0.02);
  crtMonitorGroup.add(crtChassis);

  const crtFrontFrame = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.45, 0.36, 0.032)),
    matBeigePlastic,
  );
  crtFrontFrame.position.set(0, 0.24, 0.132);
  crtMonitorGroup.add(crtFrontFrame);

  const crtRearTube = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.32, 0.26, 0.16)),
    matBeigeTrim,
  );
  crtRearTube.position.set(0, 0.24, -0.155);
  crtMonitorGroup.add(crtRearTube);

  const crtRearCap = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.22, 0.18, 0.075)),
    matBeigeTrim,
  );
  crtRearCap.position.set(0, 0.24, -0.255);
  crtMonitorGroup.add(crtRearCap);

  // Top ventilation louvers on CRT housing
  for (let v = 0; v < 5; v++) {
    const vent = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.28, 0.006, 0.014)),
      matDarkMetal,
    );
    vent.position.set(0, 0.427, -0.05 + v * 0.028);
    crtMonitorGroup.add(vent);
  }

  const crtBezel = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.405, 0.305, 0.022)),
    matDarkMetal,
  );
  crtBezel.position.set(0, 0.252, 0.145);
  crtMonitorGroup.add(crtBezel);

  // Curved CRT Glass Screen Geometry (subtle parabolic CRT bulge)
  const buildCurvedCrtPlane = (w: number, h: number, bulge: number) => {
    const geo = track(new THREE.PlaneGeometry(w, h, 14, 10));
    const pos = geo.attributes.position;
    const hw = w * 0.5;
    const hh = h * 0.5;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / hw;
      const v = pos.getY(i) / hh;
      const curveZ = bulge * Math.max(0, 1 - u * u * 0.58 - v * v * 0.58);
      pos.setZ(i, curveZ);
    }
    geo.computeVertexNormals();
    return geo;
  };

  // 3D Live CanvasTexture CRT Screen (rendered on curved glass inside bezel!)
  const crtCanvas = document.createElement('canvas');
  crtCanvas.width = 512;
  crtCanvas.height = 384;
  const crtCanvasTex = track(new THREE.CanvasTexture(crtCanvas));
  crtCanvasTex.colorSpace = THREE.SRGBColorSpace;
  const crtScreenMat = track(
    new THREE.MeshStandardMaterial({
      map: crtCanvasTex,
      emissiveMap: crtCanvasTex,
      emissive: new THREE.Color('#FFFFFF'),
      emissiveIntensity: 0.16,
      roughness: 0.14,
      metalness: 0.06,
    }),
  );
  const crtScreenMesh = new THREE.Mesh(
    buildCurvedCrtPlane(0.368, 0.272, 0.014),
    crtScreenMat,
  );
  crtScreenMesh.position.set(0, 0.252, 0.153);
  crtMonitorGroup.add(crtScreenMesh);

  // Subtle curved outer protective glass reflection highlight
  const crtGlassOverlay = new THREE.Mesh(
    buildCurvedCrtPlane(0.372, 0.276, 0.015),
    track(
      new THREE.MeshPhysicalMaterial({
        color: '#DDE8E2',
        roughness: 0.08,
        metalness: 0.0,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }),
    ),
  );
  crtGlassOverlay.position.set(0, 0.252, 0.156);
  crtMonitorGroup.add(crtGlassOverlay);

  // Physical CRT Power Button, Brightness/Contrast Knobs & Green Status LED
  const crtPowerBtn = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.026, 0.016, 0.012)),
    matBeigeTrim,
  );
  crtPowerBtn.position.set(0.185, 0.082, 0.15);
  crtMonitorGroup.add(crtPowerBtn);

  [0.095, 0.125].forEach((kx) => {
    const knob = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 10)),
      matBeigeTrim,
    );
    knob.rotation.x = Math.PI / 2;
    knob.position.set(kx, 0.082, 0.15);
    crtMonitorGroup.add(knob);
  });

  const crtPowerLedMat = track(
    new THREE.MeshStandardMaterial({
      color: '#2B5B34',
      emissive: new THREE.Color('#35E068'),
      emissiveIntensity: 0.14,
    }),
  );
  const crtPowerLed = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.007, 8, 8)),
    crtPowerLedMat,
  );
  crtPowerLed.position.set(0.158, 0.082, 0.151);
  crtMonitorGroup.add(crtPowerLed);

  // Subtle dynamic CRT phosphor bounce light casting soft glow onto desk wood & keyboard when booted
  const crtBounceLight = new THREE.PointLight('#9AF0C2', 0, 2.2, 2.0);
  crtBounceLight.position.set(0, 0.24, 0.26);
  crtBounceLight.castShadow = false;
  crtMonitorGroup.add(crtBounceLight);

  // Sculpted Retro Beige Keyboard with Crisp Procedural Keycaps + Rubber Cable on Desk
  const keyboardGroup = new THREE.Group();
  keyboardGroup.position.set(0.12, 0.806, 0.21);
  keyboardGroup.rotation.x = 0.08;
  crtSetupGroup.add(keyboardGroup);

  const keyboardMesh = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.43, 0.022, 0.155)),
    matBeigePlastic,
  );
  keyboardGroup.add(keyboardMesh);

  // Raised keybed plate textured with crisp retro mechanical keycaps (F-row, QWERTY, arrows & numpad)
  const keybedTop = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.405, 0.011, 0.132)),
    track(
      new THREE.MeshStandardMaterial({
        map: bedroomMats?.retroKeycapTex ?? null,
        color: bedroomMats?.retroKeycapTex ? '#FFFFFF' : '#CFC3AB',
        roughness: 0.62,
        metalness: 0.04,
      }),
    ),
  );
  keybedTop.position.set(0, 0.014, 0.002);
  keyboardGroup.add(keybedTop);

  // Coiled keyboard cable routing cleanly behind desk
  const kbCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 0.81, 0.13),
    new THREE.Vector3(0.18, 0.803, 0.06),
    new THREE.Vector3(0.28, 0.802, -0.14),
    new THREE.Vector3(0.38, 0.79, -0.35),
  ]);
  const kbCable = new THREE.Mesh(
    track(new THREE.TubeGeometry(kbCableCurve, 18, 0.0042, 6, false)),
    matCableRubber,
  );
  crtSetupGroup.add(kbCable);

  // Mousepad + Sculpted Rounded Retro 2-Button Mouse + Cable flush on desktop
  const mousePad = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.17, 0.005, 0.155)),
    track(new THREE.MeshStandardMaterial({ color: '#2F4D3F', roughness: 0.92 })),
  );
  mousePad.position.set(0.46, 0.798, 0.2);
  crtSetupGroup.add(mousePad);

  const mouseGroup = new THREE.Group();
  mouseGroup.position.set(0.46, 0.806, 0.2);
  crtSetupGroup.add(mouseGroup);

  const mouseBodyGeo = track(new THREE.SphereGeometry(0.042, 14, 10));
  mouseBodyGeo.scale(0.68, 0.42, 1.08);
  const mouseMesh = new THREE.Mesh(mouseBodyGeo, matBeigePlastic);
  mouseMesh.position.y = 0.01;
  mouseGroup.add(mouseMesh);

  const mouseWheel = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 8)),
    matDarkMetal,
  );
  mouseWheel.rotation.z = Math.PI / 2;
  mouseWheel.position.set(0, 0.025, -0.02);
  mouseGroup.add(mouseWheel);

  const mouseCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.46, 0.806, 0.155),
    new THREE.Vector3(0.48, 0.802, 0.04),
    new THREE.Vector3(0.44, 0.798, -0.18),
    new THREE.Vector3(0.42, 0.785, -0.35),
  ]);
  const mouseCable = new THREE.Mesh(
    track(new THREE.TubeGeometry(mouseCableCurve, 16, 0.0036, 6, false)),
    matCableRubber,
  );
  crtSetupGroup.add(mouseCable);

  // Beige Retro CPU Tower resting flush on oak floor beside right leg of desk + Subtle Status LEDs
  const cpuGroup = new THREE.Group();
  cpuGroup.position.set(0.46, 0.016, -0.08);
  crtSetupGroup.add(cpuGroup);

  const cpuTower = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.21, 0.44, 0.4)),
    matBeigePlastic,
  );
  cpuTower.position.y = 0.22;
  cpuGroup.add(cpuTower);

  const cpuFrontFace = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.195, 0.42, 0.016)),
    matBeigeTrim,
  );
  cpuFrontFace.position.set(0, 0.22, 0.202);
  cpuGroup.add(cpuFrontFace);

  // CD-ROM Drive Bay + 3.5" Floppy Drive Slot + Vent Slats
  const cdBay = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.155, 0.042, 0.012)),
    matBeigePlastic,
  );
  cdBay.position.set(0, 0.375, 0.21);
  cpuGroup.add(cdBay);

  const floppySlot = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.135, 0.014, 0.01)),
    matDarkMetal,
  );
  floppySlot.position.set(0, 0.315, 0.212);
  cpuGroup.add(floppySlot);

  for (let i = 0; i < 4; i++) {
    const grill = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.145, 0.008, 0.008)),
      matDarkMetal,
    );
    grill.position.set(0, 0.075 + i * 0.022, 0.212);
    cpuGroup.add(grill);
  }

  // CPU Power Button + Dual Subtle Status Lights (Green Power + Blinking Amber HDD)
  const cpuPowerSwitch = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 12)),
    matBeigePlastic,
  );
  cpuPowerSwitch.rotation.x = Math.PI / 2;
  cpuPowerSwitch.position.set(-0.048, 0.225, 0.211);
  cpuGroup.add(cpuPowerSwitch);

  const cpuPowerLedMat = track(
    new THREE.MeshStandardMaterial({
      color: '#2A5B32',
      emissive: new THREE.Color('#42E874'),
      emissiveIntensity: 0.3,
    }),
  );
  const cpuPowerLed = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.0055, 8, 8)),
    cpuPowerLedMat,
  );
  cpuPowerLed.position.set(0.028, 0.235, 0.213);
  cpuGroup.add(cpuPowerLed);

  const cpuHddLedMat = track(
    new THREE.MeshStandardMaterial({
      color: '#6E3C16',
      emissive: new THREE.Color('#FF9D3B'),
      emissiveIntensity: 0.15,
    }),
  );
  const cpuHddLed = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.005, 8, 8)),
    cpuHddLedMat,
  );
  cpuHddLed.position.set(0.052, 0.235, 0.213);
  cpuGroup.add(cpuHddLed);

  // Wired Studio Headphones with Cushioned Earcups & Visible Cable (seated flush on desk top at y = 0.7945)
  const headphonesDeskGroup = new THREE.Group();
  headphonesDeskGroup.name = 'wired_headphones_desk_prop';
  headphonesDeskGroup.position.set(-0.34, 0.838, 0.18);
  headphonesDeskGroup.rotation.y = 0.4;
  crtSetupGroup.add(headphonesDeskGroup);

  const buildHeadphonesGeometry = (
    parent: THREE.Group,
    wearableScale: number,
    includeShortCordTail: boolean,
  ) => {
    const s = wearableScale;
    // Outer metal spring headband + padded leatherette inner cushion band
    const band = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.112 * s, 0.011 * s, 10, 24, Math.PI)),
      matDarkMetal,
    );
    band.position.y = 0.016 * s;
    parent.add(band);

    const bandPad = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.105 * s, 0.009 * s, 8, 20, Math.PI * 0.72)),
      matHeadphoneCushion,
    );
    bandPad.position.y = 0.016 * s;
    bandPad.rotation.z = Math.PI * 0.14;
    parent.add(bandPad);

    [-1, 1].forEach((side) => {
      const ex = side * 0.112 * s;
      // Brushed metal slider yoke
      const yoke = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.008 * s, 0.032 * s, 0.016 * s)),
        matAntiqueSilver,
      );
      yoke.position.set(ex, 0.016 * s, 0);
      parent.add(yoke);

      // Earcup outer shell + brushed brass accent ring
      const cup = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.044 * s, 0.047 * s, 0.03 * s, 18)),
        matDarkMetal,
      );
      cup.rotation.z = Math.PI / 2;
      cup.position.set(ex, -0.004 * s, 0);
      parent.add(cup);

      const brassTrim = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.034 * s, 0.0038 * s, 8, 18)),
        matChampagneGold,
      );
      brassTrim.rotation.y = Math.PI / 2;
      brassTrim.position.set(ex + side * 0.0155 * s, -0.004 * s, 0);
      parent.add(brassTrim);

      // Plush cushioned leatherette earpad hugging the head
      const cushion = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.034 * s, 0.013 * s, 10, 18)),
        matHeadphoneCushion,
      );
      cushion.rotation.y = Math.PI / 2;
      cushion.position.set(ex - side * 0.017 * s, -0.004 * s, 0);
      parent.add(cushion);
    });

    if (includeShortCordTail) {
      // Draped visible headphone cable tail dropping neatly behind left shoulder when worn
      const wornCordCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.114 * s, -0.028 * s, 0),
        new THREE.Vector3(-0.125 * s, -0.095 * s, -0.015 * s),
        new THREE.Vector3(-0.105 * s, -0.175 * s, -0.04 * s),
      ]);
      const wornCord = new THREE.Mesh(
        track(new THREE.TubeGeometry(wornCordCurve, 12, 0.0034 * s, 6, false)),
        matCableRubber,
      );
      parent.add(wornCord);
    }
  };
  buildHeadphonesGeometry(headphonesDeskGroup, 0.9, false);
  headphonesDeskGroup.rotation.x = Math.PI / 2;

  // Visible curved 3D headphone cable resting flush on desk & terminating in a brass 3.5mm audio plug
  const deskHeadphoneCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.27, 0.802, 0.14),
    new THREE.Vector3(-0.18, 0.801, 0.06),
    new THREE.Vector3(-0.08, 0.801, -0.08),
    new THREE.Vector3(0.08, 0.8, -0.26),
    new THREE.Vector3(0.32, 0.785, -0.35),
  ]);
  const deskHeadphoneCable = new THREE.Mesh(
    track(new THREE.TubeGeometry(deskHeadphoneCableCurve, 22, 0.0044, 6, false)),
    matCableRubber,
  );
  crtSetupGroup.add(deskHeadphoneCable);

  const audioJackPlug = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.0055, 0.0045, 0.026, 8)),
    matChampagneGold,
  );
  audioJackPlug.rotation.x = Math.PI / 2;
  audioJackPlug.position.set(0.32, 0.785, -0.36);
  deskHeadphoneCable.add(audioJackPlug);

  const wornHeadphonesGroup = new THREE.Group();
  wornHeadphonesGroup.name = 'worn_wired_headphones_prop';
  wornHeadphonesGroup.visible = false;
  buildHeadphonesGeometry(wornHeadphonesGroup, 2.15, true);
  wornHeadphonesGroup.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = allowFlashlightShadows;
      obj.receiveShadow = true;
    }
  });

  let headphonesWorn = false;
  let attachedHeadphonesParent: THREE.Object3D | null = null;

  registerInteractiveHitbox(
    crtMonitorGroup,
    'crt_computer',
    'study_corner',
    'Retro CRT Computer',
    'Press [E] or click to boot the retro desktop & browse Videos, Music & Voice Memories',
    [0.64, 0.56, 0.52],
    [0, 0.22, 0.06],
    videoMemories[0] || audioMemories[0] || photoMemories[0],
  );

  registerInteractiveHitbox(
    headphonesDeskGroup,
    'wired_headphones',
    'study_corner',
    'Wired Studio Headphones',
    'Press [E] or click to wear or remove the wired desk headphones',
    [0.34, 0.22, 0.34],
    [0, 0.04, 0],
    audioMemories[0],
  );

  const getCrtWorldFocus = () => {
    const screenWorld = new THREE.Vector3(0, 0.235, 0.16);
    crtMonitorGroup.localToWorld(screenWorld);
    const camWorld = new THREE.Vector3(0, 0.25, 0.72);
    crtMonitorGroup.localToWorld(camWorld);
    return {
      cameraPos: [camWorld.x, camWorld.y, camWorld.z] as [number, number, number],
      lookAt: [screenWorld.x, screenWorld.y, screenWorld.z] as [number, number, number],
      pose: 'crt_sit' as BedroomCharacterPoseMode,
    };
  };

  zones.push({
    objectId: 'crt_computer',
    spaceId: 'study_corner',
    title: 'Retro CRT Computer',
    promptVerb: 'Use retro computer',
    subtitle: 'Open My Videos, My Music, Voice Memories & Memory Folders on the 3D CRT',
    radius: 2.05,
    anchor: crtMonitorGroup,
    getFocusCamera: getCrtWorldFocus,
  });

  zones.push({
    objectId: 'wired_headphones',
    spaceId: 'study_corner',
    title: 'Wired Headphones',
    promptVerb: 'Put on headphones',
    subtitle: 'Wear wired desk headphones for music & voice memories',
    radius: 1.75,
    anchor: headphonesDeskGroup,
    getFocusCamera: getCrtWorldFocus,
  });

  // CRT Media Elements (strictly user-triggered, never autoplay, disposed on exit)
  const crtAudioEl = typeof Audio !== 'undefined' ? new Audio() : null;
  const crtVideoEl =
    typeof document !== 'undefined' ? document.createElement('video') : null;
  if (crtVideoEl) {
    crtVideoEl.playsInline = true;
    crtVideoEl.preload = 'metadata';
    crtVideoEl.crossOrigin = 'anonymous';
  }

  const crtState: BedroomCrtState = {
    poweredOn: false,
    bootProgress: 0,
    appView: 'desktop',
    selectedIndex: 0,
    activeMediaId: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.82,
    muted: false,
  };

  const stopCrtMedia = () => {
    if (crtAudioEl) {
      try {
        crtAudioEl.pause();
        crtAudioEl.currentTime = 0;
      } catch {
        // ignore
      }
    }
    if (crtVideoEl) {
      try {
        crtVideoEl.pause();
        crtVideoEl.currentTime = 0;
      } catch {
        // ignore
      }
    }
    crtState.isPlaying = false;
    crtState.activeMediaId = null;
    crtState.currentTime = 0;
    crtState.duration = 0;
  };

  const getCrtActiveList = (): Memory[] => {
    if (crtState.appView === 'videos') return videoMemories;
    if (crtState.appView === 'music') return musicMemories.length > 0 ? musicMemories : audioMemories;
    if (crtState.appView === 'voices') return voiceMemories.length > 0 ? voiceMemories : audioMemories;
    if (crtState.appView === 'folders') return visibleMemories;
    return [];
  };

  let crtRedrawDirty = true;
  let crtVideoTickAccum = 0;

  const drawCrtCanvas = (elapsedSec: number) => {
    const ctx = crtCanvas.getContext('2d');
    if (!ctx) return;

    // Power-off dark phosphor glass
    if (!crtState.poweredOn) {
      ctx.fillStyle = '#151B19';
      ctx.fillRect(0, 0, 512, 384);
      const refl = ctx.createLinearGradient(0, 0, 512, 384);
      refl.addColorStop(0, 'rgba(255,255,255,0.06)');
      refl.addColorStop(0.5, 'rgba(255,255,255,0)');
      refl.addColorStop(1, 'rgba(20,30,25,0.2)');
      ctx.fillStyle = refl;
      ctx.fillRect(0, 0, 512, 384);
      ctx.fillStyle = 'rgba(130, 185, 145, 0.35)';
      ctx.font = '600 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MEMORA CRT · STANDBY', 256, 198);
      ctx.textAlign = 'left';
      crtCanvasTex.needsUpdate = true;
      return;
    }

    // Boot sequence
    if (crtState.bootProgress < 1) {
      ctx.fillStyle = '#0D1311';
      ctx.fillRect(0, 0, 512, 384);
      ctx.fillStyle = '#7CE8A0';
      ctx.font = '700 18px monospace';
      ctx.fillText('MEMORA PERSONAL ARCHIVE OS v98', 32, 62);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#B8E8C8';
      ctx.fillText('Memory Archive Check........ OK', 32, 102);
      ctx.fillText(`Uploaded Media Indexed...... ${visibleMemories.length} items`, 32, 128);
      ctx.fillText('CRT Phosphor Calibrated..... READY', 32, 154);

      const barW = Math.floor(420 * crtState.bootProgress);
      ctx.strokeStyle = '#7CE8A0';
      ctx.strokeRect(32, 210, 424, 22);
      ctx.fillStyle = '#47B86E';
      ctx.fillRect(34, 212, barW, 18);
      crtCanvasTex.needsUpdate = true;
      return;
    }

    // Retro Teal Desktop Wallpaper
    ctx.fillStyle = '#1E5B5E';
    ctx.fillRect(0, 0, 512, 384);

    // Top Retro Window Chrome
    if (crtState.appView === 'desktop') {
      const icons: { label: string; count: number; color: string }[] = [
        { label: 'My Videos', count: videoMemories.length, color: '#D6A15D' },
        { label: 'My Music', count: (musicMemories.length || audioMemories.length), color: '#6FB8A6' },
        { label: 'Voice Memories', count: (voiceMemories.length || audioMemories.length), color: '#D9825B' },
        { label: 'Memory Folders', count: visibleMemories.length, color: '#E2C275' },
      ];

      ctx.fillStyle = '#ECE6D6';
      drawRoundedPanel(ctx, 24, 22, 464, 294, 6);
      ctx.fill();
      ctx.fillStyle = '#193C66';
      ctx.fillRect(26, 24, 460, 28);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 14px monospace';
      ctx.fillText('MEMORA 98 — Childhood Desktop', 38, 43);

      icons.forEach((ic, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const bx = 46 + col * 218;
        const by = 74 + row * 108;
        const selected = crtState.selectedIndex === idx;
        ctx.fillStyle = selected ? '#DCE8F7' : '#F7F3E8';
        drawRoundedPanel(ctx, bx, by, 198, 88, 6);
        ctx.fill();
        ctx.strokeStyle = selected ? '#193C66' : '#B5AA96';
        ctx.lineWidth = selected ? 3 : 1.5;
        ctx.stroke();

        ctx.fillStyle = ic.color;
        ctx.fillRect(bx + 14, by + 20, 34, 28);
        ctx.fillStyle = '#1E1B18';
        ctx.font = '700 15px monospace';
        ctx.fillText(ic.label, bx + 58, by + 36);
        ctx.fillStyle = '#5C5145';
        ctx.font = '13px monospace';
        ctx.fillText(`${ic.count} uploaded`, bx + 58, by + 58);
      });
    } else {
      const list = getCrtActiveList();
      const activeItem = list[crtState.selectedIndex];
      const windowTitle =
        crtState.appView === 'videos'
          ? 'My Videos'
          : crtState.appView === 'music'
            ? 'My Music'
            : crtState.appView === 'voices'
              ? 'Voice Memories'
              : 'Memory Folders';

      ctx.fillStyle = '#ECE6D6';
      ctx.fillRect(16, 16, 480, 316);
      ctx.fillStyle = '#193C66';
      ctx.fillRect(18, 18, 476, 26);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 14px monospace';
      ctx.fillText(`MEMORA 98 — ${windowTitle}`, 28, 36);

      if (list.length === 0) {
        ctx.fillStyle = '#332C24';
        ctx.font = '700 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`No uploaded items in ${windowTitle}`, 256, 162);
        ctx.font = '13px monospace';
        ctx.fillStyle = '#6B5E4F';
        ctx.fillText('Upload memories in MEMORA to play or browse them here.', 256, 192);
        ctx.textAlign = 'left';
      } else if (
        crtState.appView === 'videos' &&
        crtVideoEl &&
        crtState.isPlaying &&
        crtVideoEl.readyState >= 2
      ) {
        // Render real uploaded video frames straight into the 3D CRT monitor glass!
        ctx.fillStyle = '#090C0E';
        ctx.fillRect(28, 52, 456, 232);
        ctx.drawImage(crtVideoEl, 28, 52, 456, 232);
        ctx.fillStyle = '#193C66';
        ctx.fillRect(28, 290, 456, 32);
        ctx.fillStyle = '#FFE4A8';
        ctx.font = '600 13px monospace';
        ctx.fillText(
          `PLAYING: ${(activeItem?.title || 'Video').slice(0, 36)}`,
          38,
          310,
        );
      } else {
        // Split list + right preview/player pane
        ctx.fillStyle = '#FFFDF7';
        ctx.fillRect(26, 52, 210, 268);
        ctx.strokeStyle = '#9D9382';
        ctx.strokeRect(26, 52, 210, 268);

        list.slice(0, 7).forEach((m, i) => {
          const isSel = i === crtState.selectedIndex;
          const ry = 58 + i * 36;
          if (isSel) {
            ctx.fillStyle = '#193C66';
            ctx.fillRect(30, ry, 202, 32);
          }
          ctx.fillStyle = isSel ? '#FFFFFF' : '#26211B';
          ctx.font = '600 13px monospace';
          ctx.fillText((m.title || 'Untitled').slice(0, 22), 38, ry + 21);
        });

        // Right pane: photo preview OR retro audio equalizer
        ctx.fillStyle = '#192227';
        ctx.fillRect(246, 52, 240, 268);
        if (activeItem) {
          const imgSrc = getMemoryImageSrc(activeItem);
          const img = imgSrc ? loadedImages.get(imgSrc) : undefined;
          if (img && (crtState.appView === 'folders' || crtState.appView === 'videos')) {
            const s = Math.max(220 / img.width, 152 / img.height);
            const sw = 220 / s;
            const sh = 152 / s;
            ctx.drawImage(img, (img.width - sw) * 0.5, (img.height - sh) * 0.5, sw, sh, 256, 62, 220, 152);
          } else {
            if (imgSrc && !img) {
              loadImageIntoCanvas(imgSrc, (loaded) => {
                if (isDisposed) return;
                loadedImages.set(imgSrc, loaded);
                crtRedrawDirty = true;
              });
            }
            // Retro phosphor waveform bars
            for (let b = 0; b < 14; b++) {
              const amp = crtState.isPlaying
                ? 20 + Math.abs(Math.sin(elapsedSec * 7 + b * 0.8)) * 78
                : 12 + (b % 3) * 6;
              ctx.fillStyle = crtState.isPlaying ? '#6BE89C' : '#3C6D59';
              ctx.fillRect(262 + b * 15, 198 - amp, 10, amp);
            }
          }

          ctx.fillStyle = '#FFE4A8';
          ctx.font = '700 14px monospace';
          ctx.fillText((activeItem.title || 'Memory').slice(0, 24), 256, 238);

          const dateMeta = getAuthenticMemoryDateLabel(activeItem);
          ctx.fillStyle = '#B4C7C3';
          ctx.font = '12px monospace';
          ctx.fillText(
            dateMeta.label || getEffectiveMediaType(activeItem).toUpperCase(),
            256,
            258,
          );
          ctx.fillStyle = crtState.isPlaying ? '#6BE89C' : '#D9C598';
          ctx.fillText(
            crtState.isPlaying
              ? 'Status: Playing (Press Pause to stop)'
              : crtState.appView === 'folders'
                ? 'Press Enter to view full memory'
                : 'Press Play button to start',
            256,
            284,
          );
        }
      }
    }

    // Bottom Retro Taskbar
    ctx.fillStyle = '#C9C2B3';
    ctx.fillRect(0, 348, 512, 36);
    ctx.fillStyle = '#1F4B3B';
    ctx.fillRect(8, 354, 72, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 12px monospace';
    ctx.fillText('START', 22, 370);
    ctx.fillStyle = '#2A2520';
    ctx.fillText(headphonesWorn ? 'HEADPHONES: ON' : 'SPEAKERS', 360, 370);

    // Subtle CRT scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = 0; y < 384; y += 4) {
      ctx.fillRect(0, y, 512, 1);
    }

    crtCanvasTex.needsUpdate = true;
  };
  drawCrtCanvas(0);

  // =========================================================================
  // S-f: CUPBOARD INTERIOR KEEPSAKES, SCHOOL BAG, WINDOW (SWAYING CURTAINS), MEMORY RADIO
  // =========================================================================
  // 1. Additive interior shelves inside existing walnut wardrobe (zero visual change when closed!)
  const wardrobeInteriorGroup = new THREE.Group();
  wardrobeInteriorGroup.name = 'wardrobe_interior_keepsakes';
  wardrobeGroup.add(wardrobeInteriorGroup);
  [0.62, 1.06, 1.48].forEach((wy) => {
    const innerShelf = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.84, 0.025, 0.42)),
      matWalnut,
    );
    innerShelf.position.set(0, wy, -0.02);
    wardrobeInteriorGroup.add(innerShelf);
  });
  // Small keepsake box & folded linen stack inside wardrobe
  const keepsakeBox = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.28, 0.14, 0.24)),
    matAgedLeather,
  );
  keepsakeBox.position.set(-0.2, 0.71, 0.02);
  wardrobeInteriorGroup.add(keepsakeBox);
  const foldedGarment = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.32, 0.11, 0.26)),
    matBoucleFabric,
  );
  foldedGarment.position.set(0.18, 1.13, 0.02);
  wardrobeInteriorGroup.add(foldedGarment);

  // Real uploaded photo frames arranged inside the cupboard shelves (always pre-mounted & hidden until populated so uploads update in-place without rebuilding the room)
  const cupboardShelfSlots: Array<{ pos: [number, number, number]; rotY: number }> = [
    { pos: [-0.22, 1.66, -0.04], rotY: 0.14 },
    { pos: [0.16, 1.66, -0.04], rotY: -0.12 },
    { pos: [-0.16, 1.24, -0.04], rotY: 0.1 },
  ];
  cupboardShelfSlots.forEach((slot, idx) => {
    const photoMem = wardrobeMemories[idx];
    const innerFrameGroup = new THREE.Group();
    innerFrameGroup.position.set(slot.pos[0], slot.pos[1], slot.pos[2]);
    innerFrameGroup.rotation.y = slot.rotY;
    innerFrameGroup.visible = Boolean(photoMem);
    wardrobeInteriorGroup.add(innerFrameGroup);

    const frameBorder = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.28, 0.34, 0.024)),
      matChampagneGold,
    );
    innerFrameGroup.add(frameBorder);

    const cupHandle = createUpdatableMiniFrameTexture(
      photoMem,
      'Cupboard Photo',
      '#C9A66B',
    );
    const innerPhotoMat = track(
      new THREE.MeshStandardMaterial({
        map: cupHandle.tex,
        color: 0xffffff,
        roughness: 0.42,
      }),
    );
    const innerPhotoPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.23, 0.29)),
      innerPhotoMat,
    );
    innerPhotoPlane.position.z = 0.014;
    innerPhotoPlane.userData = photoMem
      ? {
          type: 'exhibit_memory',
          memoryId: photoMem.id,
          title: photoMem.title,
          subtitle: 'Click to inspect uploaded photograph',
        }
      : {};
    innerFrameGroup.add(innerPhotoPlane);

    cupboardSlotControllers.push({
      group: innerFrameGroup,
      plane: innerPhotoPlane,
      updateMemory: cupHandle.updateMemory,
    });
  });

  zones.push({
    objectId: 'wardrobe',
    spaceId: 'bedroom',
    title: 'Cupboard — Photo Collection',
    promptVerb: 'Open cupboard',
    subtitle: 'Open cupboard to browse your uploaded photos',
    radius: 2.05,
    anchor: wardrobeGroup,
    getFocusCamera: () => {
      wardrobeGroup.getWorldPosition(tmpWorldPos);
      return {
        cameraPos: [tmpWorldPos.x + 0.1, 1.32, tmpWorldPos.z - 1.75],
        lookAt: [tmpWorldPos.x, 1.12, tmpWorldPos.z],
        pose: 'inspect',
      };
    },
  });

  // 2. Structured Vintage Canvas School Bag resting flush on oak floor beside study desk
  const schoolBagGroup = new THREE.Group();
  schoolBagGroup.name = 'childhood_school_bag_group';
  schoolBagGroup.position.set(-4.28, 0.016, -5.08);
  schoolBagGroup.rotation.y = 0.52;
  studyCornerSpaceGroup.add(schoolBagGroup);

  const bagBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.35, 0.39, 0.19)),
    matCanvasBag,
  );
  bagBody.position.set(0, 0.195, 0);
  bagBody.rotation.x = -0.07;
  schoolBagGroup.add(bagBody);

  // Leather reinforced bottom base + front utility pocket + peeking notebook inside
  const bagBottom = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.358, 0.045, 0.198)),
    matLeatherStrap,
  );
  bagBottom.position.set(0, 0.022, 0.012);
  schoolBagGroup.add(bagBottom);

  const bagFrontPocket = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.28, 0.17, 0.048)),
    matCanvasBag,
  );
  bagFrontPocket.position.set(0, 0.145, 0.112);
  bagFrontPocket.rotation.x = -0.07;
  schoolBagGroup.add(bagFrontPocket);

  // Brass corner rivets on canvas utility pocket for tactile vintage craft detail
  [
    [-0.12, 0.21],
    [0.12, 0.21],
    [-0.12, 0.08],
    [0.12, 0.08],
  ].forEach(([rx, ry]) => {
    const rivet = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 8)),
      matChampagneGold,
    );
    rivet.rotation.x = Math.PI / 2;
    rivet.position.set(rx, ry, 0.138);
    schoolBagGroup.add(rivet);
  });

  const peekingNotebook = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.18, 0.11, 0.024)),
    track(new THREE.MeshStandardMaterial({ color: '#C66A4A', roughness: 0.78 })),
  );
  peekingNotebook.position.set(-0.04, 0.365, -0.01);
  peekingNotebook.rotation.z = 0.09;
  schoolBagGroup.add(peekingNotebook);

  // Top leather carry handle + draped canvas shoulder strap
  const carryHandle = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.056, 0.01, 8, 14, Math.PI)),
    matLeatherStrap,
  );
  carryHandle.position.set(0, 0.39, -0.04);
  schoolBagGroup.add(carryHandle);

  const shoulderStrapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.18, 0.32, 0),
    new THREE.Vector3(-0.24, 0.18, 0.06),
    new THREE.Vector3(-0.16, 0.02, 0.18),
    new THREE.Vector3(0.04, 0.018, 0.22),
  ]);
  const shoulderStrap = new THREE.Mesh(
    track(new THREE.TubeGeometry(shoulderStrapCurve, 16, 0.012, 6, false)),
    matLeatherStrap,
  );
  schoolBagGroup.add(shoulderStrap);

  const bagFlapPivot = new THREE.Group();
  bagFlapPivot.position.set(0, 0.385, -0.075);
  schoolBagGroup.add(bagFlapPivot);

  const bagFlap = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.36, 0.145, 0.21)),
    matLeatherStrap,
  );
  bagFlap.position.set(0, -0.052, 0.105);
  bagFlapPivot.add(bagFlap);

  [-0.095, 0.095].forEach((bx) => {
    const strap = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.026, 0.16, 0.012)),
      matAgedLeather,
    );
    strap.position.set(bx, -0.055, 0.21);
    bagFlapPivot.add(strap);

    const buckle = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.036, 0.038, 0.016)),
      matChampagneGold,
    );
    buckle.position.set(bx, -0.105, 0.214);
    bagFlapPivot.add(buckle);
  });

  let schoolBagOpen = false;

  registerInteractiveHitbox(
    schoolBagGroup,
    'school_bag',
    'study_corner',
    'Childhood School Bag',
    'Press [E] or click to open your school bag & inspect school memories',
    [0.58, 0.62, 0.48],
    [0, 0.28, 0],
    schoolBagMemories[0],
  );

  zones.push({
    objectId: 'school_bag',
    spaceId: 'study_corner',
    title: 'Childhood School Bag',
    promptVerb: 'Open school bag',
    subtitle: 'Inspect notebooks, school photos & study memories',
    radius: 1.8,
    anchor: schoolBagGroup,
    getFocusCamera: () => ({
      cameraPos: [-3.55, 0.92, -4.18],
      lookAt: [-4.28, 0.28, -5.08],
      pose: 'inspect',
    }),
  });

  // 3. Bedroom Window with Gentle Swaying Curtains (free space at x = -1.95, z = -6.48 facing +Z)
  const windowNookGroup = new THREE.Group();
  windowNookGroup.name = 'childhood_bedroom_window_group';
  windowNookGroup.position.set(-1.95, 0, -6.48);
  bedroomSpaceGroup.add(windowNookGroup);

  // Open timber window frame looking out into the sunlit Childhood Park
  const winBottomSill = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.72, 0.08, 0.22)),
    matWalnut,
  );
  winBottomSill.position.set(0, 0.96, 0);
  windowNookGroup.add(winBottomSill);
  const winTopLintel = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.76, 0.09, 0.18)),
    matWalnut,
  );
  winTopLintel.position.set(0, 2.48, 0);
  windowNookGroup.add(winTopLintel);
  [-0.82, 0.82].forEach((wx) => {
    const jamb = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.08, 2.48, 0.14)),
      matWalnut,
    );
    jamb.position.set(wx, 1.24, 0);
    windowNookGroup.add(jamb);
    cameraObstacleMeshes.push(jamb);
  });
  const winRod = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.016, 0.016, 2.02, 10)),
    matChampagneGold,
  );
  winRod.rotation.z = Math.PI / 2;
  winRod.position.set(0, 2.58, 0.09);
  windowNookGroup.add(winRod);

  // Lightweight swaying linen curtain panels (3 vertical ribbons each for organic cloth breeze)
  const leftCurtainPivot = new THREE.Group();
  leftCurtainPivot.position.set(-0.78, 2.54, 0.09);
  windowNookGroup.add(leftCurtainPivot);

  const rightCurtainPivot = new THREE.Group();
  rightCurtainPivot.position.set(0.78, 2.54, 0.09);
  windowNookGroup.add(rightCurtainPivot);

  const curtainStrips: { mesh: THREE.Mesh; phase: number; side: number }[] = [];
  const curtainGeo = track(new THREE.PlaneGeometry(0.24, 1.66, 2, 8));
  [
    { pivot: leftCurtainPivot, side: -1 },
    { pivot: rightCurtainPivot, side: 1 },
  ].forEach(({ pivot, side }) => {
    for (let s = 0; s < 2; s++) {
      const strip = new THREE.Mesh(curtainGeo, matCurtainCloth);
      strip.position.set(-side * (0.14 + s * 0.21), -0.84, s * 0.018);
      pivot.add(strip);
      curtainStrips.push({ mesh: strip, phase: s * 1.1 + (side > 0 ? 1.8 : 0), side });
    }
  });

  let windowCurtainsOpen = true;

  registerInteractiveHitbox(
    windowNookGroup,
    'bedroom_window',
    'bedroom',
    'Sunlit Bedroom Window',
    'Press [E] or click to draw curtains & gaze out into the Childhood Park',
    [1.85, 2.5, 0.55],
    [0, 1.35, 0.08],
  );

  zones.push({
    objectId: 'bedroom_window',
    spaceId: 'bedroom',
    title: 'Sunlit Bedroom Window',
    promptVerb: 'Look out window',
    subtitle: 'Part the curtains & take in the sunlit outdoor park view',
    radius: 2.1,
    anchor: windowNookGroup,
    getFocusCamera: () => ({
      cameraPos: [-1.95, 1.68, -5.25],
      lookAt: [-1.95, 1.62, -9.8],
      pose: 'window_gaze',
    }),
  });

  // 4. Retro Memory Radio (additive on small walnut stand at x = -2.02, z = 6.02 facing -Z)
  const radioGroup = new THREE.Group();
  radioGroup.name = 'childhood_memory_radio_group';
  radioGroup.position.set(-2.02, 0, 6.02);
  radioGroup.rotation.y = Math.PI;
  bedroomSpaceGroup.add(radioGroup);

  const radioStool = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.46, 0.58, 0.36)),
    matWalnut,
  );
  radioStool.position.set(0, 0.29, 0);
  radioGroup.add(radioStool);
  cameraObstacleMeshes.push(radioStool);

  const radioBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.36, 0.22, 0.18)),
    track(new THREE.MeshStandardMaterial({ color: '#6E452A', roughness: 0.44 })),
  );
  radioBody.position.set(0, 0.69, 0);
  radioGroup.add(radioBody);

  const radioDialMat = track(
    new THREE.MeshStandardMaterial({
      color: '#F5E4B8',
      emissive: new THREE.Color('#FFCB78'),
      emissiveIntensity: 0.55,
      roughness: 0.25,
    }),
  );
  const radioDial = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.24, 0.06)),
    radioDialMat,
  );
  radioDial.position.set(0, 0.72, 0.092);
  radioGroup.add(radioDial);

  [-0.1, 0.1].forEach((kx) => {
    const knob = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 10)),
      matChampagneGold,
    );
    knob.rotation.x = Math.PI / 2;
    knob.position.set(kx, 0.635, 0.095);
    radioGroup.add(knob);
  });

  registerInteractiveHitbox(
    radioGroup,
    'memory_radio',
    'bedroom',
    'Vintage Memory Radio',
    'Press [E] or click to select and play your uploaded music tracks',
    [0.62, 0.95, 0.52],
    [0, 0.48, 0],
    audioMemories[0],
  );

  zones.push({
    objectId: 'memory_radio',
    spaceId: 'bedroom',
    title: 'Vintage Memory Radio',
    promptVerb: 'Open memory radio',
    subtitle: 'Select and play uploaded music & audio tracks (never autoplays)',
    radius: 1.9,
    anchor: radioGroup,
    getFocusCamera: () => ({
      cameraPos: [-2.02, 1.02, 4.92],
      lookAt: [-2.02, 0.68, 6.02],
      pose: 'inspect',
    }),
  });

  // =========================================================================
  // S-g: MEMORY PROJECTOR, CRICKET CORNER UPGRADE, WALL CLOCK & CALENDAR
  // =========================================================================
  // 1. Vintage Memory Projector & Folding Screen at (2.15, 0, 5.85) -> (3.85, 0, 5.85)
  const projectorRoot = new THREE.Group();
  projectorRoot.name = 'childhood_memory_projector_group';
  projectorRoot.position.set(2.15, 0, 5.85);
  bedroomSpaceGroup.add(projectorRoot);

  // Slim tripod legs
  [
    [-0.18, -0.14, 0.14],
    [0.18, -0.14, -0.14],
    [0, 0.2, 0],
  ].forEach(([lx, lz, rz]) => {
    const leg = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.015, 0.012, 0.96, 8)),
      matDarkMetal,
    );
    leg.position.set(lx * 0.5, 0.46, lz * 0.5);
    leg.rotation.z = rz;
    projectorRoot.add(leg);
  });

  const projectorBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.28, 0.18, 0.22)),
    matDarkMetal,
  );
  projectorBody.position.set(0, 0.98, 0);
  projectorRoot.add(projectorBody);
  cameraObstacleMeshes.push(projectorBody);

  const projectorLens = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.042, 0.048, 0.12, 12)),
    matChampagneGold,
  );
  projectorLens.rotation.z = -Math.PI / 2;
  projectorLens.position.set(0.18, 0.98, 0);
  projectorRoot.add(projectorLens);

  // Twin film reels on top of projector
  const projectorReels: THREE.Mesh[] = [];
  [-0.08, 0.08].forEach((rx) => {
    const reel = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 16)),
      matChampagneGold,
    );
    reel.rotation.x = Math.PI / 2;
    reel.position.set(rx, 1.13, 0);
    projectorRoot.add(reel);
    projectorReels.push(reel);
  });

  // Translucent projection light cone (zero shadow light overhead!)
  const projBeamMat = track(
    new THREE.MeshBasicMaterial({
      color: '#FFF1CE',
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const projBeamMesh = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.56, 1.56, 16, 1, true)),
    projBeamMat,
  );
  projBeamMesh.rotation.z = Math.PI / 2;
  projBeamMesh.position.set(0.96, 0.98, 0);
  projBeamMesh.visible = false;
  projectorRoot.add(projBeamMesh);

  // Matching vintage freestanding projection screen at local (+1.68, 0, 0)
  const projScreenStand = new THREE.Group();
  projScreenStand.position.set(1.68, 0, 0);
  projectorRoot.add(projScreenStand);

  const screenPole = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.018, 0.024, 1.66, 8)),
    matDarkMetal,
  );
  screenPole.position.set(0.03, 0.83, 0);
  projScreenStand.add(screenPole);

  const projCanvas = document.createElement('canvas');
  projCanvas.width = 512;
  projCanvas.height = 384;
  const projTex = track(new THREE.CanvasTexture(projCanvas));
  projTex.colorSpace = THREE.SRGBColorSpace;
  const projScreenMat = track(
    new THREE.MeshStandardMaterial({
      map: projTex,
      emissiveMap: projTex,
      emissive: new THREE.Color('#FFF8E6'),
      emissiveIntensity: 0.04,
      roughness: 0.72,
    }),
  );
  const projScreenMesh = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1.24, 0.92)),
    projScreenMat,
  );
  projScreenMesh.rotation.y = -Math.PI / 2;
  projScreenMesh.position.set(-0.01, 1.06, 0);
  projScreenStand.add(projScreenMesh);

  const projFrameBar = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.04, 0.04, 1.32)),
    matWalnut,
  );
  projFrameBar.position.set(0, 1.54, 0);
  projScreenStand.add(projFrameBar);

  let projectorOn = videoMemories.length > 0;
  let projectorSlideIndex = 0;

  const renderProjectorSlide = () => {
    const ctx = projCanvas.getContext('2d');
    if (!ctx) return;

    if (!projectorOn) {
      ctx.fillStyle = '#EFE9DD';
      ctx.fillRect(0, 0, 512, 384);
      ctx.strokeStyle = '#C9BFA9';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, 496, 368);
      ctx.fillStyle = '#8C7E6B';
      ctx.font = '600 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Video Projector Screen (Off)', 256, 198);
      ctx.textAlign = 'left';
      projScreenMat.emissiveIntensity = 0.04;
      projTex.needsUpdate = true;
      return;
    }

    ctx.fillStyle = '#1E1A16';
    ctx.fillRect(0, 0, 512, 384);
    const safeIdx =
      videoMemories.length > 0
        ? Math.max(0, Math.min(projectorSlideIndex, videoMemories.length - 1))
        : 0;
    const mem = videoMemories[safeIdx];
    if (!mem) {
      ctx.fillStyle = '#FFF4DC';
      ctx.font = '700 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('No Uploaded Videos Yet', 256, 178);
      ctx.font = '15px Georgia, serif';
      ctx.fillStyle = '#D6C29C';
      ctx.fillText('Upload MP4, MOV, or WEBM videos to watch them here.', 256, 212);
      ctx.textAlign = 'left';
    } else {
      const src = getMemoryImageSrc(mem);
      const img = src ? loadedImages.get(src) : undefined;
      if (img) {
        const s = Math.max(468 / img.width, 304 / img.height);
        const sw = 468 / s;
        const sh = 304 / s;
        ctx.drawImage(img, (img.width - sw) * 0.5, (img.height - sh) * 0.5, sw, sh, 22, 20, 468, 304);
      } else {
        ctx.fillStyle = '#2B231C';
        ctx.fillRect(22, 20, 468, 304);
        ctx.strokeStyle = '#C9A66B';
        ctx.lineWidth = 2;
        ctx.strokeRect(34, 32, 444, 280);
        // Play triangle icon in center
        ctx.fillStyle = 'rgba(201, 166, 107, 0.85)';
        ctx.beginPath();
        ctx.arc(256, 172, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1E1A16';
        ctx.beginPath();
        ctx.moveTo(246, 156);
        ctx.lineTo(274, 172);
        ctx.lineTo(246, 188);
        ctx.closePath();
        ctx.fill();
        if (src) {
          loadImageIntoCanvas(src, (loaded) => {
            if (isDisposed) return;
            loadedImages.set(src, loaded);
            renderProjectorSlide();
          });
        }
      }
      // Subtle VIDEO badge
      ctx.fillStyle = 'rgba(201, 166, 107, 0.92)';
      ctx.fillRect(34, 32, 118, 24);
      ctx.fillStyle = '#27231F';
      ctx.font = '700 12px monospace';
      ctx.fillText(`VIDEO ${safeIdx + 1}/${videoMemories.length}`, 44, 48);

      ctx.fillStyle = '#FFF2D6';
      ctx.font = '700 17px Georgia, serif';
      ctx.fillText((mem.title || 'Projected Video').slice(0, 36), 26, 354);
      const dateMeta = getAuthenticMemoryDateLabel(mem);
      if (dateMeta.label) {
        ctx.fillStyle = '#D4B07A';
        ctx.font = '600 13px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(dateMeta.label, 486, 354);
        ctx.textAlign = 'left';
      }
    }
    projScreenMat.emissiveIntensity = 0.72;
    projTex.needsUpdate = true;
  };
  projBeamMesh.visible = projectorOn;
  renderProjectorSlide();

  registerInteractiveHitbox(
    projectorRoot,
    'memory_projector',
    'bedroom',
    'Memory Video Projector',
    'Press [E] or click to watch your uploaded videos on the projector',
    [1.1, 1.35, 0.72],
    [0.2, 0.68, 0],
    videoMemories[0],
  );

  zones.push({
    objectId: 'memory_projector',
    spaceId: 'bedroom',
    title: 'Memory Video Projector',
    promptVerb: 'Open video projector',
    subtitle: 'Select and play uploaded videos (MP4, MOV, WEBM)',
    radius: 2.05,
    anchor: projectorRoot,
    getFocusCamera: () => ({
      cameraPos: [2.02, 1.24, 4.78],
      lookAt: [3.62, 1.06, 5.85],
      pose: 'inspect',
    }),
  });

  // 2. Register upgraded Cricket Corner in central registry (visuals untouched!)
  zones.push({
    objectId: 'cricket_set',
    spaceId: 'play_area',
    title: 'Childhood Cricket Corner',
    promptVerb: 'Pick up & swing cricket bat',
    subtitle: 'Swing the bat & browse cricket or sports memories',
    radius: 2.05,
    anchor: cricketGroup,
    getFocusCamera: () => {
      cricketGroup.getWorldPosition(tmpWorldPos);
      return {
        cameraPos: [tmpWorldPos.x - 1.38, 1.24, tmpWorldPos.z + 1.25],
        lookAt: [tmpWorldPos.x + 0.12, 0.56, tmpWorldPos.z + 0.08],
        pose: 'cricket_swing',
      };
    },
  });

  // 3. Wall Clock (live local time hands) & Calendar (verified uploaded dates only) at (-5.38, 0, 6.08)
  const clockCalGroup = new THREE.Group();
  clockCalGroup.name = 'childhood_wall_clock_calendar_group';
  clockCalGroup.position.set(-5.38, 0, 6.08);
  clockCalGroup.rotation.y = Math.PI;
  bedroomSpaceGroup.add(clockCalGroup);

  const totemBoard = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.68, 1.88, 0.08)),
    matWalnut,
  );
  totemBoard.position.set(0, 0.94, 0);
  clockCalGroup.add(totemBoard);
  cameraObstacleMeshes.push(totemBoard);

  // Analog Wall Clock on upper section
  const clockRim = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24)),
    matChampagneGold,
  );
  clockRim.rotation.x = Math.PI / 2;
  clockRim.position.set(0, 1.54, 0.05);
  clockCalGroup.add(clockRim);

  const clockFace = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.195, 24)),
    matAgedPaper,
  );
  clockFace.position.set(0, 1.54, 0.072);
  clockCalGroup.add(clockFace);

  const hourHandPivot = new THREE.Group();
  hourHandPivot.position.set(0, 1.54, 0.078);
  clockCalGroup.add(hourHandPivot);
  const hourHand = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.016, 0.1, 0.008)),
    matDarkMetal,
  );
  hourHand.position.y = 0.042;
  hourHandPivot.add(hourHand);

  const minHandPivot = new THREE.Group();
  minHandPivot.position.set(0, 1.54, 0.082);
  clockCalGroup.add(minHandPivot);
  const minHand = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.011, 0.145, 0.008)),
    matDarkMetal,
  );
  minHand.position.y = 0.062;
  minHandPivot.add(minHand);

  const secHandPivot = new THREE.Group();
  secHandPivot.position.set(0, 1.54, 0.086);
  clockCalGroup.add(secHandPivot);
  const secHand = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.006, 0.155, 0.006)),
    track(new THREE.MeshStandardMaterial({ color: '#B33225', roughness: 0.4 })),
  );
  secHand.position.y = 0.065;
  secHandPivot.add(secHand);

  // Tear-Off Paper Calendar below clock
  const calCanvas = document.createElement('canvas');
  calCanvas.width = 256;
  calCanvas.height = 256;
  const calTex = track(new THREE.CanvasTexture(calCanvas));
  calTex.colorSpace = THREE.SRGBColorSpace;
  const renderCalendarCanvas = () => {
    const calCtx = calCanvas.getContext('2d');
    if (!calCtx) return;
    const nowDate = new Date();
    const monthStr = nowDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    calCtx.fillStyle = '#FAF3E4';
    calCtx.fillRect(0, 0, 256, 256);
    calCtx.fillStyle = '#9C3B2B';
    calCtx.fillRect(0, 0, 256, 68);
    calCtx.fillStyle = '#FFFDF8';
    calCtx.font = '700 30px sans-serif';
    calCtx.textAlign = 'center';
    calCtx.fillText(monthStr, 128, 46);
    calCtx.fillStyle = '#2B221A';
    calCtx.font = '700 94px Georgia, serif';
    calCtx.fillText(String(nowDate.getDate()), 128, 174);
    calCtx.fillStyle = '#735C44';
    calCtx.font = '600 16px monospace';
    calCtx.fillText(`${visibleMemories.length} ARCHIVED`, 128, 224);
    calCtx.textAlign = 'left';
    calTex.needsUpdate = true;
  };
  renderCalendarCanvas();
  const calPlane = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.34, 0.36)),
    track(
      new THREE.MeshStandardMaterial({
        map: calTex,
        roughness: 0.84,
        metalness: 0.0,
      }),
    ),
  );
  calPlane.position.set(0, 0.98, 0.048);
  clockCalGroup.add(calPlane);

  registerInteractiveHitbox(
    clockCalGroup,
    'wall_clock_calendar',
    'bedroom',
    'Wall Clock & Memory Calendar',
    'Press [E] or click to open your verified memory timeline',
    [0.82, 1.9, 0.45],
    [0, 1.0, 0.08],
    visibleMemories[0],
  );

  zones.push({
    objectId: 'wall_clock_calendar',
    spaceId: 'bedroom',
    title: 'Wall Clock & Calendar',
    promptVerb: 'Open memory calendar',
    subtitle: 'Explore your timeline strictly from verified uploaded dates',
    radius: 1.95,
    anchor: clockCalGroup,
    getFocusCamera: () => ({
      cameraPos: [-5.38, 1.32, 4.92],
      lookAt: [-5.38, 1.28, 6.04],
      pose: 'inspect',
    }),
  });

  // =========================================================================
  // CONTROLLER METHODS
  // =========================================================================
  const syncClockHands = () => {
    const now = new Date();
    const sec = now.getSeconds();
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;
    secHandPivot.rotation.z = -(sec / 60) * Math.PI * 2;
    minHandPivot.rotation.z = -(min / 60) * Math.PI * 2;
    hourHandPivot.rotation.z = -(hr / 12) * Math.PI * 2;
  };
  syncClockHands();

  let clockAccum = 0;

  const setFlashlightHeld = (held: boolean, headRig?: THREE.Object3D | null): boolean => {
    flashlightHeld = held;
    flashlightGroundGroup.visible = !held;
    mouthFlashlightGroup.visible = held;
    flashlightSpot.visible = held;
    flashlightSpot.intensity = held ? 4.6 : 0;
    flashlightSpot.castShadow = held && allowFlashlightShadows;

    if (held && headRig && attachedFlashlightParent !== headRig) {
      if (attachedFlashlightParent) {
        attachedFlashlightParent.remove(mouthFlashlightGroup);
      }
      // Clean mouth attachment point on headMesh (sphere radius 0.22 facing +Z)
      mouthFlashlightGroup.position.set(0, -0.068, 0.215);
      mouthFlashlightGroup.rotation.set(0.06, 0, 0);
      headRig.add(mouthFlashlightGroup);
      attachedFlashlightParent = headRig;
    } else if (!held && attachedFlashlightParent) {
      attachedFlashlightParent.remove(mouthFlashlightGroup);
      attachedFlashlightParent = null;
    }

    bedroomSfx.play('flashlight_toggle');
    return flashlightHeld;
  };

  const toggleHeadphonesWorn = (
    headRig?: THREE.Object3D | null,
    force?: boolean,
  ): boolean => {
    const next = typeof force === 'boolean' ? force : !headphonesWorn;
    headphonesWorn = next;
    headphonesDeskGroup.visible = !next;
    deskHeadphoneCable.visible = !next;
    wornHeadphonesGroup.visible = next;

    if (next && headRig && attachedHeadphonesParent !== headRig) {
      if (attachedHeadphonesParent) {
        attachedHeadphonesParent.remove(wornHeadphonesGroup);
      }
      wornHeadphonesGroup.position.set(0, 0.015, 0);
      headRig.add(wornHeadphonesGroup);
      attachedHeadphonesParent = headRig;
    } else if (!next && attachedHeadphonesParent) {
      attachedHeadphonesParent.remove(wornHeadphonesGroup);
      attachedHeadphonesParent = null;
    }

    crtRedrawDirty = true;
    bedroomSfx.play('click');
    return headphonesWorn;
  };

  const getCrtStateSnapshot = (): BedroomCrtState => ({ ...crtState });

  const getDrawerStateSnapshot = (): BedroomDrawerState => ({
    isOpen: drawerOpen,
    inspectingKeepsake: drawerInspecting,
    keepsakeMemories: effectiveDrawerKeepsakes,
    selectedIndex: drawerSelectedIndex,
  });

  const getProjectorStateSnapshot = (): BedroomProjectorState => ({
    poweredOn: projectorOn,
    slideIndex:
      videoMemories.length > 0
        ? Math.max(0, Math.min(projectorSlideIndex, videoMemories.length - 1))
        : 0,
    videoMemories,
  });

  const getVerifiedTimelineMemories = () => {
    const dated: Memory[] = [];
    const undated: Memory[] = [];
    visibleMemories.forEach((m) => {
      const meta = getAuthenticMemoryDateLabel(m);
      if (meta.isUndated || !meta.label) {
        undated.push(m);
      } else {
        dated.push(m);
      }
    });
    dated.sort((a, b) => {
      const da = a.date || String(a.year || '');
      const db = b.date || String(b.year || '');
      return da.localeCompare(db);
    });
    return { dated, undated };
  };

  return {
    zones,

    evaluateProximity(playerX, playerZ, isUnderBed) {
      let best: BedroomInteractiveZoneMeta | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        if (z.underBedOnly && !isUnderBed) continue;
        if (isUnderBed && z.objectId === 'wooden_bed') continue;
        z.anchor.getWorldPosition(tmpWorldPos);
        const d = Math.hypot(playerX - tmpWorldPos.x, playerZ - tmpWorldPos.z);
        if (d <= z.radius && d < bestDist) {
          bestDist = d;
          best = z;
        }
      }
      return best;
    },

    getZoneById(objectId) {
      return zones.find((z) => z.objectId === objectId);
    },

    update(dt, elapsed, reducedMotion, isHidden) {
      if (isHidden || isDisposed) return;

      // 1. Scrapbook slide position + 3D page-turn leaf flip
      const targetBookPos = scrapbookOpen ? scrapbookReadPos : scrapbookRestPos;
      const lerpFactor = reducedMotion ? 1 : Math.min(1, dt * 8);
      scrapbookGroup.position.lerp(targetBookPos, lerpFactor);
      if (pageFlipAnimProgress < 1) {
        pageFlipAnimProgress = Math.min(1, pageFlipAnimProgress + dt * (reducedMotion ? 10 : 3.2));
        flipLeafPivot.visible = pageFlipAnimProgress < 1;
        const eased = 1 - Math.pow(1 - pageFlipAnimProgress, 3);
        flipLeafPivot.rotation.z =
          pageFlipDir > 0 ? eased * Math.PI : (1 - eased) * Math.PI;
      } else if (flipLeafPivot.visible) {
        flipLeafPivot.visible = false;
      }

      // 2. Flashlight & under-bed ambient dust mote drift
      if (flashlightHeld && flashlightDustPoints && flashlightDustPositions && !reducedMotion) {
        for (let i = 0; i < moteCount; i++) {
          flashlightDustPositions[i * 3 + 1] += Math.sin(elapsed * 1.4 + i) * dt * 0.018;
          if (flashlightDustPositions[i * 3 + 1] > 0.36) {
            flashlightDustPositions[i * 3 + 1] = -0.32;
          }
        }
        (flashlightDustPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
      if (underBedDustPoints && underBedDustPositions && !reducedMotion) {
        for (let i = 0; i < underBedDustCount; i++) {
          underBedDustPositions[i * 3] += Math.sin(elapsed * 0.7 + i * 1.3) * dt * 0.008;
          underBedDustPositions[i * 3 + 1] += Math.cos(elapsed * 0.9 + i * 0.8) * dt * 0.006;
          if (underBedDustPositions[i * 3 + 1] > 0.23) underBedDustPositions[i * 3 + 1] = 0.04;
          if (underBedDustPositions[i * 3 + 1] < 0.035) underBedDustPositions[i * 3 + 1] = 0.21;
        }
        (underBedDustPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }

      // 3. Bedside drawer smooth slide & keepsake lift
      const targetDrawerX = drawerOpen ? 0.34 : 0.02;
      drawerSlideGroup.position.x += (targetDrawerX - drawerSlideGroup.position.x) * lerpFactor;
      const targetKeepsakeY = drawerOpen && drawerInspecting ? 0.24 : 0.038;
      drawerKeepsakeMesh.position.y += (targetKeepsakeY - drawerKeepsakeMesh.position.y) * lerpFactor;

      // 4. School bag flap animation
      const targetFlapRotX = schoolBagOpen ? -1.45 : 0;
      bagFlapPivot.rotation.x += (targetFlapRotX - bagFlapPivot.rotation.x) * lerpFactor;

      // 5. Window curtain opening + gentle cloth breeze sway
      const targetLeftX = windowCurtainsOpen ? -0.78 : -0.36;
      const targetRightX = windowCurtainsOpen ? 0.78 : 0.36;
      leftCurtainPivot.position.x += (targetLeftX - leftCurtainPivot.position.x) * lerpFactor;
      rightCurtainPivot.position.x += (targetRightX - rightCurtainPivot.position.x) * lerpFactor;
      if (!reducedMotion) {
        for (let i = 0; i < curtainStrips.length; i++) {
          const cs = curtainStrips[i];
          cs.mesh.rotation.x = Math.sin(elapsed * 1.45 + cs.phase) * 0.045;
          cs.mesh.rotation.z = Math.cos(elapsed * 1.15 + cs.phase) * 0.025 * cs.side;
        }
      }

      // 6. Projector reels spin while powered on
      if (projectorOn && !reducedMotion) {
        for (let i = 0; i < projectorReels.length; i++) {
          projectorReels[i].rotation.y += dt * 1.8;
        }
      }

      // 7. CRT boot progress, phosphor desk bounce glow, CPU subtle status LEDs & active media canvas update
      const targetCrtBounce = crtState.poweredOn ? 0.38 + 0.08 * crtState.bootProgress : 0;
      crtBounceLight.intensity += (targetCrtBounce - crtBounceLight.intensity) * Math.min(1, dt * 6);
      cpuPowerLedMat.emissiveIntensity = crtState.poweredOn ? 1.35 : 0.25;
      cpuHddLedMat.emissiveIntensity = crtState.poweredOn
        ? 0.22 + (Math.sin(elapsed * 9.5) * 0.5 + 0.5) * (crtState.isPlaying || crtState.bootProgress < 1 ? 1.25 : 0.35)
        : 0.08;
      if (crtState.poweredOn && crtState.bootProgress < 1) {
        crtState.bootProgress = Math.min(1, crtState.bootProgress + dt * (reducedMotion ? 8 : 1.25));
        crtRedrawDirty = true;
      }
      if (crtState.poweredOn && crtState.isPlaying) {
        crtVideoTickAccum += dt;
        if (crtVideoTickAccum >= 1 / 15) {
          crtVideoTickAccum = 0;
          if (crtState.appView === 'videos' && crtVideoEl) {
            crtState.currentTime = crtVideoEl.currentTime || 0;
            crtState.duration = crtVideoEl.duration || 0;
          } else if (crtAudioEl) {
            crtState.currentTime = crtAudioEl.currentTime || 0;
            crtState.duration = crtAudioEl.duration || 0;
          }
          crtRedrawDirty = true;
        }
      }
      if (crtRedrawDirty) {
        crtRedrawDirty = false;
        drawCrtCanvas(elapsed);
      }

      // 8. Analog wall clock hands (1Hz update)
      clockAccum += dt;
      if (clockAccum >= 1) {
        clockAccum = 0;
        syncClockHands();
      }
    },

    setUnderBedActive(active) {
      isUnderBedMode = active;
      if (!active) {
        scrapbookOpen = false;
        if (flashlightHeld) {
          setFlashlightHeld(false, null);
        }
      } else {
        bedroomSfx.play('wood_creak');
      }
    },

    setScrapbookOpen(open) {
      scrapbookOpen = open;
      if (open) {
        renderScrapbookSpread();
        bedroomSfx.play('page_flip');
      }
    },

    turnScrapbookPage(dir) {
      const next = Math.max(0, Math.min(totalScrapbookSpreads - 1, scrapbookSpreadIndex + dir));
      const turned = next !== scrapbookSpreadIndex;
      if (turned) {
        scrapbookSpreadIndex = next;
        pageFlipDir = dir;
        pageFlipAnimProgress = 0;
        renderScrapbookSpread();
        bedroomSfx.play('page_flip');
      }
      return {
        spreadIndex: scrapbookSpreadIndex,
        totalSpreads: totalScrapbookSpreads,
        turned,
      };
    },

    getScrapbookState() {
      return {
        spreadIndex: scrapbookSpreadIndex,
        totalSpreads: totalScrapbookSpreads,
        photoMemories,
      };
    },

    setFlashlightHeld,

    isFlashlightHeld() {
      return flashlightHeld;
    },

    updateFlashlightAim(origin, forwardDir) {
      if (!flashlightHeld) return;
      if (attachedFlashlightParent) {
        mouthFlashlightGroup.updateMatrixWorld(true);
        tmpFlashlightLensWorld.set(0, 0, 0.22);
        mouthFlashlightGroup.localToWorld(tmpFlashlightLensWorld);
        flashlightSpot.position.copy(tmpFlashlightLensWorld);
      } else {
        flashlightSpot.position.copy(origin).addScaledVector(forwardDir, 0.44);
      }
      tmpSpotlightTarget.copy(flashlightSpot.position).addScaledVector(forwardDir, 4.5);
      flashlightTargetObj.position.copy(tmpSpotlightTarget);
      flashlightTargetObj.updateMatrixWorld();
    },

    toggleBedsideDrawer(forceOpen) {
      drawerOpen = typeof forceOpen === 'boolean' ? forceOpen : !drawerOpen;
      if (!drawerOpen) {
        drawerInspecting = false;
      }
      bedroomSfx.play('drawer_slide');
      return getDrawerStateSnapshot();
    },

    setDrawerInspectingKeepsake(inspecting) {
      drawerInspecting = inspecting && drawerOpen;
      bedroomSfx.play('page_flip');
      return getDrawerStateSnapshot();
    },

    stepDrawerKeepsake(dir) {
      if (effectiveDrawerKeepsakes.length > 0) {
        drawerSelectedIndex =
          (drawerSelectedIndex + dir + effectiveDrawerKeepsakes.length) %
          effectiveDrawerKeepsakes.length;
        bedroomSfx.play('page_flip');
      }
      return getDrawerStateSnapshot();
    },

    getDrawerState: getDrawerStateSnapshot,

    setCrtPower(on) {
      if (on && !crtState.poweredOn) {
        crtState.poweredOn = true;
        crtState.bootProgress = 0;
        crtState.appView = 'desktop';
        crtState.selectedIndex = 0;
        crtScreenMat.emissiveIntensity = 0.85;
        crtPowerLedMat.emissiveIntensity = 1.6;
        bedroomSfx.play('crt_boot');
      } else if (!on) {
        stopCrtMedia();
        crtState.poweredOn = false;
        crtState.bootProgress = 0;
        crtScreenMat.emissiveIntensity = 0.12;
        crtPowerLedMat.emissiveIntensity = 0.1;
        bedroomSfx.play('click');
      }
      crtRedrawDirty = true;
      return getCrtStateSnapshot();
    },

    setCrtAppView(view) {
      stopCrtMedia();
      crtState.poweredOn = true;
      crtState.bootProgress = 1;
      crtState.appView = view;
      crtState.selectedIndex = 0;
      crtScreenMat.emissiveIntensity = 0.85;
      crtPowerLedMat.emissiveIntensity = 1.6;
      crtRedrawDirty = true;
      bedroomSfx.play('click');
      return getCrtStateSnapshot();
    },

    selectCrtItem(index) {
      stopCrtMedia();
      const list = getCrtActiveList();
      const maxIdx = crtState.appView === 'desktop' ? 3 : Math.max(0, list.length - 1);
      crtState.selectedIndex = Math.max(0, Math.min(maxIdx, index));
      crtRedrawDirty = true;
      bedroomSfx.play('click');
      return getCrtStateSnapshot();
    },

    toggleCrtMediaPlay() {
      const list = getCrtActiveList();
      const item = list[crtState.selectedIndex];
      if (!item) return getCrtStateSnapshot();

      if (crtState.isPlaying && crtState.activeMediaId === item.id) {
        if (crtState.appView === 'videos' && crtVideoEl) crtVideoEl.pause();
        if (crtAudioEl) crtAudioEl.pause();
        crtState.isPlaying = false;
        crtRedrawDirty = true;
        return getCrtStateSnapshot();
      }

      const src = getMemoryMediaSrc(item);
      if (!src) return getCrtStateSnapshot();

      stopCrtMedia();
      crtState.activeMediaId = item.id;

      if (crtState.appView === 'videos' && crtVideoEl) {
        if (crtVideoEl.src !== src) {
          crtVideoEl.src = src;
        }
        crtVideoEl.volume = crtState.volume;
        crtVideoEl.muted = crtState.muted;
        crtVideoEl
          .play()
          .then(() => {
            crtState.isPlaying = true;
            crtRedrawDirty = true;
          })
          .catch(() => {
            crtState.isPlaying = false;
            crtRedrawDirty = true;
          });
      } else if (crtAudioEl) {
        if (crtAudioEl.src !== src) {
          crtAudioEl.src = src;
        }
        crtAudioEl.volume = crtState.volume;
        crtAudioEl.muted = crtState.muted;
        crtAudioEl
          .play()
          .then(() => {
            crtState.isPlaying = true;
            crtRedrawDirty = true;
          })
          .catch(() => {
            crtState.isPlaying = false;
            crtRedrawDirty = true;
          });
      }
      crtRedrawDirty = true;
      return getCrtStateSnapshot();
    },

    seekCrtMedia(timeSec) {
      if (crtState.appView === 'videos' && crtVideoEl && Number.isFinite(timeSec)) {
        crtVideoEl.currentTime = timeSec;
      } else if (crtAudioEl && Number.isFinite(timeSec)) {
        crtAudioEl.currentTime = timeSec;
      }
      crtState.currentTime = timeSec;
      crtRedrawDirty = true;
    },

    setCrtVolume(vol) {
      const clamped = Math.max(0, Math.min(1, vol));
      crtState.volume = clamped;
      if (crtAudioEl) crtAudioEl.volume = clamped;
      if (crtVideoEl) crtVideoEl.volume = clamped;
    },

    toggleCrtMute() {
      crtState.muted = !crtState.muted;
      if (crtAudioEl) crtAudioEl.muted = crtState.muted;
      if (crtVideoEl) crtVideoEl.muted = crtState.muted;
      return getCrtStateSnapshot();
    },

    stopCrtMedia,

    getCrtState: getCrtStateSnapshot,

    getCrtCatalog() {
      return {
        videos: videoMemories,
        music: musicMemories.length > 0 ? musicMemories : audioMemories,
        voices: voiceMemories.length > 0 ? voiceMemories : audioMemories,
        folders: visibleMemories,
      };
    },

    toggleHeadphonesWorn,

    isHeadphonesWorn() {
      return headphonesWorn;
    },

    setSchoolBagOpen(open) {
      schoolBagOpen = open;
      bedroomSfx.play('fabric_rustle');
      return schoolBagOpen;
    },

    toggleWindowCurtains(forceOpen) {
      windowCurtainsOpen = typeof forceOpen === 'boolean' ? forceOpen : !windowCurtainsOpen;
      bedroomSfx.play('fabric_rustle');
      return windowCurtainsOpen;
    },

    isWindowCurtainsOpen() {
      return windowCurtainsOpen;
    },

    toggleProjector(forceOn) {
      projectorOn = typeof forceOn === 'boolean' ? forceOn : !projectorOn;
      projBeamMesh.visible = projectorOn;
      renderProjectorSlide();
      bedroomSfx.play('projector_click');
      return getProjectorStateSnapshot();
    },

    stepProjectorSlide(dir) {
      if (videoMemories.length > 0) {
        projectorSlideIndex =
          (projectorSlideIndex + dir + videoMemories.length) % videoMemories.length;
        projectorOn = true;
        projBeamMesh.visible = true;
        renderProjectorSlide();
        bedroomSfx.play('projector_click');
      }
      return getProjectorStateSnapshot();
    },

    selectProjectorIndex(index) {
      if (videoMemories.length > 0) {
        projectorSlideIndex = Math.max(0, Math.min(index, videoMemories.length - 1));
        projectorOn = true;
        projBeamMesh.visible = true;
        renderProjectorSlide();
        bedroomSfx.play('projector_click');
      }
      return getProjectorStateSnapshot();
    },

    getProjectorState: getProjectorStateSnapshot,

    triggerCricketSwing() {
      bedroomSfx.play('cricket_hit');
    },

    getMemoriesForInteraction(objectId) {
      switch (objectId) {
        case 'under_bed_scrapbook':
        case 'cork_pinboard':
          return photoMemories;
        case 'memory_projector':
          return videoMemories;
        case 'bedside_drawer':
          return effectiveDrawerKeepsakes;
        case 'trophy_shelf':
          return certificateMemories;
        case 'drawing_wall':
          return effectiveDrawings;
        case 'wardrobe':
          return wardrobeMemories;
        case 'school_bag':
          return schoolBagMemories;
        case 'memory_radio':
          return audioMemories;
        case 'cricket_set':
          return cricketMemories;
        case 'wall_clock_calendar':
          return visibleMemories;
        default:
          return visibleMemories;
      }
    },

    getVerifiedTimelineMemories,

    updateMemories(nextMemories: Memory[]) {
      if (isDisposed) return;
      const hadVideosBefore = videoMemories.length > 0;
      recomputeMemoryBuckets(nextMemories);

      totalScrapbookSpreads = Math.max(1, Math.ceil(photoMemories.length / 2));
      scrapbookSpreadIndex = Math.max(
        0,
        Math.min(scrapbookSpreadIndex, totalScrapbookSpreads - 1),
      );
      renderScrapbookSpread();

      if (effectiveDrawerKeepsakes.length > 0) {
        drawerSelectedIndex = Math.max(
          0,
          Math.min(drawerSelectedIndex, effectiveDrawerKeepsakes.length - 1),
        );
      } else {
        drawerSelectedIndex = 0;
      }

      certFrameUpdaters.forEach((updateFn, idx) => {
        updateFn(certificateMemories[idx]);
      });
      pinboardFrameUpdaters.forEach((updateFn, idx) => {
        updateFn(photoMemories[idx]);
      });
      drawingFrameUpdaters.forEach((updateFn, idx) => {
        updateFn(effectiveDrawings[idx]);
      });
      cupboardSlotControllers.forEach((slotCtrl, idx) => {
        const photoMem = wardrobeMemories[idx];
        slotCtrl.group.visible = Boolean(photoMem);
        slotCtrl.plane.userData = photoMem
          ? {
              type: 'exhibit_memory',
              memoryId: photoMem.id,
              title: photoMem.title,
              subtitle: 'Click to inspect uploaded photograph',
            }
          : {};
        slotCtrl.updateMemory(photoMem);
      });

      if (!hadVideosBefore && videoMemories.length > 0) {
        projectorOn = true;
        projBeamMesh.visible = true;
        projectorSlideIndex = 0;
      } else if (videoMemories.length > 0) {
        projectorSlideIndex = Math.max(
          0,
          Math.min(projectorSlideIndex, videoMemories.length - 1),
        );
      } else {
        projectorSlideIndex = 0;
      }
      renderProjectorSlide();
      renderCalendarCanvas();
      crtRedrawDirty = true;
    },

    dispose() {
      isDisposed = true;
      stopCrtMedia();
      if (crtVideoEl) {
        crtVideoEl.removeAttribute('src');
        crtVideoEl.load();
      }
      if (crtAudioEl) {
        crtAudioEl.removeAttribute('src');
        crtAudioEl.load();
      }
      if (attachedFlashlightParent) {
        attachedFlashlightParent.remove(mouthFlashlightGroup);
        attachedFlashlightParent = null;
      }
      if (attachedHeadphonesParent) {
        attachedHeadphonesParent.remove(wornHeadphonesGroup);
        attachedHeadphonesParent = null;
      }
      flashlightSpot.visible = false;
      flashlightSpot.castShadow = false;
      if (flashlightSpot.shadow.map) {
        flashlightSpot.shadow.map.dispose();
      }
      loadedImages.clear();
    },
  };
}
