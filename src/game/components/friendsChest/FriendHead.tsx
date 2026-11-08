'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { FriendData } from '@/data/portfolio';
import {
  AVATAR_TEXELS,
  getLoadedAvatar,
  loadAvatar,
  paintAvatar,
  paintFallback,
  paintSideFromFront,
  paintTopFromFront,
} from './avatar';
import { ITEM_SIZE, MINECRAFT_FONT, gui } from './gui';

// a head is half a block, drawn the size the game draws block items in a slot
const HEAD_SIZE = 10;
const HEAD_OFFSET = (ITEM_SIZE - HEAD_SIZE) / 2;
const HALF_HEAD = HEAD_SIZE / 2;

// the same view angle the inventory uses for block items
const HEAD_TRANSFORM = 'rotateX(-30deg) rotateY(-45deg)';

// top is lit, the front a bit less and the right side least, like inventory items
const FACE_SHADE = {
  top: 0,
  front: 0.18,
  side: 0.38,
} as const;

const INITIAL_FONT_SIZE = 8;
const INITIAL_SHADOW = 'rgba(0, 0, 0, 0.4)';
const FALLBACK_INITIAL = '?';

const faceStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'block',
};

const canvasStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  imageRendering: 'pixelated',
};

function shadeStyle(amount: number): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    display: 'block',
    background: `rgba(0, 0, 0, ${amount})`,
  };
}

export function FriendHead({ friend }: { friend: FriendData }) {
  const frontRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLCanvasElement>(null);
  const sideRef = useRef<HTMLCanvasElement>(null);
  // starting from the cache means reopening the chest never flashes the initial
  const [hasAvatar, setHasAvatar] = useState(() => getLoadedAvatar(friend.avatarUrl) !== undefined);

  // layout effect so the first frame already has the head painted
  useLayoutEffect(() => {
    const front = frontRef.current;
    const top = topRef.current;
    const side = sideRef.current;
    if (!front || !top || !side) return;

    const paintHead = (paintFront: () => void) => {
      paintFront();
      paintTopFromFront(top, front);
      paintSideFromFront(side, front);
    };

    const cached = getLoadedAvatar(friend.avatarUrl);
    if (cached) {
      paintHead(() => paintAvatar(front, cached));
      setHasAvatar(true);
      return;
    }

    // the fallback doubles as the loading state, so a slow or broken avatar api
    // just leaves the friend with a coloured head and their initial
    paintHead(() => paintFallback(front, friend.id));
    setHasAvatar(false);

    let cancelled = false;
    loadAvatar(friend.avatarUrl).then(
      (img) => {
        if (cancelled) return;
        paintHead(() => paintAvatar(front, img));
        setHasAvatar(true);
      },
      () => {
        // nothing to do, the fallback is already showing
      },
    );
    return () => {
      cancelled = true;
    };
  }, [friend.avatarUrl, friend.id]);

  const initial = Array.from(friend.name.trim())[0]?.toUpperCase() ?? FALLBACK_INITIAL;

  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: gui(HEAD_OFFSET),
        top: gui(HEAD_OFFSET),
        width: gui(HEAD_SIZE),
        height: gui(HEAD_SIZE),
        display: 'block',
        transformStyle: 'preserve-3d',
        transform: HEAD_TRANSFORM,
        pointerEvents: 'none',
      }}
    >
      <span style={{ ...faceStyle, transform: `rotateX(90deg) translateZ(${gui(HALF_HEAD)})` }}>
        <canvas ref={topRef} width={AVATAR_TEXELS} height={AVATAR_TEXELS} style={canvasStyle} />
        <span style={shadeStyle(FACE_SHADE.top)} />
      </span>
      <span style={{ ...faceStyle, transform: `rotateY(90deg) translateZ(${gui(HALF_HEAD)})` }}>
        <canvas ref={sideRef} width={AVATAR_TEXELS} height={AVATAR_TEXELS} style={canvasStyle} />
        <span style={shadeStyle(FACE_SHADE.side)} />
      </span>
      <span style={{ ...faceStyle, transform: `translateZ(${gui(HALF_HEAD)})` }}>
        <canvas ref={frontRef} width={AVATAR_TEXELS} height={AVATAR_TEXELS} style={canvasStyle} />
        <span style={shadeStyle(FACE_SHADE.front)} />
        {!hasAvatar && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: MINECRAFT_FONT,
              fontSize: gui(INITIAL_FONT_SIZE),
              lineHeight: 1,
              color: '#FFFFFF',
              textShadow: `${gui(1)} ${gui(1)} 0 ${INITIAL_SHADOW}`,
            }}
          >
            {initial}
          </span>
        )}
      </span>
    </span>
  );
}
