'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useExperienceOverlay } from '../contexts/ExperienceOverlayContext';
import { useLightingMode } from '../hooks';
import { BACKGROUND_COLOUR, INK_EDGE_COLOUR } from '../constants';
import { LightingMode } from '../types';
import {
  EXPERIENCE_TYPE_LABEL,
  WORK_MODE_LABEL,
  formatDuration,
  formatMonthRange,
  getExperienceStatus,
} from '../experience';
import { ExperienceLogo } from './ExperienceLogo';
import { ExperienceStatusTag } from './ExperienceStatusTag';
import { TextWindow, TEXT_WINDOW_FONT } from './TextWindow';

const FADE_MS = 250;
const CARD_WIDTH = 500;
const LOGO_SIZE = 64;
// wordmark logos get a little more room than square ones
const LOGO_MAX_WIDTH = 160;
const VISIT_LABEL = 'Visit';

// middle dot between the parts of the meta and date lines
const SEPARATOR = ' \u00b7 ';

const CHIP_BG_COLOUR = {
  [LightingMode.Light]: '#e8e8e8',
  [LightingMode.Dark]: 'rgba(255,255,255,0.06)',
};

export function ExperienceOverlay() {
  const mode = useLightingMode();
  const { activeExperience, hideExperience } = useExperienceOverlay();

  // track mounted vs visible separately for the fade animation
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const textColour = INK_EDGE_COLOUR[mode];
  const bgColour = BACKGROUND_COLOUR[mode];

  // fade in when an entry becomes active
  useEffect(() => {
    if (activeExperience) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      timeoutRef.current = setTimeout(() => setMounted(false), FADE_MS);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [activeExperience]);

  // close on Escape
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') hideExperience();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, hideExperience]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) hideExperience();
    },
    [hideExperience],
  );

  // status and duration depend on today's date, so they're worked out per opening
  const details = useMemo(() => {
    if (!activeExperience) return null;
    const now = new Date();
    const entry = activeExperience;
    return {
      status: getExperienceStatus(entry, now),
      meta: [
        entry.type && EXPERIENCE_TYPE_LABEL[entry.type],
        entry.workMode && WORK_MODE_LABEL[entry.workMode],
        entry.location,
      ].filter(Boolean).join(SEPARATOR),
      dates: [entry.dateLabel, formatMonthRange(entry), formatDuration(entry, now)]
        .filter(Boolean)
        .join(SEPARATOR),
      hostname: entry.href ? new URL(entry.href).hostname.replace(/^www\./, '') : undefined,
    };
  }, [activeExperience]);

  if (!mounted || !activeExperience || !details) return null;
  const entry = activeExperience;

  return (
    <div
      onClick={handleBackdropClick}
      data-block-game-touch
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        fontFamily: TEXT_WINDOW_FONT,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: CARD_WIDTH,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100dvh - 48px)',
          overflowY: 'auto',
          cursor: 'default',
          // solid fill under the window so the busy pinboard doesn't show through
          backgroundColor: bgColour,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: `transform ${FADE_MS}ms ease`,
        }}
      >
        <TextWindow width="100%" padding={28}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, color: textColour }}>
            <button
              onClick={hideExperience}
              style={{
                position: 'absolute',
                top: -14,
                right: -14,
                background: 'none',
                border: 'none',
                color: textColour,
                fontSize: 28,
                cursor: 'pointer',
                lineHeight: 1,
                padding: 4,
                fontFamily: TEXT_WINDOW_FONT,
              }}
              aria-label="Close"
            >
              x
            </button>

            {/* Logo, company and role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 24 }}>
              <ExperienceLogo entry={entry} size={LOGO_SIZE} maxWidth={LOGO_MAX_WIDTH} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <h2 style={{ margin: 0, fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{entry.company}</h2>
                <div style={{ fontSize: 20, opacity: 0.8, lineHeight: 1.2 }}>
                  {entry.team ? `${entry.role}${SEPARATOR}${entry.team}` : entry.role}
                </div>
              </div>
            </div>

            {details.meta && <div style={{ fontSize: 16, opacity: 0.6 }}>{details.meta}</div>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 17 }}>
              <span>{details.dates}</span>
              <ExperienceStatusTag status={details.status} fontSize={13} />
            </div>

            <p style={{ margin: 0, fontSize: 20, lineHeight: 1.35, opacity: 0.85 }}>{entry.description}</p>

            {entry.highlights.length > 0 && (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  // tailwind's preflight strips list markers, so put them back
                  listStyle: 'disc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 18,
                  lineHeight: 1.3,
                  opacity: 0.85,
                }}
              >
                {entry.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            )}

            {entry.techStack.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {entry.techStack.map((item) => (
                  <span
                    key={item.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 14,
                      opacity: 0.7,
                      background: CHIP_BG_COLOUR[mode],
                      border: `1px solid ${textColour}`,
                      borderRadius: 10,
                      padding: '2px 8px',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: 14, height: 14, display: 'block', flexShrink: 0 }}
                    />
                    {item.name}
                  </span>
                ))}
              </div>
            )}

            {entry.href && (
              <a
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  alignSelf: 'flex-start',
                  marginTop: 4,
                  padding: '8px 20px',
                  fontSize: 20,
                  fontWeight: 600,
                  color: bgColour,
                  backgroundColor: textColour,
                  textDecoration: 'none',
                  borderRadius: 2,
                  fontFamily: TEXT_WINDOW_FONT,
                }}
              >
                {VISIT_LABEL} {details.hostname}
              </a>
            )}
          </div>
        </TextWindow>
      </div>
    </div>
  );
}
