'use client';

import { Canvas } from '@react-three/fiber';
import { HomeScene } from './scenes';

export function Game() {
  return (
    <Canvas
      orthographic
      gl={{ antialias: true }}
      camera={{ position: [0, 2, 10], zoom: 80 }}
      style={{ width: '100vw', height: '100dvh', background: '#ffffff' }}
    >
      <HomeScene />
    </Canvas>
  );
}
