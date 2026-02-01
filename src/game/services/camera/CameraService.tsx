'use client';

import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import type { RefObject } from 'react';

interface CameraServiceProps {
  targetRef: RefObject<Group | null>;
}

export function CameraService({ targetRef }: CameraServiceProps) {
  const camera = useThree(state => state.camera);

  useFrame(() => {
    const target = targetRef.current;
    if (!target) return;

    camera.position.x = target.position.x;
    camera.position.y = target.position.y + 2;
  });

  return null;
}
