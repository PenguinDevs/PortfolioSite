'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import {
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Path,
  PlaneGeometry,
  Shape,
} from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { createToonMaterial } from '../shaders/toonShader';
import { InkEdges } from '../shaders/inkEdges';
import { INK_EDGE_COLOUR } from '../constants';
import { LightingMode } from '../types';

// frame toon shader colours
const FRAME_COLOUR = '#ffffff';
const FRAME_SHADOW_COLOUR = '#b0a898';

// backing plane colour (slightly warmer white, like canvas)
const BACKING_COLOUR = '#faf8f5';

// default frame dimensions (world units)
const DEFAULT_CONTENT_WIDTH = 2;
const DEFAULT_CONTENT_HEIGHT = 3;
const DEFAULT_FRAME_BORDER = 0.2;
const DEFAULT_FRAME_DEPTH = 0.1;
const DEFAULT_BEVEL_DEPTH = 0.04;

// small z nudge to stop content z-fighting with the backing
const CONTENT_Z_NUDGE = 0.005;

// builds the frame mesh: a rectangle with a rectangular hole, extruded
// with a bevel on the front and back edges to create the moulding profile
function buildFrameGeometry(
  contentWidth: number,
  contentHeight: number,
  frameBorder: number,
  frameDepth: number,
  bevelDepth: number,
): ExtrudeGeometry {
  const oHW = (contentWidth + 2 * frameBorder) / 2;
  const oHH = (contentHeight + 2 * frameBorder) / 2;
  const iHW = contentWidth / 2;
  const iHH = contentHeight / 2;

  // outer rectangle (CCW)
  const outer = new Shape();
  outer.moveTo(-oHW, -oHH);
  outer.lineTo(oHW, -oHH);
  outer.lineTo(oHW, oHH);
  outer.lineTo(-oHW, oHH);
  outer.closePath();

  // inner opening cut-out (CW for hole)
  const hole = new Path();
  hole.moveTo(-iHW, -iHH);
  hole.lineTo(-iHW, iHH);
  hole.lineTo(iHW, iHH);
  hole.lineTo(iHW, -iHH);
  hole.closePath();
  outer.holes.push(hole);

  return new ExtrudeGeometry(outer, {
    depth: frameDepth,
    bevelEnabled: true,
    bevelThickness: bevelDepth,
    bevelSize: bevelDepth * 0.8,
    bevelSegments: 1,
  });
}

export type WallFrameProps = ThreeElements['group'] & {
  // size of the content opening (world units)
  contentWidth?: number;
  contentHeight?: number;
  // frame border thickness around the content
  frameBorder?: number;
  // total depth/thickness of the frame
  frameDepth?: number;
  // depth of the bevel on the front edge
  bevelDepth?: number;
  // toon shader base colour for the frame
  colour?: string;
  // toon shader shadow colour for the frame
  shadowColour?: string;
  // render a backing plane behind the content
  showBacking?: boolean;
  // ink edge noise seed for deterministic variation
  seed?: number;
  // r3f children rendered inside the frame opening
  children?: React.ReactNode;
};

export const WallFrame = forwardRef<Group, WallFrameProps>(
  function WallFrame(
    {
      contentWidth = DEFAULT_CONTENT_WIDTH,
      contentHeight = DEFAULT_CONTENT_HEIGHT,
      frameBorder = DEFAULT_FRAME_BORDER,
      frameDepth = DEFAULT_FRAME_DEPTH,
      bevelDepth = DEFAULT_BEVEL_DEPTH,
      colour = FRAME_COLOUR,
      shadowColour = FRAME_SHADOW_COLOUR,
      showBacking = true,
      seed = 77,
      children,
      ...groupProps
    },
    ref,
  ) {
    const localRef = useRef<Group>(null);
    const frameMeshRef = useRef<Mesh>(null);

    useImperativeHandle(ref, () => localRef.current!);

    const frameGeo = useMemo(
      () => buildFrameGeometry(contentWidth, contentHeight, frameBorder, frameDepth, bevelDepth),
      [contentWidth, contentHeight, frameBorder, frameDepth, bevelDepth],
    );

    const frameMaterial = useMemo(
      () => createToonMaterial({ color: colour, shadowColor: shadowColour, side: DoubleSide }),
      [colour, shadowColour],
    );

    const backingGeo = useMemo(
      () => new PlaneGeometry(contentWidth, contentHeight),
      [contentWidth, contentHeight],
    );

    // plain material for the backing so it looks consistent regardless of face normal
    const backingMaterial = useMemo(
      () => new MeshBasicMaterial({ color: BACKING_COLOUR, side: DoubleSide }),
      [],
    );

    // content and backing sit in the middle of the frame depth
    const midZ = frameDepth * 0.5;

    return (
      <group ref={localRef} {...groupProps}>
        <mesh ref={frameMeshRef} geometry={frameGeo} material={frameMaterial} />

        {showBacking && (
          <mesh
            geometry={backingGeo}
            material={backingMaterial}
            position={[0, 0, midZ]}
          />
        )}

        {/* content area centred inside the frame opening */}
        <group position={[0, 0, midZ + CONTENT_Z_NUDGE]}>
          {children}
        </group>

        <InkEdges
          target={frameMeshRef}
          colour={INK_EDGE_COLOUR[LightingMode.Light]}
          darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
          seed={seed}
          width={3}
          gapFreq={10}
          gapThreshold={0.38}
        />
      </group>
    );
  },
);
