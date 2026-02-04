'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import type { RefObject } from 'react';
import type { Group } from 'three';
import { Keycap } from '../../entities';
import { InputAction, type InputState } from '../../types';

// world-space position of the tutorial group
const TUTORIAL_POSITION: [number, number, number] = [0, 0, 6];

// rotate keycaps
const KEYCAP_ROTATION: [number, number, number] = [Math.PI * 0.05, 0, 0];

// wave delay between each keycap press (seconds)
const WAVE_STEP = 0.15;

// colours for confirmed keycaps
const CONFIRMED_COLOUR = '#4caf50';
const CONFIRMED_SHADOW = '#2e7d32';

// text separator styling
const FONT_PATH = '/assets/fonts/justanotherhand_regular.ttf';
const SEPARATOR_FONT_SIZE = 0.6;
const SEPARATOR_COLOUR = '#888888';

// keycap spacing along the row
const GAP = 0.3;
const KEYCAP_W = 1.0;

// fade timing
const FADE_DELAY = 0.6; // pause after all confirmed before fading
const FADE_DURATION = 0.5;
const FADE_DISTANCE = 3; // how far down the group slides

// horizontal positions for each element, centred around x=0
// layout: [A] [D] / [<-] [->] OR [scroll]
const SEPARATOR_W = 0.5;
const OR_W = 0.8;

// group widths
const G1 = KEYCAP_W + GAP + KEYCAP_W; // A D
const S1 = GAP + SEPARATOR_W + GAP;    // /
const G2 = KEYCAP_W + GAP + KEYCAP_W; // <- ->
const S2 = GAP + OR_W + GAP;           // OR
const G3 = KEYCAP_W;                   // scroll
const TOTAL_W = G1 + S1 + G2 + S2 + G3;

// positions calculated from left edge
const LEFT = -TOTAL_W / 2;
const X_A = LEFT + KEYCAP_W / 2;
const X_D = LEFT + KEYCAP_W + GAP + KEYCAP_W / 2;
const X_SLASH = LEFT + G1 + S1 / 2;
const X_LEFT_ARROW = LEFT + G1 + S1 + KEYCAP_W / 2;
const X_RIGHT_ARROW = LEFT + G1 + S1 + KEYCAP_W + GAP + KEYCAP_W / 2;
const X_OR = LEFT + G1 + S1 + G2 + S2 / 2;
const X_SCROLL = LEFT + G1 + S1 + G2 + S2 + KEYCAP_W / 2;

function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: fine)').matches;
}

interface TutorialServiceProps {
  inputRef: RefObject<InputState>;
}

export function TutorialService({ inputRef }: TutorialServiceProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (!isDesktop()) return true;
    return false;
  });

  const leftDone = useRef(false);
  const rightDone = useRef(false);
  const scrollDone = useRef(false);
  const allDone = useRef(false);
  const fadeTimer = useRef(0);
  const containerRef = useRef<Group>(null);

  // force re-render when a group is confirmed so the keycap colour updates
  const [, forceUpdate] = useState(0);

  // listen for scroll events
  const onWheel = useCallback(() => {
    if (scrollDone.current) return;
    scrollDone.current = true;
    forceUpdate((n) => n + 1);
  }, []);

  useEffect(() => {
    if (dismissed) return;
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [dismissed, onWheel]);

  // poll keyboard input each frame and handle fade animation
  useFrame((_, delta) => {
    if (dismissed) return;
    const input = inputRef.current;
    if (!input) return;

    let changed = false;

    if (!leftDone.current && input[InputAction.Left]) {
      leftDone.current = true;
      changed = true;
    }
    if (!rightDone.current && input[InputAction.Right]) {
      rightDone.current = true;
      changed = true;
    }

    if (changed) {
      forceUpdate((n) => n + 1);
    }

    // check if all groups are confirmed
    if (!allDone.current && leftDone.current && rightDone.current && scrollDone.current) {
      allDone.current = true;
      fadeTimer.current = 0;
    }

    // handle fade-out slide animation
    if (allDone.current && containerRef.current) {
      fadeTimer.current += delta;
      const elapsed = fadeTimer.current - FADE_DELAY;
      if (elapsed > 0) {
        const t = Math.min(elapsed / FADE_DURATION, 1);
        // ease out quad
        const eased = t * (2 - t);
        containerRef.current.position.y = TUTORIAL_POSITION[1] - FADE_DISTANCE * eased;

        if (t >= 1) {
          setDismissed(true);
        }
      }
    }
  });

  if (dismissed) return null;

  const leftColour = leftDone.current ? CONFIRMED_COLOUR : undefined;
  const leftShadow = leftDone.current ? CONFIRMED_SHADOW : undefined;
  const rightColour = rightDone.current ? CONFIRMED_COLOUR : undefined;
  const rightShadow = rightDone.current ? CONFIRMED_SHADOW : undefined;
  const scrollColour = scrollDone.current ? CONFIRMED_COLOUR : undefined;
  const scrollShadow = scrollDone.current ? CONFIRMED_SHADOW : undefined;

  return (
    <group ref={containerRef} position={TUTORIAL_POSITION}>
      {/* A key */}
      <Keycap
        label="A"
        colour={leftColour}
        shadowColour={leftShadow}
        position={[X_A, 0, 0]}
        rotation={KEYCAP_ROTATION}
        pressDelay={WAVE_STEP * 0}
      />

      {/* D key */}
      <Keycap
        label="D"
        colour={rightColour}
        shadowColour={rightShadow}
        position={[X_D, 0, 0]}
        rotation={KEYCAP_ROTATION}
        pressDelay={WAVE_STEP * 1}
      />

      {/* / separator */}
      <Text
        font={FONT_PATH}
        fontSize={SEPARATOR_FONT_SIZE}
        color={SEPARATOR_COLOUR}
        anchorX="center"
        anchorY="middle"
        position={[X_SLASH, 0.2, 0]}
      >
        /
      </Text>

      {/* left arrow key */}
      <Keycap
        label="<-"
        colour={leftColour}
        shadowColour={leftShadow}
        position={[X_LEFT_ARROW, 0, 0]}
        rotation={KEYCAP_ROTATION}
        pressDelay={WAVE_STEP * 2}
      />

      {/* right arrow key */}
      <Keycap
        label="->"
        colour={rightColour}
        shadowColour={rightShadow}
        position={[X_RIGHT_ARROW, 0, 0]}
        rotation={KEYCAP_ROTATION}
        pressDelay={WAVE_STEP * 3}
      />

      {/* OR separator */}
      <Text
        font={FONT_PATH}
        fontSize={SEPARATOR_FONT_SIZE}
        color={SEPARATOR_COLOUR}
        anchorX="center"
        anchorY="middle"
        position={[X_OR, 0.2, 0]}
      >
        OR
      </Text>

      {/* scroll indicator */}
      <Keycap
        label="scroll"
        colour={scrollColour}
        shadowColour={scrollShadow}
        position={[X_SCROLL, 0, 0]}
        rotation={KEYCAP_ROTATION}
        pressDelay={WAVE_STEP * 4}
      />
    </group>
  );
}
