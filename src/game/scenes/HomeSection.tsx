'use client';

import { useEffect, useRef, useState } from 'react';
import { MeshBasicMaterial, TextureLoader } from 'three';
import type { Texture } from 'three';
import { useFrame } from '@react-three/fiber';
import { AlleyGround, LightSwitch, NameTitle, Sign, WallFrame } from '../entities';

// penguin frame dimensions (world units)
const PENGUIN_CONTENT_WIDTH = 3;
const PENGUIN_CONTENT_HEIGHT = 4;

const PENGUIN_IMAGE_PATH = '/assets/images/penguin_fullshot.webp';

// fade-in speed (opacity per second)
const FADE_SPEED = 2;

function PenguinImage() {
  const [texture, setTexture] = useState<Texture | null>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);

  useEffect(() => {
    const loader = new TextureLoader();
    loader.load(PENGUIN_IMAGE_PATH, setTexture);
    return () => {
      if (texture) texture.dispose();
    };
    // only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fade in from 0 after mount (WallFrame delays mounting until the colour phase)
  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat || mat.opacity >= 1) return;
    mat.opacity = Math.min(1, mat.opacity + delta * FADE_SPEED);
  });

  if (!texture) return null;

  return (
    <mesh>
      <planeGeometry args={[PENGUIN_CONTENT_WIDTH, PENGUIN_CONTENT_HEIGHT]} />
      <meshBasicMaterial ref={materialRef} map={texture} transparent opacity={0} />
    </mesh>
  );
}

export function HomeSection() {
  return (
    <group>
      <NameTitle position={[0, 8, -4]} />

      <AlleyGround />

      <Sign position={[2.5, 0, -4]} rotation={[0, 0, 0]} rows={['', '--->', '', '']} />

      {/* <WallFrame
        position={[24, 6, -12]}
        contentWidth={PENGUIN_CONTENT_WIDTH}
        contentHeight={PENGUIN_CONTENT_HEIGHT}
        seed={42}
      >
        <PenguinImage />
      </WallFrame> */}

      <Sign position={[24, 0, -4]} rotation={[0, 0, 0]} rows={['Keep the', 'lights on!', '|', '∀']} />
      <LightSwitch position={[24, 0, -2]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}
