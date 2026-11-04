'use client';

import { ExperienceLanyards, ExperiencePinboard, Sign } from '../entities';
import { useIsTouchDevice } from '../hooks';

// the section's CircularSlot sits at the middle of the pinboard, which is the
// desktop nav target in constants/sections.ts
const SIGN_X = -18;
// touch devices get a row of hanging badges instead, starting by the sign.
// the touch nav target in constants/sections.ts frames the first two of them
const LANYARDS_X = -19;

export function ExperienceSection() {
  const isTouch = useIsTouchDevice();

  return (
    <group>
      <Sign position={[SIGN_X, 0, -4]} rotation={[0, 0, 0]} rows={['', 'Experience', '---->', '']} />
      {isTouch ? <ExperienceLanyards position={[LANYARDS_X, 0, 0]} /> : <ExperiencePinboard />}
    </group>
  );
}
