/**
 * MEMORA — Procedural Dark-Luxury Museum Exterior, Landscaped Plaza,
 * Main Glass Entrance, Grand Double-Height Lobby & Reception Desk
 *
 * Extends the Ground Floor South axis (+Z from z = 9.6 outward to z = 48.0):
 * - z =  9.6 : Grand Atrium-to-Lobby Archway (open center x in [-2.7, +2.7])
 * - z =  9.6..23.0 : Grand Double-Height Lobby (11.8m ceiling, coffered walnut & ivory)
 * - z = 16.8 : Sculptural Walnut, Charcoal Stone & Champagne-Gold Reception Desk
 * - z = 23.0 : Main Glass Entrance (double-height mullioned curtain wall + automatic sliding glass doors)
 * - z = 23.0..48.0 : Monumental 5-Story Exterior Facade, Stepped Plaza, Twin Reflecting Pools,
 *                    Architectural Landscaping (InstancedMesh sculptural trees) & Bollard Lights
 *
 * All geometries, materials, and canvas textures are tracked for deterministic GPU disposal.
 */

import * as THREE from 'three';
import { FLOOR_HEIGHT } from './atriumCollision';

export interface ExteriorLobbyMaterials {
  matCharcoalStone: THREE.MeshStandardMaterial;
  matDarkPlaster: THREE.MeshStandardMaterial;
  matWalnut: THREE.MeshStandardMaterial;
  matBrushedGold: THREE.MeshStandardMaterial;
  matWarmIvory: THREE.MeshStandardMaterial;
  matFloor: THREE.MeshStandardMaterial;
  matTreeBark: THREE.MeshStandardMaterial;
  matMossBed: THREE.MeshStandardMaterial;
  matOliveFoliage: THREE.MeshStandardMaterial;
  matSageFoliage: THREE.MeshStandardMaterial;
}

export interface ExteriorLobbyBuildOptions {
  materials: ExteriorLobbyMaterials;
  totalFloors: number;
  maxAnisotropy: number;
  enableShadows: boolean;
  isSoftwareGl: boolean;
  museumDisplayName?: string;
}

export interface ExteriorLobbyUpdateResult {
  glassDoorOpenAmount: number;
  nearReception: boolean;
  zone: 'plaza' | 'lobby' | 'atrium';
}

export interface ExteriorLobbyController {
  group: THREE.Group;
  interactiveMeshes: THREE.Mesh[];
  cameraObstacleMeshes: THREE.Object3D[];
  update: (
    dt: number,
    elapsed: number,
    playerX: number,
    playerZ: number,
    floorNumber: number,
    isHidden: boolean,
  ) => ExteriorLobbyUpdateResult;
  setVisible: (visible: boolean) => void;
  getGlassDoorOpenAmount: () => number;
  dispose: () => void;
}

function createBrandFriezeTexture(
  title: string,
  subtitle: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rich architectural dark bronze-charcoal backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1B1816');
    grad.addColorStop(0.5, '#131110');
    grad.addColorStop(1, '#1B1816');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 256);

    // Subtle champagne-gold hairline frame
    ctx.strokeStyle = 'rgba(216, 180, 124, 0.72)';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, 988, 220);

    // Monumental serif wordmark
    ctx.fillStyle = '#F3ECE1';
    ctx.font = '600 94px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase().slice(0, 22), 512, 108);

    // Champagne-gold subtitle
    ctx.fillStyle = '#D8B47C';
    ctx.font = '500 26px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(subtitle.toUpperCase().slice(0, 48), 512, 184);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createConciergeScreenTexture(
  museumName: string,
  totalFloors: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#141210';
    ctx.fillRect(0, 0, 512, 320);

    ctx.strokeStyle = '#D4B07A';
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, 484, 292);

    ctx.fillStyle = '#D4B07A';
    ctx.font = '600 18px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MUSEUM CONCIERGE DIRECTORY', 36, 54);

    ctx.fillStyle = '#F3ECE1';
    ctx.font = '600 36px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(museumName.slice(0, 24), 36, 98);

    ctx.fillStyle = 'rgba(212, 176, 122, 0.35)';
    ctx.fillRect(36, 118, 440, 2);

    const floorLabels = [
      'FL 1 · Ground Atrium & Childhood World',
      'FL 2 · Journeys, Travels & Craft',
      'FL 3 · Passions & Special Moments',
      'FL 4 · Milestones, Heritage & Works',
      'FL 5 · Sanctuaries, Letters & Visions',
    ].slice(0, Math.max(1, totalFloors));

    ctx.font = '500 16px "Plus Jakarta Sans", system-ui, sans-serif';
    floorLabels.forEach((line, idx) => {
      ctx.fillStyle = idx === 0 ? '#E6C892' : '#DDD2C2';
      ctx.fillText(line, 36, 150 + idx * 28);
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function buildMuseumExteriorAndLobby(
  options: ExteriorLobbyBuildOptions,
): ExteriorLobbyController {
  const {
    materials,
    totalFloors,
    maxAnisotropy,
    enableShadows,
    isSoftwareGl,
    museumDisplayName = 'MEMORA',
  } = options;

  const group = new THREE.Group();
  group.name = 'memora_exterior_and_lobby_group';

  const ownedDisposables: (
    | THREE.BufferGeometry
    | THREE.Material
    | THREE.Texture
  )[] = [];
  const track = <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(
    asset: T,
  ): T => {
    ownedDisposables.push(asset);
    return asset;
  };

  const interactiveMeshes: THREE.Mesh[] = [];
  const cameraObstacleMeshes: THREE.Object3D[] = [];

  // Shared local specialty materials (glass, water, warm cove emissive, plaza dark stone)
  const matArchitecturalGlass = track(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#2A333B'),
      roughness: 0.08,
      metalness: 0.18,
      transparent: true,
      opacity: isSoftwareGl ? 0.34 : 0.28,
      transmission: 0, // Keep single-pass crisp across desktop & mobile
      clearcoat: isSoftwareGl ? 0 : 0.85,
      clearcoatRoughness: 0.08,
      depthWrite: false,
      envMapIntensity: 1.25,
    }),
  );

  const matWarmCoveGlow = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFF1D6'),
      emissive: new THREE.Color('#E8B973'),
      emissiveIntensity: 1.15,
      roughness: 0.25,
    }),
  );

  const matFacadeWindowGlow = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3B3126'),
      emissive: new THREE.Color('#D4A35E'),
      emissiveIntensity: 0.42,
      roughness: 0.14,
      metalness: 0.45,
      envMapIntensity: 1.1,
    }),
  );

  const matPlazaStone = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1B1917'),
      roughness: 0.68,
      metalness: 0.06,
      envMapIntensity: 0.45,
    }),
  );

  const matHorizonGround = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#131110'),
      roughness: 0.92,
      metalness: 0.02,
      envMapIntensity: 0.2,
    }),
  );

  const matReflectingWater = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#10171D'),
      roughness: 0.07,
      metalness: 0.72,
      envMapIntensity: 1.45,
    }),
  );

  const matDarkBronze = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2A231E'),
      roughness: 0.34,
      metalness: 0.68,
      envMapIntensity: 0.95,
    }),
  );

  // =========================================================================
  // 1. GRAND DOUBLE-HEIGHT LOBBY (z = 9.6 to 23.0, x = -9.2 to +9.2, h = 11.8m)
  // =========================================================================
  const lobbyGroup = new THREE.Group();
  lobbyGroup.name = 'grand_double_height_lobby';
  group.add(lobbyGroup);

  const lobbyHeight = FLOOR_HEIGHT * 2 - 0.15; // 11.85m double height

  // Lobby floor slab (flush with Ground Floor Atrium y = 0)
  const lobbyFloor = new THREE.Mesh(
    track(new THREE.BoxGeometry(19.2, 0.26, 14.0)),
    materials.matFloor,
  );
  lobbyFloor.position.set(0, -0.13, 16.3);
  lobbyFloor.receiveShadow = true;
  lobbyGroup.add(lobbyFloor);

  // Ceremonial inlaid champagne-gold carpet/runner lines guiding entrance -> reception -> atrium
  const runnerMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2A211B'),
      roughness: 0.46,
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const lobbyRunner = new THREE.Mesh(
    track(new THREE.PlaneGeometry(4.8, 13.0)),
    runnerMat,
  );
  lobbyRunner.rotation.x = -Math.PI / 2;
  lobbyRunner.position.set(0, 0.008, 16.3);
  lobbyGroup.add(lobbyRunner);

  const lobbyRunnerTrimGeo = track(new THREE.BoxGeometry(0.06, 0.014, 13.0));
  [-2.44, 2.44].forEach((tx) => {
    const trim = new THREE.Mesh(lobbyRunnerTrimGeo, materials.matBrushedGold);
    trim.position.set(tx, 0.008, 16.3);
    lobbyGroup.add(trim);
  });

  // Double-height Coffered Ceiling (walnut ribs + warm ivory panels)
  const lobbyCeilingBase = new THREE.Mesh(
    track(new THREE.BoxGeometry(19.2, 0.3, 14.0)),
    materials.matWarmIvory,
  );
  lobbyCeilingBase.position.set(0, lobbyHeight + 0.15, 16.3);
  lobbyGroup.add(lobbyCeilingBase);

  const cofferBeamXGeo = track(new THREE.BoxGeometry(18.6, 0.42, 0.36));
  for (let bz = 11.2; bz <= 21.8; bz += 2.65) {
    const beam = new THREE.Mesh(cofferBeamXGeo, materials.matWalnut);
    beam.position.set(0, lobbyHeight - 0.12, bz);
    lobbyGroup.add(beam);
  }
  const cofferBeamZGeo = track(new THREE.BoxGeometry(0.34, 0.38, 13.2));
  [-6.2, -2.8, 2.8, 6.2].forEach((bx) => {
    const beam = new THREE.Mesh(cofferBeamZGeo, materials.matWalnut);
    beam.position.set(bx, lobbyHeight - 0.14, 16.3);
    lobbyGroup.add(beam);
  });

  // Recessed warm champagne-gold ceiling cove light strips
  const coveStripGeo = track(new THREE.BoxGeometry(14.8, 0.05, 0.14));
  [12.5, 16.3, 20.1].forEach((cz) => {
    const strip = new THREE.Mesh(coveStripGeo, matWarmCoveGlow);
    strip.position.set(0, lobbyHeight - 0.02, cz);
    lobbyGroup.add(strip);
  });

  // Sculptural Suspended Champagne-Gold Chandelier Ring above the Double-Height Lobby
  const chandelierGroup = new THREE.Group();
  chandelierGroup.position.set(0, 8.85, 16.8);
  lobbyGroup.add(chandelierGroup);

  const outerRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(2.35, 0.065, 12, 48)),
    materials.matBrushedGold,
  );
  outerRing.rotation.x = Math.PI / 2;
  chandelierGroup.add(outerRing);

  const innerRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(1.45, 0.05, 10, 36)),
    materials.matBrushedGold,
  );
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = -0.45;
  chandelierGroup.add(innerRing);

  const innerGlowRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(2.26, 0.028, 8, 40)),
    matWarmCoveGlow,
  );
  innerGlowRing.rotation.x = Math.PI / 2;
  innerGlowRing.position.y = -0.05;
  chandelierGroup.add(innerGlowRing);

  const rodGeo = track(new THREE.CylinderGeometry(0.014, 0.014, 3.0, 6));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const rod = new THREE.Mesh(rodGeo, materials.matBrushedGold);
    rod.position.set(Math.cos(a) * 2.35, 1.5, Math.sin(a) * 2.35);
    chandelierGroup.add(rod);
  }

  // West & East Double-Height Lobby Walls (x = ±9.2) with vertical fluted walnut ribs
  const sideWallGeo = track(new THREE.BoxGeometry(0.48, lobbyHeight, 13.8));
  const ribGeo = track(new THREE.BoxGeometry(0.16, lobbyHeight - 1.2, 0.24));
  const sconceGlowGeo = track(new THREE.BoxGeometry(0.06, 1.8, 0.08));
  const lobbyColumnGeo = track(new THREE.CylinderGeometry(0.32, 0.36, lobbyHeight, 16));
  const lobbyColCapGeo = track(new THREE.CylinderGeometry(0.42, 0.34, 0.32, 16));

  [-9.2, 9.2].forEach((wx) => {
    const sideWall = new THREE.Mesh(sideWallGeo, materials.matCharcoalStone);
    sideWall.position.set(wx, lobbyHeight * 0.5, 16.3);
    sideWall.receiveShadow = true;
    lobbyGroup.add(sideWall);
    cameraObstacleMeshes.push(sideWall);

    const inward = wx < 0 ? 1 : -1;
    for (let rz = 11.0; rz <= 21.6; rz += 1.75) {
      const rib = new THREE.Mesh(ribGeo, materials.matWalnut);
      rib.position.set(wx + inward * 0.28, lobbyHeight * 0.5, rz);
      lobbyGroup.add(rib);
    }

    // Double-height sculptural colonnade pillars inset along the lobby flanks
    [12.2, 16.8, 21.0].forEach((cz) => {
      const col = new THREE.Mesh(lobbyColumnGeo, materials.matDarkPlaster);
      col.position.set(wx + inward * 0.92, lobbyHeight * 0.5, cz);
      lobbyGroup.add(col);

      const base = new THREE.Mesh(lobbyColCapGeo, materials.matBrushedGold);
      base.position.set(wx + inward * 0.92, 0.16, cz);
      lobbyGroup.add(base);

      const cap = new THREE.Mesh(lobbyColCapGeo, materials.matBrushedGold);
      cap.position.set(wx + inward * 0.92, lobbyHeight - 0.16, cz);
      lobbyGroup.add(cap);

      const sconce = new THREE.Mesh(sconceGlowGeo, matWarmCoveGlow);
      sconce.position.set(wx + inward * 0.36, 3.1, cz);
      lobbyGroup.add(sconce);
    });
  });

  // Grand Atrium-to-Lobby Transition Archway at z = 9.6 (open center x in [-2.7, +2.7])
  const archPierGeo = track(new THREE.BoxGeometry(2.9, FLOOR_HEIGHT, 0.54));
  [-4.15, 4.15].forEach((px) => {
    const pier = new THREE.Mesh(archPierGeo, materials.matWalnut);
    pier.position.set(px, FLOOR_HEIGHT * 0.5, 9.6);
    lobbyGroup.add(pier);
    cameraObstacleMeshes.push(pier);
  });

  const archJambGoldGeo = track(new THREE.BoxGeometry(0.14, 5.2, 0.62));
  [-2.74, 2.74].forEach((jx) => {
    const jamb = new THREE.Mesh(archJambGoldGeo, materials.matBrushedGold);
    jamb.position.set(jx, 2.6, 9.6);
    lobbyGroup.add(jamb);
  });

  const archLintel = new THREE.Mesh(
    track(new THREE.BoxGeometry(5.68, 0.85, 0.62)),
    materials.matWalnut,
  );
  archLintel.position.set(0, 5.58, 9.6);
  lobbyGroup.add(archLintel);

  const archLintelTrim = new THREE.Mesh(
    track(new THREE.BoxGeometry(5.68, 0.1, 0.66)),
    materials.matBrushedGold,
  );
  archLintelTrim.position.set(0, 5.14, 9.6);
  lobbyGroup.add(archLintelTrim);

  // Lobby ambient point lights (kept to 2 lights for performance discipline)
  const lobbyLightA = new THREE.PointLight(0xffdca8, 2.4, 24, 1.35);
  lobbyLightA.position.set(0, 7.6, 16.8);
  lobbyGroup.add(lobbyLightA);

  const lobbyLightB = new THREE.PointLight(0xffdfb0, 1.4, 18, 1.45);
  lobbyLightB.position.set(0, 4.2, 11.4);
  lobbyGroup.add(lobbyLightB);

  // =========================================================================
  // 2. SCULPTURAL RECEPTION DESK (centered at x = 0, z = 16.8)
  // =========================================================================
  const receptionGroup = new THREE.Group();
  receptionGroup.name = 'museum_reception_desk';
  receptionGroup.position.set(0, 0, 16.8);
  lobbyGroup.add(receptionGroup);

  // Recessed champagne-gold toe-kick plinth
  const deskPlinth = new THREE.Mesh(
    track(new THREE.BoxGeometry(3.96, 0.14, 1.18)),
    materials.matBrushedGold,
  );
  deskPlinth.position.set(0, 0.07, 0);
  receptionGroup.add(deskPlinth);

  // Fluted walnut desk body
  const deskBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(4.14, 0.88, 1.28)),
    materials.matWalnut,
  );
  deskBody.position.set(0, 0.58, 0);
  deskBody.castShadow = enableShadows;
  deskBody.receiveShadow = true;
  receptionGroup.add(deskBody);
  cameraObstacleMeshes.push(deskBody);

  // Vertical champagne-gold decorative flutes across the south-facing guest front
  const deskFluteGeo = track(new THREE.BoxGeometry(0.055, 0.78, 0.05));
  for (let fx = -1.85; fx <= 1.85; fx += 0.26) {
    const flute = new THREE.Mesh(deskFluteGeo, materials.matBrushedGold);
    flute.position.set(fx, 0.58, 0.65);
    receptionGroup.add(flute);
  }

  // Honed charcoal stone overhang counter slab
  const deskCounter = new THREE.Mesh(
    track(new THREE.BoxGeometry(4.32, 0.09, 1.42)),
    materials.matCharcoalStone,
  );
  deskCounter.position.set(0, 1.065, 0);
  receptionGroup.add(deskCounter);

  // Champagne-gold under-counter reveal light strip
  const deskGlowStrip = new THREE.Mesh(
    track(new THREE.BoxGeometry(4.1, 0.035, 0.04)),
    matWarmCoveGlow,
  );
  deskGlowStrip.position.set(0, 1.0, 0.66);
  receptionGroup.add(deskGlowStrip);

  // Warm ivory marble concierge table lamp on west end of counter
  const lampBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.08, 0.11, 0.06, 16)),
    materials.matBrushedGold,
  );
  lampBase.position.set(-1.55, 1.14, 0.12);
  receptionGroup.add(lampBase);

  const lampStem = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 10)),
    materials.matBrushedGold,
  );
  lampStem.position.set(-1.55, 1.32, 0.12);
  receptionGroup.add(lampStem);

  const lampShade = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.14, 0.21, 0.16, 18)),
    matWarmCoveGlow,
  );
  lampShade.position.set(-1.55, 1.5, 0.12);
  receptionGroup.add(lampShade);

  // Sculptural floral bronze urn on east end of counter
  const urnBody = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.09, 0.13, 0.28, 16)),
    materials.matBrushedGold,
  );
  urnBody.position.set(1.55, 1.25, 0.1);
  receptionGroup.add(urnBody);
  const urnFoliage = new THREE.Mesh(
    track(new THREE.DodecahedronGeometry(0.17, 1)),
    materials.matOliveFoliage,
  );
  urnFoliage.position.set(1.55, 1.46, 0.1);
  receptionGroup.add(urnFoliage);

  // Angled illuminated Concierge Directory Screen facing arriving guests (+Z)
  const conciergeTex = track(
    createConciergeScreenTexture(museumDisplayName, totalFloors, maxAnisotropy),
  );
  const conciergeFrame = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.18, 0.72, 0.06)),
    materials.matBrushedGold,
  );
  conciergeFrame.position.set(0, 1.38, 0.14);
  conciergeFrame.rotation.x = -0.34;
  receptionGroup.add(conciergeFrame);

  const conciergeScreen = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1.1, 0.64)),
    track(new THREE.MeshBasicMaterial({ map: conciergeTex })),
  );
  conciergeScreen.position.set(0, 1.38, 0.175);
  conciergeScreen.rotation.x = -0.34;
  receptionGroup.add(conciergeScreen);

  // Invisible interactive hitbox for clicking Reception Desk
  const receptionHitbox = new THREE.Mesh(
    track(new THREE.BoxGeometry(4.5, 2.0, 1.8)),
    track(new THREE.MeshBasicMaterial({ visible: false })),
  );
  receptionHitbox.position.set(0, 1.0, 0);
  receptionHitbox.userData = {
    kind: 'reception_desk',
    type: 'reception_desk',
    title: 'Museum Reception & Concierge',
    subtitle: 'Click or press [E] to view museum directory & jump to floors',
  };
  receptionGroup.add(receptionHitbox);
  interactiveMeshes.push(receptionHitbox);

  // =========================================================================
  // 3. MAIN GLASS ENTRANCE (z = 23.0) & AUTOMATIC SLIDING GLASS DOORS
  // =========================================================================
  const glassEntranceGroup = new THREE.Group();
  glassEntranceGroup.name = 'main_glass_entrance';
  glassEntranceGroup.position.set(0, 0, 23.0);
  group.add(glassEntranceGroup);

  // Flanking double-height glass curtain wall sections (x in [-9.2, -2.7] and [2.7, 9.2])
  const flankGlassGeo = track(new THREE.BoxGeometry(6.3, lobbyHeight - 0.5, 0.12));
  const mullionVGeo = track(new THREE.BoxGeometry(0.14, lobbyHeight, 0.24));
  const mullionHGeo = track(new THREE.BoxGeometry(6.5, 0.14, 0.24));

  [-5.95, 5.95].forEach((fx) => {
    const glassPane = new THREE.Mesh(flankGlassGeo, matArchitecturalGlass);
    glassPane.position.set(fx, lobbyHeight * 0.5, 0);
    glassPane.renderOrder = 4;
    glassEntranceGroup.add(glassPane);

    // Horizontal champagne-gold transoms
    [3.8, 7.6, 11.4].forEach((ty) => {
      const transom = new THREE.Mesh(mullionHGeo, materials.matBrushedGold);
      transom.position.set(fx, ty, 0);
      glassEntranceGroup.add(transom);
    });
  });

  // Vertical curtain-wall mullions
  [-9.1, -6.0, -2.75, 2.75, 6.0, 9.1].forEach((mx) => {
    const mullion = new THREE.Mesh(mullionVGeo, matDarkBronze);
    mullion.position.set(mx, lobbyHeight * 0.5, 0);
    glassEntranceGroup.add(mullion);
  });

  // Upper glass transom above the sliding doors (y = 4.65 to 11.8)
  const upperDoorGlass = new THREE.Mesh(
    track(new THREE.BoxGeometry(5.4, lobbyHeight - 4.8, 0.12)),
    matArchitecturalGlass,
  );
  upperDoorGlass.position.set(0, 4.75 + (lobbyHeight - 4.8) * 0.5, 0);
  upperDoorGlass.renderOrder = 4;
  glassEntranceGroup.add(upperDoorGlass);

  const doorHeaderBeam = new THREE.Mesh(
    track(new THREE.BoxGeometry(5.68, 0.34, 0.34)),
    materials.matBrushedGold,
  );
  doorHeaderBeam.position.set(0, 4.68, 0);
  glassEntranceGroup.add(doorHeaderBeam);

  // Automatic Sliding Glass Double Doors (each 1.38m wide -> spans [-2.76..+2.76])
  const buildGlassDoorLeaf = (side: -1 | 1): THREE.Group => {
    const leaf = new THREE.Group();
    const pane = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.36, 4.46, 0.07)),
      matArchitecturalGlass,
    );
    pane.position.set(0, 2.23, 0);
    pane.renderOrder = 5;
    leaf.add(pane);

    const frameTop = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.38, 0.1, 0.1)),
      materials.matBrushedGold,
    );
    frameTop.position.set(0, 4.45, 0);
    leaf.add(frameTop);

    const frameBot = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.38, 0.16, 0.1)),
      materials.matBrushedGold,
    );
    frameBot.position.set(0, 0.08, 0);
    leaf.add(frameBot);

    const stileGeo = track(new THREE.BoxGeometry(0.08, 4.48, 0.1));
    [-0.65, 0.65].forEach((sx) => {
      const stile = new THREE.Mesh(stileGeo, materials.matBrushedGold);
      stile.position.set(sx, 2.24, 0);
      leaf.add(stile);
    });

    // Vertical champagne-gold pull handle
    const handle = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.022, 0.022, 0.92, 10)),
      materials.matBrushedGold,
    );
    handle.position.set(side < 0 ? 0.52 : -0.52, 1.35, 0.09);
    leaf.add(handle);

    return leaf;
  };

  const leftGlassDoor = buildGlassDoorLeaf(-1);
  leftGlassDoor.position.set(-0.69, 0, 0.02);
  glassEntranceGroup.add(leftGlassDoor);

  const rightGlassDoor = buildGlassDoorLeaf(1);
  rightGlassDoor.position.set(0.69, 0, 0.02);
  glassEntranceGroup.add(rightGlassDoor);

  // =========================================================================
  // 4. COMPLETE 5-STORY DARK-LUXURY MUSEUM EXTERIOR FACADE
  // =========================================================================
  const facadeGroup = new THREE.Group();
  facadeGroup.name = 'memora_exterior_facade';
  group.add(facadeGroup);

  const visibleExteriorFloors = Math.max(5, totalFloors);
  const totalBuildingHeight = visibleExteriorFloors * FLOOR_HEIGHT + 1.6;

  // Main upper monumental facade above double-height lobby (y = 11.85 to totalBuildingHeight)
  const upperFacadeHeight = Math.max(6, totalBuildingHeight - lobbyHeight);
  const upperFacadeWall = new THREE.Mesh(
    track(new THREE.BoxGeometry(26.4, upperFacadeHeight, 0.9)),
    materials.matCharcoalStone,
  );
  upperFacadeWall.position.set(0, lobbyHeight + upperFacadeHeight * 0.5, 22.85);
  facadeGroup.add(upperFacadeWall);

  // Flanking monumental charcoal-stone exterior wing towers (x = ±11.2, full 5-story height)
  const wingTowerGeo = track(
    new THREE.BoxGeometry(4.4, totalBuildingHeight, 14.4),
  );
  [-11.4, 11.4].forEach((wx) => {
    const tower = new THREE.Mesh(wingTowerGeo, materials.matCharcoalStone);
    tower.position.set(wx, totalBuildingHeight * 0.5, 16.0);
    facadeGroup.add(tower);

    // Tall vertical walnut fin louvers adorning the exterior towers
    const finGeo = track(
      new THREE.BoxGeometry(0.18, totalBuildingHeight - 2.4, 0.65),
    );
    for (let lx = -1.6; lx <= 1.6; lx += 0.8) {
      const fin = new THREE.Mesh(finGeo, materials.matWalnut);
      fin.position.set(wx + lx, totalBuildingHeight * 0.5, 23.38);
      facadeGroup.add(fin);
    }
  });

  // Glowing horizontal architectural ribbon windows showing Floors 3, 4 & 5 from the plaza
  const ribbonGlassGeo = track(new THREE.BoxGeometry(17.6, 2.35, 0.16));
  const ribbonTrimGeo = track(new THREE.BoxGeometry(18.2, 0.16, 0.42));
  for (let fl = 2; fl < visibleExteriorFloors; fl++) {
    const ribbonY = fl * FLOOR_HEIGHT + 3.0;
    const ribbon = new THREE.Mesh(ribbonGlassGeo, matFacadeWindowGlow);
    ribbon.position.set(0, ribbonY, 23.36);
    facadeGroup.add(ribbon);

    const sill = new THREE.Mesh(ribbonTrimGeo, materials.matBrushedGold);
    sill.position.set(0, ribbonY - 1.24, 23.45);
    facadeGroup.add(sill);

    const lintel = new THREE.Mesh(ribbonTrimGeo, materials.matBrushedGold);
    lintel.position.set(0, ribbonY + 1.24, 23.45);
    facadeGroup.add(lintel);
  }

  // Crown Attic Parapet & Champagne-Gold Roofline Cornice
  const roofCornice = new THREE.Mesh(
    track(new THREE.BoxGeometry(27.6, 0.48, 2.2)),
    materials.matBrushedGold,
  );
  roofCornice.position.set(0, totalBuildingHeight + 0.1, 22.8);
  facadeGroup.add(roofCornice);

  // Cantilevered Architectural Entrance Canopy (z = 23.0 to 27.6, y = 5.35m)
  const canopySlab = new THREE.Mesh(
    track(new THREE.BoxGeometry(10.8, 0.42, 4.8)),
    materials.matCharcoalStone,
  );
  canopySlab.position.set(0, 5.42, 25.3);
  canopySlab.castShadow = enableShadows;
  facadeGroup.add(canopySlab);

  const canopyGoldEdge = new THREE.Mesh(
    track(new THREE.BoxGeometry(10.96, 0.14, 4.96)),
    materials.matBrushedGold,
  );
  canopyGoldEdge.position.set(0, 5.2, 25.3);
  facadeGroup.add(canopyGoldEdge);

  const canopyWalnutSoffit = new THREE.Mesh(
    track(new THREE.BoxGeometry(10.2, 0.08, 4.3)),
    materials.matWalnut,
  );
  canopyWalnutSoffit.position.set(0, 5.18, 25.3);
  facadeGroup.add(canopyWalnutSoffit);

  // Illuminated "MEMORA" Architectural Frieze mounted on the Entrance Canopy
  const friezeTex = track(
    createBrandFriezeTexture(
      museumDisplayName,
      'Your Life · Your Stories · Your World',
      maxAnisotropy,
    ),
  );
  const friezeBoard = new THREE.Mesh(
    track(new THREE.PlaneGeometry(6.8, 1.55)),
    track(new THREE.MeshBasicMaterial({ map: friezeTex })),
  );
  friezeBoard.position.set(0, 6.45, 27.55);
  facadeGroup.add(friezeBoard);

  const friezeBacking = new THREE.Mesh(
    track(new THREE.BoxGeometry(7.04, 1.76, 0.24)),
    materials.matBrushedGold,
  );
  friezeBacking.position.set(0, 6.45, 27.4);
  facadeGroup.add(friezeBacking);

  // Warm canopy welcome wash light (1 light covering entrance threshold)
  const canopyLight = new THREE.PointLight(0xffdca3, 2.6, 22, 1.35);
  canopyLight.position.set(0, 4.9, 26.2);
  facadeGroup.add(canopyLight);

  // =========================================================================
  // 5. OUTDOOR PLAZA, REFLECTING POOLS & ARCHITECTURAL LANDSCAPING
  // =========================================================================
  const plazaGroup = new THREE.Group();
  plazaGroup.name = 'memora_outdoor_plaza';
  group.add(plazaGroup);

  // Wide twilight horizon ground plane (eliminates any floating box / void edge)
  const horizonPlane = new THREE.Mesh(
    track(new THREE.PlaneGeometry(220, 220)),
    matHorizonGround,
  );
  horizonPlane.rotation.x = -Math.PI / 2;
  horizonPlane.position.set(0, -0.06, 20);
  plazaGroup.add(horizonPlane);

  // Main paved dark-stone plaza terrace (z = 23.0 to 47.0, x = -22 to +22)
  const plazaTerrace = new THREE.Mesh(
    track(new THREE.BoxGeometry(44.0, 0.08, 25.0)),
    matPlazaStone,
  );
  plazaTerrace.position.set(0, -0.04, 35.4);
  plazaTerrace.receiveShadow = true;
  plazaGroup.add(plazaTerrace);

  // Ceremonial central approach promenade with champagne-gold inlays
  const promenade = new THREE.Mesh(
    track(new THREE.PlaneGeometry(7.2, 23.4)),
    materials.matFloor,
  );
  promenade.rotation.x = -Math.PI / 2;
  promenade.position.set(0, 0.008, 34.8);
  promenade.receiveShadow = true;
  plazaGroup.add(promenade);

  const promBorderGeo = track(new THREE.BoxGeometry(0.1, 0.016, 23.4));
  [-3.64, 3.64].forEach((bx) => {
    const border = new THREE.Mesh(promBorderGeo, materials.matBrushedGold);
    border.position.set(bx, 0.008, 34.8);
    plazaGroup.add(border);
  });

  // Symmetrical Twin Reflecting Pools flanking the promenade (x = ±8.6, z = 32.0)
  const poolCopingGeo = track(new THREE.BoxGeometry(6.4, 0.36, 11.2));
  const poolWaterGeo = track(new THREE.PlaneGeometry(5.6, 10.4));
  const poolRimGlowGeo = track(new THREE.BoxGeometry(5.76, 0.04, 10.56));
  const waterMeshes: THREE.Mesh[] = [];

  [-8.6, 8.6].forEach((px) => {
    const coping = new THREE.Mesh(poolCopingGeo, materials.matCharcoalStone);
    coping.position.set(px, 0.16, 32.0);
    coping.receiveShadow = true;
    plazaGroup.add(coping);

    const rimGlow = new THREE.Mesh(poolRimGlowGeo, matWarmCoveGlow);
    rimGlow.position.set(px, 0.28, 32.0);
    plazaGroup.add(rimGlow);

    const water = new THREE.Mesh(poolWaterGeo, matReflectingWater);
    water.rotation.x = -Math.PI / 2;
    water.position.set(px, 0.31, 32.0);
    plazaGroup.add(water);
    waterMeshes.push(water);
  });

  // Low Champagne-Gold Bollard Path Lights along the promenade
  const bollardPostGeo = track(new THREE.CylinderGeometry(0.08, 0.1, 0.78, 12));
  const bollardLampGeo = track(new THREE.CylinderGeometry(0.072, 0.072, 0.18, 12));
  const bollardCapGeo = track(new THREE.CylinderGeometry(0.11, 0.09, 0.06, 12));

  [-4.1, 4.1].forEach((bx) => {
    [27.2, 31.8, 36.4, 41.0].forEach((bz) => {
      const post = new THREE.Mesh(bollardPostGeo, matDarkBronze);
      post.position.set(bx, 0.39, bz);
      plazaGroup.add(post);

      const glow = new THREE.Mesh(bollardLampGeo, matWarmCoveGlow);
      glow.position.set(bx, 0.72, bz);
      plazaGroup.add(glow);

      const cap = new THREE.Mesh(bollardCapGeo, materials.matBrushedGold);
      cap.position.set(bx, 0.84, bz);
      plazaGroup.add(cap);
    });
  });

  // Sculptural Walnut & Charcoal Stone Outdoor Benches
  const benchBaseGeo = track(new THREE.BoxGeometry(2.3, 0.36, 0.62));
  const benchSeatGeo = track(new THREE.BoxGeometry(2.45, 0.09, 0.68));
  [-5.1, 5.1].forEach((bx) => {
    const base = new THREE.Mesh(benchBaseGeo, materials.matCharcoalStone);
    base.position.set(bx, 0.18, 39.2);
    plazaGroup.add(base);

    const seat = new THREE.Mesh(benchSeatGeo, materials.matWalnut);
    seat.position.set(bx, 0.4, 39.2);
    plazaGroup.add(seat);
  });

  // Architectural Sculptural Landscaping — Raised Stone Planters + InstancedMesh Olive/Cypress Trees
  const treeCoords: [number, number, number][] = [
    [-14.5, 27.5, 1.12],
    [-14.5, 34.0, 0.96],
    [-14.5, 40.5, 1.08],
    [14.5, 27.5, 1.06],
    [14.5, 34.0, 1.14],
    [14.5, 40.5, 0.95],
    [-10.2, 42.8, 0.92],
    [10.2, 42.8, 1.02],
    [-17.8, 25.0, 1.2],
    [17.8, 25.0, 1.18],
    [-17.8, 37.5, 1.15],
    [17.8, 37.5, 1.1],
  ];

  const planterBoxGeo = track(new THREE.CylinderGeometry(1.15, 1.02, 0.68, 14));
  const planterSoilGeo = track(new THREE.CircleGeometry(0.98, 14));
  const trunkGeo = track(new THREE.CylinderGeometry(0.14, 0.22, 2.6, 10));
  const canopyGeo = track(new THREE.DodecahedronGeometry(1.22, 1));

  const planterInst = new THREE.InstancedMesh(
    planterBoxGeo,
    materials.matCharcoalStone,
    treeCoords.length,
  );
  const trunkInst = new THREE.InstancedMesh(
    trunkGeo,
    materials.matTreeBark,
    treeCoords.length,
  );
  const lowerCanopyInst = new THREE.InstancedMesh(
    canopyGeo,
    materials.matOliveFoliage,
    treeCoords.length,
  );
  const upperCanopyInst = new THREE.InstancedMesh(
    canopyGeo,
    materials.matSageFoliage,
    treeCoords.length,
  );

  const dummy = new THREE.Object3D();
  const tintColor = new THREE.Color();

  treeCoords.forEach(([tx, tz, sc], idx) => {
    // Raised planter
    dummy.position.set(tx, 0.34, tz);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, idx * 0.5, 0);
    dummy.updateMatrix();
    planterInst.setMatrixAt(idx, dummy.matrix);

    // Moss soil disc
    const soil = new THREE.Mesh(planterSoilGeo, materials.matMossBed);
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(tx, 0.685, tz);
    plazaGroup.add(soil);

    // Trunk
    dummy.position.set(tx, 1.85, tz);
    dummy.scale.set(sc * 0.9, sc, sc * 0.9);
    dummy.rotation.set(0, idx * 0.7, 0);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);

    // Lower sculpted canopy cluster
    dummy.position.set(tx, 3.25 * sc, tz);
    dummy.scale.set(sc * 1.15, sc * 0.92, sc * 1.15);
    dummy.rotation.set(0.15, idx * 1.1, 0.08);
    dummy.updateMatrix();
    lowerCanopyInst.setMatrixAt(idx, dummy.matrix);
    tintColor.setHSL(0.28 + (idx % 3) * 0.015, 0.24, 0.22 + (idx % 2) * 0.04);
    lowerCanopyInst.setColorAt(idx, tintColor);

    // Upper offset crown cluster
    dummy.position.set(
      tx + (idx % 2 === 0 ? 0.32 : -0.32),
      4.15 * sc,
      tz + (idx % 3 === 0 ? 0.22 : -0.18),
    );
    dummy.scale.set(sc * 0.84, sc * 0.88, sc * 0.84);
    dummy.rotation.set(-0.1, idx * 0.9, -0.12);
    dummy.updateMatrix();
    upperCanopyInst.setMatrixAt(idx, dummy.matrix);
    tintColor.setHSL(0.26 + (idx % 4) * 0.012, 0.22, 0.28 + (idx % 3) * 0.03);
    upperCanopyInst.setColorAt(idx, tintColor);
  });

  planterInst.instanceMatrix.needsUpdate = true;
  trunkInst.instanceMatrix.needsUpdate = true;
  lowerCanopyInst.instanceMatrix.needsUpdate = true;
  upperCanopyInst.instanceMatrix.needsUpdate = true;
  if (lowerCanopyInst.instanceColor) lowerCanopyInst.instanceColor.needsUpdate = true;
  if (upperCanopyInst.instanceColor) upperCanopyInst.instanceColor.needsUpdate = true;

  planterInst.computeBoundingSphere();
  trunkInst.computeBoundingSphere();
  lowerCanopyInst.computeBoundingSphere();
  upperCanopyInst.computeBoundingSphere();

  plazaGroup.add(planterInst, trunkInst, lowerCanopyInst, upperCanopyInst);

  // Low perimeter stone garden curb framing the outer plaza edge (natural boundary)
  const southCurb = new THREE.Mesh(
    track(new THREE.BoxGeometry(38.0, 0.52, 0.65)),
    materials.matCharcoalStone,
  );
  southCurb.position.set(0, 0.26, 46.8);
  plazaGroup.add(southCurb);

  const sideCurbGeo = track(new THREE.BoxGeometry(0.65, 0.52, 24.4));
  [-19.0, 19.0].forEach((cx) => {
    const curb = new THREE.Mesh(sideCurbGeo, materials.matCharcoalStone);
    curb.position.set(cx, 0.26, 35.0);
    plazaGroup.add(curb);
  });

  // Subtle architectural entrance spotlight pointing down onto the central plaza promenade
  const plazaKeyGlow = new THREE.PointLight(0xffdfb0, 1.8, 28, 1.3);
  plazaKeyGlow.position.set(0, 7.5, 34.5);
  plazaGroup.add(plazaKeyGlow);

  // Runtime animated door & zone state
  let glassDoorOpenAmount = 0;

  const update = (
    dt: number,
    elapsed: number,
    playerX: number,
    playerZ: number,
    floorNumber: number,
    isHidden: boolean,
  ): ExteriorLobbyUpdateResult => {
    if (isHidden) {
      return {
        glassDoorOpenAmount,
        nearReception: false,
        zone: 'atrium',
      };
    }

    // Automatic sliding main glass entrance doors on Ground Floor
    const nearGlassDoor =
      floorNumber === 0 &&
      Math.abs(playerX) <= 3.6 &&
      playerZ >= 19.6 &&
      playerZ <= 26.8;

    const targetOpen = nearGlassDoor ? 1 : 0;
    const speed = nearGlassDoor ? 3.2 : 2.1;
    glassDoorOpenAmount +=
      (targetOpen - glassDoorOpenAmount) * Math.min(1, dt * speed);
    if (Math.abs(targetOpen - glassDoorOpenAmount) < 0.004) {
      glassDoorOpenAmount = targetOpen;
    }

    const slideOffset = glassDoorOpenAmount * 1.42;
    leftGlassDoor.position.x = -0.69 - slideOffset;
    rightGlassDoor.position.x = 0.69 + slideOffset;

    // Gentle reflective shimmer on plaza pools
    const shimmer = 0.065 + Math.sin(elapsed * 0.9) * 0.015;
    matReflectingWater.roughness = shimmer;

    const nearReception =
      floorNumber === 0 &&
      Math.hypot(playerX - 0, playerZ - 16.8) <= 3.45;

    const zone: 'plaza' | 'lobby' | 'atrium' =
      floorNumber === 0 && playerZ > 23.0
        ? 'plaza'
        : floorNumber === 0 && playerZ > 9.6
          ? 'lobby'
          : 'atrium';

    return {
      glassDoorOpenAmount,
      nearReception,
      zone,
    };
  };

  const setVisible = (visible: boolean) => {
    group.visible = visible;
  };

  const dispose = () => {
    for (const asset of ownedDisposables) {
      asset.dispose();
    }
    ownedDisposables.length = 0;
  };

  return {
    group,
    interactiveMeshes,
    cameraObstacleMeshes,
    update,
    setVisible,
    getGlassDoorOpenAmount: () => glassDoorOpenAmount,
    dispose,
  };
}
