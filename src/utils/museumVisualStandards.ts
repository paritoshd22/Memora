import * as THREE from 'three';
import type { AtmospherePresetId } from '../types/aiStudio';

const PALETTE_DEEP_OLIVE = '#55634E';
const PALETTE_MUTED_SAGE = '#7A8B70';

export type DeviceQualityTier = 'desktop' | 'tablet' | 'mobile';

export type GraphicsProfileId =
  | 'desktop_high'
  | 'desktop_balanced'
  | 'desktop_performance'
  | 'mobile_balanced'
  | 'mobile_performance';

export type GpuCapabilityTier =
  | 'software'
  | 'mobile_gpu'
  | 'integrated_desktop'
  | 'discrete_or_apple_silicon'
  | 'unknown';

export interface HardwareCapabilitySignals {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  deviceMemory?: number;
  isCoarsePointer: boolean;
  glRenderer?: string;
  glVendor?: string;
  maxTextureSize?: number;
  maxCapabilityAnisotropy?: number;
  isSoftwareGl: boolean;
}

export interface VisualQualityConfig {
  tier: DeviceQualityTier;
  profileId?: GraphicsProfileId;
  isSoftwareGl: boolean;
  textureRes: number;
  pbrMapRes: number;
  shadowMapSize: number;
  enableShadows: boolean;
  shadowRadius: number;
  enablePostProcessing: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  treeFoliageInstances: number;
  cylinderSegments: number;
  curveTubularSegments: number;
  curveRadialSegments: number;
  maxPixelRatio: number;
  maxAnisotropy?: number;
  enableAntialias?: boolean;
  usePhysicalMaterials?: boolean;
  usePhysicalHeroAccentsOnly?: boolean;
  enableFloorLightCulling?: boolean;
  enableVolumetricSunbeams?: boolean;
}

/**
 * Classifies WebGL renderer strings into software, mobile, integrated, or discrete/Apple-Silicon tiers
 * without relying solely on screen dimensions.
 */
export function classifyGpuCapability(
  glRenderer = '',
  isSoftwareGl = false,
  isCoarsePointer = false,
): GpuCapabilityTier {
  if (isSoftwareGl || /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(glRenderer)) {
    return 'software';
  }
  if (isCoarsePointer || /Adreno|Mali|PowerVR|Immortalis|Tegra/i.test(glRenderer)) {
    return 'mobile_gpu';
  }
  if (
    /NVIDIA|RTX|GTX|Quadro|GeForce|Radeon RX|Radeon Pro|Intel\(R\) Arc|Apple M\d/i.test(glRenderer)
  ) {
    return 'discrete_or_apple_silicon';
  }
  if (
    /Intel|UHD|Iris|HD Graphics|Mesa|Vega [368]|Radeon Graphics|Apple GPU/i.test(glRenderer)
  ) {
    return 'integrated_desktop';
  }
  return 'unknown';
}

/**
 * Selects the safe initial graphics profile across Desktop and Mobile.
 * Desktop always starts in Desktop Balanced (safe default until live FPS is measured)
 * or Desktop Performance on constrained/software hardware; Mobile preserves its lean reference profile.
 */
export function detectInitialGraphicsProfile(signals: HardwareCapabilitySignals): {
  profileId: GraphicsProfileId;
  gpuTier: GpuCapabilityTier;
  isMobileDevice: boolean;
} {
  const gpuTier = classifyGpuCapability(
    signals.glRenderer,
    signals.isSoftwareGl,
    signals.isCoarsePointer,
  );
  const minDim = Math.min(signals.viewportWidth, signals.viewportHeight);
  const isMobileDevice =
    (signals.isCoarsePointer && minDim <= 920) ||
    signals.viewportWidth < 640 ||
    (gpuTier === 'mobile_gpu' && signals.viewportWidth < 1024);

  if (isMobileDevice) {
    const lowCapMobile =
      signals.isSoftwareGl ||
      gpuTier === 'software' ||
      signals.hardwareConcurrency <= 2 ||
      (typeof signals.deviceMemory === 'number' && signals.deviceMemory <= 2) ||
      (typeof signals.maxTextureSize === 'number' && signals.maxTextureSize <= 2048);
    return {
      profileId: lowCapMobile ? 'mobile_performance' : 'mobile_balanced',
      gpuTier,
      isMobileDevice: true,
    };
  }

  const lowCapDesktop =
    signals.isSoftwareGl ||
    gpuTier === 'software' ||
    signals.hardwareConcurrency <= 2 ||
    (typeof signals.deviceMemory === 'number' && signals.deviceMemory <= 2) ||
    (typeof signals.maxTextureSize === 'number' && signals.maxTextureSize <= 4096);

  return {
    profileId: lowCapDesktop ? 'desktop_performance' : 'desktop_balanced',
    gpuTier,
    isMobileDevice: false,
  };
}

/**
 * Computes dedicated 5-profile adaptive graphics configuration.
 * - Mobile Balanced preserves the working mobile experience & single-pass visuals untouched.
 * - Desktop Balanced serves as the crisp, single-pass safe default on desktop (no multi-pass bloom lag).
 */
export function getGraphicsProfileConfig(profileId: GraphicsProfileId): VisualQualityConfig {
  switch (profileId) {
    case 'desktop_high':
      return {
        tier: 'desktop',
        profileId: 'desktop_high',
        isSoftwareGl: false,
        textureRes: 768,
        pbrMapRes: 512,
        shadowMapSize: 1536,
        enableShadows: true,
        shadowRadius: 2.0,
        enablePostProcessing: false,
        bloomStrength: 0,
        bloomRadius: 0,
        bloomThreshold: 1,
        treeFoliageInstances: 64,
        cylinderSegments: 32,
        curveTubularSegments: 16,
        curveRadialSegments: 9,
        maxPixelRatio: 1.75,
        maxAnisotropy: 8,
        enableAntialias: true,
        usePhysicalMaterials: true,
        usePhysicalHeroAccentsOnly: false,
        enableFloorLightCulling: true,
        enableVolumetricSunbeams: true,
      };
    case 'desktop_balanced':
      return {
        tier: 'desktop',
        profileId: 'desktop_balanced',
        isSoftwareGl: false,
        textureRes: 512,
        pbrMapRes: 512,
        shadowMapSize: 1024,
        enableShadows: true,
        shadowRadius: 1.6,
        enablePostProcessing: false,
        bloomStrength: 0,
        bloomRadius: 0,
        bloomThreshold: 1,
        treeFoliageInstances: 52,
        cylinderSegments: 24,
        curveTubularSegments: 12,
        curveRadialSegments: 8,
        maxPixelRatio: 1.35,
        maxAnisotropy: 4,
        enableAntialias: false,
        usePhysicalMaterials: true,
        usePhysicalHeroAccentsOnly: true,
        enableFloorLightCulling: true,
        enableVolumetricSunbeams: true,
      };
    case 'desktop_performance':
      return {
        tier: 'tablet',
        profileId: 'desktop_performance',
        isSoftwareGl: false,
        textureRes: 512,
        pbrMapRes: 256,
        shadowMapSize: 512,
        enableShadows: true,
        shadowRadius: 1.2,
        enablePostProcessing: false,
        bloomStrength: 0,
        bloomRadius: 0,
        bloomThreshold: 1,
        treeFoliageInstances: 36,
        cylinderSegments: 20,
        curveTubularSegments: 10,
        curveRadialSegments: 7,
        maxPixelRatio: 1.0,
        maxAnisotropy: 2,
        enableAntialias: false,
        usePhysicalMaterials: false,
        usePhysicalHeroAccentsOnly: false,
        enableFloorLightCulling: true,
        enableVolumetricSunbeams: false,
      };
    case 'mobile_performance':
      return {
        tier: 'mobile',
        profileId: 'mobile_performance',
        isSoftwareGl: false,
        textureRes: 512,
        pbrMapRes: 256,
        shadowMapSize: 512,
        enableShadows: false,
        shadowRadius: 1.0,
        enablePostProcessing: false,
        bloomStrength: 0,
        bloomRadius: 0,
        bloomThreshold: 1,
        treeFoliageInstances: 30,
        cylinderSegments: 18,
        curveTubularSegments: 10,
        curveRadialSegments: 7,
        maxPixelRatio: 1.0,
        maxAnisotropy: 2,
        enableAntialias: false,
        usePhysicalMaterials: false,
        usePhysicalHeroAccentsOnly: false,
        enableFloorLightCulling: true,
        enableVolumetricSunbeams: false,
      };
    case 'mobile_balanced':
    default:
      return {
        tier: 'mobile',
        profileId: 'mobile_balanced',
        isSoftwareGl: false,
        textureRes: 512,
        pbrMapRes: 256,
        shadowMapSize: 512,
        enableShadows: true,
        shadowRadius: 1.4,
        enablePostProcessing: false,
        bloomStrength: 0,
        bloomRadius: 0,
        bloomThreshold: 1,
        treeFoliageInstances: 36,
        cylinderSegments: 20,
        curveTubularSegments: 10,
        curveRadialSegments: 7,
        maxPixelRatio: 1.35,
        maxAnisotropy: 4,
        enableAntialias: false,
        usePhysicalMaterials: true,
        usePhysicalHeroAccentsOnly: false,
        enableFloorLightCulling: false,
        enableVolumetricSunbeams: false,
      };
  }
}

/**
 * Computes an adaptive renderer pixel ratio that preserves the working mobile reference
 * while enforcing a desktop framebuffer pixel-count budget so high-resolution desktop
 * viewports (1080p/1440p/4K/Retina) do not rasterize 4M-7M pixels per frame.
 */
export function computeEffectivePixelRatio(params: {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  qualityConfig: VisualQualityConfig;
  isMobileDevice: boolean;
  isSoftwareGl: boolean;
}): number {
  const {
    viewportWidth,
    viewportHeight,
    devicePixelRatio,
    qualityConfig,
    isMobileDevice,
    isSoftwareGl,
  } = params;
  const safeDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const maxDpr = qualityConfig.maxPixelRatio;

  // Preserve the proven working mobile pixel-ratio behavior untouched
  if (isMobileDevice || qualityConfig.profileId?.startsWith('mobile_')) {
    return isSoftwareGl ? 1 : Math.min(safeDpr, maxDpr);
  }

  const area = Math.max(1, viewportWidth) * Math.max(1, viewportHeight);
  if (isSoftwareGl) {
    const budgetDpr = Math.sqrt(820_000 / area);
    return Number(Math.max(0.65, Math.min(1.0, budgetDpr)).toFixed(3));
  }

  const baseDpr = Math.min(safeDpr, maxDpr);
  let pixelBudget = 1_650_000;
  let minDpr = 0.85;
  if (qualityConfig.profileId === 'desktop_high') {
    pixelBudget = 2_600_000;
    minDpr = 1.0;
  } else if (qualityConfig.profileId === 'desktop_performance') {
    pixelBudget = 1_150_000;
    minDpr = 0.75;
  }

  const budgetDpr = Math.sqrt(pixelBudget / area);
  return Number(Math.max(minDpr, Math.min(baseDpr, budgetDpr)).toFixed(3));
}

/**
 * Returns minimum frame interval in ms for software WebGL fallback (e.g. SwiftShader)
 * so CPU-rasterized previews stay responsive instead of freezing the main thread at 100% CPU.
 */
export function getSoftwareGlFrameIntervalMs(
  isSoftwareGl: boolean,
  _profileId?: GraphicsProfileId,
): number {
  return isSoftwareGl ? 33 : 0;
}

/**
 * Rolling frame-time monitor for non-oscillating runtime adaptation across Desktop profiles
 * (and emergency step-down on struggling Mobile devices).
 */
export class AdaptiveGraphicsMonitor {
  private profileId: GraphicsProfileId;
  private readonly gpuTier: GpuCapabilityTier;
  private readonly isSoftwareGl: boolean;
  private readonly samples: number[] = [];
  private sampleSum = 0;
  private readonly windowSize = 60;
  private lastAdaptationTimeMs = 0;
  private hasSteppedDown = false;
  private consecutiveFastWindows = 0;
  private consecutiveSevereStalls = 0;

  constructor(
    initialProfileId: GraphicsProfileId,
    gpuTier: GpuCapabilityTier,
    isSoftwareGl: boolean,
  ) {
    this.profileId = initialProfileId;
    this.gpuTier = gpuTier;
    this.isSoftwareGl = isSoftwareGl;
  }

  get currentProfileId(): GraphicsProfileId {
    return this.profileId;
  }

  get currentConfig(): VisualQualityConfig {
    return getGraphicsProfileConfig(this.profileId);
  }

  get averageFrameMs(): number {
    if (this.samples.length === 0) return 16.67;
    return this.sampleSum / this.samples.length;
  }

  get estimatedFps(): number {
    const avg = this.averageFrameMs;
    return avg > 0 ? Math.min(240, Math.round(1000 / avg)) : 60;
  }

  private stepDown(nowMs: number): GraphicsProfileId | null {
    const isDesktop = this.profileId.startsWith('desktop_');
    this.consecutiveFastWindows = 0;
    this.consecutiveSevereStalls = 0;
    if (isDesktop && this.profileId === 'desktop_high') {
      this.profileId = 'desktop_balanced';
      this.hasSteppedDown = true;
      this.lastAdaptationTimeMs = nowMs;
      this.samples.length = 0;
      this.sampleSum = 0;
      return this.profileId;
    }
    if (isDesktop && this.profileId === 'desktop_balanced') {
      this.profileId = 'desktop_performance';
      this.hasSteppedDown = true;
      this.lastAdaptationTimeMs = nowMs;
      this.samples.length = 0;
      this.sampleSum = 0;
      return this.profileId;
    }
    if (!isDesktop && this.profileId === 'mobile_balanced') {
      this.profileId = 'mobile_performance';
      this.hasSteppedDown = true;
      this.lastAdaptationTimeMs = nowMs;
      this.samples.length = 0;
      this.sampleSum = 0;
      return this.profileId;
    }
    return null;
  }

  recordFrame(rawFrameMs: number, nowMs: number): GraphicsProfileId | null {
    if (!Number.isFinite(rawFrameMs) || rawFrameMs <= 0) {
      return null;
    }

    // Ignore multi-second background-tab resume pauses (> 2.5s), and ignore a single GC spike > 120ms,
    // but detect sustained severe desktop freezes (5+ consecutive frames > 120ms, i.e. < 8 FPS).
    if (rawFrameMs > 2500) {
      this.consecutiveSevereStalls = 0;
      return null;
    }
    if (rawFrameMs > 120) {
      this.consecutiveFastWindows = 0;
      this.consecutiveSevereStalls += 1;
      if (
        this.consecutiveSevereStalls >= 5 &&
        (this.lastAdaptationTimeMs === 0 || nowMs - this.lastAdaptationTimeMs >= 1500)
      ) {
        return this.stepDown(nowMs);
      }
      return null;
    }

    this.consecutiveSevereStalls = 0;
    this.samples.push(rawFrameMs);
    this.sampleSum += rawFrameMs;
    if (this.samples.length > this.windowSize) {
      this.sampleSum -= this.samples.shift()!;
    }
    if (this.samples.length < 45) return null;
    if (nowMs - this.lastAdaptationTimeMs < 3000) return null;

    const avgMs = this.averageFrameMs;
    const isDesktop = this.profileId.startsWith('desktop_');

    // Step down if sustained frame times fall below ~42 FPS (desktop) or ~33 FPS (mobile)
    if (isDesktop && avgMs > 23.5) {
      return this.stepDown(nowMs);
    } else if (!isDesktop && this.profileId === 'mobile_balanced' && avgMs > 30.0) {
      return this.stepDown(nowMs);
    } else if (
      isDesktop &&
      this.profileId === 'desktop_balanced' &&
      !this.hasSteppedDown &&
      !this.isSoftwareGl &&
      this.gpuTier === 'discrete_or_apple_silicon' &&
      avgMs < 13.5
    ) {
      this.consecutiveFastWindows += 1;
      if (this.consecutiveFastWindows >= 2) {
        this.profileId = 'desktop_high';
        this.lastAdaptationTimeMs = nowMs;
        this.samples.length = 0;
        this.sampleSum = 0;
        return this.profileId;
      }
    } else {
      this.consecutiveFastWindows = 0;
    }

    return null;
  }
}

/**
 * Legacy 3-tier helper preserved for API & test compatibility; also seeds new capability flags.
 */
export function getVisualQualityConfig(
  tier: DeviceQualityTier,
  isSoftwareGl: boolean,
): VisualQualityConfig {
  if (isSoftwareGl) {
    return {
      tier: 'mobile',
      profileId: 'mobile_performance',
      isSoftwareGl: true,
      textureRes: 512,
      pbrMapRes: 256,
      shadowMapSize: 512,
      enableShadows: false,
      shadowRadius: 1,
      enablePostProcessing: false,
      bloomStrength: 0,
      bloomRadius: 0,
      bloomThreshold: 1,
      treeFoliageInstances: 30,
      cylinderSegments: 18,
      curveTubularSegments: 10,
      curveRadialSegments: 7,
      maxPixelRatio: 1,
      maxAnisotropy: 2,
      enableAntialias: false,
      usePhysicalMaterials: false,
      usePhysicalHeroAccentsOnly: false,
      enableFloorLightCulling: true,
      enableVolumetricSunbeams: false,
    };
  }

  if (tier === 'mobile') {
    return getGraphicsProfileConfig('mobile_balanced');
  }

  if (tier === 'tablet') {
    return {
      tier: 'tablet',
      profileId: 'desktop_performance',
      isSoftwareGl: false,
      textureRes: 768,
      pbrMapRes: 512,
      shadowMapSize: 1024,
      enableShadows: true,
      shadowRadius: 2.0,
      enablePostProcessing: false,
      bloomStrength: 0,
      bloomRadius: 0,
      bloomThreshold: 1,
      treeFoliageInstances: 52,
      cylinderSegments: 28,
      curveTubularSegments: 14,
      curveRadialSegments: 8,
      maxPixelRatio: 1.5,
      maxAnisotropy: 4,
      enableAntialias: false,
      usePhysicalMaterials: true,
      usePhysicalHeroAccentsOnly: true,
      enableFloorLightCulling: true,
      enableVolumetricSunbeams: true,
    };
  }

  return {
    tier: 'desktop',
    profileId: 'desktop_high',
    isSoftwareGl: false,
    textureRes: 1024,
    pbrMapRes: 1024,
    shadowMapSize: 2048,
    enableShadows: true,
    shadowRadius: 2.8,
    enablePostProcessing: true,
    bloomStrength: 0.16,
    bloomRadius: 0.42,
    bloomThreshold: 0.91,
    treeFoliageInstances: 72,
    cylinderSegments: 40,
    curveTubularSegments: 18,
    curveRadialSegments: 10,
    maxPixelRatio: 2.0,
    maxAnisotropy: 8,
    enableAntialias: true,
    usePhysicalMaterials: true,
    usePhysicalHeroAccentsOnly: false,
    enableFloorLightCulling: true,
    enableVolumetricSunbeams: true,
  };
}

/**
 * Ensures a BufferGeometry has a `uv2` attribute (cloning `uv`) so Three.js `aoMap`
 * evaluates cleanly without warnings or missing attributes.
 */
export function ensureUv2Attribute<T extends THREE.BufferGeometry>(geometry: T): T {
  const uv = geometry.getAttribute('uv');
  if (uv && !geometry.getAttribute('uv2')) {
    geometry.setAttribute('uv2', uv.clone());
  }
  return geometry;
}

export interface AtriumPBRMapSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap?: THREE.CanvasTexture;
}

function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function finalizeColorTex(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function finalizeLinearTex(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates an exact UV-synchronized PBR texture set (`map`, `normalMap`, `roughnessMap`, `aoMap`)
 * for large-format staggered ashlar Roman travertine & Calacatta marble floors.
 * All 4 maps share identical `repeat.set(3.2, 3.2)` and staggered 4-course x 2-slab geometry so
 * mortar joints, bevel normals, and joint ambient occlusion align seamlessly with zero grid flicker.
 */
export function createSyncedTravertineFloorPBRSet(
  maxAnisotropy = 4,
  colorRes = 1024,
  pbrRes = 512,
): AtriumPBRMapSet {
  const cSize = Math.max(512, Math.min(1024, colorRes));
  const pSize = Math.max(256, Math.min(1024, pbrRes));

  const colorCanvas = makeCanvas(cSize);
  const normCanvas = makeCanvas(pSize);
  const roughCanvas = makeCanvas(pSize);
  const aoCanvas = makeCanvas(pSize);

  const cCtx = colorCanvas.getContext('2d');
  const nCtx = normCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');
  const aCtx = aoCanvas.getContext('2d');

  const courses = 4;
  const slabsPerCourse = 2;

  if (cCtx) {
    const courseH = cSize / courses;
    const slabW = cSize / slabsPerCourse;
    const slabTones = [
      '#F5EFE4',
      '#F0E7D9',
      '#F6F1E7',
      '#EEE5D6',
      '#F3ECE0',
      '#EFE6D7',
      '#F7F2E8',
      '#ECE3D4',
    ];

    for (let row = 0; row < courses; row++) {
      const sy = row * courseH;
      const staggerX = (row % 2) * (slabW * 0.5);
      for (let col = -1; col <= slabsPerCourse; col++) {
        const sx = col * slabW + staggerX;
        const toneIdx =
          (((row * 3 + col * 5) % slabTones.length) + slabTones.length) %
          slabTones.length;
        cCtx.fillStyle = slabTones[toneIdx];
        cCtx.fillRect(sx, sy, slabW, courseH);

        // Subtle stone block gradient sheen across each ashlar slab
        const slabGrad = cCtx.createLinearGradient(sx, sy, sx + slabW, sy + courseH);
        slabGrad.addColorStop(0, 'rgba(255, 253, 248, 0.14)');
        slabGrad.addColorStop(0.55, 'rgba(232, 219, 198, 0.04)');
        slabGrad.addColorStop(1, 'rgba(205, 187, 162, 0.12)');
        cCtx.fillStyle = slabGrad;
        cCtx.fillRect(sx, sy, slabW, courseH);

        // Soft warm limestone mortar seam + subtle highlight lip
        cCtx.strokeStyle = 'rgba(176, 156, 130, 0.25)';
        cCtx.lineWidth = Math.max(1.2, cSize / 640);
        cCtx.strokeRect(sx + 0.5, sy + 0.5, slabW - 1, courseH - 1);

        cCtx.strokeStyle = 'rgba(255, 253, 249, 0.34)';
        cCtx.lineWidth = 1;
        cCtx.beginPath();
        cCtx.moveTo(sx + 1.5, sy + 1.5);
        cCtx.lineTo(sx + slabW - 1.5, sy + 1.5);
        cCtx.stroke();
      }
    }

    // Organic mineral clouds breaking up large surface repetition
    for (let c = 0; c < 26; c++) {
      const cx = ((c * 173) % (cSize - 64)) + 32;
      const cy = ((c * 229) % (cSize - 64)) + 32;
      const rad = (cSize * 0.11) + (c % 5) * (cSize * 0.045);
      const cloud = cCtx.createRadialGradient(cx, cy, 8, cx, cy, rad);
      cloud.addColorStop(
        0,
        c % 2 === 0 ? 'rgba(216, 199, 174, 0.17)' : 'rgba(255, 252, 246, 0.22)',
      );
      cloud.addColorStop(1, 'rgba(244, 236, 224, 0)');
      cCtx.fillStyle = cloud;
      cCtx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }

    // Multi-scale Calacatta & travertine sedimentary mineral ribbons
    for (let i = 0; i < 76; i++) {
      const isWhiteVein = i % 3 === 0;
      const isFineGoldVein = i % 11 === 0;
      cCtx.strokeStyle = isFineGoldVein
        ? 'rgba(198, 160, 106, 0.15)'
        : isWhiteVein
          ? 'rgba(255, 253, 248, 0.42)'
          : 'rgba(182, 162, 136, 0.19)';
      cCtx.lineWidth = isFineGoldVein ? 0.9 : 0.7 + (i % 3) * 0.55;
      cCtx.beginPath();
      const startY = ((i * 29) % cSize);
      cCtx.moveTo(0, startY);
      cCtx.bezierCurveTo(
        cSize * 0.28 + Math.sin(i * 0.7) * cSize * 0.06,
        startY + Math.sin(i * 1.1) * cSize * 0.025,
        cSize * 0.68 - Math.cos(i * 0.9) * cSize * 0.06,
        startY - Math.cos(i * 0.8) * cSize * 0.025,
        cSize,
        startY + Math.sin(i * 0.5) * cSize * 0.015,
      );
      cCtx.stroke();
    }
  }

  // Roughness, Normal & Joint AO in identical staggered 4 x 2 ashlar layout
  const pCourseH = pSize / courses;
  const pSlabW = pSize / slabsPerCourse;

  if (rCtx) {
    rCtx.fillStyle = 'rgb(74, 74, 74)'; // honed stone sheen ~0.29 base
    rCtx.fillRect(0, 0, pSize, pSize);

    for (let row = 0; row < courses; row++) {
      const sy = row * pCourseH;
      const staggerX = (row % 2) * (pSlabW * 0.5);
      for (let col = -1; col <= slabsPerCourse; col++) {
        const sx = col * pSlabW + staggerX;
        const tone = 64 + (((row * 7 + col * 11) % 5 + 5) % 5) * 6;
        rCtx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
        rCtx.fillRect(sx, sy, pSlabW, pCourseH);

        rCtx.strokeStyle = 'rgb(154, 154, 154)'; // matte grout seams
        rCtx.lineWidth = Math.max(1.5, pSize / 340);
        rCtx.strokeRect(sx, sy, pSlabW, pCourseH);
      }
    }

    for (let c = 0; c < 18; c++) {
      const cx = ((c * 97) % (pSize - 24)) + 12;
      const cy = ((c * 131) % (pSize - 24)) + 12;
      const rad = pSize * 0.13;
      const grad = rCtx.createRadialGradient(cx, cy, 4, cx, cy, rad);
      grad.addColorStop(
        0,
        c % 2 === 0 ? 'rgba(104, 104, 104, 0.28)' : 'rgba(52, 52, 52, 0.28)',
      );
      grad.addColorStop(1, 'rgba(74, 74, 74, 0)');
      rCtx.fillStyle = grad;
      rCtx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
  }

  if (nCtx) {
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, pSize, pSize);

    const bevel = Math.max(1.5, pSize / 320);
    for (let row = 0; row < courses; row++) {
      const sy = row * pCourseH;
      const staggerX = (row % 2) * (pSlabW * 0.5);

      // Horizontal ashlar joint bevel
      nCtx.fillStyle = 'rgb(128, 146, 255)';
      nCtx.fillRect(0, Math.max(0, sy - bevel), pSize, bevel);
      nCtx.fillStyle = 'rgb(128, 110, 255)';
      nCtx.fillRect(0, sy, pSize, bevel);

      // Staggered vertical ashlar joint bevels
      for (let col = -1; col <= slabsPerCourse; col++) {
        const sx = col * pSlabW + staggerX;
        nCtx.fillStyle = 'rgb(110, 128, 255)';
        nCtx.fillRect(sx - bevel, sy, bevel, pCourseH);
        nCtx.fillStyle = 'rgb(146, 128, 255)';
        nCtx.fillRect(sx, sy, bevel, pCourseH);
      }
    }

    // Fine stone crystalline vein relief
    nCtx.strokeStyle = 'rgba(136, 134, 255, 0.36)';
    nCtx.lineWidth = Math.max(1, pSize / 512);
    for (let i = 0; i < 36; i++) {
      nCtx.beginPath();
      const sy = (i * 37) % pSize;
      nCtx.moveTo(0, sy);
      nCtx.quadraticCurveTo(
        pSize * 0.5,
        sy + ((i % 7) - 3) * (pSize * 0.025),
        pSize,
        (sy + 18) % pSize,
      );
      nCtx.stroke();
    }
  }

  if (aCtx) {
    aCtx.fillStyle = 'rgb(252, 252, 252)';
    aCtx.fillRect(0, 0, pSize, pSize);
    aCtx.strokeStyle = 'rgb(212, 212, 212)';
    aCtx.lineWidth = Math.max(2, pSize / 256);
    for (let row = 0; row < courses; row++) {
      const sy = row * pCourseH;
      const staggerX = (row % 2) * (pSlabW * 0.5);
      for (let col = -1; col <= slabsPerCourse; col++) {
        const sx = col * pSlabW + staggerX;
        aCtx.strokeRect(sx, sy, pSlabW, pCourseH);
      }
    }
  }

  return {
    map: finalizeColorTex(colorCanvas, 3.2, 3.2, maxAnisotropy),
    normalMap: finalizeLinearTex(normCanvas, 3.2, 3.2, maxAnisotropy),
    roughnessMap: finalizeLinearTex(roughCanvas, 3.2, 3.2, maxAnisotropy),
    aoMap: finalizeLinearTex(aoCanvas, 3.2, 3.2, maxAnisotropy),
  };
}

/**
 * Generates radial honed travertine & limestone mosaic maps for the central Atrium floor medallion.
 */
export function createParterreMedallionMaps(
  maxAnisotropy = 4,
  res = 512,
): AtriumPBRMapSet {
  const size = Math.max(256, Math.min(1024, res));
  const cCanvas = makeCanvas(size);
  const nCanvas = makeCanvas(size);
  const rCanvas = makeCanvas(size);

  const cCtx = cCanvas.getContext('2d');
  const nCtx = nCanvas.getContext('2d');
  const rCtx = rCanvas.getContext('2d');
  const cx = size * 0.5;
  const cy = size * 0.5;

  if (cCtx) {
    const g = cCtx.createRadialGradient(cx, cy, size * 0.14, cx, cy, size * 0.5);
    g.addColorStop(0, '#EDE1CD');
    g.addColorStop(0.55, '#E4D5BE');
    g.addColorStop(1, '#DFCEB4');
    cCtx.fillStyle = g;
    cCtx.fillRect(0, 0, size, size);

    // Subtle concentric mosaic borders & radial hairline joints
    cCtx.strokeStyle = 'rgba(164, 140, 108, 0.28)';
    cCtx.lineWidth = Math.max(1.2, size / 380);
    [0.24, 0.34, 0.44].forEach((rFrac) => {
      cCtx.beginPath();
      cCtx.arc(cx, cy, size * rFrac, 0, Math.PI * 2);
      cCtx.stroke();
    });

    for (let s = 0; s < 24; s++) {
      const a = (s / 24) * Math.PI * 2;
      cCtx.beginPath();
      cCtx.moveTo(cx + Math.cos(a) * size * 0.2, cy + Math.sin(a) * size * 0.2);
      cCtx.lineTo(cx + Math.cos(a) * size * 0.48, cy + Math.sin(a) * size * 0.48);
      cCtx.stroke();
    }
  }

  if (rCtx) {
    rCtx.fillStyle = 'rgb(96, 96, 96)';
    rCtx.fillRect(0, 0, size, size);
    rCtx.strokeStyle = 'rgb(148, 148, 148)';
    rCtx.lineWidth = Math.max(1.2, size / 380);
    [0.24, 0.34, 0.44].forEach((rFrac) => {
      rCtx.beginPath();
      rCtx.arc(cx, cy, size * rFrac, 0, Math.PI * 2);
      rCtx.stroke();
    });
  }

  if (nCtx) {
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, size, size);
    nCtx.strokeStyle = 'rgb(138, 138, 255)';
    nCtx.lineWidth = Math.max(1.4, size / 360);
    [0.24, 0.34, 0.44].forEach((rFrac) => {
      nCtx.beginPath();
      nCtx.arc(cx, cy, size * rFrac, 0, Math.PI * 2);
      nCtx.stroke();
    });
  }

  return {
    map: finalizeColorTex(cCanvas, 1, 1, maxAnisotropy),
    normalMap: finalizeLinearTex(nCanvas, 1, 1, maxAnisotropy),
    roughnessMap: finalizeLinearTex(rCanvas, 1, 1, maxAnisotropy),
  };
}

/**
 * Generates directional micro-brushed normal & roughness maps for champagne brass and bronze.
 * Eliminates flat uniform metallic shader appearance cleanly on WebGL.
 */
export function createBrushedMetalPBRMaps(
  maxAnisotropy = 4,
  res = 512,
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = Math.max(256, Math.min(512, res));
  const rCanvas = makeCanvas(size);
  const nCanvas = makeCanvas(size);

  const rCtx = rCanvas.getContext('2d');
  const nCtx = nCanvas.getContext('2d');

  if (rCtx) {
    rCtx.fillStyle = 'rgb(76, 76, 76)';
    rCtx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 2) {
      const v = 56 + ((y * 19 + ((y * 7) % 13)) % 42);
      rCtx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.55)`;
      rCtx.fillRect(0, y, size, 1);
    }
  }

  if (nCtx) {
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 2) {
      const ny = 122 + ((y * 17) % 13);
      nCtx.fillStyle = `rgba(128, ${ny}, 255, 0.55)`;
      nCtx.fillRect(0, y, size, 1);
    }
  }

  return {
    normalMap: finalizeLinearTex(nCanvas, 2, 2, maxAnisotropy),
    roughnessMap: finalizeLinearTex(rCanvas, 2, 2, maxAnisotropy),
  };
}

/**
 * Generates an organic sculpted walnut-bark PBR texture set for the Central Atrium Tree,
 * distinct from glossy architectural wainscoting wood.
 */
export function createOrganicTreeBarkPBRSet(
  maxAnisotropy = 4,
  res = 512,
): AtriumPBRMapSet {
  const size = Math.max(256, Math.min(1024, res));
  const cCanvas = makeCanvas(size);
  const nCanvas = makeCanvas(size);
  const rCanvas = makeCanvas(size);

  const cCtx = cCanvas.getContext('2d');
  const nCtx = nCanvas.getContext('2d');
  const rCtx = rCanvas.getContext('2d');

  if (cCtx) {
    const grad = cCtx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0, '#523C2C');
    grad.addColorStop(0.5, '#624836');
    grad.addColorStop(1, '#4C3728');
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, size, size);

    for (let i = 0; i < 84; i++) {
      const x = (i / 84) * size;
      const isDeepFurrow = i % 3 === 0;
      cCtx.strokeStyle = isDeepFurrow
        ? 'rgba(34, 22, 14, 0.44)'
        : i % 2 === 0
          ? 'rgba(132, 98, 70, 0.25)'
          : 'rgba(66, 46, 32, 0.34)';
      cCtx.lineWidth = isDeepFurrow ? 2.4 : 1.3;
      cCtx.beginPath();
      cCtx.moveTo(x, 0);
      const w1 = Math.sin(i * 0.85) * (size * 0.025);
      const w2 = Math.cos(i * 0.63) * (size * 0.025);
      cCtx.bezierCurveTo(x + w1, size * 0.33, x - w2, size * 0.67, x, size);
      cCtx.stroke();
    }
  }

  if (rCtx) {
    rCtx.fillStyle = 'rgb(184, 184, 184)'; // warm matte-satin organic bark ~0.72
    rCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 84; i++) {
      const x = (i / 84) * size;
      rCtx.strokeStyle =
        i % 3 === 0 ? 'rgba(220, 220, 220, 0.55)' : 'rgba(140, 140, 140, 0.45)';
      rCtx.lineWidth = 2.0;
      rCtx.beginPath();
      cCtx && rCtx.moveTo(x, 0);
      const w1 = Math.sin(i * 0.85) * (size * 0.025);
      const w2 = Math.cos(i * 0.63) * (size * 0.025);
      rCtx.bezierCurveTo(x + w1, size * 0.33, x - w2, size * 0.67, x, size);
      rCtx.stroke();
    }
  }

  if (nCtx) {
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 84; i++) {
      const x = (i / 84) * size;
      nCtx.strokeStyle =
        i % 2 === 0 ? 'rgba(156, 128, 255, 0.55)' : 'rgba(100, 128, 255, 0.55)';
      nCtx.lineWidth = 2.2;
      nCtx.beginPath();
      nCtx.moveTo(x, 0);
      const w1 = Math.sin(i * 0.85) * (size * 0.025);
      const w2 = Math.cos(i * 0.63) * (size * 0.025);
      nCtx.bezierCurveTo(x + w1, size * 0.33, x - w2, size * 0.67, x, size);
      nCtx.stroke();
    }
  }

  return {
    map: finalizeColorTex(cCanvas, 2, 3, maxAnisotropy),
    normalMap: finalizeLinearTex(nCanvas, 2, 3, maxAnisotropy),
    roughnessMap: finalizeLinearTex(rCanvas, 2, 3, maxAnisotropy),
  };
}

/**
 * Generates botanical leaf-cluster mottled PBR maps for tree & planter canopies.
 */
export function createBotanicalCanopyPBRSet(
  maxAnisotropy = 4,
  res = 256,
): AtriumPBRMapSet {
  const size = Math.max(128, Math.min(512, res));
  const cCanvas = makeCanvas(size);
  const nCanvas = makeCanvas(size);
  const rCanvas = makeCanvas(size);

  const cCtx = cCanvas.getContext('2d');
  const nCtx = nCanvas.getContext('2d');
  const rCtx = rCanvas.getContext('2d');

  if (cCtx) {
    cCtx.fillStyle = '#9DAE8F';
    cCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 160; i++) {
      const x = ((i * 53) % (size - 16)) + 8;
      const y = ((i * 89) % (size - 16)) + 8;
      const rx = 6 + (i % 5) * 2.5;
      const ry = 3 + (i % 4) * 1.5;
      const rot = ((i * 37) % 314) / 100;
      cCtx.save();
      cCtx.translate(x, y);
      cCtx.rotate(rot);
      cCtx.fillStyle =
        i % 3 === 0
          ? 'rgba(210, 224, 185, 0.52)'
          : i % 2 === 0
            ? 'rgba(116, 134, 102, 0.58)'
            : 'rgba(84, 100, 72, 0.45)';
      cCtx.beginPath();
      cCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      cCtx.fill();
      cCtx.restore();
    }
  }

  if (rCtx) {
    rCtx.fillStyle = 'rgb(148, 148, 148)';
    rCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 120; i++) {
      const x = ((i * 53) % (size - 16)) + 8;
      const y = ((i * 89) % (size - 16)) + 8;
      rCtx.fillStyle = i % 2 === 0 ? 'rgba(115, 115, 115, 0.45)' : 'rgba(182, 182, 182, 0.45)';
      rCtx.beginPath();
      rCtx.arc(x, y, 5 + (i % 4) * 2, 0, Math.PI * 2);
      rCtx.fill();
    }
  }

  if (nCtx) {
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 140; i++) {
      const x = ((i * 53) % (size - 16)) + 8;
      const y = ((i * 89) % (size - 16)) + 8;
      nCtx.fillStyle =
        i % 2 === 0 ? 'rgba(150, 142, 255, 0.5)' : 'rgba(106, 116, 255, 0.5)';
      nCtx.beginPath();
      nCtx.arc(x, y, 4 + (i % 4) * 1.8, 0, Math.PI * 2);
      nCtx.fill();
    }
  }

  return {
    map: finalizeColorTex(cCanvas, 2, 2, maxAnisotropy),
    normalMap: finalizeLinearTex(nCanvas, 2, 2, maxAnisotropy),
    roughnessMap: finalizeLinearTex(rCanvas, 2, 2, maxAnisotropy),
  };
}

/**
 * Generates tailored wool-twill weave normal & roughness maps for the Explorer character coat.
 */
export function createTailoredFabricPBRMaps(
  maxAnisotropy = 4,
  res = 256,
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = Math.max(128, Math.min(256, res));
  const nCanvas = makeCanvas(size);
  const rCanvas = makeCanvas(size);
  const nCtx = nCanvas.getContext('2d');
  const rCtx = rCanvas.getContext('2d');

  if (nCtx) {
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      nCtx.strokeStyle = y % 8 === 0 ? 'rgba(144, 132, 255, 0.45)' : 'rgba(112, 124, 255, 0.45)';
      nCtx.lineWidth = 1.5;
      nCtx.beginPath();
      nCtx.moveTo(0, y);
      nCtx.lineTo(size, y);
      nCtx.stroke();
    }
    for (let x = 0; x < size; x += 4) {
      nCtx.strokeStyle = x % 8 === 0 ? 'rgba(136, 142, 255, 0.35)' : 'rgba(120, 114, 255, 0.35)';
      nCtx.lineWidth = 1.2;
      nCtx.beginPath();
      nCtx.moveTo(x, 0);
      nCtx.lineTo(x, size);
      nCtx.stroke();
    }
  }

  if (rCtx) {
    rCtx.fillStyle = 'rgb(176, 176, 176)'; // tailored wool ~0.69 roughness
    rCtx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      rCtx.fillStyle = y % 8 === 0 ? 'rgba(196, 196, 196, 0.4)' : 'rgba(154, 154, 154, 0.4)';
      rCtx.fillRect(0, y, size, 2);
    }
  }

  return {
    normalMap: finalizeLinearTex(nCanvas, 5, 5, maxAnisotropy),
    roughnessMap: finalizeLinearTex(rCanvas, 5, 5, maxAnisotropy),
  };
}

/**
 * Generates a subtle warm architectural pebble & moss garden bed texture for the tree plinth.
 */
export function createMossAndPebbleBedTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#4B5B41';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 120; i++) {
      const x = ((i * 61) % (size - 16)) + 8;
      const y = ((i * 97) % (size - 16)) + 8;
      const r = 3 + (i % 5) * 2.2;
      ctx.fillStyle =
        i % 4 === 0
          ? 'rgba(148, 134, 112, 0.55)' // smooth river pebble
          : i % 2 === 0
            ? 'rgba(116, 135, 92, 0.65)'
            : 'rgba(64, 78, 52, 0.55)';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.78, (i * 0.5) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return finalizeColorTex(c, 2, 2, maxAnisotropy);
}

/**
 * Generates an exact UV-synchronized PBR texture set (`map`, `normalMap`, `roughnessMap`, `aoMap`)
 * for warm honey-oak & satin-walnut wide-plank parquet floors inside exhibition rooms.
 */
export function createWarmParquetFloorPBRSet(
  maxAnisotropy = 4,
  colorRes = 256,
  pbrRes = 256,
): AtriumPBRMapSet {
  const cSize = Math.max(128, Math.min(256, colorRes));
  const pSize = Math.max(128, Math.min(256, pbrRes));

  const colorCanvas = makeCanvas(cSize);
  const normCanvas = makeCanvas(pSize);
  const roughCanvas = makeCanvas(pSize);
  const aoCanvas = makeCanvas(pSize);

  const cCtx = colorCanvas.getContext('2d');
  const nCtx = normCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');
  const aCtx = aoCanvas.getContext('2d');

  const plankRows = 12;
  const plankCols = 6;

  if (cCtx) {
    const baseGrad = cCtx.createLinearGradient(0, 0, cSize, cSize);
    baseGrad.addColorStop(0, '#9E6B43');
    baseGrad.addColorStop(0.5, '#94623B');
    baseGrad.addColorStop(1, '#8B5A35');
    cCtx.fillStyle = baseGrad;
    cCtx.fillRect(0, 0, cSize, cSize);

    const rowH = cSize / plankRows;
    const colW = cSize / plankCols;
    const woodTones = [
      '#A6734A',
      '#98663E',
      '#AD7B52',
      '#8E5D37',
      '#A16E45',
      '#93613A',
      '#AA774E',
      '#9C6A42',
    ];

    for (let r = 0; r < plankRows; r++) {
      const stagger = ((r * 37) % 3) * (colW * 0.33);
      for (let c = -1; c <= plankCols; c++) {
        const x = c * colW + stagger;
        const y = r * rowH;
        const toneIdx =
          Math.abs(r * 5 + c * 3 + ((r * c) % 4)) % woodTones.length;
        const grad = cCtx.createLinearGradient(x, y, x + colW, y + rowH);
        grad.addColorStop(0, woodTones[toneIdx]);
        grad.addColorStop(0.5, '#A37046');
        grad.addColorStop(1, woodTones[(toneIdx + 2) % woodTones.length]);
        cCtx.fillStyle = grad;
        cCtx.fillRect(x, y, colW, rowH);

        cCtx.strokeStyle =
          (r + c) % 2 === 0
            ? 'rgba(58, 34, 16, 0.14)'
            : 'rgba(228, 184, 134, 0.13)';
        cCtx.lineWidth = Math.max(1.0, cSize / 850);
        for (let g = 0; g < 6; g++) {
          const gy = y + ((g + 0.5) / 6) * rowH;
          cCtx.beginPath();
          cCtx.moveTo(x + 3, gy);
          cCtx.bezierCurveTo(
            x + colW * 0.33,
            gy + Math.sin(r + g + c * 0.5) * (cSize / 320),
            x + colW * 0.66,
            gy - Math.cos(c + g + r * 0.4) * (cSize / 320),
            x + colW - 3,
            gy,
          );
          cCtx.stroke();
        }

        cCtx.strokeStyle = 'rgba(54, 32, 16, 0.24)';
        cCtx.lineWidth = Math.max(1.1, cSize / 760);
        cCtx.strokeRect(x + 0.5, y + 0.5, colW - 1, rowH - 1);
      }
    }
  }

  const pRowH = pSize / plankRows;
  const pColW = pSize / plankCols;

  if (rCtx) {
    rCtx.fillStyle = 'rgb(84, 84, 84)'; // satin oiled oak ~0.33 base
    rCtx.fillRect(0, 0, pSize, pSize);
    for (let r = 0; r < plankRows; r++) {
      const stagger = ((r * 37) % 3) * (pColW * 0.33);
      for (let c = -1; c <= plankCols; c++) {
        const x = c * pColW + stagger;
        const y = r * pRowH;
        const tone = 72 + (((r * 7 + c * 5) % 5 + 5) % 5) * 6;
        rCtx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
        rCtx.fillRect(x, y, pColW, pRowH);

        rCtx.strokeStyle = 'rgb(148, 148, 148)'; // matte bevel seam
        rCtx.lineWidth = Math.max(1.2, pSize / 360);
        rCtx.strokeRect(x, y, pColW, pRowH);
      }
    }
  }

  if (nCtx) {
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, pSize, pSize);
    const bevel = Math.max(1.2, pSize / 360);
    for (let r = 0; r < plankRows; r++) {
      const y = r * pRowH;
      const stagger = ((r * 37) % 3) * (pColW * 0.33);
      nCtx.fillStyle = 'rgb(128, 144, 255)';
      nCtx.fillRect(0, Math.max(0, y - bevel), pSize, bevel);
      nCtx.fillStyle = 'rgb(128, 112, 255)';
      nCtx.fillRect(0, y, pSize, bevel);

      for (let c = -1; c <= plankCols; c++) {
        const x = c * pColW + stagger;
        nCtx.fillStyle = 'rgb(112, 128, 255)';
        nCtx.fillRect(x - bevel, y, bevel, pRowH);
        nCtx.fillStyle = 'rgb(144, 128, 255)';
        nCtx.fillRect(x, y, bevel, pRowH);
      }
    }
  }

  if (aCtx) {
    aCtx.fillStyle = 'rgb(252, 252, 252)';
    aCtx.fillRect(0, 0, pSize, pSize);
    aCtx.strokeStyle = 'rgb(214, 214, 214)';
    aCtx.lineWidth = Math.max(1.5, pSize / 300);
    for (let r = 0; r < plankRows; r++) {
      const y = r * pRowH;
      const stagger = ((r * 37) % 3) * (pColW * 0.33);
      for (let c = -1; c <= plankCols; c++) {
        const x = c * pColW + stagger;
        aCtx.strokeRect(x, y, pColW, pRowH);
      }
    }
  }

  return {
    map: finalizeColorTex(colorCanvas, 2.5, 2.5, maxAnisotropy),
    normalMap: finalizeLinearTex(normCanvas, 2.5, 2.5, maxAnisotropy),
    roughnessMap: finalizeLinearTex(roughCanvas, 2.5, 2.5, maxAnisotropy),
    aoMap: finalizeLinearTex(aoCanvas, 2.5, 2.5, maxAnisotropy),
  };
}

export interface SharedMuseumMaterialMaps {
  travertineFloor: AtriumPBRMapSet;
  parquetFloor: AtriumPBRMapSet;
  limestoneTex: THREE.CanvasTexture;
  limestoneNormalMap: THREE.CanvasTexture;
  limestoneRoughnessMap: THREE.CanvasTexture;
  walnutTex: THREE.CanvasTexture;
  woodNormalMap: THREE.CanvasTexture;
  woodRoughnessMap: THREE.CanvasTexture;
  brushedMetalNormalMap: THREE.CanvasTexture;
  brushedMetalRoughnessMap: THREE.CanvasTexture;
  barkPBR: AtriumPBRMapSet;
  canopyPBR: AtriumPBRMapSet;
  fabricNormalMap: THREE.CanvasTexture;
  fabricRoughnessMap: THREE.CanvasTexture;
  mossBedTex: THREE.CanvasTexture;
  boucleTex: THREE.CanvasTexture;
}

export type AtriumMoodId = 'golden_hour' | 'daylight_salon' | 'evening_nocturne';

export interface RoomLightingRigTargets {
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  centerColorHex: string;
  centerIntensity: number;
  northColorHex: string;
  northIntensity: number;
  sideWashIntensity: number;
  southEntryIntensity: number;
}

/**
 * Returns unified gallery lighting targets across room atmosphere presets & optional Atrium mood
 * so transitioning from Atrium to Room maintains consistent exposure & warmth without clobbering presets.
 */
export function computeRoomLightingRigTargets(
  presetId: AtmospherePresetId,
  atriumMood: AtriumMoodId = 'golden_hour',
): RoomLightingRigTargets {
  const moodScale =
    atriumMood === 'daylight_salon'
      ? 1.06
      : atriumMood === 'evening_nocturne'
        ? 0.9
        : 1.0;

  if (presetId === 'morning_sunlight') {
    return {
      hemiSkyHex: '#FFFDF6',
      hemiGroundHex: '#E8DCC8',
      hemiIntensity: 0.9 * moodScale,
      centerColorHex: '#FFF8E7',
      centerIntensity: 2.48 * moodScale,
      northColorHex: '#FFF6E0',
      northIntensity: 1.98 * moodScale,
      sideWashIntensity: 1.32 * moodScale,
      southEntryIntensity: 1.48 * moodScale,
    };
  }
  if (presetId === 'night_starlight') {
    return {
      hemiSkyHex: '#7DA4D9',
      hemiGroundHex: '#1E293B',
      hemiIntensity: 0.44,
      centerColorHex: '#9CC2FF',
      centerIntensity: 1.48,
      northColorHex: '#7FA6E8',
      northIntensity: 1.28,
      sideWashIntensity: 0.85,
      southEntryIntensity: 1.15,
    };
  }
  if (presetId === 'rainy_window') {
    return {
      hemiSkyHex: '#B4C8DC',
      hemiGroundHex: '#3E4C59',
      hemiIntensity: 0.56,
      centerColorHex: '#FFE0B2',
      centerIntensity: 1.95,
      northColorHex: '#C9DCF0',
      northIntensity: 1.46,
      sideWashIntensity: 1.05,
      southEntryIntensity: 1.25,
    };
  }
  // Default: golden_hour (harmonized directly with Atrium's Golden Hour rig)
  return {
    hemiSkyHex: '#FFE4B8',
    hemiGroundHex: '#7D583A',
    hemiIntensity: 0.74 * moodScale,
    centerColorHex: '#FFCE84',
    centerIntensity: 2.38 * moodScale,
    northColorHex: '#FFD699',
    northIntensity: 1.88 * moodScale,
    sideWashIntensity: 1.26 * moodScale,
    southEntryIntensity: 1.45 * moodScale,
  };
}

/**
 * V1-a Architectural LatheGeometry Builders for Columns, Balusters & Planter Urns
 */
export function createProfiledColumnBaseLatheGeometry(
  radius = 0.34,
  height = 0.24,
  segments = 24,
): THREE.LatheGeometry {
  const halfH = height * 0.5;
  const pts = [
    new THREE.Vector2(0.01, -halfH),
    new THREE.Vector2(radius * 1.35, -halfH),
    new THREE.Vector2(radius * 1.35, -halfH + height * 0.28),
    new THREE.Vector2(radius * 1.28, -halfH + height * 0.34),
    // Lower torus
    new THREE.Vector2(radius * 1.32, -halfH + height * 0.48),
    new THREE.Vector2(radius * 1.22, -halfH + height * 0.6),
    // Concave scotia recess
    new THREE.Vector2(radius * 1.12, -halfH + height * 0.72),
    // Upper torus & fillet
    new THREE.Vector2(radius * 1.18, -halfH + height * 0.86),
    new THREE.Vector2(radius * 1.03, halfH),
  ];
  const geo = ensureUv2Attribute(
    new THREE.LatheGeometry(pts, Math.max(16, segments)),
  );
  geo.computeVertexNormals();
  return geo;
}

export function createProfiledColumnShaftLatheGeometry(
  baseRadius = 0.34,
  topRadius = 0.31,
  height = 4.18,
  segments = 24,
): THREE.LatheGeometry {
  const halfH = height * 0.5;
  const steps = 10;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = -halfH + t * height;
    // Classical entasis curve: slight convex swell around 1/3 height, tapering cleanly to top necking
    const entasis = Math.sin(t * Math.PI) * 0.014;
    let r = THREE.MathUtils.lerp(baseRadius, topRadius, Math.pow(t, 1.15)) + entasis;
    if (i === 0) r = baseRadius * 1.03;
    if (i === steps) r = topRadius * 1.04;
    pts.push(new THREE.Vector2(r, y));
  }
  const geo = ensureUv2Attribute(
    new THREE.LatheGeometry(pts, Math.max(16, segments)),
  );
  // Subtle classical architectural fluting along shaft middle section
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const normY = (py + halfH) / height;
    if (normY > 0.06 && normY < 0.94) {
      const angle = Math.atan2(pz, px);
      const rad = Math.hypot(px, pz);
      if (rad > 0.02) {
        const fluteFade = Math.sin(
          ((normY - 0.06) / 0.88) * Math.PI,
        );
        const flute = Math.cos(angle * 16) * 0.0065 * fluteFade;
        const scale = (rad - Math.max(0, flute)) / rad;
        pos.setXYZ(i, px * scale, py, pz * scale);
      }
    }
  }
  geo.computeVertexNormals();
  return geo;
}

export function createProfiledColumnCapitalLatheGeometry(
  topRadius = 0.31,
  height = 0.24,
  segments = 24,
): THREE.LatheGeometry {
  const halfH = height * 0.5;
  const pts = [
    new THREE.Vector2(topRadius * 1.02, -halfH),
    // Astragal necking ring
    new THREE.Vector2(topRadius * 1.1, -halfH + height * 0.16),
    new THREE.Vector2(topRadius * 1.04, -halfH + height * 0.28),
    // Echinus ovolo curve
    new THREE.Vector2(topRadius * 1.18, -halfH + height * 0.52),
    new THREE.Vector2(topRadius * 1.34, -halfH + height * 0.74),
    // Stepped abacus crown
    new THREE.Vector2(topRadius * 1.42, -halfH + height * 0.82),
    new THREE.Vector2(topRadius * 1.42, halfH),
    new THREE.Vector2(0.01, halfH),
  ];
  const geo = ensureUv2Attribute(
    new THREE.LatheGeometry(pts, Math.max(16, segments)),
  );
  geo.computeVertexNormals();
  return geo;
}

export function createProfiledPlanterUrnLatheGeometry(
  segments = 24,
): THREE.LatheGeometry {
  // Total height = 0.82m (y = -0.41 .. +0.41) matching original planter pot height
  const pts = [
    new THREE.Vector2(0.01, -0.41),
    new THREE.Vector2(0.34, -0.41),
    new THREE.Vector2(0.34, -0.34),
    new THREE.Vector2(0.26, -0.27),
    new THREE.Vector2(0.28, -0.18),
    new THREE.Vector2(0.35, -0.02),
    new THREE.Vector2(0.4, 0.18),
    new THREE.Vector2(0.41, 0.31),
    new THREE.Vector2(0.44, 0.36),
    new THREE.Vector2(0.44, 0.41),
    new THREE.Vector2(0.38, 0.41),
  ];
  const geo = ensureUv2Attribute(
    new THREE.LatheGeometry(pts, Math.max(16, segments)),
  );
  geo.computeVertexNormals();
  return geo;
}

export function createProfiledBalusterLatheGeometry(
  height = 0.82,
  segments = 14,
): THREE.LatheGeometry {
  const halfH = height * 0.5;
  const pts = [
    new THREE.Vector2(0.036, -halfH),
    new THREE.Vector2(0.036, -halfH + height * 0.12),
    new THREE.Vector2(0.022, -halfH + height * 0.22),
    new THREE.Vector2(0.034, -halfH + height * 0.38),
    new THREE.Vector2(0.03, -halfH + height * 0.54),
    new THREE.Vector2(0.018, -halfH + height * 0.74),
    new THREE.Vector2(0.028, -halfH + height * 0.88),
    new THREE.Vector2(0.034, halfH),
  ];
  const geo = ensureUv2Attribute(
    new THREE.LatheGeometry(pts, Math.max(10, segments)),
  );
  geo.computeVertexNormals();
  return geo;
}

/**
 * V1-c Volumetric-Looking Golden Skylight Sunbeam Shafts
 * Creates soft, edge-feathered translucent light shafts descending from the top oculus
 * into the central lightwell toward the tree canopy.
 */
export function createVolumetricSunbeamShafts(params: {
  quality: VisualQualityConfig;
  totalHeight: number;
  trackDynamic: <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(
    asset: T,
  ) => T;
}): {
  group: THREE.Group;
  materials: THREE.MeshBasicMaterial[];
} {
  const { quality, totalHeight, trackDynamic } = params;
  const group = new THREE.Group();
  const materials: THREE.MeshBasicMaterial[] = [];

  if (quality.enableVolumetricSunbeams === false || quality.tier === 'mobile' || quality.isSoftwareGl) {
    return { group, materials };
  }

  // Create a vertical + radial alpha-feathered canvas texture so sunbeam cones have zero hard edges
  let beamTex: THREE.CanvasTexture | null = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const vGrad = ctx.createLinearGradient(0, 0, 0, 256);
      vGrad.addColorStop(0.0, 'rgba(255, 246, 224, 0.0)');
      vGrad.addColorStop(0.14, 'rgba(255, 244, 216, 0.52)');
      vGrad.addColorStop(0.55, 'rgba(255, 236, 196, 0.28)');
      vGrad.addColorStop(0.88, 'rgba(246, 222, 178, 0.08)');
      vGrad.addColorStop(1.0, 'rgba(246, 222, 178, 0.0)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, 128, 256);
    }
    beamTex = trackDynamic(new THREE.CanvasTexture(canvas));
    beamTex.colorSpace = THREE.SRGBColorSpace;
  }

  const shaftHeight = Math.max(5.2, totalHeight - 2.6);
  const shaftSpecs = [
    { topR: 1.15, botR: 2.05, tiltX: -0.045, tiltZ: 0.02, opacity: 0.055 },
    { topR: 0.72, botR: 1.48, tiltX: -0.03, tiltZ: -0.025, opacity: 0.045 },
  ];

  shaftSpecs.forEach((spec, idx) => {
    const coneGeo = trackDynamic(
      new THREE.CylinderGeometry(
        spec.topR,
        spec.botR,
        shaftHeight,
        24,
        1,
        true,
      ),
    );
    const mat = trackDynamic(
      new THREE.MeshBasicMaterial({
        color: 0xffefd2,
        ...(beamTex ? { map: beamTex } : {}),
        transparent: true,
        opacity: spec.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    materials.push(mat);
    const mesh = new THREE.Mesh(coneGeo, mat);
    // Align between top oculus (z = 1.8) and ground tree canopy (z = 0)
    mesh.position.set(
      idx === 0 ? -0.12 : 0.14,
      totalHeight - shaftHeight * 0.5 - 0.15,
      0.9,
    );
    mesh.rotation.set(spec.tiltX, idx * 0.8, spec.tiltZ);
    mesh.renderOrder = 2;
    group.add(mesh);
  });

  return { group, materials };
}

/**
 * Builds the Stage 01 / V1-b refined Central Atrium Tree & Architectural Plinth inside `centerpieceGroup`,
 * strictly preserving:
 * - Analytical ground plinth collider bounds (outer step r = 1.16m <= 1.26m collider)
 * - Unobstructed eye-level sightlines (branches begin y >= 3.04m)
 * - Returned references to `kineticSculpture`, `ringOuter`, `ringMiddle`, `innerCore`, and `centerpieceUplight`
 *   so existing GSAP compass flourish and ambient rotation keep working cleanly.
 */
export interface BuiltAtriumTreeResult {
  staticCameraObstacles: THREE.Object3D[];
  centerpieceHitbox: THREE.Mesh;
  centerpieceUplight: THREE.PointLight;
  kineticSculpture: THREE.Group;
  ringOuter: THREE.Mesh;
  ringMiddle: THREE.Mesh;
  innerCore: THREE.Mesh;
  canopyCrownGroup?: THREE.Group;
  updateTreeSway?: (elapsedSec: number, reducedMotion: boolean) => void;
}

export function populateRefinedAtriumTree(params: {
  centerpieceGroup: THREE.Group;
  quality: VisualQualityConfig;
  matWarmLimestone: THREE.Material;
  matWalnut: THREE.Material;
  matBrushedGold: THREE.Material;
  matAlabaster: THREE.Material;
  matBark: THREE.Material;
  matMossBed: THREE.Material;
  matCanopy: THREE.Material;
  trackStatic: <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(
    asset: T,
  ) => T;
}): BuiltAtriumTreeResult {
  const {
    centerpieceGroup,
    quality,
    matWarmLimestone,
    matWalnut,
    matBrushedGold,
    matAlabaster,
    matBark,
    matMossBed,
    matCanopy,
    trackStatic,
  } = params;

  const segs = quality.cylinderSegments;
  const staticCameraObstacles: THREE.Object3D[] = [];

  // 1. V1-b Sculpted LatheGeometry Travertine Step, Fluted Walnut Drum & Moulded Limestone Coping Plinth (strictly r <= 1.16m)
  const plinthBaseStepPts = [
    new THREE.Vector2(0.01, 0.0),
    new THREE.Vector2(1.16, 0.0),
    new THREE.Vector2(1.16, 0.042),
    new THREE.Vector2(1.135, 0.068),
    new THREE.Vector2(1.1, 0.1),
    new THREE.Vector2(0.96, 0.1),
  ];
  const plinthBaseStep = new THREE.Mesh(
    ensureUv2Attribute(
      trackStatic(new THREE.LatheGeometry(plinthBaseStepPts, segs)),
    ),
    matWarmLimestone,
  );
  plinthBaseStep.receiveShadow = true;
  centerpieceGroup.add(plinthBaseStep);

  const plinthBaseBrassRing = new THREE.Mesh(
    trackStatic(new THREE.TorusGeometry(1.125, 0.018, 12, segs)),
    matBrushedGold,
  );
  plinthBaseBrassRing.rotation.x = Math.PI / 2;
  plinthBaseBrassRing.position.y = 0.1;
  centerpieceGroup.add(plinthBaseBrassRing);

  const plinthDrumPts = [
    new THREE.Vector2(0.98, 0.1),
    new THREE.Vector2(0.965, 0.15),
    new THREE.Vector2(0.94, 0.29),
    new THREE.Vector2(0.925, 0.43),
    new THREE.Vector2(0.94, 0.48),
  ];
  const plinthDrum = new THREE.Mesh(
    ensureUv2Attribute(
      trackStatic(new THREE.LatheGeometry(plinthDrumPts, segs)),
    ),
    matWalnut,
  );
  plinthDrum.castShadow = quality.enableShadows;
  plinthDrum.receiveShadow = true;
  centerpieceGroup.add(plinthDrum);
  staticCameraObstacles.push(plinthDrum);

  // 16 instanced champagne-brass architectural fluting ribs around the drum (1 draw call)
  const fluteCount = 16;
  const plinthFluteGeo = trackStatic(
    new THREE.CylinderGeometry(0.011, 0.013, 0.36, 8),
  );
  const fluteInstanced = new THREE.InstancedMesh(
    plinthFluteGeo,
    matBrushedGold,
    fluteCount,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < fluteCount; i++) {
    const a = (i / fluteCount) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 0.955, 0.29, Math.sin(a) * 0.955);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    fluteInstanced.setMatrixAt(i, dummy.matrix);
  }
  fluteInstanced.instanceMatrix.needsUpdate = true;
  centerpieceGroup.add(fluteInstanced);

  // Profiled LatheGeometry Limestone Coping Cap with torus overhang & recessed planter basin lip
  const plinthCapPts = [
    new THREE.Vector2(0.92, 0.475),
    new THREE.Vector2(0.985, 0.492),
    new THREE.Vector2(1.005, 0.518),
    new THREE.Vector2(0.99, 0.542),
    new THREE.Vector2(0.86, 0.542),
    new THREE.Vector2(0.84, 0.51),
  ];
  const plinthCapSlab = new THREE.Mesh(
    ensureUv2Attribute(
      trackStatic(new THREE.LatheGeometry(plinthCapPts, segs)),
    ),
    matWarmLimestone,
  );
  plinthCapSlab.receiveShadow = true;
  centerpieceGroup.add(plinthCapSlab);
  staticCameraObstacles.push(plinthCapSlab);

  const plinthCapBrassCollar = new THREE.Mesh(
    trackStatic(new THREE.TorusGeometry(0.965, 0.018, 12, segs)),
    matBrushedGold,
  );
  plinthCapBrassCollar.rotation.x = Math.PI / 2;
  plinthCapBrassCollar.position.y = 0.538;
  centerpieceGroup.add(plinthCapBrassCollar);

  const plinthMossBed = new THREE.Mesh(
    trackStatic(new THREE.CylinderGeometry(0.85, 0.85, 0.036, Math.max(20, segs - 8))),
    matMossBed,
  );
  plinthMossBed.position.y = 0.538;
  plinthMossBed.receiveShadow = true;
  centerpieceGroup.add(plinthMossBed);

  // 4 architectural recessed brass uplight wells
  const uplightBezelGeo = trackStatic(new THREE.CylinderGeometry(0.056, 0.066, 0.018, 14));
  const uplightLensGeo = trackStatic(new THREE.CircleGeometry(0.044, 14));
  for (let uIdx = 0; uIdx < 4; uIdx++) {
    const uAngle = (uIdx / 4) * Math.PI * 2 + Math.PI / 4;
    const ux = Math.cos(uAngle) * 0.62;
    const uz = Math.sin(uAngle) * 0.62;
    const uBezel = new THREE.Mesh(uplightBezelGeo, matBrushedGold);
    uBezel.position.set(ux, 0.554, uz);
    centerpieceGroup.add(uBezel);

    const uLens = new THREE.Mesh(uplightLensGeo, matAlabaster);
    uLens.rotation.x = -Math.PI / 2;
    uLens.position.set(ux, 0.564, uz);
    centerpieceGroup.add(uLens);
  }

  // 2. Sculpted Continuous Tapered & Organic Lathe Trunk (y = 0.52m .. 3.24m)
  const trunkProfilePoints = [
    new THREE.Vector2(0.34, 0.52),
    new THREE.Vector2(0.255, 0.72),
    new THREE.Vector2(0.198, 1.08),
    new THREE.Vector2(0.17, 1.56),
    new THREE.Vector2(0.156, 2.08),
    new THREE.Vector2(0.146, 2.58),
    new THREE.Vector2(0.132, 2.98),
    new THREE.Vector2(0.118, 3.24),
  ];
  const trunkLatheGeo = ensureUv2Attribute(
    trackStatic(new THREE.LatheGeometry(trunkProfilePoints, Math.max(18, segs - 8))),
  );
  // Subtle organic bark fluting & gentle natural sway along trunk height
  const trunkPosAttr = trunkLatheGeo.getAttribute('position');
  for (let i = 0; i < trunkPosAttr.count; i++) {
    const px = trunkPosAttr.getX(i);
    const py = trunkPosAttr.getY(i);
    const pz = trunkPosAttr.getZ(i);
    const angle = Math.atan2(pz, px);
    const fluteStrength = Math.max(0.004, 0.018 * (1 - (py - 0.52) / 2.8));
    const flute =
      Math.sin(angle * 7 + py * 1.15) * fluteStrength +
      Math.cos(angle * 13 - py * 1.8) * (fluteStrength * 0.35);
    const rad = Math.hypot(px, pz);
    if (rad > 0.02) {
      const scale = (rad + flute) / rad;
      const swayX = Math.sin((py - 0.52) * 1.1) * 0.022;
      const swayZ = Math.cos((py - 0.52) * 0.9) * 0.014 - 0.01;
      trunkPosAttr.setXYZ(i, px * scale + swayX, py, pz * scale + swayZ);
    }
  }
  trunkLatheGeo.computeVertexNormals();

  const sculptedTrunk = new THREE.Mesh(trunkLatheGeo, matBark);
  sculptedTrunk.castShadow = quality.enableShadows;
  sculptedTrunk.receiveShadow = true;
  centerpieceGroup.add(sculptedTrunk);
  staticCameraObstacles.push(sculptedTrunk);

  // 6 Organic Curved Root Buttresses via CatmullRomCurve3 TubeGeometry
  for (let rIdx = 0; rIdx < 6; rIdx++) {
    const rAngle = (rIdx / 6) * Math.PI * 2 + 0.18;
    const cosR = Math.cos(rAngle);
    const sinR = Math.sin(rAngle);
    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosR * 0.14, 1.06, sinR * 0.14),
      new THREE.Vector3(cosR * 0.25, 0.74, sinR * 0.25),
      new THREE.Vector3(cosR * 0.44, 0.57, sinR * 0.44),
      new THREE.Vector3(cosR * 0.64, 0.535, sinR * 0.64),
    ]);
    const rootGeo = trackStatic(
      new THREE.TubeGeometry(
        rootCurve,
        quality.curveTubularSegments,
        0.048,
        quality.curveRadialSegments,
        false,
      ),
    );
    const rootMesh = new THREE.Mesh(rootGeo, matBark);
    rootMesh.castShadow = quality.enableShadows;
    rootMesh.receiveShadow = true;
    centerpieceGroup.add(rootMesh);
  }

  // Helical brushed-gold memory ribbon gracefully spiraling around the sculpted trunk
  const helixPts: THREE.Vector3[] = [];
  const helixSteps = 28;
  for (let s = 0; s <= helixSteps; s++) {
    const t = s / helixSteps;
    const hy = 0.85 + t * 2.05;
    const hAngle = t * Math.PI * 2.4;
    const hRadius = THREE.MathUtils.lerp(0.208, 0.146, t);
    helixPts.push(
      new THREE.Vector3(Math.cos(hAngle) * hRadius, hy, Math.sin(hAngle) * hRadius),
    );
  }
  const helixCurve = new THREE.CatmullRomCurve3(helixPts);
  const helixMesh = new THREE.Mesh(
    trackStatic(new THREE.TubeGeometry(helixCurve, 32, 0.0085, 8, false)),
    matBrushedGold,
  );
  centerpieceGroup.add(helixMesh);

  // 3. Curved Arching Primary Boughs, Secondary Forks & Tertiary Crown Twigs (All starting y >= 3.04m for open sightlines)
  const canopyCenters: { x: number; y: number; z: number; scale: number; tint: number }[] =
    [];

  for (let bIdx = 0; bIdx < 6; bIdx++) {
    const bAngle = (bIdx / 6) * Math.PI * 2 + 0.28;
    const cosA = Math.cos(bAngle);
    const sinA = Math.sin(bAngle);
    const sideAngle = bAngle + Math.PI * 0.45;

    const mainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.09, 3.04 + (bIdx % 2) * 0.06, sinA * 0.09),
      new THREE.Vector3(cosA * 0.42, 3.38 + (bIdx % 2) * 0.08, sinA * 0.42),
      new THREE.Vector3(cosA * 0.82, 3.66 + (bIdx % 3) * 0.07, sinA * 0.82),
      new THREE.Vector3(cosA * 1.16, 3.86 + (bIdx % 2) * 0.09, sinA * 1.16),
    ]);
    const mainBoughGeo = trackStatic(
      new THREE.TubeGeometry(
        mainCurve,
        quality.curveTubularSegments,
        0.048,
        quality.curveRadialSegments,
        false,
      ),
    );
    const mainBough = new THREE.Mesh(mainBoughGeo, matBark);
    mainBough.castShadow = quality.enableShadows;
    centerpieceGroup.add(mainBough);

    // Secondary forked twig arching inward/upward to support canopy crown density
    const forkAngle = bAngle + (bIdx % 2 === 0 ? 0.36 : -0.36);
    const forkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.44, 3.4, sinA * 0.44),
      new THREE.Vector3(
        Math.cos(forkAngle) * 0.68,
        3.74 + (bIdx % 2) * 0.06,
        Math.sin(forkAngle) * 0.68,
      ),
      new THREE.Vector3(
        Math.cos(forkAngle) * 0.88,
        4.0 + (bIdx % 3) * 0.05,
        Math.sin(forkAngle) * 0.88,
      ),
    ]);
    const forkMesh = new THREE.Mesh(
      trackStatic(
        new THREE.TubeGeometry(
          forkCurve,
          Math.max(8, quality.curveTubularSegments - 4),
          0.028,
          Math.max(6, quality.curveRadialSegments - 2),
          false,
        ),
      ),
      matBark,
    );
    forkMesh.castShadow = quality.enableShadows;
    centerpieceGroup.add(forkMesh);

    // Tertiary outer crown shoot for natural silhouette layering
    const shootAngle = bAngle + (bIdx % 2 === 0 ? -0.24 : 0.24);
    const shootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.78, 3.64, sinA * 0.78),
      new THREE.Vector3(
        Math.cos(shootAngle) * 1.04,
        3.92 + (bIdx % 2) * 0.05,
        Math.sin(shootAngle) * 1.04,
      ),
      new THREE.Vector3(
        Math.cos(shootAngle) * 1.24,
        4.1 + (bIdx % 2) * 0.06,
        Math.sin(shootAngle) * 1.24,
      ),
    ]);
    const shootMesh = new THREE.Mesh(
      trackStatic(
        new THREE.TubeGeometry(
          shootCurve,
          Math.max(6, quality.curveTubularSegments - 6),
          0.018,
          Math.max(5, quality.curveRadialSegments - 3),
          false,
        ),
      ),
      matBark,
    );
    centerpieceGroup.add(shootMesh);

    canopyCenters.push({
      x: cosA * 1.1,
      y: 3.86 + (bIdx % 2) * 0.09,
      z: sinA * 1.1,
      scale: 0.94,
      tint: bIdx % 4,
    });
    canopyCenters.push({
      x: Math.cos(forkAngle) * 0.8,
      y: 4.02 + (bIdx % 2) * 0.07,
      z: Math.sin(forkAngle) * 0.8,
      scale: 0.86,
      tint: (bIdx + 1) % 4,
    });
    canopyCenters.push({
      x: Math.cos(shootAngle) * 1.18,
      y: 4.1 + (bIdx % 2) * 0.06,
      z: Math.sin(shootAngle) * 1.18,
      scale: 0.78,
      tint: (bIdx + 2) % 4,
    });
    canopyCenters.push({
      x: cosA * 0.44 + Math.cos(sideAngle) * 0.16,
      y: 4.2 + (bIdx % 3) * 0.06,
      z: sinA * 0.44 + Math.sin(sideAngle) * 0.16,
      scale: 0.8,
      tint: (bIdx + 3) % 4,
    });
  }

  // Apex canopy crown anchors
  canopyCenters.push(
    { x: 0, y: 4.28, z: 0, scale: 1.08, tint: 1 },
    { x: 0.26, y: 4.38, z: -0.2, scale: 0.9, tint: 2 },
    { x: -0.24, y: 4.36, z: 0.22, scale: 0.88, tint: 0 },
    { x: 0.04, y: 4.44, z: 0.08, scale: 0.82, tint: 3 },
  );

  // 4. Instanced Organic Botanical Leaf Clusters (1 draw call, variegated olive/sage/sunlit champagne tones)
  // Pivoted at y = 3.85m and added directly to centerpieceGroup so gentle breeze sway rotates naturally around the crown center
  const leafClusterGeo = trackStatic(new THREE.IcosahedronGeometry(0.32, 2));
  // Gently organically perturb vertices so silhouettes read like natural layered foliage rather than spheres
  const leafPos = leafClusterGeo.getAttribute('position');
  for (let i = 0; i < leafPos.count; i++) {
    const lx = leafPos.getX(i);
    const ly = leafPos.getY(i);
    const lz = leafPos.getZ(i);
    const n =
      1 +
      0.17 * Math.sin(lx * 9.5 + ly * 7.2) +
      0.12 * Math.cos(lz * 11.1 - lx * 5.4);
    leafPos.setXYZ(i, lx * n, ly * n * 0.72, lz * n);
  }
  leafClusterGeo.computeVertexNormals();

  const totalInstances = Math.max(24, quality.treeFoliageInstances);
  const foliageInstanced = new THREE.InstancedMesh(
    leafClusterGeo,
    matCanopy,
    totalInstances,
  );
  foliageInstanced.position.set(0, 3.85, 0);
  foliageInstanced.castShadow = quality.enableShadows;
  foliageInstanced.receiveShadow = true;

  const paletteColors = [
    new THREE.Color(PALETTE_DEEP_OLIVE),
    new THREE.Color(PALETTE_MUTED_SAGE),
    new THREE.Color('#A8BA8E'),
    new THREE.Color('#778A65'),
    new THREE.Color('#C4C28D'),
  ];
  const colorVar = new THREE.Color();

  for (let i = 0; i < totalInstances; i++) {
    const anchor = canopyCenters[i % canopyCenters.length];
    const subIdx = Math.floor(i / canopyCenters.length);
    const phi = i * 2.3999632;
    const jitterR = subIdx === 0 ? 0.08 : 0.26 + (subIdx % 3) * 0.09;
    const px = anchor.x + Math.cos(phi) * jitterR;
    const pz = anchor.z + Math.sin(phi) * jitterR;
    const py = anchor.y + ((i % 5) - 2) * 0.065;

    const sBase = anchor.scale * (0.76 + (i % 4) * 0.14);
    // Relative to foliageInstanced pivot (y = 3.85)
    dummy.position.set(px, py - 3.85, pz);
    dummy.rotation.set(
      ((i % 7) - 3) * 0.09,
      (i * 1.13) % (Math.PI * 2),
      ((i % 5) - 2) * 0.08,
    );
    dummy.scale.set(sBase * 1.15, sBase * 0.85, sBase * 1.1);
    dummy.updateMatrix();
    foliageInstanced.setMatrixAt(i, dummy.matrix);

    const baseCol = paletteColors[(anchor.tint + (i % 5)) % paletteColors.length];
    colorVar.copy(baseCol);
    // Slightly brighten upper sunlit clusters
    const heightBoost = THREE.MathUtils.clamp((py - 3.7) / 0.75, 0, 1) * 0.13;
    colorVar.offsetHSL(0, 0, heightBoost);
    foliageInstanced.setColorAt(i, colorVar);
  }
  foliageInstanced.instanceMatrix.needsUpdate = true;
  if (foliageInstanced.instanceColor) {
    foliageInstanced.instanceColor.needsUpdate = true;
  }
  centerpieceGroup.add(foliageInstanced);

  // 5. Suspended Brushed-Brass & Frosted Alabaster Memory Lanterns beneath 5 Boughs (y = 3.24m)
  const cordGeo = trackStatic(new THREE.CylinderGeometry(0.004, 0.004, 0.36, 6));
  const lanternCapGeo = trackStatic(new THREE.CylinderGeometry(0.03, 0.044, 0.026, 12));
  const lanternOrbGeo = trackStatic(new THREE.OctahedronGeometry(0.056, 1));
  const lanternPivots: THREE.Group[] = [];
  for (let bIdx = 0; bIdx < 5; bIdx++) {
    const bAngle = (bIdx / 6) * Math.PI * 2 + 0.28;
    const lx = Math.cos(bAngle) * 0.74;
    const lz = Math.sin(bAngle) * 0.74;
    const lanternPivot = new THREE.Group();
    lanternPivot.position.set(lx, 3.64, lz);
    centerpieceGroup.add(lanternPivot);
    lanternPivots.push(lanternPivot);

    const cord = new THREE.Mesh(cordGeo, matBrushedGold);
    cord.position.set(0, -0.18, 0);
    lanternPivot.add(cord);

    const lCap = new THREE.Mesh(lanternCapGeo, matBrushedGold);
    lCap.position.set(0, -0.35, 0);
    lanternPivot.add(lCap);

    const lOrb = new THREE.Mesh(lanternOrbGeo, matAlabaster);
    lOrb.position.set(0, -0.42, 0);
    lanternPivot.add(lOrb);
  }

  // 6. Kinetic Brass & Alabaster Compass Sculpture in Upper Crown (y = 3.62m)
  const kineticSculpture = new THREE.Group();
  kineticSculpture.position.y = 3.62;
  centerpieceGroup.add(kineticSculpture);

  const ringOuter = new THREE.Mesh(
    trackStatic(new THREE.TorusGeometry(1.06, 0.022, 16, Math.max(36, segs + 8))),
    matBrushedGold,
  );
  kineticSculpture.add(ringOuter);

  const ringMiddle = new THREE.Mesh(
    trackStatic(new THREE.TorusGeometry(0.76, 0.018, 16, Math.max(32, segs))),
    matBrushedGold,
  );
  ringMiddle.rotation.x = Math.PI / 4;
  kineticSculpture.add(ringMiddle);

  const innerCore = new THREE.Mesh(
    trackStatic(new THREE.OctahedronGeometry(0.2, 1)),
    matAlabaster,
  );
  kineticSculpture.add(innerCore);

  // 7. Preserved Interactive Hitbox & Warm Indirect Plinth Uplight
  const centerpieceHitbox = new THREE.Mesh(
    trackStatic(new THREE.CylinderGeometry(1.15, 1.15, 3.4, 20)),
    trackStatic(new THREE.MeshBasicMaterial({ visible: false })),
  );
  centerpieceHitbox.position.y = 1.7;
  centerpieceHitbox.userData = {
    kind: 'discovery_compass',
    title: 'Atrium Memory & Atmosphere Compass',
    subtitle: 'Click or press [E] to cycle Atrium Lighting & discover a memory',
  };
  centerpieceGroup.add(centerpieceHitbox);

  const centerpieceUplight = new THREE.PointLight(0xffdca8, 1.32, 9.6, 1.55);
  centerpieceUplight.position.set(0, 0.92, 0);
  centerpieceGroup.add(centerpieceUplight);

  // 8. V1-b & V1-d Subtle continuous breeze sway callback for canopy crown & suspended lanterns
  const updateTreeSway = (elapsedSec: number, reducedMotion: boolean) => {
    if (reducedMotion) {
      foliageInstanced.rotation.set(0, 0, 0);
      foliageInstanced.position.set(0, 3.85, 0);
      for (let i = 0; i < lanternPivots.length; i++) {
        lanternPivots[i].rotation.set(0, 0, 0);
      }
      return;
    }
    foliageInstanced.rotation.x = Math.sin(elapsedSec * 0.68) * 0.014;
    foliageInstanced.rotation.z = Math.cos(elapsedSec * 0.54 + 0.7) * 0.016;
    foliageInstanced.rotation.y = Math.sin(elapsedSec * 0.28) * 0.018;
    foliageInstanced.position.y = 3.85 + Math.sin(elapsedSec * 0.95) * 0.012;

    for (let i = 0; i < lanternPivots.length; i++) {
      const phase = i * 1.25;
      lanternPivots[i].rotation.x = Math.sin(elapsedSec * 1.15 + phase) * 0.026;
      lanternPivots[i].rotation.z = Math.cos(elapsedSec * 0.92 + phase) * 0.022;
    }
  };

  return {
    staticCameraObstacles,
    centerpieceHitbox,
    centerpieceUplight,
    kineticSculpture,
    ringOuter,
    ringMiddle,
    innerCore,
    canopyCrownGroup: foliageInstanced as unknown as THREE.Group,
    updateTreeSway,
  };
}

/**
 * Builds the Stage 01B refined Central Living Indoor Tree & Fluted Pedestal inside a Room,
 * bringing the room centerpiece up to Atrium organic bark, moss bed & instanced botanical canopy parity
 * while preserving exact pedestal bounds (r = 1.28m), trunk position (0, y, -0.14), and high canopy sightlines (y >= 3.32m).
 */
export function populateRefinedRoomCentralTree(params: {
  centralIslandGroup: THREE.Group;
  quality: VisualQualityConfig;
  matWalnut: THREE.Material;
  matChampagneGold: THREE.Material;
  matWarmEmissiveStrip: THREE.Material;
  matBark: THREE.Material;
  matMossBed: THREE.Material;
  matCanopy: THREE.Material;
  cameraObstacleMeshes: THREE.Object3D[];
  track: <T extends { dispose: () => void }>(asset: T) => T;
}): void {
  const {
    centralIslandGroup,
    quality,
    matWalnut,
    matChampagneGold,
    matWarmEmissiveStrip,
    matBark,
    matMossBed,
    matCanopy,
    cameraObstacleMeshes,
    track,
  } = params;

  const segs = Math.max(18, quality.cylinderSegments);

  // 1. 28 instanced walnut architectural flutes around pedestal perimeter (1 draw call instead of 28)
  const fluteCount = 28;
  const fluteGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.38, 8));
  const flutesInstanced = new THREE.InstancedMesh(
    fluteGeo,
    matWalnut,
    fluteCount,
  );
  const dummy = new THREE.Object3D();
  for (let f = 0; f < fluteCount; f++) {
    const ang = (f / fluteCount) * Math.PI * 2;
    dummy.position.set(Math.cos(ang) * 1.25, 0.22, Math.sin(ang) * 1.25);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    flutesInstanced.setMatrixAt(f, dummy.matrix);
  }
  flutesInstanced.instanceMatrix.needsUpdate = true;
  centralIslandGroup.add(flutesInstanced);

  // Moss & smooth river-pebble soil bed collar around tree base on the circular platform
  const soilBed = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.68, 0.72, 0.03, Math.max(18, segs - 8))),
    matMossBed,
  );
  soilBed.position.set(0, 0.445, -0.14);
  soilBed.receiveShadow = true;
  centralIslandGroup.add(soilBed);

  // 2. Sculpted organic tapered & fluted Lathe trunk (centered at x = 0, z = -0.14, y = 0.44..3.72m)
  const trunkProfilePoints = [
    new THREE.Vector2(0.32, 0.44),
    new THREE.Vector2(0.24, 0.72),
    new THREE.Vector2(0.205, 1.24),
    new THREE.Vector2(0.19, 1.92),
    new THREE.Vector2(0.18, 2.68),
    new THREE.Vector2(0.165, 3.35),
    new THREE.Vector2(0.142, 3.75),
  ];
  const trunkLatheGeo = ensureUv2Attribute(
    track(new THREE.LatheGeometry(trunkProfilePoints, Math.max(18, segs - 8))),
  );
  const trunkPos = trunkLatheGeo.getAttribute('position');
  for (let i = 0; i < trunkPos.count; i++) {
    const px = trunkPos.getX(i);
    const py = trunkPos.getY(i);
    const pz = trunkPos.getZ(i);
    const angle = Math.atan2(pz, px);
    const fluteStrength = Math.max(0.004, 0.015 * (1 - (py - 0.44) / 3.4));
    const flute = Math.sin(angle * 6 + py * 1.1) * fluteStrength;
    const rad = Math.hypot(px, pz);
    if (rad > 0.02) {
      const s = (rad + flute) / rad;
      const swayX = Math.sin((py - 0.44) * 0.95) * 0.02;
      const swayZ = Math.cos((py - 0.44) * 0.85) * 0.014 - 0.01;
      trunkPos.setXYZ(i, px * s + swayX, py, pz * s + swayZ);
    }
  }
  trunkLatheGeo.computeVertexNormals();

  const mainTrunk = new THREE.Mesh(trunkLatheGeo, matBark);
  mainTrunk.position.set(0, 0, -0.14);
  mainTrunk.castShadow = quality.enableShadows;
  mainTrunk.receiveShadow = true;
  centralIslandGroup.add(mainTrunk);
  cameraObstacleMeshes.push(mainTrunk);

  // 5 Organic Curved Root Buttresses via CatmullRomCurve3
  for (let r = 0; r < 5; r++) {
    const rAng = (r / 5) * Math.PI * 2 + 0.25;
    const cosR = Math.cos(rAng);
    const sinR = Math.sin(rAng);
    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosR * 0.14, 1.02, -0.14 + sinR * 0.14),
      new THREE.Vector3(cosR * 0.26, 0.68, -0.14 + sinR * 0.26),
      new THREE.Vector3(cosR * 0.44, 0.49, -0.14 + sinR * 0.44),
      new THREE.Vector3(cosR * 0.6, 0.445, -0.14 + sinR * 0.6),
    ]);
    const rootMesh = new THREE.Mesh(
      track(
        new THREE.TubeGeometry(
          rootCurve,
          quality.curveTubularSegments,
          0.048,
          quality.curveRadialSegments,
          false,
        ),
      ),
      matBark,
    );
    rootMesh.castShadow = quality.enableShadows;
    centralIslandGroup.add(rootMesh);
  }

  // 3. 6 Gracefully Arching Primary Boughs & Secondary Fork Branches (all y >= 3.35m for open sightlines)
  const canopyCenters: { x: number; y: number; z: number; scale: number; tint: number }[] = [];
  for (let bIdx = 0; bIdx < 6; bIdx++) {
    const bAngle = (bIdx / 6) * Math.PI * 2 + 0.22;
    const cosA = Math.cos(bAngle);
    const sinA = Math.sin(bAngle);

    const boughCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.1, 3.34 + (bIdx % 2) * 0.08, -0.14 + sinA * 0.1),
      new THREE.Vector3(cosA * 0.52, 3.76 + (bIdx % 2) * 0.09, -0.14 + sinA * 0.52),
      new THREE.Vector3(cosA * 1.02, 4.12 + (bIdx % 3) * 0.07, -0.14 + sinA * 1.02),
      new THREE.Vector3(cosA * 1.42, 4.32 + (bIdx % 2) * 0.08, -0.14 + sinA * 1.42),
    ]);
    const boughMesh = new THREE.Mesh(
      track(
        new THREE.TubeGeometry(
          boughCurve,
          quality.curveTubularSegments,
          0.052,
          quality.curveRadialSegments,
          false,
        ),
      ),
      matBark,
    );
    boughMesh.castShadow = quality.enableShadows;
    centralIslandGroup.add(boughMesh);

    const forkAngle = bAngle + (bIdx % 2 === 0 ? 0.38 : -0.38);
    const forkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cosA * 0.54, 3.78, -0.14 + sinA * 0.54),
      new THREE.Vector3(
        Math.cos(forkAngle) * 0.86,
        4.18 + (bIdx % 2) * 0.06,
        -0.14 + Math.sin(forkAngle) * 0.86,
      ),
      new THREE.Vector3(
        Math.cos(forkAngle) * 1.12,
        4.44 + (bIdx % 3) * 0.05,
        -0.14 + Math.sin(forkAngle) * 1.12,
      ),
    ]);
    const forkMesh = new THREE.Mesh(
      track(
        new THREE.TubeGeometry(
          forkCurve,
          Math.max(8, quality.curveTubularSegments - 4),
          0.03,
          Math.max(6, quality.curveRadialSegments - 2),
          false,
        ),
      ),
      matBark,
    );
    centralIslandGroup.add(forkMesh);

    canopyCenters.push({
      x: cosA * 1.32,
      y: 4.36 + (bIdx % 2) * 0.08,
      z: -0.14 + sinA * 1.32,
      scale: 0.96,
      tint: bIdx % 4,
    });
    canopyCenters.push({
      x: Math.cos(forkAngle) * 0.98,
      y: 4.48 + (bIdx % 2) * 0.07,
      z: -0.14 + Math.sin(forkAngle) * 0.98,
      scale: 0.88,
      tint: (bIdx + 1) % 4,
    });
  }
  canopyCenters.push(
    { x: 0, y: 4.62, z: -0.14, scale: 1.15, tint: 1 },
    { x: 0.35, y: 4.68, z: 0.16, scale: 0.94, tint: 2 },
    { x: -0.35, y: 4.65, z: -0.38, scale: 0.92, tint: 0 },
  );

  // 4. Instanced Organic Botanical Leaf Clusters (1 draw call matching Atrium variegated palette)
  const leafClusterGeo = track(new THREE.IcosahedronGeometry(0.36, 2));
  const leafPos = leafClusterGeo.getAttribute('position');
  for (let i = 0; i < leafPos.count; i++) {
    const lx = leafPos.getX(i);
    const ly = leafPos.getY(i);
    const lz = leafPos.getZ(i);
    const n =
      1 +
      0.16 * Math.sin(lx * 9.2 + ly * 6.8) +
      0.11 * Math.cos(lz * 10.6 - lx * 5.2);
    leafPos.setXYZ(i, lx * n, ly * n * 0.68, lz * n);
  }
  leafClusterGeo.computeVertexNormals();

  const totalInstances = Math.max(24, Math.round(quality.treeFoliageInstances * 0.85));
  const foliageInstanced = new THREE.InstancedMesh(
    leafClusterGeo,
    matCanopy,
    totalInstances,
  );
  foliageInstanced.castShadow = quality.enableShadows;
  foliageInstanced.receiveShadow = true;

  const canopyPalette = [
    new THREE.Color(PALETTE_DEEP_OLIVE),
    new THREE.Color(PALETTE_MUTED_SAGE),
    new THREE.Color('#6F9943'),
    new THREE.Color('#8FA676'),
  ];
  const colorVar = new THREE.Color();

  for (let i = 0; i < totalInstances; i++) {
    const anchor = canopyCenters[i % canopyCenters.length];
    const subIdx = Math.floor(i / canopyCenters.length);
    const phi = i * 2.3999632;
    const jitterR = subIdx === 0 ? 0.1 : 0.28 + (subIdx % 3) * 0.11;
    const px = anchor.x + Math.cos(phi) * jitterR;
    const pz = anchor.z + Math.sin(phi) * jitterR;
    const py = anchor.y + ((i % 5) - 2) * 0.06;

    const sBase = anchor.scale * (0.76 + (i % 4) * 0.13);
    dummy.position.set(px, py, pz);
    dummy.rotation.set(
      ((i % 7) - 3) * 0.08,
      (i * 1.13) % (Math.PI * 2),
      ((i % 5) - 2) * 0.08,
    );
    dummy.scale.set(sBase * 1.14, sBase * 0.78, sBase * 1.12);
    dummy.updateMatrix();
    foliageInstanced.setMatrixAt(i, dummy.matrix);

    const baseCol = canopyPalette[(anchor.tint + (i % 4)) % canopyPalette.length];
    colorVar.copy(baseCol);
    const heightBoost = THREE.MathUtils.clamp((py - 4.2) / 0.55, 0, 1) * 0.11;
    colorVar.offsetHSL(0, 0, heightBoost);
    foliageInstanced.setColorAt(i, colorVar);
  }
  foliageInstanced.instanceMatrix.needsUpdate = true;
  if (foliageInstanced.instanceColor) {
    foliageInstanced.instanceColor.needsUpdate = true;
  }
  centralIslandGroup.add(foliageInstanced);

  // 5. Delicate Golden Canopy Halo Ring & Warm Firefly Droplets (instanced 12 -> 1 draw call)
  const fairyGarlandRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(1.38, 0.012, 12, Math.max(32, segs))),
    matWarmEmissiveStrip,
  );
  fairyGarlandRing.rotation.x = Math.PI / 2 + 0.06;
  fairyGarlandRing.position.set(0, 3.74, -0.1);
  centralIslandGroup.add(fairyGarlandRing);

  const dropletGeo = track(new THREE.SphereGeometry(0.03, 8, 8));
  const dropletInstanced = new THREE.InstancedMesh(
    dropletGeo,
    matWarmEmissiveStrip,
    12,
  );
  for (let d = 0; d < 12; d++) {
    const ang = (d / 12) * Math.PI * 2;
    dummy.position.set(
      Math.cos(ang) * 1.32,
      3.64 + (d % 3) * 0.18,
      -0.1 + Math.sin(ang) * 1.32,
    );
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    dropletInstanced.setMatrixAt(d, dummy.matrix);
  }
  dropletInstanced.instanceMatrix.needsUpdate = true;
  centralIslandGroup.add(dropletInstanced);

  // Subtle brushed-brass collar ring around moss soil bed
  const soilBrassCollar = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.7, 0.014, 10, Math.max(24, segs - 8))),
    matChampagneGold,
  );
  soilBrassCollar.rotation.x = Math.PI / 2;
  soilBrassCollar.position.set(0, 0.455, -0.14);
  centralIslandGroup.add(soilBrassCollar);
}
