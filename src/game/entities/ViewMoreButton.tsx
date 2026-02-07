'use client';

import { useRef, useState } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEntityReveal, useLightingMode } from '../hooks';
import { useSocialLinks } from '../contexts';
import { LightingMode } from '../types';

// skip ink edges entirely, just fade in
const EDGE_DURATION = 0;
const COLOUR_DELAY = 0;
const COLOUR_DURATION = 0.6;

// github icon SVG path (same as NameTitle)
const GITHUB_ICON_VIEWBOX = '0 0 20 20';
const GITHUB_ICON_PATH =
  'M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z';

// themed colours
const BUTTON_BG = {
  [LightingMode.Light]: '#111827',
  [LightingMode.Dark]: '#1f2937',
};
const BUTTON_HOVER_BG = {
  [LightingMode.Light]: '#1f2937',
  [LightingMode.Dark]: '#374151',
};

// hover tilt matching NameTitle social link style
const HOVER_TILT_DEG = 10;

export type ViewMoreButtonProps = ThreeElements['group'];

export function ViewMoreButton(props: ViewMoreButtonProps) {
  const groupRef = useRef<Group>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const mode = useLightingMode();
  const socialLinks = useSocialLinks();

  // reveal with no ink edges, just a direct fade-in
  const { colourProgress } = useEntityReveal(groupRef, {
    edgeDuration: EDGE_DURATION,
    colourDelay: COLOUR_DELAY,
    colourDuration: COLOUR_DURATION,
    perfLabel: 'ViewMoreButton',
  });

  // mount Html once colour starts revealing
  const [mounted, setMounted] = useState(false);
  useFrame(() => {
    if (!mounted && colourProgress.value > 0.01) {
      setMounted(true);
    }
    if (linkRef.current) {
      linkRef.current.style.opacity = String(colourProgress.value);
    }
  });

  return (
    <group ref={groupRef} {...props}>
      {mounted && (
        <Html transform distanceFactor={8} zIndexRange={[0, 0]}>
          <a
            ref={linkRef}
            href={socialLinks.github}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              opacity: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              backgroundColor: BUTTON_BG[mode],
              color: '#ffffff',
              borderRadius: '12px',
              textDecoration: 'none',
              fontFamily: "'PatrickHand', cursive",
              fontSize: '22px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = BUTTON_HOVER_BG[mode];
              e.currentTarget.style.transform = `rotate(${HOVER_TILT_DEG}deg)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = BUTTON_BG[mode];
              e.currentTarget.style.transform = '';
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox={GITHUB_ICON_VIEWBOX}
              fill="currentColor"
            >
              <path d={GITHUB_ICON_PATH} />
            </svg>
            <span>View More &rarr;</span>
          </a>
        </Html>
      )}
    </group>
  );
}
