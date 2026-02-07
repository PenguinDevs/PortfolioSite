import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import type { AwardData } from '@/game/contexts/AwardOverlayContext';

// --- shared exported types --------------------------------------------------

export interface SocialLinks {
  github: string;
  linkedin: string;
  x: string;
  discord: string;
}

export interface TechStackItem {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
}

export interface ProjectButton {
  label: string;
  href: string;
  type: string;
}

export type ProjectMediaItem =
  | { type: 'image'; src: string; width: number; height: number }
  | { type: 'video'; src: string; width: number; height: number };

export interface ProjectData {
  id: string;
  title: string;
  description: string;
  tags: string[];
  techStack: TechStackItem[];
  buttons: ProjectButton[];
  link: { type: string; value: string };
  media: ProjectMediaItem[];
}

// --- raw YAML shape interfaces ----------------------------------------------

interface AwardYaml {
  id: string;
  title: string;
  secondaryText: string;
  description: string;
  href: string;
  year: string;
  imageUrl?: string;
  badge?: {
    text: string;
    bgColor: string;
    textColor: string;
    icon: string;
    iconColour?: string;
    model?: string;
    model_texture?: string;
    imageIcon?: string;
  };
  stats?: { value: string; label: string }[];
}

interface TechStackYaml {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
}

interface ProjectYaml {
  id: string;
  title: string;
  description: string;
  tags?: string[];
  techStack?: string[];
  buttons?: ProjectButton[];
  link: { type: string; value: string };
  media?: { type: 'image' | 'video'; src: string; width: number; height: number }[];
}

interface PortfolioData {
  social: SocialLinks;
  techStack: Record<string, TechStackYaml[]>;
  awards: AwardYaml[];
  projects: ProjectYaml[];
}

// --- read and parse at build time (server-only) -----------------------------

const raw = fs.readFileSync(path.join(process.cwd(), 'src/data/portfolio.yaml'), 'utf-8');
const portfolio = parse(raw) as PortfolioData;

// --- helpers ----------------------------------------------------------------

// flattens every tech stack category into a single lookup by name
function buildTechLookup(): Map<string, TechStackItem> {
  const map = new Map<string, TechStackItem>();
  for (const category of Object.values(portfolio.techStack)) {
    for (const item of category) {
      map.set(item.name, item);
    }
  }
  return map;
}

// --- public accessors -------------------------------------------------------

export function getSocialLinks(): SocialLinks {
  return portfolio.social;
}

// map YAML entries to the AwardData shape used by the game
export function getAwards(): AwardData[] {
  return portfolio.awards.map((a) => ({
    id: a.id,
    title: a.title,
    secondaryText: a.secondaryText,
    description: a.description,
    href: a.href,
    year: a.year,
    imageUrl: a.imageUrl,
    badge: a.badge ? {
      text: a.badge.text,
      icon: a.badge.icon,
      iconColour: a.badge.iconColour,
      model: a.badge.model,
      modelTexture: a.badge.model_texture,
      imageIcon: a.badge.imageIcon,
    } : undefined,
    stats: a.stats,
  }));
}

// resolves project tech stack names to full entries with icon URLs
export function getProjects(): ProjectData[] {
  const lookup = buildTechLookup();
  return portfolio.projects.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    tags: p.tags ?? [],
    techStack: (p.techStack ?? [])
      .map((name) => lookup.get(name))
      .filter((item): item is TechStackItem => item !== undefined),
    buttons: p.buttons ?? [],
    link: p.link,
    media: p.media ?? [],
  }));
}
