'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import type { RefObject } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  LineBasicMaterial,
  type LineSegments,
} from 'three';
import { Keycap } from '../../entities';
import { LightingService } from '../lighting';
import { INK_EDGE_COLOUR } from '../../constants';
import type { InputHandle } from '../../inputs';
import { InputAction } from '../../types';

// world-space position of the tutorial group
const TUTORIAL_POSITION: [number, number, number] = [0, 0, 5];

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
// layout: [A] [D] / [<-] [->] OR [scroll icon]
const SEPARATOR_W = 0.5;
const OR_W = 0.8;

// group widths
const G1 = KEYCAP_W + GAP + KEYCAP_W; // A D
const S1 = GAP + SEPARATOR_W + GAP;    // /
const G2 = KEYCAP_W + GAP + KEYCAP_W; // <- ->
const S2 = GAP + OR_W + GAP;           // OR
const G3 = KEYCAP_W;                   // scroll icon
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

// scroll icon dimensions
const MOUSE_W = 0.38;
const MOUSE_H = 0.6;
const MOUSE_R = MOUSE_W / 2; // radius for rounded top
const WHEEL_LEN = 0.11;
const WHEEL_Y = MOUSE_H * 0.2; // slightly above centre
const CHEVRON_SIZE = 0.14;
const CHEVRON_GAP = 0.1; // gap between mouse body and chevron tip
const ARC_SEGMENTS = 8;

// chevron bob animation
const BOB_AMPLITUDE = 0.04;
const BOB_SPEED = 4;

// helper to push a line segment (x1,y1 -> x2,y2) on the XY plane
function pushLine(out: number[], x1: number, y1: number, x2: number, y2: number) {
  out.push(x1, y1, 0, x2, y2, 0);
}

// build the static mouse body + scroll wheel
function buildBodyGeometry(): BufferGeometry {
  const lines: number[] = [];

  const halfW = MOUSE_W / 2;
  const bottom = -MOUSE_H / 2;
  const arcCentreY = MOUSE_H / 2 - MOUSE_R;

  // left side
  pushLine(lines, -halfW, bottom, -halfW, arcCentreY);
  // right side
  pushLine(lines, halfW, bottom, halfW, arcCentreY);
  // bottom edge
  pushLine(lines, -halfW, bottom, halfW, bottom);

  // rounded top arc from left to right
  for (let i = 0; i < ARC_SEGMENTS; i++) {
    const a1 = Math.PI - (Math.PI * i) / ARC_SEGMENTS;
    const a2 = Math.PI - (Math.PI * (i + 1)) / ARC_SEGMENTS;
    pushLine(
      lines,
      Math.cos(a1) * MOUSE_R, arcCentreY + Math.sin(a1) * MOUSE_R,
      Math.cos(a2) * MOUSE_R, arcCentreY + Math.sin(a2) * MOUSE_R,
    );
  }

  // scroll wheel
  pushLine(lines, 0, WHEEL_Y - WHEEL_LEN / 2, 0, WHEEL_Y + WHEEL_LEN / 2);

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));
  return geo;
}

// build a single chevron pointing up, centred at origin
function buildChevronGeometry(): BufferGeometry {
  const lines: number[] = [];
  pushLine(lines, -CHEVRON_SIZE * 0.6, 0, 0, CHEVRON_SIZE);
  pushLine(lines, 0, CHEVRON_SIZE, CHEVRON_SIZE * 0.6, 0);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));
  return geo;
}

// procedural scroll mouse icon with bobbing chevrons
function ScrollIcon({ colour, position }: {
  colour?: string;
  position: [number, number, number];
}) {
  const bodyGeo = useMemo(() => buildBodyGeometry(), []);
  const chevronGeo = useMemo(() => buildChevronGeometry(), []);
  const upRef = useRef<LineSegments>(null);
  const downRef = useRef<LineSegments>(null);
  const elapsed = useRef(0);

  const material = useMemo(() => {
    const mode = LightingService.getMode();
    return new LineBasicMaterial({
      color: new Color(INK_EDGE_COLOUR[mode]),
      linewidth: 2,
    });
  }, []);

  // subscribe to theme changes and handle confirmed colour override
  useEffect(() => {
    if (colour) {
      material.color.set(colour);
      return;
    }
    material.color.set(INK_EDGE_COLOUR[LightingService.getMode()]);
    const unsub = LightingService.subscribe((mode) => {
      if (!colour) {
        material.color.set(INK_EDGE_COLOUR[mode]);
      }
    });
    return unsub;
  }, [material, colour]);

  // bob the chevrons up and down
  const upBaseY = MOUSE_H / 2 + CHEVRON_GAP;
  const downBaseY = -MOUSE_H / 2 - CHEVRON_GAP - CHEVRON_SIZE;

  useFrame((_, delta) => {
    elapsed.current += delta;
    const bob = Math.sin(elapsed.current * BOB_SPEED) * BOB_AMPLITUDE;
    if (upRef.current) upRef.current.position.y = upBaseY + bob;
    if (downRef.current) downRef.current.position.y = downBaseY - bob;
  });

  return (
    <group position={position}>
      <lineSegments geometry={bodyGeo} material={material} />
      {/* up chevron - points up */}
      <lineSegments
        ref={upRef}
        geometry={chevronGeo}
        material={material}
        position={[0, upBaseY, 0]}
      />
      {/* down chevron - flipped to point down */}
      <lineSegments
        ref={downRef}
        geometry={chevronGeo}
        material={material}
        position={[0, downBaseY, 0]}
        rotation={[0, 0, Math.PI]}
      />
    </group>
  );
}

function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: fine)').matches;
}

interface TutorialServiceProps {
  inputRef: RefObject<InputHandle>;
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
    const handle = inputRef.current;
    if (!handle) return;

    const input = handle.state;
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

      {/* scroll icon */}
      <ScrollIcon
        colour={scrollColour}
        position={[X_SCROLL, 0.2, 0]}
      />
    </group>
  );
}
