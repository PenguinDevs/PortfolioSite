import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { InputState } from '../types';
import { InputAction, createInputState } from '../types';
import { KeyboardController } from './KeyboardController';
import { TouchController } from './TouchController';

// merged input state that combines keyboard + touch hold regions
export interface InputHandle {
  state: InputState;
  touch: TouchController;
}

export function useInput(): React.MutableRefObject<InputHandle> {
  const keyboardRef = useRef<KeyboardController | null>(null);
  const touchRef = useRef<TouchController | null>(null);

  if (!keyboardRef.current) keyboardRef.current = new KeyboardController();
  if (!touchRef.current) touchRef.current = new TouchController();

  // merged state that OR-s keyboard and touch hold inputs each frame
  const mergedState = useRef<InputState>(createInputState());

  const handleRef = useRef<InputHandle>({
    state: mergedState.current,
    touch: touchRef.current,
  });

  // grab the canvas element from r3f so touch listeners are scoped to it
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const keyboard = keyboardRef.current!;
    const touch = touchRef.current!;
    keyboard.attach();
    touch.attach(gl.domElement);

    // drei Html appends portal divs as siblings of the canvas inside
    // this parent div. Without touch-action: none the browser can claim
    // touches on those portals for native pan/scroll, which cancels our
    // touchmove events mid-gesture.
    const parent = gl.domElement.parentElement;
    if (parent) parent.style.touchAction = 'none';

    // merge keyboard + touch states at 60fps so the game loop always
    // sees a single unified input state
    const interval = setInterval(() => {
      const kb = keyboard.state;
      const tc = touch.state;
      const merged = mergedState.current;
      merged[InputAction.Left] = kb[InputAction.Left] || tc[InputAction.Left];
      merged[InputAction.Right] = kb[InputAction.Right] || tc[InputAction.Right];
      merged[InputAction.Forward] = kb[InputAction.Forward] || tc[InputAction.Forward];
      merged[InputAction.Backward] = kb[InputAction.Backward] || tc[InputAction.Backward];
    }, 16);

    return () => {
      clearInterval(interval);
      keyboard.dispose();
      touch.dispose();
    };
  }, [gl]);

  return handleRef;
}
