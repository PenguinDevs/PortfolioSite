'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils, Mesh } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityModel } from '../models';
import { useEntityReveal } from '../hooks';
import { AudioService } from '../services';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { INK_EDGE_COLOUR } from '../constants';
import { LightingMode, Sound } from '../types';

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

    const { cloned, material } = useEntityModel('lever', {
      texturePath: '/assets/textures/colour_palette.png',
    });

    const { drawProgress, connectMaterial } = useEntityReveal(localRef, { perfLabel: 'Lever' });

    useEffect(() => {
      connectMaterial(material);
    }, [material, connectMaterial]);

    // pull out the two meshes from the cloned scene
    const { base, stick } = useMemo(() => {
      const meshes: Mesh[] = [];
      cloned.traverse((child) => {
        if ((child as Mesh).isMesh) {
          meshes.push(child as Mesh);
        }
      });
      return { base: meshes[0], stick: meshes[1] };
    }, [cloned]);

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
          colour={INK_EDGE_COLOUR[LightingMode.Light]}
          darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
          seed={33}
          width={3}
          gapFreq={5}
          gapThreshold={0.5}
          drawProgress={drawProgress}
        />
      </group>
    );
  },
);
