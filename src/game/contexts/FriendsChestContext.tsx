'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { FriendData } from '@/data/portfolio';

interface FriendsChestState {
  friends: FriendData[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const FriendsChestContext = createContext<FriendsChestState | null>(null);

export function FriendsChestProvider({ friends, children }: { friends: FriendData[]; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((wasOpen) => !wasOpen), []);

  const value = useMemo(() => ({ friends, isOpen, open, close, toggle }), [friends, isOpen, open, close, toggle]);

  return <FriendsChestContext.Provider value={value}>{children}</FriendsChestContext.Provider>;
}

export function useFriendsChest(): FriendsChestState {
  const ctx = useContext(FriendsChestContext);
  if (!ctx) throw new Error('useFriendsChest must be used within a FriendsChestProvider');
  return ctx;
}
