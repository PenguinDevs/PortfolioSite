'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { SocialLinks } from '@/data/portfolio';

const SocialLinksContext = createContext<SocialLinks | null>(null);

export function SocialLinksProvider({
  socialLinks,
  children,
}: {
  socialLinks: SocialLinks;
  children: ReactNode;
}) {
  return (
    <SocialLinksContext.Provider value={socialLinks}>
      {children}
    </SocialLinksContext.Provider>
  );
}

export function useSocialLinks(): SocialLinks {
  const ctx = useContext(SocialLinksContext);
  if (!ctx) throw new Error('useSocialLinks must be used within a SocialLinksProvider');
  return ctx;
}
