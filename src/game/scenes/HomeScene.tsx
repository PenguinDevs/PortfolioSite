'use client';

import { useCallback, useEffect, useRef } from 'react';
import { DirectionalLight, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { AlleyGround, Player } from '../entities';
import type { PlayerHandle } from '../entities/Player';
import { useInput } from '../inputs';
import { useDerivedRef } from '../utils';
import { PlayerProvider, useNavigation } from '../contexts';
import { ProximityPromptProvider } from '../contexts/ProximityPromptContext';
import { MovementService, PerspectiveCameraService, TutorialService } from '../services';
import { useLightingMode } from '../hooks';
import { AMBIENT_INTENSITY, DIRECTIONAL_INTENSITY, SHADOW_OPACITY, TRACK_LENGTH } from '../constants';
import { HomeSection } from './HomeSection';
import { AwardsSection } from './AwardsSection';
import { ProjectsSection } from './ProjectsSection';
import { CircularSceneProvider, CircularSlot } from './circular';

// directional light offset from the player (angled from the top-right)
// lower Y = more angled light = taller shadows on the ground
const LIGHT_OFFSET_X = 5;
const LIGHT_OFFSET_Y = 10;
const LIGHT_OFFSET_Z = 5;

// shadow camera frustum (wide enough to cover the full visible area around the player)
// the frustum is in light-space so needs to be generous due to the angled projection
const SHADOW_LEFT = -35;
const SHADOW_RIGHT = 35;
const SHADOW_TOP = 25;
const SHADOW_BOTTOM = -15;
const SHADOW_NEAR = 1;
const SHADOW_FAR = 60;
const SHADOW_MAP_SIZE = 2048;
const SHADOW_BIAS = -0.002;

// shadow ground plane covers the full walkable area
const SHADOW_PLANE_WIDTH = 200;
const SHADOW_PLANE_DEPTH = 50;

// section positions along the circular track
const HOME_X = 0;
const AWARDS_X = 42;
const PROJECTS_X = 60;

// ground tiles: centred near the track midpoint so a single CircularSlot
// covers the entire loop. each tile is 12 world units wide (TILE_SCALE * 1m).
// baseX must be a multiple of 12 so a tile lands exactly at x=0 (player spawn).
// ±17 tiles = ±204 units, comfortably exceeding the wrap threshold (~153)
// plus camera view distance in both directions.
const GROUND_BASE_X = 144;
const GROUND_START_TILE = -17;
const GROUND_END_TILE = 17;

export function HomeScene() {
  const inputRef = useInput();
  const playerRef = useRef<PlayerHandle>(null);
  const lightRef = useRef<DirectionalLight>(null);
  const shadowPlaneRef = useRef<Mesh>(null);
  const getGroup = useCallback(() => playerRef.current?.group ?? null, []);
  const groupRef = useDerivedRef(getGroup);
  const mode = useLightingMode();
  const { autopilotTargetRef, setPlayerGroupRef } = useNavigation();

  // register the player group ref with the navigation context so
  // the section tracker can read the position outside the Canvas
  useEffect(() => {
    setPlayerGroupRef(groupRef);
  }, [groupRef, setPlayerGroupRef]);

  // add the light target to the scene so its world matrix updates, and
  // call updateProjectionMatrix after R3F has applied the dash props
  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;

    light.parent?.add(light.target);
    light.shadow.camera.updateProjectionMatrix();

    return () => {
      light.target.removeFromParent();
    };
  }, []);

  // keep the shadow light and shadow plane centred on the player
  useFrame(() => {
    const light = lightRef.current;
    const player = groupRef.current;
    if (!light || !player) return;

    const px = player.position.x;
    light.position.set(px + LIGHT_OFFSET_X, LIGHT_OFFSET_Y, LIGHT_OFFSET_Z);
    light.target.position.set(px, 0, 0);

    if (shadowPlaneRef.current) {
      shadowPlaneRef.current.position.x = px;
    }
  });

  return (
    <PlayerProvider groupRef={groupRef}>
      <ProximityPromptProvider>
        <ambientLight intensity={AMBIENT_INTENSITY[mode]} />
        <directionalLight
          ref={lightRef}
          position={[LIGHT_OFFSET_X, LIGHT_OFFSET_Y, LIGHT_OFFSET_Z]}
          intensity={DIRECTIONAL_INTENSITY[mode]}
          castShadow
          shadow-mapSize-width={SHADOW_MAP_SIZE}
          shadow-mapSize-height={SHADOW_MAP_SIZE}
          shadow-camera-left={SHADOW_LEFT}
          shadow-camera-right={SHADOW_RIGHT}
          shadow-camera-top={SHADOW_TOP}
          shadow-camera-bottom={SHADOW_BOTTOM}
          shadow-camera-near={SHADOW_NEAR}
          shadow-camera-far={SHADOW_FAR}
          shadow-bias={SHADOW_BIAS}
        />

        {/* transparent ground plane that only shows cast shadows */}
        <mesh ref={shadowPlaneRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[SHADOW_PLANE_WIDTH, SHADOW_PLANE_DEPTH]} />
          <shadowMaterial transparent opacity={SHADOW_OPACITY[mode]} />
        </mesh>

        <CircularSceneProvider trackLength={TRACK_LENGTH}>
          {/* ground tiles in their own slot, covering the full circular track */}
          <CircularSlot baseX={GROUND_BASE_X}>
            <AlleyGround startTile={GROUND_START_TILE} endTile={GROUND_END_TILE} />
          </CircularSlot>

          <CircularSlot baseX={HOME_X}>
            <HomeSection />
          </CircularSlot>
          <CircularSlot baseX={AWARDS_X}>
            <AwardsSection />
          </CircularSlot>
          <ProjectsSection baseX={PROJECTS_X} />
        </CircularSceneProvider>

        <Player ref={playerRef} />
        <MovementService inputRef={inputRef} playerRef={playerRef} autopilotTargetRef={autopilotTargetRef} />
        <PerspectiveCameraService targetRef={groupRef} inputRef={inputRef} />
        <TutorialService inputRef={inputRef} />
      </ProximityPromptProvider>
    </PlayerProvider>
  );
}
