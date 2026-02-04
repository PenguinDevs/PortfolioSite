'use client';

import type { ThreeElements } from '@react-three/fiber';
import { Sign } from '../entities';

type ProjectsSectionProps = ThreeElements['group'];

export function ProjectsSection(props: ProjectsSectionProps) {
  return (
    <group {...props}>
      <Sign position={[0, 0, -4]} rotation={[0, 0, 0]} rows={['', 'Projects', '', '']} />
    </group>
  );
}
