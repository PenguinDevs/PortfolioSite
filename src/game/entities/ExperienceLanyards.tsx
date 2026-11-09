'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Box3, MathUtils, Vector3 } from 'three';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { ProximityPrompt } from '../components';
import { ExperienceLogo } from '../components/ExperienceLogo';
import { ExperienceStatusTag } from '../components/ExperienceStatusTag';
import { OffersNote } from '../components/OffersNote';
import { TextWindow, TEXT_WINDOW_FONT } from '../components/TextWindow';
import { useExperienceOverlay } from '../contexts/ExperienceOverlayContext';
import { usePlayerRef } from '../contexts';
import { useEntityReveal, useLightingMode, useThemedToonMaterial } from '../hooks';
import { createToonMaterial } from '../shaders/toonShader';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { INK_EDGE_COLOUR, WALL_FRAME_COLOUR, WALL_FRAME_SHADOW } from '../constants';
import { ExperienceItemKind, LightingMode } from '../types';
import { buildExperienceItems, formatMonthRange, getExperienceStatus } from '../experience';
import { Spring } from '../math';
import { phaseFromId } from '../utils';
import type { ExperienceData, InternshipOffer } from '@/data/portfolio';

// drei Html transform maps CSS pixels to world units at distanceFactor / 400
const DISTANCE_FACTOR = 8;
const PX_TO_WORLD = DISTANCE_FACTOR / 400;

// distance between hanging items along the rail (world units)
const ITEM_SPACING = 4;

// rail on the back wall, high enough that the badges hang clear of the penguin
const RAIL_Y = 10.6;
const RAIL_Z = -11.6;
const RAIL_THICKNESS = 0.18;
// block joining the rail to the wall behind each item
const MOUNT_SIZE: [number, number, number] = [0.22, 0.3, 0.3];
const MOUNT_Z = -0.15;
// small hook under the rail that each lanyard loops over
const HOOK_SIZE: [number, number, number] = [0.1, 0.28, 0.1];
// content sits just in front of the rail
const CONTENT_Z = 0.05;

const BADGE_WIDTH_PX = 176;
const STRAP_HEIGHT_PX = 64;
const STRAP_SPREAD_PX = 24;
const STRAP_WIDTH_PX = 8;
const BADGE_CARD_HEIGHT_PX = 246;
const BADGE_HEIGHT_PX = STRAP_HEIGHT_PX + BADGE_CARD_HEIGHT_PX;
const BADGE_PADDING_PX = 12;
const BADGE_LOGO_SIZE_PX = 64;
// wordmark logos can use nearly the full width of the badge
const BADGE_LOGO_MAX_WIDTH_PX = 148;
const CLIP_COLOUR = '#9aa0a6';

// roomy enough for the title on one line and six offers. no wider, the items along the
// rail are only 200px apart
const NOTE_WIDTH_PX = 192;
const NOTE_HEIGHT_PX = 192;
const NOTE_FONT_SCALE = 1;
const NOTE_TILT_DEG = 3;
// wooden peg clipped over the rail, overlapping the top of the note
const PEG_WIDTH_PX = 16;
const PEG_HEIGHT_PX = 46;
const PEG_ABOVE_RAIL_PX = 14;
const PEG_OVERLAP_PX = 14;
const PEG_COLOUR = '#c8935a';
const PEG_SPRING_COLOUR = '#9aa0a6';
const NOTE_TOP_PX = PEG_HEIGHT_PX - PEG_ABOVE_RAIL_PX - PEG_OVERLAP_PX;
const PEGGED_NOTE_HEIGHT_PX = NOTE_TOP_PX + NOTE_HEIGHT_PX;

// swing: walking past an item gives it a push that dies off on an underdamped spring.
// the swing amplitude is roughly the push divided by SWING_SPEED
const SWING_SPEED = 3.2;
const SWING_DAMPER = 0.12;
// how close (in x) the penguin has to pass to push an item
const SWING_TRIGGER_DISTANCE = 0.8;
// angular velocity (rad/s) added per unit of penguin speed
const SWING_IMPULSE_PER_SPEED = 0.05;
// caps the push from nav autopilot dashes
const SWING_MAX_PLAYER_SPEED = 20;
const SWING_MAX_ANGLE = 0.35;

const PROMPT_ACTION = 'View';
// over half the spacing so a prompt is in range almost everywhere along the rail,
// including the nav stop between the first badge and the pegged note
const PROMPT_MAX_DISTANCE = 2.6;
// shows on the wall under the badge it belongs to, clear of the badge's bottom edge
const PROMPT_OFFSET: [number, number, number] = [0, 1.8, RAIL_Z + 0.4];

// items slide into view quickly as you swipe along the rail, so they draw in much faster than the
// default reveal: a short outline, with the colour and the badge fading in before it finishes
const ITEM_REVEAL_EDGE_SECONDS = 0.45;
const ITEM_REVEAL_COLOUR_DELAY = -0.2;
const ITEM_REVEAL_COLOUR_SECONDS = 0.3;

interface HangingItemProps {
  // position along the rail relative to the first item
  x: number;
  // height of the DOM content, so its top edge sits on the pivot
  heightPx: number;
  // badges hang from a hook, the pegged note clips straight onto the rail
  showHook: boolean;
  seed: number;
  children: ReactNode;
  onInteract?: () => void;
  promptText?: string;
}

// one section of rail with something hanging from it that swings as the penguin walks past
function HangingItem({ x, heightPx, showHook, seed, children, onInteract, promptText }: HangingItemProps) {
  const railRef = useRef<Group>(null);
  const pivotRef = useRef<Group>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const playerRef = usePlayerRef();

  const pivotY = RAIL_Y - RAIL_THICKNESS / 2 - (showHook ? HOOK_SIZE[1] : 0);

  // the reveal is keyed to the rail, but the whole item counts towards it being in view, so it
  // starts drawing as soon as any of it peeks onto the screen rather than once its middle does
  const revealBounds = useMemo(
    () => new Box3(
      new Vector3(-ITEM_SPACING / 2, pivotY - RAIL_Y - heightPx * PX_TO_WORLD, MOUNT_Z - MOUNT_SIZE[2] / 2),
      new Vector3(ITEM_SPACING / 2, RAIL_THICKNESS / 2, CONTENT_Z),
    ),
    [pivotY, heightPx],
  );
  const { drawProgress, colourProgress, connectMaterial } = useEntityReveal(railRef, {
    perfLabel: 'HangingItem',
    edgeDuration: ITEM_REVEAL_EDGE_SECONDS,
    colourDelay: ITEM_REVEAL_COLOUR_DELAY,
    colourDuration: ITEM_REVEAL_COLOUR_SECONDS,
    bounds: revealBounds,
  });

  const material = useMemo(
    () => createToonMaterial({
      color: WALL_FRAME_COLOUR[LightingMode.Light],
      shadowColor: WALL_FRAME_SHADOW[LightingMode.Light],
    }),
    [],
  );
  useThemedToonMaterial(material, WALL_FRAME_COLOUR, WALL_FRAME_SHADOW);

  useEffect(() => {
    connectMaterial(material);
  }, [material, connectMaterial]);

  const spring = useMemo(() => {
    const s = Spring.scalar(0);
    s.speed = SWING_SPEED;
    s.damper = SWING_DAMPER;
    return s;
  }, []);
  const lastPlayerX = useRef<number | null>(null);
  const wasNear = useRef(false);
  const pivotWorld = useMemo(() => new Vector3(), []);

  // drei's <Html> ignores the parent's visibility, so like WallFrame content the badge
  // mounts once the rail's outline has drawn and fades in with the colour
  const [contentMounted, setContentMounted] = useState(false);

  useFrame((_, delta) => {
    if (!contentMounted && colourProgress.value > 0.01) setContentMounted(true);
    if (contentRef.current) contentRef.current.style.opacity = String(colourProgress.value);

    const player = playerRef.current;
    const pivot = pivotRef.current;
    if (!player || !pivot) return;

    const playerX = player.position.x;
    const velocity = lastPlayerX.current === null || delta === 0 ? 0 : (playerX - lastPlayerX.current) / delta;
    lastPlayerX.current = playerX;

    // push once as the penguin passes underneath, in the direction it's walking
    pivot.getWorldPosition(pivotWorld);
    const near = Math.abs(playerX - pivotWorld.x) < SWING_TRIGGER_DISTANCE;
    if (near && !wasNear.current) {
      const speed = MathUtils.clamp(velocity, -SWING_MAX_PLAYER_SPEED, SWING_MAX_PLAYER_SPEED);
      spring.impulse([speed * SWING_IMPULSE_PER_SPEED]);
    }
    wasNear.current = near;

    pivot.rotation.z = MathUtils.clamp(spring.value, -SWING_MAX_ANGLE, SWING_MAX_ANGLE);
  });

  return (
    <group position={[x, 0, 0]}>
      <group ref={railRef} position={[0, RAIL_Y, RAIL_Z]}>
        <mesh material={material}>
          <boxGeometry args={[ITEM_SPACING, RAIL_THICKNESS, RAIL_THICKNESS]} />
        </mesh>
        <mesh material={material} position={[0, 0, MOUNT_Z]}>
          <boxGeometry args={MOUNT_SIZE} />
        </mesh>
        {showHook && (
          <mesh material={material} position={[0, -(RAIL_THICKNESS + HOOK_SIZE[1]) / 2, 0]}>
            <boxGeometry args={HOOK_SIZE} />
          </mesh>
        )}
        <InkEdgesGroup
          target={railRef}
          colour={INK_EDGE_COLOUR[LightingMode.Light]}
          darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
          seed={seed}
          width={3}
          gapFreq={10}
          gapThreshold={0.38}
          drawProgress={drawProgress}
        />
      </group>

      <group ref={pivotRef} position={[0, pivotY, RAIL_Z + CONTENT_Z]}>
        {contentMounted && (
          <group position={[0, -(heightPx / 2) * PX_TO_WORLD, 0]}>
            <Html transform distanceFactor={DISTANCE_FACTOR} zIndexRange={[0, 0]}>
              <div ref={contentRef} style={{ opacity: 0 }}>
                {children}
              </div>
            </Html>
          </group>
        )}
      </group>

      {onInteract && (
        <ProximityPrompt
          onInteract={onInteract}
          actionText={PROMPT_ACTION}
          objectText={promptText}
          maxDistance={PROMPT_MAX_DISTANCE}
          offset={PROMPT_OFFSET}
        />
      )}
    </group>
  );
}

interface LanyardBadgeProps {
  entry: ExperienceData;
  now: Date;
  onOpen: (entry: ExperienceData) => void;
}

// staff ID badge on a lanyard strap in the role's accent colour
function LanyardBadge({ entry, now, onOpen }: LanyardBadgeProps) {
  const mode = useLightingMode();
  const ink = INK_EDGE_COLOUR[mode];
  const centre = BADGE_WIDTH_PX / 2;

  return (
    <div
      onClick={() => onOpen(entry)}
      style={{
        position: 'relative',
        width: BADGE_WIDTH_PX,
        height: BADGE_HEIGHT_PX,
        cursor: 'pointer',
        fontFamily: TEXT_WINDOW_FONT,
      }}
    >
      <svg
        width={BADGE_WIDTH_PX}
        height={STRAP_HEIGHT_PX}
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
        aria-hidden
      >
        <path
          d={`M${centre - STRAP_SPREAD_PX} ${STRAP_HEIGHT_PX} L${centre} 0 L${centre + STRAP_SPREAD_PX} ${STRAP_HEIGHT_PX}`}
          fill="none"
          stroke={entry.accentColour}
          strokeWidth={STRAP_WIDTH_PX}
          strokeLinejoin="round"
        />
      </svg>

      <div style={{ position: 'absolute', top: STRAP_HEIGHT_PX, left: 0 }}>
        <TextWindow
          width={BADGE_WIDTH_PX}
          padding={BADGE_PADDING_PX}
          style={{ height: BADGE_CARD_HEIGHT_PX, boxSizing: 'border-box' }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              textAlign: 'center',
              color: ink,
            }}
          >
            {/* punched slot the clip goes through */}
            <div style={{ width: 36, height: 8, borderRadius: 4, border: `2px solid ${ink}`, opacity: 0.6 }} />
            <div style={{ marginTop: 10 }}>
              <ExperienceLogo entry={entry} size={BADGE_LOGO_SIZE_PX} maxWidth={BADGE_LOGO_MAX_WIDTH_PX} />
            </div>
            <div
              style={{
                maxWidth: '100%',
                marginTop: 6,
                fontSize: 22,
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
      </div>

      {/* clip joining the strap to the card */}
      <div
        style={{
          position: 'absolute',
          top: STRAP_HEIGHT_PX - 8,
          left: centre - 11,
          width: 22,
          height: 14,
          borderRadius: 3,
          background: CLIP_COLOUR,
          border: `2px solid ${ink}`,
          boxSizing: 'border-box',
        }}
      />
      {/* accent stripe along the bottom of the card */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 14,
          height: 6,
          borderRadius: 3,
          background: entry.accentColour,
        }}
      />
      <ExperienceStatusTag
        status={getExperienceStatus(entry, now)}
        style={{ position: 'absolute', top: STRAP_HEIGHT_PX - 6, right: -8 }}
      />
    </div>
  );
}

// the offers note, pegged to the rail instead of hanging off a lanyard
function PeggedOffersNote({ offers }: { offers: InternshipOffer[] }) {
  const mode = useLightingMode();
  const ink = INK_EDGE_COLOUR[mode];

  return (
    <div style={{ position: 'relative', width: NOTE_WIDTH_PX, height: PEGGED_NOTE_HEIGHT_PX }}>
      <div style={{ position: 'absolute', top: NOTE_TOP_PX, left: 0, transform: `rotate(${NOTE_TILT_DEG}deg)` }}>
        <OffersNote offers={offers} width={NOTE_WIDTH_PX} height={NOTE_HEIGHT_PX} fontScale={NOTE_FONT_SCALE} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: -PEG_ABOVE_RAIL_PX,
          left: (NOTE_WIDTH_PX - PEG_WIDTH_PX) / 2,
          width: PEG_WIDTH_PX,
          height: PEG_HEIGHT_PX,
          borderRadius: 4,
          background: PEG_COLOUR,
          border: `2px solid ${ink}`,
          boxSizing: 'border-box',
        }}
      >
        {/* split between the two halves of the peg */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 5,
            bottom: 5,
            width: 2,
            transform: 'translateX(-50%)',
            background: ink,
            opacity: 0.5,
          }}
        />
        {/* metal spring */}
        <div
          style={{
            position: 'absolute',
            left: -5,
            right: -5,
            top: 15,
            height: 7,
            borderRadius: 3,
            background: PEG_SPRING_COLOUR,
            border: `1.5px solid ${ink}`,
          }}
        />
      </div>
    </div>
  );
}

// touch device experience layout: a rail of ID badges, newest first, with the offers note pegged in
export function ExperienceLanyards(props: ThreeElements['group']) {
  const { experience, internshipOffers, showExperience } = useExperienceOverlay();
  const items = useMemo(
    () => buildExperienceItems(experience, internshipOffers),
    [experience, internshipOffers],
  );
  // NOW / INCOMING tags are worked out against the date the page was opened
  const now = useMemo(() => new Date(), []);

  return (
    <group {...props}>
      {items.map((item, i) => {
        const seed = Math.abs((phaseFromId(item.id) * 100) | 0);
        if (item.kind === ExperienceItemKind.Offers) {
          return (
            <HangingItem key={item.id} x={i * ITEM_SPACING} heightPx={PEGGED_NOTE_HEIGHT_PX} showHook={false} seed={seed}>
              <PeggedOffersNote offers={internshipOffers} />
            </HangingItem>
          );
        }

        const { entry } = item;
        return (
          <HangingItem
            key={item.id}
            x={i * ITEM_SPACING}
            heightPx={BADGE_HEIGHT_PX}
            showHook
            seed={seed}
            onInteract={() => showExperience(entry)}
            promptText={`${entry.shortName ?? entry.company}\n${entry.shortRole ?? entry.role}`}
          >
            <LanyardBadge entry={entry} now={now} onOpen={showExperience} />
          </HangingItem>
        );
      })}
    </group>
  );
}
