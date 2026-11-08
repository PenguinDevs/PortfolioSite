'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, Mesh, ShaderMaterial, Vector3 } from 'three';
import { Euler } from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { InkEdgesGroup } from '../../shaders';
import { INK_EDGE_COLOUR } from '../../constants';
import { LightingMode } from '../../types';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import { createTexelPlane, flickerBrightness, flickerFrame } from '../propTextures';
import {
  buildFurnaceParts,
  buildLogGeometry,
  FurnaceMaterial,
  FURNACE_LOGS,
  FLAME_PLANES,
  Outline,
  VENT_GLOW_HEIGHT,
  VENT_GLOW_POSITIONS,
  VENT_GLOW_WIDTH,
} from './furnaceModel';
import { FurnaceTextureKey, getFurnaceTexture } from './furnaceTextures';

const INK_SEED = 83;
const FIRE_FRAME_RATE = 7;
const NO_INK = { noInk: true };

// kept at module level so the ink edges effect doesn't rebuild every render
const hasInk = (mesh: Mesh) => !mesh.userData.noInk;

export type FurnaceProps = ThreeElements['group'] & {
  // shows a flickering fire in the opening
  lit?: boolean;
};

// material lookup from the model's enum to the texture keys
const MATERIAL_TEXTURES: Readonly<Record<FurnaceMaterial, FurnaceTextureKey>> = {
  [FurnaceMaterial.Stones]: FurnaceTextureKey.Stones,
  [FurnaceMaterial.Frame]: FurnaceTextureKey.Frame,
  [FurnaceMaterial.Band]: FurnaceTextureKey.Band,
  [FurnaceMaterial.Wall]: FurnaceTextureKey.Wall,
  [FurnaceMaterial.Grate]: FurnaceTextureKey.Grate,
  [FurnaceMaterial.Bark]: FurnaceTextureKey.Bark,
  [FurnaceMaterial.Charred]: FurnaceTextureKey.Charred,
  [FurnaceMaterial.Ember]: FurnaceTextureKey.Ember,
};

// glow materials need cutOut false and glow true (except flames which need cutOut)
const GLOW_MATERIALS = new Set<FurnaceMaterial>([FurnaceMaterial.Ember]);

// cobblestone furnace block with openings, fire, and detail. the fire opening faces +z
export const Furnace = forwardRef<Group, FurnaceProps>(function Furnace({ lit = true, ...props }, ref) {
  const groupRef = useRef<Group>(null);
  const meshesRef = useRef<Group>(null);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'Furnace' });

  // build the shell parts once (merged geometries per material + outline class)
  const parts = useMemo(() => buildFurnaceParts(), []);
  useEffect(() => () => { for (const p of parts) p.geometry.dispose(); }, [parts]);

  // build log geometries (need to rebuild if lit changes because of texture swap)
  const logGeometries = useMemo(
    () => FURNACE_LOGS.map(info => buildLogGeometry(info, lit)),
    [lit],
  );
  useEffect(() => () => { for (const g of logGeometries) g.dispose(); }, [logGeometries]);

  // flame plane geometries
  const flamePlaneGeos = useMemo(
    () => FLAME_PLANES.map(fp => createTexelPlane(fp.width, fp.height)),
    [],
  );
  useEffect(() => () => { for (const g of flamePlaneGeos) g.dispose(); }, [flamePlaneGeos]);

  // vent glow plane geometries (rotated to face +x)
  const ventGlowGeos = useMemo(
    () => VENT_GLOW_POSITIONS.map(() => {
      const geo = createTexelPlane(VENT_GLOW_WIDTH, VENT_GLOW_HEIGHT);
      geo.rotateY(Math.PI / 2);
      return geo;
    }),
    [],
  );
  useEffect(() => () => { for (const g of ventGlowGeos) g.dispose(); }, [ventGlowGeos]);

  // materials for shell parts, logs, flames, ember, vent glow
  const materialState = useMemo(() => {
    // shell materials: one per FurnaceMaterial value used by parts
    const shellMats = new Map<FurnaceMaterial, ShaderMaterial>();
    for (const p of parts) {
      if (!shellMats.has(p.material)) {
        const texKey = MATERIAL_TEXTURES[p.material];
        const isGlow = GLOW_MATERIALS.has(p.material);
        shellMats.set(p.material, createPixelMaterial(getFurnaceTexture(texKey), { glow: isGlow }));
      }
    }

    // log material
    const logTexKey = lit ? FurnaceTextureKey.Bark : FurnaceTextureKey.Charred;
    const logMat = createPixelMaterial(getFurnaceTexture(logTexKey));

    // flame material (glow + cutout, two frame textures for flickering)
    const flameTexA = getFurnaceTexture(FurnaceTextureKey.FlameA);
    const flameTexB = getFurnaceTexture(FurnaceTextureKey.FlameB);
    const flameMat = createPixelMaterial(flameTexA, { cutOut: true, glow: true });

    // vent glow material
    const ventGlowMat = createPixelMaterial(
      getFurnaceTexture(FurnaceTextureKey.VentGlow),
      { cutOut: true, glow: true },
    );

    // collect all materials for reveal + lifecycle
    const all: ShaderMaterial[] = [...shellMats.values(), logMat, flameMat, ventGlowMat];

    return { shellMats, logMat, flameMat, flameTexA, flameTexB, ventGlowMat, all };
  }, [parts, lit]);
  usePixelMaterials(materialState.all, connectMaterial);

  // random phase so neighbouring furnaces don't flicker in sync
  const phase = useMemo(() => Math.random() * 10, []);

  // log euler objects (stable refs for the mesh rotation prop)
  const logEulers = useMemo(
    () => FURNACE_LOGS.map(info => new Euler(...info.rotation)),
    [],
  );

  useFrame(({ clock }) => {
    if (!lit) return;
    const time = clock.elapsedTime;
    const { flameMat, flameTexA, flameTexB, ventGlowMat } = materialState;

    // swap flame texture frame
    const frame = flickerFrame(time, phase, FIRE_FRAME_RATE);
    flameMat.uniforms.uMap.value = frame === 0 ? flameTexA : flameTexB;

    // flicker brightness on flames and vent glow
    const brightness = flickerBrightness(time, phase);
    (flameMat.uniforms.uMapTint.value as Vector3).setScalar(brightness);
    (ventGlowMat.uniforms.uMapTint.value as Vector3).setScalar(brightness);

    // find the ember material and pulse it too
    const emberMat = materialState.shellMats.get(FurnaceMaterial.Ember);
    if (emberMat) {
      (emberMat.uniforms.uMapTint.value as Vector3).setScalar(brightness);
    }
  });

  useImperativeHandle(ref, () => groupRef.current!);

  return (
    <group ref={groupRef} {...props}>
      <group ref={meshesRef}>
        {/* shell parts: each gets its material and ink/no-ink based on outline */}
        {parts.map((p, i) => (
          <mesh
            key={i}
            geometry={p.geometry}
            material={materialState.shellMats.get(p.material)}
            castShadow
            userData={p.outline === Outline.Plain ? NO_INK : undefined}
          />
        ))}

        {/* crossed logs in the fire chamber */}
        {logGeometries.map((geo, i) => (
          <mesh
            key={`log-${i}`}
            geometry={geo}
            material={materialState.logMat}
            position={FURNACE_LOGS[i].position}
            rotation={logEulers[i]}
            userData={NO_INK}
          />
        ))}

        {/* flame planes (visible only when lit) */}
        {FLAME_PLANES.map((fp, i) => (
          <mesh
            key={`flame-${i}`}
            geometry={flamePlaneGeos[i]}
            material={materialState.flameMat}
            position={fp.position}
            visible={lit}
            userData={NO_INK}
          />
        ))}

        {/* vent glow on the +x side (visible only when lit) */}
        {VENT_GLOW_POSITIONS.map((pos, i) => (
          <mesh
            key={`vent-${i}`}
            geometry={ventGlowGeos[i]}
            material={materialState.ventGlowMat}
            position={pos}
            visible={lit}
            userData={NO_INK}
          />
        ))}
      </group>
      <InkEdgesGroup
        target={meshesRef}
        colour={INK_EDGE_COLOUR[LightingMode.Light]}
        darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
        seed={INK_SEED}
        width={2}
        drawProgress={drawProgress}
        filter={hasInk}
      />
    </group>
  );
});
