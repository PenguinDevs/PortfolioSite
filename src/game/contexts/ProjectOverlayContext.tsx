'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ProjectData } from '@/data/portfolio';

interface ProjectOverlayState {
  activeProject: ProjectData | null;
  showProject: (data: ProjectData) => void;
  hideProject: () => void;
}

const ProjectOverlayContext = createContext<ProjectOverlayState | null>(null);

export function ProjectOverlayProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState<ProjectData | null>(null);

  const showProject = useCallback((data: ProjectData) => setActiveProject(data), []);
  const hideProject = useCallback(() => setActiveProject(null), []);

  return (
    <ProjectOverlayContext.Provider value={{ activeProject, showProject, hideProject }}>
      {children}
    </ProjectOverlayContext.Provider>
  );
}

export function useProjectOverlay(): ProjectOverlayState {
  const ctx = useContext(ProjectOverlayContext);
  if (!ctx) throw new Error('useProjectOverlay must be used within a ProjectOverlayProvider');
  return ctx;
}
