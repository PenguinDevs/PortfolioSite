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

// a friend's avatar shown straight in their slot. the slot stays empty until it has loaded
export function FriendIcon({ friend }: { friend: FriendData }) {
  const [loaded, setLoaded] = useState(() => isAvatarLoaded(friend.avatarUrl));

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const attempt = () => {
      loadAvatar(friend.avatarUrl).then(
        () => {
          if (!cancelled) setLoaded(true);
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
  }, [friend.avatarUrl, loaded]);

  if (!loaded) return null;
  // the slot button already carries the friend's name for screen readers
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={friend.avatarUrl} alt="" draggable={false} style={iconStyle} />;
}
