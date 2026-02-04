'use client';

import { useCallback, useRef } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { Pedestal } from './Pedestal';
import { ProximityPrompt } from '../components';
import { useAwardOverlay } from '../contexts/AwardOverlayContext';
import type { AwardData } from '../contexts/AwardOverlayContext';

export type PedestalAwardProps = ThreeElements['group'] & {
  award: AwardData;
};

export function PedestalAward({ award, ...props }: PedestalAwardProps) {
  const groupRef = useRef<Group>(null);
  const { showAward } = useAwardOverlay();

  const handleInteract = useCallback(() => {
    showAward(award);
  }, [showAward, award]);

  return (
    <group ref={groupRef} {...props}>
      <Pedestal />
      <ProximityPrompt
        onInteract={handleInteract}
        actionText="View"
        objectText={`${award.title}\n${award.secondaryText}`}
        maxDistance={3}
      />
    </group>
  );
}
