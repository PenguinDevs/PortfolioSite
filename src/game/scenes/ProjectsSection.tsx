'use client';

import { useMemo } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import { Sign, ProjectMonitor } from '../entities';
import { useProjects } from '../contexts/ProjectsContext';
import type { ProjectData } from '@/data/portfolio';

// each monitor spans two alley tiles (24 world units wide)
const SLOT_WIDTH = 24;
const MONITOR_Y = 6.5;
const MONITOR_Z = -11.9;

// sign sits just before the first monitor
const SIGN_X = -3;

// per-project overrides (all optional)
interface ProjectSlotOverrides {
  contentWidth?: number;
  contentHeight?: number;
}

// ordered list of project IDs to display, with optional per-project customisation
// reorder this array to change the presentation order, or remove entries to hide them
const PROJECT_SLOTS: (string | { id: string } & ProjectSlotOverrides)[] = [
  'valotracker',
  'catch-n-go',
  'ceebs',
  'roblox-games',
  'penguinengine',
  'valorpc',
  'allocateus',
  'nissan-silvia',
];

// normalise each slot into { id, ...overrides }
function normaliseSlot(slot: (typeof PROJECT_SLOTS)[number]): { id: string } & ProjectSlotOverrides {
  return typeof slot === 'string' ? { id: slot } : slot;
}

type ProjectsSectionProps = ThreeElements['group'];

export function ProjectsSection(props: ProjectsSectionProps) {
  const allProjects = useProjects();

  // build a lookup so we can find projects by id
  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectData>();
    for (const p of allProjects) map.set(p.id, p);
    return map;
  }, [allProjects]);

  // resolve ordered slots to project data, skipping any missing IDs
  const resolved = useMemo(() => {
    const result: { project: ProjectData; overrides: ProjectSlotOverrides }[] = [];
    for (const raw of PROJECT_SLOTS) {
      const slot = normaliseSlot(raw);
      const project = projectMap.get(slot.id);
      if (!project) continue;
      const { id: _, ...overrides } = slot;
      result.push({ project, overrides });
    }
    return result;
  }, [projectMap]);

  return (
    <group {...props}>
      <Sign position={[SIGN_X, 0, -4]} rotation={[0, 0, 0]} rows={['', 'Projects', '---->', '']} />

      {resolved.map(({ project, overrides }, i) => (
        <ProjectMonitor
          key={project.id}
          project={project}
          position={[i * SLOT_WIDTH + SLOT_WIDTH / 4, MONITOR_Y, MONITOR_Z]}
          contentWidth={overrides.contentWidth}
          contentHeight={overrides.contentHeight}
        />
      ))}
    </group>
  );
}
