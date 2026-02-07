'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLightingMode, useIsTouchDevice } from '../hooks';
import { INK_EDGE_COLOUR } from '../constants';
import { TEXT_WINDOW_FONT } from './TextWindow';

// how long a movement key must be held before the hint appears (seconds)
const HOLD_THRESHOLD_S = 2;
// fade in/out duration (ms, used for CSS transition)
const FADE_MS = 400;

// z-index sits below SectionNav (40) so it doesn't block nav clicks
const HINT_Z_INDEX = 35;

// the set of key codes that count as "movement keys"
const MOVEMENT_KEYS = new Set(['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight']);

export function ScrollHint() {
  const isTouch = useIsTouchDevice();
  const mode = useLightingMode();

  const [visible, setVisible] = useState(false);

  // track which movement keys are currently held
  const heldKeys = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // schedule the hint to appear after the hold threshold
  const scheduleShow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
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
    setVisible(false);
  }, []);

  useEffect(() => {
    if (isTouch) return;

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

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTouch, scheduleShow, cancelShow]);

  if (isTouch) return null;

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
