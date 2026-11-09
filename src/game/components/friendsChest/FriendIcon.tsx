'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { FriendData } from '@/data/portfolio';
import { isAvatarLoaded, loadAvatar } from './avatar';

// the avatar api is flaky, so while the chest is open a failed icon tries again after this long
const RETRY_DELAY_MS = 4000;

const iconStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

// a friend's avatar shown straight in their slot. the saved copy fills the slot until the
// live avatar has loaded, and without one the slot stays empty until then
export function FriendIcon({ friend }: { friend: FriendData }) {
  const [liveLoaded, setLiveLoaded] = useState(() => isAvatarLoaded(friend.avatarUrl));

  useEffect(() => {
    if (liveLoaded) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const attempt = () => {
      loadAvatar(friend.avatarUrl).then(
        () => {
          if (!cancelled) setLiveLoaded(true);
        },
        () => {
          if (!cancelled) retryTimer = setTimeout(attempt, RETRY_DELAY_MS);
        },
      );
    };
    attempt();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [friend.avatarUrl, liveLoaded]);

  const src = liveLoaded ? friend.avatarUrl : friend.fallbackAvatarUrl;
  if (!src) return null;
  // the slot button already carries the friend's name for screen readers
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} style={iconStyle} />;
}
