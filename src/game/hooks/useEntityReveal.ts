'use client';

import { useMemo, useRef } from 'react';
import { Frustum, Matrix4, Vector3 } from 'three';
import type { Group, ShaderMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { easeOutCubic } from '../math';

// how long the ink edge draw-in takes (seconds)
const DEFAULT_EDGE_DURATION = 1.2;
// quick opacity fade so the white mesh doesn't pop in instantly
const DEFAULT_OPACITY_FADE_DURATION = 0.15;
// pause after edges finish before colour starts fading in
const DEFAULT_COLOUR_DELAY = 0.1;
// how long the colour/texture fade-in takes
const DEFAULT_COLOUR_DURATION = 0.8;

// draw progress is driven slightly past 1 so the last edge fully appears
// (the smoothstep transition zone needs a little headroom)
const DRAW_PROGRESS_OVERSHOOT = 1.05;

const enum RevealPhase {
  Waiting,
  FadingIn,
  DrawingEdges,
  ColourDelay,
  ColouringIn,
  Done,
}

export interface EntityRevealOptions {
  edgeDuration?: number;
  colourDelay?: number;
  colourDuration?: number;
  opacityFadeDuration?: number;
  // skip viewport detection and reveal immediately (useful for testing)
  immediate?: boolean;
}

export interface EntityRevealResult {
  // shared uniform for ink edge draw-in progress (-1 = hidden, 0..1 = drawing, >1 = done)
  drawProgress: { value: number };
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
    edgeDuration = DEFAULT_EDGE_DURATION,
    colourDelay = DEFAULT_COLOUR_DELAY,
    colourDuration = DEFAULT_COLOUR_DURATION,
    opacityFadeDuration = DEFAULT_OPACITY_FADE_DURATION,
    immediate = false,
  } = options;

  // shared uniform objects that persist across renders
  const drawProgress = useMemo(() => ({ value: -1 }), []);
  const colourProgress = useMemo(() => ({ value: 0 }), []);

  // track connected toon materials so we can drive their uOpacity and uRevealProgress
  const materialsRef = useRef<ShaderMaterial[]>([]);

  const connectMaterial = useMemo(() => {
    return (material: ShaderMaterial) => {
      if (!materialsRef.current.includes(material)) {
        materialsRef.current.push(material);
      }
      // set initial state: invisible and white
      material.uniforms.uOpacity.value = 0;
      material.uniforms.uRevealProgress.value = 0;
      material.transparent = true;
    };
  }, []);

  // animation state stored in refs to avoid re-renders
  const phaseRef = useRef(immediate ? RevealPhase.FadingIn : RevealPhase.Waiting);
  const timerRef = useRef(0);

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
      group.getWorldPosition(worldPos);
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

      if (frustum.containsPoint(worldPos)) {
        phaseRef.current = RevealPhase.FadingIn;
        timerRef.current = 0;
        drawProgress.value = 0;
      }
      return;
    }

    timerRef.current += delta;
    const t = timerRef.current;

    switch (phase) {
      // quick opacity fade: mesh becomes visible as white
      case RevealPhase.FadingIn: {
        const opacityT = Math.min(t / opacityFadeDuration, 1);
        const opacity = easeOutCubic(opacityT);
        for (const mat of materialsRef.current) {
          mat.uniforms.uOpacity.value = opacity;
        }
        // start edge drawing at the same time
        const edgeT = Math.min(t / edgeDuration, 1);
        drawProgress.value = easeOutCubic(edgeT) * DRAW_PROGRESS_OVERSHOOT;

        if (opacityT >= 1) {
          phaseRef.current = RevealPhase.DrawingEdges;
          // don't reset timer -- edge drawing is already in progress from the same start time
        }
        break;
      }

      // ink edges drawing in
      case RevealPhase.DrawingEdges: {
        const edgeT = Math.min(t / edgeDuration, 1);
        drawProgress.value = easeOutCubic(edgeT) * DRAW_PROGRESS_OVERSHOOT;

        if (edgeT >= 1) {
          phaseRef.current = RevealPhase.ColourDelay;
          timerRef.current = 0;
        }
        break;
      }

      // short pause between edge completion and colour fade
      case RevealPhase.ColourDelay: {
        if (t >= colourDelay) {
          phaseRef.current = RevealPhase.ColouringIn;
          timerRef.current = 0;
        }
        break;
      }

      // colour/texture fading in
      case RevealPhase.ColouringIn: {
        const colourT = Math.min(t / colourDuration, 1);
        const progress = easeOutCubic(colourT);
        colourProgress.value = progress;
        for (const mat of materialsRef.current) {
          mat.uniforms.uRevealProgress.value = progress;
        }

        if (colourT >= 1) {
          phaseRef.current = RevealPhase.Done;
          // ensure final values are exact
          colourProgress.value = 1;
          for (const mat of materialsRef.current) {
            mat.uniforms.uRevealProgress.value = 1;
            // disable transparency now that the entity is fully opaque
            mat.transparent = false;
          }
        }
        break;
      }
    }
  });

  return { drawProgress, colourProgress, connectMaterial };
}
