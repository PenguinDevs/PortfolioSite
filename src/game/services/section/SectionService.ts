import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
import { Section } from '../../types';
import { SECTIONS, TRACK_LENGTH } from '../../constants';
import { wrapPosition } from '../../scenes/circular/CircularSceneContext';

// find which section the player is in using range boundaries.
// SECTIONS is sorted by rangeStart ascending. the last entry whose
// rangeStart <= wrappedX wins; if none match, wrap around to the last entry.
function activeSection(x: number): Section {
  const wrapped = wrapPosition(x, TRACK_LENGTH);
  let result = SECTIONS[SECTIONS.length - 1];
  for (const section of SECTIONS) {
    if (section.rangeStart <= wrapped) {
      result = section;
    }
  }
  return result.id;
}

// raw player X piped through activeSection + distinctUntilChanged
// so subscribers only fire on actual boundary crossings
const playerX$ = new BehaviorSubject(0);

export const section$ = playerX$.pipe(
  map(activeSection),
  distinctUntilChanged(),
);

export const SectionService = {
  // called by MovementService each frame after updating position
  update(playerX: number) {
    playerX$.next(playerX);
  },
};
