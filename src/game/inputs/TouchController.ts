import { InputAction, createInputState } from '../types';
import type { InputState } from '../types';

// px the finger must move before we treat it as a swipe instead of a hold
const SWIPE_THRESHOLD = 8;

// fraction of screen width on each edge that counts as a hold region
// e.g. 0.2 means the leftmost 20% and rightmost 20% are hold zones
const HOLD_REGION_EDGE = 0.2;

// time window for sampling velocity to compute fling momentum on release
const FLING_SAMPLE_WINDOW = 100; // ms

// data attribute marking overlay containers (modals, lightboxes) that
// should block game touch input entirely
const OVERLAY_ATTR = 'data-block-game-touch';

interface VelocitySample {
  dx: number;
  time: number;
}

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

  // set true when a fresh touch sequence begins (all fingers were up,
  // now one went down). MovementService reads and clears this to kill
  // residual momentum from the previous gesture.
  freshTouchDown = false;

  private touches: TrackedTouch[] = [];
  private target: HTMLElement | null = null;

  // velocity tracking for fling momentum on touch release
  private velocitySamples: VelocitySample[] = [];
  private flingVelocity = 0;

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

  // check if the touch target is inside an overlay modal that should
  // block game input entirely (e.g. ProjectOverlay, AwardOverlay)
  private isInsideOverlay(el: HTMLElement): boolean {
    let node: HTMLElement | null = el;
    while (node) {
      if (node.hasAttribute(OVERLAY_ATTR)) return true;
      node = node.parentElement;
    }
    return false;
  }

  private handleTouchStart = (e: TouchEvent) => {
    // clear velocity samples when starting a fresh touch sequence
    if (this.touches.length === 0) {
      this.velocitySamples = [];
      this.flingVelocity = 0;
      this.freshTouchDown = true;
    }

    const w = window.innerWidth;
    const leftEdge = w * HOLD_REGION_EDGE;
    const rightEdge = w * (1 - HOLD_REGION_EDGE);

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // fully ignore touches inside overlay modals
      const target = touch.target as HTMLElement | null;
      if (target && this.isInsideOverlay(target)) continue;

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
    // only preventDefault when at least one touch has been promoted to
    // swiping. This lets taps on interactive elements (links, buttons)
    // fire their native click when the finger doesn't move.
    if (this.touches.some((t) => t.isSwiping)) {
      e.preventDefault();
    }

    const now = performance.now();
    let eventDelta = 0;

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
      const contribution = -dx - dy;
      this.swipeDeltaX += contribution;
      eventDelta += contribution;
    }

    // record velocity sample for fling detection
    if (eventDelta !== 0) {
      this.velocitySamples.push({ dx: eventDelta, time: now });
      // prune samples older than the window
      const cutoff = now - FLING_SAMPLE_WINDOW;
      while (this.velocitySamples.length > 0 && this.velocitySamples[0].time < cutoff) {
        this.velocitySamples.shift();
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const idx = this.touches.findIndex((t) => t.id === touch.identifier);
      if (idx !== -1) this.touches.splice(idx, 1);
    }

    // safety net: if the browser says zero fingers remain but we still
    // have tracked touches, force-clear them. This prevents a stuck hold
    // state when a touchend event is missed (common on mobile).
    if (e.touches.length === 0 && this.touches.length > 0) {
      this.touches.length = 0;
    }

    this.refreshHoldState();

    // when all fingers are up, compute fling velocity from recent samples
    if (this.touches.length === 0 && this.velocitySamples.length >= 2) {
      const now = performance.now();
      const cutoff = now - FLING_SAMPLE_WINDOW;
      const recent = this.velocitySamples.filter((s) => s.time >= cutoff);
      if (recent.length >= 2) {
        const totalDx = recent.reduce((sum, s) => sum + s.dx, 0);
        const timeSpan = (recent[recent.length - 1].time - recent[0].time) / 1000;
        if (timeSpan > 0.001) {
          this.flingVelocity = totalDx / timeSpan; // px/s
        }
      }
      this.velocitySamples = [];
    }
  };

  // listen on window so touches on drei Html portal overlays still drive
  // scrolling. Overlay modals are filtered out in handleTouchStart.
  // Interactive elements (links, buttons) are tracked normally but
  // preventDefault is deferred until a swipe is detected, so taps still
  // fire native clicks.
  attach(_element: HTMLElement) {
    this.target = _element;
    window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd);
    window.addEventListener('touchcancel', this.handleTouchEnd);
  }

  dispose() {
    this.target = null;
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

  // consume the fling velocity computed on touch release (call once per frame)
  consumeFlingVelocity(): number {
    const v = this.flingVelocity;
    this.flingVelocity = 0;
    return v;
  }
}
