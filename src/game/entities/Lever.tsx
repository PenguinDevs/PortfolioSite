'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils, Mesh, TextureLoader } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useModel } from '../models';
import { AudioService } from '../services';
import { createToonMaterial } from '../shaders/toonShader';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { Sound } from '../types';

const TOGGLE_SPEED = 10;
const LEVER_ON_ANGLE = Math.PI / 3;
const LEVER_OFF_ANGLE = -Math.PI / 3;
const STICK_PIVOT: [number, number, number] = [0, 0.22, 0];

export interface LeverHandle {
  group: Group;
  toggle: () => void;
  setOn: (on: boolean) => void;
  isOn: () => boolean;
}

export const Lever = forwardRef<LeverHandle, ThreeElements['group']>(
  function Lever(props, ref) {
    const localRef = useRef<Group>(null);
    const handleRef = useRef<Group>(null);
    const on = useRef(false);
    const targetAngle = useRef(LEVER_OFF_ANGLE);

    const { scene } = useModel('lever');

    const texture = useMemo(() => {
      const tex = new TextureLoader().load('/assets/textures/colour_palette.png');
      tex.flipY = false;
      return tex;
    }, []);

    const material = useMemo(
      () => createToonMaterial({ map: texture }),
      [texture],
    );

    const { base, stick } = useMemo(() => {
      const clone = scene.clone(true);
      const meshes: Mesh[] = [];
      clone.traverse((child) => {
        if ((child as Mesh).isMesh) {
          (child as Mesh).material = material;
          meshes.push(child as Mesh);
        }
      });
      return { base: meshes[0], stick: meshes[1] };
    }, [scene, material]);

    useFrame((_, delta) => {
      const handle = handleRef.current;
      if (!handle) return;
      handle.rotation.x = MathUtils.lerp(
        handle.rotation.x,
        targetAngle.current,
        TOGGLE_SPEED * delta,
      );
    });

    useImperativeHandle(ref, () => ({
      get group() {
        return localRef.current!;
      },
      toggle() {
        on.current = !on.current;
        targetAngle.current = on.current ? LEVER_ON_ANGLE : LEVER_OFF_ANGLE;
        AudioService.play(Sound.Button);
      },
      setOn(value: boolean) {
        on.current = value;
        targetAngle.current = value ? LEVER_ON_ANGLE : LEVER_OFF_ANGLE;
      },
      isOn() {
        return on.current;
      },
    }), []);

    return (
      <group ref={localRef} {...props}>
        <primitive object={base} />
        <group ref={handleRef} position={STICK_PIVOT} rotation={[LEVER_OFF_ANGLE, 0, 0]}>
          <primitive object={stick} position={[-STICK_PIVOT[0], -STICK_PIVOT[1], -STICK_PIVOT[2]]} />
        </group>
        <InkEdgesGroup
          target={localRef}
          seed={33}
          width={3}
          gapFreq={5}
          gapThreshold={0.5}
        />
      </group>
    );
  },
);
