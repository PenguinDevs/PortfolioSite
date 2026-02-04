'use client';

import { useMemo, useRef } from 'react';
import { Vector3, Quaternion, Euler, MathUtils, Mesh, type Object3D, type Group } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useEntityModel } from '../models';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { LightingMode } from '../types';
import { INK_EDGE_COLOUR } from '../constants';
import { quadraticBezier, easeInOutCubic, easeOutBack } from '../math';

// how long each letter takes to reach its destination (seconds)
const LETTER_DURATION = 2.2;

// how far the bezier control point dips below the midpoint
const CURVE_DIP = 0.5;

// how many extra full rotations each letter does during the intro (randomised per letter)
const MIN_EXTRA_SPINS = 1;
const MAX_EXTRA_SPINS = 3;

// prefix used to identify letter objects in the GLB
const LETTER_PREFIX = 'letter_';

// max frame delta to prevent the animation skipping on load or tab-resume
const MAX_DELTA = 0.05;

// subtle idle rotation jitter applied after the intro animation
const JITTER_INTERVAL = 1 / 3; // seconds between jitter updates (3fps)
const JITTER_MAX_ANGLE = 0.04; // max rotation offset in radians (~2.3 degrees)

// rotation takes this much longer than position to settle (multiplier on LETTER_DURATION)
const ROTATION_DURATION_SCALE = 1.3;

// seconds to wait after mount before the letter animation begins
const LETTER_DELAY = 1;

// text label config
const FONT_PATH = '/assets/fonts/justanotherhand_regular.ttf';
const TEXT_COLOUR = '#1a1a1a';
const TOP_TEXT = 'Hi, my name is';
const BOTTOM_TEXT = 'or PenguinDevs\nbackend developer \u2022 studying computer science w/ maths minor \u2022 gamer';
const TOP_FONT_SIZE = 0.7;
const BOTTOM_FONT_SIZE = 0.4;

// how far above/below the name the labels sit (local Y)
const TOP_TEXT_Y = 1;
const BOTTOM_TEXT_Y = -0.2;

// seconds after mount before the text labels start fading in
const TEXT_DELAY = LETTER_DELAY + LETTER_DURATION - 0.3;
// how long the text fade-in takes
const TEXT_FADE_DURATION = 1.5;

// responsive scaling: the viewport width (px) at which scale = 1
// wider screens scale up, narrower screens keep the current size
const REFERENCE_WIDTH = 500;
// cap so it doesn't get too large on desktop
const MAX_SCALE = 1.4;

interface LetterAnimState {
  // all meshes in this letter's subtree (parent + children)
  meshes: Mesh[];
  // the named parent object we move/rotate
  object: Object3D;
  restPosition: Vector3;
  startPosition: Vector3;
  controlPoint: Vector3;
  // random initial rotation the letter starts at (sub-180 degrees, used with slerp)
  startQuat: Quaternion;
  // extra multi-revolution spin tracked separately (slerp can't do >180 degrees)
  spinAxis: Vector3;
  spinAngle: number;
  elapsed: number;
  // current jitter target rotation for idle wobble
  jitterTarget: Quaternion;
}

export function NameTitle(props: ThreeElements['group']) {
  const localRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  const { cloned } = useEntityModel('jason', {
    color: '#d4cfc8',
    shadowColor: '#8a8078',
    lightDir: [0.5, 2, -1],
  });

  // scale up on wider viewports so the title isn't tiny on desktop
  const { size } = useThree();
  const responsiveScale = Math.min(Math.max(size.width / REFERENCE_WIDTH, 1), MAX_SCALE);

  // temporary vectors/quats to avoid allocations in the frame loop
  const tempPos = useMemo(() => new Vector3(), []);
  const identityQuat = useMemo(() => new Quaternion(), []);
  const tempSpinQuat = useMemo(() => new Quaternion(), []);

  // mutable animation state stored in a ref so strict mode re-renders don't reset it
  const animRef = useRef<LetterAnimState[] | null>(null);
  // track which cloned object the states belong to
  const clonedRef = useRef<Group | null>(null);

  // refs for the text labels so we can animate their opacity
  const topTextRef = useRef<any>(null);
  const bottomTextRef = useRef<any>(null);
  // total elapsed time since mount for the text delay
  const totalElapsedRef = useRef(0);

  // centroid of the letter positions in outer-group space, used to centre the scale pivot
  const centreOffsetRef = useRef(new Vector3());

  // accumulator for the 12fps jitter tick
  const jitterClockRef = useRef(0);
  // reusable euler for generating jitter targets
  const tempEuler = useMemo(() => new Euler(), []);

  // build the animation state once per cloned object
  if (clonedRef.current !== cloned) {
    clonedRef.current = cloned;

    // first pass: collect letter objects and cache their rest positions
    const letterChildren: { child: Object3D; restPosition: Vector3 }[] = [];
    cloned.traverse((child: Object3D) => {
      if (!child.name.startsWith(LETTER_PREFIX)) return;
      if (!child.userData._restPos) {
        child.userData._restPos = child.position.clone();
      }
      letterChildren.push({
        child,
        restPosition: (child.userData._restPos as Vector3).clone(),
      });
    });

    // compute the centroid of all letter rest positions
    const centre = new Vector3();
    for (const { restPosition } of letterChildren) {
      centre.add(restPosition);
    }
    if (letterChildren.length > 0) {
      centre.divideScalar(letterChildren.length);
    }

    // second pass: build animation states using the centroid as the shared start
    const states: LetterAnimState[] = [];
    for (const { child, restPosition } of letterChildren) {
      const startPosition = centre.clone();

      const midY = (startPosition.y + restPosition.y) / 2;
      const controlPoint = new Vector3(
        (startPosition.x + restPosition.x) / 2,
        midY - CURVE_DIP,
        (startPosition.z + restPosition.z) / 2,
      );

      // random sub-revolution start orientation (slerp handles this part)
      const startQuat = new Quaternion().setFromEuler(
        new Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        ),
      );

      // extra full spins on a random axis, interpolated manually since slerp
      // always takes the shortest path and can't represent >180 degree rotations
      const extraSpins = MIN_EXTRA_SPINS + Math.floor(Math.random() * (MAX_EXTRA_SPINS - MIN_EXTRA_SPINS + 1));
      const spinAngle = extraSpins * Math.PI * 2;
      const spinAxis = new Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();

      // collect every mesh in this letter's subtree
      const meshes: Mesh[] = [];
      if ((child as Mesh).isMesh) meshes.push(child as Mesh);
      child.traverse((desc: Object3D) => {
        if (desc !== child && (desc as Mesh).isMesh) meshes.push(desc as Mesh);
      });

      // force matrixAutoUpdate on the entire subtree
      child.matrixAutoUpdate = true;
      child.traverse((desc: Object3D) => {
        desc.matrixAutoUpdate = true;
      });

      // start invisible at the centre
      child.scale.setScalar(0);
      child.position.copy(startPosition);

      states.push({
        meshes,
        object: child,
        restPosition,
        startPosition,
        controlPoint,
        startQuat,
        spinAxis,
        spinAngle,
        elapsed: 0,
        jitterTarget: new Quaternion(),
      });
    }

    animRef.current = states;

    // transform the GLB-space centroid through the model rotation (-PI/2 around Y)
    // so it's in the outer group's coordinate space for centring the scale pivot
    centreOffsetRef.current.set(-centre.z, centre.y, centre.x);
  }

  useFrame((_, delta) => {
    const states = animRef.current;
    if (!states) return;

    const clampedDelta = Math.min(delta, MAX_DELTA);
    totalElapsedRef.current += clampedDelta;

    // fade in the text labels after the delay
    const textProgress = MathUtils.clamp(
      (totalElapsedRef.current - TEXT_DELAY) / TEXT_FADE_DURATION,
      0,
      1,
    );
    const textOpacity = easeInOutCubic(textProgress);
    if (topTextRef.current) {
      topTextRef.current.fillOpacity = textOpacity;
    }
    if (bottomTextRef.current) {
      bottomTextRef.current.fillOpacity = textOpacity;
    }

    // wait for the scene to load before starting the letter animation
    if (totalElapsedRef.current < LETTER_DELAY) return;

    // tick the jitter clock and pick new random targets at 3fps
    jitterClockRef.current += clampedDelta;
    const shouldJitter = jitterClockRef.current >= JITTER_INTERVAL;
    if (shouldJitter) {
      jitterClockRef.current -= JITTER_INTERVAL;
      for (const state of states) {
        // pick a small random rotation offset from identity
        tempEuler.set(
          (Math.random() - 0.5) * 2 * JITTER_MAX_ANGLE,
          (Math.random() - 0.5) * 2 * JITTER_MAX_ANGLE,
          (Math.random() - 0.5) * 2 * JITTER_MAX_ANGLE,
        );
        state.jitterTarget.setFromEuler(tempEuler);
      }
    }

    const rotationDuration = LETTER_DURATION * ROTATION_DURATION_SCALE;

    for (const state of states) {
      // still playing the intro animation (rotation outlasts position)
      if (state.elapsed < rotationDuration) {
        state.elapsed += clampedDelta;

        const rawProgress = MathUtils.clamp(state.elapsed / LETTER_DURATION, 0, 1);
        const posT = easeInOutCubic(rawProgress);

        // position along the bezier curve (saturates at LETTER_DURATION)
        quadraticBezier(state.startPosition, state.controlPoint, state.restPosition, posT, tempPos);
        state.object.position.copy(tempPos);

        const scaleT = easeInOutCubic(rawProgress);
        state.object.scale.setScalar(scaleT);
        for (const mesh of state.meshes) {
          mesh.scale.setScalar(scaleT);
        }

        // rotation runs on a longer timeline than position
        const rotProgress = MathUtils.clamp(state.elapsed / rotationDuration, 0, 1);
        const rotT = easeOutBack(rotProgress, 0.75);

        // extra spins: interpolate angle from full spin down to 0
        const remainingSpin = state.spinAngle * (1 - rotT);
        tempSpinQuat.setFromAxisAngle(state.spinAxis, remainingSpin);

        // combine: spin * slerp(startQuat -> identity) * jitter
        state.object.quaternion.copy(state.startQuat).slerp(identityQuat, rotT);
        state.object.quaternion.premultiply(tempSpinQuat);
        state.object.quaternion.multiply(state.jitterTarget);
        continue;
      }

      // idle: snap to the current jitter target each tick
      if (shouldJitter) {
        state.object.quaternion.copy(state.jitterTarget);
      }
    }
  });

  const cx = centreOffsetRef.current.x;
  const cy = centreOffsetRef.current.y;
  const cz = centreOffsetRef.current.z;

  return (
    <group ref={localRef} {...props}>
      {/* scale around the centre of the text, not the bottom-left origin */}
      <group scale={responsiveScale}>
        <group position={[-cx, -cy, -cz]}>
          {/* model kept in its own group so ink edges don't target the text meshes */}
          <group ref={modelRef} rotation={[0, -Math.PI / 2, 0]}>
            <primitive object={cloned} />
          </group>

          {/* top label */}
          <Text
            ref={topTextRef}
            font={FONT_PATH}
            fontSize={TOP_FONT_SIZE}
            color={TEXT_COLOUR}
            anchorX="left"
            anchorY="bottom"
            position={[0, TOP_TEXT_Y, 0]}
            fillOpacity={0}
          >
            {TOP_TEXT}
          </Text>

          {/* bottom label */}
          <Text
            ref={bottomTextRef}
            font={FONT_PATH}
            fontSize={BOTTOM_FONT_SIZE}
            color={TEXT_COLOUR}
            anchorX="left"
            anchorY="top"
            position={[0, BOTTOM_TEXT_Y, 0]}
            fillOpacity={0}
          >
            {BOTTOM_TEXT}
          </Text>

          <InkEdgesGroup
            target={modelRef}
            colour={INK_EDGE_COLOUR[LightingMode.Light]}
            darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
            seed={99}
            width={3}
            gapFreq={10}
            gapThreshold={0.38}
          />
        </group>
      </group>
    </group>
  );
}
