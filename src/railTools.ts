import type { TierId } from './tiers.ts';

/**
 * The map's side-rail buttons, as data: which exist, what each is called, and which an explorer sees. Each explorer
 * can choose and order their own (`Profile.tools`, "My buttons"); absent, the rail is their age tier's default —
 * a Sprout's is short, a Naturalist's has the measuring tools. Pure.
 */
export type ToolId = 'me' | 'map' | 'photo' | 'draw' | 'measure' | 'path' | 'hunts' | 'done';

export interface RailTool {
  id: ToolId;
  emoji: string;
  /** The word under the picture. */
  word: string;
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
  { id: 'done', emoji: '🏠', word: 'Done', what: 'Done exploring: the tick check' },
];

export const TIER_TOOLS: Record<TierId, ToolId[]> = {
  sprout: ['me', 'photo', 'draw', 'hunts', 'done'],
  explorer: ['me', 'map', 'photo', 'draw', 'path', 'hunts', 'done'],
  naturalist: ['me', 'map', 'photo', 'draw', 'measure', 'path', 'hunts', 'done'],
};

export function toolOf(id: ToolId): RailTool {
  return TOOLS.find(t => t.id === id)!;
}

/**
 * The buttons on this explorer's rail, in order: their own choice when they made one (unknown ids dropped,
 * repeats removed), else their tier's default. An empty choice is honoured — a child may want the map clear.
 */
export function railFor(chosen: readonly string[] | undefined, tier: TierId): ToolId[] {
  if (!chosen) return [...TIER_TOOLS[tier]];
  const known = new Set<string>(TOOLS.map(t => t.id));
  return [...new Set(chosen)].filter((id): id is ToolId => known.has(id));
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
