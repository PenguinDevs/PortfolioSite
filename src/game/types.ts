export enum InputAction {
  Left = 'left',
  Right = 'right',
  Forward = 'forward',
  Backward = 'backward',
}

export type InputState = Record<InputAction, boolean>;

export function createInputState(): InputState {
  return {
    [InputAction.Left]: false,
    [InputAction.Right]: false,
    [InputAction.Forward]: false,
    [InputAction.Backward]: false,
  };
}
