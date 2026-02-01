'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useModel } from '../models';
import { createToonMaterial } from '../shaders/toonShader';
import { InkEdgesGroup } from '../shaders/inkEdges';

export const Pedestal = forwardRef<Group, ThreeElements['group']>(function Pedestal(props, ref) {
  const localRef = useRef<Group>(null);
  const { scene } = useModel('pedestal');

  useImperativeHandle(ref, () => localRef.current!);

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
    <group ref={localRef} {...props}>
      <primitive object={cloned} />
      <InkEdgesGroup
        target={localRef}
        seed={42}
        width={3}
        gapFreq={10}
        gapThreshold={0.38}
      />
    </group>
  );
});
