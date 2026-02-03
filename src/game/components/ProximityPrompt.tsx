'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, MathUtils, Vector3 } from 'three';
import { usePlayerRef } from '../contexts/PlayerContext';

const _playerPos = new Vector3();
const _anchorPos = new Vector3();

const FADE_SPEED = 12;
const RING_R = 22;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

export interface ProximityPromptProps {
  maxDistance?: number;
  actionText?: string;
  objectText?: string;
  onInteract: () => void;
  offset?: [number, number, number];
  enabled?: boolean;
  keyCode?: string;
  keyLabel?: string;
  holdDuration?: number;
}

export function ProximityPrompt({
  maxDistance = 3,
  actionText,
  objectText,
  onInteract,
  offset = [0, 1.5, 0],
  enabled = true,
  keyCode = 'KeyE',
  keyLabel = 'E',
  holdDuration = 0,
}: ProximityPromptProps) {
  const isTouch = useMemo(() => typeof window !== 'undefined' && 'ontouchstart' in window, []);
  const playerRef = usePlayerRef();
  const anchorRef = useRef<Group>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);

  // Stable ref so the callback doesn't go stale inside useFrame/listeners
  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;

  const [visible, setVisible] = useState(false);
  const inRangeRef = useRef(false);
  const opacityRef = useRef(0);

  const holdingRef = useRef(false);
  const holdProgressRef = useRef(0);

  useFrame((_, delta) => {
    if (!enabled) return;

    const playerGroup = playerRef.current;
    const anchor = anchorRef.current;
    if (!playerGroup || !anchor) return;

    playerGroup.getWorldPosition(_playerPos);
    anchor.getWorldPosition(_anchorPos);
    const dist = _playerPos.distanceTo(_anchorPos);

    inRangeRef.current = dist <= maxDistance;

    // Tween opacity toward target - proximity just sets the direction
    const target = inRangeRef.current ? 1 : 0;
    opacityRef.current = MathUtils.lerp(opacityRef.current, target, FADE_SPEED * delta);

    // Snap to 0 when close enough so we can unmount the Html
    if (opacityRef.current < 0.01) opacityRef.current = 0;

    // Mount when fading in, unmount when fully faded out
    const shouldBeVisible = opacityRef.current > 0;
    if (shouldBeVisible !== visible) setVisible(shouldBeVisible);

    if (containerRef.current) {
      containerRef.current.style.opacity = String(opacityRef.current);
    }

    // Advance hold progress while the key is held down
    if (holdDuration > 0 && holdingRef.current && inRangeRef.current) {
      holdProgressRef.current = Math.min(
        holdProgressRef.current + delta,
        holdDuration,
      );
      if (holdProgressRef.current >= holdDuration) {
        onInteractRef.current();
        holdingRef.current = false;
        holdProgressRef.current = 0;
      }
      if (progressRef.current) {
        progressRef.current.style.strokeDashoffset = String(
          CIRCUMFERENCE * (1 - holdProgressRef.current / holdDuration),
        );
      }
    }
  });

  // Attach key listeners only while the player is in range
  useEffect(() => {
    if (!visible || !enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== keyCode || e.repeat || !inRangeRef.current) return;
      if (holdDuration <= 0) {
        onInteractRef.current();
      } else {
        holdingRef.current = true;
        holdProgressRef.current = 0;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== keyCode) return;
      holdingRef.current = false;
      holdProgressRef.current = 0;
      if (progressRef.current) {
        progressRef.current.style.strokeDashoffset = String(CIRCUMFERENCE);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      holdingRef.current = false;
      holdProgressRef.current = 0;
    };
  }, [visible, enabled, keyCode, holdDuration]);

  // Tap-to-interact for mobile
  const handleTap = useCallback(() => {
    if (inRangeRef.current && enabled) onInteractRef.current();
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Sits at the entity origin so distance is measured from the object, not the billboard */}
      <group ref={anchorRef} />

      <group position={offset}>
        {visible && (
          <Html center style={{ pointerEvents: 'none' }}>
            <div
              ref={containerRef}
              onClick={handleTap}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none',
                cursor: 'pointer',
              }}
            >
              {/* Key badge */}
              <div style={{ position: 'relative', width: 48, height: 48 }}>
                {holdDuration > 0 && (
                  <svg
                    viewBox="0 0 48 48"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      transform: 'rotate(-90deg)',
                    }}
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r={RING_R}
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="3"
                    />
                    <circle
                      ref={progressRef}
                      cx="24"
                      cy="24"
                      r={RING_R}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={CIRCUMFERENCE}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.75)',
                    border: '2px solid rgba(255, 255, 255, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {isTouch ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/assets/images/click.svg" alt="Tap" width={22} height={22} style={{ filter: 'invert(1)' }} />
                  ) : keyLabel}
                </div>
              </div>

              {actionText && (
                <div
                  style={{
                    color: '#ffffff',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {actionText}
                </div>
              )}

              {objectText && (
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: 11,
                    fontWeight: 400,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {objectText}
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
