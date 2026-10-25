import type { PictureInfo } from './types.ts';

/**
 * A find is stored in TWO records, as Field Mapper stores a feature (StorageManager.saveFeature →
 * STORE_FEATURE_PHOTOS): the find itself, light enough to read every one of them at launch (which pictures it
 * has, never their bytes; the small thumbnail stays, the map and the sticker book need it), and its media —
 * the pictures and the voice note — read only when the find is opened, changed or exported. Field Mapper split
 * its photos out because holding every photo at once exhausts mobile Safari's memory and crashes the page.
 *
 * This is the pure half: splitting a stored find of ANY version (a version-1 single photo / drawing, pictures
 * inline, bytes or Blobs) into the two records. The byte values are carried as they are; turning them into Blobs
 * is storage.ts's job. Tested in test/findSplit.test.ts.
 */
export interface StoredMedia {
  id: string;
  pictures: { id: string; kind: 'photo' | 'drawing'; blob: unknown }[];
  /** Voice notes. A media record written before there could be several holds `voice` instead. */
  voices?: unknown[];
  voice?: unknown;
}

export function splitStoredFind(raw: Record<string, unknown>, newId: () => string): { light: Record<string, unknown>; media: StoredMedia } {
  const id = String(raw.id);
  let pictures = Array.isArray(raw.pictures) ? (raw.pictures as StoredMedia['pictures']) : [];
  if (!Array.isArray(raw.pictures)) {
    // Version 1: one photo and/or one drawing, photo first.
    pictures = [];
    if (raw.photo != null) pictures.push({ id: newId(), kind: 'photo', blob: raw.photo });
    if (raw.drawing != null) pictures.push({ id: newId(), kind: 'drawing', blob: raw.drawing });
  }
  const media: StoredMedia = { id, pictures: pictures.map(p => ({ id: p.id, kind: p.kind, blob: p.blob })) };
  if (raw.voice != null) media.voices = [raw.voice];
  const light: Record<string, unknown> = { ...raw, pictures: pictures.map(p => ({ id: p.id, kind: p.kind } satisfies PictureInfo)) };
  if (raw.voice != null || raw.hasVoice) { light.hasVoice = true; light.voiceCount = 1; } else delete light.hasVoice;
  delete light.voice;
  delete light.photo;
  delete light.drawing;
  return { light, media };
}

/** Whether a stored find still carries its media inline (stored before the split). */
export function holdsMedia(raw: Record<string, unknown>): boolean {
  return raw.voice != null || raw.photo != null || raw.drawing != null
    || (Array.isArray(raw.pictures) && (raw.pictures as { blob?: unknown }[]).some(p => p.blob != null));
}
