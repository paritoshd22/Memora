import * as THREE from 'three';
import {
  Collection,
  Memory,
  MemoryMediaType,
} from '../types/museum';
import { RoomMemoryVisualDataSummary } from '../types/aiStudio';
import { getProceduralMemoryArt } from './proceduralArt';
import {
  CHARACTER_COLLIDER_RADIUS,
  resolvePointAgainstOBB,
} from './atriumCollision';

export function traceRoundedRect(
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

/**
 * Generates a high-resolution warm ivory & champagne-beige Calacatta/Crema Marfil marble texture
 * with organic natural veining, subtle mineral clouds, large-format architectural slab joints,
 * and hairline brushed-brass corner inlays.
 */
export function createLuxuryMarbleFloorTexture(
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const baseGrad = ctx.createLinearGradient(0, 0, 256, 256);
  baseGrad.addColorStop(0, '#FAF5EC');
  baseGrad.addColorStop(0.5, '#F3EBDD');
  baseGrad.addColorStop(1, '#ECE2D0');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 24; i++) {
    const cx = (i * 43) % 256;
    const cy = (i * 59) % 256;
    const cr = 24 + (i * 7) % 20;
    const cloudGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, cr);
    cloudGrad.addColorStop(
      0,
      i % 2 === 0 ? 'rgba(235, 222, 202, 0.28)' : 'rgba(255, 252, 246, 0.35)',
    );
    cloudGrad.addColorStop(1, 'rgba(243, 235, 221, 0)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tileSize = 128;
  ctx.strokeStyle = 'rgba(168, 148, 122, 0.45)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= 256; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  for (let i = 0; i < 36; i++) {
    const isWhiteVein = i % 3 === 0;
    const isFineGoldVein = i % 9 === 0;
    ctx.strokeStyle = isFineGoldVein
      ? 'rgba(198, 160, 106, 0.16)'
      : isWhiteVein
        ? 'rgba(255, 253, 248, 0.44)'
        : 'rgba(184, 164, 138, 0.21)';
    ctx.lineWidth = isFineGoldVein ? 0.8 : 0.5 + (i % 3) * 0.4;
    ctx.beginPath();
    const startY = (i * 11) % 256;
    ctx.moveTo(0, startY);
    ctx.bezierCurveTo(
      65 + Math.sin(i * 0.7) * 16,
      startY + Math.sin(i * 1.1) * 8,
      170 - Math.cos(i * 0.9) * 16,
      startY - Math.cos(i * 0.8) * 8,
      256,
      startY + Math.sin(i * 0.5) * 4,
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.2, 3.2);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function createChampagneLimestoneTexture(
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const baseGrad = ctx.createLinearGradient(0, 0, 256, 256);
  baseGrad.addColorStop(0, '#F4EDE2');
  baseGrad.addColorStop(0.5, '#EFE7DA');
  baseGrad.addColorStop(1, '#F3ECE0');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 32; i++) {
    const x = (i * 37) % 256;
    const y = (i * 53) % 256;
    const r = 18 + (i % 5) * 12;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(
      0,
      i % 2 === 0 ? 'rgba(220, 206, 186, 0.22)' : 'rgba(255, 252, 247, 0.26)',
    );
    g.addColorStop(1, 'rgba(242, 235, 224, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (let y = 0; y < 256; y += 8) {
    ctx.strokeStyle =
      y % 16 === 0
        ? 'rgba(202, 186, 164, 0.12)'
        : 'rgba(255, 252, 246, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      85,
      y + Math.sin(y * 0.05) * 2,
      170,
      y - Math.cos(y * 0.05) * 2,
      256,
      y,
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 1.5);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function createRichWalnutWoodTexture(
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const plankCount = 6;
  const plankW = 256 / plankCount;
  const plankTones = [
    ['#4E3828', '#5A402E', '#463223'],
    ['#543C2B', '#614632', '#4B3525'],
    ['#493424', '#563D2B', '#422E20'],
    ['#523A29', '#5E4330', '#483324'],
    ['#4C3626', '#583F2D', '#443021'],
    ['#553D2C', '#604531', '#4A3425'],
  ];

  for (let p = 0; p < plankCount; p++) {
    const px = p * plankW;
    const tones = plankTones[p % plankTones.length];
    const pGrad = ctx.createLinearGradient(px, 0, px + plankW, 256);
    pGrad.addColorStop(0, tones[0]);
    pGrad.addColorStop(0.5, tones[1]);
    pGrad.addColorStop(1, tones[2]);
    ctx.fillStyle = pGrad;
    ctx.fillRect(px, 0, plankW + 1, 256);

    ctx.strokeStyle = 'rgba(28, 17, 10, 0.22)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, 256);
    ctx.stroke();

    for (let i = 0; i < 18; i++) {
      const gx = px + ((i + 0.5) / 18) * plankW;
      const isDarkGrain = (i + p) % 2 === 0;
      ctx.strokeStyle = isDarkGrain
        ? 'rgba(30, 18, 11, 0.24)'
        : 'rgba(134, 96, 66, 0.19)';
      ctx.lineWidth = 0.8 + (i % 3) * 0.4;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      const wave1 = Math.sin(i * 0.31 + p * 1.4) * 4;
      const wave2 = Math.cos(i * 0.27 + p * 0.9) * 4;
      ctx.bezierCurveTo(gx + wave1, 85, gx - wave2, 170, gx, 256);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.0, 2.0);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Generates the rounded dark-walnut & glowing gold-bordered 3D Zone Signage Plaque texture
 */
export function createRoundedZoneSignPlaqueTexture(
  title: string,
  subtitle: string,
  accentHex: string = '#E5B869',
  maxAnisotropy: number = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 170;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 170);
  ctx.save();
  ctx.scale(512 / 768, 170 / 256);

  traceRoundedRect(ctx, 16, 16, 736, 224, 48);
  const bgGrad = ctx.createLinearGradient(0, 16, 0, 240);
  bgGrad.addColorStop(0, '#3D2718');
  bgGrad.addColorStop(0.5, '#2C1B10');
  bgGrad.addColorStop(1, '#21130A');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  ctx.lineWidth = 7;
  ctx.strokeStyle = accentHex || '#F3C677';
  ctx.stroke();

  traceRoundedRect(ctx, 28, 28, 712, 200, 38);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 232, 185, 0.48)';
  ctx.stroke();

  ctx.fillStyle = '#FFF9EE';
  ctx.font = '700 46px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 384, 108);

  ctx.fillStyle = '#EADBC5';
  ctx.font = '500 25px "Plus Jakarta Sans", sans-serif';
  const words = subtitle.split(' ');
  let line1 = '';
  let line2 = '';
  for (const w of words) {
    if ((line1 + ' ' + w).trim().length <= 36) {
      line1 = (line1 + ' ' + w).trim();
    } else {
      line2 = (line2 + ' ' + w).trim();
    }
  }
  if (line2) {
    ctx.fillText(line1, 384, 156);
    ctx.fillText(line2.slice(0, 42), 384, 192);
  } else {
    ctx.fillText(line1, 384, 168);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

/**
 * Generates the Grand Arched Wooden Tympanum Header texture at balanced GPU resolution.
 */
export function createArchedRoomTympanumTexture(
  roomName: string,
  categoryKey: string,
  accentHex: string = '#E5B869',
  maxAnisotropy: number = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 256);

  ctx.save();
  ctx.scale(0.5, 0.5);
  ctx.beginPath();
  ctx.arc(512, 492, 470, Math.PI, 0, false);
  ctx.closePath();

  const woodGrad = ctx.createRadialGradient(512, 340, 40, 512, 420, 490);
  woodGrad.addColorStop(0, '#5B3920');
  woodGrad.addColorStop(0.65, '#3E2513');
  woodGrad.addColorStop(1, '#26150A');
  ctx.fillStyle = woodGrad;
  ctx.fill();

  ctx.lineWidth = 12;
  ctx.strokeStyle = accentHex || '#F3C677';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(512, 492, 448, Math.PI, 0, false);
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 230, 175, 0.55)';
  ctx.stroke();

  ctx.strokeStyle = '#FAD689';
  ctx.fillStyle = '#FAD689';
  ctx.lineWidth = 5;
  if (categoryKey === 'childhood') {
    ctx.beginPath();
    ctx.arc(512, 162, 52, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.fillRect(488, 138, 46, 26);
    ctx.beginPath();
    ctx.moveTo(492, 164);
    ctx.lineTo(482, 194);
    ctx.moveTo(530, 164);
    ctx.lineTo(540, 194);
    ctx.moveTo(526, 142);
    ctx.lineTo(542, 114);
    ctx.lineTo(558, 122);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(512, 154, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(512, 154, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  const cleanName = (roomName || 'Childhood Memories Room').trim();
  const displayTop = cleanName.replace(/\s*Room$/i, '');
  ctx.fillStyle = '#FFF6E5';
  ctx.font = '700 76px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(displayTop.slice(0, 22), 512, 318);

  ctx.fillStyle = '#F3D292';
  ctx.font = '600 62px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Memories Room', 512, 402);

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

/**
 * Generates an elegant archival curatorial placeholder texture for frames or screens.
 */
export function createEmptyExhibitPlaceholderTexture(
  slotTitle: string,
  slotSubtitle: string,
  maxAnisotropy: number = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm archival museum linen & travertine mat board instead of dark black board
  const grad = ctx.createRadialGradient(256, 236, 24, 256, 256, 360);
  grad.addColorStop(0, '#F7F1E5');
  grad.addColorStop(0.68, '#EFE5D4');
  grad.addColorStop(1, '#E3D5BF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle recessed inner mat bevel
  ctx.fillStyle = '#FAF5EC';
  ctx.fillRect(44, 44, 424, 424);

  ctx.strokeStyle = 'rgba(184, 146, 88, 0.65)';
  ctx.lineWidth = 3;
  ctx.strokeRect(26, 26, 460, 460);

  ctx.strokeStyle = 'rgba(138, 109, 68, 0.38)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(44, 44, 424, 424);

  // Delicate archival botanical & sun horizon sketch in muted sage and champagne brass
  ctx.strokeStyle = 'rgba(125, 143, 114, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(136, 224);
  ctx.quadraticCurveTo(196, 198, 256, 220);
  ctx.quadraticCurveTo(316, 240, 376, 214);
  ctx.stroke();

  ctx.strokeStyle = '#C9A66B';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(256, 178, 28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#3B2A1D';
  ctx.textAlign = 'center';
  ctx.font = '600 26px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(slotTitle.slice(0, 28), 256, 286);

  ctx.fillStyle = '#736252';
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(slotSubtitle.slice(0, 38), 256, 320);

  ctx.fillStyle = '#9C7A44';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Archival Keepsake Frame', 256, 366);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a 3x3 6-color Rubik's Cube face grid texture.
 */
export function createRubiksCubeFaceTexture(
  faceColorHex: string,
  accentColors: string[],
  maxAnisotropy: number = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#181412';
  ctx.fillRect(0, 0, 256, 256);

  const cell = 74;
  const gap = 8;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const stickerHex =
        idx % 4 === 0 && accentColors.length > 0
          ? accentColors[idx % accentColors.length]
          : faceColorHex;
      const sx = gap + c * (cell + gap);
      const sy = gap + r * (cell + gap);
      traceRoundedRect(ctx, sx, sy, cell, cell, 10);
      ctx.fillStyle = stickerHex;
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates the open illuminated 3D Interactive Scrapbook pages texture using actual room memories.
 */
export function createOpenScrapbookPagesTexture(
  roomName: string,
  memories: Memory[],
  maxAnisotropy: number = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;

  ctx.fillStyle = '#F7EFE1';
  ctx.fillRect(0, 0, 1024, 640);

  ctx.strokeStyle = '#C89B54';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 1010, 626);

  const spineGrad = ctx.createLinearGradient(482, 0, 542, 0);
  spineGrad.addColorStop(0, 'rgba(60, 38, 20, 0.02)');
  spineGrad.addColorStop(0.5, 'rgba(52, 30, 14, 0.36)');
  spineGrad.addColorStop(1, 'rgba(60, 38, 20, 0.02)');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(482, 14, 60, 612);

  const leftMemories = memories.slice(0, 3);
  ctx.fillStyle = '#5A3E28';
  ctx.font = '700 22px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('ARCHIVAL PHOTOGRAPH & STORY NOTES', 52, 58);

  const cardBoxes = [
    { x: 48, y: 82, w: 400, h: 210 },
    { x: 48, y: 318, w: 192, h: 245 },
    { x: 256, y: 318, w: 192, h: 245 },
  ];
  const paletteSwatches = ['#D6A15D', '#8FA88B', '#C98D87', '#6E8FA6'];

  cardBoxes.forEach((box, idx) => {
    const mem = leftMemories[idx];
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = '#D7C5AC';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

    const imgX = box.x + 10;
    const imgY = box.y + 10;
    const imgW = box.w - 20;
    const imgH = Math.floor(box.h * 0.62);

    const artGrad = ctx.createLinearGradient(imgX, imgY, imgX + imgW, imgY + imgH);
    artGrad.addColorStop(0, paletteSwatches[idx % paletteSwatches.length]);
    artGrad.addColorStop(1, '#4A3525');
    ctx.fillStyle = artGrad;
    ctx.fillRect(imgX, imgY, imgW, imgH);

    if (mem) {
      ctx.fillStyle = '#FFFDF9';
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(String(mem.location || mem.date || mem.year || '').slice(0, 22), box.x + 18, box.y + 36);

      ctx.fillStyle = '#2B1E14';
      ctx.font = '700 19px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(mem.title.slice(0, box.w > 220 ? 34 : 18), box.x + 12, box.y + box.h * 0.79);

      ctx.fillStyle = '#6D5846';
      ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
      const snippet = (mem.story || mem.description || '').slice(0, box.w > 220 ? 48 : 24);
      ctx.fillText(snippet, box.x + 12, box.y + box.h * 0.92);

      const imgUrl =
        mem.customImageUrl ||
        getProceduralMemoryArt(mem.motif, mem.palette, mem.title, mem.location);
      if (imgUrl) {
        const photoImg = new Image();
        photoImg.crossOrigin = 'anonymous';
        photoImg.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(imgX, imgY, imgW, imgH);
          ctx.clip();
          ctx.drawImage(photoImg, imgX, imgY, imgW, imgH);
          ctx.restore();
          tex.needsUpdate = true;
        };
        photoImg.src = imgUrl;
      }
    } else {
      ctx.fillStyle = '#FFFDF9';
      ctx.font = '600 14px "JetBrains Mono", monospace';
      ctx.fillText('AWAITING UPLOADED PHOTO', box.x + 16, box.y + box.h * 0.4);
      ctx.fillStyle = '#6D5846';
      ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
      ctx.fillText('Add a memory to populate this page', box.x + 12, box.y + box.h * 0.84);
    }
  });

  const shortTitle = (roomName || 'Childhood')
    .replace(/\s*Memories\s*Room$/i, '')
    .replace(/\s*Room$/i, '');
  ctx.fillStyle = '#4A3321';
  ctx.textAlign = 'center';
  ctx.font = 'italic 700 48px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('My', 760, 128);
  ctx.font = '700 56px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(shortTitle.slice(0, 16), 760, 192);
  ctx.fillText('Stories ♡', 760, 256);

  ctx.strokeStyle = 'rgba(138, 104, 72, 0.28)';
  ctx.lineWidth = 1.5;
  for (let ly = 310; ly <= 560; ly += 42) {
    ctx.beginPath();
    ctx.moveTo(568, ly);
    ctx.lineTo(956, ly);
    ctx.stroke();
  }

  ctx.textAlign = 'left';
  if (memories.length > 0) {
    memories.slice(0, 3).forEach((mem, idx) => {
      const baseY = 302 + idx * 84;
      ctx.fillStyle = '#3B2818';
      ctx.font = '700 20px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(`• ${mem.title.slice(0, 32)}`, 572, baseY);

      ctx.fillStyle = '#5E4735';
      ctx.font = 'italic 17px "Cormorant Garamond", Georgia, serif';
      const noteLine = (mem.story || mem.description || '').slice(0, 46);
      if (noteLine) {
        ctx.fillText(`"${noteLine}..."`, 586, baseY + 38);
      }
    });
  } else {
    ctx.fillStyle = '#5E4735';
    ctx.font = 'italic 20px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('Your uploaded childhood stories, notes,', 576, 344);
    ctx.fillText('and personal captions will appear here.', 576, 386);
  }

  return tex;
}

/**
 * Generates the glowing sapphire & gold Memory Constellation Interactive Table texture.
 */
export function createMemoryConstellationTableTexture(
  roomName: string,
  memories: Memory[],
  summary: RoomMemoryVisualDataSummary,
  maxAnisotropy: number = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;

  const bgGrad = ctx.createRadialGradient(512, 384, 40, 512, 384, 560);
  bgGrad.addColorStop(0, '#2A4B8D');
  bgGrad.addColorStop(0.55, '#182C5B');
  bgGrad.addColorStop(1, '#0C1633');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 768);

  ctx.strokeStyle = 'rgba(145, 195, 255, 0.22)';
  ctx.lineWidth = 1.5;
  [140, 240, 330].forEach((r) => {
    ctx.beginPath();
    ctx.arc(430, 405, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  for (let s = 0; s < 75; s++) {
    const sx = ((s * 137) % 980) + 22;
    const sy = ((s * 293) % 720) + 24;
    ctx.fillStyle = s % 4 === 0 ? '#FFE4A0' : 'rgba(210, 232, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(sx, sy, (s % 3) + 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#FFE6B0';
  ctx.font = '700 26px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(`${roomName.toUpperCase()} — MEMORY CONSTELLATION MAP`, 44, 54);
  ctx.fillStyle = '#B8D4FF';
  ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    memories.length > 0
      ? `Connected by verified tags, eras & places · ${memories.length} uploaded memory nodes`
      : 'Upload memories with dates, locations, or tags to illuminate connections',
    44,
    84,
  );

  const nodes = memories.slice(0, 6).map((m, idx, arr) => {
    if (idx === 0) {
      return { mem: m, x: 420, y: 400, r: 64 };
    }
    const angle =
      ((idx - 1) / Math.max(1, arr.length - 1)) * Math.PI * 2 - Math.PI * 0.35;
    const orbitR = idx % 2 === 1 ? 205 : 248;
    return {
      mem: m,
      x: 420 + Math.cos(angle) * orbitR,
      y: 405 + Math.sin(angle) * (orbitR * 0.78),
      r: 52,
    };
  });

  ctx.strokeStyle = 'rgba(255, 224, 150, 0.82)';
  ctx.lineWidth = 3;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (i === 0 || j === i + 1) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();

        const mx = (nodes[i].x + nodes[j].x) * 0.5;
        const my = (nodes[i].y + nodes[j].y) * 0.5;
        ctx.fillStyle = '#FFF3C4';
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const nodeColors = ['#D6A15D', '#76A5AF', '#C98D87', '#8FA88B', '#9B8EC4', '#E2B86B'];
  nodes.forEach((n, idx) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r + 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 218, 138, 0.34)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = nodeColors[idx % nodeColors.length];
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFE4A3';
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(n.mem.title.slice(0, 14), n.x, n.y + 4);

    ctx.fillStyle = '#FFE9B8';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText(
      String(n.mem.date || n.mem.year || n.mem.location || 'Memory').slice(0, 14),
      n.x,
      n.y + n.r + 24,
    );
    ctx.restore();
  });

  return tex;
}

export const ROOM_ENTRANCE_TRANSITION_SPEC = {
  durationSec: 0.85,
  entranceGlowPeak: 1.8,
  cameraTransitionDamping: 6.5,
};

export const ROOM_INTERIOR_SPEC = {
  width: 14,
  depth: 14,
  height: 5.2,
  halfWidth: 7,
  halfDepth: 7.6,
  spawnX: 0,
  spawnZ: 5.5,
  wallThickness: 0.44,
};

export function buildRoomInteriorColliders(_room?: any, style?: string, memories?: any[]): { circles: any[]; obbs: any[] } {
  const circles: any[] = [];
  const obbs: any[] = [];
  const halfW = ROOM_INTERIOR_SPEC.halfWidth || 7.0;
  const halfD = ROOM_INTERIOR_SPEC.halfDepth || 7.6;

  obbs.push({ id: 'room_north_wall', cx: 0, cz: -halfD, hx: halfW, hz: 0.2, rotY: 0, inwardNormalOnly: true });
  obbs.push({ id: 'room_south_wall', cx: 0, cz: halfD, hx: halfW, hz: 0.2, rotY: 0, inwardNormalOnly: true });
  obbs.push({ id: 'room_west_wall', cx: -halfW, cz: 0, hx: 0.2, hz: halfD, rotY: 0, inwardNormalOnly: true });
  obbs.push({ id: 'room_east_wall', cx: halfW, cz: 0, hx: 0.2, hz: halfD, rotY: 0, inwardNormalOnly: true });

  const effStyle = style || _room?.designConfig?.exhibitionStyle || _room?.exhibitionStyle;
  // Central indoor tree island sits in every room (r = 1.8 for floating island, r = 1.32 pedestal base)
  circles.push({
    id: 'room_central_floating_island',
    cx: 0,
    cz: -1.1,
    radius: effStyle === 'floating_island' ? 1.8 : 1.32,
  });

  // Permanent Section 3B interior exhibition & furniture colliders matching roomExhibition3D.ts
  obbs.push({ id: 'room_cinema_credenza', cx: 3.55, cz: -4.25, hx: 1.65, hz: 0.25, rotY: -0.36 });
  obbs.push({ id: 'room_keepsake_vitrine', cx: -5.65, cz: -3.55, hx: 0.86, hz: 0.44, rotY: Math.PI * 0.36 });
  obbs.push({ id: 'room_constellation_table', cx: 3.85, cz: 1.85, hx: 0.85, hz: 0.52, rotY: -Math.PI * 0.32 });
  obbs.push({ id: 'room_bedroom_bed', cx: -5.05, cz: 3.65, hx: 0.78, hz: 1.0, rotY: Math.PI / 2 });
  obbs.push({ id: 'room_bedroom_wardrobe', cx: -4.35, cz: 6.08, hx: 0.56, hz: 0.34, rotY: Math.PI });
  obbs.push({ id: 'room_study_desk', cx: -5.25, cz: -4.65, hx: 0.68, hz: 0.38, rotY: Math.PI * 0.36 });
  obbs.push({ id: 'room_trophy_shelf', cx: -6.38, cz: 1.38, hx: 0.22, hz: 0.62, rotY: 0 });
  obbs.push({ id: 'room_cork_pinboard', cx: -3.55, cz: -6.25, hx: 0.68, hz: 0.18, rotY: 0 });
  obbs.push({ id: 'room_drawing_wall', cx: -6.45, cz: 5.05, hx: 0.16, hz: 0.62, rotY: 0 });
  obbs.push({ id: 'room_bedroom_window', cx: -1.95, cz: -6.48, hx: 0.9, hz: 0.18, rotY: 0 });
  obbs.push({ id: 'room_memory_radio', cx: -2.02, cz: 6.02, hx: 0.26, hz: 0.22, rotY: 0 });
  obbs.push({ id: 'room_memory_projector', cx: 2.15, cz: 5.85, hx: 0.26, hz: 0.26, rotY: 0 });
  obbs.push({ id: 'room_wall_clock_calendar', cx: -5.38, cz: 6.08, hx: 0.36, hz: 0.12, rotY: 0 });

  if (effStyle === 'cinematic_video_gallery') {
    obbs.push({ id: 'room_cinema_lounge_sofa', cx: 0, cz: 3.0, hx: 1.5, hz: 0.8, rotY: 0 });
    obbs.push({ id: 'room_reflection_bench', cx: 0, cz: 0, hx: 1.0, hz: 0.4, rotY: 0 });
  }

  if (memories && Array.isArray(memories)) {
    memories.forEach((mem) => {
      const blueprint = mem.memoryTo3DBlueprint;
      if (blueprint && blueprint.userApprovalStatus === 'approved') {
        circles.push({
          id: `memory_3d_obj_${mem.id}`,
          cx: blueprint.position?.x ?? 0,
          cz: blueprint.position?.z ?? 0,
          radius: 0.8,
        });
      }
    });
  }

  return { circles, obbs };
}

export function createLimestonePBRMaps(maxAnisotropy = 4, _res = 512) {
  const normalMap = createChampagneLimestoneTexture(maxAnisotropy);
  const roughnessMap = createChampagneLimestoneTexture(maxAnisotropy);
  return { normalMap, roughnessMap };
}

export function createNaturalBoucleTexture(maxAnisotropy = 4) {
  return createChampagneLimestoneTexture(maxAnisotropy);
}

export function createWoodPBRMaps(maxAnisotropy = 4, _res = 512) {
  const normalMap = createRichWalnutWoodTexture(maxAnisotropy);
  const roughnessMap = createRichWalnutWoodTexture(maxAnisotropy);
  return { normalMap, roughnessMap };
}

export function createBrushedMetalPBRMaps(maxAnisotropy = 4, _res = 512) {
  const normalMap = createChampagneLimestoneTexture(maxAnisotropy);
  const roughnessMap = createChampagneLimestoneTexture(maxAnisotropy);
  return { normalMap, roughnessMap };
}

export function computeRoomEntranceAnimationState(params: {
  elapsedSec: number;
  durationSec?: number;
  reducedMotion?: boolean;
}) {
  const { elapsedSec, durationSec = ROOM_ENTRANCE_TRANSITION_SPEC.durationSec, reducedMotion } = params;
  const progress = Math.min(1, Math.max(0, elapsedSec / durationSec));
  if (reducedMotion || elapsedSec >= durationSec) {
    return {
      isComplete: true,
      progress: 1,
      interiorLightFactor: 1,
      entranceGlowMultiplier: 1,
      displayRevealFactor: 1,
      cameraSpringArmBlend: 1,
    };
  }
  return {
    isComplete: false,
    progress,
    interiorLightFactor: 0.5 + 0.5 * progress,
    entranceGlowMultiplier: 1.0 + 0.7 * Math.sin(progress * Math.PI),
    displayRevealFactor: progress,
    cameraSpringArmBlend: progress,
  };
}

export const MEMORY_FRAME_STYLE_OPTIONS = [
  { id: 'classic_wood', label: 'Classic Wood Frame' },
  { id: 'modern_metal', label: 'Modern Metal Frame' },
  { id: 'floating_acrylic', label: 'Floating Acrylic' },
  { id: 'minimal_borderless', label: 'Minimal Borderless' },
];

export const EXHIBITION_DISPLAY_STYLE_OPTIONS = [
  { id: 'floating_exhibition', label: 'Floating Exhibition', badge: 'Immersive' },
  { id: 'classic_wall_gallery', label: 'Classic Wall Gallery', badge: 'Traditional' },
  { id: 'timeline_wall', label: 'Timeline Wall', badge: 'Chronological' },
  { id: 'floating_island', label: 'Floating Island', badge: 'Surreal' },
  { id: 'cinematic_video_gallery', label: 'Cinematic Video Gallery', badge: 'Media' },
  { id: 'memory_shelves', label: 'Memory Shelves', badge: 'Curated' },
  { id: 'scrapbook_collage', label: 'Scrapbook Collage', badge: 'Personal' },
  { id: 'immersive_panorama', label: 'Immersive Panorama', badge: 'Panoramic' },
];

export function getEffectiveRoomExhibitionStyle(_room: any, _memories: any[]) {
  return 'classic_wall_gallery';
}

export function getRoomLuxuryArchitectureColors(room: any, _style: any) {
  return {
    wall: '#F3EBDD',
    floor: '#DFD2BE',
    accent: '#C9A66B',
    primaryWallHex: '#F3EBDD',
    featureWallHex: '#E5D6BF',
    floorBaseHex: '#DFD2BE',
    themeLabel: room?.theme || 'Luxury Curated',
  };
}

export function evaluateRoomMemoryProximity(params: {
  placements: any[];
  playerX: number;
  playerZ: number;
  cameraForwardX?: number;
  cameraForwardZ?: number;
}) {
  const { placements, playerX, playerZ, cameraForwardX, cameraForwardZ } = params;
  if (!placements || placements.length === 0) return { activePlacement: null, highlightStrength: 0 };
  let closest = placements[0];
  let minDist = Math.hypot(closest.interactionX - playerX, closest.interactionZ - playerZ);
  for (let i = 1; i < placements.length; i++) {
    const p = placements[i];
    const dist = Math.hypot(p.interactionX - playerX, p.interactionZ - playerZ);
    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  }
  if (minDist > 2.8) return { activePlacement: null, highlightStrength: 0 };

  const normalX = Math.sin(closest.rotY || 0);
  const normalZ = Math.cos(closest.rotY || 0);
  const toPlayerX = playerX - closest.x;
  const toPlayerZ = playerZ - closest.z;
  if (toPlayerX * normalX + toPlayerZ * normalZ < -0.15) {
    return { activePlacement: null, highlightStrength: 0 };
  }

  return {
    activePlacement: closest,
    distanceToClosest: minDist,
    highlightStrength: Math.max(0.3, 1 - minDist / 2.8),
  };
}

export function getBicycleTrailPose(progress: number) {
  const angle = progress * Math.PI * 2;
  return {
    x: Math.cos(angle) * 6,
    z: Math.sin(angle) * 6,
    yaw: angle + Math.PI / 2,
  };
}

export function buildContextualWorldCatalog(memories: any[], _collections: any[] = []) {
  const visible = (memories || []).filter((m: any) => !m?.hiddenFrom3D);
  const audioTracks = visible
    .filter(
      (m: any) => m.mediaType === 'audio' || m.mediaUrl?.match(/\.(mp3|wav|m4a)$/i),
    )
    .map((m: any) => ({ memory: m, autoplayAllowed: false }));
  return {
    bicycleTrailMemories: visible,
    treehouseMemories: visible,
    cinemaVideos: visible.filter(
      (m: any) => m.mediaType === 'video' || m.type === 'video' || m.mediaUrl?.match(/\.(mp4|webm|mov)$/i),
    ),
    audioTracks,
    gardenTrailMemories: visible,
  };
}

export function resolveRoomInteriorMovement(params: {
  room?: any;
  memories?: any[];
  styleOverride?: string;
  startX: number;
  startY: number;
  startZ: number;
  velX: number;
  velZ: number;
  delta: number;
  cachedColliders?: { circles: any[]; obbs: any[] };
}) {
  const { startX, startZ, velX, velZ, delta, room, styleOverride, memories, cachedColliders } = params;
  const colliders = cachedColliders || buildRoomInteriorColliders(room, styleOverride, memories);
  const halfW = ROOM_INTERIOR_SPEC.halfWidth || 7.0;
  const halfD = ROOM_INTERIOR_SPEC.halfDepth || 7.6;
  const minClearX = halfW - (ROOM_INTERIOR_SPEC.wallThickness || 0.44) - CHARACTER_COLLIDER_RADIUS;
  const minClearZ = halfD - (ROOM_INTERIOR_SPEC.wallThickness || 0.44) - CHARACTER_COLLIDER_RADIUS;

  const dispX = velX * delta;
  const dispZ = velZ * delta;
  const totalDist = Math.hypot(dispX, dispZ);
  const subSteps = Math.max(1, Math.min(12, Math.ceil(totalDist / 0.3)));
  const stepX = dispX / subSteps;
  const stepZ = dispZ / subSteps;

  let finalX = startX;
  let finalZ = startZ;

  for (let s = 0; s < subSteps; s++) {
    finalX = Math.max(-minClearX, Math.min(minClearX, finalX + stepX));
    finalZ = Math.max(-minClearZ, Math.min(minClearZ, finalZ + stepZ));

    for (let pass = 0; pass < 2; pass++) {
      if (colliders.circles) {
        for (let i = 0; i < colliders.circles.length; i++) {
          const c = colliders.circles[i];
          const minDist = (c.radius || 0.5) + CHARACTER_COLLIDER_RADIUS;
          const dx = finalX - c.cx;
          const dz = finalZ - c.cz;
          const dist = Math.hypot(dx, dz);
          if (dist < minDist) {
            if (dist > 1e-6) {
              finalX = c.cx + (dx / dist) * minDist;
              finalZ = c.cz + (dz / dist) * minDist;
            } else {
              finalX = c.cx;
              finalZ = c.cz + minDist;
            }
          }
        }
      }
      if (colliders.obbs) {
        for (let i = 0; i < colliders.obbs.length; i++) {
          const obb = colliders.obbs[i];
          if (obb.inwardNormalOnly) continue;
          const res = resolvePointAgainstOBB(finalX, finalZ, CHARACTER_COLLIDER_RADIUS, obb);
          if (res.hit) {
            finalX = res.x;
            finalZ = res.z;
          }
        }
      }
    }
  }

  return {
    x: finalX,
    y: params.startY,
    z: finalZ,
    exitedRoom: finalZ >= 6.45 && Math.abs(finalX) <= 1.38,
  };
}

export function evaluateRoomInteriorExitDoorway(params: {
  prevX: number;
  prevZ: number;
  currX: number;
  currZ: number;
}): boolean {
  return Math.abs(params.currX) <= 1.38 && params.currZ >= 6.45 && params.prevZ < 6.45;
}



export interface BuiltExhibitionDisplayRecord3D {
  memoryId?: string;
  mesh?: THREE.Object3D;
  title?: string;
  placement?: any;
  rotY?: number;
  frameStyle?: string;
  width?: number;
  height?: number;
  isMainCinemaScreen?: boolean;
  mountStyle?: string;
  chronologicalDateLabel?: string;
  picLightMat?: THREE.MeshStandardMaterial;
  artMat?: THREE.MeshStandardMaterial;
  baseArtEmissiveIntensity?: number;
  [key: string]: any;
}

export interface BuiltExhibitionRoom3D {
  rootGroup: THREE.Group;
  disposables?: { dispose: () => void }[];
  displayRecords: BuiltExhibitionDisplayRecord3D[];
  setBicycleRidePose?: (active: boolean, pose: any, delta: number) => void;
  updateAmbientAnimations?: (
    elapsedSec: number,
    playerLocalPos?: { x: number; z: number },
    reducedMotion?: boolean,
  ) => void;
  roomId?: string;
  cleanup?: () => void;
  solidWallMeshes?: any[];
  bedroomInteractions?: import('./childhoodBedroomInteractions').ChildhoodBedroomInteractionController | null;
  [key: string]: any;
}

export interface RoomEntranceAnimationState {
  isComplete: boolean;
  interiorLightFactor: number;
  entranceGlowMultiplier: number;
  displayRevealFactor: number;
  cameraSpringArmBlend: number;
  progress?: number;
  [key: string]: any;
}

export function computeExhibitionPlacements(roomOrMemories: any, memoriesOrStyle?: any, _style?: any) {
  const memories = Array.isArray(roomOrMemories)
    ? roomOrMemories
    : Array.isArray(memoriesOrStyle)
      ? memoriesOrStyle
      : [];
  return memories.map((mem: any, idx: number) => {
    const x = (idx % 3) * 3 - 3;
    const y = 1.6;
    const z = -4 - Math.floor(idx / 3) * 2;
    const rotY = 0;
    return {
      memory: mem,
      memoryId: mem.id,
      x,
      y,
      z,
      yaw: 0,
      pitch: 0,
      rotY,
      interactionX: x,
      interactionZ: z + 1.2,
      frameStyle: 'classic_wood',
      width: 2.2,
      height: 1.6,
      isMainCinemaScreen: idx === 0,
      mountStyle: 'wall_mount',
      chronologicalDateLabel: mem.date || mem.year || '2026',
    };
  });
}

export function getAuthenticMemoryDateLabel(memory: any): { isUndated: boolean; label: string | null } {
  if (!memory || (!memory.date && !memory.year)) {
    return { isUndated: true, label: null };
  }
  return { isUndated: false, label: memory.date || String(memory.year) };
}

export function createTimelineDateNodeTexture(title: string, dateStr?: string, ..._args: any[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#27231F';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#FFE2B5';
  ctx.font = '700 24px sans-serif';
  ctx.fillText((title || 'Timeline Event').slice(0, 24), 32, 64);
  ctx.fillStyle = '#C9A66B';
  ctx.font = '600 18px monospace';
  ctx.fillText((dateStr || '2026').slice(0, 24), 32, 120);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRoomHeaderBannerTexture(title: string, ..._args: any[]) {
  return createTimelineDateNodeTexture(title, 'Exhibition Room');
}

export function createMemoryMuseumPlaqueTexture(
  titleOrMemory: string | { title?: string },
  subtitle?: string,
  ..._args: any[]
) {
  const resolvedTitle =
    typeof titleOrMemory === 'string' ? titleOrMemory : titleOrMemory?.title || 'Memory';
  return createTimelineDateNodeTexture(resolvedTitle, subtitle || 'Memory Plaque');
}

export function createAudioWaveformPlayerTexture(title: string, ..._args: any[]) {
  return createTimelineDateNodeTexture(title, 'Audio Memory');
}

export type ContextualWorldCatalog = ReturnType<typeof buildContextualWorldCatalog>;




