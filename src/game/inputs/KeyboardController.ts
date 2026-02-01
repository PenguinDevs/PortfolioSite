import { InputAction, createInputState } from '../types';
import type { InputState } from '../types';

const KEY_MAP = {
  KeyA: InputAction.Left,
  ArrowLeft: InputAction.Left,
  KeyD: InputAction.Right,
  ArrowRight: InputAction.Right,
  KeyW: InputAction.Forward,
  ArrowUp: InputAction.Forward,
  KeyS: InputAction.Backward,
  ArrowDown: InputAction.Backward,
} as const satisfies Partial<Record<KeyboardEvent['code'], InputAction>>;

export class KeyboardController {
  readonly state: InputState = createInputState();

  private handleKeyDown = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code as keyof typeof KEY_MAP];
    if (action) {
      e.preventDefault();
      this.state[action] = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code as keyof typeof KEY_MAP];
    if (action) {
      this.state[action] = false;
    }
  };

  attach() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
