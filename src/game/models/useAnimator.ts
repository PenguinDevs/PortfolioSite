import { useCallback, useEffect, useRef } from 'react';
import { AnimationAction, AnimationClip, AnimationMixer, Object3D } from 'three';
import { useFrame } from '@react-three/fiber';

interface UseAnimatorOptions {
  initialClip?: string;
  fadeSpeed?: number;
  timeScale?: number;
}

export function useAnimator(
  root: Object3D,
  clips: AnimationClip[],
  options: UseAnimatorOptions = {},
) {
  const { initialClip, fadeSpeed = 8, timeScale = 1 } = options;

  const mixerRef = useRef<AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, AnimationAction>>(new Map());
  const targetRef = useRef<string>(initialClip ?? clips[0]?.name ?? '');
  const fadeSpeedRef = useRef(fadeSpeed);
  fadeSpeedRef.current = fadeSpeed;

  useEffect(() => {
    const mixer = new AnimationMixer(root);
    mixer.timeScale = timeScale;
    mixerRef.current = mixer;

    const actions = new Map<string, AnimationAction>();
    for (const clip of clips) {
      const action = mixer.clipAction(clip);
      action.play();
      action.setEffectiveWeight(clip.name === targetRef.current ? 1 : 0);
      actions.set(clip.name, action);
    }
    actionsRef.current = actions;

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      actionsRef.current = new Map();
    };
    // clips array from useGLTF is referentially stable per loaded model,
    // but we only care about root identity for re-init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    mixer.update(delta);

    const target = targetRef.current;
    const speed = fadeSpeedRef.current * delta;

    actionsRef.current.forEach((action, name) => {
      const goal = name === target ? 1 : 0;
      const current = action.getEffectiveWeight();
      action.setEffectiveWeight(current + (goal - current) * speed);
    });
  });

  const play = useCallback((name: string) => {
    targetRef.current = name;
  }, []);

  return { play };
}
