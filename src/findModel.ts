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

/**
 * The finds the map shows. The explorer's own (with any find saved before explorers had profiles, which counts as
 * whoever is exploring, as it does everywhere else) and, with the Map card's "Everyone's finds" on, every other
 * explorer's on this device. Nothing here leaves the device: these are profiles sharing one tablet.
 */
export function mapFinds<F extends Pick<Find, 'profileId'>>(all: F[], me: string, everyone: boolean): { mine: F[]; others: F[] } {
  const isMine = (f: F) => !f.profileId || f.profileId === me;
  return { mine: all.filter(isMine), others: everyone ? all.filter(f => !isMine(f)) : [] };
}
