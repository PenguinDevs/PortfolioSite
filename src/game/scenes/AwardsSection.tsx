'use client';

import type { ThreeElements } from '@react-three/fiber';
import { PedestalAward, Sign } from '../entities';
import { useAwardOverlay } from '../contexts/AwardOverlayContext';

// spacing between each pedestal along the x axis
const PEDESTAL_SPACING = 4;
const PEDESTAL_Z = -2;

type AwardsSectionProps = ThreeElements['group'];

export function AwardsSection(props: AwardsSectionProps) {
  const { awards } = useAwardOverlay();

  // centre the row so the midpoint sits at x=0
  const totalWidth = (awards.length - 1) * PEDESTAL_SPACING;
  const startX = -totalWidth / 2;

  return (
    <group {...props}>
      <Sign position={[-12, 0, -4]} rotation={[0, 0, 0]} rows={['', 'Awards', '---->', '']} />

      {awards.map((award, i) => (
        <PedestalAward
          key={award.id}
          position={[startX + i * PEDESTAL_SPACING, 0, PEDESTAL_Z]}
          award={award}
        />
      ))}
    </group>
  );
}
