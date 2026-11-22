import { ArtworkMotif } from '../types/museum';

// Bounded LRU cache: procedural artwork data URLs can otherwise accumulate
// indefinitely as users browse rooms with many distinct memories.
const artCache = new Map<string, string>();
const MAX_PROCEDURAL_ART_CACHE_ENTRIES = 48;

/**
 * Generates a high-resolution, museum-grade procedural canvas painting data URL
 * with layered atmospheric perspective, golden-hour bokeh, architectural detail,
 * and film grain so every memory card, room preview, and 3D picture frame renders
 * a rich artwork with zero external network dependencies or 404s.
 */
export function getProceduralMemoryArt(
  motif: ArtworkMotif,
  palette: [string, string, string, string],
  title: string,
  location?: string,
): string {
  const cacheKey = `${motif}_${palette.join('_')}_${title}`;
  const cached = artCache.get(cacheKey);
  if (cached) {
    // Refresh insertion order so frequently used artwork stays in the cache.
    artCache.delete(cacheKey);
    artCache.set(cacheKey, cached);
    return cached;
  }

  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const [skyTop, skyBottom, primaryTone, accentTone] = palette;

  // 1. Multi-stop Golden Hour Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 600);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(0.45, skyBottom);
  skyGrad.addColorStop(0.82, '#E8A568');
  skyGrad.addColorStop(1, primaryTone);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 800, 600);

  // 2. Soft Cloud Wisps
  ctx.save();
  for (let c = 0; c < 6; c++) {
    const cx = 110 + c * 125;
    const cy = 95 + (c % 3) * 38;
    const cloudGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 140);
    cloudGrad.addColorStop(0, 'rgba(255, 249, 238, 0.35)');
    cloudGrad.addColorStop(1, 'rgba(255, 249, 238, 0)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 140, 32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Golden Hour Sun & Atmospheric Halo
  const sunX =
    motif === 'coastal_bonfire' || motif === 'amalfi_arches' ? 540 : 290;
  const sunY = motif === 'observatory_stars' ? 155 : 220;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 340);
  sunGlow.addColorStop(0, 'rgba(255, 252, 240, 0.96)');
  sunGlow.addColorStop(0.2, 'rgba(253, 212, 138, 0.62)');
  sunGlow.addColorStop(0.55, 'rgba(217, 119, 6, 0.22)');
  sunGlow.addColorStop(1, 'rgba(217, 119, 6, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, 800, 600);

  ctx.beginPath();
  ctx.arc(sunX, sunY, motif === 'observatory_stars' ? 26 : 46, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 252, 242, 0.92)';
  ctx.fill();

  // 4. Layered Distant Mountain / Hill Ridges (Atmospheric Depth)
  drawHorizonRidge(ctx, 350, 26, motif.length, hexWithAlpha(primaryTone, 0.32));
  drawHorizonRidge(ctx, 395, 18, motif.length + 2, hexWithAlpha(primaryTone, 0.58));

  // 5. Motif-Specific Foreground & Midground Composition
  drawMotifScene(ctx, motif, primaryTone, accentTone);

  // 6. Warm Golden Bokeh Light Orbs & Sunbeams
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(sunX, sunY - 20);
    ctx.lineTo(sunX - 300 + i * 200, 600);
    ctx.lineTo(sunX - 190 + i * 200, 600);
    ctx.closePath();
    const rayGrad = ctx.createLinearGradient(sunX, sunY, sunX, 600);
    rayGrad.addColorStop(0, 'rgba(255, 244, 214, 0.14)');
    rayGrad.addColorStop(1, 'rgba(255, 244, 214, 0)');
    ctx.fillStyle = rayGrad;
    ctx.fill();
  }

  // Soft golden bokeh circles
  for (let b = 0; b < 14; b++) {
    const bx = (b * 137 + motif.charCodeAt(0) * 29) % 760 + 20;
    const by = 180 + ((b * 97) % 360);
    const br = 8 + (b % 5) * 7;
    const bokehGrad = ctx.createRadialGradient(bx, by, 1, bx, by, br);
    bokehGrad.addColorStop(0, 'rgba(255, 245, 210, 0.28)');
    bokehGrad.addColorStop(0.7, 'rgba(251, 191, 114, 0.14)');
    bokehGrad.addColorStop(1, 'rgba(251, 191, 114, 0)');
    ctx.fillStyle = bokehGrad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 7. Archival Film Vignette & Subtle Inner Frame
  const vignette = ctx.createRadialGradient(400, 300, 230, 400, 300, 510);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(26, 17, 11, 0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 800, 600);

  ctx.strokeStyle = 'rgba(255, 248, 235, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 760, 560);

  if (location) {
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 248, 235, 0.72)';
    ctx.textAlign = 'right';
    ctx.fillText(location.toUpperCase(), 760, 564);
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  artCache.set(cacheKey, dataUrl);
  while (artCache.size > MAX_PROCEDURAL_ART_CACHE_ENTRIES) {
    const oldestKey = artCache.keys().next().value;
    if (oldestKey === undefined) break;
    artCache.delete(oldestKey);
  }
  return dataUrl;
}

function drawHorizonRidge(
  ctx: CanvasRenderingContext2D,
  baseY: number,
  amp: number,
  seed: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let x = 0; x <= 800; x += 32) {
    const y =
      baseY +
      Math.sin(x * 0.007 + seed) * amp +
      Math.cos(x * 0.016 - seed) * (amp * 0.45);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(800, 600);
  ctx.lineTo(0, 600);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawMotifScene(
  ctx: CanvasRenderingContext2D,
  motif: ArtworkMotif,
  primaryTone: string,
  accentTone: string,
) {
  switch (motif) {
    case 'treehouse_meadow':
    case 'grandparents_orchard': {
      // Sunlit meadow hills
      ctx.fillStyle = '#382518';
      ctx.beginPath();
      ctx.moveTo(0, 465);
      ctx.quadraticCurveTo(380, 415, 800, 480);
      ctx.lineTo(800, 600);
      ctx.lineTo(0, 600);
      ctx.fill();

      // Trunk & sprawling limbs
      ctx.fillStyle = '#29190F';
      ctx.fillRect(492, 240, 48, 240);
      ctx.beginPath();
      ctx.moveTo(510, 290);
      ctx.quadraticCurveTo(420, 240, 370, 225);
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#29190F';
      ctx.stroke();

      // Rich layered foliage canopy
      const canopy = [
        [435, 205, 84, primaryTone],
        [525, 175, 98, '#4A3521'],
        [605, 215, 80, primaryTone],
        [485, 245, 72, '#5E442B'],
      ] as const;
      canopy.forEach(([cx, cy, r, col]) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cedar treehouse cabin with pitched roof & glowing amber windows
      ctx.fillStyle = '#4A2F1D';
      ctx.fillRect(460, 250, 112, 76);
      ctx.beginPath();
      ctx.moveTo(444, 252);
      ctx.lineTo(516, 206);
      ctx.lineTo(588, 252);
      ctx.closePath();
      ctx.fillStyle = '#311E11';
      ctx.fill();

      // Warm lit windows
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(484, 272, 26, 34);
      ctx.fillRect(520, 272, 26, 34);

      // Rope ladder & tire swing
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(482, 326);
      ctx.lineTo(476, 455);
      ctx.moveTo(500, 326);
      ctx.lineTo(494, 455);
      for (let y = 340; y < 450; y += 16) {
        ctx.moveTo(478, y);
        ctx.lineTo(498, y);
      }
      ctx.stroke();

      // Vintage bicycle silhouette leaning in meadow
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(210, 472, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(274, 472, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(210, 472);
      ctx.lineTo(240, 444);
      ctx.lineTo(274, 472);
      ctx.lineTo(232, 472);
      ctx.closePath();
      ctx.stroke();
      break;
    }

    case 'coastal_bonfire':
    case 'polaroid_roadtrip': {
      // Ocean horizon
      const seaGrad = ctx.createLinearGradient(0, 385, 0, 515);
      seaGrad.addColorStop(0, '#3B4F59');
      seaGrad.addColorStop(1, '#1D272D');
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, 385, 800, 130);

      // Shimmering sunset water path
      ctx.fillStyle = 'rgba(253, 210, 130, 0.52)';
      for (let i = 0; i < 16; i++) {
        const w = 135 - i * 6.5;
        ctx.fillRect(540 - w / 2 + Math.sin(i) * 10, 392 + i * 6.5, w, 3);
      }

      // Sandy cove foreground
      ctx.beginPath();
      ctx.moveTo(0, 455);
      ctx.quadraticCurveTo(390, 478, 800, 518);
      ctx.lineTo(800, 600);
      ctx.lineTo(0, 600);
      ctx.fillStyle = '#281B13';
      ctx.fill();

      // Glowing campfire radial light
      const fireGlow = ctx.createRadialGradient(310, 492, 6, 310, 492, 145);
      fireGlow.addColorStop(0, 'rgba(255, 243, 185, 0.98)');
      fireGlow.addColorStop(0.35, 'rgba(245, 158, 11, 0.58)');
      fireGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(310, 492, 145, 0, Math.PI * 2);
      ctx.fill();

      // Driftwood logs
      ctx.strokeStyle = '#18100A';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(270, 515);
      ctx.lineTo(350, 496);
      ctx.moveTo(276, 496);
      ctx.lineTo(346, 516);
      ctx.stroke();

      // Flames
      ctx.beginPath();
      ctx.moveTo(288, 504);
      ctx.quadraticCurveTo(310, 425, 332, 504);
      ctx.fillStyle = '#F59E0B';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(298, 504);
      ctx.quadraticCurveTo(310, 452, 322, 504);
      ctx.fillStyle = '#FEF3C7';
      ctx.fill();
      break;
    }

    case 'amalfi_arches':
    case 'kyoto_torii':
    case 'alpine_train': {
      // Classical Mediterranean stone colonnade with rounded arches
      ctx.fillStyle = '#36251A';
      const archCount = 3;
      const archWidth = 220;
      const startX = 70;
      for (let i = 0; i < archCount; i++) {
        const x = startX + i * archWidth;
        ctx.fillRect(x, 135, 44, 380);
        if (i === archCount - 1) {
          ctx.fillRect(x + archWidth, 135, 44, 380);
        }
        ctx.beginPath();
        ctx.moveTo(x + 22, 190);
        ctx.arc(
          x + 22 + archWidth / 2,
          190,
          archWidth / 2 - 22,
          Math.PI,
          0,
          false,
        );
        ctx.lineTo(x + archWidth + 22, 105);
        ctx.lineTo(x + 22, 105);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillRect(40, 90, 720, 48);

      // Sunlit terrace balustrade
      ctx.fillStyle = '#4A3323';
      ctx.fillRect(70, 438, 660, 12);
      for (let bx = 95; bx < 715; bx += 28) {
        ctx.fillRect(bx, 450, 8, 55);
      }

      // Travertine terrace floor
      ctx.fillStyle = '#523A28';
      ctx.fillRect(0, 505, 800, 95);
      break;
    }

    case 'atelier_studio':
    case 'symphony_hall':
    case 'botanical_press': {
      // Studio worktable
      ctx.fillStyle = '#412A1A';
      ctx.fillRect(0, 418, 800, 182);
      ctx.fillStyle = '#5E3E27';
      ctx.fillRect(0, 418, 800, 12);

      // Architectural model pavilion on plinth
      ctx.fillStyle = '#EADBC6';
      ctx.fillRect(245, 358, 270, 60);
      for (let c = 0; c < 5; c++) {
        ctx.fillRect(268 + c * 54, 260, 13, 98);
      }
      ctx.beginPath();
      ctx.moveTo(230, 260);
      ctx.lineTo(380, 192);
      ctx.lineTo(530, 260);
      ctx.closePath();
      ctx.fillStyle = '#D7C4AA';
      ctx.fill();

      // Brass dividers & sketchbook
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(595, 416);
      ctx.lineTo(622, 340);
      ctx.lineTo(648, 416);
      ctx.stroke();
      break;
    }

    case 'courtyard_lanterns':
    case 'greenhouse_vows':
    case 'observatory_stars': {
      const strings = [
        [70, 105, 400, 185, 730, 90],
        [50, 190, 410, 255, 750, 170],
      ];
      strings.forEach(([x0, y0, cx, cy, x1, y1]) => {
        ctx.strokeStyle = 'rgba(58, 38, 24, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.stroke();

        for (let t = 0.14; t <= 0.88; t += 0.18) {
          const lx =
            (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
          const ly =
            (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;

          const halo = ctx.createRadialGradient(
            lx,
            ly + 18,
            4,
            lx,
            ly + 18,
            52,
          );
          halo.addColorStop(0, 'rgba(255, 248, 210, 0.96)');
          halo.addColorStop(0.4, 'rgba(245, 158, 11, 0.48)');
          halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(lx, ly + 18, 52, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FEF3C7';
          ctx.beginPath();
          ctx.ellipse(lx, ly + 18, 15, 19, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.fillStyle = '#291C14';
      ctx.fillRect(0, 482, 800, 118);
      break;
    }

    default: {
      // Heirloom family table with ceramic vase, olive branches & artisan sourdough
      ctx.fillStyle = '#462D1D';
      ctx.fillRect(0, 428, 800, 172);

      // Linen runner
      ctx.fillStyle = '#F0E7D7';
      ctx.beginPath();
      ctx.moveTo(205, 428);
      ctx.lineTo(595, 428);
      ctx.lineTo(655, 600);
      ctx.lineTo(145, 600);
      ctx.closePath();
      ctx.fill();

      // Ceramic pitcher
      ctx.fillStyle = '#DDD0BD';
      ctx.beginPath();
      ctx.ellipse(400, 382, 44, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(380, 312, 40, 32);

      // Olive & sage branches
      ctx.strokeStyle = accentTone;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(400, 318);
      ctx.quadraticCurveTo(335, 238, 288, 204);
      ctx.moveTo(400, 318);
      ctx.quadraticCurveTo(460, 228, 512, 190);
      ctx.stroke();

      // Sourdough loaf
      ctx.fillStyle = '#B86B2B';
      ctx.beginPath();
      ctx.arc(282, 454, 40, Math.PI, 0);
      ctx.fill();
      break;
    }
  }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(120, 85, 54, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
