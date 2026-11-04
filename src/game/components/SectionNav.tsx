'use client';

import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR, SECTIONS, SECTION_DISPLAY_ORDER } from '../constants';
import { useNavigation } from '../contexts/NavigationContext';
import { TEXT_WINDOW_FONT } from './TextWindow';

// sits below TouchTutorial (50) and LoadingScreen (100)
const NAV_Z_INDEX = 40;

// width of each section's slot, narrower screens share the available width evenly
const SLOT_WIDTH = 110;
// keeps the nav clear of the screen edges on phones
const SCREEN_MARGIN = 24;
const TRANSITION_MS = 300;
const DOT_SIZE = 6;
// the dot sits in the space under the labels
const DOT_BOTTOM = 8;

// sections stay put in display order and the active dot slides between them
export function SectionNav() {
  const mode = useLightingMode();
  const { currentSection, navigateTo } = useNavigation();
  const edgeColour = INK_EDGE_COLOUR[mode];

  const n = SECTION_DISPLAY_ORDER.length;
  const activeIdx = SECTION_DISPLAY_ORDER.indexOf(currentSection);

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
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: `min(${n * SLOT_WIDTH}px, calc(100vw - ${SCREEN_MARGIN}px))`,
        }}
      >
        {SECTION_DISPLAY_ORDER.map((sectionId, i) => {
          const section = SECTIONS.find((s) => s.id === sectionId)!;
          const isActive = i === activeIdx;

          return (
            <button
              key={sectionId}
              onClick={() => navigateTo(sectionId)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                padding: `8px 0 ${DOT_BOTTOM + DOT_SIZE + 4}px`,
                fontSize: 20,
                fontFamily: TEXT_WINDOW_FONT,
                whiteSpace: 'nowrap',
                color: edgeColour,
                cursor: isActive ? 'default' : 'pointer',
                opacity: isActive ? 1 : 0.5,
                transition: `opacity ${TRANSITION_MS}ms ease`,
              }}
            >
              {section.label}
            </button>
          );
        })}

        {/* active indicator dot, centred under the current section's slot */}
        <div
          style={{
            position: 'absolute',
            bottom: DOT_BOTTOM,
            left: `${((activeIdx + 0.5) / n) * 100}%`,
            width: DOT_SIZE,
            height: DOT_SIZE,
            marginLeft: -DOT_SIZE / 2,
            borderRadius: '50%',
            backgroundColor: edgeColour,
            transition: `left ${TRANSITION_MS}ms ease`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </nav>
  );
}
