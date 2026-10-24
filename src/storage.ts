import { openDB, type IDBPDatabase } from 'idb';
import type { Find, FindMedia, FullFind, LegacySettings, Picture, Profile, Settings } from './types.ts';
import { normalizeFind } from './findModel.ts';
import { uid } from './ids.ts';
import type { Hunt, HuntRun } from './hunts.ts';
import type { Walk } from './walk.ts';
import { DEFAULT_SETTINGS } from './types.ts';
import { revive, toBytes, fromBytes, type StoredBytes } from './storedBytes.ts';
import { holdsMedia, splitStoredFind, type StoredMedia } from './findSplit.ts';

export interface TrailDay {
  day: string;
  /** [lon, lat, epoch ms] */
  points: [number, number, number][];
}

// The app was called Field Mapper Kids before it was Scout; renaming the database would orphan every find.
const DB_NAME = 'FieldMapperKids';
/**
 * 1: finds, settings, trails, hunt runs, custom hunts.
 * 3: recorded paths ("walks").
 * 2: explorer profiles and imported species lists. The DATA move (settings ->
 *    first profile, finds stamped with it) is `migrateToProfiles`, run by App,
 *    because it needs to know whether the device was ever set up.
 */
const DB_VERSION = 4;

let dbp: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  dbp ??= openDB(DB_NAME, DB_VERSION, {
    async upgrade(d, oldVersion, _newVersion, tx) {
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
      if (oldVersion < 3) d.createObjectStore('walks', { keyPath: 'id' });
      if (oldVersion < 4) {
        // Pictures and voice notes move out of the finds into their own store (findSplit.ts). Done here, in the
        // upgrade, record by record: values are only MOVED, never read as files, so nothing Safari backs with a
        // file is touched on the way.
        const media = d.createObjectStore('findMedia', { keyPath: 'id' });
        if (oldVersion >= 1) {
          let cur = await tx.objectStore('finds').openCursor();
          while (cur) {
            const raw = cur.value as Record<string, unknown>;
            if (holdsMedia(raw)) {
              const { light, media: m } = splitStoredFind(raw, uid);
              await media.put(m);
              await cur.update(light);
            }
            cur = await cur.continue();
          }
        }
      }
    },
  });
  return dbp;
}

/**
 * Every find on the device, every explorer's, newest first: LIGHT — which pictures each has, never their bytes
 * (findMedia; `getFindMedia` reads them when a find is opened). The small thumbnail comes along for the map.
 */
export async function allFinds(): Promise<Find[]> {
  const raw = (await (await db()).getAllFromIndex('finds', 'createdAt')) as Record<string, unknown>[];
  const out: Find[] = [];
  for (const r of raw.reverse()) {
    const { find, migrate } = await reviveLight(r);
    if (migrate) await (await db()).put('finds', await packLight(find));
    out.push(find);
  }
  return out;
}

export async function getFind(id: string): Promise<Find | undefined> {
  const raw = (await (await db()).get('finds', id)) as Record<string, unknown> | undefined;
  return raw && (await reviveLight(raw)).find;
}

/** A find's pictures and voice note, as in-memory Blobs (storedBytes.ts). */
export async function getFindMedia(id: string): Promise<FindMedia> {
  const raw = (await (await db()).get('findMedia', id)) as StoredMedia | undefined;
  if (!raw) return { pictures: [] };
  let legacy = false, lost = false;
  const one = async (v: unknown) => { const r = await revive(v); legacy ||= r.legacy; lost ||= r.lost; return r.blob; };
  const pictures: Picture[] = [];
  for (const p of raw.pictures) {
    const blob = await one(p.blob);
    if (blob) pictures.push({ id: p.id, kind: p.kind, blob });
  }
  const voice = await one(raw.voice);
  const media: FindMedia = voice ? { pictures, voice } : { pictures };
  // Moved here from a find stored before pictures were bytes: rewrite as bytes, once, while it can still be read.
  if (legacy && !lost) await (await db()).put('findMedia', await packMedia(id, media));
  return media;
}

/** A find with its media: what changing it works on. */
export async function getFullFind(id: string): Promise<FullFind | undefined> {
  const find = await getFind(id);
  if (!find) return undefined;
  const { pictures: _info, hasVoice: _v, ...rest } = find;
  return { ...rest, ...(await getFindMedia(id)) };
}

async function reviveLight(raw: Record<string, unknown>): Promise<{ find: Find; migrate: boolean }> {
  const out: Record<string, unknown> = { ...raw };
  const t = await revive(raw.thumb);
  if (t.blob) out.thumb = t.blob; else delete out.thumb;
  return { find: normalizeFind(out as unknown as Find), migrate: t.legacy && !t.lost };
}

async function packLight(f: Find): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { ...f, pictures: f.pictures.map(p => ({ id: p.id, kind: p.kind })) };
  if (f.thumb) out.thumb = await toBytes(f.thumb); else delete out.thumb;
  return out;
}

async function packMedia(id: string, m: FindMedia): Promise<StoredMedia> {
  const out: StoredMedia = { id, pictures: await Promise.all(m.pictures.map(async p => ({ id: p.id, kind: p.kind, blob: await toBytes(p.blob) }))) };
  if (m.voice) out.voice = await toBytes(m.voice);
  return out;
}

/** The light find a full one stands for. */
function lightOf(f: FullFind): Find {
  const { pictures, voice, ...rest } = f;
  const find: Find = { ...rest, pictures: pictures.map(p => ({ id: p.id, kind: p.kind })) };
  if (voice) find.hasVoice = true;
  return find;
}

/**
 * Saves a find WITH its media (the capture flow) and returns the light find stored, which the caller keeps.
 * Every Blob goes in as bytes (storedBytes.ts), so Safari has no file to lose; the returned thumbnail is fresh
 * memory, not a handle on the record just replaced.
 */
export async function saveFind(f: FullFind): Promise<Find> {
  const light = await packLight(lightOf(f));
  const media = await packMedia(f.id, f);
  const tx = (await db()).transaction(['finds', 'findMedia'], 'readwrite');
  await tx.objectStore('finds').put(light);
  await tx.objectStore('findMedia').put(media);
  await tx.done;
  return (await reviveLight(light)).find;
}

/**
 * Saves a find's details only (a favourite star, a name), leaving its pictures as they are. Field Mapper's
 * rule: a save from a copy that carries no pixels must never record "no pictures".
 */
export async function saveFindInfo(f: Find): Promise<Find> {
  const light = await packLight(f);
  await (await db()).put('finds', light);
  return (await reviveLight(light)).find;
}

export async function deleteFind(id: string): Promise<void> {
  const tx = (await db()).transaction(['finds', 'findMedia'], 'readwrite');
  await tx.objectStore('finds').delete(id);
  await tx.objectStore('findMedia').delete(id);
  await tx.done;
}

export async function deleteAllFinds(): Promise<void> {
  const d = await db();
  await d.clear('finds');
  await d.clear('findMedia');
  await d.clear('trails');
  await d.clear('huntRuns');
  await d.clear('walks');
}

export async function allWalks(): Promise<Walk[]> {
  const list = (await (await db()).getAll('walks')) as Walk[];
  return list.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function saveWalk(w: Walk): Promise<void> {
  await (await db()).put('walks', w);
}

export async function deleteWalk(id: string): Promise<void> {
  await (await db()).delete('walks', id);
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
    pathRecording: s?.pathRecording ?? DEFAULT_SETTINGS.pathRecording,
    walksOnMap: s?.walksOnMap ?? DEFAULT_SETTINGS.walksOnMap,
    keepAwake: s?.keepAwake ?? DEFAULT_SETTINGS.keepAwake,
    compass: s?.compass ?? DEFAULT_SETTINGS.compass,
    // Absence: a device whose grown-up already picked a voice meant one voice; everyone else gets the characters.
    voiceMode: s?.voiceMode === 'one' || s?.voiceMode === 'characters' ? s.voiceMode : (s?.voiceURI ? 'one' : 'characters'),
    ...(s?.voiceURI ? { voiceURI: s.voiceURI } : {}),
  };
}

export async function allProfiles(): Promise<Profile[]> {
  const raw = (await (await db()).getAll('profiles')) as Record<string, unknown>[];
  const list: Profile[] = [];
  for (const r of raw) {
    const { blob, legacy, lost } = await revive(r.photo);
    const p = { ...r } as unknown as Profile;
    if (blob) p.photo = blob; else delete p.photo;
    list.push(legacy && !lost ? await saveProfile(p) : p);
  }
  return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** As saveFind: stores the photo as bytes and returns the copy, to be kept in place of the profile passed in. */
export async function saveProfile(p: Profile): Promise<Profile> {
  const stored: Record<string, unknown> = { ...p };
  if (p.photo) stored.photo = await toBytes(p.photo); else delete stored.photo;
  await (await db()).put('profiles', stored);
  const copy: Profile = { ...p };
  if (p.photo) copy.photo = fromBytes(stored.photo as StoredBytes);
  return copy;
}

/** Deletes an explorer and everything that was theirs: finds and hunt runs. */
export async function deleteProfile(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(['profiles', 'finds', 'findMedia', 'huntRuns', 'walks'], 'readwrite');
  await tx.objectStore('profiles').delete(id);
  for (const store of ['finds', 'huntRuns', 'walks'] as const) {
    let cur = await tx.objectStore(store).openCursor();
    while (cur) {
      const v = cur.value as { id: string; profileId?: string };
      if (v.profileId === id) {
        // A find's pictures go with it.
        if (store === 'finds') await tx.objectStore('findMedia').delete(v.id);
        await cur.delete();
      }
      cur = await cur.continue();
    }
  }
  await tx.done;
}

/**
 * Version 1 kept ONE explorer in the settings. If this device was set up
 * before profiles, that explorer becomes the first profile and every find and
 * hunt run is filed under it (its pictures already moved into findMedia, by the version-4 upgrade).
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
  let fc = await tx.objectStore('finds').openCursor();
  while (fc) {
    await fc.update({ ...fc.value, profileId: p.id });
    fc = await fc.continue();
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
