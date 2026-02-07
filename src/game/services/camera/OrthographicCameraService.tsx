'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import type { OrthographicCamera as OrthographicCameraType } from 'three';
import type { Group } from 'three';
import type { RefObject } from 'react';
import { pickDefined } from '../../utils';

export interface OrthographicCameraConfig {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  near: number;
  far: number;
  zoom: number;
  position: [number, number, number];
  offset: [number, number, number];
  lookatOffset: [number, number, number];
}

export const DEFAULT_ORTHOGRAPHIC_CONFIG: OrthographicCameraConfig = {
  near: 0,
  far: 1000,
  zoom: 70,
  position: [0, 10, 10],
  offset: [0, 1.6, 2],
  lookatOffset: [0, 1.2, 0],
};

interface OrthographicCameraServiceProps {
  targetRef: RefObject<Group | null>;
  config?: Partial<OrthographicCameraConfig>;
}

export function OrthographicCameraService({ targetRef, config }: OrthographicCameraServiceProps) {
  const cameraRef = useRef<OrthographicCameraType>(null);
  const { left, right, top, bottom, near, far, zoom, position, offset, lookatOffset } = {
    ...DEFAULT_ORTHOGRAPHIC_CONFIG,
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
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      {...pickDefined({ left, right, top, bottom })}
      near={near}
      far={far}
      zoom={zoom}
      position={position}
    />
  );
}
