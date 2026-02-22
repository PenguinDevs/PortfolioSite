import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import type { Observable } from 'rxjs';
import type { RefObject } from 'react';
import type { Group } from 'three';
import { Vector3 } from 'three';

export interface ProximityState {
  inRange: boolean;
  isClosest: boolean;
}

interface PromptEntry {
  anchorRef: RefObject<Group | null>;
  maxDistance: number;
  state$: BehaviorSubject<ProximityState>;
  // mutable scratch written by update() each frame
  dist: number;
  active: boolean;
}

const entries = new Map<string, PromptEntry>();
const _anchorPos = new Vector3();

export const ProximityService = {
  // register a prompt and receive an observable that emits only on
  // in/out-of-range and closest transitions
  register(
    id: string,
    anchorRef: RefObject<Group | null>,
    maxDistance: number,
  ): Observable<ProximityState> {
    const state$ = new BehaviorSubject<ProximityState>({ inRange: false, isClosest: false });
    entries.set(id, { anchorRef, maxDistance, state$, dist: Infinity, active: false });
    return state$.pipe(
      distinctUntilChanged((a, b) => a.inRange === b.inRange && a.isClosest === b.isClosest),
    );
  },

  unregister(id: string) {
    const entry = entries.get(id);
    if (entry) {
      entry.state$.complete();
      entries.delete(id);
    }
  },

  // called once per frame with the player's world position.
  // computes distances for all registered prompts, finds the closest
  // in-range prompt, and pushes state changes to subscribers.
  update(playerWorldPos: Vector3) {
    let closestId: string | null = null;
    let closestDist = Infinity;

    // first pass: compute distances and find closest in-range prompt
    for (const [id, entry] of entries) {
      const anchor = entry.anchorRef.current;
      if (!anchor) {
        entry.active = false;
        continue;
      }
      entry.active = true;
      anchor.getWorldPosition(_anchorPos);
      entry.dist = playerWorldPos.distanceTo(_anchorPos);

      if (entry.dist <= entry.maxDistance && entry.dist < closestDist) {
        closestId = id;
        closestDist = entry.dist;
      }
    }

    // second pass: push state (distinctUntilChanged filters duplicates)
    for (const [id, entry] of entries) {
      if (!entry.active) continue;
      entry.state$.next({
        inRange: entry.dist <= entry.maxDistance,
        isClosest: id === closestId,
      });
    }
  },
};
