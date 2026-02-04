export enum InputAction {
  Left = 'left',
  Right = 'right',
  Forward = 'forward',
  Backward = 'backward',
}

export type InputState = Record<InputAction, boolean>;

export enum Sound {
  Button = '/assets/sounds/button.ogg',
}

export enum LightingMode {
  Light = 'light',
  Dark = 'dark',
}

// A pair of colours keyed by lighting mode
export type ThemedColour = Record<LightingMode, string>;

// A pair of numeric values keyed by lighting mode
export type ThemedValue = Record<LightingMode, number>;

export function createInputState(): InputState {
  return {
    [InputAction.Left]: false,
    [InputAction.Right]: false,
    [InputAction.Forward]: false,
    [InputAction.Backward]: false,
  };
}
