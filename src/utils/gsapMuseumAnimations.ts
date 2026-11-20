/**
 * MEMORA — Reusable GSAP 3D Animation & Camera Timeline Utilities
 * (`src/utils/gsapMuseumAnimations.ts`)
 *
 * Provides reusable, reduced-motion-aware GSAP animations for Three.js objects
 * and camera choreography, alongside the official `@gsap/react` `useGSAP` hook
 * for automatic React 19 component unmount cleanup.
 *
 * Note: React DOM/UI animations continue using `motion`. This module is dedicated
 * to coordinated 3D object timelines, artifact reveals, and cinematic camera transitions.
 */

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import * as THREE from 'three';

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

export interface AnimationCleanupHandle {
  /** Immediately kills the active tween or timeline and frees references */
  kill: () => void;
  /** Pauses the animation */
  pause: () => void;
  /** Resumes the animation */
  resume: () => void;
  /** Underlying GSAP Tween or Timeline instance */
  animation: gsap.core.Animation;
  /** Optional status helper indicating if the animation is still active */
  isActive?: () => boolean;
}

export interface ObjectRotationOptions {
  /** Target Y rotation delta in radians (default: Math.PI * 2 for a full turntable revolution) */
  deltaY?: number;
  /** Optional target X tilt in radians */
  targetX?: number;
  /** Duration in seconds (default: 2.4) */
  duration?: number;
  /** GSAP easing function (default: 'power2.inOut') */
  ease?: string;
  /** Number of repeats (-1 for infinite gentle idle turntable, 0 for single turn; default: 0) */
  repeat?: number;
  /** Respect `prefers-reduced-motion` / `museumSettings.reducedMotion` (default: false) */
  reducedMotion?: boolean;
  /** Optional completion callback */
  onComplete?: () => void;
}

/**
 * 1. Reusable 3D Object Rotation Helper
 * Smoothly rotates a Three.js `Object3D` around its axis (e.g. artifact inspection or idle showcase).
 * Returns a cleanup handle whose `.kill()` method stops the tween on unmount.
 */
export function animateObjectRotation3D(
  target: THREE.Object3D,
  options: ObjectRotationOptions = {},
): AnimationCleanupHandle {
  const {
    deltaY = Math.PI * 2,
    targetX,
    duration = 2.4,
    ease = 'power2.inOut',
    repeat = 0,
    reducedMotion = false,
    onComplete,
  } = options;

  if (reducedMotion) {
    if (typeof targetX === 'number') {
      target.rotation.x = targetX;
    }
    const noopTl = gsap.timeline();
    onComplete?.();
    return {
      kill: () => noopTl.kill(),
      pause: () => noopTl.pause(),
      resume: () => noopTl.resume(),
      animation: noopTl,
      isActive: () => false,
    };
  }

  const tweenVars: gsap.TweenVars = {
    y: target.rotation.y + deltaY,
    duration,
    ease,
    repeat,
    overwrite: 'auto',
    onComplete,
  };

  if (typeof targetX === 'number') {
    tweenVars.x = targetX;
  }

  const tween = gsap.to(target.rotation, tweenVars);

  return {
    kill: () => {
      tween.kill();
    },
    pause: () => {
      tween.pause();
    },
    resume: () => {
      tween.resume();
    },
    animation: tween,
    isActive: () => tween.isActive(),
  };
}

export interface ObjectEntranceOptions {
  /** Final resting position `[x, y, z]` (defaults to target's current position) */
  targetPosition?: [number, number, number];
  /** Vertical offset in meters from which the object rises (default: -0.45) */
  startOffsetY?: number;
  /** Initial uniform scale factor (default: 0.72) */
  startScale?: number;
  /** Final uniform scale factor (default: 1.0) */
  endScale?: number;
  /** Total entrance duration in seconds (default: 0.85) */
  duration?: number;
  /** Respect reduced motion by snapping directly to final state (default: false) */
  reducedMotion?: boolean;
  /** Optional completion callback */
  onComplete?: () => void;
}

/**
 * 2. Smooth 3D Object Entrance Timeline
 * Coordinates elevation rise, uniform scale-in, and subtle yaw settle for newly revealed
 * 3D memory artifacts or exhibition props.
 */
export function animateObjectEntrance3D(
  target: THREE.Object3D,
  options: ObjectEntranceOptions = {},
): AnimationCleanupHandle {
  const {
    targetPosition = [target.position.x, target.position.y, target.position.z],
    startOffsetY = -0.45,
    startScale = 0.72,
    endScale = 1.0,
    duration = 0.85,
    reducedMotion = false,
    onComplete,
  } = options;

  const [finalX, finalY, finalZ] = targetPosition;
  const finalRotY = target.rotation.y;

  if (reducedMotion) {
    target.position.set(finalX, finalY, finalZ);
    target.scale.setScalar(endScale);
    target.rotation.y = finalRotY;
    const noopTl = gsap.timeline();
    onComplete?.();
    return {
      kill: () => noopTl.kill(),
      pause: () => noopTl.pause(),
      resume: () => noopTl.resume(),
      animation: noopTl,
      isActive: () => false,
    };
  }

  target.position.set(finalX, finalY + startOffsetY, finalZ);
  target.scale.setScalar(startScale);
  target.rotation.y = finalRotY - 0.28;

  const tl = gsap.timeline({
    onComplete,
  });

  tl.to(
    target.position,
    {
      x: finalX,
      y: finalY,
      z: finalZ,
      duration,
      ease: 'power3.out',
    },
    0,
  )
    .to(
      target.scale,
      {
        x: endScale,
        y: endScale,
        z: endScale,
        duration: duration * 0.92,
        ease: 'back.out(1.35)',
      },
      0,
    )
    .to(
      target.rotation,
      {
        y: finalRotY,
        duration,
        ease: 'power2.out',
      },
      0,
    );

  return {
    kill: () => {
      tl.kill();
    },
    pause: () => {
      tl.pause();
    },
    resume: () => {
      tl.resume();
    },
    animation: tl,
    isActive: () => tl.isActive(),
  };
}

export interface CameraWaypoint {
  /** Target camera world position `[x, y, z]` */
  position: [number, number, number];
  /** Target camera look-at world point `[x, y, z]` */
  lookAt: [number, number, number];
  /** Segment duration in seconds (default: 1.2) */
  duration?: number;
  /** Segment easing (default: 'power2.inOut') */
  ease?: string;
}

export interface CameraTransitionOptions {
  /** Respect reduced-motion preference by jumping directly to the final waypoint */
  reducedMotion?: boolean;
  /** Invoked on every tween tick after `camera.lookAt(lookAtTarget)` updates */
  onFrameUpdate?: () => void;
  /** Invoked when the entire camera timeline finishes normally */
  onComplete?: () => void;
  /** Invoked if the timeline is cancelled early (e.g. by player movement or unmount) */
  onInterrupt?: () => void;
}

/**
 * 3. Coordinated Camera Transition Timeline
 * Animates a Three.js `Camera` and its `lookAtTarget` vector through one or more
 * cinematic waypoints, keeping `camera.lookAt(lookAtTarget)` synchronized each frame.
 */
export function createCameraTransitionTimeline(
  camera: THREE.Camera,
  lookAtTarget: THREE.Vector3,
  waypoints: CameraWaypoint[],
  options: CameraTransitionOptions = {},
): AnimationCleanupHandle {
  const {
    reducedMotion = false,
    onFrameUpdate,
    onComplete,
    onInterrupt,
  } = options;

  if (waypoints.length === 0) {
    const emptyTl = gsap.timeline();
    onComplete?.();
    return {
      kill: () => emptyTl.kill(),
      pause: () => emptyTl.pause(),
      resume: () => emptyTl.resume(),
      animation: emptyTl,
      isActive: () => false,
    };
  }

  if (reducedMotion) {
    const last = waypoints[waypoints.length - 1];
    camera.position.set(last.position[0], last.position[1], last.position[2]);
    lookAtTarget.set(last.lookAt[0], last.lookAt[1], last.lookAt[2]);
    camera.lookAt(lookAtTarget);
    onFrameUpdate?.();
    onComplete?.();
    const noopTl = gsap.timeline();
    return {
      kill: () => noopTl.kill(),
      pause: () => noopTl.pause(),
      resume: () => noopTl.resume(),
      animation: noopTl,
      isActive: () => false,
    };
  }

  let completedNaturally = false;
  let wasKilled = false;
  const tl = gsap.timeline({
    onUpdate: () => {
      if (wasKilled) return;
      camera.lookAt(lookAtTarget);
      onFrameUpdate?.();
    },
    onComplete: () => {
      if (wasKilled) return;
      completedNaturally = true;
      onComplete?.();
    },
  });

  waypoints.forEach((wp) => {
    const segDuration = wp.duration ?? 1.2;
    const segEase = wp.ease ?? 'power2.inOut';

    tl.to(camera.position, {
      x: wp.position[0],
      y: wp.position[1],
      z: wp.position[2],
      duration: segDuration,
      ease: segEase,
    }).to(
      lookAtTarget,
      {
        x: wp.lookAt[0],
        y: wp.lookAt[1],
        z: wp.lookAt[2],
        duration: segDuration,
        ease: segEase,
      },
      '<',
    );
  });

  return {
    kill: () => {
      if (wasKilled) return;
      const inFlight =
        !completedNaturally && (tl.isActive() || tl.progress() < 1);
      wasKilled = true;
      tl.kill();
      if (inFlight) {
        onInterrupt?.();
      }
    },
    pause: () => {
      tl.pause();
    },
    resume: () => {
      tl.resume();
    },
    animation: tl,
    isActive: () =>
      !wasKilled && !completedNaturally && !tl.paused() && (tl.isActive() || tl.progress() < 1),
  };
}

/**
 * 4. Official `@gsap/react` Hook Wrapper for Scoped 3D / UI Timelines
 * Automatically scopes all GSAP animations created inside `setupEffect` to a GSAP context
 * and reverts/kills them cleanly when the owning React component unmounts or `dependencies` change.
 */
export function useScopedMuseumGSAP(
  setupEffect: (context: gsap.Context, contextSafe?: gsap.ContextSafeFunc) => void | (() => void),
  dependencies: unknown[] = [],
) {
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    (context, contextSafe) => {
      return setupEffect(context, contextSafe);
    },
    {
      scope: scopeRef,
      dependencies,
      revertOnUpdate: true,
    },
  );

  return scopeRef;
}
