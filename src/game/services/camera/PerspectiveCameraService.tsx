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
  position: [number, number, number];
  offset: [number, number];
}

export const DEFAULT_PERSPECTIVE_CONFIG: PerspectiveCameraConfig = {
  fov: 25,
  near: 0.1,
  far: 1000,
  position: [0, 0, 10],
  offset: [0, 0],
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
  const { fov, near, far, position, offset } = {
    ...DEFAULT_PERSPECTIVE_CONFIG,
    ...config,
  };

  useFrame(() => {
    const target = targetRef.current;
    const camera = cameraRef.current;
    if (!target || !camera) return;

    camera.position.x = target.position.x + offset[0];
    camera.position.y = target.position.y + offset[1];
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={fov}
      near={near}
      far={far}
      position={position}
    />
  );
}
