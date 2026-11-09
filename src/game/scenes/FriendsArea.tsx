'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Sign } from '../entities';
import { ProximityPrompt } from '../components/ProximityPrompt';
import { usePlayerRef } from '../contexts/PlayerContext';
import { useFriendsChest } from '../contexts/FriendsChestContext';
import { VoxelBlocks } from '../minecraft/VoxelBlocks';
import { PillarWaist, StonePillar } from '../minecraft/StonePillar';
import type { PillarAccent } from '../minecraft/StonePillar';
import { BlockKind } from '../minecraft/constants';
import { Chest, CraftingTable, Furnace, Lantern, Torch, WallFacing } from '../minecraft/props';
import { AzaleaBush, BigDripleaf, CaveVines, GrassTuft, HangingRoots, SmallDripleaf, SporeBlossom } from '../minecraft/decor';
import { buildCaveShell, WALL_FACE_Z } from './friendsCave';

// x and z below are block cells relative to the end of the projects (the view more slot).
// things stand in the middle of their cell, so cell n sits at offset n + 0.5
const CELL_CENTRE = 0.5;

const SIGN_X = 9;
const SIGN_Z = -4;
const SIGN_ROWS: [string, string, string, string] = ['', 'Friends', '---->', ''];

// lifts the cave so its moss floor sits just above the alley ground instead of z-fighting it
const SHELL_LIFT = 0.005;
const SHELL_INK_SEED = 71;

// the props stand side by side on the row just behind the penguin's path
const PROP_ROW_Z = -2;
const LANTERN_X = 27;
const CRAFTING_TABLE_X = 28;
const FURNACE_X = 29;
const CHEST_X = 30;

const CHEST_PROMPT_DISTANCE = 2.5;
const CHEST_PROMPT_HEIGHT = 1.5;
// how far the penguin can wander after opening the chest before the menu closes itself
const MENU_WALK_AWAY_DISTANCE = 3;

// wall torches take the block space in front of the wall, so they sit half a block off its
// face, a block above whatever ground has built up against the wall there
const WALL_TORCH_LIFT = 1;
const WALL_TORCH_XS = [21, 33, 44];

interface PillarPlacement {
  x: number;
  z: number;
  height: number;
  width: 1 | 2;
  depth: 1 | 2;
  seed: number;
  waistSide?: PillarWaist;
  accents?: readonly PillarAccent[];
}

// one lump of iron low down and a diamond near the top, on the inner column of the pillar
// beside the chest, both clear of its waist so neither gets pared away
const ORE_ACCENTS: readonly PillarAccent[] = [
  { kind: BlockKind.IronOre, x: 1, y: 2 },
  { kind: BlockKind.DiamondOre, x: 1, y: 7 },
];

// foreground columns between the camera and the penguin. their feet sit around the bottom
// edge of the frame, and they stay clear of the chest menu (top middle of the screen) while
// the penguin stands at the chest. the last one sits further back so the columns read as
// separate layers when walking past
const PILLARS: PillarPlacement[] = [
  { x: 25.5, z: 10.5, height: 12, width: 2, depth: 1, seed: 3, waistSide: PillarWaist.Right, accents: ORE_ACCENTS },
  { x: 36, z: 10.5, height: 12, width: 1, depth: 1, seed: 8 },
  { x: 41.5, z: 9, height: 13, width: 2, depth: 2, seed: 13, waistSide: PillarWaist.Left },
];

// vines hang off the front of the ceiling, falling back a row where the edge is ragged
const VINE_ROW_Z = -4;
const VINES = [
  { x: 21, length: 5 },
  { x: 24, length: 2 },
  { x: 28, length: 4 },
  { x: 33, length: 6 },
  { x: 36, length: 3 },
  { x: 39, length: 5 },
  { x: 42, length: 2 },
];
const SPORE_BLOSSOM = { x: 31, z: -6 };
const HANGING_ROOTS = [
  { x: 20, z: -6 },
  { x: 40, z: -5 },
];

const AZALEAS = [
  { x: 14, z: -6, flowering: false },
  { x: 22, z: -6, flowering: true },
  { x: 35, z: -6, flowering: true },
  { x: 46, z: -6, flowering: false },
];
const BIG_DRIPLEAVES = [
  { x: 39, z: -4, stemHeight: 2 },
  { x: 41, z: -3, stemHeight: 1 },
  { x: 42, z: -5, stemHeight: 3 },
];
const SMALL_DRIPLEAVES = [
  { x: 38, z: -3 },
  { x: 40, z: -6 },
];
const GRASS_TUFTS = [
  { x: 20, z: -3, tall: false },
  { x: 21, z: -2, tall: false },
  { x: 23, z: -4, tall: false },
  { x: 25, z: -3, tall: true },
  { x: 32, z: -4, tall: false },
  { x: 33, z: -3, tall: true },
  { x: 34, z: -2, tall: true },
  { x: 36, z: -6, tall: false },
  { x: 44, z: -3, tall: false },
  { x: 47, z: -4, tall: false },
];

function cellCentre(cell: number): number {
  return cell + CELL_CENTRE;
}

// a lush cave nook at the end of the projects, with a chest that opens the friends menu
export function FriendsArea() {
  const shell = useMemo(buildCaveShell, []);
  const { isOpen, open, close } = useFriendsChest();
  const playerRef = usePlayerRef();
  // where the penguin stood when the chest was opened, so walking off closes the menu
  const openedAtX = useRef<number | null>(null);

  const openChest = useCallback(() => {
    openedAtX.current = playerRef.current?.position.x ?? null;
    open();
  }, [open, playerRef]);

  const handleChestClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    openChest();
  }, [openChest]);

  const handleChestOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  }, []);

  const handleChestOut = useCallback(() => {
    document.body.style.cursor = '';
  }, []);

  useFrame(() => {
    if (!isOpen || openedAtX.current === null) return;
    const player = playerRef.current;
    if (player && Math.abs(player.position.x - openedAtX.current) > MENU_WALK_AWAY_DISTANCE) {
      close();
    }
  });

  // hangs things off the front-most ceiling cell that exists in a column
  const hangingVines = useMemo(() => {
    return VINES.flatMap(({ x, length }) => {
      for (const z of [VINE_ROW_Z, VINE_ROW_Z - 1]) {
        const y = shell.ceilingUnderside(x, z);
        if (y !== undefined) return [{ x, y, z, length }];
      }
      return [];
    });
  }, [shell]);

  const sporeBlossomY = shell.ceilingUnderside(SPORE_BLOSSOM.x, SPORE_BLOSSOM.z);

  return (
    <>
      <Sign position={[SIGN_X, 0, SIGN_Z]} rows={SIGN_ROWS} />

      <VoxelBlocks blocks={shell.blocks} position={[0, SHELL_LIFT, 0]} inkSeed={SHELL_INK_SEED} />

      {WALL_TORCH_XS.map((x) => (
        <Torch
          key={x}
          position={[cellCentre(x), shell.surfaceHeight(x, WALL_FACE_Z) + WALL_TORCH_LIFT, WALL_FACE_Z + CELL_CENTRE]}
          wallFacing={WallFacing.PlusZ}
        />
      ))}

      <Lantern position={[cellCentre(LANTERN_X), 0, cellCentre(PROP_ROW_Z)]} />
      <CraftingTable position={[cellCentre(CRAFTING_TABLE_X), 0, cellCentre(PROP_ROW_Z)]} />
      <Furnace position={[cellCentre(FURNACE_X), 0, cellCentre(PROP_ROW_Z)]} />

      <group position={[cellCentre(CHEST_X), 0, cellCentre(PROP_ROW_Z)]}>
        <Chest
          open={isOpen}
          onClick={handleChestClick}
          onPointerOver={handleChestOver}
          onPointerOut={handleChestOut}
        />
        <ProximityPrompt
          onInteract={openChest}
          actionText="Open"
          objectText="Friends"
          maxDistance={CHEST_PROMPT_DISTANCE}
          offset={[0, CHEST_PROMPT_HEIGHT, 0]}
          enabled={!isOpen}
        />
      </group>

      {hangingVines.map(({ x, y, z, length }) => (
        <CaveVines key={x} position={[cellCentre(x), y, cellCentre(z)]} length={length} seed={x} />
      ))}
      {sporeBlossomY !== undefined && (
        <SporeBlossom position={[cellCentre(SPORE_BLOSSOM.x), sporeBlossomY, cellCentre(SPORE_BLOSSOM.z)]} />
      )}
      {HANGING_ROOTS.map(({ x, z }) => {
        const y = shell.ceilingUnderside(x, z);
        return y === undefined ? null : (
          <HangingRoots key={x} position={[cellCentre(x), y, cellCentre(z)]} />
        );
      })}

      {AZALEAS.map(({ x, z, flowering }) => (
        <AzaleaBush key={x} position={[cellCentre(x), shell.surfaceHeight(x, z), cellCentre(z)]} flowering={flowering} />
      ))}
      {BIG_DRIPLEAVES.map(({ x, z, stemHeight }) => (
        <BigDripleaf key={x} position={[cellCentre(x), shell.surfaceHeight(x, z), cellCentre(z)]} stemHeight={stemHeight} />
      ))}
      {SMALL_DRIPLEAVES.map(({ x, z }) => (
        <SmallDripleaf key={x} position={[cellCentre(x), shell.surfaceHeight(x, z), cellCentre(z)]} />
      ))}
      {GRASS_TUFTS.map(({ x, z, tall }) => (
        <GrassTuft key={x} position={[cellCentre(x), shell.surfaceHeight(x, z), cellCentre(z)]} tall={tall} />
      ))}

      {PILLARS.map(({ seed, x, z, ...pillar }) => (
        <StonePillar key={seed} position={[x, 0, z]} seed={seed} {...pillar} />
      ))}
    </>
  );
}
