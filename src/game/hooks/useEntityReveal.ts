'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Color, Frustum, Matrix4, Vector3 } from 'three';
import type { Group, ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { easeOutCubic } from '../math';
import { LightingService } from '../services';
import { GROUND_COLOUR } from '../constants';
import { PerfLogger } from '../debug/PerfLogger';

// fallback edge duration when segment count isn't available yet (seconds)
const DEFAULT_EDGE_DURATION = 1.2;
// edge duration bounds for complexity-based scaling
const MIN_EDGE_DURATION = 0.5;
const MAX_EDGE_DURATION = 2.5;
// segment count at which edge duration approaches the max
const EDGE_COMPLEXITY_REF = 300;
// quick opacity fade so the white mesh doesn't pop in instantly
const DEFAULT_OPACITY_FADE_DURATION = 0.15;
// offset from edge completion before colour starts fading in.
// positive = pause after edges finish, negative = start colour before edges complete.
const DEFAULT_COLOUR_DELAY = -0.5;
// how long the colour/texture fade-in takes
const DEFAULT_COLOUR_DURATION = 0.5;

// draw progress is driven past 1 so the last edges fully extrude
// (needs to exceed max draw order + the per-segment extrusion window)
const DRAW_PROGRESS_OVERSHOOT = 1.1;

// delay before reveal starts for entities visible on initial page load (seconds)
const DEFAULT_INITIAL_DELAY = 2.0;

// if the entity enters the frustum within this many frames of mount,
// treat it as visible on initial page load and apply the delay
const INITIAL_LOAD_FRAME_THRESHOLD = 2;

const enum RevealPhase {
  Waiting,
  Delaying,
  Revealing,
  Done,
}

export interface EntityRevealOptions {
  edgeDuration?: number;
  colourDelay?: number;
  colourDuration?: number;
  opacityFadeDuration?: number;
  // delay before reveal starts for entities visible on initial page load.
  // only applies when the entity is in the frustum from the very first frame
  // (entities that scroll into view later skip the delay entirely).
  delay?: number;
  // skip viewport detection and reveal immediately (useful for testing)
  immediate?: boolean;
  // label for perf logging (only used when ?perf is in the URL)
  perfLabel?: string;
}

// draw progress uniform extended with segment count for complexity-based duration.
// the ink edges system writes segmentCount so the reveal hook can adapt timing.
export interface DrawProgressUniform {
  value: number;
  segmentCount: number;
}

// computes edge draw duration from the total segment count using sqrt scaling
function computeEdgeDuration(segmentCount: number): number {
  if (segmentCount <= 0) return DEFAULT_EDGE_DURATION;
  const t = Math.min(Math.sqrt(segmentCount / EDGE_COMPLEXITY_REF), 1);
  return MIN_EDGE_DURATION + (MAX_EDGE_DURATION - MIN_EDGE_DURATION) * t;
}

export interface EntityRevealResult {
  // shared uniform for ink edge draw-in progress (-1 = hidden, 0..1 = drawing, >1 = done).
  // also carries segmentCount written by the ink edges system.
  drawProgress: DrawProgressUniform;
  // shared uniform for toon material colour reveal (0 = white, 1 = coloured)
  colourProgress: { value: number };
  // connect this to your toon material in a useEffect to drive the reveal.
  // sets uRevealProgress and uOpacity on the material's uniforms.
  connectMaterial: (material: ShaderMaterial) => void;
}

export function useEntityReveal(
  groupRef: React.RefObject<Group | null>,
  options: EntityRevealOptions = {},
): EntityRevealResult {
  const {
    edgeDuration: userEdgeDuration,
    colourDelay = DEFAULT_COLOUR_DELAY,
    colourDuration = DEFAULT_COLOUR_DURATION,
    opacityFadeDuration = DEFAULT_OPACITY_FADE_DURATION,
    delay = DEFAULT_INITIAL_DELAY,
    immediate = false,
    perfLabel,
  } = options;

  // shared uniform objects that persist across renders.
  // segmentCount is written by the ink edges system so we can adapt edge duration.
  const drawProgress = useMemo<DrawProgressUniform>(() => ({ value: -1, segmentCount: 0 }), []);
  const colourProgress = useMemo(() => ({ value: 0 }), []);

  // track connected toon materials so we can drive their uOpacity and uRevealProgress
  const materialsRef = useRef<ShaderMaterial[]>([]);

  const connectMaterial = useMemo(() => {
    return (material: ShaderMaterial) => {
      if (!materialsRef.current.includes(material)) {
        materialsRef.current.push(material);
      }
      // set initial state: invisible with reveal base colour matching current mode
      material.uniforms.uOpacity.value = 0;
      material.uniforms.uRevealProgress.value = 0;
      material.uniforms.uRevealColour.value = new Color(GROUND_COLOUR[LightingService.getMode()]);
      material.transparent = true;
    };
  }, []);

  // keep reveal base colour in sync with the current lighting mode
  useEffect(() => {
    return LightingService.subscribe((mode) => {
      const col = new Color(GROUND_COLOUR[mode]);
      for (const mat of materialsRef.current) {
        mat.uniforms.uRevealColour.value = col;
      }
    });
  }, []);

  // animation state stored in refs to avoid re-renders
  const phaseRef = useRef(immediate ? RevealPhase.Revealing : RevealPhase.Waiting);
  const timerRef = useRef(0);
  // counts frames spent in the Waiting phase so we can detect initial-load entities
  const waitingFramesRef = useRef(0);
  // snapshotted edge duration, computed from segment count when the animation starts.
  // if the user provided an explicit edgeDuration, that takes priority.
  const effectiveEdgeDurationRef = useRef<number>(0);

  // reusable objects for frustum checks (avoids allocations per frame)
  const frustum = useMemo(() => new Frustum(), []);
  const projScreenMatrix = useMemo(() => new Matrix4(), []);
  const worldPos = useMemo(() => new Vector3(), []);

  // if immediate, set initial draw progress to 0 so edges start appearing
  if (immediate && drawProgress.value === -1) {
    drawProgress.value = 0;
  }

  useFrame(({ camera }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const phase = phaseRef.current;
    if (phase === RevealPhase.Done) return;

    // viewport detection: check if the entity is visible to the camera
    if (phase === RevealPhase.Waiting) {
      waitingFramesRef.current += 1;
      group.getWorldPosition(worldPos);
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

      if (frustum.containsPoint(worldPos)) {
        // entity was already in view on initial page load -- apply the delay
        const isInitialLoad = waitingFramesRef.current <= INITIAL_LOAD_FRAME_THRESHOLD;
        if (perfLabel) PerfLogger.mark(`reveal:${perfLabel}:visible`);
        if (isInitialLoad && delay > 0) {
          phaseRef.current = RevealPhase.Delaying;
          timerRef.current = 0;
        } else {
          // snapshot edge duration from segment count (or user override)
          effectiveEdgeDurationRef.current = userEdgeDuration ?? computeEdgeDuration(drawProgress.segmentCount);
          phaseRef.current = RevealPhase.Revealing;
          timerRef.current = 0;
          drawProgress.value = 0;
          if (perfLabel) PerfLogger.mark(`reveal:${perfLabel}:reveal-start`);
        }
      }
      return;
    }

    timerRef.current += delta;
    const t = timerRef.current;

    switch (phase) {
      // waiting for the initial-load delay to elapse before starting the reveal
      case RevealPhase.Delaying: {
        if (t >= delay) {
          // snapshot edge duration from segment count (or user override)
          effectiveEdgeDurationRef.current = userEdgeDuration ?? computeEdgeDuration(drawProgress.segmentCount);
          phaseRef.current = RevealPhase.Revealing;
          timerRef.current = 0;
          drawProgress.value = 0;
          if (perfLabel) PerfLogger.mark(`reveal:${perfLabel}:reveal-start`);
        }
        break;
      }

      // unified reveal: opacity, edges, and colour all driven from absolute time.
      // negative colourDelay starts colour before edges finish.
      case RevealPhase.Revealing: {
        const dur = effectiveEdgeDurationRef.current;

        // opacity fade
        const opacityT = Math.min(t / opacityFadeDuration, 1);
        for (const mat of materialsRef.current) {
          mat.uniforms.uOpacity.value = easeOutCubic(opacityT);
        }

        // edge drawing
        const edgeT = Math.min(t / dur, 1);
        drawProgress.value = easeOutCubic(edgeT) * DRAW_PROGRESS_OVERSHOOT;

        // colour fade (starts at edgeDuration + colourDelay, which can be before edges finish)
        const colourStart = dur + colourDelay;
        if (t >= colourStart) {
          const colourT = Math.min((t - colourStart) / colourDuration, 1);
          const progress = easeOutCubic(colourT);
          colourProgress.value = progress;
          for (const mat of materialsRef.current) {
            mat.uniforms.uRevealProgress.value = progress;
          }
        }

        // done when both edges and colour are complete
        const colourEnd = colourStart + colourDuration;
        if (t >= dur && t >= colourEnd) {
          phaseRef.current = RevealPhase.Done;
          if (perfLabel) PerfLogger.mark(`reveal:${perfLabel}:done`);
          // ensure final values are exact
          colourProgress.value = 1;
          for (const mat of materialsRef.current) {
            mat.uniforms.uRevealProgress.value = 1;
            mat.transparent = false;
          }
        }
        break;
      }
    }
  });

  return { drawProgress, colourProgress, connectMaterial };
}
