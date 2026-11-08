'use client';

import type { CSSProperties } from 'react';
import type { FriendData } from '@/data/portfolio';
import { FONT_SIZE, LINE_HEIGHT, MINECRAFT_FONT, gui, notchedClipPath } from './gui';

export enum TooltipSide {
  Right = 'right',
  Left = 'left',
}

const CLICK_TO_VISIT = 'Click to visit';

// distance from the slot edge, and how far it sits above the slot top
const TOOLTIP_GAP = 4;
const TOOLTIP_RAISE = 2;
// the name line gets a little breathing room before the rest, like item tooltips
const TITLE_GAP = 2;

const TOOLTIP_COLOUR = {
  background: 'rgba(16, 4, 20, 0.94)',
  borderTop: 'rgba(110, 52, 214, 0.7)',
  borderBottom: 'rgba(52, 22, 112, 0.7)',
} as const;

// text colours with the drop shadow the game puts under gui text (a quarter as bright)
const TEXT_COLOUR = {
  name: { colour: '#FFFFFF', shadow: '#3F3F3F' },
  hostname: { colour: '#A8A8A8', shadow: '#2A2A2A' },
  action: { colour: '#5B5BFF', shadow: '#16163F' },
} as const;

function lineStyle({ colour, shadow }: { colour: string; shadow: string }): CSSProperties {
  return {
    display: 'block',
    color: colour,
    textShadow: `${gui(1)} ${gui(1)} 0 ${shadow}`,
  };
}

// shows a link without the protocol or a leading www
export function getHostname(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link;
  }
}

export function FriendTooltip({ friend, side }: { friend: FriendData; side: TooltipSide }) {
  const offset = `calc(100% + ${gui(TOOLTIP_GAP)})`;

  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        zIndex: 10,
        top: gui(-TOOLTIP_RAISE),
        ...(side === TooltipSide.Right ? { left: offset } : { right: offset }),
        display: 'block',
        padding: gui(1),
        background: TOOLTIP_COLOUR.background,
        clipPath: notchedClipPath(1),
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        textAlign: 'left',
        fontFamily: MINECRAFT_FONT,
        fontSize: gui(FONT_SIZE),
        lineHeight: gui(LINE_HEIGHT),
      }}
    >
      <span
        style={{
          display: 'block',
          padding: `${gui(2)} ${gui(3)} ${gui(1)}`,
          borderStyle: 'solid',
          borderWidth: gui(1),
          borderImage: `linear-gradient(${TOOLTIP_COLOUR.borderTop}, ${TOOLTIP_COLOUR.borderBottom}) 1`,
        }}
      >
        <span style={{ ...lineStyle(TEXT_COLOUR.name), marginBottom: gui(TITLE_GAP) }}>{friend.name}</span>
        <span style={lineStyle(TEXT_COLOUR.hostname)}>{getHostname(friend.link)}</span>
        <span style={lineStyle(TEXT_COLOUR.action)}>{CLICK_TO_VISIT}</span>
      </span>
    </span>
  );
}
