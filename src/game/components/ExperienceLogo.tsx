'use client';

import type { ExperienceData } from '@/data/portfolio';
import { TEXT_WINDOW_FONT } from './TextWindow';

// corner rounding and fallback letter size, as fractions of the logo size
const CORNER_RADIUS_RATIO = 0.22;
const INITIAL_SIZE_RATIO = 0.55;
const INITIAL_COLOUR = '#ffffff';

export interface ExperienceLogoProps {
  entry: ExperienceData;
  // logo height, and the width of the square fallback
  size: number;
  // room for wide wordmark logos, defaults to a square
  maxWidth?: number;
}

// company logo, or the first letter on the accent colour when the entry has no logo.
// logos keep their own aspect ratio, so wordmarks can run wider than they are tall
export function ExperienceLogo({ entry, size, maxWidth = size }: ExperienceLogoProps) {
  const name = entry.shortName ?? entry.company;
  const shape: React.CSSProperties = {
    height: size,
    borderRadius: size * CORNER_RADIUS_RATIO,
    flexShrink: 0,
  };

  if (entry.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.logo}
        alt={`${name} logo`}
        draggable={false}
        style={{ ...shape, width: 'auto', maxWidth, display: 'block', objectFit: 'contain' }}
      />
    );
  }

  return (
    <div
      style={{
        ...shape,
        width: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: entry.accentColour,
        color: INITIAL_COLOUR,
        fontFamily: TEXT_WINDOW_FONT,
        fontSize: size * INITIAL_SIZE_RATIO,
        lineHeight: 1,
      }}
    >
      {name.charAt(0)}
    </div>
  );
}
