'use client';

import { useEffect, useState } from 'react';
import { TextureLoader } from 'three';
import type { Texture } from 'three';
import { AlleyGround, LightSwitch, NameTitle, Sign, WallFrame } from '../entities';

// penguin frame dimensions (world units)
const PENGUIN_CONTENT_WIDTH = 3;
const PENGUIN_CONTENT_HEIGHT = 4;

const PENGUIN_IMAGE_PATH = '/assets/images/penguin_fullshot.png';

function PenguinImage() {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    const loader = new TextureLoader();
    loader.load(PENGUIN_IMAGE_PATH, setTexture);
    return () => {
      if (texture) texture.dispose();
    };
    // only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!texture) return null;

  return (
    <mesh>
      <planeGeometry args={[PENGUIN_CONTENT_WIDTH, PENGUIN_CONTENT_HEIGHT]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

export function HomeSection() {
  return (
    <group>
      <NameTitle position={[0, 8, -4]} />

      <AlleyGround />

      <Sign position={[2.5, 0, -4]} rotation={[0, 0, 0]} rows={['', '--->', '', '']} />

      <WallFrame
        position={[24, 6, -12]}
        contentWidth={PENGUIN_CONTENT_WIDTH}
        contentHeight={PENGUIN_CONTENT_HEIGHT}
        seed={42}
      >
        <PenguinImage />
      </WallFrame>

      <Sign position={[24, 0, -4]} rotation={[0, 0, 0]} rows={['Only if it', 'really hurts', '|', '∀']} />
      <LightSwitch position={[24, 0, -2]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}
