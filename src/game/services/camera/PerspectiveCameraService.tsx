'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import type { PerspectiveCamera as PerspectiveCameraType } from 'three';
import type { Group } from 'three';
import type { RefObject } from 'react';

export interface PerspectiveCameraConfig {
  fov: number;
  near: number;
  far: number;
  offset: [number, number, number];
  lookatOffset: [number, number, number];
}

export const DEFAULT_PERSPECTIVE_CONFIG: PerspectiveCameraConfig = {
  fov: 30,
  near: 0.1,
  far: 1000,
  offset: [0, 5.5, 25],
  lookatOffset: [0, 4, 0],
};

interface PerspectiveCameraServiceProps {
  targetRef: RefObject<Group | null>;
  config?: Partial<PerspectiveCameraConfig>;
}

export function PerspectiveCameraService({
  targetRef,
  config,
}: PerspectiveCameraServiceProps) {
  const cameraRef = useRef<PerspectiveCameraType>(null);
  const { fov, near, far, offset, lookatOffset } = {
    ...DEFAULT_PERSPECTIVE_CONFIG,
    ...config,
  };

  useFrame(() => {
    const target = targetRef.current;
    const camera = cameraRef.current;
    if (!target || !camera) return;

    camera.position.x = target.position.x + offset[0];
    camera.position.y = target.position.y + offset[1];
    camera.position.z = target.position.z + offset[2];
    camera.lookAt(target.position.x + lookatOffset[0], target.position.y + lookatOffset[1], target.position.z + lookatOffset[2]);
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
