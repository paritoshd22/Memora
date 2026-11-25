import * as THREE from 'three';

type TrackAsset = <T extends { dispose: () => void }>(asset: T) => T;

export interface ChildhoodParkEnvironmentOptions {
  root: THREE.Group;
  track: TrackAsset;
  cameraObstacleMeshes: THREE.Mesh[];
  enableShadows: boolean;
}

/**
 * Adds a lightweight, open-air childhood memory park to the Childhood room.
 * All geometry is procedural, shared where practical, and owned by the room
 * builder through the supplied track() disposer.
 */
export function buildChildhoodParkEnvironment({
  root,
  track,
  cameraObstacleMeshes,
  enableShadows,
}: ChildhoodParkEnvironmentOptions): THREE.Group {
  const park = new THREE.Group();
  park.name = 'memora_childhood_memory_park';
  root.add(park);

  const mat = (color: string, roughness = 0.86, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    track(new THREE.MeshStandardMaterial({ color, roughness, ...extra }));

  const grassMat = mat('#7F9868', 0.98);
  const pathMat = mat('#D8C6A7', 0.98);
  const pathEdgeMat = mat('#BBA17C', 0.94);
  const woodMat = mat('#76543A', 0.78);
  const woodLightMat = mat('#B88958', 0.78);
  const brassMat = mat('#C9A66B', 0.36, { metalness: 0.72 });
  const ivoryMat = mat('#F4EBDC', 0.84);
  const sageMat = mat('#6F8769', 0.88);
  const leafMat = mat('#54734F', 0.96);
  const leafLightMat = mat('#78976B', 0.96);
  const flowerGoldMat = mat('#E7B85F', 0.72);
  const flowerCoralMat = mat('#D98573', 0.72);
  const flowerCreamMat = mat('#F3E6C8', 0.72);
  const waterMat = mat('#8FB9B7', 0.22, { metalness: 0.08, transparent: true, opacity: 0.88 });
  const stoneMat = mat('#C9B99F', 0.94);
  const lanternMat = mat('#F6D99B', 0.35, { emissive: '#D69A45', emissiveIntensity: 0.28 });

  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 512;
  grassCanvas.height = 512;
  const grassCtx = grassCanvas.getContext('2d');
  if (grassCtx) {
    grassCtx.fillStyle = '#82996B';
    grassCtx.fillRect(0, 0, 512, 512);
    let seed = 19;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 2600; i++) {
      const x = random() * 512;
      const y = random() * 512;
      const light = random() > 0.5;
      grassCtx.strokeStyle = light ? 'rgba(202,211,150,0.22)' : 'rgba(46,83,48,0.16)';
      grassCtx.lineWidth = 1 + random() * 1.3;
      grassCtx.beginPath();
      grassCtx.moveTo(x, y);
      grassCtx.lineTo(x + (random() - 0.5) * 4, y - 2 - random() * 5);
      grassCtx.stroke();
    }
  }
  const grassTexture = track(new THREE.CanvasTexture(grassCanvas));
  grassTexture.colorSpace = THREE.SRGBColorSpace;
  grassTexture.wrapS = THREE.RepeatWrapping;
  grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(3.2, 3.5);
  grassTexture.anisotropy = 4;
  grassMat.map = grassTexture;
  grassMat.needsUpdate = true;

  const pebbleCanvas = document.createElement('canvas');
  pebbleCanvas.width = 256;
  pebbleCanvas.height = 256;
  const pebbleCtx = pebbleCanvas.getContext('2d');
  if (pebbleCtx) {
    pebbleCtx.fillStyle = '#D8C6A7';
    pebbleCtx.fillRect(0, 0, 256, 256);
    let seed = 41;
    const random = () => {
      seed = (seed * 48271) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 900; i++) {
      pebbleCtx.fillStyle = random() > 0.5 ? 'rgba(128,105,78,0.13)' : 'rgba(255,248,228,0.28)';
      pebbleCtx.beginPath();
      pebbleCtx.ellipse(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 2, random(), 0, Math.PI * 2);
      pebbleCtx.fill();
    }
  }
  const pebbleTexture = track(new THREE.CanvasTexture(pebbleCanvas));
  pebbleTexture.colorSpace = THREE.SRGBColorSpace;
  pebbleTexture.wrapS = THREE.RepeatWrapping;
  pebbleTexture.wrapT = THREE.RepeatWrapping;
  pebbleTexture.repeat.set(2.4, 2.8);
  pathMat.map = pebbleTexture;
  pathMat.needsUpdate = true;

  // Open-air sky dome: a soft blue-to-warm-horizon gradient, visible only in the park.
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext('2d');
  if (skyCtx) {
    const gradient = skyCtx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#9BBFD0');
    gradient.addColorStop(0.58, '#D6E0D4');
    gradient.addColorStop(1, '#F4D9B5');
    skyCtx.fillStyle = gradient;
    skyCtx.fillRect(0, 0, 512, 256);
  }
  const skyTexture = track(new THREE.CanvasTexture(skyCanvas));
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    track(new THREE.SphereGeometry(42, 24, 16)),
    track(new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false })),
  );
  sky.name = 'childhood_park_sky_dome';
  sky.position.y = 5;
  sky.renderOrder = -20;
  park.add(sky);

  // Ground layer replaces the formal gallery floor only in the Childhood room.
  const ground = new THREE.Mesh(
    track(new THREE.PlaneGeometry(14.35, 15.45)),
    grassMat,
  );
  ground.name = 'childhood_park_meadow_ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0.012, 0);
  ground.receiveShadow = enableShadows;
  park.add(ground);

  // Helper to lay flat, walkable curving gravel branch ribbons connecting all park landmarks.
  const addFlatPathRibbon = (
    name: string,
    points: [number, number][],
    halfWidth: number,
    yOffset = 0.024,
  ) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    );
    const segments = 28;
    const sampled = curve.getPoints(segments);
    const leftEdge: THREE.Vector2[] = [];
    const rightEdge: THREE.Vector2[] = [];
    for (let i = 0; i < sampled.length; i++) {
      const prev = sampled[Math.max(0, i - 1)];
      const next = sampled[Math.min(sampled.length - 1, i + 1)];
      const tx = next.x - prev.x;
      const tz = next.z - prev.z;
      const len = Math.hypot(tx, tz) || 1;
      const nx = -tz / len;
      const nz = tx / len;
      leftEdge.push(new THREE.Vector2(sampled[i].x + nx * halfWidth, sampled[i].z + nz * halfWidth));
      rightEdge.push(new THREE.Vector2(sampled[i].x - nx * halfWidth, sampled[i].z - nz * halfWidth));
    }
    const shape = new THREE.Shape();
    shape.moveTo(leftEdge[0].x, leftEdge[0].y);
    for (let i = 1; i < leftEdge.length; i++) {
      shape.lineTo(leftEdge[i].x, leftEdge[i].y);
    }
    for (let i = rightEdge.length - 1; i >= 0; i--) {
      shape.lineTo(rightEdge[i].x, rightEdge[i].y);
    }
    shape.closePath();
    const ribbon = new THREE.Mesh(track(new THREE.ShapeGeometry(shape, 12)), pathMat);
    ribbon.name = name;
    ribbon.rotation.x = -Math.PI / 2;
    ribbon.scale.y = -1;
    ribbon.position.y = yOffset;
    ribbon.receiveShadow = enableShadows;
    park.add(ribbon);
  };

  // Curving pale gravel path leads from the entrance through the central memory tree
  // toward the treehouse and outdoor cinema.
  const pathShape = new THREE.Shape();
  pathShape.moveTo(-0.56, 7.48);
  pathShape.bezierCurveTo(-0.62, 5.75, -3.15, 5.18, -3.0, 3.48);
  pathShape.bezierCurveTo(-2.88, 1.88, -1.12, 1.15, -0.55, -0.2);
  pathShape.bezierCurveTo(0.18, -1.95, 2.92, -1.55, 3.55, -2.95);
  pathShape.bezierCurveTo(4.08, -4.15, 2.38, -5.55, 1.65, -7.48);
  pathShape.lineTo(2.75, -7.48);
  pathShape.bezierCurveTo(3.68, -5.43, 5.15, -4.05, 4.55, -2.55);
  pathShape.bezierCurveTo(3.82, -0.45, 1.15, -0.72, 0.48, 0.5);
  pathShape.bezierCurveTo(-0.55, 2.35, -1.92, 2.55, -1.88, 3.55);
  pathShape.bezierCurveTo(-1.82, 4.65, 0.58, 5.65, 0.55, 7.48);
  pathShape.closePath();
  pathMat.side = THREE.DoubleSide;
  const path = new THREE.Mesh(track(new THREE.ShapeGeometry(pathShape, 28)), pathMat);
  path.name = 'childhood_park_winding_memory_path';
  path.rotation.x = -Math.PI / 2;
  path.scale.y = -1;
  path.position.y = 0.026;
  path.receiveShadow = enableShadows;
  park.add(path);

  // Connected branching paths linking the Playground, Bicycle Trail, Backyard Gathering,
  // Memory Radio, Treehouse Ladder, Keepsake Corner, and Childhood Bedroom.
  addFlatPathRibbon(
    'childhood_park_east_play_bicycle_trail',
    [
      [0.2, 5.45],
      [1.85, 4.75],
      [3.65, 4.55],
      [4.75, 3.35],
      [4.85, 1.2],
      [5.05, -0.45],
      [4.35, -2.25],
    ],
    0.44,
    0.023,
  );
  addFlatPathRibbon(
    'childhood_park_west_bedroom_keepsake_path',
    [
      [-2.5, 3.5],
      [-4.25, 3.25],
      [-4.85, 1.1],
      [-4.6, -1.25],
      [-2.6, -2.9],
      [-0.5, -0.35],
    ],
    0.38,
    0.023,
  );
  addFlatPathRibbon(
    'childhood_park_backyard_garden_connector',
    [
      [0.25, 0.45],
      [1.95, 1.05],
      [3.35, 1.55],
      [4.75, 1.55],
    ],
    0.34,
    0.022,
  );

  // Narrow darker edging makes the route read clearly without a bright outline.
  const pathEdge = new THREE.Mesh(
    track(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.58, 0.035, 7.35),
        new THREE.Vector3(-0.82, 0.035, 5.2),
        new THREE.Vector3(-3.0, 0.035, 3.5),
        new THREE.Vector3(-2.6, 0.035, 1.6),
        new THREE.Vector3(-0.55, 0.035, -0.2),
        new THREE.Vector3(2.7, 0.035, -1.6),
        new THREE.Vector3(3.9, 0.035, -3.1),
        new THREE.Vector3(2.2, 0.035, -5.4),
        new THREE.Vector3(2.2, 0.035, -7.2),
      ]),
      48,
      0.025,
      6,
      false,
    )),
    pathEdgeMat,
  );
  pathEdge.name = 'childhood_park_path_edge';
  park.add(pathEdge);

  // Pebble stepping stones beside the path: one InstancedMesh, no per-stone draw calls.
  const stoneGeo = track(new THREE.CylinderGeometry(0.16, 0.19, 0.055, 8));
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, 24);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const x = -0.4 - Math.sin(t * Math.PI * 2) * 2.15 + (i % 2 ? 0.34 : -0.34);
    const z = 6.6 - t * 12.8;
    dummy.position.set(x, 0.055, z);
    dummy.rotation.y = (i % 3) * 0.3;
    const scale = 0.72 + (i % 4) * 0.12;
    dummy.scale.set(scale, 1, scale);
    dummy.updateMatrix();
    stones.setMatrixAt(i, dummy.matrix);
  }
  const branchStoneCoords: [number, number][] = [
    [1.4, 4.95], [2.85, 4.6], [4.25, 3.85], [4.95, 2.25], [2.4, 1.25], [-4.35, 2.15],
  ];
  branchStoneCoords.forEach(([sx, sz], idx) => {
    dummy.position.set(sx, 0.052, sz);
    dummy.rotation.y = idx * 0.45;
    dummy.scale.set(0.84, 1, 0.78);
    dummy.updateMatrix();
    stones.setMatrixAt(18 + idx, dummy.matrix);
  });
  stones.instanceMatrix.needsUpdate = true;
  stones.receiveShadow = enableShadows;
  stones.name = 'childhood_park_stepping_stones';
  park.add(stones);

  // Distant meadow mounds soften the hard room perimeter and create a park horizon.
  const moundGeo = track(new THREE.SphereGeometry(1, 12, 8));
  const moundMat = mat('#8FA77A', 1);
  const mounds = new THREE.InstancedMesh(moundGeo, moundMat, 8);
  const moundPositions: [number, number, number, number, number, number][] = [
    [-6.35, 0.15, -6.35, 1.55, 0.72, 1.25],
    [-3.8, 0.12, -7.0, 1.6, 0.5, 0.8],
    [0, 0.1, -7.1, 2.2, 0.42, 0.7],
    [4.2, 0.12, -7.0, 1.7, 0.52, 0.8],
    [6.25, 0.15, -5.7, 1.2, 0.72, 1.45],
    [-6.45, 0.12, 0.5, 1.0, 0.52, 1.5],
    [6.45, 0.12, 1.2, 1.0, 0.55, 1.5],
    [5.9, 0.12, 6.1, 1.35, 0.48, 0.8],
  ];
  moundPositions.forEach(([x, y, z, sx, sy, sz], i) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.y = i * 0.31;
    dummy.updateMatrix();
    mounds.setMatrixAt(i, dummy.matrix);
  });
  mounds.instanceMatrix.needsUpdate = true;
  park.add(mounds);

  // Freestanding timber trellis supports the existing Childhood Memory Wall.
  // The wall becomes an intentional park memory installation instead of a floating gallery.
  const trellisGroup = new THREE.Group();
  trellisGroup.name = 'childhood_park_memory_trellis';
  trellisGroup.position.set(-6.78, 0, -1.15);
  const trellisPanel = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.12, 3.82, 4.7)),
    woodMat,
  );
  trellisPanel.position.y = 1.9;
  trellisGroup.add(trellisPanel);
  const trellisSlatGeo = track(new THREE.BoxGeometry(0.06, 3.45, 0.055));
  for (let i = 0; i < 13; i++) {
    const slat = new THREE.Mesh(trellisSlatGeo, woodLightMat);
    slat.position.set(0.085, 1.9, -2.12 + i * 0.35);
    trellisGroup.add(slat);
  }
  const trellisRailGeo = track(new THREE.BoxGeometry(0.07, 0.07, 4.78));
  [0.28, 3.5].forEach((y) => {
    const rail = new THREE.Mesh(trellisRailGeo, woodLightMat);
    rail.position.set(0.09, y, 0);
    trellisGroup.add(rail);
  });
  park.add(trellisGroup);

  // Three small park trees at the outer edge; the existing central memory tree and
  // elevated treehouse remain the hero landmarks.
  const trunkGeo = track(new THREE.CylinderGeometry(0.13, 0.2, 2.35, 9));
  const canopyGeo = track(new THREE.SphereGeometry(0.82, 12, 10));
  const canopySmallGeo = track(new THREE.SphereGeometry(0.58, 10, 8));
  const trunks = new THREE.InstancedMesh(trunkGeo, woodMat, 3);
  const canopies = new THREE.InstancedMesh(canopyGeo, leafMat, 3);
  const canopyAccents = new THREE.InstancedMesh(canopySmallGeo, leafLightMat, 3);
  const treePositions: [number, number, number][] = [
    [-5.35, 0, -4.75],
    [5.45, 0, -5.15],
    [-5.8, 0, 0.65],
  ];
  treePositions.forEach(([x, y, z], i) => {
    dummy.position.set(x, y + 1.18, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, y + 2.55, z);
    dummy.scale.set(1.35, 1.18, 1.28);
    dummy.updateMatrix();
    canopies.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x + (i % 2 ? -0.42 : 0.42), y + 2.9, z + 0.12);
    dummy.scale.set(0.9, 0.85, 0.9);
    dummy.updateMatrix();
    canopyAccents.setMatrixAt(i, dummy.matrix);
  });
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  canopyAccents.instanceMatrix.needsUpdate = true;
  trunks.castShadow = enableShadows;
  canopies.castShadow = enableShadows;
  park.add(trunks, canopies, canopyAccents);
  // Tree trunks are camera obstacles, while canopies remain soft visual cover.
  // Use simple invisible cylinders for stable camera collision.
  const treeObstacleGeo = track(new THREE.CylinderGeometry(0.28, 0.32, 2.5, 8));
  const invisibleObstacleMat = track(new THREE.MeshBasicMaterial({ visible: false }));
  treePositions.forEach(([x, , z]) => {
    const obstacle = new THREE.Mesh(treeObstacleGeo, invisibleObstacleMat);
    obstacle.position.set(x, 1.25, z);
    park.add(obstacle);
    cameraObstacleMeshes.push(obstacle);
  });

  // Low timber picket fence on three sides; the south entrance remains open.
  const fencePostGeo = track(new THREE.BoxGeometry(0.09, 0.72, 0.09));
  const fenceRailGeo = track(new THREE.BoxGeometry(1, 0.075, 0.07));
  const fencePosts: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) fencePosts.push(new THREE.Vector3(-6.35 + i * 1.055, 0.36, -6.9));
  for (let i = 0; i <= 12; i++) fencePosts.push(new THREE.Vector3(-6.35, 0.36, -6.9 + i * 1.02));
  for (let i = 0; i <= 12; i++) fencePosts.push(new THREE.Vector3(6.35, 0.36, -6.9 + i * 1.02));
  for (let i = 0; i <= 5; i++) fencePosts.push(new THREE.Vector3(-6.35 + i * 0.82, 0.36, 6.9));
  for (let i = 0; i <= 5; i++) fencePosts.push(new THREE.Vector3(2.25 + i * 0.82, 0.36, 6.9));
  const postInstances = new THREE.InstancedMesh(fencePostGeo, woodLightMat, fencePosts.length);
  fencePosts.forEach((p, i) => {
    dummy.position.copy(p);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    postInstances.setMatrixAt(i, dummy.matrix);
  });
  postInstances.instanceMatrix.needsUpdate = true;
  park.add(postInstances);

  const rails: { x: number; z: number; length: number; yaw: number }[] = [];
  for (let i = 0; i < 12; i++) rails.push({ x: -5.82 + i * 1.055, z: -6.9, length: 1.055, yaw: 0 });
  for (let i = 0; i < 12; i++) rails.push({ x: -6.35, z: -6.39 + i * 1.02, length: 1.02, yaw: Math.PI / 2 });
  for (let i = 0; i < 12; i++) rails.push({ x: 6.35, z: -6.39 + i * 1.02, length: 1.02, yaw: Math.PI / 2 });
  for (let i = 0; i < 5; i++) rails.push({ x: -5.94 + i * 0.82, z: 6.9, length: 0.82, yaw: 0 });
  for (let i = 0; i < 5; i++) rails.push({ x: 2.66 + i * 0.82, z: 6.9, length: 0.82, yaw: 0 });
  const railInstances = new THREE.InstancedMesh(fenceRailGeo, woodMat, rails.length * 2);
  rails.forEach((r, i) => {
    for (let level = 0; level < 2; level++) {
      dummy.position.set(r.x, 0.28 + level * 0.28, r.z);
      dummy.rotation.set(0, r.yaw, 0);
      dummy.scale.set(r.length, 1, 1);
      dummy.updateMatrix();
      railInstances.setMatrixAt(i * 2 + level, dummy.matrix);
    }
  });
  railInstances.instanceMatrix.needsUpdate = true;
  park.add(railInstances);

  // A small pond and a curved timber bench make a quiet reflection nook.
  const pondGroup = new THREE.Group();
  pondGroup.position.set(-4.25, 0, -3.45);
  const pondRim = new THREE.Mesh(track(new THREE.TorusGeometry(0.82, 0.11, 8, 32)), stoneMat);
  pondRim.rotation.x = -Math.PI / 2;
  pondRim.position.y = 0.055;
  pondGroup.add(pondRim);
  const pondWater = new THREE.Mesh(track(new THREE.CircleGeometry(0.78, 32)), waterMat);
  pondWater.rotation.x = -Math.PI / 2;
  pondWater.position.y = 0.06;
  pondGroup.add(pondWater);
  park.add(pondGroup);

  const benchGroup = new THREE.Group();
  benchGroup.position.set(-2.9, 0, -4.7);
  benchGroup.rotation.y = -0.28;
  const benchSeat = new THREE.Mesh(track(new THREE.BoxGeometry(1.55, 0.12, 0.42)), woodLightMat);
  benchSeat.position.y = 0.48;
  benchSeat.castShadow = enableShadows;
  benchGroup.add(benchSeat);
  const benchBack = new THREE.Mesh(track(new THREE.BoxGeometry(1.55, 0.48, 0.09)), woodMat);
  benchBack.position.set(0, 0.76, -0.17);
  benchGroup.add(benchBack);
  const benchLegGeo = track(new THREE.BoxGeometry(0.1, 0.48, 0.34));
  [-0.62, 0.62].forEach((x) => {
    const leg = new THREE.Mesh(benchLegGeo, woodMat);
    leg.position.set(x, 0.24, 0);
    benchGroup.add(leg);
  });
  park.add(benchGroup);
  const benchObstacle = new THREE.Mesh(track(new THREE.BoxGeometry(1.75, 0.9, 0.65)), invisibleObstacleMat);
  benchObstacle.position.set(-2.9, 0.45, -4.7);
  benchObstacle.rotation.y = -0.28;
  park.add(benchObstacle);
  cameraObstacleMeshes.push(benchObstacle);

  // Nostalgic Playground Seesaw tucked in the sunlit south-east play pocket (non-blocking).
  const seesawGroup = new THREE.Group();
  seesawGroup.name = 'childhood_park_playground_seesaw';
  seesawGroup.position.set(2.1, 0, 5.65);
  seesawGroup.rotation.y = 0.22;

  const fulcrumBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.16, 0.24, 0.34, 10)),
    woodMat,
  );
  fulcrumBase.position.y = 0.17;
  fulcrumBase.castShadow = enableShadows;
  seesawGroup.add(fulcrumBase);

  const fulcrumBracket = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.06, 0.06, 0.36, 10)),
    brassMat,
  );
  fulcrumBracket.rotation.x = Math.PI / 2;
  fulcrumBracket.position.y = 0.36;
  seesawGroup.add(fulcrumBracket);

  const seesawBeamPivot = new THREE.Group();
  seesawBeamPivot.name = 'childhood_park_seesaw_beam_pivot';
  seesawBeamPivot.position.set(0, 0.38, 0);
  seesawBeamPivot.rotation.z = 0.08;
  seesawGroup.add(seesawBeamPivot);

  const seesawPlank = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.92, 0.075, 0.26)),
    woodLightMat,
  );
  seesawPlank.castShadow = enableShadows;
  seesawBeamPivot.add(seesawPlank);

  const seatGeo = track(new THREE.BoxGeometry(0.32, 0.04, 0.28));
  const handlePostGeo = track(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8));
  const handleBarGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 8));
  [-0.74, 0.74].forEach((sx, idx) => {
    const seat = new THREE.Mesh(seatGeo, idx === 0 ? sageMat : ivoryMat);
    seat.position.set(sx, 0.055, 0);
    seesawBeamPivot.add(seat);

    const handleX = sx > 0 ? sx - 0.22 : sx + 0.22;
    const hPost = new THREE.Mesh(handlePostGeo, brassMat);
    hPost.position.set(handleX, 0.12, 0);
    seesawBeamPivot.add(hPost);

    const hBar = new THREE.Mesh(handleBarGeo, brassMat);
    hBar.rotation.x = Math.PI / 2;
    hBar.position.set(handleX, 0.22, 0);
    seesawBeamPivot.add(hBar);
  });
  park.add(seesawGroup);
  park.userData.seesawPivot = seesawBeamPivot;

  // Sunlit Backyard Gathering Nook: woven sage/ivory picnic blanket + keepsake basket (flat/walkable).
  const gatheringGroup = new THREE.Group();
  gatheringGroup.name = 'childhood_park_backyard_gathering';
  gatheringGroup.position.set(3.25, 0, 1.85);
  gatheringGroup.rotation.y = -0.18;

  const blanketCanvas = document.createElement('canvas');
  blanketCanvas.width = 256;
  blanketCanvas.height = 256;
  const bCtx = blanketCanvas.getContext('2d');
  if (bCtx) {
    bCtx.fillStyle = '#F2E8D5';
    bCtx.fillRect(0, 0, 256, 256);
    bCtx.fillStyle = 'rgba(111, 135, 105, 0.34)';
    for (let i = 0; i < 256; i += 32) {
      bCtx.fillRect(i, 0, 14, 256);
      bCtx.fillRect(0, i, 256, 14);
    }
    bCtx.strokeStyle = '#C9A66B';
    bCtx.lineWidth = 6;
    bCtx.strokeRect(5, 5, 246, 246);
  }
  const blanketTex = track(new THREE.CanvasTexture(blanketCanvas));
  blanketTex.colorSpace = THREE.SRGBColorSpace;
  const blanketMesh = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1.75, 1.32)),
    track(new THREE.MeshStandardMaterial({ map: blanketTex, roughness: 0.94 })),
  );
  blanketMesh.rotation.x = -Math.PI / 2;
  blanketMesh.position.y = 0.032;
  blanketMesh.receiveShadow = enableShadows;
  gatheringGroup.add(blanketMesh);

  const basketBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.42, 0.24, 0.28)),
    woodLightMat,
  );
  basketBody.position.set(0.52, 0.15, -0.34);
  basketBody.castShadow = enableShadows;
  gatheringGroup.add(basketBody);

  const basketLid = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.45, 0.05, 0.3)),
    woodMat,
  );
  basketLid.position.set(0.52, 0.28, -0.34);
  gatheringGroup.add(basketLid);

  const basketHandle = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.14, 0.014, 6, 16, Math.PI)),
    brassMat,
  );
  basketHandle.position.set(0.52, 0.29, -0.34);
  gatheringGroup.add(basketHandle);

  const thermos = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.048, 0.052, 0.24, 10)),
    sageMat,
  );
  thermos.position.set(0.18, 0.15, -0.26);
  gatheringGroup.add(thermos);
  const thermosCap = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.05, 0.05, 0.055, 10)),
    brassMat,
  );
  thermosCap.position.set(0.18, 0.28, -0.26);
  gatheringGroup.add(thermosCap);
  park.add(gatheringGroup);

  // Park Directional Signpost beside the right entrance gate post (clear of central walkway).
  const signpostGroup = new THREE.Group();
  signpostGroup.name = 'childhood_park_directional_signpost';
  signpostGroup.position.set(1.62, 0, 6.08);
  const signPostPole = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.045, 0.055, 1.72, 10)),
    woodMat,
  );
  signPostPole.position.y = 0.86;
  signPostPole.castShadow = enableShadows;
  signpostGroup.add(signPostPole);
  const signPostFinial = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.07, 10, 10)),
    brassMat,
  );
  signPostFinial.position.y = 1.75;
  signpostGroup.add(signPostFinial);

  const bladeSpecs: { label: string; y: number; rotY: number }[] = [
    { label: '← BEDROOM · KEEPSAKES', y: 1.54, rotY: 0.22 },
    { label: '↑ MEMORY TREE · CINEMA', y: 1.32, rotY: 0.0 },
    { label: 'TREEHOUSE · PLAYGROUND →', y: 1.1, rotY: -0.28 },
  ];
  const bladeGeo = track(new THREE.BoxGeometry(0.86, 0.15, 0.03));
  bladeSpecs.forEach(({ label, y, rotY }) => {
    const bladeCanvas = document.createElement('canvas');
    bladeCanvas.width = 384;
    bladeCanvas.height = 72;
    const ctx = bladeCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F4E8D2';
      ctx.fillRect(0, 0, 384, 72);
      ctx.strokeStyle = '#C9A66B';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 376, 64);
      ctx.fillStyle = '#4B3A2C';
      ctx.font = 'bold 21px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 192, 37);
    }
    const bladeTex = track(new THREE.CanvasTexture(bladeCanvas));
    bladeTex.colorSpace = THREE.SRGBColorSpace;
    const bladeFaceMat = track(
      new THREE.MeshStandardMaterial({ map: bladeTex, roughness: 0.78 }),
    );
    const blade = new THREE.Mesh(bladeGeo, [
      woodMat,
      woodMat,
      woodMat,
      woodMat,
      bladeFaceMat,
      bladeFaceMat,
    ]);
    blade.position.y = y;
    blade.rotation.y = rotY;
    signpostGroup.add(blade);
  });
  park.add(signpostGroup);

  // Flowers are instanced for a rich park edge without creating dozens of draw calls.
  const flowerStemGeo = track(new THREE.CylinderGeometry(0.012, 0.018, 0.28, 5));
  const flowerHeadGeo = track(new THREE.SphereGeometry(0.075, 7, 6));
  const flowerStemMat = mat('#55794E', 0.95);
  const flowerPlacements: [number, number, number, number][] = [];
  const flowerBeds: [number, number, number][] = [
    [-5.25, -2.4, 12], [-5.2, 2.5, 10], [5.45, -4.0, 12], [5.45, 1.2, 10],
    [-3.6, 5.1, 9], [3.6, 5.4, 9], [0.1, -6.1, 10],
  ];
  flowerBeds.forEach(([cx, cz, count], bedIndex) => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.28 + (i % 3) * 0.11;
      flowerPlacements.push([cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius, i % 3, bedIndex]);
    }
  });
  const flowerStems = new THREE.InstancedMesh(flowerStemGeo, flowerStemMat, flowerPlacements.length);
  const flowerHeadsGold = new THREE.InstancedMesh(flowerHeadGeo, flowerGoldMat, flowerPlacements.length);
  const flowerHeadsCoral = new THREE.InstancedMesh(flowerHeadGeo, flowerCoralMat, flowerPlacements.length);
  const flowerHeadsCream = new THREE.InstancedMesh(flowerHeadGeo, flowerCreamMat, flowerPlacements.length);
  let goldIndex = 0, coralIndex = 0, creamIndex = 0;
  flowerPlacements.forEach(([x, z, variant], i) => {
    dummy.position.set(x, 0.14, z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    flowerStems.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 0.31 + (i % 2) * 0.025, z);
    dummy.scale.set(1, 0.82, 1);
    dummy.updateMatrix();
    if (variant === 0) flowerHeadsGold.setMatrixAt(goldIndex++, dummy.matrix);
    else if (variant === 1) flowerHeadsCoral.setMatrixAt(coralIndex++, dummy.matrix);
    else flowerHeadsCream.setMatrixAt(creamIndex++, dummy.matrix);
  });
  // InstancedMesh capacity is fixed; unused matrices are harmless but invisible at origin.
  flowerStems.instanceMatrix.needsUpdate = true;
  flowerHeadsGold.count = goldIndex;
  flowerHeadsCoral.count = coralIndex;
  flowerHeadsCream.count = creamIndex;
  flowerHeadsGold.instanceMatrix.needsUpdate = true;
  flowerHeadsCoral.instanceMatrix.needsUpdate = true;
  flowerHeadsCream.instanceMatrix.needsUpdate = true;
  park.add(flowerStems, flowerHeadsGold, flowerHeadsCoral, flowerHeadsCream);

  // Architectural entrance arbor with slim high-mounted walnut & champagne-brass lintel (100% unobstructed eye-level sightline into the park).
  const gate = new THREE.Group();
  gate.name = 'childhood_park_entrance_arbor';
  gate.position.set(0, 0, 6.72);
  const gatePostGeo = track(new THREE.BoxGeometry(0.16, 3.12, 0.18));
  const gateCollarGeo = track(new THREE.BoxGeometry(0.22, 0.08, 0.24));
  [-2.18, 2.18].forEach((x) => {
    const post = new THREE.Mesh(gatePostGeo, woodMat);
    post.position.set(x, 1.56, 0);
    post.castShadow = enableShadows;
    gate.add(post);

    const baseCollar = new THREE.Mesh(gateCollarGeo, brassMat);
    baseCollar.position.set(x, 0.08, 0);
    gate.add(baseCollar);

    const collar = new THREE.Mesh(gateCollarGeo, brassMat);
    collar.position.set(x, 2.94, 0);
    gate.add(collar);
  });
  const gateTop = new THREE.Mesh(track(new THREE.BoxGeometry(4.68, 0.18, 0.24)), woodLightMat);
  gateTop.position.set(0, 3.06, 0);
  gate.add(gateTop);

  const gateBrassTrim = new THREE.Mesh(track(new THREE.BoxGeometry(4.72, 0.035, 0.26)), brassMat);
  gateBrassTrim.position.set(0, 2.96, 0);
  gate.add(gateBrassTrim);

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 768;
  signCanvas.height = 128;
  const signCtx = signCanvas.getContext('2d');
  if (signCtx) {
    signCtx.fillStyle = '#3B281B';
    signCtx.fillRect(0, 0, 768, 128);
    signCtx.strokeStyle = '#C9A66B';
    signCtx.lineWidth = 6;
    signCtx.strokeRect(8, 8, 752, 112);
    signCtx.fillStyle = '#FFF7E8';
    signCtx.textAlign = 'center';
    signCtx.font = '600 34px "Cormorant Garamond", Georgia, serif';
    signCtx.fillText('CHILDHOOD MEMORY PARK', 384, 76);
  }
  const signTexture = track(new THREE.CanvasTexture(signCanvas));
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const signBoard = new THREE.Mesh(
    track(new THREE.PlaneGeometry(2.35, 0.34)),
    track(new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.65 })),
  );
  signBoard.position.set(0, 3.06, 0.13);
  gate.add(signBoard);
  park.add(gate);

  // Soft park lanterns with champagne-brass collars harmonizing with museum architecture.
  const lampPositions: [number, number][] = [[-3.8, 0.15], [3.85, -4.5], [4.6, 2.0]];
  const lampPostGeo = track(new THREE.CylinderGeometry(0.035, 0.055, 1.8, 8));
  const lampCollarGeo = track(new THREE.CylinderGeometry(0.068, 0.068, 0.06, 10));
  const lampHeadGeo = track(new THREE.SphereGeometry(0.13, 8, 8));
  lampPositions.forEach(([x, z]) => {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, z);
    const post = new THREE.Mesh(lampPostGeo, woodMat);
    post.position.y = 0.9;
    lamp.add(post);
    const collar = new THREE.Mesh(lampCollarGeo, brassMat);
    collar.position.y = 1.72;
    lamp.add(collar);
    const head = new THREE.Mesh(lampHeadGeo, lanternMat);
    head.position.y = 1.86;
    lamp.add(head);
    park.add(lamp);
  });

  park.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.receiveShadow = enableShadows && object.receiveShadow;
      object.frustumCulled = true;
    }
  });

  return park;
}
