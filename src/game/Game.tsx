'use client';

import { useEffect } from 'react';
import { Color } from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { HomeScene } from './scenes';
import { LoadingScreen } from './components/LoadingScreen';
import { TouchTutorial } from './components/TouchTutorial';
import { AwardOverlay } from './components/AwardOverlay';
import { ExperienceOverlay } from './components/ExperienceOverlay';
import { ProjectOverlay } from './components/ProjectOverlay';
import { SectionNav } from './components/SectionNav';
import { ScrollHint } from './components/ScrollHint';
import { NavigationProvider } from './contexts/NavigationContext';
import { AwardOverlayProvider } from './contexts/AwardOverlayContext';
import type { AwardData } from './contexts/AwardOverlayContext';
import { ExperienceOverlayProvider } from './contexts/ExperienceOverlayContext';
import { ProjectOverlayProvider } from './contexts/ProjectOverlayContext';
import { SocialLinksProvider } from './contexts/SocialLinksContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import type { SocialLinks, ProjectData, ExperienceData, InternshipOffer } from '@/data/portfolio';

import { useLightingMode } from './hooks';
import { BACKGROUND_COLOUR } from './constants';
import { PerfLogger } from './debug/PerfLogger';

// Updates the WebGL clear colour when the lighting mode changes
function SceneBackground() {
  const mode = useLightingMode();
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    gl.setClearColor(new Color(BACKGROUND_COLOUR[mode]));
  }, [mode, gl]);

  return null;
}

export function Game({
  awards,
  socialLinks,
  projects,
  experience,
  internshipOffers,
}: {
  awards: AwardData[];
  socialLinks: SocialLinks;
  projects: ProjectData[];
  experience: ExperienceData[];
  internshipOffers: InternshipOffer[];
}) {
  PerfLogger.mark('game-mount');
  return (
    <NavigationProvider>
      <SocialLinksProvider socialLinks={socialLinks}>
        <ExperienceOverlayProvider experience={experience} internshipOffers={internshipOffers}>
          <AwardOverlayProvider awards={awards}>
            <ProjectsProvider projects={projects}>
              <ProjectOverlayProvider>
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
                <ExperienceOverlay />
                <AwardOverlay />
                <ProjectOverlay />
                <ScrollHint />
                <SectionNav />
              </ProjectOverlayProvider>
            </ProjectsProvider>
          </AwardOverlayProvider>
        </ExperienceOverlayProvider>
      </SocialLinksProvider>
    </NavigationProvider>
  );
}
