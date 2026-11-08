'use client';

import type { InternshipOffer } from '@/data/portfolio';
import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR, STICKY_NOTE_COLOUR } from '../constants';
import { TextWindow } from './TextWindow';

const NOTE_TITLE = '2026 internship offers';
const NOTE_PADDING = 14;
// rows sit just far enough apart that the red circles round neighbouring offers only touch
const ROW_GAP = 6;
const ROW_FONT_SIZE = 17;
// company logos sit just under the text height, rounded like the experience logos
const LOGO_HEIGHT = 17;
const LOGO_CORNER_RADIUS_RATIO = 0.22;

// a strip of marker blacking out the name of a company under NDA, with a small label after it
const REDACTION_WIDTH = 64;
const REDACTION_HEIGHT_EM = 0.85;
const REDACTION_TILT_DEG = -1.5;
const REDACTION_LABEL = 'NDA';
const REDACTION_DESCRIPTION = 'company name under NDA';

// red pen loop around an accepted offer. it never closes: the end overshoots past
// where it started, passing just above it, like a quick scribble
const CIRCLE_COLOUR = '#d63031';
const CIRCLE_PATH = 'M60 2C30 0 6 4 4 18C2 32 30 39 55 38C82 37 98 29 96 18C95 8 80 -1 46 -6';
// how far the loop reaches past the row on each side
const CIRCLE_OVERHANG_X = 10;
const CIRCLE_OVERHANG_Y = 5;

export interface OffersNoteProps {
  offers: InternshipOffer[];
  width: number;
  height: number;
  // scales the text for the mobile layout
  fontScale?: number;
}

// sticky note listing internship offers with their logos, with the accepted ones circled in red pen.
// the pin or peg holding it up is drawn by whatever it hangs on
export function OffersNote({ offers, width, height, fontScale = 1 }: OffersNoteProps) {
  const mode = useLightingMode();
  const ink = INK_EDGE_COLOUR[mode];
  const logoHeight = LOGO_HEIGHT * fontScale;

  return (
    <TextWindow
      width={width}
      padding={NOTE_PADDING}
      backgroundColour={STICKY_NOTE_COLOUR}
      style={{ height, boxSizing: 'border-box' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP * fontScale, color: ink }}>
        {/* sized to fit on one line, nowrap stops a slightly wider font elsewhere pushing the last offer off the note */}
        <div style={{ fontSize: 20 * fontScale, lineHeight: 1.1, marginBottom: 2 * fontScale, whiteSpace: 'nowrap' }}>
          {NOTE_TITLE}
        </div>
        {offers.map((offer) => (
          <div
            key={offer.company}
            style={{
              position: 'relative',
              // shrink to the logo and name so the circle hugs them
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: ROW_FONT_SIZE * fontScale,
              lineHeight: 1.15,
            }}
          >
            {offer.logo && (
              // decorative, the company name sits right beside it
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={offer.logo}
                alt=""
                draggable={false}
                style={{
                  display: 'block',
                  height: logoHeight,
                  width: 'auto',
                  borderRadius: logoHeight * LOGO_CORNER_RADIUS_RATIO,
                  flexShrink: 0,
                }}
              />
            )}
            {offer.redacted ? (
              <>
                <span
                  role="img"
                  aria-label={REDACTION_DESCRIPTION}
                  style={{
                    display: 'inline-block',
                    width: REDACTION_WIDTH * fontScale,
                    height: `${REDACTION_HEIGHT_EM}em`,
                    background: ink,
                    borderRadius: 2 * fontScale,
                    transform: `rotate(${REDACTION_TILT_DEG}deg)`,
                  }}
                />
                <span style={{ fontSize: '0.75em', opacity: 0.7 }}>{REDACTION_LABEL}</span>
              </>
            ) : (
              <span>{offer.company}</span>
            )}
            {offer.accepted && (
              <svg
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                aria-hidden
                style={{
                  position: 'absolute',
                  top: -CIRCLE_OVERHANG_Y * fontScale,
                  bottom: -CIRCLE_OVERHANG_Y * fontScale,
                  left: -CIRCLE_OVERHANG_X * fontScale,
                  right: -CIRCLE_OVERHANG_X * fontScale,
                  width: `calc(100% + ${2 * CIRCLE_OVERHANG_X * fontScale}px)`,
                  height: `calc(100% + ${2 * CIRCLE_OVERHANG_Y * fontScale}px)`,
                  overflow: 'visible',
                  pointerEvents: 'none',
                }}
              >
                <path
                  d={CIRCLE_PATH}
                  fill="none"
                  stroke={CIRCLE_COLOUR}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </TextWindow>
  );
}
