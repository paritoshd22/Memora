import * as THREE from 'three';
import { Memory } from '../types/museum';
import { InteractiveObjectId3D, LivingWorldSpaceId } from '../types/aiStudio';
import { VisualQualityConfig } from './museumVisualStandards';
import { getAuthenticMemoryDateLabel } from './roomTextureGenerators';
import { bedroomSfx } from './bedroomSfx';

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
  photoMemories: Memory[];
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
  getProjectorState: () => BedroomProjectorState;
  triggerCricketSwing: () => void;
  // Filtered real-memory buckets (strictly real uploaded memories, never invented)
  getMemoriesForInteraction: (objectId: InteractiveObjectId3D) => Memory[];
  getVerifiedTimelineMemories: () => { dated: Memory[]; undated: Memory[] };
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
  return m.customImageUrl || (mt === 'image' || mt === 'certificate' ? m.mediaUrl || null : null);
}

function getMemoryMediaSrc(m: Memory): string | null {
  return m.mediaUrl || m.customImageUrl || null;
}

function matchesKeywords(m: Memory, re: RegExp): boolean {
  const hay = `${m.title || ''} ${m.description || ''} ${m.story || ''} ${(m.tags || []).join(' ')} ${m.linked3DObject || ''}`.toLowerCase();
  return re.test(hay);
}

function loadImageIntoCanvas(
  src: string,
  onLoaded: (img: HTMLImageElement) => void,
): void {
  if (typeof Image === 'undefined') return;
  const img = new Image();
  if (!src.startsWith('data:') && !src.startsWith('blob:')) {
    img.crossOrigin = 'anonymous';
  }
  img.onload = () => onLoaded(img);
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

  const visibleMemories = memories.filter((m) => !m.hiddenFrom3D);
  const photoMemories = visibleMemories.filter(isPhotoMemory);
  const videoMemories = visibleMemories.filter(
    (m) => getEffectiveMediaType(m) === 'video' && Boolean(m.mediaUrl),
  );
  const audioMemories = visibleMemories.filter(
    (m) => getEffectiveMediaType(m) === 'audio' && Boolean(m.mediaUrl),
  );
  const voiceMemories = audioMemories.filter((m) =>
    matchesKeywords(m, /voice|story|note|memo|speech|grand|mom|dad|family|talk|diary|interview/),
  );
  const musicMemories = audioMemories.filter((m) => !voiceMemories.includes(m));
  const certificateMemories = visibleMemories.filter(
    (m) =>
      getEffectiveMediaType(m) === 'certificate' ||
      m.linkedObjectId === 'trophy_shelf' ||
      m.linkedObjectId === 'study_desk' ||
      matchesKeywords(m, /certificate|trophy|award|medal|diploma|honor|honour|prize|school|graduat|first place|champion/),
  );
  const drawingMemories = photoMemories.filter(
    (m) =>
      m.linkedObjectId === 'drawing_wall' ||
      matchesKeywords(m, /draw|sketch|paint|art|crayon|doodle|poster|color|colour/),
  );
  const effectiveDrawings = drawingMemories.length > 0 ? drawingMemories : photoMemories.slice(0, 4);
  const keepsakeMemories = visibleMemories.filter(
    (m) =>
      m.linkedObjectId === 'bedside_drawer' ||
      matchesKeywords(m, /letter|note|diary|journal|postcard|ticket|keepsake|secret|bedside|story/),
  );
  const effectiveDrawerKeepsakes =
    keepsakeMemories.length > 0
      ? keepsakeMemories
      : visibleMemories.filter((m) => Boolean(m.story || m.description)).slice(0, 6);
  const schoolBagMemories = visibleMemories.filter(
    (m) =>
      m.linkedObjectId === 'school_bag' ||
      matchesKeywords(m, /school|class|notebook|exam|homework|teacher|bag|backpack|uniform|study|friend/),
  );
  const wardrobeMemories = visibleMemories.filter(
    (m) =>
      m.linkedObjectId === 'wardrobe' ||
      matchesKeywords(m, /wardrobe|clothes|outfit|dress|uniform|jacket|costume|shirt|shoe|sweater/),
  );
  const cricketMemories = visibleMemories.filter(
    (m) =>
      m.linkedObjectId === 'cricket_set' ||
      matchesKeywords(m, /cricket|bat|ball|match|sport|wicket|stadium|play|game|team/),
  );

  // Loaded HTMLImageElement cache (disposed by clearing map on exit)
  const loadedImages = new Map<string, HTMLImageElement>();
  let isDisposed = false;

  // Shared materials matching existing MEMORA warm palette
  const matAgedLeather = track(
    new THREE.MeshStandardMaterial({ color: '#5A3422', roughness: 0.72, metalness: 0.05 }),
  );
  const matAgedPaper = track(
    new THREE.MeshStandardMaterial({ color: '#EFE3CB', roughness: 0.86, metalness: 0.02 }),
  );
  const matDarkMetal = track(
    new THREE.MeshStandardMaterial({ color: '#2F3134', roughness: 0.36, metalness: 0.65 }),
  );
  const matBeigePlastic = track(
    new THREE.MeshStandardMaterial({ color: '#D8CEBA', roughness: 0.52, metalness: 0.06 }),
  );
  const matBeigeTrim = track(
    new THREE.MeshStandardMaterial({ color: '#BFB39B', roughness: 0.58, metalness: 0.05 }),
  );
  const matCork = track(
    new THREE.MeshStandardMaterial({ color: '#B48252', roughness: 0.9, metalness: 0.0 }),
  );
  const matCanvasBag = track(
    new THREE.MeshStandardMaterial({ color: '#4E6759', roughness: 0.85, metalness: 0.02 }),
  );
  const matLeatherStrap = track(
    new THREE.MeshStandardMaterial({ color: '#6A4128', roughness: 0.68, metalness: 0.06 }),
  );
  const matCurtainCloth = track(
    new THREE.MeshStandardMaterial({
      color: '#E9DCC8',
      roughness: 0.86,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
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

  // 1. 3D Hidden Scrapbook (tucked at bed edge; slides gently into reading view when opened)
  const scrapbookGroup = new THREE.Group();
  scrapbookGroup.name = 'under_bed_scrapbook_3d';
  const scrapbookRestPos = new THREE.Vector3(0.45, 0.045, 0.96);
  const scrapbookReadPos = new THREE.Vector3(0.08, 0.06, 1.38);
  scrapbookGroup.position.copy(scrapbookRestPos);
  underBedGroup.add(scrapbookGroup);

  const bookBaseCover = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.46, 0.024, 0.34)),
    matAgedLeather,
  );
  scrapbookGroup.add(bookBaseCover);

  // Gold corner clasps on scrapbook cover
  const cornerGeo = track(new THREE.BoxGeometry(0.036, 0.028, 0.036));
  const cornerInst = new THREE.InstancedMesh(cornerGeo, matChampagneGold, 4);
  const cDummy = new THREE.Object3D();
  [
    [-0.215, 0.002, -0.155],
    [0.215, 0.002, -0.155],
    [-0.215, 0.002, 0.155],
    [0.215, 0.002, 0.155],
  ].forEach(([cx, cy, cz], idx) => {
    cDummy.position.set(cx, cy, cz);
    cDummy.updateMatrix();
    cornerInst.setMatrixAt(idx, cDummy.matrix);
  });
  cornerInst.instanceMatrix.needsUpdate = true;
  scrapbookGroup.add(cornerInst);

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
  const totalScrapbookSpreads = Math.max(1, Math.ceil(photoMemories.length / 2));

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

  // 2. Under-Bed Flashlight (Ground prop + Mouth-held attachment + Single SpotLight + Capped Dust)
  const flashlightGroundGroup = new THREE.Group();
  flashlightGroundGroup.name = 'under_bed_flashlight_ground';
  flashlightGroundGroup.position.set(-0.34, 0.045, 0.92);
  flashlightGroundGroup.rotation.y = 0.55;
  underBedGroup.add(flashlightGroundGroup);

  const buildFlashlightMesh = (parent: THREE.Group) => {
    const body = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.026, 0.024, 0.2, 12)),
      matDarkMetal,
    );
    body.rotation.x = Math.PI / 2;
    parent.add(body);
    const bezel = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.036, 0.028, 0.045, 12)),
      matChampagneGold,
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.z = 0.11;
    parent.add(bezel);
    const lens = new THREE.Mesh(
      track(new THREE.CircleGeometry(0.031, 12)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#FFF8DF',
          emissive: new THREE.Color('#FFE6A3'),
          emissiveIntensity: 0.75,
          roughness: 0.15,
        }),
      ),
    );
    lens.position.z = 0.133;
    parent.add(lens);
  };
  buildFlashlightMesh(flashlightGroundGroup);

  registerInteractiveHitbox(
    flashlightGroundGroup,
    'under_bed_flashlight',
    'bedroom',
    'Under-Bed Flashlight',
    'Press [E] or click to hold flashlight in mouth & light up under the bed',
    [0.42, 0.24, 0.42],
    [0, 0.06, 0],
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

  // Mouth-held flashlight group (attached to character headMesh only while held)
  const mouthFlashlightGroup = new THREE.Group();
  mouthFlashlightGroup.name = 'mouth_held_flashlight_prop';
  mouthFlashlightGroup.visible = false;
  buildFlashlightMesh(mouthFlashlightGroup);

  // Subtle volumetric beam cone (lightweight additive mesh)
  const beamConeMat = track(
    new THREE.MeshBasicMaterial({
      color: '#FFE9B5',
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const beamCone = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.65, 2.6, 16, 1, true)),
    beamConeMat,
  );
  beamCone.rotation.x = -Math.PI / 2;
  beamCone.position.z = 1.44;
  mouthFlashlightGroup.add(beamCone);

  // Capped flashlight dust particles (respecting qualityConfig; 0 on performance profiles)
  const moteCount =
    qualityConfig.profileId === 'desktop_performance' ||
    qualityConfig.profileId === 'mobile_performance'
      ? 0
      : 22;
  let flashlightDustPoints: THREE.Points | null = null;
  let flashlightDustPositions: Float32Array | null = null;
  if (moteCount > 0) {
    flashlightDustPositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const dist = 0.35 + (i / moteCount) * 2.1;
      const spread = dist * 0.22;
      flashlightDustPositions[i * 3] = (Math.sin(i * 12.7) * 0.5) * spread;
      flashlightDustPositions[i * 3 + 1] = (Math.cos(i * 9.3) * 0.5) * spread;
      flashlightDustPositions[i * 3 + 2] = dist;
    }
    const dustGeo = track(new THREE.BufferGeometry());
    dustGeo.setAttribute('position', new THREE.BufferAttribute(flashlightDustPositions, 3));
    const dustMat = track(
      new THREE.PointsMaterial({
        color: '#FFF2CC',
        size: 0.022,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    flashlightDustPoints = new THREE.Points(dustGeo, dustMat);
    mouthFlashlightGroup.add(flashlightDustPoints);
  }

  // Single flashlight SpotLight (disabled & 0 intensity unless held; small 512x512 shadow map only when enabled)
  const flashlightSpot = new THREE.SpotLight(0xfff1cc, 0, 8.2, Math.PI * 0.22, 0.58, 1.4);
  flashlightSpot.visible = false;
  flashlightSpot.castShadow = false;
  flashlightSpot.shadow.mapSize.set(512, 512);
  flashlightSpot.shadow.bias = -0.0006;
  const flashlightTargetObj = new THREE.Object3D();
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

  const shelfBack = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.18, 1.82, 0.06)),
    matWalnut,
  );
  shelfBack.position.set(0, 0.95, -0.14);
  trophyShelfGroup.add(shelfBack);
  cameraObstacleMeshes.push(shelfBack);

  [0.55, 1.02, 1.52].forEach((sy) => {
    const plank = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.14, 0.04, 0.28)),
      matWalnut,
    );
    plank.position.set(0, sy, -0.01);
    trophyShelfGroup.add(plank);
  });

  // 3 Polished Brass Trophies on middle shelf
  const cupGeo = track(new THREE.CylinderGeometry(0.055, 0.028, 0.13, 12));
  const cupBaseGeo = track(new THREE.BoxGeometry(0.08, 0.04, 0.08));
  [-0.36, 0, 0.36].forEach((tx, idx) => {
    const scaleH = idx === 1 ? 1.24 : 0.96;
    const base = new THREE.Mesh(cupBaseGeo, matWalnut);
    base.position.set(tx, 1.06, 0.02);
    trophyShelfGroup.add(base);
    const cup = new THREE.Mesh(cupGeo, matChampagneGold);
    cup.scale.set(1, scaleH, 1);
    cup.position.set(tx, 1.14 + (scaleH - 1) * 0.06, 0.02);
    trophyShelfGroup.add(cup);
  });

  // 3 Framed Certificate Slots on upper shelf (strictly real uploaded certificate/achievement memories)
  const buildMiniFrameTexture = (
    mem: Memory | undefined,
    fallbackTitle: string,
    accentHex: string,
  ): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const tex = track(new THREE.CanvasTexture(canvas));
    tex.colorSpace = THREE.SRGBColorSpace;

    const redraw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#FAF3E4';
      ctx.fillRect(0, 0, 256, 192);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 236, 172);

      const src = mem ? getMemoryImageSrc(mem) : null;
      const img = src ? loadedImages.get(src) : undefined;
      if (img) {
        const s = Math.max(224 / img.width, 160 / img.height);
        const sw = 224 / s;
        const sh = 160 / s;
        ctx.drawImage(img, (img.width - sw) * 0.5, (img.height - sh) * 0.5, sw, sh, 16, 16, 224, 160);
      } else {
        ctx.fillStyle = '#4B3624';
        ctx.font = '700 16px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText((mem?.title || fallbackTitle).slice(0, 24), 128, 92);
        const dateMeta = mem ? getAuthenticMemoryDateLabel(mem) : { isUndated: true, label: null };
        ctx.fillStyle = '#8C6A42';
        ctx.font = '13px sans-serif';
        ctx.fillText(
          dateMeta.label || (mem ? 'Uploaded Memory' : 'Empty Frame'),
          128,
          120,
        );
        ctx.textAlign = 'left';
        if (src) {
          loadImageIntoCanvas(src, (loaded) => {
            if (isDisposed) return;
            loadedImages.set(src, loaded);
            redraw();
          });
        }
      }
      tex.needsUpdate = true;
    };
    redraw();
    return tex;
  };

  [-0.36, 0, 0.36].forEach((fx, idx) => {
    const certMem = certificateMemories[idx];
    const frameGroup = new THREE.Group();
    frameGroup.position.set(fx, 1.68, -0.02);
    trophyShelfGroup.add(frameGroup);

    const frameBorder = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.3, 0.24, 0.028)),
      matChampagneGold,
    );
    frameGroup.add(frameBorder);
    const certTex = buildMiniFrameTexture(certMem, 'Certificate Slot', '#B88C4A');
    const certPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.26, 0.2)),
      track(new THREE.MeshBasicMaterial({ map: certTex })),
    );
    certPlane.position.z = 0.016;
    frameGroup.add(certPlane);
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

  // 2. Cork Pinboard (free space in NW study perimeter at x = -3.55, z = -6.25 facing +Z)
  const pinboardGroup = new THREE.Group();
  pinboardGroup.name = 'childhood_cork_pinboard_group';
  pinboardGroup.position.set(-3.55, 0, -6.25);
  studyCornerSpaceGroup.add(pinboardGroup);

  // Slim walnut easel legs supporting the pinboard cleanly in open space
  [-0.58, 0.58].forEach((lx) => {
    const post = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.05, 1.85, 0.05)),
      matWalnut,
    );
    post.position.set(lx, 0.925, -0.02);
    pinboardGroup.add(post);
  });

  const corkFrame = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.32, 0.92, 0.05)),
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

  // Up to 6 pinned real uploaded photos with instanced pushpins
  const pinGeo = track(new THREE.SphereGeometry(0.016, 8, 8));
  const pinMat = track(new THREE.MeshStandardMaterial({ color: '#C84B31', roughness: 0.35 }));
  const pinInst = new THREE.InstancedMesh(pinGeo, pinMat, 6);
  const pinDummy = new THREE.Object3D();
  const pinSlots: [number, number, number][] = [
    [-0.38, 1.6, -0.06],
    [0, 1.62, 0.04],
    [0.38, 1.59, -0.04],
    [-0.36, 1.24, 0.05],
    [0.02, 1.22, -0.05],
    [0.39, 1.25, 0.03],
  ];
  pinSlots.forEach(([px, py, rotZ], idx) => {
    const pMem = photoMemories[idx];
    const card = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.3, 0.24)),
      track(
        new THREE.MeshBasicMaterial({
          map: buildMiniFrameTexture(pMem, 'Pinned Photo', '#C9A66B'),
        }),
      ),
    );
    card.position.set(px, py, 0.036);
    card.rotation.z = rotZ;
    pinboardGroup.add(card);

    pinDummy.position.set(px, py + 0.1, 0.045);
    pinDummy.updateMatrix();
    pinInst.setMatrixAt(idx, pinDummy.matrix);
  });
  pinInst.instanceMatrix.needsUpdate = true;
  pinboardGroup.add(pinInst);

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

  [
    [-0.28, 1.46, -0.03],
    [0.28, 1.48, 0.04],
    [-0.26, 0.98, 0.03],
    [0.27, 0.96, -0.03],
  ].forEach(([dx, dy, rz], idx) => {
    const drawMem = effectiveDrawings[idx];
    const sheet = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.42, 0.34)),
      track(
        new THREE.MeshBasicMaterial({
          map: buildMiniFrameTexture(drawMem, 'Drawing Slot', '#D18B47'),
        }),
      ),
    );
    sheet.position.set(dx, dy, 0.005);
    sheet.rotation.z = rz;
    drawingWallGroup.add(sheet);
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

  // CRT Monitor positioned on center-right of desk top (lamp is at x=-0.42, globe is outside)
  const crtMonitorGroup = new THREE.Group();
  crtMonitorGroup.position.set(0.14, 0.8, -0.1);
  crtSetupGroup.add(crtMonitorGroup);

  const crtStandBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.13, 0.16, 0.045, 16)),
    matBeigeTrim,
  );
  crtStandBase.position.set(0, 0.022, 0);
  crtMonitorGroup.add(crtStandBase);

  const crtChassis = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.46, 0.37, 0.24)),
    matBeigePlastic,
  );
  crtChassis.position.set(0, 0.23, 0.02);
  crtMonitorGroup.add(crtChassis);

  const crtRearTube = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.32, 0.26, 0.16)),
    matBeigeTrim,
  );
  crtRearTube.position.set(0, 0.23, -0.16);
  crtMonitorGroup.add(crtRearTube);

  const crtBezel = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.41, 0.31, 0.02)),
    matDarkMetal,
  );
  crtBezel.position.set(0, 0.235, 0.138);
  crtMonitorGroup.add(crtBezel);

  // 3D Live CanvasTexture CRT Screen (rendered inside monitor glass, NOT a 2D webpage!)
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
      emissiveIntensity: 0.12,
      roughness: 0.18,
      metalness: 0.05,
    }),
  );
  const crtScreenMesh = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.37, 0.275)),
    crtScreenMat,
  );
  crtScreenMesh.position.set(0, 0.235, 0.151);
  crtMonitorGroup.add(crtScreenMesh);

  // Green CRT Power LED
  const crtPowerLedMat = track(
    new THREE.MeshStandardMaterial({
      color: '#2B5B34',
      emissive: new THREE.Color('#35E068'),
      emissiveIntensity: 0.1,
    }),
  );
  const crtPowerLed = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.008, 8, 8)),
    crtPowerLedMat,
  );
  crtPowerLed.position.set(0.16, 0.072, 0.145);
  crtMonitorGroup.add(crtPowerLed);

  // Beige Keyboard + Mouse on front of desk
  const keyboardMesh = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.42, 0.025, 0.15)),
    matBeigePlastic,
  );
  keyboardMesh.position.set(0.12, 0.812, 0.2);
  keyboardMesh.rotation.x = 0.08;
  crtSetupGroup.add(keyboardMesh);

  const mousePad = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.16, 0.005, 0.15)),
    track(new THREE.MeshStandardMaterial({ color: '#2F4D3F', roughness: 0.9 })),
  );
  mousePad.position.set(0.46, 0.802, 0.2);
  crtSetupGroup.add(mousePad);

  const mouseMesh = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.055, 0.025, 0.085)),
    matBeigePlastic,
  );
  mouseMesh.position.set(0.46, 0.818, 0.2);
  crtSetupGroup.add(mouseMesh);

  // Beige CPU Tower resting on floor beside right leg of desk
  const cpuTower = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.21, 0.44, 0.4)),
    matBeigePlastic,
  );
  cpuTower.position.set(0.46, 0.22, -0.08);
  crtSetupGroup.add(cpuTower);

  const floppySlot = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.14, 0.018, 0.01)),
    matDarkMetal,
  );
  floppySlot.position.set(0.46, 0.34, 0.125);
  crtSetupGroup.add(floppySlot);

  // Wired Headphones resting on front-left desk edge + Wearable Head Attachment
  const headphonesDeskGroup = new THREE.Group();
  headphonesDeskGroup.name = 'wired_headphones_desk_prop';
  headphonesDeskGroup.position.set(-0.34, 0.83, 0.18);
  headphonesDeskGroup.rotation.y = 0.4;
  crtSetupGroup.add(headphonesDeskGroup);

  const buildHeadphonesGeometry = (parent: THREE.Group, wearableScale: number) => {
    const band = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.11 * wearableScale, 0.014 * wearableScale, 8, 18, Math.PI)),
      matDarkMetal,
    );
    band.position.y = 0.02 * wearableScale;
    parent.add(band);
    [-0.11, 0.11].forEach((ex) => {
      const cup = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.045 * wearableScale, 0.045 * wearableScale, 0.032 * wearableScale, 12)),
        matDarkMetal,
      );
      cup.rotation.z = Math.PI / 2;
      cup.position.set(ex * wearableScale, 0.01 * wearableScale, 0);
      parent.add(cup);
      const cushion = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.036 * wearableScale, 0.012 * wearableScale, 8, 14)),
        matLeatherStrap,
      );
      cushion.rotation.y = Math.PI / 2;
      cushion.position.set((ex > 0 ? ex - 0.016 : ex + 0.016) * wearableScale, 0.01 * wearableScale, 0);
      parent.add(cushion);
    });
  };
  buildHeadphonesGeometry(headphonesDeskGroup, 0.9);
  headphonesDeskGroup.rotation.x = Math.PI / 2;

  const wornHeadphonesGroup = new THREE.Group();
  wornHeadphonesGroup.name = 'worn_wired_headphones_prop';
  wornHeadphonesGroup.visible = false;
  buildHeadphonesGeometry(wornHeadphonesGroup, 2.18);

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

  // Real uploaded keepsake photo frame tucked inside the upper cupboard shelf (zero fictional photos)
  const wardrobeKeepsakePhoto = photoMemories[0] ?? null;
  if (wardrobeKeepsakePhoto) {
    const innerFrameGroup = new THREE.Group();
    innerFrameGroup.position.set(-0.08, 1.66, -0.04);
    innerFrameGroup.rotation.y = 0.14;
    wardrobeInteriorGroup.add(innerFrameGroup);

    const frameBorder = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.28, 0.34, 0.024)),
      matChampagneGold,
    );
    innerFrameGroup.add(frameBorder);

    const innerPhotoMat = track(
      new THREE.MeshStandardMaterial({
        map: buildMiniFrameTexture(
          wardrobeKeepsakePhoto,
          'Wardrobe Keepsake',
          '#C9A66B',
        ),
        color: 0xffffff,
        roughness: 0.42,
      }),
    );
    const innerPhotoPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.23, 0.29)),
      innerPhotoMat,
    );
    innerPhotoPlane.position.z = 0.014;
    innerPhotoPlane.userData = {
      type: 'exhibit_memory',
      memoryId: wardrobeKeepsakePhoto.id,
      title: wardrobeKeepsakePhoto.title,
      subtitle: 'Click to inspect original uploaded keepsake photograph',
    };
    innerFrameGroup.add(innerPhotoPlane);
  }

  zones.push({
    objectId: 'wardrobe',
    spaceId: 'bedroom',
    title: 'Walnut Childhood Wardrobe',
    promptVerb: 'Open wardrobe',
    subtitle: 'Open cupboard door to inspect preserved clothes & keepsakes',
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

  // 2. School Bag resting beside study desk at (-4.28, 0, -5.08)
  const schoolBagGroup = new THREE.Group();
  schoolBagGroup.name = 'childhood_school_bag_group';
  schoolBagGroup.position.set(-4.28, 0, -5.08);
  schoolBagGroup.rotation.y = 0.52;
  studyCornerSpaceGroup.add(schoolBagGroup);

  const bagBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.34, 0.4, 0.19)),
    matCanvasBag,
  );
  bagBody.position.set(0, 0.2, 0);
  bagBody.rotation.x = -0.1;
  schoolBagGroup.add(bagBody);

  const bagFlapPivot = new THREE.Group();
  bagFlapPivot.position.set(0, 0.39, -0.07);
  schoolBagGroup.add(bagFlapPivot);

  const bagFlap = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.35, 0.14, 0.2)),
    matLeatherStrap,
  );
  bagFlap.position.set(0, -0.05, 0.1);
  bagFlapPivot.add(bagFlap);

  [-0.09, 0.09].forEach((bx) => {
    const buckle = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.035, 0.04, 0.015)),
      matChampagneGold,
    );
    buckle.position.set(bx, -0.09, 0.2);
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
    'Press [E] or click to tune your uploaded voice recordings & music archive',
    [0.62, 0.95, 0.52],
    [0, 0.48, 0],
    audioMemories[0],
  );

  zones.push({
    objectId: 'memory_radio',
    spaceId: 'bedroom',
    title: 'Vintage Memory Radio',
    promptVerb: 'Tune memory radio',
    subtitle: 'Listen to uploaded voice memories & songs (never autoplays)',
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

  let projectorOn = false;
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
      ctx.fillText('Memory Projector Screen (Off)', 256, 198);
      ctx.textAlign = 'left';
      projScreenMat.emissiveIntensity = 0.04;
      projTex.needsUpdate = true;
      return;
    }

    ctx.fillStyle = '#1E1A16';
    ctx.fillRect(0, 0, 512, 384);
    const mem = photoMemories[projectorSlideIndex];
    if (!mem) {
      ctx.fillStyle = '#FFF4DC';
      ctx.font = '700 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('No Uploaded Photographs Yet', 256, 178);
      ctx.font = '15px Georgia, serif';
      ctx.fillStyle = '#D6C29C';
      ctx.fillText('Upload photos to project them on this bedroom screen.', 256, 212);
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
        ctx.fillStyle = '#312A22';
        ctx.fillRect(22, 20, 468, 304);
        if (src) {
          loadImageIntoCanvas(src, (loaded) => {
            if (isDisposed) return;
            loadedImages.set(src, loaded);
            renderProjectorSlide();
          });
        }
      }
      ctx.fillStyle = '#FFF2D6';
      ctx.font = '700 17px Georgia, serif';
      ctx.fillText((mem.title || 'Projected Slide').slice(0, 38), 26, 354);
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
  renderProjectorSlide();

  registerInteractiveHitbox(
    projectorRoot,
    'memory_projector',
    'bedroom',
    'Vintage Memory Projector',
    'Press [E] or click to switch on the slide projector & cycle uploaded photos',
    [1.1, 1.35, 0.72],
    [0.2, 0.68, 0],
    photoMemories[0],
  );

  zones.push({
    objectId: 'memory_projector',
    spaceId: 'bedroom',
    title: 'Vintage Memory Projector',
    promptVerb: 'Use memory projector',
    subtitle: 'Project uploaded photographs onto the bedroom screen',
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
  const calCtx = calCanvas.getContext('2d');
  if (calCtx) {
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
  }
  const calTex = track(new THREE.CanvasTexture(calCanvas));
  calTex.colorSpace = THREE.SRGBColorSpace;
  const calPlane = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.34, 0.36)),
    track(new THREE.MeshBasicMaterial({ map: calTex })),
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
    flashlightSpot.intensity = held ? 4.4 : 0;
    flashlightSpot.castShadow = held && qualityConfig.enableShadows;

    if (held && headRig && attachedFlashlightParent !== headRig) {
      if (attachedFlashlightParent) {
        attachedFlashlightParent.remove(mouthFlashlightGroup);
      }
      mouthFlashlightGroup.position.set(0, -0.075, 0.22);
      mouthFlashlightGroup.rotation.set(0.08, 0, 0);
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
    wornHeadphonesGroup.visible = next;

    if (next && headRig && attachedHeadphonesParent !== headRig) {
      if (attachedHeadphonesParent) {
        attachedHeadphonesParent.remove(wornHeadphonesGroup);
      }
      wornHeadphonesGroup.position.set(0, 0.02, 0);
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
    slideIndex: projectorSlideIndex,
    photoMemories,
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

      // 2. Flashlight subtle dust mote drift when held
      if (flashlightHeld && flashlightDustPoints && flashlightDustPositions && !reducedMotion) {
        for (let i = 0; i < moteCount; i++) {
          flashlightDustPositions[i * 3 + 1] += Math.sin(elapsed * 1.4 + i) * dt * 0.018;
          if (flashlightDustPositions[i * 3 + 1] > 0.36) {
            flashlightDustPositions[i * 3 + 1] = -0.32;
          }
        }
        (flashlightDustPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
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

      // 7. CRT boot progress & active media canvas update (throttled ~15fps only while playing)
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
      flashlightSpot.position.copy(origin);
      tmpSpotlightTarget.copy(origin).addScaledVector(forwardDir, 4.5);
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
      if (photoMemories.length > 0) {
        projectorSlideIndex =
          (projectorSlideIndex + dir + photoMemories.length) % photoMemories.length;
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
        case 'memory_projector':
          return photoMemories;
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
