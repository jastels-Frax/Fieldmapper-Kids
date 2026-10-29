import type { Find, Profile } from './types.ts';

/**
 * Favourites belong to an EXPLORER, not to a find (`Profile.favourites`, find ids): each explorer keeps their own, and
 * may favourite anyone's find on this device — a sister's frog as well as their own. A find's own `favourite` flag is
 * from before, and is moved once onto the explorer who found it (`migrateFavourites`). Pure.
 */

export function isFavourite(p: Pick<Profile, 'favourites'>, findId: string): boolean {
  return !!p.favourites?.includes(findId);
}

/** The explorer with this find added to, or taken off, their favourites. */
export function toggleFavourite<P extends Pick<Profile, 'favourites'>>(p: P, findId: string): P {
  const now = p.favourites ?? [];
  return { ...p, favourites: now.includes(findId) ? now.filter(id => id !== findId) : [...now, findId] };
}

/** An explorer's favourite finds still on this device, the one they loved last first (their profile card). */
export function favouriteFinds(p: Pick<Profile, 'favourites'>, finds: readonly Find[]): Find[] {
  const byId = new Map(finds.map(f => [f.id, f] as const));
  return [...(p.favourites ?? [])].reverse().map(id => byId.get(id)).filter((f): f is Find => !!f);
}

/** The explorers who love a find, in the order given (the find page's "Loved by"). */
export function lovedBy<P extends Pick<Profile, 'favourites'>>(profiles: readonly P[], findId: string): P[] {
  return profiles.filter(p => isFavourite(p, findId));
}

/**
 * Moves each find's old `favourite` flag onto its finder's list (a find with no finder, from before explorers had
 * profiles, to `fallbackId`), and returns only the records that change: the profiles gaining favourites, and the
 * finds losing the flag. Run once at launch; a second run finds nothing to move.
 */
export function migrateFavourites(finds: Find[], profiles: Profile[], fallbackId: string): { profiles: Profile[]; finds: Find[] } {
  const add = new Map<string, string[]>();
  const cleared: Find[] = [];
  for (const f of finds) {
    if (f.favourite === undefined) continue;
    if (f.favourite) {
      const owner = f.profileId && profiles.some(p => p.id === f.profileId) ? f.profileId : fallbackId;
      add.set(owner, [...(add.get(owner) ?? []), f.id]);
    }
    const { favourite: _old, ...rest } = f;
    cleared.push(rest);
  }
  const changed: Profile[] = [];
  for (const p of profiles) {
    const ids = add.get(p.id);
    if (!ids) continue;
    const have = p.favourites ?? [];
    changed.push({ ...p, favourites: [...have, ...ids.filter(id => !have.includes(id))] });
  }
  return { profiles: changed, finds: cleared };
}
