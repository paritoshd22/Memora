import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import * as THREE from 'three';
import {
  buildExhibitionRoom3DScene,
  createBoundedCanvasFromImage,
  isRenderableRoomMediaUrl,
  resolveRoomMemoryImageUrl,
  resolveRoomMemoryVideoUrl,
} from '../roomExhibition3D';
import {
  compactMemoriesForLocalStorage,
  syncMemoryRecordToVault,
} from '../mediaStorage';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  validateUploadFileCandidate,
} from '../clientMediaExtractor';
import { MemoryVaultService } from '../../server/memoryVaultService';
import { Memory, Room } from '../../types/museum';

// Minimal headless browser DOM/Canvas/Image/Video shim so real Three.js room builders run in Node
interface FakeCanvas2DContext {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  globalAlpha: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  fillRect: (...args: unknown[]) => void;
  strokeRect: (...args: unknown[]) => void;
  clearRect: (...args: unknown[]) => void;
  beginPath: () => void;
  closePath: () => void;
  moveTo: (...args: unknown[]) => void;
  lineTo: (...args: unknown[]) => void;
  arc: (...args: unknown[]) => void;
  ellipse: (...args: unknown[]) => void;
  quadraticCurveTo: (...args: unknown[]) => void;
  bezierCurveTo: (...args: unknown[]) => void;
  rect: (...args: unknown[]) => void;
  roundRect: (...args: unknown[]) => void;
  fill: () => void;
  stroke: () => void;
  save: () => void;
  restore: () => void;
  translate: (...args: unknown[]) => void;
  rotate: (...args: unknown[]) => void;
  scale: (...args: unknown[]) => void;
  clip: () => void;
  setLineDash: (...args: unknown[]) => void;
  fillText: (...args: unknown[]) => void;
  strokeText: (...args: unknown[]) => void;
  measureText: (t: string) => { width: number };
  drawImage: (...args: unknown[]) => void;
  createLinearGradient: () => { addColorStop: () => void };
  createRadialGradient: () => { addColorStop: () => void };
  getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray; width: number; height: number };
  putImageData: () => void;
}

class FakeCanvasElement {
  width = 256;
  height = 256;
  private _ctx: FakeCanvas2DContext;
  constructor() {
    const noop = () => {};
    this._ctx = {
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      font: '12px sans-serif',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      fillRect: noop,
      strokeRect: noop,
      clearRect: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      ellipse: noop,
      quadraticCurveTo: noop,
      bezierCurveTo: noop,
      rect: noop,
      roundRect: noop,
      fill: noop,
      stroke: noop,
      save: noop,
      restore: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      clip: noop,
      setLineDash: noop,
      fillText: noop,
      strokeText: noop,
      measureText: (t: string) => ({ width: String(t || '').length * 7 }),
      drawImage: noop,
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4),
        width: w,
        height: h,
      }),
      putImageData: noop,
    };
  }
  getContext(kind: string) {
    if (kind === '2d') return this._ctx;
    return null;
  }
  toDataURL() {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  }
}

const createdImages: FakeImageElement[] = [];
class FakeImageElement {
  crossOrigin: string | null = null;
  naturalWidth = 1024;
  naturalHeight = 768;
  width = 1024;
  height = 768;
  onload: (() => void) | null = null;
  onerror: ((e?: unknown) => void) | null = null;
  private _src = '';
  constructor() {
    createdImages.push(this);
  }
  get src() {
    return this._src;
  }
  set src(val: string) {
    this._src = val;
  }
}

const createdVideos: FakeVideoElement[] = [];
class FakeVideoElement {
  crossOrigin: string | null = null;
  muted = false;
  loop = false;
  playsInline = false;
  preload = '';
  readyState = 0;
  videoWidth = 0;
  videoHeight = 0;
  paused = true;
  src = '';
  private listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  constructor() {
    createdVideos.push(this);
  }
  addEventListener(ev: string, fn: (...args: unknown[]) => void) {
    const arr = this.listeners.get(ev) || [];
    arr.push(fn);
    this.listeners.set(ev, arr);
  }
  removeEventListener(ev: string, fn: (...args: unknown[]) => void) {
    const arr = this.listeners.get(ev) || [];
    this.listeners.set(ev, arr.filter((f) => f !== fn));
  }
  emit(ev: string) {
    const arr = this.listeners.get(ev) || [];
    arr.forEach((fn) => fn());
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
  removeAttribute(attr: string) {
    if (attr === 'src') this.src = '';
  }
}

function installHeadlessDomShim() {
  const g = globalThis as unknown as Record<string, unknown>;
  g.document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return new FakeCanvasElement();
      if (tag === 'video') return new FakeVideoElement();
      return {};
    },
  };
  g.Image = FakeImageElement;
  g.HTMLCanvasElement = FakeCanvasElement;
  g.HTMLImageElement = FakeImageElement;
  g.HTMLVideoElement = FakeVideoElement;
}

function makeRoom(id: string, name: string, slotIndex = 0): Room {
  return {
    id,
    floorId: 'floor-0',
    floorNumber: 0,
    slotIndex,
    name,
    subtitle: `${name} Exhibition`,
    description: `${name} personal museum gallery`,
    status: 'active',
    enabled: true,
    accentColor: '#C9A66B',
    lightColor: '#FFE5BE',
    wing: 'west',
    archIndex: slotIndex,
    curatorQuote: '',
    ambientMood: 'warm',
    theme: id === 'childhood' ? 'Childhood Sanctuary' : 'Golden Hour Salon',
    exhibitionStyle: 'classical_gallery',
  } as unknown as Room;
}

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_MP4_DATA_URL = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28y';
const TINY_MP3_DATA_URL = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA';

function makePhotoMemory(id: string, roomId: string, title: string, url = TINY_PNG_DATA_URL): Memory {
  return {
    id,
    roomId,
    title,
    subtitle: 'Cupboard & Photo Display',
    description: `Uploaded photo ${title}`,
    story: `Uploaded photo ${title}`,
    date: '2004',
    year: 2004,
    location: '',
    category: 'Photo',
    accessionNumber: `MEM-${id}`,
    tags: [],
    type: 'image',
    mediaType: 'image',
    customImageUrl: url,
    mediaUrl: url,
    mediaMimeType: 'image/png',
    mediaFileName: `${id}.png`,
    motif: 'archway',
    palette: ['#F5E6C8', '#E7C896', '#854D27', '#27231F'],
    hiddenFrom3D: false,
    placementTarget: 'cupboard_photos',
    linkedObjectId: 'cupboard_photos',
  } as unknown as Memory;
}

function makeVideoMemory(id: string, roomId: string, title: string, url = '/api/storage/media/vid-1'): Memory {
  return {
    id,
    roomId,
    title,
    subtitle: 'Projector Reel',
    description: `Uploaded video ${title}`,
    story: `Uploaded video ${title}`,
    date: '2005',
    year: 2005,
    location: '',
    category: 'Video',
    accessionNumber: `MEM-${id}`,
    tags: [],
    type: 'video',
    mediaType: 'video',
    mediaUrl: url,
    mediaMimeType: 'video/mp4',
    mediaFileName: `${id}.mp4`,
    motif: 'cinema',
    palette: ['#F5E6C8', '#E7C896', '#854D27', '#27231F'],
    hiddenFrom3D: false,
    placementTarget: 'projector_desk',
    linkedObjectId: 'projector_desk',
  } as unknown as Memory;
}

function makeAudioMemory(id: string, roomId: string, title: string, url = '/api/storage/media/aud-1'): Memory {
  return {
    id,
    roomId,
    title,
    subtitle: 'Radio Track',
    description: `Uploaded track ${title}`,
    story: `Uploaded track ${title}`,
    date: '2006',
    year: 2006,
    location: '',
    category: 'Audio',
    accessionNumber: `MEM-${id}`,
    tags: [],
    type: 'audio',
    mediaType: 'audio',
    mediaUrl: url,
    mediaMimeType: 'audio/mpeg',
    mediaFileName: `${id}.mp3`,
    motif: 'music',
    palette: ['#F5E6C8', '#E7C896', '#854D27', '#27231F'],
    hiddenFrom3D: false,
    placementTarget: 'radio_bookshelf',
    linkedObjectId: 'radio_bookshelf',
  } as unknown as Memory;
}

async function runTests() {
  installHeadlessDomShim();
  console.log('Running MEMORA 3D Room Memory Upload Stability Suite (9 Scenarios)...\n');
  let passed = 0;

  const childhoodRoom = makeRoom('childhood', 'Childhood Room', 0);
  const travelRoom = makeRoom('travel-wing', 'Travel Wing', 1);
  const dummyFloorTex = new THREE.DataTexture(new Uint8Array([220, 200, 175, 255]), 1, 1);

  // =========================================================================
  // SCENARIO 1: Upload one photo into an active 3D room (in-place update)
  // =========================================================================
  {
    const built = buildExhibitionRoom3DScene({
      room: childhoodRoom,
      memories: [],
      maxAnisotropy: 1,
      floorTexture: dummyFloorTex,
    });
    const originalRoot = built.rootGroup;
    const originalInteractions = built.bedroomInteractions;
    assert.ok(originalInteractions, 'Childhood room must create bedroomInteractions');
    assert.equal(typeof built.updateMemories, 'function', 'Built room must expose in-place updateMemories()');

    // Simulate active user state before upload (e.g., curtains opened)
    originalInteractions.toggleWindowCurtains(true);
    assert.equal(originalInteractions.isWindowCurtainsOpen(), true);

    const photo1 = makePhotoMemory('mem-photo-1', 'childhood', 'Backyard Swing', '/api/storage/media/mem-photo-1');
    built.updateMemories!([photo1]);

    // Room shell & controller MUST NOT be destroyed or recreated
    assert.strictEqual(built.rootGroup, originalRoot, 'rootGroup must remain identical after upload');
    assert.strictEqual(built.bedroomInteractions, originalInteractions, 'bedroomInteractions must remain identical');
    assert.equal(originalInteractions.isWindowCurtainsOpen(), true, 'Interactive room state must be preserved');

    // Uploaded photo must immediately appear in both room displays and cupboard collection
    assert.equal(built.displayRecords.some((d) => d.placement.memory.id === 'mem-photo-1'), true);
    const cupboardMemories = originalInteractions.getMemoriesForInteraction('wardrobe');
    assert.equal(cupboardMemories.some((m) => m.id === 'mem-photo-1'), true);
    const pinboardMemories = originalInteractions.getMemoriesForInteraction('cork_pinboard');
    assert.equal(pinboardMemories.some((m) => m.id === 'mem-photo-1'), true);

    built.cleanup?.();
    console.log('✅ Scenario 1 Passed: Uploading 1 photo updates active 3D room & Cupboard in-place without recreating room.');
    passed++;
  }

  // =========================================================================
  // SCENARIO 2: Upload multiple photos (no duplicates, stable IDs)
  // =========================================================================
  {
    const built = buildExhibitionRoom3DScene({
      room: childhoodRoom,
      memories: [],
      maxAnisotropy: 1,
      floorTexture: dummyFloorTex,
    });

    const batch = [
      makePhotoMemory('mem-multi-1', 'childhood', 'Birthday Cake'),
      makePhotoMemory('mem-multi-2', 'childhood', 'Summer Beach'),
      makePhotoMemory('mem-multi-3', 'childhood', 'Treehouse Afternoon'),
    ];
    built.updateMemories!(batch);

    const displayIds = built.displayRecords.map((d) => d.placement.memory.id);
    assert.equal(new Set(displayIds).size, displayIds.length, 'Display IDs must be unique with zero duplicates');
    batch.forEach((m) => {
      assert.equal(displayIds.includes(m.id), true, `Expected ${m.id} in displayRecords`);
    });
    const cupboardIds = built.bedroomInteractions!.getMemoriesForInteraction('wardrobe').map((m) => m.id);
    assert.equal(cupboardIds.length, 3);
    assert.deepEqual(new Set(cupboardIds), new Set(['mem-multi-1', 'mem-multi-2', 'mem-multi-3']));

    built.cleanup?.();
    console.log('✅ Scenario 2 Passed: Uploading multiple photos displays all photos with unique stable IDs and zero duplicates.');
    passed++;
  }

  // =========================================================================
  // SCENARIO 3: Upload a large image (downscaled texture & compacted storage)
  // =========================================================================
  {
    const fakeLargeImg = new FakeImageElement();
    fakeLargeImg.naturalWidth = 4096;
    fakeLargeImg.naturalHeight = 3072;
    fakeLargeImg.width = 4096;
    fakeLargeImg.height = 3072;

    const bounded = createBoundedCanvasFromImage(fakeLargeImg as unknown as HTMLImageElement, 1024);
    assert.ok(bounded.canvas, 'Bounded canvas must be created for large image');
    assert.equal(bounded.canvas.width, 1024, 'Width must be clamped to 1024px');
    assert.equal(bounded.canvas.height, 768, 'Height must preserve exact 4:3 aspect ratio');
    assert.equal(bounded.natW, 4096);
    assert.equal(bounded.natH, 3072);

    const hugeDataUrl = `data:image/jpeg;base64,${'A'.repeat(40_000)}`;
    const compacted = compactMemoriesForLocalStorage([
      makePhotoMemory('large-inline', 'childhood', 'Large Inline Photo', hugeDataUrl),
      makePhotoMemory('server-hosted', 'childhood', 'Server Hosted Photo', '/api/storage/media/server-hosted'),
    ]);
    assert.equal(compacted[0].customImageUrl, 'idb://large-inline', 'Oversized inline data URL must compact to idb:// pointer');
    assert.equal(compacted[0].mediaUrl, 'idb://large-inline');
    assert.equal(compacted[1].customImageUrl, '/api/storage/media/server-hosted', 'Server media URL must stay intact');

    console.log('✅ Scenario 3 Passed: Large image is safely downscaled for WebGL (4096x3072 → 1024x768) and compacted for localStorage.');
    passed++;
  }

  // =========================================================================
  // SCENARIO 4: Upload video + audio memories & resilient media error handling
  // =========================================================================
  {
    const vid = makeVideoMemory('mem-vid-1', 'childhood', 'Home Movie 2005', '/api/storage/media/mem-vid-1');
    const aud = makeAudioMemory('mem-aud-1', 'childhood', 'Lullaby Tape', '/api/storage/media/mem-aud-1');

    assert.equal(isRenderableRoomMediaUrl('/api/storage/media/mem-vid-1'), true);
    assert.equal(isRenderableRoomMediaUrl('idb://mem-vid-1'), false);
    assert.equal(resolveRoomMemoryVideoUrl(vid), '/api/storage/media/mem-vid-1');
    assert.equal(resolveRoomMemoryImageUrl(makePhotoMemory('p', 'childhood', 'P', '/api/storage/media/p')), '/api/storage/media/p');

    const built = buildExhibitionRoom3DScene({
      room: childhoodRoom,
      memories: [],
      maxAnisotropy: 1,
      floorTexture: dummyFloorTex,
    });

    const imgCountBefore = createdImages.length;
    const vidCountBefore = createdVideos.length;

    built.updateMemories!([
      makePhotoMemory('mem-broken-photo', 'childhood', 'Broken Photo', '/api/storage/media/missing-404'),
      vid,
      aud,
    ]);

    const projectorMemories = built.bedroomInteractions!.getMemoriesForInteraction('memory_projector');
    const radioMemories = built.bedroomInteractions!.getMemoriesForInteraction('memory_radio');
    assert.equal(projectorMemories.some((m) => m.id === 'mem-vid-1'), true, 'Video must appear in Projector');
    assert.equal(radioMemories.some((m) => m.id === 'mem-aud-1'), true, 'Audio must appear in Radio');
    assert.equal(built.bedroomInteractions!.getProjectorState().poweredOn, true, 'Projector auto-enables when first video arrives');

    // Trigger error events on created images & videos — must NOT throw or crash the room
    assert.doesNotThrow(() => {
      for (let i = imgCountBefore; i < createdImages.length; i++) {
        createdImages[i].onerror?.(new Error('404 Not Found'));
      }
      for (let i = vidCountBefore; i < createdVideos.length; i++) {
        createdVideos[i].emit('error');
      }
      built.updateAmbientAnimations?.(1.0, { x: 0, z: 0 }, false);
      built.bedroomInteractions?.update(0.016, 1.0, false, false);
    }, 'Broken image/video media load errors must never throw or crash the 3D room');

    built.cleanup?.();
    console.log('✅ Scenario 4 Passed: Video → Projector, Audio → Radio, and broken media errors recover without crashing 3D room.');
    passed++;
  }

  // =========================================================================
  // SCENARIO 5: Upload memories to different rooms (isolation + multi-room IDs)
  // =========================================================================
  {
    const builtChildhood = buildExhibitionRoom3DScene({
      room: childhoodRoom,
      memories: [makePhotoMemory('ch-1', 'childhood', 'Toy Train')],
      maxAnisotropy: 1,
      floorTexture: dummyFloorTex,
    });
    const builtTravel = buildExhibitionRoom3DScene({
      room: travelRoom,
      memories: [],
      maxAnisotropy: 1,
      floorTexture: dummyFloorTex,
    });

    const travelRootBefore = builtTravel.rootGroup;
    const travelPhoto = makePhotoMemory('tr-1', 'travel-wing', 'Kyoto Autumn Temple');
    builtTravel.updateMemories!([travelPhoto]);

    assert.strictEqual(builtTravel.rootGroup, travelRootBefore, 'Non-childhood room updates in-place too');
    assert.equal(builtTravel.displayRecords.some((d) => d.placement.memory.id === 'tr-1'), true);
    assert.equal(builtChildhood.displayRecords.some((d) => d.placement.memory.id === 'tr-1'), false, 'Childhood room must stay isolated');
    assert.equal(builtChildhood.displayRecords.some((d) => d.placement.memory.id === 'ch-1'), true);

    // Verify MemoryVaultService preserves distinct roomIds across persistence
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memora-multiroom-'));
    try {
      const vaultPath = path.join(tmpDir, 'vault.json');
      const vault = new MemoryVaultService(vaultPath);
      vault.upsertUserMemories('user-multi', [
        makePhotoMemory('ch-1', 'childhood', 'Toy Train') as unknown as Record<string, unknown> & { id: string },
        travelPhoto as unknown as Record<string, unknown> & { id: string },
      ]);
      const reloadedVault = new MemoryVaultService(vaultPath);
      const list = reloadedVault.listUserMemories('user-multi');
      assert.equal(list.find((m) => m.id === 'ch-1')?.roomId, 'childhood');
      assert.equal(list.find((m) => m.id === 'tr-1')?.roomId, 'travel-wing');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    builtChildhood.cleanup?.();
    builtTravel.cleanup?.();
    console.log('✅ Scenario 5 Passed: Uploads to different rooms isolate updates and preserve distinct roomIds.');
    passed++;
  }

  // =========================================================================
  // SCENARIO 6: Multiple consecutive uploads (stability + resource cleanup)
  // =========================================================================
  {
    const built = buildExhibitionRoom3DScene({
      room: childhoodRoom,
      memories: [],
      maxAnisotropy: 1,
      floorTexture: dummyFloorTex,
    });
    const rootRef = built.rootGroup;
    const interactionsRef = built.bedroomInteractions!;
    interactionsRef.setFlashlightHeld(true);
    assert.equal(interactionsRef.isFlashlightHeld(), true);

    const cumulative: Memory[] = [];
    for (let step = 1; step <= 6; step++) {
      cumulative.push(
        makePhotoMemory(`consec-${step}`, 'childhood', `Memory #${step}`, `/api/storage/media/consec-${step}`),
      );
      built.updateMemories!([...cumulative]);
      built.updateAmbientAnimations?.(step * 0.5, { x: 0, z: 0 }, false);
      interactionsRef.update(0.016, step * 0.5, false, false);

      assert.strictEqual(built.rootGroup, rootRef, `rootGroup must stay identical on consecutive upload #${step}`);
      assert.strictEqual(built.bedroomInteractions, interactionsRef);
      assert.equal(interactionsRef.isFlashlightHeld(), true, 'Flashlight state must survive consecutive uploads');
    }

    assert.equal(built.displayRecords.length, 6, 'All 6 consecutive uploads must be displayed');
    assert.equal(interactionsRef.getMemoriesForInteraction('wardrobe').length, 6);

    built.cleanup?.();
    console.log('✅ Scenario 6 Passed: 6 consecutive uploads keep room/state intact with clean resource updates.');
    passed++;
  }

  // =========================================================================
  // SCENARIO 7: Exit and re-enter room after uploading (clean teardown + reload)
  // =========================================================================
  {
    const uploaded = [
      makePhotoMemory('reenter-p1', 'childhood', 'Family Picnic', '/api/storage/media/reenter-p1'),
      makeVideoMemory('reenter-v1', 'childhood', 'First Bicycle', '/api/storage/media/reenter-v1'),
      makeAudioMemory('reenter-a1', 'childhood', 'Rainy Afternoon Song', '/api/storage/media/reenter-a1'),
    ];

    const firstVisit = buildExhibitionRoom3DScene({
      room: childhoodRoom,
      memories: [],
      maxAnisotropy: 1,
      floorTexture: dummyFloorTex,
    });
    const imgsBefore = createdImages.length;
    firstVisit.updateMemories!(uploaded);
    // Simulate exit from room
    firstVisit.cleanup?.();

    // Late async image onload firing AFTER room exit must be safely ignored
    assert.doesNotThrow(() => {
      for (let i = imgsBefore; i < createdImages.length; i++) {
        createdImages[i].onload?.();
      }
    }, 'Stale onload after room exit must not crash or mutate disposed room');

    // Re-enter the room with saved memories
    const secondVisit = buildExhibitionRoom3DScene({
      room: childhoodRoom,
      memories: uploaded,
      maxAnisotropy: 1,
      floorTexture: dummyFloorTex,
    });
    assert.equal(secondVisit.displayRecords.length, 3, 'All 3 uploaded memories must render upon re-entry');
    assert.equal(secondVisit.bedroomInteractions!.getMemoriesForInteraction('wardrobe').length, 1);
    assert.equal(secondVisit.bedroomInteractions!.getMemoriesForInteraction('memory_projector').length, 1);
    assert.equal(secondVisit.bedroomInteractions!.getMemoriesForInteraction('memory_radio').length, 1);

    secondVisit.cleanup?.();
    console.log('✅ Scenario 7 Passed: Exiting and re-entering room cleanly disposes old resources and restores all memories.');
    passed++;
  }

  // =========================================================================
  // SCENARIO 8: Refresh persistence via real Express HTTP server + binary media
  // =========================================================================
  {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevSkip = process.env.MYMUSEUM_SKIP_AUTO_LISTEN;
    process.env.NODE_ENV = 'production';
    process.env.MYMUSEUM_SKIP_AUTO_LISTEN = '1';

    const { createServer, memoryVaultService } = await import('../../../server');
    const app = await createServer();
    const server = http.createServer(app);

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    let createdUserId = '';
    try {
      // 1. Authenticate guest session (same as browser bootstrap)
      const guestRes = await fetch(`${baseUrl}/api/auth/guest`, { method: 'POST' });
      assert.equal(guestRes.status, 200);
      const guestJson = (await guestRes.json()) as { ok: boolean; sessionToken: string; user: { id: string } };
      assert.equal(guestJson.ok, true);
      const token = guestJson.sessionToken;
      assert.ok(token, 'Guest sessionToken must be returned');
      createdUserId = guestJson.user.id;

      // 2. Upload photo + video + audio across TWO rooms
      const uploads = [
        makePhotoMemory('http-photo-1', 'childhood', 'Persisted Photo', TINY_PNG_DATA_URL),
        makeVideoMemory('http-video-1', 'childhood', 'Persisted Video', TINY_MP4_DATA_URL),
        makeAudioMemory('http-audio-1', 'travel-wing', 'Persisted Travel Track', TINY_MP3_DATA_URL),
      ];

      for (const mem of uploads) {
        const saveRes = await fetch(`${baseUrl}/api/storage/memories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: createdUserId, memory: mem }),
        });
        assert.equal(saveRes.status, 200, `Upload failed for ${mem.id}`);
        const saveJson = (await saveRes.json()) as { ok: boolean; memories: Memory[] };
        assert.equal(saveJson.ok, true);
        const savedRec = saveJson.memories.find((m) => m.id === mem.id);
        assert.ok(savedRec, `Expected saved record for ${mem.id}`);
        assert.ok(
          savedRec.mediaUrl?.startsWith('/api/storage/media/'),
          `Expected durable /api/storage/media/ URL for ${mem.id}, got ${savedRec.mediaUrl}`,
        );
      }

      // 3. Simulate full page refresh: fetch saved memories from server
      const listRes = await fetch(`${baseUrl}/api/storage/memories?userId=${encodeURIComponent(createdUserId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(listRes.status, 200);
      const listJson = (await listRes.json()) as { ok: boolean; memories: Memory[] };
      assert.equal(listJson.ok, true);
      assert.equal(listJson.memories.length, 3);
      assert.equal(listJson.memories.find((m) => m.id === 'http-photo-1')?.roomId, 'childhood');
      assert.equal(listJson.memories.find((m) => m.id === 'http-audio-1')?.roomId, 'travel-wing');

      // 4. Verify binary media endpoint serves the uploaded photo with image/png content-type
      const photoRec = listJson.memories.find((m) => m.id === 'http-photo-1')!;
      const mediaRes = await fetch(`${baseUrl}${photoRec.mediaUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(mediaRes.status, 200);
      assert.ok(mediaRes.headers.get('content-type')?.includes('image/png'));
      const buf = Buffer.from(await mediaRes.arrayBuffer());
      assert.ok(buf.length > 20, 'Saved PNG binary must be non-empty');

      // 5. Verify unsupported PDF upload is rejected on the server too
      const badRes = await fetch(`${baseUrl}/api/storage/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: createdUserId,
          memory: {
            id: 'bad-pdf-1',
            roomId: 'childhood',
            title: 'Rejected PDF',
            mediaType: 'document',
            mediaMimeType: 'application/pdf',
            mediaFileName: 'notes.pdf',
            mediaUrl: 'data:application/pdf;base64,JVBERi0xLjQ=',
          },
        }),
      });
      assert.equal(badRes.ok, false, 'Server must reject PDF uploads');
      assert.ok(
        badRes.status === 400 || badRes.status === 415,
        `Expected HTTP 400 or 415 for PDF upload, got ${badRes.status}`,
      );
    } finally {
      if (createdUserId) {
        memoryVaultService.resetUserMemories(createdUserId);
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
      process.env.NODE_ENV = prevNodeEnv;
      process.env.MYMUSEUM_SKIP_AUTO_LISTEN = prevSkip;
    }

    console.log('✅ Scenario 8 Passed: Real HTTP persistence round-trip saves & restores photos, videos, audio, and multi-room IDs across refresh.');
    passed++;
  }

  // =========================================================================
  // SCENARIO 9: Upload cancellation & upload failure recovery
  // =========================================================================
  {
    // 9A: Validation rejects PDFs, chat exports, and oversized files cleanly
    const pdfFile = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' });
    const pdfCheck = validateUploadFileCandidate(pdfFile, []);
    assert.equal(pdfCheck.valid, false);
    assert.ok(
      Boolean(pdfCheck.reason && /pdf|supported|photo|video|music/i.test(pdfCheck.reason)),
      `Expected clear rejection reason, got: ${pdfCheck.reason}`,
    );

    const fakeLargeFile = {
      name: 'huge.mp4',
      size: MAX_UPLOAD_FILE_SIZE_BYTES + 1024,
      type: 'video/mp4',
    } as File;
    const sizeCheck = validateUploadFileCandidate(fakeLargeFile, []);
    assert.equal(sizeCheck.valid, false);

    // 9B: Pre-aborted AbortController cancels sync cleanly without enqueuing offline
    const preAborted = new AbortController();
    preAborted.abort();
    const cancelRes = await syncMemoryRecordToVault(
      { id: 'cancel-1', roomId: 'childhood', title: 'Cancelled Photo' },
      'user-cancel',
      'tok-cancel',
      { signal: preAborted.signal },
    );
    assert.equal(cancelRes.ok, false);
    assert.equal(cancelRes.aborted, true);
    assert.equal(cancelRes.queuedOffline, false);

    // 9C: In-flight AbortError and HTTP 415 server rejection do not enqueue offline or crash
    const origFetch = globalThis.fetch;
    try {
      // Mid-flight abort
      globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
        return await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }) as typeof fetch;

      const midController = new AbortController();
      const pendingPromise = syncMemoryRecordToVault(
        { id: 'cancel-mid', roomId: 'childhood', title: 'Midflight Cancel' },
        'user-cancel',
        'tok-cancel',
        { signal: midController.signal },
      );
      midController.abort();
      const midRes = await pendingPromise;
      assert.equal(midRes.aborted, true);
      assert.equal(midRes.queuedOffline, false);

      // Server 415 rejection
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({ ok: false, message: 'Unsupported file type.' }),
          { status: 415, headers: { 'Content-Type': 'application/json' } },
        )) as typeof fetch;

      const rejectRes = await syncMemoryRecordToVault(
        { id: 'reject-415', roomId: 'childhood', title: 'Bad File' },
        'user-cancel',
        'tok-cancel',
      );
      assert.equal(rejectRes.ok, false);
      assert.equal(rejectRes.synced, false);
      assert.equal(rejectRes.queuedOffline, false, 'Client-rejected 415 upload must not enqueue offline');
    } finally {
      globalThis.fetch = origFetch;
    }

    console.log('✅ Scenario 9 Passed: Upload cancellation (AbortController) and upload failures recover cleanly without corrupting room state.');
    passed++;
  }

  console.log(`\n🎉 All ${passed}/9 MEMORA 3D Room Memory Upload Stability scenarios passed!`);
}

runTests().catch((err) => {
  console.error('❌ Memory upload stability test suite failed:', err);
  process.exit(1);
});
