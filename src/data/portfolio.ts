import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import type { AwardData } from '@/game/contexts/AwardOverlayContext';

// Represents the raw shape of an award entry in the YAML
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

export interface SocialLinks {
  github: string;
  linkedin: string;
  x: string;
  discord: string;
}

interface PortfolioData {
  social: SocialLinks;
  awards: AwardYaml[];
}

// Read and parse the portfolio YAML at build time (server-only)
const raw = fs.readFileSync(path.join(process.cwd(), 'src/data/portfolio.yaml'), 'utf-8');
const portfolio = parse(raw) as PortfolioData;

export function getSocialLinks(): SocialLinks {
  return portfolio.social;
}

// Map YAML entries to the AwardData shape used by the game
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
