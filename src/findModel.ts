import type { Find, Picture } from './types.ts';

/**
 * Reads a stored find into the current shape. Version-1 records held one
 * `photo` and/or one `drawing`; they become the first pictures, in that order,
 * and the old fields are dropped. Pure, so it is tested without a database.
 */
export function normalizeFind(raw: Find, newId: () => string): Find {
  const f: Find = { ...raw, colours: raw.colours ?? [], pictures: raw.pictures ?? [] };
  if (!raw.pictures) {
    const pics: Picture[] = [];
    if (raw.photo) pics.push({ id: newId(), kind: 'photo', blob: raw.photo });
    if (raw.drawing) pics.push({ id: newId(), kind: 'drawing', blob: raw.drawing });
    f.pictures = pics;
  }
  delete f.photo;
  delete f.drawing;
  return f;
}

export const photoCount = (f: Pick<Find, 'pictures'>) => f.pictures.filter(p => p.kind === 'photo').length;
export const drawingCount = (f: Pick<Find, 'pictures'>) => f.pictures.filter(p => p.kind === 'drawing').length;
