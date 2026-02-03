'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import type { PerspectiveCamera as PerspectiveCameraType } from 'three';
import type { Group } from 'three';
import type { RefObject } from 'react';
import { Spring } from '../../math';
import { InputAction, type InputState } from '../../types';

export interface PerspectiveCameraConfig {
  fov: number;
  near: number;
  far: number;
  offset: [number, number, number];
  lookatOffset: [number, number, number];
  // Spring tuning for horizontal follow
  springSpeed: number;
  springDamper: number;
  // How far ahead the camera leads when the player is moving
  leadDistance: number;
}

export const DEFAULT_PERSPECTIVE_CONFIG: PerspectiveCameraConfig = {
  fov: 30,
  near: 0.1,
  far: 1000,
  offset: [0, 5.5, 25],
  lookatOffset: [0, 4, 0],
  springSpeed: 5,
  springDamper: 1,
  leadDistance: 6,
};

interface PerspectiveCameraServiceProps {
  targetRef: RefObject<Group | null>;
  inputRef: RefObject<InputState>;
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
    springSpeed, springDamper, leadDistance,
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
    const input = inputRef.current;
    if (!target || !camera || !input) return;

    // Compute movement direction from input so we can lead the camera ahead
    let dx = 0;
    if (input[InputAction.Left]) dx -= 1;
    if (input[InputAction.Right]) dx += 1;

    // Spring target is the player position plus a lead offset in the movement direction
    xSpring.targetValue = target.position.x + dx * leadDistance;
    const springX = xSpring.value;

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
