// shared sizes and colours for the chest window. everything is measured in Minecraft gui
// pixels so the layout matches the real chest screen at any scale

export const GRID_COLUMNS = 9;
export const MIN_GRID_ROWS = 3;
export const SLOT_SIZE = 18;
export const ITEM_SIZE = 16;
export const PANEL_PADDING = 7;
// the slots start below the title
export const PANEL_TOP_PADDING = 17;
export const TITLE_X = 8;
export const TITLE_Y = 6;
export const PANEL_WIDTH = PANEL_PADDING * 2 + GRID_COLUMNS * SLOT_SIZE;

export const FONT_SIZE = 8;
export const LINE_HEIGHT = 10;
export const MINECRAFT_FONT = "'Minecraft', monospace";

// keep a little margin each side of the window on narrow screens
const VIEWPORT_MARGIN_PX = 8;
// 4 px per gui pixel on desktop, shrunk so all 9 columns fit a 390 px phone
const MAX_GUI_PX = 4;

export const GUI_PX_VAR = '--mc-px';
export const GUI_PX = `min(${MAX_GUI_PX}px, calc((100vw - ${VIEWPORT_MARGIN_PX * 2}px) / ${PANEL_WIDTH}))`;

// a length of n gui pixels
export function gui(n: number): string {
  return `calc(var(${GUI_PX_VAR}) * ${n})`;
}

// rectangle with the corner pixels knocked out, like the gui textures
export function notchedClipPath(notch: number): string {
  const n = gui(notch);
  return `polygon(${n} 0, calc(100% - ${n}) 0, 100% ${n}, 100% calc(100% - ${n}), calc(100% - ${n}) 100%, ${n} 100%, 0 calc(100% - ${n}), 0 ${n})`;
}

export const GUI_COLOUR = {
  outline: '#000000',
  panel: '#C3C3C3',
  panelHighlight: '#FFFFFF',
  panelShadow: '#565656',
  slot: '#8A8A8A',
  slotShadow: '#383838',
  slotHighlight: '#FFFFFF',
  title: '#3F3F3F',
  hover: 'rgba(255, 255, 255, 0.5)',
  backdropTop: 'rgba(16, 16, 16, 0.45)',
  backdropBottom: 'rgba(16, 16, 16, 0.6)',
} as const;
