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
import { OFFERS_ITEM_ID, buildExperienceItems, formatMonthRange, getExperienceStatus, monthIndex } from '../experience';
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

// items pop onto the board one after another once the frame has drawn in
const POP_MS = 320;
const POP_STAGGER_MS = 70;
const POP_START_SCALE = 1.15;
// instant like the project buttons' hover tilt, so the pins and strings move with the card
const HOVER_LIFT_PX = 4;

// pairs of related item ids joined with green string
const RELATED_STRINGS: [string, string][] = [
  ['google', OFFERS_ITEM_ID],
  ['coles', 'google'],
  ['mac', 'maps'],
  ['valotracker', 'leagues-gg'],
];

enum PinSpot {
  // the pin holding an item up
  Top = 'top',
  // near the bottom edge, where strings to the row below are tied
  Bottom = 'bottom',
}

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
  // both pin spots after the tilt is applied
  topPin: BoardPoint;
  bottomPin: BoardPoint;
  // how far the pins move while the card is hovered, the lift rotated by the tilt
  lift: BoardPoint;
}

interface PinRef {
  placed: PlacedItem;
  spot: PinSpot;
}

interface BoardString {
  key: string;
  colour: string;
  extraSag: number;
  from: PinRef;
  to: PinRef;
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

    // rotate vertical offsets from the item centre by the item's tilt
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
      lift: { x: HOVER_LIFT_PX * Math.sin(tilt), y: -HOVER_LIFT_PX * Math.cos(tilt) },
    };
  });
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
  const [shown, setShown] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // flip on the frame after mount so the pop-in transitions actually run
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // strings within a row run pin to pin. strings to the other row leave from a pin
  // near the bottom of the upper item, so they cross cork instead of card faces
  const strings = useMemo(() => {
    const connect = (a: PlacedItem, b: PlacedItem, colour: string, extraSag: number): BoardString => {
      const [upper, lower] = a.row <= b.row ? [a, b] : [b, a];
      return {
        key: `${colour}:${a.item.id}:${b.item.id}`,
        colour,
        extraSag,
        from: { placed: upper, spot: upper.row === lower.row ? PinSpot.Top : PinSpot.Bottom },
        to: { placed: lower, spot: PinSpot.Top },
      };
    };

    // sort is stable, so roles starting in the same month keep their display order
    const timeline = placed
      .flatMap((p) => (p.item.kind === ExperienceItemKind.Role ? [{ p, start: monthIndex(p.item.entry.start) }] : []))
      .sort((a, b) => a.start - b.start)
      .map(({ p }) => p);

    const byId = new Map(placed.map((p) => [p.item.id, p]));
    return [
      ...timeline.slice(1).map((p, i) => connect(timeline[i], p, TIMELINE_STRING_COLOUR, 0)),
      ...RELATED_STRINGS.flatMap(([fromId, toId]) => {
        const a = byId.get(fromId);
        const b = byId.get(toId);
        return a && b ? [connect(a, b, RELATED_STRING_COLOUR, RELATED_EXTRA_SAG_PX)] : [];
      }),
    ];
  }, [placed]);

  // each item tied with a string to the row below gets a second pin near its bottom edge
  const tiedItems = useMemo(() => {
    const tied = new Map<string, PlacedItem>();
    for (const s of strings) {
      if (s.from.spot === PinSpot.Bottom) tied.set(s.from.placed.item.id, s.from.placed);
    }
    return [...tied.values()];
  }, [strings]);

  // pins, and the strings tied to them, ride along with a hovered card
  const pinPoint = ({ placed: p, spot }: PinRef): BoardPoint => {
    const pin = spot === PinSpot.Top ? p.topPin : p.bottomPin;
    return p.item.id === hoveredId ? { x: pin.x + p.lift.x, y: pin.y + p.lift.y } : pin;
  };

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
        );
      })}

      <svg
        width={BOARD_WIDTH_PX}
        height={BOARD_HEIGHT_PX}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
        aria-hidden
      >
        {/* strings and the pins they're tied to go up once everything is pinned */}
        <g
          style={{
            opacity: shown ? 1 : 0,
            transition: `opacity ${POP_MS}ms ease ${placed.length * POP_STAGGER_MS}ms`,
          }}
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
          {tiedItems.map((p) => {
            const pin = pinPoint({ placed: p, spot: PinSpot.Bottom });
            return (
              <g key={p.item.id}>
                <circle cx={pin.x} cy={pin.y} r={PIN_RADIUS_PX} fill={PIN_COLOUR} stroke={pinColour} strokeWidth={1.5} />
                <circle cx={pin.x - 2} cy={pin.y - 2} r={2.2} fill={PIN_SHINE_COLOUR} opacity={0.7} />
              </g>
            );
          })}
        </g>
        {placed.map((p, i) => {
          const pin = pinPoint({ placed: p, spot: PinSpot.Top });
          return (
            <g
              key={p.item.id}
              style={{ opacity: shown ? 1 : 0, transition: `opacity ${POP_MS}ms ease ${i * POP_STAGGER_MS}ms` }}
            >
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
