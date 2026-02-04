'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAwardOverlay } from '../contexts/AwardOverlayContext';
import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR, BACKGROUND_COLOUR } from '../constants';
import { TEXT_WINDOW_FONT } from './TextWindow';

const FADE_MS = 250;

export function AwardOverlay() {
  const mode = useLightingMode();
  const { activeAward, hideAward } = useAwardOverlay();
  const filterId = useId();

  // Track mounted vs visible separately for fade animation
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const edgeColour = INK_EDGE_COLOUR[mode];
  const bgColour = BACKGROUND_COLOUR[mode];
  const textColour = edgeColour;

  // Fade in when an award becomes active
  useEffect(() => {
    if (activeAward) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      timeoutRef.current = setTimeout(() => setMounted(false), FADE_MS);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [activeAward]);

  // Close on Escape
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') hideAward();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, hideAward]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) hideAward();
    },
    [hideAward],
  );

  if (!mounted || !activeAward) return null;

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        fontFamily: TEXT_WINDOW_FONT,
        cursor: 'pointer',
      }}
    >
      {/* Card */}
      <div
        style={{
          position: 'relative',
          width: 420,
          maxWidth: 'calc(100vw - 48px)',
          padding: 32,
          cursor: 'default',
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: `transform ${FADE_MS}ms ease, opacity ${FADE_MS}ms ease`,
        }}
      >
        {/* Background fill */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: bgColour,
            opacity: 0.96,
            borderRadius: 2,
          }}
        />

        {/* SVG filter for the hand-drawn ink wobble */}
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
                seed={7}
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

        {/* Ink border with hand-drawn displacement */}
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

        {/* Content */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Close button */}
          <button
            onClick={hideAward}
            style={{
              position: 'absolute',
              top: -16,
              right: -16,
              background: 'none',
              border: 'none',
              color: textColour,
              fontSize: 28,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
              fontFamily: TEXT_WINDOW_FONT,
            }}
            aria-label="Close"
          >
            x
          </button>

          {/* Award image (when provided) */}
          {activeAward.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeAward.imageUrl}
              alt={activeAward.title}
              style={{
                width: '100%',
                maxHeight: 220,
                objectFit: 'contain',
                borderRadius: 2,
              }}
            />
          )}

          {/* Badge + year row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeAward.badge && (
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: textColour,
                  fontFamily: TEXT_WINDOW_FONT,
                }}
              >
                {activeAward.badge.icon} {activeAward.badge.text}
              </span>
            )}
            <span
              style={{
                fontSize: 18,
                color: textColour,
                opacity: 0.5,
                fontFamily: TEXT_WINDOW_FONT,
              }}
            >
              &apos;{activeAward.year}
            </span>
          </div>

          {/* Title */}
          <h2
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 700,
              color: textColour,
              fontFamily: TEXT_WINDOW_FONT,
            }}
          >
            {activeAward.title}
          </h2>

          {/* Secondary text */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: textColour,
              opacity: 0.7,
              fontFamily: TEXT_WINDOW_FONT,
            }}
          >
            {activeAward.secondaryText}
          </div>

          {/* Description */}
          <p
            style={{
              margin: 0,
              fontSize: 22,
              lineHeight: 1.3,
              color: textColour,
              opacity: 0.8,
              fontFamily: TEXT_WINDOW_FONT,
            }}
          >
            {activeAward.description}
          </p>

          {/* Stats row */}
          {activeAward.stats && activeAward.stats.length > 0 && (
            <div style={{ display: 'flex', gap: 24 }}>
              {activeAward.stats.map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    fontFamily: TEXT_WINDOW_FONT,
                  }}
                >
                  <span style={{ fontSize: 26, fontWeight: 700, color: textColour }}>
                    {stat.value}
                  </span>
                  <span style={{ fontSize: 16, color: textColour, opacity: 0.5 }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Link */}
          <a
            href={activeAward.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              alignSelf: 'flex-start',
              padding: '8px 20px',
              fontSize: 22,
              fontWeight: 600,
              color: bgColour,
              backgroundColor: textColour,
              textDecoration: 'none',
              borderRadius: 2,
              fontFamily: TEXT_WINDOW_FONT,
            }}
          >
            View
          </a>
        </div>
      </div>
    </div>
  );
}
