import { useCallback, useEffect, useRef } from 'react';
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  InterpolateLinear,
  LoopOnce,
  Object3D,
} from 'three';
import { useFrame } from '@react-three/fiber';

// per-clip time scale overrides, clips not listed default to 1
type TimeScaleMap = Record<string, number>;

interface UseAnimatorOptions {
  initialClip?: string;
  fadeSpeed?: number;
  timeScales?: TimeScaleMap;
}

// weight threshold for snapping to 0 or 1
const WEIGHT_EPSILON = 0.01;

// patches every track in a clip so it loops cleanly:
// 1. forces LINEAR interpolation (Blender often exports as STEP/discrete,
//    which causes hard snaps at the loop seam because LoopRepeat's time
//    modulo never lands exactly on the final keyframe)
// 2. ensures every track has a keyframe at t=duration matching t=0
//    (driver bones like DRV_* commonly bake one frame short)
function makeClipLoopable(clip: AnimationClip) {
  const dur = clip.duration;
  if (dur <= 0) return;

  for (const track of clip.tracks) {
    const n = track.times.length;
    if (n < 2) continue;

    // force linear interpolation so values blend across the seam
    track.setInterpolation(InterpolateLinear);

    const stride = track.getValueSize();
    const firstValues = track.values.slice(0, stride);
    const lastTime = track.times[n - 1];

    if (Math.abs(lastTime - dur) < 1e-4) {
      // track already reaches clip.duration -- overwrite the last keyframe
      for (let i = 0; i < stride; i++) {
        track.values[(n - 1) * stride + i] = firstValues[i];
      }
    } else if (lastTime < dur) {
      // track ends early -- append a keyframe at duration matching frame 0
      const newTimes = new Float32Array(n + 1);
      newTimes.set(track.times);
      newTimes[n] = dur;

      const newValues = new Float32Array((n + 1) * stride);
      newValues.set(track.values);
      for (let i = 0; i < stride; i++) {
        newValues[n * stride + i] = firstValues[i];
      }

      track.times = newTimes;
      track.values = newValues;
    }
  }
}

export function useAnimator(
  root: Object3D,
  clips: AnimationClip[],
  options: UseAnimatorOptions = {},
) {
  const { initialClip, fadeSpeed = 8, timeScales = {} } = options;

  const mixerRef = useRef<AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, AnimationAction>>(new Map());
  const targetRef = useRef<string>(initialClip ?? clips[0]?.name ?? '');
  const fadeSpeedRef = useRef(fadeSpeed);
  fadeSpeedRef.current = fadeSpeed;

  useEffect(() => {
    const mixer = new AnimationMixer(root);
    mixerRef.current = mixer;

    const actions = new Map<string, AnimationAction>();
    for (const clip of clips) {
      makeClipLoopable(clip);

      const action = mixer.clipAction(clip);
      action.timeScale = timeScales[clip.name] ?? 1;

      // use LoopOnce + clamp so the time actually reaches t=duration
      // (LoopRepeat's modulo wrap skips it). we restart manually below.
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;

      if (clip.name === targetRef.current) {
        action.play();
        action.setEffectiveWeight(1);
      }
      actions.set(clip.name, action);
    }
    actionsRef.current = actions;

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      actionsRef.current = new Map();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    mixer.update(delta);

    const target = targetRef.current;
    const speed = fadeSpeedRef.current * delta;

    actionsRef.current.forEach((action, name) => {
      const w = action.getEffectiveWeight();

      if (name === target) {
        // manual loop: when LoopOnce clamps at the end, restart from 0
        if (action.paused) {
          action.paused = false;
          action.time = 0;
        }

        let next = w + (1 - w) * speed;
        if (next > 1 - WEIGHT_EPSILON) next = 1;
        action.setEffectiveWeight(next);
      } else if (w > 0) {
        let next = w * (1 - speed);
        if (next < WEIGHT_EPSILON) {
          next = 0;
          action.stop();
        }
        action.setEffectiveWeight(next);
      }
    });
  });

  const play = useCallback((name: string) => {
    if (name === targetRef.current) return;
    targetRef.current = name;

    const action = actionsRef.current.get(name);
    if (!action) return;

    const ts = action.timeScale;
    action.reset();
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = ts;
    action.setEffectiveWeight(0);
    action.play();
  }, []);

  const setTimeScale = useCallback((clipName: string, scale: number) => {
    const action = actionsRef.current.get(clipName);
    if (action) action.timeScale = scale;
  }, []);

  return { play, setTimeScale };
}
