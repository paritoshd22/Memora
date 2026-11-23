import assert from 'node:assert/strict';
import {
  CHARACTER_COLLIDER_RADIUS,
  ROTUNDA_WALL_RADIUS,
  FLOOR_HEIGHT,
  PORTAL_ARCH_SPEC,
  ROOMS_PER_FLOOR,
  SLOT_CONFIGS,
  buildFloorColliders,
  computeRoomEntryLightState,
  getFloorSlotPlacementCoords,
  getPerimeterArchitectureSpec,
  localToWorldXZ,
  resolveCharacterMovement,
  resolveSingleStepPosition,
  sanitizeCharacterPosition,
  sanitizeFiniteNumber,
  sanitizeFloorIndex,
  sanitizePitch,
  sanitizeYaw,
  shortestAngleDiff,
  evaluateRoomDoorwayTransitions,
  getRoomExitCorridorPosition,
  worldToPortalLocalXZ,
  DoorwayLatchState,
  RoomPortalStatus,
  isCharacterInElevatorCabin,
  isCharacterInElevatorDoorway,
  isCharacterInElevatorApproachZone,
  isCharacterInElevatorProximity,
  CAMERA_COLLIDER_RADIUS,
  LIGHTWELL_CENTER_X,
  LIGHTWELL_CENTER_Z,
  buildCameraFloorColliders,
  computeResponsiveCameraFov,
  resolveThirdPersonCameraPosition,
  ROOM_DOOR_SPEC,
  RoomDoorState,
  createInitialRoomDoorState,
  evaluateRoomDoorProximity,
  stepRoomDoorState,
  CameraControllerOwner,
  resolveCameraControllerOwner,
  resolveCharacterVisibility,
} from '../atriumCollision';
import {
  EXHIBITION_DISPLAY_STYLE_OPTIONS,
  ROOM_ENTRANCE_TRANSITION_SPEC,
  ROOM_INTERIOR_SPEC,
  buildRoomInteriorColliders,
  computeExhibitionPlacements,
  computeRoomEntranceAnimationState,
  evaluateRoomInteriorExitDoorway,
  evaluateRoomMemoryProximity,
  getAuthenticMemoryDateLabel,
  resolveRoomInteriorMovement,
  getBicycleTrailPose,
  buildContextualWorldCatalog,
} from '../roomExhibition3D';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  extractReadableDocumentText,
  validateUploadFileCandidate,
} from '../clientMediaExtractor';
import {
  buildGroundedFallbackReport,
  parseChatExportText,
  sanitizeAndOrganizeCollections,
  validateEvidenceConnection,
  validateLocationPlacement,
} from '../curationValidator';
import {
  BUILTIN_MUSIC_SOURCES,
  DEFAULT_SPOTIFY_PLAYLIST_CONFIG,
  INITIAL_AUDIO_SETTINGS,
  INITIAL_MEMORIES,
  INITIAL_ROOMS,
} from '../../data/initialMuseumData';
import { museumAudioEngine } from '../../services/audioEngine';
import { Memory } from '../../types/museum';
import {
  ROOM_CATEGORY_EXPERIENCE_PROFILES,
  detectRoomCategoryFromInput,
  computeRoomMemoryVisualData,
  buildSynthesizedRoomDesignConfig,
  instantiateStarterMemoriesForRoom,
  generateImmersiveRoomBlueprint,
  validateAndNormalizeRoomBlueprint,
} from '../roomCategoryExperience';
import * as THREE from 'three';
import {
  MUSEUM_ASSET_MANIFEST,
  getAssetManifestEntry,
  getAssetsByCategory,
  getAssetsForEnvironment,
  validateAssetManifestEntry,
} from '../../data/assetManifest';
import {
  cloneGLTFScene,
  disposeObject3DResources,
  loadMuseumAssetById,
} from '../gltfAssetLoader';
import {
  animateObjectEntrance3D,
  animateObjectRotation3D,
  createCameraTransitionTimeline,
} from '../gsapMuseumAnimations';
import {
  BRAND,
  resolveBrowserTitle,
  resolveMuseumDisplayName,
} from '../../config/brand';
import {
  AdaptiveGraphicsMonitor,
  classifyGpuCapability,
  computeEffectivePixelRatio,
  computeRoomLightingRigTargets,
  createProfiledBalusterLatheGeometry,
  createProfiledColumnBaseLatheGeometry,
  createProfiledColumnCapitalLatheGeometry,
  createProfiledColumnShaftLatheGeometry,
  createProfiledPlanterUrnLatheGeometry,
  createVolumetricSunbeamShafts,
  createWarmParquetFloorPBRSet,
  detectInitialGraphicsProfile,
  ensureUv2Attribute,
  getGraphicsProfileConfig,
  getSoftwareGlFrameIntervalMs,
  getVisualQualityConfig,
  populateRefinedAtriumTree,
  populateRefinedRoomCentralTree,
} from '../museumVisualStandards';
import {
  BODY_PROPORTION_PROFILES,
  CHARACTER_FACIAL_HAIR_LABELS,
  CHARACTER_FOOTWEAR_LABELS,
  CHARACTER_HAIR_STYLE_LABELS,
  CHARACTER_OUTFIT_PRESETS,
  CHARACTER_SKIN_TONES,
  DEFAULT_CHARACTER_CONFIG,
  buildExplorerCharacter,
  createRandomCharacterConfig,
  getCharacterStorageKey,
  loadCharacterConfigFromStorage,
  saveCharacterConfigToStorage,
  sanitizeCharacterConfig,
} from '../characterBuilder';

async function runTests() {
  console.log('Running Atrium 3D Collision, 4-Room Architecture & Room Entry Lighting Tests...\n');

  assert.equal(ROOMS_PER_FLOOR, 4, 'Building must have exactly 4 rooms per floor');
  assert.equal(SLOT_CONFIGS.length, 4, 'SLOT_CONFIGS must contain exactly 4 room slots per floor');

  const defaultSlots: Record<number, RoomPortalStatus> = {
    0: 'active',
    1: 'active',
    2: 'disabled',
    3: 'active',
  };

  const floor0Colliders = buildFloorColliders({
    floorNumber: 0,
    slotStatuses: defaultSlots,
    isLiftDoorOpen: false,
  });

  // 1. Coordinate, Floor, Yaw & Pitch Sanitization
  {
    assert.equal(sanitizeFiniteNumber(NaN, 5), 5, 'NaN should fallback to default');
    assert.equal(sanitizeFiniteNumber(Infinity, -2), -2, 'Infinity should fallback to default');
    assert.equal(sanitizeFloorIndex(NaN, 5), 0, 'NaN floor should fallback to 0');
    assert.equal(sanitizeFloorIndex(-3, 5), 0, 'Negative floor should clamp to 0');
    assert.equal(sanitizeFloorIndex(99, 4), 3, 'Floor exceeding max count should clamp to maxFloorIndex');
    assert.equal(sanitizePitch(NaN), 0.16, 'NaN pitch should fallback to 0.16');
    assert.ok(sanitizePitch(2.0) <= 0.68, 'High positive pitch should clamp to <= 0.68');
    assert.ok(sanitizePitch(-2.0) >= -0.58, 'High negative pitch should clamp to >= -0.58');
    assert.ok(Math.abs(sanitizeYaw(Math.PI * 5)) <= Math.PI, 'Yaw should normalize into [-PI, PI]');
    assert.ok(Math.abs(shortestAngleDiff(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-6, 'Shortest angle wrap across PI');

    const badPos = sanitizeCharacterPosition({
      position: [NaN, NaN, Infinity],
      floorNumber: 0,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    assert.ok(
      Number.isFinite(badPos.x) && Number.isFinite(badPos.y) && Number.isFinite(badPos.z),
      'Corrupted position must sanitize to finite coordinates'
    );
    console.log('✓ 1. Coordinate, Floor, Yaw & Pitch sanitization verified');
  }

  // 2. Outer Rotunda & Interior Perimeter Containment (All Angles & High-Speed Anti-Tunneling)
  {
    const maxAllowedRadius = ROTUNDA_WALL_RADIUS - CHARACTER_COLLIDER_RADIUS;
    for (let deg = 0; deg < 360; deg += 15) {
      const rad = (deg * Math.PI) / 180;
      const startX = Math.cos(rad) * 5.0;
      const startZ = Math.sin(rad) * 5.0;
      const res = resolveCharacterMovement({
        startX,
        startY: 0,
        startZ,
        velX: Math.cos(rad) * 400, // huge velocity attempting to tunnel outside perimeter
        velZ: Math.sin(rad) * 400,
        delta: 0.05,
        totalFloors: 3,
        slotStatuses: defaultSlots,
        isLiftDoorOpen: false,
      });
      const finalR = Math.hypot(res.x, res.z);
      assert.ok(
        finalR <= maxAllowedRadius + 1e-4,
        `Character escaped museum perimeter at angle ${deg} deg (radius ${finalR} > ${maxAllowedRadius})`
      );
    }
    console.log('✓ 2. Museum perimeter containment & anti-tunneling verified across 360°');
  }

  // 3. South Feature Wall Collision & Smooth Tangential Wall Sliding
  {
    const straightRes = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: 8.2,
      velX: 0,
      velZ: 80.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    assert.ok(
      straightRes.z <= 8.95,
      `Character walked through South Feature Wall (z=${straightRes.z} > 8.95)`
    );
    assert.equal(straightRes.collided, true, 'Feature Wall impact should report collided=true');

    const slideRes = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: 8.85,
      velX: 50.0,
      velZ: 50.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    assert.ok(slideRes.z <= 8.95, `Character penetrated Feature Wall during diagonal slide (z=${slideRes.z})`);
    assert.ok(slideRes.x > 1.8, `Character failed to slide smoothly along Feature Wall (+X=${slideRes.x})`);
    console.log('✓ 3. South Feature Wall collision & tangential wall sliding verified');
  }

  // 4. North Lift Doors (Closed vs Open) & Lift Shaft/Cabin Walls
  {
    const closedRes = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: -7.2,
      velX: 0,
      velZ: -70.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
      isLiftDoorOpen: false,
    });
    assert.ok(
      closedRes.z >= -8.01,
      `Character walked through closed North Lift doors (z=${closedRes.z} < -8.01)`
    );

    const enterLiftRes = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: -7.2,
      velX: 0,
      velZ: -52.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
      isLiftDoorOpen: true,
    });
    assert.ok(
      enterLiftRes.z < -9.2 && enterLiftRes.z > -10.75,
      `Character should enter open lift cabin cleanly (z=${enterLiftRes.z})`
    );

    const backWallRes = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: -9.8,
      velX: 0,
      velZ: -80.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
      isLiftDoorOpen: true,
    });
    assert.ok(
      backWallRes.z >= -10.67,
      `Character walked through lift shaft back wall (z=${backWallRes.z})`
    );

    const sideWallRes = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: -9.8,
      velX: 60.0,
      velZ: 0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
      isLiftDoorOpen: true,
    });
    assert.ok(
      sideWallRes.x <= 1.25,
      `Character walked through lift shaft side wall (x=${sideWallRes.x})`
    );
    console.log('✓ 4. North Lift closed doors, open cabin entry, and shaft wall barriers verified');
  }

  // 5. Floor 0 Sculpture Plinth & Upper-Floor Lightwell Balustrade Protection
  {
    const plinthRes = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: 4.2,
      velX: 0,
      velZ: -48.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    const distFloor0 = Math.hypot(plinthRes.x - 0, plinthRes.z - 1.8);
    assert.ok(
      distFloor0 >= 1.26 + CHARACTER_COLLIDER_RADIUS - 1e-3,
      `Character penetrated Floor 0 sculpture plinth (dist=${distFloor0})`
    );

    const lightwellRes = resolveCharacterMovement({
      startX: 0,
      startY: FLOOR_HEIGHT,
      startZ: 5.5,
      velX: 0,
      velZ: -74.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    const distFloor1 = Math.hypot(lightwellRes.x - 0, lightwellRes.z - 1.8);
    assert.ok(
      distFloor1 >= 2.68 + CHARACTER_COLLIDER_RADIUS - 1e-3,
      `Character breached upper-floor lightwell balustrade (dist=${distFloor1})`
    );
    console.log('✓ 5. Floor 0 sculpture plinth & upper-floor lightwell balustrade protection verified');
  }

  // 6. Botanical Planters & Lift Call Pedestal Obstacles
  {
    const planterRes = resolveCharacterMovement({
      startX: -3.6,
      startY: 0,
      startZ: -5.8,
      velX: 0,
      velZ: -32.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    const distPlanter = Math.hypot(planterRes.x - (-3.6), planterRes.z - (-7.4));
    assert.ok(
      distPlanter >= 0.54 + CHARACTER_COLLIDER_RADIUS - 1e-3,
      `Character walked through botanical planter (dist=${distPlanter})`
    );

    const pedRes = resolveCharacterMovement({
      startX: 2.15,
      startY: 0,
      startZ: -7.2,
      velX: 0,
      velZ: -21.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    const distPed = Math.hypot(pedRes.x - 2.15, pedRes.z - (-8.25));
    assert.ok(
      distPed >= 0.26 + CHARACTER_COLLIDER_RADIUS - 1e-3,
      `Character walked through lift call pedestal (dist=${distPed})`
    );
    console.log('✓ 6. Botanical planters & lift call pedestal collisions verified');
  }

  // 7. Room Portal Alcoves, Piers, Back Walls & Disabled/Empty Room Barriers (Slots 0..2)
  {
    const slot0 = getFloorSlotPlacementCoords(0, 0);
    const cos = Math.cos(slot0.rotY);
    const sin = Math.sin(slot0.rotY);

    const startX0 = slot0.x + sin * 2.5;
    const startZ0 = slot0.z + cos * 2.5;
    const moveIntoSlot0 = resolveCharacterMovement({
      startX: startX0,
      startY: 0,
      startZ: startZ0,
      velX: -sin * 120.0,
      velZ: -cos * 120.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    const relX0 = moveIntoSlot0.x - slot0.x;
    const relZ0 = moveIntoSlot0.z - slot0.z;
    const localZ0 = relX0 * sin + relZ0 * cos;
    assert.ok(
      localZ0 > -1.35,
      `Character passed through active Room Portal 0 alcove back wall/pedestal (localZ=${localZ0})`
    );

    // Slot 2 is disabled in defaultSlots
    const slot2 = getFloorSlotPlacementCoords(2, 0);
    const cos2 = Math.cos(slot2.rotY);
    const sin2 = Math.sin(slot2.rotY);
    const startX2 = slot2.x + sin2 * 2.5;
    const startZ2 = slot2.z + cos2 * 2.5;
    const moveIntoSlot2 = resolveCharacterMovement({
      startX: startX2,
      startY: 0,
      startZ: startZ2,
      velX: -sin2 * 80.0,
      velZ: -cos2 * 80.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    const relX2 = moveIntoSlot2.x - slot2.x;
    const relZ2 = moveIntoSlot2.z - slot2.z;
    const localZ2 = relX2 * sin2 + relZ2 * cos2;
    assert.ok(
      localZ2 >= -0.01 + 0.21 + CHARACTER_COLLIDER_RADIUS - 1e-2,
      `Character passed through disabled Room Portal 2 doorway barrier (localZ=${localZ2})`
    );

    const pierWorldX = slot0.x - cos * 1.95;
    const pierWorldZ = slot0.z + sin * 1.95;
    const camClamp = resolveSingleStepPosition(pierWorldX, pierWorldZ, floor0Colliders, 0.26);
    assert.equal(camClamp.collided, true, 'Camera inside portal arch pier must be pushed out cleanly');
    console.log('✓ 7. Room portal piers, alcove walls, active pedestals & disabled/empty doorway barriers verified');
  }

  // 8. Floor Height Grounding Consistency
  {
    assert.equal(FLOOR_HEIGHT, 6.0, 'FLOOR_HEIGHT constant must match 3D building floor spacing (6.0m)');
    console.log('✓ 8. Vertical floor spacing & grounding constant verified');
  }

  // 9. Continuous Interior Perimeter Wall Ring — Zero Access Behind Walls
  {
    // A. Attempt to walk behind North Lift Wing Wall (at x = -2.8, z = -7.0 moving North)
    const nwLiftWingTest = resolveCharacterMovement({
      startX: -2.8,
      startY: 0,
      startZ: -7.0,
      velX: 0,
      velZ: -90.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    assert.ok(
      nwLiftWingTest.z >= -8.6 + PORTAL_ARCH_SPEC.wallHalfThickness + CHARACTER_COLLIDER_RADIUS - 1e-2,
      `Character walked behind North-West Lift Wing wall (z=${nwLiftWingTest.z})`
    );

    // B. Attempt to walk through West Inter-Room Wall between Slot 0 and Slot 1 (at x = -7.0, z = -0.25 moving West)
    const westWallTest = resolveCharacterMovement({
      startX: -7.0,
      startY: 0,
      startZ: -0.25,
      velX: -100.0,
      velZ: 0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    assert.ok(
      westWallTest.x >= -8.6 + PORTAL_ARCH_SPEC.wallHalfThickness + CHARACTER_COLLIDER_RADIUS - 1e-2,
      `Character walked through West Inter-Room Wall into space behind wall (x=${westWallTest.x})`
    );

    // C. Attempt to walk through East Inter-Room Wall between Slot 1 and Slot 2 (at x = 7.0, z = -0.25 moving East)
    const eastWallTest = resolveCharacterMovement({
      startX: 7.0,
      startY: 0,
      startZ: -0.25,
      velX: 100.0,
      velZ: 0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    assert.ok(
      eastWallTest.x <= 8.6 - PORTAL_ARCH_SPEC.wallHalfThickness - CHARACTER_COLLIDER_RADIUS + 1e-2,
      `Character walked between Slot 1 & Slot 2 into space behind East wall (x=${eastWallTest.x})`
    );

    // D. Attempt to walk through South-West Return Wall between Slot 0 and Feature Wall
    const swWallTest = resolveCharacterMovement({
      startX: -6.8,
      startY: 0,
      startZ: 6.8,
      velX: -90.0,
      velZ: 90.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    assert.ok(
      swWallTest.x > -8.6 && swWallTest.z < 8.95,
      `Character breached South-West Return Wall behind Slot 0 / Feature Wall (x=${swWallTest.x}, z=${swWallTest.z})`
    );

    // E. Attempt to walk through South-East Return Wall between Slot 2 and Feature Wall
    const seWallTest = resolveCharacterMovement({
      startX: 6.8,
      startY: 0,
      startZ: 6.8,
      velX: 90.0,
      velZ: 90.0,
      delta: 0.05,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    assert.ok(
      seWallTest.x < 8.6 && seWallTest.z < 8.95,
      `Character breached South-East Return Wall behind Slot 2 / Feature Wall (x=${seWallTest.x}, z=${seWallTest.z})`
    );

    // F. Verify inward-only push if a coordinate ever starts inside/behind a perimeter wall backing seal
    const behindSouthWall = sanitizeCharacterPosition({
      position: [0, 0, 11.2],
      floorNumber: 0,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    assert.ok(
      behindSouthWall.z <= 8.95,
      `Position behind South Feature Wall must be pushed inward into hall (z=${behindSouthWall.z})`
    );

    const behindWestWall = sanitizeCharacterPosition({
      position: [-9.8, 0, -0.25],
      floorNumber: 0,
      totalFloors: 3,
      slotStatuses: defaultSlots,
    });
    assert.ok(
      behindWestWall.x > -8.6,
      `Position behind West Inter-Room Wall must be pushed inward into hall (x=${behindWestWall.x})`
    );

    console.log('✓ 9. Continuous perimeter wall ring & zero access behind walls verified');
  }

  // 10. Room Gate Alignment, Coplanar Wing Continuity & Doorway Entry/Exit Validation across all 3 Slots
  {
    const { wallSegments, cornerColumns } = getPerimeterArchitectureSpec();
    assert.equal(wallSegments.length, 10, 'Should have 10 continuous perimeter wall segments');
    assert.equal(cornerColumns.length, 12, 'Should have 12 structural corner columns at junctions');

    // Verify every perimeter wall segment has positive length and inward-facing normal toward (0,0)
    for (const seg of wallSegments) {
      assert.ok(seg.length > 1.5, `Segment ${seg.id} must have valid positive length (${seg.length})`);
      const nx = Math.sin(seg.rotY);
      const nz = Math.cos(seg.rotY);
      const dotToOrigin = -seg.cx * nx - seg.cz * nz;
      assert.ok(
        dotToOrigin > 1.5,
        `Segment ${seg.id} normal must point strictly inward toward museum center (dot=${dotToOrigin})`
      );
    }

    // Verify entering & exiting every active room doorway cleanly without getting stuck on gate frames
    const allActiveSlots: Record<number, RoomPortalStatus> = {
      0: 'active',
      1: 'active',
      2: 'active',
      3: 'active',
    };
    for (let slotIdx = 0; slotIdx < ROOMS_PER_FLOOR; slotIdx++) {
      const slot = getFloorSlotPlacementCoords(slotIdx, 1);
      assert.equal(slot.y, FLOOR_HEIGHT, 'Floor 1 slot Y must equal FLOOR_HEIGHT');
      const sin = Math.sin(slot.rotY);
      const cos = Math.cos(slot.rotY);

      // Walk straight through the center of the doorway (lx = 0) from lz = +1.8 to lz = -0.35 (inside alcove)
      const enterRes = resolveCharacterMovement({
        startX: slot.x + sin * 1.8,
        startY: FLOOR_HEIGHT,
        startZ: slot.z + cos * 1.8,
        velX: -sin * 42.0,
        velZ: -cos * 42.0,
        delta: 0.05,
        totalFloors: 3,
        slotStatuses: allActiveSlots,
      });
      const enterRelX = enterRes.x - slot.x;
      const enterRelZ = enterRes.z - slot.z;
      const enterLz = enterRelX * sin + enterRelZ * cos;
      assert.ok(
        enterLz < 0.05 && enterLz > -0.9,
        `Character should enter active Room Gate ${slotIdx} doorway cleanly (enterLz=${enterLz})`
      );

      // Walk back out of the alcove into the main hall
      const exitRes = resolveCharacterMovement({
        startX: enterRes.x,
        startY: FLOOR_HEIGHT,
        startZ: enterRes.z,
        velX: sin * 45.0,
        velZ: cos * 45.0,
        delta: 0.05,
        totalFloors: 3,
        slotStatuses: allActiveSlots,
      });
      const exitRelX = exitRes.x - slot.x;
      const exitRelZ = exitRes.z - slot.z;
      const exitLz = exitRelX * sin + exitRelZ * cos;
      assert.ok(
        exitLz > 1.2,
        `Character should exit active Room Gate ${slotIdx} doorway cleanly back into hall (exitLz=${exitLz})`
      );

      // Verify sliding along the outside of the gate frame & wing junction on both sides (-X and +X)
      for (const sideSign of [-1, 1] as const) {
        const slideStart = localToWorldXZ(slot.x, slot.z, slot.rotY, sideSign * 1.7, 0.72);
        const tangentX = cos * sideSign;
        const tangentZ = -sin * sideSign;
        const wingSlideRes = resolveCharacterMovement({
          startX: slideStart.x,
          startY: FLOOR_HEIGHT,
          startZ: slideStart.z,
          velX: tangentX * 25.0 - sin * 15.0,
          velZ: tangentZ * 25.0 - cos * 15.0,
          delta: 0.05,
          totalFloors: 3,
          slotStatuses: allActiveSlots,
        });
        const slideRelX = wingSlideRes.x - slot.x;
        const slideRelZ = wingSlideRes.z - slot.z;
        const slideLz = slideRelX * sin + slideRelZ * cos;
        assert.ok(
          slideLz >= 0.6,
          `Character penetrated Gate ${slotIdx} pier/wing junction (side=${sideSign}, slideLz=${slideLz})`
        );
      }
    }

    console.log('✓ 10. Room gate alignment, coplanar wing continuity & doorway entry/exit verified across all 3 slots');
  }

  // 11. Room Entry Lights Visibility & Camera-Rotation Highlighting across all 3 Rooms
  {
    const camX = 0;
    const camZ = 4.8;
    const playerX = 0;
    const playerZ = 4.8;

    for (let slotIdx = 0; slotIdx < ROOMS_PER_FLOOR; slotIdx++) {
      const coords = getFloorSlotPlacementCoords(slotIdx, 0);

      // Verify doorframe sconces and entry light are positioned flush on the hall-facing side of the wall
      const relLightX = coords.entryLightX - coords.x;
      const relLightZ = coords.entryLightZ - coords.z;
      const localLightZ = relLightX * coords.normalX + relLightZ * coords.normalZ;
      assert.ok(
        localLightZ > 0.24 && localLightZ < 0.5,
        `Room ${slotIdx} entry light must sit flush on the hall-facing doorframe (localLightZ=${localLightZ})`
      );

      // Vector from camera toward this room's entry light
      const toRoomX = coords.entryLightX - camX;
      const toRoomZ = coords.entryLightZ - camZ;

      const lookingToward = computeRoomEntryLightState({
        slotIndex: slotIdx,
        floorNumber: 0,
        status: 'active',
        playerX,
        playerZ,
        cameraX: camX,
        cameraZ: camZ,
        cameraForwardX: toRoomX,
        cameraForwardZ: toRoomZ,
      });

      const lookingAway = computeRoomEntryLightState({
        slotIndex: slotIdx,
        floorNumber: 0,
        status: 'active',
        playerX,
        playerZ,
        cameraX: camX,
        cameraZ: camZ,
        cameraForwardX: -toRoomX,
        cameraForwardZ: -toRoomZ,
      });

      assert.ok(
        lookingToward.lookAlignment > 0.95,
        `Rotating camera toward Room ${slotIdx} must yield high lookAlignment (${lookingToward.lookAlignment})`
      );
      assert.equal(
        lookingAway.lookAlignment,
        0,
        `Rotating camera away from Room ${slotIdx} must yield 0 lookAlignment`
      );
      assert.ok(
        lookingToward.sconceEmissiveIntensity > lookingAway.sconceEmissiveIntensity + 0.35,
        `Room ${slotIdx} entry sconces must visibly brighten when camera turns toward room (${lookingToward.sconceEmissiveIntensity} vs ${lookingAway.sconceEmissiveIntensity})`
      );
      assert.ok(
        lookingToward.pointLightIntensity > lookingAway.pointLightIntensity + 0.5,
        `Room ${slotIdx} doorway PointLight must brighten when camera turns toward room`
      );

      // Verify approaching the doorway also increases proximity glow smoothly
      const nearDoor = computeRoomEntryLightState({
        slotIndex: slotIdx,
        floorNumber: 0,
        status: 'active',
        playerX: coords.doorX,
        playerZ: coords.doorZ,
        cameraX: camX,
        cameraZ: camZ,
        cameraForwardX: toRoomX,
        cameraForwardZ: toRoomZ,
      });
      assert.ok(
        nearDoor.proximityFactor > 0.95,
        `Approaching Room ${slotIdx} doorway must raise proximityFactor (${nearDoor.proximityFactor})`
      );
      assert.ok(
        nearDoor.sconceEmissiveIntensity >= lookingToward.sconceEmissiveIntensity,
        `Approaching Room ${slotIdx} doorway must maintain or increase entry light glow`
      );
    }

    console.log('✓ 11. Room entry lights camera-rotation visibility & proximity highlighting verified across all 3 rooms');
  }

  // 12. Automatic Room Entry When Walking Through Doorways (All 4 Slots, All Floors, Walk-Past, Latch, Exit & Re-Entry)
  {
    const allActiveSlots: Record<number, RoomPortalStatus> = {
      0: 'active',
      1: 'active',
      2: 'active',
      3: 'active',
    };

    for (let floorNum = 0; floorNum < 3; floorNum++) {
      for (const slotIdx of [0, 1, 2, 3] as const) {
        const slot = SLOT_CONFIGS[slotIdx];
        const sin = Math.sin(slot.rotY);
        const cos = Math.cos(slot.rotY);
        const tangentX = cos;
        const tangentZ = -sin;

        // A. Walking past a doorway in the corridor without entering must NOT trigger room entry
        const walkPastStart = localToWorldXZ(slot.x, slot.z, slot.rotY, -1.8, 0.72);
        const walkPastEnd = localToWorldXZ(slot.x, slot.z, slot.rotY, 1.8, 0.72);
        const walkPastRes = evaluateRoomDoorwayTransitions({
          prevX: walkPastStart.x,
          prevZ: walkPastStart.z,
          currX: walkPastEnd.x,
          currZ: walkPastEnd.z,
          floorNumber: floorNum,
          slotStatuses: allActiveSlots,
          currentLatch: null,
        });
        assert.equal(
          walkPastRes.triggeredSlotIndex,
          null,
          `Walking past Slot ${slotIdx} on Floor ${floorNum} in corridor must not trigger room entry`
        );

        // B. Rotating the camera while standing near a doorway (zero positional movement) must NOT trigger room entry
        const standNearDoor = localToWorldXZ(slot.x, slot.z, slot.rotY, 0, 0.12);
        const rotateOnlyRes = evaluateRoomDoorwayTransitions({
          prevX: standNearDoor.x,
          prevZ: standNearDoor.z,
          currX: standNearDoor.x,
          currZ: standNearDoor.z,
          floorNumber: floorNum,
          slotStatuses: allActiveSlots,
          currentLatch: null,
        });
        assert.equal(
          rotateOnlyRes.triggeredSlotIndex,
          null,
          `Rotating camera near Slot ${slotIdx} doorway without walking inward must not trigger entry`
        );

        // C. Walking from corridor through the open doorway into the active room triggers entry immediately
        let charPos = localToWorldXZ(slot.x, slot.z, slot.rotY, 0, 0.85);
        let latch: DoorwayLatchState | null = null;
        let triggeredCount = 0;
        let triggeredSlot: 0 | 1 | 2 | 3 | null = null;

        for (let step = 0; step < 12; step++) {
          const nextMove = resolveCharacterMovement({
            startX: charPos.x,
            startY: floorNum * FLOOR_HEIGHT,
            startZ: charPos.z,
            velX: -sin * 4.5,
            velZ: -cos * 4.5,
            delta: 0.04,
            totalFloors: 3,
            slotStatuses: allActiveSlots,
          });
          const transition = evaluateRoomDoorwayTransitions({
            prevX: charPos.x,
            prevZ: charPos.z,
            currX: nextMove.x,
            currZ: nextMove.z,
            floorNumber: floorNum,
            slotStatuses: allActiveSlots,
            currentLatch: latch,
          });
          charPos = { x: nextMove.x, z: nextMove.z };
          latch = transition.nextLatch;
          if (transition.triggeredSlotIndex !== null) {
            triggeredCount++;
            triggeredSlot = transition.triggeredSlotIndex;
          }
        }

        assert.equal(
          triggeredSlot,
          slotIdx,
          `Walking into active Slot ${slotIdx} on Floor ${floorNum} must automatically trigger room entry`
        );
        assert.equal(
          triggeredCount,
          1,
          `Room entry for Slot ${slotIdx} on Floor ${floorNum} must trigger exactly once and not retrigger while inside`
        );
        assert.ok(
          latch !== null && latch.slotIndex === slotIdx && latch.floorNumber === floorNum,
          `Latch must remain active while character stands inside Slot ${slotIdx} doorway/alcove`
        );

        // D. Standing or shifting slightly inside the room alcove must NOT repeatedly retrigger entry
        const jitterInside = localToWorldXZ(slot.x, slot.z, slot.rotY, 0.15, -0.35);
        const insideRes = evaluateRoomDoorwayTransitions({
          prevX: charPos.x,
          prevZ: charPos.z,
          currX: jitterInside.x,
          currZ: jitterInside.z,
          floorNumber: floorNum,
          slotStatuses: allActiveSlots,
          currentLatch: latch,
        });
        assert.equal(
          insideRes.triggeredSlotIndex,
          null,
          `Standing or shifting inside Slot ${slotIdx} must not retrigger room entry`
        );
        latch = insideRes.nextLatch;

        // E. Leaving the room (walking out or returning to museum at corridor exit pose) resets latch and allows clean re-entry
        const exitPose = getRoomExitCorridorPosition(slotIdx, floorNum);
        const exitLocal = worldToPortalLocalXZ(slotIdx, exitPose.x, exitPose.z);
        assert.ok(
          exitLocal.lz >= 0.75,
          `Corridor exit position for Slot ${slotIdx} must be cleanly outside doorway threshold (lz=${exitLocal.lz})`
        );

        const afterExitRes = evaluateRoomDoorwayTransitions({
          prevX: jitterInside.x,
          prevZ: jitterInside.z,
          currX: exitPose.x,
          currZ: exitPose.z,
          floorNumber: floorNum,
          slotStatuses: allActiveSlots,
          currentLatch: latch,
        });
        assert.equal(
          afterExitRes.nextLatch,
          null,
          `Stepping out of Slot ${slotIdx} into the corridor must clear the doorway latch`
        );

        // Walk back in to verify clean re-entry
        const reEnterTarget = localToWorldXZ(slot.x, slot.z, slot.rotY, 0, -0.15);
        const reEnterRes = evaluateRoomDoorwayTransitions({
          prevX: exitPose.x,
          prevZ: exitPose.z,
          currX: reEnterTarget.x,
          currZ: reEnterTarget.z,
          floorNumber: floorNum,
          slotStatuses: allActiveSlots,
          currentLatch: afterExitRes.nextLatch,
        });
        assert.equal(
          reEnterRes.triggeredSlotIndex,
          slotIdx,
          `Re-entering Slot ${slotIdx} on Floor ${floorNum} after leaving must trigger room entry again`
        );

        // F. Disabled or empty slots must NEVER trigger automatic room entry
        const nonActiveStatuses: Record<number, RoomPortalStatus> = {
          0: 'disabled',
          1: 'empty',
          2: 'disabled',
          3: 'empty',
        };
        const disabledAttempt = evaluateRoomDoorwayTransitions({
          prevX: exitPose.x,
          prevZ: exitPose.z,
          currX: reEnterTarget.x,
          currZ: reEnterTarget.z,
          floorNumber: floorNum,
          slotStatuses: nonActiveStatuses,
          currentLatch: null,
        });
        assert.equal(
          disabledAttempt.triggeredSlotIndex,
          null,
          `Disabled/empty Slot ${slotIdx} must never trigger automatic room entry`
        );

        // G. Attempting to trigger from outside/behind solid walls (lz < -0.95 or |lx| > 1.25) must never trigger
        const outsideSideWall = localToWorldXZ(
          slot.x + tangentX * 2.2,
          slot.z + tangentZ * 2.2,
          slot.rotY,
          0,
          -0.1,
        );
        const sideWallAttempt = evaluateRoomDoorwayTransitions({
          prevX: outsideSideWall.x + sin * 0.5,
          prevZ: outsideSideWall.z + cos * 0.5,
          currX: outsideSideWall.x,
          currZ: outsideSideWall.z,
          floorNumber: floorNum,
          slotStatuses: allActiveSlots,
          currentLatch: null,
        });
        assert.equal(
          sideWallAttempt.triggeredSlotIndex,
          null,
          `Movement beside solid wall outside Slot ${slotIdx} doorway width must never trigger room entry`
        );
      }
    }

    console.log('✓ 12. Automatic room entry, walk-past non-trigger, latch stability & re-entry verified across all 4 slots and all floors');
  }

  // 13. Walkable 3D Memory Exhibition Rooms: All 8 Display Styles, Authentic Timeline Dates, Interior Collision & Single-Memory Proximity
  {
    assert.equal(
      EXHIBITION_DISPLAY_STYLE_OPTIONS.length,
      8,
      'Must support all 8 reusable 3D museum exhibition display styles'
    );

    // Verify all 9 default rooms have a valid exhibitionStyle assigned
    for (const room of INITIAL_ROOMS) {
      assert.ok(
        room.exhibitionStyle &&
          EXHIBITION_DISPLAY_STYLE_OPTIONS.some((o) => o.id === room.exhibitionStyle),
        `Room ${room.id} must have a valid default exhibitionStyle (${room.exhibitionStyle})`
      );
    }

    // Verify computeExhibitionPlacements and interior colliders across all 8 display styles
    const sampleRoom = INITIAL_ROOMS[0];
    const sampleMemories: Memory[] = INITIAL_MEMORIES.slice(0, 6);
    for (const styleOpt of EXHIBITION_DISPLAY_STYLE_OPTIONS) {
      const placements = computeExhibitionPlacements(
        sampleRoom,
        sampleMemories,
        styleOpt.id,
      );
      assert.equal(
        placements.length,
        sampleMemories.length,
        `Style ${styleOpt.id} must place every memory in the room`
      );

      for (const p of placements) {
        assert.ok(
          Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            Number.isFinite(p.z) &&
            Number.isFinite(p.rotY) &&
            Number.isFinite(p.interactionX) &&
            Number.isFinite(p.interactionZ),
          `Style ${styleOpt.id} placement for ${p.memory.id} must have finite 3D & interaction coordinates`
        );
        assert.ok(
          Math.abs(p.x) <= ROOM_INTERIOR_SPEC.halfWidth &&
            Math.abs(p.z) <= ROOM_INTERIOR_SPEC.halfDepth &&
            p.y >= 0.5 &&
            p.y <= ROOM_INTERIOR_SPEC.height - 0.4,
          `Style ${styleOpt.id} placement (${p.x}, ${p.y}, ${p.z}) must stay inside room architectural boundaries`
        );

        // Approaching the memory's designated floor interaction zone facing the exhibit must select ONLY that single memory
        const faceExhibitYaw = p.rotY + Math.PI;
        const prox = evaluateRoomMemoryProximity({
          placements,
          playerX: p.interactionX,
          playerZ: p.interactionZ,
          cameraForwardX: Math.sin(faceExhibitYaw),
          cameraForwardZ: Math.cos(faceExhibitYaw),
        });
        assert.equal(
          prox.activePlacement?.memory.id,
          p.memory.id,
          `Standing in interaction zone of ${p.memory.id} in ${styleOpt.id} must select that exact memory`
        );
        assert.ok(
          prox.highlightStrength > 0.2,
          `Selected memory ${p.memory.id} in ${styleOpt.id} must receive a positive highlight strength (${prox.highlightStrength})`
        );

        // Approaching from behind the wall/mount (opposite side of exhibit normal) must NEVER select the memory through a solid wall
        const normalX = Math.sin(p.rotY);
        const normalZ = Math.cos(p.rotY);
        const behindWallX = p.x - normalX * 1.1;
        const behindWallZ = p.z - normalZ * 1.1;
        const behindProx = evaluateRoomMemoryProximity({
          placements: [p],
          playerX: behindWallX,
          playerZ: behindWallZ,
          cameraForwardX: Math.sin(p.rotY),
          cameraForwardZ: Math.cos(p.rotY),
        });
        assert.equal(
          behindProx.activePlacement,
          null,
          `Memory ${p.memory.id} in ${styleOpt.id} must never be selectable from behind its mounting wall`
        );
      }

      // Verify room interior perimeter wall & furniture collision safety for this style
      const westWallAttempt = resolveRoomInteriorMovement({
        room: sampleRoom,
        memories: sampleMemories,
        styleOverride: styleOpt.id,
        startX: -5.8,
        startY: 0,
        startZ: 0,
        velX: -80,
        velZ: 0,
        delta: 0.05,
      });
      assert.ok(
        westWallAttempt.x >= -ROOM_INTERIOR_SPEC.halfWidth + CHARACTER_COLLIDER_RADIUS - 0.05,
        `Character must not pass through West interior room wall in style ${styleOpt.id} (x=${westWallAttempt.x})`
      );

      const northWallAttempt = resolveRoomInteriorMovement({
        room: sampleRoom,
        memories: sampleMemories,
        styleOverride: styleOpt.id,
        startX: 0,
        startY: 0,
        startZ: -5.8,
        velX: 0,
        velZ: -80,
        delta: 0.05,
      });
      assert.ok(
        northWallAttempt.z >= -ROOM_INTERIOR_SPEC.halfDepth + CHARACTER_COLLIDER_RADIUS - 0.05,
        `Character must not pass through North interior room wall in style ${styleOpt.id} (z=${northWallAttempt.z})`
      );
    }

    // Verify Floating Island central plinth collision prevents walking through the island core while allowing 360° walking around it
    const islandColliders = buildRoomInteriorColliders(
      sampleRoom,
      'floating_island',
      sampleMemories,
    );
    const islandCenterPush = resolveSingleStepPosition(0.05, -1.05, islandColliders);
    assert.ok(
      Math.hypot(islandCenterPush.x, islandCenterPush.z - -1.1) > 1.8,
      `Central Floating Island collider must keep character outside the sculptural island core (r=${Math.hypot(islandCenterPush.x, islandCenterPush.z - -1.1)})`
    );

    // Verify authentic timeline date handling (never invents missing dates)
    const undatedMem: Memory = {
      ...sampleMemories[0],
      id: 'mem-undated-test',
      date: '',
      year: 0,
    };
    const undatedLabel = getAuthenticMemoryDateLabel(undatedMem);
    assert.equal(
      undatedLabel.isUndated,
      true,
      'Missing memory dates must be flagged as undated rather than inventing a fake date'
    );
    assert.equal(
      undatedLabel.label,
      null,
      'Missing memory dates must have null date label so no fake date is invented'
    );

    // Verify South Exit Archway transition back to the Museum Atrium
    const exitWalk = resolveRoomInteriorMovement({
      room: sampleRoom,
      memories: sampleMemories,
      styleOverride: 'classic_wall_gallery',
      startX: 0,
      startY: 0,
      startZ: 5.5,
      velX: 0,
      velZ: 28.0,
      delta: 0.05,
    });
    assert.equal(
      exitWalk.exitedRoom,
      true,
      'Walking south through the room exit archway (|x| <= 1.38, z >= 6.45) must trigger return to the Atrium'
    );
    assert.equal(
      evaluateRoomInteriorExitDoorway({
        prevX: 3.2,
        prevZ: 5.5,
        currX: 3.2,
        currZ: 6.6,
      }),
      false,
      'Walking against the solid South wall outside the archway opening must not trigger room exit'
    );

    console.log('✓ 13. Walkable 3D Memory Exhibition Rooms (8 styles, authentic dates, interior collisions & single-memory proximity) verified');
  }

  // 14. Smooth Room-Entrance Animation (0.5–1.2s duration, warm entrance glow, gradual interior & display reveal)
  {
    assert.ok(
      ROOM_ENTRANCE_TRANSITION_SPEC.durationSec >= 0.5 &&
        ROOM_ENTRANCE_TRANSITION_SPEC.durationSec <= 1.2,
      `Room entrance animation duration (${ROOM_ENTRANCE_TRANSITION_SPEC.durationSec}s) must be within 0.5–1.2s`
    );

    const startState = computeRoomEntranceAnimationState({
      elapsedSec: 0,
      durationSec: ROOM_ENTRANCE_TRANSITION_SPEC.durationSec,
      reducedMotion: false,
    });
    assert.equal(startState.isComplete, false, 'Entrance animation must not be complete at t=0');
    assert.ok(
      startState.interiorLightFactor > 0.3 && startState.interiorLightFactor < 0.7,
      `Initial interior lighting should start at a natural warm level without black flash (${startState.interiorLightFactor})`
    );

    const midState = computeRoomEntranceAnimationState({
      elapsedSec: ROOM_ENTRANCE_TRANSITION_SPEC.durationSec * 0.45,
      durationSec: ROOM_ENTRANCE_TRANSITION_SPEC.durationSec,
      reducedMotion: false,
    });
    assert.ok(
      midState.entranceGlowMultiplier > startState.entranceGlowMultiplier &&
        midState.entranceGlowMultiplier > 1.25,
      `Entrance doorway lighting must swell with a warm glow during room entry (mid=${midState.entranceGlowMultiplier})`
    );
    assert.ok(
      midState.interiorLightFactor > startState.interiorLightFactor,
      'Interior lighting must gradually brighten as the character enters the room'
    );
    assert.ok(
      midState.displayRevealFactor > startState.displayRevealFactor,
      'Memory displays must smoothly illuminate as the room reveals'
    );

    const endState = computeRoomEntranceAnimationState({
      elapsedSec: ROOM_ENTRANCE_TRANSITION_SPEC.durationSec,
      durationSec: ROOM_ENTRANCE_TRANSITION_SPEC.durationSec,
      reducedMotion: false,
    });
    assert.equal(endState.isComplete, true, 'Entrance animation must complete at durationSec');
    assert.equal(endState.interiorLightFactor, 1, 'Interior lighting must reach 1.0 on completion');
    assert.equal(endState.displayRevealFactor, 1, 'Display illumination must reach 1.0 on completion');
    assert.equal(endState.cameraSpringArmBlend, 1, 'Camera settle factor must reach 1.0 on completion');

    const reducedMotionState = computeRoomEntranceAnimationState({
      elapsedSec: 0.05,
      durationSec: ROOM_ENTRANCE_TRANSITION_SPEC.durationSec,
      reducedMotion: true,
    });
    assert.equal(
      reducedMotionState.isComplete,
      true,
      'Reduced motion must complete the entrance transition immediately without prolonged animation'
    );
    assert.equal(reducedMotionState.interiorLightFactor, 1);

    console.log('✓ 14. Smooth Room-Entrance Animation (0.5–1.2s duration, entrance glow & interior reveal) verified');
  }

  // 15. Optional Spotify Playlist Integration (Silent by Default, Explicit Play, Continuous Across Rooms, Stop Control)
  {
    assert.equal(
      DEFAULT_SPOTIFY_PLAYLIST_CONFIG.url,
      'https://open.spotify.com/playlist/37i9dQZF1DWZPrKPHbO4OG',
      'Default Spotify playlist URL must match https://open.spotify.com/playlist/37i9dQZF1DWZPrKPHbO4OG'
    );
    assert.equal(
      DEFAULT_SPOTIFY_PLAYLIST_CONFIG.uri,
      'spotify:playlist:37i9dQZF1DWZPrKPHbO4OG',
      'Default Spotify playlist URI must match spotify:playlist:37i9dQZF1DWZPrKPHbO4OG'
    );
    assert.equal(
      INITIAL_AUDIO_SETTINGS.globalSourceId,
      DEFAULT_SPOTIFY_PLAYLIST_CONFIG.id,
      'Default global music source must be the configured Spotify playlist'
    );
    assert.ok(
      BUILTIN_MUSIC_SOURCES.some(
        (s) =>
          s.id === DEFAULT_SPOTIFY_PLAYLIST_CONFIG.id &&
          s.provider === 'spotify' &&
          s.externalServiceUrl === 'https://open.spotify.com/playlist/37i9dQZF1DWZPrKPHbO4OG'
      ),
      'BUILTIN_MUSIC_SOURCES must include the default Spotify playlist source'
    );

    // Verify all initial rooms have autoplayOnEntry disabled
    for (const room of INITIAL_ROOMS) {
      assert.equal(
        room.audioSettings?.autoplayOnEntry ?? false,
        false,
        `Room ${room.id} must not autoplay music on entry`
      );
    }

    // Verify audio engine starts silent/stopped on launch
    museumAudioEngine.stop();
    museumAudioEngine.syncState(INITIAL_AUDIO_SETTINGS, null, []);
    const initialSnap = museumAudioEngine.getSnapshot();
    assert.equal(
      initialSnap.isPlaying,
      false,
      'Music must be disabled/silent by default when the website loads'
    );
    assert.equal(
      initialSnap.playbackState,
      'stopped',
      'Initial playbackState must be stopped'
    );

    // Verify entering a room does NOT automatically start music
    museumAudioEngine.syncState(INITIAL_AUDIO_SETTINGS, INITIAL_ROOMS[0], []);
    const afterRoomEntrySnap = museumAudioEngine.getSnapshot();
    assert.equal(
      afterRoomEntrySnap.isPlaying,
      false,
      'Music must NOT autoplay when entering a room'
    );
    assert.equal(afterRoomEntrySnap.playbackState, 'stopped');

    // Verify music starts ONLY when visitor explicitly clicks Play
    museumAudioEngine.togglePlay();
    const playingSnap = museumAudioEngine.getSnapshot();
    assert.equal(
      playingSnap.isPlaying,
      true,
      'Music must start when visitor explicitly triggers Play'
    );
    assert.equal(playingSnap.playbackState, 'playing');
    assert.equal(
      playingSnap.activeSource?.id,
      DEFAULT_SPOTIFY_PLAYLIST_CONFIG.id,
      'Active source must be the default Spotify playlist'
    );

    // Verify music continues smoothly across room and floor transitions without stopping or restarting
    museumAudioEngine.syncState(INITIAL_AUDIO_SETTINGS, INITIAL_ROOMS[1], []);
    const acrossRoomSnap = museumAudioEngine.getSnapshot();
    assert.equal(
      acrossRoomSnap.isPlaying,
      true,
      'Music must continue across room transitions once started by the visitor'
    );
    assert.equal(acrossRoomSnap.playbackState, 'playing');

    // Verify Pause & Stop controls
    museumAudioEngine.togglePlay();
    assert.equal(museumAudioEngine.getSnapshot().playbackState, 'paused');
    museumAudioEngine.stop();
    const stoppedSnap = museumAudioEngine.getSnapshot();
    assert.equal(stoppedSnap.isPlaying, false);
    assert.equal(stoppedSnap.playbackState, 'stopped');
    assert.equal(stoppedSnap.elapsedSeconds, 0);

    console.log('✓ 15. Optional Spotify Playlist Integration (silent on launch/room entry, explicit Play, continuous across rooms, Stop) verified');
  }

  // 16. Automatic Elevator Door Behaviour, Dynamic Sliding Colliders & Proximity Zones
  {
    // A. Proximity zone helpers
    // Inside cabin
    assert.equal(isCharacterInElevatorCabin(0, -9.8), true, 'Position (0, -9.8) must be inside cabin');
    assert.equal(isCharacterInElevatorCabin(1.2, -9.8), true, 'Position (1.2, -9.8) must be inside cabin');
    assert.equal(isCharacterInElevatorCabin(2.5, -9.8), false, 'Position (2.5, -9.8) outside cabin walls');
    assert.equal(isCharacterInElevatorCabin(0, -7.0), false, 'Position in corridor is not inside cabin');

    // In doorway
    assert.equal(isCharacterInElevatorDoorway(0, -8.6), true, 'Threshold (0, -8.6) must be doorway');
    assert.equal(isCharacterInElevatorDoorway(0, -7.8), true, 'Just in front of doors is doorway');
    assert.equal(isCharacterInElevatorDoorway(0, -6.0), false, 'Approach corridor is not doorway');

    // In approach zone
    assert.equal(isCharacterInElevatorApproachZone(0, -6.5), true, 'Approach (0, -6.5) must be approach zone');
    assert.equal(isCharacterInElevatorApproachZone(0, -4.5), false, 'Far corridor is not approach zone');

    // Union proximity
    assert.equal(isCharacterInElevatorProximity(0, -6.5), true, 'Approach zone has proximity active');
    assert.equal(isCharacterInElevatorProximity(0, -8.6), true, 'Doorway has proximity active');
    assert.equal(isCharacterInElevatorProximity(0, -9.8), true, 'Cabin has proximity active');
    assert.equal(isCharacterInElevatorProximity(0, -4.0), false, 'Outside corridor has proximity inactive');

    // B. Dynamic door colliders at various doorOpenAmount values
    // When doorOpenAmount = 0 (closed)
    const closedColliders = buildFloorColliders({
      floorNumber: 0,
      slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      isLiftDoorOpen: false,
      doorOpenAmount: 0,
    });
    const closedLandingDoors = closedColliders.obbs.filter((c) => c.id === 'lift_landing_doors_closed');
    assert.equal(closedLandingDoors.length, 1, 'Closed elevator must have lift_landing_doors_closed collider');

    // Closed door blocks entry: walking from (0, -7.5) northward into lift at (0, -8.6)
    const closedMove = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: -7.5,
      velX: 0,
      velZ: -5.0,
      delta: 0.5,
      totalFloors: 1,
      slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      isLiftDoorOpen: false,
      doorOpenAmount: 0,
    });
    assert.ok(closedMove.z > -8.4, `Closed doors must block movement into shaft (z=${closedMove.z})`);

    // When doorOpenAmount = 1.0 (fully open)
    const openColliders = buildFloorColliders({
      floorNumber: 0,
      slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      isLiftDoorOpen: true,
      doorOpenAmount: 1.0,
    });
    const doorPanelColliders = openColliders.obbs.filter((c) => c.id.startsWith('lift_door_panel'));
    const closedBarriers = openColliders.obbs.filter((c) => c.id === 'lift_landing_doors_closed');
    assert.equal(closedBarriers.length, 0, 'Open elevator must NOT have closed door barrier');
    assert.equal(doorPanelColliders.length, 0, 'Fully open doors (>0.95) leave doorway completely clear of colliders');

    // Unrestricted entry through open doorway: character walks from corridor (0, -7.5) straight into cabin (0, -10.0)
    let curX = 0;
    let curZ = -7.5;
    for (let step = 0; step < 20; step++) {
      const stepRes = resolveCharacterMovement({
        startX: curX,
        startY: 0,
        startZ: curZ,
        velX: 0,
        velZ: -5.0,
        delta: 0.03,
        totalFloors: 1,
        slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
        isLiftDoorOpen: true,
        doorOpenAmount: 1.0,
      });
      curX = stepRes.x;
      curZ = stepRes.z;
    }
    assert.ok(curZ <= -9.5, `Character must freely walk inside cabin when doors are open (final z=${curZ})`);
    assert.equal(isCharacterInElevatorCabin(curX, curZ), true, 'Character reached cabin interior');

    // Unrestricted exit from cabin: character walks from inside (0, -9.8) forward into corridor (0, -7.0)
    curX = 0;
    curZ = -9.8;
    for (let step = 0; step < 25; step++) {
      const stepRes = resolveCharacterMovement({
        startX: curX,
        startY: 0,
        startZ: curZ,
        velX: 0,
        velZ: 5.0,
        delta: 0.03,
        totalFloors: 1,
        slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
        isLiftDoorOpen: true,
        doorOpenAmount: 1.0,
      });
      curX = stepRes.x;
      curZ = stepRes.z;
    }
    assert.ok(curZ >= -7.0, `Character must freely walk out of cabin into corridor (final z=${curZ})`);
    assert.equal(isCharacterInElevatorCabin(curX, curZ), false, 'Character successfully walked out into corridor');

    // Solid cabin walls: walking left or right inside cabin hits side walls, not falling out
    const leftWallMove = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: -10.0,
      velX: -6.0,
      velZ: 0,
      delta: 0.5,
      totalFloors: 1,
      slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      isLiftDoorOpen: true,
      doorOpenAmount: 1.0,
    });
    assert.ok(leftWallMove.x > -1.25, `West cabin wall must contain player (x=${leftWallMove.x})`);

    const rightWallMove = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: -10.0,
      velX: 6.0,
      velZ: 0,
      delta: 0.5,
      totalFloors: 1,
      slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      isLiftDoorOpen: true,
      doorOpenAmount: 1.0,
    });
    assert.ok(rightWallMove.x < 1.25, `East cabin wall must contain player (x=${rightWallMove.x})`);

    const backWallMove = resolveCharacterMovement({
      startX: 0,
      startY: 0,
      startZ: -10.0,
      velX: 0,
      velZ: -6.0,
      delta: 0.5,
      totalFloors: 1,
      slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      isLiftDoorOpen: true,
      doorOpenAmount: 1.0,
    });
    assert.ok(backWallMove.z > -10.85, `Back cabin wall must contain player (z=${backWallMove.z})`);

    console.log('✓ 16. Automatic Elevator Door Behaviour, Dynamic Sliding Colliders & Proximity Zones verified');
  }

  // 17. Gemini Semantic Room Category Detection, Category-Authentic 3D Experience & Memory Content Data Visual Representation
  {
    // A. Semantic detection from room name / category input
    const childhoodDetection = detectRoomCategoryFromInput('Childhood Room');
    assert.equal(
      childhoodDetection.categoryKey,
      'childhood',
      'Room named "Childhood Room" must automatically detect as "childhood" category'
    );
    assert.ok(
      childhoodDetection.profile.interactive3DInstallations.length >= 3,
      'Childhood room profile must include at least 3 interactive 3D installation features'
    );
    assert.ok(
      childhoodDetection.profile.starterMemories.length >= 3,
      'Childhood room profile must include curated starter memory templates'
    );

    const travelsDetection = detectRoomCategoryFromInput('Summer Voyages & Horizons');
    assert.equal(
      travelsDetection.categoryKey,
      'travels',
      'Room named "Summer Voyages & Horizons" must detect as "travels" category'
    );

    const familyDetection = detectRoomCategoryFromInput('Grandparents Heritage Sanctuary');
    assert.equal(
      familyDetection.categoryKey,
      'family',
      'Room named "Grandparents Heritage Sanctuary" must detect as "family" category'
    );

    const musicDetection = detectRoomCategoryFromInput('Midnight Vinyl & Sonic Lounge');
    assert.equal(
      musicDetection.categoryKey,
      'music_sound',
      'Room named "Midnight Vinyl & Sonic Lounge" must detect as "music_sound" category'
    );

    // B. Synthesized RoomDesignConfig & Starter Memory Instantiation
    const synthesizedChildhoodConfig = buildSynthesizedRoomDesignConfig({
      roomName: 'My Childhood Room',
      promptOrNotes: 'Early Wonder & Backyard Treehouse',
    });
    assert.equal(synthesizedChildhoodConfig.detectedCategory, 'childhood');
    assert.ok(synthesizedChildhoodConfig.visualDataSummary);
    assert.ok(synthesizedChildhoodConfig.visualDataSummary.totalExhibits >= 3);
    assert.ok(synthesizedChildhoodConfig.visualDataSummary.eraTimelineDistribution.length > 0);
    assert.ok(synthesizedChildhoodConfig.visualDataSummary.mediaBreakdown.length > 0);
    assert.ok(synthesizedChildhoodConfig.visualDataSummary.emotionAndThemeMetrics.length > 0);

    const starterMemories = instantiateStarterMemoriesForRoom(
      'room-childhood-test',
      synthesizedChildhoodConfig.suggestedStarterMemories ||
        ROOM_CATEGORY_EXPERIENCE_PROFILES.childhood.starterMemories,
    );
    assert.equal(
      starterMemories.length,
      ROOM_CATEGORY_EXPERIENCE_PROFILES.childhood.starterMemories.length,
      'Instantiating starter memories for Childhood Room must create real Memory records'
    );
    for (const mem of starterMemories) {
      assert.equal(mem.roomId, 'room-childhood-test');
      assert.ok(mem.title.length > 0 && mem.story.length > 0);
      assert.ok(mem.motif, 'Starter memory must have a valid 3D motif');
    }

    // C. Memory Content & Data Visual Representation computation on real room memories
    const visualSummary = computeRoomMemoryVisualData(
      'childhood',
      'My Childhood Room',
      starterMemories,
    );
    assert.equal(visualSummary.totalExhibits, starterMemories.length);
    assert.ok(
      visualSummary.earliestYear !== null && visualSummary.latestYear !== null,
      `Visual data summary must compute valid chronological years (${visualSummary.earliestYear}–${visualSummary.latestYear})`
    );
    const totalPct = visualSummary.mediaBreakdown.reduce((acc, m) => acc + m.percentage, 0);
    assert.ok(totalPct >= 98 && totalPct <= 102, `Media breakdown percentages must sum to ~100% (${totalPct}%)`);

    // D. Gemini Dual Blueprint Generation (Output A: 3D Environment Blueprint + Output B: Memory Exhibition Blueprint)
    const blueprint = generateImmersiveRoomBlueprint({
      roomName: 'My Childhood',
      categoryKey: 'childhood',
      description: 'Memories from my childhood and school days',
      memories: starterMemories,
    });
    assert.equal(blueprint.room.categoryKey, 'childhood');
    assert.ok(blueprint.environment.furniture.length >= 4, 'Childhood 3D Environment Blueprint must define study table, bookshelves, cosy daybed, and vintage TV');
    assert.ok(blueprint.environment.zones.length >= 3, 'Childhood 3D Environment Blueprint must define exploration zones');
    assert.equal(
      blueprint.exhibits.length,
      starterMemories.length,
      'Memory Exhibition Blueprint must generate an exhibit for every real memory'
    );

    // E. Blueprint Validation: Reject any hallucinated/invented memoryId while preserving real memory exhibits
    const validatedWithHallucinatedId = validateAndNormalizeRoomBlueprint(
      {
        room: blueprint.room,
        environment: blueprint.environment,
        exhibits: [
          ...blueprint.exhibits,
          {
            memoryId: 'fake_invented_memory_999',
            type: 'framed-photo',
            title: 'Fake Memory',
            position: { x: 0, y: 2, z: -3 },
            rotationY: 0,
            dimensions: { width: 1.5, height: 1.2, depth: 0.1 },
            associated3DObject: 'Fake Frame',
            interaction: 'open-memory',
            availableMetadata: {},
            storytellingContext: 'Should be rejected',
          },
        ],
      },
      {
        roomName: 'My Childhood',
        categoryKey: 'childhood',
        memories: starterMemories,
      },
    );
    assert.equal(
      validatedWithHallucinatedId.exhibits.some(
        (ex) => ex.memoryId === 'fake_invented_memory_999',
      ),
      false,
      'Validator must strictly reject any invented memoryId not present in the user memory archive'
    );
    assert.equal(
      validatedWithHallucinatedId.exhibits.length,
      starterMemories.length,
      'Validator must retain all real memory IDs'
    );

    console.log('✓ 17. Gemini Semantic Room Category Detection, Output A (3D Environment Blueprint), Output B (Memory Exhibition Blueprint) & Memory Content Data Visual Representation verified');
  }

  // ============================================================================
  // 18. 3D Asset Manifest, GLB Loader Fallback/Cloning & GSAP Animation Utilities
  // ============================================================================
  {
    const manifestEntries = Object.values(MUSEUM_ASSET_MANIFEST);
    assert.ok(manifestEntries.length >= 7, 'Manifest must include entries across all 7 asset categories');
    for (const entry of manifestEntries) {
      const check = validateAssetManifestEntry(entry);
      assert.equal(check.valid, true, `Manifest entry ${entry.id} must be valid: ${check.errors.join(', ')}`);
    }

    assert.ok(getAssetManifestEntry('nature_olive_memory_tree_01'), 'Must retrieve central tree manifest entry by ID');
    assert.ok(getAssetsByCategory('furniture').length >= 1, 'Must filter manifest by furniture category');
    assert.ok(getAssetsForEnvironment('childhood_room').length >= 2, 'Must filter manifest for childhood_room');

    // Verify graceful fallback loading & scene cloning/disposal
    const loadRes = await loadMuseumAssetById('furn_walnut_gallery_bench_01', {
      fallbackFactory: () => {
        const g = new THREE.Group();
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(2, 0.5, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x493629 }),
        );
        g.add(mesh);
        return g;
      },
    });
    assert.equal(loadRes.status, 'fallback', 'Unbundled asset must gracefully resolve via procedural fallback without 404 crash');
    const cloned = cloneGLTFScene(loadRes.scene, { cloneMaterials: true });
    assert.ok(cloned.children.length === 1, 'Cloned scene must preserve child hierarchy');
    disposeObject3DResources(cloned);
    disposeObject3DResources(loadRes.scene, { forceDisposeSharedTemplates: true });

    // Verify GSAP 3D object rotation, entrance timeline, and camera transition cleanup
    const dummyObj = new THREE.Object3D();
    const rotHandle = animateObjectRotation3D(dummyObj, {
      deltaY: Math.PI,
      duration: 0.5,
      reducedMotion: true,
    });
    rotHandle.kill();

    const entHandle = animateObjectEntrance3D(dummyObj, {
      targetPosition: [1, 2, 3],
      reducedMotion: true,
    });
    assert.equal(dummyObj.position.y, 2, 'Reduced-motion entrance must snap directly to target position');
    entHandle.kill();

    const dummyCam = new THREE.PerspectiveCamera(50, 1.5, 0.1, 100);
    const lookTarget = new THREE.Vector3(0, 0, 0);
    const camHandle = createCameraTransitionTimeline(
      dummyCam,
      lookTarget,
      [{ position: [0, 3, 8], lookAt: [0, 1.5, 0], duration: 0.4 }],
      { reducedMotion: true },
    );
    assert.equal(dummyCam.position.z, 8, 'Camera transition timeline must reach target waypoint');
    camHandle.kill();

    console.log('✓ 18. 3D Asset Manifest, GLB Loader Fallback/Cloning & GSAP 3D Animation Utilities verified');
  }

  // ============================================================================
  // 19. Stage 00.5 Camera Collision Recovery, Responsive FOV, Transitions & 4-Slot Layout
  // ============================================================================
  {
    // A. Responsive FOV scaling across desktop, tablet, mobile, and invalid inputs
    assert.equal(computeResponsiveCameraFov(16 / 9), 50, 'Desktop widescreen aspect should preserve base 50 deg FOV');
    assert.equal(computeResponsiveCameraFov(1.15), 50, 'Aspect at threshold 1.15 should preserve base 50 deg FOV');
    const tabletFov = computeResponsiveCameraFov(3 / 4);
    assert.ok(tabletFov > 56 && tabletFov < 66, `Portrait tablet aspect 3:4 should widen FOV smoothly (got ${tabletFov})`);
    const mobileFov = computeResponsiveCameraFov(9 / 16);
    assert.ok(mobileFov >= 62 && mobileFov <= 66, `Mobile portrait aspect 9:16 should widen FOV cleanly (got ${mobileFov})`);
    assert.equal(computeResponsiveCameraFov(0), 50, 'Zero aspect must safely fall back to base FOV');
    assert.equal(computeResponsiveCameraFov(Number.NaN), 50, 'NaN aspect must safely fall back to base FOV');

    // B. 4-slot default collider generation & doorway availability
    const defaultFloor0Colliders = buildFloorColliders({ floorNumber: 0 });
    for (let slot = 0; slot < ROOMS_PER_FLOOR; slot++) {
      assert.equal(
        defaultFloor0Colliders.obbs.some((o) => o.id === `portal_block_${slot}`),
        false,
        `Default floor colliders must keep Slot ${slot} portal open when slotStatuses omitted`,
      );
      const exitPos = getRoomExitCorridorPosition(slot, 0);
      assert.ok(
        Number.isFinite(exitPos.x) && Number.isFinite(exitPos.z),
        `Slot ${slot} exit corridor position must be finite`,
      );
      assert.ok(
        Math.hypot(exitPos.x, exitPos.z) < ROTUNDA_WALL_RADIUS - CHARACTER_COLLIDER_RADIUS,
        `Slot ${slot} exit corridor must land inside Atrium perimeter`,
      );
    }

    // Verify doorway latch hysteresis prevents immediate re-trigger until stepping clear
    const slot0Cfg = SLOT_CONFIGS[0];
    const startInsideTriggerWorld = localToWorldXZ(slot0Cfg.x, slot0Cfg.z, slot0Cfg.rotY, 0, -0.2);
    const stepInsideTriggerWorld = localToWorldXZ(slot0Cfg.x, slot0Cfg.z, slot0Cfg.rotY, 0, -0.35);
    const latch: DoorwayLatchState = { floorNumber: 0, slotIndex: 0 };
    const whileLatched = evaluateRoomDoorwayTransitions({
      prevX: startInsideTriggerWorld.x,
      prevZ: startInsideTriggerWorld.z,
      currX: stepInsideTriggerWorld.x,
      currZ: stepInsideTriggerWorld.z,
      floorNumber: 0,
      slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      currentLatch: latch,
    });
    assert.equal(whileLatched.triggeredSlotIndex, null, 'Latched doorway must not double-trigger inside threshold');
    assert.deepEqual(whileLatched.nextLatch, latch, 'Latch must remain active inside doorway zone');

    const safeHallPos = getRoomExitCorridorPosition(0, 0);
    const afterStepBack = evaluateRoomDoorwayTransitions({
      prevX: stepInsideTriggerWorld.x,
      prevZ: stepInsideTriggerWorld.z,
      currX: safeHallPos.x,
      currZ: safeHallPos.z,
      floorNumber: 0,
      slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      currentLatch: whileLatched.nextLatch,
    });
    assert.equal(afterStepBack.triggeredSlotIndex, null, 'Stepping back into corridor must not trigger room entry');
    assert.equal(afterStepBack.nextLatch, null, 'Stepping back past exitThresholdLz must clear doorway latch');

    // C. Camera floor collider filtering (retains walls, columns, plinths, islands; filters low floor decor)
    const elevatedCamFloor0 = buildCameraFloorColliders(defaultFloor0Colliders, 1.85);
    assert.ok(
      elevatedCamFloor0.circles.some((c) => c.id === 'central_sculpture_plinth' && c.radius <= 0.96),
      'Elevated camera colliders must retain tightened central plinth trunk',
    );
    assert.ok(
      elevatedCamFloor0.circles.some((c) => c.id.startsWith('corner_col_')),
      'Elevated camera colliders must retain corner columns',
    );

    const floor1Colliders = buildFloorColliders({ floorNumber: 1 });
    const elevatedCamFloor1 = buildCameraFloorColliders(floor1Colliders, 1.85);
    assert.ok(
      elevatedCamFloor1.circles.some((c) => c.id === 'lightwell_balustrade'),
      'Upper floor camera colliders must keep lightwell balustrade',
    );

    const roomColliderSet = buildRoomInteriorColliders(INITIAL_ROOMS[0], 'floating_island', []);
    const elevatedRoomCamColliders = buildCameraFloorColliders(roomColliderSet, 1.85);
    assert.ok(
      elevatedRoomCamColliders.obbs.some((o) => o.id === 'room_north_wall') &&
        elevatedRoomCamColliders.obbs.some((o) => o.id === 'room_west_wall'),
      'Room camera colliders must retain room interior shell walls',
    );
    assert.ok(
      elevatedRoomCamColliders.circles.some((c) => c.id === 'room_central_floating_island' && c.radius <= 0.92),
      'Room camera colliders must retain central floating island obstacle',
    );

    const cinemaRoomColliderSet = buildRoomInteriorColliders(INITIAL_ROOMS[0], 'cinematic_video_gallery', []);
    const elevatedCinemaCamColliders = buildCameraFloorColliders(cinemaRoomColliderSet, 1.85);
    assert.equal(
      elevatedCinemaCamColliders.obbs.some(
        (o) => o.id === 'room_cinema_lounge_sofa' || o.id === 'room_reflection_bench',
      ),
      false,
      'Elevated camera colliders should ignore low seating furniture above 1.05m',
    );

    // D. Third-person camera collision containment in Atrium, Upper Floor, and Room Interior
    const southEdgeAtriumCam = resolveThirdPersonCameraPosition({
      pivotX: 0,
      pivotY: 1.65,
      pivotZ: 10.6,
      floorBaseY: 0,
      yaw: Math.PI, // looking North so camera goes South past Rotunda wall
      pitch: 0.16,
      distance: 4.5,
      colliderSet: defaultFloor0Colliders,
      cameraRadius: CAMERA_COLLIDER_RADIUS,
    });
    assert.ok(
      Math.hypot(southEdgeAtriumCam.x, southEdgeAtriumCam.z) <= ROTUNDA_WALL_RADIUS - CAMERA_COLLIDER_RADIUS + 0.05,
      'Camera near Atrium South perimeter must be clamped inside rotunda wall',
    );

    const plinthCam = resolveThirdPersonCameraPosition({
      pivotX: LIGHTWELL_CENTER_X,
      pivotY: 1.65,
      pivotZ: LIGHTWELL_CENTER_Z - 2.4,
      floorBaseY: 0,
      yaw: Math.PI, // camera pushed directly toward central plinth at (LIGHTWELL_CENTER_X, LIGHTWELL_CENTER_Z)
      pitch: 0.12,
      distance: 2.4,
      colliderSet: defaultFloor0Colliders,
    });
    assert.ok(
      Math.hypot(plinthCam.x - LIGHTWELL_CENTER_X, plinthCam.z - LIGHTWELL_CENTER_Z) >=
        0.96 + CAMERA_COLLIDER_RADIUS - 0.05,
      'Camera behind character near Atrium center must stay outside central plinth trunk',
    );

    const roomSpawnCam = resolveThirdPersonCameraPosition({
      pivotX: 0,
      pivotY: 1.65,
      pivotZ: ROOM_INTERIOR_SPEC.spawnZ,
      floorBaseY: 0,
      yaw: Math.PI, // facing North into room; camera sits South of spawn inside exit vestibule
      pitch: 0.16,
      distance: 2.05,
      colliderSet: roomColliderSet,
    });
    assert.ok(
      roomSpawnCam.z > ROOM_INTERIOR_SPEC.spawnZ &&
        roomSpawnCam.z <= ROOM_INTERIOR_SPEC.halfDepth + 0.65,
      `Room entry camera snap must stay inside South exit vestibule before backstop (got z=${roomSpawnCam.z})`,
    );
    assert.ok(
      roomSpawnCam.distToPivot3D >= 0.85,
      'Room entry camera snap must maintain safe clearance from character pivot',
    );

    const southWallRoomCam = resolveThirdPersonCameraPosition({
      pivotX: -4.2,
      pivotY: 1.65,
      pivotZ: 5.5,
      floorBaseY: 0,
      yaw: Math.PI, // facing North; camera pushes toward room_south_west_wall (inner face z=6.56)
      pitch: 0.16,
      distance: 3.0,
      colliderSet: roomColliderSet,
    });
    assert.ok(
      southWallRoomCam.z <= ROOM_INTERIOR_SPEC.halfDepth + 0.95,
      `Camera near solid South room wall must stay inside wall plane (got z=${southWallRoomCam.z})`,
    );

    // Verify all 4 slot corridor exits produce safe camera snaps without wall clipping
    for (let slot = 0; slot < ROOMS_PER_FLOOR; slot++) {
      const corridor = getRoomExitCorridorPosition(slot, 0);
      const exitCam = resolveThirdPersonCameraPosition({
        pivotX: corridor.x,
        pivotY: 1.65,
        pivotZ: corridor.z,
        floorBaseY: 0,
        yaw: corridor.rotationY,
        pitch: 0.18,
        distance: 3.6,
        colliderSet: defaultFloor0Colliders,
      });
      assert.ok(
        exitCam.distToPivotXZ > 0.85,
        `Slot ${slot} exit camera must stay safely clear of character pivot (got ${exitCam.distToPivotXZ})`,
      );
      assert.ok(
        Math.hypot(exitCam.x, exitCam.z) <= ROTUNDA_WALL_RADIUS - CAMERA_COLLIDER_RADIUS + 0.05,
        `Slot ${slot} exit camera must stay inside Atrium perimeter`,
      );
    }

    // E. Upper floor elevation clamp respects FLOOR_HEIGHT bounds
    const upperFloorCam = resolveThirdPersonCameraPosition({
      pivotX: 0,
      pivotY: FLOOR_HEIGHT + 1.65,
      pivotZ: 6.2,
      floorBaseY: FLOOR_HEIGHT,
      yaw: 0,
      pitch: -0.75, // sharp upward look
      distance: 4.0,
      colliderSet: floor1Colliders,
    });
    assert.ok(
      upperFloorCam.y >= FLOOR_HEIGHT + 0.55 && upperFloorCam.y <= FLOOR_HEIGHT * 2 - 0.45 + 1e-6,
      `Upper floor camera Y must stay bounded between floor and ceiling soffit (got ${upperFloorCam.y})`,
    );

    console.log('✓ 19. Stage 00.5 Camera Collision Recovery, Responsive FOV, Transitions & 4-Slot Layout verified');
  }

  // =========================================================================
  // 20. Room Entrance Pocket Doors: Proximity Open, Crossing, Hysteresis Close,
  //     Safe Mid-Motion Reversal, Reopening, Independent Doors & Collision Sync
  // =========================================================================
  {
    const slot0CenterExit = localToWorldXZ(
      SLOT_CONFIGS[0].x,
      SLOT_CONFIGS[0].z,
      SLOT_CONFIGS[0].rotY,
      0,
      5.0,
    );
    const slot0Approach = localToWorldXZ(
      SLOT_CONFIGS[0].x,
      SLOT_CONFIGS[0].z,
      SLOT_CONFIGS[0].rotY,
      0,
      2.2,
    );
    const slot0PerimeterEdge = localToWorldXZ(
      SLOT_CONFIGS[0].x,
      SLOT_CONFIGS[0].z,
      SLOT_CONFIGS[0].rotY,
      0,
      3.3,
    );
    const slot0Threshold = localToWorldXZ(
      SLOT_CONFIGS[0].x,
      SLOT_CONFIGS[0].z,
      SLOT_CONFIGS[0].rotY,
      0,
      0.05,
    );
    const slot0BehindWall = localToWorldXZ(
      SLOT_CONFIGS[0].x,
      SLOT_CONFIGS[0].z,
      SLOT_CONFIGS[0].rotY,
      0,
      -2.2,
    );

    // A. Doorway-aware proximity never triggers behind exterior wall or far in the hall
    const proxFar = evaluateRoomDoorProximity({
      slotIndex: 0,
      playerX: slot0CenterExit.x,
      playerZ: slot0CenterExit.z,
    });
    assert.equal(proxFar.inApproachZone, false, 'Far hall character must not open door');

    const proxBehindWall = evaluateRoomDoorProximity({
      slotIndex: 0,
      playerX: slot0BehindWall.x,
      playerZ: slot0BehindWall.z,
    });
    assert.equal(
      proxBehindWall.inApproachZone,
      false,
      'Character behind exterior masonry wall must not trigger room door opening',
    );
    assert.equal(proxBehindWall.inThresholdCrossing, false);

    // B. Approaching smoothly opens the door without snapping
    let door0: RoomDoorState = createInitialRoomDoorState({
      roomId: 'room-0',
      floorNumber: 0,
      slotIndex: 0,
      status: 'active',
    });
    assert.equal(door0.phase, 'closed');
    assert.equal(door0.openAmount, 0);

    door0 = stepRoomDoorState(door0, {
      playerX: slot0Approach.x,
      playerZ: slot0Approach.z,
      activeFloorNumber: 0,
      delta: 0.1,
    });
    assert.equal(door0.phase, 'opening', 'Approaching doorway must transition door to opening');
    assert.ok(door0.openAmount > 0 && door0.openAmount < 1, 'Door should animate smoothly, not snap');

    // Hysteresis zone (3.3m) holds while already opening/open, but would not initially trigger closed door
    const closedDoorAtEdge = stepRoomDoorState(
      createInitialRoomDoorState({
        roomId: 'room-0',
        floorNumber: 0,
        slotIndex: 0,
        status: 'active',
      }),
      {
        playerX: slot0PerimeterEdge.x,
        playerZ: slot0PerimeterEdge.z,
        activeFloorNumber: 0,
        delta: 0.1,
      },
    );
    assert.equal(closedDoorAtEdge.phase, 'closed', 'Outer hysteresis ring must not initiate opening from closed');

    const openingDoorAtEdge = stepRoomDoorState(door0, {
      playerX: slot0PerimeterEdge.x,
      playerZ: slot0PerimeterEdge.z,
      activeFloorNumber: 0,
      delta: 0.1,
    });
    assert.equal(openingDoorAtEdge.phase, 'opening', 'Outer hysteresis ring must keep opening door opening');

    // Step until fully open
    for (let i = 0; i < 20; i++) {
      door0 = stepRoomDoorState(door0, {
        playerX: slot0Approach.x,
        playerZ: slot0Approach.z,
        activeFloorNumber: 0,
        delta: 0.05,
      });
    }
    assert.equal(door0.phase, 'open');
    assert.equal(door0.openAmount, 1);

    // C. Collision synchronization: closed door blocks inward movement; open door allows crossing doorway
    const closedColliders = buildFloorColliders({
      floorNumber: 0,
      slotStatuses: defaultSlots,
      roomDoorOpenAmounts: { 0: 0, 1: 1, 3: 1 },
    });
    assert.ok(
      closedColliders.obbs.some((o) => o.id === 'portal_0_door_closed'),
      'Closed room door must emit closed door barrier collider',
    );
    const sin0 = Math.sin(SLOT_CONFIGS[0].rotY);
    const cos0 = Math.cos(SLOT_CONFIGS[0].rotY);
    let closedWalk = localToWorldXZ(SLOT_CONFIGS[0].x, SLOT_CONFIGS[0].z, SLOT_CONFIGS[0].rotY, 0, 0.7);
    for (let step = 0; step < 8; step++) {
      const m = resolveCharacterMovement({
        startX: closedWalk.x,
        startY: 0,
        startZ: closedWalk.z,
        velX: -sin0 * 4.5,
        velZ: -cos0 * 4.5,
        delta: 0.04,
        totalFloors: 3,
        slotStatuses: defaultSlots,
        roomDoorOpenAmounts: { 0: 0, 1: 1, 3: 1 },
      });
      closedWalk = { x: m.x, z: m.z };
    }
    const blockedLocal = worldToPortalLocalXZ(0, closedWalk.x, closedWalk.z);
    assert.ok(
      blockedLocal.lz > 0.25,
      `Closed door collider must prevent stepping into threshold (got lz=${blockedLocal.lz})`,
    );

    // Partially open door narrows opening with left/right leaf OBBs until >= passableOpenThreshold
    const halfOpenColliders = buildFloorColliders({
      floorNumber: 0,
      slotStatuses: defaultSlots,
      roomDoorOpenAmounts: { 0: 0.45, 1: 1, 3: 1 },
    });
    assert.ok(
      halfOpenColliders.obbs.some((o) => o.id === 'portal_0_door_panel_left') &&
        halfOpenColliders.obbs.some((o) => o.id === 'portal_0_door_panel_right'),
      'Partially open door must emit sliding left/right panel colliders',
    );

    // Fully open door clears doorway panels and permits doorway crossing trigger
    const openColliders = buildFloorColliders({
      floorNumber: 0,
      slotStatuses: defaultSlots,
      roomDoorOpenAmounts: { 0: 1, 1: 1, 3: 1 },
    });
    assert.equal(
      openColliders.obbs.some((o) => o.id.startsWith('portal_0_door_')),
      false,
      'Fully open room door must have no blocking door colliders',
    );
    let openWalk = localToWorldXZ(SLOT_CONFIGS[0].x, SLOT_CONFIGS[0].z, SLOT_CONFIGS[0].rotY, 0, 0.7);
    let openTriggered: 0 | 1 | 2 | 3 | null = null;
    for (let step = 0; step < 8; step++) {
      const m = resolveCharacterMovement({
        startX: openWalk.x,
        startY: 0,
        startZ: openWalk.z,
        velX: -sin0 * 4.5,
        velZ: -cos0 * 4.5,
        delta: 0.04,
        totalFloors: 3,
        slotStatuses: defaultSlots,
        roomDoorOpenAmounts: { 0: 1, 1: 1, 3: 1 },
      });
      const doorwayEval = evaluateRoomDoorwayTransitions({
        prevX: openWalk.x,
        prevZ: openWalk.z,
        currX: m.x,
        currZ: m.z,
        floorNumber: 0,
        slotStatuses: defaultSlots,
        currentLatch: null,
      });
      if (doorwayEval.triggeredSlotIndex !== null) {
        openTriggered = doorwayEval.triggeredSlotIndex;
        break;
      }
      openWalk = { x: m.x, z: m.z };
    }
    assert.equal(openTriggered, 0, 'Walking through open room door must cross into Slot 0 trigger');

    // D. Leaving opens delay -> closes smoothly -> mid-close reversal -> reopening -> mid-open reversal
    // Walk away from open door
    let closingDoor = stepRoomDoorState(door0, {
      playerX: slot0CenterExit.x,
      playerZ: slot0CenterExit.z,
      activeFloorNumber: 0,
      delta: 0.1, // less than closeDelaySec (0.35s)
    });
    assert.equal(closingDoor.phase, 'open', 'Door must wait for dwell delay before starting to close');
    assert.equal(closingDoor.openAmount, 1);

    // Finish dwell delay and enter closing motion
    for (let i = 0; i < 8; i++) {
      closingDoor = stepRoomDoorState(closingDoor, {
        playerX: slot0CenterExit.x,
        playerZ: slot0CenterExit.z,
        activeFloorNumber: 0,
        delta: 0.08,
      });
    }
    assert.equal(closingDoor.phase, 'closing', 'Door should smoothly close after player leaves');
    const amountBeforeReversal = closingDoor.openAmount;
    assert.ok(amountBeforeReversal > 0 && amountBeforeReversal < 1);

    // Approach again mid-close -> reverses smoothly from current openAmount without snapping to 0
    const reversedOpen = stepRoomDoorState(closingDoor, {
      playerX: slot0Approach.x,
      playerZ: slot0Approach.z,
      activeFloorNumber: 0,
      delta: 0.05,
    });
    assert.equal(reversedOpen.phase, 'opening', 'Re-approaching mid-close must reverse back to opening');
    assert.ok(
      reversedOpen.openAmount > amountBeforeReversal && reversedOpen.openAmount < 1,
      'Reversal must continue smoothly from mid-close openAmount',
    );

    // Anti-pinch safety: standing in doorway threshold while closing forces opening
    const pinched = stepRoomDoorState(closingDoor, {
      playerX: slot0Threshold.x,
      playerZ: slot0Threshold.z,
      activeFloorNumber: 0,
      delta: 0.05,
    });
    assert.equal(pinched.phase, 'opening', 'Anti-pinch threshold presence must force closing door to reopen');

    // Walk away mid-open -> immediately transitions to closing from current openAmount
    const reversedClose = stepRoomDoorState(reversedOpen, {
      playerX: slot0CenterExit.x,
      playerZ: slot0CenterExit.z,
      activeFloorNumber: 0,
      delta: 0.05,
    });
    assert.equal(reversedClose.phase, 'closing', 'Leaving mid-open must reverse immediately to closing');
    assert.ok(
      reversedClose.openAmount < reversedOpen.openAmount,
      'Mid-open reversal must decrease openAmount smoothly without snapping to 1',
    );

    // E. Multiple independent doors & separation from North Elevator doors + floor isolation
    const slot1Approach = localToWorldXZ(
      SLOT_CONFIGS[1].x,
      SLOT_CONFIGS[1].z,
      SLOT_CONFIGS[1].rotY,
      0,
      1.8,
    );
    let doorSlot0 = createInitialRoomDoorState({ roomId: 'room-0', floorNumber: 0, slotIndex: 0, status: 'active' });
    let doorSlot1 = createInitialRoomDoorState({ roomId: 'room-1', floorNumber: 0, slotIndex: 1, status: 'active' });
    let doorSlot2Disabled = createInitialRoomDoorState({ roomId: 'room-2', floorNumber: 0, slotIndex: 2, status: 'disabled' });
    let doorSlot3Floor1 = createInitialRoomDoorState({ roomId: 'room-4', floorNumber: 1, slotIndex: 0, status: 'active' });

    // Stand right in front of Slot 1 on Floor 0: verify smooth opening first, then full open
    for (let i = 0; i < 4; i++) {
      doorSlot0 = stepRoomDoorState(doorSlot0, { playerX: slot1Approach.x, playerZ: slot1Approach.z, activeFloorNumber: 0, delta: 0.05 });
      doorSlot1 = stepRoomDoorState(doorSlot1, { playerX: slot1Approach.x, playerZ: slot1Approach.z, activeFloorNumber: 0, delta: 0.05 });
      doorSlot2Disabled = stepRoomDoorState(doorSlot2Disabled, { playerX: slot1Approach.x, playerZ: slot1Approach.z, activeFloorNumber: 0, delta: 0.05 });
      doorSlot3Floor1 = stepRoomDoorState(doorSlot3Floor1, { playerX: slot0Approach.x, playerZ: slot0Approach.z, activeFloorNumber: 0, delta: 0.05 });
    }
    assert.equal(doorSlot1.phase, 'opening', 'Approached Slot 1 room door must begin opening smoothly');
    assert.ok(doorSlot1.openAmount > 0.3 && doorSlot1.openAmount < 1);
    for (let i = 0; i < 6; i++) {
      doorSlot1 = stepRoomDoorState(doorSlot1, { playerX: slot1Approach.x, playerZ: slot1Approach.z, activeFloorNumber: 0, delta: 0.05 });
    }
    assert.equal(doorSlot1.phase, 'open', 'Approached Slot 1 room door must complete opening');
    assert.equal(doorSlot1.openAmount, 1);
    assert.equal(doorSlot0.phase, 'closed', 'Unapproached Slot 0 door must remain independently closed');
    assert.equal(doorSlot0.openAmount, 0);
    assert.equal(doorSlot2Disabled.phase, 'closed', 'Disabled room door must remain locked closed');
    assert.equal(doorSlot2Disabled.openAmount, 0);
    assert.equal(doorSlot3Floor1.phase, 'closed', 'Different-floor door must stay closed when player is on Floor 0');

    // Standing at the North Elevator entrance must NOT trigger any normal room door
    for (let i = 0; i < 4; i++) {
      const s = stepRoomDoorState(
        createInitialRoomDoorState({ roomId: `room-${i}`, floorNumber: 0, slotIndex: i as 0 | 1 | 2 | 3, status: 'active' }),
        { playerX: 0, playerZ: -7.2, activeFloorNumber: 0, delta: 0.1 },
      );
      assert.equal(s.phase, 'closed', `Elevator proximity (0, -7.2) must not open room door slot ${i}`);
      assert.equal(s.openAmount, 0);
    }
    assert.equal(isCharacterInElevatorProximity(0, -7.2), true, 'North elevator proximity remains dedicated to elevator');

    console.log('✓ 20. Room Entrance Pocket Doors (Proximity, Crossing, Hysteresis, Reversal, Independence & Collision Sync) verified');
  }

  // =========================================================================
  // 21. Camera & GSAP Transition Ownership, Interruption, Cleanup & Character Visibility Regressions
  // =========================================================================
  {
    // A. Camera owner priority prevents multiple systems fighting for camera writes
    const introOwner: CameraControllerOwner = resolveCameraControllerOwner({
      hasEnteredAtrium: false,
      isWelcomeActive: true,
      liftPhase: 'traveling',
      inActiveRoom3D: false,
      isTutorialActive: true,
      tutorialTarget: 'overview',
      isScriptedGsapActive: true,
      cameraViewMode: 'first_person',
    });
    assert.equal(introOwner, 'intro', 'Intro gate must take exclusive camera ownership before atrium entry');

    const welcomeOwner = resolveCameraControllerOwner({
      hasEnteredAtrium: true,
      isWelcomeActive: true,
      liftPhase: 'idle',
      inActiveRoom3D: false,
      isTutorialActive: true,
      tutorialTarget: 'overview',
      cameraViewMode: 'third_person',
    });
    assert.equal(welcomeOwner, 'welcome', 'Welcome briefing owns camera before player dismisses or starts walkthrough');

    const tutorialOwner = resolveCameraControllerOwner({
      hasEnteredAtrium: true,
      isWelcomeActive: false,
      liftPhase: 'idle',
      inActiveRoom3D: false,
      isTutorialActive: true,
      tutorialTarget: 'childhood_entrance',
      isScriptedGsapActive: true,
      cameraViewMode: 'third_person',
    });
    assert.equal(tutorialOwner, 'tutorial', 'Active walkthrough target owns camera cleanly');

    // Unknown/unsupported tutorial target must NOT steal camera from third-person/first-person
    const unsupportedTutorialFallback = resolveCameraControllerOwner({
      hasEnteredAtrium: true,
      isWelcomeActive: false,
      liftPhase: 'idle',
      inActiveRoom3D: false,
      isTutorialActive: true,
      tutorialTarget: null,
      isScriptedGsapActive: false,
      cameraViewMode: 'third_person',
    });
    assert.equal(unsupportedTutorialFallback, 'third_person');

    const liftTravelOwner = resolveCameraControllerOwner({
      hasEnteredAtrium: true,
      isWelcomeActive: false,
      liftPhase: 'traveling',
      inActiveRoom3D: false,
      isTutorialActive: false,
      tutorialTarget: null,
      isScriptedGsapActive: true,
      cameraViewMode: 'third_person',
    });
    assert.equal(liftTravelOwner, 'lift_travel', 'Elevator travel holds exclusive ownership while traveling floors');

    const scriptedGsapOwner = resolveCameraControllerOwner({
      hasEnteredAtrium: true,
      isWelcomeActive: false,
      liftPhase: 'idle',
      inActiveRoom3D: false,
      isTutorialActive: false,
      tutorialTarget: null,
      isScriptedGsapActive: true,
      cameraViewMode: 'third_person',
    });
    assert.equal(scriptedGsapOwner, 'scripted_gsap');

    // B. Character & ground shadow visibility invariants across every camera mode and transition
    assert.deepEqual(
      resolveCharacterVisibility({ cameraOwner: 'first_person', cameraDistToPivot3D: 3.6 }),
      { bodyVisible: false, shadowVisible: false },
      'First-person mode must hide both character mesh and shadow',
    );
    assert.deepEqual(
      resolveCharacterVisibility({ cameraOwner: 'lift_travel', cameraDistToPivot3D: 3.6 }),
      { bodyVisible: false, shadowVisible: false },
      'Elevator travel interior view must hide character mesh and shadow',
    );
    assert.deepEqual(
      resolveCharacterVisibility({ cameraOwner: 'third_person', cameraDistToPivot3D: 0.65 }),
      { bodyVisible: false, shadowVisible: false },
      'Third-person camera squeezed closer than 0.85m hides body & shadow cleanly to avoid clipping into lens',
    );
    assert.deepEqual(
      resolveCharacterVisibility({ cameraOwner: 'third_person', cameraDistToPivot3D: 2.8 }),
      { bodyVisible: true, shadowVisible: true },
      'Returning to normal third-person follow distance must restore both body and shadow visibility',
    );
    assert.deepEqual(
      resolveCharacterVisibility({ cameraOwner: 'scripted_gsap', cameraDistToPivot3D: 0.2 }),
      { bodyVisible: true, shadowVisible: true },
      'Scripted cinematic camera keeps character body and shadow visible',
    );

    // C. GSAP camera transition interruption, idempotent cleanup & post-interrupt immobility
    const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 200);
    cam.position.set(0, 2, 6);
    const lookTarget = new THREE.Vector3(0, 1.5, 0);
    let completeCount = 0;
    let interruptCount = 0;

    const handle = createCameraTransitionTimeline(
      cam,
      lookTarget,
      [
        { position: [3, 2.5, 2], lookAt: [1, 1.5, -2], duration: 1.5 },
        { position: [-2, 3, -4], lookAt: [0, 1.5, -6], duration: 1.5 },
      ],
      {
        onComplete: () => {
          completeCount += 1;
        },
        onInterrupt: () => {
          interruptCount += 1;
        },
      },
    );

    assert.equal(handle.isActive?.(), true, 'Fresh GSAP camera transition handle must report active');
    handle.animation.progress(0.35);
    const posAtInterrupt = cam.position.clone();
    handle.kill();
    handle.kill(); // second kill must be idempotent

    assert.equal(interruptCount, 1, 'Killing mid-flight GSAP transition must invoke onInterrupt exactly once');
    assert.equal(completeCount, 0, 'Interrupted transition must never invoke onComplete');
    assert.equal(handle.isActive?.(), false, 'Killed GSAP handle must report inactive');

    // Subsequent handoff back to third_person after interruption or floor exit yields valid visibility + safe camera
    const postInterruptOwner = resolveCameraControllerOwner({
      hasEnteredAtrium: true,
      isWelcomeActive: false,
      liftPhase: 'idle',
      inActiveRoom3D: false,
      isTutorialActive: false,
      tutorialTarget: null,
      isScriptedGsapActive: handle.isActive?.(),
      cameraViewMode: 'third_person',
    });
    assert.equal(postInterruptOwner, 'third_person');

    const corridorSlot2 = getRoomExitCorridorPosition(2, 1);
    const postExitColliders = buildFloorColliders({
      floorNumber: 1,
      slotStatuses: { 0: 'active', 1: 'active', 2: 'active', 3: 'active' },
      roomDoorOpenAmounts: { 0: 0, 1: 0, 2: 1, 3: 0 },
    });
    const postExitCam = resolveThirdPersonCameraPosition({
      pivotX: corridorSlot2.x,
      pivotY: corridorSlot2.y + 1.65,
      pivotZ: corridorSlot2.z,
      floorBaseY: corridorSlot2.y,
      yaw: corridorSlot2.rotationY,
      pitch: 0.16,
      distance: 3.6,
      colliderSet: postExitColliders,
    });
    const postExitVisibility = resolveCharacterVisibility({
      cameraOwner: postInterruptOwner,
      cameraDistToPivot3D: postExitCam.distToPivot3D,
    });
    assert.deepEqual(
      postExitVisibility,
      { bodyVisible: true, shadowVisible: true },
      'After room exit & camera handoff on any floor, character and shadow must remain visible',
    );
    assert.equal(cam.position.equals(posAtInterrupt), true, 'Killed GSAP timeline must no longer mutate camera');

    console.log('✓ 21. Camera & GSAP Transition Ownership, Interruption, Cleanup & Character Visibility verified');
  }

  // =========================================================================
  // 22. MEMORA Brand Identity Config & Custom Museum Name Preservation
  // =========================================================================
  {
    assert.equal(BRAND.name, 'MEMORA');
    assert.equal(BRAND.tagline, 'Your Life. Your Stories. Your World.');
    assert.equal(BRAND.browserTitle, 'MEMORA — Your Personal Museum');

    assert.equal(resolveMuseumDisplayName(undefined), 'MEMORA');
    assert.equal(resolveMuseumDisplayName(''), 'MEMORA');
    assert.equal(resolveMuseumDisplayName('MyMuseum'), 'MEMORA');
    assert.equal(resolveMuseumDisplayName('My Museum'), 'MEMORA');
    assert.equal(resolveMuseumDisplayName('The Living Museum'), 'MEMORA');
    assert.equal(
      resolveMuseumDisplayName("Elena's Family Archive"),
      "Elena's Family Archive",
      'Custom user-configured museum name must never be overwritten with MEMORA',
    );

    assert.equal(resolveBrowserTitle('MyMuseum'), 'MEMORA — Your Personal Museum');
    assert.equal(
      resolveBrowserTitle("Elena's Family Archive"),
      "Elena's Family Archive — MEMORA",
    );

    console.log('✓ 22. MEMORA Brand Identity Config & Custom Museum Name Preservation verified');
  }

  // =========================================================================
  // 23. Stage 00.5 Room Interior Obstacle Sync & Elevated Camera Collider Invariants
  // =========================================================================
  {
    for (const room of INITIAL_ROOMS) {
      const colliders = buildRoomInteriorColliders(room, room.exhibitionStyle, []);
      assert.ok(
        colliders.circles.some((c) => c.id === 'room_central_floating_island'),
        `Room ${room.id} (${room.exhibitionStyle}) must enforce central tree island collider`,
      );
      for (const expectedObbId of [
        'room_cinema_credenza',
        'room_keepsake_vitrine',
        'room_constellation_table',
        'room_bedroom_bed',
        'room_bedroom_wardrobe',
        'room_study_desk',
      ]) {
        assert.ok(
          colliders.obbs.some((o) => o.id === expectedObbId),
          `Room ${room.id} must include permanent Section 3B collider ${expectedObbId}`,
        );
      }

      // Elevated camera retains tall room obstacles while filtering low floor furniture
      const camColliders = buildCameraFloorColliders(colliders, 1.85);
      assert.ok(
        camColliders.circles.some((c) => c.id === 'room_central_floating_island' && c.radius <= 0.92),
        `Room ${room.id} elevated camera must retain central tree trunk collider`,
      );
      assert.ok(
        camColliders.obbs.some((o) => o.id === 'room_keepsake_vitrine') &&
          camColliders.obbs.some((o) => o.id === 'room_cinema_credenza') &&
          camColliders.obbs.some((o) => o.id === 'room_bedroom_wardrobe'),
        `Room ${room.id} elevated camera must retain tall vitrine, cinema credenza, and wardrobe`,
      );
      assert.equal(
        camColliders.obbs.some(
          (o) =>
            o.id === 'room_bedroom_bed' ||
            o.id === 'room_study_desk' ||
            o.id === 'room_constellation_table',
        ),
        false,
        `Room ${room.id} elevated camera must filter low bed, desk, and tilted table`,
      );
    }

    // Verify character in Childhood room (floating_exhibition) cannot walk through central tree pedestal at (0, -1.1)
    const childhoodRoom = INITIAL_ROOMS.find((r) => r.id === 'childhood') || INITIAL_ROOMS[0];
    const childhoodCentralAttempt = resolveRoomInteriorMovement({
      room: childhoodRoom,
      memories: [],
      startX: 0,
      startY: 0,
      startZ: 1.0,
      velX: 0,
      velZ: -60,
      delta: 0.05,
    });
    assert.ok(
      Math.hypot(childhoodCentralAttempt.x, childhoodCentralAttempt.z - (-1.1)) >= 1.32 + CHARACTER_COLLIDER_RADIUS - 0.02,
      `Character in Childhood room must not clip into central tree pedestal (dist=${Math.hypot(childhoodCentralAttempt.x, childhoodCentralAttempt.z - (-1.1))})`,
    );

    console.log('✓ 23. Stage 00.5 Room Interior Obstacle Sync & Elevated Camera Collider Invariants verified');
  }

  // 24. Stage 01 Museum Visual Standards (Device Quality Tiers, uv2 AO, & Refined Central Tree)
  {
    const desktopQ = getVisualQualityConfig('desktop', false);
    const tabletQ = getVisualQualityConfig('tablet', false);
    const mobileQ = getVisualQualityConfig('mobile', false);
    const swGlQ = getVisualQualityConfig('desktop', true);

    assert.equal(desktopQ.enablePostProcessing, true, 'Desktop hardware WebGL should allow subtle bloom composer');
    assert.equal(desktopQ.shadowMapSize, 2048);
    assert.equal(desktopQ.textureRes, 1024);

    assert.equal(tabletQ.enablePostProcessing, false, 'Tablet must disable post-processing for smooth frame rates');
    assert.equal(tabletQ.shadowMapSize, 1024);
    assert.ok(tabletQ.treeFoliageInstances < desktopQ.treeFoliageInstances);

    assert.equal(mobileQ.enablePostProcessing, false, 'Mobile must disable post-processing');
    assert.equal(mobileQ.shadowMapSize, 512);
    assert.ok(mobileQ.treeFoliageInstances < tabletQ.treeFoliageInstances);

    assert.equal(swGlQ.enablePostProcessing, false, 'Software WebGL must disable post-processing');
    assert.equal(swGlQ.enableShadows, false, 'Software WebGL must disable shadow maps');
    assert.equal(swGlQ.maxPixelRatio, 1);

    const disc = ensureUv2Attribute(new THREE.CircleGeometry(4, 24));
    assert.ok(disc.getAttribute('uv2'), 'ensureUv2Attribute must populate uv2 for Three.js aoMap support');
    disc.dispose();

    const testGroup = new THREE.Group();
    const tracked: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
    const dummyMat = new THREE.MeshStandardMaterial();
    tracked.push(dummyMat);
    const treeRes = populateRefinedAtriumTree({
      centerpieceGroup: testGroup,
      quality: desktopQ,
      matWarmLimestone: dummyMat,
      matWalnut: dummyMat,
      matBrushedGold: dummyMat,
      matAlabaster: dummyMat,
      matBark: dummyMat,
      matMossBed: dummyMat,
      matCanopy: dummyMat,
      trackStatic: <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(a: T) => {
        tracked.push(a);
        return a;
      },
    });
    assert.ok(treeRes.staticCameraObstacles.length >= 3, 'Tree plinth & trunk must register camera obstacles');
    assert.equal(treeRes.centerpieceHitbox.userData.kind, 'discovery_compass');
    assert.ok(treeRes.kineticSculpture && treeRes.ringOuter && treeRes.ringMiddle && treeRes.innerCore);

    const instancedFoliage = testGroup.children.filter(
      (c): c is THREE.InstancedMesh => c instanceof THREE.InstancedMesh,
    );
    assert.ok(
      instancedFoliage.some((m) => m.count === desktopQ.treeFoliageInstances),
      'Tree foliage must render via a single tier-scaled InstancedMesh',
    );

    tracked.forEach((a) => a.dispose());
    console.log('✓ 24. Stage 01 Visual Quality Tiers, uv2 AO & Refined Central Tree Builder verified');
  }

  // =========================================================================
  // 25. Stage 01B Museum Visual Consistency: Parquet PBR, Lighting Rig Parity & Room Central Tree
  // =========================================================================
  {
    // A. createWarmParquetFloorPBRSet colorSpace & UV repeat parity
    const prevDocument = (globalThis as { document?: unknown }).document;
    const noopCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      createLinearGradient: () => ({ addColorStop: () => undefined }),
      fillRect: () => undefined,
      strokeRect: () => undefined,
      beginPath: () => undefined,
      moveTo: () => undefined,
      bezierCurveTo: () => undefined,
      stroke: () => undefined,
    };
    (globalThis as { document: unknown }).document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => noopCtx,
      }),
    };
    try {
      const parquetPBR = createWarmParquetFloorPBRSet(4, 512, 256);
      assert.equal(parquetPBR.map.colorSpace, THREE.SRGBColorSpace, 'Parquet diffuse map must use SRGBColorSpace');
      assert.equal(parquetPBR.normalMap.colorSpace, THREE.NoColorSpace, 'Parquet normalMap must use NoColorSpace');
      assert.equal(parquetPBR.roughnessMap.colorSpace, THREE.NoColorSpace, 'Parquet roughnessMap must use NoColorSpace');
      assert.ok(parquetPBR.aoMap, 'Parquet PBR set must include aoMap');
      assert.equal(parquetPBR.aoMap.colorSpace, THREE.NoColorSpace, 'Parquet aoMap must use NoColorSpace');

      for (const tex of [parquetPBR.map, parquetPBR.normalMap, parquetPBR.roughnessMap, parquetPBR.aoMap]) {
        assert.equal(tex.repeat.x, 2.5, 'All parquet maps must share 2.5x U repeat');
        assert.equal(tex.repeat.y, 2.5, 'All parquet maps must share 2.5y V repeat');
        tex.dispose();
      }
    } finally {
      if (prevDocument === undefined) {
        delete (globalThis as { document?: unknown }).document;
      } else {
        (globalThis as { document: unknown }).document = prevDocument;
      }
    }

    // B. computeRoomLightingRigTargets parity across atmosphere presets & atrium moods
    const presets = ['golden_hour', 'morning_sunlight', 'night_starlight', 'rainy_window'] as const;
    const presetSignatureSet = new Set<string>();
    for (const presetId of presets) {
      const goldenTarget = computeRoomLightingRigTargets(presetId, 'golden_hour');
      const daylightTarget = computeRoomLightingRigTargets(presetId, 'daylight_salon');
      const nocturneTarget = computeRoomLightingRigTargets(presetId, 'evening_nocturne');

      for (const tgt of [goldenTarget, daylightTarget, nocturneTarget]) {
        assert.ok(tgt.hemiIntensity > 0 && Number.isFinite(tgt.hemiIntensity));
        assert.ok(tgt.centerIntensity > 0 && Number.isFinite(tgt.centerIntensity));
        assert.ok(tgt.northIntensity > 0 && Number.isFinite(tgt.northIntensity));
        assert.ok(tgt.sideWashIntensity > 0 && Number.isFinite(tgt.sideWashIntensity));
        assert.ok(tgt.southEntryIntensity > 0 && Number.isFinite(tgt.southEntryIntensity));
        assert.match(tgt.hemiSkyHex, /^#[0-9A-Fa-f]{6}$/);
        assert.match(tgt.centerColorHex, /^#[0-9A-Fa-f]{6}$/);
      }

      if (presetId === 'golden_hour' || presetId === 'morning_sunlight') {
        assert.ok(
          daylightTarget.hemiIntensity > goldenTarget.hemiIntensity &&
            goldenTarget.hemiIntensity > nocturneTarget.hemiIntensity,
          `Preset ${presetId} must scale exposure cleanly across atrium moods`,
        );
      } else {
        assert.equal(
          daylightTarget.hemiIntensity,
          goldenTarget.hemiIntensity,
          `Preset ${presetId} must maintain dedicated atmospheric exposure`,
        );
      }
      presetSignatureSet.add(
        `${goldenTarget.hemiSkyHex}:${goldenTarget.centerColorHex}:${goldenTarget.centerIntensity.toFixed(2)}`,
      );
    }
    assert.equal(presetSignatureSet.size, presets.length, 'Each atmosphere preset must remain visually distinct');

    // C. populateRefinedRoomCentralTree instancing, collider bounds & clean disposal
    for (const tier of ['desktop', 'tablet', 'mobile'] as const) {
      const q = getVisualQualityConfig(tier, false);
      const roomIslandGroup = new THREE.Group();
      const trackedAssets: { dispose: () => void }[] = [];
      const dummyStd = new THREE.MeshStandardMaterial();
      trackedAssets.push(dummyStd);
      const camObstacles: THREE.Object3D[] = [];

      populateRefinedRoomCentralTree({
        centralIslandGroup: roomIslandGroup,
        quality: q,
        matWalnut: dummyStd,
        matChampagneGold: dummyStd,
        matWarmEmissiveStrip: dummyStd,
        matBark: dummyStd,
        matMossBed: dummyStd,
        matCanopy: dummyStd,
        cameraObstacleMeshes: camObstacles,
        track: <T extends { dispose: () => void }>(asset: T) => {
          trackedAssets.push(asset);
          return asset;
        },
      });

      const instancedMeshes = roomIslandGroup.children.filter(
        (c): c is THREE.InstancedMesh => c instanceof THREE.InstancedMesh,
      );
      const expectedFoliageCount = Math.max(24, Math.round(q.treeFoliageInstances * 0.85));
      assert.ok(
        instancedMeshes.some((m) => m.count === 28),
        `Room tree (${tier}) must batch 28 pedestal flutes into 1 InstancedMesh`,
      );
      assert.ok(
        instancedMeshes.some((m) => m.count === expectedFoliageCount),
        `Room tree (${tier}) must batch ${expectedFoliageCount} canopy clusters into 1 InstancedMesh`,
      );
      assert.ok(
        instancedMeshes.some((m) => m.count === 12),
        `Room tree (${tier}) must batch 12 canopy fireflies into 1 InstancedMesh`,
      );
      assert.ok(camObstacles.length >= 1, 'Room central tree trunk must register a camera obstacle');

      // Check zero canopy instances leak below eye sightline (y >= 3.32m)
      const foliageMesh = instancedMeshes.find((m) => m.count === expectedFoliageCount)!;
      const mat4 = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      for (let i = 0; i < foliageMesh.count; i++) {
        foliageMesh.getMatrixAt(i, mat4);
        pos.setFromMatrixPosition(mat4);
        assert.ok(pos.y >= 3.32, `Room foliage instance ${i} must keep clear eye sightlines (y=${pos.y})`);
      }

      for (const a of trackedAssets) a.dispose();
    }

    // D. Stage 01B Room collision & doorway transition invariants preserved
    const travelRoom = INITIAL_ROOMS.find((r) => r.id === 'travel') || INITIAL_ROOMS[0];
    const roomColliders = buildRoomInteriorColliders(travelRoom, travelRoom.exhibitionStyle, []);
    assert.ok(
      roomColliders.obbs.some((o) => o.id === 'room_east_wall'),
      'Room colliders must continue enforcing East wall boundary after Stage 01B audio booth alignment',
    );
    const eastPush = resolveRoomInteriorMovement({
      room: travelRoom,
      memories: [],
      startX: 5.4,
      startY: 0,
      startZ: 0.2,
      velX: 60,
      velZ: 0,
      delta: 0.05,
    });
    assert.ok(
      eastPush.x <= ROOM_INTERIOR_SPEC.halfWidth - ROOM_INTERIOR_SPEC.wallThickness - CHARACTER_COLLIDER_RADIUS + 0.05,
      `Character must remain safely inside East wall boundary (x=${eastPush.x})`,
    );

    console.log('✓ 25. Stage 01B Parquet PBR, Lighting Rig Parity & Refined Room Tree verified');
  }

  // =========================================================================
  // 26. Stage 02 Automatic AI Memory Curation, Multi-Format Upload Validation & Contextual World Experiences
  // =========================================================================
  {
    // A. Multi-file upload validation (type, size, non-empty, duplicate detection)
    const seenKeys = new Set<string>();
    const validPhotoCheck = validateUploadFileCandidate(
      { name: 'summer_bicycle_1999.jpg', size: 245000, type: 'image/jpeg' },
      INITIAL_MEMORIES,
      seenKeys,
    );
    assert.equal(validPhotoCheck.valid, true, 'Supported JPG upload must pass validation');

    // Duplicate in same batch
    const dupBatchCheck = validateUploadFileCandidate(
      { name: 'summer_bicycle_1999.jpg', size: 245000, type: 'image/jpeg' },
      INITIAL_MEMORIES,
      seenKeys,
    );
    assert.equal(dupBatchCheck.valid, false, 'Duplicate file in same batch must be flagged');
    assert.equal(dupBatchCheck.code, 'DUPLICATE_MEMORY');

    // Empty file rejection
    const emptyFileCheck = validateUploadFileCandidate(
      { name: 'broken.png', size: 0, type: 'image/png' },
      INITIAL_MEMORIES,
    );
    assert.equal(emptyFileCheck.valid, false, 'Empty 0-byte file must be rejected');
    assert.equal(emptyFileCheck.code, 'EMPTY_FILE');

    // Oversized file rejection (> 50 MB)
    const oversizedCheck = validateUploadFileCandidate(
      { name: 'huge_archive.mp4', size: MAX_UPLOAD_FILE_SIZE_BYTES + 1024, type: 'video/mp4' },
      INITIAL_MEMORIES,
    );
    assert.equal(oversizedCheck.valid, false, 'File exceeding 50 MB limit must be rejected');
    assert.equal(oversizedCheck.code, 'FILE_TOO_LARGE');

    // Unsupported format rejection
    const unsupportedCheck = validateUploadFileCandidate(
      { name: 'installer.exe', size: 4096, type: 'application/x-msdownload' },
      INITIAL_MEMORIES,
    );
    assert.equal(unsupportedCheck.valid, false, 'Unsupported binary executable must be rejected');
    assert.equal(unsupportedCheck.code, 'UNSUPPORTED_FORMAT');

    // B. Document text extraction (.rtf, .doc, .txt) & Chat export parsing
    const rtfText = extractReadableDocumentText(
      '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24 First Bicycle Ride in June 1999\\par Warm afternoon in the backyard.}',
      'diary_1999.rtf',
    );
    assert.ok(rtfText.includes('First Bicycle Ride in June 1999'), 'RTF control codes must be stripped cleanly');
    assert.ok(!rtfText.includes('\\rtf1'), 'RTF header markup must not leak into extracted text');

    const whatsappChat = parseChatExportText(
      '[12/06/2014, 4:15 PM] Maya: Meet me at the treehouse!\n[12/06/2014, 4:16 PM] Leo: Bringing the comic books and lantern!',
      'treehouse_chat.txt',
    );
    assert.equal(whatsappChat.formatDetected, 'whatsapp', 'WhatsApp export format must be recognised');
    assert.equal(whatsappChat.messages.length, 2, 'Two chronological chat messages must be parsed');
    assert.equal(whatsappChat.messages[0].sender, 'Maya');
    assert.equal(whatsappChat.messages[1].sender, 'Leo');

    // C. Grounded fallback report & placement validation (Fact vs AI inference separation)
    const bicycleReport = buildGroundedFallbackReport({
      fileName: 'backyard_bicycle_race_1998.jpg',
      mediaCategory: 'image',
    });
    assert.equal(bicycleReport.recommendedRoomId, 'childhood');
    assert.equal(bicycleReport.recommendedLocationId, 'bicycle_trail', 'Bicycle memory must route to bicycle_trail');
    assert.equal(bicycleReport.recommendedDisplayObject, 'bicycle');
    assert.equal(bicycleReport.recommendedInteraction, 'Bicycle Trail Ride & Photo Strip');
    assert.ok(bicycleReport.verifiedFacts.length >= 1, 'Verified facts must be populated');
    assert.ok(bicycleReport.aiInferences.length >= 1, 'AI inferences must be separated from verified facts');

    const treehouseChatReport = buildGroundedFallbackReport({
      fileName: 'best_friends_chat.txt',
      mediaCategory: 'chat',
      rawTextContent: '[12/06/2014, 4:15 PM] Maya: Secret club meeting in the treehouse!',
    });
    assert.equal(treehouseChatReport.recommendedLocationId, 'treehouse', 'Chat export must route to treehouse');
    assert.equal(treehouseChatReport.recommendedInteraction, 'Archived Conversation Replay');

    const lowConfidencePlacement = validateLocationPlacement('bicycle_trail', 'image', {
      title: 'Unidentified blurry scan',
      extractedText: '',
      confidenceScore: 0.25,
    });
    assert.equal(
      lowConfidencePlacement.locationId,
      'keepsake_corner',
      'Low-confidence ambiguous item must route safely to keepsake_corner',
    );

    // D. Evidence-backed connection validation (rejects weak/unfounded links)
    const memA: Memory = {
      ...INITIAL_MEMORIES[0],
      id: 'mem-test-a',
      title: 'Backyard Bicycle Trail Ride',
      date: '1999-06-14',
      year: 1999,
      location: 'Oakridge Backyard',
      tags: ['bicycle', 'cycling', 'summer'],
    };
    const memB: Memory = {
      ...INITIAL_MEMORIES[0],
      id: 'mem-test-b',
      title: 'Fixing the Bicycle Chain',
      date: '1999-06-14',
      year: 1999,
      location: 'Oakridge Backyard',
      tags: ['bicycle', 'cycling', 'summer'],
    };
    const memUnrelated: Memory = {
      ...INITIAL_MEMORIES[0],
      id: 'mem-test-c',
      title: 'Unrelated Document Scan',
      date: '2021-11-02',
      year: 2021,
      location: 'Downtown Office',
      people: [],
      tags: ['receipt'],
    };
    const validConn = validateEvidenceConnection(memA, memB, {
      relationshipType: 'same_event',
      relationshipLabel: 'Same Afternoon Cycling Session',
      evidenceReason: 'Both memories share explicit date 1999-06-14 at Oakridge Backyard during cycling.',
    });
    assert.equal(validConn.valid, true, 'Memories sharing date, location, and activity must form a valid connection');

    const weakConn = validateEvidenceConnection(memA, memUnrelated, {
      relationshipType: 'related_story',
      relationshipLabel: 'Unfounded Link',
      evidenceReason: 'Both have a tree in the background.',
    });
    assert.equal(weakConn.valid, false, 'Unrelated memories without shared evidence must not be linked');

    // E. Collection organisation & Unsorted Memories fallback
    const organized = sanitizeAndOrganizeCollections({
      proposedCollections: [
        {
          id: 'col-cycling',
          title: 'Childhood Cycling Adventures',
          subtitle: 'Bicycle Trail • 1999',
          curatorNote: 'Memories from learning to ride in the backyard.',
          memoryIds: ['mem-test-a', 'mem-test-b'],
          suggestedEnvironment: 'bicycle_trail',
          evidenceSummary: 'Shared date 1999-06-14 and cycling activity at Oakridge Backyard.',
          confidenceNote: 'High confidence based on matching date and activity.',
        },
      ],
      existingCollections: [],
      memories: [memA, memB, memUnrelated],
    });
    assert.ok(
      organized.some((c) => c.title === 'Childhood Cycling Adventures' && c.memoryIds.length === 2),
      'Valid multi-item collection must be created',
    );
    const unsortedCol = organized.find((c) => c.title === 'Unsorted Memories');
    assert.ok(
      unsortedCol && unsortedCol.memoryIds.includes('mem-test-c'),
      'Unassigned memory must be placed into Unsorted Memories rather than forced into a fake single-item collection',
    );

    // F. Contextual 3D Catalog (hiddenFrom3D filtering, non-autoplay audio, Bicycle Trail pose loop)
    const videoMem: Memory = {
      ...INITIAL_MEMORIES[0],
      id: 'mem-test-video',
      type: 'video',
      mediaType: 'video',
      title: 'Summer Backyard Film',
      mediaUrl: 'data:video/mp4;base64,AAAA',
      curatedZoneId: 'outdoor_cinema',
    };
    const audioMem: Memory = {
      ...INITIAL_MEMORIES[0],
      id: 'mem-test-audio',
      type: 'audio',
      mediaType: 'audio',
      title: 'Grandfather Bedtime Story',
      mediaUrl: 'data:audio/mp3;base64,AAAA',
      curatedZoneId: 'memory_radio',
    };
    const hiddenMem: Memory = {
      ...memA,
      id: 'mem-test-hidden',
      hiddenFrom3D: true,
    };

    const catalog = buildContextualWorldCatalog(
      [memA, memB, videoMem, audioMem, hiddenMem],
      organized,
    );
    assert.ok(
      catalog.bicycleTrailMemories.some((m) => m.id === 'mem-test-a'),
      'Bicycle trail catalog must include cycling memories',
    );
    assert.ok(
      !catalog.bicycleTrailMemories.some((m) => m.id === 'mem-test-hidden'),
      'Memories marked hiddenFrom3D must be excluded from 3D contextual stations',
    );
    assert.ok(
      catalog.cinemaVideos.some((v) => v.id === 'mem-test-video'),
      'Outdoor cinema catalog must include uploaded video memories',
    );
    assert.ok(
      catalog.audioTracks.some(
        (a) => a.memory.id === 'mem-test-audio' && a.autoplayAllowed === false,
      ),
      'Memory Radio tracks must strictly set autoplayAllowed = false',
    );

    // Verify Bicycle Trail loop stays inside safe room bounds across 0..1
    for (let step = 0; step <= 20; step++) {
      const pose = getBicycleTrailPose(step / 20);
      assert.ok(
        Math.abs(pose.x) <= ROOM_INTERIOR_SPEC.halfWidth - 0.8 &&
          Math.abs(pose.z) <= ROOM_INTERIOR_SPEC.halfDepth - 0.8 &&
          Number.isFinite(pose.yaw),
        `Bicycle trail pose at t=${step / 20} must remain inside room boundaries`,
      );
    }

    console.log('✓ 26. Stage 02 Multi-Format Upload Validation, Fact vs Inference Curation, Collections & Contextual 3D World verified');
  }

  // 27. Visual Sprint V1: Central Atrium Architectural LatheGeometry Builders, Volumetric Sunbeams & Canopy Breeze Sway
  {
    const colBaseGeo = createProfiledColumnBaseLatheGeometry(0.34, 0.26, 20);
    const colShaftGeo = createProfiledColumnShaftLatheGeometry(0.34, 0.31, 5.56, 20);
    const colCapGeo = createProfiledColumnCapitalLatheGeometry(0.31, 0.24, 20);
    const balusterGeo = createProfiledBalusterLatheGeometry(0.96, 14);
    const urnGeo = createProfiledPlanterUrnLatheGeometry(20);

    for (const [name, geo] of [
      ['Column Base Lathe', colBaseGeo],
      ['Column Shaft Lathe', colShaftGeo],
      ['Column Capital Lathe', colCapGeo],
      ['Baluster Lathe', balusterGeo],
      ['Planter Urn Lathe', urnGeo],
    ] as const) {
      assert.ok(
        geo instanceof THREE.LatheGeometry,
        `${name} must be a THREE.LatheGeometry instance`,
      );
      assert.ok(
        geo.getAttribute('position').count > 30,
        `${name} must have rich profiled vertices`,
      );
      assert.ok(
        geo.getAttribute('uv2'),
        `${name} must have uv2 attribute for AO support`,
      );
      geo.dispose();
    }

    const desktopQuality = getVisualQualityConfig('desktop', false);
    const mobileQuality = getVisualQualityConfig('mobile', false);

    const desktopSunbeams = createVolumetricSunbeamShafts({
      quality: desktopQuality,
      totalHeight: 18,
      trackDynamic: (a) => a,
    });
    assert.equal(
      desktopSunbeams.materials.length,
      2,
      'Desktop quality must create 2 translucent volumetric skylight sunbeam shafts',
    );
    const mobileSunbeams = createVolumetricSunbeamShafts({
      quality: mobileQuality,
      totalHeight: 18,
      trackDynamic: (a) => a,
    });
    assert.equal(
      mobileSunbeams.materials.length,
      0,
      'Mobile quality tier must skip volumetric sunbeam shafts to preserve frame budget',
    );

    // Verify Central Tree V1 canopy sway callback and reducedMotion compliance
    const treeGroup = new THREE.Group();
    const dummyMat = new THREE.MeshStandardMaterial();
    const builtTree = populateRefinedAtriumTree({
      centerpieceGroup: treeGroup,
      quality: desktopQuality,
      matWarmLimestone: dummyMat,
      matWalnut: dummyMat,
      matBrushedGold: dummyMat,
      matAlabaster: dummyMat,
      matBark: dummyMat,
      matMossBed: dummyMat,
      matCanopy: dummyMat,
      trackStatic: (a) => a,
    });
    assert.ok(
      builtTree.canopyCrownGroup && typeof builtTree.updateTreeSway === 'function',
      'populateRefinedAtriumTree must return canopyCrownGroup and updateTreeSway callback',
    );
    builtTree.updateTreeSway!(2.4, false);
    assert.ok(
      Math.abs(builtTree.canopyCrownGroup!.rotation.x) > 0 ||
        Math.abs(builtTree.canopyCrownGroup!.rotation.z) > 0,
      'updateTreeSway(elapsed, false) must apply gentle breeze sway rotation to the canopy crown',
    );
    builtTree.updateTreeSway!(2.4, true);
    assert.equal(
      builtTree.canopyCrownGroup!.rotation.x,
      0,
      'updateTreeSway(elapsed, true) must reset canopy rotation to 0 when reducedMotion is active',
    );
    dummyMat.dispose();

    console.log('✓ 27. Visual Sprint V1 Architectural LatheGeometry Builders, Volumetric Sunbeams & Central Tree Breeze Sway verified');
  }

  // =========================================================================
  // 28. CHARACTER UPGRADE & CHARACTER STUDIO (C-a .. C-f)
  // =========================================================================
  {
    // A. Schema validation & fallback safety on corrupt inputs
    const fallbackFromNull = sanitizeCharacterConfig(null);
    assert.deepEqual(
      fallbackFromNull,
      DEFAULT_CHARACTER_CONFIG,
      'sanitizeCharacterConfig(null) must return DEFAULT_CHARACTER_CONFIG',
    );

    const fallbackFromCorrupt = sanitizeCharacterConfig({
      version: 999,
      bodyType: 'invalid_body',
      skinTone: 'not_a_hex',
      hairStyle: 'unknown_hair',
      hairColor: '12345',
      facialHair: 'invalid_beard',
      outfit: 'spacesuit',
      outfitColors: { primary: 'bad', secondary: null, accent: 42 },
      footwear: 'flipflops',
      accessories: {
        glasses: 'monocle',
        headwear: 'crown',
        earrings: 'chandelier',
        watch: 'yes',
        satchel: 123,
        scarf: null,
      },
    });
    assert.deepEqual(
      fallbackFromCorrupt,
      DEFAULT_CHARACTER_CONFIG,
      'sanitizeCharacterConfig with corrupt fields must fall back cleanly to DEFAULT_CHARACTER_CONFIG',
    );

    // B. Versioned localStorage key and persistence round-trip
    assert.equal(
      getCharacterStorageKey('user_42'),
      'memora_character_v1:user_42',
      'User storage key must follow memora_character_v1:<userId>',
    );
    assert.equal(
      getCharacterStorageKey(null),
      'memora_character_v1:guest',
      'Guest storage key must follow memora_character_v1:guest',
    );

    const mockStore = new Map<string, string>();
    const prevLocalStorage = (globalThis as Record<string, unknown>).localStorage;
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => mockStore.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mockStore.set(k, v);
      },
      removeItem: (k: string) => {
        mockStore.delete(k);
      },
    };

    try {
      const customSareeCfg = sanitizeCharacterConfig({
        version: 1,
        bodyType: 'feminine',
        skinTone: CHARACTER_SKIN_TONES[6].hex,
        hairStyle: 'single_braid',
        hairColor: '#181513',
        facialHair: 'none',
        outfit: 'saree',
        outfitColors: {
          primary: '#6E2B32',
          secondary: '#284E3F',
          accent: '#C89B5E',
        },
        footwear: 'sandals',
        accessories: {
          glasses: 'round_brass',
          headwear: 'headband',
          earrings: 'champagne_hoops',
          watch: true,
          satchel: false,
          scarf: false,
        },
      });
      saveCharacterConfigToStorage(customSareeCfg, 'curator_anya');
      const loaded = loadCharacterConfigFromStorage('curator_anya');
      assert.deepEqual(
        loaded,
        customSareeCfg,
        'Saved character config must round-trip identically from localStorage',
      );

      // Corrupt JSON in localStorage must not throw and must return DEFAULT_CHARACTER_CONFIG
      mockStore.set('memora_character_v1:corrupt_user', '{bad json');
      const recovered = loadCharacterConfigFromStorage('corrupt_user');
      assert.deepEqual(
        recovered,
        DEFAULT_CHARACTER_CONFIG,
        'Corrupt JSON in localStorage must safely return DEFAULT_CHARACTER_CONFIG',
      );
    } finally {
      (globalThis as Record<string, unknown>).localStorage = prevLocalStorage;
    }

    // C. Builder verification across all 3 body types, 12 hairstyles, 10 outfits, and triangle budget
    const desktopQuality = getVisualQualityConfig('desktop', false);
    const mobileQuality = getVisualQualityConfig('mobile', false);

    const builtDesktop = buildExplorerCharacter({
      config: DEFAULT_CHARACTER_CONFIG,
      qualityConfig: desktopQuality,
    });

    const initialHeadRef = builtDesktop.headMesh;
    const initialLeftLegRef = builtDesktop.leftLeg;
    const initialRightLegRef = builtDesktop.rightLeg;
    const initialLeftArmRef = builtDesktop.leftArm;
    const initialRightArmRef = builtDesktop.rightArm;

    assert.ok(
      builtDesktop.headMesh.children.length >= 6,
      'headMesh must contain attached facial features (eyes, brows, nose, smile, ears, hair) so head rotation turns them together',
    );

    // Verify all 3 body presets scale height within ±6% and adjust shoulder span
    for (const bt of ['masculine', 'feminine', 'neutral'] as const) {
      builtDesktop.rebuild({ ...DEFAULT_CHARACTER_CONFIG, bodyType: bt });
      const expectedProfile = BODY_PROPORTION_PROFILES[bt];
      assert.equal(
        builtDesktop.charBodyGroup.scale.y,
        expectedProfile.heightScale,
        `Body preset ${bt} must apply heightScale=${expectedProfile.heightScale}`,
      );
      assert.ok(
        Math.abs(builtDesktop.rightArm.position.x - expectedProfile.shoulderHalfSpan) <
          1e-6,
        `Body preset ${bt} must position arms at shoulderHalfSpan=${expectedProfile.shoulderHalfSpan}`,
      );
      // Persistent pivot references must remain identical after rebuild()
      assert.equal(builtDesktop.headMesh, initialHeadRef);
      assert.equal(builtDesktop.leftLeg, initialLeftLegRef);
      assert.equal(builtDesktop.rightLeg, initialRightLegRef);
      assert.equal(builtDesktop.leftArm, initialLeftArmRef);
      assert.equal(builtDesktop.rightArm, initialRightArmRef);
    }

    // Verify all 12 hairstyles and all 10 outfits stay well under < 12k triangles on desktop and < 6k on mobile
    assert.equal(
      CHARACTER_HAIR_STYLE_LABELS.length,
      12,
      'Must provide 12 hair styles',
    );
    assert.equal(
      CHARACTER_OUTFIT_PRESETS.length,
      10,
      'Must provide 10 outfit presets (6 Classic/Contemporary + 4 South-Asian/Heritage)',
    );
    assert.equal(
      CHARACTER_FACIAL_HAIR_LABELS.length,
      5,
      'Must provide 5 facial hair options',
    );
    assert.equal(
      CHARACTER_FOOTWEAR_LABELS.length,
      4,
      'Must provide 4 footwear options',
    );

    for (const outfitPreset of CHARACTER_OUTFIT_PRESETS) {
      for (const hair of CHARACTER_HAIR_STYLE_LABELS) {
        builtDesktop.rebuild({
          ...DEFAULT_CHARACTER_CONFIG,
          bodyType: 'feminine',
          hairStyle: hair.id,
          facialHair: 'full_beard',
          outfit: outfitPreset.id,
          outfitColors: outfitPreset.defaultColors,
          accessories: {
            glasses: 'round_brass',
            headwear: 'curator_cap',
            earrings: 'champagne_hoops',
            watch: true,
            satchel: true,
            scarf: true,
          },
        });
        const metrics = builtDesktop.getMetrics();
        assert.ok(
          metrics.triangles > 100 && metrics.triangles < 12000,
          `Desktop character triangles (${metrics.triangles}) for ${outfitPreset.id}/${hair.id} must be < 12,000`,
        );
      }
    }

    const builtMobile = buildExplorerCharacter({
      config: createRandomCharacterConfig(),
      qualityConfig: mobileQuality,
    });
    const mobileMetrics = builtMobile.getMetrics();
    assert.ok(
      mobileMetrics.triangles > 80 && mobileMetrics.triangles < 6000,
      `Mobile character triangles (${mobileMetrics.triangles}) must be < 6,000`,
    );

    // Verify all 10 TechBuddyPose animations execute cleanly without NaN
    const poses = [
      'idle',
      'walking',
      'running',
      'turning',
      'pointing',
      'waving',
      'sitting',
      'interacting',
      'celebrating',
      'talking',
    ] as const;
    for (const p of poses) {
      builtDesktop.applyPose(p, 1.25, 3.1, 1);
      assert.ok(
        Number.isFinite(builtDesktop.leftLeg.rotation.x) &&
          Number.isFinite(builtDesktop.rightArm.rotation.x) &&
          Number.isFinite(builtDesktop.headMesh.rotation.y),
        `Pose ${p} must produce finite limb and head rotations`,
      );
    }

    builtDesktop.dispose();
    builtMobile.dispose();

    console.log('✓ 28. Character Upgrade & Character Studio (3 Body Types, 12 Hairstyles, 10 Outfits, 10 Poses, LocalStorage Persistence & Triangle Budget) verified');
  }

  // =========================================================================
  // 29. Adaptive Desktop Graphics Recovery (GPU Detection, 5 Profiles & Monitor)
  // =========================================================================
  {
    // A. GPU classification must not rely solely on screen dimensions
    assert.equal(
      classifyGpuCapability('ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0)', false, false),
      'discrete_or_apple_silicon',
    );
    assert.equal(
      classifyGpuCapability('Apple M2 Max', false, false),
      'discrete_or_apple_silicon',
    );
    assert.equal(
      classifyGpuCapability('ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11)', false, false),
      'integrated_desktop',
    );
    assert.equal(
      classifyGpuCapability('Qualcomm Adreno (TM) 740', false, true),
      'mobile_gpu',
    );
    assert.equal(
      classifyGpuCapability('Google SwiftShader', true, false),
      'software',
    );

    // B. Initial profile selection keeps desktop_balanced as safe default (even on RTX or small laptop)
    const integratedDesktop = detectInitialGraphicsProfile({
      viewportWidth: 1440,
      viewportHeight: 900,
      devicePixelRatio: 2,
      hardwareConcurrency: 8,
      deviceMemory: 8,
      isCoarsePointer: false,
      glRenderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)',
      maxTextureSize: 16384,
      isSoftwareGl: false,
    });
    assert.equal(integratedDesktop.profileId, 'desktop_balanced');
    assert.equal(integratedDesktop.isMobileDevice, false);

    const discreteDesktop = detectInitialGraphicsProfile({
      viewportWidth: 2560,
      viewportHeight: 1440,
      devicePixelRatio: 2,
      hardwareConcurrency: 16,
      deviceMemory: 32,
      isCoarsePointer: false,
      glRenderer: 'NVIDIA GeForce RTX 3080',
      maxTextureSize: 16384,
      isSoftwareGl: false,
    });
    assert.equal(discreteDesktop.profileId, 'desktop_balanced', 'Desktop starts safely in desktop_balanced before FPS is measured');
    assert.equal(discreteDesktop.gpuTier, 'discrete_or_apple_silicon');

    const softwareDesktop = detectInitialGraphicsProfile({
      viewportWidth: 1440,
      viewportHeight: 900,
      devicePixelRatio: 1,
      hardwareConcurrency: 4,
      isCoarsePointer: false,
      glRenderer: 'SwiftShader',
      maxTextureSize: 8192,
      isSoftwareGl: true,
    });
    assert.equal(softwareDesktop.profileId, 'desktop_performance');

    const mobilePhone = detectInitialGraphicsProfile({
      viewportWidth: 390,
      viewportHeight: 844,
      devicePixelRatio: 3,
      hardwareConcurrency: 6,
      deviceMemory: 6,
      isCoarsePointer: true,
      glRenderer: 'Apple GPU',
      maxTextureSize: 8192,
      isSoftwareGl: false,
    });
    assert.equal(mobilePhone.profileId, 'mobile_balanced');
    assert.equal(mobilePhone.isMobileDevice, true);

    const constrainedMobile = detectInitialGraphicsProfile({
      viewportWidth: 360,
      viewportHeight: 740,
      devicePixelRatio: 2,
      hardwareConcurrency: 2,
      deviceMemory: 2,
      isCoarsePointer: true,
      glRenderer: 'Mali-G52',
      maxTextureSize: 4096,
      isSoftwareGl: false,
    });
    assert.equal(constrainedMobile.profileId, 'mobile_performance');

    // C. Profile configurations enforce single-pass rendering and preserve mobile reference settings
    const dHigh = getGraphicsProfileConfig('desktop_high');
    const dBal = getGraphicsProfileConfig('desktop_balanced');
    const dPerf = getGraphicsProfileConfig('desktop_performance');
    const mBal = getGraphicsProfileConfig('mobile_balanced');
    const mPerf = getGraphicsProfileConfig('mobile_performance');

    for (const cfg of [dHigh, dBal, dPerf, mBal, mPerf]) {
      assert.equal(cfg.enablePostProcessing, false, `${cfg.profileId} must use single-pass rendering without EffectComposer lag`);
    }
    assert.equal(mBal.shadowMapSize, 512, 'mobile_balanced preserves 512 shadow map reference');
    assert.equal(mBal.treeFoliageInstances, 36);
    assert.equal(mBal.enableFloorLightCulling, false, 'mobile_balanced preserves baseline light behavior');
    assert.equal(dBal.shadowMapSize, 768);
    assert.equal(dBal.maxPixelRatio, 1.0);
    assert.equal(dBal.enableAntialias, false);
    assert.equal(dBal.usePhysicalHeroAccentsOnly, true);
    assert.equal(dBal.enableFloorLightCulling, true);
    assert.equal(dPerf.shadowMapSize, 512);
    assert.equal(dPerf.usePhysicalMaterials, false);
    assert.equal(mPerf.enableShadows, false);

    // D. AdaptiveGraphicsMonitor hysteresis, spike rejection, step-down, and guarded step-up
    const slowMon = new AdaptiveGraphicsMonitor('desktop_balanced', 'integrated_desktop', false);
    // Single background-tab spike > 120ms must be ignored
    assert.equal(slowMon.recordFrame(250, 1000), null);
    let now = 5000;
    let changed: string | null = null;
    for (let i = 0; i < 55; i++) {
      now += 34; // ~29 FPS sustained frame times
      const res = slowMon.recordFrame(34, now);
      if (res) changed = res;
    }
    assert.equal(changed, 'desktop_performance', 'Sustained slow frames must step down desktop_balanced -> desktop_performance');
    assert.equal(slowMon.currentProfileId, 'desktop_performance');

    // Once stepped down, fast frames must NOT thrash back up
    for (let i = 0; i < 140; i++) {
      now += 10;
      const res = slowMon.recordFrame(10, now);
      assert.equal(res, null, 'Stepped-down monitor must stay locked in desktop_performance');
    }

    // Integrated desktop in desktop_balanced must NOT auto-promote to desktop_high
    const intMon = new AdaptiveGraphicsMonitor('desktop_balanced', 'integrated_desktop', false);
    now = 5000;
    for (let i = 0; i < 140; i++) {
      now += 10;
      assert.equal(intMon.recordFrame(10, now), null, 'Integrated GPUs must stay on desktop_balanced');
    }

    // Discrete GPU with sustained < 13.5ms for two 60-frame windows promotes desktop_balanced -> desktop_high
    const gpuMon = new AdaptiveGraphicsMonitor('desktop_balanced', 'discrete_or_apple_silicon', false);
    now = 5000;
    let promoted: string | null = null;
    for (let i = 0; i < 130; i++) {
      now += 50; // advance cooldown across windows cleanly
      const res = gpuMon.recordFrame(10, now);
      if (res) promoted = res;
    }
    assert.equal(promoted, 'desktop_high', 'Sustained fast discrete GPU promotes desktop_balanced -> desktop_high');

    // E. Freeze-stall protection (consecutive >120ms lag frames must trigger step-down, while single spike is ignored)
    const freezeMon = new AdaptiveGraphicsMonitor('desktop_balanced', 'integrated_desktop', false);
    assert.equal(freezeMon.recordFrame(180, 1000), null, 'Single stall frame is ignored');
    assert.equal(freezeMon.recordFrame(185, 1185), null);
    assert.equal(freezeMon.recordFrame(190, 1375), null);
    assert.equal(freezeMon.recordFrame(210, 1585), null);
    assert.equal(
      freezeMon.recordFrame(220, 1805),
      'desktop_performance',
      '5 consecutive severe stall frames (>120ms) must step down desktop_balanced -> desktop_performance',
    );

    // F. Desktop framebuffer pixel budget caps high-res desktop fill-rate while preserving mobile untouched
    const mobilePr = computeEffectivePixelRatio({
      viewportWidth: 390,
      viewportHeight: 844,
      devicePixelRatio: 3,
      qualityConfig: mBal,
      isMobileDevice: true,
      isSoftwareGl: false,
    });
    assert.equal(mobilePr, 1.35, 'Mobile balanced pixel ratio remains untouched');

    const desktop1440Pr = computeEffectivePixelRatio({
      viewportWidth: 2560,
      viewportHeight: 1440,
      devicePixelRatio: 2,
      qualityConfig: dBal,
      isMobileDevice: false,
      isSoftwareGl: false,
    });
    assert.ok(
      desktop1440Pr <= 0.9 && desktop1440Pr >= 0.85,
      `Desktop 1440p balanced pixel ratio (${desktop1440Pr}) must be capped by pixel budget`,
    );

    const swPr = computeEffectivePixelRatio({
      viewportWidth: 1920,
      viewportHeight: 1080,
      devicePixelRatio: 2,
      qualityConfig: dPerf,
      isMobileDevice: false,
      isSoftwareGl: true,
    });
    assert.ok(swPr <= 0.7 && swPr >= 0.65, `Software WebGL pixel ratio (${swPr}) must stay within software pixel budget`);
    assert.equal(getSoftwareGlFrameIntervalMs(true, 'desktop_performance'), 33);
    assert.equal(getSoftwareGlFrameIntervalMs(false, 'desktop_balanced'), 0);

    console.log('✓ 29. Adaptive Desktop Graphics Recovery (GPU Detection, 5 Profiles, Pixel Budget & Freeze Protection) verified');
  }

  // Test 30: Interactive Childhood Bedroom Additive Colliders, TubeGeometry Fix & Bedroom SFX
  {
    const roomColliders = buildRoomInteriorColliders();
    const obbIds = new Set(roomColliders.obbs.map((o: { id: string }) => o.id));
    for (const expectedId of [
      'room_trophy_shelf',
      'room_cork_pinboard',
      'room_drawing_wall',
      'room_bedroom_window',
      'room_memory_radio',
      'room_memory_projector',
      'room_wall_clock_calendar',
    ]) {
      assert.ok(obbIds.has(expectedId), `Missing additive bedroom collider: ${expectedId}`);
    }
    const spawnCheck = resolveSingleStepPosition(0, 5.5, roomColliders, CHARACTER_COLLIDER_RADIUS);
    assert.ok(
      Math.hypot(spawnCheck.x - 0, spawnCheck.z - 5.5) < 0.05,
      'Room spawn (0, 5.5) must remain unobstructed by additive bedroom props',
    );

    const { bedroomSfx } = await import('../bedroomSfx');
    const initialMute = bedroomSfx.isMuted();
    assert.equal(bedroomSfx.toggleMuted(), !initialMute);
    assert.equal(bedroomSfx.toggleMuted(), initialMute);

    console.log('✓ 30. Interactive Childhood Bedroom Colliders, Spawn Clearance & Procedural SFX verified');
  }

  console.log('\nAll 30 Atrium 3D Collision, Architecture, Entry Lighting, Character-Only Doorway Entry, 3D Exhibition Room, Spotify Audio, Elevator, Gemini Category, 3D Asset/GSAP, Room Doors, Stage 00.5 Camera/Visibility, Stage 01 & Stage 01B Visual Standards, Stage 02 AI Curation, Visual Sprint V1, Character Studio, MEMORA Brand, Adaptive Desktop Graphics & Childhood Bedroom Interaction tests passed!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});


