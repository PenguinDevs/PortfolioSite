'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils, Mesh, TextureLoader } from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useModel, useAnimator } from '../models';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { createToonMaterial } from '../shaders/toonShader';

const ANIMATION_SPEED = 4;
const TURN_SPEED = 12;
const BASE_Y_ROT = -Math.PI / 2;

export interface PlayerHandle {
  group: Group;
  setMoving: (moving: boolean, direction: number) => void;
}

export const Player = forwardRef<PlayerHandle>(function Player(_, ref) {
  const localRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  const targetYRot = useRef(BASE_Y_ROT);
  const { scene, animations } = useModel('penguin');

  const texture = useMemo(() => {
    const tex = new TextureLoader().load('/assets/geometries/characters/penguin_texture.png');
    tex.flipY = false;
    return tex;
  }, []);

  const material = useMemo(
    () => createToonMaterial({ map: texture }),
    [texture],
  );

  const cloned = useMemo(() => {
    const clone = skeletonClone(scene);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).material = material;
      }
    });
    return clone;
  }, [scene, texture, material]);

  const animator = useAnimator(cloned, animations, { initialClip: 'penguin_idle', timeScale: ANIMATION_SPEED });

  useFrame((_, delta) => {
    const model = modelRef.current;
    if (!model) return;
    model.rotation.y = MathUtils.lerp(model.rotation.y, targetYRot.current, TURN_SPEED * delta);
  });

  useImperativeHandle(ref, () => ({
    get group() {
      return localRef.current!;
    },
    setMoving(moving: boolean, direction: number) {
      animator.play(moving ? 'penguin_walk' : 'penguin_idle');
      if (direction !== 0) {
        targetYRot.current = direction > 0 ? BASE_Y_ROT : BASE_Y_ROT + Math.PI;
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
        seed={7}
        width={3}
        gapThreshold={0.35}
      />
    </group>
  );
});
