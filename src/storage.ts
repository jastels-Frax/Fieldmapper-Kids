import { openDB, type IDBPDatabase } from 'idb';
import type { Find, FindMedia, FullFind, LegacySettings, PhotoSpot, Picture, Profile, Settings, SpotMedia } from './types.ts';
import { normalizeFind } from './findModel.ts';
import { uid } from './ids.ts';
import type { Hunt, HuntRun } from './hunts.ts';
import type { Walk } from './walk.ts';
import type { Sketch } from './types.ts';
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
 * 4: find media split out of the finds (`findMedia`).
 * 5: sketches drawn on the map (`sketches`).
 * 6: photo spots (`photoSpots`) and their pictures (`spotMedia`), split as a find's are.
 * 2: explorer profiles and imported species lists. The DATA move (settings ->
 *    first profile, finds stamped with it) is `migrateToProfiles`, run by App,
 *    because it needs to know whether the device was ever set up.
 */
const DB_VERSION = 6;

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
      if (oldVersion < 5) d.createObjectStore('sketches', { keyPath: 'id' });
      if (oldVersion < 6) {
        d.createObjectStore('photoSpots', { keyPath: 'id' });
        d.createObjectStore('spotMedia', { keyPath: 'id' });
      }
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
  if (!raw) return { pictures: [], voices: [] };
  let legacy = false, lost = false;
  const one = async (v: unknown) => { const r = await revive(v); legacy ||= r.legacy; lost ||= r.lost; return r.blob; };
  const pictures: Picture[] = [];
  for (const p of raw.pictures) {
    const blob = await one(p.blob);
    if (blob) pictures.push({ id: p.id, kind: p.kind, blob });
  }
  const voices: Blob[] = [];
  for (const v of raw.voices ?? (raw.voice != null ? [raw.voice] : [])) {
    const blob = await one(v);
    if (blob) voices.push(blob);
  }
  const media: FindMedia = { pictures, voices };
  // Moved here from a find stored before pictures were bytes: rewrite as bytes, once, while it can still be read.
  if (legacy && !lost) await (await db()).put('findMedia', await packMedia(id, media));
  return media;
}

/** A find with its media: what changing it works on. */
export async function getFullFind(id: string): Promise<FullFind | undefined> {
  const find = await getFind(id);
  if (!find) return undefined;
  const { pictures: _info, hasVoice: _v, voiceCount: _n, ...rest } = find;
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
  if (m.voices.length) out.voices = await Promise.all(m.voices.map(v => toBytes(v)));
  return out;
}

/** The light find a full one stands for. */
function lightOf(f: FullFind): Find {
  const { pictures, voices, ...rest } = f;
  const find: Find = { ...rest, pictures: pictures.map(p => ({ id: p.id, kind: p.kind })) };
  if (voices.length) { find.hasVoice = true; find.voiceCount = voices.length; }
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
  await d.clear('sketches');
  await d.clear('photoSpots');
  await d.clear('spotMedia');
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

export async function allSketches(): Promise<Sketch[]> {
  const list = (await (await db()).getAll('sketches')) as Sketch[];
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveSketch(s: Sketch): Promise<void> {
  await (await db()).put('sketches', s);
}

export async function deleteSketch(id: string): Promise<void> {
  await (await db()).delete('sketches', id);
}

/** Every photo spot on the device, every explorer's, newest first: light (the thumbnail, never the pictures). */
export async function allSpots(): Promise<PhotoSpot[]> {
  const raw = (await (await db()).getAll('photoSpots')) as Record<string, unknown>[];
  const out: PhotoSpot[] = [];
  for (const r of raw) out.push(await reviveSpot(r));
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** A photo spot's pictures, as in-memory Blobs; a picture that cannot be read is left out. */
export async function getSpotMedia(id: string): Promise<SpotMedia> {
  const raw = (await (await db()).get('spotMedia', id)) as { photos?: { id: string; blob: unknown }[] } | undefined;
  const photos: SpotMedia['photos'] = [];
  for (const p of raw?.photos ?? []) {
    const { blob } = await revive(p.blob);
    if (blob) photos.push({ id: p.id, blob });
  }
  return { photos };
}

/**
 * Saves a photo spot, and its pictures when `media` is given (a new spot, or one taken again); without it only the
 * details change (a name) and the pictures stay as they are — a copy with no pixels never records "no pictures".
 * Returns the copy stored, to be kept in place of the one passed in (storedBytes.ts).
 */
export async function saveSpot(spot: PhotoSpot, media?: SpotMedia): Promise<PhotoSpot> {
  const light: Record<string, unknown> = { ...spot };
  if (spot.thumb) light.thumb = await toBytes(spot.thumb); else delete light.thumb;
  // Packed BEFORE the transaction opens: reading a Blob is not a database request, and a transaction left waiting
  // on one commits early (as saveFind packs first).
  const pics = media && { id: spot.id, photos: await Promise.all(media.photos.map(async p => ({ id: p.id, blob: await toBytes(p.blob) }))) };
  const tx = (await db()).transaction(['photoSpots', 'spotMedia'], 'readwrite');
  await tx.objectStore('photoSpots').put(light);
  if (pics) await tx.objectStore('spotMedia').put(pics);
  await tx.done;
  return reviveSpot(light);
}

export async function deleteSpot(id: string): Promise<void> {
  const tx = (await db()).transaction(['photoSpots', 'spotMedia'], 'readwrite');
  await tx.objectStore('photoSpots').delete(id);
  await tx.objectStore('spotMedia').delete(id);
  await tx.done;
}

async function reviveSpot(raw: Record<string, unknown>): Promise<PhotoSpot> {
  const out = { ...raw } as unknown as PhotoSpot;
  const t = await revive(raw.thumb);
  if (t.blob) out.thumb = t.blob; else delete out.thumb;
  if (!Array.isArray(out.shots)) out.shots = [];
  return out;
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
    // Reading aloud used to be on by default, and saved settings say so; now it is on only where a grown-up chose it.
    readAloud: s?.readAloudChosen ? (s.readAloud ?? DEFAULT_SETTINGS.readAloud) : DEFAULT_SETTINGS.readAloud,
    ...(s?.readAloudChosen ? { readAloudChosen: true } : {}),
    sounds: s?.sounds ?? DEFAULT_SETTINGS.sounds,
    // The automatic trail used to be on by default and every saved settings record carries `trail: true`; it now
    // counts only when a grown-up chose it, so tracking happens only when the explorer asks for it (Path).
    trail: s?.trailChosen ? (s.trail ?? DEFAULT_SETTINGS.trail) : DEFAULT_SETTINGS.trail,
    ...(s?.trailChosen ? { trailChosen: true } : {}),
    tickReminder: s?.tickReminder ?? DEFAULT_SETTINGS.tickReminder,
    basemap: s?.basemap ?? DEFAULT_SETTINGS.basemap,
    pathRecording: s?.pathRecording ?? DEFAULT_SETTINGS.pathRecording,
    walksOnMap: s?.walksOnMap ?? DEFAULT_SETTINGS.walksOnMap,
    keepAwake: s?.keepAwake ?? DEFAULT_SETTINGS.keepAwake,
    wakeLock: s?.wakeLock ?? DEFAULT_SETTINGS.wakeLock,
    compass: s?.compass ?? DEFAULT_SETTINGS.compass,
    follow: s?.follow ?? DEFAULT_SETTINGS.follow,
    // Absent (or a size this build does not know) = medium.
    ...(s?.pinSize === 'small' || s?.pinSize === 'large' ? { pinSize: s.pinSize } : {}),
    // Absence: a device whose grown-up already picked a voice meant one voice; everyone else gets the characters.
    voiceMode: s?.voiceMode === 'one' || s?.voiceMode === 'characters' ? s.voiceMode : (s?.voiceURI ? 'one' : 'characters'),
    ...(s?.voiceURI ? { voiceURI: s.voiceURI } : {}),
    ...(s?.voiceURI && s.voiceCloudOk ? { voiceCloudOk: true } : {}),
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
  const tx = d.transaction(['profiles', 'finds', 'findMedia', 'huntRuns', 'walks', 'sketches', 'photoSpots', 'spotMedia'], 'readwrite');
  await tx.objectStore('profiles').delete(id);
  for (const store of ['finds', 'huntRuns', 'walks', 'sketches', 'photoSpots'] as const) {
    let cur = await tx.objectStore(store).openCursor();
    while (cur) {
      const v = cur.value as { id: string; profileId?: string };
      if (v.profileId === id) {
        // A find's pictures go with it, and a photo spot's.
        if (store === 'finds') await tx.objectStore('findMedia').delete(v.id);
        if (store === 'photoSpots') await tx.objectStore('spotMedia').delete(v.id);
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
