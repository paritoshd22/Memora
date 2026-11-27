import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type AssetTracker = <T extends { dispose: () => void }>(asset: T) => T;

export interface ChildhoodBedroomMaterialLibrary {
  matLinenWall: THREE.MeshStandardMaterial;
  matCreamTrim: THREE.MeshStandardMaterial;
  matHoneyOakFloor: THREE.MeshStandardMaterial;
  matCreamWoolRug: THREE.MeshStandardMaterial;
  matPlayWoolRug: THREE.MeshStandardMaterial;
  matBedWalnut: THREE.MeshStandardMaterial;
  matDeskWood: THREE.MeshStandardMaterial;
  matCottonSheet: THREE.MeshStandardMaterial;
  matCottonPillow: THREE.MeshStandardMaterial;
  matCorkboard: THREE.MeshStandardMaterial;
  matPolishedBrass: THREE.MeshStandardMaterial;
  matAntiqueSilver: THREE.MeshStandardMaterial;
  matAgedLeather: THREE.MeshStandardMaterial;
  matAgedPaper: THREE.MeshStandardMaterial;
  matCanvasBag: THREE.MeshStandardMaterial;
  matLeatherStrap: THREE.MeshStandardMaterial;
  matCurtainLinen: THREE.MeshStandardMaterial;
  matWillowBat: THREE.MeshStandardMaterial;
  matBatGrip: THREE.MeshStandardMaterial;
  matCricketBall: THREE.MeshStandardMaterial;
  matAshStump: THREE.MeshStandardMaterial;
  matVintageGlobe: THREE.MeshStandardMaterial;
  matRetroBeigePlastic: THREE.MeshStandardMaterial;
  matRetroBeigeTrim: THREE.MeshStandardMaterial;
  matDarkAnodizedMetal: THREE.MeshStandardMaterial;
  matHeadphoneCushion: THREE.MeshStandardMaterial;
  matCableRubber: THREE.MeshStandardMaterial;
  posterStarChartTex: THREE.CanvasTexture;
  posterAdventureTex: THREE.CanvasTexture;
  wallStickerSheetTex: THREE.CanvasTexture;
  retroKeycapTex: THREE.CanvasTexture;
  contactShadowTex: THREE.CanvasTexture;
  sunbeamGradTex: THREE.CanvasTexture;
}

function seededRand(seedStart: number): () => number {
  let s = seedStart % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeCanvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  track: AssetTracker,
): THREE.CanvasTexture {
  const tex = track(new THREE.CanvasTexture(canvas));
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.max(1, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates a warm interior PMREM environment map derived from RoomEnvironment
 * with warm cream/golden-hour panel tints so wood, glass, and brass look grounded
 * inside the Childhood Bedroom rather than stark cool chrome.
 */
export function createWarmInteriorEnvironment(
  renderer: THREE.WebGLRenderer,
): THREE.WebGLRenderTarget | null {
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const warmTint = new THREE.Color('#FFE5BE');
    const softCreamBounce = new THREE.Color('#F6EFE2');
    roomEnv.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
        const pos = (obj as THREE.Mesh).position;
        const tint = pos.y > 0 ? warmTint : softCreamBounce;
        if (mat && 'color' in mat && mat.color) {
          mat.color.multiply(tint);
        }
        if (mat && 'emissive' in mat && mat.emissive) {
          mat.emissive.multiply(warmTint);
        }
      }
    });
    // Add a warm golden-hour window bounce panel so brass, glass & varnished oak pick up a natural window highlight
    const windowPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 3.6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE4B8').multiplyScalar(2.4), side: THREE.DoubleSide }),
    );
    windowPanel.position.set(0, 2.6, -4.8);
    roomEnv.add(windowPanel);

    const oakFloorBounce = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#B48452').multiplyScalar(0.55), side: THREE.DoubleSide }),
    );
    oakFloorBounce.rotation.x = -Math.PI / 2;
    oakFloorBounce.position.set(0, -2.2, 0);
    roomEnv.add(oakFloorBounce);

    const rt = pmrem.fromScene(roomEnv, 0.042);
    windowPanel.geometry.dispose();
    (windowPanel.material as THREE.Material).dispose();
    oakFloorBounce.geometry.dispose();
    (oakFloorBounce.material as THREE.Material).dispose();
    roomEnv.dispose();
    pmrem.dispose();
    return rt;
  } catch {
    return null;
  }
}

/**
 * Generates warm linen-plaster wall albedo & tactile plaster/linen bump texture (#EAE2D3).
 */
function createLinenPlasterMaps(maxAnisotropy: number, track: AssetTracker) {
  const size = 512;
  const [cCanvas, cCtx] = makeCanvas(size);
  const [bCanvas, bCtx] = makeCanvas(size);
  const rand = seededRand(1013);

  if (cCtx) {
    cCtx.fillStyle = '#EAE2D3';
    cCtx.fillRect(0, 0, size, size);

    // Soft organic limewash plaster clouds
    for (let i = 0; i < 65; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const r = 28 + rand() * 72;
      const grad = cCtx.createRadialGradient(cx, cy, 4, cx, cy, r);
      grad.addColorStop(0, i % 2 === 0 ? 'rgba(255,250,242,0.16)' : 'rgba(208,194,172,0.14)');
      grad.addColorStop(1, 'rgba(234,226,211,0)');
      cCtx.fillStyle = grad;
      cCtx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    // Fine woven linen cross-grain
    cCtx.strokeStyle = 'rgba(182, 168, 146, 0.09)';
    cCtx.lineWidth = 1;
    for (let y = 0; y < size; y += 4) {
      cCtx.beginPath();
      cCtx.moveTo(0, y);
      cCtx.lineTo(size, y);
      cCtx.stroke();
    }
    cCtx.strokeStyle = 'rgba(255, 252, 244, 0.08)';
    for (let x = 0; x < size; x += 6) {
      cCtx.beginPath();
      cCtx.moveTo(x, 0);
      cCtx.lineTo(x, size);
      cCtx.stroke();
    }
  }

  if (bCtx) {
    bCtx.fillStyle = 'rgb(128,128,128)';
    bCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 3800; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const v = 104 + Math.floor(rand() * 48);
      bCtx.fillStyle = `rgb(${v},${v},${v})`;
      bCtx.fillRect(x, y, 2 + rand() * 3, 1 + rand() * 2);
    }
    bCtx.strokeStyle = 'rgba(155,155,155,0.22)';
    for (let y = 0; y < size; y += 4) {
      bCtx.beginPath();
      bCtx.moveTo(0, y);
      bCtx.lineTo(size, y);
      bCtx.stroke();
    }
  }

  const [rCanvas, rCtx] = makeCanvas(size);
  if (rCtx) {
    rCtx.fillStyle = 'rgb(218,218,218)'; // ~0.86 roughness
    rCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 42; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const rad = 24 + rand() * 58;
      const v = 204 + Math.floor(rand() * 28);
      const grad = rCtx.createRadialGradient(cx, cy, 4, cx, cy, rad);
      grad.addColorStop(0, `rgba(${v},${v},${v},0.35)`);
      grad.addColorStop(1, 'rgba(218,218,218,0)');
      rCtx.fillStyle = grad;
      rCtx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
  }

  return {
    map: finalizeTexture(cCanvas, true, 2.5, 1.8, maxAnisotropy, track),
    bumpMap: finalizeTexture(bCanvas, false, 2.5, 1.8, maxAnisotropy, track),
    roughnessMap: finalizeTexture(rCanvas, false, 2.5, 1.8, maxAnisotropy, track),
  };
}

/**
 * Generates warm honey-oak floorboards (#B48452, roughness ~0.56) with plank bevels,
 * warm tonal variation, fine grain fibers, and subtle wood knots.
 */
function createHoneyOakFloorMaps(maxAnisotropy: number, track: AssetTracker) {
  const size = 512;
  const [cCanvas, cCtx] = makeCanvas(size);
  const [bCanvas, bCtx] = makeCanvas(size);
  const [rCanvas, rCtx] = makeCanvas(size);
  const rand = seededRand(2049);

  const plankRows = 8;
  const plankCols = 3;
  const rowH = size / plankRows;
  const colW = size / plankCols;
  const oakTones = ['#BA8A57', '#B07F4D', '#BE8F5C', '#A97848', '#B68653', '#C1925E'];

  if (cCtx && bCtx && rCtx) {
    cCtx.fillStyle = '#B48452';
    cCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = 'rgb(136,136,136)';
    bCtx.fillRect(0, 0, size, size);
    rCtx.fillStyle = 'rgb(142,142,142)'; // ~0.56 roughness
    rCtx.fillRect(0, 0, size, size);

    for (let r = 0; r < plankRows; r++) {
      const stagger = ((r * 53) % 3) * (colW * 0.36);
      const y = r * rowH;
      for (let c = -1; c <= plankCols; c++) {
        const x = c * colW + stagger;
        const tone = oakTones[Math.abs(r * 5 + c * 3) % oakTones.length];
        const grad = cCtx.createLinearGradient(x, y, x + colW, y + rowH);
        grad.addColorStop(0, tone);
        grad.addColorStop(0.5, '#B78855');
        grad.addColorStop(1, oakTones[Math.abs(r * 2 + c + 1) % oakTones.length]);
        cCtx.fillStyle = grad;
        cCtx.fillRect(x, y, colW, rowH);

        // Per-plank roughness variation around 0.56
        const rv = 132 + Math.floor(rand() * 24);
        rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
        rCtx.fillRect(x, y, colW, rowH);

        // Long organic oak grain strokes
        for (let g = 0; g < 14; g++) {
          const gy = y + ((g + 0.4) / 14) * rowH;
          const dark = (g + r) % 2 === 0;
          cCtx.strokeStyle = dark ? 'rgba(92, 58, 28, 0.17)' : 'rgba(232, 194, 146, 0.16)';
          cCtx.lineWidth = 0.8 + (g % 3) * 0.45;
          cCtx.beginPath();
          cCtx.moveTo(x + 2, gy);
          cCtx.bezierCurveTo(
            x + colW * 0.35,
            gy + Math.sin(r * 1.3 + g) * 2.4,
            x + colW * 0.68,
            gy - Math.cos(c * 1.1 + g) * 2.4,
            x + colW - 2,
            gy,
          );
          cCtx.stroke();

          bCtx.strokeStyle = dark ? 'rgba(116,116,116,0.35)' : 'rgba(154,154,154,0.28)';
          bCtx.lineWidth = 1;
          bCtx.beginPath();
          bCtx.moveTo(x + 2, gy);
          bCtx.lineTo(x + colW - 2, gy);
          bCtx.stroke();
        }

        // Occasional subtle wood knot
        if (rand() > 0.72) {
          const kx = x + colW * (0.2 + rand() * 0.6);
          const ky = y + rowH * (0.25 + rand() * 0.5);
          cCtx.fillStyle = 'rgba(102, 65, 34, 0.24)';
          cCtx.beginPath();
          cCtx.ellipse(kx, ky, 5 + rand() * 5, 2.5 + rand() * 2, 0.08, 0, Math.PI * 2);
          cCtx.fill();
        }

        // Plank bevel seam
        cCtx.strokeStyle = 'rgba(72, 44, 22, 0.34)';
        cCtx.lineWidth = 1.6;
        cCtx.strokeRect(x + 0.5, y + 0.5, colW - 1, rowH - 1);

        bCtx.strokeStyle = 'rgb(64,64,64)';
        bCtx.lineWidth = 2.2;
        bCtx.strokeRect(x + 0.5, y + 0.5, colW - 1, rowH - 1);

        rCtx.strokeStyle = 'rgb(205,205,205)';
        rCtx.lineWidth = 2;
        rCtx.strokeRect(x + 0.5, y + 0.5, colW - 1, rowH - 1);
      }
    }
  }

  return {
    map: finalizeTexture(cCanvas, true, 3.2, 3.2, maxAnisotropy, track),
    bumpMap: finalizeTexture(bCanvas, false, 3.2, 3.2, maxAnisotropy, track),
    roughnessMap: finalizeTexture(rCanvas, false, 3.2, 3.2, maxAnisotropy, track),
  };
}

/**
 * Generates textured cream wool rug (#E7DEC9, roughness ~0.95) with woven tuft loops & subtle border.
 */
function createWoolRugMaps(baseHex: string, borderHex: string, maxAnisotropy: number, track: AssetTracker) {
  const size = 512;
  const [cCanvas, cCtx] = makeCanvas(size);
  const [bCanvas, bCtx] = makeCanvas(size);
  const rand = seededRand(3079);

  if (cCtx && bCtx) {
    cCtx.fillStyle = baseHex;
    cCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = 'rgb(122,122,122)';
    bCtx.fillRect(0, 0, size, size);

    // Woven wool tufts
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        const jitter = (rand() - 0.5) * 18;
        const bright = jitter > 0;
        cCtx.fillStyle = bright
          ? `rgba(255, 250, 240, ${0.08 + rand() * 0.14})`
          : `rgba(148, 130, 104, ${0.08 + rand() * 0.14})`;
        cCtx.fillRect(x, y, 3, 3);

        const bv = Math.max(40, Math.min(220, Math.round(128 + jitter * 3.2)));
        bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
        bCtx.fillRect(x, y, 3, 3);
      }
    }

    // Subtle concentric woven kilim/wool border rings (for circular or rectangular rugs)
    cCtx.strokeStyle = borderHex;
    cCtx.lineWidth = 10;
    cCtx.strokeRect(24, 24, size - 48, size - 48);
    cCtx.lineWidth = 3;
    cCtx.strokeRect(42, 42, size - 84, size - 84);
  }

  return {
    map: finalizeTexture(cCanvas, true, 1, 1, maxAnisotropy, track),
    bumpMap: finalizeTexture(bCanvas, false, 2, 2, maxAnisotropy, track),
  };
}

/**
 * Generates solid walnut/oak furniture wood maps (#6B4A32 bed frame or #735137 study desk).
 */
function createFurnitureWoodMaps(
  baseHex: string,
  darkHex: string,
  highlightHex: string,
  seed: number,
  maxAnisotropy: number,
  track: AssetTracker,
) {
  const size = 512;
  const [cCanvas, cCtx] = makeCanvas(size);
  const [bCanvas, bCtx] = makeCanvas(size);
  const rand = seededRand(seed);

  if (cCtx && bCtx) {
    const grad = cCtx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, baseHex);
    grad.addColorStop(0.5, highlightHex);
    grad.addColorStop(1, darkHex);
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, size, size);

    bCtx.fillStyle = 'rgb(128,128,128)';
    bCtx.fillRect(0, 0, size, size);

    for (let i = 0; i < 96; i++) {
      const gx = (i / 96) * size + (rand() - 0.5) * 3;
      const isDark = i % 2 === 0;
      cCtx.strokeStyle = isDark ? 'rgba(42, 24, 12, 0.24)' : 'rgba(204, 162, 118, 0.16)';
      cCtx.lineWidth = 1 + (i % 4) * 0.55;
      cCtx.beginPath();
      cCtx.moveTo(gx, 0);
      const w1 = (rand() - 0.5) * 14;
      const w2 = (rand() - 0.5) * 14;
      cCtx.bezierCurveTo(gx + w1, size * 0.33, gx - w2, size * 0.67, gx, size);
      cCtx.stroke();

      bCtx.strokeStyle = isDark ? 'rgba(98,98,98,0.4)' : 'rgba(156,156,156,0.35)';
      bCtx.lineWidth = 1.2;
      bCtx.beginPath();
      bCtx.moveTo(gx, 0);
      bCtx.bezierCurveTo(gx + w1, size * 0.33, gx - w2, size * 0.67, gx, size);
      bCtx.stroke();
    }
  }

  const [rCanvas, rCtx] = makeCanvas(size);
  if (rCtx) {
    rCtx.fillStyle = 'rgb(154,154,154)'; // ~0.60 base roughness modulated by wood grain
    rCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 64; i++) {
      const gx = (i / 64) * size;
      const rv = i % 2 === 0 ? 142 : 168;
      rCtx.strokeStyle = `rgb(${rv},${rv},${rv})`;
      rCtx.lineWidth = 2 + (i % 3);
      rCtx.beginPath();
      rCtx.moveTo(gx, 0);
      rCtx.lineTo(gx + Math.sin(i) * 5, size);
      rCtx.stroke();
    }
  }

  return {
    map: finalizeTexture(cCanvas, true, 1.5, 1.5, maxAnisotropy, track),
    bumpMap: finalizeTexture(bCanvas, false, 1.5, 1.5, maxAnisotropy, track),
    roughnessMap: finalizeTexture(rCanvas, false, 1.5, 1.5, maxAnisotropy, track),
  };
}

/**
 * Generates woven cotton fabric bump/albedo maps for sheets, pillows, curtains, and canvas.
 */
function createWovenFabricMaps(
  baseHex: string,
  weaveStep: number,
  seed: number,
  maxAnisotropy: number,
  track: AssetTracker,
) {
  const size = 256;
  const [cCanvas, cCtx] = makeCanvas(size);
  const [bCanvas, bCtx] = makeCanvas(size);
  const rand = seededRand(seed);

  if (cCtx && bCtx) {
    cCtx.fillStyle = baseHex;
    cCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = 'rgb(128,128,128)';
    bCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += weaveStep) {
      cCtx.fillStyle = 'rgba(255,255,255,0.06)';
      cCtx.fillRect(0, y, size, 1);
      bCtx.fillStyle = 'rgb(148,148,148)';
      bCtx.fillRect(0, y, size, 1);
    }
    for (let x = 0; x < size; x += weaveStep) {
      cCtx.fillStyle = 'rgba(60,45,30,0.05)';
      cCtx.fillRect(x, 0, 1, size);
      bCtx.fillStyle = 'rgb(108,108,108)';
      bCtx.fillRect(x, 0, 1, size);
    }
    for (let i = 0; i < 600; i++) {
      const v = 112 + Math.floor(rand() * 32);
      bCtx.fillStyle = `rgb(${v},${v},${v})`;
      bCtx.fillRect(rand() * size, rand() * size, 2, 2);
    }
  }

  return {
    map: finalizeTexture(cCanvas, true, 3, 3, maxAnisotropy, track),
    bumpMap: finalizeTexture(bCanvas, false, 3, 3, maxAnisotropy, track),
  };
}

/**
 * Generates granular natural corkboard albedo & bump maps (#B8895A, roughness ~0.9).
 */
function createCorkboardMaps(maxAnisotropy: number, track: AssetTracker) {
  const size = 512;
  const [cCanvas, cCtx] = makeCanvas(size);
  const [bCanvas, bCtx] = makeCanvas(size);
  const rand = seededRand(5051);

  if (cCtx && bCtx) {
    cCtx.fillStyle = '#B8895A';
    cCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = 'rgb(124,124,124)';
    bCtx.fillRect(0, 0, size, size);

    const chips = ['#C69766', '#A77749', '#BD8D5E', '#97693E', '#CFA272', '#8B5E35'];
    for (let i = 0; i < 3200; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const w = 2 + rand() * 8;
      const h = 2 + rand() * 6;
      const ang = rand() * Math.PI;
      cCtx.save();
      cCtx.translate(x, y);
      cCtx.rotate(ang);
      cCtx.fillStyle = chips[Math.floor(rand() * chips.length)];
      cCtx.fillRect(-w * 0.5, -h * 0.5, w, h);
      cCtx.restore();

      const bv = 80 + Math.floor(rand() * 105);
      bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bCtx.fillRect(x, y, Math.max(2, w * 0.7), Math.max(2, h * 0.7));
    }
  }

  return {
    map: finalizeTexture(cCanvas, true, 1.4, 1.0, maxAnisotropy, track),
    bumpMap: finalizeTexture(bCanvas, false, 1.4, 1.0, maxAnisotropy, track),
  };
}

/**
 * Generates English willow cricket bat grain + subtle classic red/gold sticker band.
 */
function createWillowBatTexture(maxAnisotropy: number, track: AssetTracker): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 512);
  const rand = seededRand(6113);
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#D7B47C');
    grad.addColorStop(0.5, '#E4C693');
    grad.addColorStop(1, '#CFA96D');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    // Classic straight vertical English willow grains (8–11 grains)
    for (let i = 0; i < 12; i++) {
      const gx = 14 + i * 20 + (rand() - 0.5) * 4;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(132, 92, 46, 0.28)' : 'rgba(165, 122, 68, 0.22)';
      ctx.lineWidth = 1.6 + (i % 3) * 0.4;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(gx + 3, 170, gx - 3, 340, gx, 512);
      ctx.stroke();
    }

    // Subtle vintage bat chevron sticker near upper-mid blade
    ctx.fillStyle = '#9C2A24';
    ctx.beginPath();
    ctx.moveTo(24, 150);
    ctx.lineTo(128, 195);
    ctx.lineTo(232, 150);
    ctx.lineTo(232, 186);
    ctx.lineTo(128, 232);
    ctx.lineTo(24, 186);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D9B166';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  return finalizeTexture(canvas, true, 1, 1, maxAnisotropy, track);
}

/**
 * Generates stitched crimson leather cricket ball texture with raised white equatorial seam.
 */
function createCricketBallMaps(maxAnisotropy: number, track: AssetTracker) {
  const [canvas, ctx] = makeCanvas(256, 128);
  const [bCanvas, bCtx] = makeCanvas(256, 128);
  const rand = seededRand(7129);
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#8A1A15');
    grad.addColorStop(0.5, '#A8231C');
    grad.addColorStop(1, '#781410');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    // Subtle leather sheen pores & play scuffs
    for (let i = 0; i < 360; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,210,195,0.08)' : 'rgba(40,6,4,0.12)';
      ctx.fillRect(rand() * 256, rand() * 128, 2, 2);
    }

    // Equatorial seam groove + twin white stitched thread rows
    ctx.fillStyle = 'rgba(55, 10, 8, 0.58)';
    ctx.fillRect(0, 59, 256, 10);
    ctx.strokeStyle = '#F5ECD8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(0, 61);
    ctx.lineTo(256, 61);
    ctx.moveTo(0, 67);
    ctx.lineTo(256, 67);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (bCtx) {
    bCtx.fillStyle = 'rgb(122,122,122)';
    bCtx.fillRect(0, 0, 256, 128);
    bCtx.fillStyle = 'rgb(76,76,76)';
    bCtx.fillRect(0, 59, 256, 10);
    bCtx.strokeStyle = 'rgb(235,235,235)';
    bCtx.lineWidth = 2.4;
    bCtx.setLineDash([4, 3]);
    bCtx.beginPath();
    bCtx.moveTo(0, 61);
    bCtx.lineTo(256, 61);
    bCtx.moveTo(0, 67);
    bCtx.lineTo(256, 67);
    bCtx.stroke();
    bCtx.setLineDash([]);
  }
  return {
    map: finalizeTexture(canvas, true, 1, 1, maxAnisotropy, track),
    bumpMap: finalizeTexture(bCanvas, false, 1, 1, maxAnisotropy, track),
  };
}

/**
 * Generates vintage parchment & ocean-teal world globe texture.
 */
function createVintageGlobeTexture(maxAnisotropy: number, track: AssetTracker): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 256);
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#7AA2AD');
    grad.addColorStop(0.5, '#6893A0');
    grad.addColorStop(1, '#7AA2AD');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Latitude / longitude graticule lines
    ctx.strokeStyle = 'rgba(244, 232, 206, 0.25)';
    ctx.lineWidth = 1;
    for (let y = 32; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    // Stylized vintage parchment landmasses
    ctx.fillStyle = '#D9C298';
    ctx.strokeStyle = '#8A6C44';
    ctx.lineWidth = 1.5;
    const continents: [number, number, number, number, number][] = [
      [115, 86, 48, 34, -0.25],
      [148, 162, 28, 44, 0.15],
      [272, 78, 52, 28, 0.1],
      [278, 146, 36, 46, -0.05],
      [365, 92, 62, 38, 0.08],
      [412, 178, 30, 22, -0.18],
    ];
    continents.forEach(([cx, cy, rx, ry, rot]) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Equator gold hairline
    ctx.strokeStyle = 'rgba(218, 175, 98, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(512, 128);
    ctx.stroke();
  }
  return finalizeTexture(canvas, true, 1, 1, maxAnisotropy, track);
}

/**
 * Generates procedural framed childhood wall poster illustrations.
 */
function createChildhoodPosterTexture(
  variant: 'star_chart' | 'paper_plane',
  maxAnisotropy: number,
  track: AssetTracker,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 320);
  if (ctx) {
    if (variant === 'star_chart') {
      ctx.fillStyle = '#25394D';
      ctx.fillRect(0, 0, 256, 320);
      ctx.strokeStyle = '#D6B16B';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, 232, 296);

      // Orbit rings & crescent moon
      ctx.strokeStyle = 'rgba(232, 205, 148, 0.35)';
      ctx.lineWidth = 1.5;
      [56, 86, 112].forEach((r) => {
        ctx.beginPath();
        ctx.arc(128, 148, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.fillStyle = '#F5DCA0';
      ctx.beginPath();
      ctx.arc(128, 148, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#25394D';
      ctx.beginPath();
      ctx.arc(138, 142, 23, 0, Math.PI * 2);
      ctx.fill();

      // Constellation points & lines
      const stars: [number, number][] = [
        [52, 76], [92, 62], [186, 74], [202, 122], [68, 224], [126, 248], [188, 228],
      ];
      ctx.strokeStyle = 'rgba(245, 220, 160, 0.55)';
      ctx.beginPath();
      stars.forEach(([sx, sy], i) => (i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)));
      ctx.stroke();
      ctx.fillStyle = '#FFF5D6';
      stars.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#F0DFB8';
      ctx.font = '600 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('NIGHT SKY ATLAS', 128, 286);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, 320);
      grad.addColorStop(0, '#F5E7CE');
      grad.addColorStop(1, '#E6CEAA');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 320);
      ctx.strokeStyle = '#9C7549';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, 232, 296);

      // Warm golden sun + hills + paper airplane trail
      ctx.fillStyle = '#DF9E52';
      ctx.beginPath();
      ctx.arc(178, 86, 32, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#7E9674';
      ctx.beginPath();
      ctx.moveTo(16, 260);
      ctx.quadraticCurveTo(96, 200, 180, 246);
      ctx.quadraticCurveTo(218, 262, 240, 238);
      ctx.lineTo(240, 304);
      ctx.lineTo(16, 304);
      ctx.closePath();
      ctx.fill();

      // Dashed flight loop
      ctx.strokeStyle = '#6A4E34';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(42, 212);
      ctx.bezierCurveTo(86, 175, 118, 122, 168, 128);
      ctx.stroke();
      ctx.setLineDash([]);

      // Paper airplane silhouette
      ctx.fillStyle = '#FFFBF2';
      ctx.strokeStyle = '#5D432B';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(192, 114);
      ctx.lineTo(148, 126);
      ctx.lineTo(166, 144);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#4E3824';
      ctx.font = '600 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('SUMMER SKIES', 128, 286);
    }
  }
  const tex = track(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.max(1, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a transparent decal canvas of charming matte childhood wall stickers
 * (crescent moon, stars, clouds, tiny paper plane).
 */
function createWallStickerDecalTexture(
  maxAnisotropy: number,
  track: AssetTracker,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 256);
  if (ctx) {
    ctx.clearRect(0, 0, 512, 256);

    const drawStar = (cx: number, cy: number, r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r : r * 0.44;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    // Soft crescent moon
    ctx.fillStyle = '#DFB664';
    ctx.beginPath();
    ctx.arc(98, 92, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(114, 84, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Scattered matte golden & dusty-terracotta stars
    drawStar(174, 62, 16, '#E2BE74');
    drawStar(228, 108, 11, '#D39B6A');
    drawStar(318, 66, 18, '#DFB664');
    drawStar(412, 92, 13, '#8FA68B');
    drawStar(454, 152, 10, '#E2BE74');
    drawStar(142, 168, 12, '#8FA68B');

    // Soft cream cloud sticker
    ctx.fillStyle = '#F7F1E3';
    [
      [272, 174, 22],
      [296, 166, 26],
      [322, 174, 20],
    ].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillRect(272, 174, 50, 20);

    // Matte ringed Saturn planet sticker
    ctx.save();
    ctx.translate(238, 86);
    ctx.rotate(-0.28);
    ctx.fillStyle = '#C88D55';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E8CA82';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Vintage paper rocket sticker
    ctx.save();
    ctx.translate(392, 168);
    ctx.rotate(0.42);
    ctx.fillStyle = '#EAE0CC';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.quadraticCurveTo(14, -8, 12, 18);
    ctx.lineTo(-12, 18);
    ctx.quadraticCurveTo(-14, -8, 0, -28);
    ctx.fill();
    ctx.fillStyle = '#B84B39';
    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.lineTo(-22, 22);
    ctx.lineTo(-10, 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 8);
    ctx.lineTo(22, 22);
    ctx.lineTo(10, 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4E7287';
    ctx.beginPath();
    ctx.arc(0, -4, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Little diamond kite sticker on left
    ctx.save();
    ctx.translate(82, 182);
    ctx.rotate(-0.18);
    ctx.fillStyle = '#C96A4F';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 24);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#F5EAD4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 24);
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();
    ctx.restore();
  }
  const tex = track(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.max(1, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a crisp retro mechanical beige keyboard top-down keycap grid texture.
 */
function createRetroKeycapTexture(
  maxAnisotropy: number,
  track: AssetTracker,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 192);
  if (ctx) {
    ctx.fillStyle = '#B8AC96';
    ctx.fillRect(0, 0, 512, 192);

    const drawKey = (x: number, y: number, w: number, h: number, dark = false) => {
      ctx.fillStyle = dark ? '#C7BFA9' : '#E7DFCE';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(72, 62, 48, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255, 252, 244, 0.45)';
      ctx.fillRect(x + 2, y + 2, w - 4, 3);
    };

    // Function key row
    for (let i = 0; i < 12; i++) {
      drawKey(14 + i * 26 + (i >= 4 ? 8 : 0) + (i >= 8 ? 8 : 0), 12, 21, 18, i % 4 === 0);
    }
    // 4 Alphanumeric rows
    for (let r = 0; r < 4; r++) {
      const cols = 13;
      for (let c = 0; c < cols; c++) {
        const isEdge = c === 0 || c === cols - 1;
        drawKey(14 + c * 25, 42 + r * 26, 21, 21, isEdge);
      }
    }
    // Bottom modifier row + wide spacebar
    drawKey(14, 148, 34, 22, true);
    drawKey(54, 148, 34, 22, true);
    drawKey(94, 148, 152, 22, false);
    drawKey(252, 148, 36, 22, true);
    drawKey(294, 148, 42, 22, true);

    // Arrow cluster
    drawKey(366, 122, 22, 21, true);
    drawKey(342, 148, 22, 21, true);
    drawKey(366, 148, 22, 21, true);
    drawKey(390, 148, 22, 21, true);

    // Numpad
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        drawKey(424 + c * 25, 42 + r * 26, 21, 21, r === 0);
      }
    }
    drawKey(424, 148, 46, 21, false);
    drawKey(474, 148, 21, 21, false);
  }
  const tex = track(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.max(1, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a soft warm ambient-occlusion contact shadow decal texture for grounded furniture.
 */
function createContactShadowTexture(track: AssetTracker): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 124);
    grad.addColorStop(0, 'rgba(34, 22, 12, 0.52)');
    grad.addColorStop(0.55, 'rgba(34, 22, 12, 0.24)');
    grad.addColorStop(1, 'rgba(34, 22, 12, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = track(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a soft golden-hour sunlight window shaft gradient texture.
 */
function createSunbeamGradientTexture(track: AssetTracker): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 256);
  if (ctx) {
    ctx.clearRect(0, 0, 128, 256);
    const vGrad = ctx.createLinearGradient(0, 0, 0, 256);
    vGrad.addColorStop(0, 'rgba(255, 232, 188, 0.28)');
    vGrad.addColorStop(0.42, 'rgba(255, 229, 190, 0.14)');
    vGrad.addColorStop(1, 'rgba(255, 229, 190, 0)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, 128, 256);

    // Soft feathered horizontal edges so the beam never has hard polygon edges
    ctx.globalCompositeOperation = 'destination-in';
    const hGrad = ctx.createLinearGradient(0, 0, 128, 0);
    hGrad.addColorStop(0, 'rgba(255,255,255,0)');
    hGrad.addColorStop(0.22, 'rgba(255,255,255,1)');
    hGrad.addColorStop(0.78, 'rgba(255,255,255,1)');
    hGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, 128, 256);
    ctx.globalCompositeOperation = 'source-over';
  }
  const tex = track(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds the complete tracked Childhood Bedroom PBR material library.
 */
export function createChildhoodBedroomMaterialLibrary(
  maxAnisotropy: number,
  track: AssetTracker,
): ChildhoodBedroomMaterialLibrary {
  const plaster = createLinenPlasterMaps(maxAnisotropy, track);
  const honeyOak = createHoneyOakFloorMaps(maxAnisotropy, track);
  const creamRug = createWoolRugMaps('#E7DEC9', 'rgba(176, 148, 112, 0.42)', maxAnisotropy, track);
  const playRug = createWoolRugMaps('#E2D1B4', 'rgba(148, 110, 74, 0.36)', maxAnisotropy, track);
  const bedWood = createFurnitureWoodMaps('#6B4A32', '#563924', '#7C573C', 4111, maxAnisotropy, track);
  const deskWood = createFurnitureWoodMaps('#735137', '#5E402A', '#856043', 4229, maxAnisotropy, track);
  const cottonSheet = createWovenFabricMaps('#F7F1E4', 4, 4337, maxAnisotropy, track);
  const cottonPillow = createWovenFabricMaps('#FCF8F0', 5, 4441, maxAnisotropy, track);
  const curtainLinen = createWovenFabricMaps('#EBE0CE', 6, 4549, maxAnisotropy, track);
  const canvasBag = createWovenFabricMaps('#4E6759', 5, 4657, maxAnisotropy, track);
  const cork = createCorkboardMaps(maxAnisotropy, track);
  const leather = createWovenFabricMaps('#5B3622', 8, 4759, maxAnisotropy, track);
  const agedPaper = createWovenFabricMaps('#EFE3CB', 7, 4861, maxAnisotropy, track);
  const willowTex = createWillowBatTexture(maxAnisotropy, track);
  const ballMaps = createCricketBallMaps(maxAnisotropy, track);
  const globeTex = createVintageGlobeTexture(maxAnisotropy, track);

  const matLinenWall = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: plaster.map,
      bumpMap: plaster.bumpMap,
      bumpScale: 0.016,
      roughnessMap: plaster.roughnessMap,
      roughness: 0.86,
      metalness: 0.01,
      envMapIntensity: 0.4,
    }),
  );

  const matCreamTrim = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#F4EFE6'),
      roughness: 0.54,
      metalness: 0.02,
      envMapIntensity: 0.45,
    }),
  );

  const matHoneyOakFloor = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: honeyOak.map,
      bumpMap: honeyOak.bumpMap,
      bumpScale: 0.02,
      roughnessMap: honeyOak.roughnessMap,
      roughness: 0.56,
      metalness: 0.03,
      envMapIntensity: 0.48,
    }),
  );

  const matCreamWoolRug = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: creamRug.map,
      bumpMap: creamRug.bumpMap,
      bumpScale: 0.026,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.24,
    }),
  );

  const matPlayWoolRug = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: playRug.map,
      bumpMap: playRug.bumpMap,
      bumpScale: 0.024,
      roughness: 0.94,
      metalness: 0.0,
      envMapIntensity: 0.24,
    }),
  );

  const matBedWalnut = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: bedWood.map,
      bumpMap: bedWood.bumpMap,
      bumpScale: 0.015,
      roughnessMap: bedWood.roughnessMap,
      roughness: 0.62,
      metalness: 0.03,
      envMapIntensity: 0.46,
    }),
  );

  const matDeskWood = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: deskWood.map,
      bumpMap: deskWood.bumpMap,
      bumpScale: 0.015,
      roughnessMap: deskWood.roughnessMap,
      roughness: 0.6,
      metalness: 0.03,
      envMapIntensity: 0.46,
    }),
  );

  const matCottonSheet = track(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: cottonSheet.map,
      bumpMap: cottonSheet.bumpMap,
      bumpScale: 0.011,
      roughness: 0.88,
      metalness: 0.0,
      sheen: 0.36,
      sheenRoughness: 0.86,
      sheenColor: new THREE.Color('#FFF6E6'),
      envMapIntensity: 0.28,
    }),
  );

  const matCottonPillow = track(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: cottonPillow.map,
      bumpMap: cottonPillow.bumpMap,
      bumpScale: 0.013,
      roughness: 0.86,
      metalness: 0.0,
      sheen: 0.4,
      sheenRoughness: 0.82,
      sheenColor: new THREE.Color('#FFF9EE'),
      envMapIntensity: 0.3,
    }),
  );

  const matCorkboard = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: cork.map,
      bumpMap: cork.bumpMap,
      bumpScale: 0.026,
      roughness: 0.9,
      metalness: 0.0,
      envMapIntensity: 0.24,
    }),
  );

  const matPolishedBrass = track(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#D8B36A'),
      roughness: 0.2,
      metalness: 0.92,
      clearcoat: 0.24,
      clearcoatRoughness: 0.18,
      envMapIntensity: 0.96,
    }),
  );

  const matAntiqueSilver = track(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#CFD2D4'),
      roughness: 0.22,
      metalness: 0.9,
      clearcoat: 0.2,
      clearcoatRoughness: 0.2,
      envMapIntensity: 0.92,
    }),
  );

  const matAgedLeather = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: leather.map,
      bumpMap: leather.bumpMap,
      bumpScale: 0.016,
      roughness: 0.72,
      metalness: 0.04,
      envMapIntensity: 0.4,
    }),
  );

  const matAgedPaper = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: agedPaper.map,
      bumpMap: agedPaper.bumpMap,
      bumpScale: 0.008,
      roughness: 0.88,
      metalness: 0.0,
      envMapIntensity: 0.25,
    }),
  );

  const matCanvasBag = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: canvasBag.map,
      bumpMap: canvasBag.bumpMap,
      bumpScale: 0.022,
      roughness: 0.88,
      metalness: 0.01,
      envMapIntensity: 0.28,
    }),
  );

  const matLeatherStrap = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6A4128'),
      bumpMap: leather.bumpMap,
      bumpScale: 0.012,
      roughness: 0.66,
      metalness: 0.04,
      envMapIntensity: 0.4,
    }),
  );

  const matCurtainLinen = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: curtainLinen.map,
      bumpMap: curtainLinen.bumpMap,
      bumpScale: 0.011,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
      envMapIntensity: 0.3,
    }),
  );

  const matWillowBat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: willowTex,
      bumpMap: deskWood.bumpMap,
      bumpScale: 0.007,
      roughness: 0.54,
      metalness: 0.02,
      envMapIntensity: 0.44,
    }),
  );

  const matBatGrip = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2E3A36'),
      roughness: 0.82,
      metalness: 0.02,
    }),
  );

  const matCricketBall = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: ballMaps.map,
      bumpMap: ballMaps.bumpMap,
      bumpScale: 0.016,
      roughness: 0.34,
      metalness: 0.06,
      envMapIntensity: 0.62,
    }),
  );

  const matAshStump = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#DFC08A'),
      bumpMap: deskWood.bumpMap,
      bumpScale: 0.01,
      roughness: 0.54,
      metalness: 0.02,
    }),
  );

  const matVintageGlobe = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFFFF'),
      map: globeTex,
      roughness: 0.36,
      metalness: 0.06,
      envMapIntensity: 0.55,
    }),
  );

  const matRetroBeigePlastic = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#DDD3BF'),
      roughness: 0.54,
      metalness: 0.04,
      envMapIntensity: 0.42,
    }),
  );

  const matRetroBeigeTrim = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#C5B9A0'),
      roughness: 0.62,
      metalness: 0.03,
      envMapIntensity: 0.38,
    }),
  );

  const matDarkAnodizedMetal = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2B2E31'),
      roughness: 0.34,
      metalness: 0.72,
      envMapIntensity: 0.85,
    }),
  );

  const matHeadphoneCushion = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3B2A20'),
      bumpMap: leather.bumpMap,
      bumpScale: 0.016,
      roughness: 0.74,
      metalness: 0.04,
    }),
  );

  const matCableRubber = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#232527'),
      roughness: 0.78,
      metalness: 0.06,
    }),
  );

  return {
    matLinenWall,
    matCreamTrim,
    matHoneyOakFloor,
    matCreamWoolRug,
    matPlayWoolRug,
    matBedWalnut,
    matDeskWood,
    matCottonSheet,
    matCottonPillow,
    matCorkboard,
    matPolishedBrass,
    matAntiqueSilver,
    matAgedLeather,
    matAgedPaper,
    matCanvasBag,
    matLeatherStrap,
    matCurtainLinen,
    matWillowBat,
    matBatGrip,
    matCricketBall,
    matAshStump,
    matVintageGlobe,
    matRetroBeigePlastic,
    matRetroBeigeTrim,
    matDarkAnodizedMetal,
    matHeadphoneCushion,
    matCableRubber,
    posterStarChartTex: createChildhoodPosterTexture('star_chart', maxAnisotropy, track),
    posterAdventureTex: createChildhoodPosterTexture('paper_plane', maxAnisotropy, track),
    wallStickerSheetTex: createWallStickerDecalTexture(maxAnisotropy, track),
    retroKeycapTex: createRetroKeycapTexture(maxAnisotropy, track),
    contactShadowTex: createContactShadowTexture(track),
    sunbeamGradTex: createSunbeamGradientTexture(track),
  };
}
