'use client';

import { ExperienceStatus } from '../types';
import { TEXT_WINDOW_FONT } from './TextWindow';

// same in both themes, like the award badge colours
const NOW_BACKGROUND = '#1f9d55';
const NOW_TEXT = '#ffffff';
const INCOMING_COLOUR = '#d63031';

// tilted so the tag reads as a sticker or stamp slapped on by hand
const NOW_TILT_DEG = 8;
const INCOMING_TILT_DEG = -8;

const TAG_LABEL: Record<ExperienceStatus.Upcoming | ExperienceStatus.Current, string> = {
  [ExperienceStatus.Upcoming]: 'INCOMING',
  [ExperienceStatus.Current]: 'NOW',
};

export interface ExperienceStatusTagProps {
  status: ExperienceStatus;
  fontSize?: number;
  // positioning only, the tilt is owned by the tag
  style?: React.CSSProperties;
}

// NOW sticker for current roles, INCOMING stamp for upcoming ones, nothing for past roles
export function ExperienceStatusTag({ status, fontSize = 14, style }: ExperienceStatusTagProps) {
  if (status === ExperienceStatus.Past) return null;
  const isCurrent = status === ExperienceStatus.Current;

  return (
    <span
      style={{
        ...style,
        display: 'inline-block',
        fontFamily: TEXT_WINDOW_FONT,
        fontSize,
        lineHeight: 1,
        letterSpacing: 1,
        whiteSpace: 'nowrap',
        padding: `${fontSize * 0.3}px ${fontSize * 0.55}px`,
        borderRadius: 3,
        transform: `rotate(${isCurrent ? NOW_TILT_DEG : INCOMING_TILT_DEG}deg)`,
        ...(isCurrent
          ? { background: NOW_BACKGROUND, color: NOW_TEXT }
          : { border: `2px solid ${INCOMING_COLOUR}`, color: INCOMING_COLOUR }),
      }}
    >
      {TAG_LABEL[status]}
    </span>
  );
}
