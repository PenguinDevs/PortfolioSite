'use client';

import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { RefObject } from 'react';
import { InputAction, type InputState } from '../../types';

const MOVE_SPEED = 5;

interface MovementServiceProps {
  inputRef: RefObject<InputState>;
  playerRef: RefObject<Group | null>;
}

export function MovementService({ inputRef, playerRef }: MovementServiceProps) {
  useFrame((_, delta) => {
    const input = inputRef.current;
    const player = playerRef.current;
    if (!input || !player) return;

    let dx = 0;
    if (input[InputAction.Left]) dx -= 1;
    if (input[InputAction.Right]) dx += 1;

    player.position.x += dx * MOVE_SPEED * delta;
  });

  return null;
}
