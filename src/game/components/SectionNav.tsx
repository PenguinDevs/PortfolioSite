'use client';

import { useId } from 'react';
import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR, BACKGROUND_COLOUR, SECTIONS, SECTION_DISPLAY_ORDER } from '../constants';
import { useNavigation } from '../contexts/NavigationContext';
import { TEXT_WINDOW_FONT } from './TextWindow';

// sits below TouchTutorial (50) and LoadingScreen (100)
const NAV_Z_INDEX = 40;

export function SectionNav() {
  const mode = useLightingMode();
  const { currentSection, navigateTo } = useNavigation();
  const filterId = useId();

  const edgeColour = INK_EDGE_COLOUR[mode];
  const bgColour = BACKGROUND_COLOUR[mode];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: NAV_Z_INDEX,
        fontFamily: TEXT_WINDOW_FONT,
        pointerEvents: 'auto',
      }}
    >
      {/* SVG displacement filter for ink wobble */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden>
        <defs>
          <filter id={filterId}>
            <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves={4} seed={5} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div style={{ position: 'relative', display: 'flex', padding: '8px 4px' }}>
        {/* Ink border frame */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            filter: `url(#${CSS.escape(filterId)})`,
          }}
          preserveAspectRatio="none"
          aria-hidden
        >
          <rect x="0" y="0" width="100%" height="3" fill={edgeColour} />
          <rect x="0" y="100%" width="100%" height="3" fill={edgeColour} transform="translate(0, -3)" />
          <rect x="0" y="0" width="3" height="100%" fill={edgeColour} />
          <rect x="100%" y="0" width="3" height="100%" fill={edgeColour} transform="translate(-3, 0)" />
        </svg>

        {/* Background fill */}
        <div
          style={{
            position: 'absolute',
            inset: 3,
            backgroundColor: bgColour,
            opacity: 0.92,
            pointerEvents: 'none',
          }}
        />

        {/* Section buttons rendered in display order (Home, Awards, Projects) */}
        {SECTION_DISPLAY_ORDER.map((sectionId) => {
          const section = SECTIONS.find((s) => s.id === sectionId)!;
          const isActive = sectionId === currentSection;
          return (
            <button
              key={sectionId}
              onClick={() => navigateTo(sectionId)}
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                padding: '8px 20px',
                fontSize: 20,
                fontFamily: TEXT_WINDOW_FONT,
                color: edgeColour,
                cursor: isActive ? 'default' : 'pointer',
                opacity: isActive ? 1 : 0.5,
                transition: 'opacity 200ms ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {section.label}
              {/* Active indicator dot */}
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: edgeColour,
                  opacity: isActive ? 1 : 0,
                  transition: 'opacity 200ms ease',
                }}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
