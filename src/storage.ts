import { openDB, type IDBPDatabase } from 'idb';
import type { Find, Settings } from './types.ts';
import type { Hunt, HuntRun } from './hunts.ts';
import { DEFAULT_SETTINGS } from './types.ts';

export interface TrailDay {
  day: string;
  /** [lon, lat, epoch ms] */
  points: [number, number, number][];
}

// The app was called Field Mapper Kids before it was Scout; renaming the database would orphan every find.
const DB_NAME = 'FieldMapperKids';
const DB_VERSION = 1;

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  dbp ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(d) {
      const finds = d.createObjectStore('finds', { keyPath: 'id' });
      finds.createIndex('createdAt', 'createdAt');
      d.createObjectStore('settings');
      d.createObjectStore('trails', { keyPath: 'day' });
      d.createObjectStore('huntRuns', { keyPath: 'id' });
      d.createObjectStore('customHunts', { keyPath: 'id' });
    },
  });
  return dbp;
}

export async function allFinds(): Promise<Find[]> {
  const list = (await (await db()).getAllFromIndex('finds', 'createdAt')) as Find[];
  return list.reverse(); // newest first
}

export async function getFind(id: string): Promise<Find | undefined> {
  return (await db()).get('finds', id) as Promise<Find | undefined>;
}

export async function saveFind(f: Find): Promise<void> {
  await (await db()).put('finds', f);
}

export async function deleteFind(id: string): Promise<void> {
  await (await db()).delete('finds', id);
}

export async function deleteAllFinds(): Promise<void> {
  const d = await db();
  await d.clear('finds');
  await d.clear('trails');
  await d.clear('huntRuns');
}

export async function loadSettings(): Promise<Settings> {
  const s = (await (await db()).get('settings', 'settings')) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await (await db()).put('settings', s, 'settings');
}

export async function getTrail(day: string): Promise<TrailDay | undefined> {
  return (await db()).get('trails', day) as Promise<TrailDay | undefined>;
}

export async function saveTrail(t: TrailDay): Promise<void> {
  const d = await db();
  await d.put('trails', t);
  // Keep a month of walks; older ones are not shown anywhere.
  const cutoff = new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10);
  for (const key of await d.getAllKeys('trails')) {
    if (String(key) < cutoff) await d.delete('trails', key);
  }
}

export async function allHuntRuns(): Promise<HuntRun[]> {
  return (await (await db()).getAll('huntRuns')) as HuntRun[];
}

export async function saveHuntRun(r: HuntRun): Promise<void> {
  await (await db()).put('huntRuns', r);
}

export async function allCustomHunts(): Promise<Hunt[]> {
  return (await (await db()).getAll('customHunts')) as Hunt[];
}

export async function saveCustomHunt(h: Hunt): Promise<void> {
  await (await db()).put('customHunts', h);
}

export async function deleteCustomHunt(id: string): Promise<void> {
  await (await db()).delete('customHunts', id);
}
