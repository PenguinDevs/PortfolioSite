import { Section } from '../types';

export interface SectionDefinition {
  id: Section;
  label: string;
  // navigation target position on the circular track (must match HomeScene.tsx)
  x: number;
  // navigation target on touch devices, for sections laid out differently there
  touchX?: number;
  // start of the region where this section is considered active (wrapping clockwise).
  // used for the section indicator in the navbar. sorted ascending by rangeStart,
  // the last entry whose rangeStart <= wrappedPlayerX wins (with wrap-around).
  rangeStart: number;
}

// must be sorted by rangeStart ascending for the detection algorithm
export const SECTIONS: SectionDefinition[] = [
  // x is the middle of the desktop pinboard, touchX frames the first two
  // badges of the mobile lanyard row (see ExperienceSection.tsx)
  { id: Section.Experience, label: 'Experience', x: 54, touchX: 37, rangeStart: 30 },
  { id: Section.Awards, label: 'Awards', x: 90, rangeStart: 84 },
  { id: Section.Projects, label: 'Projects', x: 108, rangeStart: 105 },
  // the friends cave after the projects still counts as projects, home starts just past it
  { id: Section.Home, label: 'Home', x: 0, rangeStart: 354 },
];

// display order for the navbar (separate from the range-sorted order above)
export const SECTION_DISPLAY_ORDER: Section[] = [
  Section.Home,
  Section.Experience,
  Section.Awards,
  Section.Projects,
];

// total loop length of the circular track
// the projects end at ~303 and the friends cave after them at ~350, plus buffer space to 384.
// must be a multiple of 12 (tile width) so ground tiles align after wrapping.
export const TRACK_LENGTH = 384;
