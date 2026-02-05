'use client';

import { useCallback, useMemo, useRef } from 'react';
import { TextureLoader } from 'three';
import type { Mesh } from 'three';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import { Text, useGLTF } from '@react-three/drei';
import { Pedestal } from './Pedestal';
import { ProximityPrompt } from '../components';
import { useAwardOverlay } from '../contexts/AwardOverlayContext';
import type { AwardData } from '../contexts/AwardOverlayContext';
import { createToonMaterial } from '../shaders/toonShader';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { INK_EDGE_COLOUR } from '../constants';
import { LightingMode } from '../types';

// common base path for badge assets under public/assets/
const ASSET_BASE_PATH = '/assets/';

// pedestal top is at y ~= 1.59 (from the pedestal.glb bounding box)
const PEDESTAL_TOP_Y = 1.59;

// hover animation for the badge model and icon
const MODEL_HOVER_GAP = 0.15; // resting gap above the pedestal surface
const MODEL_HOVER_AMPLITUDE = 0.08; // how far it bobs up and down
const MODEL_HOVER_SPEED = 1.5; // oscillation speed (radians per second)

// base Y so the model floats just above the pedestal
const MODEL_Y_OFFSET = PEDESTAL_TOP_Y + MODEL_HOVER_GAP;

// icon text settings
const ICON_FONT_PATH = '/assets/fonts/patrackhand_regular.ttf';
const ICON_FONT_SIZE = 0.3;
const ICON_BASE_Y_WITH_MODEL = PEDESTAL_TOP_Y + 1.2;
const ICON_BASE_Y_NO_MODEL = PEDESTAL_TOP_Y + 0.25;

// toon shader colours for the badge model (matches pedestal style)
const BADGE_MODEL_COLOUR = '#d4cfc8';
const BADGE_MODEL_SHADOW = '#8a8078';

// deterministic phase from a string so each pedestal bobs at its own offset
function phaseFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 1000) / 1000 * Math.PI * 2;
}

interface BadgeModelProps {
  modelPath: string;
  texturePath?: string;
  phase: number;
}

// Renders a badge 3D model on top of the pedestal.
// Separated into its own component so useGLTF can be called unconditionally.
function BadgeModel({ modelPath, texturePath, phase }: BadgeModelProps) {
  const fullModelPath = ASSET_BASE_PATH + modelPath;
  const { scene } = useGLTF(fullModelPath);
  const modelRef = useRef<Group>(null);
  const elapsed = useRef(0);

  const texture = useMemo(() => {
    if (!texturePath) return undefined;
    const tex = new TextureLoader().load(ASSET_BASE_PATH + texturePath);
    tex.flipY = false;
    return tex;
  }, [texturePath]);

  const material = useMemo(
    () => createToonMaterial({
      color: BADGE_MODEL_COLOUR,
      shadowColor: BADGE_MODEL_SHADOW,
      map: texture,
    }),
    [texture],
  );

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).material = material;
      }
    });
    return clone;
  }, [scene, material]);

  // gentle hovering bob
  useFrame((_, delta) => {
    elapsed.current += delta;
    if (modelRef.current) {
      modelRef.current.position.y =
        MODEL_Y_OFFSET + Math.sin(elapsed.current * MODEL_HOVER_SPEED + phase) * MODEL_HOVER_AMPLITUDE;
    }
  });

  return (
    <group ref={modelRef} position={[0, MODEL_Y_OFFSET, 0]}>
      <primitive object={cloned} />
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
  );
}

export type PedestalAwardProps = ThreeElements['group'] & {
  award: AwardData;
};

export function PedestalAward({ award, ...props }: PedestalAwardProps) {
  const groupRef = useRef<Group>(null);
  const iconRef = useRef<Group>(null);
  const elapsed = useRef(0);
  const { showAward } = useAwardOverlay();

  const handleInteract = useCallback(() => {
    showAward(award);
  }, [showAward, award]);

  const badgeModel = award.badge?.model;
  const badgeTexture = award.badge?.modelTexture;
  const badgeIcon = award.badge?.icon;
  const iconColour = award.badge?.iconColour;

  // unique phase per pedestal so they don't all bob in sync
  const phase = useMemo(() => phaseFromId(award.id), [award.id]);

  const iconBaseY = badgeModel ? ICON_BASE_Y_WITH_MODEL : ICON_BASE_Y_NO_MODEL;

  // animate icon hover in sync with the model (same phase)
  useFrame((_, delta) => {
    elapsed.current += delta;
    if (iconRef.current) {
      iconRef.current.position.y =
        iconBaseY + Math.sin(elapsed.current * MODEL_HOVER_SPEED + phase) * MODEL_HOVER_AMPLITUDE;
    }
  });

  return (
    <group ref={groupRef} {...props}>
      <Pedestal />
      {badgeModel && (
        <BadgeModel modelPath={badgeModel} texturePath={badgeTexture} phase={phase} />
      )}
      {badgeIcon && iconColour && (
        <group ref={iconRef} position={[0.45, iconBaseY, 0.45]}>
          <Text
            font={ICON_FONT_PATH}
            fontSize={ICON_FONT_SIZE}
            color={iconColour}
            anchorX="center"
            anchorY="middle"
          >
            {badgeIcon}
          </Text>
        </group>
      )}
      <ProximityPrompt
        onInteract={handleInteract}
        actionText="View"
        objectText={`${award.title}\n${award.secondaryText}`}
        maxDistance={3}
      />
    </group>
  );
}
