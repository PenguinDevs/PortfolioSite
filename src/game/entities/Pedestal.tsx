'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityModel } from '../models';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { LightingMode } from '../types';
import { INK_EDGE_COLOUR } from '../constants';

export const Pedestal = forwardRef<Group, ThreeElements['group']>(function Pedestal(props, ref) {
  const localRef = useRef<Group>(null);
  const { cloned } = useEntityModel('pedestal', { color: '#d4cfc8', shadowColor: '#8a8078' });

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
      />
    </group>
  );
});
