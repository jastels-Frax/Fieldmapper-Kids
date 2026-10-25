import type { CategoryId, Find, QuickPref } from './types.ts';
import { CATEGORIES } from './categories.ts';

/** The kinds offered when an explorer has few finds of their own yet. */
export const DEFAULT_QUICK: CategoryId[] = ['bird', 'flower', 'bug'];

/**
 * Which kinds the quick-find buttons offer: the explorer's own most-found kinds (ties to the one found most
 * recently), topped up from `DEFAULT_QUICK`, so the buttons are the finds this child actually makes. Pure.
 * `finds` are newest first, as App holds them.
 */
export function quickKinds(finds: Pick<Find, 'category'>[], n = 3): CategoryId[] {
  const tally = new Map<CategoryId, { count: number; newest: number }>();
  finds.forEach((f, i) => {
    const t = tally.get(f.category);
    if (t) t.count++;
    else tally.set(f.category, { count: 1, newest: i });
  });
  const mine = [...tally.entries()]
    .filter(([c]) => c !== 'mystery')
    .sort((a, b) => b[1].count - a[1].count || a[1].newest - b[1].newest)
    .map(([c]) => c);
  const out = mine.slice(0, n);
  for (const c of DEFAULT_QUICK) if (out.length < n && !out.includes(c)) out.push(c);
  return out;
}

/** At most this many quick-find buttons: three fit beside the 📸 on a phone, each with its word. */
export const MAX_QUICK = 3;

/**
 * The quick-find buttons an explorer gets (`Profile.quick`). Absent or off = none: quick finds are offered only to
 * an explorer who turned them on (My buttons). On, the kinds they picked (known, unique, at most MAX_QUICK) or, with
 * none picked, the kinds they find most (`quickKinds`). Pure.
 */
export function quickFor(pref: QuickPref | undefined, finds: Pick<Find, 'category'>[]): CategoryId[] {
  if (!pref?.on) return [];
  const picked = pickedKinds(pref.kinds);
  return picked.length ? picked : quickKinds(finds, MAX_QUICK);
}

/** The picked kinds a stored choice holds: only kinds that exist, once each, at most MAX_QUICK. */
export function pickedKinds(kinds: readonly string[] | undefined): CategoryId[] {
  const known = new Set<string>(CATEGORIES.map(c => c.id));
  const out: CategoryId[] = [];
  for (const k of kinds ?? []) if (known.has(k) && !out.includes(k as CategoryId) && out.length < MAX_QUICK) out.push(k as CategoryId);
  return out;
}

/** Tap a kind in the picker: off if it was picked; on if there is room (else unchanged). */
export function toggleQuickKind(kinds: readonly string[] | undefined, id: CategoryId): CategoryId[] {
  const now = pickedKinds(kinds);
  if (now.includes(id)) return now.filter(k => k !== id);
  return now.length < MAX_QUICK ? [...now, id] : now;
}
