'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Group, Mesh, MeshStandardMaterial, TextureLoader } from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useModel, useAnimator } from '../models';
import { InkEdgesGroup } from '../shaders/inkEdges';

export interface PlayerHandle {
  group: Group;
  setMoving: (moving: boolean) => void;
}

export const Player = forwardRef<PlayerHandle>(function Player(_, ref) {
  const localRef = useRef<Group>(null);
  const { scene, animations } = useModel('penguin');

  const texture = useMemo(() => {
    const tex = new TextureLoader().load('/assets/geometries/characters/penguin_texture.png');
    tex.flipY = false;
    return tex;
  }, []);

  const cloned = useMemo(() => {
    const clone = skeletonClone(scene);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).material = new MeshStandardMaterial({ map: texture });
      }
    });
    return clone;
  }, [scene, texture]);

  const animator = useAnimator(cloned, animations, { initialClip: 'penguin_idle' });

  useImperativeHandle(ref, () => ({
    get group() {
      return localRef.current!;
    },
    setMoving(moving: boolean) {
      animator.play(moving ? 'penguin_walk' : 'penguin_idle');
    },
  }), [animator]);

  return (
    <group ref={localRef}>
      <primitive object={cloned} rotation={[0, -Math.PI / 2, 0]} scale={0.4} />
      <InkEdgesGroup
        target={localRef}
        seed={7}
        width={3}
        gapThreshold={0.35}
      />
    </group>
  );
});
