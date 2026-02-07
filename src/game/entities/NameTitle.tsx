'use client';

import { useMemo, useRef } from 'react';
import { Vector3, Quaternion, Euler, MathUtils, Mesh, type Object3D, type Group } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import { useEntityModel } from '../models';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { LightingMode } from '../types';
import { INK_EDGE_COLOUR } from '../constants';
import { useLightingMode } from '../hooks';
import { useSocialLinks } from '../contexts';
import type { SocialLinks } from '@/data/portfolio';
import { quadraticBezier, easeInOutCubic, easeOutBack } from '../math';
import { PerfLogger } from '../debug/PerfLogger';

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
const TOP_TEXT = 'Hi, I\'m';
const BOTTOM_TEXT = 'or PenguinDevs\nbackend developer \u2022 studying computer science w/ maths minor';
const TOP_FONT_SIZE = 0.7;
const BOTTOM_FONT_SIZE = 0.4;

// how far above/below the name the labels sit (local Y)
const TOP_TEXT_Y = 1;
const BOTTOM_TEXT_Y = -0.2;
const SOCIAL_LINKS_Y = -1.4;

// seconds after mount before the text labels start fading in
const TEXT_DELAY = LETTER_DELAY + LETTER_DURATION - 0.3;
// how long the text fade-in takes
const TEXT_FADE_DURATION = 1.5;

// instant tilt applied on hover (alternates direction per icon)
const SOCIAL_HOVER_TILT_DEG = 10;

// display config for each social platform, keyed by the field name in portfolio.yaml
interface SocialLinkConfig {
  key: keyof SocialLinks;
  label: string;
  bgColour: string;
  hoverBgColour: string;
  icon: { viewBox: string; path: string };
}

const SOCIAL_LINK_CONFIG: SocialLinkConfig[] = [
  {
    key: 'github',
    label: 'GitHub',
    bgColour: '#111827',
    hoverBgColour: '#1f2937',
    icon: {
      viewBox: '0 0 20 20',
      path: 'M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z',
    },
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    bgColour: '#2563eb',
    hoverBgColour: '#1d4ed8',
    icon: {
      viewBox: '0 0 20 20',
      path: 'M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z',
    },
  },
  {
    key: 'x',
    label: 'X',
    bgColour: '#000000',
    hoverBgColour: '#1f2937',
    icon: {
      viewBox: '0 0 24 24',
      path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    },
  },
  {
    key: 'discord',
    label: 'Discord',
    bgColour: '#4f46e5',
    hoverBgColour: '#4338ca',
    icon: {
      viewBox: '0 0 16 16',
      path: 'M13.545 2.907a13.2 13.2 0 00-3.257-1.011.05.05 0 00-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 00-3.658 0 8 8 0 00-.412-.833.05.05 0 00-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 00-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 003.995 2.02.05.05 0 00.056-.019q.463-.63.818-1.329a.05.05 0 00-.01-.059l-.018-.011a9 9 0 01-1.248-.595.05.05 0 01-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 01.051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 01.053.007q.121.1.248.195a.05.05 0 01-.004.085 8 8 0 01-1.249.594.05.05 0 00-.03.03.05.05 0 00.003.041c.24.465.515.909.817 1.329a.05.05 0 00.056.019 13.2 13.2 0 004.001-2.02.05.05 0 00.021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 00-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612',
    },
  },
];

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
  const mode = useLightingMode();
  const textColour = INK_EDGE_COLOUR[mode];
  const socialLinks = useSocialLinks();
  const localRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  const { cloned } = useEntityModel('jason', {
    color: '#d4cfc8',
    shadowColor: '#8a8078',
    lightDir: [0.5, 2, -1],
    castShadow: false,
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
  const socialRef = useRef<HTMLDivElement>(null);
  // total elapsed time since mount for the text delay
  const totalElapsedRef = useRef(0);
  // perf logging flags (only used when ?perf is in the URL)
  const perfMarksRef = useRef({ letters: false, text: false, done: false });

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
    if (textProgress > 0 && !perfMarksRef.current.text) {
      perfMarksRef.current.text = true;
      PerfLogger.mark('nametitle:text-start');
    }
    const textOpacity = easeInOutCubic(textProgress);
    if (topTextRef.current) {
      topTextRef.current.fillOpacity = textOpacity;
    }
    if (bottomTextRef.current) {
      bottomTextRef.current.fillOpacity = textOpacity;
    }
    if (socialRef.current) {
      socialRef.current.style.opacity = String(textOpacity);
    }

    // wait for the scene to load before starting the letter animation
    if (totalElapsedRef.current < LETTER_DELAY) return;

    if (!perfMarksRef.current.letters) {
      perfMarksRef.current.letters = true;
      PerfLogger.mark('nametitle:letters-start');
    }

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

    if (textProgress >= 1 && !perfMarksRef.current.done) {
      perfMarksRef.current.done = true;
      PerfLogger.mark('nametitle:complete');
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
            color={textColour}
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
            color={textColour}
            anchorX="left"
            anchorY="top"
            position={[0, BOTTOM_TEXT_Y, 0]}
            fillOpacity={0}
          >
            {BOTTOM_TEXT}
          </Text>

          {/* social links */}
          <Html
            transform
            distanceFactor={5}
            position={[0, SOCIAL_LINKS_Y, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div
              ref={socialRef}
              style={{
                opacity: 0,
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                pointerEvents: 'auto',
                // drei centres Html content via translate(-50%,-50%) on the wrapper;
                // shift right by 50% of our own width to left-align with the text above
                transform: 'translateX(50%)',
              }}
            >
              {SOCIAL_LINK_CONFIG.map((config, i) => {
                // alternate tilt direction per icon
                const tiltDeg = (i % 2 === 0 ? 1 : -1) * SOCIAL_HOVER_TILT_DEG;
                return (
                <a
                  key={config.key}
                  href={socialLinks[config.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: config.bgColour,
                    color: '#ffffff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'background-color 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = config.hoverBgColour;
                    e.currentTarget.style.transform = `rotate(${tiltDeg}deg)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = config.bgColour;
                    e.currentTarget.style.transform = '';
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox={config.icon.viewBox}
                    fill="currentColor"
                  >
                    <path d={config.icon.path} />
                  </svg>
                  <span>{config.label}</span>
                </a>
                );
              })}
            </div>
          </Html>

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
