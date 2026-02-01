'use client';

import { forwardRef, useMemo } from 'react';
import type { Group, Mesh } from 'three';
import type { GroupProps } from '@react-three/fiber';
import { useModel } from '../models';
import { createToonMaterial } from '../shaders/toonShader';

export const Pedestal = forwardRef<Group, GroupProps>(function Pedestal(props, ref) {
  const { scene } = useModel('pedestal');

  const material = useMemo(
    () => createToonMaterial({ color: '#d4cfc8', shadowColor: '#8a8078' }),
    [],
  );

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).material = material;
      }
    });
    return clone;
  }, [scene, material]);

  return (
    <group ref={ref} {...props}>
      <primitive object={cloned} />
    </group>
  );
});
