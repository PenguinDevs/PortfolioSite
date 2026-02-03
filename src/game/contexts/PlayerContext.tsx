'use client';

import { createContext, useContext } from 'react';
import type { Group } from 'three';

type GroupRef = { readonly current: Group | null };

const PlayerContext = createContext<GroupRef | null>(null);

export function PlayerProvider({
  groupRef,
  children,
}: {
  groupRef: GroupRef;
  children: React.ReactNode;
}) {
  return (
    <PlayerContext.Provider value={groupRef}>{children}</PlayerContext.Provider>
  );
}

export function usePlayerRef(): GroupRef {
  const ref = useContext(PlayerContext);
  if (!ref) throw new Error('usePlayerRef must be used within a PlayerProvider');
  return ref;
}
