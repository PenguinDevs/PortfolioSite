import { Section } from '../types';

export interface SectionDefinition {
  id: Section;
  label: string;
  // navigation target position on the circular track (must match HomeScene.tsx)
  x: number;
  // start of the region where this section is considered active (wrapping clockwise).
  // used for the section indicator in the navbar. sorted ascending by rangeStart,
  // the last entry whose rangeStart <= wrappedPlayerX wins (with wrap-around).
  rangeStart: number;
}

// must be sorted by rangeStart ascending for the detection algorithm
export const SECTIONS: SectionDefinition[] = [
  { id: Section.Awards, label: 'Awards', x: 42, rangeStart: 36 },
  { id: Section.Projects, label: 'Projects', x: 60, rangeStart: 57 },
  { id: Section.Home, label: 'Home', x: 0, rangeStart: 258 },
];

// display order for the navbar (separate from the range-sorted order above)
export const SECTION_DISPLAY_ORDER: Section[] = [
  Section.Home,
  Section.Awards,
  Section.Projects,
];

// total loop length of the circular track
// last project tile ends at ~252, plus buffer space to 282
export const TRACK_LENGTH = 282;
