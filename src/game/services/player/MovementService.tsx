'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RefObject } from 'react';
import type { PlayerHandle } from '../../entities/Player';
import type { InputHandle } from '../../inputs';
import { InputAction } from '../../types';

const MOVE_SPEED = 5;
// how much velocity each pixel of scroll delta adds
const SCROLL_SENSITIVITY = 0.15;
// friction multiplier applied each second (lower = more drag)
const SCROLL_FRICTION = 4;
// swipe pixels to game-world velocity conversion (higher than scroll
// because touch move deltas arrive in smaller increments than wheel events)
const SWIPE_SENSITIVITY = 0.3;

interface MovementServiceProps {
  inputRef: RefObject<InputHandle>;
  playerRef: RefObject<PlayerHandle | null>;
}

export function MovementService({ inputRef, playerRef }: MovementServiceProps) {
  const scrollVelocity = useRef(0);

  // accumulate scroll delta into velocity
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      // scroll up (negative deltaY) moves left, scroll down moves right
      scrollVelocity.current += e.deltaY * SCROLL_SENSITIVITY;
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  useFrame((_, delta) => {
    const handle = inputRef.current;
    const player = playerRef.current;
    if (!handle || !player) return;

    const input = handle.state;

    // keyboard / touch-hold input gives a fixed walk speed
    let keyboardDx = 0;
    if (input[InputAction.Left]) keyboardDx -= 1;
    if (input[InputAction.Right]) keyboardDx += 1;

    // decay scroll velocity with friction
    scrollVelocity.current *= Math.exp(-SCROLL_FRICTION * delta);
    // kill tiny residual drift
    if (Math.abs(scrollVelocity.current) < 0.01) scrollVelocity.current = 0;

    // consume swipe delta from touch controller and add it as velocity
    const swipeDx = handle.touch.consumeSwipeDelta();
    if (swipeDx !== 0) {
      scrollVelocity.current += swipeDx * SWIPE_SENSITIVITY;
    }

    const totalVelocity = keyboardDx * MOVE_SPEED + scrollVelocity.current;
    player.group.position.x += totalVelocity * delta;

    const speed = Math.abs(totalVelocity);
    const direction = Math.sign(totalVelocity);
    player.setMoving(speed > 0.01, direction, speed);
  });

  return null;
}
