export type RoomPortalStatus = 'active' | 'empty' | 'disabled';

export interface CircleCollider {
  id: string;
  cx: number;
  cz: number;
  radius: number;
}

export interface OBBCollider {
  id: string;
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  rotY: number;
  /**
   * When true, any penetration inside this exterior perimeter barrier pushes the entity
   * strictly inward along the local +Z normal (into the museum hall) so it is physically
   * impossible to be pushed behind a wall.
   */
  inwardNormalOnly?: boolean;
}

export interface FloorColliderSet {
  floorNumber?: number;
  outerRadius?: number;
  circles: CircleCollider[];
  obbs: OBBCollider[];
}

export interface PortalSlotPlacementCoords {
  slotIndex: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  normalX: number;
  normalZ: number;
  doorX: number;
  doorY: number;
  doorZ: number;
  labelX: number;
  labelY: number;
  labelZ: number;
  entryLightX: number;
  entryLightY: number;
  entryLightZ: number;
  leftSconceX: number;
  leftSconceZ: number;
  rightSconceX: number;
  rightSconceZ: number;
  camX: number;
  camY: number;
  camZ: number;
  camLookX: number;
  camLookY: number;
  camLookZ: number;
  leftWingLength: number;
  rightWingLength: number;
}

export interface RoomEntryLightState {
  slotIndex: number;
  lookAlignment: number; // [0..1] how directly the camera is looking toward this room entrance
  proximityFactor: number; // [0..1] how close the player is to the doorway
  isHoveredOrSelected: boolean;
  highlightFactor: number; // [0..1] combined smooth highlight factor
  pointLightIntensity: number; // Dynamic point-light intensity for the doorway
  sconceEmissiveIntensity: number; // Dynamic emissive intensity for doorframe sconces & crown beacon
  archGlowOpacity: number; // Dynamic opacity for subtle arch reveal glow
}

export interface PerimeterWallSegmentSpec {
  id: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  cx: number;
  cz: number;
  length: number;
  thickness: number;
  rotY: number;
}

export interface PerimeterCornerColumnSpec {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export const ROOMS_PER_FLOOR = 4;
export const FLOOR_HEIGHT = 6.0;
export const CHARACTER_COLLIDER_RADIUS = 0.44;
export const CAMERA_COLLIDER_RADIUS = 0.28;
export const ROTUNDA_WALL_RADIUS = 14.6;
export const FLOOR_SLAB_OUTER_RADIUS = 14.8;
export const LIGHTWELL_CENTER_X = 0;
export const LIGHTWELL_CENTER_Z = 1.8;
export const LIGHTWELL_HOLE_RADIUS = 2.55;
export const LIGHTWELL_BALUSTRADE_RADIUS = 2.68;
export const GROUND_SCULPTURE_PLINTH_RADIUS = 1.26;
export const MIN_CAMERA_PITCH = -0.58;
export const MAX_CAMERA_PITCH = 0.68;
export const MAX_FRAME_DELTA = 0.05;

/**
 * Shared architectural dimensions for Room Gates, Alcoves, and Perimeter Walls.
 * Used by both Three.js visual geometry in AtriumScene3D.tsx and OBB collision geometry.
 */
export const PORTAL_ARCH_SPEC = {
  archWidth: 4.7,
  archHalfWidth: 2.35,
  doorwayWidth: 3.1,
  doorwayHalfWidth: 1.55,
  doorwayStraightHeight: 2.85,
  doorwayCrownHeight: 4.4,
  archHeight: 5.05,
  upperHeaderHeight: FLOOR_HEIGHT - 5.03, // 0.97m overlap from 5.03m to 6.00m ceiling
  wallThickness: 0.48,
  wallHalfThickness: 0.24,
  alcoveDepth: 1.44,
  alcoveSideWallX: 1.65,
  alcoveSideWallThickness: 0.18,
  alcoveBackWallZ: -1.38,
  alcoveBackWallWidth: 3.46,
  alcoveHeight: 4.65,
} as const;

/**
 * Authoritative 4-Rooms-Per-Floor Symmetrical Architectural Layout:
 * - Slot 0: West North Wing (x = -8.6, z = -3.6, rotY = +PI/2), facing East (+X)
 * - Slot 1: West South Wing (x = -8.6, z = 3.1, rotY = +PI/2), facing East (+X)
 * - Slot 2: East North Wing (x = 8.6, z = -3.6, rotY = -PI/2), facing West (-X)
 * - Slot 3: East South Wing (x = 8.6, z = 3.1, rotY = -PI/2), facing West (-X)
 *
 * Symmetrical coplanar alignment on both West and East walls ensures completely
 * unobstructed sightlines and crystal-clear room entry illumination from anywhere in the hall.
 */
export const SLOT_CONFIGS: readonly {
  x: number;
  z: number;
  rotY: number;
  leftWingLength: number;
  rightWingLength: number;
}[] = [
  // Slot 0: West North Wing
  { x: -8.6, z: -3.6, rotY: Math.PI / 2, leftWingLength: 0.2, rightWingLength: 0.35 },
  // Slot 1: West South Wing
  { x: -8.6, z: 3.1, rotY: Math.PI / 2, leftWingLength: 0.35, rightWingLength: 0.2 },
  // Slot 2: East North Wing
  { x: 8.6, z: -3.6, rotY: -Math.PI / 2, leftWingLength: 0.35, rightWingLength: 0.2 },
  // Slot 3: East South Wing
  { x: 8.6, z: 3.1, rotY: -Math.PI / 2, leftWingLength: 0.2, rightWingLength: 0.35 },
];

/**
 * Sanitizes any numeric value against NaN or ±Infinity.
 */
export function sanitizeFiniteNumber(val: unknown, fallback = 0): number {
  return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
}

/**
 * Sanitizes a floor index into [0, Math.max(0, totalFloors - 1)].
 */
export function sanitizeFloorIndex(
  floorNumber: unknown,
  totalFloors: number,
  fallback = 0,
): number {
  const safeTotal = Math.max(1, Math.floor(sanitizeFiniteNumber(totalFloors, 1)));
  const raw = Math.round(sanitizeFiniteNumber(floorNumber, fallback));
  return Math.max(0, Math.min(safeTotal - 1, raw));
}

/**
 * Normalizes any horizontal yaw angle into [-PI, PI] and guards against NaN/Infinity.
 */
export function sanitizeYaw(yaw: unknown, fallback = Math.PI): number {
  const raw = sanitizeFiniteNumber(yaw, fallback);
  const twoPi = Math.PI * 2;
  let normalized = ((raw + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (!Number.isFinite(normalized)) {
    normalized = fallback;
  }
  return normalized;
}

/**
 * Clamps vertical camera pitch into safe limits [-0.58, 0.68] radians (~ -33° to +39°)
 * so the camera never flips or clips underground/above ceiling.
 */
export function sanitizePitch(pitch: unknown, fallback = 0.16): number {
  const raw = sanitizeFiniteNumber(pitch, fallback);
  return Math.max(-0.58, Math.min(0.68, raw));
}

/**
 * Shortest signed angular difference in [-PI, PI] from `fromAngle` to `toAngle`.
 */
export function shortestAngleDiff(fromAngle: number, toAngle: number): number {
  const safeFrom = sanitizeFiniteNumber(fromAngle, 0);
  const safeTo = sanitizeFiniteNumber(toAngle, 0);
  return Math.atan2(Math.sin(safeTo - safeFrom), Math.cos(safeTo - safeFrom));
}

/**
 * Transforms a local offset (lx, lz) inside a group at (gx, gz) rotated by rotY into world (wx, wz).
 */
export function localToWorldXZ(
  gx: number,
  gz: number,
  rotY: number,
  lx: number,
  lz: number,
): { x: number; z: number } {
  const cosR = Math.cos(rotY);
  const sinR = Math.sin(rotY);
  return {
    x: gx + lx * cosR + lz * sinR,
    z: gz - lx * sinR + lz * cosR,
  };
}

/**
 * Computes the deterministic world coordinates for any of the 3 gallery slots on a floor.
 * Shared between AtriumScene3D.tsx and atriumCollision.ts.
 */
export function getFloorSlotPlacementCoords(
  slotIndex: number,
  floorNumber: number,
): PortalSlotPlacementCoords {
  const safeSlot =
    ((Math.floor(sanitizeFiniteNumber(slotIndex, 0)) % ROOMS_PER_FLOOR) + ROOMS_PER_FLOOR) %
    ROOMS_PER_FLOOR;
  const safeFloor = Math.max(0, Math.floor(sanitizeFiniteNumber(floorNumber, 0)));
  const s = SLOT_CONFIGS[safeSlot];
  const baseY = safeFloor * FLOOR_HEIGHT;

  // Local normal in Three.js for group rotated around Y by rotY:
  // local (0, 0, z) -> world (sin(rotY)*z, 0, cos(rotY)*z)
  const sinR = Math.sin(s.rotY);
  const cosR = Math.cos(s.rotY);

  // Integrated doorframe entry sconce world positions (mounted flush on hall-facing doorframe at local z = +0.255m, lx = ±1.76m)
  const leftSconce = localToWorldXZ(s.x, s.z, s.rotY, -1.76, 0.255);
  const rightSconce = localToWorldXZ(s.x, s.z, s.rotY, 1.76, 0.255);
  // Integrated doorway entry light position (flush with upper doorway crown at local z = +0.34m, y = baseY + 3.15m)
  const entryLightPos = localToWorldXZ(s.x, s.z, s.rotY, 0, 0.34);

  return {
    slotIndex: safeSlot,
    x: s.x,
    y: baseY,
    z: s.z,
    rotY: s.rotY,
    normalX: sinR,
    normalZ: cosR,
    doorX: s.x + sinR * 1.85,
    doorY: baseY,
    doorZ: s.z + cosR * 1.85,
    labelX: s.x + sinR * 0.25,
    labelY: baseY + 5.45,
    labelZ: s.z + cosR * 0.25,
    entryLightX: entryLightPos.x,
    entryLightY: baseY + 3.15,
    entryLightZ: entryLightPos.z,
    leftSconceX: leftSconce.x,
    leftSconceZ: leftSconce.z,
    rightSconceX: rightSconce.x,
    rightSconceZ: rightSconce.z,
    camX: s.x + sinR * 5.2,
    camY: baseY + 2.5,
    camZ: s.z + cosR * 5.2,
    camLookX: s.x - sinR * 1.2,
    camLookY: baseY + 2.2,
    camLookZ: s.z - cosR * 1.2,
    leftWingLength: s.leftWingLength,
    rightWingLength: s.rightWingLength,
  };
}

/**
 * Computes the responsive room-entry lighting state for a room slot based on:
 * - Camera position and camera viewing direction (when the user rotates the camera toward a room,
 *   `lookAlignment` smoothly rises toward 1.0)
 * - Player proximity to the room doorway (`proximityFactor` smoothly rises as the player approaches)
 * - Room status (`active`, `empty`, `disabled`) and hover/selection state.
 */
export function computeRoomEntryLightState(options: {
  slotIndex: number;
  floorNumber: number;
  status: RoomPortalStatus;
  playerX: number;
  playerZ: number;
  cameraX: number;
  cameraY?: number;
  cameraZ: number;
  cameraForwardX: number;
  cameraForwardY?: number;
  cameraForwardZ: number;
  isHovered?: boolean;
  isSelected?: boolean;
  pulseWave?: number; // Optional subtle [0..1] breathing modulation
}): RoomEntryLightState {
  const coords = getFloorSlotPlacementCoords(options.slotIndex, options.floorNumber);

  // Horizontal vector from camera to the room's doorway entry light
  const toLightX = coords.entryLightX - sanitizeFiniteNumber(options.cameraX, 0);
  const toLightZ = coords.entryLightZ - sanitizeFiniteNumber(options.cameraZ, 4.8);
  const distCamXZ = Math.hypot(toLightX, toLightZ);

  const fwdX = sanitizeFiniteNumber(options.cameraForwardX, 0);
  const fwdZ = sanitizeFiniteNumber(options.cameraForwardZ, -1);
  const fwdLenXZ = Math.hypot(fwdX, fwdZ);

  let lookAlignment = 0;
  if (distCamXZ > 1e-4 && fwdLenXZ > 1e-4) {
    const dirX = toLightX / distCamXZ;
    const dirZ = toLightZ / distCamXZ;
    const normFwdX = fwdX / fwdLenXZ;
    const normFwdZ = fwdZ / fwdLenXZ;
    const rawDot = dirX * normFwdX + dirZ * normFwdZ;
    // Also ensure the camera is on the hall side of the doorway (facing the front of the gate)
    const frontSideDot =
      (sanitizeFiniteNumber(options.cameraX, 0) - coords.x) * coords.normalX +
      (sanitizeFiniteNumber(options.cameraZ, 4.8) - coords.z) * coords.normalZ;
    if (frontSideDot > -0.5) {
      // Smoothly ramp alignment once the room enters the camera's forward hemisphere (dot > 0.15)
      const t = Math.max(0, Math.min(1, (rawDot - 0.15) / 0.8));
      lookAlignment = t * t * (3 - 2 * t);
    }
  }

  // Distance from player to doorway threshold
  const distPlayerToDoor = Math.hypot(
    sanitizeFiniteNumber(options.playerX, 0) - coords.doorX,
    sanitizeFiniteNumber(options.playerZ, 4.8) - coords.doorZ,
  );
  // Proximity ramps smoothly from 7.2m down to 1.2m
  const rawProx = Math.max(0, Math.min(1, (7.2 - distPlayerToDoor) / 6.0));
  const proximityFactor = rawProx * rawProx * (3 - 2 * rawProx);

  const isHoveredOrSelected = Boolean(options.isHovered || options.isSelected);
  const pulse = Math.max(0, Math.min(1, sanitizeFiniteNumber(options.pulseWave, 0.5)));

  // Combine camera-look alignment, player proximity, and hover/selection into a balanced highlight
  const highlightFactor = Math.max(
    0,
    Math.min(
      1,
      lookAlignment * 0.58 +
        proximityFactor * 0.65 +
        (isHoveredOrSelected ? 0.38 : 0) +
        pulse * 0.06,
    ),
  );

  if (options.status === 'disabled') {
    return {
      slotIndex: coords.slotIndex,
      lookAlignment,
      proximityFactor,
      isHoveredOrSelected,
      highlightFactor: highlightFactor * 0.35,
      pointLightIntensity: 0.18 + highlightFactor * 0.22,
      sconceEmissiveIntensity: 0.22 + highlightFactor * 0.25,
      archGlowOpacity: 0.04 + highlightFactor * 0.06,
    };
  }

  if (options.status === 'empty') {
    return {
      slotIndex: coords.slotIndex,
      lookAlignment,
      proximityFactor,
      isHoveredOrSelected,
      highlightFactor,
      pointLightIntensity: 0.62 + highlightFactor * 0.68,
      sconceEmissiveIntensity: 0.52 + highlightFactor * 0.55,
      archGlowOpacity: 0.11 + highlightFactor * 0.18,
    };
  }

  // Active exhibition room: warm, always-visible architectural entry sconces that gently brighten
  // when the camera turns toward the room or when the player approaches the entrance
  return {
    slotIndex: coords.slotIndex,
    lookAlignment,
    proximityFactor,
    isHoveredOrSelected,
    highlightFactor,
    pointLightIntensity: 1.05 + highlightFactor * 1.15,
    sconceEmissiveIntensity: 0.72 + highlightFactor * 0.78,
    archGlowOpacity: 0.2 + highlightFactor * 0.34,
  };
}

function createWallSegmentSpec(
  id: string,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  thickness = PORTAL_ARCH_SPEC.wallThickness,
): PerimeterWallSegmentSpec {
  const dx = endX - startX;
  const dz = endZ - startZ;
  const length = Math.hypot(dx, dz);
  const cx = (startX + endX) * 0.5;
  const cz = (startZ + endZ) * 0.5;
  let rotY = Math.atan2(-dz, dx);
  // Ensure local +Z normal (sin(rotY), cos(rotY)) ALWAYS points strictly inward toward (0, 0)
  const inwardDot = -cx * Math.sin(rotY) - cz * Math.cos(rotY);
  if (inwardDot < 0) {
    rotY = sanitizeYaw(rotY + Math.PI, 0);
  }
  return {
    id,
    startX,
    startZ,
    endX,
    endZ,
    cx,
    cz,
    length,
    thickness,
    rotY,
  };
}

/**
 * Computes the continuous, closed perimeter wall segments and corner columns that connect
 * the North Lift Entrance, all 3 Room Gates (Slots 0..2), and the South Feature Wall
 * with zero gaps and zero access behind walls.
 */
export function getPerimeterArchitectureSpec(): {
  wallSegments: PerimeterWallSegmentSpec[];
  cornerColumns: PerimeterCornerColumnSpec[];
} {
  const halfArch = PORTAL_ARCH_SPEC.archHalfWidth; // 2.35m

  const s0 = SLOT_CONFIGS[0]; // West North (-8.6, -3.6, rotY = +PI/2)
  const s1 = SLOT_CONFIGS[1]; // West South (-8.6, 3.1, rotY = +PI/2)
  const s2 = SLOT_CONFIGS[2]; // East North (8.6, -3.6, rotY = -PI/2)
  const s3 = SLOT_CONFIGS[3]; // East South (8.6, 3.1, rotY = -PI/2)

  // Outer wing endpoints of each Room Gate (in counter-clockwise order around the hall)
  // For Slot 0 (rotY = +PI/2): rightWing (+lx) is North (-Z), leftWing (-lx) is South (+Z)
  const s0RightEnd = localToWorldXZ(
    s0.x,
    s0.z,
    s0.rotY,
    halfArch + s0.rightWingLength,
    0,
  ); // (-8.6, -6.30)
  const s0LeftEnd = localToWorldXZ(
    s0.x,
    s0.z,
    s0.rotY,
    -(halfArch + s0.leftWingLength),
    0,
  ); // (-8.6, -1.05)

  // For Slot 1 (rotY = +PI/2): rightWing (+lx) is North (-Z), leftWing (-lx) is South (+Z)
  const s1RightEnd = localToWorldXZ(
    s1.x,
    s1.z,
    s1.rotY,
    halfArch + s1.rightWingLength,
    0,
  ); // (-8.6, +0.55)
  const s1LeftEnd = localToWorldXZ(
    s1.x,
    s1.z,
    s1.rotY,
    -(halfArch + s1.leftWingLength),
    0,
  ); // (-8.6, +5.80)

  // For Slot 3 (rotY = -PI/2): rightWing (+lx) is South (+Z), leftWing (-lx) is North (-Z)
  const s3RightEnd = localToWorldXZ(
    s3.x,
    s3.z,
    s3.rotY,
    halfArch + s3.rightWingLength,
    0,
  ); // (8.6, +5.80)
  const s3LeftEnd = localToWorldXZ(
    s3.x,
    s3.z,
    s3.rotY,
    -(halfArch + s3.leftWingLength),
    0,
  ); // (8.6, +0.55)

  // For Slot 2 (rotY = -PI/2): rightWing (+lx) is South (+Z), leftWing (-lx) is North (-Z)
  const s2RightEnd = localToWorldXZ(
    s2.x,
    s2.z,
    s2.rotY,
    halfArch + s2.rightWingLength,
    0,
  ); // (8.6, -1.05)
  const s2LeftEnd = localToWorldXZ(
    s2.x,
    s2.z,
    s2.rotY,
    -(halfArch + s2.leftWingLength),
    0,
  ); // (8.6, -6.30)

  // Key corner coordinates connecting Lift Facade (z = -8.6), West/East Gallery Walls (x = ±8.6), and South Feature Wall (z = +9.6)
  const liftWestJamb = { x: -1.87, z: -8.6 };
  const liftEastJamb = { x: 1.87, z: -8.6 };
  const nwCorner = { x: -5.4, z: -8.6 };
  const westNorthCorner = { x: -8.6, z: -6.3 };
  const westSouthCorner = { x: -8.6, z: 5.8 };
  const swCorner = { x: -7.6, z: 9.6 };
  const fwWestEdge = { x: -5.6, z: 9.6 };
  const fwEastEdge = { x: 5.6, z: 9.6 };
  const seCorner = { x: 7.6, z: 9.6 };
  const neCorner = { x: 5.4, z: -8.6 };

  // Ordered counter-clockwise so local +Z normal of every segment points strictly INWARD toward (0,0)
  const wallSegments: PerimeterWallSegmentSpec[] = [
    // 1. North-West Lift Wing (from Lift West Jamb to NW Corner along z = -8.6)
    createWallSegmentSpec(
      'perimeter_nw_lift_wing',
      liftWestJamb.x,
      liftWestJamb.z,
      nwCorner.x,
      nwCorner.z,
    ),
    // 2. North-West Return Wall (from NW Corner to West Gallery North Corner)
    createWallSegmentSpec(
      'perimeter_nw_return_wall',
      nwCorner.x,
      nwCorner.z,
      westNorthCorner.x,
      westNorthCorner.z,
    ),
    // 3. West Inter-Room Wall (coplanar along x = -8.6 between Slot 0 Left Wing and Slot 1 Right Wing)
    createWallSegmentSpec(
      'perimeter_west_inter_room_wall',
      s0LeftEnd.x,
      s0LeftEnd.z,
      s1RightEnd.x,
      s1RightEnd.z,
    ),
    // 4. South-West Return Wall (from West Gallery South Corner to SW Feature Corner)
    createWallSegmentSpec(
      'perimeter_sw_return_wall',
      westSouthCorner.x,
      westSouthCorner.z,
      swCorner.x,
      swCorner.z,
    ),
    // 5. South-West Feature Wall Wing (from SW Corner to Feature Wall West Edge along z = +9.6)
    createWallSegmentSpec(
      'perimeter_sw_feature_wing',
      swCorner.x,
      swCorner.z,
      fwWestEdge.x,
      fwWestEdge.z,
    ),
    // 6. South-East Feature Wall Wing (from Feature Wall East Edge to SE Corner along z = +9.6)
    createWallSegmentSpec(
      'perimeter_se_feature_wing',
      fwEastEdge.x,
      fwEastEdge.z,
      seCorner.x,
      seCorner.z,
    ),
    // 7. South-East Return Wall (from SE Corner to Slot 3 Right Wing end at (8.6, 5.80))
    createWallSegmentSpec(
      'perimeter_se_return_wall',
      seCorner.x,
      seCorner.z,
      s3RightEnd.x,
      s3RightEnd.z,
    ),
    // 8. East Inter-Room Wall (coplanar along x = +8.6 between Slot 3 Left Wing and Slot 2 Right Wing)
    createWallSegmentSpec(
      'perimeter_east_inter_room_wall',
      s3LeftEnd.x,
      s3LeftEnd.z,
      s2RightEnd.x,
      s2RightEnd.z,
    ),
    // 9. North-East Return Wall (from Slot 2 Left Wing end at (8.6, -6.30) to NE Corner)
    createWallSegmentSpec(
      'perimeter_ne_return_wall',
      s2LeftEnd.x,
      s2LeftEnd.z,
      neCorner.x,
      neCorner.z,
    ),
    // 10. North-East Lift Wing (from NE Corner to Lift East Jamb along z = -8.6)
    createWallSegmentSpec(
      'perimeter_ne_lift_wing',
      neCorner.x,
      neCorner.z,
      liftEastJamb.x,
      liftEastJamb.z,
    ),
  ];

  const cornerColumns: PerimeterCornerColumnSpec[] = [
    { id: 'corner_col_nw', x: nwCorner.x, z: nwCorner.z, radius: 0.28 },
    { id: 'corner_col_west_north', x: westNorthCorner.x, z: westNorthCorner.z, radius: 0.28 },
    { id: 'corner_col_s0_left', x: s0LeftEnd.x, z: s0LeftEnd.z, radius: 0.26 },
    { id: 'corner_col_s1_right', x: s1RightEnd.x, z: s1RightEnd.z, radius: 0.26 },
    { id: 'corner_col_west_south', x: westSouthCorner.x, z: westSouthCorner.z, radius: 0.28 },
    { id: 'corner_col_sw', x: swCorner.x, z: swCorner.z, radius: 0.28 },
    { id: 'corner_col_se', x: seCorner.x, z: seCorner.z, radius: 0.28 },
    { id: 'corner_col_s3_right', x: s3RightEnd.x, z: s3RightEnd.z, radius: 0.28 },
    { id: 'corner_col_s3_left', x: s3LeftEnd.x, z: s3LeftEnd.z, radius: 0.26 },
    { id: 'corner_col_s2_right', x: s2RightEnd.x, z: s2RightEnd.z, radius: 0.26 },
    { id: 'corner_col_s2_left', x: s2LeftEnd.x, z: s2LeftEnd.z, radius: 0.28 },
    { id: 'corner_col_ne', x: neCorner.x, z: neCorner.z, radius: 0.28 },
  ];

  return { wallSegments, cornerColumns };
}

/**
 * Builds the authoritative static and state-dependent collision shapes for a single floor.
 */
export function buildFloorColliders(options: {
  floorNumber: number;
  slotStatuses?: Record<number, RoomPortalStatus>;
  isLiftDoorOpen?: boolean;
  doorOpenAmount?: number;
  roomDoorOpenAmounts?: Record<number, number>;
}): FloorColliderSet {
  const floorNumber = Math.max(0, Math.floor(sanitizeFiniteNumber(options.floorNumber, 0)));
  const slotStatuses = options.slotStatuses ?? {
    0: 'active',
    1: 'active',
    2: 'active',
    3: 'active',
  };
  const isLiftDoorOpen = Boolean(options.isLiftDoorOpen);

  const circles: CircleCollider[] = [];
  const obbs: OBBCollider[] = [];

  // 1. Central Atrium Sculpture Plinth (Floor 0) or Lightwell Balustrade Ring (Upper Floors > 0)
  circles.push({
    id: floorNumber === 0 ? 'central_sculpture_plinth' : 'lightwell_balustrade',
    cx: LIGHTWELL_CENTER_X,
    cz: LIGHTWELL_CENTER_Z,
    radius: floorNumber === 0 ? GROUND_SCULPTURE_PLINTH_RADIUS : LIGHTWELL_BALUSTRADE_RADIUS,
  });

  // 2. Four Architectural Botanical Stone Planters per floor
  const planterCoords: [number, number, string][] = [
    [-3.6, -7.4, 'planter_nw'],
    [3.6, -7.4, 'planter_ne'],
    [-6.4, 8.2, 'planter_sw'],
    [6.4, 8.2, 'planter_se'],
  ];
  for (const [px, pz, id] of planterCoords) {
    circles.push({
      id,
      cx: px,
      cz: pz,
      radius: 0.54,
    });
  }

  // 3. Lift Call Button Pedestal at North-East of Lift Entrance (2.15, -8.25)
  circles.push({
    id: 'lift_call_pedestal',
    cx: 2.15,
    cz: -8.25,
    radius: 0.26,
  });

  // 4. South Blank-Wall Interactive Feature Hub (centered at x=0, z=9.6, width=11.7m, front face at z=9.38)
  obbs.push({
    id: 'feature_wall_structure',
    cx: 0,
    cz: 9.72,
    hx: 5.85,
    hz: 0.34,
    rotY: 0,
  });
  // Deep exterior backing behind South Wall & Feature Wall so nothing can ever exist at z > 9.38
  obbs.push({
    id: 'feature_wall_backing_seal',
    cx: 0,
    cz: 11.88,
    hx: 8.2,
    hz: 2.5,
    rotY: Math.PI,
    inwardNormalOnly: true,
  });
  // Left & Right Feature Wall Pilasters at x = ±5.6, z = 9.6
  obbs.push({
    id: 'feature_wall_pilaster_west',
    cx: -5.6,
    cz: 9.6,
    hx: 0.25,
    hz: 0.3,
    rotY: 0,
  });
  obbs.push({
    id: 'feature_wall_pilaster_east',
    cx: 5.6,
    cz: 9.6,
    hx: 0.25,
    hz: 0.3,
    rotY: 0,
  });

  // 5. North Lift Shaft, Jambs, Cabin Walls & Landing Doors (at x=0, z=-8.6 to -11.4)
  obbs.push({
    id: 'lift_shaft_west_wall',
    cx: -1.68,
    cz: -9.98,
    hx: 0.24,
    hz: 1.56,
    rotY: 0,
  });
  obbs.push({
    id: 'lift_shaft_east_wall',
    cx: 1.68,
    cz: -9.98,
    hx: 0.24,
    hz: 1.56,
    rotY: 0,
  });
  obbs.push({
    id: 'lift_shaft_back_wall',
    cx: 0,
    cz: -11.32,
    hx: 1.92,
    hz: 0.22,
    rotY: 0,
  });

  const openAmt =
    options.doorOpenAmount !== undefined
      ? Math.max(0, Math.min(1, sanitizeFiniteNumber(options.doorOpenAmount, 0)))
      : (isLiftDoorOpen ? 1 : 0);

  if (openAmt < 0.95) {
    if (openAmt <= 0.01) {
      // Solid closed barrier when doors are fully shut
      obbs.push({
        id: 'lift_landing_doors_closed',
        cx: 0,
        cz: -8.6,
        hx: 1.58,
        hz: 0.16,
        rotY: 0,
      });
    } else {
      // Sliding left and right door panels corresponding to actual visible door meshes
      obbs.push({
        id: 'lift_door_panel_left',
        cx: -0.74 - openAmt * 1.32,
        cz: -8.6,
        hx: 0.74,
        hz: 0.14,
        rotY: 0,
      });
      obbs.push({
        id: 'lift_door_panel_right',
        cx: 0.74 + openAmt * 1.32,
        cz: -8.6,
        hx: 0.74,
        hz: 0.14,
        rotY: 0,
      });
    }
  }

  // 6. Continuous Perimeter Wall Segments & Corner Columns
  const { wallSegments, cornerColumns } = getPerimeterArchitectureSpec();
  for (const col of cornerColumns) {
    circles.push({
      id: col.id,
      cx: col.x,
      cz: col.z,
      radius: col.radius,
    });
  }

  for (const seg of wallSegments) {
    // Primary 0.48m architectural wall collider
    obbs.push({
      id: seg.id,
      cx: seg.cx,
      cz: seg.cz,
      hx: seg.length * 0.5 + 0.08,
      hz: seg.thickness * 0.5,
      rotY: seg.rotY,
      inwardNormalOnly: true,
    });
    // Deep backing seal behind the wall segment (local z in [-2.64, -0.24])
    const sealCenter = localToWorldXZ(seg.cx, seg.cz, seg.rotY, 0, -1.2);
    obbs.push({
      id: `${seg.id}_backing_seal`,
      cx: sealCenter.x,
      cz: sealCenter.z,
      hx: seg.length * 0.5 + 0.24,
      hz: 1.44,
      rotY: seg.rotY,
      inwardNormalOnly: true,
    });
  }

  // 7. Three Fixed Room Portals per Floor (Slots 0..2) — Coplanar Wings, Arch Piers, Alcove Walls, Back Walls & Doorway Barriers
  for (let slotIdx = 0; slotIdx < ROOMS_PER_FLOOR; slotIdx++) {
    const s = SLOT_CONFIGS[slotIdx];
    const status: RoomPortalStatus = slotStatuses[slotIdx] ?? 'active';

    const toWorldBoxFromLocal = (
      id: string,
      lx: number,
      lz: number,
      hx: number,
      hz: number,
      inwardNormalOnly = false,
    ): OBBCollider => {
      const w = localToWorldXZ(s.x, s.z, s.rotY, lx, lz);
      return {
        id,
        cx: w.x,
        cz: w.z,
        hx,
        hz,
        rotY: s.rotY,
        inwardNormalOnly,
      };
    };

    // Coplanar Left Wing Wall (if leftWingLength > 0)
    if (s.leftWingLength > 0) {
      const leftCenterLx = -(PORTAL_ARCH_SPEC.archHalfWidth + s.leftWingLength * 0.5);
      obbs.push(
        toWorldBoxFromLocal(
          `portal_${slotIdx}_left_wing`,
          leftCenterLx,
          0,
          s.leftWingLength * 0.5 + 0.04,
          PORTAL_ARCH_SPEC.wallHalfThickness,
          true,
        ),
      );
      obbs.push(
        toWorldBoxFromLocal(
          `portal_${slotIdx}_left_wing_seal`,
          leftCenterLx,
          -1.2,
          s.leftWingLength * 0.5 + 0.16,
          1.44,
          true,
        ),
      );
    }

    // Coplanar Right Wing Wall (if rightWingLength > 0)
    if (s.rightWingLength > 0) {
      const rightCenterLx = PORTAL_ARCH_SPEC.archHalfWidth + s.rightWingLength * 0.5;
      obbs.push(
        toWorldBoxFromLocal(
          `portal_${slotIdx}_right_wing`,
          rightCenterLx,
          0,
          s.rightWingLength * 0.5 + 0.04,
          PORTAL_ARCH_SPEC.wallHalfThickness,
          true,
        ),
      );
      obbs.push(
        toWorldBoxFromLocal(
          `portal_${slotIdx}_right_wing_seal`,
          rightCenterLx,
          -1.2,
          s.rightWingLength * 0.5 + 0.16,
          1.44,
          true,
        ),
      );
    }

    // Left Arch Pier (local x from -2.38 to -1.52 -> center -1.95, hx 0.43; local z from -0.28 to +0.28 -> hz 0.28)
    obbs.push(
      toWorldBoxFromLocal(`portal_${slotIdx}_left_pier`, -1.95, 0, 0.43, 0.28),
    );
    // Right Arch Pier (local x from +1.52 to +2.38 -> center +1.95, hx 0.43; local z from -0.28 to +0.28 -> hz 0.28)
    obbs.push(
      toWorldBoxFromLocal(`portal_${slotIdx}_right_pier`, 1.95, 0, 0.43, 0.28),
    );

    // Left Alcove Side Wall + outer backing
    obbs.push(
      toWorldBoxFromLocal(`portal_${slotIdx}_left_alcove_wall`, -1.85, -0.72, 0.32, 0.76),
    );
    // Right Alcove Side Wall + outer backing
    obbs.push(
      toWorldBoxFromLocal(`portal_${slotIdx}_right_alcove_wall`, 1.85, -0.72, 0.32, 0.76),
    );

    // Alcove Back Wall (local x from -1.85 to +1.85 -> hx 1.85; local z at -1.38 -> hz 0.15)
    obbs.push(
      toWorldBoxFromLocal(`portal_${slotIdx}_back_wall`, 0, -1.38, 1.85, 0.15, true),
    );
    // Deep backing behind Alcove Back Wall so nothing can ever get behind the room alcove
    obbs.push(
      toWorldBoxFromLocal(`portal_${slotIdx}_back_wall_seal`, 0, -2.55, 2.45, 1.32, true),
    );

    if (status === 'active') {
      const pedWorld = localToWorldXZ(s.x, s.z, s.rotY, 1.15, -0.92);
      circles.push({
        id: `portal_${slotIdx}_artifact_pedestal`,
        cx: pedWorld.x,
        cz: pedWorld.z,
        radius: 0.25,
      });

      // Synchronize dynamic room entrance pocket doors ONLY when roomDoorOpenAmounts is provided
      // (omitted -> default open 1.0 for backward compatibility with static doorway tests).
      if (options.roomDoorOpenAmounts !== undefined) {
        const rawDoorOpen = options.roomDoorOpenAmounts[slotIdx];
        const doorOpenAmt = Math.max(
          0,
          Math.min(1, sanitizeFiniteNumber(rawDoorOpen, 1)),
        );
        if (doorOpenAmt <= 0.02) {
          obbs.push(
            toWorldBoxFromLocal(
              `portal_${slotIdx}_door_closed`,
              0,
              ROOM_DOOR_SPEC.localZ,
              ROOM_DOOR_SPEC.doorHalfWidth,
              0.09,
              false,
            ),
          );
        } else if (doorOpenAmt < ROOM_DOOR_SPEC.passableOpenThreshold) {
          const slideOffset =
            ROOM_DOOR_SPEC.panelHalfWidth +
            doorOpenAmt * ROOM_DOOR_SPEC.panelSlideDistance;
          obbs.push(
            toWorldBoxFromLocal(
              `portal_${slotIdx}_door_panel_left`,
              -slideOffset,
              ROOM_DOOR_SPEC.localZ,
              ROOM_DOOR_SPEC.panelHalfWidth,
              0.08,
              false,
            ),
          );
          obbs.push(
            toWorldBoxFromLocal(
              `portal_${slotIdx}_door_panel_right`,
              slideOffset,
              ROOM_DOOR_SPEC.localZ,
              ROOM_DOOR_SPEC.panelHalfWidth,
              0.08,
              false,
            ),
          );
        }
      }
    } else {
      obbs.push(
        toWorldBoxFromLocal(`portal_${slotIdx}_closed_barrier`, 0, -0.01, 1.56, 0.21, true),
      );
    }
  }

  return {
    floorNumber,
    outerRadius: ROTUNDA_WALL_RADIUS,
    circles,
    obbs,
  };
}

/**
 * Resolves a 2D circle of `radius` at (x, z) against a single OBBCollider.
 */
export function resolvePointAgainstOBB(
  x: number,
  z: number,
  radius: number,
  obb: OBBCollider,
): { x: number; z: number; hit: boolean } {
  const dx = x - obb.cx;
  const dz = z - obb.cz;
  const cosR = Math.cos(obb.rotY);
  const sinR = Math.sin(obb.rotY);

  // Transform world delta (dx, dz) into OBB local space (lx, lz)
  const lx = dx * cosR - dz * sinR;
  const lz = dx * sinR + dz * cosR;

  const clampedX = Math.max(-obb.hx, Math.min(obb.hx, lx));
  const clampedZ = Math.max(-obb.hz, Math.min(obb.hz, lz));

  const diffX = lx - clampedX;
  const diffZ = lz - clampedZ;
  const distSq = diffX * diffX + diffZ * diffZ;

  if (distSq >= radius * radius) {
    return { x, z, hit: false };
  }

  let newLx = lx;
  let newLz = lz;

  if (obb.inwardNormalOnly && Math.abs(lx) <= obb.hx + radius * 0.85 && lz < obb.hz + radius) {
    // Perimeter boundary wall: push strictly along inward hall normal (+lz) so the entity
    // can never be pushed out the back side of a wall.
    const penPlusZ = obb.hz + radius - lz;
    const penLeftX = lx - (-obb.hx - radius);
    const penRightX = obb.hx + radius - lx;
    if (penLeftX < penPlusZ && penLeftX < penRightX && lx < -obb.hx) {
      newLx = -obb.hx - radius;
    } else if (penRightX < penPlusZ && penRightX < penLeftX && lx > obb.hx) {
      newLx = obb.hx + radius;
    } else {
      newLz = obb.hz + radius;
    }
  } else if (distSq > 1e-9) {
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    newLx += (diffX / dist) * push;
    newLz += (diffZ / dist) * push;
  } else {
    // Center is inside the OBB: push out along the minimum penetration axis
    const penX = obb.hx - Math.abs(lx);
    const penZ = obb.hz - Math.abs(lz);
    if (penX < penZ) {
      newLx = lx >= 0 ? obb.hx + radius : -obb.hx - radius;
    } else {
      newLz = lz >= 0 ? obb.hz + radius : -obb.hz - radius;
    }
  }

  return {
    x: obb.cx + newLx * cosR + newLz * sinR,
    z: obb.cz - newLx * sinR + newLz * cosR,
    hit: true,
  };
}

/**
 * Resolves a single sub-step position against all floor colliders and the outer rotunda cylinder.
 */
export function resolveSingleStepPosition(
  rawX: number,
  rawZ: number,
  colliderSet: FloorColliderSet,
  entityRadius = CHARACTER_COLLIDER_RADIUS,
): { x: number; z: number; collided: boolean } {
  let x = sanitizeFiniteNumber(rawX, 0);
  let z = sanitizeFiniteNumber(rawZ, 4.8);
  const r = Math.max(0.05, sanitizeFiniteNumber(entityRadius, CHARACTER_COLLIDER_RADIUS));
  let collided = false;

  // Run 3 relaxation passes so corner junctions between two walls resolve with zero penetration
  for (let pass = 0; pass < 3; pass++) {
    // 1. Outer Rotunda Perimeter Cylinder Containment
    const maxR = Math.max(1.0, (colliderSet.outerRadius ?? ROTUNDA_WALL_RADIUS) - r);
    const distFromOrigin = Math.hypot(x, z);
    if (distFromOrigin > maxR && distFromOrigin > 1e-6) {
      const scale = maxR / distFromOrigin;
      x *= scale;
      z *= scale;
      collided = true;
    }

    // 2. Circular Colliders (Central Plinth / Lightwell Balustrade, Planters, Pedestals, Corner Columns)
    for (let i = 0; i < colliderSet.circles.length; i++) {
      const c = colliderSet.circles[i];
      const dx = x - c.cx;
      const dz = z - c.cz;
      const minDist = c.radius + r;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDist * minDist) {
        const d = Math.sqrt(dSq);
        if (d > 1e-6) {
          x = c.cx + (dx / d) * minDist;
          z = c.cz + (dz / d) * minDist;
        } else {
          x = c.cx;
          z = c.cz + minDist;
        }
        collided = true;
      }
    }

    // 3. Oriented Bounding Box Colliders (Feature Wall, Lift Shaft/Doors, Perimeter Walls, Room Portals)
    for (let i = 0; i < colliderSet.obbs.length; i++) {
      const obb = colliderSet.obbs[i];
      const res = resolvePointAgainstOBB(x, z, r, obb);
      if (res.hit) {
        x = res.x;
        z = res.z;
        collided = true;
      }
    }
  }

  return { x, z, collided };
}

/**
 * Authoritative sub-stepped character movement solver with smooth wall sliding,
 * anti-tunneling sub-stepping, floor height grounding, and NaN/Infinity protection.
 */
export function resolveCharacterMovement(params: {
  startX: number;
  startY: number;
  startZ: number;
  velX: number;
  velZ: number;
  delta: number;
  totalFloors: number;
  slotStatuses?: Record<number, RoomPortalStatus>;
  isLiftDoorOpen?: boolean;
  doorOpenAmount?: number;
  roomDoorOpenAmounts?: Record<number, number>;
  characterRadius?: number;
  colliderSet?: FloorColliderSet;
}): {
  x: number;
  y: number;
  z: number;
  floorNumber: number;
  collided: boolean;
} {
  const safeTotalFloors = Math.max(1, Math.floor(sanitizeFiniteNumber(params.totalFloors, 1)));
  const startY = sanitizeFiniteNumber(params.startY, 0);
  const floorNumber = sanitizeFloorIndex(
    Math.round(startY / FLOOR_HEIGHT),
    safeTotalFloors,
    0,
  );
  const groundedY = floorNumber * FLOOR_HEIGHT;

  const safeDelta = Math.min(
    Math.max(0, sanitizeFiniteNumber(params.delta, 0.016)),
    MAX_FRAME_DELTA,
  );
  const vx = sanitizeFiniteNumber(params.velX, 0);
  const vz = sanitizeFiniteNumber(params.velZ, 0);
  const radius = Math.max(
    0.1,
    sanitizeFiniteNumber(params.characterRadius, CHARACTER_COLLIDER_RADIUS),
  );

  const colliderSet = params.colliderSet ?? buildFloorColliders({
    floorNumber,
    slotStatuses: params.slotStatuses,
    isLiftDoorOpen: params.isLiftDoorOpen,
    doorOpenAmount: params.doorOpenAmount,
    roomDoorOpenAmounts: params.roomDoorOpenAmounts,
  });

  // First ensure starting position is valid
  let x = sanitizeFiniteNumber(params.startX, 0);
  let z = sanitizeFiniteNumber(params.startZ, 4.8);
  const initialCheck = resolveSingleStepPosition(x, z, colliderSet, radius);
  x = initialCheck.x;
  z = initialCheck.z;

  const totalDx = vx * safeDelta;
  const totalDz = vz * safeDelta;
  const totalDist = Math.hypot(totalDx, totalDz);

  if (totalDist < 1e-6) {
    return {
      x,
      y: groundedY,
      z,
      floorNumber,
      collided: initialCheck.collided,
    };
  }

  // Sub-step movement so no step ever exceeds 0.14m (prevents high-speed tunneling through walls)
  const maxStepDist = 0.14;
  const steps = Math.max(1, Math.min(64, Math.ceil(totalDist / maxStepDist)));
  const stepDx = totalDx / steps;
  const stepDz = totalDz / steps;
  let anyCollided = initialCheck.collided;

  for (let s = 0; s < steps; s++) {
    const candidateX = x + stepDx;
    const candidateZ = z + stepDz;
    const resolved = resolveSingleStepPosition(
      candidateX,
      candidateZ,
      colliderSet,
      radius,
    );
    x = resolved.x;
    z = resolved.z;
    if (resolved.collided) {
      anyCollided = true;
    }
  }

  return {
    x,
    y: groundedY,
    z,
    floorNumber,
    collided: anyCollided,
  };
}

/**
 * Checks whether given coordinates are inside the elevator cabin interior.
 * Cabin interior spans |x| <= 1.45m and z from -8.65m to -11.15m.
 */
export function isCharacterInElevatorCabin(x: number, z: number): boolean {
  return Math.abs(sanitizeFiniteNumber(x, 0)) <= 1.45 && z <= -8.65 && z >= -11.2;
}

/**
 * Checks whether given coordinates are crossing the elevator doorway threshold.
 */
export function isCharacterInElevatorDoorway(x: number, z: number): boolean {
  return Math.abs(sanitizeFiniteNumber(x, 0)) <= 1.65 && z < -7.5 && z > -9.2;
}

/**
 * Checks whether given coordinates are in front of the elevator entrance in the corridor.
 */
export function isCharacterInElevatorApproachZone(x: number, z: number): boolean {
  return Math.abs(sanitizeFiniteNumber(x, 0)) <= 2.6 && z <= -5.8 && z >= -8.65;
}

/**
 * Combined check: character is approaching the elevator, in doorway threshold, or inside cabin.
 */
export function isCharacterInElevatorProximity(x: number, z: number): boolean {
  return (
    isCharacterInElevatorCabin(x, z) ||
    isCharacterInElevatorDoorway(x, z) ||
    isCharacterInElevatorApproachZone(x, z)
  );
}

/**
 * Sanitizes and clamps an arbitrary 3D character position (e.g. from localStorage or state props)
 * to a guaranteed safe, obstacle-free coordinate on a valid floor.
 */
export function sanitizeCharacterPosition(params: {
  position: [number, number, number] | { x: number; y: number; z: number } | null | undefined;
  floorNumber: unknown;
  totalFloors: number;
  slotStatuses?: Record<number, RoomPortalStatus>;
  isLiftDoorOpen?: boolean;
  doorOpenAmount?: number;
  roomDoorOpenAmounts?: Record<number, number>;
  colliderSet?: FloorColliderSet;
}): { x: number; y: number; z: number; floorNumber: number } {
  const safeTotalFloors = Math.max(1, Math.floor(sanitizeFiniteNumber(params.totalFloors, 1)));
  let rawX = 0;
  let rawY = 0;
  let rawZ = 4.8;

  if (Array.isArray(params.position) && params.position.length >= 3) {
    rawX = sanitizeFiniteNumber(params.position[0], 0);
    rawY = sanitizeFiniteNumber(params.position[1], 0);
    rawZ = sanitizeFiniteNumber(params.position[2], 4.8);
  } else if (params.position && typeof params.position === 'object') {
    const posObj = params.position as { x?: unknown; y?: unknown; z?: unknown };
    rawX = sanitizeFiniteNumber(posObj.x, 0);
    rawY = sanitizeFiniteNumber(posObj.y, 0);
    rawZ = sanitizeFiniteNumber(posObj.z, 4.8);
  }

  const inferredFloor = Number.isFinite(Number(params.floorNumber))
    ? Number(params.floorNumber)
    : Math.round(rawY / FLOOR_HEIGHT);
  const floorNumber = sanitizeFloorIndex(inferredFloor, safeTotalFloors, 0);
  const groundedY = floorNumber * FLOOR_HEIGHT;

  const colliderSet = params.colliderSet ?? buildFloorColliders({
    floorNumber,
    slotStatuses: params.slotStatuses,
    isLiftDoorOpen: params.isLiftDoorOpen,
    doorOpenAmount: params.doorOpenAmount,
    roomDoorOpenAmounts: params.roomDoorOpenAmounts,
  });

  const resolved = resolveSingleStepPosition(
    rawX,
    rawZ,
    colliderSet,
    CHARACTER_COLLIDER_RADIUS,
  );

  if (!Number.isFinite(resolved.x) || !Number.isFinite(resolved.z)) {
    return { x: 0, y: groundedY, z: 4.8, floorNumber };
  }

  return {
    x: resolved.x,
    y: groundedY,
    z: resolved.z,
    floorNumber,
  };
}

/**
 * Authoritative Room Doorway Entry Trigger & Hysteresis Specification (in portal-local coordinates).
 * - Portal doorway opening spans |lx| <= 1.15m (within the 3.0m gate opening, inside the ±1.50m jambs).
 * - Corridor side is lz > +0.24m; doorway plane is lz = 0; alcove interior is -0.79m <= lz <= +0.06m.
 * - Entering requires crossing or stepping inward (`deltaLz < -0.0008`) into `currLz <= +0.06m` while `|currLx| <= 1.15m`.
 * - Once latched inside a room doorway, the latch only clears when the character steps back out into the corridor (`currLz >= +0.36m` or `|currLx| > 1.45m`).
 */
export const DOORWAY_TRIGGER_SPEC = {
  halfWidth: 1.15,
  entryThresholdLz: 0.06,
  minInteriorLz: -0.95,
  exitThresholdLz: 0.36,
  exitCorridorStandOffLz: 0.85,
  minInwardDeltaLz: -0.0008,
} as const;

export interface DoorwayLatchState {
  floorNumber: number;
  slotIndex: 0 | 1 | 2 | 3;
}

export interface DoorwayTransitionResult {
  triggeredSlotIndex: 0 | 1 | 2 | 3 | null;
  nextLatch: DoorwayLatchState | null;
}

/**
 * Converts world (wx, wz) coordinates into portal-local (lx, lz) coordinates for a given room slot.
 * In portal-local space:
 * - `lx` is lateral offset across the 3.0m doorway (`0` = doorway center, `±1.50` = jambs).
 * - `lz` is signed distance along the doorway normal (`> 0` = hall/corridor, `0` = doorway threshold, `< 0` = inside room alcove).
 */
export function worldToPortalLocalXZ(
  slotIndex: number,
  wx: number,
  wz: number,
): { lx: number; lz: number } {
  const safeSlot = Math.max(0, Math.min(ROOMS_PER_FLOOR - 1, Math.floor(slotIndex)));
  const slot = SLOT_CONFIGS[safeSlot];
  const dx = wx - slot.x;
  const dz = wz - slot.z;
  const sin = Math.sin(slot.rotY);
  const cos = Math.cos(slot.rotY);
  return {
    lx: dx * cos - dz * sin,
    lz: dx * sin + dz * cos,
  };
}

/**
 * Computes a safe corridor position and outward-facing yaw just outside a room's doorway
 * when the player exits an exhibition room back to the 3D museum.
 */
export function getRoomExitCorridorPosition(
  slotIndex: number,
  floorNumber: number,
): { x: number; y: number; z: number; rotationY: number } {
  const safeSlot = Math.max(0, Math.min(ROOMS_PER_FLOOR - 1, Math.floor(slotIndex)));
  const safeFloor = Math.max(0, Math.floor(sanitizeFiniteNumber(floorNumber, 0)));
  const slot = SLOT_CONFIGS[safeSlot];
  const worldPos = localToWorldXZ(
    slot.x,
    slot.z,
    slot.rotY,
    0,
    DOORWAY_TRIGGER_SPEC.exitCorridorStandOffLz,
  );
  return {
    x: worldPos.x,
    y: safeFloor * FLOOR_HEIGHT,
    z: worldPos.z,
    rotationY: sanitizeYaw(slot.rotY, 0),
  };
}

/**
 * Evaluates whether the character has walked through an active room's open doorway on the current floor.
 * - Triggers ONLY from actual inward positional movement (`deltaLz < -0.0008`) into the doorway opening (`|lx| <= 1.15m`, `-0.95m <= lz <= +0.06m`).
 * - Never triggers from camera rotation alone (`deltaLz === 0`), walking past in the corridor (`lz > +0.06m`), or behind/beside solid walls.
 * - Maintains a per-doorway latch so standing or shifting inside the alcove never retriggers until the character exits past `exitThresholdLz` (`+0.36m`).
 */
export function evaluateRoomDoorwayTransitions(params: {
  prevX: number;
  prevZ: number;
  currX: number;
  currZ: number;
  floorNumber: number;
  slotStatuses: Record<number, RoomPortalStatus>;
  currentLatch: DoorwayLatchState | null;
}): DoorwayTransitionResult {
  const {
    prevX,
    prevZ,
    currX,
    currZ,
    floorNumber,
    slotStatuses,
    currentLatch,
  } = params;

  let nextLatch: DoorwayLatchState | null = currentLatch;

  // 1. If currently latched to a doorway, check whether the character has exited back into the corridor (or changed floors)
  if (nextLatch) {
    if (nextLatch.floorNumber !== floorNumber) {
      nextLatch = null;
    } else {
      const latchedLocal = worldToPortalLocalXZ(
        nextLatch.slotIndex,
        currX,
        currZ,
      );
      if (
        latchedLocal.lz >= DOORWAY_TRIGGER_SPEC.exitThresholdLz ||
        Math.abs(latchedLocal.lx) > DOORWAY_TRIGGER_SPEC.halfWidth + 0.3
      ) {
        nextLatch = null;
      }
    }
  }

  // 2. Check all 4 room slots on the active floor for a fresh inward threshold crossing
  for (const slotIdx of [0, 1, 2, 3] as const) {
    const status = slotStatuses[slotIdx] ?? 'active';
    if (status !== 'active') continue;

    // If already latched in this room's doorway/alcove, do not retrigger
    if (
      nextLatch &&
      nextLatch.floorNumber === floorNumber &&
      nextLatch.slotIndex === slotIdx
    ) {
      continue;
    }

    const prevLocal = worldToPortalLocalXZ(slotIdx, prevX, prevZ);
    const currLocal = worldToPortalLocalXZ(slotIdx, currX, currZ);
    const deltaLz = currLocal.lz - prevLocal.lz;

    const withinDoorwayWidth =
      Math.abs(currLocal.lx) <= DOORWAY_TRIGGER_SPEC.halfWidth &&
      Math.abs(prevLocal.lx) <= DOORWAY_TRIGGER_SPEC.halfWidth + 0.35;

    const withinThresholdDepth =
      currLocal.lz <= DOORWAY_TRIGGER_SPEC.entryThresholdLz &&
      currLocal.lz >= DOORWAY_TRIGGER_SPEC.minInteriorLz &&
      prevLocal.lz >= DOORWAY_TRIGGER_SPEC.minInteriorLz;

    const movedInwardFromHall =
      deltaLz <= DOORWAY_TRIGGER_SPEC.minInwardDeltaLz &&
      prevLocal.lz > currLocal.lz;

    if (withinDoorwayWidth && withinThresholdDepth && movedInwardFromHall) {
      return {
        triggeredSlotIndex: slotIdx,
        nextLatch: {
          floorNumber,
          slotIndex: slotIdx,
        },
      };
    }
  }

  return {
    triggeredSlotIndex: null,
    nextLatch,
  };
}

/**
 * Computes a responsive vertical camera FOV so portrait tablets and phones retain
 * balanced architectural framing without aggressively cropping side corridors or portals.
 */
export function computeResponsiveCameraFov(
  aspect: number,
  baseFov = 50,
): number {
  const safeBase = Math.max(40, Math.min(75, sanitizeFiniteNumber(baseFov, 50)));
  if (!Number.isFinite(aspect) || aspect <= 0) {
    return safeBase;
  }
  if (aspect >= 1.15) {
    return safeBase;
  }
  const narrowT = Math.max(0, Math.min(1, (1.15 - aspect) / (1.15 - 0.5)));
  return Number((safeBase + narrowT * 16).toFixed(2));
}

/**
 * Filters floor/room colliders for elevated camera collision recovery.
 * Preserves all structural walls, pilasters, corner columns, central tree trunk/plinth,
 * lift shaft/doors, and room boundaries while ignoring low floor decor when elevated.
 */
export function buildCameraFloorColliders(
  colliderSet: FloorColliderSet,
  camRelY = 1.85,
): FloorColliderSet {
  const safeRelY = sanitizeFiniteNumber(camRelY, 1.85);
  const isElevatedCamera = safeRelY >= 1.05;

  const circles: CircleCollider[] = [];
  for (let i = 0; i < colliderSet.circles.length; i++) {
    const c = colliderSet.circles[i];
    if (c.id === 'central_sculpture_plinth') {
      circles.push({ ...c, radius: Math.min(c.radius, 0.96) });
      continue;
    }
    if (c.id === 'room_central_floating_island') {
      circles.push({ ...c, radius: Math.min(c.radius, 0.92) });
      continue;
    }
    if (c.id === 'lightwell_balustrade' || c.id.startsWith('corner_col_')) {
      circles.push(c);
      continue;
    }
    if (c.id === 'lift_call_pedestal') {
      if (safeRelY < 1.45) {
        circles.push(c);
      }
      continue;
    }
    if (!isElevatedCamera) {
      circles.push(c);
    }
  }

  const obbs: OBBCollider[] = [];
  for (let i = 0; i < colliderSet.obbs.length; i++) {
    const obb = colliderSet.obbs[i];
    if (
      isElevatedCamera &&
      (obb.id === 'room_cinema_lounge_sofa' ||
        obb.id === 'room_reflection_bench' ||
        obb.id === 'room_bedroom_bed' ||
        obb.id === 'room_study_desk' ||
        obb.id === 'room_constellation_table')
    ) {
      continue;
    }
    obbs.push(obb);
  }

  return {
    floorNumber: colliderSet.floorNumber,
    outerRadius: colliderSet.outerRadius,
    circles,
    obbs,
  };
}

/**
 * Computes a collision-safe third-person camera position and look-at target around the character pivot.
 * Used both for deterministic transition snaps (room entry, room exit, lift boarding) and per-frame bounds validation.
 */
export function resolveThirdPersonCameraPosition(params: {
  pivotX: number;
  pivotY: number;
  pivotZ: number;
  floorBaseY: number;
  yaw: number;
  pitch: number;
  distance: number;
  colliderSet: FloorColliderSet;
  shoulderHeightOffset?: number;
  minFloorOffset?: number;
  maxCeilingOffset?: number;
  cameraRadius?: number;
}): {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  collided: boolean;
  distToPivotXZ: number;
  distToPivot3D: number;
} {
  const pivotX = sanitizeFiniteNumber(params.pivotX, 0);
  const pivotY = sanitizeFiniteNumber(params.pivotY, 1.65);
  const pivotZ = sanitizeFiniteNumber(params.pivotZ, 0);
  const floorBaseY = sanitizeFiniteNumber(params.floorBaseY, 0);
  const yaw = sanitizeYaw(params.yaw, 0);
  const pitch = sanitizePitch(params.pitch, 0.16);
  const distance = Math.max(0.85, sanitizeFiniteNumber(params.distance, 3.8));
  const shoulderOffset = sanitizeFiniteNumber(params.shoulderHeightOffset, 0.25);
  const minFloorOffset = sanitizeFiniteNumber(params.minFloorOffset, 0.55);
  const maxCeilingOffset = sanitizeFiniteNumber(params.maxCeilingOffset, FLOOR_HEIGHT - 0.45);
  const cameraRadius = Math.max(0.12, sanitizeFiniteNumber(params.cameraRadius, CAMERA_COLLIDER_RADIUS));

  const lookDirX = Math.sin(yaw) * Math.cos(pitch);
  const lookDirY = -Math.sin(pitch);
  const lookDirZ = Math.cos(yaw) * Math.cos(pitch);

  const clampedY = Math.max(
    floorBaseY + minFloorOffset,
    Math.min(floorBaseY + maxCeilingOffset, pivotY + shoulderOffset - lookDirY * distance),
  );
  const rawX = pivotX - lookDirX * distance;
  const rawZ = pivotZ - lookDirZ * distance;

  const camColliders = buildCameraFloorColliders(params.colliderSet, clampedY - floorBaseY);
  const resolved = resolveSingleStepPosition(rawX, rawZ, camColliders, cameraRadius);

  const distToPivotXZ = Math.hypot(resolved.x - pivotX, resolved.z - pivotZ);
  const distToPivot3D = Math.hypot(
    resolved.x - pivotX,
    clampedY - pivotY,
    resolved.z - pivotZ,
  );

  return {
    x: resolved.x,
    y: clampedY,
    z: resolved.z,
    lookX: pivotX + lookDirX * 5.5,
    lookY: pivotY + 0.1 + lookDirY * 5.5,
    lookZ: pivotZ + lookDirZ * 5.5,
    collided: resolved.collided,
    distToPivotXZ,
    distToPivot3D,
  };
}

/**
 * Authoritative Room Entrance Pocket-Door Specification & Independent State Machine.
 * Normal room portals have an open arched stone frame (`PORTAL_ARCH_SPEC`: 3.10m x 2.85m straight jambs
 * below the 4.40m arch crown). Twin recessed pocket sliding leaves sit cleanly inside the frame at
 * `localZ = -0.08m` and retract laterally into the arch piers/wing masonry without altering the archways.
 */
export const ROOM_DOOR_SPEC = {
  doorHalfWidth: 1.55,
  panelWidth: 1.56,
  panelHalfWidth: 0.78,
  panelHeight: 2.84,
  panelDepth: 0.06,
  localZ: -0.08,
  panelSlideDistance: 1.48,
  approachHalfWidth: 2.15,
  approachMaxLz: 3.15,
  holdHalfWidth: 2.45,
  holdMaxLz: 3.45,
  minInteriorLz: -1.15,
  thresholdSafetyHalfWidth: 1.62,
  thresholdSafetyMaxLz: 0.48,
  openSpeed: 2.6,
  closeSpeed: 2.0,
  closeDelaySec: 0.35,
  passableOpenThreshold: 0.88,
} as const;

export type RoomDoorPhase = 'closed' | 'opening' | 'open' | 'closing';

export interface RoomDoorState {
  roomId: string;
  floorNumber: number;
  slotIndex: 0 | 1 | 2 | 3;
  status: RoomPortalStatus;
  phase: RoomDoorPhase;
  openAmount: number;
  closeDelayTimer: number;
}

export function createInitialRoomDoorState(params: {
  roomId: string;
  floorNumber: number;
  slotIndex: 0 | 1 | 2 | 3;
  status: RoomPortalStatus;
  initialOpenAmount?: number;
}): RoomDoorState {
  const safeOpen = Math.max(
    0,
    Math.min(1, sanitizeFiniteNumber(params.initialOpenAmount, 0)),
  );
  return {
    roomId: params.roomId,
    floorNumber: Math.max(0, Math.floor(sanitizeFiniteNumber(params.floorNumber, 0))),
    slotIndex: params.slotIndex,
    status: params.status,
    phase: safeOpen >= 1 ? 'open' : safeOpen > 0 ? 'opening' : 'closed',
    openAmount: params.status === 'active' ? safeOpen : 0,
    closeDelayTimer: 0,
  };
}

/**
 * Doorway-aware proximity detection in portal-local (lx, lz) space.
 * Never triggers from behind exterior walls (lz < -1.15m) or far outside the portal wing width.
 * Applies slight hysteresis once open/opening so standing at the perimeter never chatters.
 */
export function evaluateRoomDoorProximity(params: {
  slotIndex: number;
  playerX: number;
  playerZ: number;
  isCurrentlyOpenOrOpening?: boolean;
}): {
  inApproachZone: boolean;
  inThresholdCrossing: boolean;
  lx: number;
  lz: number;
} {
  const local = worldToPortalLocalXZ(
    params.slotIndex,
    sanitizeFiniteNumber(params.playerX, 0),
    sanitizeFiniteNumber(params.playerZ, 0),
  );
  const maxHalfW = params.isCurrentlyOpenOrOpening
    ? ROOM_DOOR_SPEC.holdHalfWidth
    : ROOM_DOOR_SPEC.approachHalfWidth;
  const maxLz = params.isCurrentlyOpenOrOpening
    ? ROOM_DOOR_SPEC.holdMaxLz
    : ROOM_DOOR_SPEC.approachMaxLz;

  const inThresholdCrossing =
    Math.abs(local.lx) <= ROOM_DOOR_SPEC.thresholdSafetyHalfWidth &&
    local.lz >= ROOM_DOOR_SPEC.minInteriorLz &&
    local.lz <= ROOM_DOOR_SPEC.thresholdSafetyMaxLz;

  const inApproachZone =
    inThresholdCrossing ||
    (Math.abs(local.lx) <= maxHalfW &&
      local.lz >= 0 &&
      local.lz <= maxLz);

  return {
    inApproachZone,
    inThresholdCrossing,
    lx: local.lx,
    lz: local.lz,
  };
}

/**
 * Advances a single room portal door's independent state machine.
 * Handles smooth opening, dwell delay before closing, mid-motion reversal without snapping,
 * anti-pinch threshold reopening, and non-active room locking.
 */
export function stepRoomDoorState(
  state: RoomDoorState,
  params: {
    playerX: number;
    playerZ: number;
    activeFloorNumber: number;
    delta: number;
    enabled?: boolean;
    reducedMotion?: boolean;
  },
): RoomDoorState {
  const safeDelta = Math.min(
    Math.max(0, sanitizeFiniteNumber(params.delta, 0.016)),
    MAX_FRAME_DELTA * 2,
  );
  const isEnabled = params.enabled ?? true;
  const isSameFloor = params.activeFloorNumber === state.floorNumber;

  if (state.status !== 'active' || !isEnabled) {
    return {
      ...state,
      phase: 'closed',
      openAmount: 0,
      closeDelayTimer: 0,
    };
  }

  const isCurrentlyOpenOrOpening =
    state.phase === 'open' || state.phase === 'opening';
  const prox = isSameFloor
    ? evaluateRoomDoorProximity({
        slotIndex: state.slotIndex,
        playerX: params.playerX,
        playerZ: params.playerZ,
        isCurrentlyOpenOrOpening,
      })
    : { inApproachZone: false, inThresholdCrossing: false, lx: 0, lz: 99 };

  const shouldOpen = isSameFloor && (prox.inApproachZone || prox.inThresholdCrossing);
  let phase: RoomDoorPhase = state.phase;
  let openAmount = Math.max(0, Math.min(1, sanitizeFiniteNumber(state.openAmount, 0)));
  let closeDelayTimer = Math.max(0, sanitizeFiniteNumber(state.closeDelayTimer, 0));

  if (shouldOpen) {
    closeDelayTimer = ROOM_DOOR_SPEC.closeDelaySec;
    if (phase === 'closed' || phase === 'closing') {
      phase = 'opening';
    }
  } else {
    if (phase === 'opening') {
      // Mid-motion reversal while opening -> immediately reverse cleanly to closing from current openAmount
      phase = 'closing';
      closeDelayTimer = 0;
    } else if (phase === 'open') {
      if (!isSameFloor) {
        phase = 'closing';
        closeDelayTimer = 0;
      } else {
        closeDelayTimer = Math.max(0, closeDelayTimer - safeDelta);
        if (closeDelayTimer <= 0) {
          phase = 'closing';
        }
      }
    }
  }

  if (params.reducedMotion) {
    if (shouldOpen) {
      openAmount = 1;
      phase = 'open';
    } else if (phase === 'closing') {
      openAmount = 0;
      phase = 'closed';
    }
  } else if (phase === 'opening') {
    openAmount = Math.min(1, openAmount + safeDelta * ROOM_DOOR_SPEC.openSpeed);
    if (openAmount >= 1) {
      openAmount = 1;
      phase = 'open';
    }
  } else if (phase === 'closing') {
    if (prox.inThresholdCrossing && isSameFloor) {
      // Anti-pinch safety reversal
      phase = 'opening';
      openAmount = Math.min(1, openAmount + safeDelta * ROOM_DOOR_SPEC.openSpeed);
    } else {
      openAmount = Math.max(0, openAmount - safeDelta * ROOM_DOOR_SPEC.closeSpeed);
      if (openAmount <= 0) {
        openAmount = 0;
        phase = 'closed';
      }
    }
  }

  return {
    ...state,
    phase,
    openAmount,
    closeDelayTimer,
  };
}

/**
 * Single authoritative camera owner resolution for frame choreography & transition handoffs.
 */
export type CameraControllerOwner =
  | 'intro'
  | 'welcome'
  | 'tutorial'
  | 'lift_travel'
  | 'scripted_gsap'
  | 'first_person'
  | 'third_person';

export function resolveCameraControllerOwner(params: {
  hasEnteredAtrium: boolean;
  isWelcomeActive: boolean;
  liftPhase: string;
  inActiveRoom3D: boolean;
  isTutorialActive: boolean;
  tutorialTarget: string | null | undefined;
  isScriptedGsapActive?: boolean;
  cameraViewMode: 'first_person' | 'third_person';
}): CameraControllerOwner {
  if (!params.hasEnteredAtrium) return 'intro';
  if (params.isWelcomeActive && params.liftPhase === 'idle') return 'welcome';
  const hasSupportedTutorialTarget =
    params.tutorialTarget === 'childhood_entrance' ||
    params.tutorialTarget === 'overview' ||
    params.tutorialTarget === 'movement_controls' ||
    params.tutorialTarget === 'add_memory' ||
    params.tutorialTarget === 'customise_room' ||
    params.tutorialTarget === 'explore_world' ||
    params.tutorialTarget === 'feature_wall' ||
    params.tutorialTarget === 'lift';
  if (!params.inActiveRoom3D && params.isTutorialActive && hasSupportedTutorialTarget) {
    return 'tutorial';
  }
  if (!params.inActiveRoom3D && params.liftPhase === 'traveling') {
    return 'lift_travel';
  }
  if (params.isScriptedGsapActive) {
    return 'scripted_gsap';
  }
  return params.cameraViewMode === 'first_person' ? 'first_person' : 'third_person';
}

/**
 * Deterministic character & ground-shadow visibility state synchronized across camera modes and transitions.
 */
export function resolveCharacterVisibility(params: {
  cameraOwner: CameraControllerOwner;
  cameraDistToPivot3D?: number;
  minThirdPersonVisibleDist?: number;
}): { bodyVisible: boolean; shadowVisible: boolean } {
  if (
    params.cameraOwner === 'first_person' ||
    params.cameraOwner === 'lift_travel'
  ) {
    return { bodyVisible: false, shadowVisible: false };
  }
  if (params.cameraOwner === 'third_person') {
    const threshold = sanitizeFiniteNumber(params.minThirdPersonVisibleDist, 0.85);
    const dist = sanitizeFiniteNumber(params.cameraDistToPivot3D, 3.6);
    const visible = dist >= threshold;
    return { bodyVisible: visible, shadowVisible: visible };
  }
  return { bodyVisible: true, shadowVisible: true };
}



