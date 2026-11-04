import { ExperienceItemKind, ExperienceStatus, ExperienceType, WorkMode } from './types';
import type { ExperienceData, InternshipOffer, MonthYear } from '@/data/portfolio';

const MONTHS_PER_YEAR = 12;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const PRESENT_LABEL = 'Present';

// en dash between the two ends of a date range
const RANGE_SEPARATOR = ' \u2013 ';

export const EXPERIENCE_TYPE_LABEL: Record<ExperienceType, string> = {
  [ExperienceType.FullTime]: 'Full-time',
  [ExperienceType.PartTime]: 'Part-time',
  [ExperienceType.Contract]: 'Contract',
  [ExperienceType.Internship]: 'Internship',
  [ExperienceType.SelfEmployed]: 'Self-employed',
  [ExperienceType.Freelance]: 'Freelance',
  [ExperienceType.Club]: 'Student club',
  [ExperienceType.Program]: 'Programme',
};

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  [WorkMode.OnSite]: 'On-site',
  [WorkMode.Remote]: 'Remote',
  [WorkMode.Hybrid]: 'Hybrid',
};

// id of the offers note, used for React keys and pinboard strings
export const OFFERS_ITEM_ID = 'internship-offers';

export type ExperienceItem =
  | { kind: ExperienceItemKind.Role; id: string; entry: ExperienceData }
  | { kind: ExperienceItemKind.Offers; id: string };

// roles in data order, with the offers note placed right after the role of the
// accepted offer (or first when no role matches) so the two read together
export function buildExperienceItems(
  experience: ExperienceData[],
  offers: InternshipOffer[],
): ExperienceItem[] {
  const items: ExperienceItem[] = experience.map((entry) => ({
    kind: ExperienceItemKind.Role,
    id: entry.id,
    entry,
  }));
  if (offers.length === 0) return items;

  const acceptedCompany = offers.find((offer) => offer.accepted)?.company;
  const acceptedIndex = experience.findIndex((entry) => entry.company === acceptedCompany);
  items.splice(acceptedIndex + 1, 0, { kind: ExperienceItemKind.Offers, id: OFFERS_ITEM_ID });
  return items;
}

// months since year 0. year-only dates count as January, so a one-off
// programme stored as '2026' to '2026' reads as finished after that January
export function monthIndex(date: MonthYear): number {
  return date.year * MONTHS_PER_YEAR + (date.month ?? 1) - 1;
}

// month granularity: a role starting this month already counts as current
export function getExperienceStatus(entry: ExperienceData, now: Date): ExperienceStatus {
  const current = monthIndex({ year: now.getFullYear(), month: now.getMonth() + 1 });
  if (monthIndex(entry.start) > current) return ExperienceStatus.Upcoming;
  if (!entry.end || monthIndex(entry.end) >= current) return ExperienceStatus.Current;
  return ExperienceStatus.Past;
}

export function formatMonthYear(date: MonthYear): string {
  return date.month === undefined ? String(date.year) : `${MONTH_NAMES[date.month - 1]} ${date.year}`;
}

// the real months, e.g. "Jul 2026 - Present", "Feb 2026 - Apr 2026" or just "2026"
export function formatMonthRange(entry: ExperienceData): string {
  const start = formatMonthYear(entry.start);
  if (!entry.end) return `${start}${RANGE_SEPARATOR}${PRESENT_LABEL}`;
  const end = formatMonthYear(entry.end);
  return start === end ? start : `${start}${RANGE_SEPARATOR}${end}`;
}

// LinkedIn style inclusive duration ("1 yr 2 mos"). undefined for year-only dates
// and for ongoing roles that haven't started yet
export function formatDuration(entry: ExperienceData, now: Date): string | undefined {
  if (entry.start.month === undefined || (entry.end && entry.end.month === undefined)) return undefined;

  const endIndex = monthIndex(entry.end ?? { year: now.getFullYear(), month: now.getMonth() + 1 });
  const months = endIndex - monthIndex(entry.start) + 1;
  if (months <= 0) return undefined;

  const years = Math.floor(months / MONTHS_PER_YEAR);
  const rest = months % MONTHS_PER_YEAR;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
  if (rest > 0) parts.push(`${rest} ${rest === 1 ? 'mo' : 'mos'}`);
  return parts.join(' ');
}
