'use client';

import { useState, useEffect, useRef } from 'react';
import { useProgress } from '@react-three/drei';
import { PerfLogger } from '../debug/PerfLogger';

// Minimum time to show the loading screen so it doesn't flash
const MIN_DISPLAY_MS = 1500;
// Fade out duration in ms
const FADE_OUT_MS = 600;

export function LoadingScreen() {
  const { progress, active } = useProgress();
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const markedShown = useRef(false);
  const markedAssetsComplete = useRef(false);

  if (!markedShown.current) {
    markedShown.current = true;
    PerfLogger.mark('loading-screen:shown');
  }

  useEffect(() => {
    // Don't start fading until loading is complete and minimum time has passed
    if (progress < 100 || active) return;

    if (!markedAssetsComplete.current) {
      markedAssetsComplete.current = true;
      PerfLogger.mark('loading-screen:assets-complete');
    }

    const minTimer = setTimeout(() => {
      PerfLogger.mark('loading-screen:fade-start');
      setFading(true);

      // Remove from DOM after the fade out animation completes
      const fadeTimer = setTimeout(() => {
        PerfLogger.mark('loading-screen:gone');
        setVisible(false);
      }, FADE_OUT_MS);

      return () => clearTimeout(fadeTimer);
    }, MIN_DISPLAY_MS);

    return () => clearTimeout(minTimer);
  }, [progress, active]);

  if (!visible) return null;

  return (
    <div
      className="loading-screen"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <div className="loading-content">
        {/* Clipping container shows one frame at a time */}
        <div className="loading-sprite-clip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/images/penguin_loading_sprite.webp"
            alt="Loading"
            className="loading-sprite-strip"
          />
        </div>
        <p className="loading-text">
          <span className="loading-dots-spacer" />
          Loading
          <span className="loading-dots">
            <span className="loading-dot loading-dot-1">.</span>
            <span className="loading-dot loading-dot-2">.</span>
            <span className="loading-dot loading-dot-3">.</span>
          </span>
        </p>
      </div>
    </div>
  );
}
