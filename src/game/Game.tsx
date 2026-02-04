'use client';

import { useEffect } from 'react';
import { Color } from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { HomeScene } from './scenes';
import { LoadingScreen } from './components/LoadingScreen';
import { TouchTutorial } from './components/TouchTutorial';
import { AwardOverlay } from './components/AwardOverlay';
import { AwardOverlayProvider } from './contexts/AwardOverlayContext';
import type { AwardData } from './contexts/AwardOverlayContext';
import { useLightingMode } from './hooks';
import { BACKGROUND_COLOUR } from './constants';

// Updates the WebGL clear colour when the lighting mode changes
function SceneBackground() {
  const mode = useLightingMode();
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    gl.setClearColor(new Color(BACKGROUND_COLOUR[mode]));
  }, [mode, gl]);

  return null;
}

export function Game({ awards }: { awards: AwardData[] }) {
  return (
    <AwardOverlayProvider awards={awards}>
      <LoadingScreen />
      <TouchTutorial />
      <Canvas
        gl={{ antialias: true }}
        style={{ width: '100vw', height: '100dvh', background: '#ffffff', touchAction: 'none' }}
      >
        <SceneBackground />
        <HomeScene />
      </Canvas>
      <AwardOverlay />
    </AwardOverlayProvider>
  );
}
