'use client';

import type { ThreeElements } from '@react-three/fiber';
import { Pedestal, Sign } from '../entities';

type AwardsSectionProps = ThreeElements['group'];

export function AwardsSection(props: AwardsSectionProps) {
  return (
    <group {...props}>
      <Sign position={[0, 0, -4]} rotation={[0, 0, 0]} rows={['', 'Awards', '', '']} />
      <Pedestal position={[0, 0, -2]} />
    </group>
  );
}
