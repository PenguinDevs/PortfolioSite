import { useEffect, useRef } from 'react';
import type { InputState } from '../types';
import { KeyboardController } from './KeyboardController';

export function useInput(): React.MutableRefObject<InputState> {
  const controllerRef = useRef<KeyboardController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new KeyboardController();
  }

  const inputRef = useRef(controllerRef.current.state);

  useEffect(() => {
    const controller = controllerRef.current!;
    controller.attach();
    return () => controller.dispose();
  }, []);

  return inputRef;
}
