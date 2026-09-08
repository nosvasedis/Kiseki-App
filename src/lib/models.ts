export const CATEGORIES = [
  'effort',
  'kindness',
  'rest',
  'courage',
  'milestone',
  'gratitude',
  'joy',
  'growth',
] as const;
export type Category = (typeof CATEGORIES)[number];
export const COLORS = [
  'moon',
  'gold',
  'amber',
  'peach',
  'ember',
  'sakura',
  'blush',
  'lavender',
  'violet',
  'ice',
  'mist',
  'sea',
  'aurora',
  'jade',
] as const;
export type Color = (typeof COLORS)[number];
export const PALETTE: Record<Color, string> = {
  moon: '#F7F1DF',
  gold: '#E7B866',
  amber: '#D4A04A',
  peach: '#E9A07A',
  ember: '#C97A5A',
  sakura: '#D79AA8',
  blush: '#E4B0BE',
  lavender: '#C7B5EF',
  violet: '#9B8AD4',
  ice: '#BFD7FF',
  mist: '#A9B8C9',
  sea: '#6A9BB8',
  aurora: '#6DC8C0',
  jade: '#86C9A8',
};
export type KisekiVisual = 'sharp' | 'heart' | 'moon' | 'flame' | 'ring' | 'leaf' | 'spark' | 'bloom';
export interface CategoryTrait {
  density: number;
  friction: number;
  frictionStatic: number;
  frictionAir: number;
  restitution: number;
  radius: number;
  sides: number;
  tips: number;
  visual: KisekiVisual;
  impulseX: number;
  impulseY: number;
  spin: number;
  drift: number;
}
export const CATEGORY_TRAITS: Record<Category, CategoryTrait> = {
  effort: {
    density: 0.00145,
    friction: 0.11,
    frictionStatic: 0.3,
    frictionAir: 0.012,
    restitution: 0.15,
    radius: 14,
    sides: 5,
    tips: 5,
    visual: 'sharp',
    impulseX: 3.2,
    impulseY: 4.2,
    spin: 0.08,
    drift: 8,
  },
  kindness: {
    density: 0.00105,
    friction: 0.09,
    frictionStatic: 0.2,
    frictionAir: 0.02,
    restitution: 0.24,
    radius: 14.4,
    sides: 6,
    tips: 6,
    visual: 'heart',
    impulseX: 2.4,
    impulseY: 3.6,
    spin: 0.05,
    drift: 6,
  },
  rest: {
    density: 0.0016,
    friction: 0.22,
    frictionStatic: 0.42,
    frictionAir: 0.048,
    restitution: 0.04,
    radius: 12.2,
    sides: 6,
    tips: 6,
    visual: 'moon',
    impulseX: 1.1,
    impulseY: 2.1,
    spin: 0.015,
    drift: 3,
  },
  courage: {
    density: 0.00115,
    friction: 0.035,
    frictionStatic: 0.12,
    frictionAir: 0.005,
    restitution: 0.44,
    radius: 13.4,
    sides: 5,
    tips: 5,
    visual: 'flame',
    impulseX: 5.4,
    impulseY: 6.6,
    spin: 0.16,
    drift: 14,
  },
  milestone: {
    density: 0.00235,
    friction: 0.16,
    frictionStatic: 0.4,
    frictionAir: 0.016,
    restitution: 0.07,
    radius: 17.2,
    sides: 7,
    tips: 8,
    visual: 'ring',
    impulseX: 1.8,
    impulseY: 3,
    spin: 0.03,
    drift: 4,
  },
  gratitude: {
    density: 0.001,
    friction: 0.1,
    frictionStatic: 0.24,
    frictionAir: 0.022,
    restitution: 0.19,
    radius: 14,
    sides: 6,
    tips: 6,
    visual: 'leaf',
    impulseX: 2.6,
    impulseY: 3.8,
    spin: 0.06,
    drift: 7,
  },
  joy: {
    density: 0.00072,
    friction: 0.04,
    frictionStatic: 0.12,
    frictionAir: 0.004,
    restitution: 0.52,
    radius: 13.6,
    sides: 5,
    tips: 5,
    visual: 'spark',
    impulseX: 4.8,
    impulseY: 7.4,
    spin: 0.2,
    drift: 16,
  },
  growth: {
    density: 0.00112,
    friction: 0.12,
    frictionStatic: 0.26,
    frictionAir: 0.026,
    restitution: 0.27,
    radius: 15.2,
    sides: 6,
    tips: 6,
    visual: 'bloom',
    impulseX: 2.8,
    impulseY: 4.4,
    spin: 0.09,
    drift: 9,
  },
};
export type Language = 'el' | 'en' | 'ja';
export interface Star {
  id: string;
  jarId: string;
  text: string;
  category: Category;
  colorId: Color;
  createdAt: number;
  isFavorite: boolean;
}
export interface Jar {
  id: string;
  title: string;
  theme: 'kyoto-night';
  createdAt: number;
  archivedAt: number | null;
}
export interface Preferences {
  id: 'user';
  language: Language;
  soundVolume: number;
  ambientMuted: boolean;
  reducedMotion: boolean;
  motionEnabled: boolean;
}
export interface Backup {
  format: 'kiseki';
  version: 1;
  exportedAt: number;
  jars: Jar[];
  stars: Star[];
  preferences: Preferences;
}
export const CAPACITY = 45;
export const graphemes = (text: string) =>
  Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    (part) => part.segment,
  );
export function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
export function starMass(text: string) {
  const trimmed = text.trim();
  const marks = Math.min(180, graphemes(trimmed).length);
  const words = wordCount(trimmed);
  const byMarks = marks / 180;
  const byWords = words <= 1 ? 0 : Math.min(1, (words - 1) / 22);
  return Math.min(1, byMarks * 0.58 + byWords * 0.42);
}
export function starScale(text: string) {
  return Math.pow(starMass(text), 0.68);
}
export function starRadius(star: Pick<Star, 'text' | 'category'>) {
  const base = CATEGORY_TRAITS[star.category].radius;
  const size = base * (0.5 + starScale(star.text) * 0.88);
  return Math.min(20.6, Math.max(7.1, size));
}
export function defaultPreferences(): Preferences {
  const language = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
  return {
    id: 'user',
    language: language === 'el' || language === 'ja' ? language : 'en',
    soundVolume: 0.35,
    ambientMuted: false,
    reducedMotion:
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    motionEnabled: false,
  };
}
export function weight(star: Star, now = Date.now()) {
  const age = now - star.createdAt;
  return (age < 86400000 ? 0.5 : age < 3 * 86400000 ? 1 : 2) * (star.isFavorite ? 2.5 : 1);
}
export function recall(stars: Star[], random = Math.random, now = Date.now()) {
  if (!stars.length) return null;
  let target = random() * stars.reduce((sum, s) => sum + weight(s, now), 0);
  for (const star of stars) {
    target -= weight(star, now);
    if (target < 0) return star;
  }
  return stars[stars.length - 1];
}
export const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
export function summarizeMonth(stars: Star[], key: string) {
  const [year, month] = key.split('-').map(Number);
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 1).getTime();
  const entries = stars
    .filter((s) => s.createdAt >= start && s.createdAt < end)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const counts = CATEGORIES.map((category) => ({
    category,
    count: entries.filter((s) => s.category === category).length,
  }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: entries.filter((s) => new Date(s.createdAt).getHours() === hour).length,
  }));
  return {
    total: entries.length,
    counts,
    dominant: entries.length ? [...counts].sort((a, b) => b.count - a.count)[0].category : null,
    hour: entries.length ? hours.sort((a, b) => b.count - a.count)[0].hour : null,
    memories: entries.filter((s) => !s.isFavorite).slice(0, 3),
    kisekis: entries,
  };
}
export function pastMonths(stars: Star[], now = new Date()) {
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const keys = new Set([monthKey(last)]);
  for (const star of stars) {
    const key = monthKey(new Date(star.createdAt));
    if (key < monthKey(now)) keys.add(key);
  }
  return [...keys].sort().reverse();
}
