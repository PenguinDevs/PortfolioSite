'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { LightingService } from '../services';
import { LightingMode } from '../types';

// pool of horizontal streaks that trail behind the penguin
const LINE_COUNT = 14;
// vertical offset so lines centre around the penguin's body rather than feet
const OFFSET_Y = 1.2;
// how far above/below that centre lines can spawn
const SPREAD_Y = 1.8;
// depth spread (Z axis)
const SPREAD_Z = 0.8;
// how far behind the penguin lines spawn (local X)
const SPAWN_OFFSET_X = 0.1;
// range of random extra offset behind the spawn point
const SPAWN_JITTER_X = 0.4;
// min/max streak length
const MIN_LENGTH = 0.3;
const MAX_LENGTH = 1.0;
// how long each streak lives before respawning
const LINE_LIFETIME = 0.25;
// how fast lines drift away from the penguin (units/sec)
const DRIFT_SPEED = 8;
// target opacity when fully visible
const MAX_OPACITY = 0.7;
// how fast the opacity fades in/out per second
const FADE_SPEED = 6;

// themed colours matching the ink edge palette
const SPEED_LINE_COLOUR: Record<LightingMode, string> = {
  [LightingMode.Light]: '#1a1a1a',
  [LightingMode.Dark]: '#e0e0e0',
};

interface SpeedLine {
  age: number;
  lifetime: number;
  y: number;
  z: number;
  startX: number;
  length: number;
  // direction the line drifts: matches the penguin's trailing side
  driftSign: number;
}

interface SpeedLinesProps {
  activeRef: RefObject<boolean>;
  // -1 for left, +1 for right
  directionRef: RefObject<number>;
}

export function SpeedLines({ activeRef, directionRef }: SpeedLinesProps) {
  const linesRef = useRef<LineSegments>(null);
  const poolRef = useRef<SpeedLine[]>([]);
  const prevActive = useRef(false);

  // shared geometry and material
  const geometry = useMemo(() => {
    // 2 vertices per line, 3 floats per vertex
    const positions = new Float32Array(LINE_COUNT * 6);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    return geo;
  }, []);

  const material = useMemo(() => {
    const mode = LightingService.getMode();
    return new LineBasicMaterial({
      color: new Color(SPEED_LINE_COLOUR[mode]),
      transparent: true,
      opacity: 0.7,
    });
  }, []);

  // subscribe to theme changes
  useEffect(() => {
    const unsub = LightingService.subscribe((mode) => {
      material.color.set(SPEED_LINE_COLOUR[mode]);
    });
    return unsub;
  }, [material]);

  // spawn a single line with random placement
  function spawnLine(dir: number): SpeedLine {
    const driftSign = -dir; // lines trail behind the penguin
    return {
      age: Math.random() * LINE_LIFETIME, // stagger initial ages
      lifetime: LINE_LIFETIME,
      y: OFFSET_Y + (Math.random() - 0.5) * SPREAD_Y,
      z: (Math.random() - 0.5) * SPREAD_Z,
      startX: driftSign * (SPAWN_OFFSET_X + Math.random() * SPAWN_JITTER_X),
      length: MIN_LENGTH + Math.random() * (MAX_LENGTH - MIN_LENGTH),
      driftSign,
    };
  }

  useFrame((_, delta) => {
    const seg = linesRef.current;
    if (!seg) return;

    const active = activeRef.current;
    const direction = directionRef.current;

    // initialise pool when first activated
    if (active && !prevActive.current) {
      const dir = direction || 1;
      poolRef.current = Array.from({ length: LINE_COUNT }, () => spawnLine(dir));
    }
    prevActive.current = active;

    // lerp opacity toward target
    const targetOpacity = active ? MAX_OPACITY : 0;
    material.opacity += (targetOpacity - material.opacity) * FADE_SPEED * delta;

    // hide geometry once fully faded out
    const visible = material.opacity > 0.01;
    seg.visible = visible;
    if (!visible) return;

    const pool = poolRef.current;
    const positions = geometry.attributes.position as BufferAttribute;
    const arr = positions.array as Float32Array;
    const dir = direction || 1;

    for (let i = 0; i < LINE_COUNT; i++) {
      let line = pool[i];
      line.age += delta;

      // respawn when expired (only while active, otherwise let them finish)
      if (line.age >= line.lifetime) {
        if (active) {
          line = spawnLine(dir);
          line.age = 0;
          pool[i] = line;
        } else {
          // collapse to zero-length so it disappears naturally
          const idx = i * 6;
          arr[idx] = 0; arr[idx + 1] = 0; arr[idx + 2] = 0;
          arr[idx + 3] = 0; arr[idx + 4] = 0; arr[idx + 5] = 0;
          continue;
        }
      }

      // normalised progress 0..1
      const t = line.age / line.lifetime;
      // shrink the line as it ages
      const fade = 1 - t;
      const currentLength = line.length * fade;

      // drift the line away from the penguin over its lifetime
      const drift = line.driftSign * DRIFT_SPEED * line.age;
      const x = line.startX + drift;

      // write start vertex
      const idx = i * 6;
      arr[idx] = x;
      arr[idx + 1] = line.y;
      arr[idx + 2] = line.z;
      // write end vertex (extends further in the drift direction)
      arr[idx + 3] = x + line.driftSign * currentLength;
      arr[idx + 4] = line.y;
      arr[idx + 5] = line.z;
    }

    positions.needsUpdate = true;
  });

  return (
    <lineSegments
      ref={linesRef}
      geometry={geometry}
      material={material}
      visible={false}
    />
  );
}
