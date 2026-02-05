'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityModel } from '../models';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { LightingMode } from '../types';
import { INK_EDGE_COLOUR } from '../constants';
import type { EntityRevealResult } from '../hooks';

export type PedestalProps = ThreeElements['group'] & {
  // optional reveal props passed from a parent entity (e.g. PedestalAward)
  reveal?: Pick<EntityRevealResult, 'drawProgress' | 'connectMaterial'>;
};

export const Pedestal = forwardRef<Group, PedestalProps>(function Pedestal({ reveal, ...props }, ref) {
  const localRef = useRef<Group>(null);
  const { cloned, material } = useEntityModel('pedestal', { color: '#d4cfc8', shadowColor: '#8a8078' });

  useEffect(() => {
    if (reveal) {
      reveal.connectMaterial(material);
    }
  }, [material, reveal]);

  useImperativeHandle(ref, () => localRef.current!);

  return (
    <group ref={localRef} {...props}>
      <primitive object={cloned} />
      <InkEdgesGroup
        target={localRef}
        colour={INK_EDGE_COLOUR[LightingMode.Light]}
        darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
        seed={42}
        width={3}
        gapFreq={10}
        gapThreshold={0.38}
        drawProgress={reveal?.drawProgress}
      />
    </group>
  );
});
