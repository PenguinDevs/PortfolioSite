'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useEntityModel } from '../models';
import { useEntityReveal } from '../hooks';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { LightingMode } from '../types';
import { INK_EDGE_COLOUR } from '../constants';

const FONT_PATH = '/assets/fonts/minecraft_regular.otf';
const ROW_COUNT = 4;
const FONT_SIZE = 0.25;
const LINE_HEIGHT = 0.8;
const TEXT_COLOUR = '#1a1a1a';

// vertical offset so the 4 rows sit centred on the sign face
const TEXT_BASE_Y = 1.54;
const TEXT_BASE_Z = 0.06;
const ROW_SPACING = FONT_SIZE * LINE_HEIGHT;

export type SignProps = ThreeElements['group'] & {
  // exactly 4 strings, one per row on the sign
  rows: [string, string, string, string];
};

export const Sign = forwardRef<Group, SignProps>(function Sign({ rows, ...props }, ref) {
  const localRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  const { cloned, material } = useEntityModel('sign', {
    texturePath: '/assets/textures/colour_palette.webp',
  });

  const { drawProgress, colourProgress, connectMaterial } = useEntityReveal(localRef, { perfLabel: 'Sign' });

  // refs for the text rows so we can drive their opacity during the colour reveal
  const textRefs = useRef<any[]>([]);

  useEffect(() => {
    connectMaterial(material);
  }, [material, connectMaterial]);

  // fade text labels in during the colour reveal phase
  useFrame(() => {
    const opacity = colourProgress.value;
    for (const t of textRefs.current) {
      if (t) t.fillOpacity = opacity;
    }
  });

  useImperativeHandle(ref, () => localRef.current!);

  return (
    <group ref={localRef} {...props}>
      {/* model group kept separate so ink edges don't target text meshes */}
      <group ref={modelRef}>
        <primitive object={cloned} />
      </group>

      {/* text rows rendered on the sign face */}
      {Array.from({ length: ROW_COUNT }, (_, i) => (
        <Text
          key={i}
          ref={(el: any) => { textRefs.current[i] = el; }}
          font={FONT_PATH}
          fontSize={FONT_SIZE}
          color={TEXT_COLOUR}
          anchorX="center"
          anchorY="middle"
          fillOpacity={0}
          position={[0, TEXT_BASE_Y - i * ROW_SPACING, TEXT_BASE_Z]}
        >
          {rows[i]}
        </Text>
      ))}

      <InkEdgesGroup
        target={modelRef}
        colour={INK_EDGE_COLOUR[LightingMode.Light]}
        darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
        seed={55}
        width={3}
        gapFreq={10}
        gapThreshold={0.38}
        drawProgress={drawProgress}
      />
    </group>
  );
});
