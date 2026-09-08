import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KisekiDatabase, initialize, addStar, exportBackup, mergeBackup } from '../src/lib/db';
import {
  graphemes,
  weight,
  recall,
  summarizeMonth,
  pastMonths,
  defaultPreferences,
  COLORS,
  CATEGORIES,
  CATEGORY_TRAITS,
  PALETTE,
  type Star,
  type Backup,
} from '../src/lib/models';
import { parseBackup } from '../src/lib/backup';
import { JarWorld, hitTest } from '../src/lib/physics';
import { ShakeDetector } from '../src/lib/sensory';
import { detectInstall } from '../src/lib/install';
import { loadingQuote } from '../src/lib/quotes';
import { REMARKS, openingRemark } from '../src/lib/remarks';
let db: KisekiDatabase;
beforeEach(async () => {
  db = new KisekiDatabase(`test-${crypto.randomUUID()}`);
  await initialize(db);
});
afterEach(async () => {
  await db.delete();
  vi.restoreAllMocks();
});
const input = { text: 'A small win', category: 'effort' as const, colorId: 'gold' as const };
const sample = (createdAt: number, props: Partial<Star> = {}): Star => ({
  id: crypto.randomUUID(),
  jarId: crypto.randomUUID(),
  text: '記録',
  category: 'effort',
  colorId: 'gold',
  createdAt,
  isFavorite: false,
  ...props,
});
describe('local storage and capacity', () => {
  it('initializes once even with concurrent starts', async () => {
    await Promise.all([initialize(db), initialize(db)]);
    expect(await db.jars.count()).toBe(1);
    expect((await db.preferences.get('user'))?.id).toBe('user');
  });
  it('stores before returning and counts graphemes', async () => {
    expect(graphemes('👨‍👩‍👧‍👦ά').length).toBe(2);
    const s = await addStar({ ...input, text: '👨‍👩‍👧‍👦'.repeat(180) }, false, db);
    expect(await db.stars.get(s.id)).toEqual(s);
    await expect(addStar({ ...input, text: 'a'.repeat(181) }, false, db)).rejects.toThrow(
      'INVALID_TEXT',
    );
    await expect(addStar({ ...input, text: '  ' }, false, db)).rejects.toThrow();
  });
  it('never exceeds capacity under concurrent submissions and archives atomically', async () => {
    for (let i = 0; i < 44; i++) await addStar(input, false, db);
    const outcomes = await Promise.allSettled([
      addStar(input, false, db),
      addStar(input, false, db),
    ]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.stars.count()).toBe(45);
    const old = (await db.jars.toArray())[0];
    const added = await addStar(input, true, db);
    expect(added.jarId).not.toBe(old.id);
    expect(await db.stars.count()).toBe(46);
    expect((await db.jars.toArray()).filter((j) => j.archivedAt === null)).toHaveLength(1);
    expect(await db.stars.where('jarId').equals(old.id).count()).toBe(45);
  });
  it('rolls back jar rotation if the star insert fails', async () => {
    for (let i = 0; i < 45; i++) await addStar(input, false, db);
    vi.spyOn(db.stars, 'add').mockRejectedValueOnce(new Error('disk full'));
    await expect(addStar(input, true, db)).rejects.toThrow('disk full');
    expect(await db.jars.count()).toBe(1);
    expect((await db.jars.toArray())[0].archivedAt).toBeNull();
    expect(await db.stars.count()).toBe(45);
  });
});
describe('backup validation and merge', () => {
  it('roundtrips, skips duplicates and keeps preferences', async () => {
    await addStar(input, false, db);
    const b = parseBackup(JSON.stringify(await exportBackup(db)));
    b.preferences.language = 'ja';
    expect(await mergeBackup(b, db)).toBe(0);
    expect(await db.stars.count()).toBe(1);
    expect((await db.preferences.get('user'))?.language).not.toBe('ja');
  });
  it('imports foreign active jars into archive and retains one active jar', async () => {
    const jarId = crypto.randomUUID();
    const b: Backup = {
      format: 'kiseki',
      version: 1,
      exportedAt: 1000,
      jars: [{ id: jarId, title: '', theme: 'kyoto-night', createdAt: 0, archivedAt: null }],
      stars: [sample(1, { jarId })],
      preferences: defaultPreferences(),
    };
    expect(await mergeBackup(parseBackup(JSON.stringify(b)), db)).toBe(1);
    expect((await db.jars.get(jarId))?.archivedAt).toBe(1000);
    expect((await db.jars.toArray()).filter((j) => j.archivedAt === null)).toHaveLength(1);
  });
  it('rejects dangling references, duplicates, invalid enums and non-finite values', async () => {
    await addStar(input, false, db);
    const b = await exportBackup(db);
    expect(() => parseBackup(JSON.stringify({ ...b, version: 99 }))).toThrow();
    expect(() => parseBackup(JSON.stringify({ ...b, stars: [...b.stars, ...b.stars] }))).toThrow();
    expect(() => parseBackup(JSON.stringify({ ...b, jars: [] }))).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...b, stars: [{ ...b.stars[0], colorId: 'red' }] })),
    ).toThrow();
    for (const colorId of ['jade', 'peach', 'aurora', 'amber', 'ember', 'blush', 'violet', 'mist', 'sea']) {
      expect(() =>
        parseBackup(JSON.stringify({ ...b, stars: [{ ...b.stars[0], colorId }] })),
      ).not.toThrow();
    }
    for (const category of ['gratitude', 'joy', 'growth']) {
      expect(() =>
        parseBackup(JSON.stringify({ ...b, stars: [{ ...b.stars[0], category }] })),
      ).not.toThrow();
    }
    expect(() =>
      parseBackup(JSON.stringify({ ...b, preferences: { ...b.preferences, soundVolume: NaN } })),
    ).toThrow();
  });
  it('rolls back an entire failed import', async () => {
    const b = await exportBackup(db);
    b.jars[0].id = crypto.randomUUID();
    b.stars = [sample(1, { jarId: b.jars[0].id })];
    vi.spyOn(db.stars, 'bulkAdd').mockRejectedValueOnce(new Error('quota'));
    await expect(mergeBackup(b, db)).rejects.toThrow();
    expect(await db.jars.count()).toBe(1);
    expect(await db.stars.count()).toBe(0);
  });
});
describe('recall and month boundaries', () => {
  it('uses multiplicative age/favorite weights with nonzero probability', () => {
    const now = 10 * 86400000;
    expect(weight(sample(now), now)).toBe(0.5);
    expect(weight(sample(now - 86400000), now)).toBe(1);
    expect(weight(sample(now - 3 * 86400000, { isFavorite: true }), now)).toBe(5);
    expect(recall([])).toBeNull();
    const a = sample(now),
      b = sample(0);
    expect(recall([a, b], () => 0, now)).toBe(a);
    expect(recall([a, b], () => 0.999, now)).toBe(b);
  });
  it('includes all jars and February 29, excludes adjacent months', () => {
    const entries = [
      sample(new Date(2024, 1, 1).getTime()),
      sample(new Date(2024, 1, 29, 23, 59).getTime()),
      sample(new Date(2024, 2, 1).getTime()),
    ];
    const result = summarizeMonth(entries, '2024-02');
    expect(result.total).toBe(2);
    expect(result.memories).toHaveLength(2);
    expect(summarizeMonth(entries, '2023-02').dominant).toBeNull();
  });
  it('returns previous December in January and no future month', () => {
    expect(pastMonths([sample(new Date(2027, 0, 2).getTime())], new Date(2027, 0, 3))).toEqual([
      '2026-12',
    ]);
  });
  it('selects up to three nonfavorite memories without the old 30-day condition', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      sample(new Date(2026, 7, i + 1, 9).getTime(), { isFavorite: i === 0 }),
    );
    expect(summarizeMonth(entries, '2026-08').memories.map((s) => s.id)).toEqual(
      entries.slice(1, 4).map((s) => s.id),
    );
  });
  it('keeps every kiseki of the month for the Wrapped wallpaper, including favorites', () => {
    const entries = [
      sample(new Date(2026, 7, 2).getTime(), { colorId: 'aurora', isFavorite: true }),
      sample(new Date(2026, 7, 3).getTime(), { colorId: 'jade', category: 'joy' }),
    ];
    expect(summarizeMonth(entries, '2026-08').kisekis.map((s) => s.colorId)).toEqual([
      'aurora',
      'jade',
    ]);
  });
});
describe('kiseki spectrum and character', () => {
  it('covers fourteen star colors and eight categories', () => {
    expect(COLORS).toHaveLength(14);
    expect(CATEGORIES).toHaveLength(8);
    expect(Object.keys(PALETTE)).toHaveLength(14);
    expect(CATEGORIES).toEqual([
      'effort',
      'kindness',
      'rest',
      'courage',
      'milestone',
      'gratitude',
      'joy',
      'growth',
    ]);
  });
  it('gives rest a sleepier body than joy', () => {
    expect(CATEGORY_TRAITS.rest.restitution).toBeLessThan(CATEGORY_TRAITS.joy.restitution);
    expect(CATEGORY_TRAITS.rest.frictionAir).toBeGreaterThan(CATEGORY_TRAITS.courage.frictionAir);
    expect(CATEGORY_TRAITS.milestone.radius).toBeGreaterThan(CATEGORY_TRAITS.rest.radius);
    expect(CATEGORY_TRAITS.joy.impulseY).toBeGreaterThan(CATEGORY_TRAITS.rest.impulseY);
    expect(CATEGORY_TRAITS.milestone.density).toBeGreaterThan(CATEGORY_TRAITS.joy.density);
  });
  it('picks a seated kiseki under a tap and ignores empty space', () => {
    const w = new JarWorld();
    w.add('a', true, 'joy');
    const body = w.bodies.get('a')!;
    const star = sample(1, { id: 'a', category: 'joy', colorId: 'aurora' });
    const map = new Map([['a', star]]);
    expect(hitTest([body], map, body.position.x, body.position.y)?.id).toBe('a');
    expect(hitTest([body], map, 20, 20)).toBeNull();
    w.dispose();
  });
});
describe('install detection and loading quotes', () => {
  it('recognizes installed PWA, native shell, iOS and Android', () => {
    expect(
      detectInstall({
        matchMedia: () => ({ matches: true }),
        navigator: { standalone: false, userAgent: 'Mozilla', maxTouchPoints: 0, platform: 'Win32' },
        Capacitor: undefined,
      }),
    ).toBe('installed');
    expect(
      detectInstall({
        matchMedia: () => ({ matches: false }),
        navigator: { standalone: false, userAgent: 'Mozilla', maxTouchPoints: 0, platform: 'Win32' },
        Capacitor: { isNativePlatform: () => true },
      }),
    ).toBe('native');
    expect(
      detectInstall({
        matchMedia: () => ({ matches: false }),
        navigator: {
          standalone: true,
          userAgent: 'iPhone',
          maxTouchPoints: 5,
          platform: 'iPhone',
        },
        Capacitor: undefined,
      }),
    ).toBe('installed');
    expect(
      detectInstall({
        matchMedia: () => ({ matches: false }),
        navigator: {
          standalone: false,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
          maxTouchPoints: 5,
          platform: 'iPhone',
        },
        Capacitor: undefined,
      }),
    ).toBe('ios');
    expect(
      detectInstall({
        matchMedia: () => ({ matches: false }),
        navigator: {
          standalone: false,
          userAgent: 'Mozilla/5.0 (Linux; Android 14)',
          maxTouchPoints: 5,
          platform: 'Linux armv8l',
        },
        Capacitor: undefined,
      }),
    ).toBe('android');
    expect(
      detectInstall({
        matchMedia: () => ({ matches: false }),
        navigator: { standalone: false, userAgent: 'Mozilla', maxTouchPoints: 0, platform: 'Win32' },
        Capacitor: undefined,
      }),
    ).toBe('desktop');
  });
  it('returns a quote in the active language', () => {
    expect(loadingQuote('el', 1).length).toBeGreaterThan(12);
    expect(loadingQuote('ja', 2)).not.toEqual(loadingQuote('en', 2));
  });
  it('keeps many opening remarks and picks one at random', () => {
    expect(REMARKS.en.length).toBeGreaterThanOrEqual(12);
    expect(REMARKS.el).toHaveLength(REMARKS.en.length);
    expect(REMARKS.ja).toHaveLength(REMARKS.en.length);
    expect(openingRemark('en', () => 0)).toBe(REMARKS.en[0]);
    expect(openingRemark('el', () => 0.99)).toBe(REMARKS.el[REMARKS.el.length - 1]);
    expect(openingRemark('ja', () => 0)).not.toBe(openingRemark('en', () => 0));
  });
});
describe('physics and sensor safeguards', () => {
  it('contains 45 sequential stars through repeated shakes and releases the world', () => {
    const w = new JarWorld();
    for (let i = 0; i < 45; i++) {
      w.add(String(i));
      for (let s = 0; s < 6; s++) w.step();
    }
    w.add('46');
    expect(w.bodies.size).toBe(45);
    for (let s = 0; s < 900; s++) w.step();
    for (let shake = 0; shake < 3; shake++) {
      w.shake();
      for (let s = 0; s < 900; s++) w.step();
    }
    for (const body of w.bodies.values()) {
      expect(body.position.x).toBeGreaterThan(80);
      expect(body.position.x).toBeLessThan(320);
      expect(body.position.y).toBeLessThan(380);
      expect(Number.isFinite(body.angle)).toBe(true);
    }
    w.dispose();
    expect(w.engine.world.bodies).toHaveLength(0);
  });
  it('requires consecutive 2.5g samples and debounces, with no resting false positive', () => {
    const detector = new ShakeDetector();
    expect(detector.sample(0, 0, 9.80665, 0)).toBe(false);
    expect(detector.sample(30, 0, 0, 10)).toBe(false);
    expect(detector.sample(30, 0, 0, 100)).toBe(true);
    expect(detector.sample(30, 0, 0, 200)).toBe(false);
    expect(detector.sample(30, 0, 0, 300)).toBe(false);
    expect(detector.sample(30, 0, 0, 1800)).toBe(false);
    expect(detector.sample(30, 0, 0, 1900)).toBe(true);
    expect(detector.sample(NaN, 0, 0, 2000)).toBe(false);
  });
});
