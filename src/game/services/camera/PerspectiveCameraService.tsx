'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import type { PerspectiveCamera as PerspectiveCameraType } from 'three';
import type { Group } from 'three';
import type { RefObject } from 'react';
import { Spring } from '../../math';
import type { InputHandle } from '../../inputs';
import { InputAction } from '../../types';

export interface PerspectiveCameraConfig {
  fov: number;
  near: number;
  far: number;
  offset: [number, number, number];
  lookatOffset: [number, number, number];
  // Spring tuning for horizontal follow
  springSpeed: number;
  springDamper: number;
  // How far ahead the camera leads as a fraction of visible screen width (0-1)
  leadPercent: number;
  // Minimum margin from screen edge as a fraction of visible width (0-0.5)
  // Penguin is clamped to stay within this margin on each side
  edgeMargin: number;
}

export const DEFAULT_PERSPECTIVE_CONFIG: PerspectiveCameraConfig = {
  fov: 30,
  near: 0.1,
  far: 1000,
  offset: [0, 5.5, 25],
  lookatOffset: [0, 4, 0],
  springSpeed: 5,
  springDamper: 1,
  leadPercent: 0.25,
  edgeMargin: 0.1,
};

interface PerspectiveCameraServiceProps {
  targetRef: RefObject<Group | null>;
  inputRef: RefObject<InputHandle>;
  config?: Partial<PerspectiveCameraConfig>;
}

export function PerspectiveCameraService({
  targetRef,
  inputRef,
  config,
}: PerspectiveCameraServiceProps) {
  const cameraRef = useRef<PerspectiveCameraType>(null);
  const {
    fov, near, far, offset, lookatOffset,
    springSpeed, springDamper, leadPercent, edgeMargin,
  } = {
    ...DEFAULT_PERSPECTIVE_CONFIG,
    ...config,
  };

  const xSpring = useMemo(() => {
    const s = Spring.scalar(0);
    s.speed = springSpeed;
    s.damper = springDamper;
    return s;
  }, [springSpeed, springDamper]);

  useFrame(() => {
    const target = targetRef.current;
    const camera = cameraRef.current;
    const handle = inputRef.current;
    if (!target || !camera || !handle) return;

    // Compute movement direction from input so we can lead the camera ahead
    const input = handle.state;
    let dx = 0;
    if (input[InputAction.Left]) dx -= 1;
    if (input[InputAction.Right]) dx += 1;

    // Compute visible width at the target's depth so lookahead scales with screen size
    const fovRad = camera.fov * (Math.PI / 180);
    const visibleWidth = 2 * offset[2] * Math.tan(fovRad / 2) * camera.aspect;
    const leadDistance = visibleWidth * leadPercent;

    // Spring target is the player position plus a lead offset in the movement direction
    xSpring.targetValue = target.position.x + dx * leadDistance;
    let springX = xSpring.value;

    // Clamp so the penguin never leaves the visible screen area
    const halfVisible = visibleWidth / 2;
    const margin = visibleWidth * edgeMargin;
    // Camera must be close enough that the penguin sits within the safe zone
    const minCameraX = target.position.x - halfVisible + margin + offset[0];
    const maxCameraX = target.position.x + halfVisible - margin + offset[0];
    const clampedX = Math.max(minCameraX, Math.min(maxCameraX, springX + offset[0]));

    // If the clamp kicked in, sync the spring so it doesn't fight back next frame
    if (clampedX !== springX + offset[0]) {
      springX = clampedX - offset[0];
      xSpring.value = springX;
    }

    camera.position.x = springX + offset[0];
    camera.position.y = target.position.y + offset[1];
    camera.position.z = target.position.z + offset[2];
    camera.lookAt(
      springX + lookatOffset[0],
      target.position.y + lookatOffset[1],
      target.position.z + lookatOffset[2],
    );
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={fov}
      near={near}
      far={far}
    />
  );
}
