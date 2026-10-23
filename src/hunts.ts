import type { CategoryId, ColourId, CountId, SizeId } from './types.ts';
import type { BadgeFind } from './badges.ts';

/**
 * Scavenger hunts: a themed list of things to find. An item with a RULE is
 * ticked by any find that meets it; an item without one ("something that
 * smells nice") is ticked by the explorer saying "this one counts". A hunt is
 * stored BY VALUE on the run, so a grown-up editing their own hunt later never
 * changes a hunt a child already finished.
 */
export interface HuntRule {
  category?: CategoryId;
  colour?: ColourId;
  size?: SizeId;
  count?: CountId;
}

export interface HuntItem {
  id: string;
  emoji: string;
  text: string;
  rule?: HuntRule;
}

export interface Hunt {
  id: string;
  emoji: string;
  title: string;
  /** One line about where the hunt works best. */
  where: string;
  items: HuntItem[];
  /** Made by a grown-up on this device. */
  custom?: boolean;
}

export interface HuntRun {
  id: string;
  hunt: Hunt;
  startedAt: string;
  /** item id -> the find that ticked it */
  found: Record<string, string>;
  status: 'active' | 'done' | 'stopped';
  finishedAt?: string;
}

const item = (id: string, emoji: string, text: string, rule?: HuntRule): HuntItem => ({ id, emoji, text, rule });

/** Every ready-made item, also the palette a grown-up builds a hunt from. */
export const ITEM_LIBRARY: HuntItem[] = [
  item('bird', '🐦', 'A bird', { category: 'bird' }),
  item('bug', '🐛', 'A bug', { category: 'bug' }),
  item('tiny-bug', '🐜', 'A tiny bug', { category: 'bug', size: 'tiny' }),
  item('tree', '🌳', 'A tree', { category: 'tree' }),
  item('big-tree', '🌲', 'A tree as big as a house', { category: 'tree', size: 'huge' }),
  item('flower', '🌸', 'A flower', { category: 'flower' }),
  item('yellow-flower', '🌼', 'A yellow flower', { category: 'flower', colour: 'yellow' }),
  item('purple-flower', '🪻', 'A purple flower', { category: 'flower', colour: 'purple' }),
  item('plant', '🌿', 'A green plant', { category: 'plant' }),
  item('animal', '🐿️', 'An animal', { category: 'animal' }),
  item('rock', '🪨', 'A rock', { category: 'rock' }),
  item('tiny-rock', '🔘', 'A tiny pebble', { category: 'rock', size: 'tiny' }),
  item('water', '💧', 'Some water', { category: 'water' }),
  item('sky', '☁️', 'A cloud', { category: 'sky' }),
  item('red', '🔴', 'Something red', { colour: 'red' }),
  item('orange', '🟠', 'Something orange', { colour: 'orange' }),
  item('yellow', '🟡', 'Something yellow', { colour: 'yellow' }),
  item('green', '🟢', 'Something green', { colour: 'green' }),
  item('blue', '🔵', 'Something blue', { colour: 'blue' }),
  item('purple', '🟣', 'Something purple', { colour: 'purple' }),
  item('pink', '🩷', 'Something pink', { colour: 'pink' }),
  item('brown', '🟤', 'Something brown', { colour: 'brown' }),
  item('white', '⚪', 'Something white', { colour: 'white' }),
  item('tiny', '🔍', 'Something tiny', { size: 'tiny' }),
  item('huge', '🏠', 'Something huge', { size: 'huge' }),
  item('lots', '💯', 'Lots of the same thing', { count: 'lots' }),
  item('leaf', '🍃', 'A fallen leaf'),
  item('pinecone', '🌰', 'A pine cone or a nut'),
  item('feather', '🪶', 'A feather'),
  item('smell', '👃', 'Something that smells nice'),
  item('soft', '🧸', 'Something soft'),
  item('rough', '🪵', 'Something rough'),
  item('round', '⭕', 'Something round'),
  item('heart', '❤️', 'Something shaped like a heart'),
  item('track', '🐾', 'An animal track'),
  item('hole', '🕳️', 'A hole where something lives'),
  item('web', '🕸️', 'A spider web'),
  item('shell', '🐚', 'A shell'),
  item('mushroom', '🍄', 'A mushroom (look, don\'t touch!)'),
  item('sound', '👂', 'Something that makes a sound'),
  item('seed', '🌱', 'A seed'),
  item('stick', '🥢', 'A stick longer than your arm'),
];

const lib = (...ids: string[]): HuntItem[] => ids.map(id => {
  const found = ITEM_LIBRARY.find(i => i.id === id);
  if (!found) throw new Error(`unknown hunt item ${id}`);
  return found;
});

export const HUNTS: Hunt[] = [
  { id: 'backyard', emoji: '🏡', title: 'Backyard Hunt', where: 'A yard, a garden or a playground.', items: lib('bird', 'bug', 'flower', 'tree', 'rock', 'leaf', 'round', 'soft') },
  { id: 'rainbow', emoji: '🌈', title: 'Rainbow Hunt', where: 'Anywhere with lots of colour.', items: lib('red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink') },
  { id: 'woods', emoji: '🌲', title: 'Forest Hunt', where: 'A trail in the woods.', items: lib('big-tree', 'pinecone', 'mushroom', 'track', 'web', 'stick', 'hole', 'sound') },
  { id: 'pond', emoji: '🐸', title: 'Pond & Stream Hunt', where: 'Beside a pond, a stream or a wetland. Stay with a grown-up near water!', items: lib('water', 'bird', 'bug', 'plant', 'tiny-rock', 'animal', 'sound') },
  { id: 'tiny', emoji: '🔍', title: 'Tiny Things Hunt', where: 'Get down low and look closely.', items: lib('tiny-bug', 'tiny-rock', 'seed', 'tiny', 'web', 'lots') },
  { id: 'senses', emoji: '👃', title: 'Five Senses Hunt', where: 'Anywhere outside.', items: lib('smell', 'soft', 'rough', 'sound', 'sky', 'heart') },
  { id: 'beach', emoji: '🏖️', title: 'Beach Hunt', where: 'A beach or a rocky shore.', items: lib('shell', 'rock', 'bird', 'water', 'feather', 'white', 'round') },
  { id: 'flowers', emoji: '🌼', title: 'Flower Hunt', where: 'A meadow, a park or a garden.', items: lib('yellow-flower', 'purple-flower', 'flower', 'bug', 'lots', 'smell') },
];

/** Does this find meet the item's rule? An item with no rule is never auto-ticked. */
export function meetsRule(it: HuntItem, f: BadgeFind): boolean {
  const r = it.rule;
  if (!r || (!r.category && !r.colour && !r.size && !r.count)) return false;
  return (!r.category || f.category === r.category)
    && (!r.colour || f.colours.includes(r.colour))
    && (!r.size || f.size === r.size)
    && (!r.count || f.count === r.count);
}

/** The still-open items this find would tick on its own. */
export function autoMatches(run: HuntRun, f: BadgeFind, liveFindIds: Set<string>): string[] {
  return openItems(run, liveFindIds).filter(i => meetsRule(i, f)).map(i => i.id);
}

/** Items not yet ticked by a find that still exists (deleting a find un-ticks its item). */
export function openItems(run: HuntRun, liveFindIds: Set<string>): HuntItem[] {
  return run.hunt.items.filter(i => !(run.found[i.id] && liveFindIds.has(run.found[i.id])));
}

export function huntProgress(run: HuntRun, liveFindIds: Set<string>): { done: number; total: number; complete: boolean } {
  const total = run.hunt.items.length;
  const done = total - openItems(run, liveFindIds).length;
  return { done, total, complete: total > 0 && done === total };
}

/** Ticks `itemIds` with `findId`. Returns a NEW run; marks it done when everything is found. */
export function tick(run: HuntRun, itemIds: string[], findId: string, liveFindIds: Set<string>, now: string): HuntRun {
  const found = { ...run.found };
  for (const id of itemIds) if (run.hunt.items.some(i => i.id === id)) found[id] = findId;
  const next: HuntRun = { ...run, found };
  const live = new Set(liveFindIds).add(findId);
  if (run.status === 'active' && huntProgress(next, live).complete) {
    next.status = 'done';
    next.finishedAt = now;
  }
  return next;
}

export const MAX_CUSTOM_ITEMS = 12;

/** A grown-up's hunt: refused (null) when it has no title or no items. */
export function makeCustomHunt(id: string, title: string, emoji: string, items: HuntItem[]): Hunt | null {
  const t = title.trim();
  const list = items.slice(0, MAX_CUSTOM_ITEMS).map((i, n) => ({ ...i, id: `${i.id}-${n}`, text: i.text.trim() })).filter(i => i.text);
  if (!t || !list.length) return null;
  return { id, emoji: emoji || '🗺️', title: t.slice(0, 40), where: 'A hunt made by your grown-up.', items: list, custom: true };
}
