'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { MeshBasicMaterial } from 'three';
import type { Group, Mesh, ShaderMaterial, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { InkEdgesGroup } from '../../shaders';
import { INK_EDGE_COLOUR } from '../../constants';
import { LightingMode } from '../../types';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import { loadVanillaPixels, loadVanillaTexture } from '../pixelTexture';
import { flickerBrightness, PROP_TEXEL } from '../propTextures';
import { buildFireSprite } from './furnaceFire';
import type { FireSprite } from './furnaceFire';
import { buildFurnaceModel, FIRE_POSITION, FURNACE_SURFACES, FurnaceSurface } from './furnaceModel';

const INK_SEED = 83;
const NO_INK = { noInk: true };

// kept at module level so the ink edges effect doesn't rebuild every render
const hasInk = (mesh: Mesh) => !mesh.userData.noInk;

// the ink mesh is never drawn itself, only the ink lines added to it as children are.
// shared by every furnace and never disposed
const INK_ONLY_MATERIAL = new MeshBasicMaterial({ visible: false });

const VANILLA_BLOCK_TEXTURES = '/assets/minecraft/textures/block/';

enum FurnaceTexture {
  Front = 'furnace_front.png',
  FrontLit = 'furnace_front_on.png',
  Side = 'furnace_side.png',
  Top = 'furnace_top.png',
  // 32 frame strip of the vanilla fire animation
  Fire = 'fire_0.png',
}

const textureUrl = (texture: FurnaceTexture) => `${VANILLA_BLOCK_TEXTURES}${texture}`;

// the chamber is lined with the top's stone multiplied down to soot, warmed up by the fire when lit
const SOOT_TINT = '#5c5c5c';
const FIRELIT_SOOT_TINT = '#b8784a';

// the fire's texels are half a block texel, so the whole 16 texel frame stands 8 block texels
// wide in the 10 texel wide chamber, and the slab is one fire texel thick
const FIRE_TEXEL = PROP_TEXEL / 2;
const FIRE_THICKNESS = FIRE_TEXEL;
// vanilla plays the fire strip at one frame per game tick
const FIRE_FRAME_RATE = 20;
const NO_FRAME = -1;

export type FurnaceProps = ThreeElements['group'] & {
  // shows a flickering fire in the opening
  lit?: boolean;
};

// vanilla furnace block with its openings carved back into it and a pixel fire in the mouth.
// the fire opening faces +z
export const Furnace = forwardRef<Group, FurnaceProps>(function Furnace({ lit = true, ...props }, ref) {
  const groupRef = useRef<Group>(null);
  const meshesRef = useRef<Group>(null);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'Furnace' });

  const model = useMemo(buildFurnaceModel, []);
  useEffect(
    () => () => {
      for (const surface of FURNACE_SURFACES) model.surfaces[surface].dispose();
      model.inkGeometry.dispose();
    },
    [model],
  );

  // the fire's shape comes from the strip's texels, so it's built once they have loaded
  const [fire, setFire] = useState<FireSprite | null>(null);
  useEffect(() => {
    let cancelled = false;
    let sprite: FireSprite | undefined;
    loadVanillaPixels(textureUrl(FurnaceTexture.Fire))
      .then((pixels) => {
        if (cancelled) return;
        sprite = buildFireSprite(pixels, FIRE_TEXEL, FIRE_THICKNESS);
        setFire(sprite);
      })
      .catch((error: unknown) => console.warn('furnace: fire sprite unavailable', error));
    return () => {
      cancelled = true;
      sprite?.geometry.dispose();
    };
  }, []);

  const { materials, materialFor, fireMaterial, frontTextures, liningTextures } = useMemo(() => {
    const textures = {
      front: { out: loadVanillaTexture(textureUrl(FurnaceTexture.Front)), lit: loadVanillaTexture(textureUrl(FurnaceTexture.FrontLit)) },
      lining: {
        out: loadVanillaTexture(textureUrl(FurnaceTexture.Top), SOOT_TINT),
        lit: loadVanillaTexture(textureUrl(FurnaceTexture.Top), FIRELIT_SOOT_TINT),
      },
    };
    const bySurface: Record<FurnaceSurface, ShaderMaterial> = {
      [FurnaceSurface.Front]: createPixelMaterial(textures.front.out),
      [FurnaceSurface.Side]: createPixelMaterial(loadVanillaTexture(textureUrl(FurnaceTexture.Side))),
      [FurnaceSurface.Top]: createPixelMaterial(loadVanillaTexture(textureUrl(FurnaceTexture.Top))),
      [FurnaceSurface.Lining]: createPixelMaterial(textures.lining.out),
    };
    const flames = createPixelMaterial(loadVanillaTexture(textureUrl(FurnaceTexture.Fire)), { cutOut: true, glow: true });
    return {
      materials: [...Object.values(bySurface), flames],
      materialFor: bySurface,
      fireMaterial: flames,
      frontTextures: textures.front,
      liningTextures: textures.lining,
    };
  }, []);
  usePixelMaterials(materials, connectMaterial);

  // lighting the furnace swaps in furnace_front_on and the firelit lining
  useEffect(() => {
    materialFor[FurnaceSurface.Front].uniforms.uMap.value = lit ? frontTextures.lit : frontTextures.out;
    materialFor[FurnaceSurface.Lining].uniforms.uMap.value = lit ? liningTextures.lit : liningTextures.out;
  }, [lit, materialFor, frontTextures, liningTextures]);

  // random phase so neighbouring furnaces don't flicker in sync
  const phase = useMemo(() => Math.random() * 10, []);
  const shownFrame = useRef(NO_FRAME);

  useFrame(({ clock }) => {
    if (!lit || !fire) return;
    const time = clock.elapsedTime + phase;
    const frame = Math.floor(time * FIRE_FRAME_RATE) % fire.frames.length;
    if (frame !== shownFrame.current) {
      shownFrame.current = frame;
      fire.geometry.setDrawRange(fire.frames[frame].start, fire.frames[frame].count);
    }
    (fireMaterial.uniforms.uMapTint.value as Vector3).setScalar(flickerBrightness(time, phase));
  });

  useImperativeHandle(ref, () => groupRef.current!);

  return (
    <group ref={groupRef} {...props}>
      <group ref={meshesRef}>
        {FURNACE_SURFACES.map((surface) => (
          <mesh
            key={surface}
            geometry={model.surfaces[surface]}
            material={materialFor[surface]}
            userData={NO_INK}
            castShadow
          />
        ))}
        <mesh geometry={model.inkGeometry} material={INK_ONLY_MATERIAL} />
        {lit && fire && (
          <mesh geometry={fire.geometry} material={fireMaterial} position={FIRE_POSITION} userData={NO_INK} />
        )}
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
