'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { WallFrame } from './WallFrame';
import { ExperienceLogo } from '../components/ExperienceLogo';
import { ExperienceStatusTag } from '../components/ExperienceStatusTag';
import { OffersNote } from '../components/OffersNote';
import { TextWindow, TEXT_WINDOW_FONT } from '../components/TextWindow';
import { useExperienceOverlay } from '../contexts/ExperienceOverlayContext';
import { useLightingMode } from '../hooks';
import { CORK_BOARD_COLOUR, INK_EDGE_COLOUR } from '../constants';
import { ExperienceItemKind } from '../types';
import { OFFERS_ITEM_ID, buildExperienceItems, formatMonthRange, getExperienceStatus } from '../experience';
import type { ExperienceItem } from '../experience';
import { phaseFromId } from '../utils';
import type { ExperienceData, InternshipOffer } from '@/data/portfolio';

// drei Html transform maps CSS pixels to world units at distanceFactor / 400
const DISTANCE_FACTOR = 8;
const PX_TO_WORLD = DISTANCE_FACTOR / 400;

// board content in CSS pixels (27 x 9.6 world units)
const BOARD_WIDTH_PX = 1350;
const BOARD_HEIGHT_PX = 480;
const BOARD_PADDING_X_PX = 28;
// vertical centres of the top and bottom rows of pinned items
const ROW_CENTRES_PX = [128, 352];

const FRAME_BORDER = 0.3;
const FRAME_SEED = 61;

// the entity's origin sits on the walking path like the other sections,
// the board itself hangs on the back wall
const BOARD_Y = 6.9;
const BOARD_Z = -11.9;

const CARD_WIDTH_PX = 196;
const CARD_HEIGHT_PX = 188;
const CARD_PADDING_PX = 10;
const CARD_LOGO_SIZE_PX = 48;
const CARD_PHOTO_HEIGHT_PX = 64;
// hex alpha appended to the accent colour for the strip behind the logo
const ACCENT_TINT_ALPHA = '33';

const NOTE_WIDTH_PX = 176;
const NOTE_HEIGHT_PX = 150;

// hand-pinned look: every item gets a stable tilt and vertical nudge from its id
const MAX_TILT_DEG = 3.5;
const MAX_NUDGE_Y_PX = 8;

// pins sit this far below an item's top edge
const PIN_INSET_PX = 9;
const PIN_RADIUS_PX = 7;
const PIN_COLOUR = '#d63031';
const PIN_SHINE_COLOUR = '#ffffff';
const STRING_COLOUR = '#c0392b';
// how far a string droops between two pins, plus a little more for longer runs
const STRING_SAG_PX = 18;
const STRING_SAG_PER_PX = 0.08;

// items pop onto the board one after another once the frame has drawn in
const POP_MS = 320;
const POP_STAGGER_MS = 70;
const POP_START_SCALE = 1.15;
const HOVER_LIFT_PX = 4;

// pairs of item ids joined with red string
const BOARD_STRINGS: [string, string][] = [
  ['google', OFFERS_ITEM_ID],
  ['coles', 'google'],
  ['mac', 'maps'],
  ['valotracker', 'leagues-gg'],
];

interface BoardPoint {
  x: number;
  y: number;
}

interface PlacedItem {
  item: ExperienceItem;
  // index into ROW_CENTRES_PX
  row: number;
  // centre of the item on the board, CSS pixels
  x: number;
  y: number;
  tiltDeg: number;
  // pin holding the item up, and the spot near its bottom edge where a string
  // to the row below is tied, both after the tilt is applied
  topPin: BoardPoint;
  bottomPin: BoardPoint;
}

// lays items out left to right, alternating between the top and bottom rows
function layoutBoard(items: ExperienceItem[]): PlacedItem[] {
  const step = (BOARD_WIDTH_PX - 2 * BOARD_PADDING_X_PX - CARD_WIDTH_PX) / Math.max(items.length - 1, 1);

  return items.map((item, i) => {
    // phaseFromId is in [0, 2PI), dividing by PI and subtracting 1 maps it to [-1, 1)
    const tiltDeg = (phaseFromId(item.id) / Math.PI - 1) * MAX_TILT_DEG;
    const nudge = (phaseFromId(`${item.id}:y`) / Math.PI - 1) * MAX_NUDGE_Y_PX;
    const height = item.kind === ExperienceItemKind.Role ? CARD_HEIGHT_PX : NOTE_HEIGHT_PX;
    const row = i % ROW_CENTRES_PX.length;
    const x = BOARD_PADDING_X_PX + CARD_WIDTH_PX / 2 + i * step;
    const y = ROW_CENTRES_PX[row] + nudge;

    // rotate a vertical offset from the item centre by the item's tilt
    const tilt = (tiltDeg * Math.PI) / 180;
    const pinOffset = height / 2 - PIN_INSET_PX;
    return {
      item,
      row,
      x,
      y,
      tiltDeg,
      topPin: { x: x + pinOffset * Math.sin(tilt), y: y - pinOffset * Math.cos(tilt) },
      bottomPin: { x: x - pinOffset * Math.sin(tilt), y: y + pinOffset * Math.cos(tilt) },
    };
  });
}

interface PinboardCardProps {
  entry: ExperienceData;
  now: Date;
  onOpen: (entry: ExperienceData) => void;
}

function PinboardCard({ entry, now, onOpen }: PinboardCardProps) {
  const mode = useLightingMode();

  return (
    <div
      onClick={() => onOpen(entry)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = `translateY(-${HOVER_LIFT_PX}px)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
      }}
      style={{ position: 'relative', cursor: 'pointer', transition: 'transform 150ms ease' }}
    >
      <TextWindow
        width={CARD_WIDTH_PX}
        padding={CARD_PADDING_PX}
        style={{ height: CARD_HEIGHT_PX, boxSizing: 'border-box' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            textAlign: 'center',
            color: INK_EDGE_COLOUR[mode],
          }}
        >
          <div
            style={{
              alignSelf: 'stretch',
              height: CARD_PHOTO_HEIGHT_PX,
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${entry.accentColour}${ACCENT_TINT_ALPHA}`,
            }}
          >
            <ExperienceLogo entry={entry} size={CARD_LOGO_SIZE_PX} />
          </div>
          <div
            style={{
              maxWidth: '100%',
              marginTop: 4,
              fontSize: 21,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {entry.shortName ?? entry.company}
          </div>
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.3,
              opacity: 0.85,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {entry.shortRole ?? entry.role}
          </div>
          <div style={{ fontSize: 13, opacity: 0.6, whiteSpace: 'nowrap' }}>
            {entry.dateLabel ?? formatMonthRange(entry)}
          </div>
        </div>
      </TextWindow>
      <ExperienceStatusTag
        status={getExperienceStatus(entry, now)}
        style={{ position: 'absolute', top: -8, right: -10 }}
      />
    </div>
  );
}

interface PinboardContentProps {
  placed: PlacedItem[];
  offers: InternshipOffer[];
  now: Date;
  onOpen: (entry: ExperienceData) => void;
}

// the cork board's DOM layer: cards and the offers note, with strings and pins on top
function PinboardContent({ placed, offers, now, onOpen }: PinboardContentProps) {
  const mode = useLightingMode();
  const [shown, setShown] = useState(false);

  // flip on the frame after mount so the pop-in transitions actually run
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // strings within a row run pin to pin. strings to the other row leave from a pin
  // near the bottom of the upper item, so they cross cork instead of card faces
  const strings = useMemo(() => {
    const byId = new Map(placed.map((p) => [p.item.id, p]));
    return BOARD_STRINGS.flatMap(([fromId, toId]) => {
      const a = byId.get(fromId);
      const b = byId.get(toId);
      if (!a || !b) return [];

      const [upper, lower] = a.row <= b.row ? [a, b] : [b, a];
      const crossesRows = upper.row !== lower.row;
      const start = crossesRows ? upper.bottomPin : upper.topPin;
      const end = lower.topPin;
      const sag = STRING_SAG_PX + Math.hypot(end.x - start.x, end.y - start.y) * STRING_SAG_PER_PX;
      const controlX = (start.x + end.x) / 2;
      const controlY = (start.y + end.y) / 2 + sag;
      return [{
        key: `${fromId}:${toId}`,
        d: `M${start.x} ${start.y} Q${controlX} ${controlY} ${end.x} ${end.y}`,
        tiePin: crossesRows ? start : undefined,
      }];
    });
  }, [placed]);

  const pinColour = INK_EDGE_COLOUR[mode];

  return (
    <div style={{ position: 'relative', width: BOARD_WIDTH_PX, height: BOARD_HEIGHT_PX, fontFamily: TEXT_WINDOW_FONT }}>
      {placed.map(({ item, x, y, tiltDeg }, i) => {
        const delay = i * POP_STAGGER_MS;
        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              opacity: shown ? 1 : 0,
              transform: `translate(-50%, -50%) rotate(${tiltDeg}deg) scale(${shown ? 1 : POP_START_SCALE})`,
              transition: `opacity ${POP_MS}ms ease ${delay}ms, transform ${POP_MS}ms ease ${delay}ms`,
            }}
          >
            {item.kind === ExperienceItemKind.Role ? (
              <PinboardCard entry={item.entry} now={now} onOpen={onOpen} />
            ) : (
              <OffersNote offers={offers} width={NOTE_WIDTH_PX} height={NOTE_HEIGHT_PX} />
            )}
          </div>
        );
      })}

      <svg
        width={BOARD_WIDTH_PX}
        height={BOARD_HEIGHT_PX}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
        aria-hidden
      >
        {/* strings go up once everything is pinned */}
        <g
          style={{
            opacity: shown ? 1 : 0,
            transition: `opacity ${POP_MS}ms ease ${placed.length * POP_STAGGER_MS}ms`,
          }}
        >
          {strings.map((s) => (
            <g key={s.key}>
              <path d={s.d} fill="none" stroke={STRING_COLOUR} strokeWidth={2} strokeLinecap="round" />
              {s.tiePin && (
                <circle cx={s.tiePin.x} cy={s.tiePin.y} r={PIN_RADIUS_PX} fill={PIN_COLOUR} stroke={pinColour} strokeWidth={1.5} />
              )}
            </g>
          ))}
        </g>
        {placed.map(({ item, topPin }, i) => (
          <g
            key={item.id}
            style={{ opacity: shown ? 1 : 0, transition: `opacity ${POP_MS}ms ease ${i * POP_STAGGER_MS}ms` }}
          >
            <circle cx={topPin.x} cy={topPin.y} r={PIN_RADIUS_PX} fill={PIN_COLOUR} stroke={pinColour} strokeWidth={1.5} />
            <circle cx={topPin.x - 2} cy={topPin.y - 2} r={2.2} fill={PIN_SHINE_COLOUR} opacity={0.7} />
          </g>
        ))}
      </svg>
    </div>
  );
}

// desktop experience layout: one cork board with every role and the offers note pinned to it
export function ExperiencePinboard(props: ThreeElements['group']) {
  const { experience, internshipOffers, showExperience } = useExperienceOverlay();
  const placed = useMemo(
    () => layoutBoard(buildExperienceItems(experience, internshipOffers)),
    [experience, internshipOffers],
  );
  // NOW / INCOMING tags are worked out against the date the page was opened
  const now = useMemo(() => new Date(), []);

  return (
    <group {...props}>
      <WallFrame
        position={[0, BOARD_Y, BOARD_Z]}
        contentWidth={BOARD_WIDTH_PX * PX_TO_WORLD}
        contentHeight={BOARD_HEIGHT_PX * PX_TO_WORLD}
        frameBorder={FRAME_BORDER}
        backingColour={CORK_BOARD_COLOUR}
        seed={FRAME_SEED}
      >
        <Html transform distanceFactor={DISTANCE_FACTOR} zIndexRange={[0, 0]}>
          <PinboardContent placed={placed} offers={internshipOffers} now={now} onOpen={showExperience} />
        </Html>
      </WallFrame>
    </group>
  );
}
