import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import type { AwardData } from '@/game/contexts/AwardOverlayContext';
import { ExperienceType, WorkMode } from '@/game/types';
import { monthIndex } from '@/game/experience';

// --- shared exported types --------------------------------------------------

export interface SocialLinks {
  github: string;
  linkedin: string;
  x: string;
  discord: string;
  email: string;
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
  year: string;
  tags: string[];
  techStack: TechStackItem[];
  buttons: ProjectButton[];
  link: { type: string; value: string };
  media: ProjectMediaItem[];
}

// a calendar month, or a whole year when month is left out
export interface MonthYear {
  year: number;
  // 1-12, undefined for year-only dates
  month?: number;
}

export interface ExperienceData {
  id: string;
  company: string;
  // compact company name for the in-world cards (falls back to company)
  shortName?: string;
  role: string;
  // compact role for the in-world cards (falls back to role)
  shortRole?: string;
  team?: string;
  type?: ExperienceType;
  workMode?: WorkMode;
  location?: string;
  start: MonthYear;
  // undefined while the role is ongoing
  end?: MonthYear;
  // replaces the formatted date range when set, e.g. "Summer 2026/27"
  dateLabel?: string;
  description: string;
  highlights: string[];
  techStack: TechStackItem[];
  logo?: string;
  accentColour: string;
  href?: string;
}

export interface InternshipOffer {
  company: string;
  // path under public/, shown beside the company on the offers note
  logo?: string;
  accepted: boolean;
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
  year: string;
  tags?: string[];
  techStack?: string[];
  buttons?: ProjectButton[];
  link: { type: string; value: string };
  media?: { type: 'image' | 'video'; src: string; width: number; height: number }[];
}

interface ExperienceYaml {
  id: string;
  company: string;
  shortName?: string;
  role: string;
  shortRole?: string;
  team?: string;
  type?: string;
  workMode?: string;
  location?: string;
  // 'YYYY-MM' or 'YYYY' (YAML may hand back a number for unquoted years)
  start: string | number;
  end?: string | number;
  dateLabel?: string;
  description: string;
  highlights?: string[];
  techStack?: string[];
  logo?: string;
  accentColour: string;
  href?: string;
}

interface InternshipOfferYaml {
  company: string;
  logo?: string;
  accepted?: boolean;
}

interface PortfolioData {
  social: SocialLinks;
  techStack: Record<string, TechStackYaml[]>;
  experience: ExperienceYaml[];
  internshipOffers?: InternshipOfferYaml[];
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

const MONTH_YEAR_PATTERN = /^(\d{4})(?:-(\d{2}))?$/;

// parses 'YYYY-MM' or 'YYYY', throwing so a typo fails the build instead of rendering nonsense
function parseMonthYear(value: string | number, field: string, id: string): MonthYear {
  const match = MONTH_YEAR_PATTERN.exec(String(value));
  if (!match) {
    throw new Error(`experience '${id}': ${field} must be 'YYYY-MM' or 'YYYY', got '${value}'`);
  }
  const year = Number(match[1]);
  if (match[2] === undefined) return { year };

  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`experience '${id}': ${field} has an invalid month '${value}'`);
  }
  return { year, month };
}

// checks a raw YAML string against an enum's values so typos fail the build
function parseEnum<T extends string>(
  values: Record<string, T>,
  value: string | undefined,
  field: string,
  id: string,
): T | undefined {
  if (value === undefined) return undefined;
  const allowed = Object.values(values);
  if (!allowed.includes(value as T)) {
    throw new Error(`experience '${id}': unknown ${field} '${value}', expected one of ${allowed.join(', ')}`);
  }
  return value as T;
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
    year: p.year,
    tags: p.tags ?? [],
    techStack: (p.techStack ?? [])
      .map((name) => lookup.get(name))
      .filter((item): item is TechStackItem => item !== undefined),
    buttons: p.buttons ?? [],
    link: p.link,
    media: p.media ?? [],
  }));
}

// validates experience entries and resolves their tech stack names to full entries
export function getExperience(): ExperienceData[] {
  const lookup = buildTechLookup();
  return portfolio.experience.map((e) => {
    const start = parseMonthYear(e.start, 'start', e.id);
    const end = e.end === undefined ? undefined : parseMonthYear(e.end, 'end', e.id);
    if (end && monthIndex(end) < monthIndex(start)) {
      throw new Error(`experience '${e.id}': end is before start`);
    }

    return {
      id: e.id,
      company: e.company,
      shortName: e.shortName,
      role: e.role,
      shortRole: e.shortRole,
      team: e.team,
      type: parseEnum(ExperienceType, e.type, 'type', e.id),
      workMode: parseEnum(WorkMode, e.workMode, 'workMode', e.id),
      location: e.location,
      start,
      end,
      dateLabel: e.dateLabel,
      description: e.description,
      highlights: e.highlights ?? [],
      techStack: (e.techStack ?? []).map((name) => {
        const item = lookup.get(name);
        if (!item) throw new Error(`experience '${e.id}': unknown tech stack item '${name}'`);
        return item;
      }),
      logo: e.logo,
      accentColour: e.accentColour,
      href: e.href,
    };
  });
}

export function getInternshipOffers(): InternshipOffer[] {
  return (portfolio.internshipOffers ?? []).map((o) => ({
    company: o.company,
    logo: o.logo,
    accepted: o.accepted ?? false,
  }));
}
