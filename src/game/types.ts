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

export enum Section {
  Home = 'home',
  Awards = 'awards',
  Projects = 'projects',
}

// kind of role, mirrors the LinkedIn employment types plus clubs and short programs
export enum ExperienceType {
  FullTime = 'full-time',
  PartTime = 'part-time',
  Contract = 'contract',
  Internship = 'internship',
  SelfEmployed = 'self-employed',
  Freelance = 'freelance',
  Club = 'club',
  Program = 'program',
}

export enum WorkMode {
  OnSite = 'on-site',
  Remote = 'remote',
  Hybrid = 'hybrid',
}

// derived from the role's dates at runtime, never stored in the data
export enum ExperienceStatus {
  Upcoming = 'upcoming',
  Current = 'current',
  Past = 'past',
}

// things shown in the experience section: one per role, plus the internship offers note
export enum ExperienceItemKind {
  Role = 'role',
  Offers = 'offers',
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
