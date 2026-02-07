import { LightingMode } from '../../types';

type LightingCallback = (mode: LightingMode) => void;

let currentMode: LightingMode = LightingMode.Light;
const listeners = new Set<LightingCallback>();

export const LightingService = {
  getMode(): LightingMode {
    return currentMode;
  },

  setMode(mode: LightingMode) {
    if (mode === currentMode) return;
    currentMode = mode;
    for (const cb of listeners) {
      cb(mode);
    }
  },

  toggle() {
    const next = currentMode === LightingMode.Light
      ? LightingMode.Dark
      : LightingMode.Light;
    this.setMode(next);
  },

  // Returns an unsubscribe function
  subscribe(callback: LightingCallback): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
};
