'use client';

import { useCallback, useRef } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import type { Group } from 'three';
import { Lever } from './Lever';
import type { LeverHandle } from './Lever';
import { ProximityPrompt } from '../components';
import { LightingService } from '../services';

export function LightSwitch(props: ThreeElements['group']) {
  const groupRef = useRef<Group>(null);
  const leverRef = useRef<LeverHandle>(null);

  const handleInteract = useCallback(() => {
    leverRef.current?.toggle();
    LightingService.toggle();
  }, []);

  return (
    <group ref={groupRef} {...props}>
      <Lever ref={leverRef} />
      <ProximityPrompt
        onInteract={handleInteract}
        actionText="Flip"
        objectText="Light Switch"
        maxDistance={3}
      />
    </group>
  );
}
