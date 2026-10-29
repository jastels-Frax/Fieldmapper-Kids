import type { BadgeFind } from './badges.ts';
import { isKind } from './categories.ts';

export interface Challenge {
  id: string;
  emoji: string;
  text: string;
  test: (f: BadgeFind) => boolean;
}

const POOL: Challenge[] = [
  { id: 'bird', emoji: '🐦', text: 'Find a bird', test: f => isKind(f.category, 'bird') },
  { id: 'bug', emoji: '🐛', text: 'Find a bug', test: f => isKind(f.category, 'bug') },
  { id: 'tree', emoji: '🌳', text: 'Find a tree', test: f => isKind(f.category, 'tree') },
  { id: 'flower', emoji: '🌸', text: 'Find a flower', test: f => isKind(f.category, 'flower') },
  { id: 'rock', emoji: '🪨', text: 'Find a cool rock', test: f => isKind(f.category, 'rock') },
  { id: 'water', emoji: '💧', text: 'Find some water', test: f => isKind(f.category, 'water') },
  { id: 'sky', emoji: '☁️', text: 'Look up at the sky', test: f => isKind(f.category, 'sky') },
  { id: 'animal', emoji: '🐿️', text: 'Find an animal', test: f => isKind(f.category, 'animal') },
  { id: 'red', emoji: '🔴', text: 'Find something red', test: f => f.colours.includes('red') },
  { id: 'yellow', emoji: '🟡', text: 'Find something yellow', test: f => f.colours.includes('yellow') },
  { id: 'blue', emoji: '🔵', text: 'Find something blue', test: f => f.colours.includes('blue') },
  { id: 'purple', emoji: '🟣', text: 'Find something purple', test: f => f.colours.includes('purple') },
  { id: 'brown', emoji: '🟤', text: 'Find something brown', test: f => f.colours.includes('brown') },
  { id: 'white', emoji: '⚪', text: 'Find something white', test: f => f.colours.includes('white') },
  { id: 'tiny', emoji: '🐜', text: 'Find something tiny', test: f => f.size === 'tiny' },
  { id: 'huge', emoji: '🏠', text: 'Find something huge', test: f => f.size === 'huge' },
  { id: 'lots', emoji: '💯', text: 'Find lots of something', test: f => f.count === 'lots' },
  { id: 'draw', emoji: '🎨', text: 'Draw a picture of a find', test: f => !!f.hasDrawing },
  { id: 'voice', emoji: '🎤', text: 'Tell a story about a find', test: f => !!f.hasVoice },
  { id: 'mystery', emoji: '❓', text: 'Find a mystery', test: f => isKind(f.category, 'mystery') },
  { id: 'mushroom', emoji: '🍄', text: 'Find a mushroom (look, never eat!)', test: f => isKind(f.category, 'mushroom') },
  { id: 'sign', emoji: '🐾', text: 'Find an animal track or clue', test: f => isKind(f.category, 'sign') },
  { id: 'lichen', emoji: '🍃', text: 'Find a lichen on a rock or a tree', test: f => isKind(f.category, 'lichen') },
  { id: 'fern', emoji: '🌿', text: 'Find a fern', test: f => isKind(f.category, 'fern') },
  { id: 'species', emoji: '📚', text: 'Find out what something is called', test: f => !!f.species },
];

/** FNV-1a: the same day gives the same number on every device. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CHALLENGES_PER_DAY = 3;

/** Today's challenges, chosen from the day alone. `day` is YYYY-MM-DD. */
export function challengesFor(day: string): Challenge[] {
  const rand = mulberry32(hash(day));
  const pool = POOL.slice();
  const out: Challenge[] = [];
  while (out.length < CHALLENGES_PER_DAY && pool.length) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
}

/** Which of `challenges` some find of that day has met. */
export function completedChallenges(challenges: Challenge[], findsThatDay: BadgeFind[]): Set<string> {
  return new Set(challenges.filter(c => findsThatDay.some(c.test)).map(c => c.id));
}
