'use client';

import { useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { WallFrame } from './WallFrame';
import { ExperienceLogo } from '../components/ExperienceLogo';
import { ExperienceStatusTag } from '../components/ExperienceStatusTag';
import { OffersNote } from '../components/OffersNote';
import { TextWindow, TEXT_WINDOW_FONT } from '../components/TextWindow';
import { useExperienceOverlay } from '../contexts/ExperienceOverlayContext';
import { useEntityReveal, useLightingMode } from '../hooks';
import { CORK_BOARD_COLOUR, INK_EDGE_COLOUR } from '../constants';
import { ExperienceItemKind } from '../types';
import { OFFERS_ITEM_ID, formatMonthRange, getExperienceStatus, monthIndex } from '../experience';
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
// row centres: the timeline runs along the bottom row and back along the top
const TOP_ROW_Y_PX = 128;
const BOTTOM_ROW_Y_PX = 352;

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
// wordmark logos can use nearly the full width of the photo strip
const CARD_LOGO_MAX_WIDTH_PX = 168;
const CARD_PHOTO_HEIGHT_PX = 64;
// hex alpha appended to the accent colour for the strip behind the logo
const ACCENT_TINT_ALPHA = '33';

// wide enough for a logo, name, tick and "accepted" on one line
const NOTE_WIDTH_PX = 186;
const NOTE_HEIGHT_PX = 150;

// hand-pinned look: every item gets a stable tilt and vertical nudge from its id
const MAX_TILT_DEG = 3.5;
const MAX_NUDGE_Y_PX = 8;

// pins sit this far below an item's top edge
const PIN_INSET_PX = 9;
const PIN_RADIUS_PX = 7;
const PIN_COLOUR = '#d63031';
const PIN_SHINE_COLOUR = '#ffffff';
// red thread through every role in the order they started, green between related items
const TIMELINE_STRING_COLOUR = '#c0392b';
const RELATED_STRING_COLOUR = '#27ae60';
// how far a string droops between two pins, plus a little more for longer runs
const STRING_SAG_PX = 18;
const STRING_SAG_PER_PX = 0.08;
// related strings droop further so they stay visible where they share pins with the timeline
const RELATED_EXTRA_SAG_PX = 16;

// instant like the project buttons' hover tilt, so the pins and strings move with the card
const HOVER_LIFT_PX = 4;

// pairs of related item ids joined with green string
const RELATED_STRINGS: [string, string][] = [
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
  // centre of the item on the board, CSS pixels
  x: number;
  y: number;
  tiltDeg: number;
  // pin holding the item up, after the tilt is applied
  pin: BoardPoint;
  // how far the pin moves while the card is hovered, the lift rotated by the tilt
  lift: BoardPoint;
}

interface BoardString {
  key: string;
  colour: string;
  extraSag: number;
  from: PlacedItem;
  to: PlacedItem;
}

// lays the roles out as a U so the red timeline string never zigzags: oldest along the
// bottom row left to right, up at the right edge, then newer ones along the top row right
// to left. the offers note gets its own column on the left, next to the newest role
function layoutBoard(experience: ExperienceData[], hasOffers: boolean): PlacedItem[] {
  // sort is stable, so roles starting in the same month keep their data order
  const roles = [...experience].sort((a, b) => monthIndex(a.start) - monthIndex(b.start));
  const roleColumns = Math.ceil(roles.length / 2);
  const bottomCount = Math.floor(roles.length / 2);
  const noteColumns = hasOffers ? 1 : 0;
  const step = (BOARD_WIDTH_PX - 2 * BOARD_PADDING_X_PX - CARD_WIDTH_PX) / Math.max(noteColumns + roleColumns - 1, 1);
  const columnX = (column: number) => BOARD_PADDING_X_PX + CARD_WIDTH_PX / 2 + column * step;

  const place = (item: ExperienceItem, x: number, rowY: number): PlacedItem => {
    // phaseFromId is in [0, 2PI), dividing by PI and subtracting 1 maps it to [-1, 1)
    const tiltDeg = (phaseFromId(item.id) / Math.PI - 1) * MAX_TILT_DEG;
    const y = rowY + (phaseFromId(`${item.id}:y`) / Math.PI - 1) * MAX_NUDGE_Y_PX;
    const height = item.kind === ExperienceItemKind.Role ? CARD_HEIGHT_PX : NOTE_HEIGHT_PX;

    // rotate the pin's offset from the item centre by the item's tilt
    const tilt = (tiltDeg * Math.PI) / 180;
    const pinOffset = height / 2 - PIN_INSET_PX;
    return {
      item,
      x,
      y,
      tiltDeg,
      pin: { x: x + pinOffset * Math.sin(tilt), y: y - pinOffset * Math.cos(tilt) },
      lift: { x: HOVER_LIFT_PX * Math.sin(tilt), y: -HOVER_LIFT_PX * Math.cos(tilt) },
    };
  };

  const placed = roles.map((entry, i) => {
    const item: ExperienceItem = { kind: ExperienceItemKind.Role, id: entry.id, entry };
    // the bottom row is right aligned so its newest role sits under the top row's oldest
    return i < bottomCount
      ? place(item, columnX(noteColumns + roleColumns - bottomCount + i), BOTTOM_ROW_Y_PX)
      : place(item, columnX(noteColumns + roleColumns - 1 - (i - bottomCount)), TOP_ROW_Y_PX);
  });
  if (hasOffers) {
    const note: ExperienceItem = { kind: ExperienceItemKind.Offers, id: OFFERS_ITEM_ID };
    placed.push(place(note, columnX(0), (TOP_ROW_Y_PX + BOTTOM_ROW_Y_PX) / 2));
  }
  return placed;
}

interface PinboardCardProps {
  entry: ExperienceData;
  now: Date;
  lifted: boolean;
  onHoverChange: (hovered: boolean) => void;
  onOpen: (entry: ExperienceData) => void;
}

function PinboardCard({ entry, now, lifted, onHoverChange, onOpen }: PinboardCardProps) {
  const mode = useLightingMode();

  return (
    <div
      onClick={() => onOpen(entry)}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        transform: lifted ? `translateY(-${HOVER_LIFT_PX}px)` : undefined,
      }}
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
            <ExperienceLogo entry={entry} size={CARD_LOGO_SIZE_PX} maxWidth={CARD_LOGO_MAX_WIDTH_PX} />
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // every string runs between the pins holding its two items up
  const strings = useMemo(() => {
    // sort is stable, so roles starting in the same month keep their display order
    const timeline = placed
      .flatMap((p) => (p.item.kind === ExperienceItemKind.Role ? [{ p, start: monthIndex(p.item.entry.start) }] : []))
      .sort((a, b) => a.start - b.start)
      .map(({ p }) => p);

    const byId = new Map(placed.map((p) => [p.item.id, p]));
    return [
      ...timeline.slice(1).map((to, i): BoardString => ({
        key: `timeline:${timeline[i].item.id}:${to.item.id}`,
        colour: TIMELINE_STRING_COLOUR,
        extraSag: 0,
        from: timeline[i],
        to,
      })),
      ...RELATED_STRINGS.flatMap(([fromId, toId]): BoardString[] => {
        const from = byId.get(fromId);
        const to = byId.get(toId);
        return from && to
          ? [{ key: `related:${fromId}:${toId}`, colour: RELATED_STRING_COLOUR, extraSag: RELATED_EXTRA_SAG_PX, from, to }]
          : [];
      }),
    ];
  }, [placed]);

  // pins, and the strings tied to them, ride along with a hovered card
  const pinPoint = (p: PlacedItem): BoardPoint =>
    p.item.id === hoveredId ? { x: p.pin.x + p.lift.x, y: p.pin.y + p.lift.y } : p.pin;

  const pinColour = INK_EDGE_COLOUR[mode];

  return (
    <div style={{ position: 'relative', width: BOARD_WIDTH_PX, height: BOARD_HEIGHT_PX, fontFamily: TEXT_WINDOW_FONT }}>
      {placed.map(({ item, x, y, tiltDeg }) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            transform: `translate(-50%, -50%) rotate(${tiltDeg}deg)`,
          }}
        >
          {item.kind === ExperienceItemKind.Role ? (
            <PinboardCard
              entry={item.entry}
              now={now}
              lifted={hoveredId === item.id}
              onHoverChange={(hovered) =>
                setHoveredId((current) => (hovered ? item.id : current === item.id ? null : current))
              }
              onOpen={onOpen}
            />
          ) : (
            <OffersNote offers={offers} width={NOTE_WIDTH_PX} height={NOTE_HEIGHT_PX} />
          )}
        </div>
      ))}

      <svg
        width={BOARD_WIDTH_PX}
        height={BOARD_HEIGHT_PX}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
        aria-hidden
      >
        {strings.map((s) => {
          const start = pinPoint(s.from);
          const end = pinPoint(s.to);
          const sag = STRING_SAG_PX + s.extraSag + Math.hypot(end.x - start.x, end.y - start.y) * STRING_SAG_PER_PX;
          const controlX = (start.x + end.x) / 2;
          const controlY = (start.y + end.y) / 2 + sag;
          return (
            <path
              key={s.key}
              d={`M${start.x} ${start.y} Q${controlX} ${controlY} ${end.x} ${end.y}`}
              fill="none"
              stroke={s.colour}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
        {placed.map((p) => {
          const pin = pinPoint(p);
          return (
            <g key={p.item.id}>
              <circle cx={pin.x} cy={pin.y} r={PIN_RADIUS_PX} fill={PIN_COLOUR} stroke={pinColour} strokeWidth={1.5} />
              <circle cx={pin.x - 2} cy={pin.y - 2} r={2.2} fill={PIN_SHINE_COLOUR} opacity={0.7} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// desktop experience layout: one cork board with every role and the offers note pinned to it
export function ExperiencePinboard(props: ThreeElements['group']) {
  const { experience, internshipOffers, showExperience } = useExperienceOverlay();
  const placed = useMemo(
    () => layoutBoard(experience, internshipOffers.length > 0),
    [experience, internshipOffers],
  );
  // NOW / INCOMING tags are worked out against the date the page was opened
  const now = useMemo(() => new Date(), []);

  // the frame's outline draws in first, then the board content fades in with the colour,
  // the same way the frame's backing does
  const boardRef = useRef<Group>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { drawProgress, colourProgress, connectMaterial } = useEntityReveal(boardRef, { perfLabel: 'ExperiencePinboard' });
  const reveal = useMemo(
    () => ({ drawProgress, colourProgress, connectMaterial }),
    [drawProgress, colourProgress, connectMaterial],
  );

  useFrame(() => {
    if (contentRef.current) contentRef.current.style.opacity = String(colourProgress.value);
  });

  return (
    <group {...props}>
      <group ref={boardRef} position={[0, BOARD_Y, BOARD_Z]}>
        <WallFrame
          contentWidth={BOARD_WIDTH_PX * PX_TO_WORLD}
          contentHeight={BOARD_HEIGHT_PX * PX_TO_WORLD}
          frameBorder={FRAME_BORDER}
          backingColour={CORK_BOARD_COLOUR}
          seed={FRAME_SEED}
          reveal={reveal}
        >
          <Html transform distanceFactor={DISTANCE_FACTOR} zIndexRange={[0, 0]}>
            <div ref={contentRef} style={{ opacity: 0 }}>
              <PinboardContent placed={placed} offers={internshipOffers} now={now} onOpen={showExperience} />
            </div>
          </Html>
        </WallFrame>
      </group>
    </group>
  );
}
