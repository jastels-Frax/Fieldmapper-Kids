import type { TierId } from './tiers.ts';

/**
 * The map's buttons, as data: which exist, what each is called, and where an explorer sees them. Two sit beside
 * "I found something!" (the BAR, `Profile.bar`; absent = 📖 My Finds on the left and 📷 Photo on the right), and the
 * rest of the ones they want run down the side (the RAIL, `Profile.rail`; absent = their age tier's default — a
 * Sprout's is short, a Naturalist's has the measuring tools). Any button can go in either place, never both; both
 * are chosen in "My buttons". Pure.
 */
export type ToolId = 'me' | 'map' | 'photo' | 'draw' | 'measure' | 'path' | 'hunts' | 'finds' | 'badges' | 'done';

export interface RailTool {
  id: ToolId;
  emoji: string;
  /** The word under the picture. */
  word: string;
  /** A shorter word for the narrow side rail; absent = `word`. */
  short?: string;
  /** What it does, for "My buttons" and screen readers. */
  what: string;
}

export const TOOLS: RailTool[] = [
  { id: 'me', emoji: '📍', word: 'Me', what: 'Find me on the map, and follow me as I walk' },
  { id: 'map', emoji: '🗺️', word: 'Map', what: 'How the map looks, how big the pins are and what they show, the facing arrow and keeping the screen on' },
  { id: 'photo', emoji: '📷', word: 'Photo', what: 'Photo spots: take a picture of a view, and the map shows which way you looked' },
  { id: 'draw', emoji: '✏️', word: 'Draw', what: 'Draw lines and shapes on my map' },
  { id: 'measure', emoji: '📏', word: 'Measure', what: 'How far is it? How big is it?' },
  { id: 'path', emoji: '👣', word: 'Path', what: 'Record the path I walk' },
  { id: 'hunts', emoji: '🔎', word: 'Hunts', what: 'Scavenger hunts' },
  { id: 'finds', emoji: '📖', word: 'My Finds', short: 'Finds', what: 'My sticker book, with every find I have saved' },
  { id: 'badges', emoji: '🏅', word: 'Badges', what: 'The badges I have earned, and the ones still to get' },
  { id: 'done', emoji: '🏠', word: 'Done', what: 'Done exploring: the tick check' },
];

/** The two buttons beside "I found something!", left then right, until the explorer chooses: their finds and photo spots. */
export const DEFAULT_BAR: readonly [ToolId, ToolId] = ['finds', 'photo'];

/** Each tier's rail. 🏅 Badges has 📷 Photo's old place, since Photo moved into the bar and Badges came out of it (2.12). */
export const TIER_TOOLS: Record<TierId, ToolId[]> = {
  sprout: ['me', 'badges', 'draw', 'hunts', 'done'],
  explorer: ['me', 'map', 'badges', 'draw', 'path', 'hunts', 'done'],
  naturalist: ['me', 'map', 'badges', 'draw', 'measure', 'path', 'hunts', 'done'],
};

/** An explorer's button choices, as their profile stores them. */
export interface ButtonPrefs {
  /** Their rail, in order (2.12 on); absent = `tools` read the old way, else their tier's. */
  rail?: readonly string[];
  /** Their rail as stored before 2.12, when 📖 My Finds and 🏅 Badges were fixed in the bar. */
  tools?: readonly string[];
  /** The two buttons beside "I found something!", left then right; absent = DEFAULT_BAR. */
  bar?: readonly string[];
}

const KNOWN = new Set<string>(TOOLS.map(t => t.id));

/** Unknown ids dropped, repeats removed, order kept. */
function clean(list: readonly string[]): ToolId[] {
  return [...new Set(list)].filter((id): id is ToolId => KNOWN.has(id));
}

export function toolOf(id: ToolId): RailTool {
  return TOOLS.find(t => t.id === id)!;
}

/** The two buttons beside "I found something!", left then right: the explorer's choice, else My Finds and Photo. */
export function barFor(chosen: readonly string[] | undefined): [ToolId, ToolId] {
  const pick = (id: string | undefined, slot: 0 | 1): ToolId => (id && KNOWN.has(id) ? id as ToolId : DEFAULT_BAR[slot]);
  const left = pick(chosen?.[0], 0);
  const right = pick(chosen?.[1], 1);
  return left === right ? [DEFAULT_BAR[0], DEFAULT_BAR[1]] : [left, right];
}

/**
 * A rail stored before 2.12 (`Profile.tools`), when the bar was always 📖 My Finds and 🏅 Badges: 📷 Photo has moved
 * into the bar and Badges out of it, so Badges takes Photo's place (the end, when Photo was not on it). Nothing that
 * was on the screen leaves it.
 */
export function railFromOld(tools: readonly string[]): ToolId[] {
  const list: ToolId[] = clean(tools).filter(id => id !== 'finds' && id !== 'badges');
  const i = list.indexOf('photo');
  if (i >= 0) list[i] = 'badges';
  else list.push('badges');
  return list;
}

/**
 * The buttons on this explorer's rail, in order: their own choice when they made one (unknown ids dropped,
 * repeats removed; an empty choice is honoured — a child may want the map clear), else their tier's default; less
 * the two in the bar, since a button is in one place or the other.
 */
export function railFor(p: ButtonPrefs, tier: TierId): ToolId[] {
  const bar = barFor(p.bar);
  const order = p.rail ? clean(p.rail) : p.tools ? railFromOld(p.tools) : [...TIER_TOOLS[tier]];
  return order.filter(id => !bar.includes(id));
}

/**
 * Puts a button beside "I found something!" (`slot` 0 left, 1 right). The button it pushes out is swapped into the
 * place this one came from: the other side of the bar, or its spot on the rail — or the end of the rail when it was
 * in neither — so changing the bar never loses a button.
 */
export function placeInBar(bar: readonly [ToolId, ToolId], rail: readonly ToolId[], slot: 0 | 1, id: ToolId): { bar: [ToolId, ToolId]; rail: ToolId[] } {
  const out: [ToolId, ToolId] = [bar[0], bar[1]];
  const old = out[slot];
  const other = slot === 0 ? 1 : 0;
  if (old === id) return { bar: out, rail: [...rail] };
  if (out[other] === id) {
    out[other] = old;
    out[slot] = id;
    return { bar: out, rail: [...rail] };
  }
  out[slot] = id;
  const next = rail.filter(x => x !== old);
  const i = next.indexOf(id);
  if (i >= 0) next[i] = old;
  else next.push(old);
  return { bar: out, rail: next };
}

/** Moves one button up (-1) or down (+1) in the list; the others keep their order. */
export function moveTool(list: ToolId[], id: ToolId, by: -1 | 1): ToolId[] {
  const i = list.indexOf(id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** Turns a button on (added at the end) or off. */
export function toggleTool(list: ToolId[], id: ToolId): ToolId[] {
  return list.includes(id) ? list.filter(x => x !== id) : [...list, id];
}
