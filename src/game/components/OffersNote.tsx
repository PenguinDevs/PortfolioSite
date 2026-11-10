'use client';

import type { InternshipOffer } from '@/data/portfolio';
import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR, STICKY_NOTE_COLOUR } from '../constants';
import { TextWindow } from './TextWindow';

const NOTE_TITLE = '2026 internship offers';
const NOTE_PADDING = 14;
const ROW_GAP = 4;
const ROW_FONT_SIZE = 17;
// company logos sit just under the text height, rounded like the experience logos
const LOGO_HEIGHT = 17;
const LOGO_CORNER_RADIUS_RATIO = 0.22;

export interface OffersNoteProps {
  offers: InternshipOffer[];
  width: number;
  height: number;
  // scales the text for the mobile layout
  fontScale?: number;
}

// sticky note listing internship offers with their logos.
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
            <span>{offer.company}</span>
          </div>
        ))}
      </div>
    </TextWindow>
  );
}
