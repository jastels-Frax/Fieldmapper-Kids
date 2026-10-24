import type { Find } from './types.ts';

/**
 * A stored find record in the current shape: missing lists become empty ones, and each picture is just which
 * picture it is (its bytes live in the find's media, findSplit.ts). Pure, so it is tested without a database.
 */
export function normalizeFind(raw: Find): Find {
  return {
    ...raw,
    colours: raw.colours ?? [],
    pictures: (raw.pictures ?? []).map(p => ({ id: p.id, kind: p.kind })),
  };
}

export const photoCount = (f: Pick<Find, 'pictures'>) => f.pictures.filter(p => p.kind === 'photo').length;
export const drawingCount = (f: Pick<Find, 'pictures'>) => f.pictures.filter(p => p.kind === 'drawing').length;
