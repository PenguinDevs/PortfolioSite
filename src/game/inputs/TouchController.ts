import { InputAction, createInputState } from '../types';
import type { InputState } from '../types';

// minimum horizontal distance (px) before a swipe is recognised
const SWIPE_THRESHOLD = 10;

export class TouchController {
  readonly state: InputState = createInputState();

  // accumulated swipe delta since last frame (consumed by MovementService)
  swipeDeltaX = 0;

  // track which touch id is a swipe vs a hold-region tap
  private swipeTouchId: number | null = null;
  private swipeStartX = 0;
  private swipeLastX = 0;

  // hold-region touch ids (left/right halves of the screen)
  private holdTouchId: number | null = null;

  private handleTouchStart = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // check if this touch lands in a hold region
      const screenHalf = window.innerWidth / 2;
      const isLeftHalf = touch.clientX < screenHalf;

      if (this.holdTouchId === null) {
        // first hold touch -- use it for directional hold
        this.holdTouchId = touch.identifier;
        this.state[isLeftHalf ? InputAction.Left : InputAction.Right] = true;
        continue;
      }

      // second finger could be a swipe
      if (this.swipeTouchId === null) {
        this.swipeTouchId = touch.identifier;
        this.swipeStartX = touch.clientX;
        this.swipeLastX = touch.clientX;
      }
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === this.swipeTouchId) {
        const dx = touch.clientX - this.swipeLastX;
        this.swipeDeltaX += dx;
        this.swipeLastX = touch.clientX;
      }

      // if the hold finger moves across the midpoint, update direction
      if (touch.identifier === this.holdTouchId) {
        const screenHalf = window.innerWidth / 2;
        const isLeftHalf = touch.clientX < screenHalf;
        this.state[InputAction.Left] = isLeftHalf;
        this.state[InputAction.Right] = !isLeftHalf;
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === this.swipeTouchId) {
        this.swipeTouchId = null;
      }

      if (touch.identifier === this.holdTouchId) {
        this.holdTouchId = null;
        this.state[InputAction.Left] = false;
        this.state[InputAction.Right] = false;
      }
    }
  };

  attach() {
    window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    window.addEventListener('touchend', this.handleTouchEnd);
    window.addEventListener('touchcancel', this.handleTouchEnd);
  }

  dispose() {
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('touchcancel', this.handleTouchEnd);
  }

  // consume the accumulated swipe delta (call once per frame)
  consumeSwipeDelta(): number {
    const delta = this.swipeDeltaX;
    this.swipeDeltaX = 0;
    return delta;
  }
}
