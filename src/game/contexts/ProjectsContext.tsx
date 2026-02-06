'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ProjectData } from '@/data/portfolio';

const ProjectsContext = createContext<ProjectData[] | null>(null);

export function ProjectsProvider({
  projects,
  children,
}: {
  projects: ProjectData[];
  children: ReactNode;
}) {
  return (
    <ProjectsContext.Provider value={projects}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectData[] {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within a ProjectsProvider');
  return ctx;
}
