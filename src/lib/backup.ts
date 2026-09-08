import { CATEGORIES, COLORS, graphemes, type Backup } from './models';
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const timestamp = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 8640000000000000;
const id = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function parseBackup(text: string): Backup {
  if (text.length > 20 * 1024 * 1024) throw new Error('INVALID_BACKUP');
  const b: unknown = JSON.parse(text);
  const fail = () => {
    throw new Error('INVALID_BACKUP');
  };
  if (
    !record(b) ||
    b.format !== 'kiseki' ||
    b.version !== 1 ||
    !timestamp(b.exportedAt) ||
    !Array.isArray(b.jars) ||
    !Array.isArray(b.stars) ||
    !record(b.preferences)
  )
    return fail();
  const p = b.preferences;
  if (
    p.id !== 'user' ||
    !['el', 'en', 'ja'].includes(String(p.language)) ||
    typeof p.soundVolume !== 'number' ||
    !Number.isFinite(p.soundVolume) ||
    p.soundVolume < 0 ||
    p.soundVolume > 1 ||
    typeof p.reducedMotion !== 'boolean' ||
    typeof p.motionEnabled !== 'boolean' ||
    (p.ambientMuted !== undefined && typeof p.ambientMuted !== 'boolean')
  )
    return fail();
  const jars = new Set<string>();
  const stars = new Set<string>();
  let active = 0;
  for (const j of b.jars) {
    if (
      !record(j) ||
      !id(j.id) ||
      jars.has(j.id) ||
      typeof j.title !== 'string' ||
      j.title.length > 120 ||
      j.theme !== 'kyoto-night' ||
      !timestamp(j.createdAt) ||
      (j.archivedAt !== null && (!timestamp(j.archivedAt) || j.archivedAt < j.createdAt))
    )
      return fail();
    jars.add(j.id);
    if (j.archivedAt === null) active++;
  }
  if (active > 1) return fail();
  for (const s of b.stars) {
    if (
      !record(s) ||
      !id(s.id) ||
      stars.has(s.id) ||
      typeof s.jarId !== 'string' ||
      !jars.has(s.jarId) ||
      typeof s.text !== 'string' ||
      !s.text.trim() ||
      graphemes(s.text).length > 180 ||
      !(CATEGORIES as readonly unknown[]).includes(s.category) ||
      !(COLORS as readonly unknown[]).includes(s.colorId) ||
      !timestamp(s.createdAt) ||
      typeof s.isFavorite !== 'boolean'
    )
      return fail();
    stars.add(s.id);
  }
  // Reconstruct known fields, so imports cannot introduce application state or executable content.
  return {
    format: 'kiseki',
    version: 1,
    exportedAt: b.exportedAt,
    jars: b.jars.map((j) => ({
      id: j.id,
      title: j.title,
      theme: j.theme,
      createdAt: j.createdAt,
      archivedAt: j.archivedAt,
    })),
    stars: b.stars.map((s) => ({
      id: s.id,
      jarId: s.jarId,
      text: s.text,
      category: s.category,
      colorId: s.colorId,
      createdAt: s.createdAt,
      isFavorite: s.isFavorite,
    })),
    preferences: {
      id: 'user',
      language: p.language,
      soundVolume: p.soundVolume,
      ambientMuted: p.ambientMuted === true,
      reducedMotion: p.reducedMotion,
      motionEnabled: p.motionEnabled,
    },
  } as Backup;
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
