'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import type { OrthographicCamera as OrthographicCameraType } from 'three';
import type { Group } from 'three';
import type { RefObject } from 'react';
import { pickDefined } from '../../utils';

export interface CameraConfig {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  near: number;
  far: number;
  zoom: number;
  position: [number, number, number];
  offset: [number, number];
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  near: 0.1,
  far: 100,
  zoom: 80,
  position: [0, 0, 10],
  offset: [0, 0],
};

interface CameraServiceProps {
  targetRef: RefObject<Group | null>;
  config?: Partial<CameraConfig>;
}

export function CameraService({ targetRef, config }: CameraServiceProps) {
  const cameraRef = useRef<OrthographicCameraType>(null);
  const { left, right, top, bottom, near, far, zoom, position, offset } = {
    ...DEFAULT_CAMERA_CONFIG,
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
