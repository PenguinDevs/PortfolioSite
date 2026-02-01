'use client';

import { Canvas } from '@react-three/fiber';
import { HomeScene } from './scenes';

export function Game() {
  return (
    <Canvas
      gl={{ antialias: true }}
      style={{ width: '100vw', height: '100dvh', background: '#ffffff' }}
    >
      <HomeScene />
    </Canvas>
  );
}
