'use client';

import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR, SECTIONS, SECTION_DISPLAY_ORDER } from '../constants';
import { useNavigation } from '../contexts/NavigationContext';
import { TEXT_WINDOW_FONT } from './TextWindow';

// sits below TouchTutorial (50) and LoadingScreen (100)
const NAV_Z_INDEX = 40;

export function SectionNav() {
  const mode = useLightingMode();
  const { currentSection, navigateTo } = useNavigation();

  const edgeColour = INK_EDGE_COLOUR[mode];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: NAV_Z_INDEX,
        fontFamily: TEXT_WINDOW_FONT,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', padding: '8px 4px' }}>
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
                outline: 'none',
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
