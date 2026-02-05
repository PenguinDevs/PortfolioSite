'use client';

import { AlleyGround, LightSwitch, NameTitle, Sign } from '../entities';

export function HomeSection() {
  return (
    <group>
      <NameTitle position={[0, 8, -4]} />

      <AlleyGround />

      <Sign position={[2.5, 0, -4]} rotation={[0, 0, 0]} rows={['', '--->', '', '']} />

      <Sign position={[24, 0, -4]} rotation={[0, 0, 0]} rows={['Only if it', 'really hurts', '|', '∀']} />
      <LightSwitch position={[24, 0, -2]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}
