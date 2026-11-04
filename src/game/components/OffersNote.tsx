'use client';

import type { InternshipOffer } from '@/data/portfolio';
import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR, STICKY_NOTE_COLOUR } from '../constants';
import { TextWindow } from './TextWindow';

const NOTE_TITLE = 'internship offers';
const ACCEPTED_LABEL = 'accepted';
const NOTE_PADDING = 14;

export interface OffersNoteProps {
  offers: InternshipOffer[];
  width: number;
  height: number;
  // scales the text for the mobile layout
  fontScale?: number;
}

// sticky note listing internship offers, with a tick next to the accepted one.
// the pin or peg holding it up is drawn by whatever it hangs on
export function OffersNote({ offers, width, height, fontScale = 1 }: OffersNoteProps) {
  const mode = useLightingMode();
  const ink = INK_EDGE_COLOUR[mode];
  const tickSize = 16 * fontScale;

  return (
    <TextWindow
      width={width}
      padding={NOTE_PADDING}
      backgroundColour={STICKY_NOTE_COLOUR}
      style={{ height, boxSizing: 'border-box' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 * fontScale, color: ink }}>
        <div style={{ fontSize: 20 * fontScale, lineHeight: 1.1, marginBottom: 2 * fontScale }}>
          {NOTE_TITLE}
        </div>
        {offers.map((offer) => (
          <div
            key={offer.company}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18 * fontScale, lineHeight: 1.15 }}
          >
            <span>{offer.company}</span>
            {offer.accepted && (
              <>
                <svg width={tickSize} height={tickSize} viewBox="0 0 16 16" aria-hidden>
                  <path
                    d="M2 9 L6 13 L14 3"
                    fill="none"
                    stroke={ink}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span style={{ fontSize: 13 * fontScale, opacity: 0.65 }}>{ACCEPTED_LABEL}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </TextWindow>
  );
}
