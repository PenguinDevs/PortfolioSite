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
import { SocialLinksProvider } from './contexts/SocialLinksContext';
import type { SocialLinks } from '@/data/portfolio';
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

export function Game({ awards, socialLinks }: { awards: AwardData[]; socialLinks: SocialLinks }) {
  return (
    <SocialLinksProvider socialLinks={socialLinks}>
      <AwardOverlayProvider awards={awards}>
        <LoadingScreen />
        <TouchTutorial />
        <Canvas
          shadows
          gl={{ antialias: true }}
          style={{ width: '100vw', height: '100dvh', background: '#ffffff', touchAction: 'none' }}
        >
          <SceneBackground />
          <HomeScene />
        </Canvas>
        <AwardOverlay />
      </AwardOverlayProvider>
    </SocialLinksProvider>
  );
}
