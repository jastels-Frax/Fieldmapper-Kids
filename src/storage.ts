import { openDB, type IDBPDatabase } from 'idb';
import type { Find, LegacySettings, Profile, Settings } from './types.ts';
import { normalizeFind } from './findModel.ts';
import { uid } from './ids.ts';
import type { Hunt, HuntRun } from './hunts.ts';
import { DEFAULT_SETTINGS } from './types.ts';

export interface TrailDay {
  day: string;
  /** [lon, lat, epoch ms] */
  points: [number, number, number][];
}

// The app was called Field Mapper Kids before it was Scout; renaming the database would orphan every find.
const DB_NAME = 'FieldMapperKids';
/**
 * 1: finds, settings, trails, hunt runs, custom hunts.
 * 2: explorer profiles and imported species lists. The DATA move (settings ->
 *    first profile, finds stamped with it) is `migrateToProfiles`, run by App,
 *    because it needs to know whether the device was ever set up.
 */
const DB_VERSION = 2;

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  dbp ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        const finds = d.createObjectStore('finds', { keyPath: 'id' });
        finds.createIndex('createdAt', 'createdAt');
        d.createObjectStore('settings');
        d.createObjectStore('trails', { keyPath: 'day' });
        d.createObjectStore('huntRuns', { keyPath: 'id' });
        d.createObjectStore('customHunts', { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        d.createObjectStore('profiles', { keyPath: 'id' });
        d.createObjectStore('speciesLists', { keyPath: 'id' });
      }
    },
  });
  return dbp;
}

/** Every find on the device, every explorer's, newest first, in the current shape. */
export async function allFinds(): Promise<Find[]> {
  const list = (await (await db()).getAllFromIndex('finds', 'createdAt')) as Find[];
  return list.reverse().map(f => normalizeFind(f, uid));
}

export async function getFind(id: string): Promise<Find | undefined> {
  const f = (await (await db()).get('finds', id)) as Find | undefined;
  return f && normalizeFind(f, uid);
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

/** A species list a grown-up imported (a Field Mapper species file, or a CSV). */
export interface StoredSpeciesList {
  id: string;
  name: string;
  importedAt: string;
  species: import('./species.ts').Species[];
}

export async function allSpeciesLists(): Promise<StoredSpeciesList[]> {
  return (await (await db()).getAll('speciesLists')) as StoredSpeciesList[];
}

export async function saveSpeciesList(l: StoredSpeciesList): Promise<void> {
  await (await db()).put('speciesLists', l);
}

export async function deleteSpeciesList(id: string): Promise<void> {
  await (await db()).delete('speciesLists', id);
}

export async function loadSettings(): Promise<Settings> {
  const s = (await (await db()).get('settings', 'settings')) as (Partial<Settings> & LegacySettings) | undefined;
  return {
    activeProfileId: s?.activeProfileId,
    readAloud: s?.readAloud ?? DEFAULT_SETTINGS.readAloud,
    sounds: s?.sounds ?? DEFAULT_SETTINGS.sounds,
    trail: s?.trail ?? DEFAULT_SETTINGS.trail,
    tickReminder: s?.tickReminder ?? DEFAULT_SETTINGS.tickReminder,
    basemap: s?.basemap ?? DEFAULT_SETTINGS.basemap,
  };
}

export async function allProfiles(): Promise<Profile[]> {
  const list = (await (await db()).getAll('profiles')) as Profile[];
  return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function saveProfile(p: Profile): Promise<void> {
  await (await db()).put('profiles', p);
}

/** Deletes an explorer and everything that was theirs: finds and hunt runs. */
export async function deleteProfile(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(['profiles', 'finds', 'huntRuns'], 'readwrite');
  await tx.objectStore('profiles').delete(id);
  for (const store of ['finds', 'huntRuns'] as const) {
    let cur = await tx.objectStore(store).openCursor();
    while (cur) {
      if ((cur.value as { profileId?: string }).profileId === id) await cur.delete();
      cur = await cur.continue();
    }
  }
  await tx.done;
}

/**
 * Version 1 kept ONE explorer in the settings. If this device was set up
 * before profiles, that explorer becomes the first profile and every find and
 * hunt run is filed under it; photos and drawings move into `pictures`.
 * Returns the profiles after the move. Runs once: afterwards profiles exist.
 */
export async function migrateToProfiles(): Promise<Profile[]> {
  const d = await db();
  const existing = await allProfiles();
  if (existing.length) return existing;
  const legacy = (await d.get('settings', 'settings')) as (LegacySettings & Partial<Settings>) | undefined;
  if (!legacy?.mode) return [];
  const p: Profile = {
    id: uid(),
    name: legacy.name ?? '',
    avatar: legacy.avatar ?? '🦊',
    mode: legacy.mode,
    guide: legacy.buddy ?? 'frog',
    tickChecks: legacy.tickChecks,
    createdAt: new Date().toISOString(),
  };
  const tx = d.transaction(['profiles', 'finds', 'huntRuns', 'settings'], 'readwrite');
  await tx.objectStore('profiles').put(p);
  let cur = await tx.objectStore('finds').openCursor();
  while (cur) {
    await cur.update({ ...normalizeFind(cur.value as Find, uid), profileId: p.id });
    cur = await cur.continue();
  }
  let rc = await tx.objectStore('huntRuns').openCursor();
  while (rc) {
    await rc.update({ ...rc.value, profileId: p.id });
    rc = await rc.continue();
  }
  const { mode, name, avatar, buddy, tickChecks, ...rest } = legacy;
  await tx.objectStore('settings').put({ ...rest, activeProfileId: p.id }, 'settings');
  await tx.done;
  return [p];
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
