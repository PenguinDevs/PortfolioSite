'use client';

import { useEffect, useRef, useState } from 'react';
import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR, SECTIONS, SECTION_DISPLAY_ORDER } from '../constants';
import { useNavigation } from '../contexts/NavigationContext';
import { TEXT_WINDOW_FONT } from './TextWindow';

// sits below TouchTutorial (50) and LoadingScreen (100)
const NAV_Z_INDEX = 40;

// width allocated per nav slot (centre-to-centre distance between items)
const SLOT_WIDTH = 110;
const TRANSITION_MS = 300;

// circular offset of item index i when active index is a (returns -1, 0, or +1 for n=3)
function circularOffset(i: number, a: number, n: number): number {
  return ((i - a + Math.floor(n / 2) + n) % n) - Math.floor(n / 2);
}

export function SectionNav() {
  const mode = useLightingMode();
  const { currentSection, navigateTo } = useNavigation();
  const edgeColour = INK_EDGE_COLOUR[mode];

  const n = SECTION_DISPLAY_ORDER.length;
  const activeIdx = SECTION_DISPLAY_ORDER.indexOf(currentSection);

  // offset for each item: -1 (left), 0 (centre), +1 (right)
  const offsets = SECTION_DISPLAY_ORDER.map((_, i) => circularOffset(i, activeIdx, n));

  // track previous offsets so we can detect items that wrapped around
  const prevOffsetsRef = useRef(offsets);

  // items whose offset jumped by more than 1 are wrapping and should teleport
  const wrapping = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (Math.abs(offsets[i] - prevOffsetsRef.current[i]) > 1) {
      wrapping.add(i);
    }
  }

  // after wrapping items render invisibly, schedule a second render so they fade in
  const [, setTick] = useState(0);
  useEffect(() => {
    prevOffsetsRef.current = offsets;
    if (wrapping.size > 0) {
      requestAnimationFrame(() => setTick((t) => t + 1));
    }
  });

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
          width: n * SLOT_WIDTH,
          height: 50,
        }}
      >
        {SECTION_DISPLAY_ORDER.map((sectionId, i) => {
          const section = SECTIONS.find((s) => s.id === sectionId)!;
          const isActive = offsets[i] === 0;
          const isWrapping = wrapping.has(i);

          return (
            <button
              key={sectionId}
              onClick={() => navigateTo(sectionId)}
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: `translateX(calc(-50% + ${offsets[i] * SLOT_WIDTH}px))`,
                transition: isWrapping
                  ? 'none'
                  : `transform ${TRANSITION_MS}ms ease, opacity ${TRANSITION_MS}ms ease`,
                background: 'none',
                border: 'none',
                outline: 'none',
                padding: '8px 20px',
                fontSize: 20,
                fontFamily: TEXT_WINDOW_FONT,
                color: edgeColour,
                cursor: isActive ? 'default' : 'pointer',
                opacity: isWrapping ? 0 : isActive ? 1 : 0.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {section.label}
              {/* active indicator dot */}
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: edgeColour,
                  opacity: isActive ? 1 : 0,
                  transition: `opacity ${TRANSITION_MS}ms ease`,
                }}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
