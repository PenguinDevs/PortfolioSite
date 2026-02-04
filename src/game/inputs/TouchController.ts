import { InputAction, createInputState } from '../types';
import type { InputState } from '../types';

// px the finger must move before we treat it as a swipe instead of a hold
const SWIPE_THRESHOLD = 8;

// fraction of screen width on each edge that counts as a hold region
// e.g. 0.2 means the leftmost 20% and rightmost 20% are hold zones
const HOLD_REGION_EDGE = 0.2;

interface TrackedTouch {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  // once the finger drifts past the threshold we stop setting hold state
  isSwiping: boolean;
  side: InputAction.Left | InputAction.Right;
}

export class TouchController {
  readonly state: InputState = createInputState();

  // accumulated swipe delta since last frame (consumed by MovementService)
  swipeDeltaX = 0;

  private touches: TrackedTouch[] = [];
  private target: HTMLElement | null = null;

  // recalculate hold state from all active non-swiping touches
  private refreshHoldState() {
    let left = false;
    let right = false;
    for (const t of this.touches) {
      if (t.isSwiping) continue;
      if (t.side === InputAction.Left) left = true;
      else right = true;
    }
    this.state[InputAction.Left] = left;
    this.state[InputAction.Right] = right;
  }

  private handleTouchStart = (e: TouchEvent) => {
    const w = window.innerWidth;
    const leftEdge = w * HOLD_REGION_EDGE;
    const rightEdge = w * (1 - HOLD_REGION_EDGE);

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX;

      // only touches in the outer edges count as hold regions
      const inLeftZone = x < leftEdge;
      const inRightZone = x > rightEdge;
      const isHold = inLeftZone || inRightZone;
      const side = inLeftZone ? InputAction.Left : InputAction.Right;

      this.touches.push({
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        // touches in the middle 60% start as swipes immediately
        isSwiping: !isHold,
        side,
      });
    }
    this.refreshHoldState();
  };

  private handleTouchMove = (e: TouchEvent) => {
    // only block browser gestures if we are tracking touches from the canvas
    if (this.touches.length > 0) {
      e.preventDefault();
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const tracked = this.touches.find((t) => t.id === touch.identifier);
      if (!tracked) continue;

      const dx = touch.clientX - tracked.lastX;
      const dy = touch.clientY - tracked.lastY;
      tracked.lastX = touch.clientX;
      tracked.lastY = touch.clientY;

      // once the finger has moved enough, promote to swipe mode
      if (!tracked.isSwiping) {
        const driftX = Math.abs(touch.clientX - tracked.startX);
        const driftY = Math.abs(touch.clientY - tracked.startY);
        if (driftX >= SWIPE_THRESHOLD || driftY >= SWIPE_THRESHOLD) {
          tracked.isSwiping = true;
          this.refreshHoldState();
        }
      }

      // invert both axes: swipe left = move right, swipe up = move right
      this.swipeDeltaX += -dx - dy;
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const idx = this.touches.findIndex((t) => t.id === touch.identifier);
      if (idx !== -1) this.touches.splice(idx, 1);
    }
    this.refreshHoldState();
  };

  // attach touch listeners scoped to a specific element (e.g. the canvas)
  attach(element: HTMLElement) {
    this.target = element;
    // only capture touches that start on the target element
    element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    // move/end/cancel stay on window so we keep tracking if the finger drifts off
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd);
    window.addEventListener('touchcancel', this.handleTouchEnd);
  }

  dispose() {
    if (this.target) {
      this.target.removeEventListener('touchstart', this.handleTouchStart);
      this.target = null;
    }
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
