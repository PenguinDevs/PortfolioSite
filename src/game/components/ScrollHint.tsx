'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLightingMode, useIsTouchDevice } from '../hooks';
import { INK_EDGE_COLOUR } from '../constants';
import { TEXT_WINDOW_FONT } from './TextWindow';

// how long a movement key must be held before the hint appears (seconds)
const HOLD_THRESHOLD_S = 3;
// fade in/out duration (ms, used for CSS transition)
const FADE_MS = 400;

// localStorage key so we only nag once
const STORAGE_KEY = 'scrollHintDismissed';

// z-index sits below SectionNav (40) so it doesn't block nav clicks
const HINT_Z_INDEX = 35;

function wasAlreadyDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

// the set of key codes that count as "movement keys"
const MOVEMENT_KEYS = new Set(['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight']);

export function ScrollHint() {
  const isTouch = useIsTouchDevice();
  const mode = useLightingMode();

  const [dismissed, setDismissed] = useState(() => isTouch || wasAlreadyDismissed());
  const [visible, setVisible] = useState(false);

  // track which movement keys are currently held
  const heldKeys = useRef(new Set<string>());
  // timestamp when continuous hold started (null if no keys held)
  const holdStart = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // schedule the hint to appear after the hold threshold
  const scheduleShow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    holdStart.current = performance.now();
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, HOLD_THRESHOLD_S * 1000);
  }, []);

  // cancel the scheduled hint and hide it
  const cancelShow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    holdStart.current = null;
    setVisible(false);
  }, []);

  useEffect(() => {
    if (dismissed) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!MOVEMENT_KEYS.has(e.code)) return;
      const wasEmpty = heldKeys.current.size === 0;
      heldKeys.current.add(e.code);
      // start the timer when the first movement key goes down
      if (wasEmpty) scheduleShow();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!MOVEMENT_KEYS.has(e.code)) return;
      heldKeys.current.delete(e.code);
      // if all movement keys are released, cancel/hide
      if (heldKeys.current.size === 0) cancelShow();
    };

    // if the user scrolls, they figured it out, dismiss permanently
    const onWheel = () => dismiss();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('wheel', onWheel);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismissed, scheduleShow, cancelShow, dismiss]);

  if (dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 70,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: HINT_Z_INDEX,
        fontFamily: TEXT_WINDOW_FONT,
        fontSize: 18,
        color: INK_EDGE_COLOUR[mode],
        opacity: visible ? 0.85 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      Tip: you can also scroll to move faster
    </div>
  );
}
