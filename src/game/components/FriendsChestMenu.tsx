'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { FriendData } from '@/data/portfolio';
import { useFriendsChest } from '../contexts/FriendsChestContext';
import { FriendIcon } from './friendsChest/FriendIcon';
import { FriendTooltip, TooltipSide, getHostname } from './friendsChest/FriendTooltip';
import {
  FONT_SIZE,
  GRID_COLUMNS,
  GUI_COLOUR,
  GUI_PX,
  GUI_PX_VAR,
  ITEM_SIZE,
  LINE_HEIGHT,
  MINECRAFT_FONT,
  MIN_GRID_ROWS,
  PANEL_PADDING,
  PANEL_TOP_PADDING,
  SLOT_SIZE,
  TITLE_X,
  TITLE_Y,
  gui,
  notchedClipPath,
} from './friendsChest/gui';

const TITLE = 'Friends';
const DIALOG_LABEL = 'Friends chest';

// the game opens its menus instantly, this just takes the edge off
const FADE_MS = 80;
// slots from this column on show their tooltip on the left so it stays on screen
const TOOLTIP_FLIP_COLUMN = 5;
const BACKDROP_TOP_OFFSET = 'clamp(16px, 10vh, 160px)';

const LINK_TARGET = '_blank';
const LINK_FEATURES = 'noopener,noreferrer';

enum ChestKey {
  Close = 'Escape',
  // the inventory key, toggles the menu like the real game
  Inventory = 'KeyE',
  Tab = 'Tab',
}

// how the visitor last interacted with the page
enum InputModality {
  Keyboard = 'keyboard',
  Pointer = 'pointer',
}

const slotStyle: CSSProperties = {
  position: 'relative',
  display: 'block',
  width: gui(SLOT_SIZE),
  height: gui(SLOT_SIZE),
  margin: 0,
  padding: 0,
  border: 0,
  borderRadius: 0,
  appearance: 'none',
  outline: 'none',
  font: 'inherit',
  background: GUI_COLOUR.slot,
  // inset bevel, dark top left and light bottom right
  boxShadow: `inset ${gui(1)} ${gui(1)} 0 ${GUI_COLOUR.slotShadow}, inset ${gui(-1)} ${gui(-1)} 0 ${GUI_COLOUR.slotHighlight}`,
};

const itemAreaStyle: CSSProperties = {
  position: 'absolute',
  left: gui(1),
  top: gui(1),
  width: gui(ITEM_SIZE),
  height: gui(ITEM_SIZE),
  display: 'block',
};

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function FriendsChestMenu() {
  const { friends, isOpen, close } = useFriendsChest();

  // only keyboard users get a tooltip on focus. :focus-visible can't be trusted for this,
  // because the window moves focus itself straight after the tap or click that opened it
  const lastModality = useRef(InputModality.Pointer);
  useEffect(() => {
    const onKey = () => {
      lastModality.current = InputModality.Keyboard;
    };
    const onPointer = () => {
      lastModality.current = InputModality.Pointer;
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);

  // the window only exists while open, so hover and focus state start fresh each time
  if (!isOpen) return null;
  return <ChestWindow friends={friends} close={close} lastModality={lastModality} />;
}

function ChestWindow({
  friends,
  close,
  lastModality,
}: {
  friends: FriendData[];
  close: () => void;
  lastModality: RefObject<InputModality>;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? focusedIndex;

  // quick fade in, move focus into the chest and hand it back when the chest closes.
  // keyboard users land on the first friend, everyone else on the window itself
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    backdropRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: 'ease-out' });
    const firstSlot = lastModality.current === InputModality.Keyboard ? slotRefs.current[0] : null;
    (firstSlot ?? dialogRef.current)?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [lastModality]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === ChestKey.Close) {
        close();
        return;
      }
      if (e.code !== ChestKey.Inventory || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      // swallow it so a prompt bound to E can't reopen the chest on the same key press
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    // capture phase so this runs before any other E listener on the window
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [close]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) close();
    },
    [close],
  );

  // keep tab cycling between the friend slots while the chest is open
  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== ChestKey.Tab) return;
    const slots = slotRefs.current.filter((slot): slot is HTMLButtonElement => slot !== null);
    const first = slots[0];
    const last = slots[slots.length - 1];
    if (!first || !last) {
      e.preventDefault();
      return;
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const rows = Math.max(MIN_GRID_ROWS, Math.ceil(friends.length / GRID_COLUMNS));

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      data-block-game-touch
      style={{
        [GUI_PX_VAR as string]: GUI_PX,
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: BACKDROP_TOP_OFFSET,
        boxSizing: 'border-box',
        overflowY: 'auto',
        background: `linear-gradient(${GUI_COLOUR.backdropTop}, ${GUI_COLOUR.backdropBottom})`,
        fontFamily: MINECRAFT_FONT,
        fontSize: gui(FONT_SIZE),
        lineHeight: gui(LINE_HEIGHT),
        WebkitFontSmoothing: 'none',
        userSelect: 'none',
      } as CSSProperties}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={DIALOG_LABEL}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        style={{
          position: 'relative',
          flexShrink: 0,
          padding: `${gui(PANEL_TOP_PADDING)} ${gui(PANEL_PADDING)} ${gui(PANEL_PADDING)}`,
          outline: 'none',
          cursor: 'default',
        }}
      >
        <div
          aria-hidden
          style={{
            // the panel lives on its own layer so its clip path doesn't cut off tooltips
            position: 'absolute',
            inset: 0,
            boxSizing: 'border-box',
            background: GUI_COLOUR.panel,
            border: `${gui(1)} solid ${GUI_COLOUR.outline}`,
            // raised bevel, light top left and dark bottom right
            boxShadow: `inset ${gui(2)} ${gui(2)} 0 ${GUI_COLOUR.panelHighlight}, inset ${gui(-2)} ${gui(-2)} 0 ${GUI_COLOUR.panelShadow}`,
            clipPath: notchedClipPath(1),
          }}
        />
        <h2
          style={{
            position: 'absolute',
            left: gui(TITLE_X),
            top: gui(TITLE_Y),
            margin: 0,
            font: 'inherit',
            color: GUI_COLOUR.title,
          }}
        >
          {TITLE}
        </h2>
        <div
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLUMNS}, ${gui(SLOT_SIZE)})`,
            gridAutoRows: gui(SLOT_SIZE),
          }}
        >
          {Array.from({ length: rows * GRID_COLUMNS }, (_, index) => {
            const friend = friends[index];
            if (!friend) return <span key={`empty-${index}`} aria-hidden style={slotStyle} />;

            const isActive = activeIndex === index;
            const side = index % GRID_COLUMNS >= TOOLTIP_FLIP_COLUMN ? TooltipSide.Left : TooltipSide.Right;
            return (
              <button
                key={friend.id}
                ref={(element) => {
                  slotRefs.current[index] = element;
                }}
                type="button"
                aria-label={`${friend.name}, visit ${getHostname(friend.link)} in a new tab`}
                onClick={() => window.open(friend.link, LINK_TARGET, LINK_FEATURES)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex((current) => (current === index ? null : current))}
                onFocus={() => setFocusedIndex(lastModality.current === InputModality.Keyboard ? index : null)}
                onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
                style={{ ...slotStyle, cursor: 'pointer' }}
              >
                <span style={itemAreaStyle}>
                  <FriendIcon friend={friend} />
                  {isActive && (
                    <span style={{ position: 'absolute', inset: 0, display: 'block', background: GUI_COLOUR.hover }} />
                  )}
                </span>
                {isActive && <FriendTooltip friend={friend} side={side} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
