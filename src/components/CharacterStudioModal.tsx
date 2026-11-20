import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Check,
  RotateCcw,
  Shuffle,
  Sparkles,
  Undo2,
  Redo2,
  User,
  Scissors,
  Shirt,
  Glasses,
  Palette,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { TechBuddyPose } from '../types/aiStudio';
import {
  BuiltExplorerCharacter,
  CHARACTER_FACIAL_HAIR_LABELS,
  CHARACTER_FOOTWEAR_LABELS,
  CHARACTER_HAIR_COLORS,
  CHARACTER_HAIR_STYLE_LABELS,
  CHARACTER_OUTFIT_PRESETS,
  CHARACTER_OUTFIT_SWATCHES,
  CHARACTER_SKIN_TONES,
  CharacterBodyType,
  CharacterEarringsId,
  CharacterGlassesId,
  CharacterHeadwearId,
  CharacterOutfitId,
  CharacterStudioConfigV1,
  DEFAULT_CHARACTER_CONFIG,
  buildExplorerCharacter,
  createRandomCharacterConfig,
  sanitizeCharacterConfig,
  structuredCloneConfig,
} from '../utils/characterBuilder';

export interface CharacterStudioModalProps {
  isOpen: boolean;
  initialConfig: CharacterStudioConfigV1;
  onLiveChange: (nextConfig: CharacterStudioConfigV1) => void;
  onSave: (savedConfig: CharacterStudioConfigV1) => void;
  onCancel: (revertedConfig: CharacterStudioConfigV1) => void;
}

type StudioTabId = 'body' | 'face_hair' | 'outfit' | 'accessories' | 'colours';

const PREVIEW_POSES: { id: TechBuddyPose; label: string }[] = [
  { id: 'idle', label: 'Idle Breath' },
  { id: 'walking', label: 'Walk Cycle' },
  { id: 'running', label: 'Run Cycle' },
  { id: 'turning', label: 'Head & Torso Turn' },
  { id: 'pointing', label: 'Curator Point' },
  { id: 'waving', label: 'Welcome Wave' },
  { id: 'sitting', label: 'Seated Bench' },
  { id: 'interacting', label: 'Interact Exhibit' },
  { id: 'celebrating', label: 'Celebrate' },
  { id: 'talking', label: 'Story Narration' },
];

export const CharacterStudioModal: React.FC<CharacterStudioModalProps> = ({
  isOpen,
  initialConfig,
  onLiveChange,
  onSave,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTabId>('body');
  const [history, setHistory] = useState<CharacterStudioConfigV1[]>([
    structuredCloneConfig(initialConfig),
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [previewPose, setPreviewPose] = useState<TechBuddyPose>('idle');
  const [autoTurntable, setAutoTurntable] = useState<boolean>(true);
  const [meshMetrics, setMeshMetrics] = useState<{
    triangles: number;
    drawCalls: number;
  }>({ triangles: 0, drawCalls: 0 });

  const initialSnapshotRef = useRef<CharacterStudioConfigV1>(
    structuredCloneConfig(initialConfig),
  );
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const builtPreviewCharRef = useRef<BuiltExplorerCharacter | null>(null);
  const previewPoseRef = useRef<TechBuddyPose>(previewPose);
  const autoTurntableRef = useRef<boolean>(autoTurntable);
  const turntableYawRef = useRef<number>(0);

  useEffect(() => {
    previewPoseRef.current = previewPose;
  }, [previewPose]);

  useEffect(() => {
    autoTurntableRef.current = autoTurntable;
  }, [autoTurntable]);

  // Reset history stack when modal opens
  useEffect(() => {
    if (isOpen) {
      const cleanSnap = sanitizeCharacterConfig(initialConfig);
      initialSnapshotRef.current = structuredCloneConfig(cleanSnap);
      setHistory([structuredCloneConfig(cleanSnap)]);
      setHistoryIndex(0);
      setPreviewPose('idle');
    }
  }, [isOpen, initialConfig]);

  const currentConfig =
    history[historyIndex] || structuredCloneConfig(DEFAULT_CHARACTER_CONFIG);

  const pushConfigUpdate = useCallback(
    (
      updater:
        | CharacterStudioConfigV1
        | ((prev: CharacterStudioConfigV1) => CharacterStudioConfigV1),
    ) => {
      setHistory((prevHistory) => {
        const current =
          prevHistory[historyIndex] ||
          structuredCloneConfig(DEFAULT_CHARACTER_CONFIG);
        const rawNext =
          typeof updater === 'function' ? updater(current) : updater;
        const sanitizedNext = sanitizeCharacterConfig(rawNext);
        const sliced = prevHistory.slice(0, historyIndex + 1);
        const nextStack = [...sliced, sanitizedNext].slice(-30);
        setHistoryIndex(nextStack.length - 1);
        onLiveChange(sanitizedNext);
        return nextStack;
      });
    },
    [historyIndex, onLiveChange],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const nextIdx = historyIndex - 1;
    setHistoryIndex(nextIdx);
    const targetCfg = history[nextIdx];
    if (targetCfg) {
      onLiveChange(targetCfg);
    }
  }, [history, historyIndex, onLiveChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    const targetCfg = history[nextIdx];
    if (targetCfg) {
      onLiveChange(targetCfg);
    }
  }, [history, historyIndex, onLiveChange]);

  const handleRandomise = useCallback(() => {
    const randomCfg = createRandomCharacterConfig();
    pushConfigUpdate(randomCfg);
  }, [pushConfigUpdate]);

  const handleResetToDefault = useCallback(() => {
    pushConfigUpdate(structuredCloneConfig(DEFAULT_CHARACTER_CONFIG));
  }, [pushConfigUpdate]);

  const handleSelectOutfitPreset = useCallback(
    (outfitId: CharacterOutfitId) => {
      const preset = CHARACTER_OUTFIT_PRESETS.find((p) => p.id === outfitId);
      pushConfigUpdate((prev) => ({
        ...prev,
        outfit: outfitId,
        outfitColors: preset
          ? { ...preset.defaultColors }
          : { ...prev.outfitColors },
      }));
    },
    [pushConfigUpdate],
  );

  // Sync live 3D preview mesh whenever currentConfig updates
  useEffect(() => {
    if (!isOpen || !builtPreviewCharRef.current) return;
    builtPreviewCharRef.current.rebuild(currentConfig);
    const m = builtPreviewCharRef.current.getMetrics();
    setMeshMetrics({ triangles: m.triangles, drawCalls: m.drawCalls });
  }, [isOpen, currentConfig]);

  // Mount & clean up dedicated 3D Character Turntable Preview
  useEffect(() => {
    if (!isOpen) return;
    const container = canvasMountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const width = Math.max(240, container.clientWidth || 320);
    const height = Math.max(280, container.clientHeight || 380);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#EFE7DA');

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 25);
    camera.position.set(0, 1.08, 3.15);
    camera.lookAt(0, 0.88, 0);

    // Warm gallery lighting for turntable preview
    const hemiLight = new THREE.HemisphereLight('#FFF8EC', '#C8B69E', 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFF3DC', 1.65);
    keyLight.position.set(2.2, 3.8, -2.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#E9D4B1', 0.75);
    rimLight.position.set(-2.0, 2.2, 2.4);
    scene.add(rimLight);

    // Sculpted travertine turntable plinth
    const plinthGeo = new THREE.CylinderGeometry(0.68, 0.74, 0.1, 32);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: '#DFD3C0',
      roughness: 0.45,
      metalness: 0.05,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.set(0, -0.05, 0);
    plinthMesh.receiveShadow = true;
    scene.add(plinthMesh);

    const brassRimGeo = new THREE.TorusGeometry(0.7, 0.014, 8, 36);
    const brassRimMat = new THREE.MeshStandardMaterial({
      color: '#C89B5E',
      roughness: 0.28,
      metalness: 0.78,
    });
    const brassRim = new THREE.Mesh(brassRimGeo, brassRimMat);
    brassRim.rotation.x = Math.PI / 2;
    brassRim.position.set(0, 0.0, 0);
    scene.add(brassRim);

    const stageGroup = new THREE.Group();
    // Face character toward the camera (+Z front faces +Z camera)
    turntableYawRef.current = 0.25;
    stageGroup.rotation.y = turntableYawRef.current;
    scene.add(stageGroup);

    const builtChar = buildExplorerCharacter({
      config: currentConfig,
    });
    builtPreviewCharRef.current = builtChar;
    stageGroup.add(builtChar.charBodyGroup);
    const initialMetrics = builtChar.getMetrics();
    setMeshMetrics({
      triangles: initialMetrics.triangles,
      drawCalls: initialMetrics.drawCalls,
    });

    // Pointer drag-to-rotate on preview canvas
    let isDragging = false;
    let lastClientX = 0;
    const domElem = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastClientX = e.clientX;
      setAutoTurntable(false);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastClientX;
      lastClientX = e.clientX;
      turntableYawRef.current += dx * 0.012;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (!container || !renderer) return;
            const w = Math.max(200, container.clientWidth);
            const h = Math.max(240, container.clientHeight);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
          })
        : null;
    resizeObserver?.observe(container);

    let animId = 0;
    const startMs = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedSec = (performance.now() - startMs) * 0.001;
      if (autoTurntableRef.current && !isDragging) {
        turntableYawRef.current += 0.0045;
      }
      stageGroup.rotation.y = turntableYawRef.current;

      builtChar.applyPose(
        previewPoseRef.current,
        elapsedSec,
        elapsedSec * 6.2,
        1,
      );
      renderer?.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver?.disconnect();
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      builtPreviewCharRef.current = null;
      builtChar.dispose();
      plinthGeo.dispose();
      plinthMat.dispose();
      brassRimGeo.dispose();
      brassRimMat.dispose();
      renderer?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Escape key closes and reverts
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel(initialSnapshotRef.current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-studio-title"
      data-ui-interactive="true"
      className="fixed inset-0 z-50 bg-[#27231F]/65 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-5xl bg-[#FFFCF6] border-2 border-[#D6A15D] rounded-3xl shadow-2xl text-[#27231F] overflow-hidden flex flex-col max-h-[94vh]">
        {/* =================================================================
            HEADER BAR
            ================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#F6F1E8] border-b border-[#E8DED0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#493629] text-[#FFE2B5] flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-5 h-5 text-[#D6A15D]" />
            </div>
            <div>
              <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#854D27] block">
                MEMORA Explorer Atelier • Live 3D Sync
              </span>
              <h2
                id="character-studio-title"
                className="font-serif-display text-xl sm:text-2xl font-bold text-[#27231F] leading-tight"
              >
                Character Studio
              </h2>
            </div>
          </div>

          {/* Quick History & Randomise Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              aria-label="Undo character change"
              title="Undo"
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl border border-[#D8CBB8] bg-[#FFFCF6] hover:bg-[#EFE7DA] disabled:opacity-40 text-[#493629] inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              aria-label="Redo character change"
              title="Redo"
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl border border-[#D8CBB8] bg-[#FFFCF6] hover:bg-[#EFE7DA] disabled:opacity-40 text-[#493629] inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRandomise}
              className="min-h-[44px] px-3.5 rounded-xl border border-[#D6A15D] bg-[#F6F1E8] hover:bg-[#E9D4B1]/55 text-[#493629] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#854D27]" />
              <span>Randomise</span>
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="min-h-[44px] px-3.5 rounded-xl border border-[#D8CBB8] bg-[#FFFCF6] hover:bg-[#EFE7DA] text-[#6E645A] hover:text-[#27231F] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Default</span>
            </button>
            <button
              type="button"
              onClick={() => onCancel(initialSnapshotRef.current)}
              aria-label="Close Character Studio without saving"
              className="min-h-[44px] min-w-[44px] rounded-xl text-[#6E645A] hover:text-[#27231F] hover:bg-[#EFE7DA] inline-flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================
            MAIN BODY: LEFT 3D TURNTABLE PREVIEW + RIGHT 5-TAB ATELIER
            ================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
          {/* Left Column: Live 3D Turntable Canvas + Pose Switcher */}
          <div className="lg:col-span-5 bg-[#EFE7DA] border-b lg:border-b-0 lg:border-r border-[#E8DED0] p-4 flex flex-col justify-between gap-3">
            <div className="relative flex-1 min-h-[250px] sm:min-h-[310px] rounded-2xl overflow-hidden border border-[#D8CBB8] bg-[#EFE7DA] shadow-inner">
              <div
                ref={canvasMountRef}
                className="w-full h-full cursor-grab active:cursor-grabbing"
                aria-label="Interactive 3D Character Preview — Drag horizontally to rotate"
              />

              {/* Top-left badge: Drag hint & triangle budget */}
              <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#27231F]/80 text-[#FFE2B5] font-mono-tabular text-[10px]">
                  Drag to Rotate 360°
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#FFFCF6]/90 text-[#493629] border border-[#D8CBB8] font-mono-tabular text-[10px]">
                  {meshMetrics.triangles.toLocaleString()} tris ·{' '}
                  {meshMetrics.drawCalls} meshes
                </span>
              </div>

              {/* Bottom-right turntable auto-rotate toggle */}
              <button
                type="button"
                onClick={() => setAutoTurntable((prev) => !prev)}
                className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-xl bg-[#27231F]/85 hover:bg-[#27231F] text-[#FFE2B5] border border-[#D6A15D]/50 text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {autoTurntable ? (
                  <>
                    <Pause className="w-3 h-3 text-[#D6A15D]" />
                    <span>Turntable: On</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-[#D6A15D]" />
                    <span>Turntable: Paused</span>
                  </>
                )}
              </button>
            </div>

            {/* Pose Preview Strip */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#493629]">
                  Preview Animation Pose
                </span>
                <span className="text-[11px] font-mono-tabular text-[#6E645A]">
                  {PREVIEW_POSES.find((p) => p.id === previewPose)?.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PREVIEW_POSES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreviewPose(p.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                      previewPose === p.id
                        ? 'bg-[#493629] text-[#FFE2B5] border-[#D6A15D] font-semibold'
                        : 'bg-[#FFFCF6] hover:bg-[#F6F1E8] text-[#493629] border-[#D8CBB8]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: 5 Category Tabs & Options */}
          <div className="lg:col-span-7 flex flex-col min-h-0 overflow-hidden">
            {/* Category Tab Bar */}
            <div
              role="tablist"
              aria-label="Character Customisation Categories"
              className="grid grid-cols-5 gap-1 p-2 bg-[#F6F1E8] border-b border-[#E8DED0]"
            >
              {(
                [
                  { id: 'body', label: 'Body', icon: User },
                  { id: 'face_hair', label: 'Face & Hair', icon: Scissors },
                  { id: 'outfit', label: 'Outfit', icon: Shirt },
                  { id: 'accessories', label: 'Accessories', icon: Glasses },
                  { id: 'colours', label: 'Colours', icon: Palette },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={isSelected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#493629] text-[#FFE2B5] shadow-sm'
                        : 'text-[#6E645A] hover:text-[#27231F] hover:bg-[#EFE7DA]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
              {/* =============================================================
                  TAB 1: BODY TYPE & SKIN TONE
                  ============================================================= */}
              {activeTab === 'body' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                      Body Proportions & Frame
                    </h3>
                    <p className="text-xs text-[#6E645A] mt-0.5">
                      Adjusts shoulder width, torso taper, waist-to-hip ratio, and limb proportions. Every hairstyle, outfit, and accessory works with any frame.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      {(
                        [
                          {
                            id: 'masculine',
                            label: 'Masculine Frame',
                            desc: 'Broader shoulders, structured chest & athletic limb taper',
                          },
                          {
                            id: 'feminine',
                            label: 'Feminine Frame',
                            desc: 'Softly tapered shoulders, defined waist & balanced silhouette',
                          },
                          {
                            id: 'neutral',
                            label: 'Neutral Frame',
                            desc: 'Balanced universal curator proportions & classic posture',
                          },
                        ] as {
                          id: CharacterBodyType;
                          label: string;
                          desc: string;
                        }[]
                      ).map((preset) => {
                        const selected = currentConfig.bodyType === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              pushConfigUpdate((prev) => ({
                                ...prev,
                                bodyType: preset.id,
                              }))
                            }
                            className={`min-h-[44px] p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                              selected
                                ? 'bg-[#F6F1E8] border-[#493629] shadow-sm'
                                : 'bg-[#FFFCF6] border-[#E8DED0] hover:border-[#D6A15D]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-serif-display text-base font-bold text-[#27231F]">
                                {preset.label}
                              </span>
                              {selected && (
                                <Check className="w-4 h-4 text-[#854D27]" />
                              )}
                            </div>
                            <p className="text-[11px] text-[#6E645A] mt-1 leading-snug">
                              {preset.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                        Skin Tone Palette
                      </h3>
                      <span className="text-xs font-mono-tabular text-[#6E645A]">
                        {CHARACTER_SKIN_TONES.find(
                          (s) =>
                            s.hex.toLowerCase() ===
                            currentConfig.skinTone.toLowerCase(),
                        )?.label || currentConfig.skinTone}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-3">
                      {CHARACTER_SKIN_TONES.map((tone) => {
                        const selected =
                          currentConfig.skinTone.toLowerCase() ===
                          tone.hex.toLowerCase();
                        return (
                          <button
                            key={tone.id}
                            type="button"
                            onClick={() =>
                              pushConfigUpdate((prev) => ({
                                ...prev,
                                skinTone: tone.hex,
                              }))
                            }
                            className={`min-h-[44px] p-2 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                              selected
                                ? 'bg-[#F6F1E8] border-2 border-[#493629] font-semibold'
                                : 'bg-[#FFFCF6] border-[#E8DED0] hover:border-[#D6A15D]'
                            }`}
                          >
                            <span
                              className="w-6 h-6 rounded-full border border-[#27231F]/25 shrink-0 shadow-inner"
                              style={{ backgroundColor: tone.hex }}
                            />
                            <span className="text-xs text-[#27231F] truncate">
                              {tone.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================
                  TAB 2: FACE, HAIR STYLE, HAIR COLOUR & FACIAL HAIR
                  ============================================================= */}
              {activeTab === 'face_hair' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                      Hair Style (12 Styles)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2.5">
                      {CHARACTER_HAIR_STYLE_LABELS.map((style) => {
                        const selected = currentConfig.hairStyle === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() =>
                              pushConfigUpdate((prev) => ({
                                ...prev,
                                hairStyle: style.id,
                              }))
                            }
                            className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              selected
                                ? 'bg-[#493629] text-[#FFE2B5] border-[#D6A15D]'
                                : 'bg-[#FFFCF6] hover:bg-[#F6F1E8] text-[#27231F] border-[#E8DED0]'
                            }`}
                          >
                            <p className="text-xs font-bold truncate">
                              {style.label}
                            </p>
                            <p
                              className={`text-[10px] truncate mt-0.5 ${
                                selected ? 'text-[#E9D4B1]' : 'text-[#6E645A]'
                              }`}
                            >
                              {style.shortDesc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                      Hair Colour
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2.5">
                      {CHARACTER_HAIR_COLORS.map((col) => {
                        const selected =
                          currentConfig.hairColor.toLowerCase() ===
                          col.hex.toLowerCase();
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() =>
                              pushConfigUpdate((prev) => ({
                                ...prev,
                                hairColor: col.hex,
                              }))
                            }
                            className={`min-h-[44px] p-2 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                              selected
                                ? 'bg-[#F6F1E8] border-2 border-[#493629] font-semibold'
                                : 'bg-[#FFFCF6] border-[#E8DED0] hover:border-[#D6A15D]'
                            }`}
                          >
                            <span
                              className="w-5 h-5 rounded-full border border-[#27231F]/25 shrink-0"
                              style={{ backgroundColor: col.hex }}
                            />
                            <span className="text-xs text-[#27231F] truncate">
                              {col.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                      Facial Hair
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2.5">
                      {CHARACTER_FACIAL_HAIR_LABELS.map((fh) => {
                        const selected = currentConfig.facialHair === fh.id;
                        return (
                          <button
                            key={fh.id}
                            type="button"
                            onClick={() =>
                              pushConfigUpdate((prev) => ({
                                ...prev,
                                facialHair: fh.id,
                              }))
                            }
                            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                              selected
                                ? 'bg-[#493629] text-[#FFE2B5] border-[#D6A15D]'
                                : 'bg-[#FFFCF6] hover:bg-[#F6F1E8] text-[#27231F] border-[#E8DED0]'
                            }`}
                          >
                            {fh.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================
                  TAB 3: OUTFITS (10 OUTFITS + 4 FOOTWEAR)
                  ============================================================= */}
              {activeTab === 'outfit' && (
                <div className="space-y-6">
                  {(
                    [
                      'Classic & Contemporary',
                      'South-Asian & Heritage',
                    ] as const
                  ).map((categoryName) => (
                    <div key={categoryName}>
                      <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                        {categoryName} Outfits
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
                        {CHARACTER_OUTFIT_PRESETS.filter(
                          (o) => o.category === categoryName,
                        ).map((preset) => {
                          const selected = currentConfig.outfit === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() =>
                                handleSelectOutfitPreset(preset.id)
                              }
                              className={`min-h-[44px] p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                                selected
                                  ? 'bg-[#F6F1E8] border-[#493629] shadow-sm'
                                  : 'bg-[#FFFCF6] hover:bg-[#F6F1E8]/60 border-[#E8DED0]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-serif-display text-base font-bold text-[#27231F]">
                                  {preset.label}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-[#27231F]/20"
                                    style={{
                                      backgroundColor:
                                        preset.defaultColors.primary,
                                    }}
                                  />
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-[#27231F]/20"
                                    style={{
                                      backgroundColor:
                                        preset.defaultColors.secondary,
                                    }}
                                  />
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-[#27231F]/20"
                                    style={{
                                      backgroundColor:
                                        preset.defaultColors.accent,
                                    }}
                                  />
                                </div>
                              </div>
                              <p className="text-[11px] text-[#6E645A] mt-1 leading-snug">
                                {preset.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div>
                    <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                      Footwear Style
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
                      {CHARACTER_FOOTWEAR_LABELS.map((fw) => {
                        const selected = currentConfig.footwear === fw.id;
                        return (
                          <button
                            key={fw.id}
                            type="button"
                            onClick={() =>
                              pushConfigUpdate((prev) => ({
                                ...prev,
                                footwear: fw.id,
                              }))
                            }
                            className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              selected
                                ? 'bg-[#493629] text-[#FFE2B5] border-[#D6A15D]'
                                : 'bg-[#FFFCF6] hover:bg-[#F6F1E8] text-[#27231F] border-[#E8DED0]'
                            }`}
                          >
                            {fw.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================
                  TAB 4: ACCESSORIES (GLASSES, HEADWEAR, EARRINGS, WATCH, SATCHEL, SCARF)
                  ============================================================= */}
              {activeTab === 'accessories' && (
                <div className="space-y-6">
                  {/* Eyewear */}
                  <div>
                    <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                      Eyewear & Glasses
                    </h3>
                    <div className="grid grid-cols-3 gap-2.5 mt-2">
                      {(
                        [
                          { id: 'none', label: 'No Glasses' },
                          { id: 'round_brass', label: 'Round Brass Frames' },
                          {
                            id: 'rectangular_walnut',
                            label: 'Walnut Rectangular',
                          },
                        ] as { id: CharacterGlassesId; label: string }[]
                      ).map((item) => {
                        const selected =
                          currentConfig.accessories.glasses === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              pushConfigUpdate((prev) => ({
                                ...prev,
                                accessories: {
                                  ...prev.accessories,
                                  glasses: item.id,
                                },
                              }))
                            }
                            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                              selected
                                ? 'bg-[#493629] text-[#FFE2B5] border-[#D6A15D]'
                                : 'bg-[#FFFCF6] hover:bg-[#F6F1E8] text-[#27231F] border-[#E8DED0]'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Headwear */}
                  <div>
                    <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                      Headwear
                    </h3>
                    <div className="grid grid-cols-3 gap-2.5 mt-2">
                      {(
                        [
                          { id: 'none', label: 'No Headwear' },
                          { id: 'curator_cap', label: 'Curator Cap' },
                          { id: 'headband', label: 'Woven Headband' },
                        ] as { id: CharacterHeadwearId; label: string }[]
                      ).map((item) => {
                        const selected =
                          currentConfig.accessories.headwear === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              pushConfigUpdate((prev) => ({
                                ...prev,
                                accessories: {
                                  ...prev.accessories,
                                  headwear: item.id,
                                },
                              }))
                            }
                            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                              selected
                                ? 'bg-[#493629] text-[#FFE2B5] border-[#D6A15D]'
                                : 'bg-[#FFFCF6] hover:bg-[#F6F1E8] text-[#27231F] border-[#E8DED0]'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Earrings */}
                  <div>
                    <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                      Earrings
                    </h3>
                    <div className="grid grid-cols-3 gap-2.5 mt-2">
                      {(
                        [
                          { id: 'none', label: 'None' },
                          { id: 'gold_studs', label: 'Brushed Gold Studs' },
                          { id: 'champagne_hoops', label: 'Champagne Hoops' },
                        ] as { id: CharacterEarringsId; label: string }[]
                      ).map((item) => {
                        const selected =
                          currentConfig.accessories.earrings === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              pushConfigUpdate((prev) => ({
                                ...prev,
                                accessories: {
                                  ...prev.accessories,
                                  earrings: item.id,
                                },
                              }))
                            }
                            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                              selected
                                ? 'bg-[#493629] text-[#FFE2B5] border-[#D6A15D]'
                                : 'bg-[#FFFCF6] hover:bg-[#F6F1E8] text-[#27231F] border-[#E8DED0]'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Toggleable Explorer Gear */}
                  <div>
                    <h3 className="font-serif-display text-lg font-bold text-[#27231F]">
                      Curator Gear & Accents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
                      {(
                        [
                          {
                            key: 'satchel',
                            label: 'Leather Satchel',
                            desc: 'Cross-body archival bag',
                          },
                          {
                            key: 'scarf',
                            label: 'Woven Neck Scarf',
                            desc: 'Tinted collar wrap',
                          },
                          {
                            key: 'watch',
                            label: 'Chronograph Watch',
                            desc: 'Brass dial on left wrist',
                          },
                        ] as const
                      ).map((gear) => {
                        const active = currentConfig.accessories[gear.key];
                        return (
                          <button
                            key={gear.key}
                            type="button"
                            onClick={() =>
                              pushConfigUpdate((prev) => ({
                                ...prev,
                                accessories: {
                                  ...prev.accessories,
                                  [gear.key]: !prev.accessories[gear.key],
                                },
                              }))
                            }
                            className={`min-h-[44px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              active
                                ? 'bg-[#F6F1E8] border-2 border-[#493629]'
                                : 'bg-[#FFFCF6] border-[#E8DED0]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#27231F]">
                                {gear.label}
                              </span>
                              <span
                                className={`text-[10px] font-mono-tabular px-2 py-0.5 rounded ${
                                  active
                                    ? 'bg-[#493629] text-[#FFE2B5]'
                                    : 'bg-[#E8DED0] text-[#6E645A]'
                                }`}
                              >
                                {active ? 'ON' : 'OFF'}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#6E645A] mt-0.5">
                              {gear.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================
                  TAB 5: OUTFIT COLOURS (PRIMARY, SECONDARY, ACCENT)
                  ============================================================= */}
              {activeTab === 'colours' && (
                <div className="space-y-6">
                  {(
                    [
                      {
                        channel: 'primary',
                        title: 'Primary Garment Colour',
                        subtitle:
                          'Coat, blazer, shirt, hoodie, dress, kurta, kameez, sherwani, or saree pleats',
                      },
                      {
                        channel: 'secondary',
                        title: 'Secondary / Bottoms Colour',
                        subtitle:
                          'Trousers, chinos, joggers, churidar, salwar, lapel, or saree pallu drape',
                      },
                      {
                        channel: 'accent',
                        title: 'Accent, Scarf & Zari Trim Colour',
                        subtitle:
                          'Scarf, tie, belt ribbon, dupatta, embroidered placket, and gold/zari border',
                      },
                    ] as const
                  ).map((section) => {
                    const activeHex =
                      currentConfig.outfitColors[section.channel];
                    return (
                      <div key={section.channel} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h3 className="font-serif-display text-base font-bold text-[#27231F]">
                              {section.title}
                            </h3>
                            <p className="text-[11px] text-[#6E645A]">
                              {section.subtitle}
                            </p>
                          </div>
                          <label className="inline-flex items-center gap-1.5 text-xs font-mono-tabular text-[#493629] cursor-pointer">
                            <span>Custom</span>
                            <input
                              type="color"
                              value={activeHex}
                              onChange={(e) =>
                                pushConfigUpdate((prev) => ({
                                  ...prev,
                                  outfitColors: {
                                    ...prev.outfitColors,
                                    [section.channel]: e.target.value,
                                  },
                                }))
                              }
                              aria-label={`Custom ${section.title}`}
                              className="w-8 h-8 rounded-lg border border-[#D8CBB8] cursor-pointer"
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {CHARACTER_OUTFIT_SWATCHES.map((swatch) => {
                            const selected =
                              activeHex.toLowerCase() ===
                              swatch.hex.toLowerCase();
                            return (
                              <button
                                key={swatch.id}
                                type="button"
                                onClick={() =>
                                  pushConfigUpdate((prev) => ({
                                    ...prev,
                                    outfitColors: {
                                      ...prev.outfitColors,
                                      [section.channel]: swatch.hex,
                                    },
                                  }))
                                }
                                className={`min-h-[44px] p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                                  selected
                                    ? 'bg-[#F6F1E8] border-2 border-[#493629] font-semibold'
                                    : 'bg-[#FFFCF6] border-[#E8DED0] hover:border-[#D6A15D]'
                                }`}
                              >
                                <span
                                  className="w-5 h-5 rounded-full border border-[#27231F]/25"
                                  style={{ backgroundColor: swatch.hex }}
                                />
                                <span className="text-[10px] text-[#27231F] truncate max-w-full">
                                  {swatch.label.split(' ')[1] || swatch.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================
            FOOTER BAR: CANCEL & SAVE CHARACTER
            ================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#F6F1E8] border-t border-[#E8DED0] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#6E645A]">
            Changes preview live on your explorer inside the 3D museum.
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={() => onCancel(initialSnapshotRef.current)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#D8CBB8] bg-[#FFFCF6] hover:bg-[#EFE7DA] text-xs font-semibold text-[#493629] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(currentConfig)}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#493629] hover:bg-[#27231F] text-[#FFE2B5] border border-[#D6A15D] text-xs font-bold shadow-md inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4 text-[#D6A15D]" />
              <span>Save Explorer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
