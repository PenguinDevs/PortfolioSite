'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// fraction of screen width that counts as a tap zone (matches TouchController)
const TAP_ZONE_EDGE = 0.2;

// fade timing
const FADE_OUT_MS = 500;

// colours
const DEFAULT_COLOUR = 'rgba(0, 0, 0, 0.7)';
const CONFIRMED_COLOUR = '#4caf50';

// how far a finger must move before counting as a swipe (px)
const SWIPE_CONFIRM_THRESHOLD = 30;

enum TutorialStep {
  Swipe = 'swipe',
  Left = 'left',
  Right = 'right',
}

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(pointer: fine)').matches;
}

export function TouchTutorial() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (!isTouchDevice()) return true;
    return false;
  });

  const [fading, setFading] = useState(false);

  const swipeDone = useRef(false);
  const leftDone = useRef(false);
  const rightDone = useRef(false);
  const [, forceUpdate] = useState(0);

  // track swipe start position
  const swipeStartY = useRef<number | null>(null);

  const checkAllDone = useCallback(() => {
    if (swipeDone.current && leftDone.current && rightDone.current) {
      setFading(true);
      setTimeout(() => setDismissed(true), FADE_OUT_MS);
    }
  }, []);

  // listen for touch events to detect tutorial completion
  useEffect(() => {
    if (dismissed) return;

    const w = window.innerWidth;
    const leftEdge = w * TAP_ZONE_EDGE;
    const rightEdge = w * (1 - TAP_ZONE_EDGE);

    const onTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const x = touch.clientX;

        // check tap zones
        if (!leftDone.current && x < leftEdge) {
          leftDone.current = true;
          forceUpdate((n) => n + 1);
          checkAllDone();
        }
        if (!rightDone.current && x > rightEdge) {
          rightDone.current = true;
          forceUpdate((n) => n + 1);
          checkAllDone();
        }

        // start tracking swipe
        if (!swipeDone.current && swipeStartY.current === null) {
          swipeStartY.current = touch.clientY;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (swipeDone.current || swipeStartY.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const dy = Math.abs(touch.clientY - swipeStartY.current);
        if (dy >= SWIPE_CONFIRM_THRESHOLD) {
          swipeDone.current = true;
          swipeStartY.current = null;
          forceUpdate((n) => n + 1);
          checkAllDone();
          break;
        }
      }
    };

    const onTouchEnd = () => {
      swipeStartY.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [dismissed, checkAllDone]);

  if (dismissed) return null;

  const swipeColour = swipeDone.current ? CONFIRMED_COLOUR : DEFAULT_COLOUR;
  const leftColour = leftDone.current ? CONFIRMED_COLOUR : DEFAULT_COLOUR;
  const rightColour = rightDone.current ? CONFIRMED_COLOUR : DEFAULT_COLOUR;

  return (
    <div
      className="touch-tutorial"
      style={{ opacity: fading ? 0 : 1 }}
    >
      {/* Left tap zone */}
      <div
        className="touch-tutorial-zone touch-tutorial-zone-left"
        style={{ borderColor: leftColour }}
      >
        <div className="touch-tutorial-zone-inner" style={{ color: leftColour }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle
              cx="16" cy="16" r="12"
              stroke={leftColour}
              strokeWidth="2"
              fill="none"
            />
            <circle cx="16" cy="16" r="4" fill={leftColour} />
          </svg>
          <span className="touch-tutorial-label" style={{ color: leftColour }}>Tap</span>
        </div>
      </div>

      {/* Right tap zone */}
      <div
        className="touch-tutorial-zone touch-tutorial-zone-right"
        style={{ borderColor: rightColour }}
      >
        <div className="touch-tutorial-zone-inner" style={{ color: rightColour }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle
              cx="16" cy="16" r="12"
              stroke={rightColour}
              strokeWidth="2"
              fill="none"
            />
            <circle cx="16" cy="16" r="4" fill={rightColour} />
          </svg>
          <span className="touch-tutorial-label" style={{ color: rightColour }}>Tap</span>
        </div>
      </div>

      {/* Centre swipe indicator */}
      <div className="touch-tutorial-swipe">
        <svg
          className="touch-tutorial-swipe-icon"
          width="48" height="80"
          viewBox="0 0 48 80"
          fill="none"
        >
          {/* Up chevron */}
          <polyline
            className="touch-tutorial-chevron-up"
            points="16,20 24,12 32,20"
            stroke={swipeColour}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Finger circle */}
          <circle
            className="touch-tutorial-finger"
            cx="24" cy="40" r="10"
            stroke={swipeColour}
            strokeWidth="2"
            fill="none"
          />
          {/* Down chevron */}
          <polyline
            className="touch-tutorial-chevron-down"
            points="16,60 24,68 32,60"
            stroke={swipeColour}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span className="touch-tutorial-label" style={{ color: swipeColour }}>Swipe</span>
      </div>
    </div>
  );
}
