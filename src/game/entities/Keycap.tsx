'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Vector3,
} from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useEntityModel } from '../models';
import { useEntityReveal } from '../hooks';
import { LightingService } from '../services';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { INK_EDGE_COLOUR } from '../constants';
import { LightingMode } from '../types';

const SCALE = 0.5;

// press cycle timing (seconds)
const PRESS_INTERVAL = 1;
const PRESS_DURATION = 0.05;
const HOLD_DURATION = 0.3;
const RELEASE_DURATION = 0.15;
const PRESS_DEPTH = -0.3;

// total duration of one complete press cycle
const CYCLE_DURATION = PRESS_INTERVAL + PRESS_DURATION + HOLD_DURATION + RELEASE_DURATION;

// phase boundaries within a cycle
const PHASE_PRESS = PRESS_INTERVAL;
const PHASE_HOLD = PHASE_PRESS + PRESS_DURATION;
const PHASE_RELEASE = PHASE_HOLD + HOLD_DURATION;

// confetti burst settings
const LINE_COUNT = 14;
const MIN_RADIUS = 0.6;
const MAX_RADIUS = 0.75;
const LINE_LENGTH = 0.06;

// compute the cap Y position as a pure function of elapsed time and offset
function computeCapY(elapsed: number, offset: number): number {
  const local = elapsed - offset;
  if (local < 0) return 0;

  const phase = local % CYCLE_DURATION;
  if (phase < PHASE_PRESS) return 0;
  if (phase < PHASE_HOLD) {
    const t = (phase - PHASE_PRESS) / PRESS_DURATION;
    return MathUtils.lerp(0, PRESS_DEPTH, t);
  }
  if (phase < PHASE_RELEASE) return PRESS_DEPTH;

  const t = (phase - PHASE_RELEASE) / RELEASE_DURATION;
  return MathUtils.lerp(PRESS_DEPTH, 0, t);
}

// whether the burst should be visible (during the held phase)
function isBurstPhase(elapsed: number, offset: number): boolean {
  const local = elapsed - offset;
  if (local < 0) return false;
  const phase = local % CYCLE_DURATION;
  return phase >= PHASE_HOLD && phase < PHASE_RELEASE;
}

// which cycle index the keycap is in (used to detect new presses for burst regeneration)
function getCycleIndex(elapsed: number, offset: number): number {
  const local = elapsed - offset;
  if (local < 0) return -1;
  return Math.floor(local / CYCLE_DURATION);
}

// label text settings
const FONT_PATH = '/assets/fonts/justanotherhand_regular.ttf';
const LABEL_FONT_SIZE = 0.5;
const LABEL_OFFSET: [number, number, number] = [0, 0.4, 0.1];
const LABEL_COLOUR = '#1a1a1a';

// themed confetti colours - black in light mode, white in dark mode
const CONFETTI_COLOUR: Record<LightingMode, string> = {
  [LightingMode.Light]: '#1a1a1a',
  [LightingMode.Dark]: '#e0e0e0',
};

// build random radial line segments around the origin on the XZ plane
function generateBurstGeometry(): BufferGeometry {
  const positions = new Float32Array(LINE_COUNT * 6); // 2 vertices * 3 components per line

  for (let i = 0; i < LINE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / LINE_COUNT + (Math.random() - 0.5) * 0.4;
    const radius = MathUtils.lerp(MIN_RADIUS, MAX_RADIUS, Math.random());
    const yOffset = (Math.random() - 0.5) * 0.03;

    // start point
    const sx = Math.cos(angle) * radius;
    const sz = Math.sin(angle) * radius;

    // end point extends outward
    const ex = Math.cos(angle) * (radius + LINE_LENGTH);
    const ez = Math.sin(angle) * (radius + LINE_LENGTH);

    const idx = i * 6;
    positions[idx] = sx;
    positions[idx + 1] = yOffset;
    positions[idx + 2] = sz;
    positions[idx + 3] = ex;
    positions[idx + 4] = yOffset;
    positions[idx + 5] = ez;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  return geometry;
}

// default keycap colours
const DEFAULT_COLOUR = '#d4cfc8';
const DEFAULT_SHADOW = '#8a8078';

export type KeycapProps = ThreeElements['group'] & {
  // optional text label rendered on the keycap face
  label?: string;
  // override toon material colour (e.g. for turning green on input confirmation)
  colour?: string;
  // override toon material shadow colour
  shadowColour?: string;
  // when false the keycap sits idle instead of auto-pressing on a timer (default true)
  autoPress?: boolean;
  // time offset in seconds into the press cycle, used to stagger keycaps in a wave
  pressOffset?: number;
  // material opacity 0-1, enables transparency when < 1
  opacity?: number;
};

export interface KeycapHandle {
  group: Group;
}

export const Keycap = forwardRef<KeycapHandle, KeycapProps>(
  function Keycap({
    label,
    colour = DEFAULT_COLOUR,
    shadowColour = DEFAULT_SHADOW,
    autoPress = true,
    pressOffset = 0,
    opacity = 1,
    ...props
  }, ref) {
    const localRef = useRef<Group>(null);
    const modelRef = useRef<Group>(null);
    const capRef = useRef<Group>(null);
    const burstRef = useRef<LineSegments>(null);
    const textRef = useRef<any>(null);

    const elapsed = useRef(0);
    const lastCycle = useRef(-1);

    const { cloned, material } = useEntityModel('keycap', {
      color: DEFAULT_COLOUR,
      shadowColor: DEFAULT_SHADOW,
    });

    const { drawProgress, colourProgress, connectMaterial } = useEntityReveal(localRef, { perfLabel: 'Keycap' });

    // reusable vector for world position lookups
    const worldPos = useMemo(() => new Vector3(), []);

    // confetti burst material with theme subscription
    const burstMaterial = useMemo(() => {
      const mode = LightingService.getMode();
      return new LineBasicMaterial({ color: new Color(CONFETTI_COLOUR[mode]) });
    }, []);

    useEffect(() => {
      const unsub = LightingService.subscribe((mode) => {
        burstMaterial.color.set(CONFETTI_COLOUR[mode]);
      });
      return unsub;
    }, [burstMaterial]);

    // sync toon material colour when props change (opacity is managed by the reveal hook)
    useEffect(() => {
      material.uniforms.uColor.value.set(colour);
      material.uniforms.uShadowColor.value.set(shadowColour);
    }, [material, colour, shadowColour]);

    // connect material to the reveal system (runs after the colour effect above)
    useEffect(() => {
      connectMaterial(material);
    }, [material, connectMaterial]);

    // sync burst + text opacity
    useEffect(() => {
      burstMaterial.opacity = opacity;
      burstMaterial.transparent = opacity < 1;
    }, [burstMaterial, opacity]);

    // initial burst geometry (hidden)
    const burstGeometry = useMemo(() => generateBurstGeometry(), []);

    useFrame((_, delta) => {
      const cap = capRef.current;
      const burst = burstRef.current;
      const root = localRef.current;
      if (!cap || !burst || !root) return;

      // update the clip Y uniform so geometry below the resting position is discarded
      root.getWorldPosition(worldPos);
      material.uniforms.uClipY.value = worldPos.y;

      // fade label text in with the reveal colour phase
      if (textRef.current) {
        textRef.current.fillOpacity = colourProgress.value * opacity;
      }

      // skip the auto-press cycle when autoPress is disabled
      if (!autoPress) return;

      elapsed.current += delta;

      // derive position and burst state from the formula
      cap.position.y = computeCapY(elapsed.current, pressOffset);

      const showBurst = isBurstPhase(elapsed.current, pressOffset);
      const cycle = getCycleIndex(elapsed.current, pressOffset);

      // regenerate burst geometry when entering a new cycle's held phase
      if (showBurst && cycle !== lastCycle.current) {
        lastCycle.current = cycle;
        const newGeo = generateBurstGeometry();
        burst.geometry.dispose();
        burst.geometry = newGeo;
      }

      burst.visible = showBurst;
    });

    useImperativeHandle(ref, () => ({
      get group() {
        return localRef.current!;
      },
    }), []);

    return (
      <group ref={localRef} {...props}>
        <group ref={capRef}>
          {/* model group kept separate so ink edges don't target text meshes */}
          <group ref={modelRef}>
            <primitive object={cloned} scale={SCALE} />
          </group>
          {label && (
            <Text
              ref={textRef}
              font={FONT_PATH}
              fontSize={LABEL_FONT_SIZE}
              color={LABEL_COLOUR}
              fillOpacity={0}
              anchorX="center"
              anchorY="middle"
              position={LABEL_OFFSET}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              {label}
            </Text>
          )}
        </group>
        <lineSegments
          ref={burstRef}
          geometry={burstGeometry}
          material={burstMaterial}
          visible={false}
        />
        <InkEdgesGroup
          target={modelRef}
          colour={INK_EDGE_COLOUR[LightingMode.Light]}
          darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
          seed={77}
          width={3}
          gapFreq={10}
          gapThreshold={0.38}
          clipY={material.uniforms.uClipY}
          opacity={opacity}
          drawProgress={drawProgress}
        />
      </group>
    );
  },
);
