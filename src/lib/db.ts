import Dexie, { type Table } from 'dexie';
import {
  CAPACITY,
  defaultPreferences,
  graphemes,
  type Star,
  type Jar,
  type Preferences,
  type Backup,
} from './models';
export class KisekiDatabase extends Dexie {
  stars!: Table<Star, string>;
  jars!: Table<Jar, string>;
  preferences!: Table<Preferences, string>;
  constructor(name = 'KisekiDatabase') {
    super(name);
    this.version(1).stores({
      stars: 'id,jarId,createdAt,[jarId+createdAt]',
      jars: 'id,createdAt,archivedAt',
      preferences: 'id',
    });
  }
}
export const db = new KisekiDatabase();
const newJar = (): Jar => ({
  id: crypto.randomUUID(),
  title: '',
  theme: 'kyoto-night',
  createdAt: Date.now(),
  archivedAt: null,
});
export async function initialize(database = db) {
  await database.transaction('rw', database.jars, database.preferences, async () => {
    if (!(await database.preferences.get('user')))
      await database.preferences.add(defaultPreferences());
    if (!(await database.jars.toArray()).some((j) => j.archivedAt === null))
      await database.jars.add(newJar());
  });
}
export async function addStar(
  input: Pick<Star, 'text' | 'category' | 'colorId'>,
  archive = false,
  database = db,
) {
  const text = input.text.trim();
  if (!text || graphemes(text).length > 180) throw new Error('INVALID_TEXT');
  return database.transaction('rw', database.jars, database.stars, async () => {
    let jar = (await database.jars.toArray()).find((j) => j.archivedAt === null);
    if (!jar) throw new Error('NO_JAR');
    if ((await database.stars.where('jarId').equals(jar.id).count()) >= CAPACITY) {
      if (!archive) throw new Error('JAR_FULL');
      await database.jars.update(jar.id, { archivedAt: Date.now() });
      jar = newJar();
      await database.jars.add(jar);
    }
    const star: Star = {
      ...input,
      text,
      id: crypto.randomUUID(),
      jarId: jar.id,
      createdAt: Date.now(),
      isFavorite: false,
    };
    await database.stars.add(star);
    return star;
  });
}
export async function exportBackup(database = db): Promise<Backup> {
  return database.transaction(
    'r',
    database.jars,
    database.stars,
    database.preferences,
    async () => ({
      format: 'kiseki',
      version: 1,
      exportedAt: Date.now(),
      jars: await database.jars.toArray(),
      stars: await database.stars.toArray(),
      preferences: (await database.preferences.get('user'))!,
    }),
  );
}
export async function mergeBackup(backup: Backup, database = db) {
  return database.transaction('rw', database.jars, database.stars, async () => {
    const localJars = await database.jars.toArray();
    const localStars = await database.stars.toArray();
    const jarIds = new Set(localJars.map((j) => j.id));
    const starIds = new Set(localStars.map((s) => s.id));
    // Imported jars are archival: the device keeps its one active jar and preferences.
    await database.jars.bulkAdd(
      backup.jars
        .filter((j) => !jarIds.has(j.id))
        .map((j) => ({ ...j, archivedAt: j.archivedAt ?? backup.exportedAt })),
    );
    const incoming = backup.stars.filter((s) => !starIds.has(s.id));
    const active = localJars.find((j) => j.archivedAt === null);
    if (active) {
      const current = localStars.filter((s) => s.jarId === active.id).length;
      const incomingActive = incoming.filter((s) => s.jarId === active.id).length;
      if (current + incomingActive > CAPACITY) {
        await database.jars.update(active.id, { archivedAt: Date.now() });
        await database.jars.add(newJar());
      }
    }
    await database.stars.bulkAdd(incoming);
    return incoming.length;
  });
}
