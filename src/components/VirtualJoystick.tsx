/**
 * MEMORA — Smooth Analog Virtual Joystick for Android, Mobile & Touch Tablets
 *
 * Replaces rigid directional buttons on touch devices with a continuous 360°
 * analog thumb stick outputting normalized { x, y } in [-1..1] with deadzone
 * filtering, pointer capture, and zero backdrop-filter overhead over WebGL.
 */

import React, { useCallback, useRef, useState } from 'react';

export interface VirtualJoystickVector {
  /** Horizontal strafe [-1 = left, +1 = right] */
  x: number;
  /** Vertical movement [-1 = backward, +1 = forward] */
  y: number;
  /** Normalized deflection magnitude [0..1] */
  magnitude: number;
  /** Whether the thumb is actively dragging */
  active: boolean;
}

interface VirtualJoystickProps {
  onChange: (vector: VirtualJoystickVector) => void;
  sizePx?: number;
  className?: string;
}

const DEADZONE = 0.12;

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onChange,
  sizePx = 112,
  className = '',
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPressed, setIsPressed] = useState(false);

  const maxRadius = Math.max(24, sizePx * 0.36);

  const emitZero = useCallback(() => {
    setKnobOffset({ x: 0, y: 0 });
    setIsPressed(false);
    onChange({ x: 0, y: 0, magnitude: 0, active: false });
  }, [onChange]);

  const updateFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = baseRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;

      const rawDx = clientX - centerX;
      const rawDy = clientY - centerY;
      const dist = Math.hypot(rawDx, rawDy);

      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(rawDy, rawDx);
      const clampedX = Math.cos(angle) * clampedDist;
      const clampedY = Math.sin(angle) * clampedDist;

      setKnobOffset({ x: clampedX, y: clampedY });

      const rawMag = maxRadius > 0 ? clampedDist / maxRadius : 0;
      if (rawMag < DEADZONE) {
        onChange({ x: 0, y: 0, magnitude: 0, active: true });
        return;
      }

      const scaledMag = (rawMag - DEADZONE) / (1 - DEADZONE);
      const normX = (clampedX / maxRadius) * (scaledMag / rawMag);
      // Screen -Y is forward (+1) in 3D character movement
      const normY = -(clampedY / maxRadius) * (scaledMag / rawMag);

      onChange({
        x: Math.max(-1, Math.min(1, normX)),
        y: Math.max(-1, Math.min(1, normY)),
        magnitude: Math.min(1, scaledMag),
        active: true,
      });
    },
    [maxRadius, onChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (activePointerIdRef.current !== null) return;
    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors on synthetic test events
    }
    setIsPressed(true);
    updateFromClientPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateFromClientPoint(e.clientX, e.clientY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    activePointerIdRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }
    emitZero();
  };

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="Virtual movement joystick"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onLostPointerCapture={() => {
        if (activePointerIdRef.current !== null) {
          activePointerIdRef.current = null;
          emitZero();
        }
      }}
      style={{
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        touchAction: 'none',
      }}
      className={`relative select-none rounded-full bg-[#171412]/88 border transition-colors ${
        isPressed ? 'border-[#D8B47C]' : 'border-[#D8B47C]/45'
      } shadow-lg flex items-center justify-center ${className}`}
    >
      {/* Inner compass reference ring */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 rounded-full border border-[#D8B47C]/20"
      />
      {/* Directional N/S/E/W subtle tick markers */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1.5 text-[9px] font-mono-tabular text-[#D8B47C]/70"
      >
        ▲
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1.5 text-[9px] font-mono-tabular text-[#D8B47C]/50"
      >
        ▼
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-2 text-[9px] font-mono-tabular text-[#D8B47C]/50"
      >
        ◀
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2 text-[9px] font-mono-tabular text-[#D8B47C]/50"
      >
        ▶
      </span>

      {/* Movable thumb knob */}
      <div
        aria-hidden="true"
        style={{
          transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
        }}
        className={`pointer-events-none w-11 h-11 rounded-full border transition-colors ${
          isPressed
            ? 'bg-[#D8B47C] border-[#FFF3DC] shadow-md'
            : 'bg-[#3A2B20] border-[#D8B47C]/80'
        } flex items-center justify-center`}
      >
        <div
          className={`w-3 h-3 rounded-full ${
            isPressed ? 'bg-[#171412]' : 'bg-[#D8B47C]/85'
          }`}
        />
      </div>
    </div>
  );
};
