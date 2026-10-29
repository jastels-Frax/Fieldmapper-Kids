import type { CategoryId, Find, QuickPref } from './types.ts';
import { GROUPS, categoryOf, groupOf } from './categories.ts';

/**
 * A quick-find button stands for the TOP of "What is it?": a group (saved as its own kind — plant, animal, mushroom,
 * lichen, habitat) or "Other", never a kind within a group. One tap, one photo, saved as the group; the explorer makes
 * it a fern or a frog later, from the sticker book (Change it). Six choices, not thirty-odd. The mystery ("Not sure")
 * left "What is it?" in 2.10, when "Other" took its place, so it is not a choice here either.
 */
export const QUICK_CHOICES: CategoryId[] = [...GROUPS.map(g => g.generic), 'other'];

/** The quick choice a kind folds to: a kind within a group is its group's own kind; "Other" stays. */
export function quickChoiceOf(kind: CategoryId): CategoryId {
  return groupOf(kind)?.generic ?? kind;
}

/** How a quick choice is drawn on its chip: a group's picture and name, else the kind's. */
export function quickFace(id: CategoryId): { emoji: string; art?: string; label: string; colour: string } {
  const g = GROUPS.find(x => x.generic === id);
  if (g) return { emoji: g.emoji, art: g.art, label: g.label, colour: g.colour };
  const c = categoryOf(id);
  return { emoji: c.emoji, art: c.art, label: c.short ?? c.label, colour: c.colour };
}

/** The choices offered when an explorer has few finds of their own yet. */
export const DEFAULT_QUICK: CategoryId[] = ['animal', 'plant', 'mushroom'];

/**
 * Which choices the quick-find buttons offer: the groups the explorer finds most (each find counted under its group,
 * ties to the one found most recently), topped up from `DEFAULT_QUICK`, so the buttons are the finds this child
 * actually makes. Pure. `finds` are newest first, as App holds them.
 */
export function quickKinds(finds: Pick<Find, 'category'>[], n = 3): CategoryId[] {
  const tally = new Map<CategoryId, { count: number; newest: number }>();
  finds.forEach((f, i) => {
    const c = quickChoiceOf(f.category);
    const t = tally.get(c);
    if (t) t.count++;
    else tally.set(c, { count: 1, newest: i });
  });
  const mine = [...tally.entries()]
    .filter(([c]) => QUICK_CHOICES.includes(c)) // an old mystery find is not a choice any more
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

/**
 * The quick choices a stored pick holds: kinds that exist, folded to their group (a pick of Bird and Bug, made before
 * the buttons were groups, is Animal), once each, at most MAX_QUICK.
 */
export function pickedKinds(kinds: readonly string[] | undefined): CategoryId[] {
  const known = new Set<string>(QUICK_CHOICES.map(quickChoiceOf));
  const out: CategoryId[] = [];
  for (const k of kinds ?? []) {
    if (categoryOf(k as CategoryId).id !== k) continue; // not a kind this build knows
    const c = quickChoiceOf(k as CategoryId);
    if (known.has(c) && !out.includes(c) && out.length < MAX_QUICK) out.push(c);
  }
  return out;
}

/** Tap a kind in the picker: off if it was picked; on if there is room (else unchanged). */
export function toggleQuickKind(kinds: readonly string[] | undefined, id: CategoryId): CategoryId[] {
  const now = pickedKinds(kinds);
  if (now.includes(id)) return now.filter(k => k !== id);
  return now.length < MAX_QUICK ? [...now, id] : now;
}
