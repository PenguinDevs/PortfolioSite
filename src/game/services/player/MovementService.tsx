'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MutableRefObject, RefObject } from 'react';
import type { PlayerHandle } from '../../entities/Player';
import type { InputHandle } from '../../inputs';
import type { AutopilotTarget } from '../../contexts/NavigationContext';
import { InputAction } from '../../types';
import { TRACK_LENGTH } from '../../constants';
import { circularDelta } from '../../scenes/circular/CircularSceneContext';

const MOVE_SPEED = 5;
// how much velocity each pixel of scroll delta adds
const SCROLL_SENSITIVITY = 0.15;
// friction multiplier applied each second (lower = more drag)
const SCROLL_FRICTION = 4;
// swipe pixels to game-world velocity conversion (higher than scroll
// because touch move deltas arrive in smaller increments than wheel events)
const SWIPE_SENSITIVITY = 0.3;
// converts fling velocity (px/s) to game-world velocity
const FLING_SENSITIVITY = 0.06;
// friction for touch fling momentum (lower than SCROLL_FRICTION for longer coast)
const TOUCH_MOMENTUM_FRICTION = 2.5;

// autopilot tuning
const AUTOPILOT_MAX_SPEED = 100;
const AUTOPILOT_DECEL_DISTANCE = 60;
const AUTOPILOT_MIN_SPEED = 2;
const ARRIVAL_THRESHOLD = 0.3;
// within this distance, cap speed to a gentle walk so the walk
// animation plays for a moment before the penguin stops
const AUTOPILOT_WALK_DISTANCE = 3;
const AUTOPILOT_WALK_SPEED = 4;

interface MovementServiceProps {
  inputRef: RefObject<InputHandle>;
  playerRef: RefObject<PlayerHandle | null>;
  autopilotTargetRef?: MutableRefObject<AutopilotTarget>;
}

export function MovementService({ inputRef, playerRef, autopilotTargetRef }: MovementServiceProps) {
  const scrollVelocity = useRef(0);
  // touch fling momentum (separate from scrollVelocity for lower friction coast)
  const touchMomentum = useRef(0);
  // tracks raw scroll delta so we can detect user scroll during autopilot
  const pendingScrollDelta = useRef(0);

  // accumulate scroll delta into velocity
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      // vertical: scroll up (negative deltaY) moves left, scroll down moves right
      // horizontal: deltaX from trackpad horizontal scroll moves in same direction
      const combined = e.deltaY + e.deltaX;
      scrollVelocity.current += combined * SCROLL_SENSITIVITY;
      pendingScrollDelta.current += combined;
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  useFrame((_, delta) => {
    const handle = inputRef.current;
    const player = playerRef.current;
    if (!handle || !player) return;

    const input = handle.state;

    // check if the user is actively providing input (used to cancel autopilot)
    const userScrolled = Math.abs(pendingScrollDelta.current) > 0;
    pendingScrollDelta.current = 0;
    const userKeyed = input[InputAction.Left] || input[InputAction.Right];
    const swipeDx = handle.touch.consumeSwipeDelta();
    const flingVelocity = handle.touch.consumeFlingVelocity();
    const userSwiped = swipeDx !== 0;

    // autopilot mode: drive toward a target position
    const autopilotTarget = autopilotTargetRef?.current ?? null;
    if (autopilotTarget) {
      // cancel autopilot if the user provides any input
      if (userScrolled || userKeyed || userSwiped) {
        autopilotTargetRef!.current = null;
        // re-inject swipe delta so it isn't lost
        if (userSwiped) {
          scrollVelocity.current += swipeDx * SWIPE_SENSITIVITY;
        }
        // fall through to normal input processing below
      } else {
        const playerX = player.group.position.x;
        const shortDelta = circularDelta(playerX, autopilotTarget.targetX, TRACK_LENGTH);
        const shortDistance = Math.abs(shortDelta);
        // use the stored direction from the nav button instead of shortest path
        const direction = autopilotTarget.direction;
        // if our direction matches the shortest path, use that distance;
        // otherwise we're going the long way around the circular track
        const distance = direction === Math.sign(shortDelta)
          ? shortDistance
          : TRACK_LENGTH - shortDistance;

        if (shortDistance < ARRIVAL_THRESHOLD) {
          // close enough -- clear autopilot but keep residual velocity
          // so the normal friction decay brings the penguin to a natural stop
          autopilotTargetRef!.current = null;
          // fall through to normal input processing below
        } else {
          // compute desired speed with smooth deceleration near the target,
          // dropping to a walk for the last stretch so the animation transitions
          let desiredSpeed: number;
          if (distance < AUTOPILOT_WALK_DISTANCE) {
            // ease-out from walk speed down to min speed
            const t = (distance - ARRIVAL_THRESHOLD) / (AUTOPILOT_WALK_DISTANCE - ARRIVAL_THRESHOLD);
            const inv = 1 - t;
            const eased = 1 - inv * inv * inv; // ease-out: holds walk speed then tapers gently
            desiredSpeed = AUTOPILOT_MIN_SPEED + (AUTOPILOT_WALK_SPEED - AUTOPILOT_MIN_SPEED) * eased;
          } else if (distance < AUTOPILOT_DECEL_DISTANCE) {
            const t = distance / AUTOPILOT_DECEL_DISTANCE;
            desiredSpeed = Math.max(AUTOPILOT_MAX_SPEED * Math.sqrt(t), AUTOPILOT_MIN_SPEED);
          } else {
            desiredSpeed = AUTOPILOT_MAX_SPEED;
          }

          scrollVelocity.current = direction * desiredSpeed;
          touchMomentum.current = 0;
          player.group.position.x += scrollVelocity.current * delta;

          const speed = Math.abs(scrollVelocity.current);
          player.setMoving(speed > 0.01, direction, speed);
          return;
        }
      }
    }

    // normal input processing

    // keyboard / touch-hold input gives a fixed walk speed
    let keyboardDx = 0;
    if (input[InputAction.Left]) keyboardDx -= 1;
    if (input[InputAction.Right]) keyboardDx += 1;

    // decay scroll velocity with friction
    scrollVelocity.current *= Math.exp(-SCROLL_FRICTION * delta);
    // kill tiny residual drift
    if (Math.abs(scrollVelocity.current) < 0.01) scrollVelocity.current = 0;

    // consume swipe delta from touch controller and add it as velocity
    if (swipeDx !== 0) {
      scrollVelocity.current += swipeDx * SWIPE_SENSITIVITY;
      // active swiping overrides any existing fling coast
      touchMomentum.current = 0;
    }

    // on touch release, transfer momentum to the low-friction coast channel
    if (flingVelocity !== 0) {
      const flingGameVel = flingVelocity * FLING_SENSITIVITY;
      // use whichever is larger to avoid a speed drop on release
      const sign = Math.sign(flingGameVel) || Math.sign(scrollVelocity.current);
      touchMomentum.current = sign * Math.max(
        Math.abs(flingGameVel),
        Math.abs(scrollVelocity.current),
      );
      scrollVelocity.current = 0;
    }

    // decay touch fling momentum with lower friction for longer coast
    touchMomentum.current *= Math.exp(-TOUCH_MOMENTUM_FRICTION * delta);
    if (Math.abs(touchMomentum.current) < 0.01) touchMomentum.current = 0;

    const totalVelocity = keyboardDx * MOVE_SPEED + scrollVelocity.current + touchMomentum.current;
    player.group.position.x += totalVelocity * delta;

    const speed = Math.abs(totalVelocity);
    const direction = Math.sign(totalVelocity);
    player.setMoving(speed > 0.01, direction, speed);
  });

  return null;
}
