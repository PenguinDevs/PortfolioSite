'use client';

import { type ReactNode, useId } from 'react';
import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR, BACKGROUND_COLOUR } from '../constants';

export const TEXT_WINDOW_FONT = "'PatrickHand', sans-serif";

export interface TextWindowProps {
  children: ReactNode;
  width?: number | string;
  padding?: number;
  style?: React.CSSProperties;
}

// 2D UI frame with hand-drawn ink edges that responds to the current theme
export function TextWindow({
  children,
  width = 360,
  padding = 24,
  style,
}: TextWindowProps) {
  const mode = useLightingMode();
  const filterId = useId();

  const edgeColour = INK_EDGE_COLOUR[mode];
  const bgColour = BACKGROUND_COLOUR[mode];

  return (
    <div
      style={{
        position: 'relative',
        width,
        padding,
        ...style,
      }}
    >
      {/* SVG filter that gives lines a rough, hand-drawn ink look */}
      <svg
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        aria-hidden
      >
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type="turbulence"
              baseFrequency="0.03"
              numOctaves={4}
              seed={2}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={3}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Ink border frame drawn as four separate rects for each edge */}
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
        {/* Top edge */}
        <rect x="0" y="0" width="100%" height="3" fill={edgeColour} />
        {/* Bottom edge */}
        <rect x="0" y="100%" width="100%" height="3" fill={edgeColour} transform="translate(0, -3)" />
        {/* Left edge */}
        <rect x="0" y="0" width="3" height="100%" fill={edgeColour} />
        {/* Right edge */}
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

      {/* Content sits above the background */}
      <div style={{ position: 'relative', fontFamily: TEXT_WINDOW_FONT }}>
        {children}
      </div>
    </div>
  );
}
