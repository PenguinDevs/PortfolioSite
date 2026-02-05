'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, MathUtils, Vector3 } from 'three';
import { usePlayerRef } from '../contexts/PlayerContext';
import { useProximityPromptManager } from '../contexts/ProximityPromptContext';
import { useLightingMode } from '../hooks';
import { INK_EDGE_COLOUR } from '../constants';
import { TextWindow } from './TextWindow';

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
  const promptId = useId();
  const mode = useLightingMode();
  const textColour = INK_EDGE_COLOUR[mode];
  const isTouch = useMemo(() => typeof window !== 'undefined' && 'ontouchstart' in window, []);
  const playerRef = usePlayerRef();
  const manager = useProximityPromptManager();
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

  // Unregister from the manager when this prompt unmounts
  useEffect(() => {
    return () => manager.clear(promptId);
  }, [manager, promptId]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const playerGroup = playerRef.current;
    const anchor = anchorRef.current;
    if (!playerGroup || !anchor) return;

    playerGroup.getWorldPosition(_playerPos);
    anchor.getWorldPosition(_anchorPos);
    const dist = _playerPos.distanceTo(_anchorPos);

    inRangeRef.current = dist <= maxDistance;

    // Report distance to the manager so only the closest prompt shows
    if (inRangeRef.current) {
      manager.report(promptId, dist);
    } else {
      manager.clear(promptId);
    }

    // Only show if in range AND closest to the player
    const target = inRangeRef.current && manager.isClosest(promptId) ? 1 : 0;
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
          <Html center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
            <div
              ref={containerRef}
              onClick={handleTap}
              style={{
                pointerEvents: 'auto',
                userSelect: 'none',
                cursor: 'pointer',
              }}
            >
              <TextWindow width="max-content" padding={12}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    color: textColour,
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
                        fontSize: 18,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {actionText}
                    </div>
                  )}

                  {objectText && (
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 400,
                        opacity: 0.6,
                        whiteSpace: 'pre',
                        textAlign: 'center',
                      }}
                    >
                      {objectText}
                    </div>
                  )}
                </div>
              </TextWindow>
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
