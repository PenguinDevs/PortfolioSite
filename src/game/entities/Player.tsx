'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Bone,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { useEntityModel, useAnimator } from '../models';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { INK_EDGE_COLOUR } from '../constants';
import { LightingMode } from '../types';

const ANIMATION_SPEED = 8;
const TURN_SPEED = 12;
const BASE_Y_ROT = -Math.PI / 2;
// max travel so the pupil stays inside the white (0.25 - 0.12 = 0.13)
const PUPIL_OFFSET = 0.1;
const EYE_TRACK_SPEED = 8;

export interface PlayerHandle {
  group: Group;
  setMoving: (moving: boolean, direction: number) => void;
}

export const Player = forwardRef<PlayerHandle>(function Player(_, ref) {
  const localRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  const blinkTimer = useRef(0);
  const targetYRot = useRef(BASE_Y_ROT);
  const lookDir = useRef(0);
  const pupilsRef = useRef<{ mesh: Mesh; side: number }[]>([]);

  const { cloned, animations } = useEntityModel('penguin', {
    texturePath: '/assets/textures/penguin_texture.png',
    skeleton: true,
  });

  // attach eyes to the Head bone
  useMemo(() => {
    let headBone: Bone | null = null;
    cloned.traverse((child) => {
      if ((child as Bone).isBone && child.name === 'Head') {
        headBone = child as Bone;
      }
    });

    if (headBone) {
      // remove any previously attached eyes (strict mode / re-render)
      const stale: Group[] = [];
      (headBone as Bone).traverse((child) => {
        if (child.name === '__eye__') stale.push(child as Group);
      });
      for (const g of stale) g.removeFromParent();

      const whiteMat = new MeshBasicMaterial({ color: new Color('#ffffff'), side: DoubleSide });
      const blackMat = new MeshBasicMaterial({ color: new Color('#000000'), side: DoubleSide });
      const eyeWhiteGeo = new CircleGeometry(0.25, 24);
      const pupilGeo = new CircleGeometry(0.12, 20);

      pupilsRef.current = [];
      for (const side of [-1, 1] as const) {
        const eyeGroup = new Group();
        eyeGroup.name = '__eye__';
        const white = new Mesh(eyeWhiteGeo, whiteMat);
        const pupil = new Mesh(pupilGeo, blackMat);
        pupil.position.z = 0.01;
        eyeGroup.add(white, pupil);
        eyeGroup.rotation.y = side * Math.PI / 2;
        eyeGroup.position.set(side * 0.7, 0.6, -0.2);
        (headBone as Bone).add(eyeGroup);
        pupilsRef.current.push({ mesh: pupil, side });
      }
    }
  }, [cloned]);

  const animator = useAnimator(cloned, animations, {
    initialClip: 'penguin_idle',
    timeScales: {
      penguin_walk: ANIMATION_SPEED,
    },
  });

  useFrame((_, delta) => {
    const model = modelRef.current;
    if (!model) return;
    model.rotation.y = MathUtils.lerp(model.rotation.y, targetYRot.current, TURN_SPEED * delta);

    // blink animation
    blinkTimer.current += delta;
    const BLINK_INTERVAL = 3;
    const BLINK_DURATION = 0.15;
    const t = blinkTimer.current % BLINK_INTERVAL;
    const scaleY = t < BLINK_DURATION ? 1 - Math.sin((t / BLINK_DURATION) * Math.PI) : 1;
    cloned.traverse((child) => {
      if (child.name === '__eye__') {
        child.scale.y = scaleY;
      }
    });

    // shift pupils toward the movement direction
    for (const { mesh, side } of pupilsRef.current) {
      const targetX = lookDir.current * PUPIL_OFFSET;
      mesh.position.x = MathUtils.lerp(mesh.position.x, targetX, EYE_TRACK_SPEED * delta);
    }
  });

  useImperativeHandle(ref, () => ({
    get group() {
      return localRef.current!;
    },
    setMoving(moving: boolean, direction: number) {
      animator.play(moving ? 'penguin_walk' : 'penguin_idle');
      if (direction !== 0) {
        targetYRot.current = direction > 0 ? BASE_Y_ROT : BASE_Y_ROT + Math.PI;
        lookDir.current = direction;
      } else {
        // return pupils to center when stopped
        lookDir.current = 0;
      }
    },
  }), [animator]);

  return (
    <group ref={localRef}>
      <group ref={modelRef} rotation={[0, BASE_Y_ROT, 0]}>
        <primitive object={cloned} scale={0.4} />
      </group>
      <InkEdgesGroup
        target={localRef}
        colour={INK_EDGE_COLOUR[LightingMode.Light]}
        darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
        seed={7}
        width={3}
        gapThreshold={0.35}
      />
    </group>
  );
});
